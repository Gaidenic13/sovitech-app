/**
 * G1-19 (proposed in the phase 2 fix round; docs/guardrails.md rule 1 "Enforced by": "Before a candidate is stored,
 * code checks five things ... And, for `document`, the value parses from the excerpt itself", each check over the
 * evidence; 2.1 `document`: "Written literally"; 2.3 "Deleting a document withdraws each candidate whose evidence comes
 * only from that document"). Phase 2 review, adversarial finding 6 (medium: evidence padding).
 * Situation: a `document` value written in the excerpt of one document, with a second evidence entry citing another
 * document of the project that does not state it.
 * Expected: rejected and logged (`evidence_not_found`). The field stays unknown.
 *
 * Padding would let the value outlive the deletion of the only document that states it (2.3), with an unrelated
 * source line. The control: each entry states the value, and deleting the one document that does leaves the field
 * unknown.
 */
import { expect, test } from 'vitest';
import { NO_EVENTS, derive, verifyProposal, type Candidate, type CandidateProposal, type ProposalContext } from '@sovitech/domain';
import { readQuantities } from '../../apps/api/src/ingestion/quantities';
import { testContext, testDocument, testField, testTime } from './_support/builders';

const PROJECT = 'test-project-g1-19';
const BUILDING = 'test-building-g1-19';
const schedule = testDocument('test-doc-g1-19-schedule', PROJECT, 'technical_design');
const memo = testDocument('test-doc-g1-19-memo', PROJECT, 'permit');
const area = testField('test.building.gross_floor_area', { kind: 'quantity', subject: 'building', unit: 'm2', qualifierRequired: true, qualifiers: ['gross_total'] });
const TEXTS = new Map<string, string>([
  [schedule.id, 'TEST Scd 2345 mp'],
  [memo.id, 'TEST Hotel de categoria TEST'],
]);

const context: ProposalContext = {
  projectId: PROJECT,
  field: area,
  document: (id) => [schedule, memo].find((document) => document.id === id),
  textAt: (documentId, contentHash, locator) => {
    const record = [schedule, memo].find((document) => document.id === documentId);
    const text = TEXTS.get(documentId);
    return record === undefined || contentHash !== record.contentHash || locator.page !== 1 || text === undefined ? undefined : { text, layer: 'text' };
  },
  readQuantities,
  candidateId: 'test-cand-g1-19',
  createdBy: 'test-verifier',
  createdAt: '2026-09-30T10:00:00.000Z',
};

const padded: CandidateProposal = {
  subjectId: BUILDING,
  fieldKey: area.key,
  quantity: { value: 2345, unit: 'm2', qualifier: 'gross_total' },
  source: 'document',
  evidence: [
    { documentId: schedule.id, contentHash: schedule.contentHash, locator: { page: 1 }, excerpt: 'Scd 2345 mp' },
    { documentId: memo.id, contentHash: memo.contentHash, locator: { page: 1 }, excerpt: 'Hotel' },
  ],
};
const deriveContext = testContext({ subjectId: BUILDING, documents: [schedule, memo] });

test('F-EXTRACT-04 · F-EXTRACT-05 · G1-19: a document value padded with an entry from another document that does not state it: rejected and logged, field unknown', () => {
  const verdict = verifyProposal(padded, context);
  const stored: Candidate[] = verdict.outcome === 'accepted' ? [verdict.candidate] : [];
  expect(verdict.outcome).toBe('rejected');
  if (verdict.outcome !== 'rejected') return;
  expect(verdict.rejection).toEqual({ kind: 'evidence_check_failed', check: 'value_in_excerpt', evidenceIndex: 1 });
  expect(verdict.guardrailEvents.map((event) => event.type)).toEqual(['evidence_not_found']);
  expect(derive(area, stored, NO_EVENTS, deriveContext).state).toBe('unknown');
});

test('G1-19 control: the value from the one document that states it is stored, and deleting that document leaves the field unknown', () => {
  const verdict = verifyProposal({ ...padded, evidence: padded.evidence.slice(0, 1) }, context);
  expect(verdict.outcome).toBe('accepted');
  if (verdict.outcome !== 'accepted') return;
  const candidate: Candidate = { ...verdict.candidate, authorRole: 'system' };
  expect(derive(area, [candidate], NO_EVENTS, deriveContext).state).toBe('known');
  const deleted = derive(area, [candidate], { ...NO_EVENTS, document: [{ documentId: schedule.id, type: 'withdrawn', by: 'test-owner', role: 'owner', at: testTime(5) }] }, deriveContext);
  expect(deleted.state).toBe('unknown');
  expect(deleted.statusLines).toContain('source_document_removed');
});
