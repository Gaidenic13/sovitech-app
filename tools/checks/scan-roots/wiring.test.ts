/**
 * The checks that scan folders read the shared scan-roots list (roots.json;
 * phase 0 review, round 2, adversarial finding 13), so a folder the list adds for
 * a scan is read by that scan without a change in the check: the reserved-term
 * and figure scopes hold every glob the list names for them, the lint bans read
 * the list's lint-bans roots, and the config-exclusion check inspects the
 * dependency-cruiser roots `pnpm lint:deps` takes from the list.
 */
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LISTED_DEPCRUISE_SCRIPT, repositoryTargets } from '../config-exclusion/discover';
import { inspectAll } from '../config-exclusion/inspect';
import { repoRoot } from '../lib';
import { BAN_ROOTS } from '../lint-bans/lint-bans';
import { SCOPE } from '../mockup-figures/figures';
import { PHASE_0_SCOPE } from '../reserved-terms/scan';
import { LIST_PATH, loadScanRoots, scanGlobs, topLevelRoots } from './roots';

describe('scan-roots wiring: the checks read the shared list', () => {
  it('the reserved-term scope holds every glob the list names for the reserved-term scan', () => {
    const scope = new Set<string>([...PHASE_0_SCOPE.include, ...PHASE_0_SCOPE.optional]);
    for (const glob of scanGlobs('reserved-terms')) expect(scope.has(glob), glob).toBe(true);
  });

  it('the mockup-figure scope, which the company-figure check shares, holds every glob the list names for the figure scan', () => {
    const scope = new Set<string>([...SCOPE.required, ...SCOPE.optional]);
    for (const glob of scanGlobs('mockup-figures')) expect(scope.has(glob), glob).toBe(true);
    expect(readFileSync(join(repoRoot, 'tools/checks/company-figures/check.ts'), 'utf8')).toMatch(/scope:\s*SCOPE\b/);
  });

  it('the lint bans read the list\'s lint-bans roots', () => {
    expect([...BAN_ROOTS]).toEqual(topLevelRoots('lint-bans'));
  });

  it('the config-exclusion check inspects the dependency-cruiser roots lint:deps takes from the list', async () => {
    const targets = await repositoryTargets(repoRoot);
    expect(targets.depcruise?.scripts[LISTED_DEPCRUISE_SCRIPT]).toBe(
      ['depcruise', '--config', '.dependency-cruiser.cjs', ...topLevelRoots('lint:deps')].join(' '),
    );
  }, 60_000);

  it('the config-exclusion check fails a list that would have lint:deps cruise company/', async () => {
    const scratch = mkdtempSync(join(tmpdir(), 'sovitech-scan-roots-wiring-'));
    try {
      cpSync(join(repoRoot, '.dependency-cruiser.cjs'), join(scratch, '.dependency-cruiser.cjs'));
      const list = loadScanRoots();
      const bad = { ...list, topLevel: { ...list.topLevel, company: { scans: ['lint:deps'], ci: false } } };
      mkdirSync(join(scratch, 'tools/checks/scan-roots'), { recursive: true });
      writeFileSync(join(scratch, LIST_PATH), JSON.stringify(bad));
      const report = await inspectAll(await repositoryTargets(scratch));
      expect(report.problems.some((problem) => problem.includes(LISTED_DEPCRUISE_SCRIPT) && problem.includes('company/'))).toBe(true);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  }, 60_000);
});
