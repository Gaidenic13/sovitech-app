/**
 * TEST chart series for the kit's SeriesChart tests (phase 6; not exported by the package). Each series is valid under
 * the contract's `SeriesSchema` and each display under `DisplayObjectSchema` (checked in SeriesChart.test.tsx), so the
 * chart is tested on what the API can serve. Every value is visibly synthetic ("TEST", digit patterns); none comes
 * from the mockups, the specs or company/. The plot positions are the formatting module's kind (integers 0 to 1000),
 * worked out by hand for the TEST values (the axis from the lowest to the highest bound; low bounds rounded down, high
 * bounds up), and checked against the formatting module by tests/guardrails/G9-9.test.ts (phase 6 part B, A-7): what is
 * tested here is that the chart places each mark where it is told, never that it computes one.
 */
import type { DisplayObject, Series } from '@sovitech/view-model/browser';

export const TEST_SNAPSHOT = '0192f000-0000-7000-8000-00000000a5e1';
const P = `proposal:${TEST_SNAPSHOT}`;

/** A point's name as served: a `line` display, bound (a TEST year's name holds a digit). */
function name(series: string, point: string, text: string): DisplayObject {
  return { valueId: `${P}.series.${series}.points.${point}.name`, kind: 'line', text, shape: 'value' };
}

/** An estimate as the stored proposal serves an output: a range with its Estimated badge, basis and method lines. */
function estimate(output: string, text: string): DisplayObject {
  return {
    valueId: `${P}.outputs.${output}`,
    kind: 'field',
    text,
    shape: 'range',
    badge: { id: 'estimated', label: 'Estimated' },
    sourceLine: { id: 'based_on', kind: 'source_line', text: 'Based on TEST cost table v1' },
    lines: [{ id: 'provisional', kind: 'status_line', text: 'Provisional: depends on TEST 3 equipment items not yet checked' }],
  };
}

/** The stage 2 label a part of an investment carries among its figure's lines (rule 10; V-11; A-3 of phase 6 part B). */
const STAGE_2_LINE = { id: 'preliminary_investment_estimate', kind: 'stage_label', text: 'Preliminary investment estimate' } as const;

/** A part of an investment: the estimate with its stage label first among its lines, as the stored proposal serves it. */
function investmentPart(output: string, text: string): DisplayObject {
  const display = estimate(output, text);
  return { ...display, lines: [STAGE_2_LINE, ...(display.lines ?? [])] };
}

/** The price of a part, its figure its own value: a stage only where a figure exists (G10-11). */
function partPrice(display: DisplayObject, staged: boolean): NonNullable<Series['points'][number]['price']> {
  return { figure: display.valueId, stageId: staged ? 'preliminary_investment_estimate' : null, quotationRecordId: null };
}

// ------------------------------------------------------------------------------------------------ a breakdown with gaps

export const BREAKDOWN_KEY = 'capex.TEST_bySystem';
export const HVAC = investmentPart('capex.TEST_bySystem.hvac', 'about TEST 1,200 (TEST 1,100 to TEST 1,300) EUR');
export const LIGHTING = investmentPart('capex.TEST_bySystem.lighting', 'about TEST 450 (TEST 400 to TEST 520) EUR');
/** A point the engine could not compute for a missing input: "Not available yet", naming what it waited for (G1-5). */
export const ACCESS_GAP: DisplayObject = {
  valueId: `${P}.outputs.capex.TEST_bySystem.access_control`,
  kind: 'field',
  text: 'Not available yet: TEST cost table for access control',
  shape: 'missing',
  missing: 'not_available_yet',
};
/** A point no document states: Unknown, its wording its badge (G1-5). */
export const WATER_GAP: DisplayObject = {
  valueId: `${P}.outputs.capex.TEST_bySystem.water`,
  kind: 'field',
  text: 'Unknown',
  shape: 'missing',
  missing: 'unknown',
  badge: { id: 'unknown', label: 'Unknown' },
};
/** Rule 1's "Incomplete: excludes <item names>" as the total's text, with its stage label (the stored proposal's V-1 form). */
export const INCOMPLETE_TOTAL: DisplayObject = {
  valueId: `${P}.outputs.capex.TEST_total`,
  kind: 'line',
  text: 'Incomplete: excludes TEST access control, TEST water',
  shape: 'value',
  lines: [{ id: 'preliminary_investment_estimate', kind: 'stage_label', text: 'Preliminary investment estimate' }],
};

export const BREAKDOWN: Series = {
  series: BREAKDOWN_KEY,
  kind: 'breakdown',
  state: 'figures',
  source: { snapshotId: TEST_SNAPSHOT, formula: { id: 'TEST-capexBySystem', version: '1.0.0' } },
  notAvailable: null,
  total: { kind: 'price', output: 'capex.TEST_total', price: { figure: INCOMPLETE_TOTAL.valueId, stageId: 'preliminary_investment_estimate', quotationRecordId: null } },
  // A-3 (phase 6 part B): the parts of a priced total are prices, each with the stage its own figure carries.
  points: [
    { key: 'hvac', name: `${P}.series.${BREAKDOWN_KEY}.points.hvac.name`, value: HVAC.valueId, price: partPrice(HVAC, true), plot: { low: 846, high: 1000, mark: 923 } },
    { key: 'lighting', name: `${P}.series.${BREAKDOWN_KEY}.points.lighting.name`, value: LIGHTING.valueId, price: partPrice(LIGHTING, true), plot: { low: 307, high: 400, mark: 346 } },
    { key: 'access_control', name: `${P}.series.${BREAKDOWN_KEY}.points.access_control.name`, value: ACCESS_GAP.valueId, price: partPrice(ACCESS_GAP, false), plot: null },
    { key: 'water', name: `${P}.series.${BREAKDOWN_KEY}.points.water.name`, value: WATER_GAP.valueId, price: partPrice(WATER_GAP, false), plot: null },
  ],
  zero: 0,
};

export const BREAKDOWN_DISPLAYS: readonly DisplayObject[] = [
  name(BREAKDOWN_KEY, 'hvac', 'TEST HVAC'),
  name(BREAKDOWN_KEY, 'lighting', 'TEST Lighting'),
  name(BREAKDOWN_KEY, 'access_control', 'TEST Access control'),
  name(BREAKDOWN_KEY, 'water', 'TEST Water'),
  HVAC,
  LIGHTING,
  ACCESS_GAP,
  WATER_GAP,
  INCOMPLETE_TOTAL,
];

// ------------------------------------------------------------------------------------------------ a sequence crossing zero

export const SEQUENCE_KEY = 'cashFlow.TEST_cumulative';
const yearValue = (year: number, text: string): DisplayObject => estimate(`cashFlow.TEST_cumulative.year_${String(year)}`, text);
export const YEAR_0 = yearValue(0, 'about TEST -1,200 (TEST -1,300 to TEST -1,100) EUR');
export const YEAR_1 = yearValue(1, 'about TEST -700 (TEST -850 to TEST -560) EUR');
export const YEAR_2 = yearValue(2, 'about TEST 120 (TEST -90 to TEST 330) EUR');
/** An exact value (a calculated figure: no range, no central mark). */
export const YEAR_3: DisplayObject = {
  valueId: `${P}.outputs.cashFlow.TEST_cumulative.year_3`,
  kind: 'field',
  text: 'TEST 900 EUR',
  shape: 'value',
  badge: { id: 'calculated', label: 'Calculated' },
  sourceLine: { id: 'calculated_from', kind: 'source_line', text: 'Calculated by TEST-cashFlow v1' },
};

export const SEQUENCE: Series = {
  series: SEQUENCE_KEY,
  kind: 'sequence',
  state: 'figures',
  source: { snapshotId: TEST_SNAPSHOT, formula: { id: 'TEST-cashFlow', version: '1.0.0' } },
  notAvailable: null,
  total: null,
  points: [
    { key: 'year_0', name: `${P}.series.${SEQUENCE_KEY}.points.year_0.name`, value: YEAR_0.valueId, price: null, plot: { low: 0, high: 91, mark: 45 } },
    { key: 'year_1', name: `${P}.series.${SEQUENCE_KEY}.points.year_1.name`, value: YEAR_1.valueId, price: null, plot: { low: 204, high: 337, mark: 273 } },
    { key: 'year_2', name: `${P}.series.${SEQUENCE_KEY}.points.year_2.name`, value: YEAR_2.valueId, price: null, plot: { low: 550, high: 741, mark: 645 } },
    { key: 'year_3', name: `${P}.series.${SEQUENCE_KEY}.points.year_3.name`, value: YEAR_3.valueId, price: null, plot: { low: 1000, high: 1000, mark: null } },
  ],
  zero: 591,
};

export const SEQUENCE_DISPLAYS: readonly DisplayObject[] = [
  name(SEQUENCE_KEY, 'year_0', 'TEST year 0'),
  name(SEQUENCE_KEY, 'year_1', 'TEST year 1'),
  name(SEQUENCE_KEY, 'year_2', 'TEST year 2'),
  name(SEQUENCE_KEY, 'year_3', 'TEST year 3'),
  YEAR_0,
  YEAR_1,
  YEAR_2,
  YEAR_3,
];

// ------------------------------------------------------------------------------------------------ a series not available

export const UNAVAILABLE_KEY = 'capex.bySystem';
/** The one line of a series no formula declares (G1-31): what its total waits for, then the series' method; one Add. */
export const UNAVAILABLE_LINE: DisplayObject = {
  valueId: `${P}.series.${UNAVAILABLE_KEY}.notAvailable`,
  kind: 'line',
  text: "Not available yet: TEST cost ranges; the TEST area; SOVITECH's method for TEST investment by system",
  shape: 'missing',
  missing: 'not_available_yet',
  actions: [{ kind: 'add', field: { subjectId: TEST_SNAPSHOT, fieldKey: 'building.grossFloorArea' }, label: 'Add TEST gross floor area', step: 8 }],
};

export const UNAVAILABLE: Series = {
  series: UNAVAILABLE_KEY,
  kind: 'breakdown',
  state: 'not_available_yet',
  source: null,
  notAvailable: UNAVAILABLE_LINE.valueId,
  total: null,
  points: [],
  zero: null,
};

export const LABELS = {
  name: 'TEST investment by system',
  pointColumn: 'System',
  valueColumn: 'Investment',
  total: 'Total',
  showTable: 'Show as a table',
  showChart: 'Show as a chart',
} as const;

/** The displays of a list, indexed as a page indexes its response's. */
export function index(...lists: ReadonlyArray<readonly DisplayObject[]>): ReadonlyMap<string, DisplayObject> {
  return new Map(lists.flat().map((display) => [display.valueId, display]));
}
