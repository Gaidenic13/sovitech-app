/**
 * Mockup-figure check (prompt 3 section 7, "No owner document enters the
 * repo": never copy a figure from the mockups or from the specs'
 * transcriptions of them; section 14, item 3; section 3, item 4: the mockups'
 * figures are AI-generated demo content and never become app data). Since the
 * phase 0 round 2 review the scope also covers services/extractor/src, where
 * phase 2 writes the extractor.
 *
 * tools/checks/mockup-figures.txt lists the distinctive figures of the specs'
 * transcriptions, and the mockups' hotel name, each with the spec line it was
 * read from. It is a check list, not app data: nothing imports it. The check
 * fails when any listed figure appears in the app code, the packages' sources,
 * a seed or a demo fixture. Case files under tests/guardrails/ and
 * fixtures/evals/<ID>/ may use their own case's numbers from guardrails
 * section 7, so they are not read.
 *
 * Three kinds of entry:
 * - number: the value, in any number format (34,500 34.500 34500 34 500
 *   34_500, 34.5k, 1.28M), wherever it stands as a number;
 * - quantity: the value followed by its unit or word (6.1 years, 18.7%,
 *   €37 / m²), with common unit spellings (m2, mp, ani, tone);
 * - text: the words, ignoring case, diacritics and spacing (the hotel name,
 *   the floor notation, the mockup date).
 * Matching is per line; a figure split across two lines is not found.
 *
 * The parser, the matcher and the scan are shared with the company-figure
 * check (tools/checks/company-figures/), whose list also has a fourth kind:
 * - product: a product or model name as whole words, ignoring case and
 *   diacritics, with up to three spaces, hyphens, dots, slashes, colons or
 *   underscores between its letter and digit groups, or none where letters meet
 *   digits ("EY-RU 310" is also "EY-RU310" and "ey ru-310").
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import Decimal from 'decimal.js';
import { fail, listFiles, pass } from '../lib';
import type { CheckResult } from '../types';
import { scanGlobs } from '../scan-roots/roots';
import { documentKind, documentTexts } from './document-text';

export const NAME = 'mockup-figures';

/** Where the check looks (prompt 3 section 14, item 3). */
export interface FigureScope {
  /** Roots that must each match at least one file, or the check fails. */
  readonly required: readonly string[];
  /** Roots that may be empty today: seeds and demo fixtures. */
  readonly optional: readonly string[];
  /** Never read: the case files' own numbers, and generated output. */
  readonly ignore: readonly string[];
}

// services/extractor/src since the phase 0 round 2 review: phase 2 writes the extractor there.
const REQUIRED_ROOTS: readonly string[] = ['apps/**', 'packages/*/src/**', 'services/extractor/src/**'];

export const SCOPE: FigureScope = {
  required: REQUIRED_ROOTS,
  // Every glob the shared scan-roots list names for this scan (tools/checks/scan-roots/roots.json:
  // the package subfolders, services and fixtures), read from the list so a folder it adds is
  // read without a change here (tools/checks/scan-roots/wiring.test.ts), and top-level seeds.
  optional: [
    ...new Set([
      ...scanGlobs('mockup-figures').filter((glob) => !REQUIRED_ROOTS.includes(glob)),
      'packages/*/seed/**',
      'packages/*/seeds/**',
      'packages/*/migrations/**',
      'packages/*/templates/**',
      'packages/*/test-formulas/**',
      'services/*/src/**',
      'seed/**',
      'seeds/**',
      'fixtures/**',
    ]),
  ],
  // Only a case's own folder (fixtures/evals/G1-11/, fixtures/evals/GS-1/) is left out; anything else under fixtures/evals/ is read.
  ignore: ['fixtures/evals/G*-*/**'],
};

export type EntryKind = 'number' | 'quantity' | 'text' | 'product';

export interface FigureEntry {
  readonly kind: EntryKind;
  /** The figure as the spec writes it. */
  readonly figure: string;
  /** `<spec path>:<line>`, relative to the spec root. */
  readonly source: string;
  /** Line of the entry in the list file. */
  readonly listLine: number;
  /** number and quantity: the value. */
  readonly value?: Decimal;
  /** quantity: the unit or word after the value, as a pattern on folded text. */
  readonly suffix?: RegExp;
  /** text: the pattern on folded text. */
  readonly pattern?: RegExp;
  /** product: the letter and digit groups joined, lower case (the entry's identity). */
  readonly productKey?: string;
  /** product: the letter and digit groups, lower case. */
  readonly productGroups?: readonly string[];
}

/** The grammar of a check list: where its entries come from, and which kinds it accepts. */
export interface ListSyntax {
  /** How a source is written, for messages. */
  readonly sourceFormat: string;
  /** A source: group 1 the file, group 2 the line. */
  readonly source: RegExp;
  /** Whether each figure must be found on its cited line (the file is read from the spec root). */
  readonly verifySources: boolean;
  readonly kinds: readonly EntryKind[];
}

/** The mockup-figure list: figures traced to the specs' lines, read at every run. */
export const MOCKUP_LIST_SYNTAX: ListSyntax = {
  sourceFormat: '<spec>.md:<line>',
  source: /^([\w./-]+\.md):(\d+)$/u,
  verifySources: true,
  kinds: ['number', 'quantity', 'text'],
};

// ---------------------------------------------------------------------------
// Folding and number readings.

const MARKS = /\p{M}/gu;

/** Lower case, no diacritics, compatibility forms decomposed (m² is m2, ³ is 3). */
export function fold(text: string): string {
  return text.normalize('NFKD').replace(MARKS, '').toLowerCase();
}

function escapeForRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

/**
 * The values a number token can stand for: plain digits; English grouping
 * (1,280,000.5); Romanian grouping (1.280.000,5); space or underscore
 * grouping (1 280 000, 1_280_000); and each space-separated part on its own,
 * since "34 500" may be one number or two. An ambiguous token such as "1.500"
 * gives both readings. A token with no reading gives none.
 */
export function readingsOf(token: string): Decimal[] {
  const readings: Decimal[] = [];
  const add = (digits: string): void => {
    if (!/^\d+(?:\.\d+)?$/.test(digits)) return;
    const value = new Decimal(digits);
    if (!readings.some((existing) => existing.equals(value))) readings.push(value);
  };
  if (/^\d+$/.test(token)) add(token);
  if (/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(token) || /^\d+\.\d+$/.test(token)) add(token.replace(/,/g, ''));
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(token) || /^\d+,\d+$/.test(token)) add(token.replace(/\./g, '').replace(',', '.'));
  if (/^\d{1,3}(?: \d{3})+(?:[.,]\d+)?$/.test(token)) add(token.replace(/ /g, '').replace(',', '.'));
  if (/^\d+(?:_\d+)+(?:\.\d+)?$/.test(token)) add(token.replace(/_/g, ''));
  if (token.includes(' ')) for (const part of token.split(' ')) for (const value of readingsOf(part)) add(value.toString());
  return readings;
}

/** A number token: digits with . , _ or space between digit groups, not glued to a letter or underscore before it. */
const NUMBER_TOKEN = /(?<![\p{L}\p{N}_])\d+(?:[.,_ ]\d+)*/gu;

const THOUSANDS = /^ ?(?:k|K|mii)(?![\p{L}\p{N}])/u;
const MILLIONS = /^ ?(?:M|Mio|mil\.?|mln\.?|million|milioane)(?![\p{L}\p{N}])/u;

interface NumberHit {
  readonly text: string;
  readonly values: readonly Decimal[];
  /** Text after the number and any scale word. */
  readonly after: string;
  /** The number runs straight into a letter that is not a scale word: part of an identifier, not a figure. */
  readonly glued: boolean;
}

function numbersIn(line: string): NumberHit[] {
  const hits: NumberHit[] = [];
  for (const match of line.matchAll(NUMBER_TOKEN)) {
    const token = match[0].replace(/ +$/u, '');
    const end = match.index + token.length;
    const rest = line.slice(end);
    const thousands = THOUSANDS.exec(rest);
    const millions = MILLIONS.exec(rest);
    const scale = thousands !== null ? { factor: 1_000, length: thousands[0].length } : millions !== null ? { factor: 1_000_000, length: millions[0].length } : undefined;
    const readings = readingsOf(token);
    const values = scale === undefined ? readings : readings.map((value) => value.times(scale.factor));
    const after = scale === undefined ? rest : rest.slice(scale.length);
    const glued = scale === undefined && /^[\p{L}_]/u.test(rest);
    const text = scale === undefined ? line.slice(match.index, end) : line.slice(match.index, end + scale.length);
    hits.push({ text, values, after, glued });
  }
  return hits;
}

// ---------------------------------------------------------------------------
// The list file.

const CURRENCY = /^(?:€|eur|ron|lei)\s*/iu;
const UNIT_ALIASES: Readonly<Record<string, string>> = {
  m2: '(?:m2|mp|sqm|sq\\.?\\s*m)',
  m3: '(?:m3|mc)',
  year: '(?:years?|yrs?|ani|an)',
  years: '(?:years?|yrs?|ani|an)',
  tonnes: '(?:tonnes?|tons?|tone|t)',
  point: '(?:points?|puncte|punct)',
  points: '(?:points?|puncte|punct)',
  room: '(?:rooms?|camere)',
  rooms: '(?:rooms?|camere)',
  bed: '(?:beds?|paturi)',
  beds: '(?:beds?|paturi)',
  project: '(?:projects?|proiecte)',
  projects: '(?:projects?|proiecte)',
  levels: '(?:levels?|niveluri)',
  '°c': '°\\s*c',
};

function suffixPattern(suffix: string): RegExp {
  const parts = fold(suffix)
    .split(/(\/)|\s+/u)
    .filter((part): part is string => part !== undefined && part !== '');
  const body = parts.map((part) => UNIT_ALIASES[part] ?? escapeForRegExp(part)).join('\\s*');
  const tail = /[\p{L}\p{N}]$/u.test(fold(suffix)) ? '(?![\\p{L}\\p{N}])' : '';
  return new RegExp(`^\\s*(?:(?:€|eur|ron|lei)\\s*)?${body}${tail}`, 'u');
}

function textPattern(text: string): RegExp {
  const folded = fold(text).trim();
  const body = folded.split(/\s+/u).map(escapeForRegExp).join('\\s*');
  const head = /^\p{N}/u.test(folded) ? '(?<![\\p{L}\\p{N}])' : '';
  const tail = /\p{N}$/u.test(folded) ? '(?![\\p{L}\\p{N}])' : '';
  return new RegExp(`${head}${body}${tail}`, 'gu');
}

/** The value and the rest of a figure written in the specs' English number format, currency first. */
function parseFigure(figure: string): { value: Decimal; rest: string } | undefined {
  const withoutCurrency = figure.trim().replace(CURRENCY, '');
  const match = /^(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)(.*)$/su.exec(withoutCurrency);
  if (match === null) return undefined;
  const [, number = '', rest = ''] = match;
  return { value: new Decimal(number.replace(/,/g, '')), rest: rest.trim() };
}

function scaleOf(rest: string): number | undefined {
  if (rest === '') return 1;
  if (/^(?:k|K)$/u.test(rest)) return 1_000;
  if (/^M$/u.test(rest)) return 1_000_000;
  return undefined;
}

/** Collapses whitespace in folded text, for the source-line check. */
const squash = (text: string): string => fold(text).replace(/\s+/gu, ' ').trim();

/** Between the letter and digit groups of a product name: nothing, or up to three spaces, hyphens, dots, slashes, colons or underscores. */
const PRODUCT_SEPARATOR = /^[\s._:/-]{0,3}$/u;

/** The letter and digit groups of a folded product name: "EY-RU 310" gives ey, ru, 310; "TSHK621F001" gives tshk, 621, f, 001. */
export function productGroups(figure: string): string[] {
  return fold(figure).match(/\p{L}+|\p{N}+/gu) ?? [];
}

export interface ParsedList {
  readonly entries: readonly FigureEntry[];
  readonly problems: readonly string[];
}

/**
 * Reads the list. Each entry line is `kind | figure | source`, optionally
 * followed by `  # note`. With `syntax.verifySources` (the mockup list), the
 * figure must appear, as written, on its source line in the spec (so no entry
 * is invented). Blank lines and lines starting with # are comments.
 */
export function parseList(listText: string, listName: string, specRoot: string, syntax: ListSyntax = MOCKUP_LIST_SYNTAX): ParsedList {
  const entries: FigureEntry[] = [];
  const problems: string[] = [];
  const specs = new Map<string, string[] | undefined>();
  const specLines = (path: string): string[] | undefined => {
    if (!specs.has(path)) {
      const absolute = join(specRoot, path);
      specs.set(path, existsSync(absolute) ? readFileSync(absolute, 'utf8').split('\n') : undefined);
    }
    return specs.get(path);
  };
  const seen = new Map<string, number>();

  listText.split('\n').forEach((raw, index) => {
    const listLine = index + 1;
    const line = raw.replace(/\s#\s.*$/u, '').trim();
    if (line === '' || line.startsWith('#')) return;
    const where = `${listName}:${listLine}`;
    const fields = line.split('|').map((field) => field.trim());
    if (fields.length !== 3 || fields.some((field) => field === '')) {
      problems.push(`${where}: an entry is "kind | figure | spec file:line", with all three fields`);
      return;
    }
    const [kindText = '', figure = '', source = ''] = fields;
    const kind = syntax.kinds.find((known) => known === kindText);
    if (kind === undefined) {
      const names = syntax.kinds.length > 1 ? `${syntax.kinds.slice(0, -1).join(', ')} or ${syntax.kinds[syntax.kinds.length - 1] ?? ''}` : syntax.kinds.join('');
      problems.push(`${where}: kind "${kindText}" is not ${names}`);
      return;
    }
    const sourceMatch = syntax.source.exec(source);
    if (sourceMatch === null) {
      problems.push(`${where}: source "${source}" is not "${syntax.sourceFormat}"`);
      return;
    }
    if (syntax.verifySources) {
      const [, specPath = '', lineText = ''] = sourceMatch;
      const lines = specLines(specPath);
      const specLine = lines?.[Number.parseInt(lineText, 10) - 1];
      if (lines === undefined) problems.push(`${where}: source file ${specPath} does not exist`);
      else if (specLine === undefined || !squash(specLine).includes(squash(figure))) {
        problems.push(`${where}: "${figure}" is not on ${source}; each figure must come from its spec line`);
      }
    }

    let entry: FigureEntry | undefined;
    if (kind === 'product') {
      const groups = productGroups(figure);
      const characters = groups.join('').length;
      const onlyLetters = groups.length === 1 && /^\p{L}+$/u.test(groups[0] ?? '');
      if (characters < 3) problems.push(`${where}: the product name "${figure}" has fewer than 3 letters and digits, too common to find`);
      else if (onlyLetters && characters < 4) problems.push(`${where}: the product name "${figure}" is a short letter code, too common to find; list it with its model number or as "SAUTER ${figure}"`);
      else entry = { kind, figure, source, listLine, productKey: groups.join(''), productGroups: groups };
    } else if (kind === 'text') {
      if (!/\p{L}/u.test(figure)) problems.push(`${where}: a text entry needs letters; use number or quantity for "${figure}"`);
      else entry = { kind, figure, source, listLine, pattern: textPattern(figure) };
    } else {
      const parsed = parseFigure(figure);
      if (parsed === undefined) {
        problems.push(`${where}: "${figure}" does not start with a number in the specs' format (1,280,000 or 6.1)`);
      } else if (kind === 'number') {
        const scale = scaleOf(parsed.rest);
        const digits = parsed.value.toString().replace(/\D/g, '').length;
        if (scale === undefined) problems.push(`${where}: "${figure}" has words after the number; use a quantity entry`);
        else if (digits < 3) problems.push(`${where}: "${figure}" has fewer than 3 digits, too common to find as a bare number; use a quantity entry`);
        else entry = { kind, figure, source, listLine, value: parsed.value.times(scale) };
      } else if (parsed.rest === '') {
        problems.push(`${where}: the quantity "${figure}" has no unit or word after the number; use a number entry`);
      } else {
        entry = { kind, figure, source, listLine, value: parsed.value, suffix: suffixPattern(parsed.rest) };
      }
    }
    if (entry === undefined) return;
    const key = `${entry.kind}|${entry.value?.toString() ?? ''}|${entry.suffix?.source ?? entry.pattern?.source ?? entry.productKey ?? ''}`;
    const before = seen.get(key);
    if (before !== undefined) problems.push(`${where}: the same figure as line ${before}`);
    else seen.set(key, listLine);
    entries.push(entry);
  });

  if (entries.length === 0 && problems.length === 0) problems.push(`${listName}: no entries; the check has nothing to look for`);
  return { entries, problems };
}

// ---------------------------------------------------------------------------
// Scanning.

export interface FigureHit {
  readonly entry: FigureEntry;
  readonly line: number;
  readonly text: string;
}

/** SVG geometry attributes hold coordinates, not figures. */
const SVG_GEOMETRY = /\s(?:d|points|viewBox|transform|x|y|x1|y1|x2|y2|cx|cy|r|rx|ry|width|height|stroke-width|offset)\s*=\s*(?:"[^"]*"|'[^']*')/giu;

/** A list compiled for scanning: the product names become a trie of their letter and digit groups, so a long list costs one pass over each line's words. */
export interface CompiledEntries {
  /** The listed figures in one file's text. */
  find(path: string, text: string): FigureHit[];
}

interface ProductNode {
  readonly children: Map<string, ProductNode>;
  entry?: FigureEntry;
}

export function compileEntries(entries: readonly FigureEntry[]): CompiledEntries {
  const numeric = entries.filter((entry) => entry.value !== undefined);
  const texts = entries.filter((entry) => entry.pattern !== undefined);
  const products: ProductNode = { children: new Map() };
  for (const entry of entries) {
    if (entry.productGroups === undefined || entry.productGroups.length === 0) continue;
    let node = products;
    for (const group of entry.productGroups) {
      const next = node.children.get(group) ?? { children: new Map() };
      node.children.set(group, next);
      node = next;
    }
    node.entry ??= entry;
  }
  return { find: (path, text) => findWith(path, text, numeric, texts, products.children.size > 0 ? products : undefined) };
}

/**
 * Product names in one folded line: at each letter or digit group that does not
 * continue a word, the longest listed sequence of groups, each joined to the
 * next by at most three separator characters. A group matches only a whole
 * group of the text, so "ecos" is not found in "ecosystem", and "EY-RU 310" is
 * found in "EY-RU310F001" (a letter after digits) but not in "EY-RU 3100".
 */
function productsIn(folded: string, root: ProductNode): Array<{ entry: FigureEntry; text: string }> {
  const groups = [...folded.matchAll(/\p{L}+|\p{N}+/gu)].map((match) => ({ text: match[0], start: match.index, end: match.index + match[0].length }));
  const found: Array<{ entry: FigureEntry; text: string }> = [];
  let index = 0;
  while (index < groups.length) {
    const first = groups[index];
    if (first === undefined) break;
    const before = folded.slice(Math.max(0, first.start - 1), first.start);
    let best: { entry: FigureEntry; last: number } | undefined;
    if (!/[\p{L}\p{N}]/u.test(before)) {
      let node = root.children.get(first.text);
      let at = index;
      while (node !== undefined) {
        if (node.entry !== undefined) best = { entry: node.entry, last: at };
        const current = groups[at];
        const next = groups[at + 1];
        if (current === undefined || next === undefined || !PRODUCT_SEPARATOR.test(folded.slice(current.end, next.start))) break;
        node = node.children.get(next.text);
        at += 1;
      }
    }
    if (best === undefined) {
      index += 1;
      continue;
    }
    const last = groups[best.last];
    found.push({ entry: best.entry, text: folded.slice(first.start, last === undefined ? first.end : last.end) });
    index = best.last + 1;
  }
  return found;
}

/** The listed figures in one file's text. */
export function findFigures(path: string, text: string, entries: readonly FigureEntry[]): FigureHit[] {
  return compileEntries(entries).find(path, text);
}

function findWith(path: string, text: string, numeric: readonly FigureEntry[], texts: readonly FigureEntry[], products: ProductNode | undefined): FigureHit[] {
  const source = path.toLowerCase().endsWith('.svg') ? text.replace(SVG_GEOMETRY, (attribute) => attribute.replace(/[^\n]/g, ' ')) : text;
  const hits: FigureHit[] = [];
  source.split('\n').forEach((raw, index) => {
    const line = raw.normalize('NFKC');
    for (const number of numbersIn(line)) {
      for (const entry of numeric) {
        const value = entry.value;
        if (value === undefined || !number.values.some((candidate) => candidate.equals(value))) continue;
        if (entry.kind === 'number' && number.glued) continue;
        if (entry.kind === 'quantity') {
          const suffix = entry.suffix?.exec(fold(number.after));
          if (suffix === null || suffix === undefined) continue;
          hits.push({ entry, line: index + 1, text: `${number.text}${number.after.slice(0, suffix[0].length)}`.trim() });
          continue;
        }
        hits.push({ entry, line: index + 1, text: number.text });
      }
    }
    const folded = fold(line);
    for (const entry of texts) {
      const pattern = entry.pattern;
      if (pattern === undefined) continue;
      for (const match of folded.matchAll(pattern)) hits.push({ entry, line: index + 1, text: match[0] });
    }
    if (products !== undefined) {
      for (const hit of productsIn(folded, products)) hits.push({ entry: hit.entry, line: index + 1, text: hit.text });
    }
  });
  return hits;
}

export interface FigureCheckInputs {
  /** Absolute directory the scope globs are relative to. */
  readonly root: string;
  /** Absolute path of the list file. */
  readonly listFile: string;
  /** How the list is named in findings. */
  readonly listName: string;
  /** Absolute directory the entries' spec sources are relative to. */
  readonly specRoot: string;
  readonly scope: FigureScope;
  readonly label?: string;
  /** The Python that reads PDF text (document-text.ts); by default the extractor's, which holds pypdfium2. */
  readonly pdfPython?: string;
}

/** A check that scans a scope for the entries of one check list (the mockup and company-figure checks). */
export interface FigureListCheck extends FigureCheckInputs {
  /** The check's name in its result. */
  readonly name: string;
  readonly syntax: ListSyntax;
  /** The finding for one hit, after "<path>:<line>: ". */
  readonly describeHit: (hit: FigureHit) => string;
  /** What a found entry is called in the summary, plural ("mockup figures"). */
  readonly hitNoun: string;
  /** What the list's entries are called in the counts, plural ("figures"). */
  readonly entryNoun: string;
  /** The passing summary, before the counts. */
  readonly passSummary: string;
}

function isBinary(buffer: Buffer): boolean {
  return buffer.subarray(0, 8000).includes(0);
}

/** The mockup-figure check on one tree. */
export function checkMockupFigures(inputs: FigureCheckInputs): Promise<CheckResult> {
  return checkFigureList({
    ...inputs,
    name: NAME,
    syntax: MOCKUP_LIST_SYNTAX,
    describeHit: (hit) => `mockup figure "${hit.entry.figure}" (${hit.entry.source}) as "${hit.text}"`,
    hitNoun: 'mockup figures',
    entryNoun: 'figures',
    passSummary: 'no mockup figure in the app, packages, extractor, seeds or demo fixtures',
  });
}

/** Scans a scope for the entries of one check list. */
export async function checkFigureList(inputs: FigureListCheck): Promise<CheckResult> {
  const prefix = inputs.label === undefined ? '' : `[${inputs.label}] `;
  const problems: string[] = [];

  let entries: readonly FigureEntry[] = [];
  if (!existsSync(inputs.listFile)) {
    problems.push(`${inputs.listName} is missing; the check has nothing to look for`);
  } else {
    const parsed = parseList(readFileSync(inputs.listFile, 'utf8'), inputs.listName, inputs.specRoot, inputs.syntax);
    entries = parsed.entries;
    problems.push(...parsed.problems);
  }
  const matcher = compileEntries(entries);

  for (const pattern of inputs.scope.required) {
    const matched = await listFiles(pattern, { cwd: inputs.root, ignore: inputs.scope.ignore });
    if (matched.length === 0) problems.push(`scan root "${pattern}" matches no file: a scope with nothing to scan never passes`);
  }
  const files = await listFiles([...inputs.scope.required, ...inputs.scope.optional], { cwd: inputs.root, ignore: inputs.scope.ignore });

  let read = 0;
  let binary = 0;
  let found = 0;
  // PDFs and ZIP archives (XLSX, DOCX, PPTX, ODF) are also read by their text (document-text.ts;
  // phase 2 review, adversarial finding 16): as raw bytes a figure in a cell, a compressed stream
  // or a kerned text array is never seen.
  const documents: Array<{ name: string; path: string; bytes: Buffer }> = [];
  for (const path of files) {
    let buffer: Buffer;
    try {
      buffer = readFileSync(join(inputs.root, path));
    } catch (error) {
      problems.push(`${path}: could not be read: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    const kind = documentKind(buffer);
    if (kind !== undefined) documents.push({ name: path, path: join(inputs.root, path), bytes: buffer });
    if (isBinary(buffer)) {
      if (kind === undefined) binary += 1;
      continue;
    }
    read += 1;
    for (const hit of matcher.find(path, buffer.toString('utf8'))) {
      found += 1;
      problems.push(`${path}:${hit.line}: ${inputs.describeHit(hit)}`);
    }
  }
  const texts = documentTexts(documents, inputs.pdfPython);
  problems.push(...texts.problems);
  for (const part of texts.parts) {
    for (const hit of matcher.find(part.where, part.text)) {
      found += 1;
      problems.push(`${part.where}:${hit.line}: ${inputs.describeHit(hit)}`);
    }
  }
  if (read === 0 && documents.length === 0) problems.push('0 files were read: a scan that reads nothing never passes');

  const pdfs = documents.filter((document) => documentKind(document.bytes) === 'pdf').length;
  const readDocuments = documents.length > 0 ? `, ${documents.length} documents read by their text (${pdfs} PDF, ${documents.length - pdfs} ZIP-based)` : '';
  const unread = texts.unread > 0 ? `, ${texts.unread} archive members not read (images or binary)` : '';
  const counts = `${entries.length} listed ${inputs.entryNoun}; ${read} files read${readDocuments}${binary > 0 ? `, ${binary} binary files not read` : ''}${unread}`;
  if (problems.length === 0) return pass(inputs.name, `${prefix}${inputs.passSummary} (${counts})`);
  const other = problems.length - found;
  return fail(inputs.name, `${prefix}${found} ${inputs.hitNoun} found${other > 0 ? `, ${other} other problems` : ''} (${counts})`, problems);
}
