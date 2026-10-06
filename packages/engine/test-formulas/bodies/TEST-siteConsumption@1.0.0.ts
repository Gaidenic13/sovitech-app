/**
 * TEST body of `TEST-siteConsumption@1.0.0` (G8-8; rule 8 "Energy data": "Meters form a hierarchy. A sub-meter is never
 * added to its parent. When the hierarchy is unknown, only utility meters are summed"). A calculated total over the
 * utility meter; the BMS sub-meter export is read and never added.
 */
import type { FormulaBody } from '../../src/catalogue';
import { missingInput, notAvailable, quantityOf, testValue } from '../engine-lib';
import { TEST_FIELDS } from '../fields';

export const body: FormulaBody = (inputs) => {
  const utility = quantityOf(inputs, TEST_FIELDS.utilityMeterTotal.key, 'kWh');
  if (utility === undefined) return { 'energy.TEST_siteConsumption': notAvailable(missingInput(inputs, TEST_FIELDS.utilityMeterTotal.key, 'unknown')) };
  return { 'energy.TEST_siteConsumption': testValue(utility.low, 'kWh', undefined, ['TEST: only utility meters are summed; a sub-meter is never added to its parent (rule 8)']) };
};
