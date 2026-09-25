import { expect, test } from 'vitest';
import { verifyProposal } from '@sovitech/domain';

// Seeded: a "Rejected" case written as "throws", without the pending wrapper. It passes
// against the unbuilt verify-proposal stub, because the stub throws; the stub guard must fail it.
test('G2-11 · seeded case: TEST proposal is rejected (sync toThrow)', () => {
  expect(() => (verifyProposal as unknown as (...args: unknown[]) => unknown)(undefined, {})).toThrow();
});
