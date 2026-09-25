/**
 * TEST bodies for the production formula signatures (packages/registry/src/production/formulas.ts)
 * and the proposal template slot, for the sensitivity test (docs/guardrails.md
 * rule 6: "On the synthetic fixture project, changing the answer across its
 * options must change at least one declared output"; prompt 3 section 10,
 * phase 1) and, from phase 5, for engine cases whose method no source defines
 * yet (prompt 3 phase 5: "they also run against TEST formulas in
 * packages/engine/test-formulas/").
 *
 * They are not SOVITECH's methods. No production formula exists for any of these
 * signatures: each waits for its SOVITECH dataset and method, and the app shows
 * "Not available yet" naming what is missing. They load only inside the test
 * runner (the sensitivity suite and case files), read only TEST datasets, see
 * only the inputs their signature declares, and compute exactly on whole
 * numbers; a TEST table with no entry for an answer gives a "notAvailable"
 * output naming it, never a zero or a stand-in value (rule 1).
 */
import { AUTOMATION_AREAS, FIELD, GOALS, OUTPUT, SYSTEMS, automationFieldKey, goalFieldKey, scopeFieldKey } from '@sovitech/registry';
import type { SensitivityValues, TestFormula, TestFormulaContext, TestTemplate } from '@sovitech/registry/validation';
import { countOf, decimalText, lookup, sum, testDataset, whole, wholeQuantity, wholeRange } from './lib';

const COST = 'TEST-sovitech-cost-ranges';
const POINTS = 'TEST-sovitech-point-templates';
const ENERGY = 'TEST-energy-benchmarks';
const SAVINGS = 'TEST-savings-factors';
const FUNCTIONS = 'TEST-sovitech-function-set';

type PointType = 'hardwareIo' | 'integration' | 'virtual';
const POINT_TYPES: readonly PointType[] = ['hardwareIo', 'integration', 'virtual'];

const text = (inputs: SensitivityValues, key: string): string => {
  const value = inputs[key];
  if (typeof value !== 'string') throw new Error(`${key} is not a TEST answer the formula can read: ${JSON.stringify(value)}`);
  return value;
};

const included = (inputs: SensitivityValues): string[] => SYSTEMS.map((system) => system.id).filter((id) => text(inputs, scopeFieldKey(id)) === 'include');
const selectedAreas = (inputs: SensitivityValues): string[] =>
  AUTOMATION_AREAS.map((area) => area.id).filter((id) => text(inputs, automationFieldKey(id)) === 'selected');
const selectedGoals = (inputs: SensitivityValues): string[] => GOALS.map((goal) => goal.id).filter((id) => text(inputs, goalFieldKey(id)) === 'selected');

const notAvailable = (why: string): { readonly notAvailable: string } => ({ notAvailable: why });

/** Points by type for the answers, or why they are not available: a TEST points template. */
function points(inputs: SensitivityValues, context: TestFormulaContext): Record<PointType, bigint> | { readonly notAvailable: string } {
  const templates = testDataset(context, POINTS);
  const type = text(inputs, FIELD.buildingType);
  const base = lookup(templates, 'base', type);
  if (base === undefined) return notAvailable(`no TEST points template for the building type ${type}`);
  const systems = included(inputs);
  const upper = countOf(inputs[FIELD.floors], 'upper', FIELD.floors);
  const guestRooms = countOf(inputs[FIELD.rooms], 'guest_rooms', FIELD.rooms);
  const hvacZones = countOf(inputs[FIELD.zones], 'hvac_control', FIELD.zones);
  const perSystem = (pointType: PointType): bigint[] => systems.map((id) => whole(lookup(base, id, pointType), `base.${type}.${id}.${pointType}`));
  const floorPoints = systems.map((id) => upper * whole(lookup(templates, 'perUpperFloor', id), `perUpperFloor.${id}`));
  const areaPoints = selectedAreas(inputs).map((id) => whole(lookup(templates, 'perArea', id), `perArea.${id}`));
  return {
    hardwareIo: sum([...perSystem('hardwareIo'), ...floorPoints, guestRooms * whole(lookup(templates, 'perGuestRoom'), 'perGuestRoom')]),
    integration: sum(perSystem('integration')),
    virtual: sum([...perSystem('virtual'), ...areaPoints, hvacZones * whole(lookup(templates, 'perHvacZone'), 'perHvacZone')]),
  };
}

/** Annual energy in kWh/a, scaled by 10^6 (three percentages), or why it is not available. */
function annualEnergy(inputs: SensitivityValues, context: TestFormulaContext): { readonly low: bigint; readonly high: bigint } | { readonly notAvailable: string } {
  const energy = testDataset(context, ENERGY);
  const type = text(inputs, FIELD.buildingType);
  const intensity = lookup(energy, 'intensityByBuildingType', type);
  if (intensity === undefined) return notAvailable(`no TEST energy intensity for the building type ${type}`);
  const range = wholeRange(intensity, `intensityByBuildingType.${type}`);
  const area = wholeQuantity(inputs[FIELD.grossFloorArea], 'm2', 'gross_total', FIELD.grossFloorArea);
  const occupancy = whole(lookup(energy, 'occupancyPercent', text(inputs, FIELD.occupancy)), 'occupancyPercent');
  const schedule = whole(lookup(energy, 'schedulePercent', text(inputs, FIELD.operatingSchedule)), 'schedulePercent');
  const climate = lookup(energy, 'climatePercent', text(inputs, FIELD.country), text(inputs, FIELD.city));
  if (climate === undefined) return notAvailable('no TEST climate entry for the country and city');
  const factor = area * occupancy * schedule * whole(climate, 'climatePercent');
  return { low: range.low * factor, high: range.high * factor };
}

const capexIndicativeRange: TestFormula = (inputs, context) => {
  const cost = testDataset(context, COST);
  const type = text(inputs, FIELD.buildingType);
  const rates = lookup(cost, 'perM2ByBuildingTypeAndSystem', type);
  const systems = included(inputs);
  if (rates === undefined) return { [OUTPUT.indicativeRange]: notAvailable(`no TEST cost range for the building type ${type}`) };
  if (systems.length === 0) return { [OUTPUT.indicativeRange]: notAvailable('no system in scope') };
  const perM2 = systems.map((id) => wholeRange(lookup(rates, id), `perM2ByBuildingTypeAndSystem.${type}.${id}`));
  const area = wholeQuantity(inputs[FIELD.grossFloorArea], 'm2', 'gross_total', FIELD.grossFloorArea);
  const country = whole(lookup(cost, 'countryPercent', text(inputs, FIELD.country)), 'countryPercent');
  const projectType = wholeRange(lookup(cost, 'projectTypePercent', text(inputs, FIELD.projectType)), 'projectTypePercent');
  return {
    [OUTPUT.indicativeRange]: {
      unit: 'EUR',
      systems,
      low: decimalText(sum(perM2.map((rate) => rate.low)) * area * country * projectType.low, 4),
      high: decimalText(sum(perM2.map((rate) => rate.high)) * area * country * projectType.high, 4),
    },
  };
};

const pointsEstimate: TestFormula = (inputs, context) => {
  const counted = points(inputs, context);
  if ('notAvailable' in counted) return Object.fromEntries(POINT_TYPES.map((type) => [`points.${type}`, counted]));
  const spread = wholeRange(lookup(testDataset(context, POINTS), 'spreadPercent'), 'spreadPercent');
  return Object.fromEntries(
    POINT_TYPES.map((type) => [`points.${type}`, { low: decimalText(counted[type] * spread.low, 2), high: decimalText(counted[type] * spread.high, 2) }]),
  );
};

const capexPreliminaryEstimate: TestFormula = (inputs, context) => {
  const counted = points(inputs, context);
  if ('notAvailable' in counted) return { [OUTPUT.preliminaryEstimate]: counted };
  const cost = testDataset(context, COST);
  const perPoint = (type: PointType): { readonly low: bigint; readonly high: bigint } => wholeRange(lookup(cost, 'perPoint', type), `perPoint.${type}`);
  const country = whole(lookup(cost, 'countryPercent', text(inputs, FIELD.country)), 'countryPercent');
  const projectType = wholeRange(lookup(cost, 'projectTypePercent', text(inputs, FIELD.projectType)), 'projectTypePercent');
  return {
    [OUTPUT.preliminaryEstimate]: {
      unit: 'EUR',
      low: decimalText(sum(POINT_TYPES.map((type) => counted[type] * perPoint(type).low)) * country * projectType.low, 4),
      high: decimalText(sum(POINT_TYPES.map((type) => counted[type] * perPoint(type).high)) * country * projectType.high, 4),
    },
  };
};

const operatingEnergyEstimate: TestFormula = (inputs, context) => {
  const energy = annualEnergy(inputs, context);
  if ('notAvailable' in energy) return { [OUTPUT.annualEnergy]: energy };
  return { [OUTPUT.annualEnergy]: { unit: 'kWh/a', low: decimalText(energy.low, 6), high: decimalText(energy.high, 6) } };
};

/** Whether an automation area has the systems it needs in scope, by the TEST table's `requires`. */
function areaHasItsSystems(factors: Record<string, unknown>, systems: ReadonlySet<string>, area: string): boolean {
  const requires = lookup(factors, 'requires', area);
  if (requires === 'any') return systems.size > 0;
  if (!Array.isArray(requires)) throw new Error(`the TEST savings factors name no systems for the area ${area}`);
  return requires.some((system) => systems.has(String(system)));
}

const savingsEstimate: TestFormula = (inputs, context) => {
  const energy = annualEnergy(inputs, context);
  if ('notAvailable' in energy) return { [OUTPUT.annualSavings]: energy };
  const factors = testDataset(context, SAVINGS);
  const systems = new Set(included(inputs));
  const saving = selectedAreas(inputs).filter((id) => areaHasItsSystems(factors, systems, id));
  const percent = saving.map((id) => wholeRange(lookup(factors, 'percentByArea', id), `percentByArea.${id}`));
  return {
    [OUTPUT.annualSavings]: {
      unit: 'kWh/a',
      areas: saving,
      low: decimalText(energy.low * sum(percent.map((item) => item.low)), 8),
      high: decimalText(energy.high * sum(percent.map((item) => item.high)), 8),
    },
  };
};

const measurePriority: TestFormula = (inputs, context) => {
  const measures = lookup(testDataset(context, FUNCTIONS), 'measures');
  if (!Array.isArray(measures)) throw new Error('the TEST function set has no measures');
  const systems = new Set(included(inputs));
  const areas = new Set(selectedAreas(inputs));
  const goals = selectedGoals(inputs);
  const listOf = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : []);
  const available = measures
    .map((measure) => ({
      id: String(lookup(measure, 'id')),
      available: listOf(lookup(measure, 'systems')).some((id) => systems.has(id)) || listOf(lookup(measure, 'areas')).some((id) => areas.has(id)),
      serves: listOf(lookup(measure, 'goals')).filter((goal) => goals.includes(goal)),
    }))
    .filter((measure) => measure.available)
    .map(({ id, serves }) => ({ id, serves }));
  available.sort((left, right) => right.serves.length - left.serves.length || left.id.localeCompare(right.id));
  return { [OUTPUT.measurePriority]: available };
};

/** TEST bodies, keyed `formula:<id>@<version>` as `affects` names them. */
export const TEST_FORMULAS: Readonly<Record<string, TestFormula>> = Object.freeze({
  'formula:capexIndicativeRange@1': capexIndicativeRange,
  'formula:pointsEstimate@1': pointsEstimate,
  'formula:capexPreliminaryEstimate@1': capexPreliminaryEstimate,
  'formula:operatingEnergyEstimate@1': operatingEnergyEstimate,
  'formula:savingsEstimate@1': savingsEstimate,
  'formula:measurePriority@1': measurePriority,
});

/** TEST proposal template slots, keyed `template:<slot>`. */
export const TEST_TEMPLATES: Readonly<Record<string, TestTemplate>> = Object.freeze({
  'template:proposal.title': (inputs: SensitivityValues) => `TEST proposal for ${text(inputs, FIELD.projectName)}`,
});
