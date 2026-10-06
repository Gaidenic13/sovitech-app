/**
 * G7-18 (new in phase 5, for the integrator to index; rule 7, "Analysis still running never blocks Generate: 'Still
 * reading 2 files. Your estimate will update when they finish.'"; "Late findings never interrupt"; PRD R-109, R-110).
 * Situation: Generate is pressed while two documents are still being read.
 * Expected: a proposal is stored at once, with no dialog, showing "Still reading 2 files. Your estimate will update
 * when they finish."
 *
 * Through the API over a TEST database: two generated synthetic fixtures uploaded (their analysis queued; no worker
 * runs), then Generate: it answers 201 with the new version at once (nothing waits for the analysis), the stored
 * snapshot records both documents as still being read, and the stored proposal's head shows rule 7's line with its count
 * bound to its value id, the same display as step 8 shows (G2-7). Every account is TEST data; the files are fixtures.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GenerateResponseSchema, ProposalResponseSchema, StepResponseSchema } from '@sovitech/view-model/browser';
import { fixtureBytes, signIn, startTestApi, upload, type Auth, type TestApi } from './_support/api';
import { newOwnerProject } from './_support/workspace-store';

let api: TestApi;
let owner: Auth;

beforeAll(async () => {
  api = await startTestApi({ devLogin: true });
  const [ownerId] = api.devAccountIds;
  if (ownerId === undefined) throw new Error('no TEST development owner');
  owner = await signIn(api, ownerId);
}, 180_000);

afterAll(async () => {
  await api.stop();
});

describe('G7-18 · rule 7: Generate while two documents are still being read', { timeout: 60_000 }, () => {
  it('G7-18 · US-PROPOSAL-01 · R-109 · R-110: a version is stored at once, recording both as pending, and its head reads "Still reading 2 files. Your estimate will update when they finish."', async () => {
    const { projectId } = await newOwnerProject(api, owner, 'G7-18');
    for (const [path, name] of [
      ['fixtures/pdf/memoriu-tehnic.pdf', 'memoriu-tehnic.pdf'],
      ['fixtures/pdf/tabel-suprafete.pdf', 'tabel-suprafete.pdf'],
    ] as const) {
      expect((await upload(api, owner, projectId, name, fixtureBytes(path))).status).toBe(201);
    }
    const generated = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/proposals`, headers: { ...owner }, payload: {} });
    expect(generated.statusCode, generated.body).toBe(201);
    const { snapshotId } = GenerateResponseSchema.parse(generated.json());
    const pending = await api.database.asAdministrator<{ document_id: string }>('SELECT document_id FROM sovitech.proposal_snapshot_pending_documents WHERE snapshot_id = $1', [snapshotId]);
    expect(pending).toHaveLength(2);

    const proposal = ProposalResponseSchema.parse((await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/proposals/${snapshotId}`, headers: { ...owner } })).json());
    const line = proposal.displayObjects.find((display) => display.valueId === proposal.view.headline.stillReading);
    expect(proposal.view.headline.stillReading).toBe(`project:${projectId}.documents.stillReading`);
    expect(line?.text).toBe('Still reading 2 files. Your estimate will update when they finish.');
    expect(line?.parts).toEqual(['2']);
    const step8 = StepResponseSchema.parse((await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/steps/8`, headers: { ...owner } })).json());
    expect(step8.displayObjects.find((display) => display.valueId === `project:${projectId}.documents.stillReading`)).toEqual(line);
  });
});
