/**
 * TEST body of `TEST-capexLineItems@1.0.0` (G1-2; rule 1 "Material exclusions"; `exclude_and_count`). TEST method, not
 * SOVITECH's: each line item's count of TEST devices times the TEST range per device, added over the line items the
 * engine handed it (the known ones). The engine, not the body, leaves out the unknown items, counts them, and reads the
 * total as "Incomplete: excludes <item names>" when one is not `minorForTotals`.
 */
import type { FormulaBody } from '../../src/catalogue';
import { multiply, sum } from '../../src/interval';
import { entriesOf, quantityOf, tableRange, testEstimate } from '../engine-lib';
import { TEST_DATASET_IDS } from '../datasets';

export const body: FormulaBody = (inputs) => {
  const perItem = tableRange(entriesOf(inputs, TEST_DATASET_IDS.engineTables), ['perLineItem'], 'perLineItem');
  const priced = [...inputs.readings.keys()].flatMap((fieldKey) => {
    const count = quantityOf(inputs, fieldKey, 'count');
    if (count === undefined) throw new Error(`TEST: the engine handed ${fieldKey} with no count`);
    return [multiply(count, perItem)];
  });
  return { 'capex.TEST_lineItems': testEstimate(sum(priced), 'EUR') };
};
