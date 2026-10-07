/**
 * The Metrics pages as display objects (phase 6; the contract: ../browser/contract/metrics.ts; decisions:
 * docs/adr/0052-metrics-pages-and-series.md; the build log, phase 6, "Plan").
 *
 * Pure builders over what the API reads in the user's own request:
 * - **Financial Overview, CAPEX, Payback, Lifecycle**: one stored version (`MetricsBuildInput.proposal`, the stored
 *   proposal's own build input). Each builder first builds the stored proposal (`proposalView`) and takes from it every
 *   value it also shows (the headline's price, the indicators, the scope decisions as used, the exclusions), so one value
 *   id has one display on every page (G2-7); then it adds the values only the Metrics pages show, each "Not available
 *   yet", naming what is missing (./copy.ts METRICS_MISSING), and its series (./series.ts). With no stored proposal:
 *   "Not available yet: a generated preliminary proposal" with `open_proposal`, and nothing else.
 * - **OPEX & Savings**: the project as the workspace reads it now (`OpexBuildInput`).
 * Every value through the one resolver or the formatting module; every number in a line bound; no copy that 2.8 or the
 * rules do not write (badges, status lines, stage labels, rule lines from the registry; ./copy.ts for the rest).
 *
 * What a builder never does (each with its source): a zero, a dash, a blank or an empty card for a missing value (rule
 * 1; rule 7; G7-24); a share of ranges (US-FIN-05 AC3: left out); a chart point, bar or axis for a series that is not
 * available (G1-31); a gap drawn as a zero (G1-5); a stage the stored records do not give (rule 10; G10-15); a live
 * value, an ROI, a value driver, a benchmark or an achieved saving (R-088, R-095, R-096, R-097); "OPEX" alone as a
 * value's label (7.1.1-S8); a cost, savings, operating-cost or lifecycle line for an excluded system (G10-7); a chart
 * with figures beside a figure that is not its own formula's (G9-9; phase 6 part B, V-2 and A-4: `METRICS_SERIES`'
 * `beside`); a count standing in for a scope decision that was not recorded (rule 1; V-3).
 *
 * The page builders take their series requests as a second argument, `METRICS_SERIES` by default: the API passes none.
 * The test runner may point a request at a TEST series (G9-9's page half: prompt 3 5.4, TEST series in the test runner
 * only); a TEST series exists only in a TEST catalogue (the engine's `checkSeries`), so no production page can draw one.
 */
import { OUTPUT, SYSTEMS, scopeFieldKey } from '@sovitech/registry';
import { MISSING } from '../workspace/copy';
import type {
  CapexResponse,
  DisplayObject,
  FinancialOverviewResponse,
  LifecycleResponse,
  OpexResponse,
  PaybackResponse,
  Price,
  ProposalView,
  ValueId,
} from '../browser/contract';
import { DEFAULT_FORMAT_OPTIONS } from '../formatting';
import type { ProposalBuildInput } from '../proposal/inputs';
import { Displays, inputsMissingOf, proposalValueId, proposalView, usedScopeOf } from '../proposal/view';
import { projectValueId, resolveCount, resolveLine } from '../resolver';
import type { Built } from '../workspace/inputs';
import { storedDecision } from '../workspace/scope';
import { unknownDisplay, valueIdFor } from '../workspace/shared';
import { METRICS_MISSING } from './copy';
import { MetricsNotBuilt, type MetricsBuildInput, type OpexBuildInput } from './inputs';
import { seriesView, type BuiltSeries, type SeriesRequest } from './series';

export { METRICS_MISSING, SERIES_LABELS } from './copy';
export { MetricsNotBuilt, type MetricsBuildInput, type OpexBuildInput } from './inputs';
export { seriesView, snapshotOutputView, type BuiltSeries, type SeriesRequest } from './series';

const FORMAT = DEFAULT_FORMAT_OPTIONS;

/** The series requests of the four snapshot-reading pages, by the page's name for each chart. */
export interface MetricsSeriesRequests {
  readonly bySystem: SeriesRequest;
  readonly byLevel: SeriesRequest;
  readonly annualCashFlow: SeriesRequest;
  readonly cumulativeCashFlow: SeriesRequest;
  readonly savingsByStream: SeriesRequest;
  readonly lifecycleComparison: SeriesRequest;
  readonly lifecycleBreakdown: SeriesRequest;
  readonly lifecycleBySystem: SeriesRequest;
}

/**
 * The series the pages ask for (none is declared in production: each reads "Not available yet", G1-31). `beside` (G9-9;
 * phase 6 part B, V-2 and A-4): the investment breakdowns show nothing beside them but their total (`{}`); the cash
 * flows, the savings breakdown and the lifecycle charts stand beside figures no formula of theirs gives yet (the stored
 * proposal's payback, NPV and IRR, the savings and lifecycle lines), so `null`: such a series is refused once declared
 * until its page names the formula's own outputs (P-6-SERIES-SIGNATURES).
 */
export const METRICS_SERIES: MetricsSeriesRequests = Object.freeze<MetricsSeriesRequests>({
  bySystem: { key: 'capex.bySystem', kind: 'breakdown', totalOutput: OUTPUT.preliminaryEstimate, beside: {} },
  byLevel: { key: 'capex.byLevel', kind: 'breakdown', totalOutput: OUTPUT.preliminaryEstimate, beside: {} },
  annualCashFlow: { key: 'cashFlow.annual', kind: 'sequence', totalOutput: null, waitsFor: METRICS_MISSING.cashFlow, beside: null },
  cumulativeCashFlow: { key: 'cashFlow.cumulative', kind: 'sequence', totalOutput: null, waitsFor: METRICS_MISSING.cashFlow, beside: null },
  savingsByStream: { key: 'savings.byStream', kind: 'breakdown', totalOutput: null, waitsFor: METRICS_MISSING.savings, beside: null },
  lifecycleComparison: { key: 'lifecycle.costComparison', kind: 'sequence', totalOutput: null, waitsFor: METRICS_MISSING.lifecycle, beside: null },
  lifecycleBreakdown: { key: 'lifecycle.costBreakdown', kind: 'breakdown', totalOutput: null, waitsFor: METRICS_MISSING.lifecycle, beside: null },
  lifecycleBySystem: { key: 'lifecycle.bySystem', kind: 'breakdown', totalOutput: null, waitsFor: METRICS_MISSING.lifecycle, beside: null },
});

/** A snapshot-reading page while the project has no stored proposal (rule 7: it names what is missing and offers the action). */
function notGenerated(input: Pick<MetricsBuildInput, 'projectId'>): Built<{ readonly state: 'none_generated'; readonly line: ValueId; readonly actions: ['open_proposal'] }> {
  const line = resolveLine(projectValueId(input.projectId, 'metrics.source'), 'not_available_yet_named', { missing: METRICS_MISSING.proposal }, FORMAT, { missing: 'not_available_yet' });
  return { view: { state: 'none_generated', line: line.valueId, actions: ['open_proposal'] }, displayObjects: [line] };
}

/** One stored version as a Metrics page reads it: the stored proposal's view, and the one display set of the response. */
class Page {
  readonly displays = new Displays();
  readonly view: ProposalView;
  private readonly proposalDisplays: ReadonlyMap<ValueId, DisplayObject>;

  constructor(readonly input: ProposalBuildInput) {
    const built = proposalView(input);
    this.view = built.view;
    this.proposalDisplays = new Map(built.displayObjects.map((display) => [display.valueId, display]));
  }

  /** A display the stored proposal serves, under its own value id (G2-7). */
  take(valueId: ValueId): ValueId {
    const display = this.proposalDisplays.get(valueId);
    if (display === undefined) throw new MetricsNotBuilt(`the stored proposal serves no display ${valueId}`);
    return this.displays.add(display);
  }

  /** Which stored version the page shows: its generation date and time, and whether it is the latest. */
  generated(): { readonly state: 'generated'; readonly snapshotId: string; readonly generatedOn: ValueId; readonly latest: boolean } {
    return { state: 'generated', snapshotId: this.view.snapshotId, generatedOn: this.take(this.view.generatedOn), latest: this.view.latest };
  }

  /** The investment the page shows: the stored proposal's headline, its one price (rule 10: the stage from stored records; G10-15). */
  investment(): { readonly output: string; readonly price: Price } {
    const { output, price } = this.view.headline.investment;
    this.take(price.figure);
    return { output, price };
  }

  /** One of the stored proposal's indicators (its own display: "Not available yet", naming what is missing; R-102). */
  indicator(name: ProposalView['indicators'][number]['indicator']): ValueId {
    const found = this.view.indicators.find((entry) => entry.indicator === name);
    if (found === undefined) throw new MetricsNotBuilt(`the stored proposal serves no indicator ${name}`);
    return this.take(found.display);
  }

  /** A value only the Metrics pages show (`proposal:<sid>.metrics.<item>`): "Not available yet", naming what is missing (rule 7). */
  metric(item: string, missing: string): ValueId {
    return this.displays.add(resolveLine(proposalValueId(this.view.snapshotId, `metrics.${item}`), 'not_available_yet_named', { missing }, FORMAT, { missing: 'not_available_yet' }));
  }

  /** A chart series of this version (./series.ts), its displays added to the page's one set, with the figures beside it. */
  series(request: SeriesRequest): BuiltSeries {
    const built = seriesView(this.input, request);
    for (const display of built.displayObjects) this.displays.add(display);
    return built;
  }

  /**
   * CAPEX's "Selected systems" (R-089; US-FIN-21 AC6: "counts the recorded include decisions through the value
   * component, identical to the scope shown elsewhere"): the count of the include decisions as the snapshot used them,
   * the very decisions "Systems" shows (G2-7), bound to its own value id. It counts stored decisions, as the documents
   * stored are counted (the resolver's `resolveCount`), not an engineering quantity. Its unknown policy is to refuse:
   * while any decision as used was not recorded, it reads "Not available yet: systems in scope", with the owner's Add as
   * the stored proposal offers it, never a count standing in for the decisions not made (rule 1; rule 7; V-3).
   */
  selectedSystems(label: string): ValueId {
    const valueId = proposalValueId(this.view.snapshotId, 'metrics.selectedSystems');
    const scope = usedScopeOf(this.input);
    if (scope.unknown.length === 0) return this.displays.add(resolveCount(valueId, scope.include.length, label, FORMAT));
    const missing = inputsMissingOf(this.input, scope.unknown.map((systemId) => scopeFieldKey(systemId)));
    return this.displays.add(
      resolveLine(valueId, 'not_available_yet_named', { missing: missing.names.join('; ') }, FORMAT, { missing: 'not_available_yet', lines: missing.lines, actions: missing.actions }),
    );
  }

  /** The systems the version left out of scope, by their decisions as used (G10-7). */
  exclusions(): ValueId[] {
    return this.view.investment.exclusions.map((decision) => this.take(decision));
  }

  built<View>(view: View): Built<View> {
    return { view, displayObjects: this.displays.list() };
  }
}

/** `metrics.financialOverview` (DB-02; R-088). */
export function financialOverviewView(input: MetricsBuildInput, series: MetricsSeriesRequests = METRICS_SERIES): Built<FinancialOverviewResponse['view']> {
  if (input.proposal === null) return notGenerated(input);
  const page = new Page(input.proposal);
  const generated = page.generated();
  const investment = page.investment();
  const costPerArea = page.metric('costPerArea', METRICS_MISSING.costPerArea);
  const savings = {
    total: page.metric('savings.total', METRICS_MISSING.savings),
    energy: page.metric('savings.energy', METRICS_MISSING.savings),
    operational: page.metric('savings.operational', METRICS_MISSING.savings),
  };
  const costBreakdown = { bySystem: page.series(series.bySystem).series, byBuildingArea: page.series(series.byLevel).series, exclusions: page.exclusions() };
  const annualCashFlow = page.series(series.annualCashFlow);
  // G9-9: beside a cash flow drawn with figures, the payback, NPV and IRR are its formula's own outputs; else the stored
  // proposal's indicators (each "Not available yet", naming what is missing: R-102).
  const indicators = {
    bmsOperatingCost: page.indicator('operating_cost'),
    payback: annualCashFlow.beside['payback'] ?? page.indicator('payback'),
    npv: annualCashFlow.beside['npv'] ?? page.indicator('npv'),
    irr: annualCashFlow.beside['irr'] ?? page.indicator('irr'),
  };
  return page.built({ ...generated, investment, costPerArea, savings, indicators, costBreakdown, annualCashFlow: annualCashFlow.series });
}

/** `metrics.capex` (DB-13; R-089). */
export function capexView(input: MetricsBuildInput, series: MetricsSeriesRequests = METRICS_SERIES): Built<CapexResponse['view']> {
  if (input.proposal === null) return notGenerated(input);
  const page = new Page(input.proposal);
  const generated = page.generated();
  const investment = page.investment();
  const costPerArea = page.metric('costPerArea', METRICS_MISSING.costPerArea);
  const bySystem = page.series(series.bySystem).series;
  const exclusions = page.exclusions();
  // "1. SELECT SYSTEMS": the decisions as the version used them, read-only, with Fire Safety's sentence (rule 11).
  const scope = page.view.scope.systems.map((system) => ({ ...system, decision: page.take(system.decision), sentence: system.sentence === null ? null : page.take(system.sentence) }));
  const selectedSystems = page.selectedSystems(SELECTED_SYSTEMS);
  const kpis = { savings: page.metric('savings.total', METRICS_MISSING.savings), payback: page.indicator('payback'), carbon: page.metric('carbon.reduction', METRICS_MISSING.carbon) };
  return page.built({ ...generated, investment, costPerArea, bySystem, exclusions, scope, selectedSystems, kpis });
}

/** What "Selected systems" measures (rule 8: every value states what it measures; the approved screen's label, US-FIN-21 AC6). */
const SELECTED_SYSTEMS = 'Selected systems';

/** `metrics.payback` and its print view (DB-21; R-096, R-121). */
export function paybackView(input: MetricsBuildInput, series: MetricsSeriesRequests = METRICS_SERIES): Built<PaybackResponse['view']> {
  if (input.proposal === null) return notGenerated(input);
  const page = new Page(input.proposal);
  const generated = page.generated();
  const investment = page.investment();
  const savings = page.metric('savings.total', METRICS_MISSING.savings);
  const savingsBreakdown = page.series(series.savingsByStream).series;
  const cumulativeCashFlow = page.series(series.cumulativeCashFlow);
  // G9-9: beside a cumulative cash flow drawn with figures, the payback is its formula's own output (V-2, A-4).
  const payback = cumulativeCashFlow.beside['payback'] ?? page.indicator('payback');
  const environmental = {
    carbon: page.metric('carbon.reduction', METRICS_MISSING.carbon),
    trees: page.metric('carbon.trees', METRICS_MISSING.carbon),
    cars: page.metric('carbon.cars', METRICS_MISSING.carbon),
  };
  return page.built({ ...generated, investment, payback, savings, savingsBreakdown, cumulativeCashFlow: cumulativeCashFlow.series, environmental });
}

/** `metrics.lifecycle` and its print view (DB-22; R-097, R-121). */
export function lifecycleView(input: MetricsBuildInput, series: MetricsSeriesRequests = METRICS_SERIES): Built<LifecycleResponse['view']> {
  if (input.proposal === null) return notGenerated(input);
  const page = new Page(input.proposal);
  const generated = page.generated();
  const analysisPeriod = page.metric('lifecycle.analysisPeriod', METRICS_MISSING.analysisPeriod);
  const tiles = {
    totalCost: page.metric('lifecycle.totalCost', METRICS_MISSING.lifecycle),
    netSavings: page.metric('lifecycle.netSavings', METRICS_MISSING.lifecycle),
    averageLife: page.metric('lifecycle.averageLife', METRICS_MISSING.lifecycle),
  };
  const keyInsights = page.metric('lifecycle.keyInsights', METRICS_MISSING.lifecycle);
  const costComparison = page.series(series.lifecycleComparison).series;
  const costBreakdown = page.series(series.lifecycleBreakdown).series;
  const bySystem = page.series(series.lifecycleBySystem).series;
  const equipment = page.metric('lifecycle.equipment', METRICS_MISSING.assetTaxonomy);
  return page.built({ ...generated, analysisPeriod, tiles, keyInsights, costComparison, costBreakdown, bySystem, equipment });
}

/** The project types with no building yet, so no bill (US-FIN-13 AC9: "new construction, which has no bills"). */
const NO_BILLS: ReadonlySet<string> = new Set(['new_construction']);

/** `metrics.opex` (DB-12; R-095 "Until decided"). */
export function opexView(input: OpexBuildInput): Built<OpexResponse['view']> {
  const { project } = input;
  const displays = new Displays();
  const id = (item: string): ValueId => valueIdFor('building', project.buildingId, `operatingCost.${item}`);
  const notAvailable = (item: string, missing: string): ValueId =>
    displays.add(resolveLine(id(item), 'not_available_yet_named', { missing }, FORMAT, { missing: 'not_available_yet' }));
  // R-095 "Until decided": no amount per year is stored or computed while the open question on annual amounts stands.
  const total = notAvailable('total', METRICS_MISSING.annualAmounts);
  // US-FIN-13 AC8, AC9: an existing building's bills (none is read in this build), with the upload; new construction
  // names what an estimate lacks and offers no upload.
  const newConstruction = project.projectType !== undefined && NO_BILLS.has(project.projectType);
  // V-4 (phase 6 part B): the estimate's items as step 8 names them (the datasets, then each first-estimate input still
  // missing, with its Add), then the energy-price unit, then the open question on annual amounts (an energy cost per
  // year is an annual amount: R-095 "Until decided").
  const estimate = input.newBuildEstimate;
  const energy = newConstruction
    ? {
        display: displays.add(
          resolveLine(id('energy'), 'not_available_yet_named', { missing: [...new Set([...estimate.names, METRICS_MISSING.energyPrice, METRICS_MISSING.annualAmounts])].join('; ') }, FORMAT, {
            missing: 'not_available_yet',
            actions: estimate.actions,
          }),
        ),
        actions: [],
      }
    : { display: notAvailable('energy', METRICS_MISSING.energyFromBills), actions: ['upload_document' as const] };
  // US-FIN-14 AC1, AC2: no document states them and nothing new is asked: Unknown, never a zero.
  const maintenance = displays.add(unknownDisplay(id('maintenance'), 'record'));
  const staff = displays.add(unknownDisplay(id('staff'), 'record'));
  const other = displays.add(unknownDisplay(id('other'), 'record'));
  const intensity = notAvailable('intensity', METRICS_MISSING.intensity);
  const breakdown = notAvailable('breakdown', METRICS_MISSING.annualAmounts);
  // US-FIN-12 AC10; G10-7: a row per system whose recorded decision is include, its decision as System Scope shows it.
  const systems = SYSTEMS.filter((system) => storedDecision(project, system.id) === 'include').map((system) => {
    const fieldKey = scopeFieldKey(system.id);
    const resolved = project.resolve(project.projectId, fieldKey);
    const [own] = resolved ?? [];
    if (resolved === undefined || own === undefined) throw new MetricsNotBuilt(`the registry declares no scope field for ${system.id}`);
    for (const display of resolved) displays.add(display);
    return { systemId: system.id, decision: own.valueId, current: notAvailable(`systems.${system.id}`, METRICS_MISSING.perSystemMetering) };
  });
  // G7-24 (rule 7: "An empty card ... is never shown"; Topology's G7-15): with no include decision recorded, the panel
  // reads "Not available yet: the systems in scope" with the way to choose them, in place of an empty table.
  const noSystems = systems.length > 0 ? null : { line: notAvailable('systems', MISSING.systemsInScope), actions: ['choose_systems' as const] };
  return { view: { total, energy, maintenance, staff, other, intensity, breakdown, systems, noSystems }, displayObjects: displays.list() };
}
