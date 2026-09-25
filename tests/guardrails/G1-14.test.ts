/**
 * G1-14 (docs/guardrails.md section 7; rule 1, "`document` ... at a verified location" and
 * "Unverifiable evidence caps confidence at low"; 2.4, "document and ai_inference: at least
 * one verified entry"). Phase 1 review, adversarial finding 10.
 * Situation: a `document` candidate whose only evidence entry has the check `unverifiable`.
 * Expected: refused; the field stays unknown.
 *
 * derive re-applies the storage rules on every read, so a candidate the verifier should not
 * have let through never becomes a value. An entry whose check matched at its location
 * (`text_match`, `ocr_match` or `region_rendered`) is what makes a value `document`; with one
 * such entry beside the unverifiable one, the value stands (the control). The store refuses the
 * same candidate at commit (`SVX01`, `candidate_without_evidence`; phase 1 review, round 3): on a
 * TEST database, the extraction job's TEST service account writes it through the data-access
 * layer and nothing is stored; with a matched entry beside it, it is stored.
 */
import fc from 'fast-check';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { derive, type Candidate, type Evidence } from '@sovitech/domain';
import { insertCandidate, newId, withRequest, type NewCandidate } from '@sovitech/db';
import {
  createTestAccount,
  createTestDocumentValue,
  createTestProject,
  startTestDatabase,
  TEST_AREA_DEFINITION,
  TEST_AREA_FIELD,
  type TestDatabase,
  type TestDocumentValue,
} from '@sovitech/db/testing';
import { documentReading, testContext, testDocument, testEvents, testField } from './_support/builders';

const PROJECT = 'test-project-g1-14';
const BUILDING = 'test-building-g1-14';

const area = testField('test.building.gross_floor_area', {
  kind: 'quantity',
  subject: 'building',
  unit: 'm2',
  qualifierRequired: true,
  qualifiers: ['gross_total'],
});

const schedule = testDocument('test-doc-g1-14-schedule', PROJECT, 'technical_design');

function withChecks(checks: readonly Evidence['check'][], value: number): Candidate {
  const reading = documentReading({
    id: 'test-cand-g1-14',
    subjectId: BUILDING,
    field: area,
    document: schedule,
    value: { quantity: { value, unit: 'm2', qualifier: 'gross_total' } },
    minute: 0,
  });
  return {
    ...reading,
    evidence: checks.map((check, index) => ({
      documentId: schedule.id,
      contentHash: schedule.contentHash,
      locator: { page: index + 1 },
      excerpt: `TEST ${String(value)} m2`,
      check,
    })),
  };
}

const context = testContext({ subjectId: BUILDING, documents: [schedule] });

test('F-VALUE-02 · G1-14: a document value whose only evidence is unverifiable is refused, and the field stays unknown', () => {
  const candidate = withChecks(['unverifiable'], 1234);
  const state = derive(area, [candidate], testEvents({}), context);
  expect(state.state).toBe('unknown');
  expect(state.activeCandidateId).toBeNull();
  expect(state.candidates).toEqual([{ candidateId: candidate.id, verification: 'unverified', status: 'refused', refusal: 'unverified_evidence' }]);

  // Property: however many unverifiable entries it carries, and whatever the value.
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 5 }), fc.integer({ min: 1, max: 99_999 }), (entries, value) => {
      const many = withChecks(Array.from({ length: entries }, () => 'unverifiable' as const), value);
      const derived = derive(area, [many], testEvents({}), context);
      expect(derived.state).toBe('unknown');
      expect(derived.candidates[0]).toMatchObject({ status: 'refused', refusal: 'unverified_evidence' });
    }),
  );
});

test('F-VALUE-02 · G1-14 control: one entry whose check matched at its location makes the value a document value', () => {
  for (const check of ['text_match', 'ocr_match', 'region_rendered'] as const) {
    const candidate = withChecks(['unverifiable', check], 1234);
    const state = derive(area, [candidate], testEvents({}), context);
    expect(state.state, check).toBe('known');
    expect(state.activeCandidateId, check).toBe(candidate.id);
  }
});

let database: TestDatabase;
let projectId: string;
let stored: TestDocumentValue;

beforeAll(async () => {
  database = await startTestDatabase();
  const ownerId = await createTestAccount(database, { label: 'G1-14 owner', kind: 'person', roles: ['owner'] });
  projectId = await createTestProject(database, { ownerId, isDemo: false });
  stored = await createTestDocumentValue(database, { projectId, label: 'G1-14 schedule' });
}, 240_000);

afterAll(async () => {
  await database.stop();
});

async function candidateRows(): Promise<number> {
  const [row] = await database.asAdministrator<{ count: number }>('SELECT count(*)::int AS count FROM sovitech.candidates WHERE project_id = $1', [projectId]);
  return row?.count ?? -1;
}

function storedWithChecks(checks: readonly Evidence['check'][]): NewCandidate {
  return {
    id: newId(),
    subjectId: stored.subjectId,
    fieldKey: TEST_AREA_FIELD,
    quantity: { value: 1234, unit: 'm2', qualifier: 'gross_total' },
    source: 'document',
    evidence: checks.map((check, index) => ({ documentId: stored.documentId, contentHash: stored.contentHash, locator: { page: index + 1 }, excerpt: 'TEST 1234 m2', check })),
    createdBy: stored.serviceId,
  };
}

test('F-VALUE-01 · G1-14 at the store: a document candidate whose only evidence is unverifiable does not commit, and nothing is stored', async () => {
  const before = await candidateRows();
  const write = withRequest(database.app, { userId: stored.serviceId, projectId }, (request) => insertCandidate(request, storedWithChecks(['unverifiable']), TEST_AREA_DEFINITION));
  await expect(write).rejects.toMatchObject({ refusal: 'candidate_without_evidence', sqlState: 'SVX01' });
  expect(await candidateRows()).toBe(before);
});

test('F-VALUE-01 · G1-14 control at the store: with an entry whose check matched beside it, the same candidate is stored', async () => {
  const before = await candidateRows();
  const written = await withRequest(database.app, { userId: stored.serviceId, projectId }, (request) =>
    insertCandidate(request, storedWithChecks(['unverifiable', 'text_match']), TEST_AREA_DEFINITION),
  );
  expect(written.outcome).toBe('stored');
  expect(await candidateRows()).toBe(before + 1);
});
