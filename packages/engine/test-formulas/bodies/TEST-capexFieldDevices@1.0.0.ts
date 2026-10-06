/**
 * TEST body of `TEST-capexFieldDevices@1.0.0` (G1-7; rule 1 "Reuse": "Reuse of existing field devices, wiring or
 * controllers is never assumed. Until a survey, the estimate shows reuse and replacement as a range"). TEST method, not
 * SOVITECH's: the existing field devices times the TEST range per device for each option of the reuse field (one when
 * a site survey has recorded it; both while it is unknown, `range_over_options`), and the hull of the results.
 */
import type { FormulaBody } from '../../src/catalogue';
import { hull, multiply } from '../../src/interval';
import { choicesOf, entriesOf, missingInput, notAvailable, quantityOf, tableRange, testEstimate } from '../engine-lib';
import { TEST_DATASET_IDS } from '../datasets';
import { TEST_FIELDS } from '../fields';

export const body: FormulaBody = (inputs) => {
  const devices = quantityOf(inputs, TEST_FIELDS.fieldDevices.key, 'count');
  if (devices === undefined) return { 'capex.TEST_fieldDevices': notAvailable(missingInput(inputs, TEST_FIELDS.fieldDevices.key, 'unknown')) };
  const tables = entriesOf(inputs, TEST_DATASET_IDS.engineTables);
  const options = choicesOf(inputs, TEST_FIELDS.fieldDevicesReuse.key);
  const range = hull(options.map((option) => multiply(devices, tableRange(tables, ['perDevice', option], `perDevice.${option}`))));
  return { 'capex.TEST_fieldDevices': testEstimate(range, 'EUR', undefined, ['TEST: reuse of existing field devices is not assumed until a site survey']) };
};
