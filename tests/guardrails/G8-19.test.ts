/**
 * G8-19 (proposed in the phase 2 fix round; docs/guardrails.md rule 8, "A value with no stated basis ... is stored with basis
 * `unknown`", and "A quantity is stored as a value, a unit and a qualifier, plus the
 * original text exactly as written"; G8-2 is its eval). Phase 2 review, adversarial findings 3 and 4 (medium).
 * Situation: the excerpt "45.600 mp", with no basis written, is proposed as a gross floor area (`gross_total`), with an
 * original text of the proposer's own.
 * Expected: stored with basis unknown, and the original "45.600 mp" as written.
 *
 * Before the fix the proposer's basis and its original text were stored as the document's own.
 */
import { expect, test } from 'vitest';
import { UNKNOWN_QUALIFIER, verifyProposal, type CandidateProposal, type ProposalContext } from '@sovitech/domain';
import { readQuantities } from '../../apps/api/src/ingestion/quantities';
import { testDocument, testField } from './_support/builders';

const PROJECT = 'test-project-g8-19';
const BUILDING = 'test-building-g8-19';
const memo = testDocument('test-doc-g8-19-memo', PROJECT, 'permit');
const area = testField('test.building.gross_floor_area', { kind: 'quantity', subject: 'building', unit: 'm2', qualifierRequired: true, qualifiers: ['gross_total'], confirmBy: 'engineer' });

const context: ProposalContext = {
  projectId: PROJECT,
  field: area,
  document: (id) => (id === memo.id ? memo : undefined),
  textAt: (documentId, contentHash, locator) =>
    documentId === memo.id && contentHash === memo.contentHash && locator.page === 1 ? { text: 'TEST Memoriu. Suprafata totala 45.600 mp.', layer: 'text' } : undefined,
  readQuantities,
  candidateId: 'test-cand-g8-19',
  createdBy: 'test-verifier',
  createdAt: '2026-09-30T10:00:00.000Z',
};

const proposal: CandidateProposal = {
  subjectId: BUILDING,
  fieldKey: area.key,
  quantity: { value: 45600, unit: 'm2', qualifier: 'gross_total' },
  alternatives: [{ value: 45.6, unit: 'm2', qualifier: 'gross_total' }],
  source: 'document',
  evidence: [{ documentId: memo.id, contentHash: memo.contentHash, locator: { page: 1 }, excerpt: 'Suprafata totala 45.600 mp' }],
  original: { text: 'Scd 45.600 mp, verified', locale: 'ro-RO' },
};

test('F-EXTRACT-06 · G8-19: "45.600 mp" with no basis written, proposed as gross_total: stored with basis unknown and the original as written', () => {
  const verdict = verifyProposal(proposal, context);
  expect(verdict.outcome).toBe('accepted');
  if (verdict.outcome !== 'accepted') return;
  const stated = verdict.candidate.quantity?.qualifier;
  expect(stated === undefined || stated === UNKNOWN_QUALIFIER).toBe(true);
  for (const reading of verdict.candidate.alternatives ?? []) expect(reading.qualifier === undefined || reading.qualifier === UNKNOWN_QUALIFIER).toBe(true);
  expect(verdict.candidate.original).toEqual({ text: '45.600 mp' });
});
