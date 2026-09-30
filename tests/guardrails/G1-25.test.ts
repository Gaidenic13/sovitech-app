/**
 * G1-25 (docs/guardrails.md section 7; 2.4, `Evidence.excerpt`: "required, verbatim, original
 * language, never translated"; rule 1, "Enforced by": "The excerpt occurs at that location in the
 * extracted text or OCR, after normalising whitespace and diacritics"; F-EXTRACT-04). A near miss of
 * the phase 2 review, fixed in the fix round of 2026-09-30 (the build log's "Next" item "Stored
 * excerpts"): the verifier matched the proposer's excerpt after normalising it, as rule 1 says, and
 * then stored the proposer's copy, which may lack the diacritics the page writes.
 * Situation: the AI cites an excerpt without the diacritics its page writes ("Suprafata construita
 * desfasurata: 2345 mp" where the page reads "Suprafață construită desfășurată: 2345 mp").
 * Expected: the stored excerpt is the page's text as written, with its diacritics.
 *
 * The control: an excerpt the proposer copied as written is stored as written too.
 */
import { expect, test } from 'vitest';
import { verifyProposal, type CandidateProposal, type ProposalContext } from '@sovitech/domain';
import { readQuantities } from '../../apps/api/src/ingestion/quantities';
import { testDocument, testField } from './_support/builders';

const PROJECT = 'test-project-g1-25';
const BUILDING = 'test-building-g1-25';
const memo = testDocument('test-doc-g1-25-memo', PROJECT, 'permit');
const area = testField('test.building.gross_floor_area', { kind: 'quantity', subject: 'building', unit: 'm2', qualifierRequired: true, qualifiers: ['gross_total'], confirmBy: 'engineer' });
const PAGE = 'TEST Memoriu. Suprafață construită desfășurată: 2345 mp (TEST).';
const WRITTEN = 'Suprafață construită desfășurată: 2345 mp';

const context: ProposalContext = {
  projectId: PROJECT,
  field: area,
  document: (id) => (id === memo.id ? memo : undefined),
  textAt: (documentId, contentHash, locator) =>
    documentId === memo.id && contentHash === memo.contentHash && locator.page === 1 ? { text: PAGE, layer: 'text' } : undefined,
  readQuantities,
  candidateId: 'test-cand-g1-25',
  createdBy: 'test-verifier',
  createdAt: '2026-09-30T10:00:00.000Z',
};

const citing = (excerpt: string): CandidateProposal => ({
  subjectId: BUILDING,
  fieldKey: area.key,
  quantity: { value: 2345, unit: 'm2', qualifier: 'gross_total' },
  source: 'document',
  evidence: [{ documentId: memo.id, contentHash: memo.contentHash, locator: { page: 1 }, excerpt }],
});

test('F-EXTRACT-04 · G1-25: an excerpt cited without the diacritics its page writes: the stored excerpt is the page\'s text as written, with its diacritics', () => {
  const verdict = verifyProposal(citing('Suprafata construita desfasurata: 2345 mp'), context);
  expect(verdict.outcome).toBe('accepted');
  if (verdict.outcome !== 'accepted') return;
  expect(verdict.candidate.evidence.map((entry) => entry.excerpt)).toEqual([WRITTEN]);
  expect(PAGE).toContain(verdict.candidate.evidence[0]?.excerpt);
});

test('F-EXTRACT-04 · G1-25 (control): an excerpt copied as written is stored as written', () => {
  const verdict = verifyProposal(citing(WRITTEN), context);
  expect(verdict.outcome).toBe('accepted');
  if (verdict.outcome !== 'accepted') return;
  expect(verdict.candidate.evidence.map((entry) => entry.excerpt)).toEqual([WRITTEN]);
});
