// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import {
  badRequest,
  decodeBase64,
  getSystemUseNoticeProjectPolicy,
  isSystemUseNotice,
  isUUID,
  OperationOutcomeError,
  SYSTEM_USE_NOTICE_ACTION_LABEL,
  SYSTEM_USE_NOTICE_DOCUMENT_TYPE_CODE,
  SYSTEM_USE_NOTICE_DOCUMENT_TYPE_SYSTEM,
  SYSTEM_USE_NOTICE_VERSION_IDENTIFIER_SYSTEM,
} from '@medplum/core';
import type { WithId } from '@medplum/core';
import type { Binary, DocumentReference, Project, Reference } from '@medplum/fhirtypes';
import type { Request, Response } from 'express';
import { query } from 'express-validator';
import { createHash, timingSafeEqual } from 'node:crypto';
import { getConfig } from '../config/loader';
import type { Repository } from '../fhir/repo';
import { getGlobalSystemRepo, getProjectSystemRepo } from '../fhir/repo';
import { getCacheRedis } from '../redis';
import { makeValidationMiddleware } from '../util/validator';
import { getProjectIdByClientId } from './utils';

const GENERIC_LOGIN_ERROR = 'Invalid login request';
const NOTICE_UNAVAILABLE_ERROR = 'System use notice is unavailable';
const LOGIN_NOTICE_CACHE_PREFIX = 'login:system-use-notice:';
const LOGIN_NOTICE_TTL_SECONDS = 60 * 60;

export interface ResolvedSystemUseNotice {
  readonly enabled: boolean;
  readonly reference?: Reference<DocumentReference>;
  readonly version?: string;
  readonly title?: string;
  readonly body?: string;
}

export const systemUseNoticeValidator = makeValidationMiddleware([
  query('clientId').optional().isUUID().withMessage('Invalid clientId'),
  query('projectId')
    .optional()
    .custom((value) => value === 'new' || isUUID(value))
    .withMessage('Invalid projectId'),
]);

/**
 * Public policy-discovery endpoint. It exposes only approved login-banner
 * content and never accepts an email address or other user identifier.
 */
export async function systemUseNoticeHandler(req: Request, res: Response): Promise<void> {
  if (Object.keys(req.query).some((key) => key !== 'clientId' && key !== 'projectId')) {
    throw new OperationOutcomeError(badRequest('Invalid policy request'));
  }
  const projectId = await getProjectIdByClientId(
    req.query.clientId as string | undefined,
    req.query.projectId as string | undefined
  );
  const notice = await resolveSystemUseNotice(projectId);
  if (!notice.enabled) {
    res.status(200).json({ enabled: false });
    return;
  }
  res.status(200).json({
    enabled: true,
    version: notice.version,
    title: notice.title,
    body: notice.body,
    actionLabel: SYSTEM_USE_NOTICE_ACTION_LABEL,
  });
}

/**
 * Resolves and validates the effective project policy.
 * Explicit Project configuration wins over the server fallback.
 */
export async function resolveSystemUseNotice(projectId: string | undefined): Promise<ResolvedSystemUseNotice> {
  const systemRepo = getGlobalSystemRepo();
  let selectedReference: Reference<DocumentReference> | undefined;
  let selectedProject: WithId<Project> | undefined;

  if (projectId && projectId !== 'new') {
    const project = await systemRepo.readResource<Project>('Project', projectId);
    const policy = getSystemUseNoticeProjectPolicy(project);
    if (policy) {
      if (!policy.enabled) {
        return { enabled: false };
      }
      if (!policy.activeNotice?.reference) {
        throw unavailable();
      }
      selectedReference = policy.activeNotice as Reference<DocumentReference>;
      selectedProject = project;
    }
  }

  if (!selectedReference || !selectedProject) {
    const fallback = getConfig().systemUseNotice;
    if (!fallback.enabledByDefault) {
      return { enabled: false };
    }
    if (!fallback.defaultNoticeReference || !fallback.defaultNoticeProjectId) {
      throw unavailable();
    }
    selectedReference = { reference: fallback.defaultNoticeReference };
    try {
      selectedProject = await systemRepo.readResource<Project>('Project', fallback.defaultNoticeProjectId);
    } catch {
      throw unavailable();
    }
  }

  try {
    const projectRepo = await getProjectSystemRepo(selectedProject);
    const notice = await projectRepo.readReference<DocumentReference>(selectedReference);
    if (notice.meta?.project !== selectedProject.id) {
      throw new Error('Notice belongs to another Project');
    }
    return {
      enabled: true,
      reference: selectedReference,
      ...(await readAndValidateSystemUseNotice(projectRepo, notice, true)),
    };
  } catch {
    throw unavailable();
  }
}

/** Fails server startup when the enabled secure fallback cannot be resolved. */
export async function validateDefaultSystemUseNotice(): Promise<void> {
  if (getConfig().systemUseNotice.enabledByDefault) {
    await resolveSystemUseNotice(undefined);
  }
}

/**
 * Validates the password-login acknowledgement before user lookup or bcrypt.
 */
export function assertSystemUseNoticeAcknowledged(
  notice: ResolvedSystemUseNotice,
  submittedVersion: unknown
): string | undefined {
  if (!notice.enabled) {
    return undefined;
  }
  if (
    typeof submittedVersion !== 'string' ||
    submittedVersion !== notice.version
  ) {
    throw new OperationOutcomeError(badRequest(GENERIC_LOGIN_ERROR));
  }
  return submittedVersion;
}

/**
 * Validates and decodes a profiled notice resource.
 */
export function validateSystemUseNotice(
  notice: DocumentReference,
  requireFinal: boolean
): { version: string; title: string; body: string } {
  const version = notice.masterIdentifier?.value;
  const attachment = notice.content?.[0]?.attachment;
  const title = notice.description;
  if (
    !isSystemUseNotice(notice) ||
    notice.masterIdentifier?.system !== SYSTEM_USE_NOTICE_VERSION_IDENTIFIER_SYSTEM ||
    !version ||
    notice.status !== 'current' ||
    (requireFinal && notice.docStatus !== 'final') ||
    notice.type?.coding?.length !== 1 ||
    notice.type.coding[0].system !== SYSTEM_USE_NOTICE_DOCUMENT_TYPE_SYSTEM ||
    notice.type.coding[0].code !== SYSTEM_USE_NOTICE_DOCUMENT_TYPE_CODE ||
    !title ||
    notice.content?.length !== 1 ||
    attachment?.contentType !== 'text/plain' ||
    attachment.language !== 'en-US' ||
    (!attachment.data && !attachment.url) ||
    !attachment.hash
  ) {
    throw unavailable();
  }

  let body: string;
  try {
    if (!attachment.data) {
      throw new Error('Attachment data must be resolved before synchronous validation');
    }
    const bytes = Buffer.from(attachment.data, 'base64');
    const expectedHash = Buffer.from(attachment.hash, 'base64');
    const actualHash = createHash('sha1').update(bytes).digest();
    if (expectedHash.length !== actualHash.length || !timingSafeEqual(expectedHash, actualHash)) {
      throw new Error('Hash mismatch');
    }
    body = decodeBase64(attachment.data);
  } catch {
    throw unavailable();
  }
  if (!body.trim()) {
    throw unavailable();
  }
  return { version, title, body };
}

/**
 * Resolves a repository-managed Binary attachment before validating its
 * hash and UTF-8 notice text.
 */
export async function readAndValidateSystemUseNotice(
  repo: Repository,
  notice: DocumentReference,
  requireFinal: boolean
): Promise<{ version: string; title: string; body: string }> {
  const attachment = notice.content?.[0]?.attachment;
  if (attachment?.data) {
    return validateSystemUseNotice(notice, requireFinal);
  }
  if (!attachment?.url?.startsWith('Binary/')) {
    throw unavailable();
  }
  const binary = await repo.readReference<Binary>({ reference: attachment.url });
  if (
    !notice.meta?.project ||
    binary.meta?.project !== notice.meta.project ||
    binary.contentType !== 'text/plain' ||
    !binary.data
  ) {
    throw unavailable();
  }
  return validateSystemUseNotice(
    {
      ...notice,
      content: [{ ...notice.content[0], attachment: { ...attachment, data: binary.data } }],
    },
    requireFinal
  );
}

export async function rememberSystemUseNoticeVersion(loginId: string, version: string): Promise<void> {
  await getCacheRedis().set(LOGIN_NOTICE_CACHE_PREFIX + loginId, version, 'EX', LOGIN_NOTICE_TTL_SECONDS);
}

export async function readSystemUseNoticeVersion(loginId: string | undefined): Promise<string | undefined> {
  if (!loginId) {
    return undefined;
  }
  const version = await getCacheRedis().get(LOGIN_NOTICE_CACHE_PREFIX + loginId);
  return version ?? undefined;
}

export async function consumeSystemUseNoticeVersion(loginId: string | undefined): Promise<string | undefined> {
  if (!loginId) {
    return undefined;
  }
  const version = await getCacheRedis().getdel(LOGIN_NOTICE_CACHE_PREFIX + loginId);
  return version ?? undefined;
}

function unavailable(): OperationOutcomeError {
  return new OperationOutcomeError(badRequest(NOTICE_UNAVAILABLE_ERROR));
}
