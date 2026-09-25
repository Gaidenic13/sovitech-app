/**
 * The package boundaries in .dependency-cruiser.cjs (prompt 3 section 6,
 * "Boundaries"), proven on seeded imports: each seeded file under
 * fixtures/seeded/depcruise/ violates the rules expectations.json names, and
 * the allowed imports violate none.
 *
 * The gate-boundary seeds in tools/checks/loosening/seeded/boundary-imports/
 * (same format), added after the phase 0 review, prove
 * package-internals-only-through-exports. They are cruised by
 * tools/checks/loosening/boundary-seeds.test.ts and the lint-bans self-test; the
 * "every rule" test below counts them as proof.
 */
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { loadBoundaryExpectations } from '../checks/loosening/boundary-seeds';
import {
  cruise,
  cruiseFixture,
  depcruiseTargets,
  loadExpectations,
  repoRoot,
  rulesByFile,
} from './depcruise-harness';

const require = createRequire(import.meta.url);
const config = require('../../.dependency-cruiser.cjs') as { forbidden: Array<{ name: string }> };

describe('dependency-cruiser boundaries', () => {
  it('flags every seeded bad import with the expected rules, and nothing else', { timeout: 120_000 }, async () => {
    const expectations = loadExpectations();
    const outcome = await cruiseFixture();
    const actual = rulesByFile(outcome.violations);

    for (const [file, rules] of Object.entries(expectations)) {
      expect(outcome.modules, `${file} was not cruised`).toContain(file);
      expect(actual.get(file) ?? [], file).toEqual(rules);
    }
    const unexpected = [...actual.keys()].filter((file) => !(file in expectations));
    expect(unexpected, 'violations in files the expectations do not list').toEqual([]);
  });

  it('proves every forbidden rule with at least one seeded import', () => {
    const proven = new Set([
      ...Object.values(loadExpectations()).flat(),
      ...Object.values(loadBoundaryExpectations().files).flat(),
    ]);
    for (const rule of config.forbidden) expect(proven, rule.name).toContain(rule.name);
  });

  it('keeps seeded inputs out of the real run', { timeout: 120_000 }, async () => {
    const outcome = await cruise(repoRoot, depcruiseTargets());
    const seeded = outcome.modules.filter(
      (path) => /(^|\/)seeded\//.test(path) || path.startsWith('tools/eslint-rules/fixtures/'),
    );
    expect(seeded).toEqual([]);
    expect(outcome.modules.some((path) => path.startsWith('company/'))).toBe(false);
  });
});
