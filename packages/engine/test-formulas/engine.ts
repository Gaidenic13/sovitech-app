/**
 * The TEST catalogue of the engine (prompt 3 phase 5: "Engine cases run against TEST datasets. Where the method itself
 * is undecided ... they also run against TEST formulas in packages/engine/test-formulas/. Those formulas are excluded
 * from the production registry and loadable only inside the test runner"; docs/adr/0047 "Built").
 *
 * `testCatalogue` answers a `FormulaCatalogue` of kind `test`:
 * - the six production signatures mirrored with TEST ids (`TEST-<id>`, version `1.0.0`, the version the TEST lookups of
 *   tests/guardrails/_support declare), the same outputs, so a candidate a TEST body produced names a TEST formula and
 *   can never pass as a production one (G1-16). The stage 1 mirror reads no area (its body's header says why); the
 *   others read the production inputs. `TEST-measurePriority` has no body: its output is an order of measures, which
 *   no engine candidate (a quantity) holds, so it reads "Not available yet", naming the method;
 * - the TEST formulas the cases need beyond them (`extra`): line items (G1-2) and a return computed from their total
 *   (G1-2), reuse and replacement (G1-7), a total of levels that takes no range (G4-12), duty and standby pumps (G4-4),
 *   billing periods and meters (G8-7, G8-8), an operating estimate over the register, a climate reference value and the
 *   owner's schedule (G9-7), points by I/O type and protocol (G9-3), the room-control supply split (G10-6), the fire
 *   interface points (G11-3, G10-7); and, from phase 6, the formulas of the TEST chart series (./series.ts): investment
 *   by system with its total (G1-5, G9-8, G10-7) and a cumulative cash flow with its payback (G9-9), whose series the
 *   catalogue declares when it includes them.
 * Each reads only TEST datasets (`TEST-…`, from fixtures/datasets/), computes with the engine's intervals (decimal.js),
 * and writes on TEST output fields (./fields.ts). Each body is its own file under ./bodies/, hashed in
 * ./test-manifest.json (G9-11).
 *
 * Nothing in apps/ or packages/*\/src imports this file (dependency-cruiser `test-formulas-and-fixtures-only-from-tests`),
 * and `runEngine` refuses a `test` catalogue outside the test runner.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FIELD, SCOPE_FIELDS, productionRegistry, scopeFieldKey } from '@sovitech/registry';
import type { FormulaSignature } from '@sovitech/registry/validation';
import { formulaRefOf, type EngineFormula, type FormulaBody, type FormulaCatalogue, type Requirement } from '../src/catalogue';
import { PRODUCTION_IMPORT_POLICY, bodyFilesOf, type ImportPolicy, type SourceReader } from '../src/manifest';
import { body as annualConsumptionFromBills } from './bodies/TEST-annualConsumptionFromBills@1.0.0';
import { body as annualReturn } from './bodies/TEST-annualReturn@1.0.0';
import { body as capexFieldDevices } from './bodies/TEST-capexFieldDevices@1.0.0';
import { body as capexIndicativeRange } from './bodies/TEST-capexIndicativeRange@1.0.0';
import { body as capexBySystem } from './bodies/TEST-capexBySystem@1.0.0';
import { body as capexLineItems } from './bodies/TEST-capexLineItems@1.0.0';
import { body as capexPreliminaryEstimate } from './bodies/TEST-capexPreliminaryEstimate@1.0.0';
import { body as cashFlow } from './bodies/TEST-cashFlow@1.0.0';
import { body as fireInterfacePoints } from './bodies/TEST-fireInterfacePoints@1.0.0';
import { body as levelsTotal } from './bodies/TEST-levelsTotal@1.0.0';
import { body as operatingEnergyEstimate } from './bodies/TEST-operatingEnergyEstimate@1.0.0';
import { body as operatingEnergyFromRegister } from './bodies/TEST-operatingEnergyFromRegister@1.0.0';
import { POINT_TYPE_PATHS, body as pointsByType } from './bodies/TEST-pointsByType@1.0.0';
import { body as pointsEstimate } from './bodies/TEST-pointsEstimate@1.0.0';
import { body as pumpPoints } from './bodies/TEST-pumpPoints@1.0.0';
import { body as roomControlPoints } from './bodies/TEST-roomControlPoints@1.0.0';
import { body as savingsEstimate } from './bodies/TEST-savingsEstimate@1.0.0';
import { body as siteConsumption } from './bodies/TEST-siteConsumption@1.0.0';
import { TEST_DATASET_IDS } from './datasets';
import { BILL_FIELDS, LINE_ITEM_FIELDS, MIRRORED_OUTPUT_FIELDS, POINT_TYPE_OUTPUTS, TEST_FIELDS } from './fields';
import { SERIES_FORMULAS, SERIES_OUTPUT_FIELDS, TEST_SERIES_BY_FORMULA } from './series';

/** The version of every TEST formula (the TEST lookups of tests/guardrails/_support declare TEST ids at this version). */
export const TEST_FORMULA_VERSION = '1.0.0';

const dataset = (id: string, name: string, role: 'benchmark' | 'reference' = 'benchmark'): Requirement => ({ kind: 'dataset', datasetId: id, name, gate: null, role });
const COST = dataset(TEST_DATASET_IDS.costRanges, 'TEST cost ranges');
const TEMPLATES = dataset(TEST_DATASET_IDS.pointTemplates, 'TEST point templates');
const ENERGY = dataset(TEST_DATASET_IDS.energyBenchmarks, 'TEST energy benchmarks');
const SAVINGS = dataset(TEST_DATASET_IDS.savingsFactors, 'TEST savings factors');
const FUNCTIONS = dataset(TEST_DATASET_IDS.functionSet, 'TEST function set', 'reference');
const TABLES = dataset(TEST_DATASET_IDS.engineTables, 'TEST engine tables');

function freeze(formula: { signature: FormulaSignature; requires: readonly Requirement[]; outputFields: Record<string, string>; body?: FormulaBody }): EngineFormula {
  return Object.freeze({
    signature: Object.freeze({ ...formula.signature, inputs: [...formula.signature.inputs], outputs: [...formula.signature.outputs] }),
    requires: Object.freeze([...formula.requires]),
    outputFields: Object.freeze({ ...formula.outputFields }),
    ...(formula.body === undefined ? {} : { body: formula.body }),
  });
}

/** A production signature mirrored with a TEST id (`TEST-<id>@1.0.0`), the same outputs, and its inputs unless named. */
function mirror(id: string, requires: readonly Requirement[], body: FormulaBody | undefined, inputs?: readonly string[]): EngineFormula {
  const production = productionRegistry.formulas.find((signature) => signature.id === id);
  if (production === undefined) throw new Error(`the production registry declares no formula ${id}`);
  const outputFields = Object.fromEntries(
    production.outputs.flatMap((output) => (Object.hasOwn(MIRRORED_OUTPUT_FIELDS, output) ? [[output, MIRRORED_OUTPUT_FIELDS[output as keyof typeof MIRRORED_OUTPUT_FIELDS].key]] : [])),
  );
  return freeze({
    signature: { ...production, id: `TEST-${id}`, version: TEST_FORMULA_VERSION, inputs: [...(inputs ?? production.inputs)] },
    requires,
    outputFields,
    ...(body === undefined ? {} : { body }),
  });
}

/** The six production signatures, mirrored. */
function mirrored(): EngineFormula[] {
  const indicativeInputs = productionRegistry.formulas.find((signature) => signature.id === 'capexIndicativeRange')?.inputs.filter((key) => key !== FIELD.grossFloorArea);
  return [
    mirror('capexIndicativeRange', [COST, TABLES], capexIndicativeRange, indicativeInputs),
    mirror('pointsEstimate', [TEMPLATES], pointsEstimate),
    mirror('capexPreliminaryEstimate', [TEMPLATES, COST], capexPreliminaryEstimate),
    mirror('operatingEnergyEstimate', [ENERGY], operatingEnergyEstimate),
    mirror('savingsEstimate', [ENERGY, SAVINGS], savingsEstimate),
    mirror('measurePriority', [FUNCTIONS], undefined),
  ];
}

const extra = (
  id: string,
  signature: Omit<FormulaSignature, 'id' | 'version'>,
  requires: readonly Requirement[],
  outputFields: Record<string, string>,
  body: FormulaBody,
): EngineFormula => freeze({ signature: { id, version: TEST_FORMULA_VERSION, ...signature }, requires, outputFields, body });

/** The TEST output field key of each output of a TEST series formula (./series.ts). */
function seriesOutputFields(outputs: readonly string[]): Record<string, string> {
  return Object.fromEntries(
    outputs.map((output) => {
      const field = Object.hasOwn(SERIES_OUTPUT_FIELDS, output) ? SERIES_OUTPUT_FIELDS[output] : undefined;
      if (field === undefined) throw new Error(`no TEST output field for ${output}`);
      return [output, field.key];
    }),
  );
}

/** The TEST formulas beyond the six, by id. */
const EXTRA: Readonly<Record<string, () => EngineFormula>> = {
  'TEST-capexLineItems': () =>
    extra(
      'TEST-capexLineItems',
      { inputs: LINE_ITEM_FIELDS.map((field) => field.key), outputs: ['capex.TEST_lineItems'], unknownPolicy: 'exclude_and_count', estimated: true },
      [TABLES],
      { 'capex.TEST_lineItems': TEST_FIELDS.capexLineItems.key },
      capexLineItems,
    ),
  'TEST-annualReturn': () =>
    extra(
      'TEST-annualReturn',
      { inputs: [TEST_FIELDS.capexLineItems.key], outputs: ['return.TEST_annual'], unknownPolicy: 'refuse', estimated: true },
      [TABLES],
      { 'return.TEST_annual': TEST_FIELDS.annualReturn.key },
      annualReturn,
    ),
  'TEST-capexFieldDevices': () =>
    extra(
      'TEST-capexFieldDevices',
      { inputs: [TEST_FIELDS.fieldDevices.key, TEST_FIELDS.fieldDevicesReuse.key], outputs: ['capex.TEST_fieldDevices'], unknownPolicy: 'range_over_options', estimated: true },
      [TABLES],
      { 'capex.TEST_fieldDevices': TEST_FIELDS.capexFieldDevices.key },
      capexFieldDevices,
    ),
  'TEST-levelsTotal': () =>
    extra(
      'TEST-levelsTotal',
      { inputs: [FIELD.floors], outputs: ['levels.TEST_total'], unknownPolicy: 'refuse', estimated: false },
      [],
      { 'levels.TEST_total': TEST_FIELDS.levelsTotal.key },
      levelsTotal,
    ),
  'TEST-pumpPoints': () =>
    extra(
      'TEST-pumpPoints',
      { inputs: [TEST_FIELDS.pumpConfiguration.key], outputs: ['points.TEST_pumpHardwareIo'], unknownPolicy: 'refuse', estimated: true },
      [TABLES],
      { 'points.TEST_pumpHardwareIo': TEST_FIELDS.pumpHardwareIo.key },
      pumpPoints,
    ),
  'TEST-annualConsumptionFromBills': () =>
    extra(
      'TEST-annualConsumptionFromBills',
      {
        inputs: [...BILL_FIELDS.map((field) => field.key), TEST_FIELDS.regularisationM10M12.key],
        outputs: ['energy.TEST_annualConsumption'],
        unknownPolicy: 'exclude_and_count',
        estimated: false,
      },
      [],
      { 'energy.TEST_annualConsumption': TEST_FIELDS.annualConsumption.key },
      annualConsumptionFromBills,
    ),
  'TEST-siteConsumption': () =>
    extra(
      'TEST-siteConsumption',
      { inputs: [TEST_FIELDS.utilityMeterTotal.key, TEST_FIELDS.subMeterTotal.key], outputs: ['energy.TEST_siteConsumption'], unknownPolicy: 'refuse', estimated: false },
      [],
      { 'energy.TEST_siteConsumption': TEST_FIELDS.siteConsumption.key },
      siteConsumption,
    ),
  'TEST-operatingEnergyFromRegister': () =>
    extra(
      'TEST-operatingEnergyFromRegister',
      {
        inputs: [TEST_FIELDS.ratedElectricalInput.key, TEST_FIELDS.climateFactor.key, FIELD.operatingSchedule],
        outputs: ['energy.TEST_operating'],
        unknownPolicy: 'refuse',
        estimated: true,
      },
      [TABLES],
      { 'energy.TEST_operating': TEST_FIELDS.operatingEnergy.key },
      operatingEnergyFromRegister,
    ),
  'TEST-pointsByType': () =>
    extra(
      'TEST-pointsByType',
      { inputs: [...SCOPE_FIELDS], outputs: Object.keys(POINT_TYPE_PATHS), unknownPolicy: 'refuse', estimated: true },
      [TABLES],
      Object.fromEntries(Object.entries(POINT_TYPE_OUTPUTS).map(([output, field]) => [output, field.key])),
      pointsByType,
    ),
  'TEST-roomControlPoints': () =>
    extra(
      'TEST-roomControlPoints',
      {
        inputs: [TEST_FIELDS.roomControlSupplier.key, FIELD.rooms],
        outputs: ['points.TEST_roomHardwareIo', 'points.TEST_roomIntegration'],
        unknownPolicy: 'range_over_options',
        estimated: true,
      },
      [TABLES],
      { 'points.TEST_roomHardwareIo': TEST_FIELDS.roomHardwareIo.key, 'points.TEST_roomIntegration': TEST_FIELDS.roomIntegration.key },
      roomControlPoints,
    ),
  // Phase 6: the formulas of the TEST chart series (./series.ts): a breakdown by system and a cumulative cash flow with
  // its payback, each one formula whose outputs are every point and the figure beside the chart (G1-5, G9-8, G9-9).
  'TEST-capexBySystem': () =>
    extra(
      'TEST-capexBySystem',
      { ...SERIES_FORMULAS['TEST-capexBySystem'], inputs: [...SERIES_FORMULAS['TEST-capexBySystem'].inputs], outputs: [...SERIES_FORMULAS['TEST-capexBySystem'].outputs] },
      [TABLES],
      seriesOutputFields(SERIES_FORMULAS['TEST-capexBySystem'].outputs),
      capexBySystem,
    ),
  'TEST-cashFlow': () =>
    extra(
      'TEST-cashFlow',
      { ...SERIES_FORMULAS['TEST-cashFlow'], inputs: [...SERIES_FORMULAS['TEST-cashFlow'].inputs], outputs: [...SERIES_FORMULAS['TEST-cashFlow'].outputs] },
      [TABLES],
      seriesOutputFields(SERIES_FORMULAS['TEST-cashFlow'].outputs),
      cashFlow,
    ),
  'TEST-fireInterfacePoints': () =>
    extra(
      'TEST-fireInterfacePoints',
      {
        inputs: [scopeFieldKey('hvac'), TEST_FIELDS.ahuPanels.key],
        outputs: ['points.TEST_fireAlarmInputs', 'points.TEST_fireModeStatuses'],
        unknownPolicy: 'refuse',
        estimated: false,
      },
      [],
      { 'points.TEST_fireAlarmInputs': TEST_FIELDS.fireAlarmInputs.key, 'points.TEST_fireModeStatuses': TEST_FIELDS.fireModeStatuses.key },
      fireInterfacePoints,
    ),
};

/** The ids `extra` may name. */
export const TEST_EXTRA_FORMULAS: readonly string[] = Object.freeze(Object.keys(EXTRA));

export interface TestCatalogueOptions {
  /** TEST formula ids to include beyond the six mirrored signatures (`TEST_EXTRA_FORMULAS`). */
  readonly extra?: readonly string[];
  /** Whether to include the six mirrored signatures (default true); false runs the extra formulas alone. */
  readonly mirrored?: boolean;
}

export function testCatalogue(options: TestCatalogueOptions = {}): FormulaCatalogue {
  const extras = (options.extra ?? []).map((id) => {
    const make = Object.hasOwn(EXTRA, id) ? EXTRA[id] : undefined;
    if (make === undefined) throw new Error(`no TEST formula ${id}; the ids are ${TEST_EXTRA_FORMULAS.join(', ')}`);
    return make();
  });
  // Phase 6: the TEST series of the formulas included (./series.ts), and no other.
  const series = extras.flatMap((formula) => (Object.hasOwn(TEST_SERIES_BY_FORMULA, formula.signature.id) ? (TEST_SERIES_BY_FORMULA[formula.signature.id] ?? []) : []));
  return Object.freeze({ kind: 'test', formulas: Object.freeze([...(options.mirrored === false ? [] : mirrored()), ...extras]), series: Object.freeze(series) });
}

/** `DeriveContext.formulaDeclared` for the candidates of a TEST catalogue: its formulas' ids at their versions, and nothing else. */
export function testFormulaLookup(catalogue: FormulaCatalogue): (formulaId: string, formulaVersion: string) => boolean {
  const declared = new Set(catalogue.formulas.map((formula) => formulaRefOf(formula.signature)));
  return (formulaId, formulaVersion) => declared.has(`${formulaId}@${formulaVersion}`);
}

/** Every TEST formula ref with a body (the six mirrored but `TEST-measurePriority`, and every extra). */
export function testBodyRefs(): ReadonlySet<string> {
  const catalogue = testCatalogue({ extra: TEST_EXTRA_FORMULAS });
  return new Set(catalogue.formulas.filter((formula) => formula.body !== undefined).map((formula) => formulaRefOf(formula.signature)));
}

/** Every TEST formula ref the catalogue can declare. */
export function testDeclaredRefs(): ReadonlySet<string> {
  return new Set(testCatalogue({ extra: TEST_EXTRA_FORMULAS }).formulas.map((formula) => formulaRefOf(formula.signature)));
}

/** The folder of the TEST body files. */
export const TEST_BODIES_DIR: string = join(dirname(fileURLToPath(import.meta.url)), 'bodies');

/** The repository root, which the manifest's paths start from. */
export const REPOSITORY_ROOT: string = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/** The TEST bodies' folder by its path from the repository root, as the manifest's hash input names it. */
export const TEST_BODIES_PATH = 'packages/engine/test-formulas/bodies';

/**
 * A `SourceReader` over the repository's files on disk (by path from the repository root), with `overlay`'s bytes in
 * place of a file's where it names one (a case changes a helper in memory, never in the repository: G9-11).
 */
export function testSourceReader(overlay: ReadonlyMap<string, Uint8Array> = new Map()): SourceReader {
  return (path) => {
    const replaced = overlay.get(path);
    if (replaced !== undefined) return replaced;
    const absolute = join(REPOSITORY_ROOT, ...path.split('/'));
    return existsSync(absolute) && statSync(absolute).isFile() ? new Uint8Array(readFileSync(absolute)) : undefined;
  };
}

/**
 * What a TEST body's closure may import by name (the engine's `ImportPolicy`; phase 5, the final verification's item 1).
 * As production, `decimal.js` by its locked version; and, TEST only, four imports no locked version pins, each named
 * here with its reason and recorded in the hash input by name only (`unhashed:<specifier>`), so adding or dropping one
 * moves the hash while a change inside it does not. Any other import by name fails the check. A production body may
 * import none of these four (`PRODUCTION_IMPORT_POLICY`).
 */
export const TEST_IMPORT_POLICY: ImportPolicy = Object.freeze({
  locked: PRODUCTION_IMPORT_POLICY.locked,
  unhashed: Object.freeze({
    '@sovitech/registry':
      "the production registry's field keys, systems and automation areas the TEST mirrors read; a workspace package (`link:` in pnpm-lock.yaml), so no locked version pins it, and hashing its sources would tie every TEST body's version to every registry change",
    'node:fs': 'fixtures/datasets/generate.ts writes the TEST datasets when run as a script (`--out`); a body reads its tables, never the file system (a Node built-in: no lockfile entry)',
    'node:path': 'fixtures/datasets/generate.ts, as node:fs: the output folder of its script run',
    'node:url': 'fixtures/datasets/generate.ts, as node:fs: whether it runs as the script',
  }),
});

/**
 * Each TEST body's hash input, by `<id>@<version>` (the file name without `.ts`): the body with everything it loads
 * (the engine's `bodyHashInputOf` under `TEST_IMPORT_POLICY`; phase 5 part B, V-7, and the final verification), read
 * through `read`.
 */
export function testBodyFiles(read: SourceReader = testSourceReader()): ReadonlyMap<string, Uint8Array> {
  return bodyFilesOf(TEST_BODIES_PATH, readdirSync(TEST_BODIES_DIR), read, TEST_IMPORT_POLICY);
}
