/**
 * What the engine answers for each output (guardrails 2.1 `calculated` and `estimated`, "The calculation engine
 * only"; 2.4 `Candidate.method`, `range`; rule 1 "Unknown propagates"; rule 7 "'Not available yet' never appears
 * alone"; rule 9; rule 10).
 *
 * An output is one of three things, never a zero, a blank or a stand-in (rule 1):
 * - `figure`: one new candidate the engine produced (source `calculated` or `estimated` by the formula's signature),
 *   with its `method` (formula id and version, the exact input candidate ids, the declared `unknownPolicy`, the
 *   assumptions, the dataset versions it read) and, when estimated, the `range` its method produced (low < value <
 *   high; rule 9). Display-ready: the view-model resolves it with the one resolver ("about 5,800 (5,200 to 6,400)",
 *   Estimated, its basis line, the Provisional line its inputs give: 2.4 "Calculated candidates are transparent").
 * - `incomplete`: a total computed under `exclude_and_count` that leaves out items that are not `minorForTotals`
 *   (rule 1, "Material exclusions"): the candidate is kept for the record, but it reads "Incomplete: excludes <item
 *   names>" with the same prominence and no headline, payback or ROI is computed from it (G1-2).
 * - `not_available`: what was missing, each item named for the owner (rule 7): a SOVITECH dataset with no approved
 *   version (and the gate that holds it), a method no source defines (no body: prompt 3 phase 5, "Write no production
 *   formula for a method no source defines"), a unit the registry lacks (`units-7.2.22`), or an input field (unknown,
 *   skipped, pending, in conflict, or read two ways: rule 4 "Until a conflict is resolved", G4-12).
 */
import type { Candidate } from '@sovitech/domain';

/** `<formula id>@<version>`, as `affects` names a formula (rule 6). */
export type FormulaRef = `${string}@${string}`;

/**
 * Why an input of a formula held no value it could use:
 * - `unknown`, `skipped`, `pending`, `not_applicable`: the field's derived state (2.4);
 * - `conflict`: two values the formula cannot range over (rule 4, "Until a conflict is resolved"; G4-12);
 * - `ambiguous`: one reading with two values the formula cannot range over (rule 8, "Ambiguous readings keep both");
 * - `please_check`: a value outside its field's plausible range that the right person has not confirmed (rule 8,
 *   "Plausibility checks": "not used in totals until confirmed"; G8-10);
 * - `incomplete`: an engine total that reads "Incomplete: excludes <item names>" (rule 1, "Material exclusions": no
 *   headline, payback or ROI is computed from it; G1-2);
 * - `out_of_date`: a calculated or estimated value whose own inputs changed (2.4 "Recalculation": it "never [renders]
 *   as current", so no formula reads it as current).
 */
export type MissingInputReason =
  | 'unknown'
  | 'skipped'
  | 'pending'
  | 'conflict'
  | 'ambiguous'
  | 'not_applicable'
  | 'please_check'
  | 'incomplete'
  | 'out_of_date';

/** One thing an output waited for, named for the owner by the view-model (the names here are the catalogue's). */
export type Missing =
  | { readonly kind: 'dataset'; readonly datasetId: string; readonly name: string; readonly gate: string | null }
  | { readonly kind: 'method'; readonly name: string }
  | { readonly kind: 'unit'; readonly name: string; readonly gate: string }
  | { readonly kind: 'input'; readonly fieldKey: string; readonly subjectId: string; readonly reason: MissingInputReason };

/** A candidate the engine produced, not yet stored: the store adds `createdAt` and `authorRole` (ADR 0014). It always holds a quantity. */
export type EngineCandidate = Omit<Candidate, 'createdAt' | 'authorRole'> & {
  readonly source: 'calculated' | 'estimated';
  readonly method: NonNullable<Candidate['method']>;
  readonly quantity: NonNullable<Candidate['quantity']>;
};

/** The engine's answer for one output of one formula run. */
export type OutputResult =
  | { readonly kind: 'figure'; readonly output: string; readonly formula: FormulaRef; readonly candidate: EngineCandidate }
  | {
      readonly kind: 'incomplete';
      readonly output: string;
      readonly formula: FormulaRef;
      readonly candidate: EngineCandidate;
      /** The items left out, by name (rule 1, "Incomplete: excludes <item names>"). */
      readonly excluded: readonly string[];
    }
  | { readonly kind: 'not_available'; readonly output: string; readonly formula: FormulaRef; readonly missing: readonly Missing[] };

/**
 * One whole run of the engine over a project's state (what Generate stores as the snapshot: 2.4 "A generated proposal
 * keeps a snapshot of the candidate ids and formula versions it used"):
 * - `outputs`: one result per declared output, in the catalogue's order;
 * - `formulasRun`: the formula versions whose body ran (none while no production body exists);
 * - `inputCandidateIds`: every candidate the run read, the active one of each known input and every eligible one of an
 *   input in conflict, sorted;
 * - `datasets`: the approved dataset versions the run read (none while no dataset is approved);
 * - `inputsHash`: `sha256:<hex>` over the canonical form of the inputs' states and candidate ids, the formula versions
 *   and the dataset versions (inputsHashOf), so any change of an input's active candidate or state changes it.
 */
export interface EngineRun {
  readonly outputs: readonly OutputResult[];
  readonly formulasRun: readonly FormulaRef[];
  readonly inputCandidateIds: readonly string[];
  readonly datasets: readonly { readonly id: string; readonly version: string }[];
  readonly inputsHash: string;
  /**
   * Answers of a body the engine refused, each with why (rule 9: an estimate outside low < value < high, G9-12; a
   * value the output field cannot hold, 2.7; a figure no JavaScript number holds exactly). The output then reads "Not
   * available yet", naming the method; the API records each as a guardrail event (section 8). Empty when none.
   */
  readonly refusals: readonly EngineRefusal[];
}

/** Why the engine refused a body's answer for one output (no candidate is created). */
export type EngineRefusalReason =
  | 'estimate_not_inside_range'
  | 'estimate_from_calculated_formula'
  | 'value_from_estimated_formula'
  | 'value_not_exact'
  | 'not_representable'
  | 'no_output_field'
  | 'output_field_unit'
  | 'output_field_estimation_forbidden'
  | 'output_field_value_shape'
  | 'answer_missing'
  | 'answer_undeclared';

export interface EngineRefusal {
  readonly formula: FormulaRef;
  readonly output: string;
  readonly reason: EngineRefusalReason;
  readonly message: string;
}
