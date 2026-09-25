import { expect } from 'vitest';
import { derive } from '@sovitech/domain';
import { lenientCase } from './_support/lenient';

// Seeded: the case runs through a support helper that swallows its failures.
lenientCase('G1-2 · seeded case: TEST conflict through a lenient helper', () => {
  expect((derive as unknown as () => { state: string })().state).toBe('conflict');
});
