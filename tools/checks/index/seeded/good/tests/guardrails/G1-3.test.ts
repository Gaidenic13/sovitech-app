// @pending-until: phase 2 verify-proposal
import { verifyProposal } from '@sovitech/domain';
import { pendingCase } from './_support';

pendingCase(import.meta.url)('G1-3 · seeded pending case, through a support re-export', () => {
  verifyProposal();
});
