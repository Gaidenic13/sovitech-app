/**
 * Equipment's search and filters (DB-17's table toolbar: "Search equipment", "Filters ⌄"; PRD R-066; US-ASSETS-05
 * AC5, US-ASSETS-11 AC4, AC5; UD-26's Filters menu).
 *
 * - **Search** reads the tag as written (the API normalises it as 2.5 normalises tags); it is sent a moment after the
 *   owner stops typing, never on every key.
 * - **Filters** open as a row under the toolbar (a disclosure, never a dialog, never over the register): System (the
 *   eight catalogue systems), Zone (the zones by their names as written) and Badge (the badges the register's types
 *   carry, with the API's labels). No status filter (US-ASSETS-11 AC5; D14). Each list is a listbox: Up, Down, Home,
 *   End, then Enter or Space; Escape closes the row and returns the focus to its button. The floor is not here: it is
 *   the page header's `FloorFilter`, the one control every register page draws for the shared floor selection (DR-5).
 * - **Each active filter is shown** with its own remove control (the contract's `filters.active`; dashboards-spec 2.5
 *   rule 4: "Context from a link is a filter chip"), the floor's too; "Clear filters" with two or more.
 * - Filters change the view only: nothing is written (R-066). An asset matches only where its own stored value says
 *   so (the API's rule 1 reading), so a filter on a value no asset holds lists none.
 *
 * Undesigned (UD-26's Filters menu), per the frontend-design skill within the brand: one hairline row on the surface
 * colour, one list per filter side by side under its label, the active filters as chips under it.
 */
import { SlidersHorizontal } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ActiveFilters, Badge, SearchField, SelectionList, ValueName, type ActiveFilter } from '@sovitech/ui';
import type { EquipmentQuery, EquipmentResponse } from '@sovitech/view-model/browser';
import { copy } from '../../../copy';
import type { Displays } from '../../../wizard/use-step-view';
import { systemWords } from '../system-scope/systems';
import { ChosenFloor } from '../topology/ViewFilter';
import { badgeLabelOf, type FilterKey, type QueryKey } from './equipment-query';

const EQ = copy.workspace.equipment;
const ALL = '__all__';

/** How long the search waits after the last key before it is sent. */
export const SEARCH_DELAY_MS = 300;

export interface EquipmentFiltersProps {
  readonly filters: EquipmentResponse['view']['filters'] | undefined;
  readonly displays: Displays;
  readonly query: EquipmentQuery;
  readonly onChange: (changes: Partial<Record<QueryKey, string | undefined>>) => void;
  /** Controls after "Filters" on the toolbar's row (phase 5: Equipment's Export, ./EquipmentExport.tsx; DB-17's "Export"). */
  readonly actions?: ReactNode;
}

function FilterList({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="flex min-w-[180px] flex-1 flex-col gap-2">
      <p className="text-[13px] font-semibold text-(--sov-text-primary)">{label}</p>
      {children}
    </div>
  );
}

export function EquipmentFilters({ filters, displays, query, onChange, actions }: EquipmentFiltersProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(query.search ?? '');
  const searchId = useId();
  const panelId = useId();
  const trigger = useRef<HTMLButtonElement>(null);

  // The search box follows the address when a link or "Clear filters" changes it (state derived while rendering).
  const served = query.search ?? '';
  const [followed, setFollowed] = useState(served);
  if (served !== followed) {
    setFollowed(served);
    setText(served);
  }

  // The search is sent a moment after the last key (the address holds it; the API reads it).
  useEffect(() => {
    if (text.trim() === served) return;
    const timer = window.setTimeout(() => onChange({ search: text.trim() === '' ? undefined : text.trim() }), SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [text, served, onChange]);

  const zoneName = (zoneId: string) => {
    const zone = filters?.zones.find((entry) => entry.zoneId === zoneId);
    const name = zone === undefined ? undefined : displays.get(zone.name);
    return name === undefined ? null : <ValueName display={name} showBadge={false} />;
  };
  const badges = (filters?.badges ?? []).flatMap((id) => {
    const badge = badgeLabelOf(id, displays);
    return badge === undefined ? [] : [badge];
  });

  const active: ActiveFilter[] = [];
  if (query.system !== undefined) active.push({ id: 'system', name: EQ.filters.system, value: systemWords(query.system).title });
  if (query.level !== undefined) active.push({ id: 'level', name: EQ.filters.level, value: <ChosenFloor levels={filters?.levels} displays={displays} level={query.level} /> });
  if (query.zone !== undefined) active.push({ id: 'zone', name: EQ.filters.zone, value: zoneName(query.zone) ?? EQ.filters.zone });
  if (query.badge !== undefined) {
    const badge = badges.find((entry) => entry.id === query.badge);
    active.push({ id: 'badge', name: EQ.filters.badge, value: badge === undefined ? EQ.filters.badge : <Badge badge={badge} /> });
  }

  const set = (key: FilterKey, value: string | undefined) => onChange({ [key]: value === ALL ? undefined : value });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SearchField label={EQ.searchLabel} placeholder={EQ.searchPlaceholder} value={text} onChange={setText} maxLength={80} id={searchId} />
        <div className="flex flex-wrap items-start gap-3">
          <button
            ref={trigger}
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((previous) => !previous)}
            className="flex h-10 items-center gap-2 rounded-(--sov-radius-control) border border-(--sov-secondary-border) px-3 text-[14px] text-(--sov-text-primary) transition-colors duration-300 hover:border-(--sov-border-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--sov-focus-ring)"
          >
            <SlidersHorizontal size={16} strokeWidth={1.5} aria-hidden="true" focusable="false" />
            <span>{EQ.filters.label}</span>
          </button>
          {actions}
        </div>
      </div>
      <div
        id={panelId}
        hidden={!open}
        role="group"
        aria-label={EQ.filters.panel}
        className="flex flex-wrap gap-6 rounded-(--sov-radius-surface) border border-(--sov-border) bg-(--sov-surface) p-4"
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return;
          event.preventDefault();
          setOpen(false);
          trigger.current?.focus();
        }}
      >
        {open && filters !== undefined ? (
          <>
            <FilterList label={EQ.filters.system}>
              <SelectionList
                label={EQ.filters.system}
                options={[{ id: ALL, content: EQ.filters.allSystems }, ...filters.systems.map((id) => ({ id, content: systemWords(id).title }))]}
                selected={query.system ?? ALL}
                onSelect={(id) => set('system', id)}
              />
            </FilterList>
            <FilterList label={EQ.filters.zone}>
              {filters.zones.length === 0 ? (
                <p className="text-[14px] text-(--sov-text-tertiary)">{copy.workspace.zones.empty.none_read}</p>
              ) : (
                <SelectionList
                  label={EQ.filters.zone}
                  options={[
                    { id: ALL, content: EQ.filters.allZones },
                    ...filters.zones.flatMap((zone) => {
                      const name = displays.get(zone.name);
                      return name === undefined ? [] : [{ id: zone.zoneId, content: <ValueName display={name} showBadge={false} /> }];
                    }),
                  ]}
                  selected={query.zone ?? ALL}
                  onSelect={(id) => set('zone', id)}
                />
              )}
            </FilterList>
            <FilterList label={EQ.filters.badge}>
              <SelectionList
                label={EQ.filters.badge}
                options={[{ id: ALL, content: EQ.filters.allBadges }, ...badges.map((badge) => ({ id: badge.id, content: <Badge badge={badge} /> }))]}
                selected={query.badge ?? ALL}
                onSelect={(id) => set('badge', id)}
              />
            </FilterList>
          </>
        ) : null}
      </div>
      <ActiveFilters
        label={EQ.filters.active}
        filters={active}
        removeLabel={EQ.filters.remove}
        onRemove={(id) => onChange({ [id]: undefined })}
        clearLabel={EQ.filters.clear}
        onClear={() => onChange({ system: undefined, level: undefined, zone: undefined, badge: undefined })}
      />
    </div>
  );
}
