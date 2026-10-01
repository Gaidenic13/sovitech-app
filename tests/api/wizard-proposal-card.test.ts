/**
 * Step 8's Proposal card when the gross floor area is the only first-estimate input missing, through the wizard API
 * over a TEST database (phase 3, closing; guardrails rule 7, the `first_estimate` row: "If it is still missing, the
 * output falls back to a stage 1 Indicative range where the registry allows one, or else 'Not available yet' with the
 * missing item and an action to add it", and '"Not available yet" never appears alone. It names what is missing and
 * offers the action'; rule 10's stage 1, "when first-estimate data is missing"; PRD R-003, R-012; US-INTAKE-16 AC3,
 * US-INTAKE-17 AC2).
 *
 * The card shows the served line of the investment output that carries the served stage (G10-11; the web's
 * `proposalStageOf`). With the building type and the systems answered and the area skipped, that output is the
 * "Preliminary investment estimate", whose formula does not read the area; its line named only the two SOVITECH
 * datasets, so the card named neither the area nor its "Add gross floor area" (the action showed only on the outputs
 * that read the area). The view-model's `outputAvailability` now has the stage 2 output wait for the whole
 * first-estimate set, so the card's line names the area beside the datasets with the same Add action the outputs
 * carry, which serves the area's inline ask through `?add=` as G7-11 does, after Generate skipped it too.
 *
 * TEST accounts, projects and values only.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { productionRegistry } from '@sovitech/registry';
import { ProposalPreviewResponseSchema, StepResponseSchema, type DisplayObject, type StepResponse } from '@sovitech/view-model/browser';
import { signIn, startTestApi, type Auth, type TestApi } from '../guardrails/_support/api';

/** Each test reads and writes a TEST database; under a loaded full run a read can take seconds. */
const LONG = { timeout: 60_000 };
const DATASETS = 'SOVITECH point templates; SOVITECH cost ranges and benchmarks';

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

function post(projectId: string, path: string, payload: unknown) {
  return api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/${path}`, headers: { ...owner }, payload: payload as Record<string, unknown> });
}

async function step8(projectId: string, query = ''): Promise<StepResponse> {
  const response = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/steps/8${query}`, headers: { ...owner } });
  expect(response.statusCode, response.body).toBe(200);
  return StepResponseSchema.parse(response.json());
}

/** What the Proposal card shows while no figure can be produced: the served line of the output that carries the served stage. */
function cardLine(response: StepResponse): DisplayObject {
  const { view, displayObjects } = response;
  if (view.step !== 8) throw new Error('not step 8');
  const byId = (valueId: string | undefined): DisplayObject | undefined => displayObjects.find((display) => display.valueId === valueId);
  const stageOf = (valueId: string | undefined): string | undefined => byId(valueId)?.lines?.find((line) => line.kind === 'stage_label')?.id;
  expect(view.proposal.stage).toBeNull();
  const stage = stageOf(view.proposal.stageLabel);
  const output = view.proposal.outputs.find((entry) => entry.label !== undefined && stageOf(entry.label) === stage);
  expect(output?.availability).toBe('not_available_yet');
  const line = byId(output?.line);
  if (line === undefined) throw new Error(`no output carries the served stage ${String(stage)}`);
  return line;
}

function asks(response: StepResponse): string[] {
  if (response.view.step !== 8) throw new Error('not step 8');
  return response.view.proposal.inlineAsks.map((ask) => ask.questionId);
}

describe('R-003 · R-012 · rule 7: the Proposal card names every missing item, the owner\'s as well as the datasets', LONG, () => {
  it('R-003 · R-012 · US-INTAKE-16 AC3 · US-INTAKE-17 AC2 · G7-11 · rule 7: with the building type and the systems answered and the gross floor area skipped, the card\'s "Not available yet" line names the area beside the datasets and offers "Add gross floor area", the outputs\' own action, which serves the area\'s ask through ?add=; once the area is typed, the line names the datasets only', async () => {
    const created = await api.app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { ...owner },
      payload: { name: 'TEST proposal card project', projectType: 'new_construction', countryCode: 'RO', city: 'TEST city proposal card' },
    });
    expect(created.statusCode, created.body).toBe(201);
    const { projectId } = created.json() as { projectId: string };
    const [building] = await api.database.asAdministrator<{ id: string }>(`SELECT id FROM sovitech.subjects WHERE project_id = $1 AND kind = 'building'`, [projectId]);
    if (building === undefined) throw new Error('no building subject');
    const systems = productionRegistry.questions.find((entry) => entry.id === 'q.project.systemsInScope')?.fieldKeys ?? [];
    const continued = (n: number, body: Record<string, unknown>) => post(projectId, `steps/${String(n)}/continue`, { answers: [], multi: [], visibleSuggestions: [], ...body });
    const four = await continued(4, { multi: [{ questionId: 'q.project.systemsInScope', ticked: systems.slice(0, 1) }], shown: { questions: ['q.project.systemsInScope'], confirmations: [] } });
    expect(four.statusCode, four.body).toBe(200);
    const five = await continued(5, {
      answers: [{ field: { subjectId: building.id, fieldKey: 'building.type' }, value: { kind: 'choice', choice: 'hotel' }, corrects: [] }],
      shown: { questions: ['q.building.type'], confirmations: [] },
    });
    expect(five.statusCode, five.body).toBe(200);
    const addArea = { kind: 'add', field: { subjectId: building.id, fieldKey: 'building.grossFloorArea' }, label: 'Add gross floor area', step: 8 };

    // Step 8 asks for the area only; the card's line names it after the datasets, with its Add action.
    const first = await step8(projectId);
    expect(asks(first)).toEqual(['q.building.grossFloorArea']);
    const line = cardLine(first);
    expect(line).toMatchObject({ kind: 'line', missing: 'not_available_yet', text: `Not available yet: ${DATASETS}; gross floor area` });
    expect(line.actions).toEqual([addArea]);
    // The same action the outputs that read the area carry.
    if (first.view.step !== 8) throw new Error('not step 8');
    const indicative = first.view.proposal.outputs.find((entry) => entry.output === 'capex.indicativeRange');
    expect(first.displayObjects.find((display) => display.valueId === indicative?.line)?.actions).toEqual([addArea]);

    // "Generate without it": the ask is gone (asked once), and the card still names the area with its Add action.
    const generateWithout = await post(projectId, 'fields/skip', { questionId: 'q.building.grossFloorArea', step: 8 });
    expect(generateWithout.statusCode, generateWithout.body).toBe(200);
    const skipped = await step8(projectId);
    expect(asks(skipped)).toEqual([]);
    expect(cardLine(skipped)).toMatchObject({ text: `Not available yet: ${DATASETS}; gross floor area`, actions: [addArea] });
    // The proposal page's stage 2 output reads the same.
    const page = ProposalPreviewResponseSchema.parse((await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/proposal`, headers: { ...owner } })).json());
    const pageOutput = page.view.outputs.find((entry) => entry.output === 'capex.preliminaryEstimate');
    expect(page.displayObjects.find((display) => display.valueId === pageOutput?.line)).toMatchObject({ text: `Not available yet: ${DATASETS}; gross floor area`, actions: [addArea] });

    // The action leads to a built page: step 8 with `add=<its field>` serves the area's ask again (G7-11), and no defect is logged.
    const requested = await step8(projectId, `?add=${addArea.field.fieldKey}`);
    expect(asks(requested)).toEqual(['q.building.grossFloorArea']);
    expect(await api.database.asAdministrator(`SELECT id FROM sovitech.guardrail_events WHERE project_id = $1 AND type = 'question_for_known_field'`, [projectId])).toEqual([]);
    if (requested.view.step !== 8) throw new Error('not step 8');
    const [areaField] = requested.view.proposal.inlineAsks[0]?.fields ?? [];
    if (areaField === undefined) throw new Error('the ask names no field');
    const typed = await post(projectId, 'fields/edit', { field: areaField, value: { kind: 'quantity', raw: '2400', qualifier: 'gross_total' }, corrects: [] });
    expect(typed.statusCode, typed.body).toBe(200);

    // With the area typed, only the SOVITECH datasets are missing: the card names them, with no owner action.
    const complete = cardLine(await step8(projectId));
    expect(complete.text).toBe(`Not available yet: ${DATASETS}`);
    expect(complete.actions ?? []).toEqual([]);
  });
});
