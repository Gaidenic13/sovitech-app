import { expect, test } from 'vitest';
import { derive } from '@sovitech/domain';

// Seeded: a "Rejected" case written as "throws", without the pending wrapper. It passes
// against the unbuilt derive stub, because the stub throws; the stub guard must fail it.
test('G2-11 · seeded case: TEST input is rejected (sync toThrow)', () => {
  expect(() => (derive as unknown as (...args: unknown[]) => unknown)({}, [], { candidate: [], field: [], document: [] }, {})).toThrow();
});
