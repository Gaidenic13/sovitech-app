/**
 * The AI's extraction step over a stored document (apps/api/src/ingestion/ai-extraction.ts),
 * on a TEST database with a scripted extractor and a TEST transport (docs/adr/0023, 0027):
 * - what the request carries while `ai-processor-route` is closed: a name code set, never
 *   the name the owner typed (build-readiness decision 2, D-09; rule 13, "Processing");
 * - what a completed run leaves for a "Not found in the analysed documents" statement:
 *   only the parts it sent and answered "not found" with, for that field; with no run,
 *   nothing (rule 12, "Code records coverage"; R-029).
 * Phase 2 review, adversarial findings "the owner-typed file name reaches the model while
 * the gate is closed" and "searchedCoverage counts as searched every page the extractor
 * read". No model is called: the TEST transport's responses name a TEST model id, never a
 * real one, and the hand-built run carries a TEST model id. Every account and value is TEST data.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readDocumentTexts, withRequest } from '@sovitech/db';
import { REPO_ROOT, productionGateSource } from '@sovitech/registry/gates';
import { codeSetNames, loadFixtureManifest, loadSystemPrompt, type BoundaryDeps, type ExtractionRun, type ModelRequest } from '@sovitech/ai';
import { AI_SEARCH_PART_PREFIX, readAiSearches, readCoverage, searchedCoverage } from '../../apps/api/src/documents/coverage';
import { projectDocuments } from '../../apps/api/src/documents/service';
import { extractWithAi, fieldsForAi, recordAiSearch } from '../../apps/api/src/ingestion/ai-extraction';
import { ScriptedRunner, fixtureBytes, ownerWithProject, signIn, startTestApi, testWorker, upload, type TestApi } from '../guardrails/_support/api';
import { pdfOutput } from '../guardrails/_support/outputs';

const LONG = { timeout: 120_000 };
const TEST_MODEL = 'TEST-model-not-a-real-id';
const TYPED_NAME = 'TEST Owner typed name, Hotel Example private plans.pdf';
const manifest = loadFixtureManifest(REPO_ROOT);
let api: TestApi;

beforeAll(async () => {
  api = await startTestApi();
}, 240_000);

afterAll(async () => {
  await api.stop();
});

/** A non-demo TEST project holding the synthetic memoriu under the name the owner typed, its text stored by the scripted extractor. */
async function storedMemoriu(label: string) {
  const { ownerId, projectId } = await ownerWithProject(api, label);
  const auth = await signIn(api, ownerId);
  const result = await upload(api, auth, projectId, TYPED_NAME, fixtureBytes('fixtures/pdf/memoriu-tehnic.pdf'));
  expect(result.status).toBe(201);
  const runner = new ScriptedRunner((_job, job) => pdfOutput(job, 'fixtures/pdf/ground-truth/memoriu-tehnic.json'));
  expect((await testWorker(api, runner).drain()).map((step) => step.kind)).toEqual(['done']);
  const documentId = result.body.documentId ?? '';
  const { documents } = await withRequest(api.database.app, { userId: ownerId, projectId }, (request) => projectDocuments(request));
  const contentHash = documents.find((document) => document.id === documentId)?.contentHash ?? '';
  return { ownerId, projectId, documentId, contentHash };
}

describe('the name a document carries to the model while ai-processor-route is closed', LONG, () => {
  it("D-09 · rule 13 · ADR 0023: a non-demo project's typed file name is absent from every request; the fixture's file name is sent", async () => {
    const { projectId, documentId, contentHash } = await storedMemoriu('ai name');
    const requests: ModelRequest[] = [];
    const deps: BoundaryDeps = {
      transport: async (request) => {
        requests.push(request);
        return { model: TEST_MODEL, receivedAt: '2026-09-30T10:00:00.000Z', stopReason: 'end_turn', output: { candidates: [], notFound: [], missingFieldKeys: [], findings: [], notes: [] } };
      },
      gates: productionGateSource(),
      manifest,
      systemPrompt: loadSystemPrompt(REPO_ROOT),
      root: REPO_ROOT,
      log: () => undefined,
    };
    const step = await extractWithAi({ store: api.database.app, serviceId: api.extractionAccountId, projectId, documentId }, deps);
    // The TEST model id is not MODEL_ID, so the run ends unusable after its two attempts: nothing is stored from it.
    expect(step).toEqual({ outcome: 'failed', codes: ['model_mismatch'] });
    expect(requests.length).toBe(2);
    const sent = requests.flatMap((request) => [request.system, ...request.content]).join('\n');
    expect(sent).not.toContain('TEST Owner typed name');
    expect(sent).not.toContain('Hotel Example');
    const codeSet = codeSetNames({ documentId, contentHash }, manifest)[0] ?? '';
    expect(codeSet).toBe('memoriu-tehnic.pdf');
    expect(sent).toContain(`name="${codeSet}"`);
    // An unusable run searched nothing.
    const texts = await withRequest(api.database.app, { userId: api.extractionAccountId, projectId }, (request) => readDocumentTexts(request, contentHash, AI_SEARCH_PART_PREFIX));
    expect(texts).toEqual([]);
  });
});

describe('what a "not found" statement may count as searched', LONG, () => {
  it('F-INGEST-05 · R-029 · US-DOCS-07: with no AI run nothing is searched; after a completed run, only the pages it sent and answered "not found" with, for that field', async () => {
    const { ownerId, projectId, documentId, contentHash } = await storedMemoriu('ai search');
    const [asked, other] = fieldsForAi().map((field) => field.key);
    if (asked === undefined || other === undefined) throw new Error('the registry lists fewer than two fields for the AI');
    const coverageFor = async (fieldKey: string) =>
      withRequest(api.database.app, { userId: ownerId, projectId }, async (request) => {
        const { documents, statuses } = await projectDocuments(request);
        const search = await readAiSearches(request, documents);
        return { read: readCoverage(documents, statuses.status), searched: searchedCoverage(documents, statuses.status, { fieldKey, ...search }) };
      });

    // The extractor read pages 1-3; no AI run has looked for anything.
    const before = await coverageFor(asked);
    expect(before.read).toEqual([{ documentId, unit: 'pages', ranges: [{ first: 1, last: 3 }], total: 3 }]);
    expect(before.searched).toEqual([]);

    // A completed run (hand-built, TEST model id) that sent pages 1 and 2 and answered the first field "not found" over the whole document.
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
    await withRequest(api.database.app, { userId: api.extractionAccountId, projectId }, (request) =>
      recordAiSearch(request, { documentId, contentHash, serviceId: api.extractionAccountId, run }),
    );

    expect((await coverageFor(asked)).searched).toEqual([{ documentId, unit: 'pages', ranges: [{ first: 1, last: 2 }], total: 3 }]);
    // Asked in the same run, but answered by no "not found": nothing searched for it.
    expect((await coverageFor(other)).searched).toEqual([]);

    // The record is stored with the document's text (erased with it), and holds codes and part names, never the text.
    const records = await withRequest(api.database.app, { userId: ownerId, projectId }, (request) => readDocumentTexts(request, contentHash, AI_SEARCH_PART_PREFIX));
    expect(records).toHaveLength(1);
    const pages = await withRequest(api.database.app, { userId: ownerId, projectId }, (request) => readDocumentTexts(request, contentHash, 'page:'));
    for (const page of pages) expect(records[0]?.text).not.toContain(page.text.slice(0, 24));
  });
});
