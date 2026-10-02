/**
 * The TEST states the e2e stack's control route writes (docs/adr/0037-e2e-setup.md, decision 11), for
 * the render screens and flows that need a state no owner action on the page can reach while no API
 * key is set: a document still being read, conflicts put to the owner, an inference to confirm, and a
 * late finding that arrives while the owner is on another step.
 *
 * Every write goes through the store's TEST machinery only (`@sovitech/db/testing`; dependency-cruiser's
 * `e2e-setup-reaches-db-only-through-testing`): a TEST extraction service account made a member of the
 * project on the operator's login (`createTestService`), then plain statements on the app's own login
 * in that account's request scope (`TestDatabase.as('app', …, { userId, projectId })`), so row-level
 * security and every guard trigger of the store applies as it does to the ingestion path (the author
 * and source guard, a document with its first analysis event, a document value with evidence whose
 * check matched, an evidence entry with its excerpt). One statement per call: a document's subject,
 * record and first analysis event together; its text next (the text guard reads the stored
 * document); a candidate with its evidence and excerpt together (the evidence checks run at commit).
 *
 * Everything written is synthetic and labelled TEST: file names, page text, excerpts and values. No
 * figure comes from the mockups, the company files or a real building; a document value's excerpt
 * occurs on its page's stored text, as the evidence verifier requires. The demo project is refused.
 */
import { randomUUID } from 'node:crypto';
import { createTestService, testContentHash, type TestDatabase } from '@sovitech/db/testing';
import { normaliseTag } from '@sovitech/domain';

/** The TEST states the control route writes, by name. */
export const TEST_STATES = ['document-being-read', 'owner-conflicts', 'building-type-inference', 'floors-conflict', 'assets-listed', 'assets-numbered'] as const;
export type TestStateName = (typeof TEST_STATES)[number];

export function isTestState(name: string): name is TestStateName {
  return (TEST_STATES as readonly string[]).includes(name);
}

/** Why a TEST state was not written: the answer's code, never document text (rule 13). */
export class TestStateRefused extends Error {
  constructor(readonly code: 'project_not_found' | 'demo_project') {
    super(code);
  }
}

interface Scope {
  readonly userId: string;
  readonly projectId: string;
}

interface TestDocument {
  readonly documentId: string;
  readonly contentHash: string;
  readonly page: string;
}

/** A value a TEST candidate carries: a count with its qualifier, or an enum key. */
type TestValue = { readonly count: number; readonly qualifier: string } | { readonly choice: string };

/** Registers a TEST document (subject, record, first analysis event), then stores its page text and file name. */
async function registerDocument(
  database: TestDatabase,
  scope: Scope,
  input: { readonly label: string; readonly fileName: string; readonly page: string; readonly status: 'queued' | 'analysing' | 'analysed'; readonly coverage: string },
): Promise<TestDocument> {
  const documentId = randomUUID();
  const contentHash = testContentHash(`${scope.projectId} e2e ${input.label}`);
  await database.as(
    'app',
    `WITH subject AS (
       INSERT INTO sovitech.subjects (id, project_id, kind, created_by) VALUES ($1::uuid, $2::uuid, 'document', $3::text) RETURNING id
     ), document AS (
       INSERT INTO sovitech.documents (id, project_id, content_hash, kind, stage, created_by)
       SELECT id, $2::uuid, $4::text, 'architectural', 'technical_design', $3::text FROM subject RETURNING id
     )
     INSERT INTO sovitech.document_analysis_events (id, project_id, document_id, status, coverage, actor)
     SELECT $5::uuid, $2::uuid, id, $6::text, $7::text, $3::text FROM document`,
    [documentId, scope.projectId, scope.userId, contentHash, randomUUID(), input.status, input.coverage],
    scope,
  );
  await database.as(
    'app',
    `INSERT INTO sovitech.document_texts (project_id, content_hash, part, text, created_by)
     VALUES ($1::uuid, $2::text, 'page:1', $3::text, $5::text), ($1::uuid, $2::text, $4::text, $6::text, $5::text)`,
    [scope.projectId, contentHash, input.page, `file:name:${documentId}`, scope.userId, input.fileName],
    scope,
  );
  return { documentId, contentHash, page: input.page };
}

/** Stores one TEST candidate read from (or inferred from) a TEST document, with its evidence on page 1. */
async function storeCandidate(
  database: TestDatabase,
  scope: Scope,
  input: {
    readonly subjectId: string;
    readonly fieldKey: string;
    readonly value: TestValue;
    readonly source: 'document' | 'ai_inference';
    readonly document: TestDocument;
    readonly excerpt: string;
  },
): Promise<void> {
  if (!input.document.page.includes(input.excerpt)) throw new Error('a TEST excerpt occurs on its page, as the evidence verifier requires');
  const count = 'count' in input.value ? input.value : undefined;
  const choice = 'choice' in input.value ? input.value.choice : null;
  await database.as(
    'app',
    `WITH candidate AS (
       INSERT INTO sovitech.candidates (id, project_id, subject_id, field_key, quantity_value, quantity_unit, quantity_qualifier, choice, source, confidence, created_by)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4::text, $5::float8, $6::text, $7::text, $8::text, $9::text, $10::text, $11::text) RETURNING id
     ), locator AS (
       INSERT INTO sovitech.evidence_locators (id, project_id, candidate_id, ordinal, document_id, content_hash, page, evidence_check)
       SELECT $12::uuid, $2::uuid, id, 0, $13::uuid, $14::text, 1, 'text_match' FROM candidate RETURNING id
     )
     INSERT INTO sovitech.evidence_excerpts (evidence_id, project_id, content_hash, text)
     SELECT id, $2::uuid, $14::text, $15::text FROM locator`,
    [
      randomUUID(),
      scope.projectId,
      input.subjectId,
      input.fieldKey,
      count?.count ?? null,
      count === undefined ? null : 'count',
      count?.qualifier ?? null,
      choice,
      input.source,
      input.source === 'ai_inference' ? 'medium' : null,
      scope.userId,
      randomUUID(),
      input.document.documentId,
      input.document.contentHash,
      input.excerpt,
    ],
    scope,
  );
}

/**
 * Stores one TEST appearance of equipment written on page 1 of a TEST document, with its evidence and excerpt (2.5):
 * a tagged appearance joins a new asset of its tag (its subject and its identity, one tag one asset); an untagged one
 * joins none and is never listed (G4-17). One statement, so the store's evidence guards check it at commit.
 */
async function storeAppearance(database: TestDatabase, scope: Scope, input: { readonly tag: string | undefined; readonly document: TestDocument; readonly excerpt: string }): Promise<void> {
  if (!input.document.page.includes(input.excerpt)) throw new Error('a TEST excerpt occurs on its page, as the evidence verifier requires');
  const appearanceId = randomUUID();
  const evidenceId = randomUUID();
  const evidence = `locator AS (
       INSERT INTO sovitech.evidence_locators (id, project_id, appearance_id, ordinal, document_id, content_hash, page, evidence_check)
       SELECT $3::uuid, $1::uuid, id, 0, $4::uuid, $5::text, 1, 'text_match' FROM appearance RETURNING id
     )
     INSERT INTO sovitech.evidence_excerpts (evidence_id, project_id, content_hash, text)
     SELECT id, $1::uuid, $5::text, $6::text FROM locator`;
  const common = [scope.projectId, appearanceId, evidenceId, input.document.documentId, input.document.contentHash, input.excerpt, scope.userId];
  const tag = normaliseTag(input.tag);
  if (input.tag === undefined || tag === null) {
    await database.as(
      'app',
      `WITH appearance AS (
         INSERT INTO sovitech.asset_appearances (id, project_id, asset_id, tag_as_written, created_by) VALUES ($2::uuid, $1::uuid, NULL, NULL, $7::text) RETURNING id
       ), ${evidence}`,
      common,
      scope,
    );
    return;
  }
  await database.as(
    'app',
    `WITH subject AS (
       INSERT INTO sovitech.subjects (id, project_id, kind, created_by) VALUES ($8::uuid, $1::uuid, 'asset', $7::text) RETURNING id
     ), identity AS (
       INSERT INTO sovitech.asset_identities (asset_id, project_id, normalised_tag, created_by) SELECT id, $1::uuid, $9::text, $7::text FROM subject RETURNING asset_id
     ), appearance AS (
       INSERT INTO sovitech.asset_appearances (id, project_id, asset_id, tag_as_written, created_by) SELECT $2::uuid, $1::uuid, asset_id, $10::text, $7::text FROM identity RETURNING id
     ), ${evidence}`,
    [...common, randomUUID(), tag, input.tag],
    scope,
  );
}

/** One TEST document stating one value, and the value read from it (source `document`). */
async function documentValue(
  database: TestDatabase,
  scope: Scope,
  input: { readonly label: string; readonly subjectId: string; readonly fieldKey: string; readonly value: TestValue; readonly excerpt: string },
): Promise<void> {
  const document = await registerDocument(database, scope, {
    label: input.label,
    fileName: `TEST ${input.label}.pdf`,
    page: `TEST ${input.label}. ${input.excerpt}`,
    status: 'analysed',
    coverage: 'pages 1-1 of 1',
  });
  await storeCandidate(database, scope, { subjectId: input.subjectId, fieldKey: input.fieldKey, value: input.value, source: 'document', document, excerpt: input.excerpt });
}

/**
 * Writes a TEST state into a TEST project (never the demo), as a TEST extraction service account
 * that becomes a member of it:
 * - `document-being-read`: one TEST document registered and queued for analysis, with no job behind
 *   it, so it stays "being read" (step 2's row, step 3's reading intro, step 8's "Still reading");
 * - `owner-conflicts`: two TEST documents each for the building type (hotel, office) and the
 *   occupancy (mostly occupied, mixed): two conflicts on owner fields, put to the owner (rule 4);
 * - `building-type-inference`: one TEST document and an inference of the building type (hotel,
 *   medium confidence): rule 5's confirmation, "Yes, it's a hotel";
 * - `floors-conflict`: two TEST documents giving the building two upper-floor counts: a conflict on
 *   an engineer field, routed to SOVITECH (G7-4's situation, when written while the owner is on
 *   step 6);
 * - `assets-listed` (phase 4): one TEST equipment list whose page writes three tags and one piece of
 *   equipment with no tag: three assets in the register, each with its tag as written and its evidence,
 *   and the untagged appearance never listed (2.5; G4-17). No asset field is registered in production
 *   (docs/adr/0045 decision 1), so every other cell reads Unknown (Equipment, the inspector, UD-08);
 * - `assets-numbered` (phase 4 part B, A-1): one TEST equipment list whose page numbers its equipment, as
 *   numbered lists do: two tags written only in digits, "101" and "1.2" (each tag as written is a figure the
 *   page shows bound to its display object, and a heading on the asset record).
 */
export async function writeTestState(database: TestDatabase, name: TestStateName, projectId: string): Promise<void> {
  const [project] = await database.asAdministrator<{ isDemo: boolean }>('SELECT is_demo AS "isDemo" FROM sovitech.projects WHERE id = $1', [projectId]);
  if (project === undefined) throw new TestStateRefused('project_not_found');
  if (project.isDemo) throw new TestStateRefused('demo_project');
  const [building] = await database.asAdministrator<{ id: string }>(`SELECT id FROM sovitech.subjects WHERE project_id = $1 AND kind = 'building' ORDER BY created_at LIMIT 1`, [projectId]);
  if (building === undefined) throw new TestStateRefused('project_not_found');
  const userId = await createTestService(database, { projectId, label: `e2e control ${name}` });
  const scope: Scope = { userId, projectId };
  switch (name) {
    case 'document-being-read':
      await registerDocument(database, scope, {
        label: 'memoriu being read',
        fileName: 'TEST memoriu being read.pdf',
        page: 'TEST memoriu tehnic, not read yet',
        status: 'queued',
        coverage: 'not read yet',
      });
      return;
    case 'owner-conflicts':
      await documentValue(database, scope, { label: 'memoriu use A', subjectId: building.id, fieldKey: 'building.type', value: { choice: 'hotel' }, excerpt: 'Destination: hotel' });
      await documentValue(database, scope, { label: 'memoriu use B', subjectId: building.id, fieldKey: 'building.type', value: { choice: 'office' }, excerpt: 'Destination: office' });
      await documentValue(database, scope, { label: 'operations A', subjectId: projectId, fieldKey: 'project.occupancy', value: { choice: 'mostly_occupied' }, excerpt: 'Occupancy: mostly occupied' });
      await documentValue(database, scope, { label: 'operations B', subjectId: projectId, fieldKey: 'project.occupancy', value: { choice: 'mixed' }, excerpt: 'Occupancy: mixed' });
      return;
    case 'building-type-inference': {
      const document = await registerDocument(database, scope, {
        label: 'room schedule',
        fileName: 'TEST room schedule.xlsx',
        page: 'TEST room schedule. Guest rooms on every upper floor',
        status: 'analysed',
        coverage: 'pages 1-1 of 1',
      });
      await storeCandidate(database, scope, { subjectId: building.id, fieldKey: 'building.type', value: { choice: 'hotel' }, source: 'ai_inference', document, excerpt: 'Guest rooms on every upper floor' });
      return;
    }
    case 'floors-conflict':
      await documentValue(database, scope, { label: 'plan etaj A', subjectId: building.id, fieldKey: 'building.floors', value: { count: 6, qualifier: 'upper' }, excerpt: '6 etaje' });
      await documentValue(database, scope, { label: 'plan etaj B', subjectId: building.id, fieldKey: 'building.floors', value: { count: 8, qualifier: 'upper' }, excerpt: '8 etaje' });
      return;
    case 'assets-listed': {
      const document = await registerDocument(database, scope, {
        label: 'equipment list',
        fileName: 'TEST equipment list.pdf',
        page: 'TEST equipment list. TEST-AHU-A air handling unit. TEST-FCU-A fan coil. TEST-FCU-B fan coil. A fan coil with no tag.',
        status: 'analysed',
        coverage: 'pages 1-1 of 1',
      });
      for (const tag of ['TEST-AHU-A', 'TEST-FCU-A', 'TEST-FCU-B']) await storeAppearance(database, scope, { tag, document, excerpt: tag });
      await storeAppearance(database, scope, { tag: undefined, document, excerpt: 'A fan coil with no tag' });
      return;
    }
    case 'assets-numbered': {
      const document = await registerDocument(database, scope, {
        label: 'numbered equipment list',
        fileName: 'TEST numbered equipment list.pdf',
        page: 'TEST numbered equipment list. Item 101 TEST fan coil. Item 1.2 TEST pump.',
        status: 'analysed',
        coverage: 'pages 1-1 of 1',
      });
      for (const tag of ['101', '1.2']) await storeAppearance(database, scope, { tag, document, excerpt: tag });
      return;
    }
  }
}
