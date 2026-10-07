/**
 * The TEST chart series of the engine's TEST catalogue (phase 6; the engine's ../src/series.ts; docs/adr/0047, amended,
 * and docs/adr/0052 decision 4; the build log, phase 6, "Cases"): no production formula declares a series, so the
 * mechanism (one snapshot, one formula version, labelled gaps, positions agreeing with labels) is proven with these, in
 * the test runner only (prompt 3 5.4; G1-5, G9-8, G9-9, G10-7).
 *
 * - `capex.TEST_bySystem` (a breakdown): the lines of `TEST-capexBySystem@1.0.0`, one per system of the catalogue,
 *   named by the system, and its total;
 * - `cashFlow.TEST_cumulative` (a sequence): the cumulative cash flow of `TEST-cashFlow@1.0.0` for TEST years 0 to 10,
 *   each named "TEST year <n>"; the TEST payback is another output of the same formula, beside the chart (G9-9).
 *
 * Their output fields are TEST fields declared here (each key carries "TEST"), estimation allowed, in the unit each
 * output measures (2.7): EUR for the lines, the total and the cash flow; `count` for the TEST payback, counted in TEST
 * years (no duration unit exists: 7.2.22). They live here, not in ./fields.ts, so no TEST body's hash input changes
 * (G9-11: a helper a body loads, changed, would change its version). Nothing in apps/ or packages/*\/src imports this
 * file.
 */
import { FIELD, SCOPE_FIELDS, SYSTEMS } from '@sovitech/registry';
import type { FieldDefinition } from '@sovitech/domain';
import type { SeriesDeclaration } from '../src/series';
import { OUTPUTS as CAPEX_OUTPUTS, TOTAL_OUTPUT, lineOutputOf } from './bodies/TEST-capexBySystem@1.0.0';
import { OUTPUTS as CASH_FLOW_OUTPUTS, PAYBACK_OUTPUT, TEST_YEARS, yearKeyOf, yearOutputOf } from './bodies/TEST-cashFlow@1.0.0';
import { testFieldDefinition, testFieldEntry } from './fields';

/** A TEST output field of the project, estimation allowed, in `unit`. */
const output = (key: string, unit: string, label: string): FieldDefinition => testFieldEntry(key, { kind: 'quantity', subject: 'project', unit, estimation: 'allowed', label });

/** The TEST output field of each output of the two TEST series formulas, by output. */
export const SERIES_OUTPUT_FIELDS: Readonly<Record<string, FieldDefinition>> = Object.freeze({
  ...Object.fromEntries(SYSTEMS.map((system) => [lineOutputOf(system.id), output(`project.TEST_capexBySystem_${system.id}`, 'EUR', `TEST investment line of ${system.name}`)])),
  [TOTAL_OUTPUT]: output('project.TEST_capexBySystemTotal', 'EUR', 'TEST investment by system, total'),
  [PAYBACK_OUTPUT]: output('project.TEST_paybackPeriods', 'count', 'TEST payback in TEST years'),
  ...Object.fromEntries(TEST_YEARS.map((year) => [yearOutputOf(year), output(`project.TEST_cumulativeCashFlow_${yearKeyOf(year)}`, 'EUR', `TEST cumulative cash flow, ${yearKeyOf(year)}`)])),
});

/** Every TEST series output field, by key. */
export const SERIES_FIELD_DEFINITIONS: ReadonlyMap<string, FieldDefinition> = new Map(Object.values(SERIES_OUTPUT_FIELDS).map((field) => [field.key, field] as const));

/** The registry lookup of the TEST runs with the series: the series' TEST output fields, then ./fields.ts's lookup. */
export function testSeriesFieldDefinition(key: string): FieldDefinition | undefined {
  return SERIES_FIELD_DEFINITIONS.get(key) ?? testFieldDefinition(key);
}

/** The formula of each TEST series, with its signature's parts (the catalogue, ./engine.ts, builds the formulas). */
export const SERIES_FORMULAS = Object.freeze({
  'TEST-capexBySystem': { inputs: [FIELD.buildingType, ...SCOPE_FIELDS], outputs: CAPEX_OUTPUTS, unknownPolicy: 'range_over_options', estimated: true },
  'TEST-cashFlow': { inputs: [FIELD.buildingType, ...SCOPE_FIELDS], outputs: CASH_FLOW_OUTPUTS, unknownPolicy: 'refuse', estimated: true },
} as const);

/** `capex.TEST_bySystem`: a breakdown, its total and one point per system, named by the system (G1-5, G9-8, G10-7). */
export const CAPEX_BY_SYSTEM_SERIES: SeriesDeclaration = Object.freeze({
  id: 'capex.TEST_bySystem',
  kind: 'breakdown',
  formula: 'TEST-capexBySystem',
  total: TOTAL_OUTPUT,
  points: Object.freeze(SYSTEMS.map((system) => Object.freeze({ key: system.id, output: lineOutputOf(system.id), name: Object.freeze({ kind: 'system' as const, systemId: system.id }) }))),
});

/** `cashFlow.TEST_cumulative`: a sequence of TEST years 0 to 10, each named "TEST year <n>" (G9-9). */
export const CUMULATIVE_CASH_FLOW_SERIES: SeriesDeclaration = Object.freeze({
  id: 'cashFlow.TEST_cumulative',
  kind: 'sequence',
  formula: 'TEST-cashFlow',
  total: null,
  points: Object.freeze(TEST_YEARS.map((year) => Object.freeze({ key: yearKeyOf(year), output: yearOutputOf(year), name: Object.freeze({ kind: 'text' as const, text: `TEST year ${String(year)}` }) }))),
});

/** The TEST series by the formula whose outputs they draw. */
export const TEST_SERIES_BY_FORMULA: Readonly<Record<string, readonly SeriesDeclaration[]>> = Object.freeze({
  'TEST-capexBySystem': [CAPEX_BY_SYSTEM_SERIES],
  'TEST-cashFlow': [CUMULATIVE_CASH_FLOW_SERIES],
});
