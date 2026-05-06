// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0

import { createReference, MedplumClient } from '@medplum/core';
import type { Communication, Condition, Encounter, Flag, Patient, Task } from '@medplum/fhirtypes';

import { occHealthCodeSystems, occHealthProfileUrls } from './occupational-health-foundation';

const medplum = new MedplumClient();

// start-block createExposureIncidentTs
export async function createExposureIncident(
  medplum: MedplumClient,
  patient: Patient
): Promise<{ encounter: Encounter; condition: Condition }> {
  const encounter = await medplum.createResource<Encounter>({
    resourceType: 'Encounter',
    meta: {
      profile: [occHealthProfileUrls.encounter],
    },
    status: 'finished',
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'AMB',
      display: 'ambulatory',
    },
    subject: createReference(patient),
    type: [
      {
        coding: [
          {
            system: occHealthCodeSystems.encounterType,
            code: 'post-exposure',
            display: 'Post-exposure evaluation',
          },
        ],
      },
    ],
    period: {
      start: '2026-05-01T14:00:00Z',
      end: '2026-05-01T14:30:00Z',
    },
  });

  const condition = await medplum.createResource<Condition>({
    resourceType: 'Condition',
    clinicalStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }],
    },
    verificationStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed' }],
    },
    category: [{ text: 'Occupational exposure' }],
    code: {
      text: 'Chemical splash exposure during baggage screening operation',
    },
    subject: createReference(patient),
    encounter: createReference(encounter),
    onsetDateTime: '2026-05-01T13:55:00Z',
  });

  return { encounter, condition };
}
// end-block createExposureIncidentTs

// start-block createReturnToWorkTs
export async function createReturnToWorkPlan(
  medplum: MedplumClient,
  patient: Patient,
  encounter: Encounter,
  condition: Condition
): Promise<{ restrictionFlag: Flag; followUpTask: Task; supervisorNotification: Communication }> {
  const restrictionFlag = await medplum.createResource<Flag>({
    resourceType: 'Flag',
    meta: {
      profile: [occHealthProfileUrls.workStatusFlag],
    },
    status: 'active',
    category: [
      {
        coding: [
          {
            system: occHealthCodeSystems.workStatus,
            code: 'restricted',
            display: 'Restricted duty',
          },
        ],
      },
    ],
    code: {
      text: 'Restricted from hazardous materials handling pending reevaluation',
    },
    subject: createReference(patient),
    encounter: createReference(encounter),
    period: {
      start: '2026-05-01',
      end: '2026-05-15',
    },
  });

  const followUpTask = await medplum.createResource<Task>({
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
          code: 'rtw-follow-up',
          display: 'Return-to-work follow-up',
        },
      ],
    },
    description: 'Reevaluate employee for return to unrestricted duty after exposure follow-up.',
    for: createReference(patient),
    encounter: createReference(encounter),
    focus: createReference(condition),
    restriction: {
      period: {
        end: '2026-05-15',
      },
    },
  });

  const supervisorNotification = await medplum.createResource<Communication>({
    resourceType: 'Communication',
    status: 'completed',
    category: [{ text: 'Minimum necessary occupational health disclosure' }],
    subject: createReference(patient),
    about: [createReference(restrictionFlag), createReference(followUpTask)],
    payload: [
      {
        contentString: 'Employee cleared for restricted duty only. No hazardous materials handling until reevaluation is complete.',
      },
    ],
  });

  return { restrictionFlag, followUpTask, supervisorNotification };
}
// end-block createReturnToWorkTs

// start-block createIncidentWorkflowTs
const incidentPatient: Patient = { resourceType: 'Patient', id: 'occupational-employee-2' };

const incident = await createExposureIncident(medplum, incidentPatient);
const rtwPlan = await createReturnToWorkPlan(medplum, incidentPatient, incident.encounter, incident.condition);

console.log({ incident, rtwPlan });
// end-block createIncidentWorkflowTs
