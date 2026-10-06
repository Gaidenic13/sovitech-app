/**
 * G7-20 (new in phase 5 part B, for the integrator to index; rule 7, "Analysis still running never blocks Generate:
 * 'Still reading 2 files. Your estimate will update when they finish.'"; PRD R-110, "the version stored when running
 * analysis finishes keeps the notice ... true"; US-PROPOSAL-11 AC6).
 * Situation: a document is uploaded after Generate while none of the snapshot's own documents is being read.
 * Expected: neither the latest nor an earlier version, nor their print views, says "Your estimate will update when
 * they finish": no update would come (a new version is generated only when the documents a stored proposal recorded
 * as still being read have finished). The line stays where its promise holds: on the latest version while one of its
 * own documents is still being read, and the update then comes.
 *
 * Through the API over a TEST database, with the production registry and catalogue: two versions generated with
 * nothing being read, then a generated synthetic fixture uploaded (its analysis queued); then a third version while it
 * is read, which carries step 8's line (the same value id and display: G2-7); the worker then reads the document and
 * the regeneration stores a fourth version, which carries no line. Every account is TEST data; the file is a fixture.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assertGatesStartupSafe } from '@sovitech/registry/gates';
import { GenerateResponseSchema, ProposalPrintResponseSchema, ProposalResponseSchema, ProposalVersionsResponseSchema, StepResponseSchema, type DisplayObject } from '@sovitech/view-model/browser';
import { AnalysisWorker } from '../../apps/api/src/jobs/worker';
import { regenerateAfterAnalysis } from '../../apps/api/src/proposal/service';
import { ScriptedRunner, fixtureBytes, signIn, startTestApi, upload, type Auth, type TestApi } from './_support/api';
import { pdfOutput } from './_support/outputs';
import { newOwnerProject } from './_support/workspace-store';

const PROMISE = /Your estimate will update when (it finishes|they finish)/u;

let api: TestApi;
let owner: Auth;

beforeAll(async () => {
  api = await startTestApi({ devLogin: true });
  const [ownerId] = api.devAccountIds;
  if (ownerId === undefined) throw new Error('no TEST development owner');
  owner = await signIn(api, ownerId);
}, 180_000);

afterAll(async () => {
  await api?.stop();
});

const get = (projectId: string, path: string) => api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/${path}`, headers: { ...owner } });

async function generate(projectId: string): Promise<string> {
  const response = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/proposals`, headers: { ...owner }, payload: {} });
  expect(response.statusCode, response.body).toBe(201);
  return GenerateResponseSchema.parse(response.json()).snapshotId;
}

/** What a version and its print view say at their head, and whether any of their displays makes rule 7's promise. */
async function head(projectId: string, snapshotId: string): Promise<{ readonly line: DisplayObject | null; readonly promised: boolean; readonly printLine: string | null; readonly printPromised: boolean }> {
  const proposal = ProposalResponseSchema.parse((await get(projectId, `proposals/${snapshotId}`)).json());
  const print = ProposalPrintResponseSchema.parse((await get(projectId, `proposals/${snapshotId}/print`)).json());
  const id = proposal.view.headline.stillReading;
  const printId = print.view.proposal.headline.stillReading;
  return {
    line: id === null ? null : (proposal.displayObjects.find((display) => display.valueId === id) ?? null),
    promised: proposal.displayObjects.some((display) => PROMISE.test(display.text)),
    printLine: printId === null ? null : (print.displayObjects.find((display) => display.valueId === printId)?.text ?? null),
    printPromised: print.displayObjects.some((display) => PROMISE.test(display.text)),
  };
}

describe('G7-20 · rule 7: the stored proposal promises an update only when one will come', { timeout: 180_000 }, () => {
  it('G7-20 · R-110 · US-PROPOSAL-11 AC6: a document uploaded after Generate puts the line on no version; a version generated while it is read carries it, and the update comes', async () => {
    const { projectId } = await newOwnerProject(api, owner, 'G7-20');
    const earlier = await generate(projectId);
    const latest = await generate(projectId);
    expect((await upload(api, owner, projectId, 'memoriu-tehnic.pdf', fixtureBytes('fixtures/pdf/memoriu-tehnic.pdf'))).status).toBe(201);

    // Neither version recorded the document: neither says an update will come, nor does its print view.
    for (const snapshotId of [latest, earlier]) {
      const read = await head(projectId, snapshotId);
      expect(read, snapshotId === latest ? 'the latest version' : 'an earlier version').toEqual({ line: null, promised: false, printLine: null, printPromised: false });
    }

    // A version generated while the document is read records it, and carries step 8's line (G2-7).
    const reading = await generate(projectId);
    const withLine = await head(projectId, reading);
    expect(withLine.line?.valueId).toBe(`project:${projectId}.documents.stillReading`);
    expect(withLine.line?.text).toBe('Still reading 1 file. Your estimate will update when it finishes.');
    expect(withLine.printLine).toBe('Still reading 1 file. Your estimate will update when it finishes.');
    const step8 = StepResponseSchema.parse((await get(projectId, 'steps/8')).json());
    expect(step8.displayObjects.find((display) => display.valueId === `project:${projectId}.documents.stillReading`)).toEqual(withLine.line);
    // The earlier versions still carry none.
    for (const snapshotId of [latest, earlier]) expect((await head(projectId, snapshotId)).promised).toBe(false);

    // The document is read; the update comes: a new version, which carries no line.
    const gates = assertGatesStartupSafe();
    const regenerated: (string | null)[] = [];
    const worker = new AnalysisWorker({ store: api.services.store, files: api.files, log: api.services.log }, new ScriptedRunner((_job, job) => pdfOutput(job, 'fixtures/pdf/ground-truth/memoriu-tehnic.json')), {
      workerId: 'test-worker-g7-20',
      serviceId: api.extractionAccountId,
      gates,
      maxAttempts: 1,
      retryAfterSeconds: 0,
      staleAfterSeconds: 600,
      afterJobEnded: async (job) => {
        regenerated.push(await regenerateAfterAnalysis(api.services, gates, { projectId: job.projectId, systemAccountId: api.extractionAccountId }));
      },
    });
    expect((await worker.drain()).map((step) => step.kind)).toEqual(['done']);
    expect(regenerated).toHaveLength(1);
    const [fourth] = regenerated;
    expect(fourth).not.toBeNull();
    const versions = ProposalVersionsResponseSchema.parse((await get(projectId, 'proposals')).json()).view.versions.map((version) => version.snapshotId);
    expect(versions).toEqual([fourth, reading, latest, earlier]);
    for (const snapshotId of versions) expect((await head(projectId, snapshotId ?? '')).promised, snapshotId ?? '').toBe(false);
  });
});
