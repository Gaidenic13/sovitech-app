/**
 * G3-17 (proposed in the phase 2 fix round; docs/guardrails.md rule 3, "High ('Likely'). Verified text evidence names
 * the type" and "Enforced by: Confidence caps. The cap is checked against each item's evidence check result"; section
 * 4's example: the Hotel tile "is preselected with Possible and the line '212 guest rooms in Room Schedule.xlsx'. It
 * would be Likely only if a document named the building type"). Phase 2 review, adversarial finding 7 (medium).
 * Situation: the AI infers the building type "hotel" from "212 camere" in a room schedule, and claims high confidence.
 * Expected: `ai_inference`, with confidence at most medium.
 *
 * Before the fix the cap was high for any text-matched excerpt, so the AI's own "high" read Likely. The control: an
 * excerpt that names the type allows high.
 */
import { expect, test } from 'vitest';
import { verifyProposal, type CandidateProposal, type ProposalContext } from '@sovitech/domain';
import { readQuantities } from '../../apps/api/src/ingestion/quantities';
import { testDocument, testField } from './_support/builders';

const PROJECT = 'test-project-g3-17';
const BUILDING = 'test-building-g3-17';
const roomSchedule = testDocument('test-doc-g3-17-rooms', PROJECT, 'technical_design', { kind: 'specification' });
const buildingType = testField('test.building.type', { kind: 'enum', subject: 'building', options: ['hotel', 'office'], confirmBy: 'owner' });
const CELLS = new Map<string, string>([
  ['Camere!B2', '212 camere'],
  ['Camere!A1', 'Destinatie: hotel'],
]);

const context: ProposalContext = {
  projectId: PROJECT,
  field: buildingType,
  document: (id) => (id === roomSchedule.id ? roomSchedule : undefined),
  textAt: (documentId, contentHash, locator) => {
    const text = CELLS.get(`${locator.sheet ?? ''}!${locator.cell ?? ''}`);
    return documentId !== roomSchedule.id || contentHash !== roomSchedule.contentHash || text === undefined ? undefined : { text, layer: 'text' };
  },
  readQuantities,
  candidateId: 'test-cand-g3-17',
  createdBy: 'test-verifier',
  createdAt: '2026-09-30T10:00:00.000Z',
};

const inferred = (cell: string, excerpt: string): CandidateProposal => ({
  subjectId: BUILDING,
  fieldKey: buildingType.key,
  choice: 'hotel',
  source: 'ai_inference',
  inference: 'classification',
  confidence: 'high',
  evidence: [{ documentId: roomSchedule.id, contentHash: roomSchedule.contentHash, locator: { sheet: 'Camere', cell }, excerpt }],
});

test('F-EXTRACT-05 · G3-17: "hotel" inferred from "212 camere", claimed high: ai_inference, confidence at most medium', () => {
  const verdict = verifyProposal(inferred('B2', '212 camere'), context);
  expect(verdict.outcome).toBe('accepted');
  if (verdict.outcome !== 'accepted') return;
  expect(verdict.candidate.source).toBe('ai_inference');
  expect(['low', 'medium']).toContain(verdict.candidate.confidence);
});

test('G3-17 control: an excerpt that names the type allows high', () => {
  expect(verifyProposal(inferred('A1', 'Destinatie: hotel'), context)).toMatchObject({ outcome: 'accepted', candidate: { source: 'ai_inference', confidence: 'high' } });
});
