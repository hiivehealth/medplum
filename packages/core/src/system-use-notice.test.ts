// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import type { Project } from '@medplum/fhirtypes';
import { createSystemUseNoticeProjectPolicyExtension, getSystemUseNoticeProjectPolicy } from './system-use-notice';

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
});
