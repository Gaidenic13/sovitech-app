/**
 * Setup file of the tests/proposed/ runner (vitest.proposed.config.ts,
 * `setupFiles`). It arms the gate source module for the test file the runner
 * is about to run, and disarms it after that file. Only while armed can the
 * test-utils entry issue a test-override gate source, and only then can
 * readGate read one (prompt 3 section 5.4; phase 0 review, round 2).
 *
 * Arming checks the runner itself (the Vitest worker's current file is under
 * tests/proposed/ and its setup files name this file), so importing this file
 * anywhere else throws. No environment variable plays any part.
 */
import { afterAll } from 'vitest';
import { armTestOverridesForProposedRunner, disarmTestOverrides } from '../gates/source';

armTestOverridesForProposedRunner();
afterAll(() => {
  disarmTestOverrides();
});
