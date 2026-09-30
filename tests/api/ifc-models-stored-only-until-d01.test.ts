/**
 * Until the owner decides the parsing scope (PRD D-01), an uploaded IFC model is stored and not
 * read at all: PRD R-023 and R-024 "Until decided" read "Not built: no model is read", stricter
 * than prompt 3 5.2's parsing default, and prompt 3 section 4 says to follow the stricter line
 * (the phase 2 review's ruling; apps/api/src/documents/model-reading.ts). The IFC reader stays
 * built and proven with the tests-only switch (G12-5, G12-6, G13-4, G14-3,
 * tests/api/ifc-reader-gate-closed.test.ts, tests/proposed/).
 *
 * On a TEST database, in the live app's mode (no switch), the owner uploads the synthetic MEP
 * model: it reads "Not analysed: IFC model stored, not analysed", no reader job is queued, the
 * worker runs nothing for it, and a model's job that reaches the worker anyway ends by code with
 * nothing read: no finding, no engineer's record, no new analysis event.
 */
import { afterAll, beforeAll, expect, it } from 'vitest';
import { addProjectMember, enqueueAnalysis, readAnalysisJobs, readProjectDocuments, withRequest } from '@sovitech/db';
import { ScriptedRunner, documentList, fixtureBytes, ownerWithProject, signIn, startTestApi, testWorker, upload, type Auth, type TestApi } from '../guardrails/_support/api';
import { idsReference, ifcOutput } from '../guardrails/_support/outputs';

const G12_1_IFC = 'Not analysed: IFC model stored, not analysed';

let api: TestApi;
let ownerId: string;
let projectId: string;
let auth: Auth;
let modelId: string;

beforeAll(async () => {
  api = await startTestApi();
  ({ ownerId, projectId } = await ownerWithProject(api, 'stored only until D-01'));
  auth = await signIn(api, ownerId);
  const uploaded = await upload(api, auth, projectId, 'demo-hotel-mep-rev-a.ifc', fixtureBytes('fixtures/ifc/demo-hotel-mep-rev-a.ifc'));
  expect(uploaded.status).toBe(201);
  modelId = uploaded.body.documentId ?? '';
}, 240_000);

afterAll(async () => {
  await api.stop();
});

it('US-IFC-01 · US-IFC-03 · F-INGEST-03 · R-022 · R-023 · R-024 · G12-5: an uploaded model is stored "Not analysed: IFC model stored, not analysed", and no reader job is queued', async () => {
  expect(api.services.modelReading).toBeUndefined();
  const row = (await documentList(api, auth, projectId)).find((document) => document['documentId'] === modelId);
  expect(row).toMatchObject({ statusLine: { kind: 'status_line', statusLineId: 'not_analysed', text: G12_1_IFC, slots: { fileType: 'IFC model' } } });
  expect(await readAnalysisJobs(api.database.app.db, { projectId, documentId: modelId })).toEqual([]);
  // The worker has nothing to read, and the sandbox is never started.
  const runner = new ScriptedRunner((_job, job) => ifcOutput(job, 'fixtures/ifc/ground-truth/demo-hotel-mep-rev-a.json', 'fixtures/ids/expected/demo-hotel-mep-rev-a.json'));
  expect(await testWorker(api, runner, { ids: idsReference() }).drain()).toEqual([]);
  expect(runner.jobs).toEqual([]);
});

it('R-023 · R-024 · rule 14: a model\'s job that reaches the worker anyway ends by code, reading nothing: no finding, no engineer\'s record, the line unchanged', async () => {
  const contentHash = (await withRequest(api.database.app, { userId: ownerId, projectId }, (request) => readProjectDocuments(request))).documents.find((document) => document.id === modelId)?.contentHash ?? '';
  // A job queued by some other path (a database from before the ruling, say), with the extraction account a member, as an upload makes it.
  await withRequest(api.database.app, { userId: ownerId, projectId }, async (request) => {
    await addProjectMember(request, { projectId, userId: api.extractionAccountId });
    await enqueueAnalysis(request, { projectId, documentId: modelId, contentHash });
  });
  const runner = new ScriptedRunner((_job, job) => ifcOutput(job, 'fixtures/ifc/ground-truth/demo-hotel-mep-rev-a.json', 'fixtures/ids/expected/demo-hotel-mep-rev-a.json'));
  const steps = await testWorker(api, runner, { ids: idsReference() }).drain();
  expect(steps.map((step) => ('code' in step ? [step.kind, step.code] : [step.kind]))).toEqual([['failed', 'model_reading_not_decided']]);
  expect(runner.jobs).toEqual([]);
  const count = async (sql: string): Promise<number | undefined> => (await api.database.asAdministrator<{ n: number }>(sql, [projectId]))[0]?.n;
  expect(await count('SELECT count(*)::int AS n FROM sovitech.document_findings WHERE project_id = $1')).toBe(0);
  expect(await count('SELECT count(*)::int AS n FROM sovitech.document_model_records WHERE project_id = $1')).toBe(0);
  expect(await count("SELECT count(*)::int AS n FROM sovitech.guardrail_events WHERE project_id = $1 AND type = 'embedded_instruction'")).toBe(0);
  const analyses = await api.database.asAdministrator('SELECT status, coverage FROM sovitech.document_analysis_events WHERE document_id = $1 ORDER BY at', [modelId]);
  expect(analyses).toEqual([{ status: 'stored_only', coverage: 'stored: IFC model' }]);
  // The job's log line names the code, never the file.
  expect(api.log).toContainEqual(expect.objectContaining({ event: 'analysis_job_ended', code: 'model_reading_not_decided', documentId: modelId }));
});
