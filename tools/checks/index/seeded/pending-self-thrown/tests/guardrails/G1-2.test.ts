// @pending-until: phase 1 derive
import { NotImplementedError } from '@sovitech/domain';
import { pendingCase } from './_support/pending';

const pending = pendingCase(import.meta.url);

pending('G1-2 · seeded pending case that throws the error itself instead of calling derive', () => {
  throw new NotImplementedError('derive');
});
