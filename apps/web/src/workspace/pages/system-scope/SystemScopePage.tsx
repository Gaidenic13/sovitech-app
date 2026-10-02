/**
 * System Scope (DB-16; PRD R-051 to R-055, R-058, R-074; US-SCOPE-05 to US-SCOPE-08, US-SCOPE-10 AC1, US-SCOPE-12;
 * dashboards 7.1.1-C1, C4, C7, C8, L1; docs/adr/0043 decision 4, 0044, 0045): the only scope editor after Generate.
 *
 * - **The eight catalogue systems** (`workspace.systemScope`; R-055 "Until decided": no Guest Room Systems, Parking,
 *   Kitchen or "Other (Custom)" row), each with its recorded decision through the Value component (the same display
 *   as step 4's card and step 8's row: G2-7), its equipment by type ("Not available yet: SOVITECH asset taxonomy":
 *   7.1.1-C1, ADR 0045) and its In Scope control. No Coverage column, bar or dash (7.1.1-C4), no ⓘ.
 * - **In Scope** (./scope-model.ts): a recorded decision draws a real switch (`role="switch"`) on or off; a visible
 *   Suggested preselection draws it on with its reason; a system with no decision is never drawn off or excluded
 *   (US-SCOPE-05 AC4): it reads Not provided yet and offers "Include" and "Leave out". Each press sends one
 *   `workspace.systemScope.decide` request (one write of the page at a time, `useInFlight`: `aria-busy`, never
 *   disabled), which appends the owner's decision as a new candidate and keeps the earlier one (rule 4; G4-40); the
 *   page then reads its view again, so every badge is the server's. No question, confirmation or required field is
 *   added, and the owner may leave at any time (R-052; US-SCOPE-06 AC8).
 * - **Fire Safety** reads "Monitoring only (read-only); fire logic and fire-mode interlocks remain in the fire system."
 *   in its row and its panel, is never preselected and never shows Suggested, whatever the page is served (rule 11;
 *   §5-4b; G11-10). Including it is the owner's own opt-in; nothing on the page offers any control of it.
 * - **The detail panel** (./SystemDetail.tsx) in the right inspector, where screen 16 draws its canvas and panel: no
 *   canvas, model area or 3D / 2D / Section control is built (R-054, R-074 "Until decided"; UD-31 not built; the
 *   owner's answer of 2026-10-02: no viewer in the live app), and no illustrative model.
 * - **"Save and Continue"** writes each Suggested preselection still visible and left in place as the owner's answer
 *   (rule 3; G3-20) and nothing else (decisions already recorded and unchanged write nothing: 7.1.1-C8), then opens
 *   Zones (R-052 "Until decided"). A row the system filter hides is not visible, so its suggestion is never reported
 *   as visible and stays a suggestion (rule 3: "Nothing hidden, collapsed or on another step is accepted this way";
 *   G3-22). **"Back to Topology"** opens Topology (its Logical view is built in this phase).
 * - **The filters**, in the header's actions slot in dashboards-spec 3.5's fixed order, floor then system (DR-5), each
 *   writing nothing (rule 3): the floor filter is the shared floor selection (`FloorFilter`, the `level` parameter;
 *   ADR 0043 decision 6) over the frame's level register, or, in the same slot, its "Not available yet" line with its
 *   actions (G7-14), or the floor field's two readings while it is in conflict (G7-16); it changes the equipment
 *   queries only (R-077). The system filter ("All systems" and the eight: screen 16's "All Systems", US-SCOPE-05 AC11;
 *   V-10) shows one system's row or all of them; it is held in the page's state, since `?system=` keeps its meaning
 *   (a link opens that system's panel, Topology's "View in System Scope"). The detail panel follows the rows shown.
 * - **States:** loading (one polite line under the heading), failed (what could not be loaded, Try again), writing
 *   (`aria-busy`), refused (`shown_value_changed`: the page reads its view again and says so; `owner_only`: says who
 *   may change it). The demo line is the frame's (the status footer).
 *
 * Changed from the approved screen, each for the design review (build log, phase 4 plan): the subtitle drops "based on
 * the topology"; "From Topology" reads "Equipment"; no Coverage; no "Edit Scope"; no canvas or view-mode control; an
 * undecided system shows "Include" and "Leave out" in place of a switch drawn off.
 */
import { ArrowRight } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button, Icon, InspectorLayout, PageHeader, RegisterTable, Switch, Value, type RegisterColumn } from '@sovitech/ui';
import type { DisplayObject, ScopeDecisionsRequest, SystemScopeRow } from '@sovitech/view-model/browser';
import { ApiError, isSignedOut, request } from '../../../api/client';
import { copy } from '../../../copy';
import { LoadFailed, Loading } from '../../../pages/PageState';
import { useOnSignedOut } from '../../../session/SessionProvider';
import { useWizard } from '../../../wizard/WizardProvider';
import { useInFlight } from '../../../wizard/use-in-flight';
import type { Displays } from '../../../wizard/use-step-view';
import { pagePath, useLevelSelection } from '../../navigation';
import { useWorkspaceFrame, useWorkspaceView } from '../../use-workspace';
import { RegisterValue } from '../equipment/register-values';
import { useKept } from '../equipment/use-kept';
import { FloorFilter, SystemFilter, useHeldLevel } from '../topology/ViewFilter';
import { decisionRequest, scopeControlOf, visibleSuggestionsOf, type ScopeChoice } from './scope-model';
import { SystemDetail } from './SystemDetail';
import { SYSTEM_ICONS, systemWords } from './systems';

const SCOPE = copy.workspace.systemScope;

/** The sentence for a refused write (rule 7: what happened, and that nothing else changed). */
export function scopeRefusalMessage(code: string): string {
  if (code === 'shown_value_changed') return copy.edit.changed;
  if (code === 'owner_only') return copy.edit.ownerOnly;
  return SCOPE.writeFailed;
}

interface Pending {
  readonly systemId: string;
  readonly choice: ScopeChoice;
}

interface ScopeCellProps {
  readonly row: SystemScopeRow;
  readonly decision: DisplayObject | undefined;
  readonly busy: boolean;
  readonly pending: Pending | null;
  readonly onDecide: (row: SystemScopeRow, choice: ScopeChoice) => void;
}

/** The In Scope cell: the switch (on or off) with the decision beside it, or, undecided, the decision with its two choices. */
function ScopeCell({ row, decision, busy, pending, onDecide }: ScopeCellProps) {
  const { title } = systemWords(row.systemId);
  const control = scopeControlOf(row, decision);
  const decisionValue = decision === undefined ? null : <Value display={decision} label={null} layout="compact" />;
  const mine = pending !== null && pending.systemId === row.systemId ? pending : null;
  if (control === 'undecided') {
    return (
      <div className="flex min-w-[220px] flex-col items-start gap-2" data-scope-control="undecided">
        {decisionValue}
        <div className="flex items-center gap-4">
          <Button variant="link" aria-label={SCOPE.includeNamed.replace('{system}', title)} aria-busy={busy} onClick={() => onDecide(row, 'include')}>
            {SCOPE.include}
          </Button>
          <Button variant="link" aria-label={SCOPE.leaveOutNamed.replace('{system}', title)} aria-busy={busy} onClick={() => onDecide(row, 'exclude')}>
            {SCOPE.leaveOut}
          </Button>
        </div>
      </div>
    );
  }
  const checked = mine === null ? control === 'on' : mine.choice === 'include';
  return (
    <div className="flex min-w-[220px] items-start gap-3" data-scope-control={control}>
      <span className="pt-0.5">
        <Switch checked={checked} label={SCOPE.includeSystem.replace('{system}', title)} busy={busy} onChange={(next) => onDecide(row, next ? 'include' : 'exclude')} />
      </span>
      {decisionValue}
    </div>
  );
}

/** The System cell: the decorative icon, the catalogue name, and a life-safety system's monitoring-only text (rule 11). */
function SystemCell({ row }: { readonly row: SystemScopeRow }) {
  const words = systemWords(row.systemId);
  const icon = SYSTEM_ICONS[row.systemId];
  return (
    <span className="flex min-w-[160px] items-start gap-3">
      {icon === undefined ? null : (
        <span className="mt-0.5 shrink-0 text-(--sov-text-tertiary)">
          <Icon icon={icon} />
        </span>
      )}
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-[15px] font-medium text-(--sov-text-primary)">{words.title}</span>
        {row.lifeSafety && words.description !== undefined ? <span className="text-[13px] leading-snug font-normal text-(--sov-text-tertiary)">{words.description}</span> : null}
      </span>
    </span>
  );
}

export function SystemScopePage() {
  const { projectId } = useWizard();
  const navigate = useNavigate();
  const onSignedOut = useOnSignedOut();
  const frame = useWorkspaceFrame();
  const { level, setLevel } = useLevelSelection();
  const dropLevel = useCallback(() => setLevel(undefined), [setLevel]);
  const { state, data, reload } = useWorkspaceView('workspace.systemScope', { query: { level } });
  const kept = useKept(data);
  const displays: Displays = kept.displays;
  const rows = useMemo(() => kept.data?.view.systems ?? [], [kept.data]);
  // The system filter (V-10): one system's row, or all eight. A view state that writes nothing; never `?system=`.
  const [systemFilter, setSystemFilter] = useState<string | undefined>(undefined);
  const visibleRows = useMemo(() => (systemFilter === undefined ? rows : rows.filter((row) => row.systemId === systemFilter)), [rows, systemFilter]);
  const writes = useInFlight();
  const [pending, setPending] = useState<Pending | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // The system the detail panel shows: the one a link named (`?system=`, Topology's "View in System Scope", R-071), else
  // the first row shown, until the owner chooses one; null once the owner closed it. A row the filter hides gives way
  // to the first row shown, so the panel never shows a system the register does not.
  const [searchParams] = useSearchParams();
  const linked = visibleRows.find((row) => row.systemId === searchParams.get('system'))?.systemId;
  const [chosen, setChosen] = useState<string | null | undefined>(undefined);
  const wanted = chosen === undefined ? (linked ?? visibleRows[0]?.systemId) : (chosen ?? undefined);
  const current = wanted === undefined ? undefined : (visibleRows.find((row) => row.systemId === wanted) ?? visibleRows[0]);
  const shown = current?.systemId;
  const panelId = useId();
  const headingId = useId();
  const panelBox = useRef<HTMLDivElement | null>(null);
  const focusPanel = useRef(false);

  // A focus the page moves itself (WCAG 2.4.3): the page's main region when it opens.
  useEffect(() => {
    document.getElementById('main')?.focus({ preventScroll: true });
  }, []);

  // A floor selection the register does not hold (stale, or no floor structure known) is dropped: nothing hides behind it.
  useHeldLevel(frame.levels, level, dropLevel);

  // A panel opened by the owner takes the focus to its close button, so the keyboard continues there.
  useEffect(() => {
    if (current === undefined || !focusPanel.current) return;
    focusPanel.current = false;
    panelBox.current?.querySelector<HTMLButtonElement>('.sov-inspector__close')?.focus();
  }, [current]);

  const refuse = async (error: unknown): Promise<void> => {
    if (isSignedOut(error)) {
      onSignedOut();
      return;
    }
    const code = error instanceof ApiError ? error.code : '';
    setMessage(scopeRefusalMessage(code));
    // The page showed a value that is no longer so: it reads its view again (rule 4; G4-36).
    if (code === 'shown_value_changed') await reload({ quiet: true });
  };

  const send = (body: ScopeDecisionsRequest) => request('workspace.systemScope.decide', { params: { projectId }, body });

  const decide = (row: SystemScopeRow, choice: ScopeChoice) => {
    const body = decisionRequest(displays.get(row.decision), choice);
    if (body === undefined) return;
    void writes.run(async () => {
      setMessage(null);
      setPending({ systemId: row.systemId, choice });
      try {
        await send(body);
        // The answer is the view as it now stands; the page reads it with its floor selection.
        await reload({ quiet: true });
      } catch (error) {
        await refuse(error);
      } finally {
        setPending(null);
      }
    });
  };

  const saveAndContinue = () => {
    if (!writes.claim()) return;
    setMessage(null);
    // Only the rows the filter shows are visible: a hidden row's suggestion is never reported (rule 3; G3-22).
    const visibleSuggestions = visibleSuggestionsOf(visibleRows, displays);
    void (async () => {
      try {
        if (visibleSuggestions.length > 0) await send({ decisions: [], visibleSuggestions });
        // The claim is kept: the button leaves with its page, so a press in the moment before is not sent twice.
        void navigate(pagePath(projectId, 'zones', level));
      } catch (error) {
        writes.release();
        await refuse(error);
      }
    })();
  };

  const open = (row: SystemScopeRow) => {
    focusPanel.current = true;
    setChosen(row.systemId);
  };
  const closePanel = () => {
    const closed = shown;
    setChosen(null);
    // The focus returns to the row's open button.
    window.setTimeout(() => {
      if (closed === undefined) return;
      document.querySelector(`[data-scope-row="${closed}"]`)?.closest('tr')?.querySelector<HTMLElement>('[data-register-cell="open"] button')?.focus();
    }, 0);
  };

  const columns: RegisterColumn<SystemScopeRow>[] = [
    {
      kind: 'content',
      id: 'system',
      header: SCOPE.columns.system,
      rowHeader: true,
      cell: (row) => (
        <span data-scope-row={row.systemId}>
          <SystemCell row={row} />
        </span>
      ),
    },
    {
      kind: 'content',
      id: 'equipment',
      header: SCOPE.columns.equipment,
      cell: (row) => (
        <span className="block min-w-[200px]">
          <RegisterValue display={displays.get(row.equipment)} />
        </span>
      ),
    },
    {
      kind: 'content',
      id: 'inScope',
      header: SCOPE.columns.inScope,
      cell: (row) => <ScopeCell row={row} decision={displays.get(row.decision)} busy={writes.busy} pending={pending} onDecide={decide} />,
    },
  ];

  const topology = pagePath(projectId, 'topology', level);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{
          label: copy.workspace.back.topology,
          href: topology,
          onNavigate: (event) => {
            event.preventDefault();
            void navigate(topology);
          },
        }}
        title={SCOPE.title}
        subtitle={SCOPE.subtitle}
        actions={
          <div className="flex flex-wrap items-start justify-end gap-3">
            <FloorFilter projectId={projectId} levels={frame.levels} displays={frame.displays} level={level} onChange={setLevel} />
            {rows.length === 0 ? null : (
              <SystemFilter systems={rows.map((row) => row.systemId)} name={SCOPE.filters.system} allLabel={SCOPE.filters.allSystems} system={systemFilter} onChange={setSystemFilter} />
            )}
          </div>
        }
      />
      {message === null ? null : (
        <p role="alert" className="text-[14px] text-(--sov-text-primary)">
          {message}
        </p>
      )}
      <InspectorLayout
        inspector={
          current === undefined ? null : (
            <SystemDetail
              projectId={projectId}
              row={current}
              displays={displays}
              level={level}
              onClose={closePanel}
              id={panelId}
              boxRef={(element) => {
                panelBox.current = element;
              }}
            />
          )
        }
      >
        <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-4">
          <h2 id={headingId} className="sov-heading-group">
            {SCOPE.listHeading}
          </h2>
          {state.status === 'loading' && kept.data === undefined ? (
            <div className="border-t border-(--sov-border) py-5" data-loading-frame="system-scope">
              <Loading label={copy.app.loading} align="start" />
            </div>
          ) : null}
          {state.status === 'failed' && kept.data === undefined ? <LoadFailed message={copy.workspace.frame.loadFailed} onRetry={() => void reload()} /> : null}
          {kept.data === undefined ? null : (
            <RegisterTable
              label={SCOPE.listLabel}
              columns={columns}
              rows={visibleRows}
              rowKey={(row) => row.systemId}
              open={{ onOpen: open, label: SCOPE.openDetails, header: SCOPE.columns.details, inspectorId: panelId }}
              current={current?.systemId ?? null}
              busy={state.status === 'loading'}
            />
          )}
        </section>
      </InspectorLayout>
      <div className="flex justify-end">
        <Button variant="primary" trailingIcon={ArrowRight} aria-busy={writes.busy} onClick={saveAndContinue}>
          {SCOPE.saveAndContinue}
        </Button>
      </div>
    </div>
  );
}
