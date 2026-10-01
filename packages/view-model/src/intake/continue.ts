/**
 * What a Continue writes (F-QUESTION-04, F-QUESTION-06, F-VALUE-05, F-VALUE-06; guardrails rules 3,
 * 4 and 7; 2.1, 2.4, 2.6; PRD R-002, R-051; actions.ts ContinueRequest), and the candidates and
 * events those writes are, for the API to append (the store changes nothing: 2.4).
 */
import {
  planOwnerCorrection,
  type Candidate,
  type CandidateEvent,
  type FieldEvent,
  type GuardrailEvent,
  type OriginalText,
} from '@sovitech/domain';
import { productionRegistry } from '@sovitech/registry';
import type { QuestionDefinition } from '@sovitech/registry/validation';
import { ContinueRequestSchema, type ContinueRequest, type StepNumber } from '../browser/contract';
import { eligibleCandidates, fieldRefKey, hasEligible, IntakeRefusal, ownerAnswerOf, PRODUCTION_QUESTIONS, shownCandidateIdsOf, type IntakeField } from './model';
import { parseOwnerAnswer } from './owner-values';
import type { Suggestion } from './suggestions';

/** The writes a Continue plans, in order: the owner's answers, the accepted suggestions, then the skips. */
export interface ContinueWrites {
  /** New `user` candidates, each with `user_confirmed` when the field's `confirmBy` is owner or either (2.1). */
  readonly answers: readonly {
    readonly fieldKey: string;
    readonly subjectId: string;
    readonly choice?: string;
    readonly text?: string;
    /** The entry exactly as written, when the answer carries one (rule 8; G8-23). */
    readonly original?: OriginalText;
    readonly rejects: readonly string[];
  }[];
  /** Accepted visible suggestions: a `user` candidate, `user_confirmed` and `accepted_suggestion` (reason: `suggestedBy`) each (rule 3; G3-4). */
  readonly acceptedSuggestions: readonly Suggestion[];
  /** `skipped` field events by the owner (rule 7). */
  readonly skips: readonly { readonly fieldKey: string; readonly subjectId: string }[];
  /** Suggestions the page reported that the server does not suggest now: ignored and logged. */
  readonly ignoredSuggestions: number;
}

type Answer = ContinueWrites['answers'][number];

/** The decision options of a multi-select's field: the chosen one first (`include`, `selected`), then the other (2.6; catalogue). */
function decisionOptions(field: IntakeField): { readonly positive: string; readonly negative: string } {
  const [positive, negative] = field.field.options ?? [];
  if (positive === undefined || negative === undefined) throw new Error(`intake: the decision field ${field.field.key} lists no two options`);
  return { positive, negative };
}

/**
 * What a Continue writes (actions.ts ContinueRequest): answers, the whole-question reading of a
 * multi-select, the visible suggestions left in place that the server also suggests now, and skips
 * for shown questions and confirmations left unanswered. Nothing is written for an unchanged answer
 * (US-SCOPE-02 AC9) and no fact is confirmed (rule 3). Proves G3-4 and G7-8.
 *
 * - A single-choice answer must name a field of a question on this step and one of its options
 *   (else `answer_invalid`); `rejects` keeps only the field's eligible candidates the page named in
 *   `corrects` (rule 4, "A correction is a resolution"). An answer that differs from the owner's own
 *   and leaves out of `corrects` a value the field shows now is refused `shown_value_changed`: the
 *   owner decides on what they saw (G4-36). A quantity is not answered on Continue: no
 *   question of steps 1 to 7 takes one (the step 8 inline ask and Edit use the field routes).
 * - A multi-select (PRD R-051 "Proposed (PRD interim, reversible) until D-64"; US-INTAKE-09 AC3,
 *   US-SCOPE-02 AC4 and AC6): with at least one option ticked or visibly suggested, each option is
 *   recorded (the chosen or the other option) where it differs from the owner's stored decision, and
 *   a visible suggestion left ticked is accepted as the owner's answer; with none, the question is
 *   recorded as skipped, never as a decision against every option (rule 7), except that an option
 *   the owner had chosen and has now unticked records the other option: that is the owner's change,
 *   not a decision taken for them. A shown multi-select sent with no entry reads as none ticked.
 * - A suggestion the page reports is accepted only when the server suggests the same field and
 *   choice now, the field is on this step and the owner gave no answer of their own; any other is
 *   counted in `ignoredSuggestions` (never trusted: rule 3).
 * - Each shown question left unanswered, with no value, not skipped before and not required, is
 *   skipped (rule 7: "Continue counts as skipping"); each shown confirmation left unanswered is
 *   skipped on its field (a declined confirmation is not prompted again during the intake), when the
 *   server shows it now too (`shownConfirmations`; G7-10).
 */
export function planContinue(input: {
  readonly step: StepNumber;
  readonly fields: readonly IntakeField[];
  readonly suggestions: readonly Suggestion[];
  readonly request: unknown;
  /** The registry's questions; the production registry's by default (tests pass TEST ones). */
  readonly questions?: readonly QuestionDefinition[];
  /**
   * The confirmations the server shows now (the plan's `shownConfirmations`, rule 5's test within the budget):
   * a confirmation the page reports as shown and left unanswered is skipped only when it is one of these (G7-10:
   * the page's list is never trusted). Absent, no confirmation is skipped.
   */
  readonly shownConfirmations?: ReadonlySet<string>;
}): ContinueWrites {
  const parsed = ContinueRequestSchema.safeParse(input.request);
  if (!parsed.success) throw new IntakeRefusal('answer_invalid', 'the Continue request does not match the contract');
  const request: ContinueRequest = parsed.data;
  const stepQuestions = (input.questions ?? PRODUCTION_QUESTIONS).filter((question) => question.step === input.step);
  const kindOf = (fieldKey: string): string | undefined =>
    (input.fields.find((field) => field.field.key === fieldKey)?.field ?? productionRegistry.fields.find((field) => field.key === fieldKey))?.kind;
  // A multi-select is one decision field per option (2.6); a question of several other fields (country and city) is not one.
  const isMultiSelect = (question: QuestionDefinition): boolean => question.kind === 'question' && question.fieldKeys.length > 1 && question.fieldKeys.every((key) => kindOf(key) === 'decision');
  const multiQuestions = stepQuestions.filter(isMultiSelect);
  const multiKeys = new Set(multiQuestions.flatMap((question) => question.fieldKeys));
  const stepKeys = new Set(stepQuestions.flatMap((question) => question.fieldKeys));
  const byRef = new Map(input.fields.map((field) => [fieldRefKey(field.subjectId, field.field.key), field]));
  const byKey = (fieldKey: string): IntakeField | undefined => input.fields.find((field) => field.field.key === fieldKey);
  const suggested = (subjectId: string, fieldKey: string, choice: string): Suggestion | undefined =>
    input.suggestions.find((suggestion) => suggestion.subjectId === subjectId && suggestion.fieldKey === fieldKey && suggestion.choice === choice);

  const answers: Answer[] = [];
  const accepted: Suggestion[] = [];
  const skips = new Map<string, { fieldKey: string; subjectId: string }>();
  const ignored = new Set<string>();
  const written = new Set<string>();
  const skip = (field: IntakeField): void => {
    const key = fieldRefKey(field.subjectId, field.field.key);
    if (!written.has(key)) skips.set(key, { fieldKey: field.field.key, subjectId: field.subjectId });
  };

  // 1. Single-choice and text answers.
  for (const answer of request.answers) {
    const field = byRef.get(fieldRefKey(answer.field.subjectId, answer.field.fieldKey));
    if (field === undefined || !stepKeys.has(field.field.key) || multiKeys.has(field.field.key)) {
      throw new IntakeRefusal('answer_invalid', `${answer.field.fieldKey} is not answered on step ${String(input.step)}`);
    }
    if (answer.value.kind === 'quantity') throw new IntakeRefusal('answer_invalid', `${field.field.key} is not answered on Continue`);
    const value = parseOwnerAnswer(field.field, answer.value);
    const key = fieldRefKey(field.subjectId, field.field.key);
    written.add(key);
    const current = ownerAnswerOf(field);
    if (current !== undefined && current.choice === value.choice && current.text === value.text) continue;
    // Rule 4, "A correction is a resolution": the owner decides on what they saw (G4-36). An answer that does not
    // name every value the field shows now comes from a screen that showed another state (a second tab, a page
    // left open): refused, so it never adds a second value beside one the owner did not see.
    const named = new Set(answer.corrects);
    if (shownCandidateIdsOf(field.state).some((id) => !named.has(id))) {
      throw new IntakeRefusal('shown_value_changed', `${field.field.key} shows a value the answer does not name (rule 4)`);
    }
    const eligible = new Set(eligibleCandidates(field).map((candidate) => candidate.id));
    answers.push({
      fieldKey: field.field.key,
      subjectId: field.subjectId,
      ...(value.choice === undefined ? {} : { choice: value.choice }),
      ...(value.text === undefined ? {} : { text: value.text }),
      ...(value.original === undefined ? {} : { original: value.original }),
      rejects: answer.corrects.filter((id) => eligible.has(id)),
    });
  }

  // 2. Visible suggestions on single-choice fields.
  for (const visible of request.visibleSuggestions) {
    if (multiKeys.has(visible.field.fieldKey)) continue;
    const field = byRef.get(fieldRefKey(visible.field.subjectId, visible.field.fieldKey));
    const match = suggested(visible.field.subjectId, visible.field.fieldKey, visible.choice);
    if (field === undefined || match === undefined || !stepKeys.has(field.field.key) || hasEligible(field)) {
      ignored.add(`${fieldRefKey(visible.field.subjectId, visible.field.fieldKey)}\u0000${visible.choice}`);
      continue;
    }
    const key = fieldRefKey(field.subjectId, field.field.key);
    if (written.has(key)) continue;
    written.add(key);
    accepted.push(match);
  }

  // 3. Multi-selects, read as a whole question.
  const shownQuestions = new Set(request.shown.questions);
  const multiAnswers = new Map(request.multi.map((entry) => [entry.questionId, entry.ticked]));
  for (const entry of request.multi) {
    if (!multiQuestions.some((question) => question.id === entry.questionId)) {
      throw new IntakeRefusal('answer_invalid', `${entry.questionId} is not a multi-select of step ${String(input.step)}`);
    }
  }
  for (const question of multiQuestions) {
    const ticked = multiAnswers.get(question.id);
    if (ticked === undefined && !shownQuestions.has(question.id)) continue;
    const tickedKeys = new Set(ticked ?? []);
    for (const key of tickedKeys) {
      if (!question.fieldKeys.includes(key)) throw new IntakeRefusal('answer_invalid', `${key} is not an option of ${question.id}`);
    }
    const fields = question.fieldKeys.flatMap((key) => {
      const field = byKey(key);
      return field === undefined ? [] : [field];
    });
    const visible = request.visibleSuggestions.filter((entry) => question.fieldKeys.includes(entry.field.fieldKey));
    const visibleNow = visible.filter((entry) => suggested(entry.field.subjectId, entry.field.fieldKey, entry.choice) !== undefined);
    for (const entry of visible) {
      if (!visibleNow.includes(entry)) ignored.add(`${fieldRefKey(entry.field.subjectId, entry.field.fieldKey)}\u0000${entry.choice}`);
    }
    if (tickedKeys.size === 0 && visibleNow.length === 0) {
      const chosen = fields.filter((field) => ownerAnswerOf(field)?.choice === decisionOptions(field).positive);
      if (chosen.length === 0) {
        for (const field of fields) if (!hasEligible(field) && field.skippedAt.length === 0) skip(field);
      } else {
        for (const field of chosen) {
          written.add(fieldRefKey(field.subjectId, field.field.key));
          answers.push({ fieldKey: field.field.key, subjectId: field.subjectId, choice: decisionOptions(field).negative, rejects: [] });
        }
      }
      continue;
    }
    for (const field of fields) {
      const { positive, negative } = decisionOptions(field);
      const key = fieldRefKey(field.subjectId, field.field.key);
      const desired = tickedKeys.has(field.field.key) ? positive : negative;
      written.add(key);
      if (ownerAnswerOf(field)?.choice === desired) continue;
      const suggestion = visibleNow.find((entry) => entry.field.fieldKey === field.field.key && entry.choice === desired);
      const match = suggestion === undefined ? undefined : suggested(field.subjectId, field.field.key, desired);
      if (match !== undefined && !hasEligible(field)) accepted.push(match);
      else answers.push({ fieldKey: field.field.key, subjectId: field.subjectId, choice: desired, rejects: [] });
    }
  }

  // 4. Shown questions and confirmations left unanswered: skipped (rule 7).
  for (const questionId of request.shown.questions) {
    const question = stepQuestions.find((entry) => entry.id === questionId);
    if (question === undefined || question.kind !== 'question' || isMultiSelect(question)) continue;
    for (const key of question.fieldKeys) {
      const field = byKey(key);
      if (field === undefined || field.field.criticality === 'required') continue;
      if (written.has(fieldRefKey(field.subjectId, field.field.key)) || hasEligible(field) || field.skippedAt.length > 0) continue;
      skip(field);
    }
  }
  for (const candidateId of request.shown.confirmations) {
    if (input.shownConfirmations?.has(candidateId) !== true) continue;
    const field = input.fields.find((entry) => entry.state.candidates.some((candidate) => candidate.candidateId === candidateId && candidate.status === 'eligible'));
    if (field === undefined || !stepKeys.has(field.field.key)) continue;
    skip(field);
  }

  return { answers, acceptedSuggestions: accepted, skips: [...skips.values()], ignoredSuggestions: ignored.size };
}

/** What the API appends for a Continue: candidates, their events, field events and guardrail events (section 8). */
export interface ContinueRecords {
  readonly candidates: readonly Candidate[];
  readonly candidateEvents: readonly CandidateEvent[];
  readonly fieldEvents: readonly FieldEvent[];
  readonly guardrailEvents: readonly GuardrailEvent[];
}

/**
 * The candidates and events a Continue's writes are (2.1, 2.4; rules 3, 4 and 7), for the API to
 * append in one transaction. Pure: the ids and the time come from the caller (UUIDv7 in app code).
 * - An answer is a new `user` candidate by the owner, with `user_confirmed` on an owner or either
 *   field (2.1); an answer that corrects a shown value is the domain's `planOwnerCorrection` (the
 *   shown candidate rejected by the owner, or, when engineer_verified, left for the engineer's
 *   conflict: rule 4, G4-5, G4-19), which also logs `owner_corrected_inference`.
 * - An accepted suggestion is a new `user` candidate by the owner, with no evidence (the owner's
 *   answer never goes when a document does), `user_confirmed` and `accepted_suggestion` whose
 *   reason names what suggested it (rule 3; G3-4).
 * - A skip is a `skipped` field event by the owner, with a `skipped` guardrail event (section 8).
 */
export function continueRecords(input: {
  readonly projectId: string;
  readonly writes: ContinueWrites;
  readonly fields: readonly IntakeField[];
  readonly owner: string;
  readonly at: string;
  readonly newId: () => string;
}): ContinueRecords {
  const { writes, owner, at } = input;
  const byRef = new Map(input.fields.map((field) => [fieldRefKey(field.subjectId, field.field.key), field]));
  const candidates: Candidate[] = [];
  const candidateEvents: CandidateEvent[] = [];
  const fieldEvents: FieldEvent[] = [];
  const guardrailEvents: GuardrailEvent[] = [];
  const fieldOf = (subjectId: string, fieldKey: string): IntakeField => {
    const field = byRef.get(fieldRefKey(subjectId, fieldKey));
    if (field === undefined) throw new Error(`intake: no field ${fieldKey} on ${subjectId}`);
    return field;
  };
  const ownerCandidate = (field: IntakeField, value: { readonly choice?: string; readonly text?: string; readonly original?: OriginalText }): Candidate => ({
    id: input.newId(),
    subjectId: field.subjectId,
    fieldKey: field.field.key,
    ...(value.choice === undefined ? {} : { choice: value.choice }),
    ...(value.text === undefined ? {} : { text: value.text }),
    ...(value.original === undefined ? {} : { original: value.original }),
    source: 'user',
    evidence: [],
    createdBy: owner,
    authorRole: 'owner',
    createdAt: at,
  });
  const confirmsOwn = (field: IntakeField, candidate: Candidate): void => {
    if (field.field.confirmBy !== 'engineer') candidateEvents.push({ candidateId: candidate.id, type: 'user_confirmed', by: owner, role: 'owner', at });
  };
  for (const answer of writes.answers) {
    const field = fieldOf(answer.subjectId, answer.fieldKey);
    const value = {
      ...(answer.choice === undefined ? {} : { choice: answer.choice }),
      ...(answer.text === undefined ? {} : { text: answer.text }),
      ...(answer.original === undefined ? {} : { original: answer.original }),
    };
    const [firstShown, ...otherShown] = answer.rejects.map((id) => field.candidates.find((candidate) => candidate.id === id)).filter((candidate): candidate is Candidate => candidate !== undefined);
    if (firstShown === undefined) {
      const candidate = ownerCandidate(field, value);
      candidates.push(candidate);
      confirmsOwn(field, candidate);
      continue;
    }
    const plan = planOwnerCorrection({ projectId: input.projectId, field: field.field, state: field.state, shown: firstShown, value, candidateId: input.newId(), by: owner, at });
    candidates.push(plan.candidate);
    candidateEvents.push(...plan.candidateEvents);
    guardrailEvents.push(...plan.guardrailEvents);
    for (const shown of otherShown) {
      if (field.state.candidates.find((entry) => entry.candidateId === shown.id)?.verification === 'engineer_verified') continue;
      candidateEvents.push({ candidateId: shown.id, type: 'rejected', by: owner, role: 'owner', at, reason: 'owner_correction' });
    }
  }
  for (const suggestion of writes.acceptedSuggestions) {
    const field = fieldOf(suggestion.subjectId, suggestion.fieldKey);
    const candidate = ownerCandidate(field, { choice: suggestion.choice });
    candidates.push(candidate);
    confirmsOwn(field, candidate);
    candidateEvents.push({ candidateId: candidate.id, type: 'accepted_suggestion', by: owner, role: 'owner', at, reason: suggestion.suggestedBy });
  }
  for (const entry of writes.skips) {
    fieldEvents.push({ subjectId: entry.subjectId, fieldKey: entry.fieldKey, type: 'skipped', by: owner, role: 'owner', at });
    guardrailEvents.push({ type: 'skipped', projectId: input.projectId, subjectId: entry.subjectId, fieldKey: entry.fieldKey });
  }
  return { candidates, candidateEvents, fieldEvents, guardrailEvents };
}
