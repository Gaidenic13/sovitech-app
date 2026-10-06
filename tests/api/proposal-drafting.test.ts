/**
 * AI-drafted proposal text (PRD R-115, US-PROPOSAL-12; guardrails rule 2, "Numbers in prose are references, not text";
 * rule 9, "Arithmetic lives in code"; rule 13, "Processing"; docs/adr/0048 decision 10), through the API over a TEST
 * database, with the boundary's production pieces (`@sovitech/ai`: the drafting context of one project, the
 * `ai-processor-route` guard, the response reading and the output validator): no key is set, so the transport is a
 * TEST stand-in handed in as a dependency (as the boundary's own tests hand one in), answering with deterministic TEST
 * drafts that name a TEST model id, never a real one, read with that TEST id. No recording is made and none is read;
 * nothing is sent anywhere.
 * - On the demo project (the only project whose values the guard lets through while the gate is closed), Generate asks
 *   for one paragraph naming value tokens only; a draft the validator accepts is stored with the snapshot and its model
 *   id, and the stored proposal renders it as prose and value segments, each token as its value's own display.
 * - A draft that types a figure as text is refused by the validator: nothing is stored, and Generate still stores its
 *   version (rule 7).
 * - On a project not flagged demo, the guard refuses before the call: the transport is never called, no paragraph.
 * Every account and value is TEST data.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  buildDraftingContext,
  checkProcessorRoute,
  loadFixtureManifest,
  loadSystemPrompt,
  readDraftingResponse,
  type DraftingInput,
  type DraftingRun,
  type ModelRequest,
  type ModelResponse,
} from '@sovitech/ai';
import { createTestAccount, createTestProject } from '@sovitech/db/testing';
import { REPO_ROOT, productionGateSource } from '@sovitech/registry/gates';
import { GenerateResponseSchema, ProposalResponseSchema } from '@sovitech/view-model/browser';
import { signIn, startTestApi, type Auth, type TestApi } from '../guardrails/_support/api';
import { newOwnerProject } from '../guardrails/_support/workspace-store';

const TEST_MODEL = 'test-model-not-a-real-id';

/** What the TEST transport answers next, and every request it was handed. */
const drafts: { next: string; readonly requests: ModelRequest[] } = { next: '', requests: [] };

async function testTransport(request: ModelRequest): Promise<ModelResponse> {
  drafts.requests.push(request);
  return { model: TEST_MODEL, receivedAt: '2026-10-05T09:00:00.000Z', stopReason: 'end_turn', output: { paragraphs: [{ slot: 'summary', text: drafts.next }], notes: [] } };
}

let api: TestApi;
let owner: Auth;

/**
 * One drafting run, as the boundary's run makes it (packages/ai boundary.ts `runDraftingWith`, one attempt), from the
 * package's exported production pieces: the context of one project, the `ai-processor-route` guard before any call,
 * the TEST transport, and the reading of its response (the model id checked against the TEST id, then the output
 * validator). The package exports no run with another expected model id, and a TEST response never names a real one.
 */
async function testDrafting(input: DraftingInput): Promise<DraftingRun> {
  const gates = productionGateSource();
  const context = buildDraftingContext(input);
  const route = checkProcessorRoute(context.routeItems, { gates, manifest: loadFixtureManifest(REPO_ROOT), project: input.project, root: REPO_ROOT });
  if (!route.allowed) return { outcome: 'refused', refusals: route.refusals };
  const response = await testTransport({ system: loadSystemPrompt(REPO_ROOT).text, content: context.content, output: 'drafting' });
  const reading = readDraftingResponse(response, { projectId: context.projectId, slots: context.slots, tokens: context.tokens, names: context.names }, TEST_MODEL);
  if (!reading.usable) return { outcome: 'failed', problem: reading.problem, attempts: [{ attempt: 1, modelId: reading.modelId, problem: reading.problem }], guardrailEvents: [] };
  return {
    outcome: 'completed',
    modelId: reading.modelId,
    draftedAt: reading.receivedAt,
    paragraphs: reading.validation.accepted.paragraphs,
    notes: reading.validation.accepted.notes,
    rejections: reading.validation.rejections,
    guardrailEvents: reading.validation.guardrailEvents,
    attempts: [{ attempt: 1, modelId: reading.modelId, receivedAt: reading.receivedAt }],
    validation: reading.validation,
  };
}

beforeAll(async () => {
  api = await startTestApi({ devLogin: true, drafting: { draft: testDrafting } });
  const [ownerId] = api.devAccountIds;
  if (ownerId === undefined) throw new Error('no TEST development owner');
  owner = await signIn(api, ownerId);
}, 180_000);

afterAll(async () => {
  await api.stop();
});

async function generate(projectId: string, auth: Auth): Promise<string> {
  const response = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/proposals`, headers: { ...auth }, payload: {} });
  expect(response.statusCode, response.body).toBe(201);
  return GenerateResponseSchema.parse(response.json()).snapshotId;
}

describe('R-115 · US-PROPOSAL-12: AI-drafted proposal text through value tokens only', { timeout: 90_000 }, () => {
  it('R-115 · rule 2 · rule 13 · G2-3: on the demo, an accepted draft is stored with its model id and rendered by code; a figure typed as text is refused; another project is never sent', async () => {
    const seedId = await createTestAccount(api.database, { label: 'drafting demo seed', kind: 'seed', roles: ['owner'] });
    const demoId = await createTestProject(api.database, { ownerId: seedId, isDemo: true });
    const seed = await signIn(api, seedId);
    const answered = await api.app.inject({
      method: 'POST',
      url: `/api/projects/${demoId}/fields/edit`,
      headers: { ...seed },
      payload: { field: { subjectId: demoId, fieldKey: 'project.type' }, value: { kind: 'choice', choice: 'new_construction' }, corrects: [] },
    });
    expect(answered.statusCode, answered.body).toBe(200);

    drafts.next = 'This TEST preliminary proposal names the project type, {{value:project.type}}, and what it still needs.';
    const sent = drafts.requests.length;
    const snapshotId = await generate(demoId, seed);
    expect(drafts.requests.length).toBe(sent + 1);
    const request = drafts.requests.at(-1);
    expect(request?.output).toBe('drafting');
    // Tokens only: an input with a value, by its token; no output token while no figure exists (none is produced live).
    expect(request?.content.join('\n')).toContain('{{value:project.type}}');
    expect(request?.content.join('\n')).not.toContain('{{calc:');
    const stored = await api.database.asAdministrator<{ slot: string; text: string; model_id: string }>('SELECT slot, text, model_id FROM sovitech.proposal_snapshot_paragraphs WHERE snapshot_id = $1', [snapshotId]);
    expect(stored).toEqual([{ slot: 'summary', text: drafts.next, model_id: TEST_MODEL }]);
    const proposal = ProposalResponseSchema.parse((await api.app.inject({ method: 'GET', url: `/api/projects/${demoId}/proposals/${snapshotId}`, headers: { ...seed } })).json());
    expect(proposal.view.drafted).toEqual([
      {
        slot: 'summary',
        segments: [
          { kind: 'prose', text: 'This TEST preliminary proposal names the project type, ' },
          { kind: 'value', valueId: `proposal:${snapshotId}.inputs.project.type` },
          { kind: 'prose', text: ', and what it still needs.' },
        ],
      },
    ]);
    expect(proposal.displayObjects.some((display) => display.valueId === `proposal:${snapshotId}.inputs.project.type`)).toBe(true);

    // A figure typed as text: refused by the validator; the version is stored with no paragraph (rule 7).
    drafts.next = 'This TEST proposal covers 34,500 m² of floor area.';
    const refused = await generate(demoId, seed);
    expect(await api.database.asAdministrator('SELECT slot FROM sovitech.proposal_snapshot_paragraphs WHERE snapshot_id = $1', [refused])).toEqual([]);

    // Not the demo: the guard refuses before the call (rule 13, "Processing"; PRD R-115 "Until decided").
    const { projectId } = await newOwnerProject(api, owner, 'drafting not demo');
    const before = drafts.requests.length;
    const other = await generate(projectId, owner);
    expect(drafts.requests.length).toBe(before);
    expect(await api.database.asAdministrator('SELECT slot FROM sovitech.proposal_snapshot_paragraphs WHERE snapshot_id = $1', [other])).toEqual([]);
    expect(api.log.some((record) => record.event === 'proposal_not_drafted' && record.code === 'refused' && record.projectId === projectId)).toBe(true);
  });
});
