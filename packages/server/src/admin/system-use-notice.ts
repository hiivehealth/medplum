// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import {
  badRequest,
  createSystemUseNoticeProjectPolicyExtension,
  encodeBase64,
  isSystemUseNotice,
  OperationOutcomeError,
  Operator,
  SYSTEM_USE_NOTICE_DOCUMENT_TYPE_CODE,
  SYSTEM_USE_NOTICE_DOCUMENT_TYPE_SYSTEM,
  SYSTEM_USE_NOTICE_POLICY_URL,
  SYSTEM_USE_NOTICE_PROFILE_URL,
  SYSTEM_USE_NOTICE_VERSION_IDENTIFIER_SYSTEM,
} from '@medplum/core';
import type { DocumentReference, Project, Reference } from '@medplum/fhirtypes';
import type { Request, Response } from 'express';
import { Router } from 'express';
import { body } from 'express-validator';
import { createHash } from 'node:crypto';
import { readAndValidateSystemUseNotice, validateSystemUseNotice } from '../auth/system-use-notice';
import { requireSuperAdmin } from '../context';
import type { Repository } from '../fhir/repo';
import { getGlobalSystemRepo, getProjectSystemRepo } from '../fhir/repo';
import { makeValidationMiddleware } from '../util/validator';

export const systemUseNoticeAdminRouter = Router();

const createValidator = makeValidationMiddleware([
  body('version').isString().trim().notEmpty().withMessage('Invalid version'),
  body('title').isString().trim().notEmpty().withMessage('Invalid title'),
  body('body').isString().notEmpty().withMessage('Invalid body'),
  body('replaces')
    .optional()
    .isString()
    .matches(/^DocumentReference\/[0-9a-f-]{36}$/i)
    .withMessage('Invalid replaces'),
]);

systemUseNoticeAdminRouter.get('/projects/:projectId/notices', async (req: Request, res: Response) => {
  const systemRepo = await getAdminProjectRepo(req.params.projectId as string);
  const resources = await systemRepo.searchResources<DocumentReference>({
    resourceType: 'DocumentReference',
    count: 1000,
    filters: [
      {
        code: 'type',
        operator: Operator.EQUALS,
        value: `${SYSTEM_USE_NOTICE_DOCUMENT_TYPE_SYSTEM}|${SYSTEM_USE_NOTICE_DOCUMENT_TYPE_CODE}`,
      },
    ],
  });
  res.status(200).json(resources.filter(isSystemUseNotice));
});

systemUseNoticeAdminRouter.post(
  '/projects/:projectId/notices',
  createValidator,
  async (req: Request, res: Response) => {
    assertOnlyKeys(req.body, ['version', 'title', 'body', 'replaces']);
    const systemRepo = await getAdminProjectRepo(req.params.projectId as string);
    const version = req.body.version as string;
    await assertVersionUnique(systemRepo, version);

    let relatesTo: DocumentReference['relatesTo'];
    if (req.body.replaces) {
      const target = { reference: req.body.replaces as string } as Reference<DocumentReference>;
      const previous = await systemRepo.readReference<DocumentReference>(target);
      await readAndValidateSystemUseNotice(systemRepo, previous, true);
      relatesTo = [{ code: 'replaces', target }];
    }

    const text = req.body.body as string;
    const data = encodeBase64(text);
    const notice: DocumentReference = {
      resourceType: 'DocumentReference',
      meta: { profile: [SYSTEM_USE_NOTICE_PROFILE_URL], project: req.params.projectId as string },
      masterIdentifier: { system: SYSTEM_USE_NOTICE_VERSION_IDENTIFIER_SYSTEM, value: version },
      status: 'current',
      docStatus: 'preliminary',
      type: {
        coding: [{ system: SYSTEM_USE_NOTICE_DOCUMENT_TYPE_SYSTEM, code: SYSTEM_USE_NOTICE_DOCUMENT_TYPE_CODE }],
      },
      description: req.body.title as string,
      relatesTo,
      content: [
        {
          attachment: {
            contentType: 'text/plain',
            language: 'en-US',
            data,
            hash: createHash('sha1').update(Buffer.from(text, 'utf8')).digest('base64'),
          },
        },
      ],
    };
    await readAndValidateSystemUseNotice(systemRepo, notice, false);
    res.status(201).json(await systemRepo.createResource(notice));
  }
);

systemUseNoticeAdminRouter.post('/projects/:projectId/notices/:id/publish', async (req: Request, res: Response) => {
  assertOnlyKeys(req.body, []);
  const systemRepo = await getAdminProjectRepo(req.params.projectId as string);
  const notice = await systemRepo.readResource<DocumentReference>('DocumentReference', req.params.id as string);
  if (!isSystemUseNotice(notice) || notice.docStatus !== 'preliminary') {
    throw new OperationOutcomeError(badRequest('Notice is not publishable'));
  }
  validateSystemUseNotice(notice, false);
  await assertVersionUnique(systemRepo, notice.masterIdentifier?.value as string, notice.id);
  res.status(200).json(await systemRepo.updateResource({ ...notice, docStatus: 'final' }));
});

systemUseNoticeAdminRouter.post('/projects/:projectId/policy', async (req: Request, res: Response) => {
  assertOnlyKeys(req.body, ['enabled', 'activeNotice']);
  if (typeof req.body.enabled !== 'boolean') {
    throw new OperationOutcomeError(badRequest('Invalid enabled'));
  }
  const systemRepo = await getAdminProjectRepo(req.params.projectId as string);
  const project = await getGlobalSystemRepo().readResource<Project>('Project', req.params.projectId as string);
  let activeNotice: Reference<DocumentReference> | undefined;
  if (req.body.enabled) {
    if (
      typeof req.body.activeNotice !== 'string' ||
      !/^DocumentReference\/[0-9a-f-]{36}$/i.test(req.body.activeNotice)
    ) {
      throw new OperationOutcomeError(badRequest('Invalid activeNotice'));
    }
    activeNotice = { reference: req.body.activeNotice };
    await readAndValidateSystemUseNotice(
      systemRepo,
      await systemRepo.readReference<DocumentReference>(activeNotice),
      true
    );
  }

  const policy = createSystemUseNoticeProjectPolicyExtension({ enabled: req.body.enabled, activeNotice });
  const extension = (project.extension ?? []).filter((item) => item.url !== SYSTEM_USE_NOTICE_POLICY_URL);
  extension.push(policy);
  res.status(200).json(await getGlobalSystemRepo().updateResource({ ...project, extension }));
});

async function assertVersionUnique(repo: Repository, version: string, excludeId?: string): Promise<void> {
  const matches = await repo.searchResources<DocumentReference>({
    resourceType: 'DocumentReference',
    count: 2,
    filters: [
      {
        code: 'identifier',
        operator: Operator.EQUALS,
        value: `${SYSTEM_USE_NOTICE_VERSION_IDENTIFIER_SYSTEM}|${version}`,
      },
    ],
  });
  if (matches.some((resource) => resource.id !== excludeId && isSystemUseNotice(resource))) {
    throw new OperationOutcomeError(badRequest('Notice version already exists'));
  }
}

async function getAdminProjectRepo(projectId: string): Promise<Repository> {
  requireSuperAdmin();
  const project = await getGlobalSystemRepo().readResource<Project>('Project', projectId);
  return getProjectSystemRepo(project);
}

function assertOnlyKeys(value: unknown, allowedKeys: string[]): void {
  if (
    !value ||
    typeof value !== 'object' ||
    Object.keys(value as Record<string, unknown>).some((key) => !allowedKeys.includes(key))
  ) {
    throw new OperationOutcomeError(badRequest('Invalid request'));
  }
}
