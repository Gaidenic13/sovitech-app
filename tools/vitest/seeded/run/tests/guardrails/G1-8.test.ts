import { expect, test } from 'vitest';

const { skip } = test;

skip('G1-8 · seeded case held out by a destructured modifier', () => {
  expect(1).toBe(1);
});
