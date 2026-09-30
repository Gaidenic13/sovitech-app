/**
 * G12-8 (docs/guardrails.md section 7; rule 12, "Enforced by: Code records coverage. Code, not the AI,
 * records which pages were sent to the model. A truncated document can never support a 'none found'
 * statement", and "Absence of evidence is not evidence of absence"; F-INGEST-05). Phase 2 review,
 * adversarial finding "searchedCoverage counts as searched every page the extractor read" (medium).
 * Situation: the extractor read a PDF in full, and no completed AI run answered a field "not found" on it.
 * Expected: no "Not found in the analysed documents" statement about that field counts the PDF as searched.
 *
 * On a TEST database, the owner uploads the synthetic memoriu and the extractor (scripted from its
 * ground truth) reads its three pages; no AI run has looked for anything (no API key). Before the fix
 * every page read counted as searched for every field. The control: after a completed run (hand-built,
 * with a TEST model id; no model is called) that sent pages 1 and 2 and answered one field "not found",
 * only those pages count, and only for that field.
 */
import { afterAll, beforeAll, expect, test } from 'vitest';
import { withRequest } from '@sovitech/db';
import type { ExtractionRun } from '@sovitech/ai';
import { readAiSearches, readCoverage, searchedCoverage } from '../../apps/api/src/documents/coverage';
import { projectDocuments } from '../../apps/api/src/documents/service';
import { fieldsForAi, recordAiSearch } from '../../apps/api/src/ingestion/ai-extraction';
import { ScriptedRunner, fixtureBytes, ownerWithProject, signIn, startTestApi, testWorker, upload, type TestApi } from './_support/api';
import { pdfOutput } from './_support/outputs';

const TEST_MODEL = 'TEST-model-not-a-real-id';

let api: TestApi;
let ownerId: string;
let projectId: string;
let documentId: string;
let contentHash: string;

beforeAll(async () => {
  api = await startTestApi();
  ({ ownerId, projectId } = await ownerWithProject(api, 'G12-8'));
  const auth = await signIn(api, ownerId);
  documentId = (await upload(api, auth, projectId, 'memoriu-tehnic.pdf', fixtureBytes('fixtures/pdf/memoriu-tehnic.pdf'))).body.documentId ?? '';
  const runner = new ScriptedRunner((_job, job) => pdfOutput(job, 'fixtures/pdf/ground-truth/memoriu-tehnic.json'));
  expect((await testWorker(api, runner).drain()).map((step) => step.kind)).toEqual(['done']);
  const { documents } = await withRequest(api.database.app, { userId: ownerId, projectId }, (request) => projectDocuments(request));
  contentHash = documents.find((document) => document.id === documentId)?.contentHash ?? '';
}, 240_000);

afterAll(async () => {
  await api.stop();
});

async function coverageFor(fieldKey: string) {
  return withRequest(api.database.app, { userId: ownerId, projectId }, async (request) => {
    const { documents, statuses } = await projectDocuments(request);
    const search = await readAiSearches(request, documents);
    return { read: readCoverage(documents, statuses.status), searched: searchedCoverage(documents, statuses.status, { fieldKey, ...search }) };
  });
}

test('F-INGEST-05 · R-029 · G12-8: a PDF read in full with no completed AI run: no "not found" statement about any field counts it as searched', async () => {
  const fields = fieldsForAi().map((field) => field.key);
  expect(fields.length).toBeGreaterThan(0);
  for (const fieldKey of fields) {
    const { read, searched } = await coverageFor(fieldKey);
    expect(read, fieldKey).toEqual([{ documentId, unit: 'pages', ranges: [{ first: 1, last: 3 }], total: 3 }]);
    expect(searched, fieldKey).toEqual([]);
  }
});

test('F-INGEST-05 · G12-8 (control): after a completed run, only the pages it sent and answered "not found" with count, and only for that field', async () => {
  const [asked, other] = fieldsForAi().map((field) => field.key);
  if (asked === undefined || other === undefined) throw new Error('the registry lists fewer than two fields for the AI');
  const run: Extract<ExtractionRun, { outcome: 'completed' }> = {
    outcome: 'completed',
    modelId: TEST_MODEL,
    proposals: [],
    notFound: [{ fieldKey: asked, subject: null, searched: [{ documentId, locators: [{ page: null, sheet: null, cell: null }] }] }],
    missingFieldKeys: [],
    findings: [],
    notes: [],
    rejections: [],
    engineerFlags: [],
    guardrailEvents: [],
    coverage: [{ documentId, contentHash, locators: [{ page: 1 }, { page: 2 }] }],
    attempts: [{ attempt: 1, fieldKeys: [asked, other], modelId: TEST_MODEL, receivedAt: '2026-09-30T10:00:00.000Z' }],
    validations: [],
  };
  await withRequest(api.database.app, { userId: api.extractionAccountId, projectId }, (request) => recordAiSearch(request, { documentId, contentHash, serviceId: api.extractionAccountId, run }));
  expect((await coverageFor(asked)).searched).toEqual([{ documentId, unit: 'pages', ranges: [{ first: 1, last: 2 }], total: 3 }]);
  expect((await coverageFor(other)).searched).toEqual([]);
});
