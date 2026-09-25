/**
 * G1-15 (docs/guardrails.md section 7; rule 1, "Zero is a value. 'None found' is not zero. A
 * count of 0 needs a document, the owner or an engineer saying so"; 2.1, `calculated` is "a
 * deterministic formula over this project's values"). Phase 1 review, adversarial finding 15.
 * Situation: a `calculated` count of 0 whose method names no input candidate.
 * Expected: refused; the field stays unknown, never 0.
 *
 * A calculation that read nothing (for example a count over an empty register) is not a
 * formula over this project's values, so its 0 is "none found", which derive never turns into
 * a value. The same formula over a named input stands (the control, with a TEST count of 3;
 * whether a calculated 0 over a register that is complete may stand is not this case's
 * question).
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { derive, type Candidate, type FieldState } from '@sovitech/domain';
import { testContext, testEvents, testField, testTime } from './_support/builders';

const BUILDING = 'test-building-g1-15';

const ahuCount = testField('test.building.ahu_count', {
  kind: 'count',
  subject: 'building',
  unit: 'count',
  qualifierRequired: true,
  qualifiers: ['ahu'],
  confirmBy: 'engineer',
});

function counted(value: number, inputCandidateIds: readonly string[]): Candidate {
  return {
    id: 'test-cand-g1-15-count',
    subjectId: BUILDING,
    fieldKey: ahuCount.key,
    quantity: { value, unit: 'count', qualifier: 'ahu' },
    source: 'calculated',
    evidence: [],
    method: { formulaId: 'TEST-asset-count', formulaVersion: '1.0.0', inputCandidateIds, unknownPolicy: 'refuse', assumptions: [] },
    createdBy: 'test-engine',
    createdAt: testTime(0),
  };
}

/** The derived state of the one TEST input the control reads: known, not provisional. */
function knownInput(id: string): FieldState {
  return {
    subjectId: 'test-register-g1-15',
    fieldKey: 'test.register.entries',
    state: 'known',
    activeCandidateId: id,
    candidates: [{ candidateId: id, verification: 'user_confirmed', status: 'eligible', refusal: null }],
    facts: [{ qualifier: null, state: 'known', candidateIds: [id], setAsideIds: [], activeCandidateId: id, ambiguous: false, conflict: null, provisional: false, stale: false }],
    conflicts: [],
    conflict: null,
    readingsToConfirm: [],
    provisional: false,
    stale: false,
    statusLines: [],
    review: null,
    notApplicable: null,
    refusedEvents: [],
  };
}

test('F-VALUE-02 · G1-15: a calculated count of 0 that read no input is refused, and the field stays unknown', () => {
  const zero = counted(0, []);
  const state = derive(ahuCount, [zero], testEvents({}), testContext({ subjectId: BUILDING }));
  expect(state.state).toBe('unknown');
  expect(state.activeCandidateId).toBeNull();
  expect(state.candidates).toEqual([{ candidateId: zero.id, verification: 'unverified', status: 'refused', refusal: 'no_inputs' }]);

  // Property: no count a calculation made from nothing is a value, 0 or any other.
  fc.assert(
    fc.property(fc.nat({ max: 500 }), (value) => {
      expect(derive(ahuCount, [counted(value, [])], testEvents({}), testContext({ subjectId: BUILDING })).state).toBe('unknown');
    }),
  );
});

test('F-VALUE-02 · G1-15 control: the same formula over a named input of this project stands', () => {
  const input = 'test-cand-g1-15-register';
  const states = new Map([[input, knownInput(input)]]);
  const state = derive(ahuCount, [counted(3, [input])], testEvents({}), testContext({ subjectId: BUILDING, inputStates: states }));
  expect(state.state).toBe('known');
  expect(state.activeCandidateId).toBe('test-cand-g1-15-count');
});
