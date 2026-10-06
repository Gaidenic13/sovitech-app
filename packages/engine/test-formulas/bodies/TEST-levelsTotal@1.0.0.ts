/**
 * TEST body of `TEST-levelsTotal@1.0.0` (G4-12): the levels of the building added up over the floor structure's level
 * types, a calculated count that takes no range (`refuse`). The engine never runs it on one of two conflicting values
 * (rule 4: "Not available yet: two values for floors").
 */
import { FIELD } from '@sovitech/registry';
import type { FormulaBody } from '../../src/catalogue';
import { point, sum } from '../../src/interval';
import { testValue } from '../engine-lib';

export const body: FormulaBody = (inputs) => {
  const reading = inputs.readings.get(FIELD.floors);
  if (reading === undefined || reading.kind !== 'known') throw new Error('TEST: a refuse-policy body was run without a known floor structure');
  const total = sum(
    reading.values.map((value) => {
      if (value.quantity === undefined) throw new Error('TEST: a floor count holds no quantity');
      return point(value.quantity.value);
    }),
  );
  return { 'levels.TEST_total': testValue(total.low, 'count') };
};
