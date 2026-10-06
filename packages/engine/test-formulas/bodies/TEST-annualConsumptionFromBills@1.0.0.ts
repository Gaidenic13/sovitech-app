/**
 * TEST body of `TEST-annualConsumptionFromBills@1.0.0` (G8-7; rule 8 "Energy data": "Annual totals are calculated";
 * "Corrections replace, never add. Regularisation and credit invoices ... replace the periods they correct"). A
 * calculated total (`exclude_and_count`) of one metering point's twelve monthly bills, in which the regularisation
 * invoice for months 10 to 12, when there is one, replaces those three bills: they are read, never added.
 */
import type { FormulaBody } from '../../src/catalogue';
import { point, sum } from '../../src/interval';
import { testValue } from '../engine-lib';
import { BILL_FIELDS, TEST_FIELDS } from '../fields';

const CORRECTED: ReadonlySet<string> = new Set(BILL_FIELDS.slice(9).map((field) => field.key));
const UNCORRECTED: ReadonlySet<string> = new Set();

export const body: FormulaBody = (inputs) => {
  const replaced = inputs.readings.has(TEST_FIELDS.regularisationM10M12.key) ? CORRECTED : UNCORRECTED;
  const periods = [...inputs.readings.values()].filter((reading) => !replaced.has(reading.fieldKey));
  const total = sum(
    periods.flatMap((reading) =>
      reading.values.map((value) => {
        if (value.quantity === undefined || value.quantity.unit !== 'kWh') throw new Error(`TEST: ${reading.fieldKey} is not in kWh`);
        return point(value.quantity.value);
      }),
    ),
  );
  return { 'energy.TEST_annualConsumption': testValue(total.low, 'kWh', undefined, ['TEST: a regularisation replaces the periods it corrects (rule 8)']) };
};
