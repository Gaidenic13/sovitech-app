/**
 * The store's side of the staging sweep (packages/db/src/work.ts; docs/adr/0019-resumable-uploads-chunk-protocol.md,
 * docs/adr/0028-upload-guard-fixtures-only.md). The sweep takes an abandoned upload session before it removes the
 * staged bytes, and deletes the session only once they are gone (the fix round 3 finding: the session was deleted
 * first, so bytes whose removal failed stayed with no session and no later sweep found them). Taking it refuses an
 * append meanwhile; giving it back leaves it abandoned, so the next sweep takes it again; only the sweep's lease deletes
 * it. Every value is TEST data; the database is a throwaway Testcontainers Postgres.
 */
import { afterAll, beforeAll, expect, it } from 'vitest';
import { createTestAccount, createTestProject, startTestDatabase, type TestDatabase } from './testing';
import {
  claimAbandonedUpload,
  claimUploadLease,
  createUploadSession,
  deleteAbandonedUpload,
  readUploadSession,
  releaseAbandonedUpload,
  staleUploadSessions,
} from './work';

let database: TestDatabase;
let ownerId: string;
let projectId: string;
const ABANDONED = 1800;

beforeAll(async () => {
  database = await startTestDatabase();
  ownerId = await createTestAccount(database, { label: 'sweep owner', kind: 'person', roles: ['owner'] });
  projectId = await createTestProject(database, { ownerId, isDemo: false });
}, 240_000);

afterAll(async () => {
  await database.stop();
});

/** An upload session opened `ageSeconds` ago, with no append since. */
async function openSession(label: string, ageSeconds: number): Promise<string> {
  const id = await createUploadSession(database.app.db, { projectId, userId: ownerId, fileName: `TEST ${label}.pdf`, format: 'pdf', declaredSize: 64 });
  await database.asAdministrator(`UPDATE sovitech_work.upload_sessions SET created_at = clock_timestamp() - make_interval(secs => $2) WHERE id = $1`, [id, ageSeconds]);
  return id;
}

const lastActivity = async (id: string): Promise<unknown> =>
  (await database.asAdministrator<{ at: unknown }>('SELECT coalesce(last_activity_at, created_at) AS at FROM sovitech_work.upload_sessions WHERE id = $1', [id]))[0]?.at;

it('F-INGEST-01 · ADR 0028: the sweep takes an abandoned session so no append takes it; given back, it is still abandoned and taken again; only its lease deletes it, file name and all', async () => {
  const id = await openSession('abandoned', ABANDONED + 60);
  const before = await lastActivity(id);
  expect(await staleUploadSessions(database.app.db, ABANDONED)).toContainEqual({ id, projectId });

  const lease = await claimAbandonedUpload(database.app.db, { id, olderThanSeconds: ABANDONED, leaseSeconds: 180 });
  expect(lease).toBeDefined();
  if (lease === undefined) return;
  // Held by the sweep: an append is refused, a second sweep cannot take it, and it is not listed as abandoned.
  expect(await claimUploadLease(database.app.db, { id, projectId, userId: ownerId, purpose: 'appending', leaseSeconds: 60 })).toBeUndefined();
  expect(await claimAbandonedUpload(database.app.db, { id, olderThanSeconds: ABANDONED, leaseSeconds: 180 })).toBeUndefined();
  expect(await staleUploadSessions(database.app.db, ABANDONED)).not.toContainEqual({ id, projectId });

  // The bytes could not be removed: given back, with its last activity unchanged, it is abandoned again and kept.
  expect(await releaseAbandonedUpload(database.app.db, { id, leaseId: lease })).toBe(true);
  expect(await lastActivity(id)).toEqual(before);
  expect(await staleUploadSessions(database.app.db, ABANDONED)).toContainEqual({ id, projectId });
  expect(await readUploadSession(database.app.db, { id, projectId, userId: ownerId })).toMatchObject({ fileName: 'TEST abandoned.pdf' });

  // The next sweep takes it again; a lease that is not its own deletes nothing; its own deletes the session and its name.
  const again = await claimAbandonedUpload(database.app.db, { id, olderThanSeconds: ABANDONED, leaseSeconds: 180 });
  expect(again).toBeDefined();
  if (again === undefined) return;
  expect(await deleteAbandonedUpload(database.app.db, { id, leaseId: lease })).toBe(false);
  expect(await deleteAbandonedUpload(database.app.db, { id, leaseId: again })).toBe(true);
  expect(await readUploadSession(database.app.db, { id, projectId, userId: ownerId })).toBeUndefined();
});

it('F-INGEST-01: a fresh session, and one an append holds, are not taken by the sweep', async () => {
  const fresh = await openSession('fresh', 60);
  expect(await claimAbandonedUpload(database.app.db, { id: fresh, olderThanSeconds: ABANDONED, leaseSeconds: 180 })).toBeUndefined();
  const held = await openSession('held', ABANDONED + 60);
  expect(await claimUploadLease(database.app.db, { id: held, projectId, userId: ownerId, purpose: 'appending', leaseSeconds: 60 })).toBeDefined();
  // The append marked activity, and holds the lease: not abandoned.
  expect(await claimAbandonedUpload(database.app.db, { id: held, olderThanSeconds: ABANDONED, leaseSeconds: 180 })).toBeUndefined();
  expect(await claimAbandonedUpload(database.app.db, { id: held, olderThanSeconds: 0, leaseSeconds: 180 })).toBeUndefined();
});
