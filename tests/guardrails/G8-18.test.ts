/**
 * G8-18 (proposed in the phase 2 fix round; docs/guardrails.md rule 8, "Ambiguous readings keep both. When a reading is
 * ambiguous, such as '1.500', the candidate carries both alternatives with low confidence. It is never silently read
 * one way"; G8-3 is its eval, G8-12 the parser's case). Phase 2 review, adversarial finding 4 (medium).
 * Situation: the excerpt "1.500 kW", in a table whose locale is unknown, is proposed as the single reading 1500 kW.
 * Expected: one candidate with both readings, 1.5 and 1500, and low confidence.
 *
 * Through the verifier with the API's rule 8 reader (the registry's parser reads "1.500" both ways). Before the fix the
 * proposal was stored as 1500 with no alternative and no confidence.
 */
import { expect, test } from 'vitest';
import { verifyProposal, type CandidateProposal, type ProposalContext } from '@sovitech/domain';
import { readQuantities } from '../../apps/api/src/ingestion/quantities';
import { testDocument, testField } from './_support/builders';

const PROJECT = 'test-project-g8-18';
const CHILLER = 'test-asset-g8-18-chiller';
const datasheet = testDocument('test-doc-g8-18-datasheet', PROJECT, 'technical_design', { kind: 'mep' });
const power = testField('test.asset.electrical_input', { kind: 'quantity', subject: 'asset', unit: 'kW', confirmBy: 'engineer' });

const context: ProposalContext = {
  projectId: PROJECT,
  field: power,
  document: (id) => (id === datasheet.id ? datasheet : undefined),
  textAt: (documentId, contentHash, locator) =>
    documentId === datasheet.id && contentHash === datasheet.contentHash && locator.page === 1 ? { text: 'TEST Fisa tehnica. Putere absorbita: 1.500 kW', layer: 'text' } : undefined,
  readQuantities,
  candidateId: 'test-cand-g8-18',
  createdBy: 'test-verifier',
  createdAt: '2026-09-30T10:00:00.000Z',
};

const oneReading: CandidateProposal = {
  subjectId: CHILLER,
  fieldKey: power.key,
  quantity: { value: 1500, unit: 'kW' },
  source: 'document',
  evidence: [{ documentId: datasheet.id, contentHash: datasheet.contentHash, locator: { page: 1 }, excerpt: 'Putere absorbita: 1.500 kW' }],
};

test('F-EXTRACT-06 · G8-18: "1.500 kW" proposed as 1500 alone: one candidate with both readings and low confidence', () => {
  const verdict = verifyProposal(oneReading, context);
  expect(verdict.outcome).toBe('accepted');
  if (verdict.outcome !== 'accepted') return;
  expect(verdict.candidate.source).toBe('document');
  expect(verdict.candidate.alternatives?.map((reading) => reading.value).sort((a, b) => a - b)).toEqual([1.5, 1500]);
  expect(verdict.candidate.confidence).toBe('low');
});
