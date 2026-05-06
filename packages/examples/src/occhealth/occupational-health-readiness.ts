// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0

import { getReferenceString, MedplumClient } from '@medplum/core';
import type { CarePlan, Encounter, Flag, Patient, Task } from '@medplum/fhirtypes';

import { occHealthCodeSystems } from './occupational-health-foundation';

const medplum = new MedplumClient();

// start-block searchReadinessFlagsTs
export async function searchWorkStatusFlags(medplum: MedplumClient, patient: Patient): Promise<Flag[]> {
  return medplum.searchResources('Flag', {
    subject: getReferenceString(patient),
    status: 'active',
    _sort: '-date',
  });
}
// end-block searchReadinessFlagsTs

// start-block searchOpenOccHealthTasksTs
export async function searchOpenOccHealthTasks(medplum: MedplumClient, patient: Patient): Promise<Task[]> {
  return medplum.searchResources('Task', {
    patient: getReferenceString(patient),
    code: `${occHealthCodeSystems.taskCode}|surveillance-recall,${occHealthCodeSystems.taskCode}|rtw-follow-up`,
    'status:not': 'completed,cancelled,failed',
    _sort: '_lastUpdated',
  });
}
// end-block searchOpenOccHealthTasksTs

// start-block searchActiveSurveillancePlansTs
export async function searchActiveSurveillancePlans(medplum: MedplumClient, patient: Patient): Promise<CarePlan[]> {
  return medplum.searchResources('CarePlan', {
    subject: getReferenceString(patient),
    status: 'active',
    _elements: 'status,title,subject,category,activity',
  });
}
// end-block searchActiveSurveillancePlansTs

// start-block searchReviewOnlyEncountersTs
export async function searchReviewOnlyEncounters(medplum: MedplumClient, patient: Patient): Promise<Encounter[]> {
  return medplum.searchResources('Encounter', {
    subject: getReferenceString(patient),
    status: 'finished',
    _summary: true,
    _sort: '-date',
  });
}
// end-block searchReviewOnlyEncountersTs

// start-block buildReadinessSnapshotTs
const readinessPatient: Patient = { resourceType: 'Patient', id: 'occupational-employee-1' };

const [flags, tasks, carePlans, encounters] = await Promise.all([
  searchWorkStatusFlags(medplum, readinessPatient),
  searchOpenOccHealthTasks(medplum, readinessPatient),
  searchActiveSurveillancePlans(medplum, readinessPatient),
  searchReviewOnlyEncounters(medplum, readinessPatient),
]);

console.log({ flags, tasks, carePlans, encounters });
// end-block buildReadinessSnapshotTs
