/**
 * Ask, confirm or show (F-QUESTION-01, F-QUESTION-04; guardrails rules 5, 6 and 7, section 4) and
 * step 8's inline asks (F-QUESTION-08; rule 7, `first_estimate`).
 */
import type { QuestionDefinition } from '@sovitech/registry/validation';
import { confirmationCandidateOf, passesConfirmationTest } from './confirmations';
import { hasEligible, PRODUCTION_QUESTIONS, skippedSince, type IntakeField } from './model';

/** What the engine does with one registered question on its step. */
export type QuestionPlan =
  /** Asked: no eligible candidate on its fields, and rule 6 allows it (its condition holds). `skip` is false on required fields (rule 7) and when a visible suggestion stands (G7-3). */
  | { readonly kind: 'ask'; readonly skip: boolean; readonly afterSkip: boolean }
  /** Shown with its badge, source line and Edit; not asked, not an open item (rule 5). */
  | { readonly kind: 'show' }
  /** Shown with a confirmation: rule 5's three-part test passes and the budget has room. */
  | { readonly kind: 'confirm'; readonly candidateId: string }
  /** Already skipped during the intake: not prompted again (rule 7, "Skip means skip"), except step 8's one inline ask for a first-estimate field. */
  | { readonly kind: 'skipped' };

/**
 * Whether the plan shows "Skip for now" under its question (rule 7, "When the link shows": an
 * unanswered, non-required question with no visible suggestion). The view's `skip` action is present
 * exactly when this is true (G7-3).
 */
export function offersSkip(plan: QuestionPlan): boolean {
  return plan.kind === 'ask' && plan.skip;
}

/** The question's own fields, in its registered order. */
function fieldsOf(question: QuestionDefinition, fields: readonly IntakeField[]): IntakeField[] {
  return question.fieldKeys.flatMap((key) => fields.filter((field) => field.field.key === key));
}

/**
 * The plan of one question on its step (F-QUESTION-01, F-QUESTION-04). A plan to ask a field that
 * has an eligible candidate never happens: eligibility is read first, so any field with a value
 * makes the plan `show` (a property in intake.test.ts holds this for any state). The flag
 * `questionForKnownField` is therefore false from this function; the API sets the defect
 * `question_for_known_field` (section 4; GS-1) from `questionsForKnownFields` when a served view
 * would still ask one. Proves G5-1 (the area found with its basis: no question) and G7-3 (an
 * answer or a visible suggestion: no Skip link).
 *
 * - A confirmation (`kind: 'confirmation'`): `confirm` when its field passes rule 5's test and the
 *   candidate is among `shownConfirmations` (the budget's `shown`); `skipped` when the owner declined
 *   or left it after that candidate arrived (rule 7: not prompted again until a new value arrives);
 *   otherwise `show` (nothing to confirm, or over the budget: labelled, for the engineer).
 * - A question: `show` when any of its fields has an eligible candidate (rule 5: the value is shown
 *   with its badge and Edit, and a multi-select the owner answered shows the answer); `skipped` when
 *   the owner skipped it and nothing arrived since; `show` when the field is not applicable (2.4);
 *   otherwise `ask`, with "Skip for now" unless a field is required or a suggestion is visible.
 */
export function planQuestion(input: {
  readonly question: QuestionDefinition;
  readonly fields: readonly IntakeField[];
  readonly shownConfirmations: ReadonlySet<string>;
  readonly visibleSuggestion: boolean;
}): { readonly plan: QuestionPlan; readonly questionForKnownField: boolean } {
  const { question, shownConfirmations, visibleSuggestion } = input;
  const own = fieldsOf(question, input.fields);
  if (question.kind === 'confirmation') {
    const [field] = own;
    const candidate = field !== undefined && passesConfirmationTest(field) ? confirmationCandidateOf(field) : undefined;
    if (field === undefined || candidate === undefined) return { plan: { kind: 'show' }, questionForKnownField: false };
    if (skippedSince(field, candidate.createdAt)) return { plan: { kind: 'skipped' }, questionForKnownField: false };
    if (shownConfirmations.has(candidate.id)) return { plan: { kind: 'confirm', candidateId: candidate.id }, questionForKnownField: false };
    return { plan: { kind: 'show' }, questionForKnownField: false };
  }
  if (own.length === 0) return { plan: { kind: 'show' }, questionForKnownField: false };
  if (own.some(hasEligible)) return { plan: { kind: 'show' }, questionForKnownField: false };
  if (own.some((field) => field.state.state === 'not_applicable')) return { plan: { kind: 'show' }, questionForKnownField: false };
  if (own.some((field) => field.skippedAt.length > 0)) return { plan: { kind: 'skipped' }, questionForKnownField: false };
  const required = own.some((field) => field.field.criticality === 'required');
  return { plan: { kind: 'ask', skip: !required && !visibleSuggestion, afterSkip: false }, questionForKnownField: false };
}

/**
 * Section 4's defect check on what a view is about to ask: the ids of the questions planned `ask`
 * whose fields hold an eligible candidate. The API runs it on every step view it serves and logs
 * `question_for_known_field` for each id (GS-1); from planQuestion's plans it is always empty.
 */
export function questionsForKnownFields(
  plans: ReadonlyMap<string, QuestionPlan>,
  fields: readonly IntakeField[],
  questions: readonly QuestionDefinition[] = PRODUCTION_QUESTIONS,
): string[] {
  const asked: string[] = [];
  for (const [questionId, plan] of plans) {
    if (plan.kind !== 'ask') continue;
    const question = questions.find((entry) => entry.id === questionId);
    if (question !== undefined && fieldsOf(question, fields).some(hasEligible)) asked.push(questionId);
  }
  return asked;
}

/** The step a registered question for a field is asked on before step 8, if one is. */
function askedBeforeStep8(fieldKeys: readonly string[], questions: readonly QuestionDefinition[]): boolean {
  return questions.some((question) => question.kind === 'question' && question.step !== undefined && question.step < 8 && question.fieldKeys.some((key) => fieldKeys.includes(key)));
}

/**
 * The step 8 inline asks (rule 7; US-INTAKE-17): each first-estimate field (the registry's
 * `settings.firstEstimateSet`) with no eligible candidate, asked once; after the owner skips it
 * there ("Generate without it"), not asked again. A field first asked on an earlier step (building
 * type on step 5, the systems on step 4) is asked here while it holds no more than that step's one
 * skip; a field asked only here (the gross floor area) until its first skip. Never a field outside
 * the set (AC6). One ask per first-estimate slot, its fields in impactRank order (the systems in
 * scope are one multi-select).
 */
export function inlineAsks(
  fields: readonly IntakeField[],
  firstEstimateSlots: readonly string[],
  questions: readonly QuestionDefinition[] = PRODUCTION_QUESTIONS,
): readonly { readonly fieldKeys: readonly string[]; readonly subjectId: string }[] {
  const asks: { fieldKeys: string[]; subjectId: string; rank: number }[] = [];
  for (const slot of firstEstimateSlots) {
    const slotFields = fields
      .filter((field) => field.field.criticality === 'first_estimate' && field.field.firstEstimateSlot === slot)
      .sort((a, b) => a.field.impactRank - b.field.impactRank);
    const [first] = slotFields;
    if (first === undefined || slotFields.some(hasEligible)) continue;
    const fieldKeys = slotFields.map((field) => field.field.key);
    const allowedSkips = askedBeforeStep8(fieldKeys, questions) ? 1 : 0;
    const skips = Math.max(...slotFields.map((field) => field.skippedAt.length));
    if (skips > allowedSkips) continue;
    asks.push({ fieldKeys, subjectId: first.subjectId, rank: first.field.impactRank });
  }
  return asks.sort((a, b) => a.rank - b.rank).map(({ fieldKeys, subjectId }) => ({ fieldKeys, subjectId }));
}

/**
 * The step 8 inline ask the owner asked for (PRD R-012 "Until decided": a "Not available yet" action opens
 * "at least the step 8 inline ask for that field"; rule 7, "Not available yet" offers the action; G7-11): the
 * first-estimate slot of `fieldKey`, its fields in impactRank order, when none of them holds an eligible
 * candidate, whatever their skip count. It is the owner's own request, not the app asking again: no skip
 * limit applies, and a field with a value is never asked (rule 5). Undefined for a field outside the
 * first-estimate set, or a slot with a value.
 */
export function requestedInlineAsk(
  fields: readonly IntakeField[],
  fieldKey: string,
): { readonly fieldKeys: readonly string[]; readonly subjectId: string } | undefined {
  const requested = fields.find((field) => field.field.key === fieldKey);
  const slot = requested?.field.criticality === 'first_estimate' ? requested.field.firstEstimateSlot : undefined;
  if (requested === undefined || slot === undefined) return undefined;
  const slotFields = fields
    .filter((field) => field.field.criticality === 'first_estimate' && field.field.firstEstimateSlot === slot)
    .sort((a, b) => a.field.impactRank - b.field.impactRank);
  const [first] = slotFields;
  if (first === undefined || slotFields.some(hasEligible)) return undefined;
  return { fieldKeys: slotFields.map((field) => field.field.key), subjectId: first.subjectId };
}
