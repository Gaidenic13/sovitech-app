/**
 * What the Documents register shows of the served rows (DB-15; PRD R-016, R-017; US-DOCS-13 AC3, AC5;
 * US-DOCS-15 AC4): the category chip, the search by file name, the filters over stored record fields
 * (the stage as served and the file's format), the sort by column (Date Added newest first by default)
 * and the page of rows, with previous and next only (no page numbers, no "Showing <a>-<b> of <n>": R-017
 * "Until decided").
 *
 * Pure functions over the contract's rows and the display objects the API served with them: nothing
 * here formats or derives a value. Texts are compared as served (a file name as uploaded, a stage's
 * served label), never parsed for a number.
 */
import type { DisplayObject, DocumentCategory, DocumentRow } from '@sovitech/view-model/browser';
import type { Displays } from '../../../wizard/use-step-view';

/** The rows a page shows (a project holds tens of documents; the API sends them all: ADR 0044 decision 7). */
export const PAGE_SIZE = 10;

export type CategoryChip = 'all' | DocumentCategory;

export const SORT_KEYS = ['name', 'category', 'version', 'stage', 'added', 'status'] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export type SortDirection = 'ascending' | 'descending';
export interface SortState {
  readonly key: SortKey;
  readonly direction: SortDirection;
}

/** Date Added, newest first (US-DOCS-13 AC5). */
export const DEFAULT_SORT: SortState = { key: 'added', direction: 'descending' };

/** A column head pressed: the same column turns its direction; another column starts ascending (Date Added: newest first). */
export function nextSort(current: SortState, key: SortKey): SortState {
  if (current.key === key) return { key, direction: current.direction === 'ascending' ? 'descending' : 'ascending' };
  return { key, direction: key === 'added' ? 'descending' : 'ascending' };
}

export interface DocumentFilters {
  readonly category: CategoryChip;
  /** The search box's text, matched against the served file name. */
  readonly search: string;
  /** A stage, as its served text (the stored stage's label), or undefined for every stage. */
  readonly stage?: string | undefined;
  /** A file format (the record's format), or undefined for every format. */
  readonly format?: DocumentRow['format'] | undefined;
}

export const NO_FILTERS: DocumentFilters = { category: 'all', search: '' };

/** The served text of a value id, or the empty string when the response did not carry it. */
export function textOf(displays: Displays, valueId: string | null): string {
  if (valueId === null) return '';
  return displays.get(valueId)?.text ?? '';
}

/** Lower case, without diacritics: "Plan_Parter.pdf" is found by "parter", "Secțiune" by "sectiune". */
function folded(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('en');
}

function statusText(row: DocumentRow, displays: Displays): string {
  if (row.status.kind === 'line') return textOf(displays, row.status.valueId);
  return row.status.line === undefined ? '' : textOf(displays, row.status.line);
}

const COLLATOR = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

function sortValue(row: DocumentRow, displays: Displays, key: SortKey): string {
  switch (key) {
    case 'name':
      return textOf(displays, row.fileName);
    case 'category':
      return textOf(displays, row.categoryValue);
    case 'version':
      return textOf(displays, row.revision);
    case 'stage':
      return textOf(displays, row.stage);
    case 'added':
      return row.addedAt;
    case 'status':
      return statusText(row, displays);
  }
}

function compareRows(a: DocumentRow, b: DocumentRow, displays: Displays, sort: SortState): number {
  const sign = sort.direction === 'ascending' ? 1 : -1;
  const primary = sort.key === 'added' ? Date.parse(a.addedAt) - Date.parse(b.addedAt) : COLLATOR.compare(sortValue(a, displays, sort.key), sortValue(b, displays, sort.key));
  if (primary !== 0) return sign * primary;
  // Ties keep one order: the newest first, then the id.
  const byAdded = Date.parse(b.addedAt) - Date.parse(a.addedAt);
  if (byAdded !== 0) return byAdded;
  return a.documentId.localeCompare(b.documentId);
}

/** The rows the filters keep, in the sort's order (US-DOCS-13 AC3: a chip keeps the rows whose kind maps to it; All Documents keeps every row). */
export function visibleRows(rows: readonly DocumentRow[], displays: Displays, filters: DocumentFilters, sort: SortState): DocumentRow[] {
  const search = folded(filters.search.trim());
  return rows
    .filter((row) => filters.category === 'all' || row.category === filters.category)
    .filter((row) => search === '' || folded(textOf(displays, row.fileName)).includes(search))
    .filter((row) => filters.stage === undefined || textOf(displays, row.stage) === filters.stage)
    .filter((row) => filters.format === undefined || row.format === filters.format)
    .sort((a, b) => compareRows(a, b, displays, sort));
}

export interface PageOfRows {
  readonly rows: readonly DocumentRow[];
  /** The page shown, from 1 (clamped to the last page when rows went away). */
  readonly page: number;
  readonly hasPrevious: boolean;
  readonly hasNext: boolean;
}

export function pageOfRows(rows: readonly DocumentRow[], page: number): PageOfRows {
  // A page past the last one (rows went away) steps back to the last page that holds a row.
  let shown = Math.max(1, page);
  while (shown > 1 && (shown - 1) * PAGE_SIZE >= rows.length) shown -= 1;
  const start = (shown - 1) * PAGE_SIZE;
  return { rows: rows.slice(start, start + PAGE_SIZE), page: shown, hasPrevious: shown > 1, hasNext: start + PAGE_SIZE < rows.length };
}

/** The stages the filter offers: each distinct served stage text once, with the display object that first shows it. */
export function stageOptions(rows: readonly DocumentRow[], displays: Displays): Array<{ readonly text: string; readonly display: DisplayObject }> {
  const seen = new Map<string, DisplayObject>();
  for (const row of rows) {
    const display = displays.get(row.stage);
    if (display !== undefined && !seen.has(display.text)) seen.set(display.text, display);
  }
  return [...seen.entries()].sort(([a], [b]) => COLLATOR.compare(a, b)).map(([text, display]) => ({ text, display }));
}

/** The formats the filter offers: each format present once, in the contract's order. */
export function formatOptions(rows: readonly DocumentRow[], order: readonly DocumentRow['format'][]): DocumentRow['format'][] {
  const present = new Set(rows.map((row) => row.format));
  return order.filter((format) => present.has(format));
}
