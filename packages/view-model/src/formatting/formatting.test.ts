/**
 * The formatting module (F-RENDER-04; guardrails rules 8 and 9; US-REVIEW-02): rounding only at
 * display, ranges rounded outward, the two number formats, dates in the render allowlist's format.
 * Property tests (fast-check) prove the rules for any input, not only the examples.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { compareDecimals, decimalOf, type ScaledDecimal } from '@sovitech/domain';
import { parseNumber, unitByCode } from '@sovitech/registry';
import {
  DEFAULT_FORMAT_OPTIONS,
  formatAsWritten,
  formatCalculated,
  formatCount,
  formatDate,
  formatEstimate,
  formatExactNumber,
  formatOwnerQuantity,
  formatRangeOverValues,
  rangeSignificantFigures,
  roundRangeOutward,
  type FormatOptions,
} from './index';

const EN: FormatOptions = { numberFormat: 'en' };
const RO: FormatOptions = { numberFormat: 'ro' };

function unit(code: string): { code: string; symbol: string; dimension: string } {
  const entry = unitByCode(code);
  if (entry === undefined) throw new Error(`no unit ${code}`);
  return entry;
}

/** A plain decimal text ("-12.50") as a scaled decimal, digit for digit (the test's own reader). */
function scaled(plain: string): ScaledDecimal {
  const negative = plain.startsWith('-');
  const [integer = '', fraction = ''] = plain.replace('-', '').split('.');
  const digits = BigInt(`${integer}${fraction}`);
  return { digits: negative ? -digits : digits, exponent: -BigInt(fraction.length) };
}

/** The significant digits a plain decimal text writes. */
function significantDigits(plain: string): number {
  const digits = plain.replace('-', '').replace('.', '').replace(/^0+/u, '').replace(/0+$/u, '');
  return digits.length;
}

/** A double that is a short decimal: an integer over a power of ten. */
const decimalNumber = fc
  .tuple(fc.integer({ min: -9_999_999_999, max: 9_999_999_999 }), fc.integer({ min: 0, max: 4 }))
  .map(([integer, places]) => integer / 10 ** places);

describe('F-RENDER-04 · US-REVIEW-02: rounding at display, ranges outward (rule 9)', () => {
  it('G9-1 · US-REVIEW-02 AC4: an estimate of 5,812 with range 5,230 to 6,380 reads "about 5,800 (5,200 to 6,400)"', () => {
    expect(rangeSignificantFigures({ low: 5230, high: 6380 })).toBe(2);
    expect(roundRangeOutward({ low: 5230, high: 6380 }, 2)).toEqual({ low: '5200', high: '6400' });
    expect(formatEstimate(5812, { low: 5230, high: 6380 }, undefined, EN)).toEqual({
      text: 'about 5,800 (5,200 to 6,400)',
      parts: ['5,800', '5,200', '6,400'],
    });
  });

  it('US-REVIEW-02 AC5: two significant figures when (high − low)/(high + low) is 5% or more, three otherwise', () => {
    expect(rangeSignificantFigures({ low: 95, high: 105 })).toBe(2);
    expect(rangeSignificantFigures({ low: 5000, high: 5100 })).toBe(3);
    expect(formatEstimate(5050, { low: 5000, high: 5100 }, unit('m2'), EN).text).toBe('about 5,050 m² (5,000 to 5,100 m²)');
    expect(formatEstimate(5071, { low: 5012, high: 5139 }, unit('m2'), EN).text).toBe('about 5,070 m² (5,010 to 5,140 m²)');
  });

  it('US-REVIEW-02 AC8: an estimate outside its own range is the engine\'s error, never displayed', () => {
    expect(() => formatEstimate(7000, { low: 5230, high: 6380 }, undefined, EN)).toThrow(/low < value < high/u);
    expect(() => formatEstimate(5230, { low: 5230, high: 6380 }, undefined, EN)).toThrow(/low < value < high/u);
    expect(() => roundRangeOutward({ low: 10, high: 9 }, 2)).toThrow(/low ≤ high/u);
  });

  it('US-REVIEW-02 AC6 · rule 9: a range rounded outward is never narrower than the stored one, for any range and precision', () => {
    fc.assert(
      fc.property(decimalNumber, decimalNumber, fc.integer({ min: 1, max: 6 }), (a, b, figures) => {
        const range = { low: Math.min(a, b), high: Math.max(a, b) };
        const shown = roundRangeOutward(range, figures);
        expect(compareDecimals(scaled(shown.low), decimalOf(range.low))).toBeLessThanOrEqual(0);
        expect(compareDecimals(scaled(shown.high), decimalOf(range.high))).toBeGreaterThanOrEqual(0);
        expect(significantDigits(shown.low)).toBeLessThanOrEqual(figures);
        expect(significantDigits(shown.high)).toBeLessThanOrEqual(figures);
        expect(shown.low).not.toMatch(/e/iu);
        expect(shown.high).not.toMatch(/e/iu);
      }),
      { numRuns: 500 },
    );
  });

  it('US-REVIEW-02 AC4 · AC6: an estimate\'s displayed range holds its stored range, and "about" leads it, for any valid estimate', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1_000_000 }), fc.integer({ min: 1, max: 1_000_000 }), fc.integer({ min: 1, max: 1_000_000 }), (low, gapLow, gapHigh) => {
        const value = low + gapLow;
        const high = value + gapHigh;
        const shown = formatEstimate(value, { low, high }, undefined, EN);
        const figures = rangeSignificantFigures({ low, high });
        const bounds = roundRangeOutward({ low, high }, figures);
        expect(shown.text.startsWith('about ')).toBe(true);
        expect(compareDecimals(scaled(bounds.low), decimalOf(low))).toBeLessThanOrEqual(0);
        expect(compareDecimals(scaled(bounds.high), decimalOf(high))).toBeGreaterThanOrEqual(0);
        for (const part of shown.parts) expect(shown.text.includes(part)).toBe(true);
      }),
      { numRuns: 300 },
    );
  });

  it('US-REVIEW-02 AC3: a calculated value shows no more significant figures than its least precise input', () => {
    expect(formatCalculated(34_567.89, 3, unit('m2'), EN).text).toBe('34,600 m²');
    expect(formatCalculated(0.012345, 2, unit('kW'), EN).text).toBe('0.012 kW');
    expect(() => formatCalculated(1, 0, unit('kW'), EN)).toThrow(/significant figures/u);
  });
});

describe('F-RENDER-04 · rule 8: the two number formats and values as written', () => {
  it('US-REVIEW-02 AC2 · G8-19 · G8-20: a document value shows exactly as written, approximate wording kept, "about" not added', () => {
    expect(formatAsWritten({ text: '45.600 mp', locale: 'ro' })).toEqual({ text: '45.600 mp', parts: ['45.600'] });
    expect(formatAsWritten({ text: 'cca. 2350 mp' })).toEqual({ text: 'cca. 2350 mp', parts: ['2350'] });
    expect(formatAsWritten({ text: '3S+P+Mz+12E+Er' })).toEqual({ text: '3S+P+Mz+12E+Er', parts: ['3', '12'] });
    expect(() => formatAsWritten({ text: '  ' })).toThrow(/empty/u);
  });

  it('F-RENDER-04: the owner\'s own quantity keeps every digit they typed, with the registry\'s unit symbol, in either format', () => {
    expect(formatOwnerQuantity(45600, unit('m2'), EN)).toEqual({ text: '45,600 m²', parts: ['45,600', 'm²'] });
    expect(formatOwnerQuantity(45600, unit('m2'), RO)).toEqual({ text: '45.600 m²', parts: ['45.600', 'm²'] });
    expect(formatOwnerQuantity(1234.567, unit('kW'), EN).text).toBe('1,234.567 kW');
    expect(formatOwnerQuantity(1234.567, unit('kW'), RO).text).toBe('1.234,567 kW');
    expect(formatOwnerQuantity(12, unit('count'), EN)).toEqual({ text: '12', parts: ['12'] });
    expect(DEFAULT_FORMAT_OPTIONS.numberFormat).toBe('en');
  });

  it('F-RENDER-04 · rule 8 "Parsing": any number the module writes in the English format reads back as the same value, under the English reading', () => {
    fc.assert(
      fc.property(decimalNumber, (value) => {
        const text = formatExactNumber(value, EN);
        expect(text).toMatch(/^-?\d{1,3}(?:,\d{3})*(?:\.\d+)?$/u);
        const parsed = parseNumber(text, { locale: 'en' });
        expect(parsed.ok).toBe(true);
        if (parsed.ok) expect(parsed.readings.map((reading) => reading.value)).toContain(value);
      }),
      { numRuns: 500 },
    );
  });

  it('F-RENDER-04 · rule 8 "Romanian format": any number the module writes in the Romanian format reads back as the same value, under the Romanian reading', () => {
    fc.assert(
      fc.property(decimalNumber, (value) => {
        const text = formatExactNumber(value, RO);
        expect(text).toMatch(/^-?\d{1,3}(?:\.\d{3})*(?:,\d+)?$/u);
        const parsed = parseNumber(text, { locale: 'ro' });
        expect(parsed.ok).toBe(true);
        if (parsed.ok) expect(parsed.readings.map((reading) => reading.value)).toContain(value);
      }),
      { numRuns: 500 },
    );
  });

  it('rule 1 "Zero is a value" · phase 1 R4-6: a stated count of 0 reads "0", never "-0"; a count is a whole number of zero or more', () => {
    expect(formatCount(0, EN)).toEqual({ text: '0', parts: ['0'] });
    expect(formatCount(-0, EN).text).toBe('0');
    expect(formatExactNumber(-0, EN)).toBe('0');
    expect(formatCount(1_000_000, RO).text).toBe('1.000.000');
    expect(() => formatCount(2.5, EN)).toThrow(/whole number/u);
    expect(() => formatCount(-3, EN)).toThrow(/whole number/u);
    expect(() => formatExactNumber(Number.NaN, EN)).toThrow(/finite/u);
  });

  it('rule 1 "Ranges need a basis" · rule 4: a range over values shows the lowest and highest exactly as stored', () => {
    expect(formatRangeOverValues([30, 28], unit('count'), EN)).toEqual({ text: '28 to 30', parts: ['28', '30'] });
    expect(formatRangeOverValues([1500, 1.5], unit('kW'), EN)).toEqual({ text: '1.5 to 1,500 kW', parts: ['1.5', '1,500', 'kW'] });
    expect(formatRangeOverValues([45600, 45600], unit('m2'), EN).text).toBe('45,600 m²');
    expect(() => formatRangeOverValues([], undefined, EN)).toThrow(/at least one/u);
  });
});

describe('F-RENDER-04 · rule 2: dates in the render allowlist\'s format', () => {
  it('G3-11: a date is "D MMM YYYY" with its ISO day for the <time> element, and nothing that is not a date', () => {
    expect(formatDate('2026-09-30T12:34:56.123456Z')).toEqual({ datetime: '2026-09-30', text: '30 Sep 2026' });
    expect(formatDate('2026-10-02T00:00:00+03:00')).toEqual({ datetime: '2026-10-02', text: '2 Oct 2026' });
    expect(() => formatDate('on request of the designer')).toThrow(/ISO 8601/u);
    expect(() => formatDate('2026-02-30T00:00:00Z')).toThrow();
    expect(() => formatDate('2026-09-30')).toThrow(/ISO 8601/u);
  });
});
