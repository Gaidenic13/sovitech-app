/**
 * What the Metrics pages share (phase 6; docs/adr/0052-metrics-pages-and-series.md; the contract's metrics.ts): reading
 * the page's view, its states, the version line, the tiles, rows and chart panels over served display objects, and
 * Export Report.
 *
 * - **Reading** (`useMetricsView`): the page's route with the version the address names (`?snapshot=<id>`, the
 *   project's own only: the API answers another's as not found, rule 13), or the latest; the envelope published to
 *   the frame (the demo line in its footer: rule 10); the render marker once the answer is in; the focus taken to the
 *   page's main region when it opens (WCAG 2.4.3).
 * - **States** (`MetricsStates`; prompt 3 section 11): loading (one polite line, no figure: R-003), failed (what could
 *   not be loaded, "Try again"), a version that is not this project's (it says so, with the way to the latest), and no
 *   stored proposal (the served "Not available yet: a generated preliminary proposal", with the action that opens the
 *   Proposal page: rule 7). An id in the address that is no id is never sent.
 * - **Values**: every value through the one component its display calls for (../../../proposal/values.tsx `Shown`,
 *   `ProposalPrice`): "Not available yet" naming what is missing with the owner's Adds (each opens step 8's inline ask,
 *   as on the stored proposal: R-012), Unknown, a line, a value with its badge, a price with the stage the server read
 *   from stored records (rule 10). The web formats, computes and names no figure, and shows no stage of its own.
 * - **Charts** (`ChartPanel`): the kit's SeriesChart over a served series: one "Not available yet" line while no
 *   formula declares it (G1-31); marks, gaps and a table view when it has figures (G1-5, G9-9).
 * - **Export Report** (R-121; docs/adr/0052 decision 7): the page's PDF of the snapshot shown, read from
 *   `exports.metrics`; one request per press, never disabled, a polite line while it is prepared, the failure beside it.
 *
 * Undesigned states (the loading, failure, version and no-proposal states; the "Not available yet" chart panel) are
 * drawn per the frontend-design skill within the brand: the page's own title stays in place, one quiet line says what
 * is happening, and nothing stands in for a figure (no skeleton, no zero, no dash).
 */
import { Button, FieldError, MetricPanel, MetricTile, NotAvailableYet, PageHeader, SeriesChart, SeriesViewSwitch, Value, type IconComponent, type SeriesChartLabels, type SeriesView } from '@sovitech/ui';
import { ArrowRight, FileDown } from 'lucide-react';
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { UUID_PATTERN, pathOf, type MetricsExportPage, type Price as PriceRecord, type Series, type WorkspaceAction } from '@sovitech/view-model/browser';
import { ApiError, isSignedOut } from '../../../api/client';
import { useLoad, type LoadState } from '../../../api/use-load';
import { copy } from '../../../copy';
import { LoadFailed, Loading } from '../../../pages/PageState';
import { saveFile } from '../../../proposal/download';
import { useAddField } from '../../../proposal/StoredProposalPage';
import { ProposalPrice, Shown, type AddAction } from '../../../proposal/values';
import { useOnSignedOut } from '../../../session/SessionProvider';
import { useRenderReady } from '../../../shell/render-ready';
import { useWizard, type ScreenEnvelope } from '../../../wizard/WizardProvider';
import { useInFlight } from '../../../wizard/use-in-flight';
import { indexDisplays, type Displays } from '../../../wizard/use-step-view';
import { workspaceActionPath } from '../../navigation';
import { ActionLink } from '../topology/ViewFilter';

const MET = copy.metrics;

/** The search parameter naming the stored version a page shows (the contract's `MetricsQuerySchema`). */
export const SNAPSHOT_PARAM = 'snapshot';

/** The version the address names: an id, none (the latest), or a value that is no id (never sent; shown as not found). */
export function snapshotOfSearch(search: URLSearchParams): { readonly kind: 'latest' } | { readonly kind: 'named'; readonly id: string } | { readonly kind: 'invalid' } {
  const raw = search.get(SNAPSHOT_PARAM);
  if (raw === null || raw === '') return { kind: 'latest' };
  return UUID_PATTERN.test(raw) ? { kind: 'named', id: raw } : { kind: 'invalid' };
}

/** The page column's focus when a page opens (WCAG 2.4.3), as every workspace page does. */
export function useFocusMain(): void {
  useEffect(() => {
    document.getElementById('main')?.focus({ preventScroll: true });
  }, []);
}

export interface MetricsLoad<T extends ScreenEnvelope> {
  readonly projectId: string;
  readonly state: LoadState<T>;
  readonly data: T | undefined;
  readonly displays: Displays;
  readonly reload: () => void;
  /** The address names a version this project does not hold (the API's 404), or a version that is no id; never when it names none (A-10). */
  readonly notFound: boolean;
}

/**
 * Reads a Metrics page's view (see the header): its route with the named version, or the latest. `load` is the page's
 * typed client call of its own route (the version passed as its `snapshot` query). OPEX & Savings reads no version
 * (`readsSnapshot: false`): the address's `snapshot` is not its, and its refusals are failures, never "not found".
 */
export function useMetricsView<T extends ScreenEnvelope>(
  load: (projectId: string, snapshot: string | undefined, signal: AbortSignal) => Promise<T>,
  options: { readonly readsSnapshot?: boolean } = {},
): MetricsLoad<T> {
  const { projectId, publishEnvelope } = useWizard();
  const [search] = useSearchParams();
  const readsSnapshot = options.readsSnapshot ?? true;
  const named = readsSnapshot ? snapshotOfSearch(search) : ({ kind: 'latest' } as const);
  const snapshot = named.kind === 'named' ? named.id : undefined;
  const invalid = named.kind === 'invalid';
  // An address whose version is no id is never sent: it reads as the API's refusal of an unknown version would.
  const { state, reload } = useLoad<T>(
    (signal) => (invalid ? Promise.reject(new ApiError(400, { code: 'request_invalid' })) : load(projectId, snapshot, signal)),
    [projectId, snapshot, invalid],
  );
  const data = state.status === 'loading' ? undefined : state.data;
  useEffect(() => {
    if (data !== undefined) publishEnvelope(data);
  }, [data, publishEnvelope]);
  // A version not in this project only where the address names one (A-10, phase 6 part B): with none named, a 404 means
  // the project itself is not the user's to see (rule 13), and the frame says so; the page reads its plain failure.
  const failedNotFound =
    readsSnapshot && named.kind !== 'latest' && state.status === 'failed' && data === undefined && state.error instanceof ApiError && (state.error.status === 404 || state.error.status === 400);
  useRenderReady(state.status !== 'loading');
  useFocusMain();
  const displays = useMemo(() => indexDisplays(data?.displayObjects ?? []), [data]);
  return { projectId, state, data, displays, reload: () => void reload(), notFound: failedNotFound };
}

/** The address of a Metrics page's latest version: the same page, with no version named. */
function useLatestPath(): string {
  const location = useLocation();
  return location.pathname;
}

/** A version this project does not hold, or no id at all (rule 13 reads both as not found), with the way to the latest. */
export function VersionNotFound() {
  const latest = useLatestPath();
  return (
    <div role="alert" className="flex flex-col items-start gap-3 border-t border-(--sov-border) pt-6" data-metrics-state="not-found">
      <p className="sov-text-body text-(--sov-text-primary)">{MET.versionNotFound}</p>
      <Link to={latest} className="sov-button" data-variant="link" data-size="default" data-icon="true" data-copy-kind="action-label">
        <span>{MET.openLatest}</span>
        <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" focusable="false" />
      </Link>
    </div>
  );
}

/** A workspace action beside a "Not available yet" line (the contract's `WorkspaceAction`): a link to the built page it opens. */
export function WorkspaceActionLinks({ projectId, actions, describedBy }: { readonly projectId: string; readonly actions: readonly WorkspaceAction[]; readonly describedBy?: string }) {
  if (actions.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {actions.map((action) => (
        <ActionLink key={action} to={workspaceActionPath(projectId, action)} {...(describedBy === undefined ? {} : { describedBy })}>
          {copy.workspace.actions[action]}
        </ActionLink>
      ))}
    </div>
  );
}

/** No stored proposal: the served line (rule 7: it names what is missing) and its action, and nothing else (no figure exists). */
export function NoneGenerated({ projectId, line, actions, displays }: { readonly projectId: string; readonly line: string; readonly actions: readonly WorkspaceAction[]; readonly displays: Displays }) {
  const display = displays.get(line);
  const id = useId();
  return (
    <div className="flex max-w-[640px] flex-col items-start gap-4 border-t border-(--sov-border) pt-6" data-metrics-state="none-generated">
      <div id={id}>{display === undefined ? null : <NotAvailableYet display={display} />}</div>
      <WorkspaceActionLinks projectId={projectId} actions={actions} describedBy={id} />
    </div>
  );
}

/** The page's loading and failure states (no figure while loading: R-003; the title stays where it is). */
export function MetricsStates({ load, loadingLabel = MET.loading }: { readonly load: Pick<MetricsLoad<ScreenEnvelope>, 'state' | 'data' | 'notFound' | 'reload'>; readonly loadingLabel?: string }) {
  if (load.notFound) return <VersionNotFound />;
  if (load.state.status === 'loading') {
    return (
      <div className="border-t border-(--sov-border) pt-6" data-metrics-state="loading">
        <Loading label={loadingLabel} align="start" />
      </div>
    );
  }
  if (load.state.status === 'failed' && load.data === undefined) return <LoadFailed message={MET.loadFailed} onRetry={load.reload} />;
  return null;
}

/** Which stored version the figures come from (bound), and, for an earlier one, the way to the latest (US-PROPOSAL-11 AC3). */
export function VersionLine({ generatedOn, latest, displays }: { readonly generatedOn: string; readonly latest: boolean; readonly displays: Displays }) {
  const date = displays.get(generatedOn);
  const latestPath = useLatestPath();
  return (
    <div className="flex flex-col gap-3" data-metrics-version="">
      {date === undefined ? null : <Value display={date} label={MET.generatedFrom} layout="compact" />}
      {latest ? null : (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-(--sov-radius-surface) border border-(--sov-border) bg-(--sov-surface) px-5 py-4" data-earlier-version="">
          <p className="sov-text-body text-(--sov-text-primary)">{MET.earlierVersion}</p>
          <Link to={latestPath} className="sov-button" data-variant="link" data-size="default" data-icon="true" data-copy-kind="action-label">
            <span>{MET.openLatest}</span>
            <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" focusable="false" />
          </Link>
        </div>
      )}
    </div>
  );
}

/** The owner's Add on a "Not available yet" line: opens step 8 at that field's inline ask (R-012), as on the stored proposal. */
export function useAdd(): (action: AddAction) => void {
  const onAdd = useAddField();
  return (action: AddAction) => onAdd(action.field.fieldKey);
}

/**
 * A tile of one served value (its label the group's name; the value's Adds described by it: DR-1). `children` adds what
 * follows the value (an owner action), given the label's id for its description.
 */
export function ValueTile({
  label,
  icon,
  valueId,
  displays,
  onAdd,
  children,
}: {
  readonly label: string;
  readonly icon?: IconComponent;
  readonly valueId: string;
  readonly displays: Displays;
  readonly onAdd?: (action: AddAction) => void;
  readonly children?: (labelId: string) => ReactNode;
}) {
  const labelId = useId();
  return (
    <MetricTile label={label} labelId={labelId} {...(icon === undefined ? {} : { icon })}>
      <Shown display={displays.get(valueId)} label={null} describedBy={labelId} {...(onAdd === undefined ? {} : { onAdd })} />
      {children?.(labelId)}
    </MetricTile>
  );
}

/** A tile of an investment figure through the one Price component (the stage read from stored records: rule 10; G10-15). */
export function PriceTile({ label, icon, price, displays, onAdd, children }: { readonly label: string; readonly icon?: IconComponent; readonly price: PriceRecord; readonly displays: Displays; readonly onAdd: (action: AddAction) => void; readonly children?: ReactNode }) {
  const labelId = useId();
  return (
    <MetricTile label={label} labelId={labelId} {...(icon === undefined ? {} : { icon })}>
      <ProposalPrice price={price} displays={displays} onAdd={onAdd} describedBy={labelId} />
      {children}
    </MetricTile>
  );
}

/**
 * The cost per square metre beside the investment (the approved tile's caption; R-087): its served display, named. Under
 * a hairline inside a tile (`divided`), or on its own beside Total CAPEX.
 */
export function CostPerAreaCaption({ valueId, displays, divided = false }: { readonly valueId: string; readonly displays: Displays; readonly divided?: boolean }) {
  const labelId = useId();
  return (
    <div role="group" aria-labelledby={labelId} className={`flex min-w-0 flex-col gap-2 ${divided ? 'border-t border-(--sov-border) pt-3' : ''}`} data-cost-per-area="">
      <p id={labelId} className="sov-text-caption">
        {MET.costPerAreaCaption}
      </p>
      <Shown display={displays.get(valueId)} label={null} />
    </div>
  );
}

/** Rows of named values inside a panel (ENVIRONMENTAL IMPACT): each a group named by its label, its icon beside it. */
export function ValueRows({ rows, displays, onAdd }: { readonly rows: ReadonlyArray<{ readonly key: string; readonly label: string; readonly icon: IconComponent; readonly valueId: string }>; readonly displays: Displays; readonly onAdd?: (action: AddAction) => void }) {
  return (
    <div className="flex flex-col">
      {rows.map((row) => (
        <ValueRow key={row.key} label={row.label} icon={row.icon} valueId={row.valueId} displays={displays} {...(onAdd === undefined ? {} : { onAdd })} />
      ))}
    </div>
  );
}

function ValueRow({ label, icon: Glyph, valueId, displays, onAdd }: { readonly label: string; readonly icon: IconComponent; readonly valueId: string; readonly displays: Displays; readonly onAdd?: (action: AddAction) => void }) {
  const labelId = useId();
  return (
    <div role="group" aria-labelledby={labelId} className="grid grid-cols-[24px_minmax(0,1fr)] items-start gap-x-3 gap-y-2 border-t border-(--sov-border) py-4 first:border-t-0 first:pt-0 last:pb-0">
      <span className="row-span-2 pt-0.5 text-(--sov-text-tertiary)">
        <Glyph size={20} strokeWidth={1.5} aria-hidden="true" focusable="false" />
      </span>
      <p id={labelId} className="sov-text-caption">
        {label}
      </p>
      <Shown display={displays.get(valueId)} label={null} describedBy={labelId} {...(onAdd === undefined ? {} : { onAdd })} />
    </div>
  );
}

/** One row of a panel's list: a name on the left, its served value on the right (the stored proposal's rows). */
export function NamedRow({ name, children, attributes }: { readonly name: ReactNode; readonly children: (nameId: string) => ReactNode; readonly attributes?: Readonly<Record<string, string>> }) {
  const nameId = useId();
  return (
    <li className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start gap-4 border-t border-(--sov-border) py-3 first:border-t-0 first:pt-0" {...attributes}>
      <div id={nameId} className="sov-text-body text-(--sov-text-primary)" data-indicator-name="">
        {name}
      </div>
      <div className="min-w-0">{children(nameId)}</div>
    </li>
  );
}

/** The table view's and the total's words for a chart of `columns` (catalogue copy). */
export function chartLabels(name: string, point: keyof typeof MET.chart.columns, value: keyof typeof MET.chart.columns): SeriesChartLabels {
  return { name, pointColumn: MET.chart.columns[point], valueColumn: MET.chart.columns[value], total: MET.chart.total, showTable: MET.showTable, showChart: MET.showChart };
}

/** A served series in the kit's chart (one "Not available yet" line, or marks, gaps and a table view). */
export function ServedChart({ series, displays, labels, onAdd, describedBy }: { readonly series: Series; readonly displays: Displays; readonly labels: SeriesChartLabels; readonly onAdd: (action: AddAction) => void; readonly describedBy?: string }) {
  return <SeriesChart series={series} displays={displays} labels={labels} onAdd={onAdd} {...(describedBy === undefined ? {} : { describedBy })} />;
}

/**
 * A panel holding one chart, named by its heading (the chart's Adds described by it: DR-1), with the chart's view switch
 * in the panel's header while the series has figures (a series that is not available has nothing to tabulate).
 */
export function ChartPanel({ heading, series, displays, labels, onAdd, children }: { readonly heading: string; readonly series: Series; readonly displays: Displays; readonly labels: SeriesChartLabels; readonly onAdd: (action: AddAction) => void; readonly children?: ReactNode }) {
  const headingId = useId();
  const bodyId = useId();
  const [view, setView] = useState<SeriesView>('chart');
  return (
    <MetricPanel
      heading={heading}
      headingId={headingId}
      {...(series.state === 'figures' ? { actions: <SeriesViewSwitch view={view} onChange={setView} labels={labels} controls={bodyId} /> } : {})}
    >
      <SeriesChart series={series} displays={displays} labels={labels} onAdd={onAdd} describedBy={headingId} control={{ view, bodyId }} />
      {children}
    </MetricPanel>
  );
}

/** A panel of one served value (KEY INSIGHTS, EQUIPMENT LIFECYCLE, OPEX BREAKDOWN). */
export function ValuePanel({ heading, valueId, displays, onAdd }: { readonly heading: string; readonly valueId: string; readonly displays: Displays; readonly onAdd?: (action: AddAction) => void }) {
  const headingId = useId();
  return (
    <MetricPanel heading={heading} headingId={headingId}>
      <Shown display={displays.get(valueId)} label={null} describedBy={headingId} {...(onAdd === undefined ? {} : { onAdd })} />
    </MetricPanel>
  );
}

/** The path of a Metrics page's PDF of one stored version (`exports.metrics`). */
export function metricsExportPath(projectId: string, page: MetricsExportPage, snapshotId: string): string {
  return `${pathOf('exports.metrics', { projectId, page })}?${new URLSearchParams({ snapshot: snapshotId }).toString()}`;
}

/**
 * "Export Report" (R-121; US-REPORTS-13; docs/adr/0052 decision 7): the page of the snapshot shown, printed by the API
 * from its print route and saved as a PDF. Never disabled (rule 7): a press while one is on its way is ignored, with
 * `aria-busy` and a polite line; a failure (the printer's `503 export_unavailable`, a refusal, the API unreachable)
 * says so beside the button, which takes presses again. A signed-out session shows sign-in (rule 13).
 */
export function ExportReport({ projectId, page, snapshotId }: { readonly projectId: string; readonly page: MetricsExportPage; readonly snapshotId: string }) {
  const exporting = useInFlight();
  const onSignedOut = useOnSignedOut();
  const [failed, setFailed] = useState(false);
  const errorId = useId();
  const save = () => {
    void exporting.run(async () => {
      setFailed(false);
      try {
        await saveFile(metricsExportPath(projectId, page, snapshotId));
      } catch (error) {
        if (isSignedOut(error)) {
          onSignedOut();
          return;
        }
        setFailed(true);
      }
    });
  };
  return (
    <div className="relative flex flex-col items-end" data-export-report={page}>
      <Button variant="secondary" icon={FileDown} aria-busy={exporting.busy} aria-describedby={failed ? errorId : undefined} onClick={save}>
        {MET.exportReport}
      </Button>
      {/* Under the button, out of the header's flow, so the title keeps its place whatever the lines say (DR-16). */}
      <div className="absolute top-full right-0 z-10 mt-2 flex w-max max-w-[440px] flex-col items-end gap-1" data-export-messages="">
        <p role="status" aria-live="polite" className="sov-text-small">
          {exporting.busy ? MET.exporting : ''}
        </p>
        {failed ? (
          <div role="alert">
            <FieldError id={errorId} message={MET.exportFailed} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** A Metrics page's header: the approved eyebrow where the screen draws one, the title, the draft subtitle, the controls. */
export function MetricsHeader({ eyebrow, title, subtitle, actions }: { readonly eyebrow?: string; readonly title: string; readonly subtitle: string; readonly actions?: ReactNode }) {
  return <PageHeader {...(eyebrow === undefined ? {} : { eyebrow })} title={title} subtitle={subtitle} actionsAlign="start" {...(actions === undefined ? {} : { actions })} />;
}
