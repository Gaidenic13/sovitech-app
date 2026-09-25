// @pending-until: phase 2 verify-proposal
import { expect } from 'vitest';
import { verifyProposal } from '@sovitech/domain';
import { pendingCase } from './_support/pending';

const pending = pendingCase(import.meta.url);

pending('G1-2 · seeded pending case: the verify-proposal stub is not built yet', () => {
  const verdict = (verifyProposal as unknown as () => unknown)();
  expect(verdict).toBeDefined();
});
