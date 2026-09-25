import { expect, test } from 'vitest';

// Seeded (phase 0 review, round 2 residual, in a case file): the finally block returns,
// so the failed assertion in the try block never reaches the runner.
test('G1-2 · seeded case: TEST conflict asserted inside try, finally returns', () => {
  try {
    expect('TEST conflict').toBe('TEST known');
  } finally {
    // eslint-disable-next-line no-unsafe-finally
    return;
  }
});
