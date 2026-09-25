import { Worker } from 'node:worker_threads';
import { expect, test } from 'vitest';

// Seeded (phase 0 review, round 2 residual): the code under test runs in a worker thread,
// whose stub errors the stub guard in this thread cannot count.
test('G1-2 · seeded case: TEST verdict computed in a worker thread', async () => {
  const worker = new Worker("import('@sovitech/domain').then((m) => m.verifyProposal())", { eval: true });
  const code = await new Promise<number>((resolve) => worker.on('exit', resolve));
  expect(code).not.toBe(0);
});
