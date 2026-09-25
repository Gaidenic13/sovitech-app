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
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { checkPlausibility, parseNumber, parseQuantityText } from '@sovitech/registry';
import { testField } from './_support/builders';

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
