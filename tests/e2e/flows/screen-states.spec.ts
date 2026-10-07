/**
 * Every screen and state of the render test's list (tests/e2e/render/screens.ts), reached the same
 * way, with axe under the WCAG 2.2 AA tags (zero violations) and the demo line: on the demo
 * project's screens, on the demo's row of the project list only, and on no other project's screen
 * (rule 10, "Demo data"; GS-1; US-REVIEW-03 AC1, AC7; prompt 3 phase 3 exit). The render test and
 * its reserved-term scan run on the same list in the render project (`pnpm test:render`), and the
 * flows run all of them on the screens they pass through (screen-checks.ts).
 *
 * Phase 7: the project list of an account that is not a member of the demo (the engineer, the commercial reviewer, the
 * admin) lists no demo row, so no demo line; the development owner's lists exactly one demo row with exactly one demo
 * line (phase 7 part B, A-5: the check is tied to the signed-in account, read from the session, so a demo row that
 * went missing from the owner's list fails it); the admin area's pages show the demo line on each of the demo's rows
 * only (`demoRowProblems`; rule 10; G10-10). Only the development owner is a member of the demo, against the PRD's
 * R-136 interim (the build log, phase 7, "Product doc issues"; D-13).
 *
 * A screen whose arrange holds some of the page's requests (a loading state, or a file uploading;
 * tests/e2e/support/network.ts) is checked in that state, while the hold stands, and the hold is
 * released after (phase 3 part B, V-1): axe reads the loading state itself, and the demo line must show
 * on the demo's screens while they load.
 *
 * No screen opens a dialog (rule 7, "Late findings never interrupt": they "never open a dialog"; PRD
 * R-004; G7-4): no `dialog` or `alertdialog` role and no modal element on any screen or state, the late
 * finding on step 6 included, whose dot and quiet notice its arrange waits for. No phase 3 screen has
 * a dialog of its own (the approved designs draw none; UD-42's delete confirmation is not built).
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { RENDER_SCREENS } from '../render/screens';
import { readStackState } from '../setup/paths';
import { heldOn } from '../support/network';
import { screenReady } from '../support/wizard';
import { DEMO_LINE, WCAG_TAGS, demoRowProblems } from './screen-checks';

for (const screen of RENDER_SCREENS) {
  test(`R-044 · R-138 · R-004 · US-REVIEW-03 AC1 · AC7 · US-INTAKE-19 · rules 7 and 10 · WCAG 2.2 AA: ${screen.name}`, async ({ page }) => {
    await page.goto(screen.path.includes(':') ? '/sign-in' : screen.path);
    if (screen.arrange !== undefined) await screen.arrange(page);
    // A held screen is checked as it stands (loading, or a file uploading); every other once it has rendered.
    const hold = heldOn(page);
    if (hold === undefined) await screenReady(page);

    const axe = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(axe.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`)).toEqual([]);

    const path = new URL(page.url()).pathname;
    const { demoProjectId } = readStackState();
    const demoLines = await page.getByText(DEMO_LINE, { exact: true }).count();
    if (path.startsWith(`/projects/${demoProjectId}`)) expect(demoLines, 'the demo line on the demo project').toBeGreaterThan(0);
    else if (path === '/projects') {
      // Phase 7: only an account that is a member of the demo (the development owner, the one development account
      // holding `owner`) lists its row; part B (A-5): read who is signed in, so the owner's row is required, not optional.
      const session = (await (await page.request.get('/api/auth/session')).json()) as { user: { roles: readonly string[] } | null };
      const demoRows = await page.locator(`a[href^="/projects/${demoProjectId}/"]`).count();
      if (session.user?.roles.includes('owner') === true) {
        expect(demoRows, "the development owner's list holds the demo's row").toBeGreaterThan(0);
        expect(demoLines, "the demo line on the demo's row, once").toBe(1);
      } else {
        expect(demoRows, 'an account that is not a member of the demo lists no demo row').toBe(0);
        expect(demoLines, 'no demo line without the demo row').toBe(0);
      }
    } else if (path.startsWith('/admin/')) expect(await demoRowProblems(page, demoProjectId), "the demo line on the demo's rows only").toEqual([]);
    else expect(demoLines, 'no demo line off the demo project').toBe(0);

    // Nothing modal: no dialog, alert dialog or aria-modal element (rule 7; G7-4 in the browser).
    expect(await page.getByRole('dialog').count(), 'no dialog').toBe(0);
    expect(await page.getByRole('alertdialog').count(), 'no alert dialog').toBe(0);
    expect(await page.locator('dialog[open], [aria-modal="true"]').count(), 'no modal element').toBe(0);
    hold?.release();
  });
}
