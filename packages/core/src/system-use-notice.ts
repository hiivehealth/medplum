// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import type { Extension, Project, Reference } from '@medplum/fhirtypes';

export const SYSTEM_USE_NOTICE_PROFILE_URL =
  'https://ehr.hiivehealth.net/fhir/StructureDefinition/hiive-system-use-notice';
export const SYSTEM_USE_NOTICE_POLICY_URL =
  'https://ehr.hiivehealth.net/fhir/StructureDefinition/system-use-notice-policy';
export const SYSTEM_USE_NOTICE_VERSION_URL =
  'https://ehr.hiivehealth.net/fhir/StructureDefinition/system-use-notice-version';
export const SYSTEM_USE_NOTICE_ENABLED_URL = 'enabled';
export const SYSTEM_USE_NOTICE_ACTIVE_NOTICE_URL = 'activeNotice';
export const SYSTEM_USE_NOTICE_VERSION_IDENTIFIER_SYSTEM =
  'https://ehr.hiivehealth.net/fhir/NamingSystem/system-use-notice-version';
export const SYSTEM_USE_NOTICE_DOCUMENT_TYPE_SYSTEM = 'https://ehr.hiivehealth.net/fhir/CodeSystem/document-type';
export const SYSTEM_USE_NOTICE_DOCUMENT_TYPE_CODE = 'system-use-notice';
export const SYSTEM_USE_NOTICE_ACTION_LABEL = 'OK';
export const MAX_SYSTEM_USE_NOTICE_VERSION_LENGTH = 128;

export interface SystemUseNoticeRequest {
  readonly clientId?: string;
  readonly projectId?: string;
}

export type SystemUseNoticeResponse =
  | { readonly enabled: false }
  | {
      readonly enabled: true;
      readonly version: string;
      readonly title: string;
      readonly body: string;
      readonly actionLabel: typeof SYSTEM_USE_NOTICE_ACTION_LABEL;
    };

export interface SystemUseNoticeProjectPolicy {
  readonly enabled: boolean;
  readonly activeNotice?: Reference;
}

/**
 * Reads an explicit system use notice policy from a Project.
 * @param project - Project containing the policy extension.
 * @returns Policy values, or undefined when no explicit policy exists.
 */
export function getSystemUseNoticeProjectPolicy(project: Project): SystemUseNoticeProjectPolicy | undefined {
  const policy = project.extension?.find((extension) => extension.url === SYSTEM_USE_NOTICE_POLICY_URL);
  if (!policy) {
    return undefined;
  }
  const enabled = policy.extension?.find((extension) => extension.url === SYSTEM_USE_NOTICE_ENABLED_URL)?.valueBoolean;
  const activeNotice = policy.extension?.find(
    (extension) => extension.url === SYSTEM_USE_NOTICE_ACTIVE_NOTICE_URL
  )?.valueReference;
  return { enabled: enabled === true, activeNotice };
}

/**
 * Creates the controlled Project policy extension.
 * @param policy - Enabled state and selected immutable notice.
 * @returns FHIR extension for Project.extension.
 */
export function createSystemUseNoticeProjectPolicyExtension(policy: SystemUseNoticeProjectPolicy): Extension {
  const extension: Extension[] = [{ url: SYSTEM_USE_NOTICE_ENABLED_URL, valueBoolean: policy.enabled }];
  if (policy.activeNotice) {
    extension.push({ url: SYSTEM_USE_NOTICE_ACTIVE_NOTICE_URL, valueReference: policy.activeNotice });
  }
  return { url: SYSTEM_USE_NOTICE_POLICY_URL, extension };
}
