// Seeded runtime probe (synthetic), run by ../../selftest.ts with tsx in a plain Node
// process, VITEST=true in its environment: a production context.
//
// Phase 0 review, round 2: a computed dynamic import reached issueTestOverrideSource
// outside Vitest, and readGate(source, 'ifc-values').open was true, because readGate
// did not check the source kind and the only barrier was the VITEST variable in the
// test-utils entry. Phase 1 replaced the next barrier, a check of Vitest's worker global
// that code in the same process could forge, with a module-private arming token that
// only the tests/proposed/ runner's setup file takes. Each attempt below must be refused.
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

// The round 2 residual: Vitest's worker state forged in the same process, as the old check read it.
await attempt('armTestOverrides with Vitest\'s worker state forged and no token', () => {
  Reflect.set(globalThis, '__vitest_worker__', {
    filepath: join(ROOT, 'tests', 'proposed', 'seeded-probe.test.ts'),
    config: { root: ROOT, setupFiles: [source.PROPOSED_RUNNER_SETUP_FILE] },
  });
  try {
    source.armTestOverrides(Object.freeze(Object.create(null)));
    return 'armed';
  } finally {
    Reflect.deleteProperty(globalThis, '__vitest_worker__');
  }
});

await attempt('armTestOverrides with an issued source passed as the token', () => {
  source.armTestOverrides(source.productionGateSource());
  return 'armed';
});

await attempt('openGateForTest through the test-utils entry', async () => {
  const testUtils = await import(join(ROOT, 'packages', 'registry', 'src', 'test-utils', 'index.ts'));
  const override = testUtils.openGateForTest('ifc-values');
  return `the gate reads ${source.readGate(override, 'ifc-values').open ? 'open' : 'closed'}`;
});

console.log(JSON.stringify({ attempts }));
