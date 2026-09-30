/**
 * G8-20 (proposed in the phase 2 fix round; docs/guardrails.md rule 8, "Approximate wording is kept. Words like 'cca.',
 * 'aprox.', '~', 'circa', 'peste' and 'about' are stored as `approximate` and shown as 'about'"). Phase 2 review,
 * adversarial finding 4 (medium).
 * Situation: the excerpt "cca. 2350 mp" is proposed as 2350 m² without the approximate mark.
 * Expected: stored as `approximate`, with the original "cca. 2350 mp".
 *
 * Before the fix the marker was dropped. Each of rule 8's words is kept the same way, as the registry's parser reads it.
 */
import { expect, test } from 'vitest';
import { verifyProposal, type CandidateProposal, type ProposalContext } from '@sovitech/domain';
import { parseNumber } from '@sovitech/registry';
import { readQuantities } from '../../apps/api/src/ingestion/quantities';
import { testDocument, testField } from './_support/builders';

const PROJECT = 'test-project-g8-20';
const BUILDING = 'test-building-g8-20';
const memo = testDocument('test-doc-g8-20-memo', PROJECT, 'permit');
const area = testField('test.building.gross_floor_area', { kind: 'quantity', subject: 'building', unit: 'm2', qualifierRequired: true, qualifiers: ['gross_total'], confirmBy: 'engineer' });
const WORDS = ['cca.', 'aprox.', '~', 'circa', 'peste', 'about'] as const;

function contextFor(word: string): ProposalContext {
  return {
    projectId: PROJECT,
    field: area,
    document: (id) => (id === memo.id ? memo : undefined),
    textAt: (documentId, contentHash, locator) =>
      documentId === memo.id && contentHash === memo.contentHash && locator.page === 1 ? { text: `TEST Memoriu. Scd ${word} 2350 mp.`, layer: 'text' } : undefined,
    readQuantities,
    candidateId: 'test-cand-g8-20',
    createdBy: 'test-verifier',
    createdAt: '2026-09-30T10:00:00.000Z',
  };
}

const proposal = (word: string): CandidateProposal => ({
  subjectId: BUILDING,
  fieldKey: area.key,
  quantity: { value: 2350, unit: 'm2', qualifier: 'gross_total' },
  source: 'document',
  evidence: [{ documentId: memo.id, contentHash: memo.contentHash, locator: { page: 1 }, excerpt: `Scd ${word} 2350 mp` }],
});

test('F-EXTRACT-06 · G8-20: "cca. 2350 mp" proposed without the approximate mark: stored as approximate, with the original as written', () => {
  const verdict = verifyProposal(proposal('cca.'), contextFor('cca.'));
  expect(verdict.outcome).toBe('accepted');
  if (verdict.outcome !== 'accepted') return;
  expect(verdict.candidate.quantity?.approximate).toBe(true);
  expect(verdict.candidate.original).toEqual({ text: 'cca. 2350 mp' });

  // Every word of rule 8, as the registry's parser reads it.
  for (const word of WORDS) {
    const parsed = parseNumber(`${word} 2350`);
    expect(parsed.ok && parsed.approximate, word).toBe(true);
    expect(verifyProposal(proposal(word), contextFor(word)), word).toMatchObject({ outcome: 'accepted', candidate: { quantity: { approximate: true } } });
  }
});
