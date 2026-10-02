import { ArrowDown, ArrowUp, Check, ChevronsUpDown, Minus, PanelRightOpen } from 'lucide-react';
import { useEffect, useId, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import type { DisplayObject } from '@sovitech/view-model/browser';
import { Badge } from './Badge';
import { Icon } from './Icon';
import { textIsBadgeOf, ValueElement } from './Value';

/**
 * The register table (phase 4; DB-15 Documents, DB-17 Equipment, DB-20 Zones; dashboards-spec 3.5 "List
 * rows"; 7.1-r2 and 7.1.1-E5: "Dense tables get a badge column"; US-REVIEW-01 AC13: "a badge column, with
 * one badge per value"; prompt 3 section 11: "Tables have headers", "Everything works from the keyboard",
 * "every selectable object has a list equivalent").
 *
 * A native `<table>` with a caption and column headers. Each row may have:
 * - a checkbox for a selection (Equipment's "Looks right" and "Something's wrong" on a selection, R-065):
 *   a real input, with a "select all on this page" checkbox in its header;
 * - an open button, which shows the row in the page's inspector; a click anywhere on the row that is not
 *   on a control does the same;
 * - a trailing action (a menu button, a link to the record).
 * The row the inspector shows is marked `aria-current="true"` and drawn with the sidebar's grammar: a 2px
 * mint edge and a mint 8% fill.
 *
 * Keyboard: Tab reaches every control in reading order (no control is taken out of the tab order). Up and
 * Down move to the same control in the row above or below, Home and End to the first and last row, so a
 * long register is walked without tabbing through every row. Enter or Space on the open button opens the
 * row; Space on the checkbox selects it.
 *
 * Cells: a `value` column renders its display object through the kit's bound value element (text, badge,
 * source and status lines, exactly as served; G2-1); a `content` column renders what the caller gives
 * (a date, an icon, a link). With `badgeColumn`, one value column's badge moves to its own column on the
 * same row, bound to the same value id (rule 2): the value's figure keeps its line, so no cell is blank
 * (rule 1). A missing value whose wording is its badge ("Unknown") shows that pill once, in its own cell,
 * as every other missing value on the row does, and the badge column's cell on that row holds an empty,
 * hidden element bound to the same value id (DR-6; 2.8 "One badge per value"): the badge column keeps
 * the real readings (Likely, Possible, SOVITECH will check, From document). No cell, header or chip holds
 * a count (R-017).
 *
 * Wider than its region (the inspector open beside it), the table scrolls inside a region named by its
 * caption, which is a tab stop only while it scrolls (WCAG 2.1.1; DR-12); the row's name (its header
 * cell) and its controls are pinned to the region's edges, so a row's name and its actions never scroll
 * out of view (DR-2).
 */

export type SortDirection = 'ascending' | 'descending' | 'none';

interface ColumnBase {
  /** A stable key. */
  readonly id: string;
  /** The column's heading: catalogue copy, no number. */
  readonly header: string;
  /** Right-aligned (a column of figures). */
  readonly align?: 'start' | 'end';
  /**
   * A sortable column: its heading is a button that calls `onSort`, and the header cell carries
   * `aria-sort`. Sorting reorders rows only: it writes nothing.
   */
  readonly sort?: { readonly direction: SortDirection; readonly onSort: () => void };
  /** The row's header cell (`<th scope="row">`): the cell that names the row (the file name, the tag). One per table. */
  readonly rowHeader?: boolean;
}

export interface ValueColumn<Row> extends ColumnBase {
  readonly kind: 'value';
  /** The cell's display object, as served. */
  readonly value: (row: Row) => DisplayObject;
}

export interface ContentColumn<Row> extends ColumnBase {
  readonly kind: 'content';
  /** The cell's content: a date in a `<time>`, a bound name, an icon with its words. Never a bare number. */
  readonly cell: (row: Row) => ReactNode;
}

export type RegisterColumn<Row> = ValueColumn<Row> | ContentColumn<Row>;

export interface RegisterSelection {
  /** The keys selected (on this page). */
  readonly selected: ReadonlySet<string>;
  /** Called with a row's key and its new state. */
  readonly onToggle: (key: string, selected: boolean) => void;
  /** Called by the header checkbox with the new state for every row on the page. */
  readonly onToggleAll: (selected: boolean) => void;
  /** The column's hidden heading ("Select"). */
  readonly header: string;
  /** Each row checkbox's name ("Select this equipment"); the row's header cell describes it. */
  readonly rowLabel: string;
  /** The header checkbox's name ("Select all equipment on this page"). */
  readonly allLabel: string;
}

export interface RegisterTableProps<Row> {
  /** The table's caption, read by screen readers ("Project documents"). */
  readonly label: string;
  readonly columns: readonly RegisterColumn<Row>[];
  readonly rows: readonly Row[];
  readonly rowKey: (row: Row) => string;
  /**
   * The badge column: `column` names a value column whose badge shows in its own column, placed right
   * after it, under `header` ("Badge"). On Equipment it is the type's badge (the workspace contract's
   * `EquipmentRow`).
   */
  readonly badgeColumn?: { readonly column: string; readonly header: string };
  readonly selection?: RegisterSelection;
  /**
   * Opens a row in the inspector: the row's open button and a click on the row call it. `label` is the
   * button's name ("Show details", the one name for this control: DR-13); the row's header cell
   * describes it. `inspectorId` ties the buttons to the inspector (`aria-controls`) while it is open.
   */
  readonly open?: { readonly onOpen: (row: Row) => void; readonly label: string; readonly header: string; readonly inspectorId?: string };
  /** The row the inspector shows (`aria-current="true"`). */
  readonly current?: string | null;
  /** A trailing control per row (the "•••" menu, a link to the record), under a hidden heading. */
  readonly rowAction?: { readonly header: string; readonly render: (row: Row) => ReactNode };
  /** What shows in place of rows when there are none: the register's empty state, with its action. */
  readonly empty?: ReactNode;
  /** The rows are being fetched again (`aria-busy` on the table); the rows shown stay until the answer is in. */
  readonly busy?: boolean;
}

const SORT_ICONS = { ascending: ArrowUp, descending: ArrowDown, none: ChevronsUpDown } as const;

/**
 * The control cells of a row (`data-register-cell`: select, open, action), so Up and Down land on the
 * same control in the next row. A key a control uses itself (a menu button opens its menu with Down)
 * is left to it: the control prevents its default, and the table then does nothing.
 */
const CELL_ATTRIBUTE = 'data-register-cell';
const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

function isPlainClickTarget(event: MouseEvent<HTMLTableRowElement>): boolean {
  const target = event.target;
  if (!(target instanceof Element)) return false;
  // A control inside the row takes its own click; the table's scroll region around the row does not count.
  const control = target.closest('a, button, input, select, textarea, label, summary, details, [role="menu"], [tabindex]');
  return control === null || !event.currentTarget.contains(control);
}

function moveBetweenRows(event: KeyboardEvent<HTMLTableSectionElement>): void {
  if (event.defaultPrevented || !['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const cell = target.closest(`[${CELL_ATTRIBUTE}]`);
  const row = target.closest('tr');
  const slot = cell?.getAttribute(CELL_ATTRIBUTE);
  if (slot === null || slot === undefined || row === null) return;
  const rows = [...event.currentTarget.querySelectorAll<HTMLTableRowElement>('tr[data-register-row]')];
  const index = rows.indexOf(row);
  if (index < 0) return;
  const nextIndex = event.key === 'ArrowUp' ? index - 1 : event.key === 'ArrowDown' ? index + 1 : event.key === 'Home' ? 0 : rows.length - 1;
  const next = rows[nextIndex]?.querySelector(`[${CELL_ATTRIBUTE}="${slot}"]`)?.querySelector<HTMLElement>(FOCUSABLE);
  event.preventDefault();
  next?.focus();
}

/**
 * Whether the region scrolls sideways (its table wider than it), and the widths of the pinned select and
 * action columns, kept up to date by a ResizeObserver on the region, the table and those columns' header
 * cells (it reports each once when it starts, then on every change of size). The widths go on the region
 * as custom properties, with no render (ui.css gives each a default for a checkbox and an icon button, so
 * markup rendered on a server pins the same way); the scroll state decides the region's tab stop.
 */
function useRegionLayout(): { readonly attach: (element: HTMLDivElement | null) => void; readonly scrolls: boolean } {
  const [region, setRegion] = useState<HTMLDivElement | null>(null);
  const [scrolls, setScrolls] = useState(false);
  useEffect(() => {
    if (region === null || typeof ResizeObserver === 'undefined') return undefined;
    const pinWidth = (property: string, pin: string) => {
      const cell = region.querySelector(`thead [data-pin="${pin}"]`);
      if (cell === null) region.style.removeProperty(property);
      else region.style.setProperty(property, `${String(cell.getBoundingClientRect().width)}px`);
    };
    const observer = new ResizeObserver(() => {
      setScrolls(region.scrollWidth > region.clientWidth);
      pinWidth('--sov-register-lead', 'select');
      pinWidth('--sov-register-trail', 'action');
    });
    for (const element of [region, ...region.querySelectorAll('table, thead [data-pin="select"], thead [data-pin="action"]')]) observer.observe(element);
    return () => observer.disconnect();
  }, [region]);
  return { attach: setRegion, scrolls };
}

export function RegisterTable<Row>({
  label,
  columns,
  rows,
  rowKey,
  badgeColumn,
  selection,
  open,
  current = null,
  rowAction,
  empty,
  busy = false,
}: RegisterTableProps<Row>) {
  const base = useId();
  const { attach: attachRegion, scrolls } = useRegionLayout();
  const rowHeaderColumn = columns.find((column) => column.rowHeader === true);
  const badgeOf = badgeColumn === undefined ? undefined : columns.find((column) => column.id === badgeColumn.column && column.kind === 'value');
  if (badgeColumn !== undefined && badgeOf === undefined) {
    throw new Error(`RegisterTable: the badge column names "${badgeColumn.column}", which is not a value column.`);
  }
  const span = columns.length + (badgeColumn === undefined ? 0 : 1) + (selection === undefined ? 0 : 1) + (open === undefined ? 0 : 1) + (rowAction === undefined ? 0 : 1);
  const keys = rows.map(rowKey);
  const allSelected = selection !== undefined && keys.length > 0 && keys.every((key) => selection.selected.has(key));
  const someSelected = selection !== undefined && keys.some((key) => selection.selected.has(key));
  const headerCellId = (key: string) => `${base}-row-${key}`;

  const header = (column: RegisterColumn<Row>) => (
    <th
      key={column.id}
      scope="col"
      className="sov-register__head"
      data-align={column.align ?? 'start'}
      data-pin={column.rowHeader === true ? 'name' : undefined}
      aria-sort={column.sort === undefined ? undefined : column.sort.direction}
    >
      {column.sort === undefined ? (
        column.header
      ) : (
        <button type="button" className="sov-register__sort" onClick={column.sort.onSort} data-direction={column.sort.direction}>
          <span>{column.header}</span>
          <Icon icon={SORT_ICONS[column.sort.direction]} size="small" />
        </button>
      )}
    </th>
  );

  const cell = (column: RegisterColumn<Row>, row: Row, key: string) => {
    let content: ReactNode;
    if (column.kind === 'value') {
      const display = column.value(row);
      // The badge column takes this value's badge, unless the value is missing and its wording is its badge:
      // then the pill shows here, once (DR-6).
      const apart = badgeColumn?.column === column.id && !textIsBadgeOf(display);
      content = <ValueElement display={display} badgePlacement={apart ? 'apart' : 'line'} />;
    } else {
      content = column.cell(row);
    }
    if (column.rowHeader === true) {
      return (
        <th key={column.id} scope="row" id={headerCellId(key)} className="sov-register__cell" data-align={column.align ?? 'start'} data-pin="name">
          {content}
        </th>
      );
    }
    return (
      <td key={column.id} className="sov-register__cell" data-align={column.align ?? 'start'}>
        {content}
      </td>
    );
  };

  const badgeCell = (row: Row) => {
    if (badgeOf === undefined || badgeOf.kind !== 'value') return null;
    const display = badgeOf.value(row);
    let content: ReactNode = null;
    if (textIsBadgeOf(display)) {
      // Shown in the value's own cell (DR-6): an empty element bound to the same value id, hidden from assistive technology.
      content = <span className="sov-register__badge" data-value-id={display.valueId} data-badge-in-cell="true" aria-hidden="true" />;
    } else if (display.badge !== undefined) {
      content = (
        <span className="sov-register__badge" data-value-id={display.valueId}>
          <Badge badge={display.badge} />
        </span>
      );
    }
    return (
      <td key={`${badgeOf.id}-badge`} className="sov-register__cell sov-register__badge-cell">
        {content}
      </td>
    );
  };

  return (
    // The scroll region, named by the caption: a tab stop only while the table is wider than it, so a keyboard
    // scrolls it then and passes over it otherwise (WCAG 2.1.1; DR-12).
    <div
      ref={attachRegion}
      className="sov-register"
      role="region"
      aria-labelledby={`${base}-caption`}
      tabIndex={scrolls ? 0 : undefined}
      data-scrolls={scrolls ? 'true' : 'false'}
      data-select={selection === undefined ? undefined : 'true'}
      data-row-action={rowAction === undefined ? undefined : 'true'}
    >
      <table className="sov-register__table" aria-busy={busy ? 'true' : undefined}>
        <caption id={`${base}-caption`} className="sov-visually-hidden">
          {label}
        </caption>
        <thead>
          <tr>
            {selection === undefined ? null : (
              <th scope="col" className="sov-register__head sov-register__control-head" data-pin="select">
                <span className="sov-visually-hidden">{selection.header}</span>
                {rows.length === 0 ? null : (
                  <span className="sov-check" data-type="checkbox">
                    <input
                      className="sov-check__input"
                      type="checkbox"
                      aria-label={selection.allLabel}
                      checked={allSelected}
                      ref={(element) => {
                        if (element !== null) element.indeterminate = someSelected && !allSelected;
                      }}
                      onChange={(event) => selection.onToggleAll(event.currentTarget.checked)}
                    />
                    <Check className="sov-check__mark" size={14} strokeWidth={2.5} aria-hidden="true" focusable="false" />
                    <Minus className="sov-check__partial" size={14} strokeWidth={2.5} aria-hidden="true" focusable="false" />
                  </span>
                )}
              </th>
            )}
            {columns.flatMap((column) => {
              const heads = [header(column)];
              if (badgeColumn?.column === column.id) {
                heads.push(
                  <th key={`${column.id}-badge`} scope="col" className="sov-register__head">
                    {badgeColumn.header}
                  </th>,
                );
              }
              return heads;
            })}
            {open === undefined ? null : (
              <th scope="col" className="sov-register__head sov-register__control-head" data-pin="open">
                <span className="sov-visually-hidden">{open.header}</span>
              </th>
            )}
            {rowAction === undefined ? null : (
              <th scope="col" className="sov-register__head sov-register__control-head" data-pin="action">
                <span className="sov-visually-hidden">{rowAction.header}</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody onKeyDown={moveBetweenRows}>
          {rows.length === 0 ? (
            <tr>
              <td className="sov-register__empty" colSpan={span}>
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const key = rowKey(row);
              const isCurrent = current === key;
              const describedBy = rowHeaderColumn === undefined ? undefined : headerCellId(key);
              return (
                <tr
                  key={key}
                  data-register-row=""
                  className="sov-register__row"
                  aria-current={isCurrent ? 'true' : undefined}
                  onClick={(event) => {
                    if (open !== undefined && isPlainClickTarget(event)) open.onOpen(row);
                  }}
                >
                  {selection === undefined ? null : (
                    <td className="sov-register__cell sov-register__control" data-register-cell="select" data-pin="select">
                      <span className="sov-check" data-type="checkbox">
                        <input
                          className="sov-check__input"
                          type="checkbox"
                          aria-label={selection.rowLabel}
                          aria-describedby={describedBy}
                          checked={selection.selected.has(key)}
                          onChange={(event) => selection.onToggle(key, event.currentTarget.checked)}
                        />
                        <Check className="sov-check__mark" size={14} strokeWidth={2.5} aria-hidden="true" focusable="false" />
                      </span>
                    </td>
                  )}
                  {columns.flatMap((column) => {
                    const cells = [cell(column, row, key)];
                    if (badgeColumn?.column === column.id) {
                      const badge = badgeCell(row);
                      if (badge !== null) cells.push(badge);
                    }
                    return cells;
                  })}
                  {open === undefined ? null : (
                    <td className="sov-register__cell sov-register__control" data-register-cell="open" data-pin="open">
                      <button
                        type="button"
                        className="sov-icon-button"
                        aria-label={open.label}
                        aria-describedby={describedBy}
                        aria-expanded={open.inspectorId === undefined ? undefined : isCurrent}
                        aria-controls={open.inspectorId !== undefined && isCurrent ? open.inspectorId : undefined}
                        onClick={() => open.onOpen(row)}
                      >
                        <Icon icon={PanelRightOpen} size="small" />
                      </button>
                    </td>
                  )}
                  {rowAction === undefined ? null : (
                    <td className="sov-register__cell sov-register__control" data-register-cell="action" data-pin="action">
                      {rowAction.render(row)}
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
