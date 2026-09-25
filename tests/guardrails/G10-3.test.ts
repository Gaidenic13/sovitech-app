/**
 * G10-3 (docs/guardrails.md section 7; rule 10, "Engineer verification is an
 * authenticated action"; F-AUTH-02, F-AUTH-04).
 * Situation: a non-engineer account calls the verify endpoint.
 * Expected: rejected.
 *
 * The review endpoint (phase 7) writes engineer_verified only through the
 * store's one guarded function, sovitech.verify_candidate, which the data-access
 * layer calls as verifyCandidate. Each account below first gets as far as a real
 * engineer would (a project it can read, a TEST value to verify), then calls it.
 * The last test is the control: a person holding sovitech_engineer who opened the
 * item is accepted, so the refusals above come from the account, not the setup.
 *
 * The store's stricter readings on how an account comes to hold the engineer
 * role (nobody grants their own role, SVR03; the review roles are granted on the
 * operator's login only, SVR04) go beyond this case's situation and are proven in
 * packages/db/src/access.test.ts.
 */
import { afterAll, beforeAll, expect, test } from 'vitest';
import { addProjectMember, openReviewItem, revokeAppRole, StoreRefusal, verifyCandidate, withRequest } from '@sovitech/db';
import {
  createTestAccount,
  createTestDocumentValue,
  createTestProject,
  startTestDatabase,
  type TestDatabase,
} from '@sovitech/db/testing';

let database: TestDatabase;
let ownerId: string;
let projectId: string;
let candidateId: string;

async function engineerVerifiedCount(): Promise<number> {
  const [row] = await database.asAdministrator<{ count: number }>(
    `SELECT count(*)::int AS count FROM sovitech.candidate_events WHERE candidate_id = $1 AND type = 'engineer_verified'`,
    [candidateId],
  );
  return row?.count ?? -1;
}

async function verifyAs(userId: string): Promise<unknown> {
  return withRequest(database.app, { userId, projectId }, (request) => verifyCandidate(request, { candidateId }));
}

beforeAll(async () => {
  database = await startTestDatabase();
  ownerId = await createTestAccount(database, { label: 'G10-3 owner', kind: 'person', roles: ['owner'] });
  projectId = await createTestProject(database, { ownerId, isDemo: false });
  ({ candidateId } = await createTestDocumentValue(database, { projectId, label: 'G10-3 area schedule' }));
});

afterAll(async () => {
  await database.stop();
});

test('F-AUTH-04 · G10-3: the project owner (role owner) calls the verify function: rejected, nothing written', async () => {
  const ownerId = await createTestAccount(database, { label: 'G10-3 second owner', kind: 'person', roles: ['owner'] });
  const creatorId = await createTestAccount(database, { label: 'G10-3 creator', kind: 'person', roles: ['owner'] });
  const ownProject = await createTestProject(database, { ownerId: creatorId, isDemo: false });
  await withRequest(database.app, { userId: creatorId, projectId: ownProject }, (request) =>
    addProjectMember(request, { projectId: ownProject, userId: ownerId }),
  );
  const own = await createTestDocumentValue(database, { projectId: ownProject, label: 'G10-3 own schedule' });
  const attempt = withRequest(database.app, { userId: ownerId, projectId: ownProject }, (request) =>
    verifyCandidate(request, { candidateId: own.candidateId }),
  );
  await expect(attempt).rejects.toBeInstanceOf(StoreRefusal);
  await expect(attempt).rejects.toMatchObject({ refusal: 'verification_needs_the_engineer_role' });
  const [row] = await database.asAdministrator<{ count: number }>(
    `SELECT count(*)::int AS count FROM sovitech.candidate_events WHERE candidate_id = $1 AND type = 'engineer_verified'`,
    [own.candidateId],
  );
  expect(row?.count).toBe(0);
});

test('F-AUTH-02 · G10-3: a SOVITECH commercial reviewer calls the verify function: rejected, nothing written', async () => {
  const reviewerId = await createTestAccount(database, {
    label: 'G10-3 commercial reviewer',
    kind: 'person',
    roles: ['sovitech_commercial_reviewer'],
  });
  await expect(verifyAs(reviewerId)).rejects.toMatchObject({ refusal: 'verification_needs_the_engineer_role' });
  expect(await engineerVerifiedCount()).toBe(0);
});

test('F-AUTH-02 · G10-3: a SOVITECH admin calls the verify function: rejected, nothing written (the admin role never permits verification)', async () => {
  const adminId = await createTestAccount(database, { label: 'G10-3 admin', kind: 'person', roles: ['sovitech_admin', 'owner'] });
  // A member of the project adds the admin, so the refusal below is about the role, not access.
  await withRequest(database.app, { userId: ownerId, projectId }, (request) => addProjectMember(request, { projectId, userId: adminId }));
  await expect(verifyAs(adminId)).rejects.toMatchObject({ refusal: 'verification_needs_the_engineer_role' });
  expect(await engineerVerifiedCount()).toBe(0);
});

test('F-AUTH-04 · G10-3: a service account and a seed account, each holding sovitech_engineer, call the verify function: rejected, nothing written', async () => {
  const serviceId = await createTestAccount(database, { label: 'G10-3 service', kind: 'service', roles: ['sovitech_engineer'] });
  const seedId = await createTestAccount(database, { label: 'G10-3 seed', kind: 'seed', roles: ['sovitech_engineer'] });
  await expect(verifyAs(serviceId)).rejects.toMatchObject({ refusal: 'verification_needs_a_person_account' });
  await expect(verifyAs(seedId)).rejects.toMatchObject({ refusal: 'verification_needs_a_person_account' });
  expect(await engineerVerifiedCount()).toBe(0);
});

test('F-AUTH-02 · G10-3: a former engineer whose role was revoked, who had opened the item, calls the verify function: rejected, nothing written', async () => {
  const formerId = await createTestAccount(database, { label: 'G10-3 former engineer', kind: 'person', roles: ['sovitech_engineer'] });
  await withRequest(database.app, { userId: formerId, projectId }, (request) => openReviewItem(request, { candidateId }));
  await revokeAppRole(database.operator.db, { userId: formerId, role: 'sovitech_engineer', reason: 'TEST role ended' });
  await expect(verifyAs(formerId)).rejects.toMatchObject({ refusal: 'verification_needs_the_engineer_role' });
  expect(await engineerVerifiedCount()).toBe(0);
});

test('F-AUTH-04 · G10-3: control: a person holding sovitech_engineer who opened the item is accepted', async () => {
  const engineerId = await createTestAccount(database, { label: 'G10-3 engineer', kind: 'person', roles: ['sovitech_engineer'] });
  await withRequest(database.app, { userId: engineerId, projectId }, async (request) => {
    await openReviewItem(request, { candidateId });
    const event = await verifyCandidate(request, { candidateId, reason: 'TEST checked against the schedule' });
    expect(event).toMatchObject({ candidateId, type: 'engineer_verified', by: engineerId, role: 'sovitech_engineer' });
  });
  expect(await engineerVerifiedCount()).toBe(1);
});
