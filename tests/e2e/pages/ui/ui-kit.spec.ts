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
 * - Phase 4 part B (the design review's kit findings): an unanswered radio group draws every option as an
 *   empty ring while the select-all checkbox's mixed state keeps its fill and dash (DR-1, G7-17); the
 *   workspace frame has one main, one contentinfo and its sidebar outside main (DR-3); at 1440 with the
 *   inspector open, the page column starts 24px after the sidebar and a row's name and controls stay inside
 *   the register's visible box however it is scrolled (DR-2); the inspector's two-word stage breaks no word
 *   (DR-8); a tag written as a number shows in the inspector's subheading with its badge (A-1).
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
    // A radio group is one tab stop: its checked radio, or its first radio while none is checked.
    const expected = await page.evaluate(() =>
      [...document.querySelectorAll('input:not([hidden]), select, button')]
        .filter((element) => element instanceof HTMLElement && !element.hidden)
        .filter((element) => {
          if (!(element instanceof HTMLInputElement) || element.type !== 'radio') return true;
          const group = [...document.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${element.name}"]`)];
          return element.checked || (!group.some((radio) => radio.checked) && group[0] === element);
        })
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

  test('DR-1 · G7-17 · rule 7 "Nothing fills the gap" · rule 3 · WCAG 1.3.1, 1.4.1: an unanswered radio group draws every option as an empty ring; a chosen radio and the select-all checkbox\'s mixed state keep their fill', async ({ page }) => {
    await page.goto(harnessPageUrl('ui/forms.html'));
    const radios = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLInputElement>('#forms-unanswered input[type="radio"], input[name="schedule"]')].map((radio) => ({
        name: radio.name,
        checked: radio.checked,
        // HTML calls a radio of a group with none checked indeterminate: the state that drew the mint discs.
        indeterminate: radio.matches(':indeterminate'),
        background: getComputedStyle(radio).backgroundColor,
        mark: getComputedStyle(radio.parentElement?.querySelector('.sov-check__mark') ?? radio).opacity,
      })),
    );
    expect(radios.map((radio) => radio.name)).toEqual(['unansweredType', 'unansweredType', 'unansweredBasis', 'unansweredBasis', 'schedule', 'schedule']);
    for (const radio of radios) expect(radio).toEqual({ name: radio.name, checked: false, indeterminate: true, background: 'rgba(0, 0, 0, 0)', mark: '0' });
    const chosen = await page.getByRole('radio', { name: 'Renovation' }).first().evaluate((radio) => getComputedStyle(radio).backgroundColor);
    expect(chosen).toBe('rgb(200, 230, 201)');
    // Choosing one option turns the group's state from unanswered to answered: only the chosen radio fills.
    await page.getByRole('radio', { name: 'TEST gross total' }).check();
    const basis = await page.evaluate(() => [...document.querySelectorAll<HTMLInputElement>('input[name="unansweredBasis"]')].map((radio) => getComputedStyle(radio).backgroundColor));
    expect(basis).toEqual(['rgb(200, 230, 201)', 'rgba(0, 0, 0, 0)']);

    await page.goto(harnessPageUrl('ui/workspace-frame.html'));
    const all = page.getByRole('checkbox', { name: 'Select all equipment on this page' });
    // The component sets the mixed state from its ref (RegisterTable.test.tsx); the static page sets it here.
    await all.evaluate((box) => {
      (box as HTMLInputElement).indeterminate = true;
    });
    const mixed = await all.evaluate((box) => ({
      background: getComputedStyle(box).backgroundColor,
      dash: getComputedStyle(box.parentElement?.querySelector('.sov-check__partial') ?? box).opacity,
    }));
    expect(mixed).toEqual({ background: 'rgb(200, 230, 201)', dash: '1' });
  });

  test('DR-3 · V-7 · WCAG 2.4.1, 1.3.1: the workspace frame has exactly one main (the page column, #main) and one contentinfo, with the sidebar outside main', async ({ page }) => {
    for (const file of ['ui/workspace-frame.html', 'ui/workspace-documents.html']) {
      await page.goto(harnessPageUrl(file));
      await expect(page.getByRole('main'), file).toHaveCount(1);
      await expect(page.getByRole('contentinfo'), file).toHaveCount(1);
      await expect(page.getByRole('complementary', { name: 'Project' }), file).toHaveCount(1);
      const pages = page.getByRole('navigation', { name: 'Project pages' });
      await expect(pages, file).toHaveCount(1);
      const sideNav = await pages.elementHandle();
      const landmarks = await page.evaluate((nav) => {
        const main = document.querySelector('main');
        const footer = document.querySelector('footer');
        const aside = document.querySelector('aside');
        return {
          mainId: main?.id,
          mainIsPage: main?.classList.contains('sov-workspace__page'),
          asideInMain: main?.contains(aside ?? null),
          footerInMain: main?.contains(footer ?? null),
          // The sidebar's page list sits in the aside, not in main (the page's own pager may be a nav in main).
          navInMain: main?.contains(nav),
          navInAside: aside?.contains(nav),
          firstHeadingInMain: main?.querySelector('h1, h2, h3')?.tagName,
          demoInFooter: footer?.querySelector('[data-demo-line]') !== null,
        };
      }, sideNav);
      expect(landmarks, file).toEqual({ mainId: 'main', mainIsPage: true, asideInMain: false, footerInMain: false, navInMain: false, navInAside: true, firstHeadingInMain: 'H1', demoInFooter: true });
    }
  });

  test('DR-2 · App theme "Shell sizes": at 1440 with the inspector open, the page starts 24px after the sidebar and each row\'s name, details, menu and record controls stay inside the register\'s visible box however it scrolls', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const file of ['ui/workspace-frame.html', 'ui/workspace-documents.html']) {
      await page.goto(harnessPageUrl(file));
      const measure = () =>
        page.evaluate(() => {
          const region = document.querySelector<HTMLElement>('.sov-register');
          const content = document.querySelector('.sov-inspector-layout__content');
          if (region === null || content === null) throw new Error('no register');
          const visible = region.getBoundingClientRect();
          const inside = (element: Element) => {
            const box = element.getBoundingClientRect();
            return box.width > 0 && box.left >= visible.left - 0.5 && box.right <= visible.right + 0.5;
          };
          // What lies at a control's centre is the control itself: nothing scrolled or pinned covers it.
          const onTop = (element: Element) => {
            const box = element.getBoundingClientRect();
            const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
            return hit !== null && (hit === element || element.contains(hit));
          };
          const rows = [...region.querySelectorAll('tbody tr')].map((row) => {
            const controls = [...row.querySelectorAll('[data-register-cell="open"] button, [data-register-cell="action"] a, [data-register-cell="action"] .sov-menu__button')];
            const name = row.querySelector('th[scope="row"] .sov-value, th[scope="row"] .sov-value-name');
            return {
              controls: controls.length,
              controlsInside: controls.every(inside),
              controlsOnTop: controls.every(onTop),
              nameInside: name !== null && inside(name),
            };
          });
          return { left: Math.round(content.getBoundingClientRect().left), width: Math.round(visible.width), scrolls: region.scrollWidth > region.clientWidth, rows };
        });
      const start = await measure();
      expect(start.left, file).toBe(208 + 24);
      expect(start.width, file).toBe(1440 - 208 - 24 - 24 - 12 - 360);
      // The register is wider than its column here, so the pins are what keeps the controls in view.
      expect(start.scrolls, file).toBe(true);
      for (const row of start.rows) expect(row, file).toEqual({ controls: 2, controlsInside: true, controlsOnTop: true, nameInside: true });
      await page.locator('.sov-register').evaluate((region) => {
        region.scrollLeft = region.scrollWidth;
      });
      const end = await measure();
      for (const row of end.rows) expect(row, `${file} scrolled to the end`).toEqual({ controls: 2, controlsInside: true, controlsOnTop: true, nameInside: true });
    }
  });

  test('DR-8 · ADR 0040 decision 6 · 2.8 "Prominence": in the 360px inspector a two-word stage with its badge breaks no word, and the badge stays inside the inspector', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(harnessPageUrl('ui/workspace-documents.html'));
    const stage = await page.evaluate(() => {
      const text = document.querySelector('.sov-inspector [data-detail="Stage"] .sov-value__text');
      const badge = document.querySelector('.sov-inspector [data-detail="Stage"] .sov-badge');
      const inspector = document.querySelector('.sov-inspector');
      const node = text?.firstChild;
      if (text === null || badge === null || inspector === null || !(node instanceof Text)) throw new Error('no stage');
      // Each word drawn on one line: a word split across lines has two boxes.
      const words: { word: string; boxes: number }[] = [];
      const content = node.data;
      let at = 0;
      for (const word of content.split(' ')) {
        const range = document.createRange();
        range.setStart(node, at);
        range.setEnd(node, at + word.length);
        words.push({ word, boxes: range.getClientRects().length });
        at += word.length + 1;
      }
      return { words, badgeInside: badge.getBoundingClientRect().right <= inspector.getBoundingClientRect().right + 0.5 };
    });
    expect(stage).toEqual({ words: [{ word: 'Technical', boxes: 1 }, { word: 'design', boxes: 1 }], badgeInside: true });
  });

  test('A-1 · rules 2 and 9: a tag written as a number shows in the inspector\'s subheading through the value element, with its badge and its source line, bound to its value id', async ({ page }) => {
    await page.goto(harnessPageUrl('ui/workspace-frame.html'));
    const subheading = page.locator('.sov-inspector__subheading');
    const bound = subheading.locator('[data-value-id$=".tag"]');
    await expect(bound).toHaveCount(1);
    await expect(bound.locator('bdi')).toHaveText('123');
    await expect(bound.locator('[data-copy-kind="badge"]')).toHaveText('From document');
    await expect(bound.locator('.sov-value__source')).toHaveText('Found in TEST Schedule.xlsx, sheet TEST 1');
    await expect(subheading.locator('div, p')).toHaveCount(0);
  });
});
