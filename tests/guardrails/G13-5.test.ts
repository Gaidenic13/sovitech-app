/**
 * G13-5 (prompt 3, "New case ids"; rule 13, "Isolation"; F-AUTH-03).
 * Situation: a session scoped to project B reads candidates, evidence and documents.
 * Expected: no project A row is returned.
 *
 * Projects A and B each hold a TEST value read from a TEST document, written
 * through the data-access layer: subject, document, extracted text, candidate,
 * evidence locator and excerpt, candidate and document events. Sessions scoped to
 * project B then read through the data-access layer and with direct SQL on the
 * app role's connection, including queries that ask for project A by id.
 *
 * A SOVITECH admin who is not a member reads nothing, and cannot make themself a
 * member (phase 1 review: an admin's self-add once opened project B in one call).
 */
import { afterAll, beforeAll, expect, test } from 'vitest';
import {
  addProjectMember,
  appendCandidateEvent,
  appendDocumentEvent,
  appendFieldEvent,
  readCandidates,
  readFieldInputs,
  readProjectDocuments,
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
  type TestDocumentValue,
} from '@sovitech/db/testing';

/** The project tables that hold candidates, evidence and documents, and their neighbours. */
const PROJECT_TABLES = [
  'subjects',
  'documents',
  'document_events',
  'document_analysis_events',
  'document_texts',
  'candidates',
  'evidence_locators',
  'evidence_excerpts',
  'candidate_events',
  'field_events',
] as const;

let database: TestDatabase;
let projectA: string;
let projectB: string;
let valueA: TestDocumentValue;
let valueB: TestDocumentValue;
let scopeB: RequestScope;

/** A TEST value in the project, with a candidate event, a field event and a withdrawn second document. */
async function fillProject(projectId: string, ownerId: string, name: string): Promise<TestDocumentValue> {
  const value = await createTestDocumentValue(database, { projectId, label: `G13-5 schedule of ${name}` });
  await withRequest(database.app, { userId: ownerId, projectId }, async (request) => {
    await appendCandidateEvent(request, { candidateId: value.candidateId, type: 'user_confirmed', by: ownerId, role: 'owner' });
    await appendFieldEvent(request, { subjectId: value.subjectId, fieldKey: TEST_AREA_FIELD, type: 'skipped', by: ownerId, role: 'owner' });
    const draft = await registerDocument(request, {
      contentHash: testContentHash(`G13-5 draft of ${name} ${projectId}`),
      kind: 'other',
      stage: 'unknown',
      analysis: { status: 'stored_only', coverage: 'TEST not analysed' },
      createdBy: ownerId,
    });
    await appendDocumentEvent(request, { documentId: draft.id, type: 'withdrawn', by: ownerId, role: 'owner' });
  });
  return value;
}

beforeAll(async () => {
  database = await startTestDatabase();
  const ownerA = await createTestAccount(database, { label: 'G13-5 owner A', kind: 'person', roles: ['owner'] });
  const ownerB = await createTestAccount(database, { label: 'G13-5 owner B', kind: 'person', roles: ['owner'] });
  projectA = await createTestProject(database, { ownerId: ownerA, isDemo: false });
  projectB = await createTestProject(database, { ownerId: ownerB, isDemo: false });
  valueA = await fillProject(projectA, ownerA, 'A');
  valueB = await fillProject(projectB, ownerB, 'B');
  scopeB = { userId: ownerB, projectId: projectB };
});

afterAll(async () => {
  await database.stop();
});

test('F-AUTH-03 · G13-5: project A has rows in every table read below (the administrator sees them)', async () => {
  for (const table of PROJECT_TABLES) {
    const rows = await database.asAdministrator(`SELECT 1 FROM sovitech.${table} WHERE project_id = $1`, [projectA]);
    expect(rows.length, table).toBeGreaterThan(0);
  }
});

test('F-AUTH-03 · G13-5: a session scoped to project B reads every project table with direct SQL: no project A row is returned', async () => {
  for (const table of PROJECT_TABLES) {
    const everything = await database.as<{ project_id: string }>('app', `SELECT project_id FROM sovitech.${table}`, [], scopeB);
    expect(everything.length, table).toBeGreaterThan(0);
    expect(everything.filter((row) => row.project_id !== projectB), table).toEqual([]);
    const askedForA = await database.as('app', `SELECT * FROM sovitech.${table} WHERE project_id = $1`, [projectA], scopeB);
    expect(askedForA, table).toEqual([]);
  }
});

test('F-AUTH-03 · G13-5: a session scoped to project B asks for project A candidates, evidence and documents by id: none is returned', async () => {
  const candidate = await database.as('app', 'SELECT * FROM sovitech.candidates WHERE id = $1', [valueA.candidateId], scopeB);
  const document = await database.as('app', 'SELECT * FROM sovitech.documents WHERE id = $1', [valueA.documentId], scopeB);
  const evidence = await database.as(
    'app',
    `SELECT locator.id, excerpt.text FROM sovitech.evidence_locators AS locator
       JOIN sovitech.evidence_excerpts AS excerpt ON excerpt.evidence_id = locator.id
      WHERE locator.candidate_id = $1`,
    [valueA.candidateId],
    scopeB,
  );
  const text = await database.as('app', 'SELECT * FROM sovitech.document_texts WHERE content_hash = $1', [valueA.contentHash], scopeB);
  expect({ candidate, document, evidence, text }).toEqual({ candidate: [], document: [], evidence: [], text: [] });
});

test('F-AUTH-03 · G13-5: the data-access layer, scoped to project B, reads project A ids: no project A row is returned', async () => {
  await withRequest(database.app, scopeB, async (request) => {
    const inputsOfA = await readFieldInputs(request, { subjectId: valueA.subjectId, fieldKey: TEST_AREA_FIELD });
    expect(inputsOfA.candidates).toEqual([]);
    expect(inputsOfA.events.candidate).toEqual([]);
    expect(inputsOfA.events.field).toEqual([]);
    expect(inputsOfA.documents.filter((document) => document.projectId !== projectB)).toEqual([]);
    expect(await readCandidates(request, [valueA.candidateId, valueB.candidateId])).toMatchObject([{ id: valueB.candidateId }]);
    const documents = await readProjectDocuments(request);
    expect(documents.documents.map((document) => document.id)).toContain(valueB.documentId);
    expect(documents.documents.filter((document) => document.projectId !== projectB)).toEqual([]);
    expect(documents.events.map((event) => event.documentId)).not.toContain(valueA.documentId);
  });
});

test('F-AUTH-03 · G13-5: a user of project B who scopes a session to project A (not a member) reads no row at all', async () => {
  const crossScope: RequestScope = { userId: scopeB.userId, projectId: projectA };
  for (const table of PROJECT_TABLES) {
    expect(await database.as('app', `SELECT * FROM sovitech.${table}`, [], crossScope), table).toEqual([]);
  }
  expect(await database.as('app', 'SELECT * FROM sovitech.projects', [], crossScope)).toEqual([]);
});

test('F-AUTH-03 · G13-5: a SOVITECH admin who is not a member of project A adds themself, then reads with a session scoped to A: the add is rejected and no project A row is returned', async () => {
  const adminId = await createTestAccount(database, { label: 'G13-5 admin', kind: 'person', roles: ['sovitech_admin'] });
  const adminScope: RequestScope = { userId: adminId, projectId: projectA };
  const add = withRequest(database.app, { userId: adminId }, (request) => addProjectMember(request, { projectId: projectA, userId: adminId }));
  await expect(add).rejects.toMatchObject({ refusal: 'self_administration' });
  for (const table of PROJECT_TABLES) {
    expect(await database.as('app', `SELECT * FROM sovitech.${table}`, [], adminScope), table).toEqual([]);
  }
  await withRequest(database.app, adminScope, async (request) => {
    expect(await readCandidates(request, [valueA.candidateId])).toEqual([]);
    expect((await readProjectDocuments(request)).documents).toEqual([]);
  });
});
