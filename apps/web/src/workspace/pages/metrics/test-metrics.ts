/**
 * Test support: the five Metrics pages' responses in the contract's shapes (metrics.ts; docs/adr/0052), with TEST
 * values only (no figure of the mockups, the specs or a real building). The live app's state is the default: no
 * dataset is approved, so every figure reads "Not available yet: …" naming what it waits for, and every chart is one
 * such line (G1-31, G10-15). Options add a TEST stage 2 range and a TEST series with figures and gaps (G1-5, G9-9), as
 * the series view serves them with TEST formulas in the test runner. Every response is parsed by the app's client with
 * the contract's schema when the fake API serves it, so a shape the API cannot serve fails the test. Never imported
 * by the app, and it imports nothing at run time.
 */
import type {
  Action,
  CapexResponse,
  DisplayObject,
  FinancialOverviewResponse,
  LifecycleResponse,
  OpexResponse,
  PaybackResponse,
  Price,
  Series,
} from '@sovitech/view-model/browser';

export const PROJECT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e9f';
export const SNAPSHOT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8a01';
export const OTHER_SNAPSHOT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8a77';
export const BUILDING = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e70';
const AS_OF = '2026-09-30T10:00:00.000Z';
const DEMO_LINE = { id: 'demo_project', kind: 'demo_line' as const, text: 'TEST demo line' };

/** A value id of a stored version (`proposal:<sid>.<path>`). */
export function sid(snapshotId: string, path: string): string {
  return `proposal:${snapshotId}.${path}`;
}

export const ADD_AREA: Action = { kind: 'add', field: { subjectId: BUILDING, fieldKey: 'building.grossFloorArea' }, label: 'TEST add the area', step: 8 };

/** The investment's "Not available yet" line (G10-15): what the stage 2 output waits for, with the owner's Add. */
export const INVESTMENT_MISSING = 'Not available yet: TEST point templates; TEST cost ranges and benchmarks; the area';
export const RANGE_TEXT = 'about TEST 1,200 (TEST 1,100 to TEST 1,300) EUR';
export const STAGE_2 = 'Preliminary investment estimate';
export const COST_PER_AREA = 'Not available yet: TEST unit for cost per area';
export const SAVINGS_MISSING = 'Not available yet: TEST energy-price unit; TEST savings factors';
export const CARBON_MISSING = 'Not available yet: TEST unit for carbon dioxide; TEST emission-factor dataset';
export const PAYBACK_MISSING = 'Not available yet: TEST duration unit; TEST financial method';
export const OPERATING_MISSING = 'Not available yet: TEST open question on annual amounts';
export const NONE_GENERATED = 'Not available yet: a TEST generated preliminary proposal';
export const SERIES_MISSING = (what: string): string => `Not available yet: TEST cost ranges; SOVITECH's method for TEST ${what}`;

function envelope(displayObjects: readonly DisplayObject[], demo: boolean) {
  const name: DisplayObject = { valueId: `project:${PROJECT}.name`, kind: 'field', text: 'TEST project for metrics', shape: 'value', badge: { id: 'provided_by_you', label: 'TEST provided badge' } };
  return {
    asOf: AS_OF,
    project: { projectId: PROJECT, name: name.valueId, isDemo: demo, demoLine: demo ? DEMO_LINE : null },
    displayObjects: [name, ...new Map(displayObjects.map((display) => [display.valueId, display])).values()],
  };
}

function notAvailable(valueId: string, text: string, ...adds: Action[]): DisplayObject {
  return { valueId, kind: 'line', text, shape: 'missing', missing: 'not_available_yet', ...(adds.length === 0 ? {} : { actions: adds }) };
}

function unknown(valueId: string): DisplayObject {
  return { valueId, kind: 'field', text: 'Unknown', shape: 'missing', missing: 'unknown', badge: { id: 'unknown', label: 'Unknown' } };
}

export interface MetricsOptions {
  readonly snapshotId?: string;
  readonly demo?: boolean;
  readonly latest?: boolean;
  /** `none` (the live app: no dataset), or `range` (a TEST stage 2 range, as the stored proposal serves it). */
  readonly figure?: 'none' | 'range';
  /** Serve the investment-by-system series with TEST figures and two gaps (G1-5, G9-9), in place of its one line. */
  readonly seriesFigures?: boolean;
  /**
   * Serve Payback's cumulative cash flow with TEST figures (phase 6, the print route's G1-32 page half): a TEST year with
   * a range, a TEST year that reads Unknown and one that reads "Not available yet: …", each a labelled gap.
   */
  readonly cashFlowFigures?: boolean;
  /**
   * CAPEX's "Selected systems" (V-3 of phase 6 part B): the count of the include decisions (`count`, the default: the
   * scope fixture's two), or "Not available yet: systems in scope" with the owner's Add (`missing`).
   */
  readonly selectedSystems?: 'count' | 'missing';
}

/** CAPEX's "Selected systems" while a scope decision as used was not recorded (rule 1), with the owner's Add. */
export const SELECTED_MISSING = 'Not available yet: TEST systems in scope';
export const ADD_SCOPE: Action = { kind: 'add', field: { subjectId: PROJECT, fieldKey: 'project.scope.lighting' }, label: 'TEST add the systems in scope', step: 8 };

/** The TEST texts of the cumulative cash flow with figures (`cashFlowFigures`). */
export const CASH_FLOW_TEXT = {
  yearRange: 'about TEST -1,200 (TEST -1,300 to TEST -1,100) EUR',
  yearRangeName: 'TEST year zero',
  yearUnknownName: 'TEST year one',
  yearMissingName: 'TEST year two',
  yearMissing: 'Not available yet: TEST energy tariff for TEST year two',
} as const;

/** What every snapshot-reading page shares: the version's date, the investment and its displays. */
function common(options: MetricsOptions) {
  const s = options.snapshotId ?? SNAPSHOT;
  const displays: DisplayObject[] = [];
  const add = (display: DisplayObject): string => {
    displays.push(display);
    return display.valueId;
  };
  const generatedOn = add({ valueId: sid(s, 'generatedOn'), kind: 'record', text: 'TEST 5 Oct 2026, 10:00', shape: 'value' });
  const figureId = sid(s, 'outputs.capex.preliminaryEstimate');
  let price: Price;
  if (options.figure === 'range') {
    add({
      valueId: figureId,
      kind: 'field',
      text: RANGE_TEXT,
      shape: 'range',
      badge: { id: 'estimated', label: 'Estimated' },
      sourceLine: { id: 'based_on', kind: 'source_line', text: 'Based on TEST cost ranges v0 and TEST 3 equipment items' },
      lines: [{ id: 'preliminary_investment_estimate', kind: 'stage_label', text: STAGE_2 }],
    });
    price = { figure: figureId, stageId: 'preliminary_investment_estimate', quotationRecordId: null };
  } else {
    add(notAvailable(figureId, INVESTMENT_MISSING, ADD_AREA));
    price = { figure: figureId, stageId: null, quotationRecordId: null };
  }
  const investment = { output: 'capex.preliminaryEstimate', price };
  const costPerArea = add(notAvailable(sid(s, 'metrics.costPerArea'), COST_PER_AREA));
  const savingsTotal = add(notAvailable(sid(s, 'metrics.savings.total'), SAVINGS_MISSING));
  const payback = add(notAvailable(sid(s, 'indicators.payback'), PAYBACK_MISSING));
  const unavailable = (key: string, what: string, kind: Series['kind'] = 'breakdown'): Series => ({
    series: key,
    kind,
    state: 'not_available_yet',
    source: null,
    notAvailable: add(notAvailable(sid(s, `series.${key}.notAvailable`), SERIES_MISSING(what), ADD_AREA)),
    total: null,
    points: [],
    zero: null,
  });
  const base = { state: 'generated' as const, snapshotId: s, generatedOn, latest: options.latest ?? true };
  return { s, displays, add, base, investment, costPerArea, savingsTotal, payback, unavailable };
}

/**
 * The investment by system: one line (live), or TEST figures with two gaps and the page's own price as its total, in
 * the shape a production series would serve once P-6-SERIES-SIGNATURES' next version of the stage 2 formula is approved
 * (phase 6 part B, A-7: the total an output of the series' own formula, `capexPreliminaryEstimate`, hypothetical version
 * 2.0.0 here; A-3: each part a price with the stage its figure carries). The figures are TEST values.
 */
function bySystemSeries(shared: ReturnType<typeof common>, options: MetricsOptions): Series {
  if (options.seriesFigures !== true) return shared.unavailable('capex.bySystem', 'investment by system');
  const { s, add } = shared;
  const key = 'capex.bySystem';
  const name = (point: string, text: string) => add({ valueId: sid(s, `series.${key}.points.${point}.name`), kind: 'line', text, shape: 'value' });
  const hvac = add({
    valueId: sid(s, 'outputs.capex.preliminaryEstimate.system.hvac'),
    kind: 'field',
    text: 'about TEST 700 (TEST 600 to TEST 800) EUR',
    shape: 'range',
    badge: { id: 'estimated', label: 'Estimated' },
    sourceLine: { id: 'based_on', kind: 'source_line', text: 'Based on TEST cost ranges v0' },
    lines: [{ id: 'preliminary_investment_estimate', kind: 'stage_label', text: STAGE_2 }],
  });
  const gap = add(notAvailable(sid(s, 'outputs.capex.preliminaryEstimate.system.lighting'), 'Not available yet: TEST cost table for lighting'));
  const water = add(unknown(sid(s, 'outputs.capex.preliminaryEstimate.system.water')));
  const price = (figure: string, staged: boolean): Price => ({ figure, stageId: staged ? 'preliminary_investment_estimate' : null, quotationRecordId: null });
  return {
    series: key,
    kind: 'breakdown',
    state: 'figures',
    source: { snapshotId: s, formula: { id: 'capexPreliminaryEstimate', version: '2.0.0' } },
    notAvailable: null,
    total: { kind: 'price', output: 'capex.preliminaryEstimate', price: shared.investment.price },
    points: [
      { key: 'hvac', name: name('hvac', 'TEST HVAC'), value: hvac, price: price(hvac, true), plot: { low: 750, high: 1000, mark: 875 } },
      { key: 'lighting', name: name('lighting', 'TEST Lighting'), value: gap, price: price(gap, false), plot: null },
      { key: 'water', name: name('water', 'TEST Water'), value: water, price: price(water, false), plot: null },
    ],
    zero: 0,
  };
}

/** Payback's cumulative cash flow: one line (live), or TEST figures with an Unknown gap and a "Not available yet" gap. */
function cashFlowSeries(shared: ReturnType<typeof common>, options: MetricsOptions): Series {
  if (options.cashFlowFigures !== true) return shared.unavailable('cashFlow.cumulative', 'cumulative cash flow', 'sequence');
  const { s, add } = shared;
  const key = 'cashFlow.TEST_cumulative';
  const name = (point: string, text: string) => add({ valueId: sid(s, `series.${key}.points.${point}.name`), kind: 'line', text, shape: 'value' });
  const year = add({
    valueId: sid(s, 'outputs.cashFlow.TEST_cumulative.year0'),
    kind: 'field',
    text: CASH_FLOW_TEXT.yearRange,
    shape: 'range',
    badge: { id: 'estimated', label: 'Estimated' },
    sourceLine: { id: 'based_on', kind: 'source_line', text: 'Based on TEST cash-flow table v0' },
  });
  return {
    series: key,
    kind: 'sequence',
    state: 'figures',
    source: { snapshotId: s, formula: { id: 'TEST-cashFlow', version: '1.0.0' } },
    notAvailable: null,
    total: null,
    points: [
      { key: 'year0', name: name('year0', CASH_FLOW_TEXT.yearRangeName), value: year, price: null, plot: { low: 0, high: 1000, mark: 500 } },
      { key: 'year1', name: name('year1', CASH_FLOW_TEXT.yearUnknownName), value: add(unknown(sid(s, 'outputs.cashFlow.TEST_cumulative.year1'))), price: null, plot: null },
      { key: 'year2', name: name('year2', CASH_FLOW_TEXT.yearMissingName), value: add(notAvailable(sid(s, 'outputs.cashFlow.TEST_cumulative.year2'), CASH_FLOW_TEXT.yearMissing)), price: null, plot: null },
    ],
    zero: null,
  };
}

/** The scope decisions as the snapshot used them (System Scope's words, TEST). */
function scope(shared: ReturnType<typeof common>) {
  const { s, add } = shared;
  const decision = (system: string, text: string) =>
    add({
      valueId: sid(s, `inputs.project.scope.${system}`),
      kind: 'field',
      text,
      shape: 'value',
      badge: { id: 'provided_by_you', label: 'Provided by you' },
      measure: { label: `TEST System in scope: ${system}` },
      sourceLine: { id: 'source_step_4', kind: 'source_line', text: 'TEST chosen on step 4' },
    });
  const fireSentence = add({ valueId: sid(s, 'lifeSafety.fire_safety'), kind: 'line', text: 'TEST monitoring only sentence', shape: 'value' });
  const systems = [
    { systemId: 'hvac', decision: decision('hvac', 'TEST included'), lifeSafety: false, sentence: null },
    { systemId: 'fire_safety', decision: decision('fire_safety', 'TEST included'), lifeSafety: true, sentence: fireSentence },
    { systemId: 'cctv', decision: decision('cctv', 'TEST left out'), lifeSafety: false, sentence: null },
  ];
  return { systems, exclusions: [sid(s, 'inputs.project.scope.cctv')] };
}

/** `GET …/metrics/financial-overview`. */
export function financialOverviewResponse(options: MetricsOptions = {}): FinancialOverviewResponse {
  const shared = common(options);
  const { s, add } = shared;
  const { exclusions } = scope(shared);
  const view = {
    ...shared.base,
    investment: shared.investment,
    costPerArea: shared.costPerArea,
    savings: {
      total: shared.savingsTotal,
      energy: add(notAvailable(sid(s, 'metrics.savings.energy'), SAVINGS_MISSING)),
      operational: add(notAvailable(sid(s, 'metrics.savings.operational'), SAVINGS_MISSING)),
    },
    indicators: {
      bmsOperatingCost: add(notAvailable(sid(s, 'indicators.operating_cost'), OPERATING_MISSING)),
      payback: shared.payback,
      npv: add(notAvailable(sid(s, 'indicators.npv'), PAYBACK_MISSING)),
      irr: add(notAvailable(sid(s, 'indicators.irr'), PAYBACK_MISSING)),
    },
    costBreakdown: { bySystem: bySystemSeries(shared, options), byBuildingArea: shared.unavailable('capex.byLevel', 'investment by level'), exclusions },
    annualCashFlow: shared.unavailable('cashFlow.annual', 'annual cash flow', 'sequence'),
  };
  return { ...envelope(shared.displays, options.demo === true), view } as FinancialOverviewResponse;
}

/** `GET …/metrics/capex`. */
export function capexResponse(options: MetricsOptions = {}): CapexResponse {
  const shared = common(options);
  const { s, add } = shared;
  const { systems, exclusions } = scope(shared);
  const view = {
    ...shared.base,
    investment: shared.investment,
    costPerArea: shared.costPerArea,
    bySystem: bySystemSeries(shared, options),
    exclusions,
    scope: systems,
    selectedSystems: add(
      options.selectedSystems === 'missing'
        ? notAvailable(sid(s, 'metrics.selectedSystems'), SELECTED_MISSING, ADD_SCOPE)
        : { valueId: sid(s, 'metrics.selectedSystems'), kind: 'line', text: 'TEST 2', parts: ['TEST 2'], shape: 'value', measure: { label: 'Selected systems' } },
    ),
    kpis: { savings: shared.savingsTotal, payback: shared.payback, carbon: add(notAvailable(sid(s, 'metrics.carbon.reduction'), CARBON_MISSING)) },
  };
  return { ...envelope(shared.displays, options.demo === true), view } as CapexResponse;
}

/** `GET …/metrics/payback` (and its print view). */
export function paybackResponse(options: MetricsOptions = {}): PaybackResponse {
  const shared = common(options);
  const { s, add } = shared;
  const view = {
    ...shared.base,
    investment: shared.investment,
    payback: shared.payback,
    savings: shared.savingsTotal,
    savingsBreakdown: shared.unavailable('savings.byStream', 'savings by stream'),
    cumulativeCashFlow: cashFlowSeries(shared, options),
    environmental: {
      carbon: add(notAvailable(sid(s, 'metrics.carbon.reduction'), CARBON_MISSING)),
      trees: add(notAvailable(sid(s, 'metrics.carbon.trees'), CARBON_MISSING)),
      cars: add(notAvailable(sid(s, 'metrics.carbon.cars'), CARBON_MISSING)),
    },
  };
  return { ...envelope(shared.displays, options.demo === true), view } as PaybackResponse;
}

export const LIFECYCLE_MISSING = 'Not available yet: TEST duration unit; TEST service lives; TEST lifecycle cost method';
export const TAXONOMY_MISSING = 'Not available yet: TEST asset taxonomy';

/** `GET …/metrics/lifecycle` (and its print view). */
export function lifecycleResponse(options: MetricsOptions = {}): LifecycleResponse {
  const shared = common(options);
  const { s, add } = shared;
  const view = {
    ...shared.base,
    analysisPeriod: add(notAvailable(sid(s, 'metrics.lifecycle.analysisPeriod'), 'Not available yet: TEST duration unit')),
    tiles: {
      totalCost: add(notAvailable(sid(s, 'metrics.lifecycle.totalCost'), LIFECYCLE_MISSING)),
      netSavings: add(notAvailable(sid(s, 'metrics.lifecycle.netSavings'), LIFECYCLE_MISSING)),
      averageLife: add(notAvailable(sid(s, 'metrics.lifecycle.averageLife'), LIFECYCLE_MISSING)),
    },
    keyInsights: add(notAvailable(sid(s, 'metrics.lifecycle.keyInsights'), LIFECYCLE_MISSING)),
    costComparison: shared.unavailable('lifecycle.costComparison', 'lifecycle cost comparison', 'sequence'),
    costBreakdown: shared.unavailable('lifecycle.costBreakdown', 'lifecycle cost breakdown'),
    bySystem: shared.unavailable('lifecycle.bySystem', 'lifecycle cost by system'),
    equipment: add(notAvailable(sid(s, 'metrics.lifecycle.equipment'), TAXONOMY_MISSING)),
  };
  return { ...envelope(shared.displays, options.demo === true), view } as LifecycleResponse;
}

/** A snapshot-reading page on a project with no stored proposal (`none_generated`). */
export function noneGenerated<T extends FinancialOverviewResponse | CapexResponse | PaybackResponse | LifecycleResponse>(options: { readonly demo?: boolean } = {}): T {
  const line = notAvailable(`project:${PROJECT}.metrics.source`, NONE_GENERATED);
  return { ...envelope([line], options.demo === true), view: { state: 'none_generated', line: line.valueId, actions: ['open_proposal'] } } as T;
}

export const OPEX_SYSTEMS = ['hvac', 'lighting', 'water'] as const;

/** OPEX & Savings' "by system" line while no system is included (G7-24). */
export const NO_SYSTEMS = 'Not available yet: TEST systems in scope';

/** `GET …/metrics/opex`: the building's operating cost before any BMS, from its documents now; `included: false`: no include decision (G7-24). */
export function opexResponse(options: { readonly demo?: boolean; readonly existing?: boolean; readonly included?: boolean } = {}): OpexResponse {
  const displays: DisplayObject[] = [];
  const add = (display: DisplayObject): string => {
    displays.push(display);
    return display.valueId;
  };
  const b = (path: string) => `building:${BUILDING}.operatingCost.${path}`;
  const existing = options.existing ?? true;
  const view = {
    total: add(notAvailable(b('total'), OPERATING_MISSING)),
    energy: {
      display: add(notAvailable(b('energy'), existing ? 'Not available yet: TEST energy data read from bills' : 'Not available yet: TEST energy-price unit')),
      actions: existing ? (['upload_document'] as const) : [],
    },
    maintenance: add(unknown(b('maintenance'))),
    staff: add(unknown(b('staff'))),
    other: add(unknown(b('other'))),
    intensity: add(notAvailable(b('intensity'), 'Not available yet: TEST unit for cost per area per year; TEST open question on annual amounts')),
    breakdown: add(notAvailable(b('breakdown'), OPERATING_MISSING)),
    systems: (options.included === false ? [] : OPEX_SYSTEMS).map((systemId) => ({
      systemId,
      decision: add({
        valueId: `project:${PROJECT}.scope.${systemId}`,
        kind: 'field',
        text: 'TEST included',
        shape: 'value',
        badge: { id: 'provided_by_you', label: 'Provided by you' },
        sourceLine: { id: 'source_step_4', kind: 'source_line', text: 'TEST chosen on step 4' },
      }),
      current: add(notAvailable(b(`systems.${systemId}`), 'Not available yet: TEST per-system metering')),
    })),
    noSystems: options.included === false ? { line: add(notAvailable(b('systems'), NO_SYSTEMS)), actions: ['choose_systems'] as const } : null,
  };
  return { ...envelope(displays, options.demo === true), view } as OpexResponse;
}
