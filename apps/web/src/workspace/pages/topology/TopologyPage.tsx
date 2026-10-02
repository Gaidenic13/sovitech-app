/**
 * Topology, its Logical view (DB-08; PRD R-071 to R-073, R-075, R-080; US-TOPO-01, US-TOPO-03 to US-TOPO-06,
 * US-TOPO-10; docs/adr/0043 decision 4, 0044, 0045 decision 2): a view of the registers, never of SOVITECH's design,
 * from `workspace.topology`.
 *
 * - **Two levels, as DB-08 lays them out**, each named in the left column. DB-08's management and automation levels
 *   (controllers, automation stations, servers, clients, the bus, protocols, third-party systems, data flow) are
 *   SOVITECH's proposed design (proposal 7.2.10; dashboards 8.8), so their band holds only the served line "Not
 *   available yet: SOVITECH's design of the controllers, networks and integrations", inside a dashed hairline: room
 *   kept for a design no record supplies yet (rule 1; 7.1-r12, r13; US-TOPO-04 AC1; G1-27). Nothing is labelled
 *   "proposed design" (prompt 3 section 9).
 * - **The field level:** one group per system whose recorded decision is include (a Suggested preselection adds
 *   none), in the catalogue's order, under its catalogue name and step 4's icon: its decision display (the same
 *   value id, badge and source line as System Scope and step 4: G2-7; no Edit here, System Scope being the only scope
 *   editor after Generate) and its equipment line (counts by asset type: "Not available yet: SOVITECH asset
 *   taxonomy" while the gate is closed, ADR 0045 decision 2), and "View in System Scope" (the presumed target of
 *   "View System Details →", R-071 Sources; D-02).
 * - **Fire Safety** (rule 11; 7.1-r18; 7.1.1-L4; R-072; US-TOPO-05; G11-11): its own group, in its own lane apart from
 *   the other systems (behind a hairline), carrying the catalogue's monitoring-only text, and the one line the view
 *   draws: a link from it straight up to the design level, in the monitoring direction only, labelled "Monitoring
 *   direction only: the BMS reads status and alarms" (never styled or labelled as a control command); in its lane
 *   nothing stands between it and the design level, so the line never reaches another system's group. No other group
 *   draws a link: no record supports one (7.1-r12, r13). The group offers only a view link (rule 11: view, log and
 *   documents).
 * - **No include decision recorded:** "Not available yet: the systems in scope" with "Choose the systems in scope"
 *   (System Scope), and no group (rule 7; R-071; G7-15).
 * - **Filters** (writing nothing, rule 3), in the header's actions slot in dashboards-spec 3.5's fixed order (DR-5):
 *   the floor filter over the level register (`FloorFilter`, the shared `level` parameter: US-TOPO-01 AC8, R-077; or,
 *   in the same slot, the register's "Not available yet" line with its actions while no floor structure is known,
 *   G7-14, or while the floor field is in conflict, with the field's two readings, G7-16), then the system filter over
 *   the drawn groups (US-TOPO-01 AC9).
 * - **Not built** (R-073 "Until decided", R-075, R-080, 7.1-r27): no view-mode control, 3D, 2D, Hybrid or LOGICAL tab;
 *   no model, plan, canvas, riser, pin or system colour; no KEY METRICS, STATISTICS, SYSTEM INTEGRATION STATUS
 *   ("Planned", "In Progress" and "Under Review" are not 2.8 wording), live bar or "Isolate System".
 * - **States:** loading (one polite line), failed (Try again; the sidebar stays usable), a filter's next view
 *   loading (the groups shown stay, `aria-busy`). The demo line is the frame's (the status footer).
 *
 * Undesigned parts (the reserved design band, the link row, the empty field level), per the frontend-design skill
 * within the brand: DB-08's level-by-level rows kept as page elements with hairlines; the only drawn line is the one a
 * rule supports, so the one-way fire link is the view's single relation.
 */
import { ArrowUp } from 'lucide-react';
import { useCallback, useEffect, useId } from 'react';
import { NotAvailableYet, PageHeader, Value } from '@sovitech/ui';
import type { TopologyResponse } from '@sovitech/view-model/browser';
import { copy } from '../../../copy';
import { LoadFailed, Loading } from '../../../pages/PageState';
import { useWizard } from '../../../wizard/WizardProvider';
import type { Displays } from '../../../wizard/use-step-view';
import { pagePath, useLevelSelection, workspaceActionPath } from '../../navigation';
import { useWorkspaceView } from '../../use-workspace';
import { useKept } from '../equipment/use-kept';
import { SYSTEM_ICONS, systemDescription, systemTitle } from '../system-scope/systems';
import { ActionLink, FloorFilter, SYSTEM_PARAM, SystemFilter, useHeldLevel, useSystemSelection } from './ViewFilter';

const TOPO = copy.workspace.topology;

type TopologyView = TopologyResponse['view'];
type TopologyGroup = TopologyView['groups'][number];

/** System Scope, opened on one system (its detail panel), keeping the floor selection. */
function systemScopePath(projectId: string, systemId: string, level: string | undefined): string {
  const params = new URLSearchParams();
  if (level !== undefined) params.set('level', level);
  params.set(SYSTEM_PARAM, systemId);
  return `${pagePath(projectId, 'system_scope')}?${params.toString()}`;
}

/**
 * The one line the view draws: from a monitoring-only (life-safety) system's group straight up to the design level,
 * an arrow at its top end (the monitoring direction: status and alarms go to the BMS), and its words beside it. It
 * sits in the monitoring lane, so nothing stands between it and the design level: it never reaches another system's
 * group (7.1.1-L4).
 */
function MonitoringLink() {
  return (
    <div className="order-first flex h-14 items-stretch gap-3 pl-6">
      <span aria-hidden="true" className="flex w-4 shrink-0 flex-col items-center">
        <ArrowUp size={16} strokeWidth={1.5} focusable="false" className="shrink-0 text-(--sov-text-primary)" />
        <span className="w-px flex-1 bg-(--sov-text-tertiary)" />
      </span>
      <p data-monitoring-link="" data-direction="to-bms" className="self-center text-[12px] leading-4 text-(--sov-text-tertiary)">
        {TOPO.monitoringLink}
      </p>
    </div>
  );
}

function SystemGroup({ projectId, group, displays, level }: { readonly projectId: string; readonly group: TopologyGroup; readonly displays: Displays; readonly level: string | undefined }) {
  const titleId = useId();
  const Glyph = SYSTEM_ICONS[group.systemId];
  const decision = displays.get(group.decision);
  const equipment = displays.get(group.equipment);
  return (
    <article aria-labelledby={titleId} data-topology-group={group.systemId} data-monitoring-only={group.monitoringOnly ? 'true' : 'false'} className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-4 rounded-(--sov-radius-surface) border border-(--sov-border) bg-(--sov-surface) p-4">
        <header className="flex items-center gap-3">
          {Glyph === undefined ? null : <Glyph size={24} strokeWidth={1.5} aria-hidden="true" focusable="false" className="shrink-0 text-(--sov-text-primary)" />}
          <h3 id={titleId} className="sov-heading-group">
            {systemTitle(group.systemId)}
          </h3>
        </header>
        {group.monitoringOnly ? <p className="text-[13px] leading-5 text-(--sov-text-primary)">{systemDescription(group.systemId)}</p> : null}
        {decision === undefined ? null : <Value display={decision} label={TOPO.decision} layout="stack" />}
        {equipment === undefined ? null : <Value display={equipment} label={TOPO.equipment} layout="stack" />}
        <div className="mt-auto pt-1">
          <ActionLink to={systemScopePath(projectId, group.systemId, level)}>{TOPO.toSystemScope}</ActionLink>
        </div>
      </div>
      {group.monitoringOnly ? <MonitoringLink /> : null}
    </article>
  );
}

function LogicalView({
  projectId,
  view,
  displays,
  system,
  level,
  busy,
}: {
  readonly projectId: string;
  readonly view: TopologyView;
  readonly displays: Displays;
  readonly system: string | undefined;
  readonly level: string | undefined;
  readonly busy: boolean;
}) {
  const designId = useId();
  const fieldId = useId();
  const design = displays.get(view.design);
  const shown = system === undefined ? view.groups : view.groups.filter((group) => group.systemId === system);
  const controlled = shown.filter((group) => !group.monitoringOnly);
  const monitored = shown.filter((group) => group.monitoringOnly);
  const noDecision = view.noDecision;
  const noDecisionLine = noDecision === null ? undefined : displays.get(noDecision.line);
  return (
    <div data-topology="" aria-busy={busy ? 'true' : undefined} className="flex flex-col border-t border-(--sov-border)">
      <section aria-labelledby={designId} data-topology-band="design" className="grid grid-cols-[200px_minmax(0,1fr)] gap-8 pt-6">
        <h2 id={designId} className="sov-heading-group pt-4 text-(--sov-text-tertiary)">
          {TOPO.designHeading}
        </h2>
        <div className="rounded-(--sov-radius-surface) border border-dashed border-(--sov-border-hover) px-5 py-5">{design === undefined ? null : <NotAvailableYet display={design} />}</div>
      </section>
      <section aria-labelledby={fieldId} data-topology-band="systems" className="grid grid-cols-[200px_minmax(0,1fr)] gap-8 pb-6">
        <h2 id={fieldId} className="sov-heading-group pt-[72px]">
          {TOPO.fieldHeading}
        </h2>
        {noDecision !== null ? (
          <div className="mt-14 flex flex-col items-start gap-3 rounded-(--sov-radius-surface) border border-(--sov-border) px-5 py-5" data-topology-no-decision="">
            {noDecisionLine === undefined ? null : <NotAvailableYet display={noDecisionLine} />}
            {noDecision.actions.map((action) => (
              <ActionLink key={action} to={workspaceActionPath(projectId, action)}>
                {copy.workspace.actions[action]}
              </ActionLink>
            ))}
          </div>
        ) : (
          <div className="flex items-stretch gap-6">
            {controlled.length === 0 ? null : (
              <ul className="grid min-w-0 flex-1 grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 pt-14">
                {controlled.map((group) => (
                  <li key={group.systemId}>
                    <SystemGroup projectId={projectId} group={group} displays={displays} level={level} />
                  </li>
                ))}
              </ul>
            )}
            {monitored.length === 0 ? null : (
              // The monitoring lane: each life-safety system apart from the others, behind a hairline, its link rising
              // straight to the design level (rule 11; 7.1-r18: "drawn as a separate system with a one-way monitoring link").
              <ul data-monitoring-lane="" className={`flex shrink-0 items-start gap-3 ${controlled.length === 0 ? '' : 'border-l border-(--sov-border) pl-6'}`}>
                {monitored.map((group) => (
                  <li key={group.systemId} className="w-[248px]">
                    <SystemGroup projectId={projectId} group={group} displays={displays} level={level} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export function TopologyPage() {
  const { projectId } = useWizard();
  const { level, setLevel } = useLevelSelection();
  const [system, setSystem] = useSystemSelection();
  const { state, data, reload } = useWorkspaceView('workspace.topology', {
    query: { level },
  });
  const kept = useKept(data);
  const view = kept.data?.view;
  const displays = kept.displays;

  // A focus the page moves itself (WCAG 2.4.3): the page's main region when it opens.
  useEffect(() => {
    document.getElementById('main')?.focus({ preventScroll: true });
  }, []);

  // A floor selection the register does not hold (stale, or no floor structure known) is dropped: nothing hides behind it.
  const dropLevel = useCallback(() => setLevel(undefined), [setLevel]);
  useHeldLevel(view?.levels, level, dropLevel);

  // A system filter on a system with no group (decided out meanwhile) is dropped too.
  const systems = view?.groups.map((group) => group.systemId) ?? [];
  const chosenSystem = system !== undefined && systems.includes(system) ? system : undefined;

  const actions =
    view === undefined ? undefined : (
      <div className="flex flex-wrap items-start justify-end gap-3">
        <FloorFilter projectId={projectId} levels={view.levels} displays={displays} level={level} onChange={setLevel} />
        {systems.length === 0 ? null : <SystemFilter systems={systems} name={TOPO.filters.system} allLabel={TOPO.filters.allSystems} system={chosenSystem} onChange={setSystem} />}
      </div>
    );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={TOPO.title} subtitle={TOPO.subtitle} {...(actions === undefined ? {} : { actions })} />
      {state.status === 'loading' && view === undefined ? (
        <div className="border-t border-(--sov-border) py-5" data-loading-frame="topology">
          <Loading label={copy.app.loading} align="start" />
        </div>
      ) : null}
      {state.status === 'failed' ? <LoadFailed message={copy.workspace.frame.loadFailed} onRetry={() => void reload()} /> : null}
      {view === undefined ? null : <LogicalView projectId={projectId} view={view} displays={displays} system={chosenSystem} level={level} busy={state.status === 'loading'} />}
    </div>
  );
}
