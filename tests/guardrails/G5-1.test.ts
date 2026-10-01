/**
 * G5-1 (docs/guardrails.md section 7; rule 5 "Confirm instead of asking"; section 4).
 * Situation: the area is found in a document with its basis stated.
 * Expected: no area question. It is shown with its badge and Edit.
 *
 * The question engine plans the area's registered question (asked inline at step 8 while the area
 * is missing) as `show`, the step 8 inline asks leave the area out, and rule 5's confirmation test
 * does not pass (the basis is stated, and the gross floor area is an engineer field). The one
 * resolver shows the value as written with its one 2.8 badge, the basis it measures, its source line
 * and the Edit action the screen passes.
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { productionRegistry } from '@sovitech/registry';
import { DisplayObjectSchema } from '@sovitech/view-model/browser';
import {
  editActionOf,
  inlineAsks,
  passesConfirmationTest,
  planQuestion,
  resolveField,
} from '@sovitech/view-model/server';
import { documentReading, testDocument } from './_support/builders';
import { intakeFieldOf, productionField, resolveInputOf, uuid } from './_support/view-model';

const PROJECT = uuid(1);
const BUILDING = uuid(2);
const areaField = productionField('building.grossFloorArea');
const areaQuestion = productionRegistry.questions.find((question) => question.id === 'q.building.grossFloorArea');
const schedule = { ...testDocument(uuid(10), PROJECT, 'unknown'), contentHash: `sha256:${'a'.repeat(64)}` };

function expectShownNotAsked(value: number, written: string, page: number): void {
  const found = {
    ...documentReading({ id: uuid(20), subjectId: BUILDING, field: areaField, document: schedule, value: { quantity: { value, unit: 'm2', qualifier: 'gross_total' } }, minute: 1, page }),
    original: { text: written, locale: 'ro' },
  };
  const field = intakeFieldOf(areaField, BUILDING, [found], undefined, [schedule]);
  expect(field.state.state).toBe('known');

  // No area question: neither the registered question nor step 8's inline ask.
  if (areaQuestion === undefined) throw new Error('the registry holds the area question');
  expect(planQuestion({ question: areaQuestion, fields: [field], shownConfirmations: new Set(), visibleSuggestion: false })).toEqual({ plan: { kind: 'show' }, questionForKnownField: false });
  expect(inlineAsks([field], productionRegistry.settings.firstEstimateSet.members)).toEqual([]);
  expect(passesConfirmationTest(field)).toBe(false);

  // Shown with its badge and Edit.
  const edit = editActionOf(areaField, BUILDING, [found.id]);
  const [display] = resolveField(resolveInputOf(field, 'building', { actions: [edit], documents: [schedule], fileNames: { [schedule.id]: 'Area Schedule.pdf' } }));
  if (display === undefined) throw new Error('the resolver shows the area');
  DisplayObjectSchema.parse(display);
  expect(display.text).toBe(written);
  expect(display.shape).toBe('value');
  expect(display.badge).toEqual({ id: 'sovitech_will_check', label: 'SOVITECH will check' });
  expect(display.measure).toEqual({ label: 'Gross floor area', unit: { code: 'm2', symbol: 'm²' }, qualifierLabel: 'gross total (Scd)' });
  expect(display.sourceLine?.text).toBe(`Found in Area Schedule.pdf, page ${String(page)}`);
  expect(display.actions).toEqual([edit]);
}

test('US-REVIEW-04 AC3 · F-QUESTION-01 · G5-1: the area found in a document with its basis stated is not asked; it shows with its badge and Edit', () => {
  expectShownNotAsked(34500, '34.500 mp', 4);

  // Property: any area, as written, on any page.
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 999_999 }), fc.integer({ min: 1, max: 400 }), (value, page) => {
      expectShownNotAsked(value, `${String(value)} mp`, page);
    }),
    { numRuns: 50 },
  );
});
