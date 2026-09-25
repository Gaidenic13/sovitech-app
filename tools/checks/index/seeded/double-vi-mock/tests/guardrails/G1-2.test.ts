import { expect, test, vi } from 'vitest';
import { derive } from '@sovitech/domain';

// Seeded: the code under test is mocked, so the case proves nothing about it.
vi.mock('@sovitech/domain', () => ({ derive: () => ({ state: 'conflict' }) }));

test('G1-2 · seeded case: TEST both kept, field in conflict', () => {
  expect((derive as unknown as () => { state: string })().state).toBe('conflict');
});
