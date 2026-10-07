/**
 * Phase 7 flow (m): GS-1's rendered half (prompt 3 section 10, phase 7 exit: "GS-1 passes end to end on the demo: zero
 * `question_for_known_field` events and the demo line on every screen, with the render test, axe and reserved-term scan
 * on every screen"; guardrails section 7, GS-1: "The demo fixture runs end to end | Zero `question_for_known_field`
 * events. The demo banner is on every screen."; section 4; rule 10, "Demo data"). Its API half is the case file
 * tests/guardrails/GS-1.test.ts.
 *
 * The demo project, as the development owner (a member of the demo, PRD R-136 interim), on every project path of the
 * app's route table (`APP_PATHS`, apps/web/src/routes.tsx): the project list, steps 1 to 8 with the extracted values
 * (UD-45), Generate and the proposal landing, every workspace page through the sidebar (System Scope, Topology, Zones,
 * Equipment, Documents, Reports and the five Metrics pages), the asset record, a stored version, the printed proposal
 * and both printed Metrics pages. Each screen passes `checkScreen`: the render test with its reserved-term scan, axe
 * (WCAG 2.2 AA) and the demo line. Then, through the stack's TEST-only control route, the demo holds no
 * `question_for_known_field` and no `confirmation_budget_exceeded` event (guardrails section 8; rules 5 and 6).
 *
 * The flow fails when a project path of `APP_PATHS` is not reached in it (the test beside it compares the flow's list
 * with the route table, and the flow checks each path was reached on a checked screen), so a project page added later
 * is not left out of GS-1.
 *
 * What the demo shows with no API key and every gate closed (the owner's answers in force): step 3's facts Unknown, the
 * models "Not analysed", every output and Metrics figure "Not available yet" naming what is missing, no zone and no
 * equipment. The demo holds no asset (no AI run; `ifc-values` closed), so its asset record is read in the one state the
 * demo can show at that path: an asset its register does not list ("This equipment is not in this project's
 * register."), in the workspace frame with the demo line. Generate stores one more version on the demo, as every
 * Generate does; nothing else is written.
 */
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { displayObjectsFromApi } from '../render/api-display-objects';
import { prepareRenderCheck } from '../render/render-check';
import { REPO_ROOT } from '../setup/paths';
import { readGuardrailEvents } from '../support/control';
import { demoProjectId, pressPrimary, screenReady, signIn, waitForStep } from '../support/wizard';
import { followSidebar, type WorkspacePageName } from '../support/workspace';
import { checkScreen, type CheckedScreens } from './screen-checks';

/** The app's route table, read from apps/web/src/routes.tsx as text (as the render spec reads it). */
function appPaths(): string[] {
  const source = readFileSync(`${REPO_ROOT}/apps/web/src/routes.tsx`, 'utf8');
  const table = /export const APP_PATHS = \[(?<body>[^\]]*)\]/u.exec(source)?.groups?.['body'];
  if (table === undefined) throw new Error('apps/web/src/routes.tsx has no APP_PATHS table');
  return [...table.matchAll(/'(?<path>[^']+)'/gu)].map((match) => match.groups?.['path'] ?? '');
}

/** A project's screens: every path of the route table under a project. */
const PROJECT_PATH = /^\/projects\/:projectId\//u;

/** Every project path this flow reaches on the demo, with how (the test beside the flow keeps it equal to the route table's). */
const REACHED: Readonly<Record<string, string>> = {
  '/projects/:projectId/steps/:step': 'steps 1 to 8, by Next and Continue',
  '/projects/:projectId/extracted': "step 3's View all extracted data",
  '/projects/:projectId/proposal': 'Generate Proposal, the landing',
  '/projects/:projectId/system-scope': 'the sidebar',
  '/projects/:projectId/topology': 'the sidebar',
  '/projects/:projectId/zones': 'the sidebar',
  '/projects/:projectId/equipment': 'the sidebar',
  '/projects/:projectId/equipment/:assetId': 'by its address: an asset the demo register does not list',
  '/projects/:projectId/documents': 'the sidebar',
  '/projects/:projectId/proposals/:snapshotId': 'the latest stored version, by its address',
  '/projects/:projectId/reports': 'the sidebar',
  '/projects/:projectId/print/proposals/:snapshotId': 'the latest stored version printed',
  '/projects/:projectId/metrics/financial-overview': 'the sidebar',
  '/projects/:projectId/metrics/capex': 'the sidebar',
  '/projects/:projectId/metrics/opex': 'the sidebar',
  '/projects/:projectId/metrics/payback': 'the sidebar',
  '/projects/:projectId/metrics/lifecycle': 'the sidebar',
  '/projects/:projectId/print/metrics/:page/:snapshotId': 'Payback Analysis and Lifecycle Analysis printed',
};

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

/** The route pattern a demo URL's path is on, if any. */
function patternOf(pathname: string, demo: string): string | undefined {
  return Object.keys(REACHED).find((pattern) => {
    const source = pattern
      .replace(':projectId', demo)
      .replace(':step', '[1-8]')
      .replace(':assetId', UUID)
      .replace(':snapshotId', UUID)
      .replace(':page', '(?:payback|lifecycle)');
    return new RegExp(`^${source}$`, 'u').test(pathname);
  });
}

/** The latest stored version of the demo (`proposals.list`), as the signed-in owner reads it. */
async function latestVersion(page: Page, projectId: string): Promise<string> {
  const listed = await page.request.get(`/api/projects/${projectId}/proposals`);
  expect(listed.ok(), 'proposals.list').toBe(true);
  const latest = ((await listed.json()) as { view: { versions: Array<{ snapshotId: string }> } }).view.versions[0]?.snapshotId;
  if (latest === undefined) throw new Error('the demo holds no stored version after Generate');
  return latest;
}

/** Opens a print route and waits for the printer's ready marker and the render marker. */
async function openPrinted(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.locator('html[data-print-ready="true"]').waitFor({ state: 'attached', timeout: 30_000 });
  await screenReady(page);
}

test('GS-1 (rendered half): the flow names every project path of the route table, as APP_PATHS lists them', () => {
  const projectPaths = appPaths().filter((path) => PROJECT_PATH.test(path));
  expect(projectPaths.length).toBeGreaterThan(0);
  expect(projectPaths.filter((path) => !(path in REACHED)), 'a project path the GS-1 flow does not reach').toEqual([]);
  expect(Object.keys(REACHED).filter((path) => !projectPaths.includes(path)), 'a path the flow names that the route table does not').toEqual([]);
});

test('GS-1 (rendered half) · section 4 · rules 5, 6 and 10 · R-044 · R-137 · R-139 · R-142 · US-REVIEW-03 AC1 · AC7: the demo end to end, every project path of the route table, the render test, axe, the reserved-term scan and the demo line on every screen, then no question_for_known_field and no confirmation_budget_exceeded event (phase 7 flow (m))', async ({
  page,
}) => {
  test.setTimeout(12 * 60_000);
  const demo = demoProjectId();
  const checked: CheckedScreens = [];
  const reached = new Set<string>();
  /** checkScreen, recording the route pattern the screen is on. */
  const check = async (label: string) => {
    await checkScreen(page, { demo: true, label: `m-${label}` }, checked);
    const pattern = patternOf(new URL(page.url()).pathname, demo);
    expect(pattern, `${label}: a project path of the route table`).toBeDefined();
    if (pattern !== undefined) reached.add(pattern);
  };
  await prepareRenderCheck(page, { displayObjects: displayObjectsFromApi() });

  // The project list: the demo's row and its line only.
  await signIn(page);
  await checkScreen(page, { demo: 'list', label: 'm-UD-37-projects' }, checked);
  await page.getByRole('link', { name: /Demo Hotel Bucharest/u }).click();

  // Steps 1 to 8 and the extracted values (UD-45).
  await waitForStep(page, 1);
  await check('OB-1');
  await pressPrimary(page, 'Next', 2);
  await check('OB-2');
  await pressPrimary(page, 'Continue', 3);
  await check('OB-3');
  await page.getByRole('link', { name: 'View all extracted data' }).or(page.getByRole('button', { name: 'View all extracted data' })).click();
  await page.waitForURL(new RegExp(`/projects/${demo}/extracted$`, 'u'));
  await check('UD-45');
  await page.getByRole('link', { name: 'Back to your building' }).or(page.getByRole('button', { name: 'Back to your building' })).click();
  await waitForStep(page, 3);
  await pressPrimary(page, 'Continue', 4);
  for (const step of [4, 5, 6, 7] as const) {
    await check(`OB-${String(step)}`);
    await pressPrimary(page, 'Continue', step + 1);
  }
  await check('OB-8');

  // Generate: the proposal landing in the workspace frame, then every page of the sidebar.
  await pressPrimary(page, 'Generate Proposal', 'proposal');
  await page.getByRole('navigation', { name: 'Project pages' }).waitFor();
  await screenReady(page);
  await check('UD-06-landing');
  const sidebar: readonly WorkspacePageName[] = [
    'System Scope',
    'Topology',
    'Zones',
    'Equipment',
    'Documents',
    'Reports',
    'Financial Overview',
    'CAPEX Breakdown',
    'OPEX & Savings',
    'Payback Analysis',
    'Lifecycle Cost',
  ];
  for (const name of sidebar) {
    await followSidebar(page, name);
    await check(name.replace(/[^A-Za-z]+/gu, '-'));
  }

  // The asset record: the demo lists no asset, so an asset its register does not list (rule 13: never another's).
  await page.goto(`/projects/${demo}/equipment/${randomUUID()}`);
  await page.getByText("This equipment is not in this project's register.", { exact: true }).waitFor();
  await screenReady(page);
  await check('UD-08-not-listed');

  // A stored version by its address, then printed; and the two printed Metrics pages (R-118; R-121).
  const snapshotId = await latestVersion(page, demo);
  await page.goto(`/projects/${demo}/proposals/${snapshotId}`);
  await page.locator(`[data-proposal-snapshot="${snapshotId}"] [data-proposal-head]`).waitFor({ timeout: 30_000 });
  await screenReady(page);
  await check('UD-06-version');
  await openPrinted(page, `/projects/${demo}/print/proposals/${snapshotId}`);
  await check('R-118-print');
  for (const printed of ['payback', 'lifecycle'] as const) {
    await openPrinted(page, `/projects/${demo}/print/metrics/${printed}/${snapshotId}`);
    await check(`R-121-print-${printed}`);
  }

  // Every project path of the route table was reached on a checked screen.
  expect(Object.keys(REACHED).filter((pattern) => !reached.has(pattern)), 'a project path GS-1 did not reach').toEqual([]);
  expect(checked).toHaveLength(27);

  // GS-1's event half: the owner was asked nothing the app knows, and no confirmation went over the budget.
  expect(await readGuardrailEvents(demo, 'question_for_known_field')).toEqual([]);
  expect(await readGuardrailEvents(demo, 'confirmation_budget_exceeded')).toEqual([]);
});
