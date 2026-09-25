import { expect } from 'vitest';
import { verifyProposal } from '@sovitech/domain';
import { lenientCase } from './_support/lenient';

// Seeded: a support helper swallows the body's failure and asserts a constant, so the
// case passes whatever verifyProposal does. While it is a stub, the stub guard must fail it.
lenientCase('G2-14 · seeded case: TEST verdict through a lenient helper', () => {
  expect((verifyProposal as unknown as () => { outcome: string })().outcome).toBe('rejected');
});
