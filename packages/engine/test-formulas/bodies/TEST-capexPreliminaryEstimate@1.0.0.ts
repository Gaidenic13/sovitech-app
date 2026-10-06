/**
 * TEST body of `TEST-capexPreliminaryEstimate@1.0.0`, the mirror of `capexPreliminaryEstimate@1` (rule 10 stage 2,
 * "Preliminary investment estimate": this project's data). TEST method, not SOVITECH's: the TEST point counts by type
 * (../points.ts), each priced at its own TEST per-point range, then added (one sum of three priced parts; the points
 * themselves are never one total: rule 8). It reads the project type and the country, as the signature declares, and
 * prices neither (G1-7's range over reuse and replacement is `TEST-capexFieldDevices`).
 */
import type { FormulaBody } from '../../src/catalogue';
import { multiply, sum } from '../../src/interval';
import { entriesOf, notAvailable, tableRange, testEstimate } from '../engine-lib';
import { TEST_DATASET_IDS } from '../datasets';
import { POINT_TYPES, testPointCounts } from '../points';

export const body: FormulaBody = (inputs) => {
  const counted = testPointCounts(inputs);
  if ('missing' in counted) return { 'capex.preliminaryEstimate': notAvailable(...counted.missing) };
  const cost = entriesOf(inputs, TEST_DATASET_IDS.costRanges);
  const priced = sum(POINT_TYPES.map((type) => multiply(counted.counts[type], tableRange(cost, ['perPoint', type], `perPoint.${type}`))));
  return { 'capex.preliminaryEstimate': testEstimate(priced, 'EUR') };
};
