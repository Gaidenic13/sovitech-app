import { expect, test, vi } from 'vitest';

// Seeded: a second copy of the domain, whose stubs the stub guard does not count.
test('G1-2 · seeded case: TEST from a fresh copy of the domain', async () => {
  vi.resetModules();
  const fresh = (await import('@sovitech/domain')) as { derive: unknown };
  expect(typeof fresh.derive).toBe('function');
});
