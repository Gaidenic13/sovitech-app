/**
 * What the engine reads (guardrails 2.4: state is derived by the one derive function; the engine never derives on
 * its own). The API reads the project in the user's own request, derives every field with `derive`, and hands the
 * engine one `EngineField` per field a formula reads; the engine reads nothing else of the project.
 *
 * Datasets reach a body only as loaded datasets (`@sovitech/registry` `loadDataset`: an approval record that resolves,
 * never a TEST id outside the test runner) and only while the gate that holds them is open (`readGate`). In the test
 * runner, TEST datasets reach TEST bodies through the TEST registry of `packages/engine/test-formulas/`, never through
 * a production gate (prompt 3 5.4).
 */
import type { Candidate, FieldDefinition, FieldState } from '@sovitech/domain';
import type { LoadedDataset } from '@sovitech/registry';
import type { Decimal } from 'decimal.js';

/** One field a formula reads, as derived (2.4). */
export interface EngineField {
  readonly definition: FieldDefinition;
  readonly subjectId: string;
  readonly state: FieldState;
  /** Every candidate of the field, by id (the derive's `candidates` name them; the engine reads values from here). */
  readonly candidates: readonly Candidate[];
}

/** How a run reads datasets: a loaded, approved dataset by id, or undefined (never a TEST dataset in production). */
export type DatasetAccess = (datasetId: string) => LoadedDataset | undefined;

export interface EngineInput {
  readonly projectId: string;
  /** The fields the declared formulas read, by `<subject id>:<field key>` (`fieldKeyOf`). */
  readonly fields: ReadonlyMap<string, EngineField>;
  /** The subject a field key lives on in this project (the project's or the building's id), for the inputs a signature names. */
  readonly subjectOf: (fieldKey: string) => string | undefined;
  /** The gates that are closed (from `readGate` over the production gate source). */
  readonly closedGates: ReadonlySet<string>;
  readonly datasets: DatasetAccess;
  /** The id of the account the engine's candidates are written as (a service account that is a member of the project; ADR 0013, 0048). */
  readonly author: string;
  /**
   * The registry entry of a field, for the output fields the engine writes candidates on (2.7: the unit's dimension;
   * rule 1: estimation allowed). Without it, the entry of that field as `fields` hands it; when neither holds the
   * field, no candidate is written: the output reads "Not available yet" and the refusal is recorded
   * (`no_output_field`). The production registry's lookup in the app; a TEST registry's in the test runner.
   */
  readonly fieldDefinition?: (fieldKey: string) => FieldDefinition | undefined;
}

/** One value an input holds, as a body may use it. */
export interface InputValue {
  /** The candidate it comes from (several values share one id when one reading is ambiguous: rule 8). */
  readonly candidateId: string;
  /** The fact it belongs to (rule 4 "Only like with like"): the stated qualifier, or null. */
  readonly qualifier: string | null;
  /** A quantity, exactly as stored, in its own unit (a body converts within a dimension only by the registry's exact factors). */
  readonly quantity?: { readonly value: Decimal; readonly unit: string };
  /** An enum key or a decision option. */
  readonly choice?: string;
  readonly text?: string;
}

/**
 * The values of one input the engine hands a body:
 * - `known`: the active value of each fact of a known field (one value per qualifier);
 * - `range`: a field in conflict or read two ways, under a formula that takes a range: every value of each fact the
 *   range runs over (rule 4 "Until a conflict is resolved"; rule 8 "Ambiguous readings keep both").
 */
export interface InputReading {
  readonly fieldKey: string;
  readonly subjectId: string;
  readonly kind: 'known' | 'range';
  readonly values: readonly InputValue[];
}

/** The map key of a field on a subject. */
export function fieldKeyOf(subjectId: string, fieldKey: string): string {
  return `${subjectId}:${fieldKey}`;
}
