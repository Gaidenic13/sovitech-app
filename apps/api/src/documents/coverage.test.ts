/**
 * Coverage as code records it, the 2.8 status lines of a document, and what a "not found"
 * statement may count as searched (guardrails rule 12, 2.3, 2.8; G12-1, G12-3, G12-4, G12-5
 * are the indexed cases). Every value is TEST data.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { STATUS_LINES } from '@sovitech/registry';
import type { DocumentRecord, DocumentStatus } from '@sovitech/domain';
import {
  AI_SEARCH_FORMAT,
  countOf,
  covers,
  formatAiSearchRecord,
  formatCoverage,
  mergedRanges,
  notAnalysedLine,
  parseAiSearchRecord,
  parseCoverage,
  readCoverage,
  searchedCoverage,
  statusLineOf,
  type AiSearchRecord,
  type Coverage,
} from './coverage';
import { STORED_ONLY_WORD } from './formats';

describe('the coverage text (2.3: recorded by code)', () => {
  it('F-INGEST-05 · 2.3: writes and reads back each form', () => {
    const forms: Coverage[] = [
      { kind: 'pending' },
      { kind: 'none' },
      { kind: 'stored', word: 'IFC model' },
      { kind: 'stored', word: 'PDF scan' },
      { kind: 'read', unit: 'pages', ranges: [{ first: 1, last: 11 }, { first: 13, last: 40 }], total: 40 },
      { kind: 'read', unit: 'sheets', ranges: [{ first: 2, last: 2 }], total: 3 },
      { kind: 'read', unit: 'pages', ranges: [], total: 5 },
    ];
    for (const form of forms) expect(parseCoverage(formatCoverage(form))).toEqual(form);
    expect(formatCoverage({ kind: 'read', unit: 'pages', ranges: [{ first: 1, last: 37 }], total: 40 })).toBe('pages 1-37 of 40');
  });

  it('F-INGEST-05 · 2.3: refuses a text it did not write', () => {
    for (const text of ['', 'TEST', 'pages 0-3 of 3', 'pages 2-1 of 3', 'pages 1-4 of 3', 'stored: TEST file', 'pages 1-3', 'lines 1-2 of 2']) {
      expect(parseCoverage(text), text).toBeUndefined();
    }
  });

  it('F-INGEST-05 · rule 12: property: merged ranges count every position once, whatever the order and overlap', () => {
    fc.assert(
      fc.property(fc.array(fc.tuple(fc.integer({ min: 1, max: 60 }), fc.integer({ min: 0, max: 5 })), { maxLength: 12 }), (pairs) => {
        const ranges = pairs.map(([first, span]) => ({ first, last: first + span }));
        const positions = new Set(ranges.flatMap((range) => Array.from({ length: range.last - range.first + 1 }, (_, index) => range.first + index)));
        expect(countOf(mergedRanges(ranges))).toBe(positions.size);
        expect(countOf(ranges)).toBe(positions.size);
      }),
    );
  });
});

describe('the status line of a document (2.8)', () => {
  it('US-DOCS-03 · F-INGEST-04 · 2.8: queued and analysing show a progress state with no text; analysed shows its coverage', () => {
    expect(statusLineOf({ status: 'queued', coverage: 'pending' })).toEqual({ kind: 'progress' });
    expect(statusLineOf({ status: 'analysing', coverage: 'pending' })).toEqual({ kind: 'progress' });
    expect(statusLineOf({ status: 'analysed', coverage: 'pages 1-3 of 3' })).toEqual({ kind: 'coverage', coverage: 'pages 1-3 of 3' });
  });

  it('G12-3 · US-DOCS-03 · F-INGEST-05: "Partly analysed (37 of 40 pages)" from the pages read', () => {
    expect(statusLineOf({ status: 'partly_analysed', coverage: 'pages 1-11, 13-24, 26-32, 34-40 of 40' })).toEqual({
      kind: 'status_line',
      statusLineId: 'partly_analysed',
      text: 'Partly analysed (37 of 40 pages)',
      slots: { analysed: '37', total: '40' },
    });
  });

  it('F-INGEST-05 · rule 12 · P-2-XLSX-SHEETS: a workbook partly analysed shows its sheet coverage as recorded, never the pages line with sheet numbers, and no new wording', () => {
    const line = statusLineOf({ status: 'partly_analysed', coverage: 'sheets 1 of 2' });
    expect(line).toEqual({ kind: 'coverage', coverage: 'sheets 1 of 2' });
    expect(JSON.stringify(line)).not.toMatch(/pages|Partly analysed/u);
  });

  it('US-DOCS-03 · F-INGEST-04 · 2.8: "Analysis failed" is 2.8\'s line word for word', () => {
    expect(statusLineOf({ status: 'failed', coverage: 'none' })).toMatchObject({ statusLineId: 'analysis_failed', text: 'Analysis failed' });
  });

  it("G12-1 · US-DOCS-04 · US-IFC-01 · F-INGEST-03: the G12-1 line keeps 2.8's words and names the file type in its slot (prompt 3 5.3)", () => {
    const rvt = STATUS_LINES.find((line) => line.id === 'not_analysed')?.text;
    expect(notAnalysedLine('RVT model')).toBe(rvt);
    for (const word of [...Object.values(STORED_ONLY_WORD), 'PDF scan' as const]) {
      const line = notAnalysedLine(word);
      expect(line).toBe(`Not analysed: ${word} stored, not analysed`);
      expect(statusLineOf({ status: 'stored_only', coverage: `stored: ${word}` })).toEqual({ kind: 'status_line', statusLineId: 'not_analysed', text: line, slots: { fileType: word } });
    }
  });
});

describe('what a "not found" statement may count as searched (rule 12)', () => {
  const record = (id: string, status: DocumentRecord['analysis']['status'], coverage: string): DocumentRecord => ({
    id,
    projectId: 'test-project',
    contentHash: `sha256:${id}`,
    kind: 'other',
    stage: 'unknown',
    analysis: { status, coverage },
  });

  it('G12-4 · G12-5 · US-DOCS-07 · F-INGEST-05: counts only the pages or sheets an active document\'s analysis read; never a stored model, a failed, pending or removed document', () => {
    const documents = [
      record('test-analysed', 'analysed', 'pages 1-3 of 3'),
      record('test-partly', 'partly_analysed', 'pages 1-20 of 40'),
      record('test-model', 'stored_only', 'stored: IFC model'),
      record('test-scan', 'stored_only', 'stored: PDF scan'),
      record('test-failed', 'failed', 'none'),
      record('test-queued', 'queued', 'pending'),
      record('test-withdrawn', 'analysed', 'pages 1-2 of 2'),
      record('test-superseded', 'analysed', 'pages 1-2 of 2'),
      record('test-sheets', 'analysed', 'sheets 1, 3 of 3'),
    ];
    const status = (id: string): DocumentStatus => (id === 'test-withdrawn' ? 'withdrawn' : id === 'test-superseded' ? 'superseded' : 'active');
    const searched = readCoverage(documents, status);
    expect(searched.map((entry) => entry.documentId)).toEqual(['test-analysed', 'test-partly', 'test-sheets']);
    expect(covers(searched, 'test-partly', 20)).toBe(true);
    expect(covers(searched, 'test-partly', 21)).toBe(false);
    expect(covers(searched, 'test-sheets', 2)).toBe(false);
    expect(covers(searched, 'test-model', 1)).toBe(false);
  });
});

// Phase 2 review, adversarial finding "searchedCoverage counts as searched every page the extractor
// read, whether or not any AI run looked for the field there" (rule 12, "Code records coverage").
describe('what a "not found" statement about a field may count as searched: read, sent and answered', () => {
  const record = (id: string, status: DocumentRecord['analysis']['status'], coverage: string): DocumentRecord => ({
    id,
    projectId: 'test-project',
    contentHash: `sha256:${id.length.toString(16).padStart(64, '0')}`,
    kind: 'other',
    stage: 'unknown',
    analysis: { status, coverage },
  });
  const pdf = record('test-pdf', 'partly_analysed', 'pages 1-3, 5 of 6');
  const workbook = record('test-workbook-x', 'analysed', 'sheets 1-2 of 2');
  const model = record('test-model-ifc-x', 'stored_only', 'stored: IFC model');
  const documents = [pdf, workbook, model];
  const active = (): DocumentStatus => 'active';
  const cells = new Set(['cell:TEST Rooms!A1', 'cell:TEST Rooms!B2', 'cell:TEST Plant!A1']);
  const storedParts = (hash: string): ReadonlySet<string> => (hash === workbook.contentHash ? cells : new Set(['page:1', 'page:2', 'page:3', 'page:5']));
  const run = (document: DocumentRecord, overrides: Partial<AiSearchRecord> = {}): AiSearchRecord => ({
    format: AI_SEARCH_FORMAT,
    documentId: document.id,
    contentHash: document.contentHash,
    modelId: 'TEST-model-not-a-real-id',
    completedAt: '2026-09-30T10:00:00.000Z',
    fields: ['TEST.building.rooms', 'TEST.building.area'],
    sent: ['page:1', 'page:2', 'page:3', 'page:5'],
    notFound: [{ fieldKey: 'TEST.building.rooms', parts: ['page:1', 'page:2', 'page:5'] }],
    ...overrides,
  });
  const searched = (fieldKey: string, runs: readonly AiSearchRecord[], status = active) => searchedCoverage(documents, status, { fieldKey, runs, storedParts });

  it('US-DOCS-07 · F-INGEST-05 · rule 12: counts nothing as searched with no completed AI run, though the extractor read the pages', () => {
    expect(readCoverage(documents, active).map((entry) => entry.documentId)).toEqual(['test-pdf', 'test-workbook-x']);
    expect(searched('TEST.building.rooms', [])).toEqual([]);
  });

  it('US-DOCS-07 · F-INGEST-05 · rule 12: counts the pages a run sent, read and answered "not found" with, and only for that field', () => {
    expect(searched('TEST.building.rooms', [run(pdf)])).toEqual([
      { documentId: 'test-pdf', unit: 'pages', ranges: [{ first: 1, last: 2 }, { first: 5, last: 5 }], total: 6 },
    ]);
    // Asked, but not answered "not found" (a candidate, a refusal, or "missing"): not searched.
    expect(searched('TEST.building.area', [run(pdf)])).toEqual([]);
    // Not asked at all.
    expect(searched('TEST.building.floors', [run(pdf, { notFound: [{ fieldKey: 'TEST.building.floors', parts: ['page:1'] }] })])).toEqual([]);
  });

  it('US-DOCS-07 · F-INGEST-05 · rule 12: never counts a part the run did not send, a page the extractor did not read, another revision or an inactive document', () => {
    expect(searched('TEST.building.rooms', [run(pdf, { sent: ['page:1'] })])).toEqual([{ documentId: 'test-pdf', unit: 'pages', ranges: [{ first: 1, last: 1 }], total: 6 }]);
    expect(searched('TEST.building.rooms', [run(pdf, { sent: ['page:4', 'page:6'], notFound: [{ fieldKey: 'TEST.building.rooms', parts: ['page:4', 'page:6'] }] })])).toEqual([]);
    expect(searched('TEST.building.rooms', [run(pdf, { contentHash: `sha256:${'e'.repeat(64)}` })])).toEqual([]);
    expect(searched('TEST.building.rooms', [run(pdf)], () => 'withdrawn')).toEqual([]);
    expect(searched('TEST.building.rooms', [run(model, { sent: ['page:1'], notFound: [{ fieldKey: 'TEST.building.rooms', parts: ['page:1'] }] })])).toEqual([]);
  });

  it("US-DOCS-07 · F-INGEST-05 · rule 12: counts a workbook's read sheets only when a run searched every cell stored for it", () => {
    const all = run(workbook, { sent: [...cells], notFound: [{ fieldKey: 'TEST.building.rooms', parts: [...cells] }] });
    expect(searched('TEST.building.rooms', [all])).toEqual([{ documentId: 'test-workbook-x', unit: 'sheets', ranges: [{ first: 1, last: 2 }], total: 2 }]);
    const some = run(workbook, { sent: [...cells], notFound: [{ fieldKey: 'TEST.building.rooms', parts: ['cell:TEST Rooms!A1', 'cell:TEST Rooms!B2'] }] });
    expect(searched('TEST.building.rooms', [some])).toEqual([]);
  });

  it('F-INGEST-05 · rule 13: stores a record with codes and part names only, and reads back only what it wrote', () => {
    const stored = formatAiSearchRecord(run(pdf));
    expect(parseAiSearchRecord(stored)).toEqual(run(pdf));
    for (const text of ['', 'TEST', '{}', stored.replace(AI_SEARCH_FORMAT, 'other/1'), stored.replace('"page:1"', '"TEST free text"')]) {
      expect(parseAiSearchRecord(text), text).toBeUndefined();
    }
  });
});
