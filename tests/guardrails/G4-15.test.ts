/**
 * G4-15 (docs/guardrails.md section 7; 2.3 "Deleting a document"; 2.8 status lines).
 * Situation: the only source document of a field is deleted.
 * Expected: the field is unknown and listed as "Source document removed".
 *
 * The deletion appends a `withdrawn` document event and, for each candidate whose
 * evidence comes only from that document, a `withdrawn` candidate event by the
 * system with the reason `document_deleted` (2.3). The listed line is the 2.8
 * text, read from the status-line registry by the key derive returns.
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { STATUS_LINE_IDS, statusLineById, unitByCode, type StatusLineId } from '@sovitech/registry';
import {
  FIELD_STATUS_LINES,
  derive,
  type Candidate,
  type CandidateEvent,
  type DeriveContext,
  type DeriveEvents,
  type DocumentEvent,
  type DocumentRecord,
  type FieldDefinition,
} from '@sovitech/domain';

const BUILDING = 'test-building-g4-15';

const areaField = (confirmBy: FieldDefinition['confirmBy']): FieldDefinition => ({
  key: 'test.building.gross_floor_area',
  label: 'TEST gross floor area',
  subject: 'building',
  kind: 'quantity',
  unit: 'm2',
  qualifierRequired: true,
  qualifiers: ['gross_total'],
  estimation: 'forbidden',
  criticality: 'optional',
  affects: [],
  impactRank: 1,
  confirmBy,
});

const deleted: DocumentRecord = {
  id: 'test-doc-g4-15-schedule',
  projectId: 'test-project-g4-15',
  contentHash: 'sha256:test-g4-15-schedule',
  kind: 'architectural',
  stage: 'technical_design',
  analysis: { status: 'analysed', coverage: 'TEST full coverage' },
};

const context: DeriveContext = {
  subjectId: BUILDING,
  document: (id) => (id === deleted.id ? deleted : undefined),
  unit: unitByCode,
  inputState: () => undefined,
  datasetApproved: () => false,
};

/** Readings of the field, each citing only the deleted document. */
function readingsFromDeletedDocument(field: FieldDefinition, values: readonly number[]): Candidate[] {
  return values.map((value, index) => ({
    id: `test-cand-g4-15-${index}`,
    subjectId: BUILDING,
    fieldKey: field.key,
    quantity: { value, unit: 'm2', qualifier: 'gross_total' },
    source: 'document',
    evidence: [
      {
        documentId: deleted.id,
        contentHash: deleted.contentHash,
        locator: { page: index + 1 },
        excerpt: `Scd = ${value} mp`,
        check: 'text_match',
      },
    ],
    createdBy: 'test-extractor',
    createdAt: new Date(Date.UTC(2026, 8, 25, 9, index)).toISOString(),
  }));
}

function deletionEvents(candidates: readonly Candidate[]): DeriveEvents {
  const at = '2026-09-25T12:00:00.000Z';
  const documentEvent: DocumentEvent = {
    documentId: deleted.id,
    type: 'withdrawn',
    by: 'test-owner',
    role: 'owner',
    at,
    reason: 'TEST deletion by the owner',
  };
  const withdrawals = candidates.map(
    (candidate): CandidateEvent => ({
      candidateId: candidate.id,
      type: 'withdrawn',
      by: 'test-deletion-job',
      role: 'system',
      at,
      reason: 'document_deleted',
    }),
  );
  return { candidate: withdrawals, field: [], document: [documentEvent] };
}

function expectUnknownAndListed(field: FieldDefinition, values: readonly number[]): void {
  const candidates = readingsFromDeletedDocument(field, values);
  const state = derive(field, candidates, deletionEvents(candidates), context);
  expect(state.state).toBe('unknown');
  expect(state.statusLines).toEqual(['source_document_removed']);
  expect(state.statusLines.map((key) => statusLineById(key).text)).toEqual(['Source document removed']);
  expect(state.review).toEqual({ list: 'for_you', reason: 'source_document_removed' });
  // The deletion's own events all hold: nothing is refused.
  expect(state.refusedEvents).toEqual([]);
}

test('F-VALUE-02 · G4-15: the only source document is deleted: unknown, listed as "Source document removed"', () => {
  expectUnknownAndListed(areaField('owner'), [2345]);

  // Property: however many readings the document gave, and whoever confirms the field.
  fc.assert(
    fc.property(
      fc.array(fc.integer({ min: 1, max: 1_000_000 }), { minLength: 1, maxLength: 4 }),
      fc.constantFrom<FieldDefinition['confirmBy']>('owner', 'either', 'engineer'),
      (values, confirmBy) => {
        expectUnknownAndListed(areaField(confirmBy), values);
      },
    ),
  );
});

test('F-VALUE-02 · G4-15: every status line derive names is a 2.8 status line of the registry, "Source document removed" among them', () => {
  // At compile time: every key derive returns is a registry id.
  const keys: readonly StatusLineId[] = FIELD_STATUS_LINES;
  const registered: readonly string[] = STATUS_LINE_IDS;
  for (const key of keys) expect(registered).toContain(key);
  expect(statusLineById('source_document_removed')).toMatchObject({ text: 'Source document removed', kind: 'status_line', slots: [] });
});
