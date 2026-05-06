// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0

import type { Bundle, Patient } from '@medplum/fhirtypes';

import {
  occHealthCodeSystems,
  occHealthExtensionUrls,
  occHealthIdentifierSystems,
  occHealthProfileUrls,
} from './occupational-health-foundation';

export interface OccHealthPersona {
  readonly id: string;
  readonly label: string;
  readonly workflow: 'direct-care' | 'review-only' | 'return-to-work' | 'injury';
  readonly patient: Patient;
}

export const occHealthPersonas: OccHealthPersona[] = [
  {
    id: 'direct-care-law-enforcement',
    label: 'Law Enforcement Annual Fitness Review',
    workflow: 'direct-care',
    patient: {
      resourceType: 'Patient',
      meta: { profile: [occHealthProfileUrls.employee] },
      identifier: [{ system: occHealthIdentifierSystems.employeeId, value: 'DHS-EMP-31001' }],
      name: [{ family: 'Brooks', given: ['Jordan'] }],
      extension: [
        { url: occHealthExtensionUrls.jobTitle, valueString: 'Federal Air Marshal' },
        { url: occHealthExtensionUrls.dutyLocation, valueString: 'Washington Field Office' },
        {
          url: occHealthExtensionUrls.component,
          valueCodeableConcept: {
            coding: [{ system: occHealthCodeSystems.employeeComponent, code: 'tsa', display: 'Transportation Security Administration' }],
          },
        },
      ],
    },
  },
  {
    id: 'review-only-external-provider',
    label: 'External Provider Review-Only Exam',
    workflow: 'review-only',
    patient: {
      resourceType: 'Patient',
      meta: { profile: [occHealthProfileUrls.employee] },
      identifier: [{ system: occHealthIdentifierSystems.employeeId, value: 'DHS-EMP-31002' }],
      name: [{ family: 'Moreno', given: ['Casey'] }],
      extension: [
        { url: occHealthExtensionUrls.jobTitle, valueString: 'Intelligence Research Specialist' },
        { url: occHealthExtensionUrls.dutyLocation, valueString: 'Remote Duty Station' },
      ],
    },
  },
  {
    id: 'restricted-duty-rtw',
    label: 'Restricted Duty Return-to-Work Follow-up',
    workflow: 'return-to-work',
    patient: {
      resourceType: 'Patient',
      meta: { profile: [occHealthProfileUrls.employee] },
      identifier: [{ system: occHealthIdentifierSystems.employeeId, value: 'DHS-EMP-31003' }],
      name: [{ family: 'Patel', given: ['Avery'] }],
      extension: [
        { url: occHealthExtensionUrls.jobTitle, valueString: 'Protective Security Officer' },
        { url: occHealthExtensionUrls.dutyLocation, valueString: 'FLETC Charleston Campus' },
      ],
    },
  },
  {
    id: 'injury-exposure-follow-up',
    label: 'Workplace Injury and Exposure Follow-up',
    workflow: 'injury',
    patient: {
      resourceType: 'Patient',
      meta: { profile: [occHealthProfileUrls.employee] },
      identifier: [{ system: occHealthIdentifierSystems.employeeId, value: 'DHS-EMP-31004' }],
      name: [{ family: 'Kim', given: ['Morgan'] }],
      extension: [
        { url: occHealthExtensionUrls.jobTitle, valueString: 'Hazardous Materials Specialist' },
        { url: occHealthExtensionUrls.dutyLocation, valueString: 'Border Logistics Facility' },
        {
          url: occHealthExtensionUrls.similarExposureGroup,
          valueCodeableConcept: {
            coding: [
              {
                system: occHealthCodeSystems.similarExposureGroup,
                code: 'aviation-screening',
                display: 'Aviation Screening Operations',
              },
            ],
          },
        },
      ],
    },
  },
];

// start-block occHealthPersonaBundleTs
export const occHealthPersonaBundle: Bundle = {
  resourceType: 'Bundle',
  type: 'collection',
  entry: occHealthPersonas.map((persona) => ({
    fullUrl: `urn:uuid:${persona.id}`,
    resource: persona.patient,
  })),
};
// end-block occHealthPersonaBundleTs
