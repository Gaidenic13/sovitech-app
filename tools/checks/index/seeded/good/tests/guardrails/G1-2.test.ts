// @pending-until: phase 2 verify-proposal
import { verifyProposal } from '@sovitech/domain';
import { pendingCase } from './_support/pending';

const pending = pendingCase(import.meta.url);

pending('G1-2 · seeded pending case, direct import', () => {
  verifyProposal();
});
