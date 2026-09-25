/**
 * G4-27 (docs/guardrails.md section 7; rule 4, "A conflict is put to someone only when values
 * arrive without that person having seen both" and "Each new candidate is compared with every
 * eligible candidate"). Phase 1 review, adversarial finding 5.
 * Situation: the owner resolves a conflict between two document values; a third, disagreeing
 * value written before the resolution was not among the candidates it covered.
 * Expected: the conflict reopens.
 *
 * A resolution names the candidates it covered (the ones shown to the person who
 * resolved it); a time window never decides what was covered, so a value written a moment
 * before the resolution, which the person never saw, is compared again. The control: once the
 * resolution names it too, the conflict stays closed.
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { derive, type FieldEvent } from '@sovitech/domain';
import { documentReading, testContext, testDocument, testEvents, testField, testTime } from './_support/builders';

const PROJECT = 'test-project-g4-27';
const BUILDING = 'test-building-g4-27';

/** A TEST owner field (confirmBy owner), so the owner is the right person to resolve it. */
const guestRooms = testField('test.building.guest_rooms_stated', {
  kind: 'count',
  subject: 'building',
  unit: 'count',
  qualifierRequired: true,
  qualifiers: ['guest_rooms'],
  confirmBy: 'owner',
});

const schedule = testDocument('test-doc-g4-27-schedule', PROJECT, 'technical_design');
const memoriu = testDocument('test-doc-g4-27-memoriu', PROJECT, 'technical_design');
const context = testContext({ subjectId: BUILDING, documents: [schedule, memoriu] });

const reading = (id: string, document: typeof schedule, value: number, minute: number) =>
  documentReading({ id, subjectId: BUILDING, field: guestRooms, document, value: { quantity: { value, unit: 'count', qualifier: 'guest_rooms' } }, minute });

const first = reading('test-cand-g4-27-first', schedule, 12, 0);
const second = reading('test-cand-g4-27-second', memoriu, 14, 1);

function resolution(minute: number, covered: readonly string[]): FieldEvent {
  return {
    subjectId: BUILDING,
    fieldKey: guestRooms.key,
    type: 'conflict_resolved',
    by: 'test-owner',
    role: 'owner',
    at: testTime(minute),
    reason: 'TEST: the owner knows the room count',
    chosenCandidateId: second.id,
    coveredCandidateIds: covered,
  };
}

test('F-VALUE-04 · G4-27: a disagreeing value written before the resolution but not covered by it reopens the conflict', () => {
  const unseen = reading('test-cand-g4-27-unseen', schedule, 20, 4);
  const state = derive(guestRooms, [first, second, unseen], testEvents({ field: [resolution(5, [first.id, second.id])] }), context);
  expect(state.state).toBe('conflict');
  expect(state.activeCandidateId).toBeNull();
  expect(state.conflict?.candidateIds).toEqual([second.id, unseen.id].sort());

  // Property: however long before (or after) the resolution the unseen value was written.
  fc.assert(
    fc.property(fc.integer({ min: 2, max: 59 }), fc.integer({ min: 15, max: 99 }), (written, value) => {
      const late = reading('test-cand-g4-27-unseen', schedule, value, written);
      const derived = derive(guestRooms, [first, second, late], testEvents({ field: [resolution(30, [first.id, second.id])] }), context);
      expect(derived.state).toBe('conflict');
    }),
  );
});

test('F-VALUE-04 · G4-27 control: the two values it covered stay resolved, and a value it names is covered', () => {
  expect(derive(guestRooms, [first, second], testEvents({ field: [resolution(5, [first.id, second.id])] }), context)).toMatchObject({
    state: 'known',
    activeCandidateId: second.id,
  });
  const seen = reading('test-cand-g4-27-seen', schedule, 20, 4);
  expect(derive(guestRooms, [first, second, seen], testEvents({ field: [resolution(5, [first.id, second.id, seen.id])] }), context).state).toBe(
    'known',
  );
});
