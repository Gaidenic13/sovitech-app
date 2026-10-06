/**
 * TEST body of `TEST-capexIndicativeRange@1.0.0`, the mirror of `capexIndicativeRange@1` (rule 10 stage 1, "Indicative
 * range": benchmarks only). TEST method, not SOVITECH's: the TEST per-building range of each system in scope, by
 * building type, times the TEST country and project-type percentages. It reads no area, so it can stand as rule 7's
 * fallback when the area is the missing first-estimate input (G7-2a); the production signature reads the area, which
 * the build log records.
 */
import { FIELD, SYSTEMS, scopeFieldKey } from '@sovitech/registry';
import type { FormulaBody } from '../../src/catalogue';
import { multiply, sum } from '../../src/interval';
import { choicesOf, entriesOf, notAvailable, tablePercent, tablePercentRange, tableRange, testEstimate, textOf } from '../engine-lib';
import { TEST_DATASET_IDS } from '../datasets';
import { lookup } from '../lib';

export const body: FormulaBody = (inputs) => {
  const cost = entriesOf(inputs, TEST_DATASET_IDS.costRanges);
  const tables = entriesOf(inputs, TEST_DATASET_IDS.engineTables);
  const [type] = choicesOf(inputs, FIELD.buildingType);
  const [projectType] = choicesOf(inputs, FIELD.projectType);
  const country = textOf(inputs, FIELD.country);
  if (type === undefined || projectType === undefined || country === undefined) throw new Error('TEST: a refuse-policy body was run without its inputs');
  if (lookup(tables, 'perBuildingByTypeAndSystem', type) === undefined) {
    return { 'capex.indicativeRange': notAvailable({ kind: 'method', name: `TEST: no cost range for the building type ${type}` }) };
  }
  if (lookup(cost, 'countryPercent', country) === undefined) {
    return { 'capex.indicativeRange': notAvailable({ kind: 'method', name: 'TEST: no cost entry for the country' }) };
  }
  const systems = SYSTEMS.map((system) => system.id).filter((id) => choicesOf(inputs, scopeFieldKey(id)).includes('include'));
  if (systems.length === 0) return { 'capex.indicativeRange': notAvailable({ kind: 'method', name: 'TEST: no system in scope' }) };
  const perBuilding = sum(systems.map((id) => tableRange(tables, ['perBuildingByTypeAndSystem', type, id], `perBuildingByTypeAndSystem.${type}.${id}`)));
  const range = multiply(multiply(perBuilding, tablePercent(cost, ['countryPercent', country], 'countryPercent')), tablePercentRange(cost, ['projectTypePercent', projectType], 'projectTypePercent'));
  return { 'capex.indicativeRange': testEstimate(range, 'EUR') };
};
