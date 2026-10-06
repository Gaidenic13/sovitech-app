/**
 * TEST body of `TEST-savingsEstimate@1.0.0`, the mirror of `savingsEstimate@1` (rule 10: savings are always
 * estimated, "could save", never "will save"). TEST method, not SOVITECH's: the gross floor area times the TEST
 * intensity range times the sum of the TEST savings percentages of each automation area selected whose systems are in
 * scope. An area that may be selected, or whose systems may be in scope, adds to the high bound only; an area whose
 * systems are all excluded adds nothing (G10-7). It reads the occupancy, the schedule, the country and the city, as the
 * signature declares, and uses none.
 */
import { AUTOMATION_AREAS, FIELD, SYSTEMS, automationFieldKey, scopeFieldKey } from '@sovitech/registry';
import type { FormulaBody } from '../../src/catalogue';
import { exact, hull, multiply, point, sum, type Interval } from '../../src/interval';
import { choicesOf, decisionHolds, entriesOf, missingInput, notAvailable, quantityOf, tablePercentRange, tableRange, testEstimate } from '../engine-lib';
import { TEST_DATASET_IDS } from '../datasets';
import { lookup } from '../lib';

/** What an area adds whose systems are excluded or that is not selected: nothing, by the owner's decision. */
const NO_SAVING: Interval = point(exact(0));

type Holds = 'yes' | 'maybe' | 'no';

/** The shares an area adds: its share for certain, its share or nothing when ranged over, nothing when it does not hold. */
function shares(holds: Holds, share: Interval): Interval[] {
  switch (holds) {
    case 'yes':
      return [share];
    case 'maybe':
      return [hull([NO_SAVING, share])];
    case 'no':
      return [];
  }
}

export const body: FormulaBody = (inputs) => {
  const energy = entriesOf(inputs, TEST_DATASET_IDS.energyBenchmarks);
  const factors = entriesOf(inputs, TEST_DATASET_IDS.savingsFactors);
  const area = quantityOf(inputs, FIELD.grossFloorArea, 'm2', 'gross_total');
  if (area === undefined) return { 'savings.annualEnergy': notAvailable(missingInput(inputs, FIELD.grossFloorArea, 'unknown')) };
  const parts = AUTOMATION_AREAS.flatMap((automation) => {
    const selected = decisionHolds(inputs, automationFieldKey(automation.id), 'selected');
    const requires = lookup(factors, 'requires', automation.id);
    const systems = requires === 'any' ? SYSTEMS.map((system) => system.id) : Array.isArray(requires) ? requires.map(String) : [];
    const scope = systems.map((system) => decisionHolds(inputs, scopeFieldKey(system), 'include'));
    const served: Holds = scope.includes('yes') ? 'yes' : scope.includes('maybe') ? 'maybe' : 'no';
    const holds: Holds = selected === 'no' || served === 'no' ? 'no' : selected === 'yes' && served === 'yes' ? 'yes' : 'maybe';
    return shares(holds, tablePercentRange(factors, ['percentByArea', automation.id], `percentByArea.${automation.id}`));
  });
  if (parts.length === 0) return { 'savings.annualEnergy': notAvailable({ kind: 'method', name: 'TEST: no automation area with its systems in scope' }) };
  const ranges: Interval[] = [];
  for (const type of choicesOf(inputs, FIELD.buildingType)) {
    if (lookup(energy, 'intensityByBuildingType', type) === undefined) {
      return { 'savings.annualEnergy': notAvailable({ kind: 'method', name: `TEST: no energy intensity for the building type ${type}` }) };
    }
    ranges.push(multiply(multiply(area, tableRange(energy, ['intensityByBuildingType', type], `intensityByBuildingType.${type}`)), sum(parts)));
  }
  return { 'savings.annualEnergy': testEstimate(hull(ranges), 'kWh/a') };
};
