/**
 * G10-11 (docs/guardrails.md section 7; new in phase 3 part B; rule 10, "Investment figures move through three
 * stages, and each has a fixed name", with stage 1 "when first-estimate data is missing"; rule 7's
 * `first_estimate` row, "If it is still missing, the output falls back to a stage 1 Indicative range where the
 * registry allows one, or else 'Not available yet' with the missing item and an action to add it"; 2.8, "Status
 * lines and stage labels": "Indicative range", "Preliminary investment estimate", "Formal quotation", "They are
 * also the only ones used").
 * Situation: step 8 and the proposal page of a TEST project, with every dataset gate closed (no investment figure
 * can be produced).
 * Expected: the investment outputs are named only by 2.8's stage labels ("Indicative range", "Preliminary
 * investment estimate"), each with its "Not available yet: …" line. The Proposal card names no stage while no
 * investment figure can be produced: it shows the "Not available yet: …" line of the investment output that
 * carries the stage, naming what is missing, with its action where the owner has one. No other stage wording
 * appears.
 *
 * Corrected before the phase was committed (the final verification of part B, its third new problem): this
 * case's first Expected had the Proposal card name "Preliminary investment estimate" with no figure behind it,
 * which followed PRD US-INTAKE-16 AC2's default rather than rule 7's `first_estimate` row and rule 10's stage 1
 * (docs/build-log.md, phase 3, "Product doc issues"). Section 5, step 8's "a Preliminary investment estimate as a
 * range" applies once a figure can be produced.
 *
 * Both halves in this case file (V-7: the index check counts a case as real from its case file alone):
 * - the API half, over a TEST database, through the API (the contract's steps.view and proposal.preview): the
 *   stage labels are line display objects whose own line carries the stage-label kind; `proposal.stage` is null
 *   (no figure can be produced), and the investment output that carries the served stage is not available, with
 *   its "Not available yet: " line. The API still serves the stage the rules give for the figure
 *   (`proposal.stageLabel`), which the page reads to find that output; it does not show it.
 * - the rendered half: the app's own route table (apps/web/src/routes.tsx) in a memory router, with its real step
 *   8 page, API client and the page's own `fetch`, in Vitest's happy-dom environment, against a TEST API this file
 *   serves over HTTP on 127.0.0.1 that answers with the responses the API half was served for the same project
 *   (nothing of the code under test is replaced: no `vi.mock` or `vi.stubGlobal`). The Proposal card shows the
 *   served line of that output, bound to its value id, with its Add action, and no stage label; the outputs list
 *   names each output by its stage label once; "Formal quotation" appears nowhere.
 *
 * The file runs in Node, as the API half needs (a happy-dom environment for the whole file rewrites
 * `import.meta.url` to an http URL, and the API's support reads its folders from it); the rendered half sets up
 * the happy-dom environment for its tests only and imports the testing library and the app after it. Every value
 * is TEST data.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { builtinEnvironments } from 'vitest/runtime';
import {
  ProposalPreviewResponseSchema,
  StepResponseSchema,
  type DisplayObject,
  type OutputAvailability,
  type StepResponse,
} from '@sovitech/view-model/browser';
import { signIn, startTestApi, type Auth, type TestApi } from './_support/api';

const STAGE_WORDS = ['Indicative range', 'Preliminary investment estimate', 'Formal quotation'] as const;
const INVESTMENT_OUTPUTS: Readonly<Record<string, string>> = { 'capex.indicativeRange': 'Indicative range', 'capex.preliminaryEstimate': 'Preliminary investment estimate' };

/** What the API served for the TEST project, read by the rendered half: a route's status and JSON body. */
const served = new Map<string, { readonly status: number; readonly body: unknown }>();
let projectId: string | undefined;

/** Every text and line a screen's display objects carry. */
function wordsOf(displays: readonly DisplayObject[]): string[] {
  return displays.flatMap((display) => [display.text, ...(display.lines ?? []).map((line) => line.text), ...(display.sourceLine === undefined ? [] : [display.sourceLine.text])]);
}

/** The rule 10 stage a served stage label names: its stage-label line's id. */
function stageIdOf(display: DisplayObject | undefined): string | undefined {
  return display?.lines?.find((line) => line.kind === 'stage_label')?.id;
}

function checkOutputs(outputs: readonly OutputAvailability[], displays: readonly DisplayObject[]): void {
  const byId = (valueId: string | undefined): DisplayObject | undefined => displays.find((display) => display.valueId === valueId);
  for (const [output, label] of Object.entries(INVESTMENT_OUTPUTS)) {
    const entry = outputs.find((candidate) => candidate.output === output);
    expect(entry?.availability, output).toBe('not_available_yet');
    const shown = byId(entry?.label);
    expect(shown, output).toMatchObject({ kind: 'line', text: label, lines: [{ kind: 'stage_label', text: label }] });
    expect(byId(entry?.line)?.text.startsWith('Not available yet: '), output).toBe(true);
  }
  for (const entry of outputs.filter((candidate) => !(candidate.output in INVESTMENT_OUTPUTS))) expect(entry.label, entry.output).toBeUndefined();
}

/** The investment output that carries the stage the API serves for the figure, and its served line. */
function stageOutputOf(response: StepResponse): { readonly entry: OutputAvailability; readonly line: DisplayObject } {
  const { view, displayObjects } = response;
  if (view.step !== 8) throw new Error('not step 8');
  const byId = (valueId: string | undefined): DisplayObject | undefined => displayObjects.find((display) => display.valueId === valueId);
  const stageId = stageIdOf(byId(view.proposal.stageLabel));
  const entry = view.proposal.outputs.find((candidate) => candidate.label !== undefined && stageIdOf(byId(candidate.label)) === stageId);
  const line = byId(entry?.line);
  if (entry === undefined || line === undefined) throw new Error(`no investment output carries the served stage ${String(stageId)}`);
  return { entry, line };
}

describe('G10-11 (API half, over a TEST database)', () => {
  let api: TestApi;
  let owner: Auth;

  beforeAll(async () => {
    api = await startTestApi({ devLogin: true });
    const [ownerId] = api.devAccountIds;
    if (ownerId === undefined) throw new Error('no TEST development owner');
    owner = await signIn(api, ownerId);
    const created = await api.app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { ...owner },
      payload: { name: 'TEST G10-11 project', projectType: 'new_construction', countryCode: 'RO', city: 'TEST city G10-11' },
    });
    expect(created.statusCode, created.body).toBe(201);
    projectId = (created.json() as { projectId: string }).projectId;
  }, 180_000);

  afterAll(async () => {
    await api.stop();
  });

  /** A GET as the page sends it, with the owner's session, kept for the rendered half. */
  async function get(url: string, key: string = url): Promise<unknown> {
    const response = await api.app.inject({ method: 'GET', url, headers: { cookie: owner.cookie } });
    expect(response.statusCode, `${url}: ${response.body}`).toBe(200);
    const body = response.json() as unknown;
    served.set(key, { status: response.statusCode, body });
    return body;
  }

  it('G10-11 · US-INTAKE-16 AC2 AC3 · rule 7 · rule 10: step 8 names the two investment outputs\' stages with their "Not available yet" lines; the Proposal card\'s stage is served with no figure behind it', async () => {
    if (projectId === undefined) throw new Error('no TEST project');
    const response = StepResponseSchema.parse(await get(`/api/projects/${projectId}/steps/8`));
    const { view } = response;
    if (view.step !== 8) throw new Error('not step 8');
    checkOutputs(view.proposal.outputs, response.displayObjects);
    // No figure can be produced: the API names no stage for it.
    expect(view.proposal.stage).toBeNull();
    // The stage the rules give for the figure is still served (the page reads it to find its output), never "Formal quotation".
    const stage = response.displayObjects.find((display) => display.valueId === view.proposal.stageLabel);
    expect(stage).toMatchObject({ valueId: `project:${projectId}.proposal.stage`, kind: 'line', lines: [{ kind: 'stage_label' }] });
    expect(['Indicative range', 'Preliminary investment estimate']).toContain(stage?.text);
    // The investment output that carries that stage is not available, and its line names what is missing.
    const { entry, line } = stageOutputOf(response);
    expect(entry.availability).toBe('not_available_yet');
    expect(line.text.startsWith('Not available yet: ')).toBe(true);
    const words = wordsOf(response.displayObjects);
    expect(words.filter((text) => text.includes('Formal quotation'))).toEqual([]);
    // Each stage label is served on its output (with its line) and once more as the stage the page reads; nothing else names a stage.
    expect(words.filter((text) => STAGE_WORDS.some((label) => text.includes(label))).sort()).toEqual(
      ['Indicative range', 'Indicative range', 'Preliminary investment estimate', 'Preliminary investment estimate', stage?.text ?? '', stage?.text ?? ''].sort(),
    );
    // What the page reads besides the step view, as the API serves it to the owner, for the rendered half.
    await get('/api/auth/session');
    await get('/api/projects');
    await get(`/api/projects/${projectId}/late-findings?current=8`, `/api/projects/${projectId}/late-findings`);
  });

  it('G10-11 · US-PROPOSAL-01: the proposal page names the same stages and no other', async () => {
    if (projectId === undefined) throw new Error('no TEST project');
    const response = ProposalPreviewResponseSchema.parse((await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/proposal`, headers: { ...owner } })).json());
    checkOutputs(response.view.outputs, response.displayObjects);
    expect(wordsOf(response.displayObjects).filter((text) => text.includes('Formal quotation'))).toEqual([]);
  });
});

type Library = typeof import('@testing-library/react');
type RenderApp = typeof import('../../apps/web/src/test/render-app');
type Client = typeof import('../../apps/web/src/api/client');

describe('G10-11 (rendered: step 8 of the same TEST project, the app in happy-dom)', () => {
  // Assigned once the DOM exists (beforeAll): React, the router and the testing library start with a document.
  let library: Library;
  let app: RenderApp;
  let client: Client;
  let teardownDom: (() => Promise<void>) | undefined;
  let server: Server | undefined;
  /** The paths the TEST API has finished answering, so a test ends only after the page's own requests are answered. */
  const answered = new Set<string>();

  /** Answers the page's requests with what the API served the owner for this project; anything else is 404. */
  function answer(request: IncomingMessage, response: ServerResponse): void {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const method = request.method ?? 'GET';
    const kept = method === 'GET' ? served.get(url.pathname) : undefined;
    const chosen = url.pathname === '/api/csrf' ? { status: 200, body: { token: 'TEST-token' } } : (kept ?? { status: 404, body: { code: 'not_found' } });
    response.on('finish', () => answered.add(url.pathname));
    response.writeHead(chosen.status, { 'content-type': 'application/json' });
    response.end(JSON.stringify(chosen.body));
  }

  beforeAll(async () => {
    const started = createServer(answer);
    server = started;
    await new Promise<void>((resolve) => started.listen(0, '127.0.0.1', resolve));
    const address = started.address();
    if (address === null || typeof address === 'string') throw new Error('the TEST API has no port');
    // The page's origin is the TEST API's, so the app's same-origin `/api` requests reach it.
    const dom = await builtinEnvironments['happy-dom'].setup(globalThis, { happyDOM: { url: `http://127.0.0.1:${String(address.port)}/` } });
    teardownDom = async () => {
      await dom.teardown(globalThis);
    };
    library = await import('@testing-library/react');
    app = await import('../../apps/web/src/test/render-app');
    client = await import('../../apps/web/src/api/client');
  });

  afterEach(async () => {
    library.cleanup();
    // The page's requests still in flight (its late-findings poll) are aborted before the next test.
    await (window as unknown as { happyDOM: { abort(): Promise<void> } }).happyDOM.abort();
    client.resetCsrfToken();
    answered.clear();
  });

  afterAll(async () => {
    await teardownDom?.();
    const started = server;
    if (started === undefined) return;
    started.closeAllConnections();
    await new Promise((resolve) => started.close(resolve));
  });

  it('G10-11 · US-INTAKE-16 AC1 AC2 AC3 · rule 7 `first_estimate` row · rule 10 stage 1 (rendered): the Proposal card names no stage; it shows the served "Not available yet" line of the output that carries the stage, bound, with its Add action; each output is named by its stage label once; no "Formal quotation"', async () => {
    const { screen, waitFor, within } = library;
    const kept = projectId === undefined ? undefined : served.get(`/api/projects/${projectId}/steps/8`);
    if (projectId === undefined || kept === undefined) throw new Error('the API half served no step 8 for the TEST project');
    const response = StepResponseSchema.parse(kept.body);
    if (response.view.step !== 8) throw new Error('not step 8');
    const { line } = stageOutputOf(response);

    app.renderApp(`/projects/${projectId}/steps/8`);
    await waitFor(() => expect(document.body.hasAttribute('data-render-ready')).toBe(true));
    const card = screen.getByRole('region', { name: 'Proposal' });
    // No stage label on the card while no figure can be produced.
    for (const label of STAGE_WORDS) expect(card.textContent, label).not.toContain(label);
    expect(card.querySelector(`[data-value-id="${response.view.proposal.stageLabel ?? ''}"]`)).toBeNull();
    // The output's served line, bound to its value id, naming what is missing.
    const shownLine = card.querySelector(`[data-value-id="${line.valueId}"]`);
    expect(shownLine?.textContent).toContain(line.text);
    expect(line.text.startsWith('Not available yet: ')).toBe(true);
    // Its action, where the owner has one (rule 7: "with the missing item and an action to add it").
    const add = (line.actions ?? []).find((action) => action.kind === 'add');
    if (add !== undefined) expect(within(card).getByRole('button', { name: add.label })).toBeTruthy();
    // The outputs list names each investment output by its stage label, once, bound to its served value id.
    const outputs = screen.getByRole('region', { name: 'What your proposal will show' });
    for (const [output, label] of Object.entries(INVESTMENT_OUTPUTS)) {
      const entry = response.view.proposal.outputs.find((candidate) => candidate.output === output);
      const named = within(outputs).getAllByText(label);
      expect(named, output).toHaveLength(1);
      expect(named[0]?.closest('[data-value-id]')?.getAttribute('data-value-id'), output).toBe(entry?.label);
    }
    // No other stage wording: "Formal quotation" nowhere on the page, and each stage label only where shown above.
    expect(document.body.textContent).not.toContain('Formal quotation');
    for (const label of ['Indicative range', 'Preliminary investment estimate']) expect(screen.getAllByText(label), label).toHaveLength(1);
    // The page's first late-findings poll is answered and read before the test ends (an aborted read only adds noise).
    await waitFor(() => expect(answered.has(`/api/projects/${projectId}/late-findings`)).toBe(true));
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
});
