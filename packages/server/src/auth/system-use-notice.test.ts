// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import {
  encodeBase64,
  SYSTEM_USE_NOTICE_DOCUMENT_TYPE_CODE,
  SYSTEM_USE_NOTICE_DOCUMENT_TYPE_SYSTEM,
  SYSTEM_USE_NOTICE_PROFILE_URL,
  SYSTEM_USE_NOTICE_VERSION_IDENTIFIER_SYSTEM,
} from '@medplum/core';
import type { DocumentReference } from '@medplum/fhirtypes';
import { createHash } from 'node:crypto';
import { assertSystemUseNoticeAcknowledged, validateSystemUseNotice } from './system-use-notice';

function makeNotice(body = 'Approved notice'): DocumentReference {
  return {
    resourceType: 'DocumentReference',
    meta: { profile: [SYSTEM_USE_NOTICE_PROFILE_URL] },
    masterIdentifier: {
      system: SYSTEM_USE_NOTICE_VERSION_IDENTIFIER_SYSTEM,
      value: 'usg-system-use-2026-09-10',
    },
    status: 'current',
    docStatus: 'final',
    type: {
      coding: [{ system: SYSTEM_USE_NOTICE_DOCUMENT_TYPE_SYSTEM, code: SYSTEM_USE_NOTICE_DOCUMENT_TYPE_CODE }],
    },
    description: 'System Use Notice',
    content: [
      {
        attachment: {
          contentType: 'text/plain',
          language: 'en-US',
          data: encodeBase64(body),
          hash: createHash('sha1').update(body).digest('base64'),
        },
      },
    ],
  };
}

describe('System use notice', () => {
  test('Validates and decodes an approved final notice', () => {
    expect(validateSystemUseNotice(makeNotice(), true)).toStrictEqual({
      version: 'usg-system-use-2026-09-10',
      title: 'System Use Notice',
      body: 'Approved notice',
    });
  });

  test('Rejects modified content and non-final notices', () => {
    const modified = makeNotice();
    modified.content[0].attachment.data = encodeBase64('Modified');
    expect(() => validateSystemUseNotice(modified, true)).toThrow('System use notice is unavailable');

    const draft = makeNotice();
    draft.docStatus = 'preliminary';
    expect(() => validateSystemUseNotice(draft, true)).toThrow('System use notice is unavailable');
    expect(() => validateSystemUseNotice(draft, false)).not.toThrow();
  });

  test('Requires only the exact active version when enabled', () => {
    const enabled = { enabled: true, version: 'v2', title: 'Title', body: 'Body' };
    expect(() => assertSystemUseNoticeAcknowledged(enabled, undefined)).toThrow('Invalid login request');
    expect(() => assertSystemUseNoticeAcknowledged(enabled, 'v1')).toThrow('Invalid login request');
    expect(assertSystemUseNoticeAcknowledged(enabled, 'v2')).toBe('v2');
    expect(assertSystemUseNoticeAcknowledged({ enabled: false }, 'unsolicited')).toBeUndefined();
  });
});
