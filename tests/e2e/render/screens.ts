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
 */
import type { Page } from '@playwright/test';
import { ruleLineById, statusLineById } from '@sovitech/registry';
import { displayObjectsFromApi, type ApiDisplayObjectSource } from './api-display-objects';
import { REPO_ROOT } from '../setup/paths';
import { writeTestState, type TestState } from '../support/control';
import { failRequests, holdRequests, projectList, proposalView, stepView, uploadChunk, workspaceFrame, workspaceView } from '../support/network';
import { createProject, demoProjectId, newProjectAt, openProjectScreen, pressPrimary, screenReady, signIn, signedInAt, skipEverything, testProject } from '../support/wizard';
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
  { name: 'UD-07 proposal page, demo: each output not available yet', path: '/projects/:projectId/proposal', displayObjects: displayObjectsFromApi(), arrange: demo('proposal') },

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
  { name: 'UD-07 proposal page, new project', path: '/projects/:projectId/proposal', displayObjects: displayObjectsFromApi(), arrange: fresh('Render Proposal', 'proposal') },

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
];
