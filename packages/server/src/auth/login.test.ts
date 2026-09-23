// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2';
import type { WithId } from '@medplum/core';
import {
  createReference,
  createSystemUseNoticeProjectPolicyExtension,
  encodeBase64,
  LOINC,
  Operator,
  SYSTEM_USE_NOTICE_DOCUMENT_TYPE_CODE,
  SYSTEM_USE_NOTICE_DOCUMENT_TYPE_SYSTEM,
  SYSTEM_USE_NOTICE_PROFILE_URL,
  SYSTEM_USE_NOTICE_VERSION_IDENTIFIER_SYSTEM,
} from '@medplum/core';
import type { AuditEvent, ClientApplication, DocumentReference, Project } from '@medplum/fhirtypes';
import type { AwsClientStub } from 'aws-sdk-client-mock';
import { mockClient } from 'aws-sdk-client-mock';
import { createHash, randomUUID } from 'crypto';
import express from 'express';
import { simpleParser } from 'mailparser';
import request from 'supertest';
import { vi } from 'vitest';
import { inviteUser } from '../admin/invite';
import { initApp, shutdownApp } from '../app';
import { getConfig, loadTestConfig } from '../config/loader';
import type { Repository } from '../fhir/repo';
import { getGlobalSystemRepo, getProjectSystemRepo } from '../fhir/repo';
import { globalLogger } from '../logger';
import { createTestProject, setupRecaptchaMock, withTestContext } from '../test.setup';
import { registerNew } from './register';
import { setPassword } from './setpassword';

const fetchMock = vi.spyOn(globalThis, 'fetch');
const app = express();
const email = randomUUID() + '@example.com';
const password = randomUUID();
let project: WithId<Project>;
let repo: Repository;
let client: WithId<ClientApplication>;
let corsClient: WithId<ClientApplication>;
let mockSESv2Client: AwsClientStub<SESv2Client>;

describe('Login', () => {
  beforeAll(async () => {
    mockSESv2Client = mockClient(SESv2Client);
    mockSESv2Client.on(SendEmailCommand).resolves({ MessageId: 'ID_TEST_123' });

    const config = await loadTestConfig();
    const systemRepo = getGlobalSystemRepo();

    await withTestContext(async () => {
      config.emailProvider = 'awsses';
      await initApp(app, config);

      // Create a test project
      ({ project, client, repo } = await createTestProject({ withClient: true, withRepo: true }));

      // Create another client with CORS "allowed origins"
      corsClient = await repo.getSystemRepo().createResource<ClientApplication>({
        resourceType: 'ClientApplication',
        meta: {
          project: project.id,
        },
        secret: randomUUID(),
        redirectUris: ['https://example.com/'],
        name: 'Test Client Application',
        allowedOrigin: ['https://allowed.example.com'],
      });

      // Create a test user
      const { user } = await inviteUser({
        project,
        resourceType: 'Practitioner',
        firstName: 'Test',
        lastName: 'User',
        email,
      });

      // Set the test user password
      await setPassword(systemRepo, user, password);
    });
  });

  afterAll(async () => {
    mockSESv2Client.restore();
    await shutdownApp();
  });

  beforeEach(() => {
    getConfig().systemUseNotice = { enabledByDefault: false };
    mockSESv2Client.reset();
    mockSESv2Client.on(SendEmailCommand).resolves({ MessageId: 'ID_TEST_123' });

    fetchMock.mockClear();
    setupRecaptchaMock(true);
  });

  test('Invalid client UUID', async () => {
    const res = await request(app).post('/auth/login').type('json').send({
      clientId: '123',
      email,
      password,
      scope: 'openid',
    });
    expect(res).toHaveStatus(404);
  });

  test('Invalid client ID', async () => {
    const res = await request(app).post('/auth/login').type('json').send({
      clientId: 'e99126bb-c748-4c00-8d28-4e88dfb88278',
      email,
      password,
      scope: 'openid',
    });
    expect(res).toHaveStatus(404);
    expect(res.body.issue).toBeDefined();
    expect(res.body.issue[0].details.text).toBe('Not found');
  });

  test('Missing email', async () => {
    const res = await request(app).post('/auth/login').type('json').send({
      email: '',
      password,
      scope: 'openid',
    });
    expect(res).toHaveStatus(400);
    expect(res.body.issue).toBeDefined();
    expect(res.body.issue[0].details.text).toBe('Valid email address is required');
  });

  test('Invalid email', async () => {
    const res = await request(app).post('/auth/login').type('json').send({
      email: 'xyz',
      password,
      scope: 'openid',
    });
    expect(res).toHaveStatus(400);
    expect(res.body.issue).toBeDefined();
    expect(res.body.issue[0].details.text).toBe('Valid email address is required');
  });

  test('Missing password', async () => {
    const res = await request(app).post('/auth/login').type('json').send({
      email,
      password: '',
      scope: 'openid',
    });
    expect(res).toHaveStatus(400);
    expect(res.body.issue).toBeDefined();
    expect(res.body.issue[0].details.text).toBe('Password must be at least 8 characters');
  });

  test('Wrong password', async () => {
    const res = await request(app).post('/auth/login').type('json').send({
      email,
      password: 'wrong-password',
      scope: 'openid',
    });
    expect(res).toHaveStatus(400);
    expect(res.body.issue).toBeDefined();
    expect(res.body.issue[0].details.text).toBe('Email or password is invalid');
  });

  test('Wrong projectId', async () => {
    const res = await request(app).post('/auth/login').type('json').send({
      clientId: client.id,
      projectId: randomUUID(),
      email: 'admin@example.com',
      password: 'medplum_admin',
      scope: 'openid',
    });
    expect(res).toHaveStatus(400);
    expect(res.body.issue[0].details.text).toBe('Invalid projectId');
  });

  test('Success with custom client', async () => {
    const res = await request(app).post('/auth/login').type('json').send({
      clientId: client.id,
      email,
      password,
      scope: 'openid',
    });
    expect(res).toHaveStatus(200);
    expect(res.body.code).toBeDefined();
  });

  test('Requires the active project notice before password authentication and audits its version', async () => {
    const systemRepo = getGlobalSystemRepo();
    const projectSystemRepo = await getProjectSystemRepo(project);
    const version = `usg-system-use-${randomUUID()}`;
    const body = 'Approved notice text';
    const notice = await withTestContext(() =>
      projectSystemRepo.createResource<DocumentReference>({
        resourceType: 'DocumentReference',
        meta: { profile: [SYSTEM_USE_NOTICE_PROFILE_URL], project: project.id },
        masterIdentifier: { system: SYSTEM_USE_NOTICE_VERSION_IDENTIFIER_SYSTEM, value: version },
        status: 'current',
        docStatus: 'final',
        type: {
          coding: [{ system: SYSTEM_USE_NOTICE_DOCUMENT_TYPE_SYSTEM, code: SYSTEM_USE_NOTICE_DOCUMENT_TYPE_CODE }],
        },
        description: 'U.S. Government System Use Acknowledgment',
        content: [
          {
            attachment: {
              contentType: 'text/plain',
              language: 'en-US',
              data: encodeBase64(body),
              hash: createHash('sha1').update(body).digest('base64'),
            },
          },
        ],
      })
    );
    const currentProject = await systemRepo.readResource<Project>('Project', project.id);
    await withTestContext(() =>
      projectSystemRepo.updateResource<Project>({
        ...currentProject,
        extension: [
          ...(currentProject.extension ?? []),
          createSystemUseNoticeProjectPolicyExtension({
            enabled: true,
            activeNotice: createReference(notice),
          }),
        ],
      })
    );

    const previousLogAuditEvents = getConfig().logAuditEvents;
    const previousSaveAuditEvents = getConfig().saveAuditEvents;
    const logSpy = vi.spyOn(globalLogger, 'write' as any).mockImplementation(() => undefined);
    getConfig().logAuditEvents = true;
    getConfig().saveAuditEvents = true;
    try {
      const discovery = await request(app).get('/auth/system-use-notice').query({ clientId: client.id });
      expect(discovery).toHaveStatus(200);
      expect(discovery.body).toStrictEqual({
        enabled: true,
        version,
        title: 'U.S. Government System Use Acknowledgment',
        body,
        actionLabel: 'OK',
      });

      const missing = await request(app).post('/auth/login').type('json').send({
        clientId: client.id,
        email,
        password: 'wrong-password',
        scope: 'openid',
      });
      expect(missing).toHaveStatus(400);
      expect(missing.body.issue[0].details.text).toBe('Invalid login request');

      const stale = await request(app).post('/auth/login').type('json').send({
        clientId: client.id,
        email,
        password,
        scope: 'openid',
        systemUseNoticeVersion: 'unknown-version',
      });
      expect(stale).toHaveStatus(400);
      expect(stale.body.issue[0].details.text).toBe('Invalid login request');

      const accepted = await request(app).post('/auth/login').type('json').send({
        clientId: client.id,
        email,
        password,
        scope: 'openid',
        systemUseNoticeVersion: version,
      });
      expect(accepted).toHaveStatus(200);
      const audit = logSpy.mock.calls
        .map((call) => JSON.parse(call[0] as string))
        .find((event) => event.subtype?.[0]?.code === '110122');
      expect(audit.extension).toContainEqual({
        url: 'https://ehr.hiivehealth.net/fhir/StructureDefinition/system-use-notice-version',
        valueString: version,
      });

      const saved = await withTestContext(() =>
        projectSystemRepo.searchResources<AuditEvent>({
          resourceType: 'AuditEvent',
          filters: [{ code: 'subtype', operator: Operator.EQUALS, value: '110122' }],
        })
      );
      expect(saved.some((event) => event.extension?.some((item) => item.valueString === version))).toBe(true);
    } finally {
      getConfig().logAuditEvents = previousLogAuditEvents;
      getConfig().saveAuditEvents = previousSaveAuditEvents;
      logSpy.mockRestore();
      const updatedProject = await systemRepo.readResource<Project>('Project', project.id);
      await withTestContext(() =>
        projectSystemRepo.updateResource<Project>({
          ...updatedProject,
          extension: updatedProject.extension?.filter(
            (item) => item.url !== 'https://ehr.hiivehealth.net/fhir/StructureDefinition/system-use-notice-policy'
          ),
        })
      );
    }
  });

  test('Success default client', async () => {
    const res = await request(app).post('/auth/login').type('json').send({
      email,
      password,
      scope: 'openid',
    });
    expect(res).toHaveStatus(200);
    expect(res.body.code).toBeDefined();
  });

  test('Success new project', async () => {
    const res = await request(app).post('/auth/login').type('json').send({
      email,
      password,
      scope: 'openid',
      projectId: 'new',
    });
    expect(res).toHaveStatus(200);
    expect(res.body.login).toBeDefined();
    expect(res.body.code).not.toBeDefined();
  });

  test('Login with access policy', async () => {
    const adminEmail = `admin${randomUUID()}@example.com`;
    const memberEmail = `member${randomUUID()}@example.com`;
    const compartment = { reference: `Organization/${randomUUID()}` };

    // Register and create a project
    const { project, accessToken } = await withTestContext(() =>
      registerNew({
        firstName: 'Admin',
        lastName: 'Admin',
        projectName: 'Access Policy Project',
        email: adminEmail,
        password: 'password!@#',
      })
    );

    // Create an access policy
    const resX = await request(app)
      .post('/fhir/R4/AccessPolicy')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        resourceType: 'AccessPolicy',
        name: 'Test Access Policy',
        compartment,
        resource: [
          {
            resourceType: 'Patient',
            compartment,
          },
        ],
      });

    expect(resX).toHaveStatus(201);

    // Invite a new member
    const res2 = await request(app)
      .post('/admin/projects/' + project.id + '/invite')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        resourceType: 'Practitioner',
        firstName: 'Member',
        lastName: 'Member',
        email: memberEmail,
      });

    expect(res2).toHaveStatus(200);
    expect(mockSESv2Client.send.callCount).toBe(1);
    expect(mockSESv2Client.commandCalls(SendEmailCommand)).toHaveLength(1);

    // Parse the email for the "set password" link
    const args = mockSESv2Client.commandCalls(SendEmailCommand)[0].args[0].input;
    const parsed = await simpleParser(args.Content?.Raw?.Data as Buffer);
    const content = parsed.text as string;
    const url = /(https?:\/\/[^\s]+)/g.exec(content)?.[0] as string;
    const paths = url.split('/');
    const id = paths.at(-2);
    const secret = paths.at(-1);

    // Get the new membership details
    const res4 = await request(app)
      .get('/admin/projects/' + project.id + '/members/' + res2.body.id)
      .set('Authorization', 'Bearer ' + accessToken);
    expect(res4).toHaveStatus(200);

    // Set the new member's access policy
    const res5 = await request(app)
      .post('/admin/projects/' + project.id + '/members/' + res2.body.id)
      .set('Authorization', 'Bearer ' + accessToken)
      .type('json')
      .send({
        ...res4.body,
        accessPolicy: createReference(resX.body),
      });
    expect(res5).toHaveStatus(200);

    // Get the project details
    // Make sure the access policy is set
    // 3 members total (1 admin, 1 client, 1 invited)
    const res6 = await request(app)
      .get('/admin/projects/' + project.id + '/members/' + res2.body.id)
      .set('Authorization', 'Bearer ' + accessToken);
    expect(res6).toHaveStatus(200);
    expect(res6.body.accessPolicy).toBeDefined();

    // Now try to login as the new member
    // First, set the password
    const res7 = await request(app).post('/auth/setpassword').type('json').send({
      id,
      secret,
      password: 'my-new-password',
    });
    expect(res7).toHaveStatus(200);

    // Then login
    const res8 = await request(app).post('/auth/login').type('json').send({
      email: memberEmail,
      password: 'my-new-password',
      scope: 'openid offline_access',
      codeChallenge: 'xyz',
      codeChallengeMethod: 'plain',
    });
    expect(res8).toHaveStatus(200);
    expect(res8.body.code).toBeDefined();

    // Then get access token
    const res9 = await request(app).post('/oauth2/token').type('form').send({
      grant_type: 'authorization_code',
      code: res8.body.code,
      code_verifier: 'xyz',
    });
    expect(res9).toHaveStatus(200);
    expect(res9.body.token_type).toBe('Bearer');
    expect(res9.body.scope).toBe('openid offline_access');
    expect(res9.body.expires_in).toBe(3600);
    expect(res9.body.id_token).toBeDefined();
    expect(res9.body.access_token).toBeDefined();
    expect(res9.body.refresh_token).toBeDefined();

    // Test the access policy
    // Should be able to create a patient
    const res10 = await request(app)
      .post('/fhir/R4/Patient')
      .set('Authorization', 'Bearer ' + res9.body.access_token)
      .type('json')
      .send({
        resourceType: 'Patient',
        name: [
          {
            given: ['Access'],
            family: 'Test',
          },
        ],
      });
    expect(res10).toHaveStatus(201);

    // Should not be able to create an observation
    const res11 = await request(app)
      .post('/fhir/R4/Observation')
      .set('Authorization', 'Bearer ' + res9.body.access_token)
      .type('json')
      .send({
        resourceType: 'Observation',
        status: 'final',
        code: {
          coding: [
            {
              system: LOINC,
              code: '1',
            },
          ],
        },
        subject: createReference(res10.body),
      });
    expect(res11).toHaveStatus(403);
  });

  test('Require Google auth', async () => {
    const email = `google${randomUUID()}@example.com`;
    const password = 'password!@#';

    // Register and create a project
    await withTestContext(async () => {
      const { project: newProject } = await registerNew({
        firstName: 'Google',
        lastName: 'Google',
        projectName: 'Require Google Auth',
        email,
        password,
      });

      // As a super admin, update the project to require Google auth
      const systemRepo = await getProjectSystemRepo(newProject);
      await systemRepo.updateResource({
        ...newProject,
        features: ['google-auth-required'],
      });
    });

    // Then try to login
    // This should fail with error message that google auth is required
    const res8 = await request(app).post('/auth/login').type('json').send({
      email,
      password,
      scope: 'openid offline_access',
    });
    expect(res8).toHaveStatus(400);
    expect(res8.body).toMatchObject({
      resourceType: 'OperationOutcome',
      issue: [
        {
          severity: 'error',
          code: 'invalid',
          details: {
            text: 'Google authentication is required',
          },
        },
      ],
    });
  });

  test.skip('Specify resourceType', async () => {
    const email = `multiple-resource-types-${randomUUID()}@example.com`;
    const password = 'password!@#';

    // Register and create a project
    const { project } = await registerNew({
      firstName: 'Practitioner',
      lastName: 'Practitioner',
      projectName: 'Multiple Resource Types',
      email,
      password,
    });

    await inviteUser({
      project,
      email,
      resourceType: 'Patient',
      firstName: 'Patient',
      lastName: 'Patient',
    });

    // Try to login without specifying a resourceType
    // This should succeed with a list of profiles
    const res1 = await request(app).post('/auth/login').type('json').send({
      email,
      password,
      scope: 'openid offline_access',
      codeChallenge: 'xyz',
      codeChallengeMethod: 'plain',
    });
    expect(res1).toHaveStatus(200);
    expect(res1.body.code).toBeUndefined();
    expect(res1.body.memberships).toHaveLength(2);

    // Try to login as a Practitioner
    // This should succeed with a code
    const res2 = await request(app).post('/auth/login').type('json').send({
      resourceType: 'Practitioner',
      email,
      password,
      scope: 'openid offline_access',
      codeChallenge: 'xyz',
      codeChallengeMethod: 'plain',
    });
    expect(res2).toHaveStatus(200);
    expect(res2.body.code).toBeDefined();

    // Try to login as a Patient
    // This should succeed with a code
    const res3 = await request(app).post('/auth/login').type('json').send({
      resourceType: 'Patient',
      email,
      password,
      scope: 'openid offline_access',
      codeChallenge: 'xyz',
      codeChallengeMethod: 'plain',
    });
    expect(res3).toHaveStatus(200);
    expect(res3.body.code).toBeDefined();
  });

  test('Case insensitive email', async () => {
    // Invite user with mixed case email
    const email = `Mixed-Case-${randomUUID()}@example.com`;
    const password = 'password!@#';

    // Register and create a project
    await withTestContext(() =>
      registerNew({
        firstName: 'Mixed',
        lastName: 'Case',
        projectName: 'Mixed Case Project',
        email,
        password,
      })
    );

    // Try to login with mixed case email
    // This should work
    const res1 = await request(app).post('/auth/login').type('json').send({
      email,
      password,
      scope: 'openid offline_access',
      codeChallenge: 'xyz',
      codeChallengeMethod: 'plain',
    });
    expect(res1).toHaveStatus(200);
    expect(res1.body.code).toBeDefined();

    // Try to login with mixed case email
    // This should work
    const res2 = await request(app).post('/auth/login').type('json').send({
      email: email.toLowerCase(),
      password,
      scope: 'openid offline_access',
      codeChallenge: 'xyz',
      codeChallengeMethod: 'plain',
    });
    expect(res2).toHaveStatus(200);
    expect(res2.body.code).toBeDefined();
  });

  test('No membership', async () => {
    const otherTestProject = await createTestProject();

    const res = await request(app).post('/auth/login').type('json').send({
      email,
      password,
      scope: 'openid',
      projectId: otherTestProject.project.id,
    });
    expect(res).toHaveStatus(400);
    expect(res.body.login).toBeUndefined();
    expect(res.body.code).toBeUndefined();
    expect(res.body.memberships).toBeUndefined();
    expect(res.body.issue[0].details.text).toBe('User not found');
  });

  test('Inactive membership', async () => {
    const email = `inactive-${randomUUID()}@example.com`;
    const password = 'password!@#';

    // Create a test user
    const { membership } = await withTestContext(() =>
      inviteUser({
        project,
        resourceType: 'Practitioner',
        firstName: 'Test',
        lastName: 'User',
        email,
        password,
      })
    );

    // Mark the membership as inactive
    await repo.getSystemRepo().updateResource({ ...membership, active: false });

    // User should not be able to login
    const res = await request(app).post('/auth/login').type('json').send({
      email,
      password,
      scope: 'openid offline_access',
      codeChallenge: 'xyz',
      codeChallengeMethod: 'plain',
      projectId: project.id,
    });
    expect(res).toHaveStatus(400);
    expect(res.body.login).toBeUndefined();
    expect(res.body.code).toBeUndefined();
    expect(res.body.memberships).toBeUndefined();
    expect(res.body.issue[0].details.text).toBe('User not found');
  });

  test('Success with no origin', async () => {
    const res = await request(app).post('/auth/login').type('json').send({
      clientId: corsClient.id,
      email,
      password,
      scope: 'openid',
    });
    expect(res).toHaveStatus(200);
    expect(res.body.code).toBeDefined();
  });

  test('Success with matching origin', async () => {
    const res = await request(app).post('/auth/login').set('Origin', 'https://allowed.example.com').type('json').send({
      clientId: corsClient.id,
      email,
      password,
      scope: 'openid',
    });
    expect(res).toHaveStatus(200);
    expect(res.body.code).toBeDefined();
  });

  test('Failure with unknown origin', async () => {
    const res = await request(app).post('/auth/login').set('Origin', 'https://unknown.example.com').type('json').send({
      clientId: corsClient.id,
      email,
      password,
      scope: 'openid',
    });
    expect(res).toHaveStatus(400);
    expect(res.body.issue[0].details.text).toBe('Invalid origin');
  });
});
