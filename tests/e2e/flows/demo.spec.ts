/**
 * Phase 3 exit (a) (prompt 3 section 10): the demo project from step 1 to step 8, then Generate and
 * the proposal page, as the development owner (a member of the demo, PRD R-136 interim). GS-1's two
 * halves as far as phase 3 reaches (GS-1 itself is phase 7's end-to-end case): no
 * `question_for_known_field` event on the demo project (guardrails section 8; rules 5 and 6: the
 * owner is never asked what is known), read from the store through the stack's TEST-only control
 * route; and the demo line on every screen of the demo (rule 10, "Demo data"; US-REVIEW-03 AC1).
 * Every screen passes the render test, axe and the reserved-term scan (screen-checks.ts).
 *
 * The demo is the fixture's `test` building (owner, 2026-09-30), seeded through the extractor's
 * sandbox. With no API key no value comes from a document: step 3's facts read Unknown, the models
 * read "Not analysed: IFC model stored, not analysed", and every output "Not available yet".
 *
 * GS-1 on the rendered page too (phase 3 part B, V-3): the control route's event check reads what the
 * question engine logged, so a question the page renders for a known field without the engine
 * logging it would pass it. So each of steps 4 to 7 is also read as the owner sees it: every answer
 * the demo seed stores for that step (fixtures/demo/owner-answers.json, the seed's input) renders as
 * that question's chosen option (ticked or not, as stored), and the step renders no "Skip for now" and
 * no "You can provide this later.", the unanswered and skipped states. The option labels are the
 * app's own catalogue (apps/web/src/copy/en.json), read as data.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { displayObjectsFromApi } from '../render/api-display-objects';
import { prepareRenderCheck } from '../render/render-check';
import { REPO_ROOT, readStackState } from '../setup/paths';
import { pressPrimary, signIn, waitForStep } from '../support/wizard';
import { checkScreen, type CheckedScreens } from './screen-checks';

interface GuardrailEventRow {
  readonly type: string;
  readonly fieldKey: string | null;
}

interface SeedAnswer {
  readonly step: number;
  readonly fieldKey: string;
  readonly choice?: string;
  readonly text?: string;
}

/** The answers the demo seed stores (its input file), and the app's catalogue, read as data. */
const SEED_ANSWERS = (JSON.parse(readFileSync(join(REPO_ROOT, 'fixtures', 'demo', 'owner-answers.json'), 'utf8')) as { answers: SeedAnswer[] }).answers;
const CATALOGUE = JSON.parse(readFileSync(join(REPO_ROOT, 'apps', 'web', 'src', 'copy', 'en.json'), 'utf8')) as {
  options: Record<string, Record<string, string>>;
  systems: Record<string, { title: string }>;
  goals: Record<string, { title: string }>;
  automation: Record<string, { title: string }>;
};

/** How a stored seed answer shows on its step: the input's role and label, and whether it is chosen. */
function shownAnswer(answer: SeedAnswer): { readonly role: 'checkbox' | 'radio'; readonly label: string; readonly chosen: boolean } {
  const [subject, group, id = ''] = answer.fieldKey.split('.');
  const choice = answer.choice ?? '';
  if (subject === 'project' && group === 'scope') return { role: 'checkbox', label: CATALOGUE.systems[id]?.title ?? id, chosen: choice === 'include' };
  if (subject === 'project' && group === 'goal') return { role: 'checkbox', label: CATALOGUE.goals[id]?.title ?? id, chosen: choice === 'selected' };
  if (subject === 'project' && group === 'automation') return { role: 'checkbox', label: CATALOGUE.automation[id]?.title ?? id, chosen: choice === 'selected' };
  const label = CATALOGUE.options[answer.fieldKey]?.[choice];
  if (label === undefined) throw new Error(`no catalogue label for ${answer.fieldKey} = ${choice}`);
  return { role: 'radio', label, chosen: true };
}

/**
 * GS-1 on the page (V-3): every answer the seed stores for the step renders as chosen (or not) as
 * stored, and nothing on the step renders as unanswered or skipped.
 */
async function expectSeedAnswersShown(page: Page, step: 4 | 5 | 6 | 7): Promise<void> {
  const answers = SEED_ANSWERS.filter((answer) => answer.step === step);
  expect(answers.length, `the demo seed answers the questions of step ${String(step)}`).toBeGreaterThan(0);
  for (const answer of answers) {
    const shown = shownAnswer(answer);
    const input = page.getByRole(shown.role, { name: shown.label, exact: true });
    await expect(input, `step ${String(step)}: ${answer.fieldKey} as the seed stores it`).toHaveCount(1);
    if (shown.chosen) await expect(input, `step ${String(step)}: ${answer.fieldKey} shows the seed's answer`).toBeChecked();
    else await expect(input, `step ${String(step)}: ${answer.fieldKey} shows the seed's answer`).not.toBeChecked();
  }
  await expect(page.getByRole('button', { name: 'Skip for now', exact: true }), `step ${String(step)}: no "Skip for now" on a question the seed answered`).toHaveCount(0);
  await expect(page.getByText('Skip for now', { exact: true }), `step ${String(step)}: no "Skip for now" in any form`).toHaveCount(0);
  await expect(page.getByText('You can provide this later.', { exact: true }), `step ${String(step)}: no question shows as skipped`).toHaveCount(0);
}

async function guardrailEvents(projectId: string, type: string): Promise<GuardrailEventRow[]> {
  const { controlOrigin } = readStackState();
  const response = await fetch(`${controlOrigin}/guardrail-events?projectId=${projectId}&type=${type}`);
  expect(response.ok).toBe(true);
  return (await response.json()) as GuardrailEventRow[];
}

test('GS-1 · US-INTAKE-01 · US-REVIEW-03 AC1 · US-REVIEW-04 · US-REVIEW-08 · US-ADMIN-15 · R-044 · R-136 · R-137 · rules 5, 6 and 10: the demo from step 1 to step 8 and the proposal page, with the demo line on every screen and no question_for_known_field event (phase 3 exit (a))', async ({
  page,
}) => {
  test.setTimeout(8 * 60_000);
  const { demoProjectId } = readStackState();
  const checked: CheckedScreens = [];
  await prepareRenderCheck(page, { displayObjects: displayObjectsFromApi() });

  await signIn(page);
  await checkScreen(page, { demo: 'list', label: 'a-UD-37-projects' }, checked);
  await page.getByRole('link', { name: /Demo Hotel Bucharest/u }).click();
  await waitForStep(page, 1);
  await expect(page).toHaveURL(new RegExp(`/projects/${demoProjectId}/steps/1$`, 'u'));

  // Step 1: the stored answers, nothing asked again (R-009).
  await checkScreen(page, { demo: true, label: 'a-OB-1-stored' }, checked);
  await expect(page.getByRole('textbox', { name: 'Project name' })).toHaveCount(0);
  await pressPrimary(page, 'Next', 2);

  // Step 2: the ten demo files with their status lines (UD-33).
  await checkScreen(page, { demo: true, label: 'a-OB-2-files' }, checked);
  await expect(page.getByText('Not analysed: IFC model stored, not analysed').first()).toBeVisible();
  await pressPrimary(page, 'Continue', 3);

  // Step 3 and UD-45.
  await checkScreen(page, { demo: true, label: 'a-OB-3-building' }, checked);
  await page.getByRole('link', { name: 'View all extracted data' }).or(page.getByRole('button', { name: 'View all extracted data' })).click();
  await page.waitForURL(new RegExp(`/projects/${demoProjectId}/extracted$`, 'u'));
  await checkScreen(page, { demo: true, label: 'a-UD-45-extracted' }, checked);
  await page.getByRole('link', { name: 'Back to your building' }).or(page.getByRole('button', { name: 'Back to your building' })).click();
  await waitForStep(page, 3);
  await pressPrimary(page, 'Continue', 4);

  for (const step of [4, 5, 6, 7] as const) {
    await checkScreen(page, { demo: true, label: `a-OB-${String(step)}-stored` }, checked);
    // GS-1 on the page: every question the seed answered renders its answer, with no Skip and no skipped state.
    await expectSeedAnswersShown(page, step);
    await pressPrimary(page, 'Continue', step + 1);
  }

  await checkScreen(page, { demo: true, label: 'a-OB-8-review' }, checked);
  await pressPrimary(page, 'Generate Proposal', 'proposal');
  await checkScreen(page, { demo: true, label: 'a-UD-07-proposal' }, checked);
  expect(checked).toHaveLength(11);

  // GS-1 (as far as phase 3 reaches): the owner was asked nothing the app knows, as the store's
  // detectors logged it (the question engine's and any other that writes question_for_known_field).
  expect(await guardrailEvents(demoProjectId, 'question_for_known_field')).toEqual([]);
  expect(await guardrailEvents(demoProjectId, 'confirmation_budget_exceeded')).toEqual([]);
});
