import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../lib';
import { findFigures, parseList, productGroups, type FigureEntry } from '../mockup-figures/figures';
import { BAD_CASES, GOOD_CASE, runCase, runRealListCase } from './cases';
import { LIST_NAME } from './check';
import { COMPANY_LIST_SYNTAX } from './company';

/** Entries of a TEST list; its company/ sources are never read, so it parses with no problems. */
function entries(list: string): FigureEntry[] {
  const parsed = parseList(list, 'TEST list', '/nonexistent', COMPANY_LIST_SYNTAX);
  expect(parsed.problems).toEqual([]);
  return [...parsed.entries];
}

describe('product names', () => {
  const list = [
    'product | ZQX 987 | company/products/TEST.json:1',
    'product | ZQX987F001 | company/products/TEST.json:2',
    'product | zetaLine | company/products/TEST.json:3',
    'product | TESTLINE 5 | company/products/TEST.json:4',
    'product | SAUTER QRS | company/products/TEST.json:5',
  ].join('\n');
  const found = (text: string): string[] => findFigures('a.ts', text, entries(list)).map((hit) => `${hit.entry.figure}=${hit.text}`);

  it('splits a name into its letter and digit groups', () => {
    expect(productGroups('EY-RU 310…316')).toEqual(['ey', 'ru', '310', '316']);
    expect(productGroups('TSHK621F001')).toEqual(['tshk', '621', 'f', '001']);
  });

  it('finds a name with or without separators between its groups, ignoring case', () => {
    expect(found("'ZQX 987'")).toEqual(['ZQX 987=zqx 987']);
    expect(found('zqx-987 zqx987 ZQX / 987')).toEqual(['ZQX 987=zqx-987', 'ZQX 987=zqx987', 'ZQX 987=zqx / 987']);
    expect(found('Built on ZETALINE stations; TestLine-5; sauter qrs')).toEqual(['zetaLine=zetaline', 'TESTLINE 5=testline-5', 'SAUTER QRS=sauter qrs']);
  });

  it('prefers the longest listed name, and lets a letter follow digits', () => {
    expect(found('ZQX987F001')).toEqual(['ZQX987F001=zqx987f001']);
    expect(found('ZQX 987F002')).toEqual(['ZQX 987=zqx 987']);
  });

  it('matches whole groups only: no letter or digit glued to either end, no word run into another', () => {
    expect(found('AZQX 987 ZQX 9870 zetaLines zeta line TESTLINE 50 SAUTER-based sauterqrs')).toEqual([]);
  });
});

describe('the company list syntax', () => {
  it('takes sources under company/ only, and does not read them', () => {
    const parsed = parseList('product | ZQX 987 | design/spec.md:4\nnumber | 97,531 | company/business/absent.md:9\n', 'TEST list', '/nonexistent', COMPANY_LIST_SYNTAX);
    expect(parsed.problems).toEqual(['TEST list:1: source "design/spec.md:4" is not "company/<file>:<line>"']);
    expect(parsed.entries.map((entry) => entry.figure)).toEqual(['97,531']);
  });

  it('refuses product names too short or too common to find', () => {
    const parsed = parseList('product | Q7 | company/x.json:1\nproduct | DSA | company/x.json:2\n', 'TEST list', '/nonexistent', COMPANY_LIST_SYNTAX);
    expect(parsed.problems).toHaveLength(2);
  });
});

describe('the real list', () => {
  it('parses with no problem, and holds figures and product names', () => {
    const parsed = parseList(readFileSync(join(repoRoot, LIST_NAME), 'utf8'), LIST_NAME, repoRoot, COMPANY_LIST_SYNTAX);
    expect(parsed.problems).toEqual([]);
    const products = parsed.entries.filter((entry) => entry.kind === 'product');
    expect(products.length).toBeGreaterThan(800);
    expect(parsed.entries.length - products.length).toBeGreaterThan(50);
    expect(parsed.entries.every((entry) => entry.source.startsWith('company/'))).toBe(true);
  });

  it('finds every entry when it is planted', async () => {
    const result = await runRealListCase();
    expect(result.ok).toBe(false);
    expect(result.summary).toContain('real entries found');
  });
});

describe('company-figures check on seeded inputs', () => {
  it('passes the seeded good input (near misses, case folders, tests)', async () => {
    const result = await runCase(GOOD_CASE);
    expect(result.details).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it.each(BAD_CASES.map((badCase) => [badCase.id, badCase] as const))('fails %s', async (_id, badCase) => {
    const result = await runCase(badCase);
    expect(result.ok).toBe(false);
    for (const expected of badCase.expect) expect(result.details.join('\n')).toContain(expected);
    for (const unexpected of badCase.notExpect ?? []) expect(result.details.join('\n')).not.toContain(unexpected);
  });
});
