/**
 * TEST body of `TEST-roomControlPoints@1.0.0` (G10-6; rule 10: "room control where a separate guest room management
 * system (GRMS) exists ... An unknown split is an open item, never an assumption. While a split is unknown, the
 * estimate shows a range over both supply options"; F-CALC-08: "Room controllers are never derived from a room
 * count"). TEST method, not SOVITECH's: the guest rooms times the TEST room points per room of each supply option still
 * open, hardware I/O and integration each its own output, and the hull over the options. It produces points, never a
 * count of room controllers.
 */
import { FIELD } from '@sovitech/registry';
import type { FormulaBody } from '../../src/catalogue';
import { hull, multiply } from '../../src/interval';
import { choicesOf, entriesOf, missingInput, notAvailable, quantityOf, tableRange, testEstimate } from '../engine-lib';
import { TEST_DATASET_IDS } from '../datasets';
import { TEST_FIELDS } from '../fields';

export const body: FormulaBody = (inputs) => {
  const rooms = quantityOf(inputs, FIELD.rooms, 'count', 'guest_rooms');
  if (rooms === undefined) {
    const missing = notAvailable(missingInput(inputs, FIELD.rooms, 'unknown'));
    return { 'points.TEST_roomHardwareIo': missing, 'points.TEST_roomIntegration': missing };
  }
  const tables = entriesOf(inputs, TEST_DATASET_IDS.engineTables);
  const options = choicesOf(inputs, TEST_FIELDS.roomControlSupplier.key);
  const over = (type: 'hardwareIo' | 'integration') =>
    hull(options.map((option) => multiply(rooms, tableRange(tables, ['roomControl', option, type], `roomControl.${option}.${type}`))));
  return {
    'points.TEST_roomHardwareIo': testEstimate(over('hardwareIo'), 'count', 'hardware_io'),
    'points.TEST_roomIntegration': testEstimate(over('integration'), 'count', 'integration'),
  };
};
