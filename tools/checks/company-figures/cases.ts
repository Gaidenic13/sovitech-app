/**
 * The seeded inputs of the company-figure check, shared by selftest.ts and the
 * unit tests. Each static case is a tree under seeded/<id>/ scanned against the
 * synthetic TEST list in seeded/_shared/ (TEST figures and TEST product names;
 * its company/ sources are never read, as for the real list). One more case is
 * built at run time: every entry of the real list, planted in a temporary tree
 * outside the repository, must be found. It proves that each real entry is
 * detectable without committing a second copy of the company figures or the
 * SAUTER product names.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from '../lib';
import { SCOPE, parseList, type FigureEntry } from '../mockup-figures/figures';
import type { CheckResult } from '../types';
import { LIST_NAME } from './check';
import { COMPANY_LIST_SYNTAX, checkCompanyFigures } from './company';

const SEEDED = join(dirname(fileURLToPath(import.meta.url)), 'seeded');
const SHARED = join(SEEDED, '_shared');

export interface SeededCase {
  readonly id: string;
  /** Text the findings of a bad case must contain, so it fails for the reason it was seeded for. */
  readonly expect: readonly string[];
  /** Text the findings must not contain. */
  readonly notExpect?: readonly string[];
  /** The case's own list, relative to seeded/<id>/, instead of the shared TEST list. */
  readonly list?: string;
}

export const GOOD_CASE: SeededCase = { id: 'good', expect: [] };

export const BAD_CASES: readonly SeededCase[] = [
  {
    id: 'bad-product-name',
    expect: [
      'apps/web/src/Controllers.tsx:2: SAUTER product name "ZQX 987" (company/products/TEST-catalogue.json:3) as "zqx-987"',
      'apps/web/src/Controllers.tsx:3: SAUTER product name "zetaLine" (company/products/TEST-catalogue.json:5) as "zetaline"',
      'apps/web/src/Controllers.tsx:4: SAUTER product name "TESTLINE 5" (company/products/TEST-catalogue.json:6) as "testline5"',
      'packages/engine/src/catalogue.ts:2: SAUTER product name "QZT987F001" (company/products/TEST-catalogue.json:4) as "qzt 987 f001"',
      'while gate dataset-sauter-catalogue is closed, no SAUTER product line, product or model name appears anywhere',
    ],
  },
  {
    id: 'bad-company-figure',
    expect: [
      'packages/engine/src/defaults.ts:2: company figure "97,531" (company/business/TEST-profile.md:2) as "97.531"',
      'packages/engine/src/defaults.ts:3: company figure "7.9 years" (company/business/TEST-profile.md:3) as "7,9 ani"',
      'packages/engine/src/defaults.ts:4: company figure "17 EUR/m²" (company/business/TEST-pricing.md:2) as "17 EUR/mp"',
      'packages/engine/src/defaults.ts:5: company figure "40+ TEST proiecte"',
      'website marketing copy from company/, never an app value (rule 1, G1-12; prompt 3 section 7)',
    ],
  },
  {
    id: 'bad-extractor-hit',
    expect: [
      'services/extractor/src/sovitech_extractor/names.py:3: SAUTER product name "ZQX 987"',
      'services/extractor/src/sovitech_extractor/names.py:4: company figure "97,531"',
    ],
  },
  {
    id: 'bad-seed-and-fixture',
    expect: ['seeds/demo-project.json:1: SAUTER product name "zetaLine"', 'fixtures/demo/answers.json:1: company figure "17 EUR/m²"'],
    notExpect: ['fixtures/evals/G1-3/', 'tests/guardrails/'],
  },
  {
    id: 'bad-list-malformed',
    list: 'company-figures.txt',
    expect: [
      'company-figures.txt:2: kind "brand" is not number, quantity, text or product',
      'company-figures.txt:3: source "design/test-spec.md:4" is not "company/<file>:<line>"',
      'company-figures.txt:4: the product name "Q7" has fewer than 3 letters and digits',
      'company-figures.txt:5: the product name "ZQX" is a short letter code',
      'company-figures.txt:6: an entry is "kind | figure | spec file:line"',
      'company-figures.txt:8: the same figure as line 7',
    ],
  },
  { id: 'bad-list-empty', list: 'company-figures.txt', expect: ['company-figures.txt: no entries'] },
  { id: 'bad-list-missing', list: 'absent-list.txt', expect: ['absent-list.txt is missing'] },
  {
    id: 'bad-empty-scope',
    expect: [
      'scan root "apps/**" matches no file',
      'scan root "packages/*/src/**" matches no file',
      'scan root "services/extractor/src/**" matches no file',
      '0 files were read',
    ],
  },
];

/** Runs the check on one seeded tree, with the real scope. */
export function runCase(seededCase: SeededCase): Promise<CheckResult> {
  const root = join(SEEDED, seededCase.id);
  const listFile = seededCase.list === undefined ? join(SHARED, 'company-figures.txt') : join(root, seededCase.list);
  return checkCompanyFigures({
    root,
    listFile,
    listName: seededCase.list ?? 'seeded/_shared/company-figures.txt',
    specRoot: SHARED,
    scope: SCOPE,
    label: seededCase.id,
  });
}

/** A product name written another way: upper case, letter and digit groups run together, other neighbours joined by a hyphen ("EY-RU 310" as "EY-RU310"). */
function squeezed(groups: readonly string[]): string {
  return groups
    .map((group, index) => {
      const previous = groups[index - 1];
      const sameKind = previous !== undefined && /^\p{N}/u.test(previous) === /^\p{N}/u.test(group);
      return `${sameKind ? '-' : ''}${group.toUpperCase()}`;
    })
    .join('');
}

/** How an entry of the real list is written into the planted tree: as listed, and for numbers also in Romanian format, for product names also squeezed. */
function plantings(entry: FigureEntry): string[] {
  if (entry.kind === 'product') {
    const other = squeezed(entry.productGroups ?? []);
    return other === entry.figure ? [entry.figure] : [entry.figure, other];
  }
  if (entry.kind !== 'number' || entry.value === undefined) return [entry.figure];
  const [whole = '', fraction] = entry.value.toFixed().split('.');
  const romanian = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (fraction === undefined ? '' : `,${fraction}`);
  return [entry.figure, romanian];
}

export const REAL_LIST_CASE_ID = 'real-list-every-entry-found';

/**
 * Plants every entry of the real list in a temporary tree (one entry per line,
 * in apps/, a package and the extractor) and runs the check with the real
 * list: each entry, in each planting, must be found on its own line. The
 * result fails (as a seeded bad input must); it is turned into a pass when any
 * planting is missed, so the self-test flags an entry the check cannot find.
 */
export async function runRealListCase(): Promise<CheckResult> {
  const listFile = join(repoRoot, LIST_NAME);
  const parsed = parseList(readFileSync(listFile, 'utf8'), LIST_NAME, repoRoot, COMPANY_LIST_SYNTAX);
  const lines: Array<{ entry: FigureEntry; text: string }> = [];
  for (const entry of parsed.entries) for (const text of plantings(entry)) lines.push({ entry, text });
  const root = mkdtempSync(join(tmpdir(), 'sovitech-company-figures-'));
  try {
    const body = lines.map((line) => `// TEST planting\n${JSON.stringify(line.text)};`).join('\n');
    const planted = ['apps/web/src/planted.ts', 'packages/planted/src/planted.ts', 'services/extractor/src/planted.py'];
    for (const path of planted) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), `${body}\n`);
    }
    const result = await checkCompanyFigures({ root, listFile, listName: LIST_NAME, specRoot: repoRoot, scope: SCOPE, label: REAL_LIST_CASE_ID });
    const details = result.details.join('\n');
    const missed = planted.flatMap((path) =>
      lines.filter((line, index) => !details.includes(`${path}:${index * 2 + 2}: ${line.entry.kind === 'product' ? 'SAUTER product name' : 'company figure'} "${line.entry.figure}" (${line.entry.source})`)),
    );
    if (parsed.problems.length > 0 || parsed.entries.length === 0 || missed.length > 0) {
      const why = [...parsed.problems, ...missed.map((line) => `not found: ${line.entry.kind} "${line.entry.figure}" planted as ${JSON.stringify(line.text)}`)];
      return { ...result, ok: true, summary: `${result.summary}; but the real list is not fully detectable`, details: why };
    }
    return { ...result, summary: `${result.summary}; all ${parsed.entries.length} real entries found in ${lines.length} plantings` };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

/**
 * A bad case that fails without its expected finding, or with a finding it
 * must not have, failed for another reason; it is returned as passing so the
 * self-test run flags it.
 */
export function asSeededResult(seededCase: SeededCase, result: CheckResult): CheckResult {
  const details = result.details.join('\n');
  const missing = seededCase.expect.filter((text) => !details.includes(text));
  const unwanted = (seededCase.notExpect ?? []).filter((text) => details.includes(text));
  if (result.ok || (missing.length === 0 && unwanted.length === 0)) return result;
  return {
    ...result,
    ok: true,
    summary: `${result.summary}; but not for the seeded reason (missing: ${missing.join(', ') || 'none'}; unwanted: ${unwanted.join(', ') || 'none'})`,
  };
}
