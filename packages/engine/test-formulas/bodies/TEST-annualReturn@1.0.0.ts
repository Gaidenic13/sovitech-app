/**
 * TEST body of `TEST-annualReturn@1.0.0` (G1-2: "no headline, payback or ROI is computed from" an incomplete total). TEST
 * method, not SOVITECH's (no financial method is defined: dashboards 8.6): the TEST line-item total's central value
 * times the TEST return range. The engine never hands it a total that reads "Incomplete" (reading.ts: `incomplete`).
 */
import type { FormulaBody } from '../../src/catalogue';
import { multiply } from '../../src/interval';
import { entriesOf, missingInput, notAvailable, quantityOf, tablePercentRange, testEstimate } from '../engine-lib';
import { TEST_DATASET_IDS } from '../datasets';
import { TEST_FIELDS } from '../fields';

export const body: FormulaBody = (inputs) => {
  const capex = quantityOf(inputs, TEST_FIELDS.capexLineItems.key, 'EUR');
  if (capex === undefined) return { 'return.TEST_annual': notAvailable(missingInput(inputs, TEST_FIELDS.capexLineItems.key, 'unknown')) };
  const share = tablePercentRange(entriesOf(inputs, TEST_DATASET_IDS.engineTables), ['returnPercent'], 'returnPercent');
  return { 'return.TEST_annual': testEstimate(multiply(capex, share), 'EUR') };
};
