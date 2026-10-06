/**
 * Phase 5 flow (i) (prompt 3 section 11, "Everything works from the keyboard"; WCAG 2.2 AA 2.1.1, 2.4.3, 2.4.7;
 * docs/build-log.md, phase 5 plan, B6): a new project with no documents, from step 8 through Generate, the versions,
 * Download PDF and Reports, with the keyboard alone (Tab, Shift+Tab, Enter, Space), no mouse.
 *
 * Each control is reached by Tab and pressed by Enter or Space; the focus lands on the page column after Generate and
 * after a version opens (the page takes it, WCAG 2.4.3); the focused control is visible (the render test's forced focus
 * reads every focus style on each screen). Generate's POST and Download PDF's export are each sent once per press
 * (ADR 0048 decision 1). No dialog anywhere (rule 7).
 *
 * On every screen and state reached: the render test with its reserved-term scan, axe (WCAG 2.2 AA) and no demo line
 * (screen-checks.ts).
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { displayObjectsFromApi } from '../render/api-display-objects';
import { prepareRenderCheck } from '../render/render-check';
import { proposalExport, proposalsGenerate } from '../support/network';
import { createProject, openProjectScreen, proposalSettled, screenReady, signIn, testProject } from '../support/wizard';
import { checkScreen, type CheckedScreens } from './screen-checks';

/** Presses Tab (or Shift+Tab) until the control has the focus; fails when it is not reached within the presses allowed. */
async function tabTo(page: Page, control: Locator, options: { readonly backwards?: boolean; readonly presses?: number } = {}): Promise<void> {
  const presses = options.presses ?? 120;
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

test('prompt 3 section 11 · WCAG 2.2 AA (2.1.1, 2.4.3, 2.4.7) · R-109 · R-110 · R-118 · R-119 · US-PROPOSAL-01 · US-PROPOSAL-11 · US-REPORTS-02 · US-REPORTS-05 · rule 7: Generate, the versions, Download PDF and Reports from the keyboard alone (phase 5 flow (i))', async ({
  page,
}) => {
  test.setTimeout(8 * 60_000);
  const checked: CheckedScreens = [];
  await prepareRenderCheck(page, { displayObjects: displayObjectsFromApi() });
  await signIn(page);
  const projectId = await createProject(page, testProject('Flow Proposal Keyboard'));
  const generations = countRequests(page, proposalsGenerate);
  const exports = countRequests(page, proposalExport);

  // Step 8: Tab to Generate Proposal, Enter. One POST; the landing takes the focus to the page column.
  await openProjectScreen(page, projectId, 'steps/8');
  const generate = page.getByRole('button', { name: 'Generate Proposal', exact: true });
  await tabTo(page, generate);
  await page.keyboard.press('Enter');
  await page.waitForURL((url) => url.pathname === `/projects/${projectId}/proposal`);
  await proposalSettled(page);
  await screenReady(page);
  expect(generations.count(), 'one POST per press').toBe(1);
  await checkScreen(page, { demo: false, label: 'i-UD-06-generated' }, checked);
  await expect(page.locator('main#main')).toBeFocused();

  // Back to step 8 from the keyboard ("Back to review"), and Generate again with Space: a second version.
  const back = page.getByRole('button', { name: 'Back to review', exact: true });
  await tabTo(page, back);
  await page.keyboard.press('Enter');
  await page.waitForURL((url) => url.pathname === `/projects/${projectId}/steps/8`);
  await screenReady(page);
  await tabTo(page, page.getByRole('button', { name: 'Generate Proposal', exact: true }));
  await page.keyboard.press('Space');
  await page.waitForURL((url) => url.pathname === `/projects/${projectId}/proposal`);
  await proposalSettled(page);
  await screenReady(page);
  expect(generations.count(), 'one POST per press').toBe(2);
  const versions = page.getByRole('navigation', { name: 'Versions' }).getByRole('link');
  await expect(versions).toHaveCount(2);

  // The earlier version from the versions rail: Tab, Enter; the page takes the focus; then back to the latest.
  await tabTo(page, versions.nth(1));
  await page.keyboard.press('Enter');
  await page.waitForURL((url) => /\/proposals\/[0-9a-f-]{36}$/u.test(url.pathname));
  await page.locator('[data-proposal-head]').waitFor();
  await screenReady(page);
  await expect(page.locator('main#main')).toBeFocused();
  await checkScreen(page, { demo: false, label: 'i-UD-06-earlier-version' }, checked);
  await expect(page.getByText('This is an earlier version of your preliminary proposal, kept as it was generated.', { exact: true })).toBeVisible();
  await tabTo(page, page.getByRole('link', { name: 'Open the latest version', exact: true }));
  await page.keyboard.press('Enter');
  await page.waitForURL((url) => url.pathname === `/projects/${projectId}/proposal`);
  await proposalSettled(page);
  await screenReady(page);

  // Download PDF: Tab, Enter; one export, one file; the button keeps the focus and is never disabled.
  const downloadPdf = page.getByRole('button', { name: 'Download PDF', exact: true });
  await tabTo(page, downloadPdf, { backwards: true });
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 90_000 }), page.keyboard.press('Enter')]);
  expect(download.suggestedFilename()).toMatch(/^preliminary-proposal-\d{4}-\d{2}-\d{2}-\d{4}\.pdf$/u);
  expect(exports.count(), 'one export per press').toBe(1);
  await expect(downloadPdf).toBeFocused();
  await expect(downloadPdf).toBeEnabled();

  // Reports from the sidebar: Tab to its link, Enter; then the row's Download from the keyboard.
  const reportsLink = page.getByRole('navigation', { name: 'Project pages' }).getByRole('link', { name: 'Reports', exact: true });
  await tabTo(page, reportsLink, { backwards: true });
  await page.keyboard.press('Enter');
  await page.waitForURL((url) => url.pathname === `/projects/${projectId}/reports`);
  await page.locator('[data-report-preview]').waitFor();
  await screenReady(page);
  await checkScreen(page, { demo: false, label: 'i-DB-18-reports' }, checked);
  const rowDownload = page.getByRole('table', { name: 'Generated documents' }).getByRole('button', { name: 'Download', exact: true }).first();
  await tabTo(page, rowDownload);
  const [again] = await Promise.all([page.waitForEvent('download', { timeout: 90_000 }), page.keyboard.press('Enter')]);
  expect(again.suggestedFilename()).toMatch(/^preliminary-proposal-\d{4}-\d{2}-\d{2}-\d{4}\.pdf$/u);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(checked).toHaveLength(3);
});
