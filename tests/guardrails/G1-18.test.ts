/**
 * G1-18 (proposed in the phase 2 fix round; docs/guardrails.md rule 1 "Enforced by": "The excerpt occurs at that
 * location in the extracted text or OCR, after normalising whitespace and diacritics. And, for `document`, the value
 * parses from the excerpt itself"; 2.1 `document`: "Written literally in an uploaded document, at a verified
 * location"). Phase 2 review, adversarial finding 0 (high).
 * Situation: the cited excerpt is not a whole run of text at the cited location: a fragment of a longer number or
 * word ("2.345 mp" where the page reads "12.345 mp", "5" of "2025"), or text joined across two cells of a sheet
 * cited as a whole.
 * Expected: rejected and logged (`evidence_not_found`). The field stays unknown.
 *
 * Through the verifier with the API's rule 8 reader (apps/api `readQuantities`, the registry's parser). Each fragment
 * is a substring of the page, which check 4 had accepted before the fix. The control shows the whole token accepted
 * at the same place.
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { NO_EVENTS, derive, verifyProposal, type Candidate, type CandidateProposal, type EvidenceLocator, type FieldDefinition, type ProposalContext } from '@sovitech/domain';
import { readQuantities } from '../../apps/api/src/ingestion/quantities';
import { testContext, testDocument, testField } from './_support/builders';

const PROJECT = 'test-project-g1-18';
const BUILDING = 'test-building-g1-18';
const schedule = testDocument('test-doc-g1-18-schedule', PROJECT, 'technical_design');
const area = testField('test.building.gross_floor_area', { kind: 'quantity', subject: 'building', unit: 'm2', qualifierRequired: true, qualifiers: ['gross_total'] });
const floors = testField('test.building.floors', { kind: 'count', subject: 'building', unit: 'count', qualifierRequired: true, qualifiers: ['upper'] });

const PAGE = 'TEST Tablou de suprafete. Suprafata construita desfasurata: 12.345 mp. An proiect 2025, Etaj 1';
const SHEET = 'Suprafata construita desfasurata:\n999 mp\nSuprafata utila';

function contextFor(field: FieldDefinition): ProposalContext {
  return {
    projectId: PROJECT,
    field,
    document: (id) => (id === schedule.id ? schedule : undefined),
    textAt: (documentId, contentHash, locator) => {
      if (documentId !== schedule.id || contentHash !== schedule.contentHash) return undefined;
      if (locator.page === 1) return { text: PAGE, layer: 'text' };
      if (locator.sheet === 'Arii' && locator.cell === undefined) return { text: SHEET, layer: 'text' };
      return undefined;
    },
    readQuantities,
    candidateId: 'test-cand-g1-18',
    createdBy: 'test-verifier',
    createdAt: '2026-09-30T10:00:00.000Z',
  };
}

function proposal(field: FieldDefinition, value: number, qualifier: string, locator: EvidenceLocator, excerpt: string): CandidateProposal {
  return {
    subjectId: BUILDING,
    fieldKey: field.key,
    quantity: { value, unit: field.unit ?? 'count', qualifier },
    source: 'document',
    evidence: [{ documentId: schedule.id, contentHash: schedule.contentHash, locator, excerpt }],
  };
}

function expectRejectedLoggedUnknown(field: FieldDefinition, cited: CandidateProposal): void {
  const verdict = verifyProposal(cited, contextFor(field));
  const stored: Candidate[] = verdict.outcome === 'accepted' ? [verdict.candidate] : [];
  expect(verdict.outcome).toBe('rejected');
  if (verdict.outcome !== 'rejected') return;
  expect(verdict.rejection).toEqual({ kind: 'evidence_check_failed', check: 'excerpt_at_locator', evidenceIndex: 0 });
  expect(verdict.guardrailEvents.map((event) => event.type)).toEqual(['evidence_not_found']);
  expect(derive(field, stored, NO_EVENTS, testContext({ subjectId: BUILDING, documents: [schedule] })).state).toBe('unknown');
}

test('F-EXTRACT-04 · G1-18: a fragment of a longer number, or text joined across two cells of a sheet, is not the cited excerpt: rejected and logged, field unknown', () => {
  expectRejectedLoggedUnknown(area, proposal(area, 2345, 'gross_total', { page: 1 }, '2.345 mp'));
  expectRejectedLoggedUnknown(floors, proposal(floors, 5, 'upper', { page: 1 }, '5'));
  expectRejectedLoggedUnknown(area, proposal(area, 999, 'gross_total', { sheet: 'Arii' }, 'Suprafata construita desfasurata: 999 mp'));

  // Property: every excerpt that starts inside the number "12.345" of the page, up to the end of its unit.
  const start = PAGE.indexOf('12.345');
  fc.assert(
    fc.property(fc.integer({ min: start + 1, max: start + 5 }), (from) => {
      const excerpt = PAGE.slice(from, start + '12.345 mp'.length);
      expectRejectedLoggedUnknown(area, proposal(area, 12345, 'gross_total', { page: 1 }, excerpt));
    }),
  );
});

test('G1-18 control: the whole token at the same place is accepted as document', () => {
  const verdict = verifyProposal(proposal(area, 12345, 'gross_total', { page: 1 }, 'Suprafata construita desfasurata: 12.345 mp'), contextFor(area));
  expect(verdict).toMatchObject({ outcome: 'accepted', candidate: { source: 'document', quantity: { value: 12345, qualifier: 'gross_total' } } });
});
