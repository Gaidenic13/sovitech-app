/**
 * G4-47 (new in phase 5 part B, for the integrator to index; 2.4, "Recalculation": "When any input's active candidate
 * changes, the engine appends a new calculated candidate and supersedes the old one"; rule 4, "A new value is always
 * added, never swapped in"; docs/adr/0048 decision 1: Generate under the project's write lock).
 * Situation: the owner presses Generate twice at once on a project whose catalogue produces a figure.
 * Expected: each output field ends with exactly one active engine value, and each stored snapshot names candidates the
 * store holds.
 *
 * Through the API over a TEST database, with the engine's TEST catalogue and TEST datasets handed to it through its
 * engine seam (the test runner only: the production catalogue has no body, G1-16), as tests/api/proposal-test-catalogue
 * .test.ts does: the stage 1 mirror produces a figure, which the system's service account writes under the project's
 * write lock, superseding every earlier engine value of that field it finds there. Every account and value is TEST data.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { appendCandidateEvent, insertCandidate, newId, withRequest } from '@sovitech/db';
import { SYSTEMS, scopeFieldKey } from '@sovitech/registry';
import type { RegistryFieldDefinition } from '@sovitech/registry/validation';
import { GenerateResponseSchema, ProposalResponseSchema } from '@sovitech/view-model/browser';
import { testDatasetAccess } from '../../packages/engine/test-formulas/datasets';
import { testCatalogue } from '../../packages/engine/test-formulas/engine';
import { MIRRORED_OUTPUT_FIELDS } from '../../packages/engine/test-formulas/fields';
import { signIn, startTestApi, type Auth, type TestApi } from './_support/api';
import { newOwnerProject, testRegistry } from './_support/workspace-store';

/** The output field of the stage 1 mirror, the one TEST output this project's answers give a figure. */
const OUTPUT_FIELD = MIRRORED_OUTPUT_FIELDS['capex.indicativeRange'] as unknown as RegistryFieldDefinition;
const STAGE_1_FIELD = OUTPUT_FIELD.key;

let api: TestApi;
let owner: Auth;
let ownerId: string;

beforeAll(async () => {
  api = await startTestApi({
    devLogin: true,
    registry: testRegistry({ fields: [OUTPUT_FIELD] }),
    engine: { catalogue: testCatalogue({ mirrored: true }), datasets: testDatasetAccess() },
  });
  const [id] = api.devAccountIds;
  if (id === undefined) throw new Error('no TEST development owner');
  ownerId = id;
  owner = await signIn(api, ownerId);
}, 180_000);

afterAll(async () => {
  await api?.stop();
});

async function edit(projectId: string, subjectId: string, fieldKey: string, choice: string): Promise<void> {
  const response = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/fields/edit`, headers: { ...owner }, payload: { field: { subjectId, fieldKey }, value: { kind: 'choice', choice }, corrects: [] } });
  expect(response.statusCode, `${fieldKey}: ${response.body}`).toBe(200);
}

async function generate(projectId: string): Promise<string> {
  const response = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/proposals`, headers: { ...owner }, payload: {} });
  expect(response.statusCode, response.body).toBe(201);
  return GenerateResponseSchema.parse(response.json()).snapshotId;
}

/** The engine values of a field that no superseded, withdrawn or rejected event ended. */
function activeEngineValues(projectId: string, fieldKey: string): Promise<{ id: string }[]> {
  return api.database.asAdministrator<{ id: string }>(
    `SELECT c.id FROM sovitech.candidates AS c
     WHERE c.project_id = $1 AND c.field_key = $2 AND c.source IN ('calculated', 'estimated')
       AND NOT EXISTS (SELECT 1 FROM sovitech.candidate_events AS e WHERE e.candidate_id = c.id AND e.type IN ('superseded', 'withdrawn', 'rejected'))`,
    [projectId, fieldKey],
  );
}

describe('G4-47 · 2.4 · rule 4: two Generates at once', { timeout: 180_000 }, () => {
  it('G4-47 · 2.4 · rule 4 · ADR 0048 decision 1: each output field ends with exactly one active engine value, and each snapshot names candidates the store holds', async () => {
    const { projectId, buildingId } = await newOwnerProject(api, owner, 'G4-47');
    await edit(projectId, buildingId, 'building.type', 'hotel');
    for (const system of SYSTEMS) await edit(projectId, projectId, scopeFieldKey(system.id), system.id === 'hvac' || system.id === 'lighting' ? 'include' : 'exclude');
    // The TEST cost ranges name TEST countries only: the owner's own country answer, a TEST value, in their name.
    const country = newId();
    await withRequest(api.database.app, { userId: ownerId, projectId }, async (request) => {
      const written = await insertCandidate(request, { id: country, subjectId: projectId, fieldKey: 'project.country', text: 'TEST-XA', source: 'user', evidence: [], createdBy: ownerId }, { key: 'project.country', kind: 'text' });
      expect(written.outcome).toBe('stored');
      await appendCandidateEvent(request, { candidateId: country, type: 'user_confirmed', by: ownerId, role: 'owner' });
    });

    const snapshots: string[] = [];
    for (let round = 0; round < 4; round += 1) {
      const pair = await Promise.all([generate(projectId), generate(projectId)]);
      snapshots.push(...pair);
      expect(new Set(pair).size, `round ${String(round + 1)}`).toBe(2);
      expect((await activeEngineValues(projectId, STAGE_1_FIELD)).length, `round ${String(round + 1)}`).toBe(1);
    }
    // Every engine value written was the system's, and every one but the last is superseded by the system.
    const all = await api.database.asAdministrator<{ id: string; created_by: string; author_role: string }>('SELECT id, created_by, author_role FROM sovitech.candidates WHERE project_id = $1 AND field_key = $2', [projectId, STAGE_1_FIELD]);
    expect(all.length).toBe(snapshots.length);
    for (const value of all) expect(value).toMatchObject({ created_by: api.extractionAccountId, author_role: 'system' });

    // Each snapshot names candidates the store holds, its figure among them, and reads back.
    const held = new Set((await api.database.asAdministrator<{ id: string }>('SELECT id FROM sovitech.candidates WHERE project_id = $1', [projectId])).map((row) => row.id));
    for (const snapshotId of snapshots) {
      const named = await api.database.asAdministrator<{ candidate_id: string }>('SELECT candidate_id FROM sovitech.proposal_snapshot_candidates WHERE snapshot_id = $1', [snapshotId]);
      for (const row of named) expect(held.has(row.candidate_id), row.candidate_id).toBe(true);
      const [figure] = await api.database.asAdministrator<{ candidate_id: string | null }>("SELECT candidate_id FROM sovitech.proposal_snapshot_outputs WHERE snapshot_id = $1 AND output_key = 'capex.indicativeRange'", [snapshotId]);
      expect(figure?.candidate_id === null || figure?.candidate_id === undefined ? false : held.has(figure.candidate_id)).toBe(true);
      expect(named.map((row) => row.candidate_id)).toContain(figure?.candidate_id);
      const read = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/proposals/${snapshotId}`, headers: { ...owner } });
      expect(read.statusCode, read.body).toBe(200);
      ProposalResponseSchema.parse(read.json());
    }
  });
});
