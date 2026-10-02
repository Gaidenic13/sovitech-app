/**
 * Section 4's defect check on what a step view actually serves (guardrails section 4: "A question asked
 * for something the app already knew is a defect, and is logged as one"; section 8,
 * `question_for_known_field`; GS-1; G5-4).
 *
 * The question engine plans no question for a field with an eligible candidate (planQuestion reads
 * eligibility first), so a check of its own plans can never find one. This detector is independent of the
 * planner: it reads what the served view asks (each question served unanswered or with a "Skip for now"
 * action, and each step 8 inline ask) and the project state's own derived eligibility (the derive
 * function's candidate statuses, 2.4), and logs `question_for_known_field` once per field whenever a
 * served ask names a field that holds an eligible candidate. It never changes the view: the defect is
 * logged, the owner is never blocked (rule 7). The planner's own check (service.ts `logDefects`) stays.
 */
import type { FieldState } from '@sovitech/domain';
import { appendGuardrailEvent, lockProjectWrites, readGuardrailEvents, type Request } from '@sovitech/db';
import type { StepView } from '@sovitech/view-model/browser';
import type { ProjectState } from './project-state';
import { PRODUCTION_API_REGISTRY, questionOf, type ApiRegistry } from './registry';

/** One ask a view serves: the question and the fields it asks for. */
export interface ServedAsk {
  readonly questionId: string;
  readonly fields: readonly { readonly subjectId: string | undefined; readonly fieldKey: string }[];
}

/** A served ask that names a field holding an eligible candidate: a defect. */
export interface KnownFieldAsk {
  readonly questionId: string;
  readonly subjectId: string;
  readonly fieldKey: string;
}

/** The fields of a registered question, with no subject named (the view names none for step 4's systems). */
function registryFields(registry: ApiRegistry, questionId: string): ServedAsk['fields'] {
  return (questionOf(registry, questionId)?.fieldKeys ?? []).map((fieldKey) => ({ subjectId: undefined, fieldKey }));
}

/** Whether a served question asks now: served unanswered, or with its "Skip for now" action. */
function asks(question: { readonly state: string; readonly skip: unknown }): boolean {
  return question.state === 'unanswered' || question.skip !== null;
}

/** What a served step view asks for: its questions served unanswered or with Skip, and step 8's inline asks. */
export function servedAsks(view: StepView, registry: ApiRegistry = PRODUCTION_API_REGISTRY): ServedAsk[] {
  switch (view.step) {
    case 4:
      return asks(view.question) ? [{ questionId: view.question.questionId, fields: registryFields(registry, view.question.questionId) }] : [];
    case 5:
      return view.questions.filter(asks).map((question) => ({ questionId: question.questionId, fields: question.fields }));
    case 6:
    case 7:
      return asks(view.question) ? [{ questionId: view.question.questionId, fields: view.question.fields }] : [];
    case 8:
      return view.proposal.inlineAsks.map((ask) => ({ questionId: ask.questionId, fields: ask.fields }));
    case 1:
    case 2:
    case 3:
      return [];
  }
}

/**
 * The served asks that name a field holding an eligible candidate, once per field, from the view and each
 * field's derived state (not the planner). `fieldState` gives a field's subject and derived state by key.
 */
export function servedAsksForKnownFields(
  view: StepView,
  fieldState: (fieldKey: string) => { readonly subjectId: string; readonly state: FieldState } | undefined,
  registry: ApiRegistry = PRODUCTION_API_REGISTRY,
): KnownFieldAsk[] {
  const found = new Map<string, KnownFieldAsk>();
  for (const ask of servedAsks(view, registry)) {
    for (const field of ask.fields) {
      const derived = fieldState(field.fieldKey);
      if (derived === undefined || (field.subjectId !== undefined && field.subjectId !== derived.subjectId)) continue;
      if (!derived.state.candidates.some((candidate) => candidate.status === 'eligible')) continue;
      const key = `${derived.subjectId} ${field.fieldKey}`;
      if (!found.has(key)) found.set(key, { questionId: ask.questionId, subjectId: derived.subjectId, fieldKey: field.fieldKey });
    }
  }
  return [...found.values()];
}

/**
 * Logs `question_for_known_field` for each served ask of a known field, once per field over the project's
 * stored events (a field already logged is not logged again), in the requesting user's request. Returns the
 * defects found in this view.
 */
export async function logServedAsksForKnownFields(request: Request, state: ProjectState, view: StepView): Promise<KnownFieldAsk[]> {
  const defects = servedAsksForKnownFields(
    view,
    (fieldKey) => {
      const wizardField = state.fields.get(fieldKey);
      return wizardField === undefined ? undefined : { subjectId: wizardField.subjectId, state: wizardField.state };
    },
    state.registry,
  );
  if (defects.length === 0) return defects;
  // Once per field however many views are served together: the project's write lock before the events are read.
  await lockProjectWrites(request);
  const logged = new Set((await readGuardrailEvents(request, 'question_for_known_field')).map((event) => `${event.subjectId ?? ''} ${event.fieldKey ?? ''}`));
  for (const defect of defects) {
    const key = `${defect.subjectId} ${defect.fieldKey}`;
    if (logged.has(key)) continue;
    logged.add(key);
    await appendGuardrailEvent(request, { type: 'question_for_known_field', subjectId: defect.subjectId, fieldKey: defect.fieldKey, reason: 'served_view', actor: state.userId });
  }
  return defects;
}

/** A field a defect names: its subject and its key. */
export interface DefectField {
  readonly subjectId: string;
  readonly fieldKey: string;
}

/**
 * The question engine's defects for a state as planned (service.ts `logDefects`), logged once per field over the
 * project's stored events, in the requesting user's request: `question_for_known_field` (reason `question_engine`)
 * for each question the planner would ask of a known field (section 4), and `confirmation_budget_exceeded` (reason
 * `budget`) for each confirmation over rule 5's budget ("Going over the budget is logged as a defect"; G5-3). A field
 * already logged for that type is not logged again, so reading a view twice logs nothing more.
 */
export async function logPlanDefects(
  request: Request,
  actor: string,
  defects: { readonly knownFieldAsks: readonly DefectField[]; readonly overBudget: readonly DefectField[] },
): Promise<void> {
  const logOnce = async (type: 'question_for_known_field' | 'confirmation_budget_exceeded', reason: string, fields: readonly DefectField[]): Promise<void> => {
    if (fields.length === 0) return;
    // Once per field however many views are served together: the project's write lock before the events are read.
    await lockProjectWrites(request);
    const logged = new Set((await readGuardrailEvents(request, type)).map((event) => `${event.subjectId ?? ''} ${event.fieldKey ?? ''}`));
    for (const field of fields) {
      const key = `${field.subjectId} ${field.fieldKey}`;
      if (logged.has(key)) continue;
      logged.add(key);
      await appendGuardrailEvent(request, { type, subjectId: field.subjectId, fieldKey: field.fieldKey, reason, actor });
    }
  };
  await logOnce('question_for_known_field', 'question_engine', defects.knownFieldAsks);
  await logOnce('confirmation_budget_exceeded', 'budget', defects.overBudget);
}
