/**
 * The gate-closed IFC behaviour end to end through the API, with the real IFC reader (web-ifc;
 * owner decision 2026-09-26; docs/adr/0031), not a scripted output: G12-5, G12-6, G14-3 and
 * G13-4 still hold now that the worker sends IFC jobs to the reader and PDF jobs to the
 * Python extractor (apps/api/src/jobs/sandbox.ts). The indexed cases (tests/guardrails/)
 * drive the worker with outputs scripted from the fixtures' ground truth; these run the
 * reader's own command line (packages/ifc-reader/src/cli.ts, the container's entry point) in
 * this process, on the files the worker would mount, with the arguments it would pass. Not
 * case files: blocking API tests over a TEST database.
 *
 * With `ifc-values` closed (production gate source, assertGatesStartupSafe):
 * - G12-5: a model reads "Not analysed: IFC model stored, not analysed", and no "not found"
 *   statement counts it as analysed;
 * - G12-6: no IDS result arises live (the IDS model check waits, D-36), and a model creates no
 *   candidate, candidate event, field event or question;
 * - G14-3: an instruction in an element's Description is one embedded_instruction finding and
 *   changes no state; its words are stored and logged nowhere;
 * - G13-4: two projects that upload the same model each get their own copy, job folder, record
 *   and findings, keyed by their project id.
 * The PDF companion is scripted from its ground truth (its reader is the Python extractor).
 *
 * Ids: G12-5, G12-6, G14-3, G13-4 (end to end, real reader); F-INGEST-03, F-INGEST-04,
 * F-IFC-01, F-IFC-02, R-022, R-023, R-024, R-158.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { withRequest } from '@sovitech/db';
import { createTestAccount } from '@sovitech/db/testing';
import { main as readIfc } from '@sovitech/ifc-reader';
import { readAiSearches, readCoverage, searchedCoverage } from '../../apps/api/src/documents/coverage';
import { projectDocuments } from '../../apps/api/src/documents/service';
import type { ExtractorRunner, SandboxJob, SandboxOutcome } from '../../apps/api/src/jobs/sandbox';
import { ScriptedRunner, documentList, fixtureBytes, ownerWithProject, signIn, startTestApi, testWorker, upload, type Auth, type TestApi } from '../guardrails/_support/api';
import { idsReference, pdfOutput } from '../guardrails/_support/outputs';

/** The Generic Model 1 proxy of rev A, whose Description holds the instruction (ground truth). */
const PROXY = { globalId: '3TC75U8dfQLuyIEab9CcFg', stepId: 100891 };
/** CH-03 of rev A, on a switched-off layer (ground truth). */
const HIDDEN = { globalId: '2JUq1mvMvTww31GCHjDTEa', stepIds: [100263, 100931] };

/**
 * The worker's sandbox, with the IFC reader's command line run in this process for an IFC job,
 * and the PDF companion's output scripted from its ground truth for the other jobs. The job's
 * paths are what the container would mount.
 */
class ReaderRunner implements ExtractorRunner {
  readonly jobs: SandboxJob[] = [];
  readonly logLines: string[] = [];
  private readonly pdf = new ScriptedRunner((_job, request) => pdfOutput(request, 'fixtures/pdf/ground-truth/memoriu-tehnic.json'));

  async run(job: SandboxJob): Promise<SandboxOutcome> {
    this.jobs.push(job);
    if (job.reader !== 'ifc-reader') return this.pdf.run(job);
    const status = await readIfc(
      ['--request', job.requestPath, '--document', job.inputPath, '--out', job.outputDirectory, ...(job.idsPath === undefined ? [] : ['--ids', job.idsPath])],
      (line) => this.logLines.push(line),
    );
    if (status === 0) return { outcome: 'finished' };
    return { outcome: 'failed', code: status === 2 ? 'extractor_refused_request' : status === 3 ? 'extractor_refused_job' : 'extractor_failed' };
  }
}

const G12_1_IFC = 'Not analysed: IFC model stored, not analysed';

let api: TestApi;
let runner: ReaderRunner;
let engineerAuth: Auth;
const projects: { ownerId: string; projectId: string; auth: Auth; modelId: string; memoId?: string }[] = [];

beforeAll(async () => {
  // The reader's path, with the tests-only switch: the live app reads no model until D-01 (apps/api/src/documents/model-reading.ts).
  api = await startTestApi({ readModels: true });
  engineerAuth = await signIn(api, await createTestAccount(api.database, { label: 'reader engineer', kind: 'person', roles: ['sovitech_engineer'] }));
  // Project A: the MEP model (rev A) and the memoriu PDF. Project B: the same model's bytes.
  for (const label of ['reader A', 'reader B']) {
    const { ownerId, projectId } = await ownerWithProject(api, label);
    const auth = await signIn(api, ownerId);
    const modelId = (await upload(api, auth, projectId, 'demo-hotel-mep-rev-a.ifc', fixtureBytes('fixtures/ifc/demo-hotel-mep-rev-a.ifc'))).body.documentId ?? '';
    const memoId = label === 'reader A' ? (await upload(api, auth, projectId, 'memoriu-tehnic.pdf', fixtureBytes('fixtures/pdf/memoriu-tehnic.pdf'))).body.documentId : undefined;
    projects.push({ ownerId, projectId, auth, modelId, ...(memoId === undefined ? {} : { memoId }) });
  }
}, 240_000);

afterAll(async () => {
  await api.stop();
});

/** A project's state: every value, verification, field and document event, guardrail event and analysis line. */
async function state(projectId: string): Promise<Record<string, unknown>> {
  const count = async (sql: string) => (await api.database.asAdministrator<{ n: number }>(sql, [projectId]))[0]?.n;
  return {
    candidates: await count('SELECT count(*)::int AS n FROM sovitech.candidates WHERE project_id = $1'),
    candidateEvents: await count('SELECT count(*)::int AS n FROM sovitech.candidate_events WHERE project_id = $1'),
    fieldEvents: await count('SELECT count(*)::int AS n FROM sovitech.field_events WHERE project_id = $1'),
    documentEvents: await count('SELECT count(*)::int AS n FROM sovitech.document_events WHERE project_id = $1'),
    questions: await count(`SELECT count(*)::int AS n FROM sovitech.guardrail_events WHERE project_id = $1 AND type = 'question_for_known_field'`),
  };
}

describe('the gate-closed IFC behaviour end to end, with the real IFC reader (web-ifc)', { timeout: 240_000 }, () => {
  let before: Record<string, unknown>[];

  beforeAll(async () => {
    const [first, second] = projects;
    if (first === undefined || second === undefined) throw new Error('two TEST projects were not set up');
    expect(await documentList(api, first.auth, first.projectId)).toContainEqual(expect.objectContaining({ documentId: first.modelId, statusLine: expect.objectContaining({ text: G12_1_IFC }) }));
    before = [await state(first.projectId), await state(second.projectId)];
    runner = new ReaderRunner();
    const steps = await testWorker(api, runner, { ids: idsReference() }).drain();
    expect(steps.map((step) => step.kind)).toEqual(['done', 'done', 'done']);
  }, 240_000);

  it('F-INGEST-04: the worker sends each model to the IFC reader and the PDF to the Python extractor', () => {
    const readers = runner.jobs.map((job) => job.reader);
    expect(readers.filter((reader) => reader === 'ifc-reader')).toHaveLength(2);
    expect(readers.filter((reader) => reader !== 'ifc-reader')).toEqual(['extractor']);
  });

  it('G12-5 · R-022: the model reads "Not analysed: IFC model stored, not analysed", and no "not found" statement counts it', async () => {
    const [first] = projects;
    if (first === undefined) throw new Error('no TEST project');
    const row = (await documentList(api, first.auth, first.projectId)).find((item) => item['documentId'] === first.modelId);
    expect(row).toMatchObject({ statusLine: { statusLineId: 'not_analysed', text: G12_1_IFC, slots: { fileType: 'IFC model' } } });
    const analyses = await api.database.asAdministrator('SELECT status, coverage FROM sovitech.document_analysis_events WHERE document_id = $1 ORDER BY at', [first.modelId]);
    expect(analyses).toEqual([{ status: 'stored_only', coverage: 'stored: IFC model' }]);
    const { searched, searchedForField } = await withRequest(api.database.app, { userId: first.ownerId, projectId: first.projectId }, async (request) => {
      const { documents, statuses } = await projectDocuments(request);
      const search = await readAiSearches(request, documents);
      return {
        searched: readCoverage(documents, statuses.status),
        searchedForField: searchedCoverage(documents, statuses.status, { fieldKey: 'building.grossFloorArea', ...search }),
      };
    });
    expect(searched.map((entry) => entry.documentId)).toEqual([first.memoId]);
    expect(searchedForField).toEqual([]);
  });

  it("G12-6 · R-023: the engineer's record holds what the reader read and no IDS result, and nothing else changed", async () => {
    const [first, second] = projects;
    if (first === undefined || second === undefined) throw new Error('no TEST project');
    const record = await api.app.inject({ method: 'GET', url: `/api/projects/${first.projectId}/documents/${first.modelId}/engineer-record`, headers: { ...engineerAuth } });
    expect(record.statusCode).toBe(200);
    const body = record.json() as { modelRecord: Record<string, unknown> };
    expect(body.modelRecord).toMatchObject({ ifcSchema: 'IFC4', ifcProjectGlobalId: '1s0hXgNKXIJvDFWAxN9ggG', processing: 'partial' });
    expect(body.modelRecord['idsResults'] ?? null).toBeNull();
    expect(JSON.stringify(body.modelRecord)).toMatch(/sovitech-step-exchange-check/u);
    // The IDS was mounted as the worker mounts it, and no check ran on it.
    expect(runner.jobs.filter((job) => job.reader === 'ifc-reader').every((job) => job.idsPath !== undefined)).toBe(true);
    expect([await state(first.projectId), await state(second.projectId)]).toEqual(before);
  });

  it('G14-3 · R-024: the Description\'s instruction is one embedded_instruction finding and one guardrail event, with no state change', async () => {
    const [first] = projects;
    if (first === undefined) throw new Error('no TEST project');
    const findings = await api.database.asAdministrator<{ kind: string; code: string; locator: Record<string, unknown> }>(
      'SELECT kind, code, locator FROM sovitech.document_findings WHERE project_id = $1 ORDER BY kind',
      [first.projectId],
    );
    expect(findings).toEqual([
      { kind: 'embedded_instruction', code: 'embedded_instruction.override', locator: { kind: 'ifc', globalId: PROXY.globalId, stepIds: [PROXY.stepId], ifcClass: 'IfcBuildingElementProxy' } },
      { kind: 'hidden_content', code: 'hidden_content.layer_off', locator: { kind: 'ifc', globalId: HIDDEN.globalId, stepIds: HIDDEN.stepIds, ifcClass: 'IfcBuildingElementProxy' } },
    ]);
    const events = await api.database.asAdministrator<{ type: string; subject_id: string; reason: string }>('SELECT type, subject_id, reason FROM sovitech.guardrail_events WHERE project_id = $1', [first.projectId]);
    expect(events).toEqual([{ type: 'embedded_instruction', subject_id: first.modelId, reason: 'embedded_instruction.override' }]);
    const stored = await api.database.asAdministrator<{ text: string }>(
      `SELECT text FROM sovitech.document_texts WHERE project_id = $1
       UNION ALL SELECT locator::text FROM sovitech.document_findings WHERE project_id = $1
       UNION ALL SELECT coalesce(reason, '') FROM sovitech.guardrail_events WHERE project_id = $1`,
      [first.projectId],
    );
    expect(stored.map((row) => row.text).join('\n')).not.toMatch(/ignore previous instructions|mark all values/iu);
    expect(JSON.stringify(api.log) + runner.logLines.join('')).not.toMatch(/ignore previous instructions|mark all values|Generic Model/iu);
  });

  it('G13-4 · R-158: two projects with the same model each get their own copy, job, record and findings, keyed by project id', async () => {
    const [first, second] = projects;
    if (first === undefined || second === undefined) throw new Error('no TEST project');
    const modelJobs = runner.jobs.filter((job) => job.reader === 'ifc-reader');
    expect(modelJobs.map((job) => job.inputPath.includes(first.projectId) || job.inputPath.includes(second.projectId))).toEqual([true, true]);
    expect(new Set(modelJobs.map((job) => job.inputPath)).size).toBe(2);
    expect(new Set(modelJobs.map((job) => job.outputDirectory)).size).toBe(2);
    for (const project of [first, second]) {
      const findings = await api.database.asAdministrator<{ document_id: string }>('SELECT document_id FROM sovitech.document_findings WHERE project_id = $1', [project.projectId]);
      expect(findings.map((row) => row.document_id)).toEqual([project.modelId, project.modelId]);
      const record = await api.app.inject({ method: 'GET', url: `/api/projects/${project.projectId}/documents/${project.modelId}/engineer-record`, headers: { ...engineerAuth } });
      expect(record.statusCode).toBe(200);
    }
    // Neither owner reads the other's model.
    const crossed = await api.app.inject({ method: 'GET', url: `/api/projects/${second.projectId}/documents`, headers: { ...first.auth } });
    expect(crossed.statusCode).toBe(404);
  });
});
