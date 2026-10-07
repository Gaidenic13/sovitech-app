/**
 * Phase 6 flow (k) (prompt 3 section 11, "Everything works from the keyboard"; WCAG 2.2 AA 2.1.1, 2.4.3, 2.4.7;
 * docs/build-log.md, phase 6 plan, "the integrator"): a new project with no documents, from a Metrics page with no
 * stored proposal ("Open the Proposal page"), through Generate, the five Metrics pages by the sidebar, the cost tabs,
 * CAPEX's Download Proposal and Export Report on Payback and Lifecycle, with the keyboard alone (Tab, Shift+Tab, Enter,
 * Space, the arrow keys), no mouse.
 *
 * Each control is reached by Tab and pressed by Enter or Space; each Metrics page takes the focus to the page column
 * when it opens (WCAG 2.4.3); the cost tabs move with the arrow keys; Download Proposal and Export Report send one
 * request per press, keep the focus and are never disabled (rule 7). No dialog anywhere (rule 7).
 *
 * On every screen and state reached: the render test with its reserved-term scan, axe (WCAG 2.2 AA) and no demo line
 * (screen-checks.ts).
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { displayObjectsFromApi } from '../render/api-display-objects';
import { prepareRenderCheck } from '../render/render-check';
import { metricsExport, proposalExport, proposalsGenerate } from '../support/network';
import { createProject, openProjectScreen, screenReady, signIn, testProject } from '../support/wizard';
import { WORKSPACE_PAGES, type WorkspacePageName } from '../support/workspace';
import { checkScreen, type CheckedScreens } from './screen-checks';

/** Presses Tab (or Shift+Tab) until the control has the focus; fails when it is not reached within the presses allowed. */
async function tabTo(page: Page, control: Locator, options: { readonly backwards?: boolean; readonly presses?: number } = {}): Promise<void> {
  const presses = options.presses ?? 120;
  await control.waitFor({ state: 'attached', timeout: 15_000 });
  for (let pressed = 0; pressed < presses; pressed += 1) {
    if (await control.evaluate((element) => element === document.activeElement).catch(() => false)) return;
    await page.keyboard.press(options.backwards === true ? 'Shift+Tab' : 'Tab');
  }
  await expect(control, `reached from the keyboard within ${String(presses)} presses`).toBeFocused();
}

/** Counts the requests one matcher accepts from now on. */
function countRequests(page: Page, match: (method: string, path: string) => boolean): { readonly count: () => number } {
  let seen = 0;
  page.on('request', (request) => {
    if (match(request.method(), new URL(request.url()).pathname)) seen += 1;
  });
  return { count: () => seen };
}

/** From the page column, Shift+Tab back to a sidebar link and Enter: the Metrics page opens, its version shown, the focus on its column. */
async function sidebarTo(page: Page, projectId: string, name: WorkspacePageName): Promise<void> {
  const link = page.getByRole('navigation', { name: 'Project pages' }).getByRole('link', { name, exact: true });
  await tabTo(page, link, { backwards: true });
  await page.keyboard.press('Enter');
  await page.waitForURL((url) => url.pathname === `/projects/${projectId}/${WORKSPACE_PAGES[name]}`);
  await page.locator('[data-metrics-page] [data-metric-tile]').first().waitFor({ timeout: 30_000 });
  await screenReady(page);
  await expect(page.locator('main#main')).toBeFocused();
}

/** Presses a download control from the keyboard; the file's suggested name. */
async function downloadWith(page: Page, key: 'Enter' | 'Space'): Promise<string> {
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 90_000 }), page.keyboard.press(key)]);
  return download.suggestedFilename();
}

test('prompt 3 section 11 · WCAG 2.2 AA (2.1.1, 2.4.3, 2.4.7) · R-088 · R-089 · R-093 · R-095 to R-097 · R-121 · US-REPORTS-13 · G7-24 · V-3 · rule 7: the Metrics pages, Download Proposal and Export Report from the keyboard alone (phase 6 flow (k))', async ({
  page,
}) => {
  test.setTimeout(8 * 60_000);
  const checked: CheckedScreens = [];
  await prepareRenderCheck(page, { displayObjects: displayObjectsFromApi() });
  await signIn(page);
  const projectId = await createProject(page, testProject('Flow Metrics Keyboard'));
  const generations = countRequests(page, proposalsGenerate);
  const proposalExports = countRequests(page, proposalExport);
  const reports = countRequests(page, metricsExport);

  // A Metrics page with no stored proposal: its line and "Open the Proposal page", reached by Tab (rule 7).
  await openProjectScreen(page, projectId, 'metrics/financial-overview');
  await page.locator('[data-metrics-state="none-generated"]').waitFor({ timeout: 30_000 });
  await screenReady(page);
  await checkScreen(page, { demo: false, label: 'k-DB-02-none-generated' }, checked);
  await tabTo(page, page.getByRole('link', { name: 'Open the Proposal page', exact: true }));
  await page.keyboard.press('Enter');
  await page.waitForURL((url) => url.pathname === `/projects/${projectId}/proposal`);
  await screenReady(page);

  // The landing never generated: "Go to the review", then Generate Proposal on step 8, each from the keyboard.
  await tabTo(page, page.getByRole('button', { name: 'Go to the review', exact: true }));
  await page.keyboard.press('Enter');
  await page.waitForURL((url) => url.pathname === `/projects/${projectId}/steps/8`);
  await screenReady(page);
  await tabTo(page, page.getByRole('button', { name: 'Generate Proposal', exact: true }));
  await page.keyboard.press('Enter');
  await page.waitForURL((url) => url.pathname === `/projects/${projectId}/proposal`);
  await page.locator('[data-proposal-head]').waitFor({ timeout: 30_000 });
  await screenReady(page);
  expect(generations.count(), 'one POST per press').toBe(1);

  // Financial Overview: the cost tabs move with the arrow keys (the kit's Tabs).
  await sidebarTo(page, projectId, 'Financial Overview');
  await checkScreen(page, { demo: false, label: 'k-DB-02-financial-overview' }, checked);
  const bySystem = page.getByRole('tab', { name: 'By System', exact: true });
  await tabTo(page, bySystem);
  await page.keyboard.press('ArrowRight');
  const byArea = page.getByRole('tab', { name: 'By Building Area', exact: true });
  await expect(byArea).toBeFocused();
  await expect(byArea).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowLeft');
  await expect(bySystem).toHaveAttribute('aria-selected', 'true');

  // CAPEX Breakdown: "Selected systems" waits for the scope decisions (nothing was answered: V-3, rule 1), with its Add;
  // Download Proposal, Tab then Enter; one export per press; the button keeps the focus.
  await sidebarTo(page, projectId, 'CAPEX Breakdown');
  const selected = page.getByRole('group', { name: 'Selected systems', exact: true });
  await expect(selected).toContainText('Not available yet: systems in scope');
  await expect(selected.getByRole('button')).toHaveCount(1);
  const downloadProposal = page.getByRole('button', { name: 'Download Proposal', exact: true });
  await tabTo(page, downloadProposal);
  expect(await downloadWith(page, 'Enter')).toMatch(/^preliminary-proposal-\d{4}-\d{2}-\d{2}-\d{4}\.pdf$/u);
  expect(proposalExports.count(), 'one export per press').toBe(1);
  await expect(downloadProposal).toBeFocused();
  await expect(downloadProposal).toBeEnabled();
  await checkScreen(page, { demo: false, label: 'k-DB-13-capex-after-download' }, checked);

  // OPEX & Savings (new construction, no system included): the building's figures, no upload and no system filter; the
  // "by system" panel reads its line with the way to choose the systems (G7-24), reached by Tab.
  await sidebarTo(page, projectId, 'OPEX & Savings');
  await expect(page.getByRole('combobox', { name: 'System', exact: true })).toHaveCount(0);
  const bySystemPanel = page.getByRole('region', { name: 'Building operating cost by system', exact: true });
  await expect(bySystemPanel).toContainText('Not available yet: the systems in scope');
  await expect(bySystemPanel.locator('table')).toHaveCount(0);
  await tabTo(page, bySystemPanel.getByRole('link', { name: 'Choose the systems in scope', exact: true }));
  await checkScreen(page, { demo: false, label: 'k-DB-12-opex' }, checked);

  // Payback Analysis: Export Report, Tab then Enter; one request per press; never disabled; the focus kept.
  await sidebarTo(page, projectId, 'Payback Analysis');
  const exportPayback = page.getByRole('button', { name: 'Export Report', exact: true });
  await tabTo(page, exportPayback);
  expect(await downloadWith(page, 'Enter')).toMatch(/^payback-analysis-\d{4}-\d{2}-\d{2}-\d{4}\.pdf$/u);
  expect(reports.count(), 'one request per press').toBe(1);
  await expect(exportPayback).toBeFocused();
  await expect(exportPayback).toBeEnabled();

  // Lifecycle Analysis: Export Report with Space.
  await sidebarTo(page, projectId, 'Lifecycle Cost');
  const exportLifecycle = page.getByRole('button', { name: 'Export Report', exact: true });
  await tabTo(page, exportLifecycle);
  expect(await downloadWith(page, 'Space')).toMatch(/^lifecycle-analysis-\d{4}-\d{2}-\d{2}-\d{4}\.pdf$/u);
  expect(reports.count(), 'one request per press').toBe(2);
  await expect(exportLifecycle).toBeFocused();
  await checkScreen(page, { demo: false, label: 'k-DB-22-after-export' }, checked);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(checked).toHaveLength(5);
});
