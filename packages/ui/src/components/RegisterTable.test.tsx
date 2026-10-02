import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { DisplayObject } from '@sovitech/view-model/browser';
import { RegisterTable, type RegisterColumn, type RegisterTableProps } from './RegisterTable';
import { TAG_A, TAG_B, TEST_ASSET_A, TEST_ASSET_B, TYPE_A, TYPE_B } from './test-displays';
import { MenuButton } from './workspace';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/**
 * A ResizeObserver the test drives: the register measures its region when the observer reports (it reports
 * once when it starts, then on each change of size), so a test sets the sizes and calls `report()`.
 */
class TestResizeObserver {
  static last: TestResizeObserver | undefined;
  readonly observed: Element[] = [];
  constructor(private readonly callback: ResizeObserverCallback) {
    TestResizeObserver.last = this;
  }
  observe(target: Element): void {
    this.observed.push(target);
  }
  unobserve(): void {}
  disconnect(): void {
    this.observed.length = 0;
  }
  report(): void {
    act(() => this.callback([], this as unknown as ResizeObserver));
  }
}

function observeResizes(): () => TestResizeObserver {
  vi.stubGlobal('ResizeObserver', TestResizeObserver);
  return () => {
    const observer = TestResizeObserver.last;
    if (observer === undefined) throw new Error('the register made no ResizeObserver');
    return observer;
  };
}

/** Sets an element's scroll and client widths, which happy-dom does not lay out. */
function setWidths(element: HTMLElement, scrollWidth: number, clientWidth: number): void {
  Object.defineProperty(element, 'scrollWidth', { configurable: true, get: () => scrollWidth });
  Object.defineProperty(element, 'clientWidth', { configurable: true, get: () => clientWidth });
}

/** Sets an element's laid-out width. */
function setBoxWidth(element: Element | null, width: number): void {
  if (element === null) throw new Error('no element to size');
  Object.defineProperty(element, 'getBoundingClientRect', { configurable: true, value: () => ({ x: 0, y: 0, top: 0, left: 0, right: width, bottom: 20, width, height: 20, toJSON: () => ({}) }) });
}

interface TestRow {
  readonly assetId: string;
  readonly tag: DisplayObject;
  readonly type: DisplayObject;
}

const ROWS: readonly TestRow[] = [
  { assetId: TEST_ASSET_A, tag: TAG_A, type: TYPE_A },
  { assetId: TEST_ASSET_B, tag: TAG_B, type: TYPE_B },
];

const COLUMNS: readonly RegisterColumn<TestRow>[] = [
  { kind: 'value', id: 'tag', header: 'TEST tag', value: (row) => row.tag, rowHeader: true },
  { kind: 'value', id: 'type', header: 'TEST type', value: (row) => row.type },
];

function table(props: Partial<RegisterTableProps<TestRow>> = {}) {
  return render(<RegisterTable<TestRow> label="TEST equipment" columns={COLUMNS} rows={ROWS} rowKey={(row) => row.assetId} {...props} />);
}

/** Every text on the table holding a number sits inside an element bound to a value id (G2-1's reading). */
function unboundNumbers(container: HTMLElement): string[] {
  const found: string[] = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const text = (node.textContent ?? '').trim();
    if (/\p{N}/u.test(text) && node.parentElement?.closest('[data-value-id]') === null) found.push(text);
  }
  for (const element of container.querySelectorAll('[aria-label], [title]')) {
    for (const attribute of ['aria-label', 'title']) {
      const value = element.getAttribute(attribute);
      if (value !== null && /\p{N}/u.test(value)) found.push(`${attribute}="${value}"`);
    }
  }
  return found;
}

describe('R-065 · R-066 · prompt 3 section 11 ("Tables have headers"): the register table', () => {
  test('R-066 · G2-1: a captioned table with column headers; the row is named by its header cell; every value cell is bound and shows what it serves', () => {
    const { container } = table();
    const grid = screen.getByRole('table', { name: 'TEST equipment' });
    expect(within(grid).getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['TEST tag', 'TEST type']);
    const rowHeaders = within(grid).getAllByRole('rowheader');
    expect(rowHeaders.map((header) => header.querySelector('.sov-value__text')?.textContent)).toEqual(['TEST-AHU-12', 'TEST-FCU-123']);
    const tag = container.querySelector(`[data-value-id="${TAG_A.valueId}"]`);
    expect(tag?.querySelector('[data-copy-kind="badge"]')?.textContent).toBe('From document');
    expect(tag?.querySelector('.sov-value__source')?.textContent).toBe('Found in TEST Schedule.xlsx, sheet TEST 1');
    expect(unboundNumbers(container)).toEqual([]);
  });

  test('DR-12 · prompt 3 section 11 · WCAG 2.1.1: the table sits in a scroll region named by its caption, a tab stop only while the table is wider than it', () => {
    const observer = observeResizes();
    table();
    const region = screen.getByRole('region', { name: 'TEST equipment' });
    expect(within(region).getByRole('table', { name: 'TEST equipment' })).toBeTruthy();
    expect(observer().observed).toContain(region);
    expect(observer().observed).toContain(region.querySelector('table'));
    // Nothing scrolls: no tab stop (the keyboard passes over the region to the row's controls).
    setWidths(region, 600, 600);
    observer().report();
    expect(region.hasAttribute('tabindex')).toBe(false);
    expect(region.getAttribute('data-scrolls')).toBe('false');
    // Wider than its region (the inspector opened beside it): a tab stop, so the keyboard scrolls it.
    setWidths(region, 852, 812);
    observer().report();
    expect(region.getAttribute('tabindex')).toBe('0');
    expect(region.getAttribute('data-scrolls')).toBe('true');
    // The inspector closed again: no tab stop; the region keeps its name either way.
    setWidths(region, 1184, 1184);
    observer().report();
    expect(region.hasAttribute('tabindex')).toBe(false);
    expect(screen.getByRole('region', { name: 'TEST equipment' })).toBe(region);
  });

  test('DR-12: with no ResizeObserver (a page rendered on a server) the region is named and is no tab stop', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    table();
    expect(screen.getByRole('region', { name: 'TEST equipment' }).hasAttribute('tabindex')).toBe(false);
  });

  test('US-REVIEW-01 AC5 · G1-1: a missing value reads its missing wording once, as its badge, never blank, zero or a dash', () => {
    const { container } = table();
    const type = container.querySelector(`[data-value-id="${TYPE_A.valueId}"]`);
    expect(type?.textContent).toBe('Unknown');
    expect(type?.querySelectorAll('[data-copy-kind="badge"]')).toHaveLength(1);
  });

  test('R-016 · R-017: with no rows, the empty state spans the table under its headers; no count is drawn', () => {
    const { container } = table({ rows: [], empty: <p>TEST no equipment has come from your documents yet.</p>, selection: { selected: new Set(), onToggle: vi.fn(), onToggleAll: vi.fn(), header: 'TEST select', rowLabel: 'TEST select this', allLabel: 'TEST select all' } });
    const cell = container.querySelector('.sov-register__empty');
    expect(cell?.getAttribute('colspan')).toBe('3');
    expect(cell?.textContent).toBe('TEST no equipment has come from your documents yet.');
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(unboundNumbers(container)).toEqual([]);
  });
});

describe('7.1-r2 · 7.1.1-E5 · US-REVIEW-01 AC13 · 2.8 "Prominence": the badge column', () => {
  test('US-REVIEW-01 AC13: the named value\'s one badge moves to its own column on the same row, bound to the same value id; the figure keeps its line and the badge shows once', () => {
    const { container } = table({ badgeColumn: { column: 'type', header: 'TEST badge' } });
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['TEST tag', 'TEST type', 'TEST badge']);
    const row = container.querySelectorAll('tbody tr')[1] as HTMLElement;
    const bound = row.querySelectorAll(`[data-value-id="${TYPE_B.valueId}"]`);
    expect(bound).toHaveLength(2);
    const [figure, badge] = [...bound];
    expect(figure?.querySelector('.sov-value__text')?.textContent).toBe('TEST fan coil unit');
    expect(figure?.querySelector('[data-copy-kind="badge"]')).toBeNull();
    expect(figure?.getAttribute('data-badge-placement')).toBe('apart');
    expect(badge?.textContent).toBe('SOVITECH will check');
    expect(row.querySelectorAll('[data-copy-kind="badge"]')).toHaveLength(2);
    expect([...row.children].map((cell) => cell.tagName)).toEqual(['TH', 'TD', 'TD']);
  });

  test('DR-6 · 2.8 "One badge per value" · rule 1 · G1-1: a missing value whose wording is its badge shows the pill once, in its own cell; the badge cell on its row is empty, hidden and bound to the same value id', () => {
    const { container } = table({ badgeColumn: { column: 'type', header: 'TEST badge' } });
    const row = container.querySelectorAll('tbody tr')[0] as HTMLElement;
    const [figure, badgeSlot] = [...row.querySelectorAll(`[data-value-id="${TYPE_A.valueId}"]`)];
    // The type's own cell: the Unknown pill, as every other missing value on the row shows it; never blank.
    expect(figure?.closest('td')?.classList.contains('sov-register__badge-cell')).toBe(false);
    expect(figure?.querySelector('.sov-value__text')).toBeNull();
    expect(figure?.querySelector('[data-copy-kind="badge"]')?.getAttribute('data-badge')).toBe('unknown');
    expect(figure?.textContent).toBe('Unknown');
    expect(figure?.hasAttribute('data-badge-placement')).toBe(false);
    // The badge column's cell: still there (the table keeps its columns), holding an empty element bound to the same id.
    const badgeCell = row.querySelector('.sov-register__badge-cell');
    expect(badgeCell?.contains(badgeSlot ?? null)).toBe(true);
    expect(badgeSlot?.textContent).toBe('');
    expect(badgeSlot?.getAttribute('aria-hidden')).toBe('true');
    expect(badgeSlot?.getAttribute('data-badge-in-cell')).toBe('true');
    // "Unknown" reads once on the row's type, not "Unknown | Unknown".
    expect(row.querySelectorAll('[data-badge="unknown"]')).toHaveLength(1);
    expect([...row.children].map((cell) => cell.textContent)).toEqual(['TEST-AHU-12From documentFound in TEST Schedule.xlsx, sheet TEST 1', 'Unknown', '']);
  });

  test('DR-6 · 7.1-r2 · 7.1.1-E5: the badge column keeps the real readings, and a missing value whose wording is not its badge keeps its words in its cell and its badge in the column', () => {
    const notYet: DisplayObject = {
      valueId: `asset:${TEST_ASSET_B}.type`,
      kind: 'field',
      text: 'Not available yet: TEST asset taxonomy',
      shape: 'missing',
      missing: 'not_available_yet',
      badge: { id: 'not_available_yet', label: 'Not available yet' },
    };
    const { container, rerender } = table({ badgeColumn: { column: 'type', header: 'TEST badge' } });
    const second = container.querySelectorAll('tbody tr')[1] as HTMLElement;
    expect(second.querySelector('.sov-register__badge-cell [data-copy-kind="badge"]')?.textContent).toBe('SOVITECH will check');
    rerender(<RegisterTable<TestRow> label="TEST equipment" columns={COLUMNS} rows={[{ assetId: TEST_ASSET_B, tag: TAG_B, type: notYet }]} rowKey={(row) => row.assetId} badgeColumn={{ column: 'type', header: 'TEST badge' }} />);
    const row = container.querySelector('tbody tr') as HTMLElement;
    const [figure, badge] = [...row.querySelectorAll(`[data-value-id="${notYet.valueId}"]`)];
    expect(figure?.querySelector('.sov-value__text')?.textContent).toBe('Not available yet: TEST asset taxonomy');
    expect(figure?.querySelector('[data-copy-kind="badge"]')).toBeNull();
    expect(badge?.querySelector('[data-copy-kind="badge"]')?.textContent).toBe('Not available yet');
    expect(badge?.hasAttribute('aria-hidden')).toBe(false);
  });

  test('2.8 "One badge per value": a badge column that names no value column is refused', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => table({ badgeColumn: { column: 'missing', header: 'TEST badge' } })).toThrow(/not a value column/u);
    quiet.mockRestore();
  });
});

describe('R-065 · G3-3 · prompt 3 section 11: selection, the open row and the keyboard', () => {
  const selection = (selected: ReadonlySet<string>, onToggle = vi.fn(), onToggleAll = vi.fn()) => ({
    selected,
    onToggle,
    onToggleAll,
    header: 'TEST select',
    rowLabel: 'TEST select this equipment',
    allLabel: 'TEST select all equipment on this page',
  });

  test('R-065: real checkboxes select rows (each described by its row\'s name); the header checkbox selects the page and shows a part selection', () => {
    const onToggle = vi.fn();
    const onToggleAll = vi.fn();
    table({ selection: selection(new Set([TEST_ASSET_B]), onToggle, onToggleAll) });
    const all = screen.getByRole('checkbox', { name: 'TEST select all equipment on this page' }) as HTMLInputElement;
    expect(all.indeterminate).toBe(true);
    const rows = screen.getAllByRole('checkbox', { name: 'TEST select this equipment' }) as HTMLInputElement[];
    expect(rows.map((box) => box.checked)).toEqual([false, true]);
    const describedBy = rows[0]?.getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(describedBy)?.textContent).toContain('TEST-AHU-12');
    fireEvent.click(rows[0] as HTMLElement);
    expect(onToggle).toHaveBeenCalledWith(TEST_ASSET_A, true);
    fireEvent.click(all);
    expect(onToggleAll).toHaveBeenCalledWith(true);
  });

  test('R-066: the open button and a click on the row open it; a click on a control in the row does not; the open row is aria-current and its button expanded', () => {
    const onOpen = vi.fn();
    const { container } = table({ open: { onOpen, label: 'TEST open details', header: 'TEST details', inspectorId: 'TEST-inspector' }, current: TEST_ASSET_B, selection: selection(new Set()) });
    const buttons = screen.getAllByRole('button', { name: 'TEST open details' });
    expect(buttons.map((button) => button.getAttribute('aria-expanded'))).toEqual(['false', 'true']);
    expect(buttons.map((button) => button.getAttribute('aria-controls'))).toEqual([null, 'TEST-inspector']);
    const rows = container.querySelectorAll('tbody tr');
    expect([...rows].map((row) => row.getAttribute('aria-current'))).toEqual([null, 'true']);
    fireEvent.click(buttons[0] as HTMLElement);
    expect(onOpen).toHaveBeenLastCalledWith(ROWS[0]);
    fireEvent.click(rows[1]?.querySelector('.sov-value__text') as HTMLElement);
    expect(onOpen).toHaveBeenLastCalledWith(ROWS[1]);
    const calls = onOpen.mock.calls.length;
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'TEST select this equipment' })[0] as HTMLElement);
    expect(onOpen).toHaveBeenCalledTimes(calls);
  });

  test('prompt 3 section 11 (keyboard): Down, Up, Home and End move to the same control in another row; every control stays in the tab order', () => {
    table({ open: { onOpen: vi.fn(), label: 'TEST open details', header: 'TEST details' }, selection: selection(new Set()) });
    const boxes = screen.getAllByRole('checkbox', { name: 'TEST select this equipment' });
    const opens = screen.getAllByRole('button', { name: 'TEST open details' });
    for (const control of [...boxes, ...opens]) expect(control.getAttribute('tabindex')).toBeNull();
    (opens[0] as HTMLElement).focus();
    fireEvent.keyDown(opens[0] as HTMLElement, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(opens[1]);
    fireEvent.keyDown(opens[1] as HTMLElement, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(opens[1]);
    fireEvent.keyDown(opens[1] as HTMLElement, { key: 'Home' });
    expect(document.activeElement).toBe(opens[0]);
    (boxes[0] as HTMLElement).focus();
    fireEvent.keyDown(boxes[0] as HTMLElement, { key: 'End' });
    expect(document.activeElement).toBe(boxes[1]);
    fireEvent.keyDown(boxes[1] as HTMLElement, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(boxes[0]);
  });

  test('UD-22: a row\'s menu button keeps its own arrow keys: Down opens its menu, and the table does not move the focus away', () => {
    table({
      rowAction: {
        header: 'TEST actions',
        render: (row) => <MenuButton label="TEST more actions" items={[{ id: 'download', label: `TEST download ${row.assetId === TEST_ASSET_A ? 'a' : 'b'}`, onSelect: vi.fn() }]} />,
      },
    });
    const menus = screen.getAllByRole('button', { name: 'TEST more actions' });
    (menus[0] as HTMLElement).focus();
    fireEvent.keyDown(menus[0] as HTMLElement, { key: 'ArrowDown' });
    expect(screen.getByRole('menu')).toBeTruthy();
    expect(document.activeElement?.textContent).toBe('TEST download a');
  });

  test('R-016 · rule 3: a sortable column is a button in its header with aria-sort; sorting calls back and writes nothing of its own', () => {
    const onSort = vi.fn();
    const sortable: readonly RegisterColumn<TestRow>[] = [{ ...COLUMNS[0], sort: { direction: 'ascending', onSort } } as RegisterColumn<TestRow>, COLUMNS[1] as RegisterColumn<TestRow>];
    table({ columns: sortable });
    const header = screen.getByRole('columnheader', { name: 'TEST tag' });
    expect(header.getAttribute('aria-sort')).toBe('ascending');
    fireEvent.click(within(header).getByRole('button', { name: 'TEST tag' }));
    expect(onSort).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('columnheader', { name: 'TEST type' }).hasAttribute('aria-sort')).toBe(false);
  });

  test('DR-2: the row\'s name and its controls are pinned to the region\'s edges, header cells too; the select and action columns are measured for the offsets', () => {
    const observer = observeResizes();
    const { container, rerender } = table({
      selection: selection(new Set()),
      open: { onOpen: vi.fn(), label: 'TEST show details', header: 'TEST details' },
      rowAction: { header: 'TEST actions', render: () => <MenuButton label="TEST more actions" items={[{ id: 'download', label: 'TEST download', onSelect: vi.fn() }]} /> },
    });
    const region = screen.getByRole('region', { name: 'TEST equipment' });
    expect(region.getAttribute('data-select')).toBe('true');
    expect(region.getAttribute('data-row-action')).toBe('true');
    const pins = (row: Element | null | undefined) => [...(row?.children ?? [])].map((cell) => cell.getAttribute('data-pin'));
    expect(pins(container.querySelector('thead tr'))).toEqual(['select', 'name', null, 'open', 'action']);
    for (const row of container.querySelectorAll('tbody tr')) expect(pins(row)).toEqual(['select', 'name', null, 'open', 'action']);
    expect(screen.getAllByRole('rowheader').every((cell) => cell.getAttribute('data-pin') === 'name')).toBe(true);
    setBoxWidth(container.querySelector('thead [data-pin="select"]'), 46);
    setBoxWidth(container.querySelector('thead [data-pin="action"]'), 56);
    observer().report();
    expect(region.style.getPropertyValue('--sov-register-lead')).toBe('46px');
    expect(region.style.getPropertyValue('--sov-register-trail')).toBe('56px');
    // With no select or action column, the name sits at the start and the open button at the end: no offset is kept.
    rerender(<RegisterTable<TestRow> label="TEST equipment" columns={COLUMNS} rows={ROWS} rowKey={(row) => row.assetId} open={{ onOpen: vi.fn(), label: 'TEST show details', header: 'TEST details' }} />);
    observer().report();
    expect(region.hasAttribute('data-select')).toBe(false);
    expect(region.hasAttribute('data-row-action')).toBe(false);
    expect(region.style.getPropertyValue('--sov-register-lead')).toBe('');
    expect(region.style.getPropertyValue('--sov-register-trail')).toBe('');
    expect(pins(container.querySelector('tbody tr'))).toEqual(['name', null, 'open']);
  });

  test('rule 7: nothing in the register is disabled or a dialog; a refetch says aria-busy and keeps the rows', () => {
    const { container } = table({ busy: true, open: { onOpen: vi.fn(), label: 'TEST open details', header: 'TEST details' }, selection: selection(new Set()) });
    expect(screen.getByRole('table').getAttribute('aria-busy')).toBe('true');
    expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(container.querySelector('[disabled], [role="dialog"], dialog')).toBeNull();
  });
});
