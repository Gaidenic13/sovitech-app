/**
 * Phase 7: G3-7's rendered half, the engineer's verification as the owner sees it (guardrails section 7, G3-7: "An
 * engineer verifies an AI-inferred AHU | Badge Verified by SOVITECH, and the line reads 'AI inference, verified by
 * SOVITECH'"; rule 3; rule 10, "Engineer verification is an authenticated action"; 2.8: "Engineer verified | Verified by
 * SOVITECH | 'AI inference, verified by SOVITECH on 12 Oct'"; PRD R-128 Guardrail behaviour). The case file is
 * tests/guardrails/G3-7.test.ts.
 *
 * The development owner creates a TEST project through step 1. The e2e stack's TEST-only control route then writes the
 * `building-type-engineer-review` state (tests/e2e/setup/control.ts): a TEST document and an AI inference of the building
 * type (hotel) read from it, which the stack's development engineer (synthetic, holding `sovitech_engineer`, never a
 * member of the project) opens and verifies through the store's guarded functions in the engineer's own request. No
 * review endpoint exists while PRD D-16 is open (docs/adr/0053 decision 1), so the verification goes through the guarded
 * function itself, as G3-7's case file proves it. No asset type is served while `dataset-asset-taxonomy` is closed
 * (prompt 3 5.4), so the building type stands in for the AHU on the pages, as the case file's served half does.
 *
 * The owner then reads, on step 5 and on the extracted values (UD-45): the value with the badge "Verified by SOVITECH"
 * and the line "AI inference, verified by SOVITECH on <date>", the date the store recorded, and no confirmation asked
 * of the owner for it (rule 5: an owner's confirmation of a verified value changes nothing). Every screen passes the
 * render test with its reserved-term scan, axe and the demo line rule (none: a TEST project).
 */
import { expect, test, type Page } from '@playwright/test';
import { displayObjectsFromApi } from '../render/api-display-objects';
import { prepareRenderCheck } from '../render/render-check';
import { writeTestState } from '../support/control';
import { createProject, openProjectScreen, signIn, testProject } from '../support/wizard';
import { checkScreen, type CheckedScreens } from './screen-checks';

/** 2.8's generated line for a verified inference, with the date in its slot (formatDate: "7 Oct 2026"). */
const VERIFIED_LINE = /^AI inference, verified by SOVITECH on \d{1,2} [A-Z][a-z]{2} \d{4}$/u;

/** The building type's value element: its bound text, its badge and its lines. */
async function verifiedTypeHolds(page: Page): Promise<void> {
  const line = page.getByText(VERIFIED_LINE).first();
  await expect(line).toBeVisible();
  const value = page.locator('[data-value-id$=".type"]').filter({ has: page.getByText(VERIFIED_LINE) }).first();
  await expect(value).toBeVisible();
  await expect(value.getByText('Verified by SOVITECH', { exact: true })).toHaveCount(1);
  await expect(value).toContainText('Hotel');
  await expect(value).not.toContainText(/Likely|Possible|Please check|SOVITECH will check/u);
  await expect(page.getByRole('button', { name: "Yes, it's a hotel" })).toHaveCount(0);
}

test("G3-7 (rendered half) · rule 3 · rule 10 · 2.8 · R-128 Guardrail behaviour: the development engineer's verification of an inferred building type reads Verified by SOVITECH with \"AI inference, verified by SOVITECH on <date>\" for the owner, on step 5 and the extracted values, and no confirmation is asked", async ({
  page,
}) => {
  test.setTimeout(5 * 60_000);
  const checked: CheckedScreens = [];
  await prepareRenderCheck(page, { displayObjects: displayObjectsFromApi() });
  await signIn(page);
  const projectId = await createProject(page, testProject('Flow Engineer Review'));
  await writeTestState('building-type-engineer-review', projectId);

  await openProjectScreen(page, projectId, 'steps/5');
  await verifiedTypeHolds(page);
  await checkScreen(page, { demo: false, label: 'n-OB-5-verified' }, checked);

  await openProjectScreen(page, projectId, 'extracted');
  await verifiedTypeHolds(page);
  await checkScreen(page, { demo: false, label: 'n-UD-45-verified' }, checked);

  // Step 8's For you lists no confirmation for it: a verified value is never put to the owner again (rules 3 and 5).
  await openProjectScreen(page, projectId, 'steps/8');
  await expect(page.getByText("Yes, it's a hotel", { exact: true })).toHaveCount(0);
  await checkScreen(page, { demo: false, label: 'n-OB-8-verified' }, checked);
  expect(checked).toHaveLength(3);
});
