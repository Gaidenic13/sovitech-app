import { expect } from 'vitest';
import { lenientCase } from './_support/lenient';

// Seeded: the case runs through a support helper whose finally block returns.
lenientCase('G1-2 · seeded case: TEST conflict through a helper that returns in finally', () => {
  expect('TEST conflict').toBe('TEST known');
});
