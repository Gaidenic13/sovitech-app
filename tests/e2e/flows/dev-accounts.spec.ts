/**
 * Phase 7 flow (l) (prompt 3 section 10, phase 7; docs/build-log.md, phase 7 plan, "the integrator"; docs/adr/0053
 * decisions 3 to 5; ADR 0038 decision 10): the four development accounts of the e2e stack, each synthetic and holding
 * exactly one app role, sign in through the sign-in page (UD-36) and land where their role sends them.
 *
 * - The development admin lands on the admin area (UD-39) and reads its three pages (UD-39 to UD-41) through the area's
 *   navigation: every account with its roles and every role event, projects by id with the demo line on the demo's
 *   rows only (rule 10; G10-10), no processor chosen (R-143 "Until decided"); each dataset the gates wait for with "No
 *   version received" and "No approval record" (R-150 "Until decided"; G1-33); the counts by type, "By release: not
 *   counted yet", each speed metric beside its truth metric reading "not counted yet" or a count, every target "Target
 *   not set" (D-34's interim; GS-2), the confidence wording unchanged with the threshold not set (R-152 "Until decided";
 *   G3-26) and the erasure log. No page holds a control (prompt 3 5.4; guardrails section 10, "Metrics prompt a review,
 *   never an edit").
 * - The development engineer and the development commercial reviewer land on the project list: no project of theirs
 *   (neither is a member of the demo), their role's line, no "New project" (R-136; ADR 0053 decision 4). An admin page
 *   reads as the app's not-found page for them, with no admin request sent, and the API refuses its route (403
 *   `admin_only`; ADR 0053 decision 5). No engineer page exists: PRD R-128 "Until decided" (D-16).
 * - The development owner's project list is unchanged: the demo row with its demo line, "New project", no role line.
 *   The admin area is not theirs either.
 *
 * Every screen reached passes the render test with its reserved-term scan, axe (WCAG 2.2 AA) and the demo line rule
 * (screen-checks.ts). The flow writes nothing.
 */
import { expect, test, type Page } from '@playwright/test';
import { displayObjectsFromApi } from '../render/api-display-objects';
import { prepareRenderCheck } from '../render/render-check';
import { readStackState } from '../setup/paths';
import { DEV_ACCOUNTS, screenReady, signInAs } from '../support/wizard';
import { DEMO_LINE, checkScreen, type CheckedScreens } from './screen-checks';

/** Every element that would let a reader change something (prompt 3 5.4: no admin page creates or changes anything). */
const CONTROLS = 'button, a, input, select, textarea, form, [role="button"], [role="switch"], [role="checkbox"], [role="radio"], [role="menuitem"], [contenteditable="true"]';

/** The admin page's own column: its title, its sections, its tables. */
const adminPage = (page: Page) => page.locator('article[aria-labelledby="admin-page-title"]');

const ADMIN_PATHS = ['/admin/accounts', '/admin/datasets', '/admin/guardrail-events'] as const;

/** Signs out through the header menu (UD-16) and waits for the sign-in page. */
async function signOut(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.waitForURL((url) => url.pathname === '/sign-in');
  await screenReady(page);
}

/** An admin page as the development admin sees it: loaded, titled, read-only. */
async function adminPageHolds(page: Page, title: string): Promise<void> {
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await expect(page.locator('[data-admin-section]').first()).toBeVisible();
  await expect(adminPage(page).locator(CONTROLS), 'no control on an admin page').toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Admin area' }).getByRole('link')).toHaveText(['Accounts and roles', 'Datasets', 'Guardrail events']);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveTitle(`${title} – SOVITECH`);
}

/**
 * An account that may not read the admin area: each admin page reads as the app's not-found page, titled "Page not
 * found", with no admin request sent; and the API refuses the route with 403 `admin_only`.
 */
async function adminAreaRefused(page: Page, label: string, checked: CheckedScreens): Promise<void> {
  const adminRequests: string[] = [];
  const watch = (request: { url(): string }) => {
    if (new URL(request.url()).pathname.startsWith('/api/admin/')) adminRequests.push(request.url());
  };
  page.on('request', watch);
  for (const path of ADMIN_PATHS) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: 'This page does not exist.' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Admin area' })).toHaveCount(0);
    await expect(page.getByText('Development only.', { exact: false })).toHaveCount(0);
    await expect(page).toHaveTitle('Page not found – SOVITECH');
    await checkScreen(page, { demo: false, label: `l-${label}-${path.replaceAll('/', '-')}` }, checked);
  }
  page.off('request', watch);
  expect(adminRequests, `${label}: no admin request is sent`).toEqual([]);
  for (const path of ['/api/admin/accounts', '/api/admin/datasets', '/api/admin/guardrail-events']) {
    const response = await page.request.get(path);
    expect(response.status(), `${label}: ${path}`).toBe(403);
    expect(((await response.json()) as { code?: string }).code, `${label}: ${path}`).toBe('admin_only');
  }
}

/** The project list of an account without `owner`: its role's line, no project, no "New project". */
async function roleListHolds(page: Page, role: 'sovitech_engineer' | 'sovitech_commercial_reviewer', line: string): Promise<void> {
  await expect(page).toHaveURL(/\/projects$/u);
  await expect(page.locator('[data-role-lines] [data-role-line]')).toHaveCount(1);
  await expect(page.locator(`[data-role-line="${role}"]`)).toHaveText(line);
  await expect(page.getByRole('link', { name: 'New project' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'New project' })).toHaveCount(0);
  await expect(page.locator('[data-open-admin]')).toHaveCount(0);
  await expect(page.locator(`a[href^="/projects/${readStackState().demoProjectId}/"]`)).toHaveCount(0);
  await expect(page.getByText(DEMO_LINE, { exact: true })).toHaveCount(0);
}

test('ADR 0038 decision 10 · ADR 0053 decisions 3 to 5 · UD-36 · UD-37 · UD-39 · UD-40 · UD-41 · R-133 · R-134 · R-136 · R-143 · R-150 · R-151 · R-152 · R-154 · G1-33 · G3-26 · GS-2 · G10-10 · rules 1, 3, 10 and 13: the four development accounts sign in and land by role; the admin reads the three admin pages, with no control; the others reach no admin page (phase 7 flow (l))', async ({
  page,
}) => {
  test.setTimeout(8 * 60_000);
  const checked: CheckedScreens = [];
  await prepareRenderCheck(page, { displayObjects: displayObjectsFromApi() });

  // UD-36: the four development accounts, each named as one, each with its one role.
  await page.goto('/sign-in');
  await screenReady(page);
  for (const name of Object.values(DEV_ACCOUNTS)) await expect(page.getByRole('button', { name })).toHaveCount(1);
  await expect(page.getByRole('list').getByRole('button')).toHaveCount(4);
  await checkScreen(page, { demo: false, label: 'l-UD-36-four-accounts' }, checked);

  // ---- The development admin: lands on UD-39 (ADR 0053 decision 4) -----------------------------------------------
  await signInAs(page, 'admin');
  await expect(page).toHaveURL(/\/admin\/accounts$/u);
  await adminPageHolds(page, 'Accounts and roles');
  const accounts = page.getByRole('table', { name: 'Accounts' });
  for (const name of ['Development owner', 'Development engineer', 'Development commercial reviewer', 'Development admin']) {
    const row = accounts.getByRole('row').filter({ hasText: name });
    await expect(row, name).toHaveCount(1);
    await expect(row.getByText('Development account', { exact: true }), `${name} is marked a development account`).toHaveCount(1);
  }
  await expect(page.locator('[data-processors="none_chosen"]')).toHaveText('No processor is chosen. No owner document or excerpt is sent to any external service.');
  // The demo's row of the project table carries the demo line, and no other row does (rule 10; G10-10).
  const projects = page.getByRole('table', { name: 'Projects' });
  await expect(projects.getByRole('row').filter({ hasText: readStackState().demoProjectId }).getByText(DEMO_LINE, { exact: true })).toHaveCount(1);
  await expect(projects.getByText(DEMO_LINE, { exact: true })).toHaveCount(1);
  await checkScreen(page, { demo: 'rows', label: 'l-UD-39-admin' }, checked);

  // UD-40, through the area's navigation.
  await page.getByRole('navigation', { name: 'Admin area' }).getByRole('link', { name: 'Datasets' }).click();
  await page.waitForURL(/\/admin\/datasets$/u);
  await adminPageHolds(page, 'Datasets');
  const datasets = page.getByRole('table').first();
  const rows = datasets.locator('tbody tr');
  expect(await rows.count(), 'the gates wait for datasets').toBeGreaterThan(0);
  for (const row of await rows.all()) {
    await expect(row.getByText('No approval record', { exact: true })).toHaveCount(1);
    await expect(row.getByText('No version received', { exact: true })).toHaveCount(1);
  }
  await checkScreen(page, { demo: 'rows', label: 'l-UD-40-admin' }, checked);

  // UD-41.
  await page.getByRole('navigation', { name: 'Admin area' }).getByRole('link', { name: 'Guardrail events' }).click();
  await page.waitForURL(/\/admin\/guardrail-events$/u);
  await adminPageHolds(page, 'Guardrail events');
  await expect(page.getByText('By release: not counted yet. No release is recorded with the events.', { exact: true })).toBeVisible();
  await expect(page.getByText('not counted yet', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Target not set', { exact: true }).first()).toBeVisible();
  await expect(page.locator('[data-admin-calibration]')).toContainText('Likely, unchanged');
  await expect(page.locator('[data-admin-calibration]')).not.toContainText('now reads');
  await expect(page.locator('[data-admin-section]')).toHaveCount(4);
  await checkScreen(page, { demo: 'rows', label: 'l-UD-41-admin' }, checked);

  // The admin's project list: the admin's line and the way back to the area, no "New project", no demo row.
  await page.goto('/projects');
  await screenReady(page);
  await expect(page.locator('[data-role-line="sovitech_admin"]')).toHaveCount(1);
  await expect(page.locator('[data-open-admin]')).toBeVisible();
  await expect(page.getByRole('link', { name: 'New project' })).toHaveCount(0);
  await checkScreen(page, { demo: false, label: 'l-UD-37-admin' }, checked);
  await signOut(page);

  // ---- The development engineer: the project list and its line; no admin page, no engineer page (D-16) -------------
  await signInAs(page, 'engineer');
  await roleListHolds(page, 'sovitech_engineer', 'The engineer review queue is not built: where SOVITECH engineers work is not decided yet.');
  await checkScreen(page, { demo: false, label: 'l-UD-37-engineer' }, checked);
  await adminAreaRefused(page, 'engineer', checked);
  await page.goto('/projects');
  await screenReady(page);
  await signOut(page);

  // ---- The development commercial reviewer ---------------------------------------------------------------------------
  await signInAs(page, 'commercialReviewer');
  await roleListHolds(page, 'sovitech_commercial_reviewer', 'The commercial review of a price is not built: where it happens is not decided yet.');
  await checkScreen(page, { demo: false, label: 'l-UD-37-commercial-reviewer' }, checked);
  await adminAreaRefused(page, 'commercial-reviewer', checked);
  await page.goto('/projects');
  await screenReady(page);
  await signOut(page);

  // ---- The development owner: the project list unchanged; the admin area is not theirs ------------------------------
  await signInAs(page, 'owner');
  await expect(page).toHaveURL(/\/projects$/u);
  await expect(page.getByRole('link', { name: 'New project' }).or(page.getByRole('button', { name: 'New project' }))).toHaveCount(1);
  await expect(page.locator('[data-role-lines]')).toHaveCount(0);
  await expect(page.locator('[data-open-admin]')).toHaveCount(0);
  await checkScreen(page, { demo: 'list', label: 'l-UD-37-owner' }, checked);
  await adminAreaRefused(page, 'owner', checked);

  expect(checked).toHaveLength(17);
});
