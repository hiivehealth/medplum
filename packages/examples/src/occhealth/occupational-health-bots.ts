// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0

import type { BotEvent, MedplumClient } from '@medplum/core';
import { createReference, getReferenceString } from '@medplum/core';
import type { ServiceRequest, Task } from '@medplum/fhirtypes';

import { occHealthCodeSystems, occHealthProfileUrls } from './occupational-health-foundation';

// start-block createSurveillanceRecallTaskBotTs
export async function handler(medplum: MedplumClient, event: BotEvent<ServiceRequest>): Promise<boolean> {
  const serviceRequest = event.input;

  if (serviceRequest.resourceType !== 'ServiceRequest' || serviceRequest.status !== 'active' || !serviceRequest.subject) {
    return false;
  }

  const existingTasks = await medplum.searchResources('Task', {
    focus: getReferenceString(serviceRequest),
    code: `${occHealthCodeSystems.taskCode}|surveillance-recall`,
    'status:not': 'completed,cancelled,failed',
  });

  if (existingTasks.length > 0) {
    return false;
  }

  const task: Task = {
    resourceType: 'Task',
    meta: {
      profile: [occHealthProfileUrls.followUpTask],
    },
    status: 'ready',
    intent: 'order',
    code: {
      coding: [
        {
          system: occHealthCodeSystems.taskCode,
          code: 'surveillance-recall',
          display: 'Occupational surveillance recall',
        },
      ],
    },
    description: `Schedule follow-up surveillance for ${serviceRequest.code?.text ?? 'occupational health service request'}.`,
    focus: createReference(serviceRequest),
    for: serviceRequest.subject,
    encounter: serviceRequest.encounter,
    owner: serviceRequest.requester,
  };

  await medplum.createResource(task);
  return true;
}
// end-block createSurveillanceRecallTaskBotTs
