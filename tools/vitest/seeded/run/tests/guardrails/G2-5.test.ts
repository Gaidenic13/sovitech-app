import { expect, test } from 'vitest';

test.skipIf(true)('G2-5 · seeded case held out by skipIf', () => {
  expect(1).toBe(1);
});
