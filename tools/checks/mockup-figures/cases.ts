/**
 * The seeded inputs of the mockup-figure check, shared by selftest.ts and the
 * unit tests. Each static case is a tree under seeded/<id>/ that is scanned
 * against the synthetic TEST list in seeded/_shared/ (TEST figures, a TEST
 * hotel name, a TEST spec to trace them to). One more case is built at run
 * time: every entry of the real list, planted in a temporary tree outside the
 * repository, must be found. It proves that each real entry is detectable,
 * without committing a second copy of the mockups' figures or hotel name.
 *
 * The document cases (phase 2 review, adversarial finding 16) write TEST
 * workbooks, PDFs and archives into a temporary copy of the good tree at run
 * time (seeded-documents.ts), because a document-type file may not be
 * committed outside fixtures/.
 */
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from '../lib';
import type { CheckResult } from '../types';
import { LIST_NAME } from './check';
import { SCOPE, checkMockupFigures, parseList, type FigureEntry } from './figures';
import { pdfBytes, textContent, workbookBytes, zipBytes } from './seeded-documents';

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
  /**
   * Files written at run time into a temporary copy of the tree, for inputs that
   * may not sit in the repository (an .svg, a workbook or a PDF would be a
   * document-type file outside its home for the fixture-manifest check).
   */
  readonly extraFiles?: Readonly<Record<string, string | Buffer>>;
  /** The seeded tree the case starts from, when it is not seeded/<id>/ (the document cases start from the good tree). */
  readonly base?: string;
  /** The Python that reads PDF text, instead of the extractor's (the case with no PDF reader). */
  readonly pdfPython?: string;
}

/** A clean TEST workbook and PDF: near misses of the TEST figures, and the scaffolding every such file carries. */
const CLEAN_DOCUMENTS: Readonly<Record<string, Buffer>> = {
  'fixtures/xlsx/TEST-clean.xlsx': workbookBytes('TEST Suprafete', [
    { shared: 'Hotel Somewhere Testville' },
    { number: '98766' },
    { number: '0.1375', style: 1 },
    { number: '611.4', style: 2 },
    { inline: 'Regim 7Q + GF + 31' },
  ]),
  'fixtures/pdf/TEST-clean.pdf': pdfBytes([{ content: textContent(['Suprafata desfasurata: 98.766 mp', 'Camere: 7390', 'Recuperare 8,4 ani']), deflate: true }], {
    Title: 'TEST memoriu (sintetic)',
    Producer: 'TEST seeded-documents.ts',
  }),
};

export const GOOD_CASE: SeededCase = {
  id: 'good',
  expect: [],
  // SVG geometry holds coordinates, not figures; the icon is written at run time. So are the clean workbook and PDF.
  extraFiles: { 'apps/web/src/icon.svg': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 739 98765"><path d="M739 98765L612 9876"/></svg>\n', ...CLEAN_DOCUMENTS },
};

/** A ZIP archive whose one member claims a compression method this reader does not read (12, bzip2). */
function archiveWithMethod12(): Buffer {
  const bytes = zipBytes({ 'notes.txt': 'TEST notes' });
  bytes.writeUInt16LE(12, 8);
  const central = bytes.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  bytes.writeUInt16LE(12, central + 10);
  return bytes;
}

export const BAD_CASES: readonly SeededCase[] = [
  {
    id: 'bad-app-hits',
    expect: [
      'apps/web/src/Summary.tsx:2: mockup figure "98,765" (design/test-spec.md:3) as "98.765"',
      'apps/web/src/Summary.tsx:3: mockup figure "€4,321,987" (design/test-spec.md:4) as "4_321_987"',
      'apps/web/src/Summary.tsx:4: mockup figure "7Q + GF + 3"',
      'apps/web/src/Summary.tsx:5: mockup figure "8.3 years" (design/test-spec.md:4) as "8,3 ani"',
      'apps/web/src/Summary.tsx:6: mockup figure "Hotel Nowhere Testville"',
    ],
  },
  {
    id: 'bad-package-hits',
    expect: [
      'packages/engine/src/defaults.ts:2: mockup figure "13.7%"',
      'packages/engine/src/defaults.ts:3: mockup figure "€2,750,000" (design/test-spec.md:6) as "2.75M"',
      'packages/engine/src/defaults.ts:4: mockup figure "612 kW"',
      'packages/engine/src/defaults.ts:5: mockup figure "9,876 m³/h"',
      'packages/engine/src/defaults.ts:6: mockup figure "€47 / m²"',
    ],
  },
  {
    id: 'bad-seed-hits',
    expect: ['packages/db/seeds/demo.sql:2: mockup figure "739"', 'seeds/demo-project.json:1: mockup figure "Hotel Nowhere Testville"'],
  },
  {
    id: 'bad-fixture-hits',
    expect: [
      'fixtures/demo/demo-answers.json:1: mockup figure "98,765"',
      'fixtures/demo/demo-answers.json:1: mockup figure "€4,321,987" (design/test-spec.md:4) as "4.321.987"',
      'fixtures/generators/make-demo.py:2: mockup figure "98,765"',
      'fixtures/evals/shared-notes.json:1: mockup figure "739"',
    ],
    notExpect: ['fixtures/evals/G4-2/'],
  },
  {
    id: 'bad-list-malformed',
    list: 'mockup-figures.txt',
    expect: [
      'mockup-figures.txt:2: an entry is "kind | figure | spec file:line"',
      'mockup-figures.txt:3: kind "colour" is not number, quantity or text',
      'mockup-figures.txt:4: "98,765" is not on design/test-spec.md:4',
      'mockup-figures.txt:5: source file design/missing-spec.md does not exist',
      'mockup-figures.txt:6: source "design/test-spec.md" is not "<spec>.md:<line>"',
      'mockup-figures.txt:7: "12" has fewer than 3 digits',
      'mockup-figures.txt:8: the quantity "739" has no unit or word',
      'mockup-figures.txt:9: "8.3 years" has words after the number',
      'mockup-figures.txt:10: a text entry needs letters',
      'mockup-figures.txt:12: the same figure as line 11',
    ],
  },
  { id: 'bad-list-empty', list: 'mockup-figures.txt', expect: ['mockup-figures.txt: no entries'] },
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
  // The extractor's sources are in scope since the phase 0 round 2 review (they were not read).
  { id: 'bad-extractor-hits', expect: ['services/extractor/src/sovitech_extractor/defaults.py:3: mockup figure "98,765" (design/test-spec.md:3) as "98765"', 'defaults.py:4: mockup figure "8.3 years"'] },
  // Phase 2 review, adversarial finding 16: a workbook was skipped as binary and a PDF read only as raw bytes,
  // so each of these passed. The raw bytes show none of them (notExpect: no finding on the files' own lines).
  {
    id: 'bad-document-hits',
    base: 'good',
    extraFiles: {
      'fixtures/xlsx/TEST-suprafete.xlsx': workbookBytes('TEST Suprafete', [
        { shared: 'Hotel Nowhere Testville' },
        { number: '98765' },
        { number: '0.137', style: 1 },
        { number: '612.4', style: 2 },
      ]),
      'fixtures/pdf/TEST-memoriu.pdf': pdfBytes([{ content: textContent(['Suprafata desfasurata: 98.765 mp', '[(Regim 7Q + GF )-40(+ 3)]']), deflate: true }], { Title: 'TEST recuperare 8,3 ani' }),
      'fixtures/demo/TEST-anexe.zip': zipBytes({
        'plan/TEST-plan.pdf': pdfBytes([{ content: textContent(['Camere: 739']), deflate: true }]),
        'anexe/TEST-costuri.xlsx': workbookBytes('TEST Costuri', [{ inline: 'Cost 47 €/mp' }]),
      }),
    },
    expect: [
      'fixtures/xlsx/TEST-suprafete.xlsx!xl/sharedStrings.xml:1: mockup figure "Hotel Nowhere Testville" (design/test-spec.md:2)',
      'fixtures/xlsx/TEST-suprafete.xlsx!xl/worksheets/sheet1.xml:2: mockup figure "98,765" (design/test-spec.md:3) as "98765"',
      'fixtures/xlsx/TEST-suprafete.xlsx!xl/worksheets/sheet1.xml (as displayed):1: mockup figure "13.7%" (design/test-spec.md:4) as "13.7%"',
      'fixtures/xlsx/TEST-suprafete.xlsx!xl/worksheets/sheet1.xml (as displayed):2: mockup figure "612 kW" (design/test-spec.md:5) as "612 kW"',
      'fixtures/pdf/TEST-memoriu.pdf#page=1:1: mockup figure "98,765" (design/test-spec.md:3) as "98.765"',
      'fixtures/pdf/TEST-memoriu.pdf#page=1:2: mockup figure "7Q + GF + 3"',
      'fixtures/pdf/TEST-memoriu.pdf#metadata:1: mockup figure "8.3 years" (design/test-spec.md:4) as "8,3 ani"',
      'fixtures/demo/TEST-anexe.zip!plan/TEST-plan.pdf#page=1:1: mockup figure "739"',
      'fixtures/demo/TEST-anexe.zip!anexe/TEST-costuri.xlsx!xl/worksheets/sheet1.xml:1: mockup figure "€47 / m²"',
    ],
    notExpect: ['fixtures/xlsx/TEST-suprafete.xlsx:', 'fixtures/pdf/TEST-memoriu.pdf:', 'fixtures/demo/TEST-anexe.zip:', 'TEST-clean'],
  },
  // A document whose text cannot be read never passes: a damaged PDF, a truncated archive, a member in another compression.
  {
    id: 'bad-document-unreadable',
    base: 'good',
    extraFiles: {
      'fixtures/pdf/TEST-damaged.pdf': Buffer.from('%PDF-1.4\nTEST damaged: no objects, no cross-reference table\n', 'latin1'),
      'fixtures/xlsx/TEST-truncated.xlsx': workbookBytes('TEST', [{ number: '1' }]).subarray(0, 200),
      'fixtures/demo/TEST-method.zip': archiveWithMethod12(),
    },
    expect: [
      'fixtures/pdf/TEST-damaged.pdf: a PDF whose text could not be read: PDFium could not open it',
      'fixtures/xlsx/TEST-truncated.xlsx: not a readable ZIP archive',
      'fixtures/demo/TEST-method.zip!notes.txt: compressed with method 12',
    ],
  },
  // With no PDF reader (no extractor environment), a PDF in scope fails the check instead of passing unread.
  {
    id: 'bad-document-no-pdf-reader',
    base: 'good',
    pdfPython: '/nonexistent/TEST/python',
    extraFiles: { 'fixtures/pdf/TEST-clean.pdf': CLEAN_DOCUMENTS['fixtures/pdf/TEST-clean.pdf'] ?? Buffer.alloc(0) },
    expect: ['fixtures/pdf/TEST-clean.pdf: a PDF whose text could not be read: no extractor environment at /nonexistent/TEST/python'],
  },
];

/** Runs the check on one seeded tree, with the real scope (in a temporary copy when the case writes files at run time). */
export async function runCase(seededCase: SeededCase): Promise<CheckResult> {
  const seeded = join(SEEDED, seededCase.base ?? seededCase.id);
  const listFile = seededCase.list === undefined ? join(SHARED, 'mockup-figures.txt') : join(seeded, seededCase.list);
  const temporary = seededCase.extraFiles === undefined ? undefined : mkdtempSync(join(tmpdir(), 'sovitech-mockup-figures-'));
  try {
    if (temporary !== undefined) {
      cpSync(seeded, temporary, { recursive: true });
      for (const [path, content] of Object.entries(seededCase.extraFiles ?? {})) {
        mkdirSync(dirname(join(temporary, path)), { recursive: true });
        writeFileSync(join(temporary, path), content);
      }
    }
    return await checkMockupFigures({
      root: temporary ?? seeded,
      listFile,
      listName: seededCase.list ?? 'seeded/_shared/mockup-figures.txt',
      specRoot: SHARED,
      scope: SCOPE,
      label: seededCase.id,
      ...(seededCase.pdfPython === undefined ? {} : { pdfPython: seededCase.pdfPython }),
    });
  } finally {
    if (temporary !== undefined) rmSync(temporary, { recursive: true, force: true });
  }
}

/** How an entry of the real list is written into the planted tree: as the spec writes it, and for numbers also in Romanian format. */
function plantings(entry: FigureEntry): string[] {
  if (entry.kind !== 'number' || entry.value === undefined) return [entry.figure];
  const [whole = '', fraction] = entry.value.toFixed().split('.');
  const romanian = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (fraction === undefined ? '' : `,${fraction}`);
  return [entry.figure, romanian];
}

export const REAL_LIST_CASE_ID = 'real-list-every-entry-found';

/**
 * Plants every entry of the real list in a temporary tree (one entry per line,
 * in apps/ and in a seed) and runs the check with the real list: each entry,
 * in each planting, must be found on its own line. The result fails (as a
 * seeded bad input must); it is turned into a pass when any planting is
 * missed, so the self-test flags an entry the check cannot find.
 */
export async function runRealListCase(): Promise<CheckResult> {
  const listFile = join(repoRoot, LIST_NAME);
  const parsed = parseList(readFileSync(listFile, 'utf8'), LIST_NAME, repoRoot);
  const lines: Array<{ entry: FigureEntry; text: string }> = [];
  for (const entry of parsed.entries) for (const text of plantings(entry)) lines.push({ entry, text });
  const root = mkdtempSync(join(tmpdir(), 'sovitech-mockup-figures-'));
  try {
    const body = lines.map((line) => `// TEST planting\n${JSON.stringify(line.text)};`).join('\n');
    const planted = ['apps/web/src/planted.ts', 'packages/planted/src/planted.ts', 'services/extractor/src/planted.py'];
    for (const path of planted) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), `${body}\n`);
    }
    const result = await checkMockupFigures({ root, listFile, listName: LIST_NAME, specRoot: repoRoot, scope: SCOPE, label: REAL_LIST_CASE_ID });
    const details = result.details.join('\n');
    const missed = planted.flatMap((path) =>
      lines.filter((line, index) => !details.includes(`${path}:${index * 2 + 2}: mockup figure "${line.entry.figure}" (${line.entry.source})`)),
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
