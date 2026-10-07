/**
 * The conversion pipeline of stored IFC models shown as documents (the viewer step, part 1; the owner's decision of
 * 2026-10-05 on D-03, "1 b", for display only; PRD R-025, R-078; docs/build-log.md, "The viewer step", item 3), over a
 * TEST API and data folder, with the conversion sandbox scripted (tests/guardrails/_support/model-view.ts). Not
 * indexed: the indexed cases are G1-30, G13-4, G13-13, G13-14, G14-5, G4-20 and G12-5.
 *
 * - The serving route (`documents.modelView`) answers only for a current IFC model of the project with a `converted`
 *   record: a signed-out request, a PDF, a model still being prepared, a failed one and a superseded one read as 404.
 * - The worker refuses an image whose source label differs from the repository's converter (`stale_image`, recorded,
 *   the sandbox never started), retries an image the daemon does not hold and then records `sandbox_unavailable`,
 *   records the converter's own failure codes, and refuses an output that is not the converter's (`output_refused`):
 *   a summary that is not its shape, sizes that differ, a storey index holding anything but GlobalIds.
 * - Registration queues one conversion per project and bytes, and makes the extraction account a member of a project
 *   that holds only models.
 * - The backfill at worker start queues each current model with no record, once; queues again the failures of the
 *   environment (`stale_image`, `sandbox_unavailable`, `output_unavailable`, `internal_error`), never a model's own, and
 *   a model whose record reads "being prepared" with no conversion open; and leaves superseded models alone.
 * - An unforeseen failure of the job, and view files the host cannot move into `derived/`, are retried after their
 *   pause within the attempts, then recorded; a folder an earlier run left is cleared first (the review of part 1).
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  addProjectMember,
  appendModelViewEvent,
  readModelViewEvents,
  readModelViewJobs,
  readProjectDocuments,
  readVisibleAccounts,
  recordDocumentFile,
  registerDocument,
  withRequest,
} from '@sovitech/db';
import { testContentHash } from '@sovitech/db/testing';
import { queueMissingConversions } from '../../apps/api/src/jobs/model-view/backfill';
import type { ModelConverterRunner } from '../../apps/api/src/jobs/model-view/sandbox';
import { fixtureBytes, ownerWithProject, signIn, startTestApi, upload, type Auth, type TestApi } from '../guardrails/_support/api';
import { ScriptedConverter, TEST_IMAGE, TEST_VIEW_BYTES, modelView, scriptedSummary, testConverterWorker } from '../guardrails/_support/model-view';

let api: TestApi;

beforeAll(async () => {
  api = await startTestApi();
}, 240_000);

afterAll(async () => {
  await api.stop();
});

interface Project {
  readonly ownerId: string;
  readonly projectId: string;
  readonly auth: Auth;
}

async function project(label: string): Promise<Project> {
  const { ownerId, projectId } = await ownerWithProject(api, label);
  return { ownerId, projectId, auth: await signIn(api, ownerId) };
}

async function uploadFixture(side: Project, path: string): Promise<{ readonly documentId: string; readonly contentHash: string }> {
  const name = path.split('/').at(-1) ?? 'file';
  const documentId = (await upload(api, side.auth, side.projectId, name, fixtureBytes(path))).body.documentId ?? '';
  const { documents } = await withRequest(api.database.app, { userId: side.ownerId, projectId: side.projectId }, (request) => readProjectDocuments(request));
  return { documentId, contentHash: documents.find((document) => document.id === documentId)?.contentHash ?? '' };
}

async function events(side: Project, contentHash?: string): Promise<{ type: string; code?: string }[]> {
  const read = await withRequest(api.database.app, { userId: side.ownerId, projectId: side.projectId }, (request) =>
    readModelViewEvents(request, contentHash === undefined ? {} : { contentHash }),
  );
  return read.map((event) => ({ type: event.type, ...(event.code === undefined ? {} : { code: event.code }) }));
}

/** One project's steps of a drain (other tests' projects may hold queued conversions). */
async function convert(side: Project, converter: ModelConverterRunner = new ScriptedConverter(), options: Parameters<typeof testConverterWorker>[2] = {}): Promise<string[]> {
  return (await testConverterWorker(api, converter, options).drain())
    .filter((step) => 'job' in step && step.job.projectId === side.projectId)
    .map((step) => ('code' in step ? `${step.kind}:${step.code}` : step.kind));
}

/** The worker's start (the backfill, over every project the service account sees), and this project's conversions it left queued. */
async function startQueues(side: Project): Promise<number> {
  await queueMissingConversions(api.services, api.extractionAccountId);
  return (await readModelViewJobs(api.database.app.db, { projectId: side.projectId })).filter((job) => job.state === 'queued').length;
}

describe('the viewer step: the conversion pipeline', { timeout: 120_000 }, () => {
  it('R-025 · R-078 · US-MODEL-04 AC7: the view file is served only for a current IFC model of the project with a converted record', async () => {
    const side = await project('pipeline serving');
    const arh = await uploadFixture(side, 'fixtures/ifc/demo-hotel-arh.ifc');
    const memo = await uploadFixture(side, 'fixtures/pdf/memoriu-tehnic.pdf');
    // Signed out: 401. A model still being prepared, a PDF, an unknown id: 404.
    expect((await api.app.inject({ method: 'GET', url: `/api/projects/${side.projectId}/documents/${arh.documentId}/model-view` })).statusCode).toBe(401);
    expect((await modelView(api, side.auth, side.projectId, arh.documentId)).status).toBe(404);
    expect((await modelView(api, side.auth, side.projectId, memo.documentId)).status).toBe(404);
    expect((await modelView(api, side.auth, side.projectId, '01a113c0-0000-7000-8000-000000000000')).status).toBe(404);
    expect(await convert(side)).toEqual(['converted']);
    const served = await modelView(api, side.auth, side.projectId, arh.documentId);
    expect(served.status).toBe(200);
    expect(served.headers['content-length']).toBe(String(served.body.length));
    // A model a declared revision supersedes is no longer current: its view is not served; the revision's is, once converted.
    const revB = await uploadFixture(side, 'fixtures/ifc/demo-hotel-mep-rev-b.ifc');
    const declared = await api.app.inject({
      method: 'POST',
      url: `/api/projects/${side.projectId}/documents/${revB.documentId}/revision-of`,
      headers: { ...side.auth },
      payload: { revisionOf: arh.documentId },
    });
    expect(declared.statusCode).toBe(204);
    expect((await modelView(api, side.auth, side.projectId, arh.documentId)).status).toBe(404);
    expect(await convert(side)).toEqual(['converted']);
    expect((await modelView(api, side.auth, side.projectId, revB.documentId)).status).toBe(200);
  });

  it('R-025 · rule 13: an image built from other sources fails the conversion with `stale_image`, recorded, and the sandbox never starts', async () => {
    const side = await project('pipeline stale');
    const model = await uploadFixture(side, 'fixtures/ifc/demo-hotel-arh.ifc');
    const never = new ScriptedConverter();
    expect(await convert(side, never, { inspect: () => Promise.resolve({ digest: TEST_IMAGE.digest, sourceHash: testContentHash('an older converter') }) })).toEqual([
      'failed:stale_image',
    ]);
    expect(never.jobs).toEqual([]);
    // An image with no source label at all (the spike's image of 2026-10-02) is stale too.
    await api.app.inject({ method: 'DELETE', url: `/api/projects/${side.projectId}/documents/${model.documentId}`, headers: { ...side.auth } });
    await uploadFixture(side, 'fixtures/ifc/demo-hotel-arh.ifc');
    expect(await convert(side, never, { inspect: () => Promise.resolve({ digest: TEST_IMAGE.digest }) })).toEqual(['failed:stale_image']);
    expect(never.jobs).toEqual([]);
    expect((await events(side)).map((event) => event.code ?? event.type)).toEqual(['queued', 'stale_image', 'erased', 'queued', 'stale_image']);
  });

  it('R-025: an image the daemon does not hold is retried, then recorded as `sandbox_unavailable`', async () => {
    const side = await project('pipeline unavailable');
    await uploadFixture(side, 'fixtures/ifc/demo-hotel-arh.ifc');
    const missing = { inspect: () => Promise.resolve(undefined), maxAttempts: 2 };
    expect(await convert(side, new ScriptedConverter(), missing)).toEqual(['retry:sandbox_unavailable', 'failed:sandbox_unavailable']);
    expect((await events(side)).map((event) => event.code ?? event.type)).toEqual(['queued', 'sandbox_unavailable']);
  });

  it('R-025 · US-MODEL-05 AC4: the converter\'s own failures are recorded with their codes, and nothing of them is kept', async () => {
    for (const code of ['parse_failed', 'no_geometry', 'timed_out', 'out_of_memory'] as const) {
      const side = await project(`pipeline ${code}`);
      const model = await uploadFixture(side, 'fixtures/ifc/demo-hotel-arh.ifc');
      expect(await convert(side, new ScriptedConverter(() => ({ outcome: code })))).toEqual([`failed:${code}`]);
      expect(await events(side)).toEqual([{ type: 'queued' }, { type: 'started' }, { type: 'failed', code }]);
      expect((await api.files.filesKeyedTo(side.projectId, model.contentHash)).filter((path) => !path.endsWith('/original'))).toEqual([]);
      expect((await modelView(api, side.auth, side.projectId, model.documentId)).status).toBe(404);
    }
  });

  it('R-025 · rule 13 · ifc-input 6.2.15: an output that is not the converter\'s is refused whole (`output_refused`): a summary of another shape, sizes that differ, a storey index holding anything but GlobalIds', async () => {
    const view = Buffer.from('TEST view', 'utf8');
    const index = `${JSON.stringify({ storeys: [{ storey: '0TESTstoreyGlobalId001', elements: ['0TESTelementGlobalId01'] }] })}\n`;
    const outputs = [
      { 'summary.json': 'not json\n' },
      { 'summary.json': `${JSON.stringify({ code: 'written' })}\n` },
      { 'summary.json': `${JSON.stringify({ code: 'written' }, null, 2)}\n` },
      { 'viewer.frag': view, 'storeys.json': index, 'summary.json': scriptedSummary(Buffer.from('TEST view, longer'), index) },
      { 'storeys.json': `${JSON.stringify({ storeys: [{ storey: '0TESTstoreyGlobalId001', elements: ['Level 1 corridor wall'] }] })}\n` },
      { 'storeys.json': `${JSON.stringify({ storeys: [{ storey: '0TESTstoreyGlobalId001', elements: [], elevation: 3150 }] })}\n` },
      { 'viewer.frag': Buffer.alloc(0), 'summary.json': scriptedSummary(Buffer.alloc(0), index) },
    ];
    for (const files of outputs) {
      const side = await project('pipeline refused');
      const model = await uploadFixture(side, 'fixtures/ifc/demo-hotel-arh.ifc');
      expect(await convert(side, new ScriptedConverter(() => ({ files })))).toEqual(['failed:output_refused']);
      expect((await api.files.filesKeyedTo(side.projectId, model.contentHash)).filter((path) => !path.endsWith('/original'))).toEqual([]);
    }
  });

  it('R-025 · US-MODEL-05 AC4 · rule 13: an unforeseen failure of the job is retried after its pause while attempts are left, then recorded as `internal_error`, which the worker\'s start queues again; nothing of the error is logged', async () => {
    // Found by the review of part 1 (V-2, A-5): the last attempt ended the job with no record, so the record read
    // "being prepared" for good and the worker's start never queued it again.
    const throwing: ModelConverterRunner = { run: () => Promise.reject(new Error('TEST unforeseen failure of the job')) };
    // A pause before the retry: the drain finds nothing ready, and the record says only what is so (still queued).
    const paused = await project('pipeline internal error paused');
    const pausedModel = await uploadFixture(paused, 'fixtures/ifc/demo-hotel-arh.ifc');
    expect(await convert(paused, new ScriptedConverter(), { inspect: () => Promise.reject(new Error('TEST unforeseen failure of the inspection')), maxAttempts: 2, retryAfterSeconds: 3600 })).toEqual(['retry:internal_error']);
    expect(await readModelViewJobs(api.database.app.db, { projectId: paused.projectId, contentHash: pausedModel.contentHash })).toMatchObject([{ state: 'queued', attempts: 1, errorCode: 'internal_error' }]);
    // Attempts used up: recorded as the environment's failure, and queued again when the worker starts.
    const side = await project('pipeline internal error');
    const model = await uploadFixture(side, 'fixtures/ifc/demo-hotel-arh.ifc');
    expect(await convert(side, throwing, { maxAttempts: 2 })).toEqual(['retry:internal_error', 'failed:internal_error']);
    expect((await events(side)).map((event) => event.code ?? event.type)).toEqual(['queued', 'started', 'started', 'internal_error']);
    expect(JSON.stringify(api.log)).not.toContain('TEST unforeseen');
    expect(await startQueues(side)).toBe(1);
    expect(await convert(side)).toEqual(['converted']);
    expect((await modelView(api, side.auth, side.projectId, model.documentId)).status).toBe(200);
  });

  it('R-025 · US-MODEL-05 AC4: view files that cannot be moved into `derived/` are an error of the host, retried within the attempts and then recorded, never converted again without end', async () => {
    // Found by the review of part 1 (V-2, A-6): any error of the move read as a missing folder and ran the whole
    // conversion again at once, with no limit.
    const side = await project('pipeline derived blocked');
    const model = await uploadFixture(side, 'fixtures/ifc/demo-hotel-arh.ifc');
    // A file where the `derived/` folder goes: the move fails on the host each time.
    await writeFile(api.files.derivedDirectory(side.projectId, model.contentHash), 'TEST not a folder');
    const blocked = new ScriptedConverter();
    expect(await convert(side, blocked, { maxAttempts: 2 })).toEqual(['retry:internal_error', 'failed:internal_error']);
    expect(blocked.jobs.filter(({ job }) => job.outputDirectory.includes(side.projectId))).toHaveLength(2);
    expect((await events(side)).map((event) => event.code ?? event.type)).toEqual(['queued', 'started', 'started', 'internal_error']);
    expect((await modelView(api, side.auth, side.projectId, model.documentId)).status).toBe(404);
    // The host mended: the worker's start queues it again, and it converts.
    await rm(api.files.derivedDirectory(side.projectId, model.contentHash));
    expect(await startQueues(side)).toBe(1);
    expect(await convert(side)).toEqual(['converted']);
  });

  it('R-025 · US-MODEL-05 AC4: a folder an earlier run of the job left (its worker stopped part-way) is cleared before the next run, which converts', async () => {
    // Found by the review of part 1 (A-4): the copy-out's new file met the old one, and the model read as refused.
    const side = await project('pipeline leftover folder');
    const model = await uploadFixture(side, 'fixtures/ifc/demo-hotel-arh.ifc');
    const [job] = await readModelViewJobs(api.database.app.db, { projectId: side.projectId, contentHash: model.contentHash });
    if (job === undefined) throw new Error('no TEST conversion was queued');
    const leftover = join(api.files.workDirectory(side.projectId, model.contentHash, job.id), 'output');
    await mkdir(leftover, { recursive: true, mode: 0o700 });
    await writeFile(join(leftover, 'viewer.frag'), 'TEST bytes of an earlier run', { mode: 0o600 });
    expect(await convert(side)).toEqual(['converted']);
    expect((await modelView(api, side.auth, side.projectId, model.documentId)).body.equals(TEST_VIEW_BYTES)).toBe(true);
  });

  it('R-025 · US-MODEL-05 AC4: the worker\'s start queues again a model whose record reads "being prepared" with no conversion open, and never a second one while one is open', async () => {
    const side = await project('pipeline preparing with no job');
    const model = await uploadFixture(side, 'fixtures/ifc/demo-hotel-arh.ifc');
    // Open: the start queues nothing more.
    expect(await startQueues(side)).toBe(1);
    expect(await readModelViewJobs(api.database.app.db, { projectId: side.projectId, contentHash: model.contentHash })).toHaveLength(1);
    // The open job gone with no record after `queued` (a worker that could not reach the store to record its end).
    await api.database.asAdministrator('DELETE FROM sovitech_work.model_view_jobs WHERE project_id = $1', [side.projectId]);
    expect(await startQueues(side)).toBe(1);
    expect((await events(side)).map((event) => event.type)).toEqual(['queued', 'queued']);
    expect(await convert(side)).toEqual(['converted']);
  });

  it('R-025 · ADR 0013: registration queues one conversion per project and bytes, and makes the extraction account a member of a project holding only models', async () => {
    const side = await project('pipeline registration');
    const first = await uploadFixture(side, 'fixtures/ifc/demo-hotel-mep-rev-a.ifc');
    await uploadFixture(side, 'fixtures/ifc/demo-hotel-mep-rev-a.ifc');
    expect(await readModelViewJobs(api.database.app.db, { projectId: side.projectId })).toMatchObject([{ contentHash: first.contentHash, state: 'queued' }]);
    expect((await events(side)).map((event) => event.type)).toEqual(['queued']);
    const members = await withRequest(api.database.app, { userId: side.ownerId, projectId: side.projectId }, (request) => readVisibleAccounts(request));
    expect(members.map((account) => account.id)).toContain(api.extractionAccountId);
  });

  it('R-025: the backfill queues each current model with no record once, queues again only failures of the environment, and leaves superseded models alone', async () => {
    const side = await project('pipeline backfill');
    // Models stored before the viewer step: registered with no conversion record (as the phase 2 to 5 app stored them).
    const stored = async (label: string): Promise<{ documentId: string; contentHash: string }> => {
      const contentHash = testContentHash(`backfill ${label}`);
      return withRequest(api.database.app, { userId: side.ownerId, projectId: side.projectId }, async (request) => {
        const document = await registerDocument(request, { contentHash, kind: 'other', stage: 'unknown', analysis: { status: 'stored_only', coverage: 'stored: IFC model' }, createdBy: side.ownerId });
        await recordDocumentFile(request, { documentId: document.id, contentHash, format: 'ifc', byteSize: 2048, createdBy: side.ownerId });
        return { documentId: document.id, contentHash };
      });
    };
    const plain = await stored('plain');
    const stale = await stored('stale');
    const broken = await stored('broken');
    const older = await stored('older');
    const newer = await stored('newer');
    await withRequest(api.database.app, { userId: side.ownerId, projectId: side.projectId }, async (request) => {
      await addProjectMember(request, { projectId: side.projectId, userId: api.extractionAccountId });
    });
    await api.app.inject({ method: 'POST', url: `/api/projects/${side.projectId}/documents/${newer.documentId}/revision-of`, headers: { ...side.auth }, payload: { revisionOf: older.documentId } });
    // Two conversions that already failed: one for the environment, one on the model itself.
    await withRequest(api.database.app, { userId: api.extractionAccountId, projectId: side.projectId }, async (request) => {
      await appendModelViewEvent(request, { documentId: stale.documentId, contentHash: stale.contentHash, type: 'failed', code: 'stale_image', createdBy: api.extractionAccountId });
      await appendModelViewEvent(request, { documentId: broken.documentId, contentHash: broken.contentHash, type: 'failed', code: 'parse_failed', createdBy: api.extractionAccountId });
    });

    const first = await queueMissingConversions(api.services, api.extractionAccountId);
    expect(first.failed).toEqual([]);
    const jobs = await readModelViewJobs(api.database.app.db, { projectId: side.projectId });
    expect(jobs.map((job) => job.contentHash).sort()).toEqual([plain.contentHash, stale.contentHash, newer.contentHash].sort());
    expect(jobs.every((job) => job.state === 'queued')).toBe(true);
    // A second start queues nothing more.
    await queueMissingConversions(api.services, api.extractionAccountId);
    expect(await readModelViewJobs(api.database.app.db, { projectId: side.projectId })).toHaveLength(3);
    const queuedBy = await api.database.asAdministrator<{ created_by: string }>("SELECT DISTINCT created_by FROM sovitech.model_view_events WHERE project_id = $1 AND type = 'queued'", [side.projectId]);
    expect(queuedBy).toEqual([{ created_by: api.extractionAccountId }]);
  });
});
