// @pending-until: phase 1 derive
import { expect } from 'vitest';
import { derive } from '@sovitech/domain';
import { pendingCase } from './_support/pending';

const pending = pendingCase(import.meta.url);

pending('G1-2 · seeded pending case: the derive stub is not built yet', () => {
  const state = (derive as unknown as () => unknown)();
  expect(state).toBeDefined();
});
