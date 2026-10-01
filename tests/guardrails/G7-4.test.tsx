/**
 * G7-4 (docs/guardrails.md section 7; rule 7, "Late findings never interrupt": results that arrive
 * after the owner has left a step "never open a dialog, send the owner back, or change an answer the
 * owner gave; add a dot to that step in the stepper and join the review list; trigger one quiet
 * notice"; PRD R-004; US-INTAKE-19; docs/adr/0039 decision 3).
 * Situation: a floors conflict arrives while the owner is on step 6.
 * Expected: no dialog. Step 3 gets a dot, and the conflict appears on step 8.
 *
 * The API half, over a TEST database. The owner has answered steps 1 to 5 and left step 3 at the time
 * its view was served; on step 6 the page polls the late-findings route with that ledger. Then two TEST
 * documents, written as the extraction service writes values on the ingestion path, give the building
 * two different upper-floor counts: a conflict on the floors, an engineer field. The next poll answers
 * a dot on step 3 only (never on the step on screen), and one notice, a bound line; the poll after it
 * answers the dot and no second notice. Step 8 lists the conflict (SOVITECH will check: the floors are
 * an engineer field, rule 4 routing) and shows the floors with "Two values". The route only reads: no
 * answer of the owner's changed, and it answers no step to move to, only the dots and the notice.
 *
 * The rendered half, in this case file too (phase 3 part B, V-7: the index check counts a case as real
 * from its case file alone): the app itself (its route table, apps/web/src/routes.tsx, in a memory
 * router, with the real step pages, stepper, notice region, API client and the page's own `fetch`)
 * against a TEST API this file serves over HTTP on 127.0.0.1, which stands in at the network boundary
 * for the real one (nothing of the code under test is replaced: no `vi.mock` or `vi.stubGlobal`). The
 * owner leaves step 3 by Continue and is on step 6; the late-findings answer for step 6 then carries
 * the dot on step 3 and one notice. No `dialog` or `alertdialog` role appears; the notice sits in one
 * polite status region, bound to its served value id; step 3's item carries the dot and step 6 stays
 * the current step with its question on screen. The e2e render screen "a floors conflict arrived after
 * the owner left step 3" shows the same in a browser over the e2e stack (tests/e2e/render/screens.ts).
 *
 * The file runs in Node, as the API half needs (a happy-dom environment for the whole file rewrites
 * `import.meta.url` to an http URL, and the API's support reads its folders from it); the rendered
 * half sets up Vitest's own happy-dom environment (vitest/runtime `builtinEnvironments`), at the TEST
 * API's origin, for its tests only, and imports the testing library and the app after it.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import { builtinEnvironments } from 'vitest/runtime';
import { fileNamePart, insertCandidate, newId, registerDocument, storeDocumentTexts, withRequest } from '@sovitech/db';
import { createTestService, testContentHash } from '@sovitech/db/testing';
import { productionRegistry } from '@sovitech/registry';
import { LateFindingsResponseSchema, StepResponseSchema, type DisplayObject, type LateFindingsResponse, type StepResponse } from '@sovitech/view-model/browser';
import { signIn, startTestApi, type Auth, type TestApi } from './_support/api';

describe('G7-4 (API half, over a TEST database)', () => {
  let api: TestApi;
  let owner: Auth;
  let projectId: string;
  let buildingId: string;
  let serviceId: string;

  const floors = productionRegistry.fields.find((field) => field.key === 'building.floors');

  beforeAll(async () => {
    api = await startTestApi({ devLogin: true });
    const [ownerId] = api.devAccountIds;
    if (ownerId === undefined) throw new Error('no TEST development owner');
    owner = await signIn(api, ownerId);
    const created = await api.app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { ...owner },
      payload: { name: 'TEST G7-4 project', projectType: 'new_construction', countryCode: 'RO', city: 'TEST city G7-4' },
    });
    projectId = (created.json() as { projectId: string }).projectId;
    const [building] = await api.database.asAdministrator<{ id: string }>(`SELECT id FROM sovitech.subjects WHERE project_id = $1 AND kind = 'building'`, [projectId]);
    if (building === undefined) throw new Error('no building subject');
    buildingId = building.id;
    serviceId = await createTestService(api.database, { projectId, label: 'G7-4' });
  }, 180_000);

  afterAll(async () => {
    await api.stop();
  });

  /** One TEST document stating an upper-floor count, and its `document` value, as the ingestion path writes them. */
  async function floorsFromDocument(label: string, count: number): Promise<void> {
    if (floors === undefined) throw new Error('no floors field');
    const contentHash = testContentHash(`${projectId} G7-4 ${label}`);
    const excerpt = `TEST ${label}: ${String(count)} etaje`;
    await withRequest(api.database.app, { userId: serviceId, projectId }, async (request) => {
      const document = await registerDocument(request, { contentHash, kind: 'architectural', stage: 'technical_design', analysis: { status: 'analysed', coverage: 'pages 1-1 of 1' }, createdBy: serviceId });
      await storeDocumentTexts(request, { contentHash, parts: [{ part: 'page:1', text: excerpt }, { part: fileNamePart(document.id), text: `TEST ${label}.pdf` }], createdBy: serviceId });
      const written = await insertCandidate(
        request,
        {
          id: newId(),
          subjectId: buildingId,
          fieldKey: floors.key,
          quantity: { value: count, unit: 'count', qualifier: 'upper' },
          source: 'document',
          evidence: [{ documentId: document.id, contentHash, locator: { page: 1 }, excerpt, check: 'text_match' }],
          createdBy: serviceId,
        },
        floors,
      );
      if (written.outcome !== 'stored') throw new Error(`the TEST value was refused: ${written.outcome}`);
    });
  }

  async function view(step: number): Promise<StepResponse> {
    const response = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/steps/${String(step)}`, headers: { ...owner } });
    expect(response.statusCode, response.body).toBe(200);
    return StepResponseSchema.parse(response.json());
  }

  async function poll(query: string): Promise<LateFindingsResponse> {
    const response = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/late-findings?${query}`, headers: { ...owner } });
    expect(response.statusCode, response.body).toBe(200);
    return LateFindingsResponseSchema.parse(response.json());
  }

  test('G7-4 · R-004 · US-INTAKE-19: a floors conflict arriving while the owner is on step 6 dots step 3, gives one quiet notice, and appears on step 8', async () => {
    // The owner leaves steps 3, 4 and 5 (each at the time its view was served) and is on step 6.
    const left = [3, 4, 5].map((step) => ({ step, at: '' }));
    for (const entry of left) entry.at = (await view(entry.step)).asOf;
    const ledger = left.map((entry) => `left=${String(entry.step)}@${entry.at}`).join('&');
    const first = await poll(`current=6&${ledger}`);
    expect(first.dots).toEqual([]);
    expect(first.notice).toBeNull();
    const answers = async () => api.database.asAdministrator(`SELECT id FROM sovitech.candidates WHERE project_id = $1 AND source = 'user' ORDER BY id`, [projectId]);
    const answersBefore = await answers();

    await floorsFromDocument('plan etaj A', 6);
    await floorsFromDocument('plan etaj B', 8);

    const late = await poll(`current=6&since=${first.asOf}&${ledger}`);
    expect(late.dots).toEqual([3]);
    const notice = late.displayObjects.find((display) => display.valueId === late.notice);
    expect(notice?.kind).toBe('line');
    expect(notice?.text).toMatch(/^We found \d+ more things? in your documents\. You'll see (?:them|it) on the review step\.$/u);
    // The answer names no step to move to, and holds nothing but the dots and the notice's line.
    expect(Object.keys(late).sort()).toEqual(['asOf', 'displayObjects', 'dots', 'notice']);
    expect(late.displayObjects.map((display) => display.valueId)).toEqual([late.notice]);
    // No answer the owner gave changed.
    expect(await answers()).toEqual(answersBefore);

    const quiet = await poll(`current=6&since=${late.asOf}&${ledger}`);
    expect(quiet.dots).toEqual([3]);
    expect(quiet.notice).toBeNull();
    // The step on screen never gets a dot, even when the finding is its own step's.
    expect((await poll(`current=3&${ledger}`)).dots).toEqual([]);

    const step8 = await view(8);
    if (step8.view.step !== 8) throw new Error('step 8');
    const listed = step8.view.sovitechWillCheck.map((id) => step8.displayObjects.find((display) => display.valueId === id)?.text);
    expect(listed).toEqual(['SOVITECH will check: Floors']);
    const floorsCard = step8.view.cards.find((card) => card.cardId === 'building')?.rows.map((id) => step8.displayObjects.find((display) => display.valueId === id));
    expect(floorsCard?.find((display) => display?.field?.fieldKey === 'building.floors')?.badge?.id).toBe('two_values');
  });
});

type Library = typeof import('@testing-library/react');
type Harness = typeof import('../../apps/web/src/test/harness');
type Views = typeof import('../../apps/web/src/review/test-views');
type Step3Support = typeof import('../../apps/web/src/steps/step-3/test-support');
type RenderApp = typeof import('../../apps/web/src/test/render-app');
type Client = typeof import('../../apps/web/src/api/client');

/** What the TEST API answers for one route: a status and a JSON body, or an answer read from the query. */
interface Answer {
  readonly status: number;
  readonly body: unknown;
}
type Route = Answer | ((query: URLSearchParams) => Answer);

/** A request the page sent to the TEST API: its method, path and query (bodies are not read). */
interface Sent {
  readonly method: string;
  readonly path: string;
  readonly query: URLSearchParams;
}

describe('G7-4 (rendered: the app from step 3 to step 6, in happy-dom)', () => {
  // Assigned once the DOM exists (beforeAll): React, the router and the testing library start with a document.
  let library: Library;
  let harness: Harness;
  let views: Views;
  let step3: Step3Support;
  let app: RenderApp;
  let client: Client;
  let teardownDom: (() => Promise<void>) | undefined;
  const routes = new Map<string, Route>();
  const sent: Sent[] = [];
  let server: Server | undefined;

  function answer(request: IncomingMessage, response: ServerResponse): void {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const method = request.method ?? 'GET';
    sent.push({ method, path: url.pathname, query: url.searchParams });
    const route = routes.get(`${method} ${url.pathname}`);
    const chosen: Answer = route === undefined ? { status: 404, body: { code: 'not_found' } } : typeof route === 'function' ? route(url.searchParams) : route;
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
    harness = await import('../../apps/web/src/test/harness');
    views = await import('../../apps/web/src/review/test-views');
    step3 = await import('../../apps/web/src/steps/step-3/test-support');
    app = await import('../../apps/web/src/test/render-app');
    client = await import('../../apps/web/src/api/client');
  });

  afterEach(async () => {
    library.cleanup();
    // The page's requests still in flight (its late-findings poll) are aborted before the next test.
    await (window as unknown as { happyDOM: { abort(): Promise<void> } }).happyDOM.abort();
    client.resetCsrfToken();
    routes.clear();
    sent.length = 0;
  });

  afterAll(async () => {
    await teardownDom?.();
    const started = server;
    if (started === undefined) return;
    started.closeAllConnections();
    await new Promise((resolve) => started.close(resolve));
  });

  test('G7-4 · US-INTAKE-19 AC1, AC3 · R-004 (rendered): a finding on step 3 that arrives while the owner is on step 6 opens no dialog or alert dialog; one polite notice, a dot on step 3, and the owner stays on step 6', async () => {
    const { screen, fireEvent, waitFor } = library;
    const { AS_OF, PROJECT, USER, envelope, projectList } = harness;
    const { AREA, EQUIPMENT, FLOORS, NO_MODEL, ROOMS, ZONES, equipmentDisplay, missingDisplay } = step3;
    const notice: DisplayObject = { valueId: `project:${PROJECT}.lateFindings.notice`, kind: 'line', text: 'TEST notice with a count', shape: 'value' };
    const facts = [missingDisplay(AREA, 'building.grossFloorArea'), missingDisplay(FLOORS, 'building.floors'), missingDisplay(ROOMS, 'building.rooms'), missingDisplay(ZONES, 'building.zones')];
    const stepThree = {
      ...envelope(PROJECT, [...facts, equipmentDisplay()]),
      view: { step: 3, intro: 'none_found', summary: [AREA, FLOORS, ROOMS, ZONES, EQUIPMENT], details: facts.map((fact) => fact.valueId), confirmationCount: null, forYouRow: null, files: [], viewer: NO_MODEL },
    };
    const goals = views.multiQuestion('q.project.goals', 'project.goal', views.GOALS);
    const stepSix = { ...envelope(PROJECT, views.GOALS.map((goal) => views.notProvided(`project.goal.${goal}`, `TEST goal ${goal}`, ['selected', 'not_selected']))), view: { step: 6, question: goals } };
    routes.set('GET /api/auth/session', { status: 200, body: { user: USER } });
    routes.set('GET /api/csrf', { status: 200, body: { token: 'TEST-token' } });
    routes.set('GET /api/projects', { status: 200, body: projectList([{ projectId: PROJECT, name: 'TEST project' }]) });
    routes.set(`GET /api/projects/${PROJECT}/steps/3`, { status: 200, body: stepThree });
    routes.set(`GET /api/projects/${PROJECT}/steps/6`, { status: 200, body: stepSix });
    // The API's step after step 3 is the one it names; here the owner is taken on to step 6.
    routes.set(`POST /api/projects/${PROJECT}/steps/3/continue`, { status: 200, body: { nextStep: 6, displayObjects: [] } });
    // The finding arrives once the owner is on step 6, for step 3, which the ledger says was left.
    routes.set(`GET /api/projects/${PROJECT}/late-findings`, (query) =>
      query.get('current') === '6'
        ? { status: 200, body: { asOf: AS_OF, displayObjects: [notice], dots: [3], notice: notice.valueId } }
        : { status: 200, body: { asOf: AS_OF, displayObjects: [], dots: [], notice: null } },
    );
    const { router } = app.renderApp(`/projects/${PROJECT}/steps/3`);
    await waitFor(() => expect(document.body.hasAttribute('data-render-ready')).toBe(true));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${PROJECT}/steps/6`));

    const shown = await screen.findByText('TEST notice with a count');
    // No dialog: nothing modal opens, whatever role it would take.
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(document.querySelector('dialog, [aria-modal="true"]')).toBeNull();
    // One quiet notice, in a polite status region, its count bound to the served value id.
    expect(screen.getAllByText('TEST notice with a count')).toHaveLength(1);
    expect(shown.closest('[role="status"]')?.getAttribute('aria-live')).toBe('polite');
    expect(shown.closest('[role="alert"], [aria-live="assertive"]')).toBeNull();
    expect(shown.closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(notice.valueId);
    // Step 3 gets the dot; step 6 stays the current step, with its question on screen.
    const items = document.querySelectorAll('[data-render-stepper="wizard-step-number"] > li');
    expect(items).toHaveLength(8);
    await waitFor(() => expect(items[2]?.getAttribute('data-dot')).toBe('true'));
    expect(items[5]?.getAttribute('aria-current')).toBe('step');
    expect(items[5]?.getAttribute('data-dot')).toBe('false');
    expect(router.state.location.pathname).toBe(`/projects/${PROJECT}/steps/6`);
    expect(screen.getByRole('checkbox', { name: 'Reduce energy consumption' })).toBeTruthy();
    // The page asked with the ledger: step 6 on screen, step 3 left at the time its view was served.
    const poll = sent.filter((request) => request.path === `/api/projects/${PROJECT}/late-findings`).find((request) => request.query.get('current') === '6');
    expect(poll?.query.getAll('left')).toEqual([`3@${AS_OF}`]);
  });
});
