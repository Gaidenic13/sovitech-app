// @pending-until: phase 2 verify-proposal
import { pendingCase } from './_support/pending';

class NotImplementedError extends Error {
  override readonly name = 'NotImplementedError';
  readonly feature = 'verify-proposal';
}

const pending = pendingCase(import.meta.url);

pending('G2-2 · seeded pending case that throws a look-alike error class', () => {
  throw new NotImplementedError('verify-proposal is not implemented yet');
});
