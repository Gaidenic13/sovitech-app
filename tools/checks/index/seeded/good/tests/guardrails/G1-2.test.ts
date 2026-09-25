// @pending-until: phase 1 derive
import { derive } from '@sovitech/domain';
import { pendingCase } from './_support/pending';

const pending = pendingCase(import.meta.url);

pending('G1-2 · seeded pending case, direct import', () => {
  derive();
});
