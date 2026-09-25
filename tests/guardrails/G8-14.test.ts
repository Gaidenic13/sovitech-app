/**
 * G8-14 (docs/guardrails.md section 7; rule 8, "Qualifiers that must be stated"; 2.6, "Every
 * field is declared once. The rules read their settings from here"; rule 4, "Each new candidate
 * is compared with every eligible candidate for the same subject, field, unit and qualifier").
 * Phase 1 review, adversarial finding 7.
 * Situation: area candidates of 1,000 m² `gross_total` and 1,200 m² `Gross_Total` on a field
 * that registers `gross_total`.
 * Expected: the candidate with the unregistered qualifier is refused; the field holds one fact.
 *
 * A misspelt basis is not another basis: were it read as one, the two areas would be two facts
 * that are never compared, and the field would read known with no conflict. The control: two
 * registered bases are two facts, as G8-11 says.
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { derive } from '@sovitech/domain';
import { ownerAnswer, testContext, testEvents, testField } from './_support/builders';

const BUILDING = 'test-building-g8-14';

const area = testField('test.building.area', {
  kind: 'quantity',
  subject: 'building',
  unit: 'm2',
  qualifierRequired: true,
  qualifiers: ['gross_total', 'usable'],
});

const answer = (id: string, value: number, qualifier: string) =>
  ownerAnswer({ id, subjectId: BUILDING, field: area, value: { quantity: { value, unit: 'm2', qualifier } }, minute: 0 });

const context = testContext({ subjectId: BUILDING });

test('F-VALUE-02 · G8-14: 1,000 m² gross_total and 1,200 m² Gross_Total: the unregistered qualifier is refused, one fact', () => {
  const registered = answer('test-cand-g8-14-registered', 1000, 'gross_total');
  const misspelt = answer('test-cand-g8-14-misspelt', 1200, 'Gross_Total');
  const state = derive(area, [registered, misspelt], testEvents({}), context);
  expect(state.facts).toHaveLength(1);
  expect(state.facts[0]).toMatchObject({ qualifier: 'gross_total', candidateIds: [registered.id] });
  expect(state.candidates.find((candidate) => candidate.candidateId === misspelt.id)).toMatchObject({ status: 'refused', refusal: 'qualifier_unregistered' });

  // Property: any qualifier the field does not register is refused, whatever its value.
  fc.assert(
    fc.property(fc.constantFrom('Gross_Total', 'gross total', 'grosstotal', 'scd', 'footprint', 'heated_usable'), fc.integer({ min: 1, max: 99_999 }), (qualifier, value) => {
      const derived = derive(area, [registered, answer('test-cand-g8-14-other', value, qualifier)], testEvents({}), context);
      expect(derived.facts).toHaveLength(1);
      expect(derived.candidates.find((candidate) => candidate.candidateId === 'test-cand-g8-14-other')).toMatchObject({ refusal: 'qualifier_unregistered' });
    }),
  );
});

test('F-VALUE-02 · G8-14 control: two registered bases are two facts, never compared', () => {
  const state = derive(area, [answer('test-cand-g8-14-gross', 1000, 'gross_total'), answer('test-cand-g8-14-usable', 1200, 'usable')], testEvents({}), context);
  expect(state.facts.map((fact) => fact.qualifier)).toEqual(['gross_total', 'usable']);
  expect(state.state).toBe('known');
});
