import { expect, test, vi } from 'vitest';

// Seeded: the environment changed under the case.
test('G1-2 · seeded case: TEST with a stubbed environment', () => {
  vi.stubEnv('SOVITECH_TEST_FLAG', 'TEST');
  expect(process.env['SOVITECH_TEST_FLAG']).toBe('TEST');
});
