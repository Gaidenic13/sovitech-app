/**
 * The inputs of the sensitivity test for the production registry (docs/guardrails.md
 * rule 6: "On the synthetic fixture project, changing the answer across its
 * options must change at least one declared output"; prompt 3 section 10,
 * "Phase 1": "Run the sensitivity test on the synthetic fixture project with the
 * TEST datasets and TEST formulas loaded").
 *
 * - The synthetic fixture project: one TEST answer per production field, and
 *   at least two probes for each asked field without options (text and
 *   quantities). Every value is visibly synthetic and made up here; none comes
 *   from a document, a mockup, a spec or company/ (rule 13; prompt 3 section 14
 *   item 3).
 * - The TEST formulas and the TEST template, keyed as `affects` names them
 *   (packages/engine/test-formulas/).
 * - The TEST datasets, read from fixtures/datasets/, where their generator
 *   writes them; each id carries "TEST", which the test itself checks.
 *
 * TEST datasets and formulas are loaded only here and in case files, inside the
 * test runner and the checks; the app never reads them (prompt 3 5.4).
 *
 * What it proves, and what it does not: each registered answer reaches a
 * declared output through a declared consumer. It does not prove that the owner
 * sees a change today: while the SOVITECH datasets and the financial method are
 * missing, every output the step 5 to 7 answers reach reads "Not available yet"
 * in the app (a Speed cost, listed for the approver in the build log).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { FIELD, SCOPE_OPTIONS, SELECTION_OPTIONS, SYSTEMS, AUTOMATION_AREAS, GOALS, automationFieldKey, goalFieldKey, scopeFieldKey } from '@sovitech/registry';
import type { SensitivitySuite, SensitivityValues } from '@sovitech/registry/validation';
import { TEST_FORMULAS, TEST_TEMPLATES } from '../../../packages/engine/test-formulas/formulas';
import { repoRoot } from '../lib';

/** Where the TEST datasets' generator writes them. */
export const TEST_DATASETS_DIR = join(repoRoot, 'fixtures', 'datasets');

/** The TEST datasets the TEST formulas read, by id. */
export const SUITE_DATASET_IDS = [
  'TEST-sovitech-cost-ranges',
  'TEST-sovitech-point-templates',
  'TEST-energy-benchmarks',
  'TEST-savings-factors',
  'TEST-sovitech-function-set',
] as const;

/** Reads the TEST datasets the suite needs from fixtures/datasets/. Throws when one is missing or is not a TEST dataset. */
export function readSuiteDatasets(dir: string = TEST_DATASETS_DIR): Record<string, unknown> {
  const files = new Set(readdirSync(dir));
  const datasets: Record<string, unknown> = {};
  for (const id of SUITE_DATASET_IDS) {
    const name = `${id}.json`;
    if (!files.has(name)) throw new Error(`fixtures/datasets/${name} is missing: run tsx fixtures/datasets/generate.ts --out .`);
    const dataset = JSON.parse(readFileSync(join(dir, name), 'utf8')) as { id?: unknown };
    if (dataset.id !== id) throw new Error(`fixtures/datasets/${name} holds the dataset ${String(dataset.id)}, not ${id}`);
    datasets[id] = dataset;
  }
  return datasets;
}

const choice = <T extends string>(keys: readonly string[], selected: readonly string[], yes: T, no: T): Record<string, T> =>
  Object.fromEntries(keys.map((key) => [key, selected.includes(key) ? yes : no]));

/** The synthetic fixture project's answers: one per production field, all TEST. */
export const FIXTURE_VALUES: SensitivityValues = Object.freeze({
  [FIELD.projectName]: 'TEST fixture project A',
  [FIELD.projectType]: 'new_construction',
  [FIELD.country]: 'TEST-XA',
  [FIELD.city]: 'TEST city A',
  [FIELD.grossFloorArea]: { value: 12_345, unit: 'm2', qualifier: 'gross_total' },
  [FIELD.buildingType]: 'hotel',
  ...choice(
    SYSTEMS.map((system) => scopeFieldKey(system.id)),
    ['hvac', 'lighting', 'energy'].map(scopeFieldKey),
    SCOPE_OPTIONS[0],
    SCOPE_OPTIONS[1],
  ),
  [FIELD.floors]: { below_ground: 2, ground: 1, upper: 7 },
  [FIELD.rooms]: { guest_rooms: 111 },
  [FIELD.zones]: { hvac_control: 33 },
  ...choice(
    AUTOMATION_AREAS.map((area) => automationFieldKey(area.id)),
    ['hvac', 'lighting'].map(automationFieldKey),
    SELECTION_OPTIONS[0],
    SELECTION_OPTIONS[1],
  ),
  [FIELD.operatingSchedule]: 'business_hours',
  [FIELD.occupancy]: 'mixed',
  ...choice(
    GOALS.map((goal) => goalFieldKey(goal.id)),
    [goalFieldKey('reduce_energy')],
    SELECTION_OPTIONS[0],
    SELECTION_OPTIONS[1],
  ),
});

/** Answers to try for the asked fields that have no options: two each, all TEST. */
export const FIXTURE_PROBES: Readonly<Record<string, readonly unknown[]>> = Object.freeze({
  [FIELD.projectName]: ['TEST fixture project A', 'TEST fixture project B'],
  [FIELD.country]: ['TEST-XA', 'TEST-XB'],
  [FIELD.city]: ['TEST city A', 'TEST city B'],
  [FIELD.grossFloorArea]: [
    { value: 12_345, unit: 'm2', qualifier: 'gross_total' },
    { value: 23_456, unit: 'm2', qualifier: 'gross_total' },
  ],
});

export async function loadSensitivitySuite(): Promise<SensitivitySuite | undefined> {
  return {
    fixture: { id: 'TEST-sensitivity-fixture-project', values: FIXTURE_VALUES, probes: FIXTURE_PROBES },
    formulas: TEST_FORMULAS,
    templates: TEST_TEMPLATES,
    datasets: readSuiteDatasets(),
  };
}
