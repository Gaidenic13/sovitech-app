/**
 * The search record of a completed AI run (ai-extraction.ts, aiSearchRecord): the parts code
 * sent, and for each field answered "not found" the sent parts that answer named as read
 * (guardrails rule 12, "Code records coverage. Code, not the AI, records which pages were sent
 * to the model"; phase 2 review, adversarial finding "searchedCoverage counts as searched every
 * page the extractor read"). Hand-built runs with a TEST model id; every value is TEST data.
 */
import { describe, expect, it } from 'vitest';
import type { ExtractionRun } from '@sovitech/ai';
import { AI_SEARCH_FORMAT, parseAiSearchRecord, formatAiSearchRecord } from '../documents/coverage';
import { aiSearchRecord } from './ai-extraction';

const HASH = `sha256:${'5'.repeat(64)}`;
const DOC = 'test-doc-workbook';

function run(overrides: Partial<Extract<ExtractionRun, { outcome: 'completed' }>>): Extract<ExtractionRun, { outcome: 'completed' }> {
  return {
    outcome: 'completed',
    modelId: 'TEST-model-not-a-real-id',
    proposals: [],
    notFound: [],
    missingFieldKeys: [],
    findings: [],
    notes: [],
    rejections: [],
    engineerFlags: [],
    guardrailEvents: [],
    coverage: [
      {
        documentId: DOC,
        contentHash: HASH,
        locators: [
          { sheet: 'TEST Rooms', cell: 'A1' },
          { sheet: 'TEST Rooms', cell: 'B2' },
          { sheet: 'TEST Plant', cell: 'A1' },
        ],
      },
    ],
    attempts: [
      { attempt: 1, fieldKeys: ['TEST.rooms', 'TEST.area'], modelId: 'TEST-model-not-a-real-id', receivedAt: '2026-09-30T10:00:00.000Z' },
      { attempt: 2, fieldKeys: ['TEST.area'], modelId: 'TEST-model-not-a-real-id', receivedAt: '2026-09-30T10:01:00.000Z' },
    ],
    validations: [],
    ...overrides,
  };
}

const answer = (fieldKey: string, locators: { page: number | null; sheet: string | null; cell: string | null }[], documentId = DOC) => ({
  fieldKey,
  subject: null,
  searched: [{ documentId, locators }],
});

describe('F-INGEST-05 · R-029: the search record of a completed AI run', () => {
  it('F-EXTRACT-02 · F-INGEST-05 · rule 12: names the fields asked in every attempt, the parts sent, and when the last response arrived', () => {
    const record = aiSearchRecord({ documentId: DOC, contentHash: HASH, run: run({}) });
    expect(record).toEqual({
      format: AI_SEARCH_FORMAT,
      documentId: DOC,
      contentHash: HASH,
      modelId: 'TEST-model-not-a-real-id',
      completedAt: '2026-09-30T10:01:00.000Z',
      fields: ['TEST.rooms', 'TEST.area'],
      sent: ['cell:TEST Rooms!A1', 'cell:TEST Rooms!B2', 'cell:TEST Plant!A1'],
      notFound: [],
    });
    expect(record === undefined ? undefined : parseAiSearchRecord(formatAiSearchRecord(record))).toEqual(record);
  });

  it('F-EXTRACT-03 · F-INGEST-05 · rule 12: reads a "not found" answer over the whole document, a sheet or a cell as the sent parts it names, and never a part not sent', () => {
    const record = aiSearchRecord({
      documentId: DOC,
      contentHash: HASH,
      run: run({
        notFound: [
          answer('TEST.rooms', [{ page: null, sheet: null, cell: null }]),
          answer('TEST.area', [{ page: null, sheet: 'TEST Rooms', cell: null }, { page: null, sheet: 'TEST Hidden', cell: 'Z9' }]),
          answer('TEST.floors', [{ page: null, sheet: 'TEST Plant', cell: 'A1' }]),
          answer('TEST.zones', [{ page: null, sheet: null, cell: null }], 'test-doc-other'),
        ],
      }),
    });
    expect(record?.notFound).toEqual([
      { fieldKey: 'TEST.rooms', parts: ['cell:TEST Rooms!A1', 'cell:TEST Rooms!B2', 'cell:TEST Plant!A1'] },
      { fieldKey: 'TEST.area', parts: ['cell:TEST Rooms!A1', 'cell:TEST Rooms!B2'] },
      { fieldKey: 'TEST.floors', parts: ['cell:TEST Plant!A1'] },
    ]);
  });

  it('F-INGEST-05 · rule 12: records nothing for a document the run did not send', () => {
    expect(aiSearchRecord({ documentId: 'test-doc-not-sent', contentHash: HASH, run: run({}) })).toBeUndefined();
    expect(aiSearchRecord({ documentId: DOC, contentHash: `sha256:${'6'.repeat(64)}`, run: run({}) })).toBeUndefined();
  });
});
