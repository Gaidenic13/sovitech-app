/**
 * Reading the Equipment register's CSV export in the guardrail cases (phase 5; docs/adr/0050-exports-print-route-and-pdf.md
 * decision 4, amended in part B): the file as the API serves it, and the reserved-term scan of its text (prompt 3 phase 5:
 * "Every export passes the reserved-term scan"; 2.8 "Reserved terms"), for G10-14, G1-29 and any case that reads the file.
 *
 * - `readCsv`: an optional leading U+FEFF (the UTF-8 byte order mark the writer puts before the first line, A-5) is set
 *   apart, then the text is read as RFC 4180 records: cells split on commas, records on CRLF, a quoted cell holding
 *   commas, semicolons, tabs, quotes (doubled) or line ends. A last line end closes the last record, so it adds none.
 * - `reservedTermsInEquipmentCsv`: every cell is matched with the one reserved-term matcher
 *   (`@sovitech/registry/reserved-terms`), with 2.8's allowances applied by column, as the header row names the
 *   columns (each heading's three columns: the shown text, "<heading> badge", "<heading> source"):
 *   - a badge column: the cell passes when one registered badge allowance covers it whole (2.8: "badges ... that the
 *     app builds from stored state", such as "Verified by SOVITECH"); any other text is matched as plain copy;
 *   - a source column: the source line's verbatim source text, the cited files' names as uploaded (handed in by the
 *     case, which stored them), is set apart (2.8: "verbatim document text shown as a quotation, such as an evidence
 *     excerpt or original text"), and the rest of the line, the app's own words, is matched as plain copy;
 *   - every other cell (the shown text, the header row, the demo line, the count line): plain copy, with no allowance.
 * Nothing here catches an error: a failure fails the case (tools/checks/index, `[support]`).
 */
import {
  REGISTERED_ALLOWANCE_ENTRIES,
  createAllowanceSet,
  findReservedTerms,
  scanCopy,
  type AllowanceSet,
} from '@sovitech/registry/reserved-terms';

/** The UTF-8 byte order mark, as a decoded string's first character. */
export const BYTE_ORDER_MARK = '\u{FEFF}';

export interface CsvFile {
  /** Whether the text started with U+FEFF (set apart before reading). */
  readonly byteOrderMark: boolean;
  /** The records, each its cells as written (quotes removed, doubled quotes read as one). */
  readonly records: readonly (readonly string[])[];
}

/** The text with an optional leading U+FEFF set apart. */
export function withoutByteOrderMark(text: string): { readonly byteOrderMark: boolean; readonly text: string } {
  return text.startsWith(BYTE_ORDER_MARK) ? { byteOrderMark: true, text: text.slice(BYTE_ORDER_MARK.length) } : { byteOrderMark: false, text };
}

/** The CSV text's records (RFC 4180), after an optional leading U+FEFF. Throws on a quoted cell left open or a stray `"`. */
export function readCsv(served: string): CsvFile {
  const { byteOrderMark, text } = withoutByteOrderMark(served);
  const records: string[][] = [];
  let record: string[] = [];
  let cell = '';
  let quoted = false;
  let started = false;
  let index = 0;
  while (index < text.length) {
    const character = text[index] ?? '';
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 2;
        continue;
      }
      if (character === '"') {
        quoted = false;
        index += 1;
        const next = text[index];
        if (next !== undefined && next !== ',' && next !== '\r' && next !== '\n') throw new Error(`a quoted CSV cell is followed by ${JSON.stringify(next)} at ${String(index)}`);
        continue;
      }
      cell += character;
      index += 1;
      continue;
    }
    if (character === '"') {
      if (cell !== '') throw new Error(`a '"' inside an unquoted CSV cell at ${String(index)}`);
      quoted = true;
      started = true;
      index += 1;
      continue;
    }
    if (character === ',') {
      record.push(cell);
      cell = '';
      started = true;
      index += 1;
      continue;
    }
    if (character === '\r' || character === '\n') {
      record.push(cell);
      records.push(record);
      record = [];
      cell = '';
      started = false;
      index += character === '\r' && text[index + 1] === '\n' ? 2 : 1;
      continue;
    }
    cell += character;
    started = true;
    index += 1;
  }
  if (quoted) throw new Error('a quoted CSV cell is never closed');
  if (started || cell !== '' || record.length > 0) {
    record.push(cell);
    records.push(record);
  }
  return { byteOrderMark, records };
}

/** Where a cell holding a reserved term sits, and what it holds. */
export interface CsvTermFinding {
  /** The record's index (0 is the file's first line, after the byte order mark). */
  readonly record: number;
  readonly column: number;
  /** The column's role, from the header row: `value`, `badge` or `source`; `line` for a record outside the table. */
  readonly role: 'value' | 'badge' | 'source' | 'line';
  readonly cell: string;
  readonly terms: readonly string[];
}

/** The registered badge allowances only (2.8's badges), so a badge cell cannot borrow another kind's entry. */
function badgeAllowances(): AllowanceSet {
  return createAllowanceSet(REGISTERED_ALLOWANCE_ENTRIES.filter((entry) => entry.kind === 'badge'));
}

/** The source line's own words: the cited files' names, quoted verbatim, set apart (longest first). */
function sourceLineWords(cell: string, citedFileNames: readonly string[]): string {
  let rest = cell;
  for (const name of [...citedFileNames].filter((entry) => entry.trim() !== '').sort((a, b) => b.length - a.length)) rest = rest.split(name).join(' ');
  return rest;
}

/**
 * The cells of the Equipment CSV that hold a reserved term where 2.8 does not allow it, with 2.8's allowances applied by
 * column (badge columns: a registered badge label whole; source columns: the cited files' names as uploaded). The header
 * row is the first record whose second cell names a badge column ("<heading> badge"); a file with no such row is refused.
 */
export function reservedTermsInEquipmentCsv(file: CsvFile, options: { readonly citedFileNames: readonly string[] }): CsvTermFinding[] {
  const headerAt = file.records.findIndex((record) => record.length > 2 && (record[1] ?? '').endsWith(' badge'));
  if (headerAt < 0) throw new Error('the Equipment CSV has no header row naming its badge columns');
  const header = file.records[headerAt] ?? [];
  const roles = header.map((heading) => (heading.endsWith(' badge') ? ('badge' as const) : heading.endsWith(' source') ? ('source' as const) : ('value' as const)));
  const badges = badgeAllowances();
  const findings: CsvTermFinding[] = [];
  file.records.forEach((record, at) => {
    const inTable = at > headerAt && record.length === header.length;
    record.forEach((cell, column) => {
      const role = inTable ? (roles[column] ?? 'value') : ('line' as const);
      const matches =
        role === 'badge' ? scanCopy(cell, { allowances: badges }) : role === 'source' ? findReservedTerms(sourceLineWords(cell, options.citedFileNames)) : findReservedTerms(cell);
      if (matches.length > 0) findings.push({ record: at, column, role, cell, terms: matches.map((match) => match.text) });
    });
  });
  return findings;
}
