/**
 * TEST body of `TEST-operatingEnergyFromRegister@1.0.0` (G9-7; 2.1 "consumption from capacity × hours are always
 * estimated"; rule 8: "OPEX uses only electrical input or metered energy"). TEST method, not SOVITECH's: the register's
 * rated electrical input times the TEST hours of the owner's schedule times the TEST climate factor (a reference value),
 * spread by the TEST method's range.
 */
import { FIELD } from '@sovitech/registry';
import type { FormulaBody } from '../../src/catalogue';
import { multiply, percentOf, point } from '../../src/interval';
import { choicesOf, entriesOf, missingInput, notAvailable, quantityOf, tableNumber, tablePercentRange, testEstimate } from '../engine-lib';
import { TEST_DATASET_IDS } from '../datasets';
import { TEST_FIELDS } from '../fields';

export const body: FormulaBody = (inputs) => {
  const input = quantityOf(inputs, TEST_FIELDS.ratedElectricalInput.key, 'kW');
  const climate = quantityOf(inputs, TEST_FIELDS.climateFactor.key, '%');
  if (input === undefined) return { 'energy.TEST_operating': notAvailable(missingInput(inputs, TEST_FIELDS.ratedElectricalInput.key, 'unknown')) };
  if (climate === undefined) return { 'energy.TEST_operating': notAvailable(missingInput(inputs, TEST_FIELDS.climateFactor.key, 'unknown')) };
  const tables = entriesOf(inputs, TEST_DATASET_IDS.engineTables);
  const [schedule] = choicesOf(inputs, FIELD.operatingSchedule);
  if (schedule === undefined) throw new Error('TEST: a refuse-policy body was run without its schedule');
  const hours = point(tableNumber(tables, ['hoursBySchedule', schedule], `hoursBySchedule.${schedule}`));
  const energy = multiply(multiply(multiply(input, hours), climate), point(percentOf(1)));
  return { 'energy.TEST_operating': testEstimate(multiply(energy, tablePercentRange(tables, ['energySpreadPercent'], 'energySpreadPercent')), 'kWh/a') };
};
