// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0

import type { CodeSystem, ValueSet } from '@medplum/fhirtypes';

import { occHealthCodeSystems } from './occupational-health-foundation';

export const occHealthEncounterTypeCodeSystem: CodeSystem = {
  resourceType: 'CodeSystem',
  url: occHealthCodeSystems.encounterType,
  name: 'OccupationalHealthEncounterType',
  title: 'Occupational Health Encounter Type',
  status: 'draft',
  content: 'complete',
  concept: [
    { code: 'pre-placement', display: 'Pre-placement occupational exam' },
    { code: 'periodic', display: 'Periodic occupational exam' },
    { code: 'fitness-for-duty', display: 'Fitness-for-duty evaluation' },
    { code: 'post-exposure', display: 'Post-exposure evaluation' },
  ],
};

export const occHealthSurveillancePanelCodeSystem: CodeSystem = {
  resourceType: 'CodeSystem',
  url: occHealthCodeSystems.surveillancePanel,
  name: 'OccupationalHealthSurveillancePanel',
  title: 'Occupational Health Surveillance Panel',
  status: 'draft',
  content: 'complete',
  concept: [
    { code: 'blood-lead', display: 'Blood Lead Surveillance' },
    { code: 'hearing-conservation', display: 'Hearing Conservation' },
    { code: 'respiratory-protection', display: 'Respiratory Protection' },
  ],
};

export const occHealthWorkStatusCodeSystem: CodeSystem = {
  resourceType: 'CodeSystem',
  url: occHealthCodeSystems.workStatus,
  name: 'OccupationalHealthWorkStatus',
  title: 'Occupational Health Work Status',
  status: 'draft',
  content: 'complete',
  concept: [
    { code: 'fit', display: 'Fit for duty' },
    { code: 'restricted', display: 'Restricted duty' },
    { code: 'not-fit', display: 'Not fit for duty' },
  ],
};

export const occHealthTaskCodeSystem: CodeSystem = {
  resourceType: 'CodeSystem',
  url: occHealthCodeSystems.taskCode,
  name: 'OccupationalHealthTaskCode',
  title: 'Occupational Health Task Code',
  status: 'draft',
  content: 'complete',
  concept: [
    { code: 'surveillance-recall', display: 'Occupational surveillance recall' },
    { code: 'rtw-follow-up', display: 'Return-to-work follow-up' },
  ],
};

export const occHealthEncounterTypeValueSet: ValueSet = {
  resourceType: 'ValueSet',
  url: `${occHealthCodeSystems.encounterType}/ValueSet/all`,
  name: 'OccupationalHealthEncounterTypeValueSet',
  title: 'Occupational Health Encounter Type Value Set',
  status: 'draft',
  compose: {
    include: [{ system: occHealthCodeSystems.encounterType }],
  },
};

export const occHealthSurveillancePanelValueSet: ValueSet = {
  resourceType: 'ValueSet',
  url: `${occHealthCodeSystems.surveillancePanel}/ValueSet/all`,
  name: 'OccupationalHealthSurveillancePanelValueSet',
  title: 'Occupational Health Surveillance Panel Value Set',
  status: 'draft',
  compose: {
    include: [{ system: occHealthCodeSystems.surveillancePanel }],
  },
};

export const occHealthTerminologyResources = [
  occHealthEncounterTypeCodeSystem,
  occHealthSurveillancePanelCodeSystem,
  occHealthWorkStatusCodeSystem,
  occHealthTaskCodeSystem,
  occHealthEncounterTypeValueSet,
  occHealthSurveillancePanelValueSet,
];