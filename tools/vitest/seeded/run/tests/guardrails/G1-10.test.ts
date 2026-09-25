import { test } from 'vitest';

test('G1-10 · seeded case that forges the wrapper record, in a file with no marker', (context) => {
  const meta = context.task.meta as Record<string, unknown>;
  meta['sovitechPending'] = { caseId: 'G1-10', feature: 'derive', phase: 1 };
  context.skip('pending: no automated check yet (derive is not implemented; phase 1)');
});
