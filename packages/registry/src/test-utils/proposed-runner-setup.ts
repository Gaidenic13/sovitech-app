/**
 * Setup file of the tests/proposed/ runner (vitest.proposed.config.ts,
 * `setupFiles`). It takes the gate source module's arming token when it loads,
 * before the test file it serves, so in this runner no test file or helper can
 * take it after; it arms the module for the test file before that file's tests,
 * and disarms it after them. Only while armed can the test-utils entry issue a
 * test-override gate source, and only in that arming can readGate read one
 * (prompt 3 section 5.4; phase 0 review, round 2; phase 1 replaced the check of
 * Vitest's worker global with the token).
 *
 * Arming also refuses a test file outside tests/proposed/, read from the file
 * task Vitest hands this hook (a misconfigured runner that registers this setup
 * file for another folder fails its files instead of opening gates there). No
 * environment variable plays any part.
 *
 * A gate opened at a test file's top level, while the file is collected, is
 * refused: the module is armed from the file's first hook on.
 */
import { afterAll, beforeAll } from 'vitest';
import { GateApprovalError, armTestOverrides, disarmTestOverrides, takeProposedRunnerToken } from '../gates/source';

const token = takeProposedRunnerToken();

// Vitest reads the first argument of a hook as fixtures, so it is an empty pattern here.
// eslint-disable-next-line no-empty-pattern
beforeAll(({}, suite) => {
  const file = suite.file.name;
  if (!file.startsWith('tests/proposed/') || file.split('/').includes('..')) {
    throw new GateApprovalError(`A gate override is armed only by the tests/proposed/ runner: the test file ${file} is not under tests/proposed/.`);
  }
  armTestOverrides(token);
});

afterAll(() => {
  disarmTestOverrides(token);
});
