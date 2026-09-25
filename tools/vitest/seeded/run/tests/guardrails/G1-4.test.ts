import { expect, test } from 'vitest';

test('G1-4 · seeded case held out by the todo option', { todo: true }, () => {
  expect(1).toBe(1);
});
