/**
 * How the engine reads one input field from its derived state (guardrails 2.4: the state, the active candidate and
 * whether a value is provisional or stale are derived by the one derive function, never by the engine; rule 1
 * "Unknown propagates"; rule 4 "Until a conflict is resolved"; rule 8 "Ambiguous readings keep both", "Plausibility
 * checks"; docs/adr/0047 "Built").
 *
 * - `decidingCandidateIds`: the candidates that decide a field's value now: the active candidate of each known fact,
 *   every candidate still compared in a conflict, the one candidate of an ambiguous reading. The run records them as
 *   the candidates it read, the inputs hash covers them, and the staleness check compares them.
 * - `readInput`: what a formula may use of a field: a usable reading, a range over its values (only for a formula that
 *   takes a range), or why it holds nothing the formula may use.
 */
import { UNKNOWN_QUALIFIER, type Candidate, type FieldState, type Quantity } from '@sovitech/domain';
import { checkPlausibility } from '@sovitech/registry';
import { EngineInputError } from './errors';
import { fieldKeyOf, type EngineField, type EngineInput, type InputReading, type InputValue } from './inputs';
import { exact } from './interval';
import { isIncompleteTotal } from './notes';
import type { MissingInputReason } from './results';

/** The candidates that decide a field's value now, sorted (empty for a field with no eligible candidate). */
export function decidingCandidateIds(state: FieldState): readonly string[] {
  const ids = new Set<string>();
  for (const fact of state.facts) {
    if (fact.state === 'conflict' || fact.ambiguous) for (const id of fact.candidateIds) ids.add(id);
    else if (fact.activeCandidateId !== null) ids.add(fact.activeCandidateId);
  }
  for (const conflict of state.conflicts) for (const id of conflict.candidateIds) ids.add(id);
  if (state.activeCandidateId !== null) ids.add(state.activeCandidateId);
  return [...ids].sort();
}

/** What a formula may use of one input. */
export type InputRead =
  | { readonly fieldKey: string; readonly field: EngineField; readonly status: 'usable' | 'range'; readonly reading: InputReading; readonly ids: readonly string[] }
  | { readonly fieldKey: string; readonly field: EngineField | undefined; readonly status: MissingInputReason; readonly ids: readonly string[] };

const qualifierOf = (quantity: Quantity | undefined): string | null =>
  quantity?.qualifier === undefined || quantity.qualifier.trim() === '' || quantity.qualifier === UNKNOWN_QUALIFIER ? null : quantity.qualifier;

/** The values one candidate holds: its quantity (and, for an ambiguous reading, each alternative), its choice or its text. */
function valuesOf(candidate: Candidate, withAlternatives: boolean): InputValue[] {
  if (candidate.quantity !== undefined) {
    const readings = withAlternatives ? [candidate.quantity, ...(candidate.alternatives ?? [])] : [candidate.quantity];
    const seen = new Set<string>();
    const values: InputValue[] = [];
    for (const reading of readings) {
      const key = `${String(reading.value)} ${reading.unit}`;
      if (seen.has(key)) continue;
      seen.add(key);
      values.push({ candidateId: candidate.id, qualifier: qualifierOf(candidate.quantity), quantity: { value: exact(reading.value), unit: reading.unit } });
    }
    return values;
  }
  if (candidate.choice !== undefined) return [{ candidateId: candidate.id, qualifier: null, choice: candidate.choice }];
  if (candidate.text !== undefined) return [{ candidateId: candidate.id, qualifier: null, text: candidate.text }];
  throw new EngineInputError(`the candidate ${candidate.id} holds no value`);
}

function candidateOf(field: EngineField, id: string): Candidate {
  const candidate = field.candidates.find((item) => item.id === id);
  if (candidate === undefined) {
    throw new EngineInputError(`the derived state of ${field.definition.key} names the candidate ${id}, which the input does not hold`);
  }
  return candidate;
}

/** Why a value the formula could use is held back: an incomplete total, or a Please-check value (rule 1; rule 8). */
function heldBack(field: EngineField, candidate: Candidate): MissingInputReason | null {
  if ((candidate.source === 'calculated' || candidate.source === 'estimated') && isIncompleteTotal(candidate.method)) return 'incomplete';
  if (candidate.quantity === undefined) return null;
  const verification = field.state.candidates.find((item) => item.candidateId === candidate.id)?.verification ?? 'unverified';
  const quantities = [candidate.quantity, ...(candidate.alternatives ?? [])];
  for (const quantity of quantities) {
    if (!checkPlausibility(field.definition, quantity, { verification }).usableInTotals) return 'please_check';
  }
  return null;
}

/**
 * What a formula may use of the input `fieldKey`. `takesRange`: whether the formula ranges over a field in conflict or
 * read two ways (its policy is `range_over_options`); otherwise such a field holds nothing it may use.
 */
export function readInput(input: EngineInput, fieldKey: string, takesRange: boolean): InputRead {
  const subjectId = input.subjectOf(fieldKey);
  const field = subjectId === undefined ? undefined : input.fields.get(fieldKeyOf(subjectId, fieldKey));
  if (field === undefined) return { fieldKey, field: undefined, status: 'unknown', ids: [] };
  if (field.definition.key !== fieldKey || field.state.fieldKey !== fieldKey) {
    throw new EngineInputError(`the input handed as ${fieldKey} is the field ${field.definition.key} (${field.state.fieldKey})`);
  }
  const state = field.state;
  const ids = decidingCandidateIds(state);
  switch (state.state) {
    case 'unknown':
    case 'pending':
    case 'skipped':
    case 'not_applicable':
      return { fieldKey, field, status: state.state, ids };
    case 'known':
    case 'conflict':
      break;
  }
  if (state.state === 'known' && state.stale) return { fieldKey, field, status: 'out_of_date', ids };
  const inConflict = state.state === 'conflict' || state.conflicts.length > 0;
  const ambiguous = state.facts.some((fact) => fact.ambiguous);
  if ((inConflict || ambiguous) && !takesRange) return { fieldKey, field, status: inConflict ? 'conflict' : 'ambiguous', ids };
  const values: InputValue[] = [];
  for (const id of ids) {
    const candidate = candidateOf(field, id);
    const held = heldBack(field, candidate);
    if (held !== null) return { fieldKey, field, status: held, ids };
    values.push(...valuesOf(candidate, inConflict || ambiguous));
  }
  if (values.length === 0) return { fieldKey, field, status: 'unknown', ids };
  const kind: InputReading['kind'] = inConflict || ambiguous ? 'range' : 'known';
  return { fieldKey, field, status: kind === 'range' ? 'range' : 'usable', reading: { fieldKey, subjectId: field.subjectId, kind, values }, ids };
}
