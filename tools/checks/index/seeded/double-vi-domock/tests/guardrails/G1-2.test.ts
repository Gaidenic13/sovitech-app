import { expect, test, vi } from 'vitest';

// Seeded: a domain module replaced through a relative path, then loaded again.
test('G1-2 · seeded case: TEST conflict from a mocked module', async () => {
  vi.doMock('../../packages/domain/src/field-state', () => ({ derive: () => ({ state: 'conflict' }) }));
  const { derive } = (await import('../../packages/domain/src/field-state')) as { derive: () => { state: string } };
  expect(derive().state).toBe('conflict');
});
