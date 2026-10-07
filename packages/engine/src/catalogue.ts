/**
 * The engine's formula catalogue (prompt 3 section 6: "Versioned formulas with unknownPolicy, a hash manifest";
 * guardrails 2.4 "Formula versions are immutable"; rule 1 "Formulas declare how they handle unknowns"; rule 9).
 *
 * Each entry is a formula signature the registry declares (`@sovitech/registry` `productionRegistry.formulas`: id, version, the
 * input field keys, the outputs, the `unknownPolicy`, whether it is estimated), with what it waits for besides its
 * inputs, and its body where a source defines the method.
 *
 * **No production body exists in phase 5.** Every one of the six declared signatures is an estimated method that only
 * SOVITECH can define, from datasets no one has approved (prompt 3 phase 5: "Write no production formula for a method
 * no source defines: the app shows 'Not available yet' and names what is missing"; PRD R-114 "Until decided": "No point
 * or CAPEX candidate is created"). So each run of the production catalogue answers `not_available` for every output,
 * naming the dataset (by the name its gate's "Waits for" gives it), the method, or an owner input. The mechanism
 * (inputs, unknown policies, ranges, results as candidates, snapshots, staleness, stages) is proven with TEST bodies
 * and TEST datasets inside the test runner (`packages/engine/test-formulas/`), whose ids carry "TEST" so a candidate a
 * TEST body produced can never pass as a production one (G1-16).
 *
 * A body, once written, lives in its own file under `src/bodies/<id>@<version>.ts`; the hash manifest
 * (`manifest.json`, `checkManifest`) holds the SHA-256 of each body file with everything it loads (manifest.ts
 * `bodyHashInputOf`, failing closed), so a body or a helper it imports changed without a new version fails the check (2.4; G9-11). Names of datasets: the gates' "Waits for" items (packages/registry/gates/*.yaml); the view-model's
 * phase 3 `FORMULA_DATASETS` reads this catalogue from phase 5 on, so both say the same words.
 *
 * A body reads only what the engine hands it (`BodyInputs`): the readings of its usable inputs (`readings`), the options
 * of the unknown inputs it ranges over (`over`) and the datasets its requirements name (`datasets`), never the fields'
 * candidates for a value of its own. A dataset requirement is a benchmark unless marked `reference`; a formula that
 * reads a benchmark is declared estimated, or the engine refuses the catalogue (2.1; G9-4).
 */
import { OUTPUT, productionRegistry } from '@sovitech/registry';
import type { FormulaSignature } from '@sovitech/registry/validation';
import type { EngineField, InputReading } from './inputs';
import type { Interval } from './interval';
import type { FormulaRef, Missing } from './results';
import type { SeriesDeclaration } from './series';

/**
 * What a formula waits for besides its inputs. A dataset's `role` says what it is to the formula (2.1):
 * - `benchmark` (the default): a benchmark ratio, a typical value, a template or a price table. A formula that reads
 *   one is `estimated` ("Points from per-room tables, CAPEX from €/point ... are always estimated"), so the engine
 *   refuses a catalogue that pairs one with a signature not marked `estimated` (G9-4);
 * - `reference`: a curated definition the formula follows, not a figure it multiplies (the SOVITECH function set, rule
 *   9 "Automation levels are defined").
 */
export type Requirement =
  | {
      readonly kind: 'dataset';
      readonly datasetId: string;
      readonly name: string;
      readonly gate: string | null;
      readonly role?: 'benchmark' | 'reference';
    }
  | { readonly kind: 'unit'; readonly name: string; readonly gate: string };

/** What a body is handed: its declared inputs, read from their derived state, and its datasets (approved, or TEST in the test runner). */
export interface BodyInputs {
  /** The input fields the signature declares, as the engine read them (nothing else of the project). */
  readonly fields: ReadonlyMap<string, EngineField>;
  /** For `range_over_options`: the options each unknown enum or decision input runs over (rule 1, "Ranges need a basis"). */
  readonly over: ReadonlyMap<string, readonly string[]>;
  /** The datasets the formula requires, loaded, by id. */
  readonly datasets: ReadonlyMap<string, { readonly version: string; readonly entries: Readonly<Record<string, unknown>> }>;
  /**
   * The values the body may use, by input field key, read by the engine from derived state (2.4) and nothing else: for
   * a known field, the active value of each of its facts; for a field in conflict or read two ways, under a formula
   * that takes a range, every value the range runs over (rule 4: "show a range over the values where the formula
   * allows it"; rule 8). An input absent here is unknown (ranged over its options in `over`, or left out and counted
   * under `exclude_and_count`); a body never reads a field's candidates for a value of its own.
   */
  readonly readings: ReadonlyMap<string, InputReading>;
}

/**
 * What a body answers for one output:
 * - `value`: an exact value (a point interval), from a formula not declared estimated (`calculated`, 2.1);
 * - `estimate`: a central value (a point interval) strictly inside its range, from a formula declared estimated (rule 9);
 * - `excluded`: either of the two, for a total that left out items the body itself could not price (their names; the
 *   total then reads "Incomplete: excludes <item names>", rule 1); `range` is required when the formula is estimated;
 * - `not_available`: what it could not use, named (rule 7).
 * The engine refuses any other shape (G9-12), and never takes a stage, a status or a label from a body.
 */
export type BodyOutput =
  | { readonly kind: 'value'; readonly value: Interval; readonly unit: string; readonly qualifier?: string; readonly assumptions: readonly string[] }
  | { readonly kind: 'estimate'; readonly value: Interval; readonly range: Interval; readonly unit: string; readonly qualifier?: string; readonly assumptions: readonly string[] }
  | {
      readonly kind: 'excluded';
      readonly value: Interval;
      readonly range?: Interval;
      readonly unit: string;
      readonly qualifier?: string;
      readonly excluded: readonly string[];
      readonly assumptions: readonly string[];
    }
  | { readonly kind: 'not_available'; readonly missing: readonly Missing[] };

/** A formula body: pure, deterministic, decimal.js only (rule 9). Keyed by output id. */
export type FormulaBody = (inputs: BodyInputs) => Readonly<Record<string, BodyOutput>>;

/** One formula of a catalogue. */
export interface EngineFormula {
  readonly signature: FormulaSignature;
  readonly requires: readonly Requirement[];
  /**
   * For each output, the registry field its candidate is written on. None in production while no output field is
   * registered (registered with the first approved dataset and its body: build log, phase 5, "Waiting"); a TEST registry
   * names TEST fields.
   */
  readonly outputFields: Readonly<Record<string, string | undefined>>;
  readonly body?: FormulaBody;
}

/**
 * A catalogue: production (bodies only from `src/bodies/`, checked against the manifest) or TEST (test runner only).
 * `series` (phase 6; ./series.ts): the chart series it declares, each a set of one formula's outputs; none in
 * production (no production formula outputs lines by system, level, stream or year).
 */
export interface FormulaCatalogue {
  readonly kind: 'production' | 'test';
  readonly formulas: readonly EngineFormula[];
  readonly series?: readonly SeriesDeclaration[];
}

const COST_RANGES: Requirement = { kind: 'dataset', datasetId: 'sovitech-cost-ranges', name: 'SOVITECH cost ranges and benchmarks', gate: 'dataset-cost-ranges' };
const POINT_TEMPLATES: Requirement = { kind: 'dataset', datasetId: 'sovitech-point-templates', name: 'SOVITECH point templates', gate: 'dataset-point-templates' };
// No gate exists for the function set or the savings factors (prompt 3 5.4 lists none): each is named as missing until
// one is approved. The savings factors are named as PRD R-099's "Until decided" names them ("naming the missing savings
// factors"); phase 3 named the savings output's cost ranges only.
const FUNCTION_SET: Requirement = { kind: 'dataset', datasetId: 'sovitech-function-set', name: 'SOVITECH function set', gate: null, role: 'reference' };
const SAVINGS_FACTORS: Requirement = { kind: 'dataset', datasetId: 'sovitech-savings-factors', name: 'SOVITECH savings factors', gate: null };

/** What each declared formula waits for besides its inputs (the names the phase 3 proposal page already shows). */
const REQUIREMENTS: Readonly<Record<string, readonly Requirement[]>> = Object.freeze({
  capexIndicativeRange: [COST_RANGES],
  pointsEstimate: [POINT_TEMPLATES],
  capexPreliminaryEstimate: [POINT_TEMPLATES, COST_RANGES],
  operatingEnergyEstimate: [COST_RANGES],
  savingsEstimate: [COST_RANGES, SAVINGS_FACTORS],
  measurePriority: [FUNCTION_SET],
});

/**
 * The production catalogue: the registry's six signatures, their requirements, no output field, no body, and no series
 * (phase 6: no production formula outputs lines by system, level, stream or year; every Metrics chart reads "Not
 * available yet", naming what it waits for: ./series.ts).
 */
export const PRODUCTION_CATALOGUE: FormulaCatalogue = Object.freeze({
  kind: 'production',
  series: Object.freeze([]),
  formulas: Object.freeze(
    productionRegistry.formulas.map((signature) =>
      Object.freeze({
        signature,
        requires: REQUIREMENTS[signature.id] ?? [],
        outputFields: Object.freeze(Object.fromEntries(signature.outputs.map((output) => [output, undefined]))),
      }),
    ),
  ),
});

/** The rule 10 stage each investment output carries (2.8 stage labels): the benchmark output stage 1, this project's data stage 2. */
export const OUTPUT_STAGES: Readonly<Record<string, 'indicative_range' | 'preliminary_investment_estimate'>> = Object.freeze({
  [OUTPUT.indicativeRange]: 'indicative_range',
  [OUTPUT.preliminaryEstimate]: 'preliminary_investment_estimate',
});

/** `<id>@<version>` of a signature. */
export function formulaRefOf(signature: Pick<FormulaSignature, 'id' | 'version'>): FormulaRef {
  return `${signature.id}@${signature.version}`;
}

/** The requirements of a declared formula (empty for one the catalogue does not hold). */
export function requirementsOf(catalogue: FormulaCatalogue, formulaId: string): readonly Requirement[] {
  return catalogue.formulas.find((formula) => formula.signature.id === formulaId)?.requires ?? [];
}

/**
 * The input field keys of the formula that produces `output` (empty for an output no formula of the catalogue
 * produces): what `snapshotChanges` reads as `readsOf`, so a changed input marks exactly the outputs that read it.
 */
export function inputsOfOutput(catalogue: FormulaCatalogue, output: string): readonly string[] {
  return catalogue.formulas.find((formula) => formula.signature.outputs.includes(output))?.signature.inputs ?? [];
}
