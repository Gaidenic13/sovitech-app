import { spawnSync } from 'node:child_process';
import { expect, test } from 'vitest';

// Seeded (phase 0 review, round 2 residual): the case runs the code under test in a child
// Node process and asserts only on the exit status. A stub reached there throws where the
// stub guard cannot count it, so the case would pass against an unbuilt stub.
test('G1-2 · seeded case: TEST verdict computed in a child process', () => {
  const child = spawnSync(process.execPath, ['--import', 'tsx', '-e', "import('@sovitech/domain').then((m) => m.verifyProposal())"]);
  expect(child.status).not.toBe(0);
});
