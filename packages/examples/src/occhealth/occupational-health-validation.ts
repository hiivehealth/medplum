// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0

import { validateResource } from '@medplum/core';
import type { Encounter, Patient } from '@medplum/fhirtypes';

import {
  occHealthExtensionUrls,
  occHealthIdentifierSystems,
  occHealthProfileUrls,
  occHealthCodeSystems,
} from './occupational-health-foundation';
import { occHealthEmployeeProfile, occHealthEncounterProfile } from './occupational-health-profiles';

const employeeExample: Patient = {
  resourceType: 'Patient',
  meta: {
    profile: [occHealthProfileUrls.employee],
  },
  identifier: [{ system: occHealthIdentifierSystems.employeeId, value: 'DHS-EMP-40001' }],
  name: [{ family: 'Singh', given: ['Taylor'] }],
  extension: [
    { url: occHealthExtensionUrls.jobTitle, valueString: 'Occupational Health Nurse' },
    { url: occHealthExtensionUrls.dutyLocation, valueString: 'National Capital Region Clinic' },
  ],
};

const encounterExample: Encounter = {
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
};

// start-block validateOccHealthExamplesTs
const employeeValidationResult = validateResource(employeeExample, { profile: occHealthEmployeeProfile });
const encounterValidationResult = validateResource(encounterExample, { profile: occHealthEncounterProfile });

console.log({ employeeValidationResult, encounterValidationResult });
// end-block validateOccHealthExamplesTs
