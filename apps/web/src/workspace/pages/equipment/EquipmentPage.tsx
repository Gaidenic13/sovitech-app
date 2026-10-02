/**
 * Equipment (DB-17; PRD R-065 to R-068, R-070, R-080; US-ASSETS-01 to US-ASSETS-06, US-ASSETS-11; UD-26; dashboards
 * 7.1.1-C1, C3, C5, C10, D14, P6; docs/adr/0044 decision 7, 0045).
 *
 * - **The register** (`workspace.equipment`): one row per tag (2.5: one tag, one asset; untagged appearances are the
 *   engineer's, never rows or counts, G4-17), 50 a page on the server (the 5,000-row budget: ADR 0044 decision 7),
 *   with previous and next only, no page number and no "Showing <a>-<b> of <n>" (R-017's reading; proposal 7.2.30).
 *   Each cell through the kit's bound value element: the tag as written (From document, with every place it is
 *   written), system, type, location, floor and zone, each Unknown where no source holds it (never blank, a dash or
 *   zero: US-ASSETS-05 AC10), and a **badge column** for the type (7.1-r2, 7.1.1-E5: "Dense tables get a badge
 *   column"). The type reads Unknown while the taxonomy gate is closed (R-067 "Until decided"). No Status column,
 *   status dot or "All Status" filter, no Last Update, Alarms, power chart or timeline (D14; R-066; 7.1-r27).
 * - **The count line** "Equipment by type": the served count, "Not available yet: SOVITECH asset taxonomy" while the
 *   gate is closed (2.5: counts by type; ADR 0045 decision 2). No copy says the list holds all of the building's
 *   equipment (US-ASSETS-05 AC7; proposal 7.2.31).
 * - **The floor filter** in the header's actions slot (`FloorFilter`, ../topology/ViewFilter.tsx: the same control as
 *   System Scope's, Topology's and Zones', DR-5), over the level register the view served, in the shared `level`
 *   parameter (ADR 0043 decision 6; R-077); or, in the same slot, the register's "Not available yet" line with its
 *   actions (G7-14), or the floor field's two readings while it is in conflict (G7-16).
 * - **Search and the other filters** (./EquipmentFilters.tsx), held in the address (./equipment-query.ts): nothing is
 *   written.
 * - **A selection** (R-065: "alone or for a selection"; 7.1.1-C10), drawn only where a row offers an answer: "Looks
 *   right" sends `fields.acknowledge` (`owner_acknowledged` only, G3-3) and "Something's wrong" sends
 *   `fields.concernMany` (notes for the engineer queue, G3-10), each one request per press. No "Confirm all", no
 *   verification, nothing that commands a life-safety asset (rule 11; every asset is possibly life-safety, 5.2).
 *   Once an answer is saved, or the selection cleared, the bar holding the pressed button leaves, so the focus moves on
 *   itself (WCAG 2.4.3; A-6): to the first selected row's checkbox in the register's order, or, when no row offers an
 *   answer any more, to the saved message, which takes the focus.
 * - **The inspector** (./EquipmentInspector.tsx; Overview, Points, Documents; no Alarms) from a row's open button or
 *   a click on the row; the row's "›" opens the full record (UD-08). `?asset=<id>` opens an asset's inspector.
 * - **No plan strip, Floor Plan mode, pin, popover, "View on Floor Plan" or "View in 3D"** (R-070, R-080, R-084: no
 *   plan or model view is built; the owner's answer of 2026-10-02), no Export (phase 5), no product photo (7.2.9).
 *   Nothing on the page waits for a model (US-ASSETS-05 AC12).
 * - **States:** loading (one polite line; on a later query the rows stay with `aria-busy` until the answer is in),
 *   failed (Try again), no documents (with "Upload a document"), reading, documents read with no equipment from them
 *   (never "not found": no completed AI run searched them, G12-10), nothing matching the filters. "← Back to System
 *   Scope" opens System Scope (R-066 "Until decided"). The demo line is the frame's (the status footer).
 */
import { ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Button, Icon, InspectorLayout, PageHeader, Pager, RegisterTable, type RegisterColumn } from '@sovitech/ui';
import { UUID_PATTERN, type DisplayObject, type EquipmentRow } from '@sovitech/view-model/browser';
import { ApiError, isSignedOut, request } from '../../../api/client';
import { copy } from '../../../copy';
import { LoadFailed, Loading } from '../../../pages/PageState';
import { writeRefusalMessage } from '../../../review/field-writes';
import { useOnSignedOut } from '../../../session/SessionProvider';
import { useWizard } from '../../../wizard/WizardProvider';
import { useInFlight } from '../../../wizard/use-in-flight';
import { pagePath, workspaceActionPath } from '../../navigation';
import { useWorkspaceView } from '../../use-workspace';
import { ActionLink, FloorFilter, useHeldLevel } from '../topology/ViewFilter';
import { EquipmentFilters } from './EquipmentFilters';
import { EquipmentInspector, assetPath } from './EquipmentInspector';
import { answersOf, offersAnswers, queryOfSearch, requestQuery, searchWith, type QueryKey } from './equipment-query';
import { RegisterValue } from './register-values';
import { useKept } from './use-kept';

const EQ = copy.workspace.equipment;

/** No row selected. */
const NONE_SELECTED: ReadonlySet<string> = new Set();

/** The search parameter that opens an asset's inspector. */
export const ASSET_PARAM = 'asset';

/** A row with every cell's display as served (a row whose response lacks one is not drawn: the contract serves them all). */
interface ShownRow {
  readonly row: EquipmentRow;
  readonly tag: DisplayObject;
  readonly type: DisplayObject;
  readonly system: DisplayObject;
  readonly location: DisplayObject;
  readonly level: DisplayObject;
  readonly zone: DisplayObject;
}

export function EquipmentPage() {
  const { projectId } = useWizard();
  const navigate = useNavigate();
  const onSignedOut = useOnSignedOut();
  const [search, setSearch] = useSearchParams();
  const query = useMemo(() => queryOfSearch(search), [search]);
  const { state, data, reload } = useWorkspaceView('workspace.equipment', { query: requestQuery(query) });
  const kept = useKept(data);
  const displays = kept.displays;
  const view = kept.data?.view;
  const rows = useMemo(() => view?.rows ?? [], [view]);
  const shownRows = useMemo(
    () =>
      rows.flatMap((row): ShownRow[] => {
        const [tag, type, system, location, level, zone] = [row.tag, row.type, row.system, row.location, row.level, row.zone].map((valueId) => displays.get(valueId));
        if (tag === undefined || type === undefined || system === undefined || location === undefined || level === undefined || zone === undefined) return [];
        return [{ row, tag, type, system, location, level, zone }];
      }),
    [rows, displays],
  );

  // A selection belongs to the rows on screen: a new query starts with none (state keyed by the query).
  const queryKey = JSON.stringify(query);
  const [selection, setSelection] = useState<{ readonly key: string; readonly ids: ReadonlySet<string> }>({ key: queryKey, ids: new Set() });
  const selected: ReadonlySet<string> = selection.key === queryKey ? selection.ids : NONE_SELECTED;
  const setSelected = (ids: ReadonlySet<string>) => setSelection({ key: queryKey, ids });
  const [message, setMessage] = useState<{ readonly text: string; readonly alert: boolean } | null>(null);
  const answering = useInFlight();
  const asked = search.get(ASSET_PARAM);
  const [inspected, setInspected] = useState<string | null>(asked !== null && UUID_PATTERN.test(asked) ? asked : null);
  const inspectorId = useId();
  const inspectorBox = useRef<HTMLDivElement | null>(null);
  const focusInspector = useRef(false);
  // Where the focus goes once the selection bar leaves (A-6): the asset whose checkbox takes it, set with the request.
  const focusAfter = useRef<string | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const statusLine = useRef<HTMLParagraphElement | null>(null);

  // A focus the page moves itself (WCAG 2.4.3): the page's main region when it opens.
  useEffect(() => {
    document.getElementById('main')?.focus({ preventScroll: true });
  }, []);

  // An inspector opened by the owner takes the focus to its close button.
  useEffect(() => {
    if (inspected === null || !focusInspector.current) return;
    focusInspector.current = false;
    inspectorBox.current?.querySelector<HTMLButtonElement>('.sov-inspector__close')?.focus();
  }, [inspected]);

  const change = useCallback(
    (changes: Partial<Record<QueryKey, string | undefined>>) => {
      setMessage(null);
      setSearch((previous) => searchWith(previous, changes), { replace: true });
    },
    [setSearch],
  );

  // A floor selection the register does not hold (stale, or no floor structure known) is dropped: nothing hides behind it.
  const dropLevel = useCallback(() => change({ level: undefined }), [change]);
  useHeldLevel(view?.filters.levels, query.level, dropLevel);

  // The focus after the selection bar leaves (WCAG 2.4.3; A-6): the first selected row's checkbox, where the register
  // still draws one, else the saved message (focusable for this, tabindex -1). Never left on the page body.
  useEffect(() => {
    if (focusRequest === 0) return;
    const assetId = focusAfter.current;
    focusAfter.current = null;
    const row = assetId === null ? null : document.querySelector(`[data-equipment-row="${assetId}"]`)?.closest('tr');
    const checkbox = row?.querySelector<HTMLInputElement>('[data-register-cell="select"] input[type="checkbox"]');
    if (checkbox !== null && checkbox !== undefined) checkbox.focus();
    else statusLine.current?.focus();
  }, [focusRequest]);

  /** Clears the selection and asks for the focus to move to the first selected row's checkbox (A-6). */
  const clearSelection = () => {
    focusAfter.current = rows.find((row) => selected.has(row.assetId))?.assetId ?? null;
    setSelected(new Set());
  };

  const selectable = offersAnswers(rows, displays);
  const chosenRows = rows.filter((row) => selected.has(row.assetId));
  const answers = answersOf(chosenRows, displays);

  const answer = (kind: 'acknowledge' | 'concern') => {
    const candidateIds = kind === 'acknowledge' ? answers.acknowledge : answers.concern;
    if (candidateIds.length === 0) return;
    void answering.run(async () => {
      setMessage(null);
      try {
        if (kind === 'acknowledge') await request('fields.acknowledge', { params: { projectId }, body: { candidateIds: [...candidateIds] } });
        else await request('fields.concernMany', { params: { projectId }, body: { candidateIds: [...candidateIds] } });
        clearSelection();
        await reload({ quiet: true });
        setMessage({ text: EQ.selectionSaved, alert: false });
        // Once the register is read again: the rows may no longer carry an answer (no checkbox), so the target is chosen then.
        setFocusRequest((count) => count + 1);
      } catch (error) {
        if (isSignedOut(error)) {
          onSignedOut();
          return;
        }
        const code = error instanceof ApiError ? error.code : '';
        setMessage({ text: writeRefusalMessage(code) ?? EQ.writeFailed, alert: true });
        await reload({ quiet: true });
      }
    });
  };

  const open = (shown: ShownRow) => {
    focusInspector.current = true;
    setInspected(shown.row.assetId);
  };
  const closeInspector = () => {
    const closed = inspected;
    setInspected(null);
    window.setTimeout(() => {
      if (closed === null) return;
      document.querySelector(`[data-equipment-row="${closed}"]`)?.closest('tr')?.querySelector<HTMLElement>('[data-register-cell="open"] button')?.focus();
    }, 0);
  };

  const columns: RegisterColumn<ShownRow>[] = [
    { kind: 'value', id: 'tag', header: EQ.columns.tag, rowHeader: true, value: (shown) => shown.tag },
    { kind: 'value', id: 'system', header: EQ.columns.system, value: (shown) => shown.system },
    { kind: 'value', id: 'type', header: EQ.columns.type, value: (shown) => shown.type },
    { kind: 'value', id: 'location', header: EQ.columns.location, value: (shown) => shown.location },
    { kind: 'value', id: 'level', header: EQ.columns.level, value: (shown) => shown.level },
    { kind: 'value', id: 'zone', header: EQ.columns.zone, value: (shown) => shown.zone },
  ];

  const page = query.page ?? 1;
  const loading = state.status === 'loading';
  const empty =
    view === undefined ? null : view.state === 'listed' ? (
      <p className="py-6 text-[15px] text-(--sov-text-tertiary)">{EQ.empty.filtered}</p>
    ) : (
      <div className="flex flex-col items-start gap-3 py-6">
        <p className="text-[15px] text-(--sov-text-tertiary)">{EQ.empty[view.state]}</p>
        {view.state === 'no_documents' ? (
          // The owner's action as the other pages draw it: an underlined link (ADR 0040 decision 6, DR-24).
          <ActionLink to={workspaceActionPath(projectId, 'upload_document')}>{copy.workspace.actions.upload_document}</ActionLink>
        ) : null}
      </div>
    );

  const inspectedRow = inspected === null ? undefined : shownRows.find((shown) => shown.row.assetId === inspected);
  const systemScope = pagePath(projectId, 'system_scope', query.level);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{
          label: copy.workspace.back.systemScope,
          href: systemScope,
          onNavigate: (event) => {
            event.preventDefault();
            void navigate(systemScope);
          },
        }}
        title={EQ.title}
        subtitle={EQ.subtitle}
        actions={<FloorFilter projectId={projectId} levels={view?.filters.levels} displays={displays} level={query.level} onChange={(level) => change({ level })} />}
      />
      <InspectorLayout
        inspector={
          inspected === null ? null : (
            <EquipmentInspector
              key={inspected}
              projectId={projectId}
              assetId={inspected}
              tag={inspectedRow?.tag}
              onClose={closeInspector}
              onChanged={() => void reload({ quiet: true })}
              id={inspectorId}
              boxRef={(element) => {
                inspectorBox.current = element;
              }}
            />
          )
        }
      >
        <div className="flex min-w-0 flex-col gap-4 [&>*]:min-w-0">
          <EquipmentFilters filters={view?.filters} displays={displays} query={query} onChange={change} />
          {view === undefined ? null : (
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-[13px] font-semibold text-(--sov-text-primary)">{EQ.countHeading}</span>
              <RegisterValue display={displays.get(view.total)} />
            </div>
          )}
          {selectable && selected.size > 0 ? (
            <div role="group" aria-label={EQ.selection} className="flex flex-wrap items-center gap-4 rounded-(--sov-radius-surface) border border-(--sov-border) bg-(--sov-surface) px-4 py-3">
              <span className="text-[14px] font-medium text-(--sov-text-primary)">{EQ.selection}</span>
              {answers.acknowledge.length === 0 ? null : (
                <Button variant="secondary" aria-busy={answering.busy} onClick={() => answer('acknowledge')}>
                  {copy.actions.looksRight}
                </Button>
              )}
              {answers.concern.length === 0 ? null : (
                <Button variant="secondary" aria-busy={answering.busy} onClick={() => answer('concern')}>
                  {copy.actions.somethingWrong}
                </Button>
              )}
              <Button
                variant="quiet"
                onClick={() => {
                  clearSelection();
                  setFocusRequest((count) => count + 1);
                }}
              >
                {EQ.clearSelection}
              </Button>
            </div>
          ) : null}
          {message === null ? null : message.alert ? (
            <p role="alert" className="text-[14px] text-(--sov-text-primary)">
              {message.text}
            </p>
          ) : (
            <p ref={statusLine} role="status" aria-live="polite" tabIndex={-1} className="text-[14px] text-(--sov-text-primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--sov-focus-ring)">
              {message.text}
            </p>
          )}
          {loading && view === undefined ? (
            <div className="border-t border-(--sov-border) py-5" data-loading-frame="equipment">
              <Loading label={copy.app.loading} align="start" />
            </div>
          ) : null}
          {state.status === 'failed' && view === undefined ? <LoadFailed message={copy.workspace.frame.loadFailed} onRetry={() => void reload()} /> : null}
          {view === undefined ? null : (
            <>
              <RegisterTable
                label={EQ.tableLabel}
                columns={columns}
                rows={shownRows}
                rowKey={(shown) => shown.row.assetId}
                badgeColumn={{ column: 'type', header: EQ.columns.badge }}
                {...(selectable
                  ? {
                      selection: {
                        selected,
                        onToggle: (key: string, on: boolean) => {
                          const next = new Set(selected);
                          if (on) next.add(key);
                          else next.delete(key);
                          setSelected(next);
                        },
                        onToggleAll: (on: boolean) => setSelected(on ? new Set(rows.map((row) => row.assetId)) : new Set()),
                        header: EQ.columns.select,
                        rowLabel: EQ.selectRow,
                        allLabel: EQ.selectPage,
                      },
                    }
                  : {})}
                open={{ onOpen: open, label: EQ.openDetails, header: EQ.columns.details, inspectorId }}
                current={inspected}
                rowAction={{
                  header: EQ.columns.record,
                  render: (shown) => (
                    <Link to={assetPath(projectId, shown.row.assetId)} className="sov-icon-button" aria-label={EQ.inspector.openRecord} data-equipment-row={shown.row.assetId}>
                      <Icon icon={ChevronRight} size="small" />
                    </Link>
                  ),
                }}
                empty={empty}
                busy={loading}
              />
              <Pager
                label={copy.workspace.pagination.label}
                previousLabel={copy.workspace.pagination.previous}
                nextLabel={copy.workspace.pagination.next}
                hasPrevious={view.page.hasPrevious}
                hasNext={view.page.hasNext}
                busy={loading}
                onPrevious={() => {
                  if (!loading) change({ page: page - 1 <= 1 ? undefined : String(page - 1) });
                }}
                onNext={() => {
                  if (!loading) change({ page: String(page + 1) });
                }}
              />
            </>
          )}
        </div>
      </InspectorLayout>
    </div>
  );
}
