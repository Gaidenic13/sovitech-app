/**
 * The phase 6 services: the Metrics pages and the "Export Report" PDF (docs/adr/0052-metrics-pages-and-series.md;
 * the contract: packages/view-model/src/browser/contract/metrics.ts). Each runs in the requesting user's own request on
 * a project that user may see (row-level security: another project reads as not found, rule 13), reads what the stored
 * proposal and the workspace read (one derive, one resolver: G2-7), and answers the contract's envelope with the
 * project header (the demo line from the project's flag only, rule 10).
 *
 * Rules kept here (each cites its source; ADR 0052 says more):
 * - **Which snapshot**: Financial Overview, CAPEX, Payback and Lifecycle read one stored version (prompt 3 5.2
 *   "Metrics pages show the one stored proposal snapshot"): the latest (`readProposalVersions`' first), or the one
 *   `?snapshot=` names when it is the project's (else 404, rule 13); its build input is the stored proposal's own
 *   (`proposalInputOf` of ../proposal/service.ts: the same snapshot rows, candidates, staleness, stages and catalogue),
 *   so a Metrics value the proposal also shows is the proposal's own display (G2-7). No stored version: the builders
 *   answer "Not available yet: a generated preliminary proposal".
 * - **OPEX & Savings** reads the project's state now (`readProjectState`), never a snapshot (R-095: the building's
 *   operating cost before any BMS); nothing is computed per year (D-27).
 * - **Print views** (`metrics.payback.print`, `metrics.lifecycle.print`): the page's view of the named snapshot with no
 *   action on any display (a printed page has no button: ADR 0050 decision 1), as `proposalPrintView` strips them.
 * - **Export Report** (`exports.metrics`, R-121): the page printed from the web's print route of the named snapshot by
 *   the API's one printer (ADR 0050, extended: the printer prints a Metrics print path), with the requester's session
 *   only; a direct download, no generated output recorded (D-06; proposal 7.2.25), so Reports does not list it; `503
 *   export_unavailable` when the printer or the web origin is missing or the print fails.
 * - No document text, excerpt or file name in a log (rule 13): codes and ids only.
 *
 * Built in phase 6: the four snapshot pages, their two print views and OPEX & Savings (the API builder), and
 * `metricsExport` (the integrator, in the print builder's place).
 */
import { readProposalVersions } from '@sovitech/db';
import { OUTPUT } from '@sovitech/registry';
import type { GateSource } from '@sovitech/registry/gates';
import type {
  CapexResponse,
  DisplayObject,
  FinancialOverviewResponse,
  LifecycleResponse,
  MetricsExportPage,
  MetricsPrintQuery,
  MetricsQuery,
  OpexResponse,
  PaybackResponse,
  ProjectHeader,
} from '@sovitech/view-model/browser';
import {
  EXPORT_FILE_NAMES,
  capexView,
  financialOverviewView,
  lifecycleView,
  opexView,
  outputAvailability,
  outputMissingItems,
  paybackView,
  type Built,
  type MetricsBuildInput,
  type ProposalBuildInput,
} from '@sovitech/view-model/server';
import { inProject } from '../documents/service';
import { ApiRefusal, notFound } from '../errors';
import { ExportUnavailable } from '../proposal/export';
import { EXPORT_UNAVAILABLE, envelope, exportFileNameOf, proposalInputOf, viewContextOf, type FileAnswer, type ProposalScope } from '../proposal/service';
import type { ApiServices } from '../services';
import { intakeFields } from '../wizard/plan';
import { projectHeader } from '../wizard/views';
import { workspaceProjectOf } from '../workspace/service';

/** A display with no action (a printed page has no button: ADR 0050 decision 1). */
function withoutActions(display: DisplayObject): DisplayObject {
  if (display.actions === undefined) return display;
  const copy: DisplayObject = { ...display };
  delete copy.actions;
  return copy;
}

/**
 * One snapshot-reading page: in the requester's own request, the project's state as the stored proposal reads it, the
 * version `?snapshot=` names (one of the project's, else 404: rule 13) or the latest, its build input as the stored
 * proposal's own (G2-7), the page's builder, and the envelope. No stored version: the builder's "Not available yet: a
 * generated preliminary proposal". With `print`, no display carries an action (ADR 0050 decision 1).
 */
async function snapshotPage<View>(
  services: ApiServices,
  gates: GateSource,
  scope: ProposalScope,
  query: MetricsQuery,
  build: (input: MetricsBuildInput) => Built<View>,
  print: boolean,
): Promise<{ asOf: string; project: ProjectHeader; displayObjects: DisplayObject[]; view: View }> {
  return inProject(services, scope, async (request) => {
    const context = await viewContextOf(services, request, gates, scope);
    const versions = await readProposalVersions(request);
    if (query.snapshot !== undefined && !versions.some((version) => version.id === query.snapshot)) throw notFound();
    const snapshotId = query.snapshot ?? versions[0]?.id;
    const proposal: ProposalBuildInput | null = snapshotId === undefined ? null : await proposalInputOf(services, request, context, snapshotId);
    const answer = envelope(context, build({ projectId: scope.projectId, header: projectHeader(context), proposal }));
    return print ? { ...answer, displayObjects: answer.displayObjects.map(withoutActions) } : answer;
  });
}

/** `GET …/metrics/financial-overview` (DB-02; R-088). */
export async function financialOverview(services: ApiServices, gates: GateSource, scope: ProposalScope, query: MetricsQuery): Promise<FinancialOverviewResponse> {
  return snapshotPage(services, gates, scope, query, financialOverviewView, false);
}

/** `GET …/metrics/capex` (DB-13; R-089). */
export async function capex(services: ApiServices, gates: GateSource, scope: ProposalScope, query: MetricsQuery): Promise<CapexResponse> {
  return snapshotPage(services, gates, scope, query, capexView, false);
}

/**
 * `GET …/metrics/opex` (DB-12; R-095): the project now, as the workspace reads it (no snapshot: the building's cost
 * before any BMS), and what an estimate of a new building's energy cost would wait for: the annual energy consumption's
 * own line as step 8 plans it now (`outputAvailability` and `outputMissingItems`: the SOVITECH datasets, then each
 * first-estimate input still missing, with its Add action; US-FIN-13 AC9; phase 6 part B, V-4).
 */
export async function opex(services: ApiServices, gates: GateSource, scope: ProposalScope): Promise<OpexResponse> {
  return inProject(services, scope, async (request) => {
    const context = await viewContextOf(services, request, gates, scope);
    const project = workspaceProjectOf(context.state, context.plan, gates);
    const fields = intakeFields(context.state);
    const plan = outputAvailability({ fields, closedGates: new Set(context.gates.keys()) }).find((entry) => entry.output === OUTPUT.annualEnergy);
    if (plan === undefined) throw new Error('the registry declares no formula of the annual energy consumption');
    const items = outputMissingItems(plan, fields);
    return envelope(context, opexView({ header: projectHeader(context), project, newBuildEstimate: { names: items.names, actions: items.actions } }));
  });
}

/** `GET …/metrics/payback`, and with `print` its print view (no action on any display) (DB-21; R-096, R-121). */
export async function payback(services: ApiServices, gates: GateSource, scope: ProposalScope, query: MetricsQuery, print: boolean): Promise<PaybackResponse> {
  return snapshotPage(services, gates, scope, query, paybackView, print);
}

/** `GET …/metrics/lifecycle`, and with `print` its print view (no action on any display) (DB-22; R-097, R-121). */
export async function lifecycle(services: ApiServices, gates: GateSource, scope: ProposalScope, query: MetricsQuery, print: boolean): Promise<LifecycleResponse> {
  return snapshotPage(services, gates, scope, query, lifecycleView, print);
}

/**
 * `GET …/exports/metrics/:page?snapshot=` (R-121): the page's PDF, printed from the web's print route of the named
 * snapshot with the requester's own session (ADR 0050, amended in phase 6). `signal` is aborted when the requester went
 * away: the printer then never opens a page for it, or closes the one it opened.
 *
 * The named version must be one of the project's, read in the requester's own request before anything is printed (an
 * unknown one, or another project's, is not found: rule 13). No generated output is recorded (D-06; proposal 7.2.25):
 * the file goes to the response only, never to disk (ADR 0050 decision 3). No printer, no web origin, or a print that
 * fails answers 503 `export_unavailable` with the proposal's own words (rule 7: nothing is lost; the owner can try
 * again); the reason is logged as a code (rule 13). The file is named by the page and the version's generation time.
 */
export async function metricsExport(
  services: ApiServices,
  scope: ProposalScope,
  page: MetricsExportPage,
  query: MetricsPrintQuery,
  session: { readonly cookieHeader: string; readonly signal?: AbortSignal },
): Promise<FileAnswer> {
  const version = await inProject(services, scope, async (request) => (await readProposalVersions(request)).find((entry) => entry.id === query.snapshot));
  if (version === undefined) throw notFound();
  const { printer, webOrigin } = services;
  if (printer === undefined || webOrigin === undefined) throw new ApiRefusal(503, 'export_unavailable', EXPORT_UNAVAILABLE);
  let body: Uint8Array;
  try {
    body = await printer.print({
      webOrigin,
      cookieHeader: session.cookieHeader,
      projectId: scope.projectId,
      snapshotId: version.id,
      metricsPage: page,
      ...(session.signal === undefined ? {} : { signal: session.signal }),
    });
  } catch (error) {
    services.log({ event: 'export_failed', code: error instanceof ExportUnavailable ? error.reason : 'export_failed', projectId: scope.projectId });
    throw new ApiRefusal(503, 'export_unavailable', EXPORT_UNAVAILABLE);
  }
  return { contentType: 'application/pdf', fileName: exportFileNameOf(version.createdAt, EXPORT_FILE_NAMES[page]), body };
}
