// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0

import { MedplumClient } from '@medplum/core';

import { occHealthFoundationBundle } from './occupational-health-foundation';

// start-block loadOccHealthFoundationTs
export async function loadOccHealthFoundation(medplum: MedplumClient): Promise<void> {
  await medplum.executeBatch(occHealthFoundationBundle);
}

const medplum = new MedplumClient();
await loadOccHealthFoundation(medplum);
// end-block loadOccHealthFoundationTs
