/**
 * TEST body of `TEST-cashFlow@1.0.0` (phase 6; the TEST sequence series `cashFlow.TEST_cumulative` and the payback
 * beside it: G9-9, "The chart is drawn from the engine series of the same snapshot and formula version as the figures
 * beside it. Its year-0 point equals the formula's year-0 cash flow, the zero crossing lies within the displayed
 * payback range, and every labelled point equals its plotted value"). TEST method, not SOVITECH's and no financial
 * method (none is defined: dashboards 8.6, proposal 7.2.12; no unit for a duration exists: 7.2.22), chosen only so the
 * mechanism can be proven:
 * - the TEST investment is the sum of the TEST per-building ranges (TEST engine tables) of the systems in scope for the
 *   building type, so an excluded system adds nothing (G10-7);
 * - the TEST yearly net cash flow is the TEST engine tables' `perLineItem` range, read as EUR a year: a synthetic
 *   number, not a saving, a price or a rate;
 * - the cumulative cash flow of TEST year n (0 to 10) is n times the yearly range less the investment (interval
 *   arithmetic: its range holds every combination), so TEST year 0 is the investment as a negative amount;
 * - the TEST payback, counted in TEST years (the unit `count`: no duration unit exists), runs from the last TEST year
 *   whose cumulative range is still below zero to the first whose range is at or above zero; its central value is the
 *   midpoint. The central values' zero crossing lies between those two years by construction.
 * Every input is known (`refuse`); an unknown one leaves every output not available, named by the engine. No zero is
 * ever stood in for an unknown (rule 1).
 */
import { FIELD, SYSTEMS, scopeFieldKey } from '@sovitech/registry';
import type { BodyOutput, FormulaBody } from '../../src/catalogue';
import { exact, interval, multiply, point, sum, type Interval } from '../../src/interval';
import { choicesOf, entriesOf, notAvailable, tableRange, testEstimate } from '../engine-lib';
import { TEST_DATASET_IDS } from '../datasets';
import { lookup } from '../lib';

/** The TEST years of the sequence: 0 to 10. */
export const TEST_YEARS: readonly number[] = Array.from({ length: 11 }, (_, year) => year);

/** A TEST year's point key and output (value-id safe: `cashFlow.TEST_cumulative.y00`). */
export const yearKeyOf = (year: number): string => `y${String(year).padStart(2, '0')}`;
export const yearOutputOf = (year: number): string => `cashFlow.TEST_cumulative.${yearKeyOf(year)}`;

/** The TEST payback's output. */
export const PAYBACK_OUTPUT = 'payback.TEST_periods';

/** Every output: the payback, then the TEST years in order. */
export const OUTPUTS: readonly string[] = [PAYBACK_OUTPUT, ...TEST_YEARS.map(yearOutputOf)];

const MINUS_ONE: Interval = point(exact(-1));

export const body: FormulaBody = (inputs) => {
  const tables = entriesOf(inputs, TEST_DATASET_IDS.engineTables);
  const [type] = choicesOf(inputs, FIELD.buildingType);
  const none = (name: string): Readonly<Record<string, BodyOutput>> => Object.fromEntries(OUTPUTS.map((output) => [output, notAvailable({ kind: 'method', name })]));
  if (type === undefined || lookup(tables, 'perBuildingByTypeAndSystem', type) === undefined) return none('TEST: no TEST range for the building type');
  const included = SYSTEMS.map((system) => system.id).filter((id) => choicesOf(inputs, scopeFieldKey(id)).includes('include'));
  if (included.length === 0) return none('TEST: no system in scope');
  const investment = sum(included.map((id) => tableRange(tables, ['perBuildingByTypeAndSystem', type, id], `perBuildingByTypeAndSystem.${type}.${id}`)));
  const yearly = tableRange(tables, ['perLineItem'], 'perLineItem');
  const cumulative = TEST_YEARS.map((year) => ({ year, range: sum([multiply(point(exact(year)), yearly), multiply(MINUS_ONE, investment)]) }));
  const answers: Record<string, BodyOutput> = Object.fromEntries(cumulative.map(({ year, range }) => [yearOutputOf(year), testEstimate(range, 'EUR')]));
  // The last TEST year still below zero at the top of its range, and the first at or above zero at the bottom of its range.
  const last = cumulative.filter(({ range }) => range.high.isNegative()).at(-1)?.year;
  const reached = cumulative.find(({ range }) => !range.low.isNegative())?.year;
  answers[PAYBACK_OUTPUT] =
    last === undefined || reached === undefined
      ? notAvailable({ kind: 'method', name: 'TEST: the cumulative cash flow does not reach zero within the TEST years' })
      : testEstimate(interval(exact(last), exact(reached)), 'count');
  return answers;
};
