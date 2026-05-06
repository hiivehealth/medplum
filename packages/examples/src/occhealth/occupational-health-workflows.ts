// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0

import { createReference, getReferenceString, MedplumClient } from '@medplum/core';
import type { CarePlan, Encounter, Patient, ServiceRequest, Task } from '@medplum/fhirtypes';

import {
  occHealthCodeSystems,
  occHealthExtensionUrls,
  occHealthIdentifierSystems,
  occHealthProfileUrls,
} from './occupational-health-foundation';

const medplum = new MedplumClient();

// start-block createOccHealthEmployeeTs
export async function createOccHealthEmployee(medplum: MedplumClient): Promise<Patient> {
  return medplum.createResource<Patient>({
    resourceType: 'Patient',
    meta: {
      profile: [occHealthProfileUrls.employee],
    },
    identifier: [{ system: occHealthIdentifierSystems.employeeId, value: 'DHS-EMP-20481' }],
    name: [{ family: 'Nguyen', given: ['Taylor'] }],
    managingOrganization: { reference: 'Organization/dhs-cbp', display: 'U.S. Customs and Border Protection' },
    extension: [
      { url: occHealthExtensionUrls.jobTitle, valueString: 'Canine Enforcement Officer' },
      { url: occHealthExtensionUrls.dutyLocation, valueString: 'San Ysidro Port of Entry' },
    ],
  });
}
// end-block createOccHealthEmployeeTs

// start-block createOccHealthSurveillanceTs
export async function createOccHealthSurveillanceEnrollment(
  medplum: MedplumClient,
  patient: Patient,
  encounter: Encounter
): Promise<{ serviceRequest: ServiceRequest; carePlan: CarePlan }> {
  const serviceRequest = await medplum.createResource<ServiceRequest>({
    resourceType: 'ServiceRequest',
    status: 'active',
    intent: 'order',
    subject: createReference(patient),
    encounter: createReference(encounter),
    code: {
      coding: [{ system: 'http://loinc.org', code: '5688-7', display: 'Pure tone air conduction threshold panel' }],
      text: 'Annual hearing conservation panel',
    },
    note: [{ text: 'Required for employees in hearing conservation surveillance.' }],
  });

  const carePlan = await medplum.createResource<CarePlan>({
    resourceType: 'CarePlan',
    meta: {
      profile: [occHealthProfileUrls.surveillance],
    },
    status: 'active',
    intent: 'plan',
    title: 'Hearing Conservation Surveillance Program',
    subject: createReference(patient),
    encounter: createReference(encounter),
    category: [
      {
        coding: [
          {
            system: occHealthCodeSystems.surveillancePanel,
            code: 'hearing-conservation',
            display: 'Hearing Conservation',
          },
        ],
      },
    ],
    activity: [{ reference: createReference(serviceRequest) }],
    extension: [
      {
        url: occHealthExtensionUrls.surveillancePanel,
        valueCodeableConcept: {
          coding: [
            {
              system: occHealthCodeSystems.surveillancePanel,
              code: 'hearing-conservation',
              display: 'Hearing Conservation',
            },
          ],
        },
      },
    ],
  });

  return { serviceRequest, carePlan };
}
// end-block createOccHealthSurveillanceTs

// start-block searchOccHealthTasksTs
export async function searchOpenSurveillanceTasks(medplum: MedplumClient, patient: Patient): Promise<Task[]> {
  return medplum.searchResources('Task', {
    patient: getReferenceString(patient),
    code: `${occHealthCodeSystems.taskCode}|surveillance-recall`,
    'status:not': 'completed,cancelled,failed',
  });
}
// end-block searchOccHealthTasksTs

// start-block createOccHealthWorkflowTs
const employee = await createOccHealthEmployee(medplum);

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
  subject: createReference(employee),
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
  ],
});

const enrollment = await createOccHealthSurveillanceEnrollment(medplum, employee, encounter);
const openTasks = await searchOpenSurveillanceTasks(medplum, employee);

console.log(employee, encounter, enrollment, openTasks);
// end-block createOccHealthWorkflowTs
