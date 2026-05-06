// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0

import { createReference, getReferenceString, MedplumClient } from '@medplum/core';
import type { DocumentReference, Encounter, Patient, Task } from '@medplum/fhirtypes';

import {
  occHealthCodeSystems,
  occHealthExtensionUrls,
  occHealthProfileUrls,
} from './occupational-health-foundation';

// start-block createReviewOnlyExamImportTs
export async function createReviewOnlyExamImport(
  medplum: MedplumClient,
  patient: Patient
): Promise<{ documentReference: DocumentReference; encounter: Encounter; reviewTask: Task }> {
  const binary = await medplum.createBinary({
    data: 'occupational-exam-pdf-data',
    filename: 'outside-occupational-exam.pdf',
    contentType: 'application/pdf',
  });

  const documentReference = await medplum.createResource<DocumentReference>({
    resourceType: 'DocumentReference',
    status: 'current',
    subject: createReference(patient),
    type: {
      text: 'Outside occupational examination results',
    },
    content: [
      {
        attachment: {
          contentType: 'application/pdf',
          title: 'Outside occupational examination report',
          url: getReferenceString(binary),
        },
      },
    ],
  });

  const encounter = await medplum.createResource<Encounter>({
    resourceType: 'Encounter',
    meta: {
      profile: [occHealthProfileUrls.encounter],
    },
    status: 'finished',
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'VR',
      display: 'virtual',
    },
    subject: createReference(patient),
    type: [
      {
        coding: [
          {
            system: occHealthCodeSystems.encounterType,
            code: 'periodic',
            display: 'Periodic occupational exam',
          },
        ],
      },
    ],
    extension: [
      {
        url: occHealthExtensionUrls.examType,
        valueCodeableConcept: {
          coding: [
            {
              system: occHealthCodeSystems.encounterType,
              code: 'periodic',
              display: 'Periodic occupational exam',
            },
          ],
        },
      },
      {
        url: occHealthExtensionUrls.reviewOnly,
        valueBoolean: true,
      },
    ],
  });

  const reviewTask = await medplum.createResource<Task>({
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
      text: 'Review imported occupational exam',
    },
    description: 'Occupational health clinician review required for imported outside exam results.',
    for: createReference(patient),
    encounter: createReference(encounter),
    focus: createReference(documentReference),
  });

  return { documentReference, encounter, reviewTask };
}
// end-block createReviewOnlyExamImportTs
