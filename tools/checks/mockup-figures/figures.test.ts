import { describe, expect, it } from 'vitest';
import { BAD_CASES, GOOD_CASE, runCase, runRealListCase } from './cases';
import { findFigures, parseList, readingsOf, type FigureEntry } from './figures';

const values = (token: string): string[] => readingsOf(token).map((value) => value.toString()).sort();

describe('number readings', () => {
  it('reads plain, English, Romanian, space and underscore grouping', () => {
    expect(values('34500')).toEqual(['34500']);
    expect(values('34,500')).toEqual(['34.5', '34500']);
    expect(values('34.500')).toEqual(['34.5', '34500']);
    expect(values('1,280,000.50')).toEqual(['1280000.5']);
    expect(values('1.280.000,5')).toEqual(['1280000.5']);
    expect(values('34 500')).toEqual(['34', '34500', '500']);
    expect(values('1_280_000')).toEqual(['1280000']);
  });

  it('gives no reading for dates, versions and other dotted strings', () => {
    expect(values('17.09.2025')).toEqual([]);
    expect(values('1.2.3')).toEqual([]);
  });
});

/** Entries of a TEST list. Its spec does not exist here, so the only problems are the missing source files. */
function entries(list: string): FigureEntry[] {
  const parsed = parseList(list, 'TEST list', '/nonexistent');
  expect(parsed.problems.every((problem) => problem.includes('does not exist'))).toBe(true);
  return [...parsed.entries];
}

describe('finding figures', () => {
  const list = [
    'number | 98,765 | design/t.md:1',
    'number | €2,750,000 | design/t.md:1',
    'quantity | 8.3 years | design/t.md:1',
    'quantity | €47 / m² | design/t.md:1',
    'text | Hotel Nowhere Testville | design/t.md:1',
    'text | 7Q + GF + 3 | design/t.md:1',
  ].join('\n');
  const found = (text: string, path = 'a.ts'): string[] => findFigures(path, text, entries(list)).map((hit) => `${hit.entry.figure}=${hit.text}`);

  it('finds a number in any format and scale', () => {
    expect(found("'98.765'")).toEqual(['98,765=98.765']);
    expect(found('98_765')).toEqual(['98,765=98_765']);
    expect(found('98 765 m²')).toEqual(['98,765=98 765']);
    expect(found('€2.75M')).toEqual(['€2,750,000=2.75M']);
    expect(found('2,75 mil. EUR')).toEqual(['€2,750,000=2,75 mil.']);
    expect(found('2750k')).toEqual(['€2,750,000=2750k']);
  });

  it('finds a quantity only with its unit, in its usual spellings', () => {
    expect(found('8,3 ani')).toEqual(['8.3 years=8,3 ani']);
    expect(found('payback 8.3 yrs')).toEqual(['8.3 years=8.3 yrs']);
    expect(found('8.3 metres')).toEqual([]);
    expect(found('47 €/mp')).toEqual(['€47 / m²=47 €/mp']);
    expect(found('47 points')).toEqual([]);
  });

  it('finds text ignoring case, diacritics and spacing, with digit edges kept', () => {
    expect(found('HOTEL  NOWHERE TESTVILLE')).toEqual(['Hotel Nowhere Testville=hotel  nowhere testville']);
    expect(found('7Q+GF+3')).toEqual(['7Q + GF + 3=7q+gf+3']);
    expect(found('7Q + GF + 31')).toEqual([]);
    expect(found('17Q + GF + 3')).toEqual([]);
  });

  it('skips numbers inside identifiers, hex strings and SVG geometry', () => {
    expect(found('id_98765 a98765 98765abc G98-765')).toEqual([]);
    expect(found('<path d="M98765 0"/>', 'icon.svg')).toEqual([]);
    expect(found('<text>98765</text>', 'icon.svg')).toEqual(['98,765=98765']);
  });
});

describe('the list', () => {
  it('reads entries with trailing notes and rejects malformed ones', () => {
    const parsed = parseList('# comment\nnumber | 98,765 | x.md:1  # TEST note\nnumber | 12 | x.md:1\n', 'TEST list', '/nonexistent');
    expect(parsed.entries.map((entry) => entry.figure)).toEqual(['98,765']);
    expect(parsed.problems.some((problem) => problem.includes('fewer than 3 digits'))).toBe(true);
  });

  it('fails with no entries', () => {
    expect(parseList('# only comments\n', 'TEST list', '/nonexistent').problems).toEqual(['TEST list: no entries; the check has nothing to look for']);
  });
});

describe('mockup-figures check on seeded inputs', () => {
  it('passes the seeded good input (near misses, case folders, SVG geometry)', async () => {
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

  it('finds every entry of the real list when it is planted', async () => {
    const result = await runRealListCase();
    expect(result.ok).toBe(false);
    expect(result.summary).toContain('real entries found');
  });
});
