/**
 * G2-7 (docs/guardrails.md section 7; rule 2, "UI code receives only resolved field objects"; rule 9,
 * "Rounding").
 * Situation: two screens show the same value id with the same filter, for example the floor 05 HVAC
 * asset count on the model view and on the systems view.
 * Expected: both render the identical display, including badge, range and rounding.
 *
 * Phase 3's two screens of one value: the gross floor area on step 3 (its summary row, with Edit)
 * and on step 8 (the Building card, whose Edit is the card's). Each screen asks the one resolver on
 * its own, from its own read of stored state; the value id is the same, and what the value element
 * may show (the render contract's projection, `servedDisplayOf`: text, badge, lines, parts,
 * evidence) is identical. The same holds for an estimate's range and rounding, and for a conflict's
 * range. Phase 4 adds the dashboard screens.
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import type { Candidate } from '@sovitech/domain';
import { servedDisplayOf, type DisplayObject } from '@sovitech/view-model/browser';
import { editActionOf, resolveField } from '@sovitech/view-model/server';
import { documentReading, ownerAnswer, ownerConfirmation, testDocument, testEvents } from './_support/builders';
import { intakeFieldOf, productionField, registryField, resolveInputOf, uuid } from './_support/view-model';

const PROJECT = uuid(1);
const BUILDING = uuid(2);
const schedule = { ...testDocument(uuid(10), PROJECT, 'unknown'), contentHash: `sha256:${'f'.repeat(64)}` };
const FILE_NAMES = { [schedule.id]: 'Area Schedule.pdf' };

/** What the value element shows, without the actions its screen offers around it. */
function shown(display: DisplayObject | undefined): unknown {
  if (display === undefined) throw new Error('a display');
  const { actions: _actions, ...rest } = display;
  void _actions;
  return { rest, served: servedDisplayOf({ ...display, actions: [] }) };
}

function onTwoScreens(field: Parameters<typeof intakeFieldOf>[0], candidates: readonly Candidate[], events = testEvents({})): void {
  // Step 3 reads the store and resolves, with Edit on the row.
  const step3 = intakeFieldOf(field, BUILDING, candidates, events, [schedule]);
  const [onStep3] = resolveField(resolveInputOf(step3, 'building', { actions: [editActionOf(field, BUILDING, candidates.map((candidate) => candidate.id))], documents: [schedule], fileNames: FILE_NAMES }));
  // Step 8 reads the store again and resolves, the card's Edit around it.
  const step8 = intakeFieldOf(field, BUILDING, [...candidates].reverse(), events, [schedule]);
  const [onStep8] = resolveField(resolveInputOf(step8, 'building', { documents: [schedule], fileNames: FILE_NAMES }));
  expect(onStep3?.valueId).toBe(onStep8?.valueId);
  expect(shown(onStep3)).toEqual(shown(onStep8));
}

test('US-REVIEW-01 AC11 · US-INTAKE-15 AC3 · F-VALUE-10 · G2-7: the area on step 3 and on step 8 is one value id with the identical display, badge, range and rounding', () => {
  const area = productionField('building.grossFloorArea');
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 999_999 }), fc.integer({ min: 1, max: 999_999 }), fc.boolean(), (documentValue, ownerValue, withOwner) => {
      const read = { ...documentReading({ id: uuid(20), subjectId: BUILDING, field: area, document: schedule, value: { quantity: { value: documentValue, unit: 'm2', qualifier: 'gross_total' } }, minute: 1, page: 4 }), original: { text: `${String(documentValue)} mp` } };
      if (!withOwner) {
        onTwoScreens(area, [read]);
        return;
      }
      // The owner's own value beside it: known or in conflict, the same display on both screens.
      const own = ownerAnswer({ id: uuid(21), subjectId: BUILDING, field: area, value: { quantity: { value: ownerValue, unit: 'm2', qualifier: 'gross_total' } }, minute: 9 });
      onTwoScreens(area, [read, own], testEvents({ candidate: [ownerConfirmation(own)] }));
    }),
    { numRuns: 100 },
  );

  // An estimate's range and rounding (rule 9): identical on both screens.
  const estimateField = registryField('building.testEstimate', { kind: 'count', subject: 'building', unit: 'count', estimation: 'allowed', estimatedMethod: 'points', confirmBy: 'engineer', valueShape: 'non_negative_integer' });
  const estimate: Candidate = {
    id: uuid(30),
    subjectId: BUILDING,
    fieldKey: estimateField.key,
    quantity: { value: 5812, unit: 'count' },
    source: 'estimated',
    evidence: [],
    method: { formulaId: 'TEST-points', formulaVersion: '1.0.0', inputCandidateIds: [], unknownPolicy: 'refuse', assumptions: [] },
    range: { low: 5230, high: 6380 },
    createdBy: 'test-engine',
    authorRole: 'system',
    createdAt: '2026-09-30T09:00:00.000Z',
  };
  const step3 = intakeFieldOf(estimateField, BUILDING, [estimate]);
  const [display] = resolveField(resolveInputOf(step3, 'building'));
  expect(display?.text).toBe('about 5,800 (5,200 to 6,400)');
  expect(display?.badge?.id).toBe('estimated');
  onTwoScreens(estimateField, [estimate]);
});
