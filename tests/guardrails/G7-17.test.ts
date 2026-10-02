/**
 * G7-17 (docs/guardrails.md section 7; new in phase 4 part B, from the design review's DR-1; rule 7, "Nothing fills
 * the gap. A skipped field stays unknown. It is never quietly filled with an assumption (rule 1)"; rule 3, "A
 * suggestion is a preselection the app renders. It is not a candidate", and "Nothing hidden, collapsed or on another
 * step is accepted this way": an option the app draws as chosen must be one the owner chose or a visible, labelled
 * suggestion).
 * Situation: an owner question whose options are radios has no answer yet (no radio of the group checked: step 1's
 * project type on a new project, step 5's questions, the revision panel's documents, a qualifier's radios), on a
 * screen that also shows the register's "select all on this page" checkbox with some rows selected (its mixed state).
 * Expected (as indexed in section 7): no option draws as chosen: each is an empty ring (no fill, no mark). Once one is
 * chosen, only that one fills.
 *
 * Beside the case: the select-all checkbox's mixed state still draws its mint fill and its dash (the fix must not take
 * the checkbox's own mixed state away).
 *
 * What went wrong (DR-1): ui.css drew `.sov-check__input:indeterminate` with the accent fill for the select-all
 * checkbox, and HTML also matches every radio of a group with no radio checked as `:indeterminate`, so each
 * unanswered radio drew as a filled mint disc: a question with no answer looked answered with every option at once
 * (WCAG 1.3.1 and 1.4.1 too). The fix scopes the mixed state to checkboxes.
 *
 * Two halves:
 * - the stylesheet as written: every `:indeterminate` rule in packages/ui/src/ui.css names a checkbox;
 * - in Chromium: the kit's real components (ChoiceGroup with ChoiceCard radios, plain Choice radios, RegisterTable
 *   with a selection), rendered to markup with react-dom/server and styled with the kit's tokens.css and ui.css,
 *   read back as computed styles. The select-all box's mixed state is set on the element as the component's ref
 *   does (RegisterTable.test.tsx proves the component sets it). Every label is TEST copy.
 */
import { chromium, type Browser, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createElement, Fragment, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { Choice, ChoiceCard, ChoiceGroup, RegisterTable, type RegisterColumn } from '@sovitech/ui/components';

const UI_CSS = readFileSync(new URL('../../packages/ui/src/ui.css', import.meta.url), 'utf8');
const TOKENS_CSS = readFileSync(new URL('../../packages/ui/src/tokens.css', import.meta.url), 'utf8');

/** The accent (mint) as Chromium computes it, and no fill at all. */
const MINT = 'rgb(200, 230, 201)';
const NO_FILL = 'rgba(0, 0, 0, 0)';

const noop = (): void => undefined;

interface TestRow {
  readonly key: string;
  readonly name: string;
}

const ROWS: readonly TestRow[] = [
  { key: 'row-a', name: 'TEST row a' },
  { key: 'row-b', name: 'TEST row b' },
];

const COLUMNS: readonly RegisterColumn<TestRow>[] = [{ kind: 'content', id: 'name', header: 'TEST name', rowHeader: true, cell: (row) => row.name }];

function screen(): ReactElement {
  return createElement(
    'main',
    null,
    createElement(ChoiceGroup, {
      legend: 'TEST project type with no answer yet',
      children: createElement(
        Fragment,
        null,
        createElement(ChoiceCard, { type: 'radio', name: 'unansweredType', value: 'a', checked: false, onChange: noop, title: 'TEST option a' }),
        createElement(ChoiceCard, { type: 'radio', name: 'unansweredType', value: 'b', checked: false, onChange: noop, title: 'TEST option b' }),
      ),
    }),
    createElement(
      'fieldset',
      null,
      createElement('legend', null, 'TEST qualifier with no answer yet'),
      createElement(Choice, { type: 'radio', name: 'unansweredBasis', value: 'a', checked: false, onChange: noop, label: 'TEST basis a' }),
      createElement(Choice, { type: 'radio', name: 'unansweredBasis', value: 'b', checked: false, onChange: noop, label: 'TEST basis b' }),
    ),
    createElement(RegisterTable<TestRow>, {
      label: 'TEST register',
      columns: COLUMNS,
      rows: ROWS,
      rowKey: (row: TestRow) => row.key,
      selection: { selected: new Set(['row-b']), onToggle: noop, onToggleAll: noop, header: 'TEST select', rowLabel: 'TEST select this row', allLabel: 'TEST select all rows on this page' },
    }),
  );
}

interface DrawnRadio {
  readonly name: string;
  readonly checked: boolean;
  readonly indeterminate: boolean;
  readonly fill: string;
  readonly mark: string;
}

function drawnRadios(page: Page): Promise<DrawnRadio[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLInputElement>('input[type="radio"]')].map((radio) => ({
      name: radio.name,
      checked: radio.checked,
      indeterminate: radio.matches(':indeterminate'),
      fill: getComputedStyle(radio).backgroundColor,
      mark: getComputedStyle(radio.parentElement?.querySelector('.sov-check__mark') ?? radio).opacity,
    })),
  );
}

let browser: Browser | undefined;

beforeAll(async () => {
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser?.close();
});

describe('G7-17 · DR-1 · rule 7 "Nothing fills the gap" · rule 3: an unanswered radio question draws no option as chosen', () => {
  test('G7-17: every :indeterminate rule of the kit stylesheet names a checkbox, so no radio takes the mixed state\'s fill', () => {
    const source = UI_CSS.replace(/\/\*[\s\S]*?\*\//gu, '');
    const selectors = [...source.matchAll(/([^{}]+)\{/gu)].flatMap((match) => (match[1] ?? '').split(',')).map((selector) => selector.replace(/\s+/gu, ' ').trim());
    const indeterminate = selectors.filter((selector) => selector.includes(':indeterminate'));
    expect(indeterminate.length).toBeGreaterThan(0);
    for (const selector of indeterminate) expect(selector, selector).toMatch(/\[type='checkbox'\]:indeterminate/u);
  });

  test('G7-17: in Chromium every option of an unanswered radio group is an empty ring, a chosen one alone fills, and the select-all checkbox\'s mixed state keeps its fill and dash', async () => {
    if (browser === undefined) throw new Error('Chromium did not launch.');
    const page = await browser.newPage();
    try {
      await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8" /><title>G7-17</title><style>${TOKENS_CSS}\n${UI_CSS}</style></head><body>${renderToStaticMarkup(screen())}</body></html>`);

      // Unanswered: HTML calls each radio of the group indeterminate, and the kit draws none of them as chosen.
      const unanswered = await drawnRadios(page);
      expect(unanswered).toHaveLength(4);
      for (const radio of unanswered) expect(radio).toEqual({ name: radio.name, checked: false, indeterminate: true, fill: NO_FILL, mark: '0' });

      // One option chosen: that one fills with its mark; the others stay empty rings.
      await page.check('input[name="unansweredBasis"][value="a"]');
      const answered = (await drawnRadios(page)).filter((radio) => radio.name === 'unansweredBasis');
      expect(answered.map((radio) => [radio.checked, radio.fill, radio.mark])).toEqual([
        [true, MINT, '1'],
        [false, NO_FILL, '0'],
      ]);

      // The register's select-all checkbox with one of two rows selected: its mixed state draws the fill and the dash.
      const mixed = await page.evaluate(() => {
        const box = document.querySelector<HTMLInputElement>('input[type="checkbox"][aria-label="TEST select all rows on this page"]');
        if (box === null) throw new Error('no select-all checkbox');
        box.indeterminate = true;
        return {
          indeterminate: box.matches(':indeterminate'),
          fill: getComputedStyle(box).backgroundColor,
          dash: getComputedStyle(box.parentElement?.querySelector('.sov-check__partial') ?? box).opacity,
        };
      });
      expect(mixed).toEqual({ indeterminate: true, fill: MINT, dash: '1' });
    } finally {
      await page.close();
    }
  });
});
