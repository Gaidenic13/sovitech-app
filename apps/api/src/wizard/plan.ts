/**
 * What the question engine decides for a project as it stands (guardrails rules 3, 5, 6 and 7, section
 * 4; F-QUESTION-01 to F-QUESTION-10): which confirmations steps 3 to 7 show within rule 5's budget, how
 * each registered question and confirmation is shown (asked with or without "Skip for now", shown,
 * confirmed, skipped), which visible suggestions stand, and which questions would ask for a known field
 * (a defect, section 4). Every decision is the view-model's intake engine's; this module only feeds it
 * the project's derived fields and collects its answers for the views and the writes.
 */
import type { QuestionDefinition } from '@sovitech/registry/validation';
import { productionRegistry } from '@sovitech/registry';
import type { StepNumber } from '@sovitech/view-model/browser';
import {
  PRODUCTION_QUESTIONS,
  PRODUCTION_SUGGESTION_RULES,
  confirmationCandidates,
  inlineAsks,
  planQuestion,
  questionsForKnownFields,
  selectConfirmations,
  skippedSince,
  suggestionsFor,
  type ConfirmationCandidate,
  type IntakeField,
  type QuestionPlan,
  type Suggestion,
  type SuggestionRule,
} from '@sovitech/view-model/server';
import type { ProjectState } from './project-state';
import { stepOfField } from './registry';

export interface WizardPlan {
  /** Rule 5's budget over steps 3 to 7: the confirmations shown (by impactRank) and those over the budget. */
  readonly confirmations: {
    readonly shown: readonly ConfirmationCandidate[];
    readonly overflow: readonly ConfirmationCandidate[];
    readonly defect: boolean;
  };
  /** The candidate each field's shown confirmation names, by field key. */
  readonly confirmationOf: ReadonlyMap<string, string>;
  /** The shown confirmations' candidate ids (what the engine's planners read). */
  readonly shownConfirmations: ReadonlySet<string>;
  /** Each registered question's and confirmation's plan, by id. */
  readonly questions: ReadonlyMap<string, QuestionPlan>;
  /** The questions a view would ask although a field of theirs holds a value: a defect (section 4; GS-1). */
  readonly questionsForKnownFields: readonly string[];
  /** The visible suggestions that stand now (rule 3): none until D-11, D-12 and a detection field (PRD R-005, R-006, R-051). */
  readonly suggestions: readonly Suggestion[];
}

/** The intake fields the engine reads, every production field of the project and its building. */
export function intakeFields(state: ProjectState): IntakeField[] {
  return [...state.fields.values()].map((wizardField) => wizardField.intake);
}

/** Plans the project with the given suggestion rules (the production rules; a TEST rule only in a test that proves the mechanism). */
export function planProject(state: ProjectState, rules: readonly SuggestionRule[] = PRODUCTION_SUGGESTION_RULES): WizardPlan {
  const fields = intakeFields(state);
  // A confirmation the owner declined (left on Continue after its value arrived) is not prompted again during the
  // intake (rule 7, "Skip means skip"), so it takes no place in the budget.
  const candidates = confirmationCandidates(fields, (field) => stepOfField(field.field.key) ?? null).filter((entry) => {
    const field = fields.find((item) => item.field.key === entry.fieldKey);
    const candidate = field?.candidates.find((item) => item.id === entry.candidateId);
    return field !== undefined && candidate !== undefined && !skippedSince(field, candidate.createdAt);
  });
  const confirmations = selectConfirmations(candidates, productionRegistry.settings.confirmationBudget.value);
  const confirmationOf = new Map(confirmations.shown.map((entry) => [entry.fieldKey, entry.candidateId]));
  const shownConfirmations = new Set(confirmations.shown.map((entry) => entry.candidateId));

  const suggestions = suggestionsFor(fields, rules);
  const questions = new Map<string, QuestionPlan>();
  for (const question of PRODUCTION_QUESTIONS) {
    const questionFields = fields.filter((field) => question.fieldKeys.includes(field.field.key));
    if (questionFields.length === 0) continue;
    const visibleSuggestion = suggestions.some((suggestion) => question.fieldKeys.includes(suggestion.fieldKey));
    questions.set(question.id, planQuestion({ question, fields: questionFields, shownConfirmations, visibleSuggestion }).plan);
  }
  return {
    confirmations,
    confirmationOf,
    shownConfirmations,
    questions,
    questionsForKnownFields: questionsForKnownFields(questions, fields),
    suggestions,
  };
}

/** A question's plan, which every registered question of the project has. */
export function planOf(plan: WizardPlan, question: QuestionDefinition): QuestionPlan {
  const found = plan.questions.get(question.id);
  if (found === undefined) throw new Error(`no plan for ${question.id}`);
  return found;
}

/**
 * The registered questions whose step 8 inline ask the review serves now (rule 7; US-INTAKE-17): the engine's
 * inlineAsks over the registry's first-estimate set, each named by the question that asks for its first field.
 */
export function inlineAskQuestionIds(state: ProjectState): string[] {
  const asks = inlineAsks(intakeFields(state), productionRegistry.settings.firstEstimateSet.members);
  return asks.flatMap((ask) => {
    const [firstKey] = ask.fieldKeys;
    const question = firstKey === undefined ? undefined : PRODUCTION_QUESTIONS.find((entry) => entry.kind === 'question' && entry.fieldKeys.includes(firstKey));
    return question === undefined ? [] : [question.id];
  });
}

/** The confirmations shown on one step. */
export function confirmationsOnStep(plan: WizardPlan, step: StepNumber): readonly ConfirmationCandidate[] {
  return plan.confirmations.shown.filter((entry) => entry.step === step);
}
