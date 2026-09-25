// Seeded runtime probe (synthetic), run by ../../selftest.ts with tsx in a plain Node
// process, VITEST=true in its environment: a production context.
//
// Phase 0 review, round 2: a computed dynamic import reached issueTestOverrideSource
// outside Vitest, and readGate(source, 'ifc-values').open was true, because readGate
// did not check the source kind and the only barrier was the VITEST variable in the
// test-utils entry. Each attempt below must now be refused.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '..');
const attempts: Array<{ attempt: string; outcome: string }> = [];

async function attempt(name: string, run: () => Promise<string> | string): Promise<void> {
  try {
    attempts.push({ attempt: name, outcome: await run() });
  } catch (error) {
    attempts.push({ attempt: name, outcome: `refused: ${error instanceof Error ? error.message : String(error)}` });
  }
}

// The verifier's probe: a computed dynamic import, which dependency-cruiser cannot see.
const dir = join(ROOT, 'packages', 'registry', 'src', 'gates');
const source = await import(join(dir, 'source' + '.ts'));

await attempt('issueTestOverrideSource through a computed import, then readGate', () => {
  const override = source.issueTestOverrideSource(source.productionGateSource(), 'ifc-values');
  return `the gate reads ${source.readGate(override, 'ifc-values').open ? 'open' : 'closed'}`;
});

await attempt('armTestOverridesForProposedRunner in a plain Node process', () => {
  source.armTestOverridesForProposedRunner();
  return 'armed';
});

await attempt('openGateForTest through the test-utils entry', async () => {
  const testUtils = await import(join(ROOT, 'packages', 'registry', 'src', 'test-utils', 'index.ts'));
  const override = testUtils.openGateForTest('ifc-values');
  return `the gate reads ${source.readGate(override, 'ifc-values').open ? 'open' : 'closed'}`;
});

// A test-override source that outlives its runner (issued while a tests/proposed/
// runner was active, simulated here), then read in a production context.
await attempt('readGate on a test-override source after its runner ended', () => {
  const worker = {
    filepath: join(ROOT, 'tests', 'proposed', 'seeded-probe.test.ts'),
    config: { root: ROOT, setupFiles: [source.PROPOSED_RUNNER_SETUP_FILE] },
  };
  Reflect.set(globalThis, '__vitest_worker__', worker);
  let override: unknown;
  try {
    source.armTestOverridesForProposedRunner();
    override = source.issueTestOverrideSource(source.productionGateSource(), 'ifc-values');
  } finally {
    Reflect.deleteProperty(globalThis, '__vitest_worker__');
  }
  return `setup got a source, and the gate reads ${source.readGate(override, 'ifc-values').open ? 'open' : 'closed'} after the runner ended`;
});

console.log(JSON.stringify({ attempts }));
