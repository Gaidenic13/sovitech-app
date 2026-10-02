/**
 * The view filters of the register pages (DB-16's, DB-08's and DB-17's "All Floors" and "All Systems", DB-20's floor
 * and system dropdowns; PRD R-052, R-066, R-071, R-077; US-TOPO-01 AC8, AC9; US-ZONES-02 AC2, AC4; US-SCOPE-05 AC11):
 * a filter changes what the page shows and writes nothing (rule 3). System Scope, Topology, Zones and Equipment share
 * them, so one shared floor selection is drawn one way on every page (dashboards-spec 2.5 rule 6; ADR 0043 decision 6;
 * DR-5): each page puts them in its PageHeader's actions slot in the fixed order of dashboards-spec 3.5, the floor
 * first, then the system. They live here, beside Topology, because no page builder owns a shared folder.
 *
 * - `ViewFilter`: a disclosure, never a dialog: a button naming the filter and its current choice opens a list
 *   (the kit's `SelectionList`, a listbox: Up, Down, Home, End, then Enter or Space) under it. Choosing closes it
 *   and returns the focus to the button; Escape, Tab out of it or a press outside closes it too. Its options hold
 *   bound names (a level's generated label through `ValueName`), so it cannot be a native `<select>`, whose
 *   options cannot carry a value id (the render test reads a digit outside a bound element as a bare number).
 * - `FloorFilter`: the floor filter over the level register as served (R-077):
 *   - **known**: the dropdown with "All floors", the levels in building order by their generated labels (bound), and
 *     the level types no source states named once under the list (rule 8: "Parts with no source are Unknown");
 *   - **unknown** (no floor structure known): the same slot holds the served "Not available yet: floor structure"
 *     with the owner's actions to upload a document and to enter the floors (rule 7: "'Not available yet' never
 *     appears alone"; G7-14), no list;
 *   - **conflict** (the floor field is in conflict): the served "Not available yet: two values for floors", the floors
 *     field's own display through the Value component (Two values, both readings with their sources and, where the
 *     conflict is routed to SOVITECH, rule 4's "Documents disagree on this. A SOVITECH engineer will check it."), and
 *     the actions the API served (rule 4, "Until a conflict is resolved": "with the action to resolve it"; G7-16);
 *     no list is built from either value (rule 4: "It never runs on one of the values").
 *   Every action is an `ActionLink`, underlined (ADR 0040 decision 6, DR-24).
 * - `useHeldLevel`: a floor selection the register does not hold (stale, or no floor structure known) is dropped, so
 *   nothing hides behind a filter the control does not show.
 * - `SystemFilter`: the catalogue's titles (fixed copy, no count: R-017's reading), plus "All systems".
 * - `ActionLink`: a link to a built page (an owner action beside a "Not available yet" line, "View in System
 *   Scope", "View Equipment in Zone"), drawn as the kit's link button (mint text, underlined).
 *
 * Undesigned states (the open filter, the floor notice), per the frontend-design skill within the brand: the
 * dropdown is the secondary button's hairline with the filter's name in tertiary text before its choice; the
 * list opens on the raised surface with a hairline, no shadow (App theme); the notice keeps the dropdown's hairline
 * and its name, with the line, the field's readings and the actions stacked beside it.
 */
import { ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { NotAvailableYet, SelectionList, StatusLine, Value, ValueName, type SelectionOption } from '@sovitech/ui';
import type { DisplayObject, LevelRegister } from '@sovitech/view-model/browser';
import { copy } from '../../../copy';
import type { Displays } from '../../../wizard/use-step-view';
import { workspaceActionPath } from '../../navigation';
import { systemTitle } from '../system-scope/systems';

/** The option id of "All floors" or "All systems" (a level key and a system id never take this form). */
export const ALL_OPTION = '__all__';

/** The search parameter that holds Topology's and Zones' system filter (a catalogue system id): a view state that writes nothing. */
export const SYSTEM_PARAM = 'system';

const SYSTEM_ID = /^[a-z][a-z_]*$/u;

/** The page's system filter, kept in the `system` search parameter (a malformed one is ignored, never sent). */
export function useSystemSelection(): readonly [string | undefined, (system: string | undefined) => void] {
  const [search, setSearch] = useSearchParams();
  const raw = search.get(SYSTEM_PARAM);
  const system = raw !== null && SYSTEM_ID.test(raw) ? raw : undefined;
  const setSystem = useCallback(
    (next: string | undefined) => {
      setSearch(
        (previous) => {
          const params = new URLSearchParams(previous);
          if (next === undefined) params.delete(SYSTEM_PARAM);
          else params.set(SYSTEM_PARAM, next);
          return params;
        },
        { replace: true },
      );
    },
    [setSearch],
  );
  return [system, setSystem] as const;
}

/** Whether the level register holds the level key (only a known register holds any). */
export function levelHeld(levels: LevelRegister | undefined, level: string | undefined): boolean {
  return level !== undefined && levels?.state === 'known' && levels.levels.some((option) => option.key === level);
}

/**
 * Drops a floor selection the served register does not hold (a stale link, or no floor structure known), once the
 * register is in: the shown filter and the query never disagree. `drop` must keep its identity between renders.
 */
export function useHeldLevel(levels: LevelRegister | undefined, level: string | undefined, drop: () => void): void {
  useEffect(() => {
    if (levels === undefined || level === undefined) return;
    if (!levelHeld(levels, level)) drop();
  }, [levels, level, drop]);
}

export const LINK_CLASS =
  'inline-flex items-center gap-1.5 text-[14px] font-medium text-(--sov-accent) underline decoration-1 underline-offset-4 transition-colors duration-150 hover:text-(--sov-text-primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--sov-focus-ring)';

/** A link to a built page, drawn as the kit's link button. */
export function ActionLink({ to, children, describedBy }: { readonly to: string; readonly children: ReactNode; readonly describedBy?: string }) {
  return (
    <Link to={to} className={LINK_CLASS} aria-describedby={describedBy} data-copy-kind="action-label">
      {children}
    </Link>
  );
}

export interface ViewFilterProps {
  /** What the filter is ("Floor", "System"): catalogue copy. */
  readonly name: string;
  /** The current choice as shown in the button: catalogue copy ("All floors") or a bound name. */
  readonly current: ReactNode;
  readonly options: readonly SelectionOption[];
  /** The chosen option's id (`ALL_OPTION` for none). */
  readonly selected: string;
  readonly onSelect: (id: string) => void;
  /** A line under the list (the level types no source states). */
  readonly note?: ReactNode;
}

export function ViewFilter({ name, current, options, selected, onSelect, note }: ViewFilterProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const container = useRef<HTMLDivElement | null>(null);
  const button = useRef<HTMLButtonElement | null>(null);

  // Opening moves the focus into the list, on the chosen option (the listbox keeps one tab stop).
  useEffect(() => {
    if (!open) return;
    container.current?.querySelector<HTMLElement>('[role="option"][tabindex="0"]')?.focus();
  }, [open]);

  // A press outside closes the list; it never blocks the page behind it.
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (event.target instanceof Node && container.current?.contains(event.target) !== true) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  const close = () => {
    setOpen(false);
    button.current?.focus();
  };

  return (
    <div
      ref={container}
      className="relative"
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !open) return;
        event.preventDefault();
        close();
      }}
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (open && next instanceof Node && !event.currentTarget.contains(next)) setOpen(false);
      }}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((previous) => !previous)}
        className="flex h-10 max-w-[280px] items-center gap-2 rounded-(--sov-radius-control) border border-(--sov-secondary-border) px-3 text-left text-[14px] text-(--sov-text-primary) transition-colors duration-300 hover:border-(--sov-border-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--sov-focus-ring)"
      >
        <span className="shrink-0 text-(--sov-text-tertiary)">{name}</span>
        <span className="min-w-0 break-words">{current}</span>
        <ChevronDown size={16} strokeWidth={1.5} aria-hidden="true" focusable="false" className="shrink-0 text-(--sov-text-tertiary)" />
      </button>
      {open ? (
        <div
          id={panelId}
          role="group"
          aria-label={name}
          className="absolute top-full right-0 z-20 mt-1 flex w-[260px] flex-col gap-2 rounded-(--sov-radius-surface) border border-(--sov-border) bg-(--sov-surface) p-2"
        >
          <SelectionList
            label={name}
            options={options}
            selected={selected}
            onSelect={(id) => {
              onSelect(id);
              close();
            }}
          />
          {note === undefined ? null : <div className="border-t border-(--sov-border) px-2 pt-2">{note}</div>}
        </div>
      ) : null}
    </div>
  );
}

/** A level's generated label (bound, no badge: the same display shows with its badge where the floors are listed), or null. */
function levelName(display: DisplayObject | undefined): ReactNode {
  return display === undefined ? null : <ValueName display={display} showBadge={false} />;
}

/** The chosen level's label, for a button or a chip (bound), or "All floors" when the register does not hold it. */
export function ChosenFloor({ levels, displays, level }: { readonly levels: LevelRegister | undefined; readonly displays: Displays; readonly level: string | undefined }) {
  const option = levels?.state === 'known' ? levels.levels.find((entry) => entry.key === level) : undefined;
  const label = option === undefined ? null : levelName(displays.get(option.label));
  return label === null ? <>{copy.workspace.levels.allFloors}</> : <>{label}</>;
}

export interface FloorFilterProps {
  readonly projectId: string;
  /** The level register as served (the frame's, or the page's own view's); undefined while it loads. */
  readonly levels: LevelRegister | undefined;
  /** The displays that hold the register's labels, lines and the floors field. */
  readonly displays: Displays;
  /** The shared floor selection (a level key), or undefined for all floors. */
  readonly level: string | undefined;
  /** Chooses a floor (undefined: all floors). It changes the view only; nothing is written. */
  readonly onChange: (level: string | undefined) => void;
}

/** The one floor filter of the register pages (see the header): the dropdown, or the register's served line with its actions. */
export function FloorFilter({ projectId, levels, displays, level, onChange }: FloorFilterProps) {
  const labelId = useId();
  if (levels === undefined) return null;
  const name = copy.workspace.levels.label;
  if (levels.state === 'known') {
    const chosen = levels.levels.find((option) => option.key === level);
    const unstated = levels.unstated === null ? undefined : displays.get(levels.unstated);
    return (
      <div data-floor-filter="known">
        <ViewFilter
          name={name}
          current={<ChosenFloor levels={levels} displays={displays} level={chosen?.key} />}
          options={[{ id: ALL_OPTION, content: copy.workspace.levels.allFloors }, ...levels.levels.map((option) => ({ id: option.key, content: levelName(displays.get(option.label)) }))]}
          selected={chosen?.key ?? ALL_OPTION}
          onSelect={(id) => onChange(id === ALL_OPTION ? undefined : id)}
          {...(unstated === undefined ? {} : { note: <Value display={unstated} layout="bare" /> })}
        />
      </div>
    );
  }
  const line = displays.get(levels.line);
  const field = levels.state === 'conflict' ? displays.get(levels.field) : undefined;
  return (
    <div
      role="group"
      aria-labelledby={labelId}
      data-floor-filter={levels.state}
      className="grid max-w-[460px] grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2 rounded-(--sov-radius-control) border border-(--sov-secondary-border) px-3 py-2.5 text-[14px]"
    >
      <span id={labelId} className="leading-5 text-(--sov-text-tertiary)">
        {name}
      </span>
      <div className="flex min-w-0 flex-col items-start gap-2">
        {line === undefined ? null : line.missing === 'not_available_yet' ? <NotAvailableYet display={line} /> : <StatusLine display={line} />}
        {field === undefined ? null : <Value display={field} layout="bare" />}
        {levels.actions.length === 0 ? null : (
          <span className="flex flex-wrap items-center gap-x-5 gap-y-1">
            {levels.actions.map((action) => (
              <ActionLink key={action} to={workspaceActionPath(projectId, action)}>
                {copy.workspace.actions[action]}
              </ActionLink>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}

export interface SystemFilterProps {
  /** The systems to choose from, in the catalogue's order. */
  readonly systems: readonly string[];
  readonly name: string;
  readonly allLabel: string;
  /** The chosen system's id, or undefined for all systems. */
  readonly system: string | undefined;
  readonly onChange: (system: string | undefined) => void;
}

/** The system filter: the catalogue's titles (fixed copy, no count: R-017's reading), plus "All systems". */
export function SystemFilter({ systems, name, allLabel, system, onChange }: SystemFilterProps) {
  const chosen = system !== undefined && systems.includes(system) ? system : undefined;
  return (
    <ViewFilter
      name={name}
      current={chosen === undefined ? allLabel : systemTitle(chosen)}
      options={[
        { id: ALL_OPTION, content: allLabel },
        ...systems.map((systemId) => ({
          id: systemId,
          content: systemTitle(systemId),
        })),
      ]}
      selected={chosen ?? ALL_OPTION}
      onSelect={(id) => onChange(id === ALL_OPTION ? undefined : id)}
    />
  );
}
