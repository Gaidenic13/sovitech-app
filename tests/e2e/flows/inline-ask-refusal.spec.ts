/**
 * Step 8's inline ask refusing an ambiguous number, on the page (phase 3 part B, V-1; G8-21's API case
 * is tests/guardrails/G8-21.test.ts): guardrails rule 8, "Ambiguous readings keep both … It is never
 * silently read one way"; US-INTAKE-17 AC7; UD-35. The owner of a new TEST project types "1.500" in the
 * gross floor area's inline ask and saves: the page shows the refusal on that field, and nothing is
 * stored (the ask is served again when the step is opened afresh).
 *
 * The refused state is checked as every flow checks a screen (screen-checks.ts: the render test with
 * its reserved-term scan, axe under the WCAG 2.2 AA tags, no demo line on a project that is not the
 * demo). Axe reads it first as the owner sees it, with "1.500" still in the box. The render test then
 * reads it once the owner has cleared the box, the refusal still shown: what an owner types shows in
 * the box before it is stored and bound to a display object, and the render test reads it as an
 * unbound number (rule 2; no render-allowlist entry covers typed input, and none is added here), so a
 * render screen in screens.ts could not hold this state.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { displayObjectsFromApi } from '../render/api-display-objects';
import { prepareRenderCheck } from '../render/render-check';
import { newProjectAt, openProjectScreen } from '../support/wizard';
import { WCAG_TAGS, checkScreen } from './screen-checks';

/** The refusal of a number that reads two ways (the catalogue's `edit.numberAmbiguous`). */
const AMBIGUOUS = 'This number can be read more than one way. Write it again so it can be read only as you mean it.';

test('G8-21 · US-INTAKE-17 AC7 · UD-35 · rule 8 · rule 2: step 8\'s inline ask refuses "1.500" on its field, stores nothing, and the refused state passes axe, the render test and the reserved-term scan', async ({
  page,
}) => {
  test.setTimeout(4 * 60_000);
  await prepareRenderCheck(page, { displayObjects: displayObjectsFromApi() });
  const projectId = await newProjectAt(page, 'Inline Ask Refusal', 'steps/8');

  const ask = page.locator('[data-inline-ask="q.building.grossFloorArea"]');
  const area = ask.getByRole('textbox', { name: /^Gross floor area/u });
  await area.fill('1.500');
  await ask.getByRole('combobox', { name: 'What it measures' }).selectOption({ index: 1 });
  await ask.getByRole('button', { name: 'Save', exact: true }).click();

  // The refusal, on that field; the owner stays on step 8 with what they typed.
  await expect(ask.getByText(AMBIGUOUS, { exact: true })).toBeVisible();
  await expect(area).toHaveAttribute('aria-invalid', 'true');
  await expect(area).toHaveValue('1.500');
  await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/steps/8$`, 'u'));
  const typed = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(typed.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`)).toEqual([]);

  // The owner clears the box; the refusal stays. The render test, axe and the demo line on that state.
  await area.fill('');
  await expect(ask.getByText(AMBIGUOUS, { exact: true })).toBeVisible();
  await checkScreen(page, { demo: false, label: 'G8-21-inline-ask-refused' });

  // Nothing was stored: opened afresh, step 8 still asks for the gross floor area.
  await openProjectScreen(page, projectId, 'steps/8');
  await expect(page.locator('[data-inline-ask="q.building.grossFloorArea"]').getByRole('textbox', { name: /^Gross floor area/u })).toHaveValue('');
});
