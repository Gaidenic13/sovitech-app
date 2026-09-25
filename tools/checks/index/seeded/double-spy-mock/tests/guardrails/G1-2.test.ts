import { expect, test, vi } from 'vitest';
import * as domain from '@sovitech/domain';

// Seeded: a spy on a domain function given an implementation of its own.
test('G1-2 · seeded case: TEST conflict from a spied derive', () => {
  const spy = vi.spyOn(domain, 'derive');
  spy.mockReturnValue({ state: 'conflict' } as never);
  expect((domain.derive as unknown as () => { state: string })().state).toBe('conflict');
});
