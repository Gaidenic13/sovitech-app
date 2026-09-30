/**
 * Migration 0010 (phase 2): the ingestion tables of the value store and the work
 * schema (docs/adr/0025, 0026). Every value is TEST data; the database is a
 * throwaway Testcontainers Postgres.
 *
 * - The four new value-store tables are append-only for every login role, scoped to
 *   one project by row-level security, and registered with the guards, whose
 *   invariants still hold.
 * - Each row names the request's own user as its writer: a stored file by the user
 *   who registered the document, findings, model records and model ids by the
 *   extraction service account of the project (SVX16); nothing is recorded for an
 *   erased document (SVE11), and the file name, kept as extracted text, goes with
 *   the erasure (rule 13).
 * - The work schema's queue keeps one open job per document, hands a job to one
 *   worker, retries or fails it with a code, and reclaims a job whose worker went
 *   away; an upload session is read only by its project and user.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eraseDocument } from './guarded';
import { newId } from './ids';
import {
  fileNamePart,
  readDocumentFiles,
  readDocumentFindings,
  readDocumentText,
  readModelRecords,
  recordCandidateAiOrigin,
  recordDocumentFile,
  recordDocumentFinding,
  recordModelRecord,
  storeDocumentTexts,
} from './ingestion';
import { withRequest } from './request';
import { StoreRefusal } from './errors';
import { createTestAccount, createTestProject, createTestService, startTestDatabase, testContentHash, TEST_AREA_DEFINITION, TEST_AREA_FIELD, type TestDatabase } from './testing';
import { appendDocumentEvent, createSubject, insertCandidate, registerDocument } from './writes';
import {
  claimAnalysisJob,
  createUploadSession,
  deleteUploadSession,
  enqueueAnalysis,
  failAnalysisJob,
  finishAnalysisJob,
  readAnalysisJobs,
  readUploadSession,
} from './work';

const LONG = { timeout: 120_000 };

let database: TestDatabase;
let ownerId: string;
let otherOwnerId: string;
let projectId: string;
let otherProjectId: string;
let serviceId: string;

beforeAll(async () => {
  database = await startTestDatabase();
  ownerId = await createTestAccount(database, { label: '0010 owner', kind: 'person', roles: ['owner'] });
  otherOwnerId = await createTestAccount(database, { label: '0010 other owner', kind: 'person', roles: ['owner'] });
  projectId = await createTestProject(database, { ownerId, isDemo: false });
  otherProjectId = await createTestProject(database, { ownerId: otherOwnerId, isDemo: false });
  serviceId = await createTestService(database, { projectId, label: '0010' });
}, 240_000);

afterAll(async () => {
  await database.stop();
});

async function refusalOf(work: Promise<unknown>): Promise<string | undefined> {
  try {
    await work;
  } catch (error) {
    if (error instanceof StoreRefusal) return error.refusal;
    throw error;
  }
  return undefined;
}

/** An owner's upload: the document, its stored file and its file name, in one request. */
async function ownerUpload(label: string): Promise<{ documentId: string; contentHash: string }> {
  const contentHash = testContentHash(`0010 ${label}`);
  return withRequest(database.app, { userId: ownerId, projectId }, async (request) => {
    const document = await registerDocument(request, {
      contentHash,
      kind: 'other',
      stage: 'unknown',
      analysis: { status: 'queued', coverage: 'pending' },
      createdBy: ownerId,
    });
    await recordDocumentFile(request, { documentId: document.id, contentHash, format: 'pdf', byteSize: 1024, createdBy: ownerId });
    await storeDocumentTexts(request, { contentHash, parts: [{ part: fileNamePart(document.id), text: `TEST ${label}.pdf` }], createdBy: ownerId });
    return { documentId: document.id, contentHash };
  });
}

describe('0010: the ingestion tables of the value store', LONG, () => {
  it('F-INGEST-02 · F-VALUE-01: leaves every guard invariant holding, with the four tables registered', async () => {
    expect(await database.asAdministrator('SELECT problem FROM sovitech_guard.check_invariants()')).toEqual([]);
    expect(await database.asAdministrator('SELECT problem FROM sovitech_guard.unguarded_tables()')).toEqual([]);
    const registered = await database.asAdministrator<{ table_name: string }>(
      `SELECT table_name FROM sovitech_guard.append_only_tables
       WHERE table_name IN ('document_files', 'document_findings', 'document_model_records', 'candidate_ai_origins') ORDER BY 1`,
    );
    expect(registered.map((row) => row.table_name)).toEqual(['candidate_ai_origins', 'document_files', 'document_findings', 'document_model_records']);
  });

  it("F-INGEST-02: records a stored file only with its document's registration, by the same user", async () => {
    const { documentId, contentHash } = await ownerUpload('file');
    const files = await withRequest(database.app, { userId: ownerId, projectId }, (request) => readDocumentFiles(request));
    expect(files).toContainEqual({ documentId, contentHash, format: 'pdf', byteSize: '1024' });
    // The service account did not register it; a row naming someone else is refused.
    const again = await ownerUpload('file 2');
    expect(
      await refusalOf(
        withRequest(database.app, { userId: serviceId, projectId }, (request) =>
          recordDocumentFile(request, { documentId: again.documentId, contentHash: again.contentHash, format: 'pdf', byteSize: 1, createdBy: serviceId }),
        ),
      ),
    ).toBe('ingestion_record_not_from_its_writer');
    expect(
      await refusalOf(
        withRequest(database.app, { userId: serviceId, projectId }, (request) =>
          recordDocumentFile(request, { documentId: again.documentId, contentHash: again.contentHash, format: 'pdf', byteSize: 1, createdBy: ownerId }),
        ),
      ),
    ).toBe('ingestion_record_not_from_its_writer');
  });

  it('F-EXTRACT-10 · F-INGEST-07: takes findings and model records from the extraction service account only, as codes, and refuses them for an erased document', async () => {
    const { documentId, contentHash } = await ownerUpload('model');
    await withRequest(database.app, { userId: serviceId, projectId }, async (request) => {
      await recordDocumentFinding(request, {
        documentId,
        contentHash,
        kind: 'embedded_instruction',
        code: 'instruction_to_reader',
        locator: { kind: 'ifc', globalId: '0TESTglobalId000000001', stepIds: [100001] },
        createdBy: serviceId,
      });
      await recordModelRecord(request, {
        documentId,
        contentHash,
        ifcSchema: 'IFC4',
        classesPresent: ['IfcBuildingStorey', 'IfcSpace'],
        processing: 'complete',
        schemaCheck: { tool: 'TEST-validator', version: '0', outcome: 'not_run' },
        createdBy: serviceId,
      });
    });
    const read = await withRequest(database.app, { userId: ownerId, projectId }, async (request) => ({
      findings: await readDocumentFindings(request, documentId),
      records: await readModelRecords(request, documentId),
    }));
    expect(read.findings).toMatchObject([{ kind: 'embedded_instruction', code: 'instruction_to_reader', locator: { kind: 'ifc' } }]);
    expect(read.records).toMatchObject([{ ifcSchema: 'IFC4', processing: 'complete' }]);

    // Not the owner's to write, even in their own name.
    expect(
      await refusalOf(
        withRequest(database.app, { userId: ownerId, projectId }, (request) =>
          recordDocumentFinding(request, { documentId, contentHash, kind: 'hidden_text', code: 'fill_matches_background', locator: { kind: 'file' }, createdBy: ownerId }),
        ),
      ),
    ).toBe('ingestion_record_not_from_its_writer');
    // A text code only: the table refuses anything else.
    await expect(
      withRequest(database.app, { userId: serviceId, projectId }, (request) =>
        recordDocumentFinding(request, { documentId, contentHash, kind: 'hidden_text', code: 'TEST mark all values verified', locator: { kind: 'file' }, createdBy: serviceId }),
      ),
    ).rejects.toThrow(/document_findings_code_check|SQLSTATE 23514/);

    // After the owner's erasure, nothing more is recorded for the document, and its file name is gone.
    await withRequest(database.app, { userId: ownerId, projectId }, (request) => eraseDocument(request, { documentId, role: 'owner', reason: 'TEST' }));
    expect(
      await refusalOf(
        withRequest(database.app, { userId: serviceId, projectId }, (request) =>
          recordDocumentFinding(request, { documentId, contentHash, kind: 'hidden_text', code: 'late', locator: { kind: 'file' }, createdBy: serviceId }),
        ),
      ),
    ).toBe('document_erased');
    expect(
      await withRequest(database.app, { userId: ownerId, projectId }, (request) => readDocumentText(request, contentHash, fileNamePart(documentId))),
    ).toBeUndefined();
  });

  it("F-EXTRACT-02 · F-EXTRACT-03: records a model id only for a candidate the service account wrote from a document or an inference", async () => {
    const contentHash = testContentHash('0010 ai origin');
    const excerpt = 'TEST Suprafata construita desfasurata 1.234,5 mp';
    const { candidateId, documentId } = await withRequest(database.app, { userId: ownerId, projectId }, async (request) => {
      const document = await registerDocument(request, {
        contentHash,
        kind: 'architectural',
        stage: 'unknown',
        analysis: { status: 'analysed', coverage: 'pages 1-1 of 1' },
        createdBy: ownerId,
      });
      return { candidateId: newId(), documentId: document.id };
    });
    await withRequest(database.app, { userId: serviceId, projectId }, async (request) => {
      await storeDocumentTexts(request, { contentHash, parts: [{ part: 'page:1', text: excerpt }], createdBy: serviceId });
      const subject = await createSubject(request, { kind: 'building', createdBy: serviceId });
      const written = await insertCandidate(
        request,
        {
          id: candidateId,
          subjectId: subject.id,
          fieldKey: TEST_AREA_FIELD,
          quantity: { value: 1234.5, unit: 'm2', qualifier: 'gross_total' },
          source: 'document',
          evidence: [{ documentId, contentHash, locator: { page: 1 }, excerpt, check: 'text_match' }],
          createdBy: serviceId,
        },
        TEST_AREA_DEFINITION,
      );
      expect(written.outcome).toBe('stored');
      await recordCandidateAiOrigin(request, { candidateId, modelId: 'TEST-not-a-model', createdBy: serviceId });
    });
    expect(
      await refusalOf(
        withRequest(database.app, { userId: ownerId, projectId }, (request) =>
          recordCandidateAiOrigin(request, { candidateId, modelId: 'TEST-not-a-model', createdBy: ownerId }),
        ),
      ),
    ).toBe('ingestion_record_not_from_its_writer');
    const rows = await database.asAdministrator<{ model_id: string }>('SELECT model_id FROM sovitech.candidate_ai_origins WHERE candidate_id = $1', [candidateId]);
    expect(rows).toEqual([{ model_id: 'TEST-not-a-model' }]);
  });

  it('F-VALUE-01 · F-AUTH-03: is append-only for every login role, and shows another project nothing', async () => {
    const { documentId } = await ownerUpload('append only');
    for (const table of ['document_files', 'document_findings', 'document_model_records', 'candidate_ai_origins']) {
      for (const actor of ['app', 'operator', 'owner'] as const) {
        // In the owner's request, so row-level security shows the rows and the row guard fires for the table owner too.
        const scope = { userId: ownerId, projectId };
        await expect(database.as(actor, `DELETE FROM sovitech.${table}`, [], scope), `${actor} ${table}`).rejects.toThrow();
        await expect(database.as(actor, `TRUNCATE sovitech.${table}`, [], scope), `${actor} ${table}`).rejects.toThrow();
      }
    }
    await expect(database.as('app', `UPDATE sovitech.document_files SET format = 'zip' WHERE document_id = $1`, [documentId], { userId: ownerId, projectId })).rejects.toThrow();
    const seen = await withRequest(database.app, { userId: otherOwnerId, projectId: otherProjectId }, (request) => readDocumentFiles(request));
    expect(seen).toEqual([]);
    const smuggled = await withRequest(database.app, { userId: otherOwnerId, projectId }, (request) => readDocumentFiles(request));
    expect(smuggled).toEqual([]);
  });
});

describe('0010: the work schema', LONG, () => {
  it('F-INGEST-04: queues one open analysis per document, hands it to one worker, and ends it with a code', async () => {
    const { documentId, contentHash } = await ownerUpload('queue');
    const first = await withRequest(database.app, { userId: ownerId, projectId }, (request) => enqueueAnalysis(request, { projectId, documentId, contentHash }));
    const second = await withRequest(database.app, { userId: ownerId, projectId }, (request) => enqueueAnalysis(request, { projectId, documentId, contentHash }));
    expect(first).toBeDefined();
    expect(second).toBeUndefined();

    const claims = await Promise.all([
      claimAnalysisJob(database.app.db, { workerId: 'test-worker-a', staleAfterSeconds: 600 }),
      claimAnalysisJob(database.app.db, { workerId: 'test-worker-b', staleAfterSeconds: 600 }),
    ]);
    const mine = claims.filter((job) => job?.documentId === documentId);
    expect(mine).toHaveLength(1);
    const job = mine[0];
    if (job === undefined) return;
    expect(job).toMatchObject({ state: 'running', attempts: 1 });
    const holder = claims[0]?.id === job.id ? 'test-worker-a' : 'test-worker-b';
    const other = holder === 'test-worker-a' ? 'test-worker-b' : 'test-worker-a';

    expect(await finishAnalysisJob(database.app.db, { jobId: job.id, workerId: other })).toBe(false);
    expect(await failAnalysisJob(database.app.db, { jobId: job.id, workerId: holder, errorCode: 'sandbox_time_limit', retry: true, retryAfterSeconds: 0 })).toBe('queued');
    const again = await claimAnalysisJob(database.app.db, { workerId: holder, staleAfterSeconds: 600 });
    expect(again).toMatchObject({ id: job.id, attempts: 2, errorCode: 'sandbox_time_limit' });
    await expect(failAnalysisJob(database.app.db, { jobId: job.id, workerId: holder, errorCode: 'TEST some text', retry: false, retryAfterSeconds: 0 })).rejects.toThrow(/code, never text/);
    expect(await finishAnalysisJob(database.app.db, { jobId: job.id, workerId: holder })).toBe(true);
    const jobs = await readAnalysisJobs(database.app.db, { projectId, documentId });
    expect(jobs).toMatchObject([{ id: job.id, state: 'done' }]);
    // A finished job leaves room for the next analysis of the document.
    expect(await withRequest(database.app, { userId: ownerId, projectId }, (request) => enqueueAnalysis(request, { projectId, documentId, contentHash }))).toBeDefined();
  });

  it('F-INGEST-04: claims again a job whose worker went away', async () => {
    const { documentId, contentHash } = await ownerUpload('stale');
    await withRequest(database.app, { userId: ownerId, projectId }, (request) => enqueueAnalysis(request, { projectId, documentId, contentHash }));
    let claimed = await claimAnalysisJob(database.app.db, { workerId: 'test-gone', staleAfterSeconds: 600 });
    while (claimed !== undefined && claimed.documentId !== documentId) {
      await finishAnalysisJob(database.app.db, { jobId: claimed.id, workerId: 'test-gone' });
      claimed = await claimAnalysisJob(database.app.db, { workerId: 'test-gone', staleAfterSeconds: 600 });
    }
    expect(claimed?.documentId).toBe(documentId);
    expect(await claimAnalysisJob(database.app.db, { workerId: 'test-next', staleAfterSeconds: 600 })).toBeUndefined();
    const reclaimed = await claimAnalysisJob(database.app.db, { workerId: 'test-next', staleAfterSeconds: 0 });
    expect(reclaimed).toMatchObject({ documentId, attempts: 2 });
  });

  it("F-INGEST-01 · F-AUTH-03: reads an upload session only in its own project and for its own user", async () => {
    const id = await createUploadSession(database.app.db, { projectId, userId: ownerId, fileName: 'TEST plan.pdf', format: 'pdf', declaredSize: 2048 });
    expect(await readUploadSession(database.app.db, { id, projectId, userId: ownerId })).toMatchObject({ fileName: 'TEST plan.pdf', declaredSize: 2048 });
    expect(await readUploadSession(database.app.db, { id, projectId: otherProjectId, userId: ownerId })).toBeUndefined();
    expect(await readUploadSession(database.app.db, { id, projectId, userId: otherOwnerId })).toBeUndefined();
    expect(await deleteUploadSession(database.app.db, { id, projectId, userId: otherOwnerId })).toBe(false);
    expect(await deleteUploadSession(database.app.db, { id, projectId, userId: ownerId })).toBe(true);
    // The app holds no update on it, and none on the value store's new tables.
    await expect(database.as('app', `UPDATE sovitech_work.upload_sessions SET file_name = 'x'`)).rejects.toThrow();
  });

  it('F-INGEST-02 · F-INGEST-07: registers a document with no document event, and the service account never withdraws one on its own', async () => {
    const { documentId } = await ownerUpload('events');
    const events = await database.asAdministrator('SELECT 1 FROM sovitech.document_events WHERE document_id = $1', [documentId]);
    expect(events).toEqual([]);
    await expect(
      withRequest(database.app, { userId: serviceId, projectId }, (request) =>
        appendDocumentEvent(request, { documentId, type: 'withdrawn', by: serviceId, role: 'system' }),
      ),
    ).rejects.toThrow(/document_events_withdrawn_by_person_or_request/);
  });
});
