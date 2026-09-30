/**
 * G13-4 (docs/guardrails.md section 7; rule 13, "Isolation": "Every document, excerpt,
 * embedding and cache entry is keyed by project id"; ifc-input 6.1 near miss 2; prompt 3
 * section 7, "Documents stay with their project"; F-INGEST-02; PRD R-158).
 * Situation: two projects upload byte-identical files, such as the same IFC model.
 * Expected: every stored copy, extracted text, converted viewing file and cache entry is
 * keyed by project id. Neither project can read or reuse the other's entries.
 *
 * On a TEST database, two owners upload the same synthetic IFC model and the same synthetic
 * PDF to their own projects. Each project holds its own stored copy under its own project
 * id and content hash; the extractor runs once per project, each job with its own folder
 * under that project; the extracted text is stored once per project; a derived file's
 * place is keyed by project id (no conversion runs in this build: the viewer is phase 4).
 * Neither owner reads the other's list, document, file or text, and erasing one project's
 * copy leaves the other's copy, text and derived file as they were.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { readDocumentTexts, readProjectDocuments, withRequest } from '@sovitech/db';
import { ScriptedRunner, documentList, fixtureBytes, ownerWithProject, signIn, startTestApi, testWorker, upload, type Auth, type TestApi } from './_support/api';
import { idsReference, ifcOutput, pdfOutput } from './_support/outputs';

let api: TestApi;
let runner: ScriptedRunner;
const projects: { ownerId: string; projectId: string; auth: Auth; modelId: string; memoId: string }[] = [];

beforeAll(async () => {
  // The reader's path, with the tests-only switch: the live app reads no model until D-01 (apps/api/src/documents/model-reading.ts).
  api = await startTestApi({ readModels: true });
  for (const label of ['G13-4 A', 'G13-4 B']) {
    const { ownerId, projectId } = await ownerWithProject(api, label);
    const auth = await signIn(api, ownerId);
    const modelId = (await upload(api, auth, projectId, 'demo-hotel-arh.ifc', fixtureBytes('fixtures/ifc/demo-hotel-arh.ifc'))).body.documentId ?? '';
    const memoId = (await upload(api, auth, projectId, 'memoriu-tehnic.pdf', fixtureBytes('fixtures/pdf/memoriu-tehnic.pdf'))).body.documentId ?? '';
    projects.push({ ownerId, projectId, auth, modelId, memoId });
  }
  runner = new ScriptedRunner((_job, request, declaredFormat) =>
    declaredFormat === 'ifc' ? ifcOutput(request, 'fixtures/ifc/ground-truth/demo-hotel-arh.json', 'fixtures/ids/expected/demo-hotel-arh.json') : pdfOutput(request, 'fixtures/pdf/ground-truth/memoriu-tehnic.json'),
  );
  await testWorker(api, runner, { ids: idsReference() }).drain();
}, 240_000);

afterAll(async () => {
  await api.stop();
});

test('F-INGEST-02 · R-158 · G13-4: two projects upload byte-identical files: every stored copy, extracted text and file place is keyed by project id, and neither project reads or reuses the other\'s', async () => {
  const [first, second] = projects;
  if (first === undefined || second === undefined) throw new Error('two TEST projects were not set up');
  const hashes = await Promise.all(
    projects.map(async (project) =>
      (await withRequest(api.database.app, { userId: project.ownerId, projectId: project.projectId }, (request) => readProjectDocuments(request))).documents.map(
        (document) => document.contentHash,
      ),
    ),
  );
  // The same bytes, so the same content hashes ...
  expect([...(hashes[0] ?? [])].sort()).toEqual([...(hashes[1] ?? [])].sort());
  const [modelHash, memoHash] = hashes[0] ?? [];
  if (modelHash === undefined || memoHash === undefined) throw new Error('the TEST uploads were not registered');

  // ... and a stored copy per project, under each project's own folder.
  for (const project of projects) {
    for (const hash of [modelHash, memoHash]) {
      expect(await api.files.exists(api.files.originalPath(project.projectId, hash))).toBe(true);
    }
  }
  expect(api.files.originalPath(first.projectId, modelHash)).not.toBe(api.files.originalPath(second.projectId, modelHash));
  // The extractor ran once per project, each job in a folder of its own project.
  expect(runner.jobs).toHaveLength(4);
  for (const project of projects) {
    expect(runner.jobs.filter((job) => job.outputDirectory.includes(`/${project.projectId}/`))).toHaveLength(2);
  }
  // The extracted text is stored once per project, keyed by project id and content hash.
  const perProject = await api.database.asAdministrator<{ project_id: string; parts: number }>(
    'SELECT project_id, count(*)::int AS parts FROM sovitech.document_texts WHERE content_hash = $1 GROUP BY project_id ORDER BY project_id',
    [memoHash],
  );
  expect(perProject.map((row) => row.project_id).sort()).toEqual([first.projectId, second.projectId].sort());
  // A derived file's place is keyed by project id too (converted viewing files come in phase 4).
  expect(api.files.derivedPath(first.projectId, modelHash, 'model.glb')).not.toBe(api.files.derivedPath(second.projectId, modelHash, 'model.glb'));

  // Neither project reads the other's list, document, file or text.
  expect((await api.app.inject({ method: 'GET', url: `/api/projects/${first.projectId}/documents`, headers: { ...second.auth } })).statusCode).toBe(404);
  expect((await api.app.inject({ method: 'GET', url: `/api/projects/${first.projectId}/documents/${first.memoId}/file`, headers: { ...second.auth } })).statusCode).toBe(404);
  expect((await api.app.inject({ method: 'GET', url: `/api/projects/${second.projectId}/documents/${first.memoId}/file`, headers: { ...second.auth } })).statusCode).toBe(404);
  const reused = await withRequest(api.database.app, { userId: second.ownerId, projectId: first.projectId }, (request) => readDocumentTexts(request, memoHash, ''));
  expect(reused).toEqual([]);
  expect((await documentList(api, second.auth, second.projectId)).map((row) => row['documentId']).sort()).toEqual([second.modelId, second.memoId].sort());

  // Erasing the first project's copies leaves the second project's copies, text and derived file as they were.
  const derived = api.files.derivedPath(second.projectId, modelHash, 'model.glb');
  await mkdir(dirname(derived), { recursive: true });
  await writeFile(derived, 'TEST derived file of project B');
  const textBefore = await withRequest(api.database.app, { userId: second.ownerId, projectId: second.projectId }, (request) => readDocumentTexts(request, memoHash, 'page:'));
  for (const documentId of [first.modelId, first.memoId]) {
    expect((await api.app.inject({ method: 'DELETE', url: `/api/projects/${first.projectId}/documents/${documentId}`, headers: { ...first.auth } })).statusCode).toBe(200);
  }
  expect(await api.files.hashesOf(first.projectId)).toEqual([]);
  expect(await api.files.exists(api.files.originalPath(second.projectId, modelHash))).toBe(true);
  expect(await api.files.exists(api.files.originalPath(second.projectId, memoHash))).toBe(true);
  expect(await api.files.exists(derived)).toBe(true);
  expect(await withRequest(api.database.app, { userId: second.ownerId, projectId: second.projectId }, (request) => readDocumentTexts(request, memoHash, 'page:'))).toEqual(textBefore);
});
