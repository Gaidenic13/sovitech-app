/**
 * G1-16 (docs/guardrails.md section 7; 2.1, `calculated`: "The calculation engine only"; 2.4,
 * "Formula versions are immutable"; prompt 3 5.4, no TEST formula outside the test runner). Phase 1
 * review, round 3, adversarial finding on formula lookups.
 * Situation: a `calculated` candidate whose formula id and version no declared formula names, or a
 * TEST formula read outside the test runner.
 * Expected: refused; the field stays unknown.
 *
 * The registry's lookup (`declaredFormulaLookup`) never declares a TEST formula; inside the test
 * runner the case builds its own. The control: the same candidate from a declared formula stands.
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { declaredFormulaLookup, derive, type Candidate, type FieldState } from '@sovitech/domain';
import { testContext, testEvents, testField, testTime } from './_support/builders';

const BUILDING = 'test-building-g1-16';
const ahuCount = testField('test.building.ahu_count', { kind: 'count', subject: 'building', unit: 'count', qualifiers: ['ahu'], confirmBy: 'engineer' });
const INPUT = 'test-cand-g1-16-register';

function counted(formulaId: string, formulaVersion: string): Candidate {
  return {
    id: 'test-cand-g1-16-count',
    subjectId: BUILDING,
    fieldKey: ahuCount.key,
    quantity: { value: 3, unit: 'count', qualifier: 'ahu' },
    source: 'calculated',
    evidence: [],
    method: { formulaId, formulaVersion, inputCandidateIds: [INPUT], unknownPolicy: 'refuse', assumptions: [] },
    createdBy: 'test-engine',
    createdAt: testTime(0),
  };
}

const knownInput: FieldState = {
  subjectId: 'test-register-g1-16',
  fieldKey: 'test.register.entries',
  state: 'known',
  activeCandidateId: INPUT,
  candidates: [{ candidateId: INPUT, verification: 'user_confirmed', status: 'eligible', refusal: null }],
  facts: [{ qualifier: null, state: 'known', candidateIds: [INPUT], setAsideIds: [], activeCandidateId: INPUT, ambiguous: false, conflict: null, provisional: false, stale: false }],
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

/** The app's lookup over a TEST stand-in for the registry's declared signatures. */
const declared = declaredFormulaLookup([
  { id: 'assetCount', version: '1' },
  { id: 'TEST-asset-count', version: '1.0.0' },
]);
const context = testContext({ subjectId: BUILDING, inputStates: new Map([[INPUT, knownInput]]), formulaDeclared: declared });

test('F-VALUE-02 · G1-16: a calculated candidate from an undeclared formula, or a TEST formula outside the test runner, is refused', () => {
  for (const [formulaId, version] of [['TEST-forged', '9.9.9'], ['assetCount', '2'], ['TEST-asset-count', '1.0.0']] as const) {
    const candidate = counted(formulaId, version);
    const state = derive(ahuCount, [candidate], testEvents({}), context);
    expect(state.state, formulaId).toBe('unknown');
    expect(state.candidates, formulaId).toEqual([{ candidateId: candidate.id, verification: 'unverified', status: 'refused', refusal: 'unknown_formula' }]);
  }

  // Property: any formula id or version the list does not declare.
  fc.assert(
    fc.property(fc.constantFrom('assetCount', 'TEST-asset-count', 'pointsEstimate', 'TEST-x'), fc.constantFrom('1', '1.0.0', '2'), (formulaId, version) => {
      fc.pre(!(formulaId === 'assetCount' && version === '1'));
      expect(derive(ahuCount, [counted(formulaId, version)], testEvents({}), context).state).toBe('unknown');
    }),
  );
});

test('F-VALUE-02 · G1-16 control: the same count from a declared formula stands', () => {
  const state = derive(ahuCount, [counted('assetCount', '1')], testEvents({}), context);
  expect(state.state).toBe('known');
  expect(state.activeCandidateId).toBe('test-cand-g1-16-count');
});
