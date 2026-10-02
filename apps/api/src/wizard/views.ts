/**
 * The step views of the intake wizard, steps 1 to 8, the "View all extracted data" view (UD-45) and
 * phase 3's proposal page (prompt 3 5.2 "Generate before phase 5"), built from a project's state and
 * the question engine's plan (./plan.ts) as the contract describes them (packages/view-model/src/
 * browser/contract/steps.ts; docs/adr/0036, 0039). Each view names values by value id only; every value,
 * count and line with a number is a display object in the response, made by the one resolver.
 *
 * What the views never do (each with its source): block anyone but step 1's four required fields
 * (rule 7); ask for a known field (rule 5; a slip is logged as `question_for_known_field`, section 4);
 * show a confirmation outside rule 5's test and budget; show "Skip for now" on an answered question or
 * one with a visible suggestion (G7-3); preselect a life-safety system (rule 11) or Access Control or
 * Elevators (R-051 until D-64); show "Detected" or "Optional" (§5-4a); show a success banner (R-045);
 * show a model viewer or an illustrative building (5.2 "No IFC uploaded"); count as searched a document
 * no completed AI run searched (rule 12; G12-8); name a stage other than 2.8's "Indicative range" and
 * "Preliminary investment estimate", or "Formal quotation" without a stored quotation record (rule 10;
 * G10-9, G10-11): the investment outputs and the Proposal card name their stage from stored state.
 */
import { revisionNotice } from '@sovitech/domain';
import { FIELD, SYSTEMS, badgeById } from '@sovitech/registry';
import type { GateId } from '@sovitech/registry/gates';
import type {
  Action,
  ExtractedResponse,
  FieldRef,
  Line,
  OutputAvailability,
  ProjectHeader,
  ProposalPreviewResponse,
  Question,
  QuestionOption,
  StepNumber,
  StepResponse,
  StepView,
  ValueId,
} from '@sovitech/view-model/browser';
import {
  FIRST_ESTIMATE_SLOT_LABELS,
  OUTPUT_STAGE_LABELS,
  documentValueId,
  inlineAsks,
  inputSpecOf,
  lineOf,
  openItems,
  outputAvailability,
  projectValueId,
  proposalStage,
  requestedInlineAsk,
  resolveCount,
  resolveDetection,
  resolveLine,
  resolveOutputLine,
  resolveStageLabel,
  resolveUploadFileName,
  type QuestionPlan,
} from '@sovitech/view-model/server';
import { Displays, FORMAT, documentDisplays, fieldValueId, resolveWizardField } from './displays';
import { confirmationsOnStep, intakeFields, planOf, type WizardPlan } from './plan';
import { fieldIn, stillReadingCount, type ProjectState } from './project-state';
import { AUTOMATION_FIELDS, GOAL_FIELDS, SCOPE_FIELDS, STEP_1_FIELDS, STEP_3_FACTS, fieldOf, questionOf, questionsOfStep } from './registry';

/** An upload in progress of the requesting user, for step 2's rows. */
export interface OpenUpload {
  readonly uploadId: string;
  readonly fileName: string;
}

/** What a step view request asks besides the step (the contract's StepViewQuery). */
export interface StepViewOptions {
  /** Step 8 only: a first-estimate field whose inline ask the owner asked for (`add`; PRD R-012; G7-11). */
  readonly add?: string;
}

export interface ViewContext {
  readonly state: ProjectState;
  readonly plan: WizardPlan;
  readonly displays: Displays;
  /** The closed gates, with the items each waits for. */
  readonly gates: ReadonlyMap<GateId, readonly string[]>;
}

// ---------------------------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------------------------

/** Resolves a field into the response; returns every value id (the field's own first, then its facts). */
function addFieldAndFacts(context: ViewContext, fieldKey: string): ValueId[] {
  return context.displays.addAll(resolveWizardField(context.state, fieldKey, context.plan.confirmationOf.get(fieldKey), context.plan.suggestions));
}

/** Resolves a field into the response; returns its own value id. */
export function addField(context: ViewContext, fieldKey: string): ValueId {
  const [first] = addFieldAndFacts(context, fieldKey);
  if (first === undefined) throw new Error(`the resolver gave no display for ${fieldKey}`);
  return first;
}

/** The shell's header of every screen of a project (R-044, R-139): the name, bound, and the demo line on the demo project only. */
export function projectHeader(context: ViewContext): ProjectHeader {
  const { state } = context;
  const name = addField(context, FIELD.projectName);
  return { projectId: state.projectId, name, isDemo: state.isDemo, demoLine: state.isDemo ? lineOf('demo_data') : null };
}

function fieldRef(context: ViewContext, fieldKey: string): FieldRef {
  const wizardField = fieldIn(context.state, fieldKey);
  return { subjectId: wizardField.subjectId, fieldKey };
}

const projectPath = (context: ViewContext, path: string): ValueId => projectValueId(context.state.projectId, path);

/** "Still reading <n> files. Your estimate will update when they finish." while any document is read (rule 7), else null. */
function stillReading(context: ViewContext): ValueId | null {
  const count = stillReadingCount(context.state);
  if (count === 0) return null;
  return context.displays.add(resolveLine(projectPath(context, 'documents.stillReading'), 'still_reading', { count }, FORMAT));
}

/** The number of files stored, bound (US-DOCS-03 AC8, US-INTAKE-15 AC4). */
function documentCount(context: ViewContext): ValueId {
  return context.displays.add(resolveCount(projectPath(context, 'documents.count'), context.state.activeDocuments.length, 'Documents', FORMAT));
}

/** The skip action of a question, when the engine's plan gives "Skip for now" (rule 7; G7-3). */
function skipAction(questionId: string, plan: QuestionPlan): Action | null {
  return plan.kind === 'ask' && plan.skip ? { kind: 'skip', questionId } : null;
}

/** "You can provide this later." once after a skip (rule 7), else null. */
function afterSkipLine(plan: QuestionPlan): Line | null {
  return (plan.kind === 'ask' && plan.afterSkip) || plan.kind === 'skipped' ? lineOf('provide_later') : null;
}

/** The option key a field's active value selects. */
function chosenKey(context: ViewContext, fieldKey: string): string | undefined {
  const wizardField = fieldIn(context.state, fieldKey);
  return wizardField.candidates.find((candidate) => candidate.id === wizardField.state.activeCandidateId)?.choice;
}

/** Whether the field's value is the owner's own entry. */
function answeredByOwner(context: ViewContext, fieldKey: string): boolean {
  const wizardField = fieldIn(context.state, fieldKey);
  const active = wizardField.candidates.find((candidate) => candidate.id === wizardField.state.activeCandidateId);
  return active?.source === 'user' && active.authorRole === 'owner';
}

// ---------------------------------------------------------------------------------------------
// Questions (steps 4 to 7)
// ---------------------------------------------------------------------------------------------

/** A single-choice question (step 5): its options, the found fact or the owner's answer, and its skip state. */
function singleQuestion(context: ViewContext, questionId: string): Question {
  const question = questionOf(context.state.registry, questionId);
  const fieldKey = question?.fieldKeys[0];
  const field = fieldKey === undefined ? undefined : fieldOf(context.state.registry, fieldKey);
  if (question === undefined || fieldKey === undefined || field === undefined) throw new Error(`no question ${questionId}`);
  const plan = planOf(context.plan, question);
  const valueId = addField(context, fieldKey);
  const stateName = fieldIn(context.state, fieldKey).state.state;
  const hasValue = stateName === 'known' || stateName === 'conflict';
  const answered = answeredByOwner(context, fieldKey);
  const chosen = chosenKey(context, fieldKey);
  const suggestions = context.plan.suggestions.filter((suggestion) => suggestion.fieldKey === fieldKey);
  const options: QuestionOption[] = (field.options ?? []).map((key) => {
    const suggestion = hasValue ? undefined : suggestions.find((entry) => entry.choice === key);
    return {
      key,
      selected: chosen === key || suggestion !== undefined,
      suggestion: suggestion === undefined ? null : { reason: lineOf(suggestion.reasonLineId, suggestion.reasonSlots) },
    };
  });
  return {
    questionId,
    selection: 'single',
    fields: [fieldRef(context, fieldKey)],
    state: answered ? 'answered' : hasValue ? 'found' : plan.kind === 'skipped' ? 'skipped' : 'unanswered',
    options,
    found: hasValue ? valueId : null,
    skip: hasValue ? null : skipAction(questionId, plan),
    afterSkip: hasValue ? null : afterSkipLine(plan),
  };
}

/** A multi-select (steps 4, 6, 7): one decision field per option (2.6), each with its display. */
function multiQuestion(context: ViewContext, questionId: string, positive: string): Question {
  const question = questionOf(context.state.registry, questionId);
  if (question === undefined) throw new Error(`no question ${questionId}`);
  const plan = planOf(context.plan, question);
  const options: QuestionOption[] = question.fieldKeys.map((fieldKey) => {
    const valueId = addField(context, fieldKey);
    const chosen = chosenKey(context, fieldKey);
    const suggestion = chosen === undefined ? context.plan.suggestions.find((entry) => entry.fieldKey === fieldKey && entry.choice === positive) : undefined;
    return {
      key: fieldKey,
      selected: chosen === positive || suggestion !== undefined,
      valueId,
      suggestion: suggestion === undefined ? null : { reason: lineOf(suggestion.reasonLineId, suggestion.reasonSlots) },
    };
  });
  const answered = question.fieldKeys.some((fieldKey) => answeredByOwner(context, fieldKey));
  return {
    questionId,
    selection: 'multi',
    fields: question.fieldKeys.map((fieldKey) => fieldRef(context, fieldKey)),
    state: answered ? 'answered' : plan.kind === 'skipped' ? 'skipped' : 'unanswered',
    options,
    found: null,
    skip: answered ? null : skipAction(questionId, plan),
    afterSkip: answered ? null : afterSkipLine(plan),
  };
}

// ---------------------------------------------------------------------------------------------
// Steps 1 to 7
// ---------------------------------------------------------------------------------------------

function step1(context: ViewContext): StepView {
  const [name, projectType, country, city] = STEP_1_FIELDS.map((key) => addField(context, key));
  if (name === undefined || projectType === undefined || country === undefined || city === undefined) throw new Error('step 1 has four fields');
  return { step: 1, name, projectType, country, city };
}

function step2(context: ViewContext, uploads: readonly OpenUpload[]): StepView {
  const files: Extract<StepView, { step: 2 }>['files'][number][] = [];
  for (const document of context.state.activeDocuments) {
    const resolved = documentDisplays(context.state, document.id);
    // A document being read shows 2.8's pending wording, bound (DR-4); an upload still being sent has no words of its own.
    const status =
      resolved.status !== undefined
        ? ({ kind: 'line', valueId: context.displays.add(resolved.status) } as const)
        : ({ kind: 'progress', ...(resolved.reading === undefined ? {} : { line: context.displays.add(resolved.reading) }) } as const);
    files.push({
      documentId: document.id,
      fileName: context.displays.add(resolved.fileName),
      status,
      stage: context.displays.add(resolved.stage),
      revision: context.displays.add(resolved.revision),
    });
  }
  for (const upload of uploads) {
    files.push({ uploadId: upload.uploadId, fileName: context.displays.add(resolveUploadFileName(upload.uploadId, upload.fileName)), status: { kind: 'progress' }, stage: null, revision: null });
  }
  return { step: 2, files, documentCount: documentCount(context), stillReading: stillReading(context) };
}

/** Whether any step 3 fact has a value read from a document or inferred from one (US-REVIEW-04 AC13). */
function factsFound(context: ViewContext): boolean {
  return STEP_3_FACTS.some((key) => {
    const wizardField = fieldIn(context.state, key);
    const eligible = new Set(wizardField.state.candidates.filter((derived) => derived.status === 'eligible').map((derived) => derived.candidateId));
    return wizardField.candidates.some((candidate) => eligible.has(candidate.id) && (candidate.source === 'document' || candidate.source === 'ai_inference'));
  });
}

/**
 * Step 3's HVAC assets row: while `dataset-asset-taxonomy` is closed, "Not available yet" naming the missing
 * taxonomy (5.4: "counts by type read 'Not available yet'"; rule 7: it names what is missing), with no owner
 * action (a SOVITECH dataset: D-14 interim). The gate names the dataset with its technical flag; the line names
 * it as the owner reads it.
 */
function equipmentRow(context: ViewContext): ValueId {
  if (!context.gates.has('dataset-asset-taxonomy')) throw new Error("the asset taxonomy gate is open: the equipment count is the engine's (phase 5), not built");
  return context.displays.add(
    resolveLine(projectPath(context, 'outputs.equipmentCount'), 'not_available_yet_named', { missing: 'SOVITECH asset taxonomy' }, FORMAT, { missing: 'not_available_yet' }),
  );
}

/** The 2.8 lines of the documents not fully read (US-REVIEW-09 AC3, AC5 to AC7): partly analysed, stored only, failed. */
function notFullyRead(context: ViewContext): ValueId[] {
  const ids: ValueId[] = [];
  for (const document of context.state.activeDocuments) {
    const status = document.analysis.status;
    if (status !== 'partly_analysed' && status !== 'stored_only' && status !== 'failed') continue;
    const resolved = documentDisplays(context.state, document.id);
    context.displays.add(resolved.fileName);
    if (resolved.status !== undefined) ids.push(context.displays.add(resolved.status));
  }
  return ids;
}

/** Step 3's view area (5.2 "No IFC uploaded"; US-REVIEW-04 AC14): no viewer; a stored model's G12-1 line, or "Not available yet" naming the model with the upload action. */
function viewerArea(context: ViewContext): Extract<StepView, { step: 3 }>['viewer'] {
  const models = context.state.activeDocuments.filter((document) => context.state.files.get(document.id)?.format === 'ifc');
  if (models.length > 0) return { state: 'model_stored', line: lineOf('not_analysed', { fileType: 'IFC model' }), addModelOnStep: null };
  return { state: 'no_model', line: lineOf('not_available_yet_named', { missing: 'an IFC model of the building' }), addModelOnStep: 2 };
}

function step3(context: ViewContext): StepView {
  const details = STEP_3_FACTS.flatMap((key) => addFieldAndFacts(context, key));
  const summary = [...STEP_3_FACTS.map((key) => fieldValueId(context.state, key)), equipmentRow(context)];
  const confirmations = confirmationsOnStep(context.plan, 3).length;
  const confirmationCount =
    confirmations === 0 ? null : context.displays.add(resolveLine(projectPath(context, 'confirmations.count'), 'things_for_you', { count: confirmations }, FORMAT));
  const intro = factsFound(context) ? 'values_found' : stillReadingCount(context.state) > 0 ? 'reading' : context.state.activeDocuments.length === 0 ? 'no_documents' : 'none_found';
  return { step: 3, intro, summary, details, confirmationCount, forYouRow: confirmationCount, files: notFullyRead(context), viewer: viewerArea(context) };
}

function step4(context: ViewContext): StepView {
  const question = multiQuestion(context, 'q.project.systemsInScope', 'include');
  const systems = SYSTEMS.map((system) => {
    const fieldKey = SCOPE_FIELDS.find((key) => key === `project.scope.${system.id}`);
    const option = question.options.find((entry) => entry.key === fieldKey);
    if (fieldKey === undefined || option === undefined) throw new Error(`no scope field for ${system.id}`);
    // No detection field is registered (proposal P-3-DETECTION-FIELDS): every detection reads Unknown (US-SCOPE-01 AC8).
    const detection = context.displays.add(
      resolveDetection({ buildingId: context.state.buildingId, systemId: system.id, systemName: system.name, detection: undefined, format: FORMAT }),
    );
    // A life-safety system, and Access Control and Elevators until D-64, is never preselected (rule 11; R-051).
    const never = system.lifeSafety || system.neverPreselected;
    return {
      systemId: system.id,
      lifeSafety: system.lifeSafety,
      neverPreselected: system.neverPreselected,
      detection,
      decision: fieldValueId(context.state, fieldKey),
      selected: never ? chosenKey(context, fieldKey) === 'include' : option.selected,
      suggestion: never ? null : option.suggestion,
    };
  });
  return {
    step: 4,
    // US-SCOPE-01 AC10; DR-25: with no active document nothing was read from documents (rule 12), the predicate step 3's intro uses.
    // `systems_named` waits for the detection fields (P-3-DETECTION-FIELDS).
    subtitle: context.state.activeDocuments.length === 0 ? 'no_documents' : 'none_named',
    question: { questionId: question.questionId, state: question.state === 'found' ? 'answered' : question.state, skip: question.skip, afterSkip: question.afterSkip },
    systems,
  };
}

function step5(context: ViewContext): StepView {
  // Rule 6's impactRank order: the building type, then the schedule, then the occupancy (US-INTAKE-05 AC11).
  return { step: 5, questions: questionsOfStep(context.state.registry, 5).map((question) => singleQuestion(context, question.id)) };
}

function step6(context: ViewContext): StepView {
  return { step: 6, question: multiQuestion(context, 'q.project.goals', 'selected') };
}

function step7(context: ViewContext): StepView {
  return { step: 7, question: multiQuestion(context, 'q.project.automationAreas', 'selected') };
}

// ---------------------------------------------------------------------------------------------
// Step 8, UD-45 and the proposal page
// ---------------------------------------------------------------------------------------------

/**
 * Each output and whether it will be a range or "Not available yet", with its line; an investment output also
 * names its rule 10 stage label (2.8: "Indicative range", "Preliminary investment estimate"; G10-11).
 */
function outputs(context: ViewContext): OutputAvailability[] {
  const fields = intakeFields(context.state);
  return outputAvailability({ fields, closedGates: new Set(context.gates.keys()) }).map((plan) => {
    const line = context.displays.add(resolveOutputLine({ projectId: context.state.projectId, plan, fields, format: FORMAT }));
    const stage = OUTPUT_STAGE_LABELS[plan.output];
    const label = stage === undefined ? undefined : context.displays.add(resolveStageLabel(projectPath(context, `outputs.${plan.output}.label`), stage, FORMAT));
    return { output: plan.output, availability: plan.availability, line, ...(label === undefined ? {} : { label }) };
  });
}

/**
 * The stage the rules give for the investment figure, derived from stored state (US-INTAKE-16 AC2; rule 10; rule 7's
 * `first_estimate` row; G10-11), bound. The Proposal card names it only while the investment output carrying that
 * stage is served as a range (or `proposal.stage` is non-null), and otherwise shows that output's "Not available
 * yet" line, which names every missing item, the SOVITECH datasets and each missing first-estimate input with its
 * "Add <field>" (`outputAvailability`: the stage 2 output waits for the whole first-estimate set; rule 7); the page
 * reads this id to find that output.
 */
function proposalStageLabel(context: ViewContext): ValueId {
  const stage = proposalStage({ fields: intakeFields(context.state), closedGates: new Set(context.gates.keys()) });
  return context.displays.add(resolveStageLabel(projectPath(context, 'proposal.stage'), stage, FORMAT));
}

/**
 * Step 8's inline asks (rule 7; US-INTAKE-17): each first-estimate field still missing, asked once, in rule 7's
 * words; and the one the owner asked for with `add` (the engine's requestedInlineAsk: PRD R-012; G7-11).
 */
function asks(context: ViewContext, add: string | undefined): Extract<StepView, { step: 8 }>['proposal']['inlineAsks'] {
  const planned = [...inlineAsks(intakeFields(context.state), context.state.registry.bundle.settings.firstEstimateSet.members)];
  const requested = add === undefined ? undefined : requestedInlineAsk(intakeFields(context.state), add);
  if (requested !== undefined && !planned.some((ask) => ask.fieldKeys[0] === requested.fieldKeys[0])) {
    const rank = (keys: readonly string[]): number => fieldOf(context.state.registry, keys[0] ?? '')?.impactRank ?? Number.MAX_SAFE_INTEGER;
    planned.push(requested);
    planned.sort((a, b) => rank(a.fieldKeys) - rank(b.fieldKeys));
  }
  return planned.flatMap((ask) => {
    const [firstKey] = ask.fieldKeys;
    const field = firstKey === undefined ? undefined : fieldOf(context.state.registry, firstKey);
    const question = firstKey === undefined ? undefined : context.state.registry.bundle.questions.find((entry) => entry.kind === 'question' && entry.fieldKeys.includes(firstKey));
    const slot = field?.firstEstimateSlot;
    const label = slot === undefined ? undefined : FIRST_ESTIMATE_SLOT_LABELS[slot];
    if (field === undefined || question === undefined || label === undefined) return [];
    return [
      {
        questionId: question.id,
        fields: ask.fieldKeys.map((key) => fieldRef(context, key)),
        ask: lineOf('inline_ask', { field: `the ${label}` }),
        input: ask.fieldKeys.length > 1 ? { kind: 'multi' as const, options: [...ask.fieldKeys] } : inputSpecOf(field),
      },
    ];
  });
}

/** "Site survey needed" (rule 1, "Reuse"; G1-7): an existing building or a BMS modernization with no site survey document. */
function siteSurveyNeeded(state: ProjectState): boolean {
  if (state.projectType !== 'existing_building' && state.projectType !== 'bms_modernization') return false;
  return !state.activeDocuments.some((document) => document.stage === 'site_survey');
}

function reviewLists(context: ViewContext): Pick<Extract<StepView, { step: 8 }>, 'forYou' | 'sovitechWillCheck'> {
  const { state, plan } = context;
  const lists = openItems({
    fields: intakeFields(state),
    confirmationsLeft: plan.confirmations.shown,
    confirmationOverflow: plan.confirmations.overflow,
    // Asset types stay Unknown while `dataset-asset-taxonomy` is closed: each counted asset is an equipment classification for SOVITECH (5.4).
    unverifiedAssetTypes: state.register.countable.length,
    siteSurveyNeeded: siteSurveyNeeded(state),
  });
  const count = lists.forYou.length;
  const forYouCount = count === 0 ? null : context.displays.add(resolveLine(projectPath(context, 'openItems.owner'), 'things_for_you', { count }, FORMAT));
  const items = lists.forYou.slice(0, 3).map((item) => ({ itemId: `${item.reason}:${item.fieldKey}`, reason: item.reason, concerns: addField(context, item.fieldKey) }));
  const more = count > 3 ? context.displays.add(resolveLine(projectPath(context, 'openItems.ownerMore'), 'and_more', { count: count - 3 }, FORMAT)) : null;
  const sovitechWillCheck = lists.engineer.map((group) => {
    if (group.group === 'equipment_classifications') {
      return context.displays.add(resolveLine(projectPath(context, 'openItems.engineer.equipmentClassifications'), 'sovitech_will_check_equipment', { count: group.count }, FORMAT));
    }
    if (group.group === 'site_survey') return context.displays.add(resolveLine(projectPath(context, 'openItems.engineer.siteSurvey'), 'site_survey_needed', {}, FORMAT));
    // The nearest 2.8 form for engineer values (rule 7, "one line per group"): the badge's words and the fields' registered
    // labels, listed for the owner as wording 2.8 does not write (build log, phase 3 "Waiting for approval").
    return context.displays.add({
      valueId: projectPath(context, 'openItems.engineer.engineerValues'),
      kind: 'line',
      text: `${badgeById('sovitech_will_check').label}: ${group.fieldLabels.join(', ')}`,
      shape: 'value',
    });
  });
  return { forYou: { count: forYouCount, items, more }, sovitechWillCheck };
}

/** 2.3, "Changes are announced": one notice per declared revision that changed values ("Rev B changed 3 values"). */
function revisionNotices(context: ViewContext): Extract<StepView, { step: 8 }>['revisionNotices'] {
  const { state } = context;
  const byId = new Map(state.documents.map((document) => [document.id, document]));
  const fields = [...state.fields.values()].map((wizardField) => ({ state: wizardField.state, candidates: wizardField.candidates }));
  const revised = new Set(state.documentEvents.filter((event) => event.type === 'declared_revision_of' && !state.statuses.removed(event.documentId)).map((event) => event.documentId));
  const notices: Extract<StepView, { step: 8 }>['revisionNotices'] = [];
  for (const documentId of revised) {
    const revision = byId.get(documentId);
    if (revision === undefined) continue;
    const notice = revisionNotice(revision, fields, state.documentEvents, (id) => byId.get(id));
    if (notice.changes.length === 0) continue;
    // The revision as written names it; while no classifier reads title blocks (US-DOCS-08), the file name as uploaded.
    const name = revision.revision ?? state.fileName(documentId);
    if (name === undefined) continue;
    const noticeId = context.displays.add(resolveLine(documentValueId(documentId, 'revisionNotice'), 'revision_changed', { revision: name, count: notice.changes.length }, FORMAT));
    const changed = [...new Set(notice.changes.map((change) => change.fieldKey))].filter((key) => state.fields.has(key)).map((key) => addField(context, key));
    notices.push({ notice: noticeId, changed });
  }
  return notices;
}

/**
 * A multi-select's card (systems, goals, automation; US-INTAKE-15): its option rows, the chosen options first,
 * then those not chosen, then those not provided, each group in registry order (V-6); and, when the owner
 * skipped the question, rule 7's "You can provide this later." once for it (G7-12), which no option's own
 * display repeats.
 */
function multiSelectCard(
  context: ViewContext,
  card: { readonly cardId: 'systems' | 'goals' | 'automation'; readonly editStep: StepNumber; readonly questionId: string; readonly fieldKeys: readonly string[]; readonly positive: string },
): Extract<StepView, { step: 8 }>['cards'][number] {
  const group = (fieldKey: string): number => {
    const chosen = chosenKey(context, fieldKey);
    return chosen === card.positive ? 0 : chosen === undefined ? 2 : 1;
  };
  const ordered = card.fieldKeys.map((fieldKey, index) => ({ fieldKey, index, group: group(fieldKey) })).sort((a, b) => a.group - b.group || a.index - b.index);
  const rows = ordered.map((entry) => addField(context, entry.fieldKey));
  const question = questionOf(context.state.registry, card.questionId);
  const skipped = question !== undefined && planOf(context.plan, question).kind === 'skipped';
  return { cardId: card.cardId, editStep: card.editStep, rows, skippedQuestions: skipped ? [{ questionId: card.questionId, line: lineOf('provide_later') }] : [] };
}

function step8(context: ViewContext, add: string | undefined): StepView {
  const cards: Extract<StepView, { step: 8 }>['cards'] = [
    { cardId: 'project', editStep: 1, rows: STEP_1_FIELDS.map((key) => addField(context, key)), skippedQuestions: [] },
    { cardId: 'documents', editStep: 2, rows: [documentCount(context)], skippedQuestions: [] },
    { cardId: 'building', editStep: 3, rows: STEP_3_FACTS.map((key) => addField(context, key)), skippedQuestions: [] },
    multiSelectCard(context, { cardId: 'systems', editStep: 4, questionId: 'q.project.systemsInScope', fieldKeys: SCOPE_FIELDS, positive: 'include' }),
    { cardId: 'operations', editStep: 5, rows: questionsOfStep(context.state.registry, 5).flatMap((question) => question.fieldKeys.map((key) => addField(context, key))), skippedQuestions: [] },
    multiSelectCard(context, { cardId: 'goals', editStep: 6, questionId: 'q.project.goals', fieldKeys: GOAL_FIELDS, positive: 'selected' }),
    multiSelectCard(context, { cardId: 'automation', editStep: 7, questionId: 'q.project.automationAreas', fieldKeys: AUTOMATION_FIELDS, positive: 'selected' }),
  ];
  return {
    step: 8,
    cards,
    // No investment figure can be produced while the dataset gates are closed, so no figure's stage is named (rule 10); the
    // Proposal card names the stage its figure will carry, from stored state (US-INTAKE-16 AC2; G10-11).
    proposal: { stage: null, stageLabel: proposalStageLabel(context), outputs: outputs(context), inlineAsks: asks(context, add) },
    ...reviewLists(context),
    revisionNotices: revisionNotices(context),
    stillReading: stillReading(context),
  };
}

export function stepView(context: ViewContext, step: StepNumber, uploads: readonly OpenUpload[], options: StepViewOptions = {}): StepView {
  switch (step) {
    case 1:
      return step1(context);
    case 2:
      return step2(context, uploads);
    case 3:
      return step3(context);
    case 4:
      return step4(context);
    case 5:
      return step5(context);
    case 6:
      return step6(context);
    case 7:
      return step7(context);
    case 8:
      return step8(context, options.add);
  }
}

export function stepResponse(context: ViewContext, step: StepNumber, uploads: readonly OpenUpload[], options: StepViewOptions = {}): StepResponse {
  const view = stepView(context, step, uploads, options);
  const project = projectHeader(context);
  return { asOf: context.state.asOf, project, displayObjects: context.displays.list(), view };
}

/** UD-45: every fact found about the building, each with Edit, and the confirmations counted in the same budget (US-REVIEW-08). */
export function extractedResponse(context: ViewContext): ExtractedResponse {
  const facts = [...STEP_3_FACTS, FIELD.buildingType].flatMap((key) => addFieldAndFacts(context, key));
  const confirmations = confirmationsOnStep(context.plan, 3).length + confirmationsOnStep(context.plan, 5).length;
  // Its own value id: step 3's pill counts step 3's confirmations only, and one value id carries one display (G2-7).
  const confirmationCount =
    confirmations === 0 ? null : context.displays.add(resolveLine(projectPath(context, 'confirmations.extractedFacts'), 'things_for_you', { count: confirmations }, FORMAT));
  const project = projectHeader(context);
  return { asOf: context.state.asOf, project, displayObjects: context.displays.list(), view: { facts, confirmationCount } };
}

/** Phase 3's proposal page (5.2 "Generate before phase 5", read with PRD 10.4): each output's "Not available yet"; nothing stored. */
export function proposalResponse(context: ViewContext): ProposalPreviewResponse {
  const view = { outputs: outputs(context), stillReading: stillReading(context) };
  const project = projectHeader(context);
  return { asOf: context.state.asOf, project, displayObjects: context.displays.list(), view };
}
