/**
 * G4-45 (new in phase 5, for the integrator to index; 2.4, "A generated proposal keeps a snapshot of the candidate ids
 * and formula versions it used"; rule 4, "A new value is always added, never swapped in"; PRD R-110, US-PROPOSAL-03 AC3,
 * US-PROPOSAL-11 AC3).
 * Situation: the owner generates a proposal, changes an answer, and generates again.
 * Expected: the first stored proposal keeps its snapshot and is read as generated, with the old answer.
 *
 * Through the API over a TEST database: the owner answers the building type (hotel), generates, corrects it (office:
 * the shown value rejected, rule 4), generates again. The versions list both, newest first; the first reads the hotel
 * answer under its own value id with its badge, never the office one, and is not the latest; the second reads office;
 * the first's stored candidate ids and inputs hash are unchanged in the store. Every account and value is TEST data.
 *
 * Phase 5 part B adds (for the integrator to index under G4-45; R-110, "readable as generated"):
 * - an earlier version never carries rule 7's "Your estimate will update when they finish", nor does its print view:
 *   the update it promises comes as a new version, never to an earlier one (the latest carries it while one of its own
 *   documents is read: G7-20);
 * - an earlier version's headline output is read from its own rows, never from today's answers: answering the missing
 *   first-estimate input after generation does not change it (rule 7's `first_estimate` row read from the snapshot:
 *   apps/api/src/proposal/service.ts `firstEstimateFallbackOf`).
 */
import { afterAll, beforeAll, describe, expect, it, test } from 'vitest';
import { OUTPUT } from '@sovitech/registry';
import type { SnapshotOutputRow } from '@sovitech/engine';
import { GenerateResponseSchema, ProposalPrintResponseSchema, ProposalResponseSchema, ProposalVersionsResponseSchema } from '@sovitech/view-model/browser';
import { firstEstimateFallbackOf } from '../../apps/api/src/proposal/service';
import { PRODUCTION_API_REGISTRY } from '../../apps/api/src/wizard/registry';
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

async function generate(projectId: string): Promise<string> {
  const response = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/proposals`, headers: { ...owner }, payload: {} });
  expect(response.statusCode, response.body).toBe(201);
  return GenerateResponseSchema.parse(response.json()).snapshotId;
}

async function stored(snapshotId: string): Promise<{ readonly hash: string; readonly candidates: readonly string[] }> {
  const [snapshot] = await api.database.asAdministrator<{ inputs_hash: string }>('SELECT inputs_hash FROM sovitech.proposal_snapshots WHERE id = $1', [snapshotId]);
  const rows = await api.database.asAdministrator<{ candidate_id: string }>('SELECT candidate_id FROM sovitech.proposal_snapshot_candidates WHERE snapshot_id = $1 ORDER BY candidate_id', [snapshotId]);
  return { hash: snapshot?.inputs_hash ?? '', candidates: rows.map((row) => row.candidate_id) };
}

describe('G4-45 · 2.4 · rule 4: an earlier version keeps its snapshot', { timeout: 60_000 }, () => {
  it('G4-45 · US-PROPOSAL-03 AC3 · US-PROPOSAL-11 AC3 · R-110: generate, change an answer, generate again: the first reads as generated, with the old answer', async () => {
    const { projectId, buildingId } = await newOwnerProject(api, owner, 'G4-45');
    const answer = async (choice: string, corrects: readonly string[]) => {
      const response = await api.app.inject({
        method: 'POST',
        url: `/api/projects/${projectId}/fields/edit`,
        headers: { ...owner },
        payload: { field: { subjectId: buildingId, fieldKey: 'building.type' }, value: { kind: 'choice', choice }, corrects },
      });
      expect(response.statusCode, response.body).toBe(200);
    };
    await answer('hotel', []);
    const [hotel] = await api.database.asAdministrator<{ id: string }>("SELECT id FROM sovitech.candidates WHERE project_id = $1 AND field_key = 'building.type'", [projectId]);
    const first = await generate(projectId);
    const firstStored = await stored(first);
    expect(firstStored.candidates).toContain(hotel?.id);

    await answer('office', [hotel?.id ?? '']);
    const second = await generate(projectId);
    expect(second).not.toBe(first);

    const versions = ProposalVersionsResponseSchema.parse((await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/proposals`, headers: { ...owner } })).json());
    expect(versions.view.versions.map((version) => version.snapshotId)).toEqual([second, first]);
    const read = async (snapshotId: string) => ProposalResponseSchema.parse((await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/proposals/${snapshotId}`, headers: { ...owner } })).json());
    const older = await read(first);
    const newer = await read(second);
    const typeOf = (proposal: typeof older, snapshotId: string) => proposal.displayObjects.find((display) => display.valueId === `proposal:${snapshotId}.inputs.building.type`);
    expect(older.view.latest).toBe(false);
    expect(newer.view.latest).toBe(true);
    expect(typeOf(older, first)?.text).toBe('Hotel');
    expect(typeOf(older, first)?.badge?.id).toBe('provided_by_you');
    expect(typeOf(newer, second)?.text).toBe('Office');
    // Never mixed: the first version's response holds no display of the second's, and its store rows are unchanged.
    expect(older.displayObjects.some((display) => display.valueId.startsWith(`proposal:${second}.inputs.`))).toBe(false);
    expect(await stored(first)).toEqual(firstStored);
    expect((await stored(second)).hash).not.toBe(firstStored.hash);
  });
});

const PROMISE = /Your estimate will update when (it finishes|they finish)/u;

describe('G4-45 · R-110: an earlier version reads as generated, at its head too', { timeout: 120_000 }, () => {
  it('G4-45 · rule 7 · R-110 · US-PROPOSAL-11 AC6: an earlier version never says "Your estimate will update when they finish", nor does its print view; the latest says it while its own document is read', async () => {
    const { projectId } = await newOwnerProject(api, owner, 'G4-45 head');
    expect((await upload(api, owner, projectId, 'memoriu-tehnic.pdf', fixtureBytes('fixtures/pdf/memoriu-tehnic.pdf'))).status).toBe(201);
    const first = await generate(projectId);
    const second = await generate(projectId);
    const pendingOf = async (snapshotId: string) => (await api.database.asAdministrator<{ document_id: string }>('SELECT document_id FROM sovitech.proposal_snapshot_pending_documents WHERE snapshot_id = $1', [snapshotId])).length;
    expect([await pendingOf(first), await pendingOf(second)]).toEqual([1, 1]);
    const get = async (path: string) => (await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/${path}`, headers: { ...owner } })).json();
    const older = ProposalResponseSchema.parse(await get(`proposals/${first}`));
    const olderPrint = ProposalPrintResponseSchema.parse(await get(`proposals/${first}/print`));
    expect(older.view.latest).toBe(false);
    expect(older.view.headline.stillReading).toBeNull();
    expect(olderPrint.view.proposal.headline.stillReading).toBeNull();
    expect([...older.displayObjects, ...olderPrint.displayObjects].some((display) => PROMISE.test(display.text))).toBe(false);
    const newer = ProposalResponseSchema.parse(await get(`proposals/${second}`));
    expect(newer.displayObjects.find((display) => display.valueId === newer.view.headline.stillReading)?.text).toBe('Still reading 1 file. Your estimate will update when it finishes.');
  });

  it('G4-45 · rule 7 · R-110 · 2.4: answering the missing first-estimate input after generation does not change an earlier version\'s headline output', async () => {
    const { projectId, buildingId } = await newOwnerProject(api, owner, 'G4-45 headline');
    const first = await generate(projectId);
    const read = async (snapshotId: string) => ProposalResponseSchema.parse((await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/proposals/${snapshotId}`, headers: { ...owner } })).json());
    const before = (await read(first)).view.headline.investment.output;
    const answered = await api.app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/fields/edit`,
      headers: { ...owner },
      payload: { field: { subjectId: buildingId, fieldKey: 'building.type' }, value: { kind: 'choice', choice: 'hotel' }, corrects: [] },
    });
    expect(answered.statusCode, answered.body).toBe(200);
    await generate(projectId);
    expect((await read(first)).view.headline.investment.output).toBe(before);
  });

  test('G4-45 · rule 7 · R-110: the stage 1 fallback is read from the stored rows alone: stage 2 named a missing first-estimate input', () => {
    const row = (output: string, missing: readonly string[]): SnapshotOutputRow => ({ output, formula: 'TEST-f@1.0.0', candidateId: null, missing, incomplete: false });
    const building = '0192f0e4-7e57-7000-8000-0000000000b1';
    const stage1 = { output: OUTPUT.indicativeRange, formula: 'TEST-f@1.0.0', candidateId: 'test-figure', missing: [], incomplete: false } satisfies SnapshotOutputRow;
    expect(firstEstimateFallbackOf([stage1, row(OUTPUT.preliminaryEstimate, ['dataset:sovitech-point-templates', `input:${building}:building.type:unknown`])], PRODUCTION_API_REGISTRY)).toBe(true);
    expect(firstEstimateFallbackOf([stage1, row(OUTPUT.preliminaryEstimate, [`input:${building}:building.grossFloorArea:skipped`])], PRODUCTION_API_REGISTRY)).toBe(true);
    // A missing input that is not a first-estimate field (the floors: for a quotation), or a dataset alone: no fallback.
    expect(firstEstimateFallbackOf([stage1, row(OUTPUT.preliminaryEstimate, ['dataset:sovitech-cost-ranges', `input:${building}:building.floors:unknown`])], PRODUCTION_API_REGISTRY)).toBe(false);
    // Stage 1's own missing first-estimate input does not count, nor does a snapshot with no stage 2 row.
    expect(firstEstimateFallbackOf([row(OUTPUT.indicativeRange, [`input:${building}:building.type:unknown`]), row(OUTPUT.preliminaryEstimate, ['dataset:sovitech-cost-ranges'])], PRODUCTION_API_REGISTRY)).toBe(false);
    expect(firstEstimateFallbackOf([stage1], PRODUCTION_API_REGISTRY)).toBe(false);
  });
});
