/**
 * Phase 6 flow (j) (prompt 3 section 10, phase 6 exit; docs/build-log.md, phase 6 plan, "the integrator"): the demo
 * project, as the development owner (a member of the demo, PRD R-136 interim), from the workspace's landing through the
 * sidebar's five Metrics pages (R-093 "Until decided": Financial Overview, CAPEX Breakdown, OPEX & Savings, Payback
 * Analysis, Lifecycle Cost), with CAPEX's Download Proposal and Export Report on Payback and Lifecycle, each file read
 * back.
 *
 * With no dataset approved and no key (the owner's answers in force), every Metrics figure reads "Not available yet",
 * naming the datasets, unit, method or open question it waits for (prompt 3 phase 6 exit; rule 7), the investment is
 * the stored proposal's own price with no stage named (G10-15; rule 10), every chart is its one "Not available yet" line
 * with no mark (G1-31), no figure is shown (rule 1), and no figure of the mockups appears. Export Report prints the page
 * as rendered (R-121): the demo line first on every page of the PDF (G10-16's e2e reading; rule 10), every missing value
 * in its 2.8 wording (G1-32), no figure and no reserved term.
 *
 * On every page and state reached: the render test with its reserved-term scan, axe (WCAG 2.2 AA) and the demo line
 * (screen-checks.ts). The pages' other states and the print route are render screens (tests/e2e/render/screens.ts,
 * "DB-02" to "DB-22" and "R-121 print route"). Then GS-1's half: no `question_for_known_field` and no
 * `confirmation_budget_exceeded` event on the demo after it (guardrails section 8; rules 5 and 6). The flow writes
 * nothing to the demo but the export of its proposal (CAPEX's Download Proposal records one, as an owner's press does).
 */
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { displayObjectsFromApi } from '../render/api-display-objects';
import { prepareRenderCheck } from '../render/render-check';
import { readGuardrailEvents } from '../support/control';
import { metricsExport } from '../support/network';
import { linesOf, pdfPages, reservedTermsInPdf } from '../support/pdf';
import { demoProjectId, signIn } from '../support/wizard';
import { followSidebar, openWorkspaceScreen, type WorkspacePageName } from '../support/workspace';
import { DEMO_LINE, checkScreen, type CheckedScreens } from './screen-checks';

/** A figure as the formatting module writes one: a number with a unit or a range ("about … (… to …)"), or a currency. */
const FIGURE = /\babout \d|\bEUR\b|€|\bRON\b|\d[\d,.]*\s*(?:to|–)\s*\d|\d+\s*%/u;
/** 2.8's stage labels: no Metrics page names a stage while no figure exists (G10-15). */
const STAGES = /Indicative range|Preliminary investment estimate|Formal quotation|Superseded/u;
/** What the approved Metrics screens draw that the PRD does not build (R-088, R-089, R-093, R-095 to R-108). */
const NOT_BUILT = /BMS LIVE|BMS Live|Last sync|Back to Metrics|Compare Scenarios|Configure|KEY ASSUMPTIONS|SCENARIO COMPARISON|VALUE DRIVERS|\bROI\b|By Phase|Powered by|Automation Level|TOP SAVINGS OPPORTUNITIES|Last \d+ Months|vs\. baseline/iu;
/** The datasets every investment place names (the stored proposal's own line: G10-15; R-090). */
const DATASETS = 'Not available yet: SOVITECH point templates; SOVITECH cost ranges and benchmarks';

/**
 * Downloads through a press, and returns the saved file's bytes and suggested name. The time from the press to the saved
 * file is kept as the test's annotation (ADR 0041's Export Report timing; a JSON reporter reads it), never asserted.
 */
async function downloadBy(page: Page, press: () => Promise<void>, timing?: string): Promise<{ readonly bytes: Buffer; readonly name: string }> {
  const started = Date.now();
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 90_000 }), press()]);
  const path = await download.path();
  if (timing !== undefined) test.info().annotations.push({ type: 'timing', description: `${timing}: ${String(Date.now() - started)} ms` });
  return { bytes: readFileSync(path), name: download.suggestedFilename() };
}

/** What every Metrics page of the demo holds today: no figure, no stage, nothing the PRD does not build, every chart its one line. */
async function metricsPageHolds(page: Page, title: string): Promise<void> {
  const main = page.locator('main');
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await expect(main).not.toContainText(FIGURE);
  await expect(main).not.toContainText(STAGES);
  await expect(main).not.toContainText(NOT_BUILT);
  // Rule 7: "Not available yet" never stands alone; every chart is its one line, with no mark or gap drawn (G1-31).
  for (const text of await main.locator('.sov-not-available').allTextContents()) expect(text.trim(), 'a "Not available yet" naming nothing').not.toBe('Not available yet');
  await expect(page.locator('[data-series-state="figures"], [data-series-mark], [data-series-gap]')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText(DEMO_LINE, { exact: true })).toHaveCount(1);
}

/** What every page of an Export Report holds on the demo (G10-16's e2e reading; G1-32; R-121). */
function reportHolds(bytes: Buffer, title: string): void {
  expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  const pages = pdfPages(bytes);
  expect(pages.length).toBeGreaterThanOrEqual(1);
  pages.forEach((text, index) => expect(linesOf(text)[0], `page ${String(index + 1)}: the demo line first`).toBe(DEMO_LINE));
  const text = pages.join('\n').replace(/\s+/gu, ' ');
  expect(text).toContain(title);
  expect(text).toContain('Not available yet: ');
  expect(text.split('Not available yet').slice(1).filter((rest) => !rest.startsWith(':')), '"Not available yet" naming nothing').toEqual([]);
  expect(text).not.toMatch(FIGURE);
  expect(text).not.toMatch(STAGES);
  expect(reservedTermsInPdf(text)).toEqual([]);
}

/** Counts the requests one matcher accepts from now on. */
function countRequests(page: Page, match: (method: string, path: string) => boolean): { readonly count: () => number } {
  let seen = 0;
  page.on('request', (request) => {
    if (match(request.method(), new URL(request.url()).pathname)) seen += 1;
  });
  return { count: () => seen };
}

async function visit(page: Page, name: WorkspacePageName, title: string, label: string, checked: CheckedScreens): Promise<void> {
  await followSidebar(page, name);
  await page.locator('[data-metrics-page] [data-metric-tile]').first().waitFor({ timeout: 30_000 });
  await checkScreen(page, { demo: true, label }, checked);
  await metricsPageHolds(page, title);
}

test('R-087 to R-097 · R-121 · US-FIN-01 · US-FIN-05 · US-FIN-12 · US-FIN-13 · US-FIN-14 · US-FIN-21 · US-FIN-26 · US-REPORTS-13 · G1-5 · G1-31 · G1-32 · G2-7 · G9-8 · G10-7 · G10-15 · G10-16 · GS-1 · V-3 · rules 1, 5, 6, 7, 10 and 11: the demo through the five Metrics pages, Download Proposal and Export Report (phase 6 flow (j))', async ({
  page,
}) => {
  test.setTimeout(8 * 60_000);
  const checked: CheckedScreens = [];
  const demo = demoProjectId();
  await prepareRenderCheck(page, { displayObjects: displayObjectsFromApi() });
  await signIn(page);
  const exports = countRequests(page, metricsExport);

  // The workspace's landing, then the Metrics pages by the sidebar, after Reports (R-093; ADR 0043 amended).
  await openWorkspaceScreen(page, demo, 'proposal');

  // Financial Overview (DB-02): the investment names the datasets; both cost tabs and the cash flow are their lines.
  await visit(page, 'Financial Overview', 'BMS investment overview', 'j-DB-02-financial-overview', checked);
  const overview = page.locator('[data-metrics-page="financial_overview"]');
  await expect(overview.getByRole('group', { name: 'Total BMS investment' })).toContainText(DATASETS);
  await expect(overview.locator('[data-key-indicators]')).toContainText('BMS operating cost');
  await expect(overview.locator('[data-key-indicators]')).toContainText(DATASETS);
  await overview.getByRole('tab', { name: 'By Building Area', exact: true }).click();
  await expect(overview.getByRole('tab', { name: 'By Building Area', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(overview.locator('[data-series="capex.byLevel"]')).toContainText("SOVITECH's method for investment by level");
  await checkScreen(page, { demo: true, label: 'j-DB-02-by-building-area' }, checked);

  // CAPEX Breakdown (DB-13): the same investment (G2-7), the systems as used, Fire Safety's sentence; Download Proposal.
  await visit(page, 'CAPEX Breakdown', 'CAPEX breakdown', 'j-DB-13-capex', checked);
  const capex = page.locator('[data-metrics-page="capex"]');
  await expect(capex).toContainText(DATASETS);
  await expect(capex.locator('[data-capex-systems]')).toBeVisible();
  // "Selected systems" (R-089; US-FIN-21 AC6; V-3 of phase 6 part B): the demo recorded every scope decision, so the
  // bound count of the include decisions "Systems" shows (G2-7).
  const selected = capex.getByRole('group', { name: 'Selected systems', exact: true }).locator('[data-value-id$=".metrics.selectedSystems"]');
  const included = await capex.locator('[data-capex-systems] li[data-system]:not([data-excluded])').count();
  expect(included).toBeGreaterThan(0);
  await expect(selected).toHaveText(String(included));
  const proposalPdf = await downloadBy(page, () => page.getByRole('button', { name: 'Download Proposal', exact: true }).click(), 'Download Proposal');
  expect(proposalPdf.name).toMatch(/^preliminary-proposal-\d{4}-\d{2}-\d{2}-\d{4}\.pdf$/u);
  const proposalPages = pdfPages(proposalPdf.bytes);
  proposalPages.forEach((text, index) => expect(linesOf(text)[0], `proposal page ${String(index + 1)}: the demo line first`).toBe(DEMO_LINE));
  expect(reservedTermsInPdf(proposalPages.join('\n'))).toEqual([]);

  // OPEX & Savings (DB-12): the building now; the energy cost waits for bills with the upload; Unknown costs; the filter.
  await visit(page, 'OPEX & Savings', 'OPEX & Savings', 'j-DB-12-opex', checked);
  const opex = page.locator('[data-metrics-page="opex"]');
  await expect(opex.getByRole('group', { name: 'Energy cost' })).toContainText('Not available yet: energy data read from bills');
  await expect(opex.getByRole('group', { name: 'Energy cost' }).getByRole('link', { name: 'Upload a document' })).toBeVisible();
  for (const name of ['Maintenance cost', 'Operations (staff)', 'Other costs']) await expect(opex.getByRole('group', { name, exact: true })).toContainText('Unknown');
  const filter = opex.getByRole('combobox', { name: 'System', exact: true });
  const options = await filter.locator('option').allTextContents();
  expect(options[0]).toBe('All Systems');
  if (options.length > 1) {
    const rows = opex.locator('table tbody tr');
    const before = await rows.count();
    const requests = countRequests(page, (method, path) => path.startsWith('/api/'));
    await filter.selectOption({ index: 1 });
    await expect(rows).toHaveCount(1);
    expect(before).toBeGreaterThanOrEqual(1);
    expect(requests.count(), 'the filter narrows the rows in the page only').toBe(0);
    await checkScreen(page, { demo: true, label: 'j-DB-12-opex-filtered' }, checked);
    await filter.selectOption({ index: 0 });
  }

  // Payback Analysis (DB-21): Export Report, one request per press, the PDF read back.
  await visit(page, 'Payback Analysis', 'Payback Analysis', 'j-DB-21-payback', checked);
  await expect(page.locator('[data-metrics-page="payback"]')).toContainText(DATASETS);
  const exportPayback = page.getByRole('button', { name: 'Export Report', exact: true });
  const payback = await downloadBy(page, () => exportPayback.click(), 'Export Report, Payback Analysis');
  expect(payback.name).toMatch(/^payback-analysis-\d{4}-\d{2}-\d{2}-\d{4}\.pdf$/u);
  reportHolds(payback.bytes, 'Payback Analysis');
  expect(exports.count(), 'one request per press').toBe(1);
  await expect(exportPayback).toBeEnabled();
  await expect(page.getByRole('alert')).toHaveCount(0);

  // Lifecycle Analysis (DB-22; the sidebar's "Lifecycle Cost"): Export Report.
  await visit(page, 'Lifecycle Cost', 'Lifecycle Analysis', 'j-DB-22-lifecycle', checked);
  await expect(page.locator('[data-analysis-period]')).toContainText('Not available yet: the duration unit');
  const lifecycle = await downloadBy(page, () => page.getByRole('button', { name: 'Export Report', exact: true }).click(), 'Export Report, Lifecycle Analysis');
  expect(lifecycle.name).toMatch(/^lifecycle-analysis-\d{4}-\d{2}-\d{2}-\d{4}\.pdf$/u);
  reportHolds(lifecycle.bytes, 'Lifecycle Analysis');
  expect(exports.count(), 'one request per press').toBe(2);
  await checkScreen(page, { demo: true, label: 'j-DB-22-after-export' }, checked);

  // GS-1's half: nothing asked about a known field, and no confirmation over budget, on the demo.
  expect(await readGuardrailEvents(demo, 'question_for_known_field')).toEqual([]);
  expect(await readGuardrailEvents(demo, 'confirmation_budget_exceeded')).toEqual([]);
  expect(checked.length).toBeGreaterThanOrEqual(7);
});
