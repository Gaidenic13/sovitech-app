import { expect, test } from 'vitest';

// Seeded case file that registers no test.
if (process.env['SOVITECH_SEEDED_NEVER'] === 'set') {
  test('G1-11 · never registered', () => {
    expect(1).toBe(1);
  });
}
