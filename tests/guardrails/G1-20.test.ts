/**
 * G1-20 (proposed in the phase 2 fix round; docs/guardrails.md rule 1: "A value exists only if it comes from ... a
 * verified document location ... Otherwise the field stays Unknown. It is never filled with ... a guess", and "Enforced
 * by": "for `document`, the value parses from the excerpt itself"; 2.1 `document`: "Written literally"; rule 3,
 * "Confidence is set by the evidence"). Phase 2 review, adversarial finding 5 (medium).
 * Situation: the building type "hotel" is proposed, as `document` or as an inference, citing only "Clădirea nu este un
 * hotel" ("the building is not a hotel").
 * Expected: rejected and logged (`ai_output_rejected`). The field stays unknown.
 *
 * Before the fix the word "hotel" in the excerpt made the choice `document` ("From document"). The negation governs
 * the word in the located text, so an excerpt that leaves the negation out reads the same. The control: a mention with
 * no negation is an inference, never `document` from the word alone (no label-value pattern is registered).
 */
import { expect, test } from 'vitest';
import { NO_EVENTS, derive, verifyProposal, type Candidate, type CandidateProposal, type ProposalContext } from '@sovitech/domain';
import { readQuantities } from '../../apps/api/src/ingestion/quantities';
import { testContext, testDocument, testField } from './_support/builders';

const PROJECT = 'test-project-g1-20';
const BUILDING = 'test-building-g1-20';
const memo = testDocument('test-doc-g1-20-memo', PROJECT, 'permit');
const buildingType = testField('test.building.type', { kind: 'enum', subject: 'building', options: ['hotel', 'office'], confirmBy: 'owner' });
const PAGES = new Map<number, string>([
  [1, 'TEST Memoriu. Clădirea nu este un hotel. Destinația: birouri TEST.'],
  [2, 'TEST Destinația clădirii: hotel de categoria TEST'],
]);

const context: ProposalContext = {
  projectId: PROJECT,
  field: buildingType,
  document: (id) => (id === memo.id ? memo : undefined),
  textAt: (documentId, contentHash, locator) => {
    const text = locator.page === undefined ? undefined : PAGES.get(locator.page);
    return documentId !== memo.id || contentHash !== memo.contentHash || text === undefined ? undefined : { text, layer: 'text' };
  },
  readQuantities,
  candidateId: 'test-cand-g1-20',
  createdBy: 'test-verifier',
  createdAt: '2026-09-30T10:00:00.000Z',
};

const hotel = (page: number, excerpt: string, source: CandidateProposal['source']): CandidateProposal => ({
  subjectId: BUILDING,
  fieldKey: buildingType.key,
  choice: 'hotel',
  source,
  ...(source === 'ai_inference' ? { confidence: 'high' as const } : {}),
  evidence: [{ documentId: memo.id, contentHash: memo.contentHash, locator: { page }, excerpt }],
});

test('F-EXTRACT-05 · G1-20: "hotel" proposed from "Clădirea nu este un hotel": rejected and logged, field unknown', () => {
  for (const excerpt of ['Clădirea nu este un hotel.', 'este un hotel']) {
    for (const source of ['document', 'ai_inference'] as const) {
      const verdict = verifyProposal(hotel(1, excerpt, source), context);
      const stored: Candidate[] = verdict.outcome === 'accepted' ? [verdict.candidate] : [];
      expect(verdict.outcome, `${excerpt} ${source}`).toBe('rejected');
      if (verdict.outcome !== 'rejected') continue;
      expect(verdict.rejection).toEqual({ kind: 'choice_negated' });
      expect(verdict.guardrailEvents.map((event) => event.type)).toEqual(['ai_output_rejected']);
      expect(derive(buildingType, stored, NO_EVENTS, testContext({ subjectId: BUILDING, documents: [memo] })).state).toBe('unknown');
    }
  }
});

test('G1-20 control: a mention with no negation is an inference that names the option, never `document` from the word alone', () => {
  expect(verifyProposal(hotel(2, 'Destinația clădirii: hotel', 'document'), context)).toMatchObject({
    outcome: 'accepted',
    candidate: { source: 'ai_inference', choice: 'hotel' },
  });
});
