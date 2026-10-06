/**
 * Reading a downloaded CSV export in the e2e flows (phase 5; the Equipment register's export, docs/adr/0050 decision 4;
 * V-5's e2e half): its records (RFC 4180: quoted cells may hold commas, quotes and line breaks; CRLF or LF line ends; an
 * optional U+FEFF byte-order mark at the start, which a spreadsheet reads as the file's encoding, stripped), and the
 * reserved-term scan of its text (prompt 3 phase 5: "Every export passes the reserved-term scan"; 2.8 "Reserved terms").
 *
 * The scan reads each cell as one unit with the one shared matcher (`@sovitech/registry/reserved-terms`), and honours
 * 2.8's places only where the column says what its cells are (the header row names each column: "<heading> badge",
 * "<heading> source"):
 * - a badge column: a cell passes only when a registered badge allowance covers the whole label (2.8: "badges ... that
 *   the app builds from stored state", such as "Verified by SOVITECH"), as the render test's badge marker does
 *   (tests/e2e/render/rendered-copy.ts `allowancesOfKind`);
 * - a source column: the source line as served quotes the document as uploaded (its name): the cited files' names, handed
 *   in by the flow, are set apart as verbatim source text (2.8: "verbatim document text shown as a quotation"), and the
 *   rest of the line, the app's own words, is plain copy (the reading of G10-14's scan, tests/guardrails/_support/csv.ts,
 *   aligned in part B);
 * - every other cell (the headings, the values, the demo line, the count's line): plain copy, with no allowance.
 * A record that is not a row of the header's width (the demo line before the header, the count after the rows) is plain
 * copy throughout. No assertion here: the flows assert.
 */
import { NO_ALLOWANCES, registeredAllowances, scanCopy, type AllowanceSet } from '@sovitech/registry/reserved-terms';
import { allowancesOfKind } from '../render/rendered-copy';

/** The text of a downloaded CSV, its optional byte-order mark (U+FEFF) removed. */
export function csvText(bytes: Uint8Array): string {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  return text.startsWith('\u{FEFF}') ? text.slice(1) : text;
}

/** The records of a CSV text (RFC 4180), each a list of cells, with no empty record for the final line end. */
export function csvRecords(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else cell += character;
    } else if (character === '"') quoted = true;
    else if (character === ',') {
      record.push(cell);
      cell = '';
    } else if (character === '\r' || character === '\n') {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      record.push(cell);
      records.push(record);
      record = [];
      cell = '';
    } else cell += character;
  }
  if (cell !== '' || record.length > 0) {
    record.push(cell);
    records.push(record);
  }
  return records;
}

/** What a column's cells are, by its heading. */
type ColumnKind = 'badge' | 'source' | 'plain';

function columnKindOf(heading: string): ColumnKind {
  if (heading.endsWith(' badge')) return 'badge';
  if (heading.endsWith(' source')) return 'source';
  return 'plain';
}

/** One cell holding a reserved term where 2.8 does not allow it. */
export interface CsvReservedFinding {
  /** The record's position (0 is the file's first line). */
  readonly record: number;
  readonly column: number;
  readonly text: string;
  readonly terms: readonly string[];
}

/** The source line's own words: the cited files' names, quoted verbatim, set apart (longest first). */
function sourceLineWords(cell: string, citedFileNames: readonly string[]): string {
  let rest = cell;
  for (const name of [...citedFileNames].filter((entry) => entry.trim() !== '').sort((a, b) => b.length - a.length)) rest = rest.split(name).join(' ');
  return rest;
}

/**
 * The cells of a CSV export that hold a reserved term where 2.8 does not allow it (see the header). The header row is
 * the first record with more than one cell. `citedFileNames`: the names of the documents the export may cite, as uploaded.
 */
export function reservedTermsInCsv(text: string, options: { readonly citedFileNames: readonly string[] }): CsvReservedFinding[] {
  const records = csvRecords(text);
  const headerAt = records.findIndex((record) => record.length > 1);
  const kinds = headerAt < 0 ? [] : (records[headerAt] ?? []).map(columnKindOf);
  const badges: AllowanceSet = allowancesOfKind(registeredAllowances(), 'badge');
  const findings: CsvReservedFinding[] = [];
  records.forEach((record, recordAt) => {
    const isRow = headerAt >= 0 && recordAt > headerAt && record.length === kinds.length;
    record.forEach((cell, column) => {
      const kind = isRow ? (kinds[column] ?? 'plain') : 'plain';
      const scanned = kind === 'source' ? sourceLineWords(cell, options.citedFileNames) : cell;
      const matches = scanCopy(scanned, { allowances: kind === 'badge' ? badges : NO_ALLOWANCES });
      if (matches.length > 0) findings.push({ record: recordAt, column, text: cell, terms: [...new Set(matches.map((match) => match.text))] });
    });
  });
  return findings;
}
