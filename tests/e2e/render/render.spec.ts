/**
 * The render test on the app's screens (guardrails rule 2, "Render test"; 2.8 "Reserved
 * terms"; G2-1, G2-8; F-RENDER-06). Run by `pnpm test:render` (Playwright project `render`)
 * and `pnpm check`.
 *
 * - Screens: every entry of screens.ts, served by the Playwright web server, must pass, each
 *   checked with the display objects it takes from the API (or none, for a screen with no
 *   value). The screen list itself must follow the rules of screens-schema.ts, and the web
 *   server must have been started for this run (never an older server that was already
 *   listening), so the screens checked are the current build.
 * - Canaries: in this same runner, the harness must still fail a bare digit, a served id
 *   around other numbers, a number shown only on hover, a late count-up and a reserved term,
 *   and pass the clean page, so a harness broken by this runner's transform cannot pass the
 *   screens by finding nothing. The full self-proof is the case files
 *   tests/guardrails/G2-1.test.ts and G2-8.test.ts and tools/checks/render/rendered-copy.test.ts.
 */
import { expect, test } from '@playwright/test';
import {
  CLEAN_PAGE,
  G2_1_PAGES,
  G2_8_PAGES,
  RESERVED_TERM_PAGES,
  harnessPageOptions,
  harnessPageUrl,
  type HarnessPage,
} from './harness-pages';
import { formatRenderReport, prepareRenderCheck, runRenderCheck, violationKinds } from './render-check';
import { RENDER_SCREENS } from './screens';
import { screenDisplayObjects, screenProblems } from './screens-schema';

test.describe('G2-1 · G2-8 · F-RENDER-06: render test on the app screens', () => {
  test('G2-1: every screen entry takes its display objects from the API, or shows no value', () => {
    expect(screenProblems(RENDER_SCREENS)).toEqual([]);
  });

  test('G2-1 · G2-8: the web server was started for this run, not reused', () => {
    // A reused server could be an older build, or another project, on the same port.
    const server = test.info().config.webServer;
    expect(server, 'playwright.config.ts has no webServer').not.toBeNull();
    expect(server?.reuseExistingServer, 'playwright.config.ts must set webServer.reuseExistingServer to false').toBe(false);
  });

  for (const screen of RENDER_SCREENS) {
    test(`G2-1 · G2-8: ${screen.name}`, async ({ page }) => {
      await prepareRenderCheck(page, { displayObjects: screenDisplayObjects(screen) });
      await page.goto(screen.path);
      if (screen.arrange !== undefined) await screen.arrange(page);
      const report = await runRenderCheck(page);
      expect(report.ok, formatRenderReport(report)).toBe(true);
    });
  }
});

function canary(file: string, pages: readonly HarnessPage[]): HarnessPage {
  const found = pages.find((page) => page.file === file);
  if (found === undefined) throw new Error(`No harness page ${file}.`);
  return found;
}

const CANARIES: readonly HarnessPage[] = [
  canary('g2-1/bare-digit-text.html', G2_1_PAGES),
  canary('g2-1/transient-digit.html', G2_1_PAGES),
  canary('g2-1/unknown-value-id.html', G2_1_PAGES),
  canary('g2-1/container-ties-card.html', G2_1_PAGES),
  canary('g2-1/number-words.html', G2_1_PAGES),
  canary('g2-1/step-number-outside-stepper.html', G2_1_PAGES),
  canary('g2-1/step-title-misuse.html', G2_1_PAGES),
  canary('g2-1/canvas.html', G2_1_PAGES),
  canary('g2-1/svg-path-glyphs.html', G2_1_PAGES),
  canary('g2-1/hover-only-digit.html', G2_1_PAGES),
  canary('g2-8/count-up.html', G2_8_PAGES),
  canary('g2-8/count-up-on-scroll.html', G2_8_PAGES),
  canary('g2-8/count-up-late.html', G2_8_PAGES),
  canary('reserved-terms/object-keys-label.html', RESERVED_TERM_PAGES),
  canary('reserved-terms/tagged-template.html', RESERVED_TERM_PAGES),
  CLEAN_PAGE,
];

test.describe('G2-1 · G2-8 · 2.8: render harness canaries in this runner', () => {
  for (const harnessPage of CANARIES) {
    const verdict = harnessPage.expectKinds.length === 0 ? 'passes' : 'fails';
    test(`G2-1 · G2-8: ${harnessPage.file} ${verdict}`, async ({ page }) => {
      const options = harnessPageOptions(harnessPage);
      await prepareRenderCheck(page, options);
      await page.goto(harnessPageUrl(harnessPage.file));
      const report = await runRenderCheck(page, options);
      expect(violationKinds(report), formatRenderReport(report)).toEqual(harnessPage.expectKinds);
    });
  }
});
