import { expect, test } from 'vitest';

// Seeded: expect() with no matcher. Vitest counts the call as an assertion, so
// expect.requireAssertions lets the test through, and it asserts nothing.
test('G1-2 · seeded case whose expect has no matcher', () => {
  expect('TEST');
});
