/**
 * Phase 5 flow (g) (prompt 3 section 10, phase 5 exit; docs/build-log.md, phase 5 plan, B6): the demo project, as the
 * development owner (a member of the demo, PRD R-136 interim): Generate on step 8, the stored proposal on the landing,
 * Download PDF, the PDF read back, Reports listing it, and its download from Reports.
 *
 * With no dataset approved and no key (the owner's answers in force), Generate stores a proposal at once, with no
 * dialog and no disabled button (rule 7; R-109), whose every output reads "Not available yet", naming the dataset and
 * what else is missing; no figure is shown (prompt 3 phase 5 exit; rule 1); the investment outputs are named by their
 * stage labels and the head names no stage (G10-11; rule 10). The PDF (R-118; ADR 0050) carries the demo line as the
 * first line of every page (G10-13's e2e reading; rule 10 "Labelled everywhere"), the values' badges inline (G10-5), the
 * "Not available yet" lines naming the datasets, no figure, and no reserved term (2.8; prompt 3 phase 5).
 *
 * On every screen and state reached: the render test with its reserved-term scan, axe (WCAG 2.2 AA) and the demo line
 * (screen-checks.ts). The print route itself is a render screen (tests/e2e/render/screens.ts, "R-118 print route").
 * Then GS-1's half for the proposal: no `question_for_known_field` and no `confirmation_budget_exceeded` event on the
 * demo after it (guardrails section 8; rules 5 and 6). The demo is shared by the run: this flow adds a version and two
 * exported outputs to it, as an owner's presses would.
 */
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { displayObjectsFromApi } from '../render/api-display-objects';
import { prepareRenderCheck } from '../render/render-check';
import { readGuardrailEvents } from '../support/control';
import { linesOf, pdfPages, reservedTermsInPdf } from '../support/pdf';
import { demoProjectId, signIn } from '../support/wizard';
import { followSidebar, generateIntoWorkspace } from '../support/workspace';
import { DEMO_LINE, checkScreen, type CheckedScreens } from './screen-checks';

/** A figure as the formatting module writes one: a number with a unit or a range ("about … (… to …)"), or a currency. */
const FIGURE = /\babout \d|\bEUR\b|€|\d[\d,.]*\s*(?:to|–)\s*\d/u;

/** Downloads through a press, and returns the saved file's bytes and suggested name. */
async function downloadBy(page: Page, press: () => Promise<void>): Promise<{ readonly bytes: Buffer; readonly name: string }> {
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 90_000 }), press()]);
  const path = await download.path();
  return { bytes: readFileSync(path), name: download.suggestedFilename() };
}

/** What every page of an exported proposal holds on the demo (G10-13; G10-5; R-118). */
function demoPdfHolds(bytes: Buffer): string[] {
  expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  const pages = pdfPages(bytes);
  expect(pages.length, 'the cover, the proposal and the appendix').toBeGreaterThanOrEqual(3);
  pages.forEach((page, index) => expect(linesOf(page)[0], `page ${String(index + 1)}: the demo line first`).toBe(DEMO_LINE));
  // A PDF's text breaks long lines where the page wraps them: read as one run of words.
  const text = pages.join('\n').replace(/\s+/gu, ' ');
  // Each output "Not available yet", naming the dataset it waits for; the investment outputs named by their stage labels.
  expect(text).toContain('Not available yet: SOVITECH cost ranges and benchmarks');
  expect(text).toContain('Not available yet: SOVITECH point templates');
  expect(text).toContain('Indicative range');
  expect(text).toContain('Preliminary investment estimate');
  // Badges inline beside their values (2.8 "Prominence"; G10-5): the owner's answers and an unknown value.
  expect(text).toContain('Provided by you');
  expect(text).toContain('Unknown');
  // Rule 11's interface points named with no figure (G11-12); the appendix with the open items once (rule 7).
  expect(text).toContain('The proposal includes these interface points: a fire-alarm input and a fire-mode status per affected panel.');
  expect(text).toContain('Appendix: where each value comes from');
  expect(text.split('What we still need').length - 1, '"What we still need" once').toBe(1);
  // No figure while no dataset is approved, and no reserved term.
  expect(text).not.toMatch(FIGURE);
  expect(reservedTermsInPdf(text)).toEqual([]);
  return pages;
}

test('R-109 · R-110 · R-111 · R-112 · R-116 · R-118 · R-119 · US-PROPOSAL-01 · US-PROPOSAL-02 · US-PROPOSAL-04 · US-REPORTS-01 · US-REPORTS-02 · US-REPORTS-05 · G10-1 · G10-5 · G10-11 · G10-13 · G11-12 · GS-1 · rules 1, 5, 6, 7, 10 and 11: the demo, Generate, the stored proposal, Download PDF and Reports (phase 5 flow (g))', async ({
  page,
}) => {
  test.setTimeout(8 * 60_000);
  const checked: CheckedScreens = [];
  const demo = demoProjectId();
  await prepareRenderCheck(page, { displayObjects: displayObjectsFromApi() });
  await signIn(page);

  // Generate from step 8: no dialog, nothing disabled, the stored proposal on the landing (R-109; R-116).
  await generateIntoWorkspace(page, demo);
  await checkScreen(page, { demo: true, label: 'g-UD-06-landing' }, checked);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1, name: 'Preliminary proposal' })).toBeVisible();
  const head = page.getByRole('region', { name: 'Where your proposal stands' });
  await expect(head).toContainText('Not available yet: SOVITECH point templates; SOVITECH cost ranges and benchmarks');
  await expect(head).not.toContainText(/Indicative range|Preliminary investment estimate|Formal quotation/u);
  const investment = page.getByRole('region', { name: 'Investment' });
  await expect(investment.getByText('Indicative range', { exact: true })).toBeVisible();
  await expect(investment.getByText('Preliminary investment estimate', { exact: true })).toBeVisible();
  // No figure anywhere: every output of the stored proposal is "Not available yet" (prompt 3 phase 5 exit).
  await expect(page.locator('[data-output][data-availability="figure"]')).toHaveCount(0);
  expect(await page.locator('[data-output][data-availability="not_available_yet"]').count()).toBeGreaterThan(0);
  await expect(page.locator('main')).not.toContainText(/Formal quotation|Superseded/u);
  await expect(page.getByRole('region', { name: 'Control points' })).toContainText('The proposal includes these interface points: a fire-alarm input and a fire-mode status per affected panel.');
  // The newest version is the one shown, marked in the versions rail.
  await expect(page.getByRole('navigation', { name: 'Versions' }).locator('a[aria-current="page"]')).toHaveCount(1);

  // Download PDF: never disabled; one export per press; the file is the print route printed.
  const downloadPdf = page.getByRole('button', { name: 'Download PDF', exact: true });
  await expect(downloadPdf).toBeEnabled();
  const pdf = await downloadBy(page, () => downloadPdf.click());
  expect(pdf.name).toMatch(/^preliminary-proposal-\d{4}-\d{2}-\d{2}-\d{4}\.pdf$/u);
  demoPdfHolds(pdf.bytes);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await checkScreen(page, { demo: true, label: 'g-UD-06-after-download' }, checked);

  // Reports (DB-18): the export just made is listed first, by the signed-in owner, with its preview; and its download.
  await followSidebar(page, 'Reports');
  await checkScreen(page, { demo: true, label: 'g-DB-18-reports' }, checked);
  const table = page.getByRole('table', { name: 'Generated documents' });
  expect(await table.locator('[data-report-row]').count(), 'the seed\'s export and this one').toBeGreaterThanOrEqual(2);
  await expect(page.locator('[data-report-preview]')).toBeVisible();
  await expect(page.locator('[data-report-cover]')).toContainText(DEMO_LINE);
  // DR-4 (DB-18): at 1440x900 the preview's Download is in the first screen, above the status footer, full width.
  expect(page.viewportSize()).toEqual({ width: 1440, height: 900 });
  await page.evaluate(() => window.scrollTo(0, 0));
  const previewDownload = page.locator('[data-report-preview]').getByRole('button', { name: 'Download', exact: true });
  const downloadBox = await previewDownload.boundingBox();
  const footerBox = await page.locator('.sov-status-footer').boundingBox();
  const previewBox = await page.locator('[data-report-preview]').boundingBox();
  if (downloadBox === null || footerBox === null || previewBox === null) throw new Error('the preview, its Download or the footer is not laid out');
  expect(downloadBox.y + downloadBox.height, 'Download ends above the status footer').toBeLessThanOrEqual(footerBox.y);
  expect(downloadBox.width, 'Download spans the preview (its 20px padding on each side)').toBeGreaterThanOrEqual(previewBox.width - 42);
  await expect(page.locator('main')).not.toContainText(/Generate Report|View All Templates|All Statuses|Compliance Report/u);
  const fromReports = await downloadBy(page, () => page.locator('[data-report-preview]').getByRole('button', { name: 'Download', exact: true }).click());
  demoPdfHolds(fromReports.bytes);
  await checkScreen(page, { demo: true, label: 'g-DB-18-after-download' }, checked);

  // GS-1's half: nothing asked about a known field, and no confirmation over budget, on the demo.
  expect(await readGuardrailEvents(demo, 'question_for_known_field')).toEqual([]);
  expect(await readGuardrailEvents(demo, 'confirmation_budget_exceeded')).toEqual([]);
  expect(checked).toHaveLength(4);
});
