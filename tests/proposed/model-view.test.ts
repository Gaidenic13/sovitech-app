/**
 * The model view mounted, in Chromium (the proposed suite: not indexed, non-blocking; docs/build-log.md, the viewer
 * step, item 7, "Acceptance tests" and the blocking tests named after proposals, here on the harness page because
 * in part 1 no live page mounts the view: P-V-CANVAS-UNREADABLE waits for the approver, item 6).
 *
 * The harness page (./model-view/harness/) is built with Vite from the real packages, as the app will bundle them in
 * part 2, and served on 127.0.0.1 with the synthetic ARH fixture converted in the view profile (./model-view/
 * harness.ts). Every request is recorded by the server, and every request that would leave 127.0.0.1 is refused and
 * recorded by the browser context.
 *
 * - The probe's answers in a real browser (D-03; the viewer step, item 4): Playwright's headless shell renders with
 *   SwiftShader, so the probe answers "none", the area reads its "Not available yet" line, and neither the view's
 *   chunk nor the Fragments worker nor the view file is fetched. With the test's graphics init script (test-only:
 *   the app has no override) it answers "hardware" and the fixture draws.
 * - The chunk and the worker come from the app's own origin and nothing leaves it (prompt 3 section 11, "The viewer
 *   is code-split"; ADR 0046 Finding 1; US-IFC-08 AC7).
 * - "ifc-input 6.2.15 · no text in a view file or scene": the scene audit after load (shapes only) and the stage
 *   (one canvas, no third-party mark: ADR 0046 Finding 2).
 * - "ifc-input 6.2.16 · view files erased with their document" (the browser's half): the view file is fetched with
 *   no cache, and after a view no IndexedDB database or Cache Storage entry exists.
 * - "view-provenance, closed · R-080, R-082": a click or a hover selects nothing, changes nothing drawn and asks the
 *   server for nothing; Page Up and Page Down step through no storey.
 * - A keyboard-only flow through the view and its toolbar (prompt 3 section 11; WCAG 2.1.1, 2.1.2, 2.4.7).
 * - G7-23 (rule 7): a view file that fails to load, or a lost context, changes the area in place and holds no other
 *   control.
 */
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildHarness, convertedArh, GRAPHICS_INIT_SCRIPT, serveHarness, servedAny, type HarnessBuild, type HarnessServer, type ServedRequest } from './model-view/harness';

/** Records each fetch the page makes and the cache mode it asked for (test-only). */
const FETCH_RECORDER = `(() => {
  const original = window.fetch.bind(window);
  window.__sovitechFetches = [];
  window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    window.__sovitechFetches.push({ url, cache: init && init.cache ? init.cache : (input instanceof Request ? input.cache : 'default') });
    return original(input, init);
  };
})();`;

let harness: HarnessBuild | undefined;
let server: HarnessServer | undefined;
let browser: Browser | undefined;

interface Opened {
  readonly context: BrowserContext;
  readonly page: Page;
  /** Requests refused because they would have left 127.0.0.1. */
  readonly offOrigin: string[];
  /** What the server was asked for since this page opened. */
  served(): ServedRequest[];
}

function running(): { harness: HarnessBuild; server: HarnessServer; browser: Browser } {
  if (harness === undefined || server === undefined || browser === undefined) throw new Error('the harness did not start');
  return { harness, server, browser };
}

async function open(options: { readonly graphics: boolean; readonly page?: 'area' | 'view'; readonly model?: 'missing' }): Promise<Opened> {
  const { server: live, browser: chrome } = running();
  const context = await chrome.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const offOrigin: string[] = [];
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === live.origin) return route.continue();
    offOrigin.push(url.href);
    return route.abort();
  });
  await context.addInitScript({ content: FETCH_RECORDER });
  if (options.graphics) await context.addInitScript({ content: GRAPHICS_INIT_SCRIPT });
  const page = await context.newPage();
  const start = live.requests.length;
  await page.goto(`${live.origin}/?page=${options.page ?? 'area'}${options.model === 'missing' ? '&model=missing' : ''}`);
  await page.waitForFunction(() => window.__sovitechModelView.ready || window.__sovitechModelView.unavailable.length > 0, undefined, { timeout: 60_000 });
  return { context, page, offOrigin, served: () => live.requests.slice(start) };
}

async function areaState(page: Page): Promise<string | null> {
  return page.evaluate(() => document.querySelector('.sov-model-area')?.getAttribute('data-model-state') ?? null);
}

/** The view's pixels, after the frames a move needs. */
async function viewPixels(page: Page): Promise<Buffer> {
  await page.waitForTimeout(600);
  return page.locator('.sov-model-view__stage').screenshot();
}

beforeAll(async () => {
  const viewFile = await convertedArh();
  harness = await buildHarness();
  server = await serveHarness(harness, viewFile);
  browser = await chromium.launch();
}, 180_000);

afterAll(async () => {
  await browser?.close();
  await server?.close();
  harness?.remove();
});

describe('the viewer step · D-03 · prompt 3 section 11: the probe, the chunk and the origin, in Chromium', () => {
  it('D-03 · the viewer step, item 4: the headless shell (SwiftShader) answers "none": the area reads "Not available yet: <what is missing>", no canvas is drawn, and the chunk, the worker and the view file are never fetched', async () => {
    const { harness: build } = running();
    const opened = await open({ graphics: false });
    try {
      const probe = await opened.page.evaluate(() => {
        const gl = document.createElement('canvas').getContext('webgl2', { failIfMajorPerformanceCaveat: true });
        if (gl === null) return 'no_context';
        const info = gl.getExtension('WEBGL_debug_renderer_info');
        return String(info === null ? gl.getParameter(gl.RENDERER) : gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
      });
      expect(probe === 'no_context' || /swiftshader/iu.test(probe), probe).toBe(true);
      expect(await opened.page.evaluate(() => window.__sovitechModelView.unavailable)).toEqual(['graphics']);
      expect(await areaState(opened.page)).toBe('no_graphics');
      expect(await opened.page.getByText('Not available yet: hardware graphics support in this browser').count()).toBe(1);
      expect(await opened.page.locator('canvas').count()).toBe(0);
      const served = opened.served();
      expect(servedAny(served, build.lazyFiles), served.map((item) => item.path).join(', ')).toBe(false);
      expect(servedAny(served, [build.workerFile, ...build.otherWorkerFiles])).toBe(false);
      expect(served.some((item) => item.path.startsWith('/model-view/'))).toBe(false);
      expect(opened.offOrigin).toEqual([]);
    } finally {
      await opened.context.close();
    }
  }, 120_000);

  it('prompt 3 section 11 · ADR 0046 Finding 1 · US-IFC-08 AC7: with hardware graphics the view\'s chunk, the Fragments worker and the view file come from the app\'s own origin, and no request leaves it', async () => {
    const { harness: build } = running();
    expect(build.lazyFiles.length).toBeGreaterThan(0);
    expect(build.workerFile).toMatch(/^assets\/worker\.min-/u);
    expect(build.entryFiles.some((file) => build.lazyFiles.includes(file))).toBe(false);
    const opened = await open({ graphics: true });
    try {
      expect(await opened.page.evaluate(() => window.__sovitechModelView.ready)).toBe(true);
      expect(await areaState(opened.page)).toBe('viewable');
      const served = opened.served();
      expect(servedAny(served, build.lazyFiles)).toBe(true);
      expect(servedAny(served, [build.workerFile])).toBe(true);
      // Fragments' own fallback copy, emitted by the bundler, is never fetched: the viewer always names its worker.
      expect(servedAny(served, build.otherWorkerFiles)).toBe(false);
      expect(served.filter((item) => item.path === '/model-view/arh')).toHaveLength(1);
      expect(served.every((item) => item.status === 200), served.map((item) => `${item.path} ${String(item.status)}`).join(', ')).toBe(true);
      expect(opened.offOrigin).toEqual([]);
    } finally {
      await opened.context.close();
    }
  }, 120_000);
});

describe('ifc-input 6.2.15 · no text in a view file or scene · ifc-input 6.2.16 (the browser\'s half): after the view loads', () => {
  it('ifc-input 6.2.15 · R-082 · ADR 0046 Finding 2: the scene holds the model\'s shapes and nothing that could carry text; the stage holds one canvas and no mark; no third party is named on the page', async () => {
    const opened = await open({ graphics: true });
    try {
      const audit = await opened.page.evaluate(() => window.__sovitechModelView.audit?.());
      expect(audit?.scene).toMatchObject({ sprites: 0, points: 0, texturedMaterials: 0, textGeometries: 0, pageElementsInScene: 0 });
      expect(audit?.scene.meshes).toBeGreaterThan(0);
      expect(audit?.stage).toEqual({ canvases: 1, otherElements: 0, marks: 0, text: '' });
      const page = await opened.page.evaluate(() => ({
        text: document.body.innerText,
        canvases: document.querySelectorAll('canvas').length,
        bigDrawings: [...document.querySelectorAll('svg, img')].filter((element) => {
          const box = element.getBoundingClientRect();
          return box.width > 32 || box.height > 32;
        }).length,
      }));
      expect(page.text).not.toMatch(/that open|thatopen/iu);
      expect(page.canvases).toBe(1);
      expect(page.bigDrawings).toBe(0);
    } finally {
      await opened.context.close();
    }
  }, 120_000);

  it('ifc-input 6.2.16 · rule 13: the view file is fetched with no cache, and after a view no IndexedDB database and no Cache Storage entry exists', async () => {
    const opened = await open({ graphics: true });
    try {
      const fetches = await opened.page.evaluate(() => (window as unknown as { __sovitechFetches: Array<{ url: string; cache: string }> }).__sovitechFetches);
      const viewFetches = fetches.filter((item) => item.url.includes('/model-view/'));
      expect(viewFetches).toEqual([{ url: '/model-view/arh', cache: 'no-store' }]);
      const stored = await opened.page.evaluate(async () => ({ databases: (await indexedDB.databases()).length, caches: (await caches.keys()).length }));
      expect(stored).toEqual({ databases: 0, caches: 0 });
    } finally {
      await opened.context.close();
    }
  }, 120_000);
});

describe('view-provenance, closed · R-080, R-082, R-083 · US-MODEL-09 AC1: nothing in the view can be selected', () => {
  it('US-MODEL-09 AC1 · R-083: a hover, a click and a double click on the model select nothing, change nothing drawn and ask the server for nothing', async () => {
    const opened = await open({ graphics: true });
    try {
      const before = await viewPixels(opened.page);
      const requests = opened.served().length;
      const box = await opened.page.locator('.sov-model-view__canvas').boundingBox();
      if (box === null) throw new Error('no canvas box');
      const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      await opened.page.mouse.move(centre.x, centre.y);
      await opened.page.mouse.move(centre.x + 3, centre.y + 2);
      const hovered = await viewPixels(opened.page);
      await opened.page.mouse.click(centre.x, centre.y);
      await opened.page.mouse.dblclick(centre.x, centre.y);
      const clicked = await viewPixels(opened.page);
      expect(hovered.equals(before)).toBe(true);
      expect(clicked.equals(before)).toBe(true);
      expect(opened.served().length).toBe(requests);
      expect(await opened.page.locator('[role="dialog"], [role="tooltip"], [aria-selected="true"]').count()).toBe(0);
      expect(await opened.page.evaluate(() => window.__sovitechModelView.audit?.().stage)).toEqual({ canvases: 1, otherElements: 0, marks: 0, text: '' });
    } finally {
      await opened.context.close();
    }
  }, 120_000);

  it('R-080 · US-MODEL-07 AC1: Page Up and Page Down isolate no storey: the whole model stays drawn', async () => {
    const opened = await open({ graphics: true });
    try {
      await opened.page.locator('.sov-model-view__stage').focus();
      const before = await viewPixels(opened.page);
      await opened.page.keyboard.press('PageUp');
      expect((await viewPixels(opened.page)).equals(before)).toBe(true);
      await opened.page.keyboard.press('PageDown');
      expect((await viewPixels(opened.page)).equals(before)).toBe(true);
    } finally {
      await opened.context.close();
    }
  }, 120_000);
});

describe('prompt 3 section 11 · WCAG 2.2 AA: a keyboard-only flow through the view and its toolbar', () => {
  it('WCAG 2.1.1 · 2.1.2 · 2.4.7 · 2.5.7 · R-162: Tab reaches the view with a visible focus ring, the keys turn it and Home brings it back, Tab reaches the toolbar whose buttons move it, and Tab leaves for the page\'s next control', async () => {
    const opened = await open({ graphics: true });
    const { page } = opened;
    try {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => {
        const element = document.activeElement;
        if (element === null) return null;
        const style = getComputedStyle(element);
        return { role: element.getAttribute('role'), labelledBy: element.getAttribute('aria-labelledby'), outline: `${style.outlineStyle} ${style.outlineWidth}` };
      });
      expect(focused?.role).toBe('application');
      expect(focused?.outline).toBe('solid 2px');
      const name = await page.evaluate((id) => (id === null ? '' : (document.getElementById(id)?.textContent ?? '')), focused?.labelledBy ?? null);
      expect(name).toContain('TEST demo-hotel-arh.ifc');

      const first = await viewPixels(page);
      await page.keyboard.press('ArrowLeft');
      const turned = await viewPixels(page);
      expect(turned.equals(first)).toBe(false);
      for (const key of ['ArrowUp', '+', 'd']) await page.keyboard.press(key);
      const moved = await viewPixels(page);
      expect(moved.equals(turned)).toBe(false);
      await page.keyboard.press('Home');
      const home = await viewPixels(page);
      expect(home.equals(moved)).toBe(false);
      expect(home.equals(first)).toBe(true);
      expect(await page.evaluate(() => window.scrollY)).toBe(0);

      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))).toBe('Turn left');
      await page.keyboard.press('ArrowRight');
      expect(await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))).toBe('Turn right');
      await page.keyboard.press('Enter');
      expect((await viewPixels(page)).equals(home)).toBe(false);
      await page.keyboard.press('End');
      expect(await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))).toBe('Show the whole model');
      await page.keyboard.press('Enter');
      expect((await viewPixels(page)).equals(home)).toBe(true);

      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => document.activeElement?.textContent)).toBe('Continue');
      await page.keyboard.press('Enter');
      expect(await page.evaluate(() => window.__sovitechModelView.continued)).toBe(1);
      await page.keyboard.press('Shift+Tab');
      expect(await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))).toBe('Show the whole model');
      await page.keyboard.press('Shift+Tab');
      expect(await page.evaluate(() => document.activeElement?.getAttribute('role'))).toBe('application');
    } finally {
      await opened.context.close();
    }
  }, 120_000);
});

describe('G7-23 · rule 7 · US-MODEL-04 AC11 · US-MODEL-05 AC4: the view never holds the page, and shows no partial model', () => {
  it('US-MODEL-05 AC4: while the view file is held back the canvas is hidden and the loading line shows; the page\'s controls work meanwhile', async () => {
    const { server: live, browser: chrome } = running();
    const context = await chrome.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript({ content: GRAPHICS_INIT_SCRIPT });
    let release: (() => void) | undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    await context.route('**/model-view/arh', async (route) => {
      await held;
      await route.continue();
    });
    const page = await context.newPage();
    try {
      await page.goto(`${live.origin}/?page=area`);
      await page.getByRole('progressbar', { name: 'Loading the model view' }).waitFor({ timeout: 60_000 });
      await page.locator('.sov-model-view__canvas').waitFor({ state: 'attached', timeout: 60_000 });
      expect(await page.evaluate(() => getComputedStyle(document.querySelector('.sov-model-view__canvas') as Element).visibility)).toBe('hidden');
      await page.getByRole('button', { name: 'Continue' }).click();
      expect(await page.evaluate(() => window.__sovitechModelView.continued)).toBe(1);
      release?.();
      await page.waitForFunction(() => window.__sovitechModelView.ready, undefined, { timeout: 60_000 });
      expect(await page.evaluate(() => getComputedStyle(document.querySelector('.sov-model-view__canvas') as Element).visibility)).toBe('visible');
      expect(await page.getByRole('progressbar').count()).toBe(0);
    } finally {
      release?.();
      await context.close();
    }
  }, 120_000);

  it('G7-23 · US-MODEL-04 AC11: a view file that fails to load leaves the document line with its stored 2.8 line, and Continue works', async () => {
    const opened = await open({ graphics: true, model: 'missing' });
    try {
      expect(await opened.page.evaluate(() => window.__sovitechModelView.unavailable)).toEqual(['load']);
      expect(await areaState(opened.page)).toBe('model_stored');
      expect(await opened.page.locator('canvas').count()).toBe(0);
      expect(await opened.page.getByText('Not analysed: IFC model stored, not analysed').count()).toBe(1);
      await opened.page.getByRole('button', { name: 'Continue' }).click();
      expect(await opened.page.evaluate(() => window.__sovitechModelView.continued)).toBe(1);
    } finally {
      await opened.context.close();
    }
  }, 120_000);

  it('D-03 · R-078 · rule 7 · US-MODEL-05: the viewer step, item 3 ("Everything is disposed on unmount"): React\'s development double run starts an engine, disposes it with its context and starts another on a fresh canvas, which draws', async () => {
    const { browser: chrome } = running();
    const development = await buildHarness('development');
    const devServer = await serveHarness(development, await convertedArh());
    const context = await chrome.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript({ content: GRAPHICS_INIT_SCRIPT });
    const page = await context.newPage();
    try {
      await page.goto(`${devServer.origin}/?page=area`);
      await page.waitForFunction(() => window.__sovitechModelView.ready || window.__sovitechModelView.unavailable.length > 0, undefined, { timeout: 60_000 });
      expect(await page.evaluate(() => window.__sovitechModelView.unavailable)).toEqual([]);
      expect(await page.evaluate(() => window.__sovitechModelView.audit?.().stage)).toEqual({ canvases: 1, otherElements: 0, marks: 0, text: '' });
      expect(await page.locator('canvas').count()).toBe(1);
    } finally {
      await context.close();
      await devServer.close();
      development.remove();
    }
  }, 120_000);

  it('D-03 · the viewer step, item 3: a lost WebGL context changes the area in place to "Not available yet: <what is missing>", with no dialog, and Continue works', async () => {
    const opened = await open({ graphics: true });
    try {
      await opened.page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        canvas?.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();
      });
      await opened.page.waitForFunction(() => window.__sovitechModelView.unavailable.includes('graphics'), undefined, { timeout: 30_000 });
      expect(await areaState(opened.page)).toBe('no_graphics');
      expect(await opened.page.getByText('Not available yet: hardware graphics support in this browser').count()).toBe(1);
      expect(await opened.page.locator('[role="dialog"], dialog').count()).toBe(0);
      await opened.page.getByRole('button', { name: 'Continue' }).click();
      expect(await opened.page.evaluate(() => window.__sovitechModelView.continued)).toBe(1);
    } finally {
      await opened.context.close();
    }
  }, 120_000);
});
