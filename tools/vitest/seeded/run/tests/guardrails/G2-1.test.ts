// @pending-until: phase 1 derive
import { NotImplementedError } from '@sovitech/domain';
import { pendingCase } from './_support/pending';

const pending = pendingCase(import.meta.url);

pending('G2-1 · seeded pending case that throws the domain error itself', () => {
  throw new NotImplementedError('derive');
});
