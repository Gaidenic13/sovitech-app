/**
 * G2-8 (docs/guardrails.md section 7; rule 2, "Render test"; F-RENDER-01, F-RENDER-06).
 * Situation: a value element animates a count-up from 0 to its value.
 * Expected: the render test fails. Only the formatted bound value is ever shown, never
 * intermediate digits.
 *
 * The render test is Playwright-based (tests/e2e/render/). This Vitest case drives it through
 * Playwright's library API: it launches Chromium itself and loads the harness pages under
 * tests/e2e/pages/g2-8/ from file:// URLs, each with the display objects it declares. Each
 * page animates a value a different way (in place, by swapping elements, after a delay, 2.5 s
 * after load from a timer, after the readiness marker with no timer, on scroll, as a
 * flip-book, in an announced value, as a CSS counter, as an odometer roll, as a fade) and must
 * fail with exactly its expected violation kinds. The check waits for the readiness marker,
 * the network and the page's pending timers before it reads. The clean page, where one value goes from "Reading documents…"
 * to its number, must pass. docs/adr/0006-render-test.md records the reading, including
 * the stricter "no value animates" of prompt 3 section 11 that the fade page proves.
 */
import { chromium, type Browser } from '@playwright/test';
import { afterAll, beforeAll, describe, test } from 'vitest';
import { CLEAN_PAGE, G2_8_PAGES, harnessPageOptions, harnessPageUrl } from '../e2e/render/harness-pages';
import { checkUrl, formatRenderReport, violationKinds } from '../e2e/render/render-check';
import { findValueChanges } from '../e2e/render/timeline';

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

describe.concurrent('G2-8 · F-RENDER-01 · F-RENDER-06: a value element that counts up fails the render test', () => {
  test.for(G2_8_PAGES)('G2-8: $file fails: $about', async (page, { expect }) => {
    const report = await checkUrl(launched(), harnessPageUrl(page.file), harnessPageOptions(page));
    const account = formatRenderReport(report);
    expect(report.ok, account).toBe(false);
    expect(violationKinds(report), account).toEqual(page.expectKinds);
    expect(report.violations.some((item) => item.caseId === 'G2-8'), account).toBe(true);
  });

  test('G2-8: a value that goes from pending to its one number, shown in two places, passes', async ({ expect }) => {
    const report = await checkUrl(launched(), harnessPageUrl(CLEAN_PAGE.file), harnessPageOptions(CLEAN_PAGE));
    const account = formatRenderReport(report);
    expect(report.ok, account).toBe(true);
    expect(report.stats.timelineRecords, account).toBeGreaterThan(0);
  });
});

describe('G2-8: the timeline reading, without a browser', () => {
  const record = (t: number, key: number, valueId: string, text: string | null) => ({ t, key, valueId, text, where: `#k${key}` });

  test('G2-8: a count-up in one element is a change', ({ expect }) => {
    const changes = findValueChanges([
      record(0, 1, 'building:b.rooms', 'TEST 0'),
      record(16, 1, 'building:b.rooms', 'TEST 12'),
      record(32, 1, 'building:b.rooms', 'TEST 123'),
    ]);
    expect(changes.map((change) => change.valueId)).toEqual(['building:b.rooms']);
    expect(changes[0]?.texts).toEqual(['TEST 0', 'TEST 12', 'TEST 123']);
  });

  test('G2-8: swapping elements with one value id is a change', ({ expect }) => {
    const changes = findValueChanges([
      record(0, 1, 'building:b.rooms', 'TEST 0'),
      record(16, 1, 'building:b.rooms', null),
      record(16, 2, 'building:b.rooms', 'TEST 123'),
    ]);
    expect(changes).toHaveLength(1);
  });

  test('G2-8: pending text, then one number, is no change', ({ expect }) => {
    expect(
      findValueChanges([record(0, 1, 'asset:a.capacity', 'Reading documents…'), record(300, 1, 'asset:a.capacity', 'TEST 123 kW')]),
    ).toEqual([]);
  });

  test('G2-8: one value shown in two forms that both stay is no change', ({ expect }) => {
    expect(
      findValueChanges([record(0, 1, 'building:b.area', 'TEST 12,345 m² From document'), record(5, 2, 'building:b.area', 'TEST 12,345 m²')]),
    ).toEqual([]);
  });

  test('G2-8: a value hidden and shown again with the same number is no change', ({ expect }) => {
    expect(
      findValueChanges([
        record(0, 1, 'building:b.area', 'TEST 12,345 m²'),
        record(10, 1, 'building:b.area', null),
        record(20, 1, 'building:b.area', 'TEST 12,345 m²'),
      ]),
    ).toEqual([]);
  });
});
