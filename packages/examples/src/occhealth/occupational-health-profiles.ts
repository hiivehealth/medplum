// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0

import type { StructureDefinition } from '@medplum/fhirtypes';

import { occHealthExtensionUrls, occHealthProfileUrls } from './occupational-health-foundation';

const patientBaseDefinition = 'http://hl7.org/fhir/StructureDefinition/Patient';
const encounterBaseDefinition = 'http://hl7.org/fhir/StructureDefinition/Encounter';
const extensionBaseDefinition = 'http://hl7.org/fhir/StructureDefinition/Extension';
const structureDefinitionDate = '2026-05-01';
const structureDefinitionPublisher = 'Medplum Occupational Health Examples';

function createStringExtension(url: string, name: string, title: string, contextExpression: string): StructureDefinition {
  return {
    resourceType: 'StructureDefinition',
    url,
    name,
    title,
    status: 'draft',
    description: `${title} example extension for occupational health workflows.`,
    fhirVersion: '4.0.1',
    date: structureDefinitionDate,
    publisher: structureDefinitionPublisher,
    kind: 'complex-type',
    abstract: false,
    type: 'Extension',
    baseDefinition: extensionBaseDefinition,
    derivation: 'constraint',
    context: [{ type: 'element', expression: contextExpression }],
    differential: {
      element: [
        { id: 'Extension', path: 'Extension' },
        { id: 'Extension.url', path: 'Extension.url', fixedUri: url },
        {
          id: 'Extension.valueString',
          path: 'Extension.valueString',
          min: 1,
          max: '1',
        },
      ],
    },
  };
}

function createCodeableConceptExtension(
  url: string,
  name: string,
  title: string,
  contextExpression: string
): StructureDefinition {
  return {
    resourceType: 'StructureDefinition',
    url,
    name,
    title,
    status: 'draft',
    description: `${title} example extension for occupational health workflows.`,
    fhirVersion: '4.0.1',
    date: structureDefinitionDate,
    publisher: structureDefinitionPublisher,
    kind: 'complex-type',
    abstract: false,
    type: 'Extension',
    baseDefinition: extensionBaseDefinition,
    derivation: 'constraint',
    context: [{ type: 'element', expression: contextExpression }],
    differential: {
      element: [
        { id: 'Extension', path: 'Extension' },
        { id: 'Extension.url', path: 'Extension.url', fixedUri: url },
        {
          id: 'Extension.valueCodeableConcept',
          path: 'Extension.valueCodeableConcept',
          min: 1,
          max: '1',
        },
      ],
    },
  };
}

function createBooleanExtension(url: string, name: string, title: string, contextExpression: string): StructureDefinition {
  return {
    resourceType: 'StructureDefinition',
    url,
    name,
    title,
    status: 'draft',
    description: `${title} example extension for occupational health workflows.`,
    fhirVersion: '4.0.1',
    date: structureDefinitionDate,
    publisher: structureDefinitionPublisher,
    kind: 'complex-type',
    abstract: false,
    type: 'Extension',
    baseDefinition: extensionBaseDefinition,
    derivation: 'constraint',
    context: [{ type: 'element', expression: contextExpression }],
    differential: {
      element: [
        { id: 'Extension', path: 'Extension' },
        { id: 'Extension.url', path: 'Extension.url', fixedUri: url },
        {
          id: 'Extension.valueBoolean',
          path: 'Extension.valueBoolean',
          min: 1,
          max: '1',
        },
      ],
    },
  };
}

export const occHealthComponentExtension = createCodeableConceptExtension(
  occHealthExtensionUrls.component,
  'OccupationalHealthEmployeeComponent',
  'Occupational Health Employee Component Extension',
  'Patient'
);

export const occHealthJobTitleExtension = createStringExtension(
  occHealthExtensionUrls.jobTitle,
  'OccupationalHealthJobTitle',
  'Occupational Health Job Title Extension',
  'Patient'
);

export const occHealthDutyLocationExtension = createStringExtension(
  occHealthExtensionUrls.dutyLocation,
  'OccupationalHealthDutyLocation',
  'Occupational Health Duty Location Extension',
  'Patient'
);

export const occHealthSimilarExposureGroupExtension = createCodeableConceptExtension(
  occHealthExtensionUrls.similarExposureGroup,
  'OccupationalHealthSimilarExposureGroup',
  'Occupational Health Similar Exposure Group Extension',
  'Patient'
);

export const occHealthExamTypeExtension = createCodeableConceptExtension(
  occHealthExtensionUrls.examType,
  'OccupationalHealthExamType',
  'Occupational Health Exam Type Extension',
  'Encounter'
);

export const occHealthSurveillancePanelExtension = createCodeableConceptExtension(
  occHealthExtensionUrls.surveillancePanel,
  'OccupationalHealthSurveillancePanel',
  'Occupational Health Surveillance Panel Extension',
  'Encounter'
);

export const occHealthReviewOnlyExtension = createBooleanExtension(
  occHealthExtensionUrls.reviewOnly,
  'OccupationalHealthReviewOnly',
  'Occupational Health Review-Only Workflow Extension',
  'Encounter'
);

export const occHealthEmployeeProfile: StructureDefinition = {
  resourceType: 'StructureDefinition',
  url: occHealthProfileUrls.employee,
  name: 'OccupationalHealthEmployee',
  title: 'Occupational Health Employee Profile',
  status: 'draft',
  description: 'Example patient profile for longitudinal occupational health employee records.',
  fhirVersion: '4.0.1',
  date: structureDefinitionDate,
  publisher: structureDefinitionPublisher,
  kind: 'resource',
  abstract: false,
  type: 'Patient',
  baseDefinition: patientBaseDefinition,
  derivation: 'constraint',
  differential: {
    element: [
      { id: 'Patient', path: 'Patient' },
      {
        id: 'Patient.extension',
        path: 'Patient.extension',
        slicing: {
          discriminator: [{ type: 'value', path: 'url' }],
          ordered: false,
          rules: 'open',
        },
      },
      {
        id: 'Patient.extension:employeeComponent',
        path: 'Patient.extension',
        sliceName: 'employeeComponent',
        min: 0,
        max: '1',
        type: [{ code: 'Extension', profile: [occHealthExtensionUrls.component] }],
      },
      {
        id: 'Patient.extension:jobTitle',
        path: 'Patient.extension',
        sliceName: 'jobTitle',
        min: 0,
        max: '1',
        type: [{ code: 'Extension', profile: [occHealthExtensionUrls.jobTitle] }],
      },
      {
        id: 'Patient.extension:dutyLocation',
        path: 'Patient.extension',
        sliceName: 'dutyLocation',
        min: 0,
        max: '1',
        type: [{ code: 'Extension', profile: [occHealthExtensionUrls.dutyLocation] }],
      },
      {
        id: 'Patient.extension:similarExposureGroup',
        path: 'Patient.extension',
        sliceName: 'similarExposureGroup',
        min: 0,
        max: '1',
        type: [{ code: 'Extension', profile: [occHealthExtensionUrls.similarExposureGroup] }],
      },
    ],
  },
};

export const occHealthEncounterProfile: StructureDefinition = {
  resourceType: 'StructureDefinition',
  url: occHealthProfileUrls.encounter,
  name: 'OccupationalHealthEncounter',
  title: 'Occupational Health Encounter Profile',
  status: 'draft',
  description: 'Example encounter profile for occupational health exam and review workflows.',
  fhirVersion: '4.0.1',
  date: structureDefinitionDate,
  publisher: structureDefinitionPublisher,
  kind: 'resource',
  abstract: false,
  type: 'Encounter',
  baseDefinition: encounterBaseDefinition,
  derivation: 'constraint',
  differential: {
    element: [
      { id: 'Encounter', path: 'Encounter' },
      {
        id: 'Encounter.extension',
        path: 'Encounter.extension',
        slicing: {
          discriminator: [{ type: 'value', path: 'url' }],
          ordered: false,
          rules: 'open',
        },
      },
      {
        id: 'Encounter.extension:examType',
        path: 'Encounter.extension',
        sliceName: 'examType',
        min: 0,
        max: '1',
        type: [{ code: 'Extension', profile: [occHealthExtensionUrls.examType] }],
      },
      {
        id: 'Encounter.extension:surveillancePanel',
        path: 'Encounter.extension',
        sliceName: 'surveillancePanel',
        min: 0,
        max: '1',
        type: [{ code: 'Extension', profile: [occHealthExtensionUrls.surveillancePanel] }],
      },
      {
        id: 'Encounter.extension:reviewOnly',
        path: 'Encounter.extension',
        sliceName: 'reviewOnly',
        min: 0,
        max: '1',
        type: [{ code: 'Extension', profile: [occHealthExtensionUrls.reviewOnly] }],
      },
    ],
  },
};

export const occHealthStructureDefinitions: StructureDefinition[] = [
  occHealthComponentExtension,
  occHealthJobTitleExtension,
  occHealthDutyLocationExtension,
  occHealthSimilarExposureGroupExtension,
  occHealthExamTypeExtension,
  occHealthSurveillancePanelExtension,
  occHealthReviewOnlyExtension,
  occHealthEmployeeProfile,
  occHealthEncounterProfile,
];
