import { expect, test } from 'vitest';

test.only('G1-12 · seeded case run alone with only', () => {
  expect(1).toBe(1);
});

test('G1-12 · seeded case that only leaves out', () => {
  expect(1).toBe(1);
});
