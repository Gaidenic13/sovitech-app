import { test } from 'vitest';

test('G1-5 · seeded case inverted by the fails option', { fails: true }, () => {
  throw new Error('any error makes a fails-mode test pass');
});
