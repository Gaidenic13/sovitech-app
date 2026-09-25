import { expect, test } from 'vitest';
import { derive, verifyProposal } from '@sovitech/domain';

// Seeded: a "Rejected" case written as a throw that names no error. It passes on any
// error, the unbuilt stub's NotImplementedError included.
test('G1-2 · seeded case: TEST input is rejected', () => {
  expect(() => (derive as unknown as () => unknown)()).toThrow();
});

test('G1-2 · seeded case: TEST proposal is rejected (async)', async () => {
  await expect(Promise.resolve().then(() => (verifyProposal as unknown as () => unknown)())).rejects.toThrow();
});
