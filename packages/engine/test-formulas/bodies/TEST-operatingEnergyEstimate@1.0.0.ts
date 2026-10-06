/**
 * TEST body of `TEST-operatingEnergyEstimate@1.0.0`, the mirror of `operatingEnergyEstimate@1` (2.1: "consumption from
 * capacity × hours are always estimated"). TEST method, not SOVITECH's: the gross floor area times the TEST intensity
 * range of the building type times the TEST schedule percentage; the range runs over the options of a skipped
 * schedule, occupancy or building type (`range_over_options`; G7-1). It reads the occupancy, the country and the city,
 * as the signature declares, and uses none (TEST arithmetic keeps every figure exact in a JavaScript number).
 */
import { FIELD } from '@sovitech/registry';
import type { FormulaBody } from '../../src/catalogue';
import { hull, multiply, type Interval } from '../../src/interval';
import { choicesOf, entriesOf, missingInput, notAvailable, quantityOf, tablePercent, tableRange, testEstimate } from '../engine-lib';
import { TEST_DATASET_IDS } from '../datasets';
import { lookup } from '../lib';

export const body: FormulaBody = (inputs) => {
  const energy = entriesOf(inputs, TEST_DATASET_IDS.energyBenchmarks);
  const area = quantityOf(inputs, FIELD.grossFloorArea, 'm2', 'gross_total');
  if (area === undefined) return { 'energy.annualConsumption': notAvailable(missingInput(inputs, FIELD.grossFloorArea, 'unknown')) };
  const ranges: Interval[] = [];
  for (const type of choicesOf(inputs, FIELD.buildingType)) {
    if (lookup(energy, 'intensityByBuildingType', type) === undefined) {
      return { 'energy.annualConsumption': notAvailable({ kind: 'method', name: `TEST: no energy intensity for the building type ${type}` }) };
    }
    const intensity = tableRange(energy, ['intensityByBuildingType', type], `intensityByBuildingType.${type}`);
    for (const schedule of choicesOf(inputs, FIELD.operatingSchedule)) {
      ranges.push(multiply(multiply(area, intensity), tablePercent(energy, ['schedulePercent', schedule], `schedulePercent.${schedule}`)));
    }
  }
  return { 'energy.annualConsumption': testEstimate(hull(ranges), 'kWh/a') };
};
