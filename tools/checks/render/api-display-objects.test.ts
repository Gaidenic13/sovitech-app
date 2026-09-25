/**
 * The registered API adapter of the render test (tests/e2e/render/api-display-objects.ts;
 * docs/adr/0006-render-test.md, decision 1): an app screen's display objects are the ones the
 * page itself receives from the API. Phase 0 has no display-object route, so a TEST server on
 * the loopback interface stands in for the API: it serves a TEST page that fetches its display
 * objects and renders them, and the check must pass when the page shows what it was served,
 * and fail when it shows a value id or a number it was not served.
 */
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { chromium, type Browser } from '@playwright/test';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
  DISPLAY_OBJECT_ROUTE,
  displayObjectsFromApi,
  isRegisteredApiSource,
  parseServedDisplayObjects,
} from '../../../tests/e2e/render/api-display-objects';
import { checkUrl, formatRenderReport, violationKinds } from '../../../tests/e2e/render/render-check';

/** What the TEST API serves: one TEST value. */
const SERVED = { displayObjects: [{ valueId: 'building:b-test.guestRooms', text: 'TEST 123', lines: ['Calculated'] }] };

/** A TEST screen that asks the TEST API for its display objects, then renders `shown` for them. */
function screen(shown: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>TEST screen</title></head><body><main id="root">Reading documents…</main>
<script>
  fetch('/api/display-objects?screen=TEST').then((response) => response.json()).then(() => {
    document.getElementById('root').innerHTML = ${JSON.stringify(shown)};
    document.body.setAttribute('data-render-ready', '');
  });
</script></body></html>`;
}

const PAGES: Record<string, string> = {
  '/as-served': screen('<p><span data-value-id="building:b-test.guestRooms">TEST 123 <span>Calculated</span></span> guest rooms</p>'),
  '/not-served-id': screen('<p><span data-value-id="building:b-test.grossFloorArea">TEST 12,345 m²</span></p>'),
  '/other-number': screen('<p><span data-value-id="building:b-test.guestRooms">TEST 12</span> guest rooms</p>'),
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
      if (path === '/api/display-objects') {
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
      checkUrl(launched(), `${base}/as-served`, { displayObjects: { 'building:b-test.guestRooms': { text: 'TEST 123' } } }),
    ).rejects.toThrow(/accepted only on the harness's own pages/);
  });
});

describe('G2-1 · F-RENDER-06: the adapter itself', () => {
  test('G2-1: only a source the adapter made is registered', () => {
    expect(isRegisteredApiSource(displayObjectsFromApi())).toBe(true);
    expect(isRegisteredApiSource({ kind: 'api-display-objects' })).toBe(false);
    expect(isRegisteredApiSource(() => ({}))).toBe(false);
  });

  test('G2-1: the route matches the display-object path only', () => {
    expect(DISPLAY_OBJECT_ROUTE.test('http://127.0.0.1:4173/api/display-objects?screen=OB-3')).toBe(true);
    expect(DISPLAY_OBJECT_ROUTE.test('http://127.0.0.1:4173/api/display-objects-other')).toBe(false);
  });

  test('G2-1: a response body is read into display objects, and a malformed one is refused', () => {
    expect(parseServedDisplayObjects(SERVED)).toEqual({ 'building:b-test.guestRooms': { text: 'TEST 123', lines: ['Calculated'] } });
    expect(() => parseServedDisplayObjects({ displayObjects: [{ valueId: 'guestRooms', text: 'TEST 1' }] })).toThrow(/not a value id/);
    expect(() =>
      parseServedDisplayObjects({
        displayObjects: [
          { valueId: 'building:b-test.guestRooms', text: 'TEST 1' },
          { valueId: 'building:b-test.guestRooms', text: 'TEST 12' },
        ],
      }),
    ).toThrow(/twice/);
    expect(() => parseServedDisplayObjects({ values: [] })).toThrow(/displayObjects/);
  });
});
