/**
 * Migration 0017 (the viewer step, part 1): the conversion record of a stored IFC model shown as a document
 * (`sovitech.model_view_events`) and its queue (`sovitech_work.model_view_jobs`). Every value is TEST data; the
 * database is a throwaway Testcontainers Postgres.
 *
 * - The record is append-only for every login role, scoped to one project by row-level security, and registered with
 *   the guards, whose invariants still hold.
 * - Each row names the request's own user as its writer and a stored IFC model of the project; `started`,
 *   `converted` and `failed` come from the project's service account only; `queued` and `erased` from the owner, an
 *   engineer or that account (SVX20). Nothing but `erased` is recorded for an erased document (SVE11), and `erased`
 *   only for one. Codes only: a failure's code is one of the listed codes, never text.
 * - The queue keeps one open conversion per project and content hash, hands it to one worker, retries or fails it with
 *   a code, reclaims a job whose worker went away, and, on the erasure's request, drops a queued job and ends a running
 *   one, which its worker then no longer holds.
 * - The state is derived from the events: the latest decides.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { StoreRefusal } from './errors';
import { eraseDocument } from './guarded';
import { newId } from './ids';
import { recordDocumentFile } from './ingestion';
import {
  appendModelViewEvent,
  cancelQueuedModelViews,
  claimModelViewJob,
  endRunningModelViews,
  failModelViewJob,
  finishModelViewJob,
  holdsModelViewJob,
  MODEL_VIEW_FAILURES,
  modelViewStateOf,
  queueModelView,
  readModelViewEvents,
  readModelViewJobs,
  type ModelViewEvent,
} from './model-views';
import { withRequest } from './request';
import { createTestAccount, createTestProject, createTestService, startTestDatabase, testContentHash, type TestDatabase } from './testing';
import { registerDocument } from './writes';

const LONG = { timeout: 120_000 };
const CONVERTER = { name: 'test-model-converter', version: testContentHash('0017 converter sources'), imageDigest: testContentHash('0017 image') } as const;

let database: TestDatabase;
let ownerId: string;
let engineerId: string;
let otherOwnerId: string;
let projectId: string;
let otherProjectId: string;
let serviceId: string;
let outsideServiceId: string;

beforeAll(async () => {
  database = await startTestDatabase();
  ownerId = await createTestAccount(database, { label: '0017 owner', kind: 'person', roles: ['owner'] });
  engineerId = await createTestAccount(database, { label: '0017 engineer', kind: 'person', roles: ['sovitech_engineer'] });
  otherOwnerId = await createTestAccount(database, { label: '0017 other owner', kind: 'person', roles: ['owner'] });
  projectId = await createTestProject(database, { ownerId, isDemo: false });
  otherProjectId = await createTestProject(database, { ownerId: otherOwnerId, isDemo: false });
  serviceId = await createTestService(database, { projectId, label: '0017' });
  outsideServiceId = await createTestService(database, { projectId: otherProjectId, label: '0017 other project' });
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

/** An owner's upload of a stored file of `format`: the document and its stored file, in one request. */
async function ownerUpload(label: string, format: 'ifc' | 'pdf' = 'ifc'): Promise<{ documentId: string; contentHash: string }> {
  const contentHash = testContentHash(`0017 ${label}`);
  return withRequest(database.app, { userId: ownerId, projectId }, async (request) => {
    const document = await registerDocument(request, {
      contentHash,
      kind: 'other',
      stage: 'unknown',
      analysis: format === 'ifc' ? { status: 'stored_only', coverage: 'stored: IFC model' } : { status: 'queued', coverage: 'pending' },
      createdBy: ownerId,
    });
    await recordDocumentFile(request, { documentId: document.id, contentHash, format, byteSize: 4096, createdBy: ownerId });
    return { documentId: document.id, contentHash };
  });
}

describe('0017: the conversion record of a stored IFC model', LONG, () => {
  it('R-025 · F-VALUE-01: leaves every guard invariant holding, with the record registered as an append-only project table', async () => {
    expect(await database.asAdministrator('SELECT problem FROM sovitech_guard.check_invariants()')).toEqual([]);
    expect(await database.asAdministrator('SELECT problem FROM sovitech_guard.unguarded_tables()')).toEqual([]);
    expect(await database.asAdministrator("SELECT table_name FROM sovitech_guard.append_only_tables WHERE table_name = 'model_view_events'")).toEqual([{ table_name: 'model_view_events' }]);
    expect(await database.asAdministrator("SELECT table_name FROM sovitech_guard.project_tables WHERE table_name = 'model_view_events'")).toEqual([{ table_name: 'model_view_events' }]);
  });

  it('R-025 · rule 13: records queued by the owner, started and converted by the project\'s service account, with codes, sizes and times only', async () => {
    const { documentId, contentHash } = await ownerUpload('converted');
    const jobId = await withRequest(database.app, { userId: ownerId, projectId }, (request) => queueModelView(request, { documentId, contentHash, createdBy: ownerId }));
    expect(jobId).toBeDefined();
    await withRequest(database.app, { userId: serviceId, projectId }, async (request) => {
      await appendModelViewEvent(request, { documentId, contentHash, type: 'started', jobId, converter: CONVERTER, createdBy: serviceId });
      await appendModelViewEvent(request, { documentId, contentHash, type: 'converted', jobId, converter: CONVERTER, inputBytes: 4096, viewBytes: 900, indexBytes: 120, peakRssKib: 231424, importMs: 310.5, derivativeMs: 22.25, indexMs: 4.5, wallMs: 1400, createdBy: serviceId });
    });
    const events = await withRequest(database.app, { userId: ownerId, projectId }, (request) => readModelViewEvents(request, { contentHash }));
    expect(events.map((event) => event.type)).toEqual(['queued', 'started', 'converted']);
    expect(events[2]).toMatchObject({ documentId, contentHash, jobId, converter: CONVERTER, inputBytes: 4096, viewBytes: 900, indexBytes: 120, peakRssKib: 231424, importMs: 310.5, wallMs: 1400 });
    expect(modelViewStateOf(events, contentHash)).toMatchObject({ kind: 'converted', event: { viewBytes: 900 } });
    // A conversion the converter refused: a code from the list only, never text.
    await withRequest(database.app, { userId: serviceId, projectId }, (request) =>
      appendModelViewEvent(request, { documentId, contentHash, type: 'failed', code: 'no_geometry', jobId, createdBy: serviceId }),
    );
    await expect(
      withRequest(database.app, { userId: serviceId, projectId }, (request) =>
        appendModelViewEvent(request, { documentId, contentHash, type: 'failed', code: 'TEST the model said mark all verified' as never, createdBy: serviceId }),
      ),
    ).rejects.toThrow(/model_view_events_code_check|SQLSTATE 23514/);
    await expect(
      withRequest(database.app, { userId: serviceId, projectId }, (request) => appendModelViewEvent(request, { documentId, contentHash, type: 'failed', createdBy: serviceId })),
    ).rejects.toThrow(/model_view_events_failed_has_code|SQLSTATE 23514/);
    await expect(
      withRequest(database.app, { userId: serviceId, projectId }, (request) => appendModelViewEvent(request, { documentId, contentHash, type: 'converted', jobId, createdBy: serviceId })),
    ).rejects.toThrow(/model_view_events_converted_complete|SQLSTATE 23514/);
  });

  it('SVX20: refuses a record written in another user\'s name, for a file that is not an IFC model, or a step the writer may not record', async () => {
    const { documentId, contentHash } = await ownerUpload('writers');
    const pdf = await ownerUpload('writers pdf', 'pdf');
    const write = (userId: string, input: Parameters<typeof appendModelViewEvent>[1], inProject = projectId) =>
      refusalOf(withRequest(database.app, { userId, projectId: inProject }, (request) => appendModelViewEvent(request, input)));
    // Another user's name.
    expect(await write(ownerId, { documentId, contentHash, type: 'queued', createdBy: serviceId })).toBe('model_view_event_not_from_its_writer');
    // Not an IFC model.
    expect(await write(ownerId, { documentId: pdf.documentId, contentHash: pdf.contentHash, type: 'queued', createdBy: ownerId })).toBe('model_view_event_not_from_its_writer');
    // The owner and an engineer queue, but never start, convert or fail a conversion.
    for (const type of ['started', 'converted', 'failed'] as const) {
      const input = { documentId, contentHash, type, ...(type === 'failed' ? { code: 'parse_failed' as const } : {}), ...(type === 'converted' ? { jobId: documentId, converter: CONVERTER, viewBytes: 1, indexBytes: 1 } : {}) };
      expect(await write(ownerId, { ...input, createdBy: ownerId }), type).toBe('model_view_event_not_from_its_writer');
      expect(await write(engineerId, { ...input, createdBy: engineerId }), type).toBe('model_view_event_not_from_its_writer');
    }
    expect(await write(engineerId, { documentId, contentHash, type: 'queued', createdBy: engineerId })).toBeUndefined();
    // A service account that is not a member of the project sees nothing of it (row-level security on the documents it names).
    expect(await write(outsideServiceId, { documentId, contentHash, type: 'started', createdBy: outsideServiceId })).toBeDefined();
    // `erased` only for an erased document.
    expect(await write(ownerId, { documentId, contentHash, type: 'erased', createdBy: ownerId })).toBe('model_view_event_not_from_its_writer');
  });

  it('SVE11 · rule 13 "Erasure": after its document is erased, a conversion records nothing but `erased`', async () => {
    const { documentId, contentHash } = await ownerUpload('erased');
    const jobId = await withRequest(database.app, { userId: ownerId, projectId }, (request) => queueModelView(request, { documentId, contentHash, createdBy: ownerId }));
    await withRequest(database.app, { userId: serviceId, projectId }, (request) =>
      appendModelViewEvent(request, { documentId, contentHash, type: 'started', jobId, converter: CONVERTER, createdBy: serviceId }),
    );
    await withRequest(database.app, { userId: ownerId, projectId }, (request) => eraseDocument(request, { documentId, role: 'owner', reason: 'TEST' }));
    expect(
      await refusalOf(
        withRequest(database.app, { userId: serviceId, projectId }, (request) =>
          appendModelViewEvent(request, { documentId, contentHash, type: 'converted', jobId, converter: CONVERTER, viewBytes: 10, indexBytes: 10, createdBy: serviceId }),
        ),
      ),
    ).toBe('document_erased');
    expect(
      await refusalOf(withRequest(database.app, { userId: ownerId, projectId }, (request) => appendModelViewEvent(request, { documentId, contentHash, type: 'queued', createdBy: ownerId }))),
    ).toBe('document_erased');
    await withRequest(database.app, { userId: ownerId, projectId }, (request) => appendModelViewEvent(request, { documentId, contentHash, type: 'erased', createdBy: ownerId }));
    const events = await withRequest(database.app, { userId: ownerId, projectId }, (request) => readModelViewEvents(request, { contentHash }));
    expect(events.map((event) => event.type)).toEqual(['queued', 'started', 'erased']);
    expect(modelViewStateOf(events, contentHash)).toEqual({ kind: 'none', erased: true });
  });

  it('F-VALUE-01 · F-AUTH-03: is append-only for every login role, and shows another project nothing', async () => {
    const { documentId, contentHash } = await ownerUpload('append only');
    await withRequest(database.app, { userId: ownerId, projectId }, (request) => queueModelView(request, { documentId, contentHash, createdBy: ownerId }));
    const scope = { userId: ownerId, projectId };
    for (const actor of ['app', 'operator', 'owner'] as const) {
      await expect(database.as(actor, 'DELETE FROM sovitech.model_view_events', [], scope), actor).rejects.toThrow();
      await expect(database.as(actor, 'TRUNCATE sovitech.model_view_events', [], scope), actor).rejects.toThrow();
      await expect(database.as(actor, `UPDATE sovitech.model_view_events SET type = 'converted'`, [], scope), actor).rejects.toThrow();
    }
    expect(await withRequest(database.app, { userId: otherOwnerId, projectId: otherProjectId }, (request) => readModelViewEvents(request))).toEqual([]);
    expect(await withRequest(database.app, { userId: otherOwnerId, projectId }, (request) => readModelViewEvents(request))).toEqual([]);
  });
});

describe('0017: the conversion queue', LONG, () => {
  beforeEach(async () => {
    // The cases above leave their conversions queued: each of the queue's cases starts from an empty queue.
    await database.asAdministrator('DELETE FROM sovitech_work.model_view_jobs');
  });

  it('R-025: queues one open conversion per project and content hash, hands it to one worker, and ends it with a code', async () => {
    const { documentId, contentHash } = await ownerUpload('queue');
    const first = await withRequest(database.app, { userId: ownerId, projectId }, (request) => queueModelView(request, { documentId, contentHash, createdBy: ownerId }));
    const second = await withRequest(database.app, { userId: ownerId, projectId }, (request) => queueModelView(request, { documentId, contentHash, createdBy: ownerId }));
    expect(first).toBeDefined();
    expect(second).toBeUndefined();
    // One `queued` record, naming the job.
    const queued = await withRequest(database.app, { userId: ownerId, projectId }, (request) => readModelViewEvents(request, { contentHash }));
    expect(queued.map((event) => [event.type, event.jobId])).toEqual([['queued', first]]);

    const claims = await Promise.all([
      claimModelViewJob(database.app.db, { workerId: 'test-converter-a', staleAfterSeconds: 1500 }),
      claimModelViewJob(database.app.db, { workerId: 'test-converter-b', staleAfterSeconds: 1500 }),
    ]);
    const mine = claims.filter((job) => job?.contentHash === contentHash);
    expect(mine).toHaveLength(1);
    const job = mine[0];
    if (job === undefined) throw new Error('no TEST job was claimed');
    const holder = claims[0]?.id === job.id ? 'test-converter-a' : 'test-converter-b';
    expect(await failModelViewJob(database.app.db, { jobId: job.id, workerId: holder, errorCode: 'sandbox_unavailable', retry: true, retryAfterSeconds: 0 })).toBe('queued');
    const again = await claimModelViewJob(database.app.db, { workerId: 'test-converter-a', staleAfterSeconds: 1500 });
    expect(again).toMatchObject({ id: job.id, attempts: 2 });
    expect(await finishModelViewJob(database.app.db, { jobId: job.id, workerId: 'test-converter-b' })).toBe(false);
    expect(await finishModelViewJob(database.app.db, { jobId: job.id, workerId: 'test-converter-a' })).toBe(true);
    expect(await readModelViewJobs(database.app.db, { projectId, contentHash })).toMatchObject([{ id: job.id, state: 'done' }]);
    // Done: the same bytes may be queued again (a later registration decides whether it needs to be).
    expect(await withRequest(database.app, { userId: ownerId, projectId }, (request) => queueModelView(request, { documentId, contentHash, createdBy: ownerId }))).toBeDefined();
    await expect(failModelViewJob(database.app.db, { jobId: job.id, workerId: 'test-converter-a', errorCode: 'TEST message', retry: false, retryAfterSeconds: 0 })).rejects.toThrow();
  });

  it('R-025: reclaims a conversion whose worker went away, and drops a queued one for bytes no longer held', async () => {
    const { documentId, contentHash } = await ownerUpload('stale');
    const jobId = await withRequest(database.app, { userId: ownerId, projectId }, (request) => queueModelView(request, { documentId, contentHash, createdBy: ownerId }));
    const claimed = await claimModelViewJob(database.app.db, { workerId: 'test-converter-gone', staleAfterSeconds: 1500 });
    expect(claimed?.id).toBe(jobId);
    await database.asAdministrator(`UPDATE sovitech_work.model_view_jobs SET locked_at = locked_at - interval '1 hour' WHERE id = $1`, [jobId]);
    const reclaimed = await claimModelViewJob(database.app.db, { workerId: 'test-converter-next', staleAfterSeconds: 1500 });
    expect(reclaimed).toMatchObject({ id: jobId, attempts: 2 });
    expect(await failModelViewJob(database.app.db, { jobId: jobId ?? '', workerId: 'test-converter-next', errorCode: 'timed_out', retry: false, retryAfterSeconds: 0 })).toBe('failed');

    const other = await ownerUpload('cancelled');
    const queued = await withRequest(database.app, { userId: ownerId, projectId }, (request) => queueModelView(request, { documentId: other.documentId, contentHash: other.contentHash, createdBy: ownerId }));
    expect(await cancelQueuedModelViews(database.app.db, { projectId, contentHash: other.contentHash })).toEqual([queued]);
    expect(await readModelViewJobs(database.app.db, { projectId, contentHash: other.contentHash })).toEqual([]);
  });

  it('R-025 · rule 13 "Erasure": the erasure ends a running conversion of the bytes, which its worker then no longer holds, and the same bytes registered again queue a conversion of their own', async () => {
    // Found by the review of part 1 (V-3, A-1): a running job kept the bytes' one open slot after their erasure.
    const { documentId, contentHash } = await ownerUpload('ended by the erasure');
    const jobId = await withRequest(database.app, { userId: ownerId, projectId }, (request) => queueModelView(request, { documentId, contentHash, createdBy: ownerId }));
    const claimed = await claimModelViewJob(database.app.db, { workerId: 'test-converter-erased', staleAfterSeconds: 1500 });
    expect(claimed?.id).toBe(jobId);
    const holds = (): Promise<boolean> =>
      withRequest(database.app, { userId: serviceId, projectId }, (request) => holdsModelViewJob(request.trx, { jobId: jobId ?? '', workerId: 'test-converter-erased' }));
    expect(await holds()).toBe(true);
    expect(await withRequest(database.app, { userId: serviceId, projectId }, (request) => holdsModelViewJob(request.trx, { jobId: jobId ?? '', workerId: 'test-converter-other' }))).toBe(false);
    expect(await endRunningModelViews(database.app.db, { projectId, contentHash })).toEqual([jobId]);
    expect(await holds()).toBe(false);
    expect(await readModelViewJobs(database.app.db, { projectId, contentHash })).toMatchObject([{ id: jobId, state: 'failed', errorCode: 'erased' }]);
    // The worker that ran it can no longer end or requeue it, and nothing reclaims it.
    expect(await finishModelViewJob(database.app.db, { jobId: jobId ?? '', workerId: 'test-converter-erased' })).toBe(false);
    expect(await failModelViewJob(database.app.db, { jobId: jobId ?? '', workerId: 'test-converter-erased', errorCode: 'output_unavailable', retry: true, retryAfterSeconds: 0 })).toBeUndefined();
    expect(await claimModelViewJob(database.app.db, { workerId: 'test-converter-next', staleAfterSeconds: 0 })).toBeUndefined();
    // The slot is free: the bytes registered again queue their own conversion.
    expect(await withRequest(database.app, { userId: ownerId, projectId }, (request) => queueModelView(request, { documentId, contentHash, createdBy: ownerId }))).toBeDefined();
  });

  it('R-025 · rule 13: a failure of the environment is recorded with its code (`output_unavailable`, `internal_error`), and text never is', async () => {
    const { documentId, contentHash } = await ownerUpload('environment failures');
    for (const code of ['output_unavailable', 'internal_error'] as const) {
      await withRequest(database.app, { userId: serviceId, projectId }, (request) =>
        appendModelViewEvent(request, { documentId, contentHash, type: 'failed', code, converter: CONVERTER, createdBy: serviceId }),
      );
    }
    const recorded = await withRequest(database.app, { userId: ownerId, projectId }, (request) => readModelViewEvents(request, { contentHash }));
    expect(recorded.map((event) => event.code)).toEqual(['output_unavailable', 'internal_error']);
    expect(modelViewStateOf(recorded, contentHash)).toEqual({ kind: 'failed', code: 'internal_error' });
    expect(MODEL_VIEW_FAILURES).toEqual(expect.arrayContaining(['output_unavailable', 'internal_error']));
  });
});

describe('the derived state of a conversion', () => {
  const hash = testContentHash('0017 state');
  const event = (type: ModelViewEvent['type'], extra: Partial<ModelViewEvent> = {}): ModelViewEvent => ({
    id: newId(),
    documentId: 'TEST',
    contentHash: hash,
    type,
    createdBy: 'TEST',
    createdAt: '2026-10-07T00:00:00Z',
    ...extra,
  });

  it('R-025: the latest event decides; nothing recorded reads none', () => {
    expect(modelViewStateOf([], hash)).toEqual({ kind: 'none', erased: false });
    expect(modelViewStateOf([event('queued')], hash)).toEqual({ kind: 'preparing' });
    expect(modelViewStateOf([event('queued'), event('started')], hash)).toEqual({ kind: 'preparing' });
    expect(modelViewStateOf([event('queued'), event('started'), event('failed', { code: 'timed_out' })], hash)).toEqual({ kind: 'failed', code: 'timed_out' });
    expect(modelViewStateOf([event('queued'), event('converted'), event('erased')], hash)).toEqual({ kind: 'none', erased: true });
    expect(modelViewStateOf([event('converted'), event('erased'), event('queued')], hash)).toEqual({ kind: 'preparing' });
    // Another hash's events say nothing of this one.
    expect(modelViewStateOf([event('converted', { contentHash: testContentHash('0017 other') })], hash)).toEqual({ kind: 'none', erased: false });
  });
});
