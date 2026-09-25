import { expect, test, vi } from 'vitest';

// Seeded: a global replaced under the case.
test('G1-2 · seeded case: TEST with a stubbed global', () => {
  vi.stubGlobal('fetch', () => Promise.resolve({ ok: true }));
  expect(typeof fetch).toBe('function');
});
