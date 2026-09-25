import { expect, test } from 'vitest';
import { assertProperty } from './_support/property';

// Seeded: a case that runs its property through the edited helper.
test('G1-2 · seeded case: TEST property through an edited helper', () => {
  assertProperty(() => {
    expect('TEST conflict').toBe('TEST known');
  });
});
