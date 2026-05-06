// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0

import type { Bundle } from '@medplum/fhirtypes';

export const OCCHEALTH_BASE_URL = 'https://medplum.com/profiles/occupational-health';

export const occHealthProfileUrls = {
  employee: `${OCCHEALTH_BASE_URL}/StructureDefinition/occupational-health-employee`,
  encounter: `${OCCHEALTH_BASE_URL}/StructureDefinition/occupational-health-encounter`,
  surveillance: `${OCCHEALTH_BASE_URL}/StructureDefinition/occupational-health-surveillance`,
  followUpTask: `${OCCHEALTH_BASE_URL}/StructureDefinition/occupational-health-follow-up-task`,
  workStatusFlag: `${OCCHEALTH_BASE_URL}/StructureDefinition/occupational-health-work-status-flag`,
} as const;

export const occHealthExtensionUrls = {
  component: `${OCCHEALTH_BASE_URL}/StructureDefinition/employee-component`,
  jobTitle: `${OCCHEALTH_BASE_URL}/StructureDefinition/employee-job-title`,
  dutyLocation: `${OCCHEALTH_BASE_URL}/StructureDefinition/employee-duty-location`,
  similarExposureGroup: `${OCCHEALTH_BASE_URL}/StructureDefinition/similar-exposure-group`,
  examType: `${OCCHEALTH_BASE_URL}/StructureDefinition/exam-type`,
  surveillancePanel: `${OCCHEALTH_BASE_URL}/StructureDefinition/surveillance-panel`,
  reviewOnly: `${OCCHEALTH_BASE_URL}/StructureDefinition/review-only-workflow`,
} as const;

export const occHealthCodeSystems = {
  employeeComponent: `${OCCHEALTH_BASE_URL}/CodeSystem/employee-component`,
  surveillancePanel: `${OCCHEALTH_BASE_URL}/CodeSystem/surveillance-panel`,
  encounterType: `${OCCHEALTH_BASE_URL}/CodeSystem/encounter-type`,
  workStatus: `${OCCHEALTH_BASE_URL}/CodeSystem/work-status`,
  similarExposureGroup: `${OCCHEALTH_BASE_URL}/CodeSystem/similar-exposure-group`,
  taskCode: `${OCCHEALTH_BASE_URL}/CodeSystem/task-code`,
} as const;

export const occHealthIdentifierSystems = {
  component: `${OCCHEALTH_BASE_URL}/identifier/component`,
  clinic: `${OCCHEALTH_BASE_URL}/identifier/clinic`,
  employeeId: `${OCCHEALTH_BASE_URL}/identifier/employee-id`,
} as const;

const componentOrgFullUrl = 'urn:uuid:6c2b0d9d-0627-45df-bf2e-d49f2e332001';
const clinicOrgFullUrl = 'urn:uuid:c35d5383-f588-4dc1-8c44-ae1a0ecb2002';
const practitionerFullUrl = 'urn:uuid:9bce9af5-954e-4d91-a8a1-4543c2a59003';
const patientFullUrl = 'urn:uuid:fcd2c565-0bd2-49cd-aa8f-8441ab1fa004';
const encounterFullUrl = 'urn:uuid:da7ef2df-d33c-4629-918f-0dabf6ea9005';
const surveillancePlanFullUrl = 'urn:uuid:0ba9ebcf-6a9c-43bb-8e1a-5360ed84c006';
const surveillanceRequestFullUrl = 'urn:uuid:91a1ef67-7baf-4fac-b54f-88d99c841010';
const leadLevelFullUrl = 'urn:uuid:16643905-a048-43bc-8ca8-84bb014f2007';
const followUpTaskFullUrl = 'urn:uuid:eaf8852e-4f9c-4358-a6a9-c56378ef1008';
const workStatusFlagFullUrl = 'urn:uuid:cdca8c16-713f-45ad-b94a-e385dffb5009';

export const occHealthFoundationBundle: Bundle = {
  resourceType: 'Bundle',
  type: 'transaction',
  entry: [
    {
      fullUrl: componentOrgFullUrl,
      resource: {
        resourceType: 'Organization',
        name: 'DHS Transportation Security Administration',
        identifier: [{ system: occHealthIdentifierSystems.component, value: 'tsa' }],
      },
      request: {
        method: 'POST',
        url: 'Organization',
      },
    },
    {
      fullUrl: clinicOrgFullUrl,
      resource: {
        resourceType: 'Organization',
        name: 'DHS Occupational Health Clinic - National Capital Region',
        identifier: [{ system: occHealthIdentifierSystems.clinic, value: 'dhs-ohc-ncr' }],
        partOf: { reference: componentOrgFullUrl, display: 'DHS Transportation Security Administration' },
      },
      request: {
        method: 'POST',
        url: 'Organization',
      },
    },
    {
      fullUrl: practitionerFullUrl,
      resource: {
        resourceType: 'Practitioner',
        identifier: [{ system: 'http://hl7.org/fhir/sid/us-npi', value: '1992992999' }],
        name: [{ family: 'Rivera', given: ['Morgan'], prefix: ['Dr.'] }],
      },
      request: {
        method: 'POST',
        url: 'Practitioner',
      },
    },
    {
      fullUrl: patientFullUrl,
      resource: {
        resourceType: 'Patient',
        meta: {
          profile: [occHealthProfileUrls.employee],
        },
        identifier: [
          { system: occHealthIdentifierSystems.employeeId, value: 'DHS-EMP-10427' },
          { system: 'http://hl7.org/fhir/sid/us-ssn', value: '999-88-7777' },
        ],
        name: [{ family: 'Coleman', given: ['Alex'] }],
        gender: 'female',
        birthDate: '1987-02-14',
        managingOrganization: { reference: componentOrgFullUrl, display: 'DHS Transportation Security Administration' },
        extension: [
          {
            url: occHealthExtensionUrls.component,
            valueCodeableConcept: {
              coding: [
                {
                  system: occHealthCodeSystems.employeeComponent,
                  code: 'tsa',
                  display: 'Transportation Security Administration',
                },
              ],
            },
          },
          { url: occHealthExtensionUrls.jobTitle, valueString: 'Explosives Detection Specialist' },
          { url: occHealthExtensionUrls.dutyLocation, valueString: 'Washington Dulles International Airport' },
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
      request: {
        method: 'POST',
        url: 'Patient',
      },
    },
    {
      fullUrl: encounterFullUrl,
      resource: {
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
        type: [
          {
            coding: [
              {
                system: occHealthCodeSystems.encounterType,
                code: 'pre-placement',
                display: 'Pre-placement occupational exam',
              },
            ],
          },
        ],
        subject: { reference: patientFullUrl, display: 'Alex Coleman' },
        serviceProvider: { reference: clinicOrgFullUrl, display: 'DHS Occupational Health Clinic - National Capital Region' },
        participant: [{ individual: { reference: practitionerFullUrl, display: 'Dr. Morgan Rivera' } }],
        period: {
          start: '2026-04-10T13:00:00Z',
          end: '2026-04-10T13:45:00Z',
        },
        extension: [
          {
            url: occHealthExtensionUrls.examType,
            valueCodeableConcept: {
              coding: [
                {
                  system: occHealthCodeSystems.encounterType,
                  code: 'pre-placement',
                  display: 'Pre-placement occupational exam',
                },
              ],
            },
          },
          { url: occHealthExtensionUrls.reviewOnly, valueBoolean: false },
        ],
      },
      request: {
        method: 'POST',
        url: 'Encounter',
      },
    },
    {
      fullUrl: surveillancePlanFullUrl,
      resource: {
        resourceType: 'CarePlan',
        meta: {
          profile: [occHealthProfileUrls.surveillance],
        },
        status: 'active',
        intent: 'plan',
        title: 'Blood Lead Surveillance Program',
        subject: { reference: patientFullUrl, display: 'Alex Coleman' },
        encounter: { reference: encounterFullUrl, display: 'Pre-placement occupational exam' },
        category: [
          {
            coding: [
              {
                system: occHealthCodeSystems.surveillancePanel,
                code: 'blood-lead',
                display: 'Blood Lead Surveillance',
              },
            ],
          },
        ],
        activity: [
          {
            reference: { reference: surveillanceRequestFullUrl, display: 'Baseline blood lead service request' },
          },
        ],
        extension: [
          {
            url: occHealthExtensionUrls.surveillancePanel,
            valueCodeableConcept: {
              coding: [
                {
                  system: occHealthCodeSystems.surveillancePanel,
                  code: 'blood-lead',
                  display: 'Blood Lead Surveillance',
                },
              ],
            },
          },
        ],
      },
      request: {
        method: 'POST',
        url: 'CarePlan',
      },
    },
    {
      fullUrl: surveillanceRequestFullUrl,
      resource: {
        resourceType: 'ServiceRequest',
        status: 'active',
        intent: 'order',
        code: {
          coding: [{ system: 'http://loinc.org', code: '5671-3', display: 'Lead [Mass/volume] in Blood' }],
        },
        subject: { reference: patientFullUrl, display: 'Alex Coleman' },
        encounter: { reference: encounterFullUrl, display: 'Pre-placement occupational exam' },
        requester: { reference: practitionerFullUrl, display: 'Dr. Morgan Rivera' },
        performer: [{ reference: clinicOrgFullUrl, display: 'DHS Occupational Health Clinic - National Capital Region' }],
        authoredOn: '2026-04-10',
        note: [{ text: 'Baseline blood lead test required before operational assignment.' }],
      },
      request: {
        method: 'POST',
        url: 'ServiceRequest',
      },
    },
    {
      fullUrl: leadLevelFullUrl,
      resource: {
        resourceType: 'Observation',
        status: 'final',
        category: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'laboratory',
                display: 'Laboratory',
              },
            ],
          },
        ],
        code: {
          coding: [{ system: 'http://loinc.org', code: '5671-3', display: 'Lead [Mass/volume] in Blood' }],
        },
        subject: { reference: patientFullUrl, display: 'Alex Coleman' },
        encounter: { reference: encounterFullUrl, display: 'Pre-placement occupational exam' },
        basedOn: [{ reference: surveillanceRequestFullUrl, display: 'Baseline blood lead service request' }],
        effectiveDateTime: '2026-04-10T13:20:00Z',
        valueQuantity: {
          value: 3.2,
          unit: 'ug/dL',
          system: 'http://unitsofmeasure.org',
          code: 'ug/dL',
        },
      },
      request: {
        method: 'POST',
        url: 'Observation',
      },
    },
    {
      fullUrl: followUpTaskFullUrl,
      resource: {
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
        description: 'Schedule annual blood lead surveillance follow-up.',
        for: { reference: patientFullUrl, display: 'Alex Coleman' },
        encounter: { reference: encounterFullUrl, display: 'Pre-placement occupational exam' },
        focus: { reference: surveillanceRequestFullUrl, display: 'Baseline blood lead service request' },
        owner: { reference: practitionerFullUrl, display: 'Dr. Morgan Rivera' },
        restriction: {
          period: {
            end: '2027-04-10',
          },
        },
      },
      request: {
        method: 'POST',
        url: 'Task',
      },
    },
    {
      fullUrl: workStatusFlagFullUrl,
      resource: {
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
                code: 'fit',
                display: 'Fit for duty',
              },
            ],
          },
        ],
        code: {
          text: 'Cleared for full duty with blood lead surveillance enrollment',
        },
        subject: { reference: patientFullUrl, display: 'Alex Coleman' },
        encounter: { reference: encounterFullUrl, display: 'Pre-placement occupational exam' },
        author: { reference: practitionerFullUrl, display: 'Dr. Morgan Rivera' },
        period: {
          start: '2026-04-10',
        },
      },
      request: {
        method: 'POST',
        url: 'Flag',
      },
    },
  ],
};