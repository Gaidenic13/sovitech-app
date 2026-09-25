/**
 * The parsed test and eval index of docs/guardrails.md section 7.
 *
 * Other checks import this module instead of parsing the table again:
 *
 *   import { loadGuardrailIndex } from '../index/guardrail-index';
 *   const index = loadGuardrailIndex();          // index.cases, index.byId, index.version
 *
 * The parser is strict on purpose. A row it cannot read is a problem, never a
 * silent skip, so a malformed table can never shrink the list of cases the
 * index check holds the repository to.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../lib';

/** Section 7's type column: T is a code test, E is a model-behaviour eval. */
export type CaseType = 'T' | 'E';

/** One row of the section 7 table. */
export interface IndexedCase {
  /** The case id as written, for example 'G1-4', 'G7-2a' or 'GS-1'. */
  id: string;
  type: CaseType;
  /** The Situation cell, as written (Markdown kept, escaped pipes restored). */
  situation: string;
  /** The Expected cell, as written. */
  expected: string;
  /** 1-based line of the row in the guardrails file. */
  line: number;
}

/** The parsed index. */
export interface GuardrailIndex {
  /** Path of the parsed file, relative to the root it was read from. */
  source: string;
  /** The guardrails version from the "**Version:**" line, for example '1.5'. */
  version: string | undefined;
  /** The date on the version line, for example '2026-09-24'. */
  versionDate: string | undefined;
  /** Every well-formed row, in table order. */
  cases: IndexedCase[];
  /** The same rows by id. */
  byId: ReadonlyMap<string, IndexedCase>;
  /** What could not be read, each as "<file>:<line>: [table] <what>". Empty when the table is sound. */
  problems: string[];
}

/** Where the guardrails live, relative to the repository root. */
export const GUARDRAILS_PATH = 'docs/guardrails.md';

/** The folder of each case type (guardrails section 7). */
export const CASE_DIRS: Readonly<Record<CaseType, string>> = {
  T: 'tests/guardrails',
  E: 'evals/guardrails',
};

/**
 * The id forms section 7 uses: G<rule>-<n> with an optional letter (G7-2a), and
 * GS-<n> for the Speed Rule. A versioned id such as "G4-2 v2" (section 7,
 * "Existing ids keep their expected result") does not match yet: no file-name
 * form exists for it, so the index check reports such a row as a problem until
 * one is agreed.
 */
export const CASE_ID_PATTERN = /^G(?:[1-9]\d*|S)-[1-9]\d*[a-z]?$/;

const SECTION_7_HEADING = /^##\s+7\.\s/;
const LEVEL_2_HEADING = /^##\s/;
const HEADER_CELLS = ['id', 't/e', 'situation', 'expected'];
const DELIMITER_ROW = /^\|(?:\s*:?-{3,}:?\s*\|)+\s*$/;
const ID_LIKE_ROW = /^\|\s*G[0-9S]/;
const VERSION_LINE = /^\*\*Version:\*\*\s*(\d+\.\d+)(?:\s*\((\d{4}-\d{2}-\d{2})\))?/m;

/** The case file path of a case: tests/guardrails/<ID>.test.ts or evals/guardrails/<ID>.yaml. */
export function caseFilePath(entry: { id: string; type: CaseType }): string {
  return entry.type === 'T' ? `${CASE_DIRS.T}/${entry.id}.test.ts` : `${CASE_DIRS.E}/${entry.id}.yaml`;
}

/** Counts cases by type. */
export function countByType(cases: readonly { type: CaseType }[]): { total: number; T: number; E: number } {
  const T = cases.filter((entry) => entry.type === 'T').length;
  return { total: cases.length, T, E: cases.length - T };
}

/**
 * Splits a Markdown table row into trimmed cells, GitHub style: an unescaped
 * pipe separates cells, and "\|" is a literal pipe inside a cell.
 */
export function splitTableRow(line: string): string[] {
  let body = line.trim();
  if (body.startsWith('|')) body = body.slice(1);
  if (body.endsWith('|') && !body.endsWith('\\|')) body = body.slice(0, -1);
  const cells: string[] = [];
  let current = '';
  for (let position = 0; position < body.length; position += 1) {
    const char = body[position];
    if (char === '\\' && body[position + 1] === '|') {
      current += '|';
      position += 1;
    } else if (char === '|') {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

/** Parses the section 7 table out of the guardrails Markdown. */
export function parseGuardrailIndex(markdown: string, source: string = GUARDRAILS_PATH): GuardrailIndex {
  const lines = markdown.split(/\r?\n/);
  const versionMatch = VERSION_LINE.exec(markdown);
  const cases: IndexedCase[] = [];
  const byId = new Map<string, IndexedCase>();
  const problems: string[] = [];
  const at = (index: number): string => `${source}:${index + 1}: [table]`;
  const result = (): GuardrailIndex => ({
    source,
    version: versionMatch?.[1],
    versionDate: versionMatch?.[2],
    cases,
    byId,
    problems,
  });

  const start = lines.findIndex((line) => SECTION_7_HEADING.test(line));
  if (start === -1) {
    problems.push(`${source}:1: [table] no section 7 heading ("## 7. ...") was found, so no case could be read`);
    return result();
  }
  let end = lines.findIndex((line, index) => index > start && LEVEL_2_HEADING.test(line));
  if (end === -1) end = lines.length;

  const header = lines.findIndex(
    (line, index) =>
      index > start &&
      index < end &&
      line.trim().startsWith('|') &&
      splitTableRow(line).map((cell) => cell.toLowerCase()).join('|') === HEADER_CELLS.join('|'),
  );
  if (header === -1) {
    problems.push(`${at(start)} section 7 has no table header row "| ID | T/E | Situation | Expected |"`);
    return result();
  }
  if (!DELIMITER_ROW.test(lines[header + 1] ?? '')) {
    problems.push(`${at(header + 1)} the section 7 table header has no delimiter row under it`);
    return result();
  }

  let row = header + 2;
  for (; row < end; row += 1) {
    const line = lines[row] ?? '';
    if (!line.trim().startsWith('|')) break;
    const cells = splitTableRow(line);
    if (cells.length !== 4) {
      problems.push(`${at(row)} the row has ${cells.length} cells; a case row has 4 cells (ID, T/E, Situation, Expected)`);
      continue;
    }
    const [id = '', type = '', situation = '', expected = ''] = cells;
    if (!CASE_ID_PATTERN.test(id)) {
      problems.push(`${at(row)} the id cell "${id}" does not match the case id form (G<rule>-<n>, G<rule>-<n><letter> or GS-<n>)`);
      continue;
    }
    if (type !== 'T' && type !== 'E') {
      problems.push(`${at(row)} ${id}: the T/E cell is "${type}"; it must be T or E`);
      continue;
    }
    if (situation === '' || expected === '') {
      problems.push(`${at(row)} ${id}: the ${situation === '' ? 'Situation' : 'Expected'} cell is empty`);
      continue;
    }
    const previous = byId.get(id);
    if (previous !== undefined) {
      problems.push(`${at(row)} ${id} is listed twice (first on line ${previous.line}); every id has one row`);
      continue;
    }
    const entry: IndexedCase = { id, type, situation, expected, line: row + 1 };
    cases.push(entry);
    byId.set(id, entry);
  }

  if (cases.length === 0 && problems.length === 0) {
    problems.push(`${at(header)} the section 7 table has no case rows`);
  }
  // A case row after a blank line or other text is outside the table, and a
  // Markdown reader would not see it as part of the index.
  for (let index = row; index < end; index += 1) {
    const line = lines[index] ?? '';
    if (!ID_LIKE_ROW.test(line)) continue;
    const id = splitTableRow(line)[0] ?? '';
    problems.push(`${at(index)} ${id} looks like a case row but sits outside the table (the table ends on line ${row})`);
  }
  return result();
}

/** Reads and parses the guardrails file under `root` (the repository root by default). */
export function loadGuardrailIndex(root: string = repoRoot, path: string = GUARDRAILS_PATH): GuardrailIndex {
  const absolute = join(root, path);
  if (!existsSync(absolute)) {
    return {
      source: path,
      version: undefined,
      versionDate: undefined,
      cases: [],
      byId: new Map(),
      problems: [`${path}:1: [table] the file does not exist, so no case could be read`],
    };
  }
  return parseGuardrailIndex(readFileSync(absolute, 'utf8'), path);
}
