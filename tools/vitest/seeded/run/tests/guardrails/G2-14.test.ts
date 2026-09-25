import { expect } from 'vitest';
import { derive } from '@sovitech/domain';
import { lenientCase } from './_support/lenient';

// Seeded: a support helper swallows the body's failure and asserts a constant, so the
// case passes whatever derive does. While derive is a stub, the stub guard must fail it.
lenientCase('G2-14 · seeded case: TEST conflict through a lenient helper', () => {
  expect((derive as unknown as () => { state: string })().state).toBe('conflict');
});
