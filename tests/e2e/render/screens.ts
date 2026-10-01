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
 */
import type { Page } from '@playwright/test';
import { displayObjectsFromApi, type ApiDisplayObjectSource } from './api-display-objects';
import { REPO_ROOT } from '../setup/paths';
import { writeTestState, type TestState } from '../support/control';
import { failRequests, holdRequests, projectList, proposalView, stepView, uploadChunk } from '../support/network';
import { createProject, demoProjectId, newProjectAt, openProjectScreen, pressPrimary, screenReady, signIn, signedInAt, skipEverything, testProject } from '../support/wizard';

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
];
