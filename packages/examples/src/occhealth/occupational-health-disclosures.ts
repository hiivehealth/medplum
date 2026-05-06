// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0

import { createReference } from '@medplum/core';
import type { Bundle, Consent, Flag, Patient, Task } from '@medplum/fhirtypes';

import { occHealthCodeSystems } from './occupational-health-foundation';

export const occHealthDisclosureConsent: Consent = {
  resourceType: 'Consent',
  status: 'active',
  scope: {
    coding: [{ system: 'http://terminology.hl7.org/CodeSystem/consentscope', code: 'patient-privacy' }],
  },
  category: [
    {
      text: 'Occupational health minimum-necessary disclosure policy',
    },
  ],
  policyText: [
    {
      text: 'Supervisors and HR receive only work status, restrictions, and required follow-up actions without diagnoses or detailed clinical findings.',
    },
  ],
  provision: {
    type: 'permit',
    actor: [
      {
        role: { text: 'Supervisor' },
        reference: { display: 'Supervisor role receives work status and restrictions only' },
      },
      {
        role: { text: 'HR' },
        reference: { display: 'HR role receives clearance and restriction management data only' },
      },
    ],
    securityLabel: [
      {
        text: 'Minimum necessary occupational health disclosure',
      },
    ],
  },
};

// start-block supervisorViewBundleTs
export function buildSupervisorMinimumNecessaryBundle(patient: Patient, workStatusFlag: Flag, restrictionTask?: Task): Bundle {
  return {
    resourceType: 'Bundle',
    type: 'collection',
    entry: [
      {
        resource: {
          resourceType: 'Patient',
          id: patient.id,
          identifier: patient.identifier,
          name: patient.name,
        },
      },
      {
        resource: {
          resourceType: 'Flag',
          status: workStatusFlag.status,
          category: workStatusFlag.category,
          code: workStatusFlag.code,
          period: workStatusFlag.period,
          subject: createReference(patient),
        },
      },
      ...(restrictionTask
        ? [
            {
              resource: {
                resourceType: 'Task',
                status: restrictionTask.status,
                intent: restrictionTask.intent,
                code: restrictionTask.code,
                description: restrictionTask.description,
                restriction: restrictionTask.restriction,
                for: createReference(patient),
              },
            },
          ]
        : []),
    ],
  };
}
// end-block supervisorViewBundleTs

// start-block hrViewBundleTs
export function buildHrMinimumNecessaryBundle(patient: Patient, workStatusFlag: Flag, followUpTask: Task): Bundle {
  return {
    resourceType: 'Bundle',
    type: 'collection',
    entry: [
      {
        resource: {
          resourceType: 'Patient',
          id: patient.id,
          identifier: patient.identifier,
          name: patient.name,
        },
      },
      {
        resource: {
          resourceType: 'Flag',
          status: workStatusFlag.status,
          category: workStatusFlag.category,
          code: workStatusFlag.code,
          period: workStatusFlag.period,
          subject: createReference(patient),
        },
      },
      {
        resource: {
          resourceType: 'Task',
          status: followUpTask.status,
          intent: followUpTask.intent,
          code: {
            coding: [
              {
                system: occHealthCodeSystems.taskCode,
                code: 'rtw-follow-up',
                display: 'Return-to-work follow-up',
              },
            ],
          },
          description: followUpTask.description,
          restriction: followUpTask.restriction,
          for: createReference(patient),
        },
      },
    ],
  };
}
// end-block hrViewBundleTs
