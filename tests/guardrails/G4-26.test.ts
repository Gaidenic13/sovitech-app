/**
 * G4-26 (docs/guardrails.md section 7; rule 4, "An unknown qualifier is still compared", "If it
 * matches none, the field is in conflict" and "An unqualified value is never left
 * unreconciled"). Phase 1 review, adversarial finding 14.
 * Situation: an unqualified 1.5 MW cooling capacity next to a qualified 1,200 kW cooling output.
 * Expected: conflict: the unqualified value matches no reading.
 *
 * The two values are in different units of one dimension (power). The unqualified one is not
 * set apart as a fact of its own because no qualified reading shares its unit; it matches none
 * of the readings, so the field is in conflict. The control: a qualified reading in the same
 * unit that matches it exactly is the one reading it matches, a reading to confirm, not a conflict.
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { derive } from '@sovitech/domain';
import { documentReading, ownerAnswer, testContext, testDocument, testEvents, testField } from './_support/builders';

const PROJECT = 'test-project-g4-26';
const CHILLER = 'test-asset-g4-26-chiller';

const capacity = testField('test.asset.cooling_capacity', {
  kind: 'quantity',
  subject: 'asset',
  unit: 'kW',
  qualifierRequired: true,
  qualifiers: ['cooling_output'],
  confirmBy: 'engineer',
});

const datasheet = testDocument('test-doc-g4-26-datasheet', PROJECT, 'technical_design', { kind: 'mep' });
const context = testContext({ subjectId: CHILLER, documents: [datasheet] });

function qualifiedKw(value: number) {
  return documentReading({
    id: 'test-cand-g4-26-kw',
    subjectId: CHILLER,
    field: capacity,
    document: datasheet,
    value: { quantity: { value, unit: 'kW', qualifier: 'cooling_output' } },
    minute: 0,
  });
}

function unqualified(value: number, unit: 'MW' | 'kW') {
  return ownerAnswer({ id: `test-cand-g4-26-${unit}`, subjectId: CHILLER, field: capacity, value: { quantity: { value, unit } }, minute: 5 });
}

test('F-VALUE-03 · G4-26: an unqualified 1.5 MW next to a qualified 1,200 kW cooling output matches no reading: conflict', () => {
  const kw = qualifiedKw(1200);
  const mw = unqualified(1.5, 'MW');
  const state = derive(capacity, [kw, mw], testEvents({}), context);
  expect(state.state).toBe('conflict');
  expect(state.activeCandidateId).toBeNull();
  expect(state.conflict).toMatchObject({ kind: 'unqualified_matches_none', candidateIds: [kw.id, mw.id].sort() });

  // Property: an unqualified value in MW beside any qualified reading in kW is never left as a fact of its own.
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 9_999 }), fc.integer({ min: 1, max: 99 }), (kilowatts, megawatts) => {
      const derived = derive(capacity, [qualifiedKw(kilowatts), unqualified(megawatts, 'MW')], testEvents({}), context);
      expect(derived.state).toBe('conflict');
      expect(derived.conflicts.map((conflict) => conflict.kind)).toContain('unqualified_matches_none');
    }),
  );
});

test('F-VALUE-03 · G4-26 control: an unqualified value that matches exactly one reading of its unit is a reading to confirm, not a conflict', () => {
  const state = derive(capacity, [qualifiedKw(1200), unqualified(1200, 'kW')], testEvents({}), context);
  expect(state.state).toBe('known');
  expect(state.conflicts).toEqual([]);
  expect(state.readingsToConfirm).toHaveLength(1);
});
