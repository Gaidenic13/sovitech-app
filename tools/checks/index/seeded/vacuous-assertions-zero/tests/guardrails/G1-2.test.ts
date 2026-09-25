import { expect, test } from 'vitest';

// Seeded: expect.assertions(0) declares that the test asserts nothing.
test('G1-2 · seeded case that expects no assertion', () => {
  expect.assertions(0);
  const seen = ['TEST'].map((item) => item.toLowerCase());
  void seen;
});
