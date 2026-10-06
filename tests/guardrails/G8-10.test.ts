/**
 * G8-10 (docs/guardrails.md section 7; rule 8 "Plausibility checks").
 * Situation: an FCU "2.500 W" parsed as 2,500 kW.
 * Expected: Please check from the plausibility check. Not used in totals.
 *
 * The production registry holds no plausible range (prompt 3 5.2: the check
 * waits for SOVITECH ranges), so the case uses a TEST registry entry: a fan
 * coil's rated electrical input in W with a TEST range. The misread value
 * (2,500 kW, three orders of magnitude off) is compared with the range in the
 * field's unit by the registry's exact within-dimension conversion. It reads
 * Please check and is left out of totals until the right person confirms it
 * (confirmBy engineer: only engineer_verified clears it; an owner's click does
 * not). Without a range, the check does not run: nothing is flagged and
 * nothing is invented.
 *
 * Phase 5 (the engine builder; Expected unchanged): "Not used in totals" in the engine. A total
 * (`exclude_and_count`) leaves a Please-check value out and counts it, so it reads incomplete
 * naming the item; a formula that takes no exclusion names it as missing (`please_check`);
 * once the engineer verifies the value, the total uses it. TEST formulas and TEST fields
 * (packages/engine/test-formulas/), inside the test runner only.
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { checkPlausibility, parseNumber, parseQuantityText } from '@sovitech/registry';
import { runEngine, type EngineRun } from '@sovitech/engine';
import type { CandidateEvent, FieldDefinition } from '@sovitech/domain';
import { testCatalogue } from '../../packages/engine/test-formulas/engine';
import { LINE_ITEM_FIELDS, TEST_FIELDS } from '../../packages/engine/test-formulas/fields';
import { testEngineInput, type TestEntry } from '../../packages/engine/test-formulas/inputs';
import { documentReading, engineerVerificationInMemory, testDocument, testField } from './_support/builders';

/** A TEST field with a TEST plausible range: a fan coil's rated electrical input, in W. */
const fanCoilInput = testField('asset.TEST_fanCoilRatedInput', {
  kind: 'quantity',
  subject: 'asset',
  unit: 'W',
  qualifierRequired: true,
  confirmBy: 'engineer',
  plausible: { low: 10, high: 5_000, basis: 'TEST range for G8-10' },
});

test('G8-10 · "2.500 W" read as 2,500 kW is outside the range: Please check, and not used in totals', () => {
  // The text itself reads two ways (rule 8): 2.5 W or 2,500 W. Neither is 2,500 kW.
  const text = parseNumber('2.500');
  expect(text.ok && text.ambiguous).toBe(true);
  expect(text.ok && text.readings.map((reading) => reading.value).sort((a, b) => a - b)).toEqual([2.5, 2_500]);

  const verdict = checkPlausibility(fanCoilInput, { value: 2_500, unit: 'kW' }, { verification: 'unverified' });
  expect(verdict.status).toBe('outside');
  expect(verdict.badge).toBe('please_check');
  expect(verdict.usableInTotals).toBe(false);
});

test('G8-10 · the owner acknowledging it changes nothing on an engineer field; only engineer_verified clears it', () => {
  for (const verification of ['unverified', 'owner_acknowledged', 'user_confirmed'] as const) {
    const verdict = checkPlausibility(fanCoilInput, { value: 2_500, unit: 'kW' }, { verification });
    expect(verdict).toMatchObject({ status: 'outside', badge: 'please_check', usableInTotals: false });
  }
  const verified = checkPlausibility(fanCoilInput, { value: 2_500, unit: 'kW' }, { verification: 'engineer_verified' });
  expect(verified).toMatchObject({ status: 'outside', usableInTotals: true });
  expect(verified.badge).toBeUndefined();
});

test('G8-10 · the reading as written, 2,500 W, is inside the TEST range and is usable', () => {
  const quantity = parseQuantityText('2.500 W', { locale: 'ro' });
  expect(quantity.ok).toBe(true);
  if (!quantity.ok) return;
  expect(quantity.readings).toEqual([expect.objectContaining({ value: 2_500, unit: 'W' })]);
  expect(checkPlausibility(fanCoilInput, { value: 2_500, unit: 'W' }, { verification: 'unverified' })).toMatchObject({
    status: 'within',
    usableInTotals: true,
  });
});

test('G8-10 · a field with no plausible range runs no check: nothing is flagged, no range is invented', () => {
  const noRange = testField('asset.TEST_fanCoilRatedInputNoRange', { kind: 'quantity', subject: 'asset', unit: 'W', confirmBy: 'engineer' });
  expect(checkPlausibility(noRange, { value: 2_500, unit: 'kW' }, { verification: 'unverified' })).toMatchObject({
    status: 'no_range',
    usableInTotals: true,
  });
});

test('G8-10 · any value outside the TEST range, in W or kW, reads Please check and stays out of totals until verified', () => {
  fc.assert(
    fc.property(fc.integer({ min: 5_001, max: 50_000_000 }), fc.constantFrom('W', 'kW', 'MW'), (value, unit) => {
      const verdict = checkPlausibility(fanCoilInput, { value, unit }, { verification: 'unverified' });
      expect(verdict).toMatchObject({ status: 'outside', badge: 'please_check', usableInTotals: false });
    }),
  );
});

// --- Phase 5: not used in the engine's totals ------------------------------------------------

const ENGINE_PROJECT = 'test-project-g8-10';
const ENGINE_BUILDING = 'test-building-g8-10';
const schedule = testDocument('test-doc-g8-10', ENGINE_PROJECT, 'technical_design');
/** Line item 01 with a TEST plausible range; its document value lies outside it. */
const checkedItem: FieldDefinition = { ...(LINE_ITEM_FIELDS[0] as FieldDefinition), plausible: { low: 1, high: 50, basis: 'TEST range for G8-10' } };

function lineItems(verifiedOutlier: boolean): TestEntry[] {
  return LINE_ITEM_FIELDS.map((field, index): TestEntry => {
    const definition = index === 0 ? checkedItem : field;
    const value = index === 0 ? 2_500 : index + 1;
    const reading = documentReading({ id: `test-cand-g8-10-item-${String(index + 1)}`, subjectId: ENGINE_BUILDING, field: definition, document: schedule, value: { quantity: { value, unit: 'count' } }, minute: 1, page: index + 1 });
    const events: CandidateEvent[] = index === 0 && verifiedOutlier ? [engineerVerificationInMemory(reading.id, 5)] : [];
    return { definition, subjectId: ENGINE_BUILDING, candidates: [reading], events: { candidate: events } };
  });
}

let engineIds = 0;
const runTotal = (entries: readonly TestEntry[], extra: string): EngineRun =>
  runEngine(testCatalogue({ mirrored: false, extra: [extra] }), testEngineInput({ projectId: ENGINE_PROJECT, entries, subjects: { building: ENGINE_BUILDING, project: ENGINE_PROJECT } }), {
    newId: () => `test-cand-g8-10-out-${String((engineIds += 1))}`,
    at: '2026-10-05T09:00:00Z',
  });

test('G8-10 · a Please-check value is not used in an engine total: the total leaves it out, counts it and reads incomplete', () => {
  const [total] = runTotal(lineItems(false), 'TEST-capexLineItems').outputs;
  expect(total?.kind).toBe('incomplete');
  if (total?.kind !== 'incomplete') return;
  expect(total.excluded).toEqual(['TEST line item 01']);
  expect(total.candidate.method.inputCandidateIds).not.toContain('test-cand-g8-10-item-1');
});

test('G8-10 · once an engineer verifies it, the total uses it (an owner click would not: confirmBy engineer)', () => {
  const [total] = runTotal(lineItems(true), 'TEST-capexLineItems').outputs;
  expect(total?.kind).toBe('figure');
  if (total?.kind === 'figure') expect(total.candidate.method.inputCandidateIds).toContain('test-cand-g8-10-item-1');
});

test('G8-10 · a formula that leaves nothing out names the Please-check value as missing', () => {
  const utility: FieldDefinition = { ...TEST_FIELDS.utilityMeterTotal, plausible: { low: 10, high: 50_000, basis: 'TEST range for G8-10' } };
  const bill = testDocument('test-doc-g8-10-bill', ENGINE_PROJECT, 'bill');
  const entries: TestEntry[] = [
    { definition: utility, subjectId: 'test-meter-g8-10', candidates: [documentReading({ id: 'test-cand-g8-10-utility', subjectId: 'test-meter-g8-10', field: utility, document: bill, value: { quantity: { value: 2_500_000, unit: 'kWh' } }, minute: 1 })] },
    { definition: TEST_FIELDS.subMeterTotal, subjectId: 'test-meter-g8-10-sub', candidates: [documentReading({ id: 'test-cand-g8-10-sub', subjectId: 'test-meter-g8-10-sub', field: TEST_FIELDS.subMeterTotal, document: bill, value: { quantity: { value: 40, unit: 'kWh' } }, minute: 1 })] },
  ];
  const [site] = runTotal(entries, 'TEST-siteConsumption').outputs;
  expect(site).toMatchObject({ kind: 'not_available', missing: [{ kind: 'input', fieldKey: utility.key, reason: 'please_check' }] });
});
