/**
 * The registered API adapter of the render test (tests/e2e/render/api-display-objects.ts;
 * docs/adr/0006-render-test.md, decision 1): an app screen's display objects are the ones the
 * page itself receives from the API. A TEST server on the loopback interface stands in for the
 * API on one of the contract's display-object routes (a step view, phase 3;
 * packages/view-model/src/browser/contract/routes.ts): it serves a TEST page that fetches its
 * display objects and renders them, and the check must pass when the page shows what it was
 * served, and fail when it shows a value id or a number it was not served.
 */
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { chromium, type Browser } from '@playwright/test';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
  displayObjectsFromApi,
  isDisplayObjectRoute,
  isRegisteredApiSource,
  parseServedDisplayObjects,
} from '../../../tests/e2e/render/api-display-objects';
import { checkUrl, formatRenderReport, violationKinds } from '../../../tests/e2e/render/render-check';

/** A TEST project and building id (UUIDs in the store's form). */
const PROJECT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e01';
const BUILDING = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e02';
const ROOMS = `building:${BUILDING}.guestRooms`;
/** The step view route the TEST API answers on (steps.view, a display-object route). */
const STEP_VIEW = `/api/projects/${PROJECT}/steps/3`;

/** What the TEST API serves: one TEST value, as a contract display object. */
const SERVED = {
  displayObjects: [
    {
      valueId: ROOMS,
      kind: 'field',
      text: 'TEST 123',
      shape: 'value',
      badge: { id: 'calculated', label: 'Calculated' },
      measure: { label: 'Guest rooms' },
    },
  ],
};

/** A TEST screen that asks the TEST API for its display objects, then renders `shown` for them. */
function screen(shown: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>TEST screen</title></head><body><main id="root">Reading documents…</main>
<script>
  fetch(${JSON.stringify(STEP_VIEW)}).then((response) => response.json()).then(() => {
    document.getElementById('root').innerHTML = ${JSON.stringify(shown)};
    document.body.setAttribute('data-render-ready', '');
  });
</script></body></html>`;
}

const PAGES: Record<string, string> = {
  '/as-served': screen(`<p><span data-value-id="${ROOMS}">TEST 123 <span>Calculated</span></span> guest rooms</p>`),
  '/not-served-id': screen(`<p><span data-value-id="building:${BUILDING}.grossFloorArea">TEST 12,345 m²</span></p>`),
  '/other-number': screen(`<p><span data-value-id="${ROOMS}">TEST 12</span> guest rooms</p>`),
};

let server: Server | undefined;
let base = '';
let browser: Browser | undefined;

function launched(): Browser {
  if (browser === undefined) throw new Error('Chromium did not launch.');
  return browser;
}

describe('G2-1 · F-RENDER-06: display objects from the API, through the registered adapter', { timeout: 60_000 }, () => {
  beforeAll(async () => {
    server = createServer((request, response) => {
      const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
      if (path === STEP_VIEW) {
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(JSON.stringify(SERVED));
        return;
      }
      const page = PAGES[path];
      response.writeHead(page === undefined ? 404 : 200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(page ?? 'not found');
    });
    await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`;
    browser = await chromium.launch();
  }, 60_000);

  afterAll(async () => {
    await browser?.close();
    await new Promise<void>((resolve) => server?.close(() => resolve()));
  });

  test('G2-1: a screen that shows what the API served passes', async () => {
    const report = await checkUrl(launched(), `${base}/as-served`, { displayObjects: displayObjectsFromApi() });
    const account = formatRenderReport(report);
    expect(report.ok, account).toBe(true);
    expect(report.stats.boundNumberTexts, account).toBeGreaterThan(0);
    expect(report.stats.readyRequired && report.stats.ready, account).toBe(true);
  });

  test('G2-1: a value id the API did not serve fails', async () => {
    const report = await checkUrl(launched(), `${base}/not-served-id`, { displayObjects: displayObjectsFromApi() });
    expect(violationKinds(report), formatRenderReport(report)).toEqual(['unknown-value-id']);
  });

  test('G2-1: a number the served display object does not declare fails', async () => {
    const report = await checkUrl(launched(), `${base}/other-number`, { displayObjects: displayObjectsFromApi() });
    expect(violationKinds(report), formatRenderReport(report)).toEqual(['display-mismatch']);
  });

  test('G2-1: typed display objects are refused on an app screen', async () => {
    await expect(
      checkUrl(launched(), `${base}/as-served`, { displayObjects: { [ROOMS]: { text: 'TEST 123' } } }),
    ).rejects.toThrow(/accepted only on the harness's own pages/);
  });
});

describe('G2-1 · F-RENDER-06: the adapter itself', () => {
  test('G2-1: only a source the adapter made is registered', () => {
    expect(isRegisteredApiSource(displayObjectsFromApi())).toBe(true);
    expect(isRegisteredApiSource({ kind: 'api-display-objects' })).toBe(false);
    expect(isRegisteredApiSource(() => ({}))).toBe(false);
  });

  test('G2-1: display-object requests are the contract routes that serve display objects, by method and path', () => {
    expect(isDisplayObjectRoute('GET', `http://127.0.0.1:4173${STEP_VIEW}`)).toBe(true);
    expect(isDisplayObjectRoute('GET', 'http://127.0.0.1:4173/api/projects')).toBe(true);
    expect(isDisplayObjectRoute('POST', `http://127.0.0.1:4173/api/projects/${PROJECT}/fields/edit`)).toBe(true);
    expect(isDisplayObjectRoute('GET', `http://127.0.0.1:4173/api/projects/${PROJECT}/late-findings?current=6`)).toBe(true);
    expect(isDisplayObjectRoute('POST', 'http://127.0.0.1:4173/api/projects')).toBe(false);
    expect(isDisplayObjectRoute('GET', 'http://127.0.0.1:4173/api/auth/session')).toBe(false);
    expect(isDisplayObjectRoute('GET', 'http://127.0.0.1:4173/api/display-objects?screen=OB-3')).toBe(false);
  });

  test('G2-1: a response body is read into display objects through servedDisplayOf, and a malformed one is refused', () => {
    expect(parseServedDisplayObjects(SERVED)).toEqual({ [ROOMS]: { text: 'TEST 123', lines: ['Calculated'] } });
    // Not a contract display object: no kind, no shape.
    expect(() => parseServedDisplayObjects({ displayObjects: [{ valueId: ROOMS, text: 'TEST 1' }] })).toThrow(/DisplayObject/);
    expect(() => parseServedDisplayObjects({ displayObjects: [{ ...SERVED.displayObjects[0], valueId: 'guestRooms' }] })).toThrow(/DisplayObject/);
    expect(() =>
      parseServedDisplayObjects({
        displayObjects: [
          { ...SERVED.displayObjects[0], text: 'TEST 1' },
          { ...SERVED.displayObjects[0], text: 'TEST 12' },
        ],
      }),
    ).toThrow(/twice/);
    expect(parseServedDisplayObjects({ displayObjects: [SERVED.displayObjects[0], SERVED.displayObjects[0]] })).toEqual({
      [ROOMS]: { text: 'TEST 123', lines: ['Calculated'] },
    });
    expect(() => parseServedDisplayObjects({ values: [] })).toThrow(/displayObjects/);
  });
});
