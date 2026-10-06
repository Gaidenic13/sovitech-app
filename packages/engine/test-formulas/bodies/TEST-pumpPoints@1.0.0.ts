/**
 * TEST body of `TEST-pumpPoints@1.0.0` (G4-4; 2.5 "Counting": "Points are derived per motor or drive and per
 * configuration. '1+1R' is two pumps. A twin-head pump is one asset with two motors"). TEST method, not SOVITECH's: the
 * motors of the pump group's configuration times the TEST hardware points per motor. The motors of a single pump, a
 * duty-and-standby pair and a twin-head pump follow from 2.5's own words; an n+1 group needs its number of pumps,
 * which this TEST formula does not read, so it is named as missing.
 */
import type { FormulaBody } from '../../src/catalogue';
import { exact, multiply, point } from '../../src/interval';
import { choicesOf, entriesOf, notAvailable, tableRange, testEstimate } from '../engine-lib';
import { TEST_DATASET_IDS } from '../datasets';
import { TEST_FIELDS } from '../fields';

const MOTORS: Readonly<Record<string, number>> = { single: 1, duty_standby: 2, twin_head: 2 };

export const body: FormulaBody = (inputs) => {
  const [configuration] = choicesOf(inputs, TEST_FIELDS.pumpConfiguration.key);
  const motors = configuration === undefined || !Object.hasOwn(MOTORS, configuration) ? undefined : MOTORS[configuration];
  if (motors === undefined) {
    return { 'points.TEST_pumpHardwareIo': notAvailable({ kind: 'method', name: `TEST: the number of pumps of an ${String(configuration)} group` }) };
  }
  const perMotor = tableRange(entriesOf(inputs, TEST_DATASET_IDS.engineTables), ['perMotor', 'hardwareIo'], 'perMotor.hardwareIo');
  return {
    'points.TEST_pumpHardwareIo': testEstimate(multiply(point(exact(motors)), perMotor), 'count', 'hardware_io', [`TEST: ${configuration} counts each motor (2.5)`]),
  };
};
