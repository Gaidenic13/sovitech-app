/**
 * G10-8 (prompt 3, "New case ids"; rule 10, "Demo data": "Demo values never
 * carry engineer_verified"; F-AUTH-04; US-DOCS-23 AC3).
 * Situation: an engineer calls the verify endpoint on a candidate of the demo project.
 * Expected: rejected.
 *
 * The demo project is flagged when it is created (projects.is_demo) and holds a
 * TEST value read from a TEST document, as the demo seed's values will be. A
 * person holding sovitech_engineer opens the item and calls the store's one
 * guarded function, as the review endpoint will. The control shows the same
 * engineer accepted on a project that is not a demo.
 *
 * How the flag is set (the store's stricter reading: the demo flag follows the
 * creator's account, SVR05) goes beyond this case's situation and is proven in
 * packages/db/src/access.test.ts.
 */
import { afterAll, beforeAll, expect, test } from 'vitest';
import { openReviewItem, verifyCandidate, withRequest } from '@sovitech/db';
import {
  createTestAccount,
  createTestDocumentValue,
  createTestProject,
  startTestDatabase,
  type TestDatabase,
} from '@sovitech/db/testing';

let database: TestDatabase;
let engineerId: string;

async function engineerVerifiedIn(projectId: string): Promise<number> {
  const [row] = await database.asAdministrator<{ count: number }>(
    `SELECT count(*)::int AS count FROM sovitech.candidate_events WHERE project_id = $1 AND type = 'engineer_verified'`,
    [projectId],
  );
  return row?.count ?? -1;
}

beforeAll(async () => {
  database = await startTestDatabase();
  engineerId = await createTestAccount(database, { label: 'G10-8 engineer', kind: 'person', roles: ['sovitech_engineer'] });
});

afterAll(async () => {
  await database.stop();
});

test('F-AUTH-04 · G10-8: an engineer who opened a demo project value calls the verify function: rejected, and the demo holds no engineer_verified', async () => {
  const seedId = await createTestAccount(database, { label: 'G10-8 demo seed', kind: 'seed', roles: ['owner'] });
  const demoProjectId = await createTestProject(database, { ownerId: seedId, isDemo: true });
  const { candidateId } = await createTestDocumentValue(database, {
    projectId: demoProjectId,
    label: 'G10-8 demo area schedule',
  });

  const attempt = withRequest(database.app, { userId: engineerId, projectId: demoProjectId }, async (request) => {
    await openReviewItem(request, { candidateId });
    return verifyCandidate(request, { candidateId, reason: 'TEST checked against the schedule' });
  });

  await expect(attempt).rejects.toMatchObject({ refusal: 'demo_project', sqlState: 'SVV05' });
  expect(await engineerVerifiedIn(demoProjectId)).toBe(0);
});

test('F-AUTH-04 · G10-8: control: the same engineer is accepted on a project that is not a demo', async () => {
  const ownerId = await createTestAccount(database, { label: 'G10-8 owner', kind: 'person', roles: ['owner'] });
  const projectId = await createTestProject(database, { ownerId, isDemo: false });
  const { candidateId } = await createTestDocumentValue(database, { projectId, label: 'G10-8 area schedule' });

  await withRequest(database.app, { userId: engineerId, projectId }, async (request) => {
    await openReviewItem(request, { candidateId });
    await verifyCandidate(request, { candidateId, reason: 'TEST checked against the schedule' });
  });

  expect(await engineerVerifiedIn(projectId)).toBe(1);
});
