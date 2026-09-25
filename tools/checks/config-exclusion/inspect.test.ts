import { describe, expect, it } from 'vitest';
import { repoRoot } from '../lib';
import { BAD_CASES, GOOD_CASE, runCase } from './cases';
import { repositoryTargets } from './discover';
import { listOf, parseIni, parseTomlSubset } from './ini';
import { inspectAll } from './inspect';
import { cleanPattern, matches, resolveFrom } from './paths';

describe('paths and globs', () => {
  it('treats a plain pattern as a file or a folder', () => {
    expect(matches('company/website/src/index.ts', 'company')).toBe(true);
    expect(matches('company/website/src/index.ts', './company/')).toBe(true);
    expect(matches('companyx/a.ts', 'company')).toBe(false);
    expect(matches('company/a.ts', '')).toBe(true);
  });

  it('matches globs, and lets "dir/**" name the folder itself', () => {
    expect(matches('company/a/b.ts', '**/*')).toBe(true);
    expect(matches('company/a/b.ts', 'apps/**')).toBe(false);
    expect(matches('company', 'company/**')).toBe(true);
  });

  it('resolves patterns against the folder of the config that holds them', () => {
    expect(resolveFrom('apps/web', '../../**/*.ts')).toBe('**/*.ts');
    expect(resolveFrom('apps/web', '../../company/src')).toBe('company/src');
    expect(resolveFrom('apps/web', '../../../elsewhere')).toBeUndefined();
    expect(resolveFrom('', './')).toBe('');
    expect(resolveFrom('', '/abs/repo/company/x', '/abs/repo')).toBe('company/x');
    expect(cleanPattern('./././tests/')).toBe('tests');
  });
});

describe('TOML and INI subsets', () => {
  it('reads tables, dotted keys and multi-line arrays, ignoring comments', () => {
    const toml = [
      '[tool.ruff]',
      'line-length = 100',
      '# company is never an input',
      'extend-exclude = ["company", # the website snapshot',
      '  ".venv"]',
      'lint.select = ["E"]',
      '[tool.pytest.ini_options]',
      'testpaths = ["tests"]',
    ].join('\n');
    const tables = parseTomlSubset(toml);
    expect(tables['tool.ruff']).toEqual({ 'line-length': 100, 'extend-exclude': ['company', '.venv'] });
    expect(tables['tool.ruff.lint']).toEqual({ select: ['E'] });
    expect(listOf(tables['tool.pytest.ini_options']?.['testpaths'])).toEqual(['tests']);
  });

  it('reads INI sections with continued values', () => {
    const ini = '[pytest]\ntestpaths =\n    tests\n    more\nnorecursedirs = company .venv\n';
    const sections = parseIni(ini);
    expect(listOf(sections['pytest']?.['testpaths'])).toEqual(['tests', 'more']);
    expect(listOf(sections['pytest']?.['norecursedirs'])).toEqual(['company', '.venv']);
  });
});

// These tests import the repository's Vitest, Playwright and ESLint configs; under a full
// parallel `pnpm test` run that takes longer than Vitest's 5 s default.
describe('config-exclusion check', { timeout: 60_000 }, () => {
  it('passes on this repository', async () => {
    const report = await inspectAll(await repositoryTargets(repoRoot));
    expect(report.problems).toEqual([]);
    expect(report.inspected.length).toBeGreaterThan(5);
  });

  it('passes the seeded good input', async () => {
    const result = await runCase(GOOD_CASE);
    expect(result.details.filter((line) => !line.startsWith('note:') && !line.startsWith('inspected:'))).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it.each(BAD_CASES.map((badCase) => [badCase.id, badCase] as const))('fails %s', async (_id, badCase) => {
    const result = await runCase(badCase);
    expect(result.ok).toBe(false);
    for (const expected of badCase.expect) expect(result.details.join('\n')).toContain(expected);
  });
});
