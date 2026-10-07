/**
 * The wizard's handlers (phase 3; PRD R-001 to R-004, R-013, R-043 to R-047, R-051; UD-33 to UD-35,
 * UD-45; docs/adr/0036, 0039): the step views, Continue, the owner's field writes, late findings and
 * the proposal page. Every one runs in the requesting user's own request on a project that user may
 * see (another project reads as not found, rule 13); every write needs the owner's role in the project
 * (403 `owner_only`), and the store's guards refuse anything else whatever the API asked (ADR 0013).
 *
 * What each write appends is the question engine's plan (`@sovitech/view-model/server`: planContinue and
 * continueRecords, planConfirmation, planAcknowledge, planConcern, planConflictResolution, planSkip); the
 * API reads the store, calls the planner, appends its records and answers the displays that changed.
 * Writes are appends only (2.4), and the owner's writes of one project run one after the other (the
 * project's write lock, taken before the state is read: `ownerState`). Continue never confirms a fact
 * (rule 3) and is never refused for anything the owner left open (rule 7). Each enforcement leaves its
 * section 8 event: `skipped`, `owner_corrected_inference`, `question_for_known_field` and
 * `confirmation_budget_exceeded` (the last two once per field, under the same lock); and a read that derives a
 * conflict first logs `conflict_raised` once (./conflicts.ts; G4-48).
 */
import { databaseTime, lockProjectWrites, newId, readUserUploadSessions, type Request } from '@sovitech/db';
import type { GateSource } from '@sovitech/registry/gates';
import { FIELD } from '@sovitech/registry';
import {
  REQUIRED_FIELD_NAMES,
  isBlankOwnerText,
  type ContinueRequest,
  type ContinueResponse,
  type DisplayObject,
  type EditRequest,
  type ExtractedResponse,
  type FieldWriteResponse,
  type LateFindingsResponse,
  type ProposalPreviewResponse,
  type StepNumber,
  type StepResponse,
} from '@sovitech/view-model/browser';
import {
  continueRecords,
  findingsOf,
  lateFindings,
  planAcknowledge,
  planConcern,
  planConfirmation,
  planConflictResolution,
  planContinue,
  planSkip,
  projectValueId,
  requestedInlineAsk,
  resolveLine,
} from '@sovitech/view-model/server';
import { servedFileName } from '../documents/file-names';
import { inProject, requireOwner } from '../documents/service';
import { ApiRefusal } from '../errors';
import type { ApiServices } from '../services';
import { namedSubjectDisplays } from '../workspace/naming';
import { appendRecords, ownerValueOf, writeOwnerAnswer } from './answers';
import { Displays, FORMAT, resolveSubjectField, resolveWizardField } from './displays';
import { inlineAskQuestionIds, intakeFields, planProject, type WizardPlan } from './plan';
import { fieldIn, fieldOnSubject, readProjectState, type ProjectState, type WizardField } from './project-state';
import { STEP_1_FIELDS, closedGates, questionOf, registryOf, type ApiRegistry } from './registry';
import { logStateConflicts } from './conflicts';
import { logPlanDefects, logServedAsksForKnownFields } from './defects';
import { extractedResponse, proposalResponse, stepResponse, type StepViewOptions, type ViewContext } from './views';

type Scope = { readonly userId: string; readonly projectId: string };

// ---------------------------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------------------------

/**
 * Logs the question engine's defects for the state as planned (section 8; section 4, "A question asked
 * for something the app already knew is a defect, and is logged as one"; rule 5, "Going over the budget
 * is logged as a defect"), once per field: a question for a known field, and each confirmation over the
 * budget. The writing is defects.ts's `logPlanDefects`, which G5-3 runs over a TEST database.
 */
async function logDefects(request: Request, state: ProjectState, plan: WizardPlan): Promise<void> {
  const knownFieldAsks = plan.questionsForKnownFields.flatMap((questionId) => {
    const key = questionOf(state.registry, questionId)?.fieldKeys[0];
    return key === undefined ? [] : [{ subjectId: fieldIn(state, key).subjectId, fieldKey: key }];
  });
  const overBudget = plan.confirmations.defect
    ? plan.confirmations.overflow.map((entry) => ({ subjectId: fieldIn(state, entry.fieldKey).subjectId, fieldKey: entry.fieldKey }))
    : [];
  await logPlanDefects(request, state.userId, { knownFieldAsks, overBudget });
}

async function viewContext(request: Request, registry: ApiRegistry, gates: GateSource, scope: Scope): Promise<ViewContext> {
  const state = await readProjectState(request, scope, registry);
  const plan = planProject(state);
  await logDefects(request, state, plan);
  // Section 8: a conflict this read derives first is logged once (`conflict_raised`; G4-48).
  await logStateConflicts(request, state);
  return { state, plan, displays: new Displays(), gates: closedGates(gates) };
}

export async function stepView(services: ApiServices, gates: GateSource, scope: Scope, step: StepNumber, options: StepViewOptions = {}): Promise<StepResponse> {
  return inProject(services, scope, async (request) => {
    const context = await viewContext(request, registryOf(services), gates, scope);
    // An upload's name as served (servedFileName); the resolver shows its missing wording when nothing is left.
    const uploads = step === 2 ? (await readUserUploadSessions(request.trx, scope)).map((session) => ({ uploadId: session.id, fileName: servedFileName(session.fileName) ?? '' })) : [];
    const response = stepResponse(context, step, uploads, options);
    // Section 4 on what is served, independent of the planner (G5-4): an ask for a known field is logged once per field.
    await logServedAsksForKnownFields(request, context.state, response.view);
    return response;
  });
}

export async function extractedView(services: ApiServices, gates: GateSource, scope: Scope): Promise<ExtractedResponse> {
  return inProject(services, scope, async (request) => extractedResponse(await viewContext(request, registryOf(services), gates, scope)));
}

export async function proposalView(services: ApiServices, gates: GateSource, scope: Scope): Promise<ProposalPreviewResponse> {
  return inProject(services, scope, async (request) => proposalResponse(await viewContext(request, registryOf(services), gates, scope)));
}

/**
 * The displays of the fields a write touched, as the project now reads, for the write's answer: a project or building
 * field by its key, or a field on another subject (a zone's or an asset's, phase 4) by its subject and key.
 */
async function displaysOf(request: Request, registry: ApiRegistry, scope: Scope, fields: readonly (string | { readonly subjectId: string; readonly fieldKey: string })[]): Promise<DisplayObject[]> {
  const state = await readProjectState(request, scope, registry);
  const plan = planProject(state);
  const displays = new Displays();
  const seen = new Set<string>();
  for (const entry of fields) {
    const key = typeof entry === 'string' ? entry : `${entry.subjectId} ${entry.fieldKey}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (typeof entry === 'string') displays.addAll(resolveWizardField(state, entry, plan.confirmationOf.get(entry), plan.suggestions));
    // A level or zone field is named as the workspace names it (G8-24; G2-7: one display per value id).
    else displays.addAll(namedSubjectDisplays(state, entry.subjectId, entry.fieldKey, resolveSubjectField(state, entry.subjectId, entry.fieldKey)));
  }
  return displays.list();
}

/** What a write touched, as `displaysOf` takes it: the key of a project or building field, else its subject and key. */
function touchedRef(wizardField: WizardField): string | { readonly subjectId: string; readonly fieldKey: string } {
  return wizardField.subjectKind === 'project' || wizardField.subjectKind === 'building' ? wizardField.field.key : { subjectId: wizardField.subjectId, fieldKey: wizardField.field.key };
}

/**
 * A write's stored state, read and planned in the owner's request, under the project's write lock taken
 * before the read: the owner's writes of one project run one after the other, so a write sent together
 * with another (two tabs, a double click) decides on the other's result, as the one-at-a-time path does:
 * a stale answer is refused `shown_value_changed` (rule 4, G4-36) and a repeated skip writes nothing
 * (rule 7, G7-10), nor does a repeated "Looks right" or "Something's wrong" on the same value.
 */
async function ownerState(request: Request, registry: ApiRegistry, scope: Scope): Promise<{ readonly state: ProjectState; readonly plan: WizardPlan; readonly at: string }> {
  await requireOwner(request);
  await lockProjectWrites(request);
  const state = await readProjectState(request, scope, registry);
  return { state, plan: planProject(state), at: await databaseTime(request) };
}

// ---------------------------------------------------------------------------------------------
// Continue
// ---------------------------------------------------------------------------------------------

/** The contract's name of a step 1 field, for `required_fields_missing` (G7-6). */
function requiredName(fieldKey: string): (typeof REQUIRED_FIELD_NAMES)[number] | undefined {
  switch (fieldKey) {
    case FIELD.projectName:
      return 'name';
    case FIELD.projectType:
      return 'projectType';
    case FIELD.country:
      return 'countryCode';
    case FIELD.city:
      return 'city';
    default:
      return undefined;
  }
}

/** A field of the project named by a request: a registered field of the project or the building on its own subject, else 400. */
function requestedField(state: ProjectState, ref: { readonly subjectId: string; readonly fieldKey: string }): WizardField {
  const wizardField = state.fields.get(ref.fieldKey);
  if (wizardField === undefined || wizardField.subjectId !== ref.subjectId) throw new ApiRefusal(400, 'request_invalid');
  return wizardField;
}

/**
 * A field Edit may write (phase 4): a field of the project or the building, or a zone's registered field (UD-09: "each
 * correction is `fields.edit` on the zone's field"; PRD R-061). Never an asset's field: every asset is treated as
 * possibly life-safety, so nothing beyond view, log and documents is offered on it (prompt 3 5.2; ADR 0045 decision
 * 5), and an Edit on one is refused as no field the owner may write (400).
 */
function editableField(state: ProjectState, ref: { readonly subjectId: string; readonly fieldKey: string }): WizardField {
  const wizardField = fieldOnSubject(state, ref.subjectId, ref.fieldKey);
  if (wizardField === undefined || wizardField.subjectKind === 'asset' || wizardField.subjectKind === 'level') throw new ApiRefusal(400, 'request_invalid');
  return wizardField;
}

/** Step 1's required fields left blank in a request (nothing that shows: G7-9), by the contract's names (rule 7; G7-6). */
function blankRequired(state: ProjectState, answers: ContinueRequest['answers']): string[] {
  return answers.flatMap((answer) => {
    const wizardField = state.fields.get(answer.field.fieldKey);
    if (wizardField?.field.criticality !== 'required' || answer.value.kind !== 'text' || !isBlankOwnerText(answer.value.text)) return [];
    const name = requiredName(wizardField.field.key);
    return name === undefined ? [] : [name];
  });
}

export async function continueStep(services: ApiServices, scope: Scope, step: StepNumber, body: ContinueRequest): Promise<ContinueResponse> {
  const registry = registryOf(services);
  return inProject(services, scope, async (request) => {
    const { state, plan, at } = await ownerState(request, registry, scope);
    const blank = blankRequired(state, body.answers);
    if (blank.length > 0) throw new ApiRefusal(422, 'required_fields_missing', undefined, undefined, blank);
    if (step === 1) {
      // Step 1 of a project that exists (US-INTAKE-21 AC2): its four answers are required, never skipped and never
      // suggested, so an answer given on Next is written as an Edit of that field would write it (location's two
      // fields are one registered question, which the engine's Continue reads as a multi-select).
      const touched: string[] = [];
      for (const answer of body.answers) {
        const wizardField = requestedField(state, answer.field);
        if (!STEP_1_FIELDS.includes(wizardField.field.key)) throw new ApiRefusal(400, 'request_invalid');
        const value = ownerValueOf(wizardField.field, answer.value);
        if (await writeOwnerAnswer(request, registry, { projectId: scope.projectId, userId: scope.userId, wizardField, value, corrects: answer.corrects })) touched.push(wizardField.field.key);
      }
      return { nextStep: 2, displayObjects: await displaysOf(request, registry, scope, touched) };
    }
    // Step 1's own checks (project types, country codes, lengths) before the engine reads the answers.
    const answers = body.answers.map((answer) => {
      const wizardField = requestedField(state, answer.field);
      const value = ownerValueOf(wizardField.field, answer.value);
      return value.text === undefined ? answer : { ...answer, value: { kind: 'text' as const, text: value.text } };
    });
    const fields = intakeFields(state);
    const writes = planContinue({ step, fields, suggestions: plan.suggestions, request: { ...body, answers }, shownConfirmations: plan.shownConfirmations, questions: registry.bundle.questions });
    const records = continueRecords({ projectId: scope.projectId, writes, fields, owner: scope.userId, at, newId });
    await appendRecords(request, registry, records, scope.userId, 'continue');
    if (writes.ignoredSuggestions > 0) services.log({ event: 'suggestion_ignored', code: 'not_suggested_now', projectId: scope.projectId });
    const touched = [...writes.answers.map((entry) => entry.fieldKey), ...writes.acceptedSuggestions.map((entry) => entry.fieldKey), ...writes.skips.map((entry) => entry.fieldKey)];
    // PRD R-008 "Until decided": Continue moves to the next step in order; step 8's is Generate (the proposal page).
    const nextStep: ContinueResponse['nextStep'] = step === 8 ? 'proposal' : ((step + 1) as StepNumber);
    return { nextStep, displayObjects: await displaysOf(request, registry, scope, touched) };
  });
}

// ---------------------------------------------------------------------------------------------
// The owner's field writes
// ---------------------------------------------------------------------------------------------

export async function editField(services: ApiServices, scope: Scope, body: EditRequest): Promise<FieldWriteResponse> {
  const registry = registryOf(services);
  return inProject(services, scope, async (request) => {
    const { state } = await ownerState(request, registry, scope);
    const wizardField = editableField(state, body.field);
    if (wizardField.field.criticality === 'required' && body.value.kind === 'text' && isBlankOwnerText(body.value.text)) {
      const name = requiredName(wizardField.field.key);
      throw new ApiRefusal(422, 'required_fields_missing', undefined, undefined, name === undefined ? [] : [name]);
    }
    const value = ownerValueOf(wizardField.field, body.value);
    await writeOwnerAnswer(request, registry, { projectId: scope.projectId, userId: scope.userId, wizardField, value, corrects: body.corrects });
    return { displayObjects: await displaysOf(request, registry, scope, [touchedRef(wizardField)]) };
  });
}

/**
 * The field holding a candidate of the project, on any of its subjects (an asset's values are answered with "Looks
 * right" and "Something's wrong" too, phase 4: R-065), or 404 (another project's candidate reads as none: rule 13).
 */
export function fieldOfCandidate(state: ProjectState, candidateId: string): WizardField {
  for (const wizardField of [...state.fields.values(), ...state.subjectFields.values()]) {
    if (wizardField.candidates.some((candidate) => candidate.id === candidateId)) return wizardField;
  }
  throw new ApiRefusal(404, 'not_found');
}

/** "Yes" on a confirmation rule 5's test and budget show now (never an engineer field: rule 3). */
export async function confirmField(services: ApiServices, scope: Scope, candidateId: string): Promise<FieldWriteResponse> {
  const registry = registryOf(services);
  return inProject(services, scope, async (request) => {
    const { state, plan, at } = await ownerState(request, registry, scope);
    const wizardField = fieldOfCandidate(state, candidateId);
    const event = planConfirmation({ fields: intakeFields(state), candidateId, shownConfirmations: plan.shownConfirmations, by: scope.userId, at });
    await appendRecords(request, registry, { candidateEvents: [event] }, scope.userId, 'confirm');
    return { displayObjects: await displaysOf(request, registry, scope, [touchedRef(wizardField)]) };
  });
}

/**
 * "Looks right" (rule 3; G3-3): `owner_acknowledged` on each item, one bulk; it never clears Provisional and never
 * raises the badge. An item the owner already acknowledged records nothing again (planAcknowledge reads the stored
 * events under the project's write lock): sent twice, from a stale tab or at once, it answers 200 and appends one
 * event, as a repeated skip does.
 */
export async function acknowledgeItems(services: ApiServices, scope: Scope, candidateIds: readonly string[]): Promise<FieldWriteResponse> {
  const registry = registryOf(services);
  return inProject(services, scope, async (request) => {
    const { state, at } = await ownerState(request, registry, scope);
    const named = candidateIds.map((id) => fieldOfCandidate(state, id));
    const prior = [...new Set(named)].flatMap((wizardField) => wizardField.candidateEvents);
    const events = planAcknowledge({ fields: [...intakeFields(state), ...[...state.subjectFields.values()].map((entry) => entry.intake)], candidateIds, by: scope.userId, at, prior });
    const bulkId = events.length > 1 ? newId() : undefined;
    await appendRecords(request, registry, { candidateEvents: events.map((event) => ({ ...event, reason: 'looks_right', ...(bulkId === undefined ? {} : { bulkId }) })) }, scope.userId, 'acknowledge');
    return { displayObjects: await displaysOf(request, registry, scope, named.map(touchedRef)) };
  });
}

/**
 * "Something's wrong" (rule 3; G3-10): the owner's rejection with no value of their own, which leaves the value and
 * lists it for the engineer. On a value the owner already rejected it records nothing again (planConcern reads the
 * stored events under the project's write lock): sent twice, it answers 200 and appends one event.
 */
export async function raiseConcern(services: ApiServices, scope: Scope, candidateId: string): Promise<FieldWriteResponse> {
  const registry = registryOf(services);
  return inProject(services, scope, async (request) => {
    const { state, at } = await ownerState(request, registry, scope);
    const wizardField = fieldOfCandidate(state, candidateId);
    const event = planConcern({ fields: [wizardField.intake], candidateId, by: scope.userId, at, prior: wizardField.candidateEvents });
    await appendRecords(request, registry, { candidateEvents: event === null ? [] : [event] }, scope.userId, 'concern');
    return { displayObjects: await displaysOf(request, registry, scope, [touchedRef(wizardField)]) };
  });
}

/** The owner's choice on a conflict routed to the owner (rule 4; US-REVIEW-11): who, when, why and the candidates it covered. */
export async function resolveConflict(
  services: ApiServices,
  scope: Scope,
  body: { readonly field: { readonly subjectId: string; readonly fieldKey: string }; readonly chosenCandidateId: string },
): Promise<FieldWriteResponse> {
  const registry = registryOf(services);
  return inProject(services, scope, async (request) => {
    const { state, at } = await ownerState(request, registry, scope);
    const wizardField = requestedField(state, body.field);
    const event = planConflictResolution({ field: wizardField.intake, chosenCandidateId: body.chosenCandidateId, by: scope.userId, at });
    await appendRecords(request, registry, { fieldEvents: [event] }, scope.userId, 'resolve');
    return { displayObjects: await displaysOf(request, registry, scope, [wizardField.field.key]) };
  });
}

/**
 * "Skip for now" and step 8's "Generate without it" (rule 7): `skipped` on the question's fields; never on a
 * required field or an answered question; only where the question is asked now, and a repeat writes nothing
 * (G7-10; the engine's planSkip with the question's plan, step 8's inline asks and the step the page names).
 */
export async function skipQuestion(services: ApiServices, scope: Scope, body: { readonly questionId: string; readonly step: StepNumber }): Promise<FieldWriteResponse> {
  const registry = registryOf(services);
  return inProject(services, scope, async (request) => {
    const question = questionOf(registry, body.questionId);
    if (question === undefined || question.kind !== 'question') throw new ApiRefusal(400, 'request_invalid');
    const { state, plan, at } = await ownerState(request, registry, scope);
    const fields = intakeFields(state);
    const [firstKey] = question.fieldKeys;
    const events = planSkip({
      question,
      fields,
      by: scope.userId,
      at,
      context: {
        step: body.step,
        plan: plan.questions.get(question.id),
        inlineAskNow: inlineAskQuestionIds(state).includes(question.id),
        // The ask step 8 serves on the owner's own "Add" (PRD R-012; G7-11): its "Generate without it" is a skip there too.
        requestedAskNow: firstKey !== undefined && requestedInlineAsk(fields, firstKey) !== undefined,
      },
    });
    const guardrail = events.map((event) => ({ type: 'skipped' as const, projectId: scope.projectId, subjectId: event.subjectId, fieldKey: event.fieldKey, reason: event.reason ?? 'skip_for_now' }));
    await appendRecords(request, registry, { fieldEvents: events, guardrailEvents: guardrail }, scope.userId, 'skip_for_now');
    return { displayObjects: await displaysOf(request, registry, scope, question.fieldKeys) };
  });
}

// ---------------------------------------------------------------------------------------------
// Late findings (rule 7, "Late findings never interrupt"; G7-4; docs/adr/0039 decision 3)
// ---------------------------------------------------------------------------------------------

export interface LateFindingsQuery {
  readonly current: StepNumber;
  readonly since: string | undefined;
  readonly left: ReadonlyMap<StepNumber, string>;
}

/**
 * The dots and the one quiet notice, from stored state only (the engine's findingsOf and lateFindings):
 * no dialog, no move, no changed answer; the findings join step 8's lists through the field states.
 */
export async function lateFindingsView(services: ApiServices, scope: Scope, query: LateFindingsQuery): Promise<LateFindingsResponse> {
  return inProject(services, scope, async (request) => {
    const state = await readProjectState(request, scope, registryOf(services));
    const found = lateFindings({ left: query.left, current: query.current, since: query.since, findings: findingsOf(intakeFields(state)) });
    const displays = new Displays();
    const notice =
      found.noticeCount > 0 ? displays.add(resolveLine(projectValueId(scope.projectId, 'lateFindings.notice'), 'late_findings_notice', { count: found.noticeCount }, FORMAT)) : null;
    return { asOf: state.asOf, displayObjects: displays.list(), dots: [...found.dots], notice };
  });
}
