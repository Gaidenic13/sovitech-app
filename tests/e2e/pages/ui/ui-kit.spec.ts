/**
 * The UI kit's harness pages (packages/ui; prompt 3 phase 3: "the brand theme and the ui components";
 * section 11, "Accessibility (WCAG 2.2 AA)"; guardrails rule 2, "Render test"; 2.8).
 *
 * - Every kit page is the generator's current output (kit.tsx), so the pages show the components as
 *   they are.
 * - Every kit page passes the render test with the display objects it declares: every number bound
 *   as served or on the allowlist, no count-up, no reserved term outside the places 2.8 allows.
 * - Every kit page has zero axe violations under the WCAG 2.2 AA tags.
 * - The keyboard reaches every control in order and shows the accent focus outline.
 * - The layouts the phase 3 part B design review fixed hold in Chromium (ui/layout.html): a badge stays
 *   on its figure's line in a narrow row, the status slot sits on a card's top row (or under a tile's
 *   or pill's title) inside the card, progress says in words what is in progress and stands still under
 *   reduced motion, "Skip for now" and its later line sit 24px under the grid at its left edge, and owner
 *   text holding a direction control never reorders the copy and badge around it.
 *
 * Runs in the Playwright `e2e` project (`pnpm e2e`); it needs no API and no web server of its own:
 * the pages load from file:// URLs, as the render harness's own pages do.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { harnessPageOptions, harnessPageUrl, UI_KIT_PAGES } from '../../render/harness-pages';
import { formatRenderReport, prepareRenderCheck, runRenderCheck } from '../../render/render-check';

const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

/** WCAG 2.2 AA (prompt 3 5.2, "Accessibility level"; ADR 0037). */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

test.describe('R-043 · R-138 · F-RENDER-06 · G2-1 · G2-8: the UI kit on its harness pages', () => {
  test('F-RENDER-06: every kit page on disk is the generator\'s current output, and every generated page is listed for the harness', () => {
    // The generator renders the kit with react-dom/server under tsx (generate.ts explains why not here).
    const run = spawnSync(
      'node_modules/.bin/tsx',
      ['--tsconfig', 'tests/e2e/pages/ui/tsconfig.generate.json', 'tests/e2e/pages/ui/generate.ts', '--check'],
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );
    expect(run.status, `${run.stdout}${run.stderr}`).toBe(0);
  });

  for (const harnessPage of UI_KIT_PAGES) {
    test(`G2-1 · G2-8 · 2.8: ${harnessPage.file} passes the render test`, async ({ page }) => {
      const options = harnessPageOptions(harnessPage);
      await prepareRenderCheck(page, options);
      await page.goto(harnessPageUrl(harnessPage.file));
      const report = await runRenderCheck(page, options);
      expect(report.ok, formatRenderReport(report)).toBe(true);
    });

    test(`R-138 · prompt 3 section 11 (WCAG 2.2 AA): ${harnessPage.file} has no axe violation`, async ({ page }) => {
      await page.goto(harnessPageUrl(harnessPage.file));
      const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
      expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`)).toEqual([]);
    });
  }

  test('US-INTAKE-01 · prompt 3 section 11 (keyboard): Tab reaches every control of the forms page in order, each with the accent focus outline', async ({ page }) => {
    await page.goto(harnessPageUrl('ui/forms.html'));
    const expected = await page.evaluate(() =>
      [...document.querySelectorAll('input:not([hidden]):not([type="radio"]), select, button, input[type="radio"]:checked')]
        .filter((element) => element instanceof HTMLElement && !element.hidden)
        .map((element) => (element as HTMLElement).outerHTML.slice(0, 60)),
    );
    const reached: string[] = [];
    for (let index = 0; index < expected.length + 4; index += 1) {
      await page.keyboard.press('Tab');
      const focus = await page.evaluate(() => {
        const active = document.activeElement;
        if (!(active instanceof HTMLElement) || active === document.body) return null;
        const outlined = active.closest('.sov-choice-card, .sov-input-box') ?? active;
        const style = getComputedStyle(outlined);
        return { html: active.outerHTML.slice(0, 60), outline: style.outlineStyle, width: style.outlineWidth };
      });
      if (focus === null) break;
      if (reached.includes(focus.html)) continue;
      reached.push(focus.html);
      expect(focus.outline, focus.html).toBe('solid');
      expect(focus.width, focus.html).toBe('2px');
    }
    for (const control of expected) expect(reached, control).toContain(control);
  });

  test('DR-1 · DR-2 · DR-14 · A-8 · G2-13 · 2.8 "Prominence": in Chromium, badges stay with their figures, the status slot sits on the card, the skip link 24px under its grid, and owner text is isolated', async ({ page }) => {
    await page.goto(harnessPageUrl('ui/layout.html'));
    const measured = await page.evaluate(() => {
      const box = (element: Element | null | undefined) => {
        if (element === null || element === undefined) return null;
        const rect = element.getBoundingClientRect();
        return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom };
      };
      const overlapsVertically = (a: ReturnType<typeof box>, b: ReturnType<typeof box>) => a !== null && b !== null && a.y < b.bottom && b.y < a.bottom;
      // DR-1: in a 300px card, each row's label sits left of or above its value, and the badge shares its figure's line.
      const rows = [...document.querySelectorAll('#layout-rows .sov-field-value')].map((row) => {
        const label = box(row.querySelector('.sov-field-value__label'));
        const figure = box(row.querySelector('.sov-value__text') ?? row.querySelector('.sov-value .sov-badge'));
        const badge = box(row.querySelector('.sov-value .sov-badge'));
        return { labelFirst: label !== null && figure !== null && (label.right <= figure.x + 1 || label.bottom <= figure.y + 1), badgeWithFigure: overlapsVertically(figure, badge) };
      });
      // DR-2: the status slot on the top row of a tall card, inside the card; on a pill and a tile, under the title, inside the card.
      const tall = document.querySelector('#layout-tall .sov-choice-card');
      const tallStatus = tall?.querySelector('.sov-choice-card__status');
      const shapes = [...document.querySelectorAll('#layout-shapes .sov-choice-card')].map((card) => {
        const status = box(card.querySelector('.sov-choice-card__status'));
        const title = box(card.querySelector('.sov-choice-card__title'));
        const outer = box(card);
        return { shape: card.getAttribute('data-shape'), belowTitle: status !== null && title !== null && status.y >= title.bottom - 1, inside: status !== null && outer !== null && status.right <= outer.right + 0.5 };
      });
      // DR-2 on a six-column tile (step 5's building types): the status and its badge stay inside the tile.
      const narrow = document.querySelector('#layout-narrow .sov-choice-card');
      const narrowInside = [narrow?.querySelector('.sov-choice-card__status'), narrow?.querySelector('.sov-choice-card__status .sov-badge')].every(
        (element) => (box(element)?.right ?? Infinity) <= (box(narrow)?.right ?? 0) + 0.5,
      );
      // DR-14: the link (or the later line) sits 24px under its grid, at the grid's left edge.
      const skipGap = (container: string, grid: string) => {
        const options = box(document.querySelector(`${container} ${grid}`));
        const skip = box(document.querySelector(`${container} .sov-skip`));
        return options === null || skip === null ? null : { gap: Math.round(skip.y - options.bottom), left: Math.round(skip.x - options.x) };
      };
      // A-8: the copy before, the owner text, its badge and the copy after keep their visual order.
      const order = ['.kit-copy-before', '.sov-value__text', '.sov-badge', '.kit-copy-after']
        .map((selector) => [selector, box(document.querySelector(`#layout-isolated ${selector}`))?.x] as const)
        .sort((a, b) => (a[1] ?? 0) - (b[1] ?? 0))
        .map(([selector]) => selector);
      return {
        rows,
        tallStatusInTopRow: tall?.querySelector('.sov-choice-card__top')?.contains(tallStatus ?? null) ?? false,
        tallStatusInside: (box(tallStatus)?.right ?? Infinity) <= (box(tall)?.right ?? 0) + 0.5,
        shapes,
        narrowInside,
        skipInGroup: skipGap('#layout-skip-group', '.sov-choice-group__options'),
        laterUnderGrid: skipGap('#layout-skip-later', 'div[style*="grid"]'),
        order,
        isolatedTag: document.querySelector('#layout-isolated .sov-value__text')?.tagName,
        isolatedBidi: getComputedStyle(document.querySelector('#layout-isolated .sov-value__text') ?? document.body).unicodeBidi,
      };
    });
    expect(measured.rows).toHaveLength(5);
    for (const [index, row] of measured.rows.entries()) expect(row, `row ${String(index)}`).toEqual({ labelFirst: true, badgeWithFigure: true });
    expect(measured.tallStatusInTopRow).toBe(true);
    expect(measured.tallStatusInside).toBe(true);
    expect(measured.shapes).toEqual([
      { shape: 'pill', belowTitle: true, inside: true },
      { shape: 'tile', belowTitle: true, inside: true },
    ]);
    expect(measured.narrowInside).toBe(true);
    expect(measured.skipInGroup).toEqual({ gap: 24, left: 0 });
    expect(measured.laterUnderGrid).toEqual({ gap: 24, left: 0 });
    expect(measured.isolatedTag).toBe('BDI');
    expect(measured.isolatedBidi).toBe('isolate');
    expect(measured.order).toEqual(['.kit-copy-before', '.sov-value__text', '.sov-badge', '.kit-copy-after']);
  });

  test('DR-4 · prompt 3 section 11 ("never colour alone") · WCAG 1.4.1: progress says in words what is in progress, keeps its name when the words are hidden, and its 4px segment stands still under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(harnessPageUrl('ui/layout.html'));
    const visible = page.locator('#layout-progress-visible');
    await expect(visible.locator('.sov-progress__label')).toHaveText('Uploading');
    await expect(visible.getByRole('progressbar', { name: 'Uploading' })).toBeVisible();
    const hidden = page.locator('#layout-progress-hidden');
    await expect(hidden.locator('.sov-progress__label')).toHaveCount(0);
    await expect(hidden.getByRole('progressbar', { name: 'Uploading' })).toBeVisible();
    const line = page.locator('#layout-progress-line .sov-progress__label');
    await expect(line).toHaveText('Reading documents…');
    await expect(line).toHaveAttribute('data-line', 'reading_documents');
    const bar = await page.locator('#layout-progress-visible .sov-progress__bar').evaluate((element) => ({
      height: element.getBoundingClientRect().height,
      animation: getComputedStyle(element).animationName,
    }));
    expect(bar).toEqual({ height: 4, animation: 'none' });
  });

  test('US-SCOPE-02 · prompt 3 section 11: Space toggles a checkbox card and arrow keys move between radio cards', async ({ page }) => {
    await page.goto(harnessPageUrl('ui/forms.html'));
    // The generated page is static markup: the native inputs still toggle, which is what the keyboard path needs.
    const fire = page.getByRole('checkbox', { name: 'Fire Safety' });
    await fire.focus();
    await page.keyboard.press('Space');
    await expect(fire).toBeChecked();
    const office = page.getByRole('radio', { name: 'Office' });
    const hotel = page.getByRole('radio', { name: 'Hotel' });
    await hotel.focus();
    await page.keyboard.press('ArrowRight');
    await expect(office).toBeFocused();
    await expect(office).toBeChecked();
  });
});
