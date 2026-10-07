/**
 * P-V-CANVAS-UNREADABLE (proposed; a render-test loosening for the approver, not applied; docs/build-log.md, the
 * viewer step, item 6). Not indexed in docs/guardrails.md section 7; the non-blocking suite.
 *
 * The render test (rule 2, G2-1) fails every canvas that is not on its reviewed `render.unreadable` list, because
 * it cannot read a canvas's pixels (ADR 0006 decision 3). The model view draws one canvas, so no live page can show
 * it until the approver adds the proposed `model-view` entry with its approved exception-list snapshot (guardrails
 * section 10; the loosening check refuses an added allow entry without one). In part 1 the view is mounted on no
 * live page; this file shows both halves of the proposal on the ARH fixture's view, drawn in Chromium with the
 * test's graphics init script (./model-view/harness.ts):
 * - with the reviewed list as it stands, the view fails the render test, and only as pixels it cannot read;
 * - with the proposed entry laid over the list, and the marker set on the view's canvas as part 2 would set it in
 *   packages/viewer/src/model-view/ModelView.tsx, the same page passes;
 * - with the entry laid over but no marker, the canvas still fails.
 *
 * The entry is laid over the list in this runner only: `vi.mock` gives the render check a copy of
 * tests/e2e/render/allowlist.ts with the entry added while a test asks for it, and the file itself is never changed.
 * The marker is set by this test's init script on each canvas the harness page creates, at its creation, as part 2
 * writes it in ModelView.tsx; no file under apps/ or packages/ sets it (the render check's source scan,
 * tools/checks/render/unreadable-markers.ts, would refuse a marker naming no entry of the list).
 *
 * The page shows no value (its heading is fixed copy), so the check is served no display object. Its copy (the
 * toolbar's names, the key help) is the viewer step's draft copy, read here by the render check's reserved-term scan.
 */
import { chromium, type Browser } from '@playwright/test';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { UnreadableEntry } from '../e2e/render/contract';
import { formatRenderReport, prepareRenderCheck, runRenderCheck, violationKinds } from '../e2e/render/render-check';
import { buildHarness, convertedArh, GRAPHICS_INIT_SCRIPT, serveHarness, type HarnessBuild, type HarnessServer } from './model-view/harness';

/** Entries laid over the reviewed list while a test asks for them. */
const overlay = vi.hoisted(() => ({ extra: [] as unknown[] }));

vi.mock('../e2e/render/allowlist', async (importOriginal) => {
  const original = await importOriginal<typeof import('../e2e/render/allowlist')>();
  const reviewed = original.RENDER_ALLOWLIST;
  return {
    RENDER_ALLOWLIST: {
      entries: reviewed.entries,
      get unreadable() {
        return [...reviewed.unreadable, ...overlay.extra];
      },
    },
  };
});

/** The entry as proposed in docs/build-log.md, the viewer step, item 6 (the diff to tests/e2e/render/allowlist.ts). */
const MODEL_VIEW_ENTRY: UnreadableEntry = {
  id: 'model-view',
  element: 'canvas',
  component: 'packages/viewer/src/model-view/ModelView.tsx',
  reason:
    'The view of a stored IFC model, shown as a document while ifc-values and view-provenance are closed: the shapes of its converted view file only (GlobalIds and the spatial tree; no name, property, header, grid or alignment text: ADR 0046 decision 6 and Finding 12), in token colours, with no sprite, points, textured material, text geometry or page element in the scene. It draws no name, figure or label; the model it shows is named beside it as page text bound to value ids.',
  source:
    "the owner's decision of 2026-10-05 (D-03, \"1 b\"); prompt 3 section 8; PRD R-025, R-054, R-078, R-162; docs/adr/0046-viewer-spike.md decisions 4 and 6; docs/adr/0051-model-viewer.md",
};

/**
 * Test-only: marks each canvas the page creates with the proposed entry's id at once, as part 2 writes the marker in
 * the one component that draws the view's canvas, so the render check never sees it unmarked. The harness page's only
 * canvases are the view's (the graphics probe's is never attached to the page).
 */
const MARK_CANVAS_AT_CREATION = `(() => {
  const create = Document.prototype.createElement;
  Document.prototype.createElement = function createElement(name, options) {
    const element = create.call(this, name, options);
    if (String(name).toLowerCase() === 'canvas') element.setAttribute('data-render-unreadable', 'model-view');
    return element;
  };
})();`;

let harness: HarnessBuild | undefined;
let server: HarnessServer | undefined;
let browser: Browser | undefined;

beforeAll(async () => {
  const viewFile = await convertedArh();
  harness = await buildHarness();
  server = await serveHarness(harness, viewFile);
  browser = await chromium.launch();
}, 180_000);

afterEach(() => {
  overlay.extra = [];
});

afterAll(async () => {
  await browser?.close();
  await server?.close();
  harness?.remove();
});

/** The view page, drawn, checked by the render test (prepared before the page loads, with the list as it is then). */
async function checkView(marker: boolean) {
  if (server === undefined || browser === undefined) throw new Error('the harness did not start');
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  try {
    await prepareRenderCheck(context, { displayObjects: {} });
    await context.addInitScript({ content: GRAPHICS_INIT_SCRIPT });
    if (marker) await context.addInitScript({ content: MARK_CANVAS_AT_CREATION });
    const page = await context.newPage();
    await page.goto(`${server.origin}/?page=view`);
    await page.waitForFunction(() => window.__sovitechModelView.ready || window.__sovitechModelView.unavailable.length > 0, undefined, { timeout: 60_000 });
    expect(await page.evaluate(() => window.__sovitechModelView.ready)).toBe(true);
    const marked = await page.evaluate(() => document.querySelector('.sov-model-view__canvas')?.getAttribute('data-render-unreadable') ?? null);
    expect(marked).toBe(marker ? 'model-view' : null);
    return await runRenderCheck(page);
  } finally {
    await context.close();
  }
}

describe('P-V-CANVAS-UNREADABLE · rule 2 · G2-1 · ADR 0006 decision 3: the model view and the reviewed unreadable list', () => {
  it('P-V-CANVAS-UNREADABLE · waits for the approver (D-05): with the reviewed list as it stands, the ARH fixture\'s view fails the render test, only as pixels it cannot read', async () => {
    const report = await checkView(false);
    const account = formatRenderReport(report);
    expect(report.ok, account).toBe(false);
    expect(violationKinds(report), account).toEqual(['unreadable-pixels']);
    expect(report.violations.every((violation) => /canvas/iu.test(JSON.stringify(violation))), account).toBe(true);
  }, 120_000);

  it('P-V-CANVAS-UNREADABLE (the proposal applied in this runner only): with the entry laid over the list and the marker on the view\'s canvas, the same page passes, its draft copy included', async () => {
    overlay.extra = [MODEL_VIEW_ENTRY];
    const report = await checkView(true);
    const account = formatRenderReport(report);
    expect(report.ok, account).toBe(true);
    expect(report.stats.unreadable.some((where) => where.includes('model-view')), account).toBe(true);
    expect(report.stats.copyUnits, account).toBeGreaterThan(0);
  }, 120_000);

  it('P-V-CANVAS-UNREADABLE: with the entry laid over but no marker on the canvas, the view still fails as pixels the test cannot read', async () => {
    overlay.extra = [MODEL_VIEW_ENTRY];
    const report = await checkView(false);
    const account = formatRenderReport(report);
    expect(report.ok, account).toBe(false);
    expect(violationKinds(report), account).toEqual(['unreadable-pixels']);
  }, 120_000);
});
