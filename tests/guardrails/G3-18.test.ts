/**
 * G3-18 (docs/guardrails.md section 7, indexed in the phase 2 fix round of 2026-09-30; rule 3, "Confidence is
 * set by the evidence and capped by code", "High ('Likely'). Verified text evidence names the type" and "Enforced by:
 * Confidence caps. The cap is checked against each item's evidence check result"; 2.3, "A candidate or asset with
 * evidence from other active documents keeps that evidence"; rule 13, "Erasure"). The phase 2 verifier's closing check
 * (new problem: padding of an inferred choice).
 * Situation: an inference whose high cap rested on one document, that document erased.
 * Expected: confidence at most medium from what remains.
 *
 * The AI infers the building type "hotel" citing a label in one document that names the type ("Destinatia cladirii:
 * hotel") and a room schedule in another ("212 camere"), and claims high. The verifier stores it high: the label names
 * the type. The owner then has the label's document erased (rule 13: its excerpt reads "[erased]", an `erased` document
 * event). The candidate stays, since the room schedule still supports it (2.3), but the room schedule alone supports at
 * most medium (G3-17; section 4's example). Before the fix the cap was computed once, at verification, and the value
 * still read high ("Likely") after the evidence that earned it was erased. The control: with nothing erased it reads high.
 */
import { expect, test } from 'vitest';
import { NO_EVENTS, derive, verifyProposal, type Candidate, type CandidateProposal, type DeriveEvents, type ProposalContext } from '@sovitech/domain';
import { readQuantities } from '../../apps/api/src/ingestion/quantities';
import { testContext, testDocument, testField, testTime } from './_support/builders';

const PROJECT = 'test-project-g3-18';
const BUILDING = 'test-building-g3-18';
const memo = testDocument('test-doc-g3-18-memo', PROJECT, 'technical_design');
const roomSchedule = testDocument('test-doc-g3-18-rooms', PROJECT, 'technical_design', { kind: 'specification' });
const buildingType = testField('test.building.type', { kind: 'enum', subject: 'building', options: ['hotel', 'office'], confirmBy: 'owner' });
const PAGES = new Map<string, string>([
  [memo.id, 'TEST Destinatia cladirii: hotel'],
  [roomSchedule.id, 'TEST Tabel camere: 212 camere'],
]);

const context: ProposalContext = {
  projectId: PROJECT,
  field: buildingType,
  document: (id) => [memo, roomSchedule].find((document) => document.id === id),
  textAt: (documentId, contentHash, locator) => {
    const record = [memo, roomSchedule].find((document) => document.id === documentId);
    const text = PAGES.get(documentId);
    return record === undefined || contentHash !== record.contentHash || locator.page !== 1 || text === undefined ? undefined : { text, layer: 'text' };
  },
  readQuantities,
  candidateId: 'test-cand-g3-18',
  createdBy: 'test-verifier',
  createdAt: testTime(1),
};

const inferred: CandidateProposal = {
  subjectId: BUILDING,
  fieldKey: buildingType.key,
  choice: 'hotel',
  source: 'ai_inference',
  inference: 'classification',
  confidence: 'high',
  evidence: [
    { documentId: memo.id, contentHash: memo.contentHash, locator: { page: 1 }, excerpt: 'Destinatia cladirii: hotel' },
    { documentId: roomSchedule.id, contentHash: roomSchedule.contentHash, locator: { page: 1 }, excerpt: '212 camere' },
  ],
};
const deriveContext = testContext({ subjectId: BUILDING, documents: [memo, roomSchedule] });

/** The stored candidate: high, as the label names the type. */
function storedCandidate(): Candidate {
  const verdict = verifyProposal(inferred, context);
  if (verdict.outcome !== 'accepted') throw new Error('the TEST inference was not accepted');
  return { ...verdict.candidate, authorRole: 'system' };
}

test('F-VALUE-02 · F-EXTRACT-05 · G3-18: an inference whose high cap rested on one document, that document erased: confidence at most medium from what remains', () => {
  const candidate = storedCandidate();
  expect(candidate.confidence).toBe('high');
  // Rule 13's erasure: the erased document's excerpt reads "[erased]", and an `erased` document event is written.
  const erasedCandidate: Candidate = {
    ...candidate,
    evidence: candidate.evidence.map((entry) => (entry.documentId === memo.id ? { ...entry, excerpt: '[erased]' } : entry)),
  };
  const events: DeriveEvents = {
    ...NO_EVENTS,
    document: [{ documentId: memo.id, type: 'erased', by: 'test-owner', role: 'owner', at: testTime(5), reason: 'document_erased' }],
  };
  const state = derive(buildingType, [erasedCandidate], events, deriveContext);
  // The room schedule still supports the inference (2.3), so it stays the field's value...
  expect(state.state).toBe('known');
  expect(state.activeCandidateId).toBe(candidate.id);
  // ...with the tier what remains supports: at most medium ("Possible"), never the high the erased label gave it.
  const derived = state.candidates.find((entry) => entry.candidateId === candidate.id);
  expect(derived?.status).toBe('eligible');
  expect(['low', 'medium']).toContain(derived?.confidence);
});

test('G3-18 control: with nothing erased, the inference reads high, as stored', () => {
  const candidate = storedCandidate();
  const state = derive(buildingType, [candidate], NO_EVENTS, deriveContext);
  expect(state.candidates).toEqual([{ candidateId: candidate.id, verification: 'unverified', status: 'eligible', refusal: null, confidence: 'high' }]);
});
