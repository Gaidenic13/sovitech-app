/**
 * Coverage as code records it, the 2.8 status line of each document, and what a
 * "Not found in the analysed documents (<coverage>)" statement may count as searched
 * (guardrails rule 12; 2.3 `DocumentRecord.analysis`; 2.8 status lines; F-INGEST-05;
 * PRD R-013, R-014, R-022, R-029; G12-1, G12-3, G12-4, G12-5).
 *
 * The coverage text is the one 2.3 stores (`coverage: string; // recorded by code,
 * e.g. 'pages 1-37 of 40'`), written and read only here, in a closed form:
 *   pending                       queued or analysing: nothing is read yet
 *   pages <ranges> of <total>     a PDF's pages read, e.g. "pages 1-11, 13-40 of 40"
 *   sheets <ranges> of <total>    an XLSX workbook's sheets read, by their order
 *   stored: <word>                stored and not analysed (G12-1; the contract's formatWord)
 *   none                          the analysis failed
 *
 * What never counts as searched (rule 12, "Absence of evidence is not evidence of
 * absence"; "A truncated document can never support a 'none found' statement"):
 * a document stored and not analysed, an IFC model above all while `ifc-values` is
 * closed (G12-5), a failed or pending analysis, pages or sheets that were not read
 * (G12-3, G12-4), a withdrawn, erased or superseded document, and anything inside a
 * ZIP archive (R-014).
 *
 * Reading is not searching (phase 2 review, adversarial finding "searchedCoverage counts
 * as searched every page the extractor read"): a part counts as searched for a field only
 * when a completed AI run sent it and answered that field "not found" with it among what
 * it read (rule 12, "Code records coverage. Code, not the AI, records which pages were
 * sent to the model"). Each completed run's search record is stored with the document's
 * text, keyed by project and content hash (AI_SEARCH_PART_PREFIX; ai-extraction.ts writes
 * it), and goes with the document's text on erasure. With no such run, nothing counts as
 * searched for the field, so no "Not found in the analysed documents" statement exists.
 */
import { readDocumentTexts, type Request } from '@sovitech/db';
import { parseNumber, statusLineById } from '@sovitech/registry';
import type { DocumentAnalysisStatus, DocumentRecord, DocumentStatus } from '@sovitech/domain';
import { parse as parseJson } from 'yaml';
import { z } from 'zod';
import type { StoredOnlyWord } from './formats';

/** A closed range of pages or sheets, first to last, both counted from 1. */
export interface CoverageRange {
  readonly first: number;
  readonly last: number;
}

export type Coverage =
  | { readonly kind: 'pending' }
  | { readonly kind: 'read'; readonly unit: 'pages' | 'sheets'; readonly ranges: readonly CoverageRange[]; readonly total: number }
  | { readonly kind: 'stored'; readonly word: StoredOnlyWord }
  | { readonly kind: 'none' };

const STORED_WORDS: ReadonlySet<string> = new Set([
  'IFC model',
  'RVT model',
  'DWG drawing',
  'DOCX file',
  'JPG image',
  'PNG image',
  'ZIP archive',
  'PDF scan',
]);

/** Merges and orders ranges: [3-4, 1-2, 6] reads as 1-4, 6. */
export function mergedRanges(ranges: readonly CoverageRange[]): CoverageRange[] {
  const sorted = [...ranges].sort((a, b) => a.first - b.first);
  const merged: CoverageRange[] = [];
  for (const range of sorted) {
    const last = merged.at(-1);
    if (last !== undefined && range.first <= last.last + 1) merged[merged.length - 1] = { first: last.first, last: Math.max(last.last, range.last) };
    else merged.push({ first: range.first, last: range.last });
  }
  return merged;
}

/** How many pages or sheets the ranges hold: the distinct positions they name. */
export function countOf(ranges: readonly CoverageRange[]): number {
  const positions = new Set<number>();
  for (const range of ranges) for (let position = range.first; position <= range.last; position += 1) positions.add(position);
  return positions.size;
}

/** The coverage text 2.3 stores. */
export function formatCoverage(coverage: Coverage): string {
  switch (coverage.kind) {
    case 'pending':
      return 'pending';
    case 'none':
      return 'none';
    case 'stored':
      return `stored: ${coverage.word}`;
    case 'read': {
      const ranges = mergedRanges(coverage.ranges).map((range) => (range.first === range.last ? `${range.first}` : `${range.first}-${range.last}`));
      return `${coverage.unit} ${ranges.length === 0 ? 'none' : ranges.join(', ')} of ${coverage.total}`;
    }
  }
}

const READ = /^(pages|sheets) (none|\d+(?:-\d+)?(?:, \d+(?:-\d+)?)*) of (\d+)$/u;

/** Reads a stored coverage text back; undefined for a text this module did not write. */
export function parseCoverage(text: string): Coverage | undefined {
  if (text === 'pending') return { kind: 'pending' };
  if (text === 'none') return { kind: 'none' };
  if (text.startsWith('stored: ')) {
    const word = text.slice('stored: '.length);
    return STORED_WORDS.has(word) ? { kind: 'stored', word: word as StoredOnlyWord } : undefined;
  }
  const match = READ.exec(text);
  if (match === null) return undefined;
  const [, unit, list, totalText] = match;
  if ((unit !== 'pages' && unit !== 'sheets') || list === undefined || totalText === undefined) return undefined;
  const total = wholeNumber(totalText);
  if (total === undefined) return undefined;
  const ranges: CoverageRange[] = [];
  if (list !== 'none') {
    for (const part of list.split(', ')) {
      const [firstText, lastText] = part.split('-');
      const first = firstText === undefined ? undefined : wholeNumber(firstText);
      const last = lastText === undefined ? first : wholeNumber(lastText);
      if (first === undefined || last === undefined || first < 1 || last < first || last > total) return undefined;
      ranges.push({ first, last });
    }
  }
  return { kind: 'read', unit, ranges, total };
}

/** A page or sheet position written in digits, as this module writes it, read through the rule 8 parser. */
export function wholeNumber(text: string): number | undefined {
  if (!/^\d{1,6}$/u.test(text)) return undefined;
  const parsed = parseNumber(text);
  if (!parsed.ok || parsed.readings.length !== 1) return undefined;
  const value = parsed.readings[0]?.value;
  return value !== undefined && Number.isInteger(value) ? value : undefined;
}

// ---------------------------------------------------------------------------
// The 2.8 status line of a document (what its row shows)
// ---------------------------------------------------------------------------

/**
 * A document's status line, from its analysis status and coverage:
 * - queued or analysing: a progress state with no text of its own (US-DOCS-03 AC1);
 * - analysed: its coverage as recorded (US-DOCS-03 AC2), no 2.8 line;
 * - partly analysed: "Partly analysed (<analysed> of <total> pages)" (G12-3); a workbook partly
 *   analysed (a sheet not read) shows its coverage as recorded, as an analysed one does: 2.8's
 *   line counts pages, and a line for sheets waits for the approver (P-2-XLSX-SHEETS), so no
 *   new wording is shown;
 * - stored and not analysed: the G12-1 line naming its file type (G12-1, G12-5);
 * - failed: "Analysis failed".
 * The numbers in a line are slots the view-model binds to `document:<id>.coverage`
 * (prompt 3 section 7); here they are the stored state they come from.
 */
export type DocumentStatusLine =
  | { readonly kind: 'progress' }
  | { readonly kind: 'coverage'; readonly coverage: string }
  | {
      readonly kind: 'status_line';
      readonly statusLineId: 'partly_analysed' | 'not_analysed' | 'analysis_failed';
      readonly text: string;
      readonly slots: Readonly<Record<string, string>>;
    };

/** The G12-1 line for a file type: 2.8's text with "RVT model" in its slot replaced by the file type's word (prompt 3 5.3). */
export function notAnalysedLine(word: StoredOnlyWord): string {
  const text = statusLineById('not_analysed').text;
  const rvt = 'RVT model';
  if (!text.includes(rvt)) throw new Error('the registry\'s "Not analysed" line no longer names the RVT model slot');
  return text.replace(rvt, word);
}

export function statusLineOf(analysis: { readonly status: DocumentAnalysisStatus; readonly coverage: string }): DocumentStatusLine {
  const coverage = parseCoverage(analysis.coverage);
  switch (analysis.status) {
    case 'queued':
    case 'analysing':
      return { kind: 'progress' };
    case 'analysed':
      return { kind: 'coverage', coverage: analysis.coverage };
    case 'partly_analysed': {
      if (coverage?.kind !== 'read') return { kind: 'status_line', statusLineId: 'analysis_failed', text: statusLineById('analysis_failed').text, slots: {} };
      if (coverage.unit === 'sheets') return { kind: 'coverage', coverage: analysis.coverage };
      const analysed = `${countOf(coverage.ranges)}`;
      const total = `${coverage.total}`;
      const template = statusLineById('partly_analysed').text;
      return {
        kind: 'status_line',
        statusLineId: 'partly_analysed',
        text: template.replace('{analysed}', analysed).replace('{total}', total),
        slots: { analysed, total },
      };
    }
    case 'stored_only': {
      if (coverage?.kind !== 'stored') throw new Error('a stored-only document names its file type in its coverage');
      return { kind: 'status_line', statusLineId: 'not_analysed', text: notAnalysedLine(coverage.word), slots: { fileType: coverage.word } };
    }
    case 'failed':
      return { kind: 'status_line', statusLineId: 'analysis_failed', text: statusLineById('analysis_failed').text, slots: {} };
  }
}

// ---------------------------------------------------------------------------
// What a "Not found in the analysed documents" statement may count as searched
// ---------------------------------------------------------------------------

/** One document's part that was read and may be cited as searched. */
export interface SearchedDocument {
  readonly documentId: string;
  readonly unit: 'pages' | 'sheets';
  readonly ranges: readonly CoverageRange[];
  readonly total: number;
}

/**
 * The upper bound of any "not found" statement: only active documents whose analysis read
 * something, and only the pages or sheets it read (rule 12; G12-4, G12-5). It is never cited
 * as searched on its own: searchedCoverage narrows it to what a completed AI run searched.
 */
export function readCoverage(
  documents: readonly DocumentRecord[],
  status: (documentId: string) => DocumentStatus,
): SearchedDocument[] {
  const read: SearchedDocument[] = [];
  for (const document of documents) {
    if (status(document.id) !== 'active') continue;
    if (document.analysis.status !== 'analysed' && document.analysis.status !== 'partly_analysed') continue;
    const coverage = parseCoverage(document.analysis.coverage);
    if (coverage?.kind !== 'read' || coverage.ranges.length === 0) continue;
    read.push({ documentId: document.id, unit: coverage.unit, ranges: mergedRanges(coverage.ranges), total: coverage.total });
  }
  return read;
}

// ---------------------------------------------------------------------------
// What a completed AI run searched, per document and field
// ---------------------------------------------------------------------------

/** The document_texts part prefix of a completed AI run's search record: `ai:searched:<run id>`. */
export const AI_SEARCH_PART_PREFIX = 'ai:searched:';
export const AI_SEARCH_FORMAT = 'sovitech-ai-search/1';

/** A stored text part a request sends as a block: a page, or a sheet's cell. */
const SENT_PART = /^(?:page:[1-9][0-9]{0,5}|cell:.+![A-Z]{1,3}[1-9][0-9]{0,6})$/u;

/**
 * One completed AI run over one document revision, as code recorded it: the fields it
 * asked, the text parts it sent, and, per field it answered "not found", the sent parts
 * that answer named as read. Codes, ids and part names only; no text of the document.
 */
export const AiSearchRecordSchema = z.strictObject({
  format: z.literal(AI_SEARCH_FORMAT),
  documentId: z.string().min(1),
  contentHash: z.string().regex(/^sha256:[0-9a-f]{64}$/u),
  modelId: z.string().min(1),
  completedAt: z.string().min(1),
  fields: z.array(z.string().min(1)),
  sent: z.array(z.string().regex(SENT_PART)),
  notFound: z.array(z.strictObject({ fieldKey: z.string().min(1), parts: z.array(z.string().regex(SENT_PART)) })),
});
export type AiSearchRecord = z.infer<typeof AiSearchRecordSchema>;

/** The record as stored. */
export function formatAiSearchRecord(record: AiSearchRecord): string {
  return JSON.stringify(AiSearchRecordSchema.parse(record));
}

/** A stored record read back; undefined for a text this module did not write. */
export function parseAiSearchRecord(text: string): AiSearchRecord | undefined {
  let value: unknown;
  try {
    value = parseJson(text, { schema: 'json', maxAliasCount: 0, uniqueKeys: true });
  } catch {
    return undefined;
  }
  const parsed = AiSearchRecordSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

/** What searchedCoverage reads for one field: the stored search records, and each revision's stored text parts. */
export interface FieldSearch {
  readonly fieldKey: string;
  readonly runs: readonly AiSearchRecord[];
  /** The page and cell parts stored for a content hash (a workbook counts only when every cell was searched). */
  readonly storedParts: (contentHash: string) => ReadonlySet<string>;
}

/** The search records and stored parts of a project's documents, from the store (the request's project). */
export async function readAiSearches(request: Request, documents: readonly DocumentRecord[]): Promise<Omit<FieldSearch, 'fieldKey'>> {
  const runs: AiSearchRecord[] = [];
  const stored = new Map<string, Set<string>>();
  for (const contentHash of new Set(documents.map((document) => document.contentHash))) {
    const parts = await readDocumentTexts(request, contentHash, '');
    stored.set(contentHash, new Set(parts.map((part) => part.part).filter((part) => SENT_PART.test(part))));
    for (const part of parts) {
      if (!part.part.startsWith(AI_SEARCH_PART_PREFIX)) continue;
      const record = parseAiSearchRecord(part.text);
      if (record !== undefined && record.contentHash === contentHash) runs.push(record);
    }
  }
  return { runs, storedParts: (contentHash) => stored.get(contentHash) ?? new Set() };
}

/**
 * The documents, and their parts, that a "not found" statement about one field may count
 * as searched: the intersection of what the extractor read (readCoverage) and what a
 * completed AI run on that revision sent and named as read in its "not found" answer for
 * the field. Pages count one by one; a workbook's read sheets count only when such a run
 * searched every cell stored for it (its sheets are known by position, its cells by name).
 * With no such run, nothing counts: no statement (rule 12; G12-4, G12-5).
 */
export function searchedCoverage(
  documents: readonly DocumentRecord[],
  status: (documentId: string) => DocumentStatus,
  search: FieldSearch,
): SearchedDocument[] {
  const byId = new Map(documents.map((document) => [document.id, document]));
  const searched: SearchedDocument[] = [];
  for (const read of readCoverage(documents, status)) {
    const document = byId.get(read.documentId);
    if (document === undefined) continue;
    const answered = search.runs
      .filter((run) => run.documentId === document.id && run.contentHash === document.contentHash && run.fields.includes(search.fieldKey))
      .flatMap((run) => {
        const sent = new Set(run.sent);
        return run.notFound.filter((answer) => answer.fieldKey === search.fieldKey).map((answer) => answer.parts.filter((part) => sent.has(part)));
      });
    if (answered.length === 0) continue;
    if (read.unit === 'pages') {
      const pages = new Set(answered.flat().flatMap((part) => (part.startsWith('page:') ? [wholeNumber(part.slice('page:'.length))] : [])));
      const ranges = mergedRanges(
        read.ranges.flatMap((range) =>
          Array.from({ length: range.last - range.first + 1 }, (_, offset) => range.first + offset)
            .filter((page) => pages.has(page))
            .map((page) => ({ first: page, last: page })),
        ),
      );
      if (ranges.length > 0) searched.push({ ...read, ranges });
    } else {
      const cells = [...search.storedParts(document.contentHash)].filter((part) => part.startsWith('cell:'));
      const whole = cells.length > 0 && answered.some((parts) => cells.every((cell) => parts.includes(cell)));
      if (whole) searched.push(read);
    }
  }
  return searched;
}

/** Whether a statement over `searched` covers a page (or sheet) of a document: it was read. */
export function covers(searched: readonly SearchedDocument[], documentId: string, position: number): boolean {
  return searched.some((entry) => entry.documentId === documentId && entry.ranges.some((range) => range.first <= position && position <= range.last));
}
