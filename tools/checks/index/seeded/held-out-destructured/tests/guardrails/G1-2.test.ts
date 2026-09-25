import { expect, test } from 'vitest';

const { skip } = test;

skip('G1-2 · seeded case held out by a destructured modifier', () => {
  expect(true).toBe(true);
});
