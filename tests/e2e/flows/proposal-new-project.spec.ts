/**
 * Phase 5 flow (h) (prompt 3 section 10, phase 5 exit: "Generate works on ... a new project and on a project with no
 * documents, with no dialog and no disabled button"; docs/build-log.md, phase 5 plan, B6): a new project with no
 * documents, created through step 1 and taken straight to step 8 with nothing answered.
 *
 * Generate stores a proposal at once (rule 7; R-109): every output reads "Not available yet", naming the dataset and the
 * owner inputs it waits for, never a figure, zero or blank (rule 1); an investment output's "Add" opens step 8's inline
 * ask for that field (R-012 "Until decided"; G7-11); Generate again stores a second version (R-110); the first stays
 * readable as generated, with the notice that it is an earlier version (2.4; G4-45; US-PROPOSAL-11). Download PDF on
 * this project gives a PDF with no demo line on any page (rule 10; G10-10's reading on exports) and no reserved term;
 * Reports lists it.
 *
 * On every screen and state reached: the render test with its reserved-term scan, axe (WCAG 2.2 AA) and no demo line
 * (screen-checks.ts).
 */
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { displayObjectsFromApi } from '../render/api-display-objects';
import { prepareRenderCheck } from '../render/render-check';
import { pdfPages, reservedTermsInPdf } from '../support/pdf';
import { createProject, openProjectScreen, pressPrimary, signIn, testProject, waitForStep } from '../support/wizard';
import { followSidebar } from '../support/workspace';
import { DEMO_LINE, checkScreen, type CheckedScreens } from './screen-checks';

test('R-109 · R-110 · R-111 · R-012 · R-118 · R-119 · US-PROPOSAL-01 · US-PROPOSAL-03 · US-PROPOSAL-11 · US-REPORTS-02 · G4-45 · G7-11 · G10-10 · G10-11 · rules 1, 4, 7 and 10: a new project with no documents, Generate with nothing answered, Add, Generate again, the earlier version, Download PDF and Reports (phase 5 flow (h))', async ({
  page,
}) => {
  test.setTimeout(8 * 60_000);
  const checked: CheckedScreens = [];
  await prepareRenderCheck(page, { displayObjects: displayObjectsFromApi() });
  await signIn(page);
  const projectId = await createProject(page, testProject('Flow Proposal Versions'));

  // Step 8 with nothing answered: Generate is never disabled; it opens the landing with the stored proposal.
  await openProjectScreen(page, projectId, 'steps/8');
  await checkScreen(page, { demo: false, label: 'h-OB-8-nothing-answered' }, checked);
  const generate = page.getByRole('button', { name: 'Generate Proposal', exact: true });
  await expect(generate).toBeEnabled();
  await pressPrimary(page, 'Generate Proposal', 'proposal');
  await checkScreen(page, { demo: false, label: 'h-UD-06-first-version' }, checked);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const outputs = page.locator('[data-output]');
  expect(await outputs.count()).toBeGreaterThan(0);
  await expect(page.locator('[data-output][data-availability="figure"]')).toHaveCount(0);
  const head = page.getByRole('region', { name: 'Where your proposal stands' });
  await expect(head).toContainText('Not available yet: SOVITECH point templates; SOVITECH cost ranges and benchmarks');
  await expect(head).toContainText('gross floor area');
  await expect(page.getByRole('region', { name: 'Energy' })).toContainText('SOVITECH savings factors');
  await expect(page.getByRole('region', { name: 'Measures' })).toContainText('SOVITECH function set');
  await expect(page.getByRole('region', { name: 'Operating cost and payback' })).toContainText('Not available yet: the duration unit');
  await expect(page.locator('main')).not.toContainText(/\bROI\b|Formal quotation|Superseded/u);
  const firstVersion = await page.locator('[data-proposal-snapshot]').getAttribute('data-proposal-snapshot');
  expect(firstVersion).not.toBeNull();

  // An investment output's Add opens step 8's inline ask for the area, on the owner's own request (R-012; G7-11).
  await page.getByRole('region', { name: 'Investment' }).getByRole('button', { name: 'Add gross floor area', exact: true }).first().click();
  await waitForStep(page, 8);
  await expect(page.getByRole('textbox', { name: /gross floor area/iu }).or(page.getByRole('spinbutton', { name: /gross floor area/iu })).first()).toBeVisible();
  await checkScreen(page, { demo: false, label: 'h-OB-8-add-area' }, checked);

  // Generate again: a second version; the landing shows it, and the versions rail lists both, newest first.
  await pressPrimary(page, 'Generate Proposal', 'proposal');
  await checkScreen(page, { demo: false, label: 'h-UD-06-second-version' }, checked);
  const secondVersion = await page.locator('[data-proposal-snapshot]').getAttribute('data-proposal-snapshot');
  expect(secondVersion).not.toBe(firstVersion);
  const versions = page.getByRole('navigation', { name: 'Versions' }).getByRole('link');
  await expect(versions).toHaveCount(2);
  await expect(versions.first()).toHaveAttribute('aria-current', 'page');

  // The first version stays readable as generated (2.4; G4-45), with the notice and the way to the latest.
  await versions.nth(1).click();
  await page.waitForURL((url) => url.pathname === `/projects/${projectId}/proposals/${firstVersion ?? ''}`);
  await page.locator(`[data-proposal-snapshot="${firstVersion ?? ''}"] [data-proposal-head]`).waitFor();
  await checkScreen(page, { demo: false, label: 'h-UD-06-earlier-version' }, checked);
  await expect(page.getByText('This is an earlier version of your preliminary proposal, kept as it was generated.', { exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Project pages' }).locator('a[aria-current="page"]')).toHaveText('Proposal');
  await page.getByRole('link', { name: 'Open the latest version', exact: true }).click();
  await waitForStep(page, 'proposal');
  await expect(page.locator(`[data-proposal-snapshot="${secondVersion ?? ''}"]`)).toBeVisible();

  // Download PDF on a project that is not the demo: no demo line on any page, no reserved term, no figure.
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 90_000 }), page.getByRole('button', { name: 'Download PDF', exact: true }).click()]);
  const bytes = readFileSync(await download.path());
  expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  const pages = pdfPages(bytes);
  expect(pages.length).toBeGreaterThanOrEqual(3);
  const text = pages.join('\n').replace(/\s+/gu, ' ');
  expect(text).not.toContain(DEMO_LINE);
  expect(text).toContain('Not available yet: SOVITECH cost ranges and benchmarks');
  expect(text).toContain('TEST Flow Proposal Versions');
  expect(reservedTermsInPdf(text)).toEqual([]);

  // Reports lists the export, by the signed-in owner; no demo line on the cover.
  await followSidebar(page, 'Reports');
  await checkScreen(page, { demo: false, label: 'h-DB-18-reports' }, checked);
  await expect(page.getByRole('table', { name: 'Generated documents' }).locator('[data-report-row]')).toHaveCount(1);
  await expect(page.locator('[data-report-cover]')).not.toContainText(DEMO_LINE);
  expect(checked).toHaveLength(6);
});
