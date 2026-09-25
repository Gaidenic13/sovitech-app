/**
 * Owner corrections as resolutions (docs/guardrails.md rule 4, "A correction is a
 * resolution, not a conflict"; 2.1; F-VALUE-05).
 *
 * When the owner changes a value on a screen that showed them the other value and
 * its source, this plans what to append: the owner's value as a new `user`
 * candidate, and, unless the shown candidate is engineer_verified, a `rejected`
 * event on it by the owner. Nothing is changed or removed: the plan is appended
 * by the caller, and the derive function then reads the result (no conflict, and
 * no second question; or, for an engineer_verified value, a conflict for the
 * engineer). Pure.
 */
import type {
  Candidate,
  CandidateEvent,
  FieldDefinition,
  GuardrailEvent,
  Quantity,
} from './model';
import type { FieldState } from './field-state';

/** The owner's new value: one of a quantity, an enum or decision key, or a text, as the field's kind takes. */
export interface OwnerValue {
  readonly quantity?: Quantity;
  readonly choice?: string;
  readonly text?: string;
}

export interface OwnerCorrectionInput {
  readonly projectId: string;
  readonly field: FieldDefinition;
  /** The field's derived state as the screen showed it. */
  readonly state: FieldState;
  /** The candidate the screen showed, with its source. */
  readonly shown: Candidate;
  readonly value: OwnerValue;
  /** Id and stamp of the owner's candidate (UUIDv7 and time come from app code). */
  readonly candidateId: string;
  readonly by: string;
  readonly at: string;
}

/** What to append for a correction. */
export interface OwnerCorrectionPlan {
  readonly candidate: Candidate;
  readonly candidateEvents: readonly CandidateEvent[];
  /**
   * Whether the shown candidate is rejected. It is not when it carries an
   * engineer_verified event: "An engineer's verification is never overruled by the owner" (rule 4).
   */
  readonly rejectsShown: boolean;
  /**
   * What goes to the engineer queue: the rejected document value on an engineer
   * or for_quotation field (`rejected_value`), or, when the shown value is
   * engineer_verified, the owner's value set against it (`conflict`: if the two
   * disagree the field is in conflict, routed to the engineer). The derive
   * function lists the same item from the appended events; the plan never
   * decides the state itself.
   */
  readonly engineerQueue: 'none' | 'rejected_value' | 'conflict';
  /** Section 8: `owner_corrected_inference`, with the confidence tier, when the shown value was an inference. */
  readonly guardrailEvents: readonly GuardrailEvent[];
}

/**
 * Plans an owner correction. Throws when the shown candidate is not one the
 * screen could show as the field's value: another field or subject, or not
 * eligible in the state given.
 */
export function planOwnerCorrection(input: OwnerCorrectionInput): OwnerCorrectionPlan {
  const { field, state, shown, value } = input;
  if (shown.fieldKey !== field.key || shown.subjectId !== state.subjectId || state.fieldKey !== field.key) {
    throw new Error(`candidate ${shown.id} is not a value of ${state.subjectId}/${field.key}`);
  }
  const derived = state.candidates.find((candidate) => candidate.candidateId === shown.id);
  if (derived === undefined || derived.status !== 'eligible') {
    throw new Error(`candidate ${shown.id} is not an eligible value of ${field.key}, so no screen showed it as one`);
  }

  // The screen showed the value with its basis, so an owner quantity without a
  // qualifier corrects that reading (the same fact), in the same unit.
  const quantity =
    value.quantity !== undefined &&
    value.quantity.qualifier === undefined &&
    shown.quantity?.qualifier !== undefined &&
    shown.quantity.unit === value.quantity.unit
      ? { ...value.quantity, qualifier: shown.quantity.qualifier }
      : value.quantity;

  const candidate: Candidate = {
    id: input.candidateId,
    subjectId: shown.subjectId,
    fieldKey: field.key,
    ...(quantity === undefined ? {} : { quantity }),
    ...(value.choice === undefined ? {} : { choice: value.choice }),
    ...(value.text === undefined ? {} : { text: value.text }),
    source: 'user',
    evidence: [],
    createdBy: input.by,
    // The owner's own correction (rule 4); the store sets the same from the request when it is written.
    authorRole: 'owner',
    createdAt: input.at,
  };

  const events: CandidateEvent[] = [];
  // 2.1: the owner's own entry on an owner or either field gets a user_confirmed event when created.
  if (field.confirmBy !== 'engineer') {
    events.push({ candidateId: candidate.id, type: 'user_confirmed', by: input.by, role: 'owner', at: input.at });
  }
  const rejectsShown = derived.verification !== 'engineer_verified';
  if (rejectsShown) {
    events.push({
      candidateId: shown.id,
      type: 'rejected',
      by: input.by,
      role: 'owner',
      at: input.at,
      reason: 'owner_correction',
    });
  }

  const engineerChecks = field.confirmBy === 'engineer' || field.criticality === 'for_quotation';
  const shownIsFound = shown.source === 'document' || shown.source === 'ai_inference';
  const engineerQueue = !rejectsShown ? 'conflict' : engineerChecks && shownIsFound ? 'rejected_value' : 'none';

  const guardrailEvents: GuardrailEvent[] =
    shown.source === 'ai_inference'
      ? [
          {
            type: 'owner_corrected_inference',
            projectId: input.projectId,
            subjectId: shown.subjectId,
            fieldKey: field.key,
            reason: `confidence:${shown.confidence === undefined ? 'unstated' : shown.confidence}`,
          },
        ]
      : [];

  return { candidate, candidateEvents: events, rejectsShown, engineerQueue, guardrailEvents };
}
