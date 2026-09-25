/**
 * Generator of the TEST datasets (prompt 3 section 5.4: "Test-only datasets live
 * in fixtures/datasets/, carry 'TEST' in their id and visibly synthetic values,
 * load only inside the test runner, and never feed the demo").
 *
 *   tsx fixtures/datasets/generate.ts --out <folder>
 *
 * writes each dataset to <folder>/fixtures/datasets/<id>.json; `--out .` from
 * the repository root rewrites the committed files. The fixture-manifest check
 * runs it into a temporary folder and compares the bytes with
 * fixtures/manifest.json.
 *
 * Every value is made up for tests and shaped only to exercise code: it is not
 * SOVITECH data, not a benchmark, not a price and not taken from any document,
 * mockup, spec or company/ file (rule 1; rule 13 "The repo"). Every number is a
 * whole number from 9001 to 9099 (SYNTHETIC_LOW to SYNTHETIC_HIGH), so, even
 * lifted out of its file, none reads as a rate, a price, a percentage, an
 * intensity or a point count: 9001 % occupancy, 9011 kWh per m² and year and
 * 9003 EUR per m² are not real values (phase 1 review, verifier finding 10 and
 * adversarial finding 20). Each table keeps the steps the sensitivity test
 * needs: every option of an answer has its own value, in the order the earlier
 * values had, so changing the answer changes the output. The unit test
 * tools/checks/registry/test-datasets.test.ts fails on any number outside the
 * band and on a dataset without "TEST" in its id, version and description.
 *
 * Who reads them: the sensitivity suite (tools/checks/registry/sensitivity-suite.ts)
 * hands the first five to the TEST formulas (packages/engine/test-formulas/);
 * the stand-in shaped like a website product list is G1-12's, and the dataset
 * loader must refuse it (no approval record, and a TEST id).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

interface TestDataset {
  readonly id: string;
  readonly version: string;
  readonly description: string;
  readonly entries: Record<string, unknown>;
}

/** Every number in a TEST dataset lies in this band, so none can be taken for a real value. */
export const SYNTHETIC_LOW = 9001;
export const SYNTHETIC_HIGH = 9099;

const BUILDING_TYPES = ['hotel', 'office', 'retail', 'hospital', 'residential'] as const;
const SYSTEMS = ['hvac', 'lighting', 'energy', 'access_control', 'fire_safety', 'water', 'elevators', 'cctv'] as const;
const AREAS = ['hvac', 'lighting', 'energy_management', 'water_management', 'security_access', 'predictive_maintenance'] as const;

/** A TEST number in the synthetic band: 9000 plus `offset` (1 to 99). */
function synthetic(offset: number): number {
  if (!Number.isInteger(offset) || offset < 1 || offset > SYNTHETIC_HIGH - 9000) throw new Error(`TEST offset ${offset} is outside 1 to 99`);
  return 9000 + offset;
}

/** A TEST range that steps with its position: low 9000 + base + position × step, high one step above. */
function stepRange(position: number, base: number, step: number): { low: number; high: number } {
  const low = synthetic(base + position * step);
  return { low, high: synthetic(base + position * step + step) };
}

const costRanges: TestDataset = {
  id: 'TEST-sovitech-cost-ranges',
  version: 'TEST-2',
  description: 'TEST cost ranges: synthetic whole numbers for the sensitivity test and engine cases. Not SOVITECH data, not a price.',
  entries: {
    // EUR per m² of gross floor area, per building type and system; "other" has none on purpose.
    perM2ByBuildingTypeAndSystem: Object.fromEntries(
      BUILDING_TYPES.map((type, typePosition) => [
        type,
        Object.fromEntries(SYSTEMS.map((system, systemPosition) => [system, stepRange(typePosition + systemPosition, 1, 1)])),
      ]),
    ),
    // EUR per point, by point type.
    perPoint: { hardwareIo: stepRange(0, 25, 1), integration: stepRange(0, 23, 1), virtual: stepRange(0, 21, 1) },
    // Percent applied per country code.
    countryPercent: { 'TEST-XA': synthetic(31), 'TEST-XB': synthetic(32) },
    // Percent per project type: a range over reuse and replacement where no survey exists (rule 1 "Reuse").
    projectTypePercent: {
      new_construction: { low: synthetic(44), high: synthetic(44) },
      renovation: { low: synthetic(43), high: synthetic(45) },
      existing_building: { low: synthetic(42), high: synthetic(46) },
      bms_modernization: { low: synthetic(41), high: synthetic(47) },
    },
  },
};

const pointTemplates: TestDataset = {
  id: 'TEST-sovitech-point-templates',
  version: 'TEST-2',
  description: 'TEST point templates: synthetic whole numbers for the sensitivity test and engine cases. Not SOVITECH data.',
  entries: {
    // Points per system in scope, by building type and point type.
    base: Object.fromEntries(
      BUILDING_TYPES.map((type, typePosition) => [
        type,
        Object.fromEntries(
          SYSTEMS.map((system, systemPosition) => [
            system,
            { hardwareIo: synthetic(1 + typePosition + systemPosition), integration: synthetic(21 + systemPosition), virtual: synthetic(31 + typePosition) },
          ]),
        ),
      ]),
    ),
    // Hardware points per upper floor, per system in scope.
    perUpperFloor: Object.fromEntries(SYSTEMS.map((system, position) => [system, synthetic(41 + position)])),
    // Virtual points per HVAC control zone, and hardware points per guest room.
    perHvacZone: synthetic(51),
    perGuestRoom: synthetic(52),
    // Virtual points per automation area selected.
    perArea: Object.fromEntries(AREAS.map((area, position) => [area, synthetic(61 + position)])),
    // The estimate's spread, in percent of the point count.
    spreadPercent: { low: synthetic(71), high: synthetic(72) },
  },
};

const energyBenchmarks: TestDataset = {
  id: 'TEST-energy-benchmarks',
  version: 'TEST-2',
  description: 'TEST energy benchmarks: synthetic whole numbers for the sensitivity test and engine cases. Not a benchmark.',
  entries: {
    // kWh per m² and year, by building type.
    intensityByBuildingType: Object.fromEntries(BUILDING_TYPES.map((type, position) => [type, stepRange(position, 1, 10)])),
    occupancyPercent: { mostly_occupied: synthetic(63), mixed: synthetic(62), low: synthetic(61) },
    schedulePercent: { '24_7': synthetic(74), business_hours: synthetic(72), extended_hours: synthetic(73), seasonal: synthetic(71) },
    // Percent per country code and city, standing in for climate data.
    climatePercent: { 'TEST-XA': { 'TEST city A': synthetic(81), 'TEST city B': synthetic(82) }, 'TEST-XB': { 'TEST city A': synthetic(83), 'TEST city B': synthetic(84) } },
  },
};

const savingsFactors: TestDataset = {
  id: 'TEST-savings-factors',
  version: 'TEST-2',
  description: 'TEST savings factors: synthetic whole numbers for the sensitivity test and engine cases. Not SOVITECH data.',
  entries: {
    // Percent of annual energy, per automation area.
    percentByArea: Object.fromEntries(AREAS.map((area, position) => [area, stepRange(position, 1, 1)])),
    // The systems an area needs in scope to save anything ("any": one system of any kind).
    requires: {
      hvac: ['hvac'],
      lighting: ['lighting'],
      energy_management: ['energy'],
      water_management: ['water'],
      security_access: ['access_control', 'cctv'],
      predictive_maintenance: 'any',
    },
  },
};

const functionSet: TestDataset = {
  id: 'TEST-sovitech-function-set',
  version: 'TEST-1',
  description: 'TEST function set: synthetic measures for the sensitivity test. Not SOVITECH function set v1.',
  entries: {
    measures: [
      { id: 'TEST-M01', systems: ['hvac'], areas: ['hvac'], goals: ['reduce_energy', 'reduce_operating_costs', 'occupant_comfort'] },
      { id: 'TEST-M02', systems: ['lighting'], areas: ['lighting'], goals: ['reduce_energy', 'lower_carbon'] },
      { id: 'TEST-M03', systems: ['energy'], areas: ['energy_management'], goals: ['lower_carbon', 'compliance', 'reduce_operating_costs'] },
      { id: 'TEST-M04', systems: ['hvac', 'energy'], areas: ['predictive_maintenance'], goals: ['asset_lifespan', 'operational_efficiency'] },
      { id: 'TEST-M05', systems: ['water'], areas: ['water_management'], goals: ['reduce_operating_costs'] },
      { id: 'TEST-M06', systems: ['access_control', 'cctv'], areas: ['security_access'], goals: ['operational_efficiency'] },
      { id: 'TEST-M07', systems: ['fire_safety', 'elevators'], areas: [], goals: ['operational_efficiency'] },
    ],
  },
};

/** G1-12's stand-in: shaped like a flat website product list (a product line, a model, a name, a category and a description per product), every value TEST. */
const productListStandIn: TestDataset = {
  id: 'TEST-website-product-list-standin',
  version: 'TEST-1',
  description: 'TEST stand-in shaped like a product list published on a company website. Synthetic; never the file under company/.',
  entries: Object.fromEntries(
    [1, 2, 3].map((number) => [
      `TEST-P${number}`,
      {
        productLine: `TEST line ${number}`,
        model: `TEST-MODEL-${number}`,
        name: `TEST product ${number}`,
        category: 'TEST category',
        description: `TEST description of product ${number}`,
      },
    ]),
  ),
};

// Versions: TEST-2 for the four tables whose numbers moved into the synthetic band in the phase 1
// review (a dataset version never changes its values); the function set and the stand-in hold no
// number and stay TEST-1.
export const TEST_DATASETS: readonly TestDataset[] = [costRanges, pointTemplates, energyBenchmarks, savingsFactors, functionSet, productListStandIn];

function main(argv: readonly string[]): void {
  const at = argv.indexOf('--out');
  const out = at < 0 ? undefined : argv[at + 1];
  if (out === undefined) throw new Error('usage: tsx fixtures/datasets/generate.ts --out <folder>');
  const folder = join(out, 'fixtures', 'datasets');
  mkdirSync(folder, { recursive: true });
  for (const dataset of TEST_DATASETS) writeFileSync(join(folder, `${dataset.id}.json`), `${JSON.stringify(dataset, null, 2)}\n`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
