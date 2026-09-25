/**
 * The gate boundaries, proven on the seeded imports in seeded/boundary-imports/.
 *
 * - Phase 0 review: a gate could be opened by a relative import of
 *   packages/registry/src/gates/source.ts, from apps/api or from
 *   tests/guardrails/_support, and no dependency-cruiser rule refused it
 *   (package-internals-only-through-exports).
 * - Round 2: apps/api and an indexed case reached the test-utils entry through
 *   a tests/proposed/ helper, which the direct-import rule let through
 *   (gate-test-utils-only-from-proposed is now `reachable`;
 *   proposed-tests-only-from-proposed and no-tests-from-apps-or-packages are new).
 *
 * Each earlier configuration is rebuilt from the repository's one, and must let
 * its probes through, so the seeds show what each fix closed.
 */
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { cruiseBoundarySeeds, loadBoundaryExpectations } from './boundary-seeds';

const require = createRequire(import.meta.url);
const config = require('../../../.dependency-cruiser.cjs') as {
  forbidden: Array<{ name: string; to: { reachable?: boolean } }>;
};

const GATE_RULES = [
  'package-internals-only-through-exports',
  'gate-test-utils-only-from-proposed',
  'proposed-tests-only-from-proposed',
  'no-tests-from-apps-or-packages',
];

describe('seeded boundary imports (a gate opened by import)', () => {
  const expectations = loadBoundaryExpectations();

  it('flags every seeded bad import with exactly the expected rules, and passes the allowed ones', { timeout: 120_000 }, async () => {
    const outcome = await cruiseBoundarySeeds();
    for (const [file, rules] of Object.entries(expectations.files)) {
      expect(outcome.modules, `${file} was not cruised`).toContain(file);
      expect(outcome.rulesByFile.get(file) ?? [], file).toEqual(rules);
    }
    const unexpected = [...outcome.rulesByFile.keys()].filter((file) => !(file in expectations.files));
    expect(unexpected, 'violations in files the expectations do not list').toEqual([]);
  });

  it.each(expectations.before.map((item, index) => [index, item] as const))(
    'was let through before fix %i: the earlier configuration flags none of its probes',
    { timeout: 120_000 },
    async (_index, before) => {
      const outcome = await cruiseBoundarySeeds({ before });
      expect(before.letThrough.length).toBeGreaterThan(0);
      for (const file of before.letThrough) {
        expect(outcome.modules, `${file} was not cruised`).toContain(file);
        expect(outcome.rulesByFile.get(file) ?? [], file).toEqual([]);
        // Each probe fails the repository's configuration.
        expect(expectations.files[file]?.length, file).toBeGreaterThan(0);
      }
    },
  );

  it('proves every gate rule with seeds, and every one is in the repository configuration', () => {
    const proven = new Set(Object.values(expectations.files).flat());
    for (const rule of GATE_RULES) {
      expect(proven, rule).toContain(rule);
      expect(config.forbidden.map((item) => item.name), rule).toContain(rule);
    }
  });

  it('keeps the test-utils rule reachable through any chain (round 2)', () => {
    const rule = config.forbidden.find((item) => item.name === 'gate-test-utils-only-from-proposed');
    expect(rule?.to.reachable).toBe(true);
  });

  it('seeds the probes the reviews ran', () => {
    expect(expectations.files['apps/api/src/imports-gate-source-deep.ts']).toEqual(['package-internals-only-through-exports']);
    expect(expectations.files['tests/guardrails/_support/imports-gate-source-deep.ts']).toEqual(['package-internals-only-through-exports']);
    expect(expectations.files['apps/api/src/reaches-test-utils-through-proposed.ts']).toContain('gate-test-utils-only-from-proposed');
    expect(expectations.files['tests/guardrails/_support/reaches-test-utils-through-proposed.ts']).toContain('gate-test-utils-only-from-proposed');
  });
});
