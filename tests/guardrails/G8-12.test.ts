/**
 * G8-12 (docs/guardrails.md section 7; rule 8, "Ambiguous readings keep both. When a reading is
 * ambiguous, such as '1.500', the candidate carries both alternatives with low confidence. It is
 * never silently read one way"; "Locale is detected per table or per value"). Proposed in phase
 * 1 (P-1-CASES); G8-3 is the eval of the same rule on extraction.
 * Situation: the rule 8 parser reads "1.500" in a table whose locale is unknown.
 * Expected: two readings, 1.5 and 1500, marked ambiguous; neither is chosen.
 *
 * The parser (@sovitech/registry) is the one place a number is read from text. With no locale
 * for the table it returns both readings; only a locale that the table itself states settles
 * the reading (the control), and the parser then says so.
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { parseNumber, parseQuantityText, type NumberParse } from '@sovitech/registry';

const readings = (parse: NumberParse): number[] => (parse.ok ? parse.readings.map((reading) => reading.value).sort((a, b) => a - b) : []);

test('F-REGISTRY-03 · G8-12: "1.500" with no locale reads two ways, 1.5 and 1500, marked ambiguous; neither is chosen', () => {
  const parse = parseNumber('1.500');
  expect(parse.ok).toBe(true);
  if (!parse.ok) return;
  expect(parse.ambiguous).toBe(true);
  expect(readings(parse)).toEqual([1.5, 1_500]);
  expect(parse.settledByHint).toBeUndefined();
  expect(parse.original).toBe('1.500');

  // With its unit, the quantity keeps both readings too.
  const quantity = parseQuantityText('1.500 kW');
  expect(quantity.ok && quantity.ambiguous).toBe(true);
  expect(quantity.ok && quantity.readings.map((reading) => reading.value).sort((a, b) => a - b)).toEqual([1.5, 1_500]);

  // Property: every number written as one to three digits, a separator and exactly three digits reads both ways.
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 999 }), fc.integer({ min: 0, max: 999 }), fc.constantFrom('.', ','), (whole, group, separator) => {
      const text = `${String(whole)}${separator}${String(group).padStart(3, '0')}`;
      const read = parseNumber(text);
      expect(read.ok && read.ambiguous, text).toBe(true);
      expect(readings(read), text).toHaveLength(2);
    }),
  );
});

test('F-REGISTRY-03 · G8-12 control: a locale the table states settles "1.500", and the parser says so', () => {
  const ro = parseNumber('1.500', { locale: 'ro' });
  expect(readings(ro)).toEqual([1_500]);
  expect(ro.ok && ro.settledByHint).toBe('ro');
  const en = parseNumber('1.500', { locale: 'en' });
  expect(readings(en)).toEqual([1.5]);
  expect(en.ok && en.settledByHint).toBe('en');
});
