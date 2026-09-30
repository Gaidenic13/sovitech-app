/**
 * G12-9 (docs/guardrails.md section 7; rule 12, "Partial processing is shown with its coverage. Files
 * that were only stored, partly analysed or failed are shown as such, with coverage"; 2.3,
 * `analysis.status` 'partly_analysed'; F-INGEST-05). Phase 2 review, verifier finding "a workbook with
 * an unread sheet is stored with DocumentRecord.analysis.status 'analysed'" (medium).
 * Situation: a workbook is analysed and one of its sheets is not read (a chart sheet, or a sheet over
 * the cell limit).
 * Expected: its analysis status is stored as partly_analysed, never analysed.
 *
 * Two halves. The extraction contract, which both the extractor and the API hold every output to,
 * refuses a workbook output that says `analysed` while its coverage names a sheet not read; before the
 * fix it allowed only `analysed` or `failed` for a workbook. And on a TEST database, the owner uploads
 * the synthetic room schedule and the extractor (scripted from the contract's own TEST sample: two
 * sheets read, a chart sheet not read) reports it partly analysed in sheets: the store records
 * `partly_analysed`. The owner's row shows the recorded coverage; a "Partly analysed" line for sheets
 * waits for the approver (P-2-XLSX-SHEETS), so no new wording is asserted here. The extractor's own
 * half (it derives the status from the sheets it read) is its pytest,
 * services/extractor/tests/test_xlsx_status_and_declared_format.py.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { parse } from 'yaml';
import { readProjectDocuments, withRequest } from '@sovitech/db';
import { parseExtractionOutput } from '@sovitech/extraction-contract';
import { REPOSITORY_ROOT, ScriptedRunner, documentList, fixtureBytes, ownerWithProject, signIn, startTestApi, testWorker, upload, type Auth, type TestApi } from './_support/api';

const corpus = parse(readFileSync(join(REPOSITORY_ROOT, 'packages', 'extraction-contract', 'src', 'samples', 'corpus.json'), 'utf8'), { schema: 'json' }) as {
  readonly cases: readonly { readonly name: string; readonly value?: Record<string, unknown> }[];
};
const SAMPLE = corpus.cases.find((entry) => entry.name === 'xlsx-partly-analysed-sheets')?.value;

/** The contract's TEST sample (two sheets read, a chart sheet not read) as the answer to this job. */
function workbookOutput(job: { readonly projectId: string; readonly documentId: string; readonly contentHash: string }, analysis?: Record<string, unknown>): Record<string, unknown> {
  if (SAMPLE === undefined) throw new Error('the contract sample xlsx-partly-analysed-sheets is missing');
  return { ...SAMPLE, job, derivatives: [], ...(analysis === undefined ? {} : { analysis }) };
}

let api: TestApi;
let ownerId: string;
let projectId: string;
let auth: Auth;
let documentId: string;

beforeAll(async () => {
  api = await startTestApi();
  ({ ownerId, projectId } = await ownerWithProject(api, 'G12-9'));
  auth = await signIn(api, ownerId);
  documentId = (await upload(api, auth, projectId, 'tabel-camere.xlsx', fixtureBytes('fixtures/xlsx/tabel-camere.xlsx'))).body.documentId ?? '';
}, 240_000);

afterAll(async () => {
  await api.stop();
});

test('F-INGEST-05 · R-015 · G12-9: a workbook output that says "analysed" while a sheet was not read is refused by the contract; "partly analysed" in sheets is not', () => {
  const job = SAMPLE?.['job'] as { projectId: string; documentId: string; contentHash: string };
  const analysed = parseExtractionOutput(workbookOutput(job, { status: 'analysed' }));
  expect(analysed.ok).toBe(false);
  if (!analysed.ok) expect(analysed.problems.map((problem) => problem.code)).toContain('invariant:sheet_coverage');
  expect(parseExtractionOutput(workbookOutput(job)).ok).toBe(true);
});

test('US-DOCS-06 · F-INGEST-04 · F-INGEST-05 · G12-9: a workbook with a sheet not read is stored partly_analysed, never analysed', async () => {
  const runner = new ScriptedRunner((_job, job) => workbookOutput(job));
  expect((await testWorker(api, runner).drain()).map((step) => step.kind)).toEqual(['done']);
  const analyses = await api.database.asAdministrator<{ status: string }>('SELECT status FROM sovitech.document_analysis_events WHERE document_id = $1 ORDER BY at', [documentId]);
  expect(analyses.map((row) => row.status)).not.toContain('analysed');
  expect(analyses.at(-1)?.status).toBe('partly_analysed');
  const stored = await withRequest(api.database.app, { userId: ownerId, projectId }, async (request) => (await readProjectDocuments(request)).documents.find((document) => document.id === documentId));
  expect(stored?.analysis.status).toBe('partly_analysed');
  // The owner's row shows the recorded sheet coverage, never a line in pages.
  const row = (await documentList(api, auth, projectId)).find((document) => document['documentId'] === documentId);
  expect(row).toMatchObject({ statusLine: { kind: 'coverage' } });
  expect(JSON.stringify(row)).not.toMatch(/pages/u);
});
