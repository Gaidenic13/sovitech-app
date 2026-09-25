/**
 * G3-10 (docs/guardrails.md section 7; rule 3, "On an engineer field, the owner is not asked to
 * confirm. They may see 'Looks right' and 'Something's wrong' ... 'Something's wrong' sends a
 * note to the engineer queue"; rule 4, "A correction is a resolution": the shown candidate is
 * rejected when the owner gives their own value). Phase 1 review, adversarial finding 19.
 * Situation: on an engineer field, the owner rejects a document value without entering a value
 * of their own.
 * Expected: the value stays the field's value, and goes to the engineer queue.
 *
 * The owner's rejection alone is their note, not a correction: the value stays eligible and
 * active, and the field is listed under "SOVITECH will check". The controls: with the owner's
 * own later value for the same fact, the rejection is a correction (rule 4); on an owner field,
 * the owner's rejection holds.
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { derive, type CandidateEvent } from '@sovitech/domain';
import { documentReading, ownerAnswer, testContext, testDocument, testEvents, testField, testTime } from './_support/builders';

const PROJECT = 'test-project-g3-10';
const CHILLER = 'test-asset-g3-10-chiller';

const coolingCapacity = (confirmBy: 'engineer' | 'owner') =>
  testField('test.asset.cooling_capacity', {
    kind: 'quantity',
    subject: 'asset',
    unit: 'kW',
    qualifierRequired: true,
    qualifiers: ['cooling_output'],
    confirmBy,
  });

const datasheet = testDocument('test-doc-g3-10-datasheet', PROJECT, 'technical_design', { kind: 'mep' });
const context = testContext({ subjectId: CHILLER, documents: [datasheet] });

function shownValue(value: number) {
  return documentReading({
    id: 'test-cand-g3-10-shown',
    subjectId: CHILLER,
    field: coolingCapacity('engineer'),
    document: datasheet,
    value: { quantity: { value, unit: 'kW', qualifier: 'cooling_output' } },
    minute: 0,
  });
}

function ownersRejection(minute: number): CandidateEvent {
  return { candidateId: 'test-cand-g3-10-shown', type: 'rejected', by: 'test-owner', role: 'owner', at: testTime(minute) };
}

test('F-VALUE-05 · G3-10: the owner rejects an engineer-field value without a value of their own: the value stays, for the engineer', () => {
  const shown = shownValue(123);
  const rejection = ownersRejection(10);
  const state = derive(coolingCapacity('engineer'), [shown], testEvents({ candidate: [rejection] }), context);
  expect(state.state).toBe('known');
  expect(state.activeCandidateId).toBe(shown.id);
  expect(state.candidates[0]).toMatchObject({ candidateId: shown.id, status: 'eligible' });
  expect(state.review).toEqual({ list: 'sovitech_will_check', reason: 'owner_correction' });
  expect(state.refusedEvents).toEqual([{ kind: 'candidate', event: rejection, refusal: 'owner_rejection_without_value' }]);

  // Property: whatever the value and whenever the rejection arrives.
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 9_999 }), fc.integer({ min: 1, max: 50 }), (value, minute) => {
      const derived = derive(coolingCapacity('engineer'), [shownValue(value)], testEvents({ candidate: [ownersRejection(minute)] }), context);
      expect(derived.activeCandidateId).toBe('test-cand-g3-10-shown');
      expect(derived.review).toEqual({ list: 'sovitech_will_check', reason: 'owner_correction' });
    }),
  );
});

test('F-VALUE-05 · G3-10 controls: with the owner\'s own later value it is a correction; on an owner field the rejection holds', () => {
  const shown = shownValue(123);
  const own = ownerAnswer({
    id: 'test-cand-g3-10-own',
    subjectId: CHILLER,
    field: coolingCapacity('engineer'),
    value: { quantity: { value: 124, unit: 'kW', qualifier: 'cooling_output' } },
    minute: 10,
  });
  const corrected = derive(coolingCapacity('engineer'), [shown, own], testEvents({ candidate: [ownersRejection(10)] }), context);
  expect(corrected).toMatchObject({ state: 'known', activeCandidateId: own.id, review: { list: 'sovitech_will_check', reason: 'owner_correction' } });
  expect(corrected.candidates.find((candidate) => candidate.candidateId === shown.id)?.status).toBe('rejected');

  const onOwnerField = derive(coolingCapacity('owner'), [shown], testEvents({ candidate: [ownersRejection(10)] }), context);
  expect(onOwnerField.state).toBe('unknown');
  expect(onOwnerField.candidates[0]?.status).toBe('rejected');
});
