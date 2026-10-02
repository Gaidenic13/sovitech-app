import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { DisplayObjectSchema, type DisplayObject } from '@sovitech/view-model/browser';
import { ModelArea } from './ModelArea';
import { ActiveFilters, SelectionList } from './SelectionList';
import { AREA, DECIMAL_TAG, FILE_NAME, MODEL_MISSING, NUMERIC_TAG, PROJECT_NAME, TEST_PROJECT, UNKNOWN } from './test-displays';
import { ValueName } from './ValueName';

afterEach(cleanup);

function quietly(run: () => void): void {
  const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  try {
    run();
  } finally {
    quiet.mockRestore();
  }
}

describe('R-080 · US-MODEL-05 AC2 · prompt 3 5.2 "No IFC uploaded" · the owner\'s answer of 2026-10-02: the model area draws no model', () => {
  const NO_MODEL_LINE = { id: 'not_available_yet_named', kind: 'rule_line', text: 'Not available yet: TEST IFC model of the building' } as const;
  const STORED_LINE = { id: 'not_analysed', kind: 'status_line', text: 'Not analysed: IFC model stored, not analysed' } as const;

  test('US-MODEL-05 AC2 · R-080: no model stored: a region named by its heading says what is missing and offers the action; no canvas, image, video or drawing larger than an icon', () => {
    const onPress = vi.fn();
    const { container } = render(<ModelArea heading="TEST building model" state="no_model" status={{ line: NO_MODEL_LINE }} action={{ label: 'TEST upload a document', onPress }} />);
    const region = screen.getByRole('region', { name: 'TEST building model' });
    expect(region.getAttribute('data-model-state')).toBe('no_model');
    expect(within(region).getByText('Not available yet: TEST IFC model of the building')).toBeTruthy();
    fireEvent.click(within(region).getByRole('button', { name: 'TEST upload a document' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(container.querySelector('canvas, img, video, object, embed, iframe, image')).toBeNull();
    for (const svg of container.querySelectorAll('svg')) {
      expect(['16', '24', '32']).toContain(svg.getAttribute('width'));
      expect(svg.getAttribute('aria-hidden')).toBe('true');
    }
    expect(container.querySelector('[role="img"], [data-render-unreadable]')).toBeNull();
  });

  test('G12-1 · G12-5: a model stored shows its 2.8 line, marked as a status line, and still no drawing', () => {
    const { container } = render(<ModelArea heading="TEST building model" state="model_stored" status={{ line: STORED_LINE }} size="panel" />);
    expect(screen.getByText('Not analysed: IFC model stored, not analysed').getAttribute('data-copy-kind')).toBe('status-line');
    expect(container.querySelector('.sov-model-area')?.getAttribute('data-size')).toBe('panel');
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('rule 7 ("Not available yet never appears alone"): a served "Not available yet" display is bound and named; a bare line naming nothing is refused', () => {
    const { container } = render(<ModelArea heading="TEST building model" state="no_model" status={{ display: MODEL_MISSING }} />);
    expect(container.querySelector(`[data-value-id="${MODEL_MISSING.valueId}"]`)?.textContent).toContain('Not available yet: TEST IFC model of the building');
    cleanup();
    quietly(() => {
      expect(() => render(<ModelArea heading="TEST building model" state="no_model" status={{ line: { id: 'not_available_yet', kind: 'rule_line', text: 'Not available yet' } }} />)).toThrow(/names nothing/u);
    });
  });
});

describe('prompt 3 section 11 and section 8: a list equivalent for what a view would let the owner select', () => {
  const OPTIONS = [
    { id: 'below_ground_1', content: 'TEST basement' },
    { id: 'ground_1', content: 'TEST ground floor' },
    { id: 'upper_1', content: 'TEST first floor' },
  ];

  test('R-077 · WAI-ARIA listbox: one tab stop on the chosen option; Down, Up, Home and End move the focus without choosing; Enter and Space choose', () => {
    const onSelect = vi.fn();
    render(<SelectionList label="TEST floors" options={OPTIONS} selected="ground_1" onSelect={onSelect} />);
    const list = screen.getByRole('listbox', { name: 'TEST floors' });
    const options = within(list).getAllByRole('option');
    expect(options.map((option) => option.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
    expect(options.map((option) => option.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
    fireEvent.keyDown(options[1] as HTMLElement, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(options[2]);
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.keyDown(options[2] as HTMLElement, { key: 'Home' });
    expect(document.activeElement).toBe(options[0]);
    fireEvent.keyDown(options[0] as HTMLElement, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(options[0]);
    fireEvent.keyDown(options[0] as HTMLElement, { key: 'End' });
    expect(document.activeElement).toBe(options[2]);
    fireEvent.keyDown(options[2] as HTMLElement, { key: 'Enter' });
    expect(onSelect).toHaveBeenLastCalledWith('upper_1');
    fireEvent.keyDown(options[2] as HTMLElement, { key: ' ' });
    expect(onSelect).toHaveBeenCalledTimes(2);
    fireEvent.click(options[0] as HTMLElement);
    expect(onSelect).toHaveBeenLastCalledWith('below_ground_1');
  });

  test('prompt 3 section 11 ("never colour alone"): the chosen option shows a check beside its words; with nothing chosen the first option takes the tab stop', () => {
    const { container, rerender } = render(<SelectionList label="TEST floors" options={OPTIONS} selected="upper_1" onSelect={vi.fn()} />);
    const marks = [...container.querySelectorAll('.sov-selection-list__mark')].map((mark) => mark.querySelector('svg') !== null);
    expect(marks).toEqual([false, false, true]);
    rerender(<SelectionList label="TEST floors" options={OPTIONS} selected={null} onSelect={vi.fn()} />);
    expect(screen.getAllByRole('option').map((option) => option.getAttribute('tabindex'))).toEqual(['-1', '-1', '0']);
    cleanup();
    render(<SelectionList label="TEST floors" options={OPTIONS} selected={null} onSelect={vi.fn()} />);
    expect(screen.getAllByRole('option').map((option) => option.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
  });
});

describe('R-066 · US-DOCS-15 AC4: the active filters', () => {
  test('R-066: each active filter shows its name and value with a remove button described by them; nothing shows with none; Clear with two or more', () => {
    const onRemove = vi.fn();
    const onClear = vi.fn();
    const { container, rerender } = render(<ActiveFilters label="TEST active filters" filters={[]} removeLabel="TEST remove this filter" onRemove={onRemove} />);
    expect(container.innerHTML).toBe('');
    rerender(
      <ActiveFilters
        label="TEST active filters"
        filters={[
          { id: 'system', name: 'TEST system', value: 'TEST HVAC' },
          { id: 'level', name: 'TEST floor', value: <ValueName display={FILE_NAME} /> },
        ]}
        removeLabel="TEST remove this filter"
        onRemove={onRemove}
        clearLabel="TEST clear filters"
        onClear={onClear}
      />,
    );
    const list = screen.getByRole('list', { name: 'TEST active filters' });
    const removes = within(list).getAllByRole('button', { name: 'TEST remove this filter' });
    expect(document.getElementById(removes[0]?.getAttribute('aria-describedby') ?? '')?.textContent).toBe('TEST system TEST HVAC');
    fireEvent.click(removes[1] as HTMLElement);
    expect(onRemove).toHaveBeenCalledWith('level');
    fireEvent.click(screen.getByRole('button', { name: 'TEST clear filters' }));
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(list.querySelector(`[data-value-id="${FILE_NAME.valueId}"]`)?.textContent).toBe('TEST-plan-12.pdf');
  });
});

describe('G2-1 · A-8 · G2-13 · rule 2: a name inside a control or a heading', () => {
  test('G2-1 · A-8: phrasing content bound to its value id, the text isolated in a <bdi>, then its one badge; a missing name reads its wording once, as its badge', () => {
    const { container, rerender } = render(
      <button type="button">
        <ValueName display={PROJECT_NAME} />
      </button>,
    );
    const name = container.querySelector(`[data-value-id="${PROJECT_NAME.valueId}"]`);
    expect(name?.tagName).toBe('SPAN');
    expect(name?.querySelector('bdi')?.textContent).toBe('TEST project 12');
    expect(name?.querySelector('[data-copy-kind="badge"]')?.textContent).toBe('Provided by you');
    expect(name?.querySelector('div, p')).toBeNull();
    rerender(<ValueName display={PROJECT_NAME} showBadge={false} />);
    expect(container.querySelector('[data-copy-kind="badge"]')).toBeNull();
    rerender(<ValueName display={UNKNOWN} showBadge={false} />);
    expect(container.textContent).toBe('Unknown');
    expect(container.querySelectorAll('[data-copy-kind="badge"]')).toHaveLength(1);
  });

  test('A-1 · rules 2 and 9 · rule 7: a numeric display never throws; it renders through the value element in its phrasing form, with its badge and its lines (a unit, a range)', () => {
    const range: DisplayObject = { ...AREA, valueId: `building:${TEST_PROJECT}.rangeTest`, shape: 'range', text: 'TEST 43 to TEST 47', parts: ['TEST 43', 'TEST 47'], measure: { label: 'TEST count' } };
    expect(DisplayObjectSchema.safeParse(range).success).toBe(true);
    for (const display of [AREA, range]) {
      cleanup();
      const { container } = render(<ValueName display={display} showBadge={false} />);
      const bound = container.querySelector(`[data-value-id="${display.valueId}"]`);
      expect(bound?.classList.contains('sov-value'), display.valueId).toBe(true);
      expect(bound?.getAttribute('data-numeric')).toBe('true');
      expect(bound?.querySelector('bdi.sov-value__text')?.textContent).toBe(display.text);
      expect(bound?.querySelector('[data-copy-kind="badge"]')?.textContent).toBe(display.badge?.label);
      expect(bound?.querySelector('.sov-value__source')?.textContent).toBe(display.sourceLine?.text);
      // Phrasing content only, and no action control (the value's actions show where the value itself is shown).
      expect(container.querySelector('div, p, button')).toBeNull();
    }
  });
});

describe('A-1 · rule 7 (never a dead end) · rules 2 and 9: a tag written as a number, in a heading, a button and an option', () => {
  /** Where the numeric name sits: the element bound to it, its text, its badge, and no block element inside the host. */
  function expectDelegated(host: Element | null, display: DisplayObject): void {
    expect(host).not.toBeNull();
    const name = host?.querySelector('.sov-value-name');
    expect(name?.getAttribute('data-delegated')).toBe('value');
    const bound = host?.querySelectorAll(`[data-value-id="${display.valueId}"]`);
    expect(bound).toHaveLength(1);
    const element = bound?.[0];
    expect(element?.tagName).toBe('SPAN');
    expect(element?.getAttribute('data-phrasing')).toBe('true');
    expect(element?.querySelector('bdi')?.textContent).toBe(display.text);
    expect(element?.querySelectorAll('[data-copy-kind="badge"]')).toHaveLength(1);
    expect(element?.querySelector('[data-copy-kind="badge"]')?.textContent).toBe(display.badge?.label);
    expect(host?.querySelector('div, p, section, ul, ol, table, button button, a a')).toBeNull();
  }

  for (const display of [NUMERIC_TAG, DECIMAL_TAG]) {
    test(`A-1: "${display.text}" as the page heading: no throw, the heading stands with its badge${display.sourceLine === undefined ? '' : ' and its source line'}`, () => {
      expect(DisplayObjectSchema.safeParse(display).success).toBe(true);
      expect(() =>
        render(
          <h1>
            <ValueName display={display} />
          </h1>,
        ),
      ).not.toThrow();
      const heading = screen.getByRole('heading', { level: 1 });
      expectDelegated(heading, display);
      expect(heading.textContent).toContain(display.text);
      if (display.sourceLine !== undefined) expect(heading.querySelector('span.sov-value__source')?.textContent).toBe(display.sourceLine.text);
    });

    test(`A-1: "${display.text}" inside a button (the inspector's subheading, a filter's value): no throw, the badge shown even with showBadge false`, () => {
      render(
        <button type="button">
          <ValueName display={display} showBadge={false} />
        </button>,
      );
      expectDelegated(screen.getByRole('button'), display);
    });

    test(`A-1: "${display.text}" as a listbox option's content: no throw, the option named by its text and badge`, () => {
      render(<SelectionList label="TEST tags" options={[{ id: 'tag', content: <ValueName display={display} showBadge={false} /> }]} selected="tag" onSelect={vi.fn()} />);
      const option = screen.getByRole('option');
      expectDelegated(option, display);
      expect(option.textContent).toContain(`${display.text}${display.badge?.label ?? ''}`);
    });
  }
});
