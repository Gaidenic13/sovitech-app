import { expect, test } from 'vitest';

test('G1-2 · seeded case inverted by the fails option', { fails: true }, () => {
  expect(true).toBe(false);
});
