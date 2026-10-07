/**
 * The kit harness page's chart series (tests/e2e/pages/ui/metrics.html, generated from ./kit.tsx; phase 6): the kit's
 * chart in the states the live app never shows (no production formula declares a series: every live chart is one "Not
 * available yet" line), so the render test and axe read the marks, the gaps and the table view in Chromium (docs/adr/0052
 * decision 5; G1-5, G9-9 rendered halves). Plain data, no JSX, so tests/guardrails/G9-9.test.ts reads the same series
 * and checks that each mark sits where the formatting module places the value its label shows (phase 6 part B, A-7).
 * TEST values in the digit pattern; none comes from the mockups, the specs or company/.
 */
import { SeriesSchema, type DisplayObject, type Series } from '@sovitech/view-model/browser';

/** The harness's subject of an Add (as ./kit.tsx's SUBJECT). */
const SUBJECT = '0192f000-0000-7000-8000-00000000b001';

export const METRICS_SNAPSHOT = '0192f000-0000-7000-8000-00000000e601';
const MP = `proposal:${METRICS_SNAPSHOT}`;
const seriesName = (series: string, point: string, text: string): DisplayObject => ({ valueId: `${MP}.series.${series}.points.${point}.name`, kind: 'line', text, shape: 'value' });
const seriesEstimate = (output: string, text: string): DisplayObject => ({
  valueId: `${MP}.outputs.${output}`,
  kind: 'field',
  text,
  shape: 'range',
  badge: { id: 'estimated', label: 'Estimated' },
  sourceLine: { id: 'based_on', kind: 'source_line', text: 'Based on TEST cost table v1' },
});
/** A part of an investment: its stage label first among its figure's lines (rule 10; phase 6 part B, A-3). */
const seriesPart = (output: string, text: string): DisplayObject => ({
  ...seriesEstimate(output, text),
  lines: [{ id: 'preliminary_investment_estimate', kind: 'stage_label', text: 'Preliminary investment estimate' }],
});
/** A part's price, its figure its own value; a stage only where a figure exists (G10-11). */
const partPrice = (display: DisplayObject, staged: boolean) => ({ figure: display.valueId, stageId: staged ? ('preliminary_investment_estimate' as const) : null, quotationRecordId: null });
const CHART_HVAC = seriesPart('capex.TEST_bySystem.hvac', 'about TEST 1,234 (TEST 1,123 to TEST 1,345) EUR');
const CHART_LIGHTING = seriesPart('capex.TEST_bySystem.lighting', 'about TEST 123 (TEST 112 to TEST 134) EUR');
const CHART_GAP: DisplayObject = {
  valueId: `${MP}.outputs.capex.TEST_bySystem.access_control`,
  kind: 'field',
  text: 'Not available yet: TEST cost table for access control',
  shape: 'missing',
  missing: 'not_available_yet',
};
const CHART_UNKNOWN: DisplayObject = { valueId: `${MP}.outputs.capex.TEST_bySystem.water`, kind: 'field', text: 'Unknown', shape: 'missing', missing: 'unknown', badge: { id: 'unknown', label: 'Unknown' } };
const CHART_TOTAL: DisplayObject = {
  valueId: `${MP}.outputs.capex.TEST_total`,
  kind: 'line',
  text: 'Incomplete: excludes TEST access control, TEST water',
  shape: 'value',
  lines: [{ id: 'preliminary_investment_estimate', kind: 'stage_label', text: 'Preliminary investment estimate' }],
};
export const CHART_BREAKDOWN: Series = {
  series: 'capex.TEST_bySystem',
  kind: 'breakdown',
  state: 'figures',
  source: { snapshotId: METRICS_SNAPSHOT, formula: { id: 'TEST-capexBySystem', version: '1.0.0' } },
  notAvailable: null,
  total: { kind: 'price', output: 'capex.TEST_total', price: { figure: CHART_TOTAL.valueId, stageId: 'preliminary_investment_estimate', quotationRecordId: null } },
  points: [
    { key: 'hvac', name: `${MP}.series.capex.TEST_bySystem.points.hvac.name`, value: CHART_HVAC.valueId, price: partPrice(CHART_HVAC, true), plot: { low: 834, high: 1000, mark: 917 } },
    { key: 'lighting', name: `${MP}.series.capex.TEST_bySystem.points.lighting.name`, value: CHART_LIGHTING.valueId, price: partPrice(CHART_LIGHTING, true), plot: { low: 83, high: 100, mark: 91 } },
    { key: 'access_control', name: `${MP}.series.capex.TEST_bySystem.points.access_control.name`, value: CHART_GAP.valueId, price: partPrice(CHART_GAP, false), plot: null },
    { key: 'water', name: `${MP}.series.capex.TEST_bySystem.points.water.name`, value: CHART_UNKNOWN.valueId, price: partPrice(CHART_UNKNOWN, false), plot: null },
  ],
  zero: 0,
};
const CHART_YEARS: readonly DisplayObject[] = [
  seriesEstimate('cashFlow.TEST_cumulative.year_0', 'about TEST -1,234 (TEST -1,345 to TEST -1,123) EUR'),
  seriesEstimate('cashFlow.TEST_cumulative.year_1', 'about TEST -123 (TEST -134 to TEST -112) EUR'),
  { valueId: `${MP}.outputs.cashFlow.TEST_cumulative.year_2`, kind: 'field', text: 'TEST 1,234 EUR', shape: 'value', badge: { id: 'calculated', label: 'Calculated' }, sourceLine: { id: 'calculated_from', kind: 'source_line', text: 'Calculated by TEST-cashFlow v1' } },
];
export const CHART_SEQUENCE: Series = {
  series: 'cashFlow.TEST_cumulative',
  kind: 'sequence',
  state: 'figures',
  source: { snapshotId: METRICS_SNAPSHOT, formula: { id: 'TEST-cashFlow', version: '1.0.0' } },
  notAvailable: null,
  total: null,
  points: [
    // A-7 (phase 6 part B): the formatting module's positions of the labelled values (axis -1,345 to 1,234), checked by G9-9.
    { key: 'year_0', name: `${MP}.series.cashFlow.TEST_cumulative.points.year_0.name`, value: CHART_YEARS[0]?.valueId ?? '', price: null, plot: { low: 0, high: 87, mark: 43 } },
    { key: 'year_1', name: `${MP}.series.cashFlow.TEST_cumulative.points.year_1.name`, value: CHART_YEARS[1]?.valueId ?? '', price: null, plot: { low: 469, high: 479, mark: 474 } },
    { key: 'year_2', name: `${MP}.series.cashFlow.TEST_cumulative.points.year_2.name`, value: CHART_YEARS[2]?.valueId ?? '', price: null, plot: { low: 1000, high: 1000, mark: null } },
  ],
  zero: 522,
};
export const CHART_UNAVAILABLE_LINE: DisplayObject = {
  valueId: `${MP}.series.capex.bySystem.notAvailable`,
  kind: 'line',
  text: "Not available yet: TEST cost ranges; SOVITECH's method for TEST investment by system",
  shape: 'missing',
  missing: 'not_available_yet',
  actions: [{ kind: 'add', field: { subjectId: SUBJECT, fieldKey: 'building.grossFloorArea' }, label: 'Add the TEST gross floor area', step: 8 }],
};
export const CHART_UNAVAILABLE: Series = { series: 'capex.bySystem', kind: 'breakdown', state: 'not_available_yet', source: null, notAvailable: CHART_UNAVAILABLE_LINE.valueId, total: null, points: [], zero: null };
export const TILE_PRICE: DisplayObject = {
  valueId: `${MP}.outputs.capex.preliminaryEstimate`,
  kind: 'field',
  text: 'about TEST 12,345 (TEST 11,234 to TEST 13,456) EUR',
  shape: 'range',
  badge: { id: 'estimated', label: 'Estimated' },
  sourceLine: { id: 'based_on', kind: 'source_line', text: 'Based on TEST cost ranges v1' },
  lines: [{ id: 'preliminary_investment_estimate', kind: 'stage_label', text: 'Preliminary investment estimate' }],
};
export const TILE_MISSING: DisplayObject = { valueId: `${MP}.indicators.payback`, kind: 'line', text: 'Not available yet: TEST duration unit; TEST financial method', shape: 'missing', missing: 'not_available_yet' };
export const METRICS_DISPLAYS: readonly DisplayObject[] = [
  seriesName('capex.TEST_bySystem', 'hvac', 'TEST HVAC'),
  seriesName('capex.TEST_bySystem', 'lighting', 'TEST Lighting'),
  seriesName('capex.TEST_bySystem', 'access_control', 'TEST Access control'),
  seriesName('capex.TEST_bySystem', 'water', 'TEST Water'),
  CHART_HVAC,
  CHART_LIGHTING,
  CHART_GAP,
  CHART_UNKNOWN,
  CHART_TOTAL,
  seriesName('cashFlow.TEST_cumulative', 'year_0', 'TEST year 0'),
  seriesName('cashFlow.TEST_cumulative', 'year_1', 'TEST year 1'),
  seriesName('cashFlow.TEST_cumulative', 'year_2', 'TEST year 2'),
  ...CHART_YEARS,
  CHART_UNAVAILABLE_LINE,
  TILE_PRICE,
  TILE_MISSING,
];
export const METRICS_INDEX: ReadonlyMap<string, DisplayObject> = new Map(METRICS_DISPLAYS.map((display) => [display.valueId, display]));
for (const series of [CHART_BREAKDOWN, CHART_SEQUENCE, CHART_UNAVAILABLE]) {
  const parsed = SeriesSchema.safeParse(series);
  if (!parsed.success) throw new Error(`ui/metrics.html: ${series.series} is not a valid series: ${parsed.error.message}`);
}
