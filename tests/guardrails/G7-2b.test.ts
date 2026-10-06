/**
 * G7-2b (rule 7, the `first_estimate` row: "... or else 'Not available yet' with the missing item and an action to add
 * it"; "'Not available yet' never appears alone"; rule 10): "The same [the area skipped, the owner reaches step 8 and
 * skips it again], but the registry does not allow an Indicative range" → "Asked inline once, then 'Not available yet'
 * with an Add action".
 *
 * Through the API over a TEST database with the production registry and catalogue (no Indicative range is allowed while
 * `dataset-cost-ranges` is closed): a new project with no area, step 8 asking for it inline once, "Generate without it" (step 8's skip), then Generate: step 8 no longer asks for it, and the stored proposal's
 * headline is stage 2's "Not available yet" line, naming the SOVITECH datasets and the gross floor area, with the "Add
 * gross floor area" action that opens step 8's inline ask; no stage is named (G10-11).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GenerateResponseSchema, ProposalResponseSchema, StepResponseSchema, type StepResponse } from '@sovitech/view-model/browser';
import { signIn, startTestApi, type Auth, type TestApi } from './_support/api';

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

async function step(projectId: string, n: number): Promise<StepResponse> {
  const response = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/steps/${String(n)}`, headers: { ...owner } });
  expect(response.statusCode, response.body).toBe(200);
  return StepResponseSchema.parse(response.json());
}

function asksOf(response: StepResponse): readonly string[] {
  if (response.view.step !== 8) throw new Error('not step 8');
  return response.view.proposal.inlineAsks.map((ask) => ask.questionId);
}

describe('G7-2b · rule 7: the area skipped twice, no Indicative range allowed', { timeout: 60_000 }, () => {
  it('G7-2b · US-INTAKE-17 · R-109 · R-112 · G10-11: asked inline once, then the stored proposal reads "Not available yet", naming the area, with its Add action and no stage', async () => {
    const created = await api.app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { ...owner },
      payload: { name: 'TEST G7-2b project', projectType: 'new_construction', countryCode: 'RO', city: 'TEST city G7-2b' },
    });
    expect(created.statusCode, created.body).toBe(201);
    const { projectId } = created.json() as { projectId: string };
    expect(asksOf(await step(projectId, 8))).toContain('q.building.grossFloorArea');
    const skipped = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/fields/skip`, headers: { ...owner }, payload: { questionId: 'q.building.grossFloorArea', step: 8 } });
    expect(skipped.statusCode, skipped.body).toBe(200);
    expect(asksOf(await step(projectId, 8))).not.toContain('q.building.grossFloorArea');

    const generated = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/proposals`, headers: { ...owner }, payload: {} });
    expect(generated.statusCode, generated.body).toBe(201);
    const { snapshotId } = GenerateResponseSchema.parse(generated.json());
    const read = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/proposals/${snapshotId}`, headers: { ...owner } });
    expect(read.statusCode, read.body).toBe(200);
    const proposal = ProposalResponseSchema.parse(read.json());
    const headline = proposal.view.headline.investment;
    expect(headline.output).toBe('capex.preliminaryEstimate');
    expect(headline.price).toMatchObject({ stage: null, stageId: null, quotationRecordId: null, superseded: null });
    const line = proposal.displayObjects.find((display) => display.valueId === headline.price.figure);
    expect(line?.missing).toBe('not_available_yet');
    expect(line?.text.startsWith('Not available yet: SOVITECH point templates; SOVITECH cost ranges and benchmarks;')).toBe(true);
    expect(line?.text).toContain('gross floor area');
    const add = line?.actions?.find((action) => action.kind === 'add' && action.field.fieldKey === 'building.grossFloorArea');
    expect(add).toMatchObject({ kind: 'add', label: 'Add gross floor area', step: 8 });
    // The action opens step 8's inline ask for the area again, on the owner's own request (R-012; G7-11).
    const requested = await step(projectId, 8);
    expect(asksOf(requested)).not.toContain('q.building.grossFloorArea');
    const opened = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/steps/8?add=building.grossFloorArea`, headers: { ...owner } });
    expect(asksOf(StepResponseSchema.parse(opened.json()))).toContain('q.building.grossFloorArea');
    // No stage is stated while no figure can be produced (G10-11): the figure carries none, and the only stage labels
    // served name the investment outputs beside their "Not available yet" lines (`label`).
    expect(line?.lines?.some((entry) => entry.kind === 'stage_label') ?? false).toBe(false);
    const labelIds = new Set(proposal.view.investment.outputs.flatMap((output) => (output.label === undefined ? [] : [output.label])));
    expect(labelIds.size).toBe(2);
    expect(proposal.displayObjects.filter((display) => display.lines?.some((entry) => entry.kind === 'stage_label')).every((display) => labelIds.has(display.valueId))).toBe(true);
  });
});
