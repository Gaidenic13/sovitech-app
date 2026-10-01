/**
 * Phase 3 exit (c) (prompt 3 section 10): a new project with no documents that skips everything and
 * still reaches step 8, then Generate opens the proposal page (5.2 "Generate before phase 5", read
 * with PRD 10.4; ADR 0039). Guardrails rule 7 ("Never block the owner unnecessarily": only the four
 * required fields block; "Skip for now"; Continue and Generate never disabled), G7-6 (the four
 * required fields), G7-3 (no Skip on an answered question), 5.2 "No documents" (no manual-entry
 * form; values read Unknown or Not provided yet; outputs "Not available yet"). Every screen and
 * state it reaches passes the render test, axe and the reserved-term scan, and carries no demo line
 * (screen-checks.ts).
 */
import { expect, test } from '@playwright/test';
import { displayObjectsFromApi } from '../render/api-display-objects';
import { prepareRenderCheck } from '../render/render-check';
import { createProject, pressPrimary, signIn, skipEverything, testProject, waitForStep } from '../support/wizard';
import { checkScreen, type CheckedScreens } from './screen-checks';

test('US-INTAKE-01 · US-INTAKE-02 · US-INTAKE-06 · US-INTAKE-16 · US-REVIEW-10 · R-001 · R-003 · R-047 · G7-6 · G7-3 · rule 7: a new project with no documents skips everything and reaches step 8, then the proposal page (phase 3 exit (c))', async ({
  page,
}) => {
  test.setTimeout(8 * 60_000);
  const checked: CheckedScreens = [];
  const project = testProject('Flow No Documents');
  await prepareRenderCheck(page, { displayObjects: displayObjectsFromApi() });

  await page.goto('/sign-in');
  await checkScreen(page, { demo: false, label: 'c-UD-36-sign-in' }, checked);
  await signIn(page);
  await expect(page).toHaveURL(/\/projects$/u);
  await checkScreen(page, { demo: 'list', label: 'c-UD-37-projects' }, checked);

  // Step 1: the four required fields are the only block (G7-6); Next is never disabled.
  await page.getByRole('link', { name: 'New project' }).click();
  await expect(page).toHaveURL(/\/projects\/new$/u);
  await checkScreen(page, { demo: false, label: 'c-OB-1-new-empty' }, checked);
  const next = page.getByRole('button', { name: 'Next' });
  await expect(next).toBeEnabled();
  await next.click();
  await expect(page.getByText('Fill in this field to create the project.').first()).toBeVisible();
  await expect(page).toHaveURL(/\/projects\/new$/u);
  await checkScreen(page, { demo: false, label: 'c-OB-1-new-errors' }, checked);
  const projectId = await createProject(page, project);

  // Step 2: no file; Continue is never disabled (rule 7).
  await checkScreen(page, { demo: false, label: 'c-OB-2-no-files' }, checked);
  await expect(page.getByText('No files added yet. You can continue without documents and add them later.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled();
  await pressPrimary(page, 'Continue', 3);

  // Step 3: nothing read; no manual-entry form (5.2 "No documents"); the model area names what is missing.
  await checkScreen(page, { demo: false, label: 'c-OB-3-no-documents' }, checked);
  await expect(page.getByText('No documents were uploaded, so nothing was read. You can add the facts later, or continue.')).toBeVisible();
  await pressPrimary(page, 'Continue', 4);

  // Steps 4 to 7: every unanswered question skipped, then Continue.
  for (const step of [4, 5, 6, 7] as const) {
    await checkScreen(page, { demo: false, label: `c-OB-${String(step)}-unanswered` }, checked);
    const skipped = await skipEverything(page);
    expect(skipped, `step ${String(step)} offers Skip for now on its unanswered questions`).toBeGreaterThan(0);
    await expect(page.getByText('You can provide this later.').first()).toBeVisible();
    await checkScreen(page, { demo: false, label: `c-OB-${String(step)}-skipped` }, checked);
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled();
    await pressPrimary(page, 'Continue', step + 1);
  }

  // Step 8: incomplete data; Generate is never disabled and opens the proposal page.
  await checkScreen(page, { demo: false, label: 'c-OB-8-review' }, checked);
  const generate = page.getByRole('button', { name: 'Generate Proposal', exact: true });
  await expect(generate).toBeEnabled();
  await generate.click();
  await waitForStep(page, 'proposal');
  await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/proposal$`, 'u'));
  await checkScreen(page, { demo: false, label: 'c-UD-07-proposal' }, checked);
  await expect(page.getByText('No investment figure is available yet. Each output below names what it still needs.')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  expect(checked).toHaveLength(16);
});
