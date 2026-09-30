/**
 * The analysis path end to end (docs/adr/0025, 0026, 0027; prompt 3 section 10, phase 2):
 * an uploaded fixture queued, the worker running a scripted extractor (the extractor's
 * CLI is the extractor builder's; the output is built from the fixture's ground truth),
 * the output stored through the contract, the one ingestion path verifying proposals,
 * and the owner's deletion erasing every file keyed to the document's hash. Every account
 * and value is TEST data.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  readAnalysisJobs,
  readCandidateAiOrigins,
  readDocumentTexts,
  readFieldInputs,
  readProjectDocuments,
  withRequest,
} from '@sovitech/db';
import { derive } from '@sovitech/domain';
import { productionRegistry, registryLookups, unitByCode } from '@sovitech/registry';
import { ingestProposals } from '../../apps/api/src/ingestion/proposals';
import { ensureBuildingSubject } from '@sovitech/db';
import { ScriptedRunner, documentList, fixtureBytes, ownerWithProject, signIn, startTestApi, testWorker, upload, type TestApi } from '../guardrails/_support/api';
import { pdfOutput } from '../guardrails/_support/outputs';

const LONG = { timeout: 120_000 };
const lookups = registryLookups(productionRegistry);
let api: TestApi;

beforeAll(async () => {
  api = await startTestApi();
}, 240_000);

afterAll(async () => {
  await api.stop();
});

async function uploaded(label: string, path: string, fileName: string) {
  const { ownerId, projectId } = await ownerWithProject(api, label);
  const auth = await signIn(api, ownerId);
  const result = await upload(api, auth, projectId, fileName, fixtureBytes(path));
  expect(result.status).toBe(201);
  return { ownerId, projectId, auth, documentId: result.body.documentId ?? '' };
}

describe('the analysis worker', LONG, () => {
  it('US-DOCS-06 · F-INGEST-04 · F-INGEST-05 · rule 12: stores the text and the coverage the extractor recorded, and the owner sees the coverage', async () => {
    const { ownerId, projectId, auth, documentId } = await uploaded('analysis memoriu', 'fixtures/pdf/memoriu-tehnic.pdf', 'memoriu-tehnic.pdf');
    const runner = new ScriptedRunner((_job, job) => pdfOutput(job, 'fixtures/pdf/ground-truth/memoriu-tehnic.json'));
    const steps = await testWorker(api, runner).drain();
    expect(steps.map((step) => step.kind)).toEqual(['done']);
    // The sandbox got the stored file under its project and content hash, and a folder of its own.
    expect(runner.jobs[0]?.inputPath).toContain(projectId);
    expect(runner.jobs[0]?.outputDirectory).toContain(`${projectId}/sha256:`);
    // The job's folder is gone once the step ends.
    const [document] = (await withRequest(api.database.app, { userId: ownerId, projectId }, (request) => readProjectDocuments(request))).documents;
    expect(await api.files.filesKeyedTo(projectId, document?.contentHash ?? '')).toEqual([api.files.originalPath(projectId, document?.contentHash ?? '')]);

    expect(document?.analysis).toEqual({ status: 'analysed', coverage: 'pages 1-3 of 3' });
    const texts = await withRequest(api.database.app, { userId: ownerId, projectId }, (request) => readDocumentTexts(request, document?.contentHash ?? '', 'page:'));
    expect(texts.map((part) => part.part)).toEqual(['page:1', 'page:2', 'page:3']);
    expect(await documentList(api, auth, projectId)).toMatchObject([{ documentId, statusLine: { kind: 'coverage', coverage: 'pages 1-3 of 3' } }]);
    expect(await readAnalysisJobs(api.database.app.db, { projectId, documentId })).toMatchObject([{ state: 'done' }]);
  });

  it('US-DOCS-06 · F-INGEST-04 · rule 12: stores nothing from an output that does not answer its request, and the file reads "Analysis failed"', async () => {
    const { ownerId, projectId, auth, documentId } = await uploaded('analysis mismatch', 'fixtures/pdf/tabel-suprafete.pdf', 'tabel-suprafete.pdf');
    const runner = new ScriptedRunner((_job, job) => pdfOutput({ ...job, documentId: '0192f0a0-0000-7000-8000-0000000000aa' }, 'fixtures/pdf/ground-truth/tabel-suprafete.json'));
    const steps = await testWorker(api, runner).drain();
    expect(steps).toMatchObject([{ kind: 'failed', code: 'output_not_answering_request' }]);
    const [document] = (await withRequest(api.database.app, { userId: ownerId, projectId }, (request) => readProjectDocuments(request))).documents;
    const texts = await withRequest(api.database.app, { userId: ownerId, projectId }, (request) => readDocumentTexts(request, document?.contentHash ?? '', 'page:'));
    expect(texts).toEqual([]);
    expect(await documentList(api, auth, projectId)).toMatchObject([{ documentId, statusLine: { kind: 'status_line', statusLineId: 'analysis_failed', text: 'Analysis failed' } }]);
    expect(JSON.stringify(api.log)).not.toMatch(/Suprafata|tabel-suprafete/u);
  });

  it('US-DOCS-06 · F-INGEST-04 · rule 12: retries a sandbox failure, then reads "Analysis failed" on the last attempt', async () => {
    const { projectId, auth, documentId } = await uploaded('analysis sandbox', 'fixtures/pdf/lista-echipamente.pdf', 'lista-echipamente.pdf');
    let runs = 0;
    const failing = {
      run: async () => {
        runs += 1;
        return { outcome: 'failed' as const, code: 'sandbox_time_limit' as const };
      },
    };
    const worker = testWorker(api, failing, { maxAttempts: 2 });
    expect(await worker.drain()).toMatchObject([{ kind: 'retry', code: 'sandbox_time_limit' }, { kind: 'failed', code: 'sandbox_time_limit' }]);
    expect(runs).toBe(2);
    expect(await documentList(api, auth, projectId)).toMatchObject([{ documentId, statusLine: { statusLineId: 'analysis_failed' } }]);
  });
});

describe('the one ingestion path', LONG, () => {
  it('US-DOCS-07 · F-EXTRACT-03 · F-EXTRACT-04 · rule 1: stores a value that passes the verifier with the model id the API returned, and logs a rejection by its code', async () => {
    const { ownerId, projectId, documentId } = await uploaded('ingestion memoriu', 'fixtures/pdf/memoriu-tehnic.pdf', 'memoriu-tehnic.pdf');
    await testWorker(api, new ScriptedRunner((_job, job) => pdfOutput(job, 'fixtures/pdf/ground-truth/memoriu-tehnic.json'))).drain();
    const [document] = (await withRequest(api.database.app, { userId: ownerId, projectId }, (request) => readProjectDocuments(request))).documents;
    const contentHash = document?.contentHash ?? '';
    const outcomes = await withRequest(api.database.app, { userId: api.extractionAccountId, projectId }, async (request) => {
      const building = await ensureBuildingSubject(request, api.extractionAccountId);
      const area = {
        subjectId: building,
        fieldKey: 'building.grossFloorArea',
        quantity: { value: 6170, unit: 'm2', qualifier: 'gross_total' },
        alternatives: [{ value: 6.17, unit: 'm2', qualifier: 'gross_total' }],
        source: 'document' as const,
        evidence: [{ documentId, contentHash, locator: { page: 2 }, excerpt: 'Scd 6.170 mp' }],
        original: { text: '6.170 mp', locale: 'ro-RO' },
      };
      return ingestProposals(request, {
        projectId,
        serviceId: api.extractionAccountId,
        field: lookups.field,
        proposals: [
          // A hand-built proposal: a TEST label, never a model id (prompt 3 phase 2).
          { proposal: area, modelId: 'TEST-hand-built-no-model' },
          { proposal: { ...area, evidence: [{ documentId, contentHash, locator: { page: 1 }, excerpt: 'Scd 6.170 mp' }] }, modelId: 'TEST-hand-built-no-model' },
        ],
      });
    });
    expect(outcomes).toMatchObject([
      { outcome: 'stored', source: 'document' },
      { outcome: 'rejected', code: 'excerpt_at_locator' },
    ]);
    const stored = outcomes[0];
    const candidateId = stored?.outcome === 'stored' ? stored.candidateId : '';
    const origins = await withRequest(api.database.app, { userId: ownerId, projectId }, (request) => readCandidateAiOrigins(request, [candidateId]));
    expect(origins.get(candidateId)).toBe('TEST-hand-built-no-model');
    const events = await api.database.asAdministrator<{ type: string; reason: string }>(
      'SELECT type, reason FROM sovitech.guardrail_events WHERE project_id = $1 ORDER BY at',
      [projectId],
    );
    expect(events).toEqual([{ type: 'evidence_not_found', reason: 'excerpt_at_locator' }]);
  });
});

describe("the owner's deletion: the erasure job", LONG, () => {
  it('US-DOCS-21 · F-INGEST-07 · rule 13: erases the text, the excerpts and every file keyed to the hash, and withdraws the values only it supported', async () => {
    const { ownerId, projectId, auth, documentId } = await uploaded('deletion memoriu', 'fixtures/pdf/memoriu-tehnic.pdf', 'memoriu-tehnic.pdf');
    await testWorker(api, new ScriptedRunner((_job, job) => pdfOutput(job, 'fixtures/pdf/ground-truth/memoriu-tehnic.json'))).drain();
    const [document] = (await withRequest(api.database.app, { userId: ownerId, projectId }, (request) => readProjectDocuments(request))).documents;
    const contentHash = document?.contentHash ?? '';
    const building = await withRequest(api.database.app, { userId: api.extractionAccountId, projectId }, async (request) => {
      const subject = await ensureBuildingSubject(request, api.extractionAccountId);
      await ingestProposals(request, {
        projectId,
        serviceId: api.extractionAccountId,
        field: lookups.field,
        proposals: [
          {
            proposal: {
              subjectId: subject,
              fieldKey: 'building.grossFloorArea',
              quantity: { value: 6170, unit: 'm2', qualifier: 'gross_total' },
              alternatives: [{ value: 6.17, unit: 'm2', qualifier: 'gross_total' }],
              source: 'document',
              evidence: [{ documentId, contentHash, locator: { page: 2 }, excerpt: 'Scd 6.170 mp' }],
            },
          },
        ],
      });
      return subject;
    });

    const deleted = await api.app.inject({ method: 'DELETE', url: `/api/projects/${projectId}/documents/${documentId}`, headers: { ...auth } });
    expect(deleted.statusCode).toBe(200);
    expect(deleted.json()).toEqual({ documentId, filesKeptForAnotherDocument: false });

    expect(await api.files.filesKeyedTo(projectId, contentHash)).toEqual([]);
    expect(await api.files.hashesOf(projectId)).toEqual([]);
    const clear = await api.database.asAdministrator(
      `SELECT text FROM sovitech.document_texts WHERE project_id = $1 AND content_hash = $2
       UNION ALL SELECT text FROM sovitech.evidence_excerpts WHERE project_id = $1 AND content_hash = $2 AND text <> '[erased]'`,
      [projectId, contentHash],
    );
    expect(clear).toEqual([]);
    const field = lookups.field('building.grossFloorArea');
    if (field === undefined) throw new Error('the registry lost building.grossFloorArea');
    const inputs = await withRequest(api.database.app, { userId: ownerId, projectId }, (request) => readFieldInputs(request, { subjectId: building, fieldKey: field.key }));
    const state = derive(field, inputs.candidates, inputs.events, {
      subjectId: building,
      document: (id) => inputs.documents.find((candidate) => candidate.id === id),
      inputState: () => undefined,
      datasetApproved: () => false,
      unit: unitByCode,
    });
    expect(state.state).toBe('unknown');
    expect(state.statusLines).toContain('source_document_removed');
    expect(await documentList(api, auth, projectId)).toEqual([]);
    // The download of an erased document is not found.
    const download = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/documents/${documentId}/file`, headers: { ...auth } });
    expect(download.statusCode).toBe(404);
  });

  it('US-DOCS-21 · F-INGEST-07 · rule 13: keeps the file, text and derived files while another document of the project holds the same bytes', async () => {
    const { projectId, auth, documentId } = await uploaded('deletion twin', 'fixtures/pdf/nota-proiectant.pdf', 'nota-proiectant.pdf');
    const twin = await upload(api, auth, projectId, 'nota-proiectant again.pdf', fixtureBytes('fixtures/pdf/nota-proiectant.pdf'));
    const deleted = await api.app.inject({ method: 'DELETE', url: `/api/projects/${projectId}/documents/${documentId}`, headers: { ...auth } });
    expect(deleted.json()).toEqual({ documentId, filesKeptForAnotherDocument: true });
    const [hash] = await api.files.hashesOf(projectId);
    expect(hash).toBeDefined();
    const download = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/documents/${twin.body.documentId ?? ''}/file`, headers: { ...auth } });
    expect(download.statusCode).toBe(200);
    expect(download.rawPayload.equals(fixtureBytes('fixtures/pdf/nota-proiectant.pdf'))).toBe(true);
  });
});
