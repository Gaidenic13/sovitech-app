/**
 * G2-1 (docs/guardrails.md section 7; rule 2, "Render test"; F-RENDER-06).
 * Situation: a screen renders a digit outside a bound value element.
 * Expected: the render test fails.
 *
 * The render test is Playwright-based (tests/e2e/render/). This Vitest case drives it through
 * Playwright's library API: it launches Chromium itself and loads the harness pages under
 * tests/e2e/pages/ from file:// URLs, each with the display objects it declares. Each bad page
 * holds one kind of unbound number and must fail with exactly its expected violation kinds
 * (and counts, where it holds several). The clean page, whose every number sits in a value
 * element as its display object declares it or fits an allowlist entry, must pass, so a check
 * that fails everything cannot pass this case. A number is bound only as the screen's display
 * object serves it: a value id the screen was not served binds nothing, a served id around
 * other numbers binds none of them, and a check or a screen entry without display objects
 * from the API is refused. docs/adr/0006-render-test.md records the reading.
 */
import { chromium, type Browser } from '@playwright/test';
import { afterAll, beforeAll, describe, test } from 'vitest';
import { RENDER_ALLOWLIST } from '../e2e/render/allowlist';
import { displayObjectsFromApi } from '../e2e/render/api-display-objects';
import { withoutDisplayObject } from '../e2e/render/display-objects';
import { CLEAN_PAGE, G2_1_PAGES, harnessPageDisplayObjects, harnessPageOptions, harnessPageUrl } from '../e2e/render/harness-pages';
import { checkUrl, formatRenderReport, violationKinds, type RenderCheckOptions } from '../e2e/render/render-check';
import { screenProblems } from '../e2e/render/screens-schema';

let browser: Browser | undefined;

beforeAll(async () => {
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser?.close();
});

function launched(): Browser {
  if (browser === undefined) throw new Error('Chromium did not launch.');
  return browser;
}

describe.concurrent('G2-1 · F-RENDER-06: a digit outside a bound value element fails the render test', () => {
  test.for(G2_1_PAGES)('G2-1: $file fails: $about', async (page, { expect }) => {
    const report = await checkUrl(launched(), harnessPageUrl(page.file), harnessPageOptions(page));
    const account = formatRenderReport(report);
    expect(report.ok, account).toBe(false);
    expect(violationKinds(report), account).toEqual(page.expectKinds);
    expect(new Set(report.violations.map((item) => item.caseId)), account).toEqual(new Set(['G2-1']));
    for (const [kind, count] of Object.entries(page.expectCounts ?? {})) {
      expect(report.violations.filter((item) => item.kind === kind).length, `${kind} count\n${account}`).toBe(count);
    }
  });

  test('G2-1: the clean page, with every number in a value element as served or on the allowlist, passes', async ({ expect }) => {
    const report = await checkUrl(launched(), harnessPageUrl(CLEAN_PAGE.file), harnessPageOptions(CLEAN_PAGE));
    const account = formatRenderReport(report);
    expect(report.ok, account).toBe(true);
    expect(report.stats.boundNumberTexts, account).toBeGreaterThan(0);
    expect(report.stats.ready && report.stats.readyRequired, account).toBe(true);
    expect(report.stats.forcedElements, account).toBeGreaterThan(0);
    expect(report.stats.hoverTargets, account).toBeGreaterThan(0);
  });

  test('G2-1: every allowlist entry is one the harness pages need, and the clean page uses it', async ({ expect }) => {
    const report = await checkUrl(launched(), harnessPageUrl(CLEAN_PAGE.file), harnessPageOptions(CLEAN_PAGE));
    for (const entry of [...RENDER_ALLOWLIST.entries, ...RENDER_ALLOWLIST.unreadable]) {
      const uses = report.stats.allowlistUse[entry.id];
      expect(uses !== undefined && uses > 0, `allowlist entry "${entry.id}" is not used by ${CLEAN_PAGE.file}`).toBe(true);
    }
  });

  test('G2-1: a value id the screen was not served fails, and a check without display objects is refused', async ({ expect }) => {
    // The clean page, checked without one of its display objects: that element's number is
    // no longer bound, so the page fails.
    const withoutOne = withoutDisplayObject(harnessPageDisplayObjects(CLEAN_PAGE.file), 'asset:a-test.coolingCapacity');
    const report = await checkUrl(launched(), harnessPageUrl(CLEAN_PAGE.file), { displayObjects: withoutOne });
    const account = formatRenderReport(report);
    expect(report.ok, account).toBe(false);
    expect(violationKinds(report), account).toEqual(['unknown-value-id']);
    // No display objects at all: the check does not run, so no screen can pass without them.
    const none = {} as unknown as RenderCheckOptions;
    await expect(checkUrl(launched(), harnessPageUrl(CLEAN_PAGE.file), none)).rejects.toThrow(/displayObjects/);
    const malformed = { displayObjects: { guestRooms: { text: 'TEST 123' } } } as unknown as RenderCheckOptions;
    await expect(checkUrl(launched(), harnessPageUrl(CLEAN_PAGE.file), malformed)).rejects.toThrow(/not a value id/);
    const asFunction = { displayObjects: () => ({ 'building:b-test.guestRooms': { text: 'TEST 123' } }) } as unknown as RenderCheckOptions;
    await expect(checkUrl(launched(), harnessPageUrl(CLEAN_PAGE.file), asFunction)).rejects.toThrow(/not a function/);
  });

  test('G2-1: typed display objects bind nothing outside the harness pages; an app screen takes them from the API', async ({
    expect,
  }) => {
    const typed = { displayObjects: { 'building:b-test.guestRooms': { text: 'TEST 123' } } };
    const appLike = 'data:text/html,<span data-value-id="building:b-test.guestRooms">TEST 123</span>';
    await expect(checkUrl(launched(), appLike, typed)).rejects.toThrow(/accepted only on the harness's own pages/);
  });

  test('G2-1: a screen entry takes its display objects only from the registered API adapter, or shows no value', ({ expect }) => {
    const problems = (entry: Record<string, unknown>): string => screenProblems([{ name: 'TEST screen', path: '/', ...entry }]).join('\n');
    expect(problems({})).toContain('has no displayObjects');
    expect(problems({ displayObjects: { 'building:b-test.guestRooms': { text: 'TEST 123' } } })).toContain('hand-typed map');
    // A function returning literal ids or display objects is refused, whatever it returns.
    expect(problems({ displayObjects: () => Promise.resolve({ 'building:demo.area': { text: 'TEST 1' } }) })).toContain(
      'displayObjects is a function',
    );
    expect(problems({ knownValueIds: () => Promise.resolve(['building:demo.area']), displayObjects: {} })).toContain(
      'knownValueIds is not accepted',
    );
    expect(problems({ displayObjects: { kind: 'api-display-objects' } })).toContain('not registered');
    expect(problems({ displayObjects: {} })).toBe('');
    expect(problems({ displayObjects: displayObjectsFromApi() })).toBe('');
  });
});
