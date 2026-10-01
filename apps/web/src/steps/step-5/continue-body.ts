/**
 * What Continue sends for the questions of steps 5 to 7 (actions.ts `ContinueRequest`; guardrails
 * rules 3, 4 and 7; PRD R-002, R-005, R-006; docs/adr/0039-wizard-navigation-saving-and-late-findings.md).
 * Pure functions over the served questions and what the owner chose on the page, so the steps and
 * their tests read the same rules:
 *
 * - **A single choice** (step 5): an option the owner picked that differs from what the page showed
 *   is an answer. When the page showed a found or answered value, the answer names the candidates the
 *   page showed as `corrects` (from the value's served Edit action), so the owner's choice is a
 *   correction that rejects what they saw, never a conflict or a second question (rule 4, "A
 *   correction is a resolution"; US-INTAKE-07 AC6; G4-5). Nothing is sent for an unchanged answer.
 * - **A visible suggestion left in place** is reported as `visibleSuggestions`; the server accepts
 *   it only if it suggests the same choice now (rule 3; G3-4). A suggestion the owner changed is an
 *   answer instead.
 * - **A multi-select** (steps 6 and 7) is sent whole, as the options ticked on the page; the server
 *   reads it as one question: with none ticked and none visibly suggested, it records a skip, never a
 *   decision against every option (rule 7; US-INTAKE-09 AC3, US-INTAKE-10 AC3; G7-8).
 * - **Shown questions** (unanswered or skipped) are listed, so the ones left unanswered are skipped
 *   (rule 7, "Continue counts as skipping"); a found fact is not a question and is not listed.
 * - **Shown confirmations** ("Yes, it's a hotel") the owner neither pressed nor changed are listed, so
 *   the declined confirmation is not prompted again during the intake (rule 7, "Skip means skip").
 *   Continue never confirms a fact (rule 3).
 */
import type { Action, ContinueRequest, DisplayObject, FieldRef, Question } from '@sovitech/view-model/browser';

type EditAction = Extract<Action, { kind: 'edit' }>;
type ConfirmAction = Extract<Action, { kind: 'confirm' }>;
type Displays = ReadonlyMap<string, DisplayObject>;

/** The served Edit action of a display, if it has one. */
export function editActionOf(display: DisplayObject | undefined): EditAction | undefined {
  return display?.actions?.find((action): action is EditAction => action.kind === 'edit');
}

/** The served confirmation of a display ("Yes, it's a hotel"; rule 5), if rule 5's test and budget show one. */
export function confirmActionOf(display: DisplayObject | undefined): ConfirmAction | undefined {
  return display?.actions?.find((action): action is ConfirmAction => action.kind === 'confirm');
}

/** The option the page shows as chosen: the owner's stored answer, a found value, or a visible suggestion. */
export function servedChoice(question: Question): string | undefined {
  return question.options.find((option) => option.selected)?.key;
}

/** The option chosen on screen now: the owner's pick on this page, else the served one. */
export function shownChoice(question: Question, picked: string | undefined): string | undefined {
  return picked ?? servedChoice(question);
}

/** Whether a single-choice question showed a value the owner did not pick on this page (a found fact or their earlier answer). */
function showsValue(question: Question): boolean {
  return question.state === 'found' || question.state === 'answered';
}

/**
 * Continue for single-choice questions (step 5). `picked` holds the owner's picks on this page, by
 * question id.
 */
export function singleChoiceContinue(questions: readonly Question[], picked: Readonly<Record<string, string | undefined>>, displays: Displays): ContinueRequest {
  const body: { answers: ContinueRequest['answers']; visibleSuggestions: ContinueRequest['visibleSuggestions']; questions: string[]; confirmations: string[] } = {
    answers: [],
    visibleSuggestions: [],
    questions: [],
    confirmations: [],
  };
  for (const question of questions) {
    const [field] = question.fields;
    if (field === undefined || question.selection !== 'single') continue;
    const served = servedChoice(question);
    const chosen = shownChoice(question, picked[question.questionId]);
    const found = question.found === null ? undefined : displays.get(question.found);
    if (showsValue(question)) {
      if (chosen !== undefined && chosen !== served) {
        body.answers.push({ field, value: { kind: 'choice', choice: chosen }, corrects: [...(editActionOf(found)?.shownCandidateIds ?? [])] });
        continue;
      }
      const confirm = confirmActionOf(found);
      if (confirm !== undefined) body.confirmations.push(confirm.candidateId);
      continue;
    }
    body.questions.push(question.questionId);
    if (chosen === undefined) continue;
    const suggested = question.options.find((option) => option.key === chosen && option.suggestion !== null && option.selected);
    if (suggested !== undefined) body.visibleSuggestions.push({ field, choice: chosen });
    else body.answers.push({ field, value: { kind: 'choice', choice: chosen }, corrects: [] });
  }
  return { answers: body.answers, multi: [], visibleSuggestions: body.visibleSuggestions, shown: { questions: body.questions, confirmations: body.confirmations } };
}

/**
 * The option a decision field of a goal or automation area records when it is ticked (the registry
 * catalogue's SELECTION_OPTIONS, "selected"), the choice a visible suggestion of steps 6 and 7 carries.
 */
export const SELECTED_CHOICE = 'selected';

/** The field of a multi-select option (its decision field). */
export function fieldOfOption(question: Question, optionKey: string): FieldRef | undefined {
  return question.fields.find((field) => field.fieldKey === optionKey);
}

/** The options ticked on the page before the owner changes anything: the stored decisions and the visible suggestions. */
export function servedTicks(question: Question): ReadonlySet<string> {
  return new Set(question.options.filter((option) => option.selected).map((option) => option.key));
}

/**
 * Continue for one multi-select (steps 6 and 7): the options ticked on the page, the visible
 * suggestions still ticked, and the question as shown.
 */
export function multiChoiceContinue(question: Question, ticked: ReadonlySet<string>): ContinueRequest {
  const visibleSuggestions = question.options.flatMap((option) => {
    const field = fieldOfOption(question, option.key);
    return option.suggestion !== null && option.selected && ticked.has(option.key) && field !== undefined ? [{ field, choice: SELECTED_CHOICE }] : [];
  });
  return {
    answers: [],
    multi: [{ questionId: question.questionId, ticked: question.options.filter((option) => ticked.has(option.key)).map((option) => option.key) }],
    visibleSuggestions,
    shown: { questions: [question.questionId], confirmations: [] },
  };
}
