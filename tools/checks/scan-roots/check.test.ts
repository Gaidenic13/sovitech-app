/**
 * The scan-roots check (phase 0 review round 2, adversarial finding 13): the
 * repository and the good seeded tree pass, every seeded bad case fails with the
 * id its name gives, and the list's readers agree with it.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { depcruiseTargets } from '../../eslint-rules/depcruise-harness';
import { repoRoot } from '../lib';
import check from './check';
import { listProblems, loadScanRoots, scanGlobs, topLevelRoots, type ScanRootsList } from './roots';
import { LINT_DEPS_SCRIPT, scanRootProblems } from './scan-roots';
import selfTest, { badCases, runGood, runSeeded, seededId } from './selftest';

describe('scan-roots check', { timeout: 60_000 }, () => {
  it('passes on this repository', async () => {
    const result = await check();
    expect(result.details).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('passes the good seeded tree', () => {
    expect(runGood().problems).toEqual([]);
  });

  it.each(badCases())('fails the seeded case %s with the id its name gives', (name) => {
    const outcome = runSeeded(name);
    expect(outcome.problems.some((problem) => problem.includes(` ${seededId(name)}: `)), outcome.problems.join('\n')).toBe(true);
  });

  it('names the folder at fault', () => {
    expect(runSeeded('unlisted--scripts-folder-for-a-demo-seed').problems).toEqual([expect.stringMatching(/^scripts\/: scan-roots\/unlisted: /)]);
    expect(runSeeded('unlisted--scripts-folder-in-a-package').problems).toEqual([
      expect.stringMatching(/^packages\/db\/scripts\/: scan-roots\/unlisted: /),
    ]);
    expect(runSeeded('unlisted--scripts-folder-in-a-service').problems).toEqual([
      expect.stringMatching(/^services\/extractor\/scripts\/: scan-roots\/unlisted: /),
    ]);
  });

  it('self-test: every seeded case fails, as run-all requires', async () => {
    const results = await selfTest();
    const list = Array.isArray(results) ? results : [results];
    expect(list).toHaveLength(badCases().length);
    expect(list.filter((result) => result.ok).map((result) => result.summary)).toEqual([]);
  });
});

describe('the list', () => {
  const list = loadScanRoots();

  it('is well formed', () => {
    expect(listProblems(list)).toEqual([]);
  });

  it('keeps company/ out of every scan and out of CI (build-readiness decision 12)', () => {
    expect(list.topLevel['company']).toEqual(expect.objectContaining({ ci: false }));
    expect(Object.values(list.scans).length).toBeGreaterThan(0);
    for (const scan of ['lint:deps', 'lint-bans', 'reserved-terms', 'mockup-figures', 'python-bans', 'ruff-pytest'] as const) {
      expect(topLevelRoots(scan, list)).not.toContain('company');
      expect(scanGlobs(scan, list).some((glob) => glob.startsWith('company'))).toBe(false);
    }
  });

  it('rejects an entry that is both scanned and excluded, or neither', () => {
    const broken = structuredClone(list) as ScanRootsList;
    broken.topLevel['scripts'] = { scans: ['lint:deps'], excluded: 'both at once', ci: true } as never;
    broken.topLevel['seeds'] = { ci: true } as never;
    expect(listProblems(broken)).toEqual([
      expect.stringContaining('topLevel.scripts: give either "scans" or "excluded", not both'),
      expect.stringContaining('topLevel.seeds: give either "scans" or "excluded", not neither'),
    ]);
  });

  it('rejects a subfolder scan its top-level folder does not name', () => {
    const broken = structuredClone(list) as ScanRootsList;
    broken.serviceSubfolders['src'] = { scans: ['python-bans', 'lint-bans'] };
    expect(listProblems(broken)).toEqual([expect.stringContaining('serviceSubfolders.src names "lint-bans", which topLevel.services does not')]);
  });

  it('gives each scan the globs the checks that take globs should read', () => {
    expect(scanGlobs('reserved-terms', list)).toEqual([
      'apps/**',
      'packages/*/src/**',
      'packages/*/seed/**',
      'packages/*/seeds/**',
      'packages/*/migrations/**',
      'packages/*/templates/**',
    ]);
    expect(scanGlobs('mockup-figures', list)).toEqual([
      'apps/**',
      'packages/*/src/**',
      'packages/*/test-formulas/**',
      'packages/*/seed/**',
      'packages/*/seeds/**',
      'packages/*/migrations/**',
      'packages/*/templates/**',
      'fixtures/**',
      'services/*/src/**',
      'services/*/schemas/**',
    ]);
    expect(scanGlobs('python-bans', list)).toEqual(['services/*/src/**']);
  });
});

describe('the readers of the list', () => {
  it('pnpm lint:deps runs the wrapper that cruises the lint:deps roots', () => {
    const manifest = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')) as { scripts: Record<string, string> };
    expect(manifest.scripts['lint:deps']).toBe(LINT_DEPS_SCRIPT);
    expect(topLevelRoots('lint:deps')).toEqual(['apps', 'packages', 'tools', 'tests', 'evals', 'fixtures']);
  });

  it('the lint-bans boundary run cruises the same roots', () => {
    expect(depcruiseTargets()).toEqual(topLevelRoots('lint:deps'));
  });

  it('a folder named like an Object property is still unlisted', () => {
    const outcome = scanRootProblems(join(repoRoot, 'tools', 'checks', 'scan-roots', 'seeded', 'good'), {
      ...loadScanRoots(),
      topLevel: Object.create({ apps: { scans: ['lint:deps'], ci: true } }) as ScanRootsList['topLevel'],
    });
    expect(outcome.problems.some((problem) => problem.startsWith('apps/: scan-roots/unlisted: '))).toBe(true);
  });
});
