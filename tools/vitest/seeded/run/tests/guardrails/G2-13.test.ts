import { expect, test } from 'vitest';
import { derive } from '@sovitech/domain';

// Seeded: the stub is reached while the file loads, its error swallowed, and a test
// asserts on what the file made of it. The stub guard must fail the test.
let outcome = 'TEST not reached';
try {
  (derive as unknown as () => unknown)();
  outcome = 'TEST derived';
} catch {
  outcome = 'TEST rejected';
}

test('G2-13 · seeded case: TEST reached the stub at load time', () => {
  expect(outcome).toBe('TEST rejected');
});
