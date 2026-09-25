// @pending-until: phase 2 verify-proposal
import { NotImplementedError } from '@sovitech/domain';
import { pendingCase } from './_support/pending';

const pending = pendingCase(import.meta.url);

pending('G1-2 · seeded pending case that throws the error itself instead of calling verifyProposal', () => {
  throw new NotImplementedError('verify-proposal');
});
