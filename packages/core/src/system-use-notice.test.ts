// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import type { Project, Resource } from '@medplum/fhirtypes';
import {
  createSystemUseNoticeProjectPolicyExtension,
  getSystemUseNoticeProjectPolicy,
  isSystemUseNotice,
} from './system-use-notice';

describe('System use notice', () => {
  test('Creates and reads the controlled Project extension', () => {
    const activeNotice = { reference: 'DocumentReference/00000000-0000-4000-8000-000000000001' };
    const project: Project = {
      resourceType: 'Project',
      extension: [createSystemUseNoticeProjectPolicyExtension({ enabled: true, activeNotice })],
    };

    expect(getSystemUseNoticeProjectPolicy(project)).toStrictEqual({ enabled: true, activeNotice });
  });

  test('Distinguishes absent and explicitly disabled policy', () => {
    expect(getSystemUseNoticeProjectPolicy({ resourceType: 'Project' })).toBeUndefined();
    const project: Project = {
      resourceType: 'Project',
      extension: [createSystemUseNoticeProjectPolicyExtension({ enabled: false })],
    };
    expect(getSystemUseNoticeProjectPolicy(project)).toStrictEqual({ enabled: false, activeNotice: undefined });
  });

  test('Identifies profiled notice DocumentReferences', () => {
    expect(
      isSystemUseNotice({
        resourceType: 'DocumentReference',
        meta: { profile: ['https://ehr.hiivehealth.net/fhir/StructureDefinition/hiive-system-use-notice'] },
      } as Resource)
    ).toBe(true);
    expect(
      isSystemUseNotice({
        resourceType: 'DocumentReference',
        meta: {
          profile: ['https://evil.example/https://ehr.hiivehealth.net/fhir/StructureDefinition/hiive-system-use-notice'],
        },
      } as Resource)
    ).toBe(false);
    expect(isSystemUseNotice({ resourceType: 'DocumentReference' } as Resource)).toBe(false);
    expect(isSystemUseNotice({ resourceType: 'Patient' } as Resource)).toBe(false);
  });
});
