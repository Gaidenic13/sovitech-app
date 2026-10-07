/**
 * Every app screen and state the render test visits (guardrails rule 2: "every wizard step
 * and dashboard fixture"). Each phase that adds a screen or a state adds it here, with the
 * route, where its display objects come from and, where needed, the steps that bring the
 * screen into that state. screens-schema.ts holds the rules for an entry; tools/checks/render
 * (`pnpm checks`) and the render spec both apply them.
 *
 * `displayObjects` is required on every entry (docs/adr/0006-render-test.md, decision 1):
 * - `displayObjectsFromApi()` (api-display-objects.ts): the display objects the page itself
 *   receives from the API. Every screen that shows a value uses it, from phase 3 on;
 * - or `{}`, for a screen that shows no value.
 * Nothing else is accepted: a function, a hand-typed map of display objects, or an object
 * that only looks like the API source would let a test supply the ids and texts the check
 * compares the screen with. Every `data-value-id` on the screen that the API did not serve
 * fails, and so does every number in a value element that its display object does not declare.
 *
 * `path` is the app route the screen is on, as `APP_PATHS` in apps/web/src/routes.tsx names it;
 * the render spec fails when a route of `APP_PATHS` has no entry here. A route with parameters
 * (`:projectId`, `:step`) is not opened as written: the render spec opens `/sign-in`, and
 * `arrange` signs in and opens the screen (a project of the e2e stack: the demo, or a TEST
 * project it creates through step 1; docs/adr/0037-e2e-setup.md).
 *
 * Phase 0 (2026-09-25): the app had one placeholder page, with no value on it.
 * Phase 3 (2026-10-01): the sign-in page, the project list, the wizard's eight steps on the demo
 * and on a new project with no documents, their states (errors, the inline editor, skipped
 * questions, the header menu), UD-45 and the proposal page.
 * Phase 3 part B (2026-10-01, V-1): the states the settled list missed. Loading (the step's view held,
 * released after a few seconds, so the check reads the loading state and then the loaded screen) and
 * load failure (the step's or the proposal page's view and the project list failing) on the demo and on
 * a new project (UD-34, UD-35, UD-47); step 2 with a file uploading (its chunk held), a file being read
 * and files dragged over the dropzone (UD-33); step 3 with a document still being read and with the
 * inline editor open (UD-34); and, through the e2e stack's control route (TEST states in TEST
 * projects, never the demo; docs/adr/0037 decision 11), a conflict put to the owner ("Two values", "Choose this value"), a confirmation ("Yes, it's a hotel"),
 * more than three "For you" items ("and <n> more"), "Still reading <n> files", and a late finding while
 * the owner is on step 6 (the dot and the quiet notice, G7-4). Step 8's inline ask refusing "1.500"
 * (G8-21) is checked by tests/e2e/flows/inline-ask-refusal.spec.ts instead: the digits the owner typed
 * show unbound in the box until stored, so the render test reads that state only once the box is
 * cleared, after a new observation, which a flow takes and a screen entry does not.
 * Phase 4 (2026-10-02): the workspace (docs/adr/0043): System Scope (DB-16), Topology's Logical view (DB-08),
 * Zones (DB-20), Equipment (DB-17) with its inspector and the asset record (UD-08), and Documents (DB-15) with its
 * inspector, menus, filter panel, upload panel (UD-21), delete confirmation (UD-42) and revision panel (UD-43), the
 * project switcher open (UD-32), on the demo and on new projects; their empty states as the register states them
 * (no documents, being read, nothing read: never "not found", G12-10), loading and load failure, the frame failing;
 * and, through the control route, a register of three TEST tags (`assets-listed`) and a TEST inference whose
 * document's delete returns one value to Unknown (G4-39). No zone row is checked: no zone field is registered in
 * production (docs/adr/0045 decision 1), so no zone exists in the stack; the zone details and editor are proven in
 * their component tests with TEST registries.
 * Phase 4 part B (2026-10-02): the floor field in conflict (`floors-conflict`) on System Scope and Topology: the floor
 * control shows the "two values" line, the floors field's two readings with their sources, and the routing line or the
 * action to enter the floors, never a level list (V-4; rule 4, rule 7); the switcher open on the demo with more than
 * twelve projects, its panel ending above the status footer and the demo line uncovered (DR-4; rule 10); tags written
 * only in digits ("101", "1.2"; `assets-numbered`) on Equipment's inspector and the asset record, inside the kept frame
 * and footer (A-1; rule 7); "Show details" as the one name of the details control (DR-13); and the floor control as
 * the one filter in each page's header, a dropdown or the served line with its actions (DR-5).
 * Phase 5 (2026-10-05; docs/adr/0048 to 0050): the print route of a stored proposal (the print builder: the demo, a new
 * project, loading, failing), and (the integrator) the landing with a stored proposal on the demo and on a new project,
 * the landing never generated (phase 3's preview), generating with Generate's POST held (UD-07), generation failed
 * (UD-47), generated while a document is still being read (G7-18), the stored versions failing to load; a stored version
 * by its address on the demo, an earlier version, a
 * version not in the project, loading; Download PDF failing; Reports (DB-18) on the demo with the seed's export, empty,
 * two rows with the second previewed, no match, loading, failing; Equipment's Export failing.
 * Phase 6 (2026-10-07; docs/adr/0052): the Metrics pages (DB-02, DB-13, DB-12, DB-21, DB-22) on the demo with its stored
 * proposal, on a new project with none (the served "Not available yet: a generated preliminary proposal" and Open the
 * Proposal page), on a new project generated with nothing answered (every figure "Not available yet" naming what is
 * missing, every chart its one line: G1-31, G10-15), loading and failing; Financial Overview of an earlier version and
 * of a version not in the project; Export Report failing on Payback and Lifecycle; and the print route of both pages
 * (R-121) on the demo and on a new project, loading and failing. OPEX & Savings reads the project now: the demo (an
 * existing building: the upload offered) and a new project (new construction: none).
 * Phase 7 (2026-10-07; docs/adr/0053): the development-only admin area, as the development admin: UD-39 (accounts and
 * roles, role events, projects by id with the demo line on the demo's rows, processors), UD-40 (datasets) and UD-41
 * (guardrail events, speed and truth, confidence wording, the erasure log), each loaded, loading (its view held) and
 * failing; each read by an account that may not (the engineer, the commercial reviewer, the owner): the app's not-found
 * page, titled "Page not found", nothing of the area shown; the entry (`/`) landing the admin on UD-39; and the project
 * list of each account without `owner` (the engineer's and the commercial reviewer's role lines with no "New project";
 * the admin's line and "Open the admin area"). The admin plus owner's list is a component test
 * (apps/web/src/admin/AdminArea.test.tsx): no development account holds two roles (ADR 0038 decision 10).
 */
import type { Page } from '@playwright/test';
import { ruleLineById, statusLineById } from '@sovitech/registry';
import { displayObjectsFromApi, type ApiDisplayObjectSource } from './api-display-objects';
import { REPO_ROOT } from '../setup/paths';
import { writeTestState, type TestState } from '../support/control';
import {
  adminView,
  equipmentExport,
  failRequests,
  holdRequests,
  metricsExport,
  metricsPrintView,
  metricsView,
  projectList,
  proposalExport,
  proposalVersion,
  proposalView,
  proposalsGenerate,
  proposalsList,
  reportsList,
  stepView,
  uploadChunk,
  workspaceFrame,
  workspaceView,
} from '../support/network';
import { createProject, demoProjectId, newProjectAt, openProjectScreen, pressPrimary, proposalSettled, screenReady, signIn, signInAs, signedInAt, skipEverything, testProject, type DevAccount } from '../support/wizard';
import { includeSystems, openSwitcher, openWorkspaceScreen } from '../support/workspace';

/** A screen that shows no value: no display objects. */
export type ShowsNoValues = Readonly<Record<string, never>>;

export interface RenderScreen {
  /** Screen id (OB-, DB-, UD-) and state, or a plain name before screens exist. */
  name: string;
  /** The app route (APP_PATHS); opened as is when it has no parameter. */
  path: string;
  /** Required: where the screen's display objects come from (see above). */
  displayObjects: ApiDisplayObjectSource | ShowsNoValues;
  /** Steps after navigation that bring the screen into the state to check. */
  arrange?: (page: Page) => Promise<void>;
}

const STEP = '/projects/:projectId/steps/:step';

/** The demo project's screen, signed in as the development owner. */
const demo = (screen: string) => (page: Page) => signedInAt(page, demoProjectId(), screen);

/** A new TEST project with no documents, created through step 1, at one of its screens. */
const fresh = (label: string, screen: string) => async (page: Page) => {
  await newProjectAt(page, label, screen);
};

/** A new TEST project whose unanswered questions on a step were each skipped. */
const skippedOn = (label: string, step: number) => async (page: Page) => {
  await newProjectAt(page, label, `steps/${String(step)}`);
  await skipEverything(page);
  await screenReady(page);
};

/** How long a held view waits before it answers: long enough to read the loading state, short enough for the check's window. */
const LOADING_MS = 7_000;
/**
 * The same for a long page (a stored proposal, its print view: some hundred elements the check hovers and focuses, ADR
 * 0048): once its view is let go, the page needs more of the check's 10 s window to render, and under the full run's
 * four workers the API answered a stored version in up to 5 s (the integrator's first `pnpm e2e`, phase 5).
 */
const LOADING_LONG_PAGE_MS = 3_000;

/** Waits for the page's loading state: the step's words, never a figure (PageState.tsx `Loading`). */
async function loadingShown(page: Page): Promise<void> {
  await page.getByRole('status').filter({ hasText: /^Loading/u }).first().waitFor();
}

/** Waits for a load-failure state: its message and "Try again" (PageState.tsx `LoadFailed`). */
async function loadFailedShown(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Try again', exact: true }).first().waitFor();
  await screenReady(page);
}

/**
 * Opens a project's screen afresh while its view is held: the loading state, once the project list has
 * answered, so the header shows the project's name and, on the demo, the demo line the list served (a
 * fresh page knows the demo only from a response; docs/build-log.md, phase 3 exit criteria).
 */
async function openWhileHeld(page: Page, path: string): Promise<void> {
  const listed = page.waitForResponse((response) => projectList(response.request().method(), new URL(response.url()).pathname));
  await holdRequests(page, stepView, { releaseAfterMs: LOADING_MS });
  await page.goto(path);
  await loadingShown(page);
  await listed;
}

/** The demo's screen while its view is held (the project list answers, so the header and the demo line show). */
const demoLoading = (screen: string) => async (page: Page) => {
  await signIn(page);
  await openWhileHeld(page, `/projects/${demoProjectId()}/${screen}`);
};

/** A new TEST project's screen while its view is held. */
const freshLoading = (label: string, screen: string) => async (page: Page) => {
  const id = await newProjectAt(page, label, 'steps/2');
  await openWhileHeld(page, `/projects/${id}/${screen}`);
};

/** A new TEST project's screen opened afresh with its view and the project list failing. */
const freshFailed = (label: string, screen: string, view: typeof stepView) => async (page: Page) => {
  const id = await newProjectAt(page, label, 'steps/2');
  await failRequests(page, view, projectList);
  await page.goto(`/projects/${id}/${screen}`);
  await loadFailedShown(page);
};

/** A new TEST project with a TEST state written through the e2e stack's control route, at one of its screens. */
const withState = (label: string, state: TestState, screen: string, shown: (page: Page) => Promise<void>) => async (page: Page) => {
  await signIn(page);
  const id = await createProject(page, testProject(label));
  await writeTestState(state, id);
  await openProjectScreen(page, id, screen);
  await shown(page);
};

// ---- Phase 4: the workspace (docs/adr/0043) -----------------------------------------------------------------

/** A workspace page's route (APP_PATHS). */
const WORKSPACE = (screen: string) => `/projects/:projectId/${screen}`;

/** The demo's workspace page (query included), signed in as the development owner. */
const demoWorkspace = (screen: string) => async (page: Page) => {
  await signIn(page);
  await openWorkspaceScreen(page, demoProjectId(), screen);
};

/** A new TEST project with no documents, at one of its workspace pages (query included). */
const freshWorkspace = (label: string, screen: string) => async (page: Page) => {
  const id = await newProjectAt(page, label, 'steps/2');
  await openWorkspaceScreen(page, id, screen);
};

/** A new TEST project with a TEST state written through the control route, at one of its workspace pages. */
const withWorkspaceState = (label: string, state: TestState, screen: string, shown: (page: Page) => Promise<void>) => async (page: Page) => {
  await signIn(page);
  const id = await createProject(page, testProject(label));
  await writeTestState(state, id);
  await openWorkspaceScreen(page, id, screen);
  await shown(page);
};

/** Opens the first register row's menu (the kit's MenuButton, "More actions") and waits for its items. */
async function openFirstRowMenu(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'More actions', exact: true }).first().click();
  await page.getByRole('menuitem').first().waitFor();
}

/** Opens a document's Delete confirmation from its row menu and waits for the stated effect (UD-42). */
async function openDeleteConfirmation(page: Page): Promise<void> {
  await openFirstRowMenu(page);
  await page.getByRole('menuitem', { name: 'Delete', exact: true }).click();
  await page.locator('[data-delete-confirmation]').getByText(/will return to Unknown$/u).waitFor();
  await screenReady(page);
}

/** A workspace page opened afresh while its page view is held: the frame answers, the page says it is loading. */
const workspaceLoading = (open: (page: Page) => Promise<string>, screen: string) => async (page: Page) => {
  const id = await open(page);
  await holdRequests(page, workspaceView, { releaseAfterMs: LOADING_MS });
  await page.goto(`/projects/${id}/${screen}`);
  await loadingShown(page);
};

/** Signs in and answers the demo's id; or creates a TEST project and answers its id. */
const demoOpened = async (page: Page): Promise<string> => {
  await signIn(page);
  return demoProjectId();
};
const freshOpened = (label: string) => (page: Page) => newProjectAt(page, label, 'steps/2');

/** A new TEST project at System Scope, the named systems included by the owner's own presses (US-SCOPE-05 AC4). */
const freshIncluded = (label: string, systems: readonly string[], screen: string) => async (page: Page) => {
  const id = await newProjectAt(page, label, 'steps/2');
  await openWorkspaceScreen(page, id, 'system-scope');
  await includeSystems(page, systems);
  await openWorkspaceScreen(page, id, screen);
};

/** The page column of the workspace frame (the sidebar's project card shows the floors field too, so it is left out). */
const pageColumn = (page: Page) => page.locator('.sov-workspace__page');

/** The floor control in a workspace page's header: the "Floor" dropdown when the levels are known, or the served line with its actions (DR-5). */
const floorControl = (page: Page) => pageColumn(page).getByRole('group', { name: 'Floor', exact: true });

/**
 * Waits for the floor control of a page whose floor field is in conflict (the `floors-conflict` TEST state: two TEST
 * documents, 6 and 8 upper floors; V-4): the served "Not available yet: two values for floors", the floors field's own
 * display with its Two values badge and both readings' sources, and rule 4's routing line ("Documents disagree on
 * this. A SOVITECH engineer will check it.", the floors being an engineer's field) or, routed to the owner, the action
 * to enter the floors. No level list is offered from either value (rule 4: "It never runs on one of the values"), so
 * the page holds no "Floor" listbox or dropdown; the arrange fails if it does.
 */
async function floorsConflictShown(page: Page): Promise<void> {
  const control = floorControl(page);
  await control.getByText('Not available yet: two values for floors', { exact: true }).waitFor();
  await control.getByText('Two values', { exact: true }).first().waitFor();
  for (const source of [/TEST plan etaj A\.pdf/u, /TEST plan etaj B\.pdf/u]) await control.getByText(source).first().waitFor();
  await control
    .getByText(ruleLineById('conflict_for_engineer').template)
    .or(control.getByRole('link', { name: 'Enter the floors', exact: true }))
    .first()
    .waitFor();
  const lists = (await pageColumn(page).getByRole('listbox', { name: 'Floor' }).count()) + (await pageColumn(page).getByRole('button', { name: /^Floor\b/u }).count());
  if (lists > 0) throw new Error('V-4 · rule 4: a level list or dropdown is offered while the floor field is in conflict');
  await screenReady(page);
}

/** 2.8's demo line, as the registry holds it. */
const DEMO_LINE = statusLineById('demo_data').text;

/** More than twelve: the switcher's list is then taller than the room between the sidebar and the footer at 1440x900 (DR-4). */
const MANY_PROJECTS = 13;

/** A digit-free suffix for the n-th extra project (A, B, … Z, then AA …), as every typed name here is digit-free. */
function letters(index: number): string {
  const letter = String.fromCharCode(65 + (index % 26));
  return index < 26 ? letter : `${letters(Math.floor(index / 26) - 1)}${letter}`;
}

/**
 * The demo's System Scope with the switcher open, the signed-in owner holding more than twelve projects (TEST projects
 * are created through step 1 until they do; a full run has made most of them already). The panel must end above the
 * status footer, so the demo line stays uncovered (DR-4; rule 10 "Labelled everywhere"; 2.8 "Prominence"): the arrange
 * fails when the panel's bottom runs past the footer's top or when anything covers the demo line's middle.
 */
async function switcherOpenWithMany(page: Page): Promise<void> {
  await signIn(page);
  await openWorkspaceScreen(page, demoProjectId(), 'system-scope');
  await openSwitcher(page);
  const listed = await page.locator('[data-switcher-entry]').count();
  if (listed < MANY_PROJECTS) {
    for (let index = listed; index < MANY_PROJECTS; index += 1) await createProject(page, testProject(`Render Switcher ${letters(index)}`));
    await openWorkspaceScreen(page, demoProjectId(), 'system-scope');
    await openSwitcher(page);
  }
  const entries = await page.locator('[data-switcher-entry]').count();
  if (entries < MANY_PROJECTS) throw new Error(`DR-4: the switcher lists ${String(entries)} projects, fewer than the state needs`);
  const panelId = await page.getByRole('button', { name: /^Switch project/u }).getAttribute('aria-controls');
  if (panelId === null) throw new Error('DR-4: the switcher names no panel');
  const panel = await page.locator(`[id="${panelId}"]`).boundingBox();
  const footer = await page.locator('.sov-workspace__footer').boundingBox();
  if (panel === null || footer === null) throw new Error('DR-4: the switcher panel or the status footer is not drawn');
  if (panel.y + panel.height > footer.y + 0.5) {
    throw new Error(`DR-4 · rule 10: the switcher panel ends at ${String(Math.round(panel.y + panel.height))}px, past the status footer's top at ${String(Math.round(footer.y))}px`);
  }
  const demoLine = page.locator('.sov-workspace__footer').getByText(DEMO_LINE, { exact: true });
  await demoLine.waitFor();
  const uncovered = await demoLine.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return hit !== null && element.contains(hit);
  });
  if (!uncovered) throw new Error('DR-4 · rule 10 · 2.8 "Prominence": something covers the demo line in the status footer');
  await screenReady(page);
}

/**
 * Waits until a page of the `assets-numbered` state (tags written only in digits) stands inside the kept workspace
 * frame: the sidebar's page list and the status footer drawn, and no router error page in their place (A-1; rule 7:
 * never a dead end; rule 10: the footer carries the demo line on the demo).
 */
async function frameKept(page: Page): Promise<void> {
  await page.getByRole('navigation', { name: 'Project pages' }).waitFor();
  await page.locator('.sov-workspace__footer').waitFor();
  if ((await page.getByText(/Unexpected Application Error/u).count()) > 0) throw new Error('A-1 · rule 7: the page replaced the workspace frame with an error page');
  await screenReady(page);
}

// ---- Phase 5: the print route of a stored proposal (docs/adr/0050; R-118; the print builder) ------------------------

/** The print route (APP_PATHS): a stored version's printed page, outside every frame, on the brand's light values. */
const PRINT = '/projects/:projectId/print/proposals/:snapshotId';

/** The print view's request (`proposals.print`). */
const printView = (method: string, path: string): boolean => method === 'GET' && /^\/api\/projects\/[0-9a-f-]{36}\/proposals\/[0-9a-f-]{36}\/print$/u.test(path);

/**
 * A stored proposal of the project, as the signed-in owner reaches it: the latest stored version (`proposals.list`), or,
 * where none is stored yet, one Generate (`proposals.generate`, with the session's CSRF token), so a render run adds no
 * version to the demo once the seed stored its first.
 */
async function storedSnapshot(page: Page, projectId: string): Promise<string> {
  const listed = await page.request.get(`/api/projects/${projectId}/proposals`);
  if (!listed.ok()) throw new Error(`proposals.list answered ${String(listed.status())}`);
  const latest = ((await listed.json()) as { view: { versions: Array<{ snapshotId: string }> } }).view.versions[0]?.snapshotId;
  if (latest !== undefined) return latest;
  const token = ((await (await page.request.get('/api/csrf')).json()) as { token: string }).token;
  const generated = await page.request.post(`/api/projects/${projectId}/proposals`, { headers: { 'csrf-token': token }, data: {} });
  if (generated.status() !== 201) throw new Error(`proposals.generate answered ${String(generated.status())}`);
  return ((await generated.json()) as { snapshotId: string }).snapshotId;
}

/** Opens the print route of the project's stored proposal and waits for the printer's ready marker and the render marker. */
async function openPrint(page: Page, projectId: string, marker: 'true' | 'failed' = 'true'): Promise<void> {
  const snapshotId = await storedSnapshot(page, projectId);
  await page.goto(`/projects/${projectId}/print/proposals/${snapshotId}`);
  await page.locator(`html[data-print-ready="${marker}"]`).waitFor({ state: 'attached', timeout: 30_000 });
  await screenReady(page);
}

/** The demo's printed proposal, signed in as the development owner. */
const demoPrint = async (page: Page) => {
  await signIn(page);
  await openPrint(page, demoProjectId());
};

/** A new TEST project with no documents, generated with nothing answered, printed. */
const freshPrint = (label: string) => async (page: Page) => {
  const id = await newProjectAt(page, label, 'steps/2');
  await openPrint(page, id);
};

// ---- Phase 5: the landing, stored versions, Reports and the exports (docs/adr/0048 to 0050; the integrator) ----------

/** A stored version's route (APP_PATHS), in the workspace frame. */
const VERSION = '/projects/:projectId/proposals/:snapshotId';
/** Reports' route (APP_PATHS), the sidebar's last page. */
const REPORTS = WORKSPACE('reports');

/** The session's CSRF token, for the API requests an arrange sends as the signed-in owner. */
async function csrfToken(page: Page): Promise<string> {
  return ((await (await page.request.get('/api/csrf')).json()) as { token: string }).token;
}

/** One Generate through the API (`proposals.generate`), as the owner's press sends it: the new version's id. */
async function generateOnce(page: Page, projectId: string): Promise<string> {
  const generated = await page.request.post(`/api/projects/${projectId}/proposals`, { headers: { 'csrf-token': await csrfToken(page) }, data: {} });
  if (generated.status() !== 201) throw new Error(`proposals.generate answered ${String(generated.status())}`);
  return ((await generated.json()) as { snapshotId: string }).snapshotId;
}

/** One export of a stored version through the API (`proposals.export`), as Download PDF sends it: the output's id. */
async function exportOnce(page: Page, projectId: string, snapshotId: string): Promise<string> {
  const exported = await page.request.post(`/api/projects/${projectId}/proposals/${snapshotId}/exports`, { headers: { 'csrf-token': await csrfToken(page) }, data: {} });
  if (exported.status() !== 201) throw new Error(`proposals.export answered ${String(exported.status())}`);
  return ((await exported.json()) as { outputId: string }).outputId;
}

/** Opens a stored version of a project and waits for its head (UD-01's content) and the render marker. */
async function openVersion(page: Page, projectId: string, snapshotId: string): Promise<void> {
  await page.goto(`/projects/${projectId}/proposals/${snapshotId}`);
  await page.locator(`[data-proposal-snapshot="${snapshotId}"] [data-proposal-head]`).waitFor({ timeout: 30_000 });
  await screenReady(page);
}

/** A new TEST project with no documents, generated with nothing answered, at its landing (the stored proposal). */
const freshGenerated = (label: string) => async (page: Page) => {
  const id = await newProjectAt(page, label, 'steps/2');
  await generateOnce(page, id);
  await openProjectScreen(page, id, 'proposal');
  await proposalSettled(page);
  await screenReady(page);
  return id;
};

/** Step 8 of a new TEST project, then "Generate Proposal" pressed, its POST held or failed by `hold`. */
const generatePressed = (label: string, hold: (page: Page) => Promise<void>, shown: string) => async (page: Page) => {
  await newProjectAt(page, label, 'steps/8');
  await hold(page);
  await page.getByRole('button', { name: 'Generate Proposal', exact: true }).click();
  await page.locator(shown).waitFor({ timeout: 30_000 });
};

/** Reports of a new TEST project after `exports` Download PDF presses on one stored version (none: nothing exported). */
const freshReports = (label: string, exports: number) => async (page: Page) => {
  const id = await newProjectAt(page, label, 'steps/2');
  if (exports > 0) {
    const snapshotId = await generateOnce(page, id);
    for (let count = 0; count < exports; count += 1) await exportOnce(page, id, snapshotId);
  }
  await openWorkspaceScreen(page, id, 'reports');
  return id;
};

/** A UUID that names no version of any project (the store's ids are UUIDv7; this one is v4 and never issued). */
const NO_VERSION = '6f1c2b9e-3a4d-4e5f-8a7b-9c0d1e2f3a4b';

// ---- Phase 6: the Metrics pages and their print route (docs/adr/0052; R-087 to R-108 "Until decided"; R-121) ---------

/** A Metrics page's route (APP_PATHS), in the workspace frame. */
const METRICS = (segment: string) => `/projects/:projectId/metrics/${segment}`;
/** The print route of a Metrics page with Export Report (APP_PATHS), outside every frame. */
const METRICS_PRINT = '/projects/:projectId/print/metrics/:page/:snapshotId';

/** Waits for a snapshot-reading Metrics page showing a stored version: its version line (the bound date) and its tiles or panels. */
async function metricsVersionShown(page: Page): Promise<void> {
  await page.locator('[data-metrics-page] [data-metrics-version]').waitFor({ timeout: 30_000 });
  await page.locator('[data-metrics-page] [data-metric-tile], [data-metrics-page] [data-metric-panel]').first().waitFor();
  await screenReady(page);
}

/** Opens a Metrics page of a project (query included) and waits for its state: a stored version, none generated, or OPEX's tiles. */
async function openMetrics(page: Page, projectId: string, segment: string, shown: 'version' | 'none-generated' | 'opex'): Promise<void> {
  await openWorkspaceScreen(page, projectId, `metrics/${segment}`);
  if (shown === 'version') await metricsVersionShown(page);
  else if (shown === 'none-generated') await page.locator('[data-metrics-state="none-generated"]').waitFor({ timeout: 30_000 });
  else await page.locator('[data-metrics-page="opex"] [data-metric-tile]').first().waitFor({ timeout: 30_000 });
  await screenReady(page);
}

/** The demo's Metrics page, signed in as the development owner (the seed stored the demo's first proposal). */
const demoMetrics = (segment: string, shown: 'version' | 'opex' = 'version') => async (page: Page) => {
  await signIn(page);
  await openMetrics(page, demoProjectId(), segment, shown);
};

/** A new TEST project with no documents and no stored proposal, at a Metrics page. */
const freshMetrics = (label: string, segment: string, shown: 'none-generated' | 'opex' = 'none-generated') => async (page: Page) => {
  const id = await newProjectAt(page, label, 'steps/2');
  await openMetrics(page, id, segment, shown);
};

/** A new TEST project with no documents, generated with nothing answered, at a Metrics page; its id. */
const freshMetricsGenerated = (label: string, segment: string) => async (page: Page) => {
  const id = await newProjectAt(page, label, 'steps/2');
  await generateOnce(page, id);
  await openMetrics(page, id, segment, 'version');
  return id;
};

/** A new TEST project's Metrics page opened afresh while its view is held: the title and one polite line, no figure. */
const metricsLoading = (label: string, segment: string, generate: boolean) => async (page: Page) => {
  const id = await newProjectAt(page, label, 'steps/2');
  if (generate) await generateOnce(page, id);
  await holdRequests(page, metricsView, { releaseAfterMs: LOADING_MS });
  await page.goto(`/projects/${id}/metrics/${segment}`);
  await loadingShown(page);
};

/** A new TEST project's Metrics page opened afresh with its view failing: what could not be loaded, and Try again. */
const metricsFailed = (label: string, segment: string) => async (page: Page) => {
  const id = await newProjectAt(page, label, 'steps/2');
  await failRequests(page, metricsView);
  await page.goto(`/projects/${id}/metrics/${segment}`);
  await loadFailedShown(page);
};

/** Export Report pressed on a new TEST project's generated page, its download failing: the failure said beside it (rule 7). */
const exportReportFailed = (label: string, segment: 'payback' | 'lifecycle') => async (page: Page) => {
  await freshMetricsGenerated(label, segment)(page);
  await failRequests(page, metricsExport);
  await page.getByRole('button', { name: 'Export Report', exact: true }).click();
  await page.getByText('The report could not be prepared. Nothing was lost. Try again.', { exact: true }).waitFor();
  await screenReady(page);
};

/** Opens the print route of a Metrics page of the project's stored proposal and waits for the printer's marker and the render marker. */
async function openMetricsPrint(page: Page, projectId: string, printed: 'payback' | 'lifecycle', marker: 'true' | 'failed' = 'true'): Promise<void> {
  const snapshotId = await storedSnapshot(page, projectId);
  await page.goto(`/projects/${projectId}/print/metrics/${printed}/${snapshotId}`);
  await page.locator(`html[data-print-ready="${marker}"]`).waitFor({ state: 'attached', timeout: 30_000 });
  await screenReady(page);
}

// ---- Phase 7: the development-only admin area (docs/adr/0053) and the landings by role ---------------------

/** The admin area's pages (APP_PATHS). */
const ADMIN = { accounts: '/admin/accounts', datasets: '/admin/datasets', guardrailEvents: '/admin/guardrail-events' } as const;

/** Waits for an admin page's sections: its view answered and drawn. */
async function adminLoaded(page: Page): Promise<void> {
  await page.locator('[data-admin-section]').first().waitFor({ timeout: 30_000 });
  await screenReady(page);
}

/** The development admin at the admin page the render spec opened (sign-in returns to it). */
const asAdmin = async (page: Page) => {
  await signInAs(page, 'admin');
  await adminLoaded(page);
};

/** The development admin at an admin page opened afresh while its view is held: the page's one loading line, no figure. */
const adminLoading = (path: string) => async (page: Page) => {
  await asAdmin(page);
  await holdRequests(page, adminView, { releaseAfterMs: LOADING_MS });
  await page.goto(path);
  await page.locator('[data-admin-state="loading"]').waitFor();
  await loadingShown(page);
};

/** The development admin at an admin page opened afresh with its view failing: "This page could not be loaded." and Try again. */
const adminFailed = (path: string) => async (page: Page) => {
  await asAdmin(page);
  await failRequests(page, adminView);
  await page.goto(path);
  await page.locator('[data-admin-state="failed"]').waitFor();
  await loadFailedShown(page);
};

/**
 * An account that may not read the admin area at the admin page the render spec opened: the app's not-found page, with
 * nothing of the area (no navigation, no admin title) and no admin request (ADR 0053 decisions 3 and 5).
 */
const refusedAs = (account: DevAccount) => async (page: Page) => {
  await signInAs(page, account);
  await page.getByRole('heading', { level: 1, name: 'This page does not exist.' }).waitFor();
  if ((await page.getByRole('navigation', { name: 'Admin area' }).count()) > 0) throw new Error('ADR 0053 decision 5: the admin area\'s navigation shows to an account without sovitech_admin');
  await screenReady(page);
};

/** An account without `owner` on the project list: its role lines, and no "New project" (ADR 0053 decision 4). */
const projectListAs = (account: DevAccount) => async (page: Page) => {
  await signInAs(page, account);
  await page.locator('[data-role-lines]').waitFor();
  if ((await page.getByRole('link', { name: 'New project' }).count()) + (await page.getByRole('button', { name: 'New project' }).count()) > 0) {
    throw new Error('R-136 · ADR 0053 decision 4: "New project" shows to an account without owner');
  }
  await screenReady(page);
};

export const RENDER_SCREENS: readonly RenderScreen[] = [
  // ---- Session (UD-36) and the project list (UD-37) --------------------------------------------
  { name: 'entry: signed out, sent to sign-in (UD-36)', path: '/', displayObjects: displayObjectsFromApi() },
  { name: 'UD-36 sign-in: the development accounts', path: '/sign-in', displayObjects: displayObjectsFromApi() },
  { name: 'UD-37 project list, with the demo row', path: '/projects', displayObjects: displayObjectsFromApi(), arrange: signIn },
  {
    name: 'UD-16 header menu open on the project list',
    path: '/projects',
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await signIn(page);
      await page.getByRole('button', { name: 'Menu' }).click();
      await page.getByRole('button', { name: 'Sign out' }).waitFor();
    },
  },

  // ---- OB-1, a new project ----------------------------------------------------------------------
  { name: 'OB-1 step 1, new project, empty', path: '/projects/new', displayObjects: displayObjectsFromApi(), arrange: signIn },
  {
    name: 'OB-1 step 1, new project, Next with the four fields empty (G7-6)',
    path: '/projects/new',
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await signIn(page);
      await page.getByRole('button', { name: 'Next' }).click();
      await page.getByText('Fill in this field to create the project.').first().waitFor();
    },
  },

  // ---- The demo project, every step (OB-1 to OB-8), UD-45 and the proposal page -------------------
  { name: 'OB-1 step 1, demo: the stored answers', path: STEP, displayObjects: displayObjectsFromApi(), arrange: demo('steps/1') },
  {
    name: 'OB-1 step 1, demo: the inline editor open on the project name',
    path: STEP,
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await demo('steps/1')(page);
      await page.getByRole('button', { name: 'Edit' }).first().click();
      await page.getByRole('button', { name: 'Save' }).waitFor();
    },
  },
  { name: 'OB-2 step 2, demo: ten files, read, stored or partly read (UD-33)', path: STEP, displayObjects: displayObjectsFromApi(), arrange: demo('steps/2') },
  { name: 'OB-3 step 3, demo: facts, files not fully read, models stored (UD-34)', path: STEP, displayObjects: displayObjectsFromApi(), arrange: demo('steps/3') },
  { name: 'UD-45 all extracted data, demo', path: '/projects/:projectId/extracted', displayObjects: displayObjectsFromApi(), arrange: demo('extracted') },
  { name: 'OB-4 step 4, demo: the stored scope decisions', path: STEP, displayObjects: displayObjectsFromApi(), arrange: demo('steps/4') },
  { name: 'OB-5 step 5, demo: building type, schedule and occupancy answered', path: STEP, displayObjects: displayObjectsFromApi(), arrange: demo('steps/5') },
  { name: 'OB-6 step 6, demo: goals answered', path: STEP, displayObjects: displayObjectsFromApi(), arrange: demo('steps/6') },
  { name: 'OB-7 step 7, demo: automation areas answered', path: STEP, displayObjects: displayObjectsFromApi(), arrange: demo('steps/7') },
  { name: 'OB-8 step 8, demo: the review, inline ask, For you, SOVITECH will check (UD-35)', path: STEP, displayObjects: displayObjectsFromApi(), arrange: demo('steps/8') },
  {
    name: 'UD-06 the landing, demo: the latest stored proposal, every output "Not available yet" naming what is missing, the head naming no stage (R-111, R-116; G10-11)',
    path: '/projects/:projectId/proposal',
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await demo('proposal')(page);
      await proposalSettled(page);
    },
  },

  // ---- A new project with no documents ------------------------------------------------------------
  { name: 'OB-1 step 1, new project stored: the four answers (Provided by you)', path: STEP, displayObjects: displayObjectsFromApi(), arrange: fresh('Render Project Answers', 'steps/1') },
  { name: 'OB-2 step 2, new project: no file yet (UD-33 empty)', path: STEP, displayObjects: displayObjectsFromApi(), arrange: fresh('Render Documents', 'steps/2') },
  {
    name: 'OB-2 step 2, new project: a format off the list refused on its row (UD-33)',
    path: STEP,
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await fresh('Render Refused File', 'steps/2')(page);
      await page.locator('input[type="file"]').setInputFiles({ name: 'TEST-notes.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('TEST') });
      await page.getByText('This format is not on the accepted list. The other files are kept.').waitFor();
    },
  },
  { name: 'OB-3 step 3, new project: no documents (UD-34 nothing read)', path: STEP, displayObjects: displayObjectsFromApi(), arrange: fresh('Render Building', 'steps/3') },
  { name: 'OB-4 step 4, new project: nothing ticked, Skip for now', path: STEP, displayObjects: displayObjectsFromApi(), arrange: fresh('Render Systems', 'steps/4') },
  { name: 'OB-4 step 4, new project: skipped', path: STEP, displayObjects: displayObjectsFromApi(), arrange: skippedOn('Render Systems Skipped', 4) },
  { name: 'OB-5 step 5, new project: unanswered, Skip for now on each question', path: STEP, displayObjects: displayObjectsFromApi(), arrange: fresh('Render Operations', 'steps/5') },
  { name: 'OB-5 step 5, new project: every question skipped', path: STEP, displayObjects: displayObjectsFromApi(), arrange: skippedOn('Render Operations Skipped', 5) },
  { name: 'OB-6 step 6, new project: unanswered', path: STEP, displayObjects: displayObjectsFromApi(), arrange: fresh('Render Goals', 'steps/6') },
  { name: 'OB-7 step 7, new project: unanswered', path: STEP, displayObjects: displayObjectsFromApi(), arrange: fresh('Render Automation', 'steps/7') },
  { name: 'OB-8 step 8, new project: incomplete data, the inline asks (UD-35)', path: STEP, displayObjects: displayObjectsFromApi(), arrange: fresh('Render Review', 'steps/8') },
  {
    name: 'The landing, new project never generated: phase 3\'s preview, "No preliminary proposal has been generated", Go to the review (5.2 "Generate before phase 5")',
    path: '/projects/:projectId/proposal',
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await fresh('Render Proposal', 'proposal')(page);
      await page.locator('[data-not-generated]').waitFor();
      await screenReady(page);
    },
  },

  // ---- Loading and load failure (UD-34, UD-35, UD-47; V-1) -----------------------------------------
  { name: 'OB-3 step 3, demo: loading, its view held (UD-34 loading)', path: STEP, displayObjects: displayObjectsFromApi(), arrange: demoLoading('steps/3') },
  { name: 'OB-8 step 8, new project: loading, its view held (UD-35 loading)', path: STEP, displayObjects: displayObjectsFromApi(), arrange: freshLoading('Render Review Loading', 'steps/8') },
  {
    name: 'OB-8 step 8, demo: load failure, the step and the project list failing (UD-35 error)',
    path: STEP,
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      // From step 7, whose view named the demo; Continue with the answers as shown writes nothing (wizard-demo.test.ts).
      await signedInAt(page, demoProjectId(), 'steps/7');
      await failRequests(page, stepView, projectList);
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      await page.waitForURL((url) => url.pathname.endsWith('/steps/8'));
      await loadFailedShown(page);
    },
  },
  { name: 'OB-8 step 8, new project: load failure, the step and the project list failing (UD-35 error)', path: STEP, displayObjects: displayObjectsFromApi(), arrange: freshFailed('Render Review Failed', 'steps/8', stepView) },
  {
    name: 'UD-47 proposal page, new project: load failure, its view and the project list failing',
    path: '/projects/:projectId/proposal',
    displayObjects: displayObjectsFromApi(),
    arrange: freshFailed('Render Proposal Failed', 'proposal', proposalView),
  },

  // ---- Step 2's file states (UD-33; V-1) -----------------------------------------------------------
  {
    name: 'OB-2 step 2, new project: a file uploading, its chunk held (UD-33)',
    path: STEP,
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await newProjectAt(page, 'Render Uploading', 'steps/2');
      await holdRequests(page, uploadChunk);
      await page.locator('input[type="file"]').setInputFiles(`${REPO_ROOT}/fixtures/pdf/tabel-suprafete.pdf`);
      await page.getByRole('button', { name: 'Stop uploading', exact: true }).first().waitFor();
    },
  },
  {
    name: 'OB-2 step 2, new project: a file being read (UD-33; a TEST document queued)',
    path: STEP,
    displayObjects: displayObjectsFromApi(),
    arrange: withState('Render Being Read', 'document-being-read', 'steps/2', async (page) => {
      await page.locator('li', { hasText: 'TEST memoriu being read.pdf' }).getByRole('progressbar').waitFor();
    }),
  },
  {
    name: 'OB-2 step 2, new project: files dragged over the dropzone (UD-33 drag-over)',
    path: STEP,
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await newProjectAt(page, 'Render Drag Over', 'steps/2');
      const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
      await page.dispatchEvent('.sov-dropzone', 'dragenter', { dataTransfer });
      await page.dispatchEvent('.sov-dropzone', 'dragover', { dataTransfer });
      await page.locator('.sov-dropzone[data-dragging="true"]').waitFor();
    },
  },

  // ---- Step 3's states (UD-34; V-1) ----------------------------------------------------------------
  {
    name: 'OB-3 step 3, new project: a document still being read (UD-34 analysis in progress)',
    path: STEP,
    displayObjects: displayObjectsFromApi(),
    arrange: withState('Render Building Reading', 'document-being-read', 'steps/3', async (page) => {
      await page.getByText('We are reading your documents.', { exact: false }).first().waitFor();
    }),
  },
  {
    name: 'OB-3 step 3, new project: the inline editor open (UD-34 editing)',
    path: STEP,
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await newProjectAt(page, 'Render Building Editing', 'steps/3');
      await page.getByRole('button', { name: 'Edit' }).first().click();
      await page.getByRole('button', { name: 'Save' }).first().waitFor();
    },
  },

  // ---- Conflicts, confirmations and the review lists (V-1; TEST states through the control route) --
  {
    name: 'OB-5 step 5, new project: the building type in conflict, Two values (rule 4)',
    path: STEP,
    displayObjects: displayObjectsFromApi(),
    arrange: withState('Render Operations Conflict', 'owner-conflicts', 'steps/5', async (page) => {
      await page.getByText('Two values', { exact: true }).first().waitFor();
    }),
  },
  {
    name: 'OB-8 step 8, new project: conflicts put to the owner, Choose this value, and <n> more (rule 4; rule 7 "For you")',
    path: STEP,
    displayObjects: displayObjectsFromApi(),
    arrange: withState('Render Review Conflicts', 'owner-conflicts', 'steps/8', async (page) => {
      await page.getByRole('button', { name: 'Choose this value' }).first().waitFor();
      await page.getByText(/^and \d+ more$/u).first().waitFor();
    }),
  },
  {
    name: "OB-5 step 5, new project: an inferred building type to confirm, Yes, it's a hotel (rule 5)",
    path: STEP,
    displayObjects: displayObjectsFromApi(),
    arrange: withState('Render Operations Confirm', 'building-type-inference', 'steps/5', async (page) => {
      await page.getByRole('button', { name: "Yes, it's a hotel" }).first().waitFor();
    }),
  },
  {
    name: "OB-5 step 5, new project: the inferred building type a SOVITECH engineer verified (the stack's development engineer, through the guarded function), Verified by SOVITECH with \"AI inference, verified by SOVITECH on <date>\", nothing to confirm (G3-7; rules 3, 5 and 10; phase 7)",
    path: STEP,
    displayObjects: displayObjectsFromApi(),
    arrange: withState('Render Operations Engineer Review', 'building-type-engineer-review', 'steps/5', async (page) => {
      await page.getByText(/^AI inference, verified by SOVITECH on /u).first().waitFor();
      await page.getByText('Verified by SOVITECH', { exact: true }).first().waitFor();
    }),
  },
  {
    name: 'UD-45 all extracted data, new project: the building type a SOVITECH engineer verified, Verified by SOVITECH with its dated line (G3-7; phase 7)',
    path: '/projects/:projectId/extracted',
    displayObjects: displayObjectsFromApi(),
    arrange: withState('Render Extracted Engineer Review', 'building-type-engineer-review', 'extracted', async (page) => {
      await page.getByText(/^AI inference, verified by SOVITECH on /u).first().waitFor();
    }),
  },
  {
    name: "OB-8 step 8, new project: the confirmation among For you, Yes, it's a hotel with Yes and Edit (rule 5)",
    path: STEP,
    displayObjects: displayObjectsFromApi(),
    arrange: withState('Render Review Confirm', 'building-type-inference', 'steps/8', async (page) => {
      // On step 8 the confirmation's wording is a line, with "Yes" and Edit beside it (rule 5: "Is this right? Yes · Edit").
      await page.getByText("Yes, it's a hotel", { exact: true }).first().waitFor();
      await page.getByRole('button', { name: 'Yes', exact: true }).first().waitFor();
    }),
  },
  {
    name: 'OB-8 step 8, new project: Still reading <n> files (rule 7; a TEST document queued)',
    path: STEP,
    displayObjects: displayObjectsFromApi(),
    arrange: withState('Render Review Reading', 'document-being-read', 'steps/8', async (page) => {
      await page.getByText(/^Still reading \d+ files?\./u).first().waitFor();
    }),
  },
  {
    name: 'OB-6 step 6, new project: a floors conflict arrived after the owner left step 3, the dot and the quiet notice (G7-4)',
    path: STEP,
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await signIn(page);
      const id = await createProject(page, testProject('Render Late Finding'));
      for (const next of [3, 4, 5, 6] as const) await pressPrimary(page, 'Continue', next);
      await writeTestState('floors-conflict', id);
      // The next late-findings poll (every 10 s) brings the dot and the one notice; nothing else moves.
      await page.getByText(/^We found \d+ more things? in your documents\./u).first().waitFor({ timeout: 30_000 });
      await page.locator('[data-render-stepper="wizard-step-number"] > li[data-dot="true"]').first().waitFor();
    },
  },

  // ---- Phase 4: System Scope (DB-16) ----------------------------------------------------------------------------------
  {
    name: 'DB-16 System Scope, demo: the stored decisions, the first system in the detail panel (R-052, R-053, R-058)',
    path: WORKSPACE('system-scope'),
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await demoWorkspace('system-scope')(page);
      await page.locator('[data-system-detail]').first().waitFor();
    },
  },
  {
    name: 'DB-16 System Scope, demo: the floor control in the header, Not available yet naming the floor structure with its actions (R-077; G7-14; DR-5)',
    path: WORKSPACE('system-scope'),
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await demoWorkspace('system-scope')(page);
      // With no floor structure the control is the served line with its two actions in the header's slot (DR-5); a
      // dropdown, where one is drawn, is opened to show them.
      const enter = floorControl(page).getByRole('link', { name: 'Enter the floors', exact: true });
      if ((await enter.count()) === 0) await pageColumn(page).getByRole('button', { name: /^Floor\b/u }).click();
      await enter.first().waitFor();
      await floorControl(page).getByRole('link', { name: 'Upload a document', exact: true }).first().waitFor();
      await screenReady(page);
    },
  },
  {
    name: 'DB-16 System Scope, demo: the system filter open after Floor, All systems and the eight (V-10; rule 3; G3-22)',
    path: WORKSPACE('system-scope'),
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await demoWorkspace('system-scope')(page);
      await pageColumn(page).getByRole('button', { name: /^System\b/u }).click();
      await page.getByRole('listbox').first().waitFor();
      await screenReady(page);
    },
  },
  {
    name: "DB-16 System Scope, demo: Fire Safety's detail panel, its Equipment tab (US-SCOPE-07; rule 11)",
    path: WORKSPACE('system-scope'),
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await demoWorkspace('system-scope?system=fire_safety')(page);
      const panel = page.getByRole('region', { name: 'Fire Safety' });
      await panel.getByRole('tab', { name: 'Equipment', exact: true }).click();
      await panel.getByRole('link', { name: 'View the equipment', exact: true }).waitFor();
      await screenReady(page);
    },
  },
  {
    name: 'UD-32 project switcher open on System Scope, demo: the projects of the signed-in owner (R-145; G13-9)',
    path: WORKSPACE('system-scope'),
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await demoWorkspace('system-scope')(page);
      await openSwitcher(page);
    },
  },
  {
    name: 'UD-32 project switcher open on System Scope, demo: more than twelve projects, the list ending above the status footer and the demo line uncovered (DR-4; rule 10)',
    path: WORKSPACE('system-scope'),
    displayObjects: displayObjectsFromApi(),
    arrange: switcherOpenWithMany,
  },
  {
    name: 'DB-16 System Scope, new project: no decision recorded, Include and Leave out on each system (US-SCOPE-05 AC4)',
    path: WORKSPACE('system-scope'),
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await freshWorkspace('Render Scope Undecided', 'system-scope')(page);
      await page.getByRole('button', { name: 'Include HVAC', exact: true }).waitFor();
    },
  },
  {
    name: 'DB-16 System Scope, new project: load failure, its view and the project list failing (R-003)',
    path: WORKSPACE('system-scope'),
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      const id = await newProjectAt(page, 'Render Scope Failed', 'steps/2');
      await failRequests(page, workspaceView, projectList);
      await page.goto(`/projects/${id}/system-scope`);
      await loadFailedShown(page);
    },
  },
  {
    name: 'DB-16 System Scope, new project: the floor field in conflict, the floor control with the two-values line, both readings and the routing line, no level list (V-4; rules 4 and 7; G7-16; TEST documents)',
    path: WORKSPACE('system-scope'),
    displayObjects: displayObjectsFromApi(),
    arrange: withWorkspaceState('Render Scope Floors Conflict', 'floors-conflict', 'system-scope', floorsConflictShown),
  },

  // ---- Phase 4: Topology's Logical view (DB-08) -----------------------------------------------------------------------
  {
    name: "DB-08 Topology, demo: SOVITECH's design not available yet, one group per included system (R-071; G1-27)",
    path: WORKSPACE('topology'),
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await demoWorkspace('topology')(page);
      await page.locator('[data-topology-group]').first().waitFor();
    },
  },
  {
    name: 'DB-08 Topology, demo: the system filter open (R-077)',
    path: WORKSPACE('topology'),
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await demoWorkspace('topology')(page);
      await page.getByRole('button', { name: /^System\b/u }).click();
      await page.getByRole('listbox').first().waitFor();
      await screenReady(page);
    },
  },
  {
    name: 'DB-08 Topology, demo: load failure, its view failing (the frame still names the demo)',
    path: WORKSPACE('topology'),
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await signIn(page);
      await failRequests(page, workspaceView);
      await page.goto(`/projects/${demoProjectId()}/topology`);
      await loadFailedShown(page);
    },
  },
  {
    name: 'DB-08 Topology, new project: no include decision, Not available yet naming the systems in scope with its action (G7-15)',
    path: WORKSPACE('topology'),
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await freshWorkspace('Render Topology Undecided', 'topology')(page);
      await page.locator('[data-topology-no-decision]').waitFor();
    },
  },
  {
    name: "DB-08 Topology, new project: HVAC and Fire Safety included, Fire Safety in its monitoring lane with a one-way link (G11-11; 7.1-r18)",
    path: WORKSPACE('topology'),
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await freshIncluded('Render Topology Fire', ['HVAC', 'Fire Safety'], 'topology')(page);
      await page.locator('[data-monitoring-link]').waitFor();
    },
  },
  {
    name: 'DB-08 Topology, new project: the floor field in conflict, the floor control with the two-values line, both readings and the routing line, no level list (V-4; rules 4 and 7; G7-16; TEST documents)',
    path: WORKSPACE('topology'),
    displayObjects: displayObjectsFromApi(),
    arrange: withWorkspaceState('Render Topology Floors Conflict', 'floors-conflict', 'topology', floorsConflictShown),
  },

  // ---- Phase 4: Zones (DB-20) ---------------------------------------------------------------------------------------
  {
    name: 'DB-20 Zones, demo: no zone has come from the documents, the floor not available yet (G12-10; G7-14)',
    path: WORKSPACE('zones'),
    displayObjects: displayObjectsFromApi(),
    arrange: demoWorkspace('zones'),
  },
  { name: 'DB-20 Zones, new project: no documents (G12-10)', path: WORKSPACE('zones'), displayObjects: displayObjectsFromApi(), arrange: freshWorkspace('Render Zones', 'zones') },
  {
    name: 'DB-20 Zones, new project: loading, its view held',
    path: WORKSPACE('zones'),
    displayObjects: displayObjectsFromApi(),
    arrange: workspaceLoading(freshOpened('Render Zones Loading'), 'zones'),
  },

  // ---- Phase 4: Equipment (DB-17) and the asset record (UD-08) ----------------------------------------------------------
  {
    name: 'DB-17 Equipment, demo: no equipment has come from the documents, the Filters row open (UD-26; G12-10)',
    path: WORKSPACE('equipment'),
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await demoWorkspace('equipment')(page);
      await page.getByRole('button', { name: 'Filters', exact: true }).click();
      await page.getByRole('group', { name: 'Filter equipment' }).or(page.getByRole('region', { name: 'Filter equipment' })).first().waitFor();
      await screenReady(page);
    },
  },
  { name: 'DB-17 Equipment, new project: no documents (G12-10)', path: WORKSPACE('equipment'), displayObjects: displayObjectsFromApi(), arrange: freshWorkspace('Render Equipment', 'equipment') },
  {
    name: 'DB-17 Equipment, new project: loading, its view held',
    path: WORKSPACE('equipment'),
    displayObjects: displayObjectsFromApi(),
    arrange: workspaceLoading(freshOpened('Render Equipment Loading'), 'equipment'),
  },
  {
    name: 'DB-17 Equipment, new project: three tags in the register, each type Unknown under the closed taxonomy gate (R-065, R-067; TEST appearances)',
    path: WORKSPACE('equipment'),
    displayObjects: displayObjectsFromApi(),
    arrange: withWorkspaceState('Render Equipment Listed', 'assets-listed', 'equipment', async (page) => {
      await page.locator('[data-equipment-row]').nth(2).waitFor();
    }),
  },
  {
    name: "DB-17 Equipment, new project: an asset's inspector, Overview (UD-26; TEST appearances)",
    path: WORKSPACE('equipment'),
    displayObjects: displayObjectsFromApi(),
    arrange: withWorkspaceState('Render Equipment Inspector', 'assets-listed', 'equipment', async (page) => {
      await page.getByRole('button', { name: 'Show details', exact: true }).first().click();
      await page.locator('[data-equipment-inspector]').waitFor();
      await screenReady(page);
    }),
  },
  {
    name: "DB-17 Equipment, new project: an asset's inspector, its Documents tab (UD-26; TEST appearances)",
    path: WORKSPACE('equipment'),
    displayObjects: displayObjectsFromApi(),
    arrange: withWorkspaceState('Render Equipment Documents', 'assets-listed', 'equipment', async (page) => {
      await page.getByRole('button', { name: 'Show details', exact: true }).first().click();
      const inspector = page.locator('[data-equipment-inspector]');
      await inspector.getByRole('tab', { name: 'Documents', exact: true }).click();
      await inspector.getByRole('tabpanel').getByText('TEST equipment list.pdf').first().waitFor();
      await screenReady(page);
    }),
  },
  {
    name: 'UD-08 asset record, new project: the tag as written, where it was found, its history (R-067, R-068; TEST appearances)',
    path: WORKSPACE('equipment/:assetId'),
    displayObjects: displayObjectsFromApi(),
    arrange: withWorkspaceState('Render Asset Record', 'assets-listed', 'equipment', async (page) => {
      await page.getByRole('link', { name: 'Open the full record', exact: true }).first().click();
      await page.locator('[data-asset-record]').waitFor();
      await screenReady(page);
    }),
  },
  {
    name: "UD-08 asset record, new project: an id not in this project's register (rule 13)",
    path: WORKSPACE('equipment/:assetId'),
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await freshWorkspace('Render Asset Missing', 'equipment/00000000-0000-4000-8000-000000000000')(page);
      await page.getByText("This equipment is not in this project's register.", { exact: true }).waitFor();
    },
  },
  {
    name: "DB-17 Equipment, new project: tags written only in digits ('101', '1.2'), the inspector of '101' open inside the kept frame and footer (A-1; rule 7; TEST appearances)",
    path: WORKSPACE('equipment'),
    displayObjects: displayObjectsFromApi(),
    arrange: withWorkspaceState('Render Equipment Numbered', 'assets-numbered', 'equipment', async (page) => {
      const row = page.locator('tr', { has: page.locator('[data-equipment-row]') }).filter({ hasText: '101' });
      await row.getByRole('button', { name: 'Show details', exact: true }).click();
      await page.locator('[data-equipment-inspector]').getByText('101', { exact: true }).first().waitFor();
      await frameKept(page);
    }),
  },
  {
    name: "UD-08 asset record, new project: a tag written only in digits ('1.2') as its heading, inside the kept frame and footer (A-1; rule 7; TEST appearances)",
    path: WORKSPACE('equipment/:assetId'),
    displayObjects: displayObjectsFromApi(),
    arrange: withWorkspaceState('Render Asset Numbered', 'assets-numbered', 'equipment', async (page) => {
      const row = page.locator('tr', { has: page.locator('[data-equipment-row]') }).filter({ hasText: '1.2' });
      await row.getByRole('link', { name: 'Open the full record', exact: true }).click();
      await page.locator('[data-asset-record]').waitFor();
      await page.getByRole('heading', { level: 1 }).filter({ hasText: '1.2' }).waitFor();
      await frameKept(page);
    }),
  },

  // ---- Phase 4: Documents (DB-15; UD-21, UD-22, UD-42, UD-43) ---------------------------------------------------------
  { name: 'DB-15 Documents, demo: the register, each category Unknown while unclassified (R-016; G1-26)', path: WORKSPACE('documents'), displayObjects: displayObjectsFromApi(), arrange: demoWorkspace('documents') },
  {
    name: "DB-15 Documents, demo: a document's inspector (UD-22; R-017, R-018, R-019)",
    path: WORKSPACE('documents'),
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await demoWorkspace('documents')(page);
      await page.getByRole('button', { name: 'Show details', exact: true }).first().click();
      await page.locator('[data-document-inspector]').waitFor();
      await screenReady(page);
    },
  },
  {
    name: 'DB-15 Documents, demo: a row menu open (UD-22; US-DOCS-15 AC1)',
    path: WORKSPACE('documents'),
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await demoWorkspace('documents')(page);
      await openFirstRowMenu(page);
      await screenReady(page);
    },
  },
  {
    name: 'DB-15 Documents, demo: the filter panel open (UD-22)',
    path: WORKSPACE('documents'),
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await demoWorkspace('documents')(page);
      await page.getByRole('button', { name: 'Filters', exact: true }).click();
      await page.getByText('All stages', { exact: true }).first().waitFor();
      await screenReady(page);
    },
  },
  {
    name: 'UD-42 Documents, demo: the delete confirmation stating its effect before anything is removed (G4-39; 7.1.1-D4)',
    path: WORKSPACE('documents'),
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await demoWorkspace('documents')(page);
      await openDeleteConfirmation(page);
    },
  },
  {
    name: 'UD-43 Documents, demo: declaring a revision, the older document to choose (R-028)',
    path: WORKSPACE('documents'),
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await demoWorkspace('documents')(page);
      await openFirstRowMenu(page);
      await page.getByRole('menuitem', { name: 'Mark as a revision of another document', exact: true }).click();
      await page.getByRole('heading', { name: 'Which document does this file revise?' }).waitFor();
      await screenReady(page);
    },
  },
  {
    name: 'DB-15 Documents, demo: loading, its view held',
    path: WORKSPACE('documents'),
    displayObjects: displayObjectsFromApi(),
    arrange: workspaceLoading(demoOpened, 'documents'),
  },
  { name: 'DB-15 Documents, new project: no documents yet (UD-21 empty)', path: WORKSPACE('documents'), displayObjects: displayObjectsFromApi(), arrange: freshWorkspace('Render Documents Empty', 'documents') },
  {
    name: "UD-21 Documents, new project: the upload panel open, step 2's dropzone (?upload=open)",
    path: WORKSPACE('documents'),
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await freshWorkspace('Render Documents Upload', 'documents?upload=open')(page);
      await page.locator('.sov-dropzone').waitFor();
    },
  },
  {
    name: 'DB-15 Documents, new project: a file being read, Still reading in the footer (R-016; a TEST document queued)',
    path: WORKSPACE('documents'),
    displayObjects: displayObjectsFromApi(),
    arrange: withWorkspaceState('Render Documents Reading', 'document-being-read', 'documents', async (page) => {
      await page.getByRole('progressbar').first().waitFor();
    }),
  },
  {
    name: 'UD-42 Documents, new project: Delete states that 1 value will return to Unknown (G4-39; a TEST inference read from one document)',
    path: WORKSPACE('documents'),
    displayObjects: displayObjectsFromApi(),
    arrange: withWorkspaceState('Render Documents Delete', 'building-type-inference', 'documents', async (page) => {
      await openDeleteConfirmation(page);
      await page.locator('[data-delete-confirmation]').getByText('1 value will return to Unknown', { exact: true }).waitFor();
    }),
  },
  {
    name: 'Workspace frame, new project: the frame failing, the page still shown, the card saying so with Try again (rule 7)',
    path: WORKSPACE('documents'),
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      const id = await newProjectAt(page, 'Render Frame Failed', 'steps/2');
      await failRequests(page, workspaceFrame);
      await page.goto(`/projects/${id}/documents`);
      await page.getByRole('button', { name: 'Try again', exact: true }).first().waitFor();
      await screenReady(page);
    },
  },

  // ---- Phase 5: Generate, the landing and stored versions (R-109 to R-112, R-116; UD-06, UD-07, UD-47) ----------
  {
    name: 'UD-06 the landing, new project generated with nothing answered: every output "Not available yet" naming what is missing, each investment output named by its stage label, the head naming no stage (R-111; G10-11; G11-12)',
    path: '/projects/:projectId/proposal',
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await freshGenerated('Render Generated')(page);
    },
  },
  // The print route (R-118; docs/adr/0050; the exported PDF is this page printed): its four screens sit among the other
  // phase 5 screens, not side by side: four long printed pages checked at once starved the machine in the integrator's
  // first full run, and each ran past its time limit.
  { name: 'R-118 print route, demo: the stored proposal on paper, the demo line in the running header (G10-5, G10-13)', path: PRINT, displayObjects: displayObjectsFromApi(), arrange: demoPrint },
  {
    name: 'UD-07 generating, new project: Generate pressed on step 8, its POST held: the title and a progress bar with no number, no figure (R-109; rule 7)',
    path: '/projects/:projectId/proposal',
    displayObjects: displayObjectsFromApi(),
    arrange: generatePressed('Render Generating', async (page) => void (await holdRequests(page, proposalsGenerate, { releaseAfterMs: LOADING_MS })), '[data-generating]'),
  },
  {
    name: 'UD-47 generation failed, new project: Generate\'s POST failing, "could not be generated", Try again and Back to review, nothing disabled (R-109; rule 7)',
    path: '/projects/:projectId/proposal',
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await generatePressed('Render Generate Failed', (held) => failRequests(held, proposalsGenerate), '[data-generation-failed]')(page);
      await screenReady(page);
    },
  },
  {
    name: 'UD-06 the landing, new project: generated while a document is still being read, its head saying "Still reading 1 file. Your estimate will update when they finish." (rule 7; G7-18; a TEST document queued)',
    path: '/projects/:projectId/proposal',
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await signIn(page);
      const id = await createProject(page, testProject('Render Proposal Still Reading'));
      await writeTestState('document-being-read', id);
      await generateOnce(page, id);
      await openProjectScreen(page, id, 'proposal');
      await proposalSettled(page);
      await page.locator('[data-proposal-head]').getByText(/^Still reading 1 file\./u).waitFor();
      await screenReady(page);
    },
  },
  {
    name: 'The landing, new project: the stored versions failing to load, "could not be loaded", Try again and Back to review (rule 7)',
    path: '/projects/:projectId/proposal',
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      const id = await newProjectAt(page, 'Render Landing Failed', 'steps/2');
      await failRequests(page, proposalsList);
      await page.goto(`/projects/${id}/proposal`);
      await loadFailedShown(page);
    },
  },
  {
    name: 'UD-06 a stored version, demo: the latest, opened by its address, the versions rail marking it (R-110; US-PROPOSAL-11)',
    path: VERSION,
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await signIn(page);
      await openVersion(page, demoProjectId(), await storedSnapshot(page, demoProjectId()));
    },
  },
  {
    name: 'R-118 print route, new project with no documents: every output "Not available yet", naming what is missing (rule 7)',
    path: PRINT,
    displayObjects: displayObjectsFromApi(),
    arrange: freshPrint('Render Print Empty'),
  },
  {
    name: 'UD-06 an earlier version, new project generated twice: the notice that it is kept as generated, Open the latest version, the versions rail (R-110; G4-45)',
    path: VERSION,
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      const id = await newProjectAt(page, 'Render Earlier Version', 'steps/2');
      const first = await generateOnce(page, id);
      await generateOnce(page, id);
      await openVersion(page, id, first);
      await page.getByText('This is an earlier version of your preliminary proposal, kept as it was generated.', { exact: true }).waitFor();
    },
  },
  {
    name: 'UD-06 a version not in this project: "not in this project" inside the frame, Open the latest version (rule 13; never a dead end, rule 7)',
    path: VERSION,
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      const id = await newProjectAt(page, 'Render Version Missing', 'steps/2');
      await page.goto(`/projects/${id}/proposals/${NO_VERSION}`);
      await page.getByText('This version of the proposal is not in this project.', { exact: true }).waitFor({ timeout: 30_000 });
      await screenReady(page);
    },
  },
  {
    name: 'UD-06 a stored version, new project: loading, its view held',
    path: VERSION,
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      const id = await newProjectAt(page, 'Render Version Loading', 'steps/2');
      const snapshotId = await generateOnce(page, id);
      await holdRequests(page, proposalVersion, { releaseAfterMs: LOADING_LONG_PAGE_MS });
      await page.goto(`/projects/${id}/proposals/${snapshotId}`);
      await loadingShown(page);
    },
  },
  {
    name: 'R-118 Download PDF failing, new project: the export\'s POST failing, the failure said beside the button, which stays enabled (rule 7)',
    path: '/projects/:projectId/proposal',
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await freshGenerated('Render Download Failed')(page);
      await failRequests(page, proposalExport);
      await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
      await page.getByText('The PDF could not be prepared. Your proposal is unchanged. Try again.', { exact: true }).waitFor();
      await screenReady(page);
    },
  },

  // ---- Phase 5: Reports (DB-18; R-119) and Equipment's Export (R-066) ----------------------------------------------
  {
    name: 'R-118 print route, new project: while the print view loads, "Loading" and no figure',
    path: PRINT,
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      const id = await newProjectAt(page, 'Render Print Loading', 'steps/2');
      const snapshotId = await storedSnapshot(page, id);
      await holdRequests(page, printView, { releaseAfterMs: LOADING_LONG_PAGE_MS });
      await page.goto(`/projects/${id}/print/proposals/${snapshotId}`);
      await loadingShown(page);
    },
  },
  {
    name: 'DB-18 Reports, demo: the proposal the seed exported, by the demo account, its preview with the demo line on the cover (R-119; rule 10; 7.1.1-D6)',
    path: REPORTS,
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await demoWorkspace('reports')(page);
      await page.locator('[data-report-preview]').waitFor();
    },
  },
  {
    name: 'DB-18 Reports, new project: nothing generated yet, the way to the Proposal page (R-119; never a dead end, rule 7)',
    path: REPORTS,
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await freshReports('Render Reports Empty', 0)(page);
      await page.getByText('No document has been generated yet.', { exact: false }).waitFor();
    },
  },
  {
    name: 'DB-18 Reports, new project: two exported proposals, the second row previewed (R-119; R-118)',
    path: REPORTS,
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await freshReports('Render Reports Listed', 2)(page);
      const previews = page.getByRole('button', { name: 'Show preview' });
      await previews.nth(1).waitFor();
      const rows = page.locator('[data-report-row]');
      const second = await rows.nth(1).getAttribute('data-report-row');
      await previews.nth(1).click();
      await page.locator(`[data-report-preview="${second ?? ''}"]`).waitFor();
      await screenReady(page);
    },
  },
  {
    name: 'R-118 print route, demo: the print view failing, "This document could not be prepared." with Try again, the refusal marker set',
    path: PRINT,
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await signIn(page);
      const snapshotId = await storedSnapshot(page, demoProjectId());
      await failRequests(page, printView);
      await page.goto(`/projects/${demoProjectId()}/print/proposals/${snapshotId}`);
      await page.locator('html[data-print-ready="failed"]').waitFor({ state: 'attached', timeout: 30_000 });
      await loadFailedShown(page);
    },
  },
  {
    name: 'DB-18 Reports, new project: a search that matches no row, "No report matches" (R-119)',
    path: REPORTS,
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await freshReports('Render Reports No Match', 1)(page);
      await page.getByRole('searchbox', { name: 'Search reports' }).fill('TEST nothing matches');
      await page.getByText('No report matches the search or the category.', { exact: true }).waitFor({ timeout: 15_000 });
      await screenReady(page);
    },
  },
  {
    name: 'DB-18 Reports, new project: loading, its view held',
    path: REPORTS,
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      const id = await newProjectAt(page, 'Render Reports Loading', 'steps/2');
      await holdRequests(page, reportsList, { releaseAfterMs: LOADING_MS });
      await page.goto(`/projects/${id}/reports`);
      await loadingShown(page);
    },
  },
  {
    name: 'DB-18 Reports, new project: load failure, its view failing (the frame kept)',
    path: REPORTS,
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      const id = await newProjectAt(page, 'Render Reports Failed', 'steps/2');
      await failRequests(page, reportsList);
      await page.goto(`/projects/${id}/reports`);
      await loadFailedShown(page);
    },
  },
  {
    name: 'DB-17 Equipment, new project: Export failing, the failure said beside it, the control still enabled (R-066; US-ASSETS-11 AC6; rule 7)',
    path: WORKSPACE('equipment'),
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await freshWorkspace('Render Equipment Export Failed', 'equipment')(page);
      await failRequests(page, equipmentExport);
      await page.getByRole('button', { name: 'Export', exact: true }).click();
      await page.getByText('The list could not be exported. Try again.', { exact: true }).waitFor();
      await screenReady(page);
    },
  },

  // ---- Phase 6: the Metrics pages (docs/adr/0052) and their print route (R-121) ------------------------------------
  // The print route's screens sit among the pages' screens, not side by side (phase 5: long printed pages checked at once
  // starved the machine).
  {
    name: 'DB-02 Financial Overview, demo: the stored proposal\'s investment and indicators, each "Not available yet" naming what is missing, every chart its one line, the excluded systems listed (R-088; G1-31; G10-15; G10-7)',
    path: METRICS('financial-overview'),
    displayObjects: displayObjectsFromApi(),
    arrange: demoMetrics('financial-overview'),
  },
  {
    name: 'DB-02 Financial Overview, new project: no stored proposal, "Not available yet: a generated preliminary proposal" and Open the Proposal page (rule 7)',
    path: METRICS('financial-overview'),
    displayObjects: displayObjectsFromApi(),
    arrange: freshMetrics('Render Overview None', 'financial-overview'),
  },
  {
    name: 'DB-02 Financial Overview, new project generated with nothing answered: the investment names the datasets and the owner\'s inputs with their Adds, no stage named (G10-15; R-090)',
    path: METRICS('financial-overview'),
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await freshMetricsGenerated('Render Overview Generated', 'financial-overview')(page);
    },
  },
  {
    name: 'R-121 print route, demo: Payback Analysis on paper, the demo line in the running header, no button (G10-16; G1-32)',
    path: METRICS_PRINT,
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await signIn(page);
      await openMetricsPrint(page, demoProjectId(), 'payback');
    },
  },
  {
    name: 'DB-02 Financial Overview, new project: an earlier version named by the address, the notice and Open the latest version (US-PROPOSAL-11 AC3; G9-8)',
    path: METRICS('financial-overview'),
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      const id = await newProjectAt(page, 'Render Overview Earlier', 'steps/2');
      const first = await generateOnce(page, id);
      await generateOnce(page, id);
      await openMetrics(page, id, `financial-overview?snapshot=${first}`, 'version');
      await page.locator('[data-earlier-version]').waitFor();
    },
  },
  {
    name: 'DB-02 Financial Overview, new project: a version not in this project named by the address, "not in this project" and Open the latest version (rule 13; never a dead end, rule 7)',
    path: METRICS('financial-overview'),
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      const id = await newProjectAt(page, 'Render Overview Missing', 'steps/2');
      await openWorkspaceScreen(page, id, `metrics/financial-overview?snapshot=${NO_VERSION}`);
      await page.locator('[data-metrics-state="not-found"]').waitFor({ timeout: 30_000 });
      await screenReady(page);
    },
  },
  {
    name: 'DB-02 Financial Overview, new project generated: loading, its view held (no figure)',
    path: METRICS('financial-overview'),
    displayObjects: displayObjectsFromApi(),
    arrange: metricsLoading('Render Overview Loading', 'financial-overview', true),
  },
  {
    name: 'DB-02 Financial Overview, new project: load failure, its view failing (the frame kept)',
    path: METRICS('financial-overview'),
    displayObjects: displayObjectsFromApi(),
    arrange: metricsFailed('Render Overview Failed', 'financial-overview'),
  },
  {
    name: 'DB-13 CAPEX Breakdown, demo: Selected systems (the bound count of the include decisions), Total CAPEX, the systems as the stored proposal used them with Fire Safety\'s sentence, the investment by system its one line, Download Proposal (R-089; G1-31; rule 11)',
    path: METRICS('capex'),
    displayObjects: displayObjectsFromApi(),
    arrange: demoMetrics('capex'),
  },
  {
    name: 'DB-13 CAPEX Breakdown, new project: no stored proposal, the served line and Open the Proposal page (rule 7)',
    path: METRICS('capex'),
    displayObjects: displayObjectsFromApi(),
    arrange: freshMetrics('Render Capex None', 'capex'),
  },
  {
    name: 'DB-13 CAPEX Breakdown, new project generated with nothing answered: every figure "Not available yet" naming what is missing (G10-15; R-087)',
    path: METRICS('capex'),
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await freshMetricsGenerated('Render Capex Generated', 'capex')(page);
    },
  },
  {
    name: 'DB-13 CAPEX Breakdown, new project: loading, its view held',
    path: METRICS('capex'),
    displayObjects: displayObjectsFromApi(),
    arrange: metricsLoading('Render Capex Loading', 'capex', false),
  },
  {
    name: 'DB-13 CAPEX Breakdown, new project: load failure, its view failing',
    path: METRICS('capex'),
    displayObjects: displayObjectsFromApi(),
    arrange: metricsFailed('Render Capex Failed', 'capex'),
  },
  {
    name: 'R-121 print route, new project with no documents: Lifecycle Analysis on paper, every figure and chart "Not available yet" naming what is missing, no demo line',
    path: METRICS_PRINT,
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      const id = await newProjectAt(page, 'Render Lifecycle Print', 'steps/2');
      await openMetricsPrint(page, id, 'lifecycle');
    },
  },
  {
    name: 'DB-12 OPEX & Savings, demo (an existing building): the building\'s operating cost now, the energy cost waiting for bills with Upload a document, maintenance, staff and other Unknown, a row per included system (R-095; US-FIN-13 AC8; US-FIN-14 AC1; G10-7)',
    path: METRICS('opex'),
    displayObjects: displayObjectsFromApi(),
    arrange: demoMetrics('opex', 'opex'),
  },
  {
    name: 'DB-12 OPEX & Savings, new project (new construction): the energy cost naming what an estimate lacks with its Adds, no upload, and "by system" reading "Not available yet: the systems in scope" with the way to choose them while none is included (US-FIN-13 AC9; G7-24)',
    path: METRICS('opex'),
    displayObjects: displayObjectsFromApi(),
    arrange: freshMetrics('Render Opex New', 'opex', 'opex'),
  },
  {
    name: 'DB-12 OPEX & Savings, new project: loading, its view held',
    path: METRICS('opex'),
    displayObjects: displayObjectsFromApi(),
    arrange: metricsLoading('Render Opex Loading', 'opex', false),
  },
  {
    name: 'DB-12 OPEX & Savings, new project: load failure, its view failing',
    path: METRICS('opex'),
    displayObjects: displayObjectsFromApi(),
    arrange: metricsFailed('Render Opex Failed', 'opex'),
  },
  {
    name: 'DB-21 Payback Analysis, demo: the investment, savings and payback, both charts and the environmental figures "Not available yet" naming what is missing, Export Report (R-096; R-101 to R-103 "Until decided")',
    path: METRICS('payback'),
    displayObjects: displayObjectsFromApi(),
    arrange: demoMetrics('payback'),
  },
  {
    name: 'DB-21 Payback Analysis, new project: no stored proposal, the served line and Open the Proposal page, no Export Report (rule 7)',
    path: METRICS('payback'),
    displayObjects: displayObjectsFromApi(),
    arrange: freshMetrics('Render Payback None', 'payback'),
  },
  {
    name: 'DB-21 Payback Analysis, new project generated with nothing answered (G10-15; G1-31)',
    path: METRICS('payback'),
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await freshMetricsGenerated('Render Payback Generated', 'payback')(page);
    },
  },
  {
    name: 'R-121 print route, new project: Payback Analysis while its print view loads, "Loading" and no figure',
    path: METRICS_PRINT,
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      const id = await newProjectAt(page, 'Render Payback Print Loading', 'steps/2');
      const snapshotId = await storedSnapshot(page, id);
      await holdRequests(page, metricsPrintView, { releaseAfterMs: LOADING_LONG_PAGE_MS });
      await page.goto(`/projects/${id}/print/metrics/payback/${snapshotId}`);
      await loadingShown(page);
    },
  },
  {
    name: 'DB-21 Payback Analysis, new project: loading, its view held',
    path: METRICS('payback'),
    displayObjects: displayObjectsFromApi(),
    arrange: metricsLoading('Render Payback Loading', 'payback', true),
  },
  {
    name: 'DB-21 Payback Analysis, new project: load failure, its view failing',
    path: METRICS('payback'),
    displayObjects: displayObjectsFromApi(),
    arrange: metricsFailed('Render Payback Failed', 'payback'),
  },
  {
    name: 'DB-21 Payback Analysis, new project: Export Report failing, the failure said beside it, the button still enabled (R-121; rule 7)',
    path: METRICS('payback'),
    displayObjects: displayObjectsFromApi(),
    arrange: exportReportFailed('Render Payback Export Failed', 'payback'),
  },
  {
    name: 'DB-22 Lifecycle Analysis, demo: the analysis period, the lifecycle figures, the three charts, KEY INSIGHTS and EQUIPMENT LIFECYCLE "Not available yet" naming what is missing, Export Report (R-097; R-105 "Until decided")',
    path: METRICS('lifecycle'),
    displayObjects: displayObjectsFromApi(),
    arrange: demoMetrics('lifecycle'),
  },
  {
    name: 'DB-22 Lifecycle Analysis, new project: no stored proposal, the served line and Open the Proposal page (rule 7)',
    path: METRICS('lifecycle'),
    displayObjects: displayObjectsFromApi(),
    arrange: freshMetrics('Render Lifecycle None', 'lifecycle'),
  },
  {
    name: 'R-121 print route, demo: Lifecycle Analysis on paper, the demo line in the running header, no button (G10-16; G1-32)',
    path: METRICS_PRINT,
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await signIn(page);
      await openMetricsPrint(page, demoProjectId(), 'lifecycle');
    },
  },
  {
    name: 'DB-22 Lifecycle Analysis, new project generated with nothing answered (G1-31)',
    path: METRICS('lifecycle'),
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await freshMetricsGenerated('Render Lifecycle Generated', 'lifecycle')(page);
    },
  },
  {
    name: 'DB-22 Lifecycle Analysis, new project: loading, its view held',
    path: METRICS('lifecycle'),
    displayObjects: displayObjectsFromApi(),
    arrange: metricsLoading('Render Lifecycle Loading', 'lifecycle', true),
  },
  {
    name: 'DB-22 Lifecycle Analysis, new project: load failure, its view failing',
    path: METRICS('lifecycle'),
    displayObjects: displayObjectsFromApi(),
    arrange: metricsFailed('Render Lifecycle Failed', 'lifecycle'),
  },
  {
    name: 'DB-22 Lifecycle Analysis, new project: Export Report failing, the failure said beside it, the button still enabled (R-121; rule 7)',
    path: METRICS('lifecycle'),
    displayObjects: displayObjectsFromApi(),
    arrange: exportReportFailed('Render Lifecycle Export Failed', 'lifecycle'),
  },
  {
    name: 'R-121 print route, new project: Payback Analysis on paper, no demo line',
    path: METRICS_PRINT,
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      const id = await newProjectAt(page, 'Render Payback Print', 'steps/2');
      await openMetricsPrint(page, id, 'payback');
    },
  },
  {
    name: 'R-121 print route, demo: the print view failing, "This document could not be prepared." with Try again, the refusal marker set',
    path: METRICS_PRINT,
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await signIn(page);
      await failRequests(page, metricsPrintView);
      await openMetricsPrint(page, demoProjectId(), 'lifecycle', 'failed');
      await loadFailedShown(page);
    },
  },
  // ---- Phase 7: the development-only admin area (docs/adr/0053) and the landings by role ------------------
  {
    name: 'UD-39 Accounts and roles, the development admin: every account with its roles, the role events, projects by id with the demo line on the demo\'s rows only, no processor chosen, no control (R-134; R-143, R-154 "Until decided"; G10-10)',
    path: ADMIN.accounts,
    displayObjects: displayObjectsFromApi(),
    arrange: asAdmin,
  },
  {
    name: 'entry (/): the development admin, who holds sovitech_admin and not owner, lands on UD-39 (ADR 0053 decision 4)',
    path: '/',
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await signInAs(page, 'admin');
      await page.waitForURL((url) => url.pathname === ADMIN.accounts, { timeout: 30_000 });
      await adminLoaded(page);
    },
  },
  { name: 'UD-39 Accounts and roles: loading, its view held', path: ADMIN.accounts, displayObjects: displayObjectsFromApi(), arrange: adminLoading(ADMIN.accounts) },
  { name: 'UD-39 Accounts and roles: load failure, its view failing', path: ADMIN.accounts, displayObjects: displayObjectsFromApi(), arrange: adminFailed(ADMIN.accounts) },
  {
    name: 'UD-39 Accounts and roles, the development engineer: the not-found page, nothing of the admin area (ADR 0053 decision 5; G10-3\'s reading in the browser)',
    path: ADMIN.accounts,
    displayObjects: displayObjectsFromApi(),
    arrange: refusedAs('engineer'),
  },
  {
    name: 'UD-40 Datasets, the development admin: each dataset the gates wait for, "No version received", "No approval record", what waits for it, no control (R-150 "Until decided"; G1-33)',
    path: ADMIN.datasets,
    displayObjects: displayObjectsFromApi(),
    arrange: asAdmin,
  },
  { name: 'UD-40 Datasets: loading, its view held', path: ADMIN.datasets, displayObjects: displayObjectsFromApi(), arrange: adminLoading(ADMIN.datasets) },
  { name: 'UD-40 Datasets: load failure, its view failing', path: ADMIN.datasets, displayObjects: displayObjectsFromApi(), arrange: adminFailed(ADMIN.datasets) },
  {
    name: 'UD-40 Datasets, the development commercial reviewer: the not-found page, nothing of the admin area (ADR 0053 decision 5)',
    path: ADMIN.datasets,
    displayObjects: displayObjectsFromApi(),
    arrange: refusedAs('commercialReviewer'),
  },
  {
    name: 'UD-41 Guardrail events, the development admin: counts per type for each project and in all, "By release: not counted yet", each speed metric beside its truth metric ("not counted yet", "Target not set"), the confidence wording unchanged, the erasure log, the demo line on the demo\'s rows only, no control (R-151; R-152, R-155 "Until decided"; GS-2; G3-26; G13-15)',
    path: ADMIN.guardrailEvents,
    displayObjects: displayObjectsFromApi(),
    arrange: asAdmin,
  },
  { name: 'UD-41 Guardrail events: loading, its view held', path: ADMIN.guardrailEvents, displayObjects: displayObjectsFromApi(), arrange: adminLoading(ADMIN.guardrailEvents) },
  { name: 'UD-41 Guardrail events: load failure, its view failing', path: ADMIN.guardrailEvents, displayObjects: displayObjectsFromApi(), arrange: adminFailed(ADMIN.guardrailEvents) },
  {
    name: 'UD-41 Guardrail events, the development owner: the not-found page, nothing of the admin area (ADR 0053 decision 5)',
    path: ADMIN.guardrailEvents,
    displayObjects: displayObjectsFromApi(),
    arrange: refusedAs('owner'),
  },
  {
    name: 'UD-37 project list, the development engineer: no project of theirs, the engineer\'s role line ("The engineer review queue is not built …"), no "New project" (R-128 "Until decided"; ADR 0053 decision 4)',
    path: '/projects',
    displayObjects: displayObjectsFromApi(),
    arrange: projectListAs('engineer'),
  },
  {
    name: 'UD-37 project list, the development commercial reviewer: the reviewer\'s role line, no "New project" (R-129 "Until decided"; ADR 0053 decision 4)',
    path: '/projects',
    displayObjects: displayObjectsFromApi(),
    arrange: projectListAs('commercialReviewer'),
  },
  {
    name: 'UD-37 project list, the development admin: the admin\'s role line and "Open the admin area", no "New project" (ADR 0053 decision 4)',
    path: '/projects',
    displayObjects: displayObjectsFromApi(),
    arrange: async (page) => {
      await projectListAs('admin')(page);
      await page.locator('[data-open-admin]').waitFor();
    },
  },
];
