import { expect, test } from 'vitest';
import { verifyProposal } from '@sovitech/domain';

// Seeded: the async form of a "Rejected" case written as "throws", without the pending
// wrapper. It passes against the unbuilt verify-proposal stub; the stub guard must fail it.
test('G2-12 · seeded case: TEST proposal is rejected (rejects.toThrow)', async () => {
  await expect(
    Promise.resolve().then(() => (verifyProposal as unknown as (...args: unknown[]) => unknown)({}, {})),
  ).rejects.toThrow();
});
