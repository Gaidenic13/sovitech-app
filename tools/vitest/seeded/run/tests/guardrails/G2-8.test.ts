// @pending-until: phase 2 verify-proposal
import { expect } from 'vitest';
import { pendingCase } from './_support/pending';

const pending = pendingCase(import.meta.url);

pending('G2-8 · seeded pending case whose body passes', () => {
  expect(1).toBe(1);
});
