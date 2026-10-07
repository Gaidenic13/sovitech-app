/**
 * ifc-input 6.2.16 · view files erased with their document (the stricter choice, built live and not indexed; the viewer
 * step, part 1: docs/build-log.md, "The viewer step", items 3 and 7; rule 13, "Erasure": every file derived from a
 * document goes with it; G13-10's rule for bytes another document still holds; prompt 3 section 7, "Documents stay
 * with their project").
 *
 * Over a TEST API and data folder, with the conversion sandbox scripted (tests/guardrails/_support/model-view.ts):
 * - deleting a converted model removes its view file and storey index with the original, records `erased`, and the
 *   serving route answers 404 for it;
 * - a conversion that finishes after its document's erasure has committed (the owner deletes the model while the
 *   converter runs) leaves no file keyed to the hash and records nothing after `erased`; a queued conversion is dropped;
 * - when the same bytes are uploaded again while that erased run is still going, the erased run keeps and records
 *   nothing, and the new document is queued and converted on its own (the erasure ends the running job);
 * - a second document of the same bytes reuses the first one's conversion, keeps its view when the first is deleted,
 *   and the view goes with the last of them;
 * - every answer of `documents.modelView` carries `Cache-Control: no-store` (and `X-Content-Type-Options: nosniff`
 *   when it serves the file). The browser half (no IndexedDB database or Cache Storage entry after a view) is the
 *   viewer's, in packages/viewer and part 2.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readModelViewEvents, readModelViewJobs, readProjectDocuments, withRequest } from '@sovitech/db';
import { fixtureBytes, ownerWithProject, signIn, startTestApi, upload, type Auth, type TestApi } from '../guardrails/_support/api';
import { ScriptedConverter, TEST_VIEW_BYTES, modelView, testConverterWorker } from '../guardrails/_support/model-view';

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

async function uploadArh(side: Project): Promise<{ readonly documentId: string; readonly contentHash: string }> {
  const documentId = (await upload(api, side.auth, side.projectId, 'demo-hotel-arh.ifc', fixtureBytes('fixtures/ifc/demo-hotel-arh.ifc'))).body.documentId ?? '';
  const { documents } = await withRequest(api.database.app, { userId: side.ownerId, projectId: side.projectId }, (request) => readProjectDocuments(request));
  return { documentId, contentHash: documents.find((document) => document.id === documentId)?.contentHash ?? '' };
}

async function remove(side: Project, documentId: string): Promise<number> {
  return (await api.app.inject({ method: 'DELETE', url: `/api/projects/${side.projectId}/documents/${documentId}`, headers: { ...side.auth } })).statusCode;
}

async function events(side: Project): Promise<string[]> {
  return (await withRequest(api.database.app, { userId: side.ownerId, projectId: side.projectId }, (request) => readModelViewEvents(request))).map((event) => event.type);
}

/** The worker's steps for one project's conversions only (other cases' projects may hold queued ones). */
async function convert(side: Project, converter = new ScriptedConverter()): Promise<string[]> {
  return (await testConverterWorker(api, converter).drain()).filter((step) => 'job' in step && step.job.projectId === side.projectId).map((step) => step.kind);
}

describe('ifc-input 6.2.16 (stricter choice, not indexed) · view files erased with their document', { timeout: 120_000 }, () => {
  it('ifc-input 6.2.16 · view files erased with their document: deleting a converted model removes its view file and storey index, records `erased`, and the view answers 404', async () => {
    const side = await project('6.2.16 view erased');
    const model = await uploadArh(side);
    expect(await convert(side)).toEqual(['converted']);
    const derived = ['viewer.frag', 'storeys.json'].map((name) => api.files.derivedPath(side.projectId, model.contentHash, name));
    for (const path of derived) expect(await api.files.exists(path)).toBe(true);
    const served = await modelView(api, side.auth, side.projectId, model.documentId);
    expect(served.status).toBe(200);
    expect(served.body.equals(TEST_VIEW_BYTES)).toBe(true);

    expect(await remove(side, model.documentId)).toBe(200);
    for (const path of derived) expect(await api.files.exists(path)).toBe(false);
    expect(await api.files.filesKeyedTo(side.projectId, model.contentHash)).toEqual([]);
    expect(await api.files.hashesOf(side.projectId)).toEqual([]);
    expect(await events(side)).toEqual(['queued', 'started', 'converted', 'erased']);
    const after = await modelView(api, side.auth, side.projectId, model.documentId);
    expect(after.status).toBe(404);
    expect(after.headers['cache-control']).toBe('no-store');
  });

  it('ifc-input 6.2.16 · view files erased with their document: a conversion finishing after its document\'s erasure has committed leaves no file keyed to the hash, and records nothing after `erased`', async () => {
    const side = await project('6.2.16 erasure race');
    const model = await uploadArh(side);
    let erased = 0;
    // The owner deletes the model while the converter runs, once its files are written in the job's folder.
    const racing = new ScriptedConverter(() => ({
      afterWrite: async () => {
        erased = await remove(side, model.documentId);
      },
    }));
    expect(await convert(side, racing)).toEqual(['ended']);
    expect(erased).toBe(200);
    expect(await api.files.filesKeyedTo(side.projectId, model.contentHash)).toEqual([]);
    expect(await api.files.hashesOf(side.projectId)).toEqual([]);
    expect(await events(side)).toEqual(['queued', 'started', 'erased']);
    expect(api.log).toContainEqual(expect.objectContaining({ event: 'model_view_job_ended', code: 'document_unavailable', projectId: side.projectId }));

    // A conversion still queued when its model is deleted is dropped, and nothing runs for it.
    const queued = await uploadArh(side);
    expect(await remove(side, queued.documentId)).toBe(200);
    expect(await readModelViewJobs(api.database.app.db, { projectId: side.projectId, contentHash: queued.contentHash })).toEqual(
      expect.not.arrayContaining([expect.objectContaining({ state: 'queued' })]),
    );
    const idle = new ScriptedConverter();
    expect(await convert(side, idle)).toEqual([]);
    expect(idle.jobs.filter(({ job }) => job.outputDirectory.includes(side.projectId))).toEqual([]);
    expect(await api.files.hashesOf(side.projectId)).toEqual([]);
  });

  it('ifc-input 6.2.16 · view files erased with their document · US-MODEL-05 AC4: a model deleted and its bytes uploaded again while its conversion runs: the erased run keeps and records nothing, and the new document gets its own conversion, never the erased run\'s failure', async () => {
    // Found by the review of part 1 (V-3, A-1): the erased run's copy-out met its removed folder and recorded
    // `output_refused` against the new document, whose registration had found the running job and queued nothing.
    for (const moment of ['beforeWrite', 'afterWrite'] as const) {
      const side = await project(`6.2.16 erased and uploaded again ${moment}`);
      const first = await uploadArh(side);
      let again: { readonly documentId: string; readonly contentHash: string } | undefined;
      let raced = false;
      const race = async (): Promise<void> => {
        if (raced) return;
        raced = true;
        expect(await remove(side, first.documentId)).toBe(200);
        again = await uploadArh(side);
      };
      const racing = new ScriptedConverter(() => (moment === 'beforeWrite' ? { beforeWrite: race } : { afterWrite: race }));
      expect(await convert(side, racing), moment).toEqual(['ended', 'converted']);
      if (again === undefined) throw new Error('the TEST model was not uploaded again');
      expect(again.contentHash).toBe(first.contentHash);
      const recorded = await withRequest(api.database.app, { userId: side.ownerId, projectId: side.projectId }, (request) => readModelViewEvents(request));
      const by = (documentId: string): string[] => recorded.filter((event) => event.documentId === documentId).map((event) => event.code ?? event.type);
      expect(by(first.documentId), moment).toEqual(['queued', 'started', 'erased']);
      expect(by(again.documentId), moment).toEqual(['queued', 'started', 'converted']);
      expect((await modelView(api, side.auth, side.projectId, again.documentId)).status, moment).toBe(200);
      expect((await modelView(api, side.auth, side.projectId, first.documentId)).status, moment).toBe(404);
      expect(api.log).toContainEqual(expect.objectContaining({ event: 'model_view_job_ended', code: 'document_unavailable', projectId: side.projectId }));
    }
  });

  it('ifc-input 6.2.16 · view files erased with their document: a second document of the same bytes reuses the conversion and keeps its view when the first is deleted; the view goes with the last of them', async () => {
    const side = await project('6.2.16 twin');
    const first = await uploadArh(side);
    const second = await uploadArh(side);
    expect(second.contentHash).toBe(first.contentHash);
    // One conversion of the bytes: the second registration found it queued.
    expect(await readModelViewJobs(api.database.app.db, { projectId: side.projectId, contentHash: first.contentHash })).toHaveLength(1);
    expect(await convert(side)).toEqual(['converted']);
    for (const documentId of [first.documentId, second.documentId]) expect((await modelView(api, side.auth, side.projectId, documentId)).status).toBe(200);

    expect(await remove(side, first.documentId)).toBe(200);
    expect(await api.files.exists(api.files.derivedPath(side.projectId, first.contentHash, 'viewer.frag'))).toBe(true);
    expect((await modelView(api, side.auth, side.projectId, second.documentId)).status).toBe(200);
    expect((await modelView(api, side.auth, side.projectId, first.documentId)).status).toBe(404);
    expect(await events(side)).toEqual(['queued', 'started', 'converted']);

    expect(await remove(side, second.documentId)).toBe(200);
    expect(await api.files.filesKeyedTo(side.projectId, first.contentHash)).toEqual([]);
    expect(await events(side)).toEqual(['queued', 'started', 'converted', 'erased']);
  });

  it('ifc-input 6.2.16 · view files erased with their document: every documents.modelView answer says no-store, and the file is served with nosniff', async () => {
    const side = await project('6.2.16 no-store');
    const model = await uploadArh(side);
    const preparing = await modelView(api, side.auth, side.projectId, model.documentId);
    expect(preparing.status).toBe(404);
    expect(preparing.headers['cache-control']).toBe('no-store');
    expect(await convert(side)).toEqual(['converted']);
    const served = await modelView(api, side.auth, side.projectId, model.documentId);
    expect(served.status).toBe(200);
    expect(served.headers).toMatchObject({ 'cache-control': 'no-store', 'content-type': 'application/octet-stream', 'x-content-type-options': 'nosniff' });
    const other = await project('6.2.16 no-store other');
    const refused = await modelView(api, other.auth, side.projectId, model.documentId);
    expect(refused.status).toBe(404);
    expect(refused.headers['cache-control']).toBe('no-store');
  });
});
