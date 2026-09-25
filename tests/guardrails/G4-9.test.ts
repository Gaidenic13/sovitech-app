// @pending-until: phase 1 derive
/**
 * G4-9 (docs/guardrails.md section 7; rule 4 "Conflict test", counts).
 * Situation: 424 rooms against 427 rooms, both guest rooms.
 * Expected: conflict, because counts have zero tolerance.
 */
import fc from 'fast-check';
import { expect } from 'vitest';
import {
  NO_EVENTS,
  derive,
  type Candidate,
  type DeriveContext,
  type DocumentRecord,
  type FieldDefinition,
} from '@sovitech/domain';
import { pendingCase } from './_support/pending';

const pending = pendingCase(import.meta.url);

const BUILDING = 'test-building-g4-9';

/** A count field with no tolerance: the registry states no reason for one. */
const roomsField: FieldDefinition = {
  key: 'test.building.guest_rooms',
  label: 'TEST guest rooms',
  subject: 'building',
  kind: 'count',
  unit: 'count',
  qualifierRequired: true,
  estimation: 'forbidden',
  criticality: 'optional',
  affects: [],
  impactRank: 1,
  confirmBy: 'owner',
};

const schedules: readonly DocumentRecord[] = ['a', 'b'].map((suffix) => ({
  id: `test-doc-g4-9-${suffix}`,
  projectId: 'test-project-g4-9',
  contentHash: `sha256:test-g4-9-${suffix}`,
  kind: 'architectural',
  stage: 'technical_design',
  analysis: { status: 'analysed', coverage: 'TEST full coverage' },
}));

function roomCounts(first: number, second: number): Candidate[] {
  return [first, second].map((value, index) => {
    const schedule = schedules[index] ?? schedules[0];
    if (!schedule) throw new Error('fixture has two schedules');
    return {
      id: `test-cand-g4-9-${index}`,
      subjectId: BUILDING,
      fieldKey: roomsField.key,
      quantity: { value, unit: 'count', qualifier: 'guest_rooms' },
      source: 'document',
      evidence: [
        {
          documentId: schedule.id,
          contentHash: schedule.contentHash,
          locator: { sheet: 'Camere', cell: 'B2' },
          excerpt: `${value}`,
          check: 'text_match',
        },
      ],
      createdBy: 'test-extractor',
      createdAt: `2026-09-25T0${index + 1}:00:00.000Z`,
    };
  });
}

const context: DeriveContext = {
  document: (id) => schedules.find((schedule) => schedule.id === id),
  inputState: () => undefined,
  datasetApproved: () => false,
};

pending('F-VALUE-03 · G4-9: 424 against 427 guest rooms: conflict, because counts have zero tolerance', () => {
  expect(derive(roomsField, roomCounts(424, 427), NO_EVENTS, context).state).toBe('conflict');

  // Property: with zero tolerance, two guest-room counts conflict exactly when they differ.
  fc.assert(
    fc.property(fc.nat({ max: 5000 }), fc.nat({ max: 5000 }), (first, second) => {
      const state = derive(roomsField, roomCounts(first, second), NO_EVENTS, context);
      expect(state.state).toBe(first === second ? 'known' : 'conflict');
    }),
  );
});
