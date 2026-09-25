// @pending-until: phase 1 derive
import { pendingCase } from './_support/pending';

class NotImplementedError extends Error {
  override readonly name = 'NotImplementedError';
  readonly feature = 'derive';
}

const pending = pendingCase(import.meta.url);

pending('G2-2 · seeded pending case that throws a look-alike error class', () => {
  throw new NotImplementedError('derive is not implemented yet');
});
