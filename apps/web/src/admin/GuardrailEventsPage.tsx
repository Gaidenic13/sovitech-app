/**
 * UD-41: guardrail event counts, each speed metric beside its truth metric, the confidence calibration counts and the
 * erasure log, read-only (PRD R-151; R-152 and R-155 "Until decided"; D-34's interim; US-ADMIN-20 to US-ADMIN-23,
 * US-ADMIN-24 AC1; the contract's `admin.guardrailEvents`; docs/adr/0053 decision 7, docs/adr/0054; cases GS-2, G3-26,
 * G13-15, rendered halves).
 *
 * - **Events by type** (R-151; guardrails section 8): one ruled table, a row for all projects and a row for each
 *   project (by its id; the demo's row with its served demo line), a column for each event type of section 8 in its
 *   order. Every count is the API's, bound: a count read from the store is a count, a count of none included. Under it,
 *   the served line for the split by release ("not counted yet": no release is recorded with the events).
 * - **Speed and truth** (guardrails section 4, "Measure it": "Each speed metric is read next to a truth metric"): for
 *   each project, its three pairs on three rows, the speed metric's name, value and target on the left half and its
 *   truth metric's on the right, so neither is read alone. A metric no stored record counts reads the served "not
 *   counted yet", never an estimate or a zero, and every target the served "Target not set" (D-34's interim; rule 1).
 * - **Confidence wording** (rule 3; R-152 "Until decided"; ADR 0054): the threshold's state as served (not set while
 *   the approver has not set it), then for each tier the wording it shows and the corrections counted per item type.
 *   No control sets, lowers or changes the threshold (guardrails section 10; G3-26).
 * - **Erasure log** (R-151; rule 13, "Erasure"; G13-15): one entry per erased document, newest first: the project, the
 *   document by its id (never its file name), who asked and in which role, when, and what was removed, as counts. No
 *   document text or excerpt is served or shown.
 *
 * No control widens a tolerance, allows estimation, raises the budget or changes a threshold: "Metrics prompt a review,
 * never an edit" (guardrails section 10; US-ADMIN-21 AC3; US-ADMIN-22 AC4). The page names, counts and rounds nothing
 * of its own.
 *
 * Undesigned (no approved screen): the area's grammar (./admin-view.tsx). Its one distinctive form is the speed and
 * truth table: each row is one pair, split by a hairline into a "Speed" half and a "Truth" half under two column-group
 * headings, so the reading the guardrails ask for (speed beside truth) is the table's shape. Native tables with headers
 * throughout (scope on every header; row groups for a project's three pairs and a tier's item types).
 */
import { Fragment, useId, type ReactNode } from 'react';
import { RegisterTable, StatusLine, type RegisterColumn } from '@sovitech/ui';
import { ADMIN_GUARDRAIL_EVENT_TYPES, type AdminGuardrailEventsResponse, type ErasureEntry, type GuardrailEventsView } from '@sovitech/view-model/browser';
import { request } from '../api/client';
import { copy } from '../copy';
import type { Displays } from '../wizard/use-step-view';
import { AdminPage, AdminSection, AdminStates, BoundText, ProjectCell, Shown, ShownAtEnd, useAdminView } from './admin-view';

const GE = copy.admin.guardrailEvents;

type CountRow = GuardrailEventsView['projects'][number];
type MetricRow = GuardrailEventsView['metrics'][number];
type MetricCell = MetricRow['pairs'][number]['speed'];
type TierRow = GuardrailEventsView['calibration']['tiers'][number];

/** The counts table's rows: all projects first, then each project in the order served. */
type CountsTableRow = { readonly kind: 'all'; readonly counts: GuardrailEventsView['totals'] } | ({ readonly kind: 'project' } & CountRow);

// ---------------------------------------------------------------------------------------------
// Events by type
// ---------------------------------------------------------------------------------------------

function CountsTable({ view, displays }: { readonly view: GuardrailEventsView; readonly displays: Displays }) {
  const rows: CountsTableRow[] = [{ kind: 'all', counts: view.totals }, ...view.projects.map((row) => ({ kind: 'project' as const, ...row }))];
  const columns: RegisterColumn<CountsTableRow>[] = [
    {
      kind: 'content',
      id: 'project',
      header: GE.project,
      rowHeader: true,
      cell: (row) => (row.kind === 'all' ? <span className="block min-w-[168px] font-medium">{GE.total}</span> : <ProjectCell displays={displays} valueId={row.id} row={row} />),
    },
    ...ADMIN_GUARDRAIL_EVENT_TYPES.map(
      (type): RegisterColumn<CountsTableRow> => ({
        kind: 'content',
        id: type,
        header: GE.type[type],
        align: 'end',
        cell: (row) => {
          const count = row.counts.find((entry) => entry.type === type);
          return count === undefined ? null : <ShownAtEnd displays={displays} valueId={count.count} />;
        },
      }),
    ),
  ];
  return (
    // The type names are long: each heading wraps in its own narrow column, so the eleven columns sit in the page column.
    <div className="min-w-0 [&_.sov-register\_\_head]:align-bottom [&_.sov-register\_\_head]:whitespace-normal [&_.sov-register\_\_head[data-align=end]]:min-w-[84px]" data-admin-counts="">
      <RegisterTable label={GE.counts} columns={columns} rows={rows} rowKey={(row) => (row.kind === 'all' ? 'all' : row.projectId)} />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Speed and truth
// ---------------------------------------------------------------------------------------------

const HEAD = 'sov-register__head align-bottom whitespace-normal';
const CELL = 'sov-register__cell';
/** The hairline between a pair's speed half and its truth half: on the left edge only, so every other edge keeps the table's hairline. */
const SPLIT = 'border-l border-l-(--sov-border-hover)';
/** The two halves' headings ("Speed", "Truth") read as the table's structure: the primary text at weight 500, above the muted column headings. */
const GROUP = 'text-(--sov-text-primary) text-[14px]';

type Half = 'speed' | 'truth';

/**
 * One half of a pair: the metric's name, its value and its target. Each value cell names its headers explicitly
 * (`headers`): its column, its half, its metric and its project, so a screen reader reads "Truth, Value, Owner correction
 * rate on inferences, <project>" and never the other half's metric.
 */
function MetricCells({ cell, half, ids, displays }: { readonly cell: MetricCell; readonly half: Half; readonly ids: { readonly table: string; readonly project: string }; readonly displays: Displays }) {
  const metricId = `${ids.project}-${cell.metric}`;
  const headers = (column: 'value' | 'target') => [`${ids.table}-${half}`, `${ids.table}-${half}-${column}`, metricId, ids.project].join(' ');
  return (
    <>
      <th id={metricId} headers={`${ids.table}-${half} ${ids.table}-${half}-metric ${ids.project}`} className={`${CELL} min-w-[168px] font-normal text-(--sov-text-tertiary) ${half === 'truth' ? SPLIT : ''}`} data-metric={cell.metric}>
        {GE.metric[cell.metric]}
      </th>
      <td headers={headers('value')} className={`${CELL} min-w-[136px]`} data-metric-value={cell.metric}>
        <Shown displays={displays} valueId={cell.value} />
      </td>
      <td headers={headers('target')} className={`${CELL} min-w-[128px]`} data-metric-target={cell.metric}>
        <Shown displays={displays} valueId={cell.target} />
      </td>
    </>
  );
}

function MetricsTable({ view, displays }: { readonly view: GuardrailEventsView; readonly displays: Displays }) {
  const table = useId();
  const head = (half: Half) => (
    <>
      <th id={`${table}-${half}-metric`} scope="col" className={`${HEAD} ${half === 'truth' ? SPLIT : ''}`}>
        {GE.metricColumn}
      </th>
      <th id={`${table}-${half}-value`} scope="col" className={HEAD}>
        {GE.valueColumn}
      </th>
      <th id={`${table}-${half}-target`} scope="col" className={HEAD}>
        {GE.target}
      </th>
    </>
  );
  return (
    <table className="sov-register__table" data-admin-metrics="">
      <caption className="sov-visually-hidden">{GE.metrics}</caption>
      <thead>
        <tr>
          <th id={`${table}-project`} scope="col" rowSpan={2} className={HEAD}>
            {GE.project}
          </th>
          <th id={`${table}-speed`} scope="colgroup" colSpan={3} className={`${HEAD} ${GROUP}`}>
            {GE.speed}
          </th>
          <th id={`${table}-truth`} scope="colgroup" colSpan={3} className={`${HEAD} ${GROUP} ${SPLIT}`}>
            {GE.truth}
          </th>
        </tr>
        <tr>
          {head('speed')}
          {head('truth')}
        </tr>
      </thead>
      {view.metrics.length === 0 ? (
        <tbody>
          <tr>
            <td colSpan={7} className="sov-register__empty">
              {GE.projectsNone}
            </td>
          </tr>
        </tbody>
      ) : (
        view.metrics.map((row) => {
          const project = `${table}-${row.projectId}`;
          return (
            <tbody key={row.projectId} data-admin-metrics-project={row.projectId}>
              {row.pairs.map((pair, index) => (
                <tr key={pair.speed.metric}>
                  {index === 0 ? (
                    <th id={project} headers={`${table}-project`} rowSpan={row.pairs.length} className={`${CELL} font-normal`}>
                      <ProjectCell displays={displays} valueId={row.id} row={row} />
                    </th>
                  ) : null}
                  <MetricCells cell={pair.speed} half="speed" ids={{ table, project }} displays={displays} />
                  <MetricCells cell={pair.truth} half="truth" ids={{ table, project }} displays={displays} />
                </tr>
              ))}
            </tbody>
          );
        })
      )}
    </table>
  );
}

// ---------------------------------------------------------------------------------------------
// Confidence wording
// ---------------------------------------------------------------------------------------------

function TierRows({ tier, displays }: { readonly tier: TierRow; readonly displays: Displays }) {
  const span = Math.max(tier.items.length, 1);
  const lead: ReactNode = (
    <>
      <th scope="rowgroup" rowSpan={span} className={`${CELL} min-w-[96px] font-medium`}>
        {GE.tiers[tier.tier]}
      </th>
      <td rowSpan={span} className={`${CELL} min-w-[200px]`} data-dropped={tier.dropped ? 'true' : 'false'}>
        <Shown displays={displays} valueId={tier.wording} />
      </td>
    </>
  );
  if (tier.items.length === 0) {
    return (
      <tbody data-tier={tier.tier}>
        <tr>
          {lead}
          <td colSpan={2} className={`${CELL} text-(--sov-text-tertiary)`}>
            {GE.noCorrections}
          </td>
        </tr>
      </tbody>
    );
  }
  return (
    <tbody data-tier={tier.tier}>
      {tier.items.map((item, index) => (
        <tr key={item.fieldKey}>
          {index === 0 ? lead : null}
          <th scope="row" className={`${CELL} min-w-[200px] font-normal`}>
            {/* The item type is the field's key as the registry names it (no value; no number in production keys). */}
            <bdi className="[overflow-wrap:anywhere]">{item.fieldKey}</bdi>
          </th>
          <td className={CELL} data-align="end">
            <ShownAtEnd displays={displays} valueId={item.corrections} />
          </td>
        </tr>
      ))}
    </tbody>
  );
}

function CalibrationTable({ view, displays }: { readonly view: GuardrailEventsView; readonly displays: Displays }) {
  const threshold = displays.get(view.calibration.threshold);
  return (
    <div className="flex min-w-0 flex-col gap-5">
      {threshold === undefined ? null : (
        <div className="max-w-[720px] border-l-2 border-(--sov-border-hover) py-1 pl-4 [&_.sov-status-line]:text-[15px] [&_.sov-status-line]:text-(--sov-text-primary)" data-admin-threshold="">
          <StatusLine display={threshold} />
        </div>
      )}
      <table className="sov-register__table" data-admin-calibration="">
        <caption className="sov-visually-hidden">{GE.calibration}</caption>
        <thead>
          <tr>
            <th scope="col" className={HEAD}>
              {GE.tier}
            </th>
            <th scope="col" className={HEAD}>
              {GE.wording}
            </th>
            <th scope="col" className={HEAD}>
              {GE.itemType}
            </th>
            <th scope="col" className={HEAD} data-align="end">
              {GE.corrections}
            </th>
          </tr>
        </thead>
        {view.calibration.tiers.map((tier) => (
          <TierRows key={tier.tier} tier={tier} displays={displays} />
        ))}
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Erasure log
// ---------------------------------------------------------------------------------------------

function ErasureTable({ view, displays }: { readonly view: GuardrailEventsView; readonly displays: Displays }) {
  const columns: RegisterColumn<ErasureEntry>[] = [
    { kind: 'content', id: 'project', header: GE.project, rowHeader: true, cell: (entry) => <ProjectCell displays={displays} valueId={entry.project} row={entry} /> },
    { kind: 'content', id: 'document', header: GE.document, cell: (entry) => <span className="block min-w-[168px] [overflow-wrap:anywhere]"><BoundText displays={displays} valueId={entry.document} /></span> },
    { kind: 'content', id: 'role', header: GE.roleColumn, cell: (entry) => <span className="whitespace-nowrap">{GE.roles[entry.role]}</span> },
    { kind: 'content', id: 'by', header: GE.who, cell: (entry) => <span className="block min-w-[160px]"><BoundText displays={displays} valueId={entry.by} /></span> },
    { kind: 'content', id: 'at', header: GE.when, cell: (entry) => <div className="whitespace-nowrap"><Shown displays={displays} valueId={entry.at} /></div> },
    { kind: 'content', id: 'removed', header: GE.removed, cell: (entry) => <div className="min-w-[200px]"><Shown displays={displays} valueId={entry.removed} /></div> },
  ];
  return <RegisterTable label={GE.erasures} columns={columns} rows={view.erasures} rowKey={(entry) => entry.documentEventId} empty={<p>{GE.erasuresNone}</p>} />;
}

// ---------------------------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------------------------

function Sections({ data, displays }: { readonly data: AdminGuardrailEventsResponse; readonly displays: Displays }) {
  const { view } = data;
  const byRelease = displays.get(view.byRelease);
  return (
    <Fragment>
      <AdminSection id="admin-counts" heading={GE.counts} intro={GE.countsIntro}>
        <CountsTable view={view} displays={displays} />
        {byRelease === undefined ? null : (
          <div className="[&_.sov-status-line]:text-(--sov-text-tertiary)" data-admin-by-release="">
            <StatusLine display={byRelease} />
          </div>
        )}
      </AdminSection>
      <AdminSection id="admin-metrics" heading={GE.metrics} intro={GE.metricsIntro}>
        <MetricsTable view={view} displays={displays} />
      </AdminSection>
      <AdminSection id="admin-calibration" heading={GE.calibration} intro={GE.calibrationIntro}>
        <CalibrationTable view={view} displays={displays} />
      </AdminSection>
      <AdminSection id="admin-erasures" heading={GE.erasures} intro={GE.erasuresIntro}>
        <ErasureTable view={view} displays={displays} />
      </AdminSection>
    </Fragment>
  );
}

export function GuardrailEventsPage() {
  const load = useAdminView((signal) => request('admin.guardrailEvents', { signal }));
  const { data, displays } = load;
  return (
    <AdminPage title={copy.titles.adminGuardrailEvents} subtitle={GE.subtitle}>
      <AdminStates load={load} />
      {data === undefined ? null : <Sections data={data} displays={displays} />}
    </AdminPage>
  );
}
