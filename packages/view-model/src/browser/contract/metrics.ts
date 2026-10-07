/**
 * The Metrics pages and their chart series (phase 6; docs/adr/0052-metrics-pages-and-series.md; the engine's series:
 * docs/adr/0047-calculation-engine.md, amended in phase 6; the build log, phase 6, "Plan").
 *
 * What phase 6 serves (prompt 3 section 10, phase 6; PRD R-087 to R-098, R-099 to R-105 "Until decided", R-121):
 * - **Financial Overview** (DB-02, R-088), **CAPEX Breakdown** (DB-13, R-089), **Payback Analysis** (DB-21, R-096) and
 *   **Lifecycle Analysis** (DB-22, R-097) read **one stored proposal snapshot**, the latest by default (prompt 3 5.2
 *   "Timeline and scenario bar": "Metrics pages show the one stored proposal snapshot"; G9-8): every figure is that
 *   snapshot's, through the Price or Value component, with its stage label and basis, **under the stored proposal's
 *   own value ids** wherever the proposal shows the same value (`proposal:<sid>.outputs.*`, `.indicators.*`,
 *   `.inputs.*`, `.headline.investment`), so one value id renders one display on every page (G2-7; US-FIN-03 AC8). A
 *   project with no stored proposal reads "Not available yet: a generated preliminary proposal", with the action that
 *   opens the Proposal page (rule 7; `open_proposal`), and nothing else.
 * - **OPEX & Savings** (DB-12, R-095) reads the building's operating cost **before any BMS**, from the project's
 *   documents now (US-FIN-12, US-FIN-13), not from a proposal: while D-27 is open no amount per year is stored or
 *   computed (R-095 "Until decided"), and no bill value is read in this build (no energy-data field is registered and
 *   no AI run exists), so its figures read "Not available yet", naming what is missing, or Unknown where no document
 *   states a cost (US-FIN-14 AC1).
 * - Every value a page shows is a display object bound to its value id; every "Not available yet" names what is
 *   missing (rule 7: the dataset, the unit, the method, the open question, or an owner input with its Add action),
 *   never an empty card, a dash or a zero (rule 1). No live value, "BMS LIVE", scenario bar, time scale, ROI, value
 *   driver, Metrics landing, "← Back to Metrics", CAPEX / OPEX toggle, "By Phase" tab, package, level card, slider,
 *   stepper, KEY ASSUMPTIONS, SCENARIO COMPARISON, ⓘ, "Configure", "View … →", "Last <n> Months", monthly series,
 *   savings opportunity or cost callout on a model is served (R-088, R-089, R-093, R-095 to R-098, R-104, R-106, R-107,
 *   R-108 and the "Waiting on approval" list under E-FIN).
 *
 * **Chart series** (`SeriesSchema`): a chart is a series of points, each a display object with a value id (rule 2;
 * prompt 3 section 6: "chart series arrive inside display objects, bound to their value ids"), all from **one engine
 * run of one formula version in one snapshot** (`source`; G9-8, G9-9). A point the engine could not compute is a
 * **labelled gap** (its display reads Unknown or "Not available yet: …"; `plot` null): never a zero, never left out
 * silently (rule 1, "A chart shows an unknown as a labelled gap"; G1-5). A series no formula of the catalogue
 * declares, or whose formula could not run, reads one "Not available yet" line naming what is missing and draws no
 * point, bar, axis, zero or dash (`state: 'not_available_yet'`). A chart is drawn with page elements (inline elements
 * or inline SVG with no text in it), each mark bound to its point's value id; no numeric tick is drawn (prompt 3
 * section 7: "no numeric chart ticks (the chart's table view carries the bound values)"), and every chart has a table
 * view (prompt 3 section 11). Positions (`plot`, `zero`) are layout, in thousandths of the plot, computed by the
 * formatting module from the same candidates as the displays (so a mark and its label agree: G9-9); they are never
 * shown as text. Shares are not served: every amount of v1.5 is an estimate, a range, and a share of ranges is "a
 * range or ... left out" (US-FIN-05 AC3; R-091); it is left out, and so is a donut (whose arcs are shares).
 *
 * Value ids added (every path segment starts with a letter; display.ts VALUE_ID_PATTERN):
 * - `project:<projectId>.metrics.source` (a `line`: "Not available yet: a generated preliminary proposal", with the
 *   `open_proposal` action beside it, on a project with no stored proposal);
 * - `proposal:<sid>.metrics.<item>` (a value only the Metrics pages show, from the snapshot or "Not available yet"
 *   naming what is missing): `costPerArea`, `savings.energy`, `savings.operational`, `savings.total`,
 *   `carbon.reduction`, `carbon.trees`, `carbon.cars`, `lifecycle.analysisPeriod`, `lifecycle.totalCost`,
 *   `lifecycle.netSavings`, `lifecycle.averageLife`, `lifecycle.keyInsights`, `lifecycle.equipment`;
 * - `proposal:<sid>.series.<series key>.notAvailable` (a series' one "Not available yet" line), and
 *   `proposal:<sid>.series.<series key>.points.<point key>.name` (a point's name: a system's name, a level's label,
 *   a TEST year), the point's value being its output's own id `proposal:<sid>.outputs.<output>` (G2-7);
 * - `building:<buildingId>.operatingCost.<item>` (OPEX & Savings, from documents now): `total`, `energy`,
 *   `maintenance`, `staff`, `other`, `intensity`, `breakdown`, `operatingCost.systems.<system id>` (a system's
 *   current cost: "Not available yet: per-system metering", US-FIN-12 AC10), and `operatingCost.systems` (the "by
 *   system" panel's line while no system is included: "Not available yet: the systems in scope"; G7-24);
 * - `proposal:<sid>.metrics.selectedSystems` (CAPEX's "Selected systems": the count of the include decisions as the
 *   snapshot used them, or "Not available yet: systems in scope" while one of them was not recorded; R-089, V-3 of
 *   phase 6 part B).
 *
 * **Every value id a Metrics view names is among its response's display objects** (`servesEveryValueId`, refined on
 * each response schema; phase 6 part B, A-8): a response that names one it does not serve is refused, so the API
 * answers 500 and the page reads that it could not be loaded, never an empty tile or a row left off a printed page.
 * The proposal's indicator `proposal:<sid>.indicators.operating_cost` is the BMS's own running cost, shown on
 * Financial Overview's KEY FINANCIAL INDICATORS as "BMS operating cost" (7.1.1-S8: "OPEX" never stands alone as the
 * label of either value).
 */
import { z } from 'zod';
import { screenEnvelope } from './common';
import { UuidSchema, VALUE_ID_PATTERN, ValueIdSchema } from './display';
import { PriceSchema, ProposalScopeSystemSchema } from './proposal';
import { WorkspaceActionSchema } from './workspace';

// ---------------------------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------------------------

/** The Metrics pages phase 6 builds (the workspace's `WORKSPACE_PAGES` holds them too, in this order). */
export const METRICS_PAGES = ['financial_overview', 'capex', 'opex', 'payback', 'lifecycle'] as const;
export const MetricsPageSchema = z.enum(METRICS_PAGES);
export type MetricsPage = z.infer<typeof MetricsPageSchema>;

/** The pages with "Export Report" (R-121; US-REPORTS-13): Payback Analysis and Lifecycle Analysis only. */
export const METRICS_EXPORT_PAGES = ['payback', 'lifecycle'] as const;
export const MetricsExportPageSchema = z.enum(METRICS_EXPORT_PAGES);
export type MetricsExportPage = z.infer<typeof MetricsExportPageSchema>;

/**
 * The query of a snapshot-reading Metrics page: which stored version (one of the project's; 404 otherwise, rule 13).
 * Absent: the latest. The print routes and the export name the version the page showed, so the file prints the same
 * snapshot (G9-8).
 */
export const MetricsQuerySchema = z.strictObject({ snapshot: UuidSchema.optional() });
export type MetricsQuery = z.infer<typeof MetricsQuerySchema>;
/** The print routes' and the export's query: the version is named (the page passes the one it showed). */
export const MetricsPrintQuerySchema = z.strictObject({ snapshot: UuidSchema });
export type MetricsPrintQuery = z.infer<typeof MetricsPrintQuerySchema>;

/**
 * A snapshot-reading page while the project has no stored proposal: "Not available yet: a generated preliminary
 * proposal" (`project:<id>.metrics.source`, a `line`), and the action that opens the Proposal page (rule 7: "It names
 * what is missing and offers the action"). Nothing else: no figure exists to show.
 */
export const MetricsNotGeneratedSchema = z.strictObject({
  state: z.literal('none_generated'),
  line: ValueIdSchema,
  actions: z.array(WorkspaceActionSchema).length(1),
});

/** Which stored version a page shows (its generation date and time bound, `proposal:<sid>.generatedOn`; whether it is the latest). */
const generatedFields = {
  state: z.literal('generated'),
  snapshotId: UuidSchema,
  generatedOn: ValueIdSchema,
  latest: z.boolean(),
} as const;

// ---------------------------------------------------------------------------------------------
// Chart series
// ---------------------------------------------------------------------------------------------

/**
 * A series' key: value-id safe dotted segments, each starting with a letter (`capex.bySystem`; a TEST series
 * `capex.TEST_bySystem`), so `proposal:<sid>.series.<key>.…` is a value id (display.ts VALUE_ID_PATTERN).
 */
export const SERIES_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)*$/u;

/** A position along a chart's value axis, in thousandths of the plot: layout only, never shown as text. */
export const PlotPositionSchema = z.number().int().min(0).max(1000);

/**
 * One point of a series:
 * - `key`: the point's identifier in its series (a system id, a level key, a TEST year key): never shown;
 * - `name`: the point's name as a display object (a `line`): a system's catalogue name, a level's label from the one
 *   level-label function (rule 8, 2.2), or a TEST year; bound, so a name holding a digit is bound;
 * - `value`: the point's value: the engine output's own display (`proposal:<sid>.outputs.<output>`: a range with its
 *   Estimated badge, basis and status lines, or a calculated value), or a missing display (Unknown, or "Not available
 *   yet: …" naming what that point waited for): a **labelled gap** (G1-5);
 * - `price`: a part of an investment (its output carries a rule 10 stage) as the one Price reads it, its figure the
 *   point's own `value` (the stage label among that display's lines, read from stored records: rule 10; phase 6 part B,
 *   A-3); null for a point that is no investment figure;
 * - `plot`: where the point is drawn on the value axis: `low` to `high` (an estimate's range; equal for an exact value)
 *   and `mark` (an estimate's central value; null for an exact value), the formatting module's positions of the numbers
 *   the point's label shows (G9-9; phase 6 part B, A-5); null for a gap, which draws only its label (rule 1: "A chart
 *   shows an unknown as a labelled gap").
 */
export const SeriesPointSchema = z
  .strictObject({
    key: z.string().regex(/^[a-z][a-z0-9_]*$/u),
    name: ValueIdSchema,
    value: ValueIdSchema,
    price: PriceSchema.nullable(),
    plot: z
      .strictObject({ low: PlotPositionSchema, high: PlotPositionSchema, mark: PlotPositionSchema.nullable() })
      .refine((plot) => plot.low <= plot.high && (plot.mark === null || (plot.low <= plot.mark && plot.mark <= plot.high)), 'a plotted range runs from low to high, its mark inside it')
      .nullable(),
  })
  .refine((point) => point.price === null || point.price.figure === point.value, 'a priced point\'s figure is its own value (G2-7)');
export type SeriesPoint = z.infer<typeof SeriesPointSchema>;

/**
 * The total beside a breakdown: an investment figure through the one Price component (the page's own price: the same
 * value id and display, G2-7), or another value; a sequence has none.
 */
export const SeriesTotalSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('price'), output: z.string().min(1), price: PriceSchema }),
  z.strictObject({ kind: z.literal('value'), output: z.string().min(1), display: ValueIdSchema }),
]);

/**
 * A chart's series (see the header):
 * - `series`: its key (SERIES_KEY_PATTERN; the engine catalogue's series id for a declared one: `capex.bySystem`,
 *   `cashFlow.cumulative`, …; a TEST series carries "TEST": `capex.TEST_bySystem`);
 * - `kind`: `breakdown` (parts of a total: by system, by level, by stream) or `sequence` (an ordered series: years);
 * - `state`: `figures` (the engine ran the series' formula in the snapshot: at least one point, each a figure or a
 *   labelled gap) or `not_available_yet` (no formula of the catalogue declares it, or its formula could not run: one
 *   line, no point);
 * - `source`: the one snapshot and the one formula version every point and the total come from (G9-8; G9-9), null
 *   while not available;
 * - `notAvailable`: the series' "Not available yet: <what is missing>" line (rule 7), null while it has figures;
 * - `total`: a breakdown's total (G9-8: "Parts and total come from the same snapshot id"), null for a sequence, and
 *   null for a breakdown that is not available (the page shows its own total apart, from the same snapshot);
 * - `points`: in the declared order;
 * - `zero`: where zero sits on the value axis when the series spans it (a cash flow crossing zero: G9-9's "the zero
 *   crossing lies within the displayed payback range"), else null; layout only, never labelled with a digit.
 */
export const SeriesSchema = z
  .strictObject({
    series: z.string().regex(SERIES_KEY_PATTERN),
    kind: z.enum(['breakdown', 'sequence']),
    state: z.enum(['figures', 'not_available_yet']),
    source: z.strictObject({ snapshotId: UuidSchema, formula: z.strictObject({ id: z.string().min(1), version: z.string().min(1) }) }).nullable(),
    notAvailable: ValueIdSchema.nullable(),
    total: SeriesTotalSchema.nullable(),
    points: z.array(SeriesPointSchema),
    zero: PlotPositionSchema.nullable(),
  })
  .superRefine((series, context) => {
    if (series.state === 'figures') {
      if (series.source === null) context.addIssue({ code: 'custom', message: 'a series with figures names its snapshot and formula version (G9-8, G9-9)' });
      if (series.notAvailable !== null) context.addIssue({ code: 'custom', message: 'a series with figures carries no "Not available yet" line of its own' });
      if (series.points.length === 0) context.addIssue({ code: 'custom', message: 'a series with figures has at least one point' });
    } else {
      if (series.notAvailable === null) context.addIssue({ code: 'custom', message: 'a series that is not available names what is missing (rule 7)' });
      if (series.points.length > 0 || series.zero !== null || series.total !== null) {
        context.addIssue({ code: 'custom', message: 'a series that is not available draws no point, total or zero (rule 1; G1-31)' });
      }
    }
    if (series.kind === 'sequence' && series.total !== null) context.addIssue({ code: 'custom', message: 'a sequence has no total' });
    if (series.total?.kind === 'price' && series.points.some((point) => point.price === null)) {
      context.addIssue({ code: 'custom', message: 'the parts of a priced total are prices, each with its stage (rule 10; A-3)' });
    }
  });
export type Series = z.infer<typeof SeriesSchema>;

/** The investment a page shows: the stored proposal's headline output and its price (the same value id and display: G2-7). */
const InvestmentSchema = z.strictObject({ output: z.string().min(1), price: PriceSchema });

/** Every value id a view names, wherever it sits in the view (a value id is the only string of a view that matches VALUE_ID_PATTERN). */
function valueIdsIn(value: unknown, into: Set<string>): Set<string> {
  if (typeof value === 'string') {
    if (VALUE_ID_PATTERN.test(value)) into.add(value);
  } else if (Array.isArray(value)) {
    for (const entry of value) valueIdsIn(entry, into);
  } else if (typeof value === 'object' && value !== null) {
    for (const entry of Object.values(value)) valueIdsIn(entry, into);
  }
  return into;
}

/**
 * A Metrics response serves every value id its view and its header name (phase 6 part B, A-8; common.ts's envelope:
 * "Every `valueId` a view names is among `displayObjects`"): one it does not serve is refused, so no page draws a
 * labelled empty tile and no printed report leaves a row off without a word (rule 7; rule 12).
 */
function servesEveryValueId(response: { readonly displayObjects: readonly { readonly valueId: string }[]; readonly view: unknown; readonly project: { readonly name: string } }, context: z.RefinementCtx): void {
  const served = new Set(response.displayObjects.map((display) => display.valueId));
  for (const valueId of valueIdsIn(response.view, new Set([response.project.name]))) {
    if (!served.has(valueId)) context.addIssue({ code: 'custom', path: ['view'], message: `the view names ${valueId}, which the response does not serve (rule 7; A-8)` });
  }
}

// ---------------------------------------------------------------------------------------------
// Financial Overview (DB-02; R-088, R-090, R-091, R-094, R-099 to R-103 "Until decided")
// ---------------------------------------------------------------------------------------------

/**
 * Financial Overview of one stored version:
 * - `investment`: TOTAL BMS INVESTMENT and KEY FINANCIAL INDICATORS' "CAPEX" row, one price (R-088: "show the same
 *   investment through the price component with its stage label"; G2-7);
 * - `costPerArea`: the "€ / m²" caption and the COST PER m² panel, one display: "Not available yet", naming the
 *   missing unit for cost per area (R-087; US-FIN-01 AC3);
 * - `savings`: EST. ANNUAL SAVINGS (`total`, also KEY FINANCIAL INDICATORS' "Total Annual Savings") and the energy and
 *   operational savings rows: "Not available yet", naming the energy-price unit and the savings factors (R-099,
 *   R-100 "Until decided"; US-FIN-01 AC4); no "<n>% vs. baseline" caption and no VALUE DRIVERS (AC4, AC5);
 * - `indicators`: KEY FINANCIAL INDICATORS' "BMS operating cost" (the proposal's `operating_cost`, 7.1.1-S8) and the
 *   PAYBACK PERIOD and NPV tiles with the payback, NPV and IRR rows: the stored proposal's own indicator displays
 *   (R-102 "Until decided": "naming the missing duration unit"; no ROI);
 * - `costBreakdown`: COST BREAKDOWN's "By System" (`bySystem`; R-091, US-FIN-05) and "By Building Area"
 *   (`byBuildingArea`; R-094, US-FIN-06) tabs, each a breakdown series of the snapshot, and the systems the snapshot
 *   left out of scope, listed as exclusions by their decisions as used (G10-7); no "By Phase" tab (R-088);
 * - `annualCashFlow`: ANNUAL CASH FLOW, a sequence series: "Not available yet", naming the missing payback inputs, while
 *   no payback can be computed (R-103 "Until decided"; US-FIN-01 AC7).
 * PROJECT CONTEXT is the sidebar's project card (R-049; R-088 Sources), not drawn again on the page.
 */
export const FinancialOverviewViewSchema = z.discriminatedUnion('state', [
  MetricsNotGeneratedSchema,
  z.strictObject({
    ...generatedFields,
    investment: InvestmentSchema,
    costPerArea: ValueIdSchema,
    savings: z.strictObject({ total: ValueIdSchema, energy: ValueIdSchema, operational: ValueIdSchema }),
    indicators: z.strictObject({ bmsOperatingCost: ValueIdSchema, payback: ValueIdSchema, npv: ValueIdSchema, irr: ValueIdSchema }),
    costBreakdown: z.strictObject({ bySystem: SeriesSchema, byBuildingArea: SeriesSchema, exclusions: z.array(ValueIdSchema) }),
    annualCashFlow: SeriesSchema,
  }),
]);
export const FinancialOverviewResponseSchema = z.strictObject({ ...screenEnvelope, view: FinancialOverviewViewSchema }).superRefine(servesEveryValueId);
export type FinancialOverviewResponse = z.infer<typeof FinancialOverviewResponseSchema>;

// ---------------------------------------------------------------------------------------------
// CAPEX Breakdown (DB-13; R-089, R-090, R-091)
// ---------------------------------------------------------------------------------------------

/**
 * CAPEX of one stored version (an ordinary Metrics page: prompt 3 5.2 "Configurator"; no stepper, level card,
 * package, slider, "Powered by", "View details →" or "View <n>-Year Analysis →": R-089, R-098, R-108, R-117):
 * - `investment`: INVESTMENT SUMMARY's Total CAPEX (the same price as Financial Overview's: G2-7);
 * - `costPerArea`: "Cost per m²": the same display as Financial Overview's (R-087; US-FIN-21 AC3);
 * - `bySystem`: the per-system summary, the same series as Financial Overview's "By System" (one snapshot: G9-8):
 *   only systems whose decision as used is include, the others listed as `exclusions` (G10-7; US-FIN-21 AC4, AC5);
 * - `scope`: "1. SELECT SYSTEMS" as the snapshot used the decisions (read-only; System Scope is the only editor after
 *   Generate: prompt 3 5.2, ADR 0043), with Fire Safety's monitoring-only sentence (rule 11; 7.1.1-L1);
 * - `selectedSystems`: INVESTMENT SUMMARY's "Selected Systems" (R-089; US-FIN-21 AC6: "counts the recorded include
 *   decisions through the value component, identical to the scope shown elsewhere"): the count of the include
 *   decisions of `scope`, bound (`proposal:<sid>.metrics.selectedSystems`), or, while any decision as used was not
 *   recorded, "Not available yet: systems in scope" with the owner's Add (rule 1: no count stands in for an unknown
 *   decision; rule 7; phase 6 part B, V-3);
 * - `kpis`: the KPI strip: "Estimated Annual Savings" (Financial Overview's `savings.total`), "Payback Period" (the
 *   proposal's payback indicator) and the carbon reduction (`proposal:<sid>.metrics.carbon.reduction`): "Not available
 *   yet", naming what is missing (US-FIN-21 AC8);
 * - "Download Proposal" exports the stored proposal of `snapshotId` through `proposals.export` (R-118; 7.1.1-P10).
 * Not served: "Automation Level" (no approved function set: US-FIN-21 AC7).
 */
export const CapexViewSchema = z.discriminatedUnion('state', [
  MetricsNotGeneratedSchema,
  z.strictObject({
    ...generatedFields,
    investment: InvestmentSchema,
    costPerArea: ValueIdSchema,
    bySystem: SeriesSchema,
    exclusions: z.array(ValueIdSchema),
    scope: z.array(ProposalScopeSystemSchema),
    selectedSystems: ValueIdSchema,
    kpis: z.strictObject({ savings: ValueIdSchema, payback: ValueIdSchema, carbon: ValueIdSchema }),
  }),
]);
export const CapexResponseSchema = z.strictObject({ ...screenEnvelope, view: CapexViewSchema }).superRefine(servesEveryValueId);
export type CapexResponse = z.infer<typeof CapexResponseSchema>;

// ---------------------------------------------------------------------------------------------
// OPEX & Savings (DB-12; R-095 with D-27's "Until decided")
// ---------------------------------------------------------------------------------------------

/**
 * OPEX & Savings: the building's operating cost before any BMS, from its documents now (not a proposal snapshot):
 * - `total`: "Building operating cost" (7.1.1-S8): "Not available yet", naming the open question on annual amounts
 *   (R-095 "Until decided");
 * - `energy`: the energy cost, with the owner's action where there is one: for an existing building, "Not available
 *   yet", naming the energy data read from bills, with `upload_document` (US-FIN-13 AC8); for new construction, "Not
 *   available yet", naming what an estimate lacks, with no upload (AC9); per billing period once bill fields exist
 *   (not in this build: no energy-data field is registered);
 * - `maintenance`, `staff`, `other`: Unknown, no document states them (US-FIN-14 AC1; nothing new is asked, AC2);
 * - `intensity`: OPEX INTENSITY: "Not available yet", naming the missing unit for cost per area per year and the open
 *   question on annual amounts (US-FIN-14 AC5); no benchmark marker (7.1.1-S7);
 * - `breakdown`: OPEX BREAKDOWN's shares: "Not available yet", naming the open question on annual amounts (no share
 *   from a total that does not exist: US-FIN-14 AC4); no ⓘ (R-098);
 * - `systems`: SYSTEM OPEX COMPARISON: one row per system whose recorded decision is include (G10-7), its current cost
 *   "Not available yet: per-system metering" (US-FIN-12 AC10); no Baseline or Savings column (AC7). The page's
 *   "All Systems" filter narrows these rows in the page only (AC11);
 * - `noSystems`: while no include decision is recorded (none decided, or every system decided out), the panel's line,
 *   "Not available yet: the systems in scope" (`building:<bid>.operatingCost.systems`), with `choose_systems`, in place
 *   of an empty table (rule 7: "An empty card ... is never shown"; G7-24, G7-15's reading); null while a row is served.
 */
export const OpexViewSchema = z
  .strictObject({
    total: ValueIdSchema,
    energy: z.strictObject({ display: ValueIdSchema, actions: z.array(WorkspaceActionSchema) }),
    maintenance: ValueIdSchema,
    staff: ValueIdSchema,
    other: ValueIdSchema,
    intensity: ValueIdSchema,
    breakdown: ValueIdSchema,
    systems: z.array(z.strictObject({ systemId: z.string().regex(/^[a-z][a-z_]*$/u), decision: ValueIdSchema, current: ValueIdSchema })),
    noSystems: z.strictObject({ line: ValueIdSchema, actions: z.array(WorkspaceActionSchema).min(1) }).nullable(),
  })
  .refine((view) => (view.systems.length === 0) === (view.noSystems !== null), 'the "by system" panel serves its line exactly when it has no row (rule 7; G7-24)');
export const OpexResponseSchema = z.strictObject({ ...screenEnvelope, view: OpexViewSchema }).superRefine(servesEveryValueId);
export type OpexResponse = z.infer<typeof OpexResponseSchema>;

// ---------------------------------------------------------------------------------------------
// Payback Analysis (DB-21; R-096, R-099 to R-103 "Until decided")
// ---------------------------------------------------------------------------------------------

/**
 * Payback Analysis of one stored version:
 * - `investment`: Total Investment (CAPEX), the same price as the other pages' (G2-7);
 * - `payback`: the payback tile, the proposal's payback indicator (no ROI tile: R-096);
 * - `savings`: Estimated Annual Savings (Financial Overview's `savings.total`);
 * - `savingsBreakdown`: SAVINGS BREAKDOWN, a breakdown series ("Not available yet" while no savings estimate exists);
 * - `cumulativeCashFlow`: CUMULATIVE CASH FLOW, a sequence series ("Not available yet", naming the missing payback
 *   inputs, while no payback can be computed: R-103 "Until decided");
 * - `environmental`: the carbon reduction, equivalent trees and cars off the road: "Not available yet", naming the
 *   missing unit and dataset (R-101 "Until decided").
 * "Export Report" (R-121) prints this page from its print route (`metrics.payback.print`) to a PDF (`exports.metrics`).
 */
export const PaybackViewSchema = z.discriminatedUnion('state', [
  MetricsNotGeneratedSchema,
  z.strictObject({
    ...generatedFields,
    investment: InvestmentSchema,
    payback: ValueIdSchema,
    savings: ValueIdSchema,
    savingsBreakdown: SeriesSchema,
    cumulativeCashFlow: SeriesSchema,
    environmental: z.strictObject({ carbon: ValueIdSchema, trees: ValueIdSchema, cars: ValueIdSchema }),
  }),
]);
export const PaybackResponseSchema = z.strictObject({ ...screenEnvelope, view: PaybackViewSchema }).superRefine(servesEveryValueId);
export type PaybackResponse = z.infer<typeof PaybackResponseSchema>;

// ---------------------------------------------------------------------------------------------
// Lifecycle Analysis (DB-22; R-097, R-105 "Until decided")
// ---------------------------------------------------------------------------------------------

/**
 * Lifecycle Analysis of one stored version:
 * - `analysisPeriod`: "Not available yet", naming the missing duration unit, never a selectable horizon (US-FIN-04
 *   AC5);
 * - `tiles`: Total Lifecycle Cost, Net Savings, Average Equipment Life: "Not available yet", naming the missing unit or
 *   source (R-105 "Until decided"); no Lifecycle ROI;
 * - `keyInsights`: KEY INSIGHTS, one "Not available yet" line;
 * - `costComparison` (a sequence), `costBreakdown` and `bySystem` (breakdowns): LIFECYCLE COST COMPARISON, COST
 *   BREAKDOWN (LIFECYCLE) and LIFECYCLE BY SYSTEM: "Not available yet" series;
 * - `equipment`: EQUIPMENT LIFECYCLE: "Not available yet: SOVITECH asset taxonomy" while no asset type can be counted
 *   (`dataset-asset-taxonomy`; ADR 0047 decision 7): no row, no chevron, no pagination (US-FIN-26 AC3, AC8, AC11).
 * "Export Report" (R-121) prints this page from its print route (`metrics.lifecycle.print`).
 */
export const LifecycleViewSchema = z.discriminatedUnion('state', [
  MetricsNotGeneratedSchema,
  z.strictObject({
    ...generatedFields,
    analysisPeriod: ValueIdSchema,
    tiles: z.strictObject({ totalCost: ValueIdSchema, netSavings: ValueIdSchema, averageLife: ValueIdSchema }),
    keyInsights: ValueIdSchema,
    costComparison: SeriesSchema,
    costBreakdown: SeriesSchema,
    bySystem: SeriesSchema,
    equipment: ValueIdSchema,
  }),
]);
export const LifecycleResponseSchema = z.strictObject({ ...screenEnvelope, view: LifecycleViewSchema }).superRefine(servesEveryValueId);
export type LifecycleResponse = z.infer<typeof LifecycleResponseSchema>;
