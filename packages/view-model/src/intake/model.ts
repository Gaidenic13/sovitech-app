/**
 * The question engine's shared shapes and readings of a field's derived state (guardrails 2.4,
 * rules 3, 5, 7): which candidates are eligible, which is the owner's own answer, and the refusal a
 * write planner returns to the API as its 422 or 403 code (routes.ts).
 */
import { compareTimes, type Candidate, type DerivedCandidate, type FieldState } from '@sovitech/domain';
import { productionRegistry } from '@sovitech/registry';
import type { QuestionDefinition, RegistryFieldDefinition } from '@sovitech/registry/validation';

/** A field of the project as the planner reads it. */
export interface IntakeField {
  readonly field: RegistryFieldDefinition;
  readonly subjectId: string;
  readonly state: FieldState;
  readonly candidates: readonly Candidate[];
  /** The owner's `skipped` events on the field, newest last (only the owner's count: G7-7). */
  readonly skippedAt: readonly string[];
}

/** The refusal codes the planners give the API (routes.ts names each route's). */
export const INTAKE_REFUSALS = [
  'answer_invalid',
  'number_ambiguous',
  'unit_mismatch',
  'qualifier_required',
  'question_answered',
  'question_required',
  'confirmation_not_shown',
  'not_an_engineer_field',
  'conflict_not_open',
  'routed_to_engineer',
  'shown_value_changed',
] as const;
export type IntakeRefusalCode = (typeof INTAKE_REFUSALS)[number];

/** A write the planner refuses: the API answers it with the code (422 for an answer, 403 or 409 as routes.ts says), and stores nothing. */
export class IntakeRefusal extends Error {
  override readonly name = 'IntakeRefusal';
  readonly code: IntakeRefusalCode;
  constructor(code: IntakeRefusalCode, message: string) {
    super(message);
    this.code = code;
  }
}

/** The registry's questions the app loads (production). Tests pass their own TEST questions. */
export const PRODUCTION_QUESTIONS: readonly QuestionDefinition[] = productionRegistry.questions;

/** A field's derived candidate by id. */
export function derivedOf(field: IntakeField, candidateId: string): DerivedCandidate | undefined {
  return field.state.candidates.find((candidate) => candidate.candidateId === candidateId);
}

/** The field's eligible candidates (2.4: not rejected, superseded, withdrawn or refused). */
export function eligibleCandidates(field: IntakeField): Candidate[] {
  const eligible = new Set(field.state.candidates.filter((candidate) => candidate.status === 'eligible').map((candidate) => candidate.candidateId));
  return field.candidates.filter((candidate) => eligible.has(candidate.id));
}

/** Whether the field has an eligible candidate (rule 5: then it is shown, never asked). */
export function hasEligible(field: IntakeField): boolean {
  return eligibleCandidates(field).length > 0;
}

/**
 * The eligible candidates a field's display shows as its value, from its derived state only, so the
 * same on every screen (G2-7): the active one; else each fact's active one, or every candidate of a
 * fact with none; and every candidate of an open conflict. The Edit action names exactly these
 * (`shownCandidateIds`), and a correction must name every one of them: the owner decides on what
 * they saw (rule 4, "A correction is a resolution"; G4-36).
 */
export function shownCandidateIdsOf(state: FieldState): string[] {
  if (state.activeCandidateId !== null) return [state.activeCandidateId];
  const ids = new Set<string>();
  for (const fact of state.facts) {
    if (fact.activeCandidateId !== null) ids.add(fact.activeCandidateId);
    else for (const id of fact.candidateIds) ids.add(id);
  }
  for (const conflict of state.conflicts) for (const id of conflict.candidateIds) ids.add(id);
  return [...ids];
}

/** The owner's own answer (a `user` candidate the owner wrote) that is the field's value now, if one is. */
export function ownerAnswerOf(field: IntakeField): Candidate | undefined {
  const active = field.state.activeCandidateId;
  const candidate = active === null ? undefined : field.candidates.find((entry) => entry.id === active);
  return candidate !== undefined && candidate.source === 'user' && candidate.authorRole === 'owner' ? candidate : undefined;
}

/** Whether the owner skipped the field at or after a moment (rule 7: a declined confirmation is not prompted again). */
export function skippedSince(field: IntakeField, moment: string): boolean {
  return field.skippedAt.some((at) => {
    const order = compareTimes(at, moment);
    return order !== null && order >= 0;
  });
}

/**
 * Whether the owner's latest skip of the field is at or after its newest candidate (or the field holds
 * none and was skipped): a skip now would say nothing new (rule 7, "Skip means skip"; section 8, each
 * enforcement logged once; G7-10).
 */
export function skippedSinceLastValue(field: IntakeField): boolean {
  if (field.skippedAt.length === 0) return false;
  let newest: string | undefined;
  for (const candidate of field.candidates) {
    if (newest === undefined) {
      newest = candidate.createdAt;
      continue;
    }
    const order = compareTimes(candidate.createdAt, newest);
    if (order !== null && order > 0) newest = candidate.createdAt;
  }
  return newest === undefined || skippedSince(field, newest);
}

/** The key of a field on its subject. */
export function fieldRefKey(subjectId: string, fieldKey: string): string {
  return `${subjectId}\u0000${fieldKey}`;
}
