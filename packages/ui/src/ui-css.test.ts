/**
 * The kit stylesheet's contract for the phase 3 design review's kit fixes (DR-1, DR-2, DR-4, DR-11,
 * DR-14, DR-18, DR-24, DR-26, A-8): the rules that place and size the components, read from
 * ui.css and tokens.css as written. The component tests prove the markup these rules select; the
 * kit's harness pages (tests/e2e/pages/ui/) prove them in Chromium with axe.
 */
import { describe, expect, test } from 'vitest';

/**
 * Node's file reader, reached without Node's global types: this package is typed for the browser
 * (tsconfig `types: []`), and Vitest empties a stylesheet imported as a module (`?raw` included).
 */
interface NodeFs {
  readFileSync(path: URL, encoding: 'utf8'): string;
}
const { readFileSync } = (globalThis as unknown as { process: { getBuiltinModule(id: 'node:fs'): NodeFs } }).process.getBuiltinModule('node:fs');

const UI_CSS = readFileSync(new URL('./ui.css', import.meta.url), 'utf8');
const TOKENS_CSS = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');

interface Rule {
  readonly selectors: readonly string[];
  readonly declarations: ReadonlyMap<string, string>;
  /** Whether the rule sits in the `prefers-reduced-motion: reduce` block. */
  readonly reducedMotion: boolean;
}

/** The innermost rules of a stylesheet (selectors and declarations; nested at-rules flattened). */
function rulesOf(css: string): Rule[] {
  const source = css.replace(/\/\*[\s\S]*?\*\//gu, '');
  const reducedAt = source.indexOf('@media (prefers-reduced-motion: reduce)');
  const rules: Rule[] = [];
  for (const match of source.matchAll(/([^{}]+)\{([^{}]*)\}/gu)) {
    const [, selectorText = '', body = ''] = match;
    const declarations = new Map<string, string>();
    for (const declaration of body.split(';')) {
      const colon = declaration.indexOf(':');
      if (colon < 0) continue;
      declarations.set(declaration.slice(0, colon).trim(), declaration.slice(colon + 1).replace(/\s+/gu, ' ').trim());
    }
    const selectors = selectorText
      .split(',')
      .map((selector) => selector.replace(/\s+/gu, ' ').trim())
      .filter((selector) => selector !== '');
    const at = match.index;
    rules.push({ selectors, declarations, reducedMotion: reducedAt >= 0 && at !== undefined && at > reducedAt });
  }
  return rules;
}

const RULES = rulesOf(UI_CSS);

/** The declared value of a property on a selector (the last rule that sets it, outside the reduced-motion block unless asked). */
function declared(selector: string, property: string, options: { readonly reducedMotion?: boolean } = {}): string | undefined {
  const wanted = options.reducedMotion ?? false;
  let found: string | undefined;
  for (const rule of RULES) {
    if (rule.reducedMotion !== wanted || !rule.selectors.includes(selector)) continue;
    const value = rule.declarations.get(property);
    if (value !== undefined) found = value;
  }
  return found;
}

describe('DR-11: tabular figures only on numeric displays', () => {
  test('DR-11: tabular-nums is set only on numeric selectors, never on a value\'s whole text', () => {
    const tabular = RULES.filter((rule) => rule.declarations.get('font-variant-numeric') === 'tabular-nums').flatMap((rule) => rule.selectors);
    expect(tabular.sort()).toEqual(
      [
        '.sov-counter',
        '.sov-date',
        '.sov-price .sov-value__text',
        ".sov-stepper__mark",
        ".sov-value[data-numeric='true'] .sov-value__figure",
      ].sort(),
    );
    expect(declared('.sov-value__text', 'font-variant-numeric')).toBeUndefined();
  });
});

describe('G2-13 · A-8: served text is isolated', () => {
  test('G2-13 · A-8: the value text isolates its direction (with the <bdi> element it is rendered in)', () => {
    expect(declared('.sov-value__text', 'unicode-bidi')).toBe('isolate');
  });
});

describe('DR-1 · DR-2 · 2.8 "Prominence": a badge stays with its figure', () => {
  test('DR-1: the row layout wraps the value under its label only where both do not fit, right-aligned; the value line never wraps between text and badge', () => {
    const row = ".sov-field-value[data-layout='row']";
    expect(declared(row, 'display')).toBe('flex');
    expect(declared(row, 'flex-wrap')).toBe('wrap');
    expect(declared(`${row} > .sov-field-value__label`, 'min-width')).toBe('0');
    expect(declared(`${row} > .sov-value`, 'margin-inline-start')).toBe('auto');
    expect(declared('.sov-value__line', 'flex-wrap')).toBe('nowrap');
    expect(declared('.sov-value__text', 'min-width')).toBe('0');
    expect(declared('.sov-badge', 'white-space')).toBe('nowrap');
  });

  test('DR-2: the compact layout moves the badge under its text only in a narrow slot, on the same tile, and never breaks a word', () => {
    const compact = ".sov-field-value[data-layout='compact']";
    expect(declared(`${compact} .sov-value__line`, 'flex-wrap')).toBe('wrap');
    expect(declared(`${compact} .sov-value__text`, 'overflow-wrap')).toBe('break-word');
    expect(declared('.sov-choice-card__status', 'display')).toBe('flex');
    expect(declared('.sov-choice-card__top > .sov-check', 'margin-inline-start')).toBe('auto');
  });

  test('DR-2 · 2.8 "Prominence": on a narrow tile the status badge\'s words wrap inside its pill, so it stays on the tile and never passes its border', () => {
    const tileBadge = ".sov-choice-card[data-shape='tile'] .sov-choice-card__status .sov-badge";
    expect(declared(tileBadge, 'white-space')).toBe('normal');
    expect(declared(tileBadge, 'min-width')).toBe('0');
    expect(declared(tileBadge, 'flex')).toBe('0 1 auto');
  });

  test('DR-2: on a pill the status takes the second row, from the title\'s edge to the control\'s (from the card\'s edge when the pill has no icon)', () => {
    expect(declared(".sov-choice-card[data-shape='pill']", 'grid-template-columns')).toBe('auto minmax(0, 1fr) auto');
    expect(declared(".sov-choice-card[data-shape='pill'] > .sov-choice-card__status", 'grid-column')).toBe('2 / -1');
    expect(declared(".sov-choice-card[data-shape='pill'][data-icon='false']", 'grid-template-columns')).toBe('minmax(0, 1fr) auto');
    expect(declared(".sov-choice-card[data-shape='pill'][data-icon='false'] > .sov-choice-card__status", 'grid-column')).toBe('1 / -1');
  });
});

describe('DR-4: the progress bar', () => {
  test('DR-4 · WCAG 1.4.11: the track is outlined in the control boundary, the mint segment is 4px high, and the words beside it are 13px in text-tertiary', () => {
    expect(declared('.sov-progress__track', 'border')).toBe('1px solid var(--sov-control-border)');
    expect(declared('.sov-progress__track', 'height')).toBe('6px');
    expect(declared('.sov-progress__track', 'overflow')).toBe('hidden');
    expect(declared('.sov-progress__bar', 'inset-block')).toBe('0');
    expect(declared('.sov-progress__bar', 'background-color')).toBe('var(--sov-accent)');
    expect(declared('.sov-progress__label', 'color')).toBe('var(--sov-text-tertiary)');
    expect(declared('.sov-progress__label', 'font-size')).toBe('13px');
  });

  test('DR-4 · prompt 3 section 11: under reduced motion the segment stands still, inside the track', () => {
    expect(declared('.sov-progress__bar', 'animation', { reducedMotion: true })).toBe('none');
    expect(declared('.sov-progress__bar', 'left', { reducedMotion: true })).toBe('30%');
  });
});

describe('DR-24: links read as links', () => {
  test('DR-24 · WCAG 1.4.1: a link-variant button with no icon is underlined at a 3px offset, as the quiet variant is', () => {
    const link = ".sov-button[data-variant='link'][data-icon='false']";
    expect(declared(link, 'text-decoration')).toBe('underline');
    expect(declared(link, 'text-underline-offset')).toBe('3px');
    expect(declared(".sov-button[data-variant='quiet']", 'text-underline-offset')).toBe('3px');
  });
});

describe('DR-14: one placement for "Skip for now"', () => {
  test('DR-14: the link and its "later" line sit 24px under the cards, at the grid\'s left edge, after a grid or in a ChoiceGroup footer alike', () => {
    expect(declared('.sov-skip', 'margin')).toBe('24px 0 0');
    expect(declared('.sov-skip', 'justify-items')).toBe('start');
    // In ChoiceGroup's footer the group's 12px gap and the link's own 12px make the same 24px.
    expect(declared('.sov-choice-group', 'gap')).toBe('12px');
    expect(declared('.sov-choice-group > .sov-skip', 'margin-top')).toBe('12px');
  });
});

describe('DR-18: two heading roles', () => {
  test('DR-18: tokens.css defines the section heading (20px, 300) and the group or question label (16px, 500), as roles proposed, pending the owner\'s OK', () => {
    const tokens = rulesOf(TOKENS_CSS).find((rule) => rule.selectors.includes(':root'));
    expect(tokens?.declarations.get('--sov-heading-section-size')).toBe('20px');
    expect(tokens?.declarations.get('--sov-heading-section-weight')).toBe('300');
    expect(tokens?.declarations.get('--sov-heading-group-size')).toBe('16px');
    expect(tokens?.declarations.get('--sov-heading-group-weight')).toBe('500');
    const note = TOKENS_CSS.slice(TOKENS_CSS.indexOf('Two heading roles'), TOKENS_CSS.indexOf('--sov-heading-section-size')).replace(/\s+/gu, ' ');
    expect(note).toContain("ROLES proposed, pending the owner's OK");
  });

  test('DR-18: the kit exposes the roles as classes, the legend and field label read the group role, and card titles stay 17px at 600', () => {
    expect(declared('.sov-heading-section', 'font-size')).toBe('var(--sov-heading-section-size)');
    expect(declared('.sov-heading-section', 'font-weight')).toBe('var(--sov-heading-section-weight)');
    expect(declared('.sov-heading-group', 'font-size')).toBe('var(--sov-heading-group-size)');
    expect(declared('.sov-heading-group', 'font-weight')).toBe('var(--sov-heading-group-weight)');
    for (const selector of ['.sov-choice-group__legend', '.sov-field__label']) {
      expect(declared(selector, 'font-size'), selector).toBe('var(--sov-heading-group-size)');
      expect(declared(selector, 'font-weight'), selector).toBe('var(--sov-heading-group-weight)');
    }
    expect(declared('.sov-card__title', 'font-size')).toBe('17px');
    expect(declared('.sov-card__title', 'font-weight')).toBe('var(--sov-weight-semibold)');
  });
});

describe('DR-26 · ADR 0035: icon sizes', () => {
  test('DR-26: the large icon is 32px, the render test\'s limit; the default is the 24px token', () => {
    expect(declared(".sov-icon[data-size='large']", 'width')).toBe('32px');
    expect(declared(".sov-icon[data-size='large']", 'height')).toBe('32px');
    expect(declared('.sov-icon', 'width')).toBe('var(--sov-icon-size)');
  });
});

describe('phase 4 · ADR 0043 decision 5 · App theme "Shell sizes": the workspace frame', () => {
  test('ADR 0043: tokens.css carries the shell sizes of App theme "Shell sizes" (sidebar 208px at a 32px pitch, inspector 360px, footer 48px, 16px gutter, 12px panel gap)', () => {
    const tokens = rulesOf(TOKENS_CSS).find((rule) => rule.selectors.includes(':root'));
    expect(tokens?.declarations.get('--sov-sidebar-width')).toBe('208px');
    expect(tokens?.declarations.get('--sov-sidebar-row')).toBe('32px');
    expect(tokens?.declarations.get('--sov-inspector-width')).toBe('360px');
    expect(tokens?.declarations.get('--sov-footer-height')).toBe('48px');
    expect(tokens?.declarations.get('--sov-gutter')).toBe('16px');
    expect(tokens?.declarations.get('--sov-panel-gap')).toBe('12px');
  });

  test('R-139 · rule 10 · GS-1: the status footer is at least 48px and sticks to the window\'s foot, so the demo line never scrolls away; the frame places the sidebar and the inspector at their widths', () => {
    expect(declared('.sov-status-footer', 'min-height')).toBe('var(--sov-footer-height)');
    expect(declared('.sov-workspace__footer', 'position')).toBe('sticky');
    expect(declared('.sov-workspace__footer', 'bottom')).toBe('0');
    expect(declared('.sov-workspace', 'grid-template-columns')).toBe('var(--sov-sidebar-width) minmax(0, 1fr)');
    expect(declared(".sov-inspector-layout[data-inspector='open']", 'grid-template-columns')).toBe('minmax(0, 1fr) var(--sov-inspector-width)');
    expect(declared('.sov-inspector-layout', 'gap')).toBe('var(--sov-panel-gap)');
    // In the footer the demo line keeps its words in full: nothing truncates it (2.8 "Prominence").
    for (const selector of ['.sov-status-footer', '.sov-status-footer .sov-demo-line', '.sov-demo-line']) {
      expect(declared(selector, 'text-overflow'), selector).toBeUndefined();
      expect(declared(selector, 'overflow'), selector).toBeUndefined();
    }
  });
});

describe('phase 4 · App theme "Sidebar selected row": one mark for "this one", never colour alone', () => {
  test('App theme: the current page, the open register row and the chosen option take a 2px mint edge and the mint 8% fill; the page and the option also change weight', () => {
    const nav = ".sov-side-nav__link[aria-current='page']";
    expect(declared(nav, 'border-inline-start-color')).toBe('var(--sov-accent)');
    expect(declared(nav, 'background-color')).toBe('var(--sov-surface-selected)');
    expect(declared(nav, 'font-weight')).toBe('var(--sov-weight-semibold)');
    expect(declared('.sov-side-nav__link', 'border-inline-start')).toBe('2px solid transparent');
    expect(declared('.sov-side-nav__link', 'min-height')).toBe('var(--sov-sidebar-row)');
    expect(declared(".sov-register__row[aria-current='true']", 'background-color')).toBe('var(--sov-surface-selected)');
    expect(declared(".sov-register__row[aria-current='true'] > :first-child", 'border-inline-start-color')).toBe('var(--sov-accent)');
    const option = ".sov-selection-list__option[aria-selected='true']";
    expect(declared(option, 'border-inline-start-color')).toBe('var(--sov-accent)');
    expect(declared(option, 'font-weight')).toBe('var(--sov-weight-semibold)');
    expect(declared(".sov-tabs__tab[aria-selected='true']", 'border-bottom-color')).toBe('var(--sov-accent)');
    expect(declared(".sov-tabs__tab[aria-selected='true']", 'font-weight')).toBe('var(--sov-weight-semibold)');
    expect(declared('.sov-chips__chip:has(.sov-chips__input:checked)', 'font-weight')).toBe('var(--sov-weight-semibold)');
  });

  test('App theme "Shape": 9999px only on badges, the radio and the stepper\'s marks; the switch\'s track and knob take the control radius (no pill)', () => {
    const pills = RULES.filter((rule) => rule.declarations.get('border-radius') === 'var(--sov-radius-pill)').flatMap((rule) => rule.selectors);
    expect(pills.sort()).toEqual(['.sov-badge', ".sov-check[data-type='radio'] .sov-check__input", '.sov-stepper__dot', '.sov-stepper__mark'].sort());
    expect(declared('.sov-switch__track', 'border-radius')).toBe('var(--sov-radius-control)');
    expect(declared('.sov-switch__knob', 'border-radius')).toBe('var(--sov-radius-control)');
  });

  test('prompt 3 section 11: the switch, the tabs, the chips and the register keep the accent focus outline; hidden tab panels stay hidden', () => {
    expect(declared('.sov-switch__input:focus-visible + .sov-switch__track', 'outline')).toBe('var(--sov-focus-width) solid var(--sov-focus-ring)');
    expect(declared('.sov-chips__chip:has(.sov-chips__input:focus-visible)', 'outline')).toBe('var(--sov-focus-width) solid var(--sov-focus-ring)');
    for (const selector of ['.sov-tabs__tab:focus-visible', '.sov-icon-button:focus-visible', '.sov-register__sort:focus-visible', '.sov-side-nav__link:focus-visible']) {
      expect(declared(selector, 'outline'), selector).toBe('var(--sov-focus-width) solid var(--sov-focus-ring)');
    }
    expect(declared('.sov-tabs__panel[hidden]', 'display')).toBe('none');
  });

  test('prompt 3 section 11 · G2-8: under reduced motion the workspace controls do not transition; no value inside a register cell animates', () => {
    for (const selector of ['.sov-switch__track', '.sov-tabs__tab', '.sov-chips__chip', '.sov-side-nav__link', '.sov-register__row', '.sov-selection-list__option', '.sov-menu__item']) {
      expect(declared(selector, 'transition', { reducedMotion: true }), selector).toBe('none');
    }
    expect(declared('.sov-value *', 'animation')).toBe('none');
  });
});

describe('phase 4 part B · the design review\'s kit findings', () => {
  test('DR-1 · G7-17 · rule 7 "Nothing fills the gap" · rule 3: the mixed state is drawn for checkboxes only, so an unanswered radio group draws empty rings; the select-all checkbox keeps its fill and dash', () => {
    const indeterminate = RULES.flatMap((rule) => rule.selectors).filter((selector) => selector.includes(':indeterminate'));
    expect(indeterminate.sort()).toEqual([".sov-check__input[type='checkbox']:indeterminate", ".sov-check__input[type='checkbox']:indeterminate ~ .sov-check__partial"].sort());
    expect(declared(".sov-check__input[type='checkbox']:indeterminate", 'background-color')).toBe('var(--sov-accent)');
    expect(declared(".sov-check__input[type='checkbox']:indeterminate", 'border-color')).toBe('var(--sov-accent)');
    expect(declared(".sov-check__input[type='checkbox']:indeterminate ~ .sov-check__partial", 'opacity')).toBe('1');
    // An unchecked radio: the control boundary on no fill; only :checked fills.
    expect(declared('.sov-check__input', 'background-color')).toBe('transparent');
    expect(declared('.sov-check__input', 'border')).toBe('1px solid var(--sov-control-border)');
    expect(declared('.sov-check__input:checked', 'background-color')).toBe('var(--sov-accent)');
  });

  test('DR-2 · App theme "Shell sizes": the page column takes the one padding of the page, from the gutter token (24px, 32px at the foot)', () => {
    expect(declared('.sov-workspace__page', 'padding')).toBe('calc(var(--sov-gutter) * 1.5) calc(var(--sov-gutter) * 1.5) calc(var(--sov-gutter) * 2)');
    expect(declared('.sov-workspace__page', 'min-width')).toBe('0');
  });

  test('DR-2: in a table wider than its region, the row\'s name and its controls are pinned with an opaque background, the open row keeping its mint mark under the content; separate borders move with them', () => {
    expect(declared('.sov-register__table', 'border-collapse')).toBe('separate');
    expect(declared('.sov-register__table', 'border-spacing')).toBe('0');
    expect(declared('.sov-register [data-pin]', 'position')).toBe('sticky');
    expect(declared('.sov-register [data-pin]', 'background-color')).toBe('var(--sov-bg)');
    expect(declared('.sov-register thead [data-pin]', 'background-color')).toBe('var(--sov-surface)');
    expect(declared(".sov-register [data-pin='select']", 'inset-inline-start')).toBe('0');
    expect(declared(".sov-register [data-pin='name']", 'inset-inline-start')).toBe('0');
    expect(declared(".sov-register[data-select='true'] [data-pin='name']", 'inset-inline-start')).toBe('var(--sov-register-lead, 46px)');
    expect(declared(".sov-register [data-pin='action']", 'inset-inline-end')).toBe('0');
    expect(declared(".sov-register [data-pin='open']", 'inset-inline-end')).toBe('0');
    expect(declared(".sov-register[data-row-action='true'] [data-pin='open']", 'inset-inline-end')).toBe('var(--sov-register-trail, 56px)');
    expect(declared('.sov-register__row:hover > [data-pin]', 'background-color')).toBe('var(--sov-surface)');
    expect(declared(".sov-register__row[aria-current='true'] > [data-pin]", 'background-color')).toBe('var(--sov-bg)');
    const mark = ".sov-register__row[aria-current='true'] > [data-pin]::before";
    expect(declared(mark, 'background-color')).toBe('var(--sov-surface-selected)');
    expect(declared(mark, 'z-index')).toBe('-1');
    // The mark's generated box holds no text (the render test reads ::before).
    expect(declared(mark, 'content')).toBe("''");
    expect(declared(".sov-register__row:has(.sov-menu__button[aria-expanded='true']) > [data-pin]", 'z-index')).toBe('3');
  });

  test('DR-3: the page column is the main that takes the focus when a page opens; the whole column draws no outline for it', () => {
    expect(declared('.sov-workspace__page:focus', 'outline')).toBe('none');
  });

  test('DR-8 · ADR 0040 decision 6: in the inspector a value\'s badge moves under its text where both do not fit, and its words never split', () => {
    expect(declared('.sov-inspector .sov-value__line', 'flex-wrap')).toBe('wrap');
    expect(declared('.sov-inspector .sov-value__text', 'overflow-wrap')).toBe('break-word');
  });

  test('DR-10: the small status line is 13px, in the line\'s text-tertiary', () => {
    expect(declared(".sov-status-line[data-size='small']", 'font-size')).toBe('13px');
    expect(declared('.sov-status-line', 'color')).toBe('var(--sov-text-tertiary)');
    expect(declared(".sov-status-line[data-size='small']", 'color')).toBeUndefined();
  });

  test('A-1: a numeric name delegated to the value element reads at the size of the heading, button or option it sits in, its badge moving under it where both do not fit', () => {
    const text = ".sov-value-name[data-delegated='value'] .sov-value__text";
    expect(declared(text, 'font-size')).toBe('inherit');
    expect(declared(text, 'font-weight')).toBe('inherit');
    expect(declared(text, 'line-height')).toBe('inherit');
    expect(declared(".sov-value-name[data-delegated='value'] .sov-value__line", 'flex-wrap')).toBe('wrap');
  });
});
