/**
 * Unit and property tests of the engine's exact intervals (rule 9: "Arithmetic lives in code"; "Stored values are never
 * rounded"; "It must satisfy low < value < high"; docs/adr/0047 decision 4). Nothing here rounds: every result is the
 * exact decimal of its operands.
 */
import fc from 'fast-check';
import { Decimal } from 'decimal.js';
import { describe, expect, test } from 'vitest';
import { EngineInputError } from './errors';
import { estimate, exact, hull, interval, isPoint, midpoint, multiply, percentOf, point, strictlyInside, sum, toCandidateNumber, type Interval } from './interval';

/** Decimals with up to four decimal places, as exact numbers. */
const decimals = fc.tuple(fc.integer({ min: -1_000_000_000, max: 1_000_000_000 }), fc.integer({ min: 0, max: 4 })).map(([digits, scale]) =>
  exact(digits).times(exact([1, 0.1, 0.01, 0.001, 0.0001][scale] ?? Number.NaN)),
);
const intervals = fc.tuple(decimals, decimals).map(([a, b]) => (a.lessThanOrEqualTo(b) ? interval(a, b) : interval(b, a)));
/** A member of an interval: low + t × (high − low), t a fraction in tenths. */
const memberOf = (range: Interval, tenths: number): Decimal => range.low.plus(range.high.minus(range.low).times(exact(tenths).times(exact(0.1))));
const contains = (range: Interval, value: Decimal): boolean => range.low.lessThanOrEqualTo(value) && value.lessThanOrEqualTo(range.high);

describe('ADR 0047 decision 4 · exact intervals (rule 9)', () => {
  test('rule 9 · a number reads as the decimal its shortest text names, never its binary expansion', () => {
    expect(exact(0.1).plus(exact(0.2)).toString()).toBe('0.3');
    expect(percentOf(9071).toString()).toBe('90.71');
    expect(() => exact(Number.NaN)).toThrow(RangeError);
    expect(() => exact(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });

  test('rule 9 · arithmetic never rounds: a product of many digits keeps every one', () => {
    const big = exact(123_456_789.123_4).times(exact(987_654_321.987_6));
    expect(big.toString()).toBe('121932631356437737.14966984');
    // The default decimal.js constructor would round this to 20 significant digits; the engine's does not.
    expect(new Decimal(123_456_789.123_4).times(new Decimal(987_654_321.987_6)).toString()).not.toBe(big.toString());
  });

  test('rule 9 · an interval needs low <= high; a point is one with equal bounds', () => {
    expect(() => interval(exact(2), exact(1))).toThrow(EngineInputError);
    expect(isPoint(point(exact(3)))).toBe(true);
    expect(isPoint(interval(exact(1), exact(2)))).toBe(false);
  });

  test('rule 1 "Zero is a value" · a sum or a hull of nothing is refused, never zero', () => {
    expect(() => sum([])).toThrow(EngineInputError);
    expect(() => hull([])).toThrow(EngineInputError);
  });

  test('rule 9 · an estimate needs low < value < high', () => {
    const range = interval(exact(1), exact(3));
    expect(estimate(exact(2), range).value.toString()).toBe('2');
    for (const value of [1, 3, 0, 4]) expect(() => estimate(exact(value), range)).toThrow(EngineInputError);
    expect(() => estimate(exact(2), point(exact(2)))).toThrow(EngineInputError);
  });

  test('rule 9 · a candidate number is refused when it would not read back as the same decimal', () => {
    expect(toCandidateNumber(exact(0.1).plus(exact(0.2)))).toBe(0.3);
    expect(() => toCandidateNumber(exact(1).times(exact(0.1)).times(exact(0.000_000_000_1)).plus(exact(123_456_789_012)))).toThrow(EngineInputError);
  });

  test('property · low <= high for every interval the operations build', () => {
    fc.assert(
      fc.property(intervals, intervals, (a, b) => {
        for (const result of [sum([a, b]), multiply(a, b), hull([a, b])]) expect(result.low.lessThanOrEqualTo(result.high)).toBe(true);
      }),
    );
  });

  test('property · a sum holds every sum of members, a product every product, a hull every member', () => {
    fc.assert(
      fc.property(intervals, intervals, fc.integer({ min: 0, max: 10 }), fc.integer({ min: 0, max: 10 }), (a, b, s, t) => {
        const x = memberOf(a, s);
        const y = memberOf(b, t);
        expect(contains(sum([a, b]), x.plus(y))).toBe(true);
        expect(contains(multiply(a, b), x.times(y))).toBe(true);
        expect(contains(hull([a, b]), x)).toBe(true);
        expect(contains(hull([a, b]), y)).toBe(true);
      }),
    );
  });

  test('property · the bounds of a sum are the sums of the bounds, exactly; a sum is the same in any order', () => {
    fc.assert(
      fc.property(fc.array(intervals, { minLength: 1, maxLength: 8 }), (items) => {
        const total = sum(items);
        expect(total.low.equals(items.map((item) => item.low).reduce((a, b) => a.plus(b)))).toBe(true);
        expect(total.high.equals(items.map((item) => item.high).reduce((a, b) => a.plus(b)))).toBe(true);
        const reversed = sum([...items].reverse());
        expect(reversed.low.equals(total.low) && reversed.high.equals(total.high)).toBe(true);
      }),
    );
  });

  test('property · a midpoint of a range with width lies strictly inside it, and makes an estimate', () => {
    fc.assert(
      fc.property(intervals, (range) => {
        fc.pre(!isPoint(range));
        expect(strictlyInside(midpoint(range), range)).toBe(true);
        expect(estimate(midpoint(range), range).range).toEqual(range);
      }),
    );
  });
});
