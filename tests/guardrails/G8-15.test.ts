/**
 * G8-15 (docs/guardrails.md section 7; 2.6, `kind: 'count'`; 2.5, "Counting"; rule 8, "Counts state what
 * they count"). Phase 1 review, round 3, adversarial finding X4.
 * Situation: a count of 2.5 or of -3 guest rooms, or a count one of whose readings is not a whole number.
 * Expected: refused; the field stays unknown.
 *
 * A shape, never a plausibility range: no value is judged too high or too low. The control: 0 and a
 * whole count stand (rule 1, "Zero is a value").
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { derive, type Candidate } from '@sovitech/domain';
import { ownerAnswer, testContext, testEvents, testField } from './_support/builders';

const BUILDING = 'test-building-g8-15';
const rooms = testField('test.building.rooms', { kind: 'count', subject: 'building', unit: 'count', qualifiers: ['guest_rooms'], confirmBy: 'engineer' });
const context = testContext({ subjectId: BUILDING });

function count(value: number, alternative?: number): Candidate {
  const answer = ownerAnswer({ id: 'test-cand-g8-15', subjectId: BUILDING, field: rooms, value: { quantity: { value, unit: 'count', qualifier: 'guest_rooms' } }, minute: 0 });
  return alternative === undefined ? answer : { ...answer, alternatives: [{ value: alternative, unit: 'count' }] };
}

test('F-VALUE-02 · G8-15: a count of 2.5 or -3 guest rooms, or with a reading that is not whole, is refused', () => {
  for (const candidate of [count(2.5), count(-3), count(3, 3.5)]) {
    const state = derive(rooms, [candidate], testEvents({}), context);
    expect(state.state).toBe('unknown');
    expect(state.candidates).toEqual([{ candidateId: candidate.id, verification: 'unverified', status: 'refused', refusal: 'value_shape' }]);
  }

  // Property: any negative or fractional count.
  fc.assert(
    fc.property(fc.oneof(fc.integer({ min: -9099, max: -1 }), fc.double({ min: 0.001, max: 9099, noInteger: true, noNaN: true })), (value) => {
      expect(derive(rooms, [count(value)], testEvents({}), context).state).toBe('unknown');
    }),
  );
});

test('F-VALUE-02 · G8-15 control: 0 and a whole count stand', () => {
  for (const value of [0, 9001]) {
    expect(derive(rooms, [count(value)], testEvents({}), context).activeCandidateId).toBe('test-cand-g8-15');
  }
});
