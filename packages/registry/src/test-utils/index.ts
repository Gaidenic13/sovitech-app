/**
 * @sovitech/registry/test-utils: the only place a gate can be opened, for the
 * proposed-behaviour suite. dependency-cruiser forbids reaching this entry,
 * through any chain of imports, from anywhere except tests/proposed/ (prompt 3
 * section 5.4).
 *
 * An override opens a gate on a new, in-memory source of kind 'test-override'.
 * It writes no file, leaves the production source as it is, and is never a
 * production source: isProductionSource() and isStartupCheckedSource() are
 * false for it, so the API refuses it. It exists only inside the tests/proposed/
 * runner: the gate source module refuses to issue or read one unless the
 * runner's setup file (./proposed-runner-setup.ts, registered in
 * vitest.proposed.config.ts) armed it for the test file that runs now. No
 * environment variable arms it.
 */
import { productionGateSource, type GateId, type GateSource } from '../gates';
import { issueTestOverrideSource } from '../gates/source';

/** A new test source equal to `base` (the production source by default) with the gate `id` open. */
export function openGateForTest(id: GateId, base: GateSource = productionGateSource()): GateSource {
  return issueTestOverrideSource(base, id);
}
