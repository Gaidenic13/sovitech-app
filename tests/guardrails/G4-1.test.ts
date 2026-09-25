/**
 * G4-1 (docs/guardrails.md section 7; rule 4; 2.4).
 * Situation: the owner entered 28 floors, and a document analysed later says 30.
 * Expected: both are kept. The field is in conflict, and it appears on the review step.
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { unitByCode } from '@sovitech/registry';
import {
  NO_EVENTS,
  derive,
  type Candidate,
  type CandidateEvent,
  type DeriveContext,
  type DeriveEvents,
  type DocumentRecord,
  type FieldDefinition,
} from '@sovitech/domain';

const BUILDING = 'test-building-g4-1';

const floorsField = (confirmBy: FieldDefinition['confirmBy']): FieldDefinition => ({
  key: 'test.building.upper_floors',
  label: 'TEST upper floors',
  subject: 'building',
  kind: 'count',
  unit: 'count',
  qualifierRequired: true,
  qualifiers: ['upper_floors'],
  estimation: 'forbidden',
  criticality: 'optional',
  affects: [],
  impactRank: 1,
  confirmBy,
});

const memoriu: DocumentRecord = {
  id: 'test-doc-g4-1-memoriu',
  projectId: 'test-project-g4-1',
  contentHash: 'sha256:test-g4-1-memoriu',
  kind: 'architectural',
  stage: 'technical_design',
  analysis: { status: 'analysed', coverage: 'TEST full coverage' },
};

function ownerEntry(field: FieldDefinition, value: number): Candidate {
  return {
    id: 'test-cand-g4-1-owner',
    subjectId: BUILDING,
    fieldKey: field.key,
    quantity: { value, unit: 'count', qualifier: 'upper_floors' },
    source: 'user',
    evidence: [],
    createdBy: 'test-owner',
    createdAt: '2026-09-25T09:00:00.000Z',
  };
}

function documentReading(field: FieldDefinition, value: number): Candidate {
  const excerpt = `Etaje supraterane: ${value}`;
  return {
    id: 'test-cand-g4-1-document',
    subjectId: BUILDING,
    fieldKey: field.key,
    quantity: { value, unit: 'count', qualifier: 'upper_floors' },
    source: 'document',
    evidence: [
      { documentId: memoriu.id, contentHash: memoriu.contentHash, locator: { page: 2 }, excerpt, check: 'text_match' },
    ],
    original: { text: `${value}`, locale: 'ro-RO' },
    createdBy: 'test-extractor',
    createdAt: '2026-09-25T10:00:00.000Z',
  };
}

/** The owner's own entry on an owner or either field gets user_confirmed when it is created (2.1). */
function ownerEvents(field: FieldDefinition, owner: Candidate): DeriveEvents {
  const confirmation: CandidateEvent = {
    candidateId: owner.id,
    type: 'user_confirmed',
    by: 'test-owner',
    role: 'owner',
    at: owner.createdAt,
  };
  return field.confirmBy === 'engineer' ? NO_EVENTS : { ...NO_EVENTS, candidate: [confirmation] };
}

const context: DeriveContext = {
  subjectId: BUILDING,
  document: (id) => (id === memoriu.id ? memoriu : undefined),
  unit: unitByCode,
  inputState: () => undefined,
  datasetApproved: () => false,
};

/** Inputs are frozen, so any change derive makes to them throws. */
function frozen<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const inner of Object.values(value)) frozen(inner);
    Object.freeze(value);
  }
  return value;
}

function expectBothKeptInConflictOnReview(field: FieldDefinition, ownerValue: number, documentValue: number): void {
  const owner = ownerEntry(field, ownerValue);
  const reading = documentReading(field, documentValue);
  const candidates = frozen([owner, reading]);
  const events = frozen(ownerEvents(field, owner));

  const state = derive(field, candidates, events, context);

  // Both are kept.
  expect(candidates).toEqual([ownerEntry(field, ownerValue), documentReading(field, documentValue)]);
  expect(state.candidates.map((c) => [c.candidateId, c.status])).toEqual(
    expect.arrayContaining([
      [owner.id, 'eligible'],
      [reading.id, 'eligible'],
    ]),
  );
  // The field is in conflict.
  expect(state.state).toBe('conflict');
  expect([...(state.conflict?.candidateIds ?? [])].sort()).toEqual([owner.id, reading.id].sort());
  // It appears on the review step.
  expect(state.review?.reason).toBe('conflict');
}

test('F-VALUE-02 · F-VALUE-03 · G4-1: owner 28 floors, document later 30: both kept, conflict, on the review step', () => {
  expectBothKeptInConflictOnReview(floorsField('owner'), 28, 30);

  // Property: any two different floor counts, whoever confirms the field.
  fc.assert(
    fc.property(
      fc.nat({ max: 200 }),
      fc.nat({ max: 200 }),
      fc.constantFrom<FieldDefinition['confirmBy']>('owner', 'either', 'engineer'),
      (ownerValue, documentValue, confirmBy) => {
        fc.pre(ownerValue !== documentValue);
        expectBothKeptInConflictOnReview(floorsField(confirmBy), ownerValue, documentValue);
      },
    ),
  );
});
