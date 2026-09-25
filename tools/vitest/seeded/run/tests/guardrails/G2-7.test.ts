// @pending-until: phase 1 derive
import { verifyProposal } from '@sovitech/domain';
import { pendingCase } from './_support/pending';

const pending = pendingCase(import.meta.url);

pending('G2-7 · seeded pending case held for derive whose body reaches verify-proposal', () => {
  (verifyProposal as unknown as () => unknown)();
});
