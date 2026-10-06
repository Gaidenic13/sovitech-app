/**
 * TEST body of `TEST-pointsByType@1.0.0` (G9-3; rule 8 "Points": hardware I/O split into AI, AO, DI, DO and UI;
 * integration with its protocol; virtual; "Point types are never summed into one priced total"). TEST method, not
 * SOVITECH's: for each output, the TEST points of every system in scope, spread by the TEST method's range. One output
 * per type; none adds types together.
 */
import { SYSTEMS, scopeFieldKey } from '@sovitech/registry';
import type { BodyOutput, FormulaBody } from '../../src/catalogue';
import { multiply, point, sum } from '../../src/interval';
import { choicesOf, entriesOf, notAvailable, tableNumber, tablePercentRange, testEstimate } from '../engine-lib';
import { TEST_DATASET_IDS } from '../datasets';

export const POINT_TYPE_PATHS: Readonly<Record<string, { readonly path: readonly string[]; readonly qualifier: string }>> = {
  'points.TEST_hardwareIo.AI': { path: ['hardwareIo', 'AI'], qualifier: 'hardware_io' },
  'points.TEST_hardwareIo.AO': { path: ['hardwareIo', 'AO'], qualifier: 'hardware_io' },
  'points.TEST_hardwareIo.DI': { path: ['hardwareIo', 'DI'], qualifier: 'hardware_io' },
  'points.TEST_hardwareIo.DO': { path: ['hardwareIo', 'DO'], qualifier: 'hardware_io' },
  'points.TEST_hardwareIo.UI': { path: ['hardwareIo', 'UI'], qualifier: 'hardware_io' },
  'points.TEST_integration.bacnet_ip': { path: ['integration', 'bacnet_ip'], qualifier: 'integration' },
  'points.TEST_integration.modbus_rtu': { path: ['integration', 'modbus_rtu'], qualifier: 'integration' },
  'points.TEST_virtual': { path: ['virtual'], qualifier: 'virtual' },
};

export const body: FormulaBody = (inputs) => {
  const tables = entriesOf(inputs, TEST_DATASET_IDS.engineTables);
  const systems = SYSTEMS.map((system) => system.id).filter((id) => choicesOf(inputs, scopeFieldKey(id)).includes('include'));
  const spread = tablePercentRange(tables, ['pointsSpreadPercent'], 'pointsSpreadPercent');
  return Object.fromEntries(
    Object.entries(POINT_TYPE_PATHS).map(([output, { path, qualifier }]): [string, BodyOutput] => {
      if (systems.length === 0) return [output, notAvailable({ kind: 'method', name: 'TEST: no system in scope' })];
      const count = sum(systems.map((id) => point(tableNumber(tables, ['pointsByType', id, ...path], `pointsByType.${id}.${path.join('.')}`))));
      return [output, testEstimate(multiply(count, spread), 'count', qualifier)];
    }),
  );
};
