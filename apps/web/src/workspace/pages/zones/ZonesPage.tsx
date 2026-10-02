/**
 * Zones (DB-20; PRD R-060 to R-064, R-077, R-080, R-084; US-ZONES-01 to US-ZONES-04; UD-09, UD-27; docs/adr/0043
 * decision 4, 0045 decisions 1, 2 and 4): DB-20's layout as the base with List as its only mode (R-061 "Until
 * decided"), from `workspace.zones`.
 *
 * - **The register** (US-ZONES-02 AC1, AC6): one row per zone subject, its id and name as written, its floor, its
 *   type (whose one badge stands in the register's badge column: 7.1-r2, "Dense tables get a badge column"), its area
 *   with its basis named (the served measure label, rule 8; 7.1.1-C6) and its systems, each through the value
 *   component with its badge and source line; a value with no candidate reads Unknown, never blank or zero (rule 1).
 *   No zone count while counts are the engine's (ADR 0045 decision 2), no Status column, status dot or live reading
 *   (R-061; 7.1-r27).
 * - **Filters** (writing nothing, rule 3; US-ZONES-02 AC2, AC4), in the header's actions slot in dashboards-spec 3.5's
 *   fixed order (DR-5): the floor filter over the level register (`FloorFilter`, the shared `level` parameter; in the
 *   same slot, its "Not available yet" line with the owner's actions while no floor structure is known, G7-14, or
 *   while the floor field is in conflict, with the field's two readings, G7-16), then the system filter over the
 *   catalogue's eight systems (the `system` parameter, so System Scope's links can name one); and the search on the
 *   zone's id or name as written. The server applies them (R-061), and each active filter shows as a removable chip
 *   (dashboards 2.5 rule 4: context from a link is a filter chip).
 * - **ZONE DETAILS and the zone editor** (./ZoneDetails.tsx): the right inspector, opened from a row's open button, a
 *   click on the row, or the row menu ("Edit Zone" opens it with the editor; "View Equipment in Zone"). `?zone=<id>`
 *   opens a zone's details.
 * - **Links:** "Back to System Scope" (R-061 "Until decided"), "View Equipment in Zone" (Equipment filtered by the zone,
 *   R-066), each keeping the floor selection.
 * - **Not built** (US-ZONES-02 AC7 and AC9, R-062 to R-064, R-080, R-084 "Until decided"; the owner's answer of
 *   2026-10-02 on the viewer): no plan area, Floor Plan or Matrix mode and no segmented control (List is the only
 *   mode), no zone fill, outline, compass or scale bar, no "+ Add Zone", no ZONE AREA DISTRIBUTION.
 * - **States:** loading, failed (Try again; the sidebar stays usable), empty by register state (no documents, with
 *   "Upload a document"; reading; none read: never "not found", G12-10), nothing matching the filters, and the next
 *   view loading after a filter changes (the rows shown stay, `aria-busy`). In the live app no zone field is
 *   registered (ADR 0045 decision 1), so the empty states carry the page; TEST registries prove the rest. The demo line
 *   is the frame's (the status footer).
 */
import { Search } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ActiveFilters, InspectorLayout, MenuButton, PageHeader, RegisterTable, Value, type ActiveFilter, type RegisterColumn } from '@sovitech/ui';
import { UUID_PATTERN, type ZonesResponse } from '@sovitech/view-model/browser';
import { copy } from '../../../copy';
import { LoadFailed, Loading } from '../../../pages/PageState';
import { useWizard } from '../../../wizard/WizardProvider';
import { pagePath, useLevelSelection, workspaceActionPath } from '../../navigation';
import { useWorkspaceView } from '../../use-workspace';
import { useKept } from '../equipment/use-kept';
import { CATALOGUE_SYSTEMS, systemTitle } from '../system-scope/systems';
import { ActionLink, ChosenFloor, FloorFilter, SystemFilter, levelHeld, useHeldLevel, useSystemSelection } from '../topology/ViewFilter';
import { ZoneDetails, equipmentInZonePath } from './ZoneDetails';

const ZONES = copy.workspace.zones;

type ZoneRow = ZonesResponse['view']['rows'][number];

/** The search parameter that opens a zone's details. */
export const ZONE_PARAM = 'zone';

/** How long the search waits after the last keystroke before it asks the view again. */
export const ZONES_SEARCH_DELAY_MS = 250;

/** The contract's longest search (ZonesQuerySchema). */
const SEARCH_MAX = 80;

function useDebounced(value: string, delay: number): string {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return settled;
}

export function ZonesPage() {
  const { projectId } = useWizard();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { level, setLevel } = useLevelSelection();
  const [system, setSystem] = useSystemSelection();
  const chosenSystem = system !== undefined && CATALOGUE_SYSTEMS.includes(system) ? system : undefined;
  const [searchText, setSearchText] = useState('');
  const search = useDebounced(searchText.trim().slice(0, SEARCH_MAX), ZONES_SEARCH_DELAY_MS);
  const { state, data, reload } = useWorkspaceView('workspace.zones', {
    query: {
      level,
      system: chosenSystem,
      search: search === '' ? undefined : search,
    },
  });
  const kept = useKept(data);
  const view = kept.data?.view;
  const displays = kept.displays;
  const rows = useMemo(() => view?.rows ?? [], [view]);

  const [selected, setSelected] = useState<string | null>(() => {
    const asked = params.get(ZONE_PARAM);
    return asked !== null && UUID_PATTERN.test(asked) ? asked : null;
  });
  const [editing, setEditing] = useState(false);
  const inspectorBox = useRef<HTMLDivElement | null>(null);
  const focusInspector = useRef(false);
  const inspectorId = useId();
  const searchId = useId();

  // A focus the page moves itself (WCAG 2.4.3): the page's main region when it opens.
  useEffect(() => {
    document.getElementById('main')?.focus({ preventScroll: true });
  }, []);

  // A floor selection the register does not hold (stale, or no floor structure known) is dropped: nothing hides behind it.
  const dropLevel = useCallback(() => setLevel(undefined), [setLevel]);
  useHeldLevel(view?.levels, level, dropLevel);

  const current = selected === null ? undefined : rows.find((row) => row.zoneId === selected);
  const detail = current === undefined ? undefined : view?.details.find((entry) => entry.zoneId === current.zoneId);

  // An inspector opened by the owner from a row takes the focus to its close button, so the keyboard continues there.
  useEffect(() => {
    if (current === undefined || !focusInspector.current) return;
    focusInspector.current = false;
    inspectorBox.current?.querySelector<HTMLButtonElement>('.sov-inspector__close')?.focus();
  }, [current]);

  const open = (row: ZoneRow, withEditor = false) => {
    focusInspector.current = !withEditor;
    setSelected(row.zoneId);
    setEditing(withEditor);
  };
  const closeInspector = () => {
    const closed = selected;
    setSelected(null);
    setEditing(false);
    // The focus returns to the row's open button (the list keeps its filters).
    window.setTimeout(() => {
      if (closed === null) return;
      const row = document.querySelector(`[data-zone-row="${closed}"]`)?.closest('tr');
      row?.querySelector<HTMLElement>('[data-register-cell="open"] button')?.focus();
    }, 0);
  };
  const changed = () => reload({ quiet: true });

  const valueCell = (valueId: string) => {
    const display = displays.get(valueId);
    return display === undefined ? null : <Value display={display} layout="bare" />;
  };

  const kindServed = rows.every((row) => displays.has(row.kind));
  const displayOf = (valueId: string) => {
    const display = displays.get(valueId);
    if (display === undefined) throw new Error(`Zones: ${valueId} was named but not served`);
    return display;
  };

  const columns: RegisterColumn<ZoneRow>[] = [
    {
      kind: 'content',
      id: 'code',
      header: ZONES.columns.code,
      rowHeader: true,
      cell: (row) => (
        <div data-zone-row={row.zoneId} className="min-w-[96px]">
          {valueCell(row.code)}
        </div>
      ),
    },
    {
      kind: 'content',
      id: 'name',
      header: ZONES.columns.name,
      cell: (row) => <div className="min-w-[140px]">{valueCell(row.name)}</div>,
    },
    {
      kind: 'content',
      id: 'level',
      header: ZONES.columns.level,
      cell: (row) => valueCell(row.level),
    },
    // The type's one badge stands in its own column, bound to the same value id (the kit's badge column); every row's
    // value ids are served with it (the contract), else the type keeps its badge on its line.
    kindServed
      ? {
          kind: 'value',
          id: 'kind',
          header: ZONES.columns.kind,
          value: (row) => displayOf(row.kind),
        }
      : {
          kind: 'content',
          id: 'kind',
          header: ZONES.columns.kind,
          cell: (row) => valueCell(row.kind),
        },
    {
      kind: 'content',
      id: 'area',
      header: ZONES.columns.area,
      cell: (row) => {
        const display = displays.get(row.area);
        // The area names its basis: the served measure label (rule 8; 7.1.1-C6).
        return display === undefined ? null : <Value display={display} layout="stack" />;
      },
    },
    {
      kind: 'content',
      id: 'systems',
      header: ZONES.columns.systems,
      cell: (row) => valueCell(row.systems),
    },
  ];

  const rowMenu = (row: ZoneRow) => (
    <MenuButton
      label={ZONES.moreActions}
      items={[
        { id: 'edit', label: ZONES.menu.edit, onSelect: () => open(row, true) },
        {
          id: 'equipment',
          label: ZONES.menu.viewEquipment,
          onSelect: () => void navigate(equipmentInZonePath(projectId, row.zoneId, level)),
        },
      ]}
    />
  );

  // A register that holds zones but lists none here: the filters match nothing.
  const empty =
    view === undefined ? null : view.state === 'listed' ? (
      <p className="py-6 text-[15px] text-(--sov-text-tertiary)">{ZONES.empty.filtered}</p>
    ) : (
      <div className="flex flex-col items-start gap-3 py-6">
        <p className="text-[15px] text-(--sov-text-tertiary)">{ZONES.empty[view.state]}</p>
        {view.state === 'no_documents' ? <ActionLink to={workspaceActionPath(projectId, 'upload_document')}>{copy.workspace.actions.upload_document}</ActionLink> : null}
      </div>
    );

  const active: ActiveFilter[] = [];
  if (levelHeld(view?.levels, level))
    active.push({
      id: 'level',
      name: copy.workspace.levels.label,
      value: <ChosenFloor levels={view?.levels} displays={displays} level={level} />,
    });
  if (chosenSystem !== undefined)
    active.push({
      id: 'system',
      name: ZONES.filters.system,
      value: systemTitle(chosenSystem),
    });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={ZONES.title}
        subtitle={ZONES.subtitle}
        back={{
          label: copy.workspace.back.systemScope,
          href: pagePath(projectId, 'system_scope', level),
          onNavigate: (event) => {
            event.preventDefault();
            void navigate(pagePath(projectId, 'system_scope', level));
          },
        }}
        actions={
          <div className="flex flex-wrap items-start justify-end gap-3">
            <FloorFilter projectId={projectId} levels={view?.levels} displays={displays} level={level} onChange={setLevel} />
            <SystemFilter systems={CATALOGUE_SYSTEMS} name={ZONES.filters.system} allLabel={ZONES.filters.allSystems} system={chosenSystem} onChange={setSystem} />
          </div>
        }
      />
      <InspectorLayout
        inspector={
          current === undefined ? null : (
            <ZoneDetails
              key={current.zoneId}
              projectId={projectId}
              row={current}
              detail={detail}
              displays={displays}
              level={level}
              editing={editing}
              onEditing={setEditing}
              onClose={closeInspector}
              onChanged={changed}
              inspectorId={inspectorId}
              boxRef={inspectorBox}
            />
          )
        }
      >
        <div className="flex min-w-0 flex-col gap-4 [&>*]:min-w-0">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-10 w-[280px] items-center gap-2 rounded-(--sov-radius-surface) border border-(--sov-control-border) px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-(--sov-focus-ring)">
              <Search size={16} strokeWidth={1.5} aria-hidden="true" focusable="false" className="shrink-0 text-(--sov-text-tertiary)" />
              <label htmlFor={searchId} className="sr-only">
                {ZONES.searchLabel}
              </label>
              <input
                id={searchId}
                type="search"
                value={searchText}
                placeholder={ZONES.searchPlaceholder}
                maxLength={SEARCH_MAX}
                onChange={(event) => setSearchText(event.currentTarget.value)}
                className="min-w-0 flex-1 bg-transparent text-[14px] text-(--sov-text-primary) outline-none placeholder:text-(--sov-text-muted)"
              />
            </div>
            <ActiveFilters
              label={ZONES.filters.active}
              filters={active}
              removeLabel={ZONES.filters.remove}
              onRemove={(id) => (id === 'level' ? setLevel(undefined) : setSystem(undefined))}
              clearLabel={ZONES.filters.clear}
              onClear={() => {
                setLevel(undefined);
                setSystem(undefined);
              }}
            />
          </div>
          {state.status === 'loading' && view === undefined ? (
            <div className="border-t border-(--sov-border) py-5" data-loading-frame="zones">
              <Loading label={copy.app.loading} align="start" />
            </div>
          ) : null}
          {state.status === 'failed' ? <LoadFailed message={copy.workspace.frame.loadFailed} onRetry={() => void reload()} /> : null}
          {view === undefined ? null : (
            <RegisterTable
              label={ZONES.tableLabel}
              columns={columns}
              rows={rows}
              rowKey={(row) => row.zoneId}
              {...(kindServed
                ? {
                    badgeColumn: {
                      column: 'kind',
                      header: ZONES.columns.badge,
                    },
                  }
                : {})}
              open={{
                onOpen: (row) => open(row),
                label: ZONES.openDetails,
                header: ZONES.columns.details,
                inspectorId,
              }}
              current={current?.zoneId ?? null}
              rowAction={{ header: ZONES.columns.actions, render: rowMenu }}
              empty={empty}
              busy={state.status === 'loading'}
            />
          )}
        </div>
      </InspectorLayout>
    </div>
  );
}
