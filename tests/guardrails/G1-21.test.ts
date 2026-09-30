/**
 * G1-21 (proposed in the phase 2 fix round; docs/guardrails.md rule 1 "Enforced by": "Values not written literally
 * become inferences, and the AI never derives quantities ... Sums, products, ratios, scale readings, and any quantity
 * derived from other quantities are never produced by the AI ... An `ai_inference` quantity other than a direct count
 * is rejected"; 2.1 `ai_inference`: "Never a quantity derived from other quantities"). Phase 2 review, adversarial
 * finding 7 (medium).
 * Situation: the AI labels as `document` a count of 34 guest rooms, the sum of "17 camere" written on two rows of the
 * cited excerpt.
 * Expected: rejected, because an inferred quantity other than a direct count is not allowed. The field stays unknown.
 *
 * The sum is not written, so code makes it an inference (G2-2); before the fix any whole number on a count field then
 * passed as a "direct count". A count cited to excerpts that hold digits is a direct count only when the proposal
 * names it one. The control: a count the proposal names a direct count of the items at the cited places is kept.
 */
import { expect, test } from 'vitest';
import { NO_EVENTS, derive, verifyProposal, type Candidate, type CandidateProposal, type ProposalContext } from '@sovitech/domain';
import { readQuantities } from '../../apps/api/src/ingestion/quantities';
import { testContext, testDocument, testField } from './_support/builders';

const PROJECT = 'test-project-g1-21';
const BUILDING = 'test-building-g1-21';
const rooms = testDocument('test-doc-g1-21-rooms', PROJECT, 'technical_design');
const guestRooms = testField('test.building.rooms', { kind: 'count', subject: 'building', unit: 'count', qualifierRequired: true, qualifiers: ['guest_rooms'], confirmBy: 'engineer' });
const PAGE = 'TEST Tabel camere. Etaj 1: 17 camere; Etaj 2: 17 camere';

const context: ProposalContext = {
  projectId: PROJECT,
  field: guestRooms,
  document: (id) => (id === rooms.id ? rooms : undefined),
  textAt: (documentId, contentHash, locator) => (documentId === rooms.id && contentHash === rooms.contentHash && locator.page === 1 ? { text: PAGE, layer: 'text' } : undefined),
  readQuantities,
  candidateId: 'test-cand-g1-21',
  createdBy: 'test-verifier',
  createdAt: '2026-09-30T10:00:00.000Z',
};

const count = (value: number, overrides: Partial<CandidateProposal> = {}): CandidateProposal => ({
  subjectId: BUILDING,
  fieldKey: guestRooms.key,
  quantity: { value, unit: 'count', qualifier: 'guest_rooms' },
  source: 'document',
  evidence: [{ documentId: rooms.id, contentHash: rooms.contentHash, locator: { page: 1 }, excerpt: 'Etaj 1: 17 camere; Etaj 2: 17 camere' }],
  ...overrides,
});

test('F-EXTRACT-05 · G1-21: the sum of two written counts labelled document: rejected, field unknown', () => {
  for (const proposal of [count(34), count(34, { source: 'ai_inference', confidence: 'medium' })]) {
    const verdict = verifyProposal(proposal, context);
    const stored: Candidate[] = verdict.outcome === 'accepted' ? [verdict.candidate] : [];
    expect(verdict.outcome, proposal.source).toBe('rejected');
    if (verdict.outcome !== 'rejected') continue;
    expect(verdict.rejection).toEqual({ kind: 'inferred_quantity_not_direct_count' });
    expect(verdict.guardrailEvents.map((event) => event.type)).toEqual(['ai_output_rejected']);
    expect(derive(guestRooms, stored, NO_EVENTS, testContext({ subjectId: BUILDING, documents: [rooms] })).state).toBe('unknown');
  }
});

test('G1-21 control: a count the proposal names a direct count is kept as an inference, and a count written in the excerpt is document', () => {
  expect(verifyProposal(count(2, { source: 'ai_inference', inference: 'direct_count', confidence: 'medium' }), context)).toMatchObject({
    outcome: 'accepted',
    candidate: { source: 'ai_inference', quantity: { value: 2 } },
    inference: 'direct_count',
  });
  expect(verifyProposal(count(17, { evidence: [{ documentId: rooms.id, contentHash: rooms.contentHash, locator: { page: 1 }, excerpt: 'Etaj 1: 17 camere' }] }), context)).toMatchObject({
    outcome: 'accepted',
    candidate: { source: 'document', quantity: { value: 17 } },
  });
});
