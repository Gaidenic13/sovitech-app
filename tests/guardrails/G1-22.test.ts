/**
 * G1-22 (proposed in the phase 2 fix round; docs/guardrails.md rule 1, "Zero is a value. 'None found' is not zero. A
 * count of 0 needs a document, the owner or an engineer saying so", and "A direct count of symbols or items visible at
 * the cited locations may be an `ai_inference` count"). Found while fixing the phase 2 review's findings: the verifier
 * accepted an inferred count of 0.
 * Situation: the AI returns a count of 0 guest rooms as `ai_inference`, a direct count at the cited locations.
 * Expected: rejected. The field stays unknown, never 0.
 *
 * An inference is not a document, the owner or an engineer saying so; none found at the cited places is not zero.
 * The control: a count of one item at the cited place stands as an inference.
 */
import { expect, test } from 'vitest';
import { NO_EVENTS, derive, verifyProposal, type Candidate, type CandidateProposal, type ProposalContext } from '@sovitech/domain';
import { readQuantities } from '../../apps/api/src/ingestion/quantities';
import { testContext, testDocument, testField } from './_support/builders';

const PROJECT = 'test-project-g1-22';
const BUILDING = 'test-building-g1-22';
const plan = testDocument('test-doc-g1-22-plan', PROJECT, 'technical_design');
const guestRooms = testField('test.building.rooms', { kind: 'count', subject: 'building', unit: 'count', qualifierRequired: true, qualifiers: ['guest_rooms'], confirmBy: 'engineer' });

const context: ProposalContext = {
  projectId: PROJECT,
  field: guestRooms,
  document: (id) => (id === plan.id ? plan : undefined),
  textAt: (documentId, contentHash, locator) =>
    documentId === plan.id && contentHash === plan.contentHash && locator.page === 1 ? { text: 'TEST Plan parter: receptie, restaurant', layer: 'text' } : undefined,
  readQuantities,
  candidateId: 'test-cand-g1-22',
  createdBy: 'test-verifier',
  createdAt: '2026-09-30T10:00:00.000Z',
};

const counted = (value: number): CandidateProposal => ({
  subjectId: BUILDING,
  fieldKey: guestRooms.key,
  quantity: { value, unit: 'count', qualifier: 'guest_rooms' },
  source: 'ai_inference',
  inference: 'direct_count',
  confidence: 'medium',
  evidence: [{ documentId: plan.id, contentHash: plan.contentHash, locator: { page: 1 }, excerpt: 'Plan parter: receptie, restaurant' }],
});

test('F-EXTRACT-05 · G1-22: an inferred count of 0: rejected, field unknown and never 0', () => {
  const verdict = verifyProposal(counted(0), context);
  const stored: Candidate[] = verdict.outcome === 'accepted' ? [verdict.candidate] : [];
  expect(verdict.outcome).toBe('rejected');
  if (verdict.outcome !== 'rejected') return;
  expect(verdict.rejection).toEqual({ kind: 'inferred_quantity_not_direct_count' });
  const state = derive(guestRooms, stored, NO_EVENTS, testContext({ subjectId: BUILDING, documents: [plan] }));
  expect(state.state).toBe('unknown');
  expect(state.activeCandidateId).toBeNull();
});

test('G1-22 control: a direct count of one item at the cited place stands as an inference', () => {
  expect(verifyProposal(counted(1), context)).toMatchObject({ outcome: 'accepted', candidate: { source: 'ai_inference', quantity: { value: 1 } } });
});
