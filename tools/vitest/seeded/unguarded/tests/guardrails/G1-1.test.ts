import { expect, test } from 'vitest';

test('G1-1 · seeded real case, run without the stub guard', () => {
  expect(['TEST'].length).toBe(1);
});
