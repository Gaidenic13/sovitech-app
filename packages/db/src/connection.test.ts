import { describe, expect, it } from 'vitest';
import { isoTimestamp } from './connection';

describe('isoTimestamp', () => {
  it('reads a UTC timestamp from the store as ISO 8601 with six fractional digits', () => {
    expect(isoTimestamp('2026-09-25 10:00:00.123456+00')).toBe('2026-09-25T10:00:00.123456Z');
    expect(isoTimestamp('2026-09-25 10:00:00.12+00')).toBe('2026-09-25T10:00:00.120000Z');
    expect(isoTimestamp('2026-09-25 10:00:00+00')).toBe('2026-09-25T10:00:00.000000Z');
  });

  it('keeps text order equal to time order, whatever the fraction the store printed', () => {
    const times = ['2026-09-25 10:00:00+00', '2026-09-25 10:00:00.5+00', '2026-09-25 10:00:00.05+00'].map(isoTimestamp);
    expect([...times].sort()).toEqual([
      '2026-09-25T10:00:00.000000Z',
      '2026-09-25T10:00:00.050000Z',
      '2026-09-25T10:00:00.500000Z',
    ]);
  });

  it('refuses a timestamp in another zone rather than guess it', () => {
    expect(() => isoTimestamp('2026-09-25 12:00:00+02')).toThrow(/not a UTC timestamp/);
  });
});
