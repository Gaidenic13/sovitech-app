/**
 * G4-20 (prompt 3, "New case ids"; guardrails 2.4, rule 4; prompt 3 5.2 "Database").
 * Situation: the app's database role updates, deletes or truncates a candidate,
 * evidence (locator or excerpt) or event row.
 * Expected: the statement fails, and the row is unchanged.
 *
 * A TEST database (Testcontainers, @sovitech/db/testing) holds one row in every
 * table the case names, written through the data-access layer as the app would
 * write it. Each statement then runs on the app role's own connection, inside a
 * request scoped to that project, so row-level security shows it the rows it
 * tries to change. Every table's rows are read before and after by the database
 * administrator, who sees them all.
 *
 * Extended in the viewer step (part 1; migration 0017): the conversion record of a stored IFC model
 * (`model_view_events`, append-only like every event table) holds a `queued` row written as the
 * owner's upload writes it, and the app role can no more update, delete or truncate it.
 */
import { afterAll, beforeAll, expect, test } from 'vitest';
import {
  addProjectMember,
  appendAssetEvent,
  appendCandidateEvent,
  appendDocumentEvent,
  appendFieldEvent,
  appendGuardrailEvent,
  openReviewItem,
  queueModelView,
  recordDocumentFile,
  recordAssetAppearance,
  registerDocument,
  withRequest,
  type RequestScope,
} from '@sovitech/db';
import {
  createTestAccount,
  createTestDocumentValue,
  createTestProject,
  startTestDatabase,
  testContentHash,
  TEST_AREA_FIELD,
  type TestDatabase,
} from '@sovitech/db/testing';

/** Every candidate, evidence and event table, with a change to try on each. */
const TABLES: readonly { readonly table: string; readonly change: string }[] = [
  { table: 'candidates', change: `field_key = 'test.changed'` },
  { table: 'evidence_locators', change: 'page = page + 1' },
  { table: 'evidence_excerpts', change: `text = 'TEST changed'` },
  { table: 'candidate_events', change: `reason = 'test-changed'` },
  { table: 'field_events', change: `reason = 'test-changed'` },
  { table: 'document_events', change: `reason = 'test-changed'` },
  { table: 'document_analysis_events', change: `coverage = 'TEST changed'` },
  { table: 'asset_events', change: `reason = 'test-changed'` },
  { table: 'guardrail_events', change: `reason = 'test-changed'` },
  { table: 'review_item_opens', change: 'opened_at = opened_at' },
  { table: 'audit_events', change: `reason = 'test-changed'` },
  { table: 'app_role_events', change: `reason = 'test-changed'` },
  // The viewer step (migration 0017): a stored IFC model's conversion record.
  { table: 'model_view_events', change: `type = 'converted'` },
];

const INSUFFICIENT_PRIVILEGE = '42501';

let database: TestDatabase;
let scope: RequestScope;

async function rowsOf(table: string): Promise<string[]> {
  const rows = await database.asAdministrator<{ row: string }>(
    `SELECT row_to_json(stored)::text AS row FROM sovitech.${table} AS stored ORDER BY 1`,
  );
  return rows.map((entry) => entry.row);
}

beforeAll(async () => {
  database = await startTestDatabase();
  const ownerId = await createTestAccount(database, { label: 'G4-20 owner', kind: 'person', roles: ['owner'] });
  const engineerId = await createTestAccount(database, { label: 'G4-20 engineer', kind: 'person', roles: ['sovitech_engineer'] });
  // The system's events come from a service account's request (the store binds each event to its request).
  const serviceId = await createTestAccount(database, { label: 'G4-20 analysis service', kind: 'service', roles: [] });
  const projectId = await createTestProject(database, { ownerId, isDemo: false });
  scope = { userId: ownerId, projectId };
  const value = await createTestDocumentValue(database, { projectId, label: 'G4-20 area schedule' });

  await withRequest(database.app, scope, (request) => addProjectMember(request, { projectId, userId: serviceId }));
  await withRequest(database.app, { userId: serviceId, projectId }, (request) =>
    appendFieldEvent(request, {
      subjectId: value.subjectId,
      fieldKey: TEST_AREA_FIELD,
      type: 'conflict_raised',
      by: 'test-system',
      role: 'system',
    }),
  );
  await withRequest(database.app, scope, async (request) => {
    await appendCandidateEvent(request, { candidateId: value.candidateId, type: 'user_confirmed', by: ownerId, role: 'owner' });
    const revision = await registerDocument(request, {
      contentHash: testContentHash('G4-20 area schedule rev B'),
      kind: 'architectural',
      stage: 'technical_design',
      revision: 'TEST Rev. B',
      analysis: { status: 'analysed', coverage: 'TEST page 1 of 1' },
      createdBy: 'test-extractor',
    });
    await appendDocumentEvent(request, {
      documentId: revision.id,
      type: 'declared_revision_of',
      revisionOf: value.documentId,
      by: ownerId,
      role: 'owner',
    });
    await appendGuardrailEvent(request, { type: 'skipped', subjectId: value.subjectId, fieldKey: TEST_AREA_FIELD, actor: ownerId });
    // A stored IFC model and its queued conversion, as the owner's upload records them (the viewer step).
    const modelHash = testContentHash('G4-20 model');
    const model = await registerDocument(request, {
      contentHash: modelHash,
      kind: 'other',
      stage: 'unknown',
      analysis: { status: 'stored_only', coverage: 'stored: IFC model' },
      createdBy: ownerId,
    });
    await recordDocumentFile(request, { documentId: model.id, contentHash: modelHash, format: 'ifc', byteSize: 1024, createdBy: ownerId });
    await queueModelView(request, { documentId: model.id, contentHash: modelHash, createdBy: ownerId });
  });
  await withRequest(database.app, { userId: value.serviceId, projectId }, (request) =>
    recordAssetAppearance(request, {
      tagAsWritten: 'TEST-AHU-01',
      evidence: [
        {
          documentId: value.documentId,
          contentHash: value.contentHash,
          locator: { page: 1 },
          excerpt: 'TEST-AHU-01',
          check: 'text_match',
        },
      ],
      createdBy: value.serviceId,
    }),
  );
  await withRequest(database.app, { userId: engineerId, projectId }, async (request) => {
    const [asset] = await request.trx.selectFrom('asset_identities').select('asset_id').execute();
    if (asset === undefined) throw new Error('the TEST asset was not stored');
    const removed = await appendAssetEvent(request, {
      assetId: asset.asset_id,
      type: 'removed',
      relatedAssetIds: [],
      by: engineerId,
      role: 'sovitech_engineer',
      reason: 'TEST duplicate of a schedule row',
    });
    if (removed.outcome !== 'appended') throw new Error(`the TEST asset event was refused: ${removed.refusal}`);
    await openReviewItem(request, { candidateId: value.candidateId });
  });
});

afterAll(async () => {
  await database.stop();
});

test('F-VALUE-01 · G4-20: every table the case names holds a row before the attempts', async () => {
  for (const { table } of TABLES) {
    expect((await rowsOf(table)).length, table).toBeGreaterThan(0);
  }
});

test('F-VALUE-01 · G4-20: an UPDATE by the app role fails on every candidate, evidence and event table, and no row changes', async () => {
  for (const { table, change } of TABLES) {
    const before = await rowsOf(table);
    await expect(database.as('app', `UPDATE sovitech.${table} SET ${change}`, [], scope), table).rejects.toMatchObject({
      code: INSUFFICIENT_PRIVILEGE,
    });
    expect(await rowsOf(table), table).toEqual(before);
  }
});

test('F-VALUE-01 · G4-20: a DELETE by the app role fails on every candidate, evidence and event table, and no row changes', async () => {
  for (const { table } of TABLES) {
    const before = await rowsOf(table);
    await expect(database.as('app', `DELETE FROM sovitech.${table}`, [], scope), table).rejects.toMatchObject({
      code: INSUFFICIENT_PRIVILEGE,
    });
    expect(await rowsOf(table), table).toEqual(before);
  }
});

test('F-VALUE-01 · G4-20: a TRUNCATE by the app role fails on every candidate, evidence and event table, and no row changes', async () => {
  for (const { table } of TABLES) {
    const before = await rowsOf(table);
    await expect(database.as('app', `TRUNCATE sovitech.${table} CASCADE`, [], scope), table).rejects.toMatchObject({
      code: INSUFFICIENT_PRIVILEGE,
    });
    expect(await rowsOf(table), table).toEqual(before);
  }
});
