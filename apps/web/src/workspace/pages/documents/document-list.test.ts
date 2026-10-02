import { describe, expect, it } from 'vitest';
import { DOCUMENT_FORMATS, type DisplayObject, type DocumentRow } from '@sovitech/view-model/browser';
import { DEFAULT_SORT, NO_FILTERS, PAGE_SIZE, formatOptions, nextSort, pageOfRows, stageOptions, visibleRows } from './document-list';

function id(n: number): string {
  return `0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8f${String(n).padStart(2, '0')}`;
}

function row(n: number, overrides: Partial<DocumentRow> = {}): DocumentRow {
  const documentId = id(n);
  return {
    documentId,
    fileName: `document:${documentId}.fileName`,
    format: 'pdf',
    category: null,
    categoryValue: `document:${documentId}.kind`,
    revision: `document:${documentId}.revision`,
    stage: `document:${documentId}.stage`,
    addedAt: `2026-09-${String(n).padStart(2, '0')}T12:00:00.000Z`,
    status: { kind: 'progress' },
    revisionOf: null,
    downloadable: true,
    ...overrides,
  };
}

function displays(entries: ReadonlyArray<readonly [string, string]>): Map<string, DisplayObject> {
  return new Map(entries.map(([valueId, text]) => [valueId, { valueId, kind: 'record', text, shape: 'value' } satisfies DisplayObject]));
}

describe('DB-15 · US-DOCS-13 AC3 · AC5 · R-017: what the register shows', () => {
  const rows = [row(1), row(2, { category: 'mep', format: 'xlsx' }), row(3, { format: 'ifc' })];
  const shown = displays([
    [rows[0]?.fileName ?? '', 'TEST Plan Parter.pdf'],
    [rows[1]?.fileName ?? '', 'TEST Secțiune.xlsx'],
    [rows[2]?.fileName ?? '', 'TEST model.ifc'],
    [rows[0]?.stage ?? '', 'TEST stage B'],
    [rows[1]?.stage ?? '', 'TEST stage A'],
    [rows[2]?.stage ?? '', 'TEST stage B'],
  ]);

  it('US-DOCS-13 AC5: Date Added newest first by default; a column turns its direction; another column starts ascending', () => {
    expect(visibleRows(rows, shown, NO_FILTERS, DEFAULT_SORT).map((r) => r.documentId)).toEqual([id(3), id(2), id(1)]);
    expect(nextSort(DEFAULT_SORT, 'added')).toEqual({ key: 'added', direction: 'ascending' });
    expect(nextSort(DEFAULT_SORT, 'name')).toEqual({ key: 'name', direction: 'ascending' });
    expect(visibleRows(rows, shown, NO_FILTERS, { key: 'name', direction: 'ascending' }).map((r) => r.documentId)).toEqual([id(3), id(1), id(2)]);
  });

  it('US-DOCS-13 AC3 · G1-26: a chip keeps the rows of its category; an unclassified row is under All only', () => {
    expect(visibleRows(rows, shown, { ...NO_FILTERS, category: 'mep' }, DEFAULT_SORT).map((r) => r.documentId)).toEqual([id(2)]);
    expect(visibleRows(rows, shown, { ...NO_FILTERS, category: 'other' }, DEFAULT_SORT)).toEqual([]);
    expect(visibleRows(rows, shown, NO_FILTERS, DEFAULT_SORT)).toHaveLength(3);
  });

  it('US-DOCS-13 AC5: the search matches the served file name, ignoring case and diacritics', () => {
    expect(visibleRows(rows, shown, { ...NO_FILTERS, search: 'parter' }, DEFAULT_SORT).map((r) => r.documentId)).toEqual([id(1)]);
    expect(visibleRows(rows, shown, { ...NO_FILTERS, search: 'SECTIUNE' }, DEFAULT_SORT).map((r) => r.documentId)).toEqual([id(2)]);
  });

  it('US-DOCS-15 AC4: the filters work on stored record fields (the served stage, the format), each stage offered once', () => {
    expect(stageOptions(rows, shown).map((option) => option.text)).toEqual(['TEST stage A', 'TEST stage B']);
    expect(formatOptions(rows, DOCUMENT_FORMATS)).toEqual(['pdf', 'xlsx', 'ifc']);
    expect(visibleRows(rows, shown, { ...NO_FILTERS, stage: 'TEST stage B' }, DEFAULT_SORT).map((r) => r.documentId)).toEqual([id(3), id(1)]);
    expect(visibleRows(rows, shown, { ...NO_FILTERS, format: 'ifc' }, DEFAULT_SORT).map((r) => r.documentId)).toEqual([id(3)]);
  });

  it('R-017 "Until decided": pages of PAGE_SIZE with previous and next only; a page past the end steps back', () => {
    const many = Array.from({ length: PAGE_SIZE + 3 }, (_, index) => row(index + 1));
    expect(pageOfRows(many, 1)).toMatchObject({ page: 1, hasPrevious: false, hasNext: true });
    expect(pageOfRows(many, 2).rows).toHaveLength(3);
    expect(pageOfRows(many, 2)).toMatchObject({ hasPrevious: true, hasNext: false });
    expect(pageOfRows(many.slice(0, 2), 5)).toMatchObject({ page: 1, hasPrevious: false, hasNext: false });
    expect(pageOfRows([], 1)).toMatchObject({ page: 1, rows: [], hasPrevious: false, hasNext: false });
  });
});
