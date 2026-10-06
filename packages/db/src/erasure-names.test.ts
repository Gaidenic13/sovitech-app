/**
 * Migration 0011: the erasure removes the erased document's own file name even while a twin (a
 * document of the project, not erased, with the same bytes) keeps the text of those bytes
 * (guardrails rule 13, "Erasure": the file, "its extracted text"; 2.3, "A candidate or asset with
 * evidence from other active documents keeps that evidence"). Before 0011 a twin kept every text
 * part of the content hash, the erased document's owner-typed file name included (the phase 2
 * review). Every value is TEST data; the database is a throwaway Testcontainers Postgres.
 */
import { afterAll, beforeAll, expect, it } from 'vitest';
import { eraseDocument } from './guarded';
import { fileNamePart, storeDocumentTexts } from './ingestion';
import { withRequest } from './request';
import { createTestAccount, createTestProject, createTestService, startTestDatabase, testContentHash, type TestDatabase } from './testing';
import { registerDocument } from './writes';

let database: TestDatabase;
let ownerId: string;
let projectId: string;
let serviceId: string;
const contentHash = testContentHash('0011 twin bytes');

beforeAll(async () => {
  database = await startTestDatabase();
  ownerId = await createTestAccount(database, { label: '0011 owner', kind: 'person', roles: ['owner'] });
  projectId = await createTestProject(database, { ownerId, isDemo: false });
  serviceId = await createTestService(database, { projectId, label: '0011' });
}, 240_000);

afterAll(async () => {
  await database.stop();
});

/** An owner's upload of the shared bytes, with its own file name part. */
async function upload(label: string): Promise<string> {
  return withRequest(database.app, { userId: ownerId, projectId }, async (request) => {
    const document = await registerDocument(request, {
      contentHash,
      kind: 'other',
      stage: 'unknown',
      analysis: { status: 'queued', coverage: 'pending' },
      createdBy: ownerId,
    });
    await storeDocumentTexts(request, { contentHash, parts: [{ part: fileNamePart(document.id), text: `TEST ${label}.pdf` }], createdBy: ownerId });
    return document.id;
  });
}

async function parts(): Promise<string[]> {
  const rows = await database.asAdministrator<{ part: string }>('SELECT part FROM sovitech.document_texts WHERE project_id = $1 AND content_hash = $2 ORDER BY part', [
    projectId,
    contentHash,
  ]);
  return rows.map((row) => row.part);
}

it('F-INGEST-07 · rule 13 · G13-3: erasing a document whose twin stays removes its own file name, keeps the twin\'s name and the text of the bytes; erasing the twin removes the rest', async () => {
  const first = await upload('first name');
  const twin = await upload('twin name');
  await withRequest(database.app, { userId: serviceId, projectId }, (request) =>
    storeDocumentTexts(request, { contentHash, parts: [{ part: 'page:1', text: 'TEST page text' }], createdBy: serviceId }),
  );
  expect(await parts()).toEqual([fileNamePart(first), fileNamePart(twin), 'page:1'].sort());

  const report = await withRequest(database.app, { userId: ownerId, projectId }, (request) => eraseDocument(request, { documentId: first, role: 'owner' }));
  expect(report).toMatchObject({ textKeptForAnotherDocument: true, textPartsDeleted: 1 });
  expect(await parts()).toEqual([fileNamePart(twin), 'page:1'].sort());
  // The owner-typed name is nowhere in the store.
  const named = await database.asAdministrator('SELECT 1 FROM sovitech.document_texts WHERE text = $1', ['TEST first name.pdf']);
  expect(named).toEqual([]);

  const last = await withRequest(database.app, { userId: ownerId, projectId }, (request) => eraseDocument(request, { documentId: twin, role: 'owner' }));
  expect(last).toMatchObject({ textKeptForAnotherDocument: false, textPartsDeleted: 2 });
  expect(await parts()).toEqual([]);
  expect(await database.asAdministrator('SELECT problem FROM sovitech_guard.check_invariants()')).toEqual([]);
  // Eight requests and an invariant check over Testcontainers: the store's other tests allow 120 s (LONG); under the full
  // run's load this one ran past Vitest's 5 s default (phase 5's integrator, `pnpm check`).
}, 120_000);
