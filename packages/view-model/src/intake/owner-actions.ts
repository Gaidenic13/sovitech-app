/**
 * The owner's field actions other than an answer (guardrails rules 3, 4, 5 and 7; 2.4; F-VALUE-05,
 * F-REVIEW-03, F-REVIEW-04; actions.ts): what each appends, planned as pure functions the API
 * writes in one transaction. Each refuses with the code routes.ts names, and nothing is stored then.
 */
import type { CandidateEvent, FieldEvent } from '@sovitech/domain';
import type { QuestionDefinition } from '@sovitech/registry/validation';
import type { StepNumber } from '../browser/contract';
import { confirmationCandidateOf, passesConfirmationTest } from './confirmations';
import { derivedOf, hasEligible, IntakeRefusal, skippedSinceLastValue, type IntakeField } from './model';
import type { QuestionPlan } from './questions';

interface Who {
  /** The owner's user id. */
  readonly by: string;
  readonly at: string;
}

/**
 * The stored events of the candidates a write names (the API passes the fields' candidate events, read under the
 * project's write lock). Absent in unit use: then nothing reads as already done.
 */
interface Prior {
  readonly prior?: readonly CandidateEvent[];
}

/** Whether this owner already recorded an event of this type on the candidate (a repeat of it would say nothing new). */
function ownerAlready(prior: readonly CandidateEvent[] | undefined, candidateId: string, type: 'owner_acknowledged' | 'rejected', by: string): boolean {
  return (prior ?? []).some((event) => event.candidateId === candidateId && event.type === type && event.role === 'owner' && event.by === by);
}

/**
 * "Looks right" on engineer items (rule 3: "'Looks right' records `owner_acknowledged`, which never
 * clears Provisional and never raises the badge"; G3-3): one `owner_acknowledged` event per item,
 * and nothing else. Every item must be an eligible candidate of an engineer field (`confirmBy`
 * engineer; else `not_an_engineer_field`): on an owner field the owner confirms, not acknowledges.
 * An item this owner already acknowledged (`prior`) records nothing again: "Looks right" sent twice
 * (a stale second tab, a double click, one after the other) leaves one event, as a repeated skip
 * does (G7-10); with every item a repeat, the plan is empty.
 */
export function planAcknowledge(input: { readonly fields: readonly IntakeField[]; readonly candidateIds: readonly string[] } & Who & Prior): CandidateEvent[] {
  const events: CandidateEvent[] = [];
  for (const candidateId of new Set(input.candidateIds)) {
    const field = input.fields.find((entry) => derivedOf(entry, candidateId)?.status === 'eligible');
    if (field === undefined || field.field.confirmBy !== 'engineer') {
      throw new IntakeRefusal('not_an_engineer_field', 'only an eligible value of an engineer field is acknowledged (rule 3)');
    }
    if (ownerAlready(input.prior, candidateId, 'owner_acknowledged', input.by)) continue;
    events.push({ candidateId, type: 'owner_acknowledged', by: input.by, role: 'owner', at: input.at });
  }
  return events;
}

/**
 * "Something's wrong" on an engineer item (rule 3: "sends a note to the engineer queue"; G3-10): the
 * owner's rejection with no value of their own, reason `owner_concern`, which derive keeps as a note
 * for the engineer (`owner_rejection_without_value`): the value stays the field's value. Refused
 * `shown_value_changed` on a value an engineer verified (rule 4: "An engineer's verification is never
 * overruled by the owner"; G3-19): no screen offers the action there, so a request for it comes from a
 * screen that showed the value before its verification. On a value this owner already rejected
 * (`prior`) it records nothing again (null): the note is already with the engineer, and "Something's
 * wrong" sent twice leaves one event, as a repeated skip does (G7-10).
 */
export function planConcern(input: { readonly fields: readonly IntakeField[]; readonly candidateId: string } & Who & Prior): CandidateEvent | null {
  const field = input.fields.find((entry) => derivedOf(entry, input.candidateId)?.status === 'eligible');
  if (field === undefined || field.field.confirmBy !== 'engineer') {
    throw new IntakeRefusal('not_an_engineer_field', 'only an eligible value of an engineer field takes a concern (rule 3)');
  }
  if (derivedOf(field, input.candidateId)?.verification === 'engineer_verified') {
    throw new IntakeRefusal('shown_value_changed', "an engineer's verification of the value is never overruled by the owner (rule 4)");
  }
  if (ownerAlready(input.prior, input.candidateId, 'rejected', input.by)) return null;
  return { candidateId: input.candidateId, type: 'rejected', by: input.by, role: 'owner', at: input.at, reason: 'owner_concern' };
}

/**
 * "Yes" on a confirmation the page showed (rule 5; US-REVIEW-05 AC4, US-INTAKE-07 AC5): a
 * `user_confirmed` event by the owner on the candidate, only when its field passes rule 5's test
 * now with that candidate and it was among the confirmations shown within the budget (else
 * `confirmation_not_shown`). The badge then reads Confirmed by you, the origin still shown (rule 3).
 * On an inference, the event's reason records the derived tier the owner was shown,
 * `confidence:<tier>`, as the owner's correction of one records it on `owner_corrected_inference`:
 * rule 3's decision counts read it as an agreement on that tier (docs/adr/0054 decision 3). Derive
 * reads no reason on `user_confirmed`, so the verification is the same with or without it.
 */
export function planConfirmation(input: { readonly fields: readonly IntakeField[]; readonly candidateId: string; readonly shownConfirmations: ReadonlySet<string> } & Who): CandidateEvent {
  const field = input.fields.find((entry) => derivedOf(entry, input.candidateId)?.status === 'eligible');
  const candidate = field === undefined || !passesConfirmationTest(field) ? undefined : confirmationCandidateOf(field);
  if (candidate === undefined || candidate.id !== input.candidateId || !input.shownConfirmations.has(input.candidateId)) {
    throw new IntakeRefusal('confirmation_not_shown', 'no confirmation of that value is shown to the owner (rule 5)');
  }
  const event: CandidateEvent = { candidateId: input.candidateId, type: 'user_confirmed', by: input.by, role: 'owner', at: input.at };
  if (candidate.source !== 'ai_inference' || field === undefined) return event;
  return { ...event, reason: `confidence:${derivedOf(field, candidate.id)?.confidence ?? 'unstated'}` };
}

/**
 * The owner's choice on a conflict routed to the owner (rule 4: "Only the right person's resolution
 * closes a conflict. Each resolution records who, when and why"; US-REVIEW-11 AC3): a
 * `conflict_resolved` field event naming the chosen candidate and every candidate the owner was
 * shown (`coveredCandidateIds`), with its reason. Refused `conflict_not_open` when the field has no
 * open conflict holding the chosen value, and `routed_to_engineer` when the conflict is the
 * engineer's.
 */
export function planConflictResolution(input: { readonly field: IntakeField; readonly chosenCandidateId: string } & Who): FieldEvent {
  const conflict = input.field.state.conflicts.find((entry) => entry.candidateIds.includes(input.chosenCandidateId));
  if (input.field.state.state !== 'conflict' || conflict === undefined) throw new IntakeRefusal('conflict_not_open', 'no open conflict holds that value (rule 4)');
  if (conflict.routedTo !== 'owner') throw new IntakeRefusal('routed_to_engineer', 'the conflict is routed to a SOVITECH engineer (rule 4)');
  return {
    subjectId: input.field.subjectId,
    fieldKey: input.field.field.key,
    type: 'conflict_resolved',
    by: input.by,
    role: 'owner',
    at: input.at,
    reason: 'owner_choice',
    chosenCandidateId: input.chosenCandidateId,
    coveredCandidateIds: [...conflict.candidateIds],
  };
}

/**
 * Where a skip is asked now, as the API reads it from the project (G7-10): the step the page that sent
 * it names, when it names one; the question's plan on its step (planQuestion); whether step 8 serves
 * the question's inline ask now (inlineAsks); and whether step 8 serves it when the owner asks for it
 * (`add`, requestedInlineAsk: PRD R-012; G7-11).
 */
export interface SkipContext {
  readonly step?: StepNumber;
  readonly plan: QuestionPlan | undefined;
  readonly inlineAskNow: boolean;
  readonly requestedAskNow?: boolean;
}

/** Why a skip was recorded (the event's reason and section 8's): step 8's "Generate without it", or "Skip for now". */
export type SkipReason = 'generate_without_it' | 'skip_for_now';

/**
 * "Skip for now", or step 8's "Generate without it" (rule 7): a `skipped` field event by the owner on
 * each field of the question. Refused `question_required` on a required field (rule 7: asked without
 * Skip) and `question_answered` when a field of it already holds a value (G7-3: no Skip link there).
 *
 * With the API's `context` (G7-10; rule 7, "At step 8 the review asks for it once, inline", "Skip means
 * skip"; section 8, each enforcement logged once), a skip is recorded only where the question is asked
 * now, and a repeat records nothing:
 * - from step 8 (`step` 8): when step 8 serves its inline ask now;
 * - from another step: when the question is that step's and planned `ask` there;
 * - with no step named (a page that names none): when planned `ask` on its step, or when step 8 serves
 *   its inline ask now (the second skip of a question first asked on an earlier step);
 * - otherwise, when every field of the question is already skipped since its last value: nothing is
 *   written (`[]`: a repeat, or the owner's own "Add" ask of a field already skipped, R-012);
 * - otherwise, from step 8 or a page that names no step, when step 8 serves the ask on the owner's own
 *   request (`requestedAskNow`: R-012's "Add", a first-estimate field with no value, G7-11);
 * - otherwise refused `answer_invalid`: the question is not asked now (an early skip of step 8's ask).
 * Each recorded event carries its reason. Without `context` (unit use), the question's fields are skipped.
 */
export function planSkip(input: { readonly question: QuestionDefinition; readonly fields: readonly IntakeField[]; readonly context?: SkipContext } & Who): FieldEvent[] {
  const own = input.question.fieldKeys.flatMap((key) => input.fields.filter((field) => field.field.key === key));
  if (own.length === 0) throw new IntakeRefusal('answer_invalid', `${input.question.id} has no field on this project`);
  if (own.some((field) => field.field.criticality === 'required')) throw new IntakeRefusal('question_required', `${input.question.id} is required (rule 7)`);
  if (own.some(hasEligible)) throw new IntakeRefusal('question_answered', `${input.question.id} already has a value (rule 7)`);
  const skips = (reason?: SkipReason): FieldEvent[] =>
    own.map((field) => ({ subjectId: field.subjectId, fieldKey: field.field.key, type: 'skipped', by: input.by, role: 'owner', at: input.at, ...(reason === undefined ? {} : { reason }) }));
  const { context } = input;
  if (context === undefined) return skips();
  const plannedHere = (step: number | undefined): boolean => context.plan?.kind === 'ask' && (step === undefined || input.question.step === step);
  const ownReason: SkipReason = input.question.step === 8 ? 'generate_without_it' : 'skip_for_now';
  if (context.step === 8) {
    if (context.inlineAskNow) return skips('generate_without_it');
  } else if (context.step !== undefined) {
    if (plannedHere(context.step)) return skips('skip_for_now');
  } else {
    if (plannedHere(undefined)) return skips(ownReason);
    if (context.inlineAskNow) return skips('generate_without_it');
  }
  if (own.every(skippedSinceLastValue)) return [];
  if ((context.step === 8 || context.step === undefined) && context.requestedAskNow === true) return skips('generate_without_it');
  throw new IntakeRefusal('answer_invalid', `${input.question.id} is not asked now (rule 7)`);
}
