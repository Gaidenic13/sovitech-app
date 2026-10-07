/**
 * G13-14 (new in the viewer step, part 1, for the integrator to index; rule 13, "Project boundary" and "Isolation":
 * "Every document, excerpt, embedding and cache entry is keyed by project id"; as G13-5 and G13-11).
 * Situation: a session scoped to project B reads model conversion records.
 * Expected: no project A row is returned.
 *
 * On a TEST database, projects A and B each hold a stored IFC model (TEST bytes that exist nowhere, registered as an
 * owner's upload registers one) with its conversion record: `queued` by the owner, `started` and `converted` by the
 * project's own TEST service account, with a TEST converter and image. Sessions scoped to project B (B's owner, B's
 * service account) then read the records through the data-access layer and with direct SQL on the app role's
 * connection, including queries that name project A's ids. Every row they see is B's. A's owner sees A's only, and a
 * session that names project A while its user is not A's member sees none.
 */
import { afterAll, beforeAll, expect, test } from 'vitest';
import { addProjectMember, appendModelViewEvent, queueModelView, readModelViewEvents, recordDocumentFile, registerDocument, withRequest } from '@sovitech/db';
import { createTestAccount, createTestProject, startTestDatabase, testContentHash, type TestDatabase } from '@sovitech/db/testing';

/** A TEST converter: a name, a source hash and an image digest that exist nowhere. */
const TEST_CONVERTER = {
  name: 'test-model-converter',
  version: testContentHash('G13-14 converter sources'),
  imageDigest: testContentHash('G13-14 converter image'),
} as const;

interface Side {
  readonly ownerId: string;
  readonly serviceId: string;
  readonly projectId: string;
  readonly documentId: string;
  readonly contentHash: string;
  readonly eventIds: readonly string[];
}

let database: TestDatabase;
let a: Side;
let b: Side;

/** A project with a stored IFC model and its conversion record (queued, started, converted). */
async function side(label: string, contentHash: string): Promise<Side> {
  const ownerId = await createTestAccount(database, { label: `${label} owner`, kind: 'person', roles: ['owner'] });
  const serviceId = await createTestAccount(database, { label: `${label} conversion service`, kind: 'service', roles: [] });
  const projectId = await createTestProject(database, { ownerId, isDemo: false });
  const { documentId, queued } = await withRequest(database.app, { userId: ownerId, projectId }, async (request) => {
    await addProjectMember(request, { projectId, userId: serviceId });
    const document = await registerDocument(request, { contentHash, kind: 'other', stage: 'unknown', analysis: { status: 'stored_only', coverage: 'stored: IFC model' }, createdBy: ownerId });
    await recordDocumentFile(request, { documentId: document.id, contentHash, format: 'ifc', byteSize: 2048, createdBy: ownerId });
    const job = await queueModelView(request, { documentId: document.id, contentHash, createdBy: ownerId });
    if (job === undefined) throw new Error('no TEST conversion was queued');
    return { documentId: document.id, queued: job };
  });
  const later = await withRequest(database.app, { userId: serviceId, projectId }, async (request) => [
    await appendModelViewEvent(request, { documentId, contentHash, type: 'started', jobId: queued, converter: TEST_CONVERTER, createdBy: serviceId }),
    await appendModelViewEvent(request, {
      documentId,
      contentHash,
      type: 'converted',
      jobId: queued,
      converter: TEST_CONVERTER,
      inputBytes: 2048,
      viewBytes: 512,
      indexBytes: 64,
      wallMs: 1200,
      createdBy: serviceId,
    }),
  ]);
  const all = await withRequest(database.app, { userId: ownerId, projectId }, (request) => readModelViewEvents(request));
  expect(all.map((event) => event.type)).toEqual(['queued', 'started', 'converted']);
  expect(later.every((id) => all.some((event) => event.id === id))).toBe(true);
  return { ownerId, serviceId, projectId, documentId, contentHash, eventIds: all.map((event) => event.id) };
}

beforeAll(async () => {
  database = await startTestDatabase();
  // The same bytes in both projects (G13-4's situation): the records are still each project's own.
  const shared = testContentHash('G13-14 the same model in two projects');
  a = await side('G13-14 A', shared);
  b = await side('G13-14 B', shared);
}, 240_000);

afterAll(async () => {
  await database.stop();
});

test('F-AUTH-03 · R-025 · G13-14: a session scoped to project B reads no project A conversion record, through the data-access layer or by direct SQL naming A\'s ids', async () => {
  for (const userId of [b.ownerId, b.serviceId]) {
    const scope = { userId, projectId: b.projectId };
    const read = await withRequest(database.app, scope, (request) => readModelViewEvents(request));
    expect(read.map((event) => event.id).sort()).toEqual([...b.eventIds].sort());
    expect(read.some((event) => event.documentId === a.documentId)).toBe(false);
    // The same content hash names B's rows only.
    const byHash = await withRequest(database.app, scope, (request) => readModelViewEvents(request, { contentHash: a.contentHash }));
    expect(byHash.map((event) => event.id).sort()).toEqual([...b.eventIds].sort());
    // Direct SQL on the app role's connection, asking for A by project, document and event ids.
    expect(await database.as('app', 'SELECT id FROM sovitech.model_view_events WHERE project_id = $1', [a.projectId], scope)).toEqual([]);
    expect(await database.as('app', 'SELECT id FROM sovitech.model_view_events WHERE document_id = $1', [a.documentId], scope)).toEqual([]);
    expect(await database.as('app', 'SELECT id FROM sovitech.model_view_events WHERE id = ANY ($1::uuid[])', [a.eventIds], scope)).toEqual([]);
    const counted = await database.as<{ n: number }>('app', 'SELECT count(*)::int AS n FROM sovitech.model_view_events', [], scope);
    expect(counted).toEqual([{ n: b.eventIds.length }]);
  }
});

test('R-025 · G13-14: A\'s owner reads A\'s records only, and a session naming project A whose user is not A\'s member reads none', async () => {
  const own = await withRequest(database.app, { userId: a.ownerId, projectId: a.projectId }, (request) => readModelViewEvents(request));
  expect(own.map((event) => event.id).sort()).toEqual([...a.eventIds].sort());
  for (const userId of [b.ownerId, b.serviceId]) {
    const crossed = await withRequest(database.app, { userId, projectId: a.projectId }, (request) => readModelViewEvents(request));
    expect(crossed).toEqual([]);
    expect(await database.as('app', 'SELECT id FROM sovitech.model_view_events', [], { userId, projectId: a.projectId })).toEqual([]);
  }
  // Every row is where it was written: the administrator sees both projects' records, keyed apart.
  const all = await database.asAdministrator<{ project_id: string; n: number }>('SELECT project_id, count(*)::int AS n FROM sovitech.model_view_events GROUP BY project_id ORDER BY project_id');
  expect(all).toEqual([a.projectId, b.projectId].sort().map((projectId) => ({ project_id: projectId, n: 3 })));
});
