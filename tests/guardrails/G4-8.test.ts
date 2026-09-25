/**
 * G4-8 (docs/guardrails.md section 7; rule 4 "Routing").
 * Situation: two documents disagree on a chiller capacity.
 * Expected: goes to the engineer queue. The owner is not asked.
 *
 * A chiller's capacity is an equipment rating, an engineer field (rule 3: "An
 * engineer verifies technical facts: equipment types and ratings"), held as a
 * TEST registry entry with `confirmBy: 'engineer'` and no tolerance.
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { derive, type DocumentStage } from '@sovitech/domain';
import { documentReading, testContext, testDocument, testEvents, testField } from './_support/builders';

const PROJECT = 'test-project-g4-8';
const CHILLER = 'test-asset-g4-8-chiller';

const capacityField = testField('test.asset.cooling_capacity', {
  kind: 'quantity',
  subject: 'asset',
  unit: 'kW',
  qualifierRequired: true,
  qualifiers: ['cooling_output'],
  confirmBy: 'engineer',
});

function expectEngineerQueueOwnerNotAsked(
  firstStage: DocumentStage,
  secondStage: DocumentStage,
  firstValue: number,
  secondValue: number,
): void {
  const datasheet = testDocument('test-doc-g4-8-datasheet', PROJECT, firstStage, { kind: 'mep' });
  const schedule = testDocument('test-doc-g4-8-schedule', PROJECT, secondStage, { kind: 'mep' });
  const readings = [
    documentReading({
      id: 'test-cand-g4-8-datasheet',
      subjectId: CHILLER,
      field: capacityField,
      document: datasheet,
      value: { quantity: { value: firstValue, unit: 'kW', qualifier: 'cooling_output' } },
      minute: 0,
    }),
    documentReading({
      id: 'test-cand-g4-8-schedule',
      subjectId: CHILLER,
      field: capacityField,
      document: schedule,
      value: { quantity: { value: secondValue, unit: 'kW', qualifier: 'cooling_output' } },
      minute: 30,
    }),
  ];

  const state = derive(capacityField, readings, testEvents({}), testContext({ subjectId: CHILLER, documents: [datasheet, schedule] }));

  // Goes to the engineer queue.
  expect(state.state).toBe('conflict');
  expect(state.conflict?.routedTo).toBe('engineer');
  // The owner is not asked.
  expect(state.review?.list).toBe('sovitech_will_check');
}

test('F-VALUE-04 · G4-8: two documents disagree on a chiller capacity: engineer queue, the owner not asked', () => {
  expectEngineerQueueOwnerNotAsked('technical_design', 'tender', 640, 700);

  // Property: any two different capacities, from documents of any stages.
  const stages: DocumentStage[] = ['feasibility', 'permit', 'technical_design', 'tender', 'execution', 'shop_drawing', 'as_built', 'unknown'];
  fc.assert(
    fc.property(
      fc.constantFrom(...stages),
      fc.constantFrom(...stages),
      fc.integer({ min: 1, max: 10_000 }),
      fc.integer({ min: 1, max: 10_000 }),
      (firstStage, secondStage, firstValue, secondValue) => {
        fc.pre(firstValue !== secondValue);
        expectEngineerQueueOwnerNotAsked(firstStage, secondStage, firstValue, secondValue);
      },
    ),
  );
});
