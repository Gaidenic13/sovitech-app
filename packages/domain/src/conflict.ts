/**
 * The conflict test (docs/guardrails.md rule 4, "Conflict test"; F-VALUE-03).
 *
 * It judges one comparison group: the eligible candidates of one subject,
 * field, unit and qualifier. Which candidates form a group, and how a value
 * with an unknown qualifier is reconciled with the qualified ones, is the
 * derive function's part (field-state.ts). Read the rule there; this file
 * does not restate it.
 *
 * The tolerance is the field's registry entry (2.6 `tolerance`), handed in as
 * part of the FieldDefinition: the domain never imports the registry. A field
 * with no tolerance has none, so any difference is a conflict (prompt 3 5.2,
 * "Registry values": the strictest value, never an invented one).
 */
import {
  absoluteDecimal,
  compareDecimals,
  decimalOf,
  largerDecimal,
  multiplyDecimals,
  subtractDecimals,
  type ScaledDecimal,
} from './decimal';
import type { Candidate, FieldDefinition, Quantity } from './model';

/** Why the candidates of one comparison group disagree. */
export type Disagreement = 'values_differ' | 'units_differ';

/** A field's tolerance as the conflict test applies it: each bound as a decimal, or absent. */
export interface ToleranceAllowance {
  readonly absolute: ScaledDecimal | null;
  readonly relative: ScaledDecimal | null;
}

const usableBound = (bound: number | undefined): bound is number =>
  bound !== undefined && Number.isFinite(bound) && bound >= 0;

/**
 * The tolerance the field's registry entry states, or null for none. A
 * tolerance counts only with a stated reason (rule 4: counts have zero
 * tolerance "unless the registry states a reason"; 2.6 makes `reason`
 * required) and at least one finite, non-negative bound; anything else is
 * read as no tolerance, the strict side.
 */
export function toleranceOf(field: FieldDefinition): ToleranceAllowance | null {
  const tolerance = field.tolerance;
  if (tolerance === undefined || tolerance.reason.trim() === '') return null;
  const absolute = usableBound(tolerance.absolute) ? decimalOf(tolerance.absolute) : null;
  const relative = usableBound(tolerance.relative) ? decimalOf(tolerance.relative) : null;
  if (absolute === null && relative === null) return null;
  return { absolute, relative };
}

/**
 * Rule 4, "Numbers": the values conflict when the lowest and highest differ by
 * more than the larger of the absolute tolerance and the relative tolerance
 * times the larger value. The whole spread is compared, so small steps never
 * drift past the tolerance (G4-10). "The larger value" is the highest value;
 * the relative bound applies to its magnitude.
 */
export function spreadExceedsTolerance(field: FieldDefinition, values: readonly number[]): boolean {
  const sorted = values.map(decimalOf).sort(compareDecimals);
  const low = sorted[0];
  const high = sorted[sorted.length - 1];
  if (low === undefined || high === undefined) return false;
  const spread = subtractDecimals(high, low);
  if (spread.digits === 0n) return false;

  const allowance = toleranceOf(field);
  if (allowance === null) return true;
  const relative = allowance.relative === null ? null : multiplyDecimals(allowance.relative, absoluteDecimal(high));
  const allowed =
    allowance.absolute === null ? relative : relative === null ? allowance.absolute : largerDecimal(allowance.absolute, relative);
  if (allowed === null) return true;
  return compareDecimals(spread, allowed) > 0;
}

/** The quantity of a candidate the test compares; a quantity field's candidates always carry one (derive refuses the rest). */
function quantityOf(candidate: Candidate): Quantity {
  if (candidate.quantity === undefined) {
    throw new TypeError(`candidate ${candidate.id} has no quantity to compare`);
  }
  return candidate.quantity;
}

/**
 * Every reading a candidate stands for: its value, and each alternative of an
 * ambiguous reading (rule 8, "Ambiguous readings keep both"). An ambiguous
 * candidate is compared by all of its readings, so a second candidate agrees
 * with it only when every reading lies within the tolerance.
 */
export function readingsOf(candidate: Candidate): readonly number[] {
  const quantity = quantityOf(candidate);
  const alternatives = candidate.alternatives === undefined ? [] : candidate.alternatives.map((alternative) => alternative.value);
  return [quantity.value, ...alternatives];
}

/**
 * The conflict test for one comparison group (rule 4). Fewer than two
 * candidates never disagree. Text and decision fields never conflict; enum
 * candidates conflict when their keys differ; numbers follow
 * {@link spreadExceedsTolerance}. Numbers in different units are not compared
 * by the rule ("the same ... unit"), and no conversion is made here, so the
 * group is reported as `units_differ` rather than read one way (a person
 * decides, as for any conflict).
 */
export function disagreementOf(field: FieldDefinition, group: readonly Candidate[]): Disagreement | null {
  if (group.length < 2) return null;
  switch (field.kind) {
    case 'text':
    case 'decision':
      return null;
    case 'enum':
      return new Set(group.map((candidate) => candidate.choice)).size > 1 ? 'values_differ' : null;
    case 'quantity':
    case 'count': {
      if (new Set(group.map((candidate) => quantityOf(candidate).unit)).size > 1) return 'units_differ';
      return spreadExceedsTolerance(field, group.flatMap(readingsOf)) ? 'values_differ' : null;
    }
  }
}
