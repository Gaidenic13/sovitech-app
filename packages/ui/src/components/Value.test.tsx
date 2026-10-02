import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { DisplayObjectSchema, servedDisplayOf, type DisplayObject } from '@sovitech/view-model/browser';
import { Value, type ValueActionLabels } from './Value';
import * as displays from './test-displays';
import { AREA, BUILDING_TYPE, ENGINEER_ITEM, OUTPUT_MISSING_INPUT, UNKNOWN } from './test-displays';

afterEach(cleanup);

const LABELS: ValueActionLabels = { edit: 'TEST edit', yes: 'TEST yes', looksRight: 'TEST looks right', somethingWrong: 'TEST something wrong' };

function valueElement(container: HTMLElement, display: DisplayObject): HTMLElement {
  const element = container.querySelector<HTMLElement>(`[data-value-id="${display.valueId}"]`);
  if (element === null) throw new Error(`no element bound to ${display.valueId}`);
  return element;
}

/** Every text node under the element that holds a number character. */
function numberTexts(element: HTMLElement): string[] {
  const found: string[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const text = (node.textContent ?? '').replace(/\s+/gu, ' ').trim();
    if (/\p{N}/u.test(text)) found.push(text);
  }
  return found;
}

/** The strings a display object lets its element show (the render test's reading, through the shared projection). */
function servedStrings(display: DisplayObject): string[] {
  const served = servedDisplayOf(display);
  return [served.text, ...(served.lines ?? []), ...(served.parts ?? []), ...(served.evidence ?? []).map((item) => item.excerpt)];
}

describe('F-RENDER-01 · US-REVIEW-01 · R-043: the one value component shows only what its display object serves', () => {
  test('ADR 0036: every TEST display object the kit is tested on is valid under the contract schema', () => {
    for (const [name, candidate] of Object.entries(displays)) {
      if (typeof candidate !== 'object' || candidate === null || !('valueId' in candidate)) continue;
      expect(DisplayObjectSchema.safeParse(candidate).success, name).toBe(true);
    }
  });

  test('G2-1 · US-REVIEW-01 AC9: every number inside the bound element is one of the strings its display object serves', () => {
    for (const display of [AREA, BUILDING_TYPE, ENGINEER_ITEM, OUTPUT_MISSING_INPUT, UNKNOWN]) {
      const { container, unmount } = render(<Value display={display} onAction={vi.fn()} actionLabels={LABELS} evidenceLabel="TEST excerpt" />);
      const element = valueElement(container, display);
      const served = servedStrings(display);
      for (const text of numberTexts(element)) {
        expect(served.some((string) => string.includes(text)), `${display.valueId}: "${text}"`).toBe(true);
      }
      unmount();
    }
  });

  test('US-REVIEW-01 AC1 · AC12: one badge on the same line as the figure, and the source line below, inside the bound element', () => {
    const { container } = render(<Value display={AREA} />);
    const element = valueElement(container, AREA);
    const line = element.querySelector('.sov-value__line');
    expect(line?.querySelectorAll('[data-copy-kind="badge"]')).toHaveLength(1);
    expect(line?.textContent).toContain('TEST 12,345');
    expect(within(element).getByText('From document').getAttribute('data-badge')).toBe('from_document');
    expect(within(element).getByText('Found in TEST Area Schedule.pdf, page 1').className).toBe('sov-value__source');
  });

  test('US-REVIEW-01 · rule 8: the figure and its unit render apart as the declared parts', () => {
    const { container } = render(<Value display={AREA} />);
    const element = valueElement(container, AREA);
    expect(element.querySelector('.sov-value__figure')?.textContent).toBe('TEST 12,345');
    expect(element.querySelector('.sov-value__unit')?.textContent).toBe('m²');
  });

  test('US-REVIEW-01 · rule 8: a second figure is never styled as a unit; only the declared unit symbol is', () => {
    const range: DisplayObject = { ...AREA, text: 'TEST 43 to TEST 47', parts: ['TEST 43', 'TEST 47'], measure: { label: 'TEST count' } };
    const { container } = render(<Value display={range} />);
    const element = valueElement(container, range);
    expect(element.querySelector('.sov-value__unit')).toBeNull();
    expect([...element.querySelectorAll('.sov-value__figure')].map((node) => node.textContent)).toEqual(['TEST 43', 'TEST 47']);
  });

  test('US-REVIEW-01 AC5 · G1-1: a missing value reads its missing wording once, as its badge, never a zero, a blank or a dash', () => {
    const { container } = render(<Value display={UNKNOWN} />);
    const element = valueElement(container, UNKNOWN);
    expect(element.textContent).toBe('Unknown');
    expect(element.querySelectorAll('[data-copy-kind="badge"]')).toHaveLength(1);
    expect(element.textContent).not.toMatch(/[0‒-―-]/u);
  });

  test('US-REVIEW-01 · rule 8: what the value measures is shown, outside the bound element, its qualifier marked as a registry qualifier label', () => {
    const { container } = render(<Value display={AREA} />);
    const group = screen.getByRole('group', { name: /TEST gross floor area/u });
    const element = valueElement(container, AREA);
    expect(element.textContent).not.toContain('TEST gross floor area');
    expect(group.querySelector('[data-copy-kind="registry-qualifier"]')?.textContent).toBe('TEST basis stated');
  });

  test('DR-27 · rule 8: the qualifier follows the measure after a comma, the registry label alone in its marked element; the kit adds no bracket', () => {
    const qualified: DisplayObject = { ...AREA, measure: { label: 'TEST gross floor area', unit: { code: 'm2', symbol: 'm²' }, qualifierLabel: 'TEST gross total (Scd)' } };
    for (const layout of ['stack', 'row', 'detail', 'compact'] as const) {
      const { unmount } = render(<Value display={qualified} layout={layout} />);
      const group = screen.getByRole('group', { name: 'TEST gross floor area, TEST gross total (Scd)' });
      expect(group.querySelector('.sov-field-value__label')?.textContent).toBe('TEST gross floor area, TEST gross total (Scd)');
      expect(group.querySelector('[data-copy-kind="registry-qualifier"]')?.textContent).toBe('TEST gross total (Scd)');
      expect(group.textContent).not.toContain('((');
      unmount();
    }
  });

  test('G2-7 · US-REVIEW-01 AC11 · DR-2: one value id renders the identical display in every layout, compact included', () => {
    const shown = (['stack', 'row', 'detail', 'compact', 'bare'] as const).map((layout) => {
      const { container, unmount } = render(<Value display={AREA} layout={layout} />);
      const html = valueElement(container, AREA).outerHTML;
      unmount();
      return html;
    });
    expect(new Set(shown).size).toBe(1);
  });
});

describe('DR-1 · DR-2 · DR-11 · A-8: how the value sits on the page (phase 3 design review)', () => {
  test('DR-1 · 2.8 "Prominence": in the row layout the label comes first, then the value, whose one line holds its text and its badge together', () => {
    const { container } = render(<Value display={AREA} layout="row" />);
    const row = container.querySelector('.sov-field-value[data-layout="row"]');
    expect([...(row?.children ?? [])].map((child) => child.className)).toEqual(['sov-field-value__label', 'sov-value']);
    const line = valueElement(container, AREA).querySelector('.sov-value__line');
    expect([...(line?.children ?? [])].map((child) => child.className)).toEqual(['sov-value__text', 'sov-badge']);
    expect(valueElement(container, AREA).querySelector('.sov-value__source')?.textContent).toBe('Found in TEST Area Schedule.pdf, page 1');
  });

  test('DR-2 · 2.8 "Prominence": the compact layout shows the text and its badge on one line, drops neither, and keeps a served source line below', () => {
    const { container } = render(<Value display={AREA} layout="compact" label={null} />);
    const wrapper = container.querySelector('.sov-field-value[data-layout="compact"]');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.getAttribute('role')).toBeNull();
    const line = valueElement(container, AREA).querySelector('.sov-value__line');
    expect(line?.querySelector('.sov-value__text')?.textContent).toBe('TEST 12,345 m²');
    expect(line?.querySelector('[data-copy-kind="badge"]')?.textContent).toBe('From document');
    expect(valueElement(container, AREA).querySelector('.sov-value__source')?.textContent).toBe('Found in TEST Area Schedule.pdf, page 1');
  });

  test('DR-2: a compact value with a label is a group named by it; a missing value still reads its wording as its badge', () => {
    const { container } = render(<Value display={UNKNOWN} layout="compact" label="TEST your choice" />);
    expect(screen.getByRole('group', { name: 'TEST your choice' })).toBeTruthy();
    expect(valueElement(container, UNKNOWN).textContent).toBe('Unknown');
  });

  test('DR-11: tabular figures are marked only on numeric displays (a quantity or count with its unit, a range, a line built around its numbers, a coverage record), never on text values such as a file name, a revision or a project name', () => {
    const fileName: DisplayObject = { valueId: `document:${displays.TEST_DOCUMENT}.fileName`, kind: 'record', text: 'TEST-caiet-de-sarcini-12.pdf', parts: ['TEST-caiet-de-sarcini-12.pdf'], shape: 'value' };
    const projectName: DisplayObject = { valueId: `project:${displays.TEST_SUBJECT}.name`, kind: 'field', text: 'TEST Tower 12', parts: ['TEST Tower 12'], shape: 'value', badge: { id: 'provided_by_you', label: 'Provided by you' }, measure: { label: 'TEST project name' } };
    const range: DisplayObject = { ...AREA, valueId: `building:${displays.TEST_SUBJECT}.range`, text: 'TEST 43 to TEST 47', parts: ['TEST 43', 'TEST 47'], shape: 'range', measure: { label: 'TEST count' } };
    const coverage: DisplayObject = { valueId: `document:${displays.TEST_DOCUMENT}.coverage`, kind: 'record', text: 'TEST 12 of 40 pages', parts: ['12', '40'], shape: 'value' };
    const revision: DisplayObject = { valueId: `document:${displays.TEST_DOCUMENT}.revision`, kind: 'record', text: 'TEST rev. B-02', parts: ['TEST rev. B-02'], shape: 'value', badge: { id: 'from_document', label: 'From document' } };
    const cases: ReadonlyArray<readonly [DisplayObject, 'true' | 'false']> = [
      [AREA, 'true'],
      [range, 'true'],
      [displays.OPEN_ITEMS, 'true'],
      [coverage, 'true'],
      [fileName, 'false'],
      [revision, 'false'],
      [projectName, 'false'],
      [BUILDING_TYPE, 'false'],
      [UNKNOWN, 'false'],
    ];
    for (const [display, numeric] of cases) {
      expect(DisplayObjectSchema.safeParse(display).success, display.valueId).toBe(true);
      const { container, unmount } = render(<Value display={display} />);
      expect(valueElement(container, display).getAttribute('data-numeric'), display.valueId).toBe(numeric);
      unmount();
    }
  });

  test('G2-13 · A-8: served text is isolated in a <bdi>, so a direction control in owner text (U+202E) never reorders the badge or the copy around it', () => {
    const spoof: DisplayObject = {
      valueId: `project:${displays.TEST_SUBJECT}.name`,
      kind: 'field',
      text: 'TEST \u202Eyb dedivorP',
      shape: 'value',
      badge: { id: 'provided_by_you', label: 'Provided by you' },
      measure: { label: 'TEST project name' },
    };
    const { container } = render(<Value display={spoof} />);
    const element = valueElement(container, spoof);
    const isolate = element.querySelector('.sov-value__text');
    expect(isolate?.tagName).toBe('BDI');
    expect(isolate?.textContent).toBe('TEST \u202Eyb dedivorP');
    expect(isolate?.hasAttribute('dir')).toBe(false);
    const badge = element.querySelector('[data-copy-kind="badge"]');
    expect(badge?.textContent).toBe('Provided by you');
    expect(isolate?.contains(badge as Node)).toBe(false);
    const label = container.querySelector('.sov-field-value__label');
    expect(label?.contains(isolate as Node)).toBe(false);
  });
});

describe('F-QUESTION-02 · F-REVIEW-03 · US-REVIEW-05 · US-REVIEW-07: the owner acts on a value through its served actions', () => {
  test('US-REVIEW-05 · F-QUESTION-02 · rule 5: a confirmation shows its served wording, then Yes and Edit; each hands back its served action', () => {
    const onAction = vi.fn();
    const { container } = render(<Value display={BUILDING_TYPE} onAction={onAction} actionLabels={LABELS} />);
    const element = valueElement(container, BUILDING_TYPE);
    expect(within(element).getByText('TEST 123 guest rooms suggest a TEST hotel. Is this right?')).toBeTruthy();
    fireEvent.click(within(element).getByRole('button', { name: 'TEST yes' }));
    fireEvent.click(within(element).getByRole('button', { name: 'TEST edit' }));
    expect(onAction.mock.calls.map(([action]) => (action as { kind: string }).kind)).toEqual(['confirm', 'edit']);
  });

  test('G3-3 · rule 3: an engineer item offers "Looks right" and "Something\'s wrong", never a confirmation', () => {
    const onAction = vi.fn();
    render(<Value display={ENGINEER_ITEM} onAction={onAction} actionLabels={LABELS} />);
    fireEvent.click(screen.getByRole('button', { name: 'TEST looks right' }));
    fireEvent.click(screen.getByRole('button', { name: 'TEST something wrong' }));
    expect(onAction.mock.calls.map(([action]) => (action as { kind: string }).kind)).toEqual(['acknowledge', 'concern']);
    expect(screen.queryByRole('button', { name: 'TEST yes' })).toBeNull();
    expect(screen.getByText('Provisional: depends on TEST 12 equipment items not yet checked').getAttribute('data-copy-kind')).toBe('status-line');
  });

  test('US-REVIEW-01: without onAction the value is read-only and shows no control', () => {
    render(<Value display={BUILDING_TYPE} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  test('US-REVIEW-01: onAction without the fixed labels is refused', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Value display={BUILDING_TYPE} onAction={vi.fn()} />)).toThrow(/actionLabels/u);
    quiet.mockRestore();
  });

  test('R-043 · prompt 3 section 11 (keyboard): every action is a real button, reachable by Tab', () => {
    render(<Value display={BUILDING_TYPE} onAction={vi.fn()} actionLabels={LABELS} />);
    for (const button of screen.getAllByRole('button')) {
      expect(button.tagName).toBe('BUTTON');
      expect(button.getAttribute('tabindex')).toBeNull();
      expect(button.hasAttribute('disabled')).toBe(false);
    }
  });
});

describe('US-REVIEW-01 · 2.8 "Reserved terms" · rule 1: evidence excerpts on demand, marked as verbatim document text', () => {
  test('US-REVIEW-01 · G2-8: the excerpt sits in a disclosure beside the value element, bound to the same id, marked with its document id and content hash, only when the app asks for it', () => {
    const { container, unmount } = render(<Value display={AREA} />);
    expect(container.querySelector('blockquote')).toBeNull();
    unmount();
    const shown = render(<Value display={AREA} evidenceLabel="TEST excerpt" />);
    const quote = shown.container.querySelector('blockquote');
    expect(quote?.getAttribute('data-copy-kind')).toBe('evidence-excerpt');
    expect(quote?.getAttribute('data-document-id')).toBe(displays.TEST_DOCUMENT);
    expect(quote?.getAttribute('data-content-hash')).toBe(displays.TEST_HASH);
    expect(quote?.textContent).toBe('Scd TEST 12.345 mp');
    expect(quote?.getAttribute('data-value-id')).toBe(AREA.valueId);
    expect(valueElement(shown.container, AREA).contains(quote as Node)).toBe(false);
    expect(shown.container.querySelector('details summary')?.textContent).toBe('TEST excerpt');
  });
});

describe('ADR 0039 decision 11 · phase 3 carried item · rule 7: one request per press on a value\'s actions', () => {
  test('ADR 0039 decision 11: while a write is on its way, every action button says aria-busy and a press sends nothing; none is disabled', () => {
    const onAction = vi.fn();
    const { rerender } = render(<Value display={BUILDING_TYPE} onAction={onAction} actionLabels={LABELS} busy />);
    for (const button of screen.getAllByRole('button')) {
      expect(button.getAttribute('aria-busy')).toBe('true');
      expect(button.hasAttribute('disabled')).toBe(false);
      expect(button.getAttribute('tabindex')).toBeNull();
    }
    fireEvent.click(screen.getByRole('button', { name: 'TEST yes' }));
    fireEvent.click(screen.getByRole('button', { name: 'TEST edit' }));
    expect(onAction).not.toHaveBeenCalled();
    rerender(<Value display={BUILDING_TYPE} onAction={onAction} actionLabels={LABELS} busy={false} />);
    for (const button of screen.getAllByRole('button')) expect(button.getAttribute('aria-busy')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: 'TEST yes' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  test('G3-3 · ADR 0039 decision 11: an engineer item\'s "Looks right" and "Something\'s wrong" and an output\'s Add take the same guard', () => {
    const onAction = vi.fn();
    render(
      <>
        <Value display={ENGINEER_ITEM} onAction={onAction} actionLabels={LABELS} busy />
        <Value display={OUTPUT_MISSING_INPUT} onAction={onAction} actionLabels={LABELS} busy />
      </>,
    );
    for (const name of ['TEST looks right', 'TEST something wrong', 'Add TEST gross floor area']) {
      const button = screen.getByRole('button', { name });
      expect(button.getAttribute('aria-busy'), name).toBe('true');
      fireEvent.click(button);
    }
    expect(onAction).not.toHaveBeenCalled();
  });

  test('G2-7: the busy state changes only the buttons: the value element shows the same text, badge and lines', () => {
    const shown = [false, true].map((busy) => {
      const { container, unmount } = render(<Value display={AREA} busy={busy} />);
      const html = valueElement(container, AREA).outerHTML;
      unmount();
      return html;
    });
    expect(new Set(shown).size).toBe(1);
  });
});
