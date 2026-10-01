/**
 * Phase 3 exit (b) (prompt 3 section 10): a new project with fixture uploads, through step 8 and the
 * proposal page. The owner uploads three synthetic fixtures (fixtures/manifest.json; owner decision
 * 2026-09-25, ADR 0028: only fixture hashes are stored) through step 2's file input: a PDF and an
 * XLSX, read by the extractor in its sandbox, and an IFC model, stored and not read (until D-01, PRD
 * R-023 and R-024; the G12-1 line). A file whose bytes are no fixture is refused on its row, and one
 * whose format is off the list is refused before any request (US-DOCS-01 AC4; US-DOCS-23). The owner
 * answers steps 4 to 7, types the gross floor area at step 8's inline ask (US-INTAKE-17; rule 8) and
 * generates. With no API key no value comes from a document (every fact reads Unknown). Every
 * screen and state reached passes the render test, axe and the reserved-term scan, with no demo line
 * (screen-checks.ts).
 */
import { expect, test } from '@playwright/test';
import { join } from 'node:path';
import { displayObjectsFromApi } from '../render/api-display-objects';
import { prepareRenderCheck } from '../render/render-check';
import { REPO_ROOT } from '../setup/paths';
import { createProject, pressPrimary, signIn, testProject, waitForStep } from '../support/wizard';
import { checkScreen, type CheckedScreens } from './screen-checks';

/** Synthetic fixtures, each listed with its hash in fixtures/manifest.json. */
const FIXTURES = ['fixtures/pdf/tabel-suprafete.pdf', 'fixtures/xlsx/tabel-camere.xlsx', 'fixtures/ifc/demo-hotel-arh.ifc'];

test('US-DOCS-01 · US-DOCS-03 · US-DOCS-04 · US-DOCS-23 · US-REVIEW-04 · US-SCOPE-02 · US-INTAKE-06 · US-INTAKE-09 · US-INTAKE-10 · US-INTAKE-17 · R-013 · R-014 · R-015 · G12-5 · rules 7, 8 and 12: a new project with fixture uploads reaches step 8 and the proposal page (phase 3 exit (b))', async ({
  page,
}) => {
  test.setTimeout(10 * 60_000);
  const checked: CheckedScreens = [];
  await prepareRenderCheck(page, { displayObjects: displayObjectsFromApi() });
  await signIn(page);
  await createProject(page, testProject('Flow Fixture Uploads'));

  // Step 2: three fixtures, one file that is no fixture, one format off the list.
  const input = page.locator('input[type="file"]');
  await input.setInputFiles(FIXTURES.map((path) => join(REPO_ROOT, path)));
  await input.setInputFiles({ name: 'TEST-not-a-fixture.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-TEST not a fixture') });
  await input.setInputFiles({ name: 'TEST-notes.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('TEST') });
  await expect(page.getByText('This format is not on the accepted list. The other files are kept.')).toBeVisible();
  // Every upload finished and every stored file read: no progress bar left on the page.
  await expect(page.getByRole('progressbar')).toHaveCount(0, { timeout: 180_000 });
  for (const name of ['tabel-suprafete.pdf', 'tabel-camere.xlsx', 'demo-hotel-arh.ifc']) await expect(page.getByText(name, { exact: true })).toBeVisible();
  await expect(page.getByText('Not analysed: IFC model stored, not analysed')).toBeVisible();
  // The file the fixtures-only guard refused (ADR 0028) shows on its own row with its reason: its name is the
  // one the API's refusal serves, bound to its value id (`upload:<id>.fileName`), never the name as typed.
  await expect(page.locator('[data-value-id^="upload:"]', { hasText: 'TEST-not-a-fixture.pdf' })).toHaveCount(1);
  await expect(page.getByText('TEST-not-a-fixture.pdf', { exact: true })).toHaveCount(1);
  await checkScreen(page, { demo: false, label: 'b-OB-2-files' }, checked);
  await pressPrimary(page, 'Continue', 3);

  // Step 3: the stored model, nothing read from it; no value from a document without an AI run.
  await checkScreen(page, { demo: false, label: 'b-OB-3-building' }, checked);
  await pressPrimary(page, 'Continue', 4);

  // Step 4: HVAC and Lighting ticked; Fire Safety not preselected (rule 11).
  await expect(page.getByRole('checkbox', { name: 'Fire Safety' })).not.toBeChecked();
  await page.getByRole('checkbox', { name: 'HVAC' }).check();
  await page.getByRole('checkbox', { name: 'Lighting' }).check();
  await expect(page.getByRole('button', { name: 'Skip for now', exact: true })).toHaveCount(0);
  await checkScreen(page, { demo: false, label: 'b-OB-4-ticked' }, checked);
  await pressPrimary(page, 'Continue', 5);

  // Step 5: the three questions answered.
  await page.getByRole('radio', { name: 'Hotel' }).check();
  await page.getByRole('radio', { name: 'Around the clock' }).check();
  await page.getByRole('radio', { name: 'Mostly occupied' }).check();
  await expect(page.getByRole('button', { name: 'Skip for now', exact: true })).toHaveCount(0);
  await checkScreen(page, { demo: false, label: 'b-OB-5-answered' }, checked);
  await pressPrimary(page, 'Continue', 6);

  // Steps 6 and 7: one card each.
  await page.getByRole('checkbox', { name: 'Reduce energy consumption' }).check();
  await checkScreen(page, { demo: false, label: 'b-OB-6-answered' }, checked);
  await pressPrimary(page, 'Continue', 7);
  await page.getByRole('checkbox', { name: 'HVAC' }).check();
  await checkScreen(page, { demo: false, label: 'b-OB-7-answered' }, checked);
  await pressPrimary(page, 'Continue', 8);

  // Step 8: the stored answers read back; the area typed at the inline ask (checked after Save,
  // when the typed digits are stored and bound).
  await checkScreen(page, { demo: false, label: 'b-OB-8-review' }, checked);
  await page.getByRole('textbox', { name: 'Gross floor area' }).fill('1500');
  await page.getByRole('combobox', { name: 'What it measures' }).selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Save', exact: true }).first().click();
  await expect(page.getByRole('textbox', { name: 'Gross floor area' })).toHaveCount(0, { timeout: 30_000 });
  await checkScreen(page, { demo: false, label: 'b-OB-8-area-saved' }, checked);
  await pressPrimary(page, 'Generate Proposal', 'proposal');
  await waitForStep(page, 'proposal');
  await checkScreen(page, { demo: false, label: 'b-UD-07-proposal' }, checked);
  expect(checked).toHaveLength(9);
});
