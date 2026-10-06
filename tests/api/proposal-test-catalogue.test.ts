/**
 * Generate with a TEST catalogue that produces a figure (phase 5; docs/adr/0047 decision 8, 0048 decisions 1 and 6;
 * guardrails 2.1, `estimated`: "The calculation engine only"; rule 10, "Stage 3 is derived, not passed"; R-127), through
 * the API over a TEST database. The production catalogue has no body, so the live app never reaches this path; here the
 * engine's TEST catalogue (packages/engine/test-formulas/, test runner only: the engine refuses it elsewhere, G1-16) and
 * its TEST datasets are handed to the API through its engine seam, and the TEST output field through its registry seam:
 * - the stage 1 mirror (`TEST-capexIndicativeRange`, benchmarks only) produces a figure; the API writes it as the
 *   system's service account in its own request (never in the owner's name: G2-9), which the owner's request makes a
 *   member of the project first, and the snapshot names it with the formula that ran;
 * - the stored proposal shows the figure as a range with its badge Estimated, its method line, and the stage label read
 *   from stored records, "Indicative range"; no reserved pricing term appears (G10-1's API half) and no "Formal
 *   quotation" without a record;
 * - generating again supersedes the earlier engine value (2.4, "Recalculation") and the first version keeps its own.
 * Every account and value is TEST data; TEST values are visibly synthetic.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { insertCandidate, appendCandidateEvent, withRequest } from '@sovitech/db';
import { SYSTEMS, scopeFieldKey } from '@sovitech/registry';
import { findReservedTerms } from '@sovitech/registry/reserved-terms';
import type { RegistryFieldDefinition } from '@sovitech/registry/validation';
import { GenerateResponseSchema, ProposalResponseSchema, servedDisplayOf } from '@sovitech/view-model/browser';
import { testDatasetAccess } from '../../packages/engine/test-formulas/datasets';
import { testCatalogue } from '../../packages/engine/test-formulas/engine';
import { MIRRORED_OUTPUT_FIELDS } from '../../packages/engine/test-formulas/fields';
import { signIn, startTestApi, type Auth, type TestApi } from '../guardrails/_support/api';
import { newOwnerProject, testRegistry } from '../guardrails/_support/workspace-store';

const OUTPUT_FIELD = MIRRORED_OUTPUT_FIELDS['capex.indicativeRange'] as unknown as RegistryFieldDefinition;

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
  await api.stop();
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

describe('ADR 0047 decision 8 · ADR 0048: a TEST figure through Generate, the store and the stored proposal', { timeout: 120_000 }, () => {
  it('2.1 · G2-9 · R-127 · G10-1 (API half): the engine\'s figure is written by the system, named by the snapshot, shown as "Indicative range" from stored records, with no reserved pricing term', async () => {
    const { projectId, buildingId } = await newOwnerProject(api, owner, 'test catalogue');
    await edit(projectId, buildingId, 'building.type', 'hotel');
    for (const system of SYSTEMS) await edit(projectId, projectId, scopeFieldKey(system.id), system.id === 'hvac' || system.id === 'lighting' ? 'include' : 'exclude');
    // The TEST cost ranges name TEST countries only: the owner's own country answer, a TEST value, written in their name.
    await withRequest(api.database.app, { userId: ownerId, projectId }, async (request) => {
      const written = await insertCandidate(
        request,
        { id: '0192f0e4-7e57-7000-8000-0000000000c1', subjectId: projectId, fieldKey: 'project.country', text: 'TEST-XA', source: 'user', evidence: [], createdBy: ownerId },
        { key: 'project.country', kind: 'text' },
      );
      expect(written.outcome).toBe('stored');
      await appendCandidateEvent(request, { candidateId: '0192f0e4-7e57-7000-8000-0000000000c1', type: 'user_confirmed', by: ownerId, role: 'owner' });
    });

    const first = await generate(projectId);
    const engineValues = await api.database.asAdministrator<{ id: string; created_by: string; source: string; author_role: string }>(
      `SELECT id, created_by, source, author_role FROM sovitech.candidates WHERE project_id = $1 AND field_key = $2`,
      [projectId, OUTPUT_FIELD.key],
    );
    expect(engineValues).toHaveLength(1);
    expect(engineValues[0]).toMatchObject({ created_by: api.extractionAccountId, source: 'estimated', author_role: 'system' });
    const [row] = await api.database.asAdministrator<{ candidate_id: string; formula_id: string }>("SELECT candidate_id, formula_id FROM sovitech.proposal_snapshot_outputs WHERE snapshot_id = $1 AND output_key = 'capex.indicativeRange'", [first]);
    expect(row).toEqual({ candidate_id: engineValues[0]?.id, formula_id: 'TEST-capexIndicativeRange' });
    const formulas = await api.database.asAdministrator<{ formula_id: string }>('SELECT formula_id FROM sovitech.proposal_snapshot_formulas WHERE snapshot_id = $1', [first]);
    expect(formulas.map((formula) => formula.formula_id)).toContain('TEST-capexIndicativeRange');

    const proposal = ProposalResponseSchema.parse((await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/proposals/${first}`, headers: { ...owner } })).json());
    const stage1 = proposal.view.investment.outputs.find((output) => output.output === 'capex.indicativeRange');
    expect(stage1).toMatchObject({ availability: 'figure', outOfDate: false, price: { stageId: 'indicative_range', quotationRecordId: null, superseded: null } });
    const figure = proposal.displayObjects.find((display) => display.valueId === stage1?.display);
    expect(figure?.shape).toBe('range');
    expect(figure?.text).toMatch(/^about [\d,]+ EUR \([\d,]+ to [\d,]+ EUR\)$/u);
    expect(figure?.badge?.id).toBe('estimated');
    expect(figure?.sourceLine?.text).toBe('Method: TEST-capexIndicativeRange, version 1.0.0');
    expect(figure?.lines?.find((line) => line.kind === 'stage_label')?.text).toBe('Indicative range');
    expect(proposal.displayObjects.find((display) => display.valueId === stage1?.price?.stage)?.text).toBe('Indicative range');
    for (const display of proposal.displayObjects) {
      const served = servedDisplayOf(display);
      for (const text of [served.text, ...(served.lines ?? [])]) expect(findReservedTerms(text).map((match) => match.term), text).toEqual([]);
      expect(display.quotationRecordId).toBeUndefined();
    }

    // Generating again: the engine supersedes its earlier value (2.4), and the first version keeps its own figure.
    const second = await generate(projectId);
    const events = await api.database.asAdministrator<{ type: string; role: string }>('SELECT type, role FROM sovitech.candidate_events WHERE candidate_id = $1', [engineValues[0]?.id]);
    expect(events).toContainEqual({ type: 'superseded', role: 'system' });
    const older = ProposalResponseSchema.parse((await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/proposals/${first}`, headers: { ...owner } })).json());
    expect(older.displayObjects.find((display) => display.valueId === `proposal:${first}.outputs.capex.indicativeRange`)?.text).toBe(figure?.text);
    expect(second).not.toBe(first);
  });
});
