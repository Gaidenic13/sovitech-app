/**
 * Times compared to the nanosecond (packages/domain/src/time.ts; ADR 0016 decision
 * 16): the store's microseconds are kept, so a resolution never covers a candidate
 * written after it within the same millisecond. Every value is TEST data.
 */
import { describe, expect, test } from 'vitest';
import { atOrBefore, compareTimes, olderFirst, timeInNanos } from './index';

describe('compareTimes', () => {
  test('keeps microseconds that Date.parse drops', () => {
    expect(Date.parse('2026-09-25T09:05:00.000800Z')).toBe(Date.parse('2026-09-25T09:05:00.000500Z'));
    expect(compareTimes('2026-09-25T09:05:00.000500Z', '2026-09-25T09:05:00.000800Z')).toBe(-1);
    expect(atOrBefore('2026-09-25T09:05:00.000800Z', '2026-09-25T09:05:00.000500Z')).toBe(false);
    expect(atOrBefore('2026-09-25T09:05:00.000500Z', '2026-09-25T09:05:00.000500Z')).toBe(true);
  });

  test('reads zones and fractions of any length the same way', () => {
    expect(compareTimes('2026-09-25T12:05:00.5+03:00', '2026-09-25T09:05:00.500000Z')).toBe(0);
    expect(timeInNanos('2026-09-25T09:05:00Z')).toBe(timeInNanos('2026-09-25T09:05:00.000000000Z'));
  });

  test('a time that does not parse is neither earlier nor later, and never at or before anything', () => {
    expect(compareTimes('TEST not a time', '2026-09-25T09:05:00Z')).toBeNull();
    expect(atOrBefore('TEST not a time', '2026-09-25T09:05:00Z')).toBe(false);
    expect(atOrBefore('2026-09-25T09:05:00Z', 'TEST not a time')).toBe(false);
    // The order stays total: text order where a time does not parse.
    expect(olderFirst('TEST b', 'TEST a')).toBeGreaterThan(0);
  });
});
