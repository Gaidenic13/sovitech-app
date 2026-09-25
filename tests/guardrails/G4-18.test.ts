// @pending-until: phase 1 derive
/**
 * G4-18 (docs/guardrails.md section 7; rule 4 "Routing").
 * Situation: a document disagrees with an engineer_verified area.
 * Expected: the conflict goes to the engineer queue. The owner is not asked.
 *
 * The engineer's event is built in memory for this derive test only; nothing here
 * writes it anywhere (rule 10; prompt 3 section 14 item 3).
 */
import fc from 'fast-check';
import { expect } from 'vitest';
import {
  derive,
  type Candidate,
  type CandidateEvent,
  type DeriveContext,
  type DeriveEvents,
  type DocumentRecord,
  type FieldDefinition,
} from '@sovitech/domain';
import { pendingCase } from './_support/pending';

const pending = pendingCase(import.meta.url);

const PROJECT = 'test-project-g4-18';
const BUILDING = 'test-building-g4-18';

const areaField = (confirmBy: FieldDefinition['confirmBy']): FieldDefinition => ({
  key: 'test.building.gross_floor_area',
  label: 'TEST gross floor area',
  subject: 'building',
  kind: 'quantity',
  unit: 'm2',
  qualifierRequired: true,
  estimation: 'forbidden',
  criticality: 'optional',
  affects: [],
  impactRank: 1,
  confirmBy,
});

const documents: readonly DocumentRecord[] = ['survey', 'tender'].map((name) => ({
  id: `test-doc-g4-18-${name}`,
  projectId: PROJECT,
  contentHash: `sha256:test-g4-18-${name}`,
  kind: 'architectural',
  stage: name === 'survey' ? 'site_survey' : 'tender',
  analysis: { status: 'analysed', coverage: 'TEST full coverage' },
}));

const context: DeriveContext = {
  document: (id) => documents.find((document) => document.id === id),
  inputState: () => undefined,
  datasetApproved: () => false,
};

function areaReading(id: string, documentIndex: number, value: number, minute: number): Candidate {
  const document = documents[documentIndex];
  if (!document) throw new Error('fixture has two documents');
  return {
    id,
    subjectId: BUILDING,
    fieldKey: 'test.building.gross_floor_area',
    quantity: { value, unit: 'm2', qualifier: 'gross_total' },
    source: 'document',
    evidence: [
      {
        documentId: document.id,
        contentHash: document.contentHash,
        locator: { page: 1 },
        excerpt: `Scd = ${value} mp`,
        check: 'text_match',
      },
    ],
    createdBy: 'test-extractor',
    createdAt: new Date(Date.UTC(2026, 8, 25, 9, minute)).toISOString(),
  };
}

type Arrival = 'engineer-checked-first' | 'disagreeing-first';

function scenario(checkedValue: number, disagreeingValue: number, arrival: Arrival) {
  const [checkedMinute, disagreeingMinute] = arrival === 'engineer-checked-first' ? [0, 30] : [30, 0];
  const checked = areaReading('test-cand-g4-18-engineer-checked', 0, checkedValue, checkedMinute);
  const disagreeing = areaReading('test-cand-g4-18-disagreeing', 1, disagreeingValue, disagreeingMinute);
  const verification: CandidateEvent = {
    candidateId: checked.id,
    type: 'engineer_verified',
    by: 'test-engineer',
    role: 'sovitech_engineer',
    at: '2026-09-25T11:00:00.000Z',
  };
  const events: DeriveEvents = { candidate: [verification], field: [], document: [] };
  return { candidates: [checked, disagreeing], events };
}

function expectEngineerQueueOwnerNotAsked(
  confirmBy: FieldDefinition['confirmBy'],
  checkedValue: number,
  disagreeingValue: number,
  arrival: Arrival,
): void {
  const { candidates, events } = scenario(checkedValue, disagreeingValue, arrival);
  const state = derive(areaField(confirmBy), candidates, events, context);
  expect(state.state).toBe('conflict');
  // The conflict goes to the engineer queue.
  expect(state.conflict?.routedTo).toBe('engineer');
  // The owner is not asked.
  expect(state.review?.list).not.toBe('for_you');
}

pending('F-VALUE-04 · G4-18: a document disagrees with an engineer_verified area: engineer queue, owner not asked', () => {
  expectEngineerQueueOwnerNotAsked('owner', 2000, 2400, 'engineer-checked-first');

  // Property: whatever the field's confirmBy and whichever candidate arrived first.
  fc.assert(
    fc.property(
      fc.constantFrom<FieldDefinition['confirmBy']>('owner', 'either', 'engineer'),
      fc.integer({ min: 1000, max: 1_000_000 }),
      fc.integer({ min: 2, max: 50 }),
      fc.constantFrom<Arrival>('engineer-checked-first', 'disagreeing-first'),
      (confirmBy, checkedValue, percentOff, arrival) => {
        // No tolerance on the field, so any difference disagrees; the step keeps it visible.
        const disagreeingValue = checkedValue + Math.ceil((checkedValue * percentOff) / 100);
        expectEngineerQueueOwnerNotAsked(confirmBy, checkedValue, disagreeingValue, arrival);
      },
    ),
  );
});
