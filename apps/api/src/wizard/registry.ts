/**
 * What the wizard reads from the production registry (packages/registry/src/production): the fields
 * each step shows, the step a field's findings belong to (late findings, G7-4), how an owner's answer
 * is taken for a field (the contract's InputSpec), the derive context, and the closed gates with what
 * each waits for. Nothing here holds copy: labels are the registry's; wording is the view-model's and
 * the UI catalogue's.
 */
import { declaredFormulaLookup, derive, type Candidate, type DeriveEvents, type DocumentRecord, type FieldState } from '@sovitech/domain';
import {
  AUTOMATION_FIELDS,
  FIELD,
  GOAL_FIELDS,
  SCOPE_FIELDS,
  SYSTEMS,
  productionRegistry,
  registryLookups,
} from '@sovitech/registry';
import { GATE_IDS, readGate, type GateId, type GateSource } from '@sovitech/registry/gates';
import type { QuestionDefinition, RegistryFieldDefinition } from '@sovitech/registry/validation';
import type { StepNumber } from '@sovitech/view-model/browser';

export const lookups = registryLookups(productionRegistry);

/** Every production field, in registry order. */
export const FIELDS: readonly RegistryFieldDefinition[] = productionRegistry.fields;
export const QUESTIONS: readonly QuestionDefinition[] = productionRegistry.questions;

const FIELD_BY_KEY: ReadonlyMap<string, RegistryFieldDefinition> = new Map(FIELDS.map((field) => [field.key, field]));

export function fieldOf(key: string): RegistryFieldDefinition | undefined {
  return FIELD_BY_KEY.get(key);
}

export function questionOf(id: string): QuestionDefinition | undefined {
  return QUESTIONS.find((question) => question.id === id);
}

/** Step 3's building facts: the gross floor area and the counts rule 8 qualifies (R-045). Its registry question is step 8's inline ask. */
export const STEP_3_FACTS: readonly string[] = [FIELD.grossFloorArea, FIELD.floors, FIELD.rooms, FIELD.zones];
export const STEP_1_FIELDS: readonly string[] = [FIELD.projectName, FIELD.projectType, FIELD.country, FIELD.city];
export const STEP_5_FIELDS: readonly string[] = [FIELD.buildingType, FIELD.operatingSchedule, FIELD.occupancy];
export { AUTOMATION_FIELDS, GOAL_FIELDS, SCOPE_FIELDS, SYSTEMS };

/**
 * The step whose stepper item a field's findings dot, and whose confirmations it counts in (rule 5's
 * budget covers steps 3 to 7): step 1's four answers; step 3's building facts (the gross floor area's
 * question is step 8's inline ask, but its findings belong to step 3, where it is shown); step 4's
 * systems; step 5's building type, schedule and occupancy; step 6's goals; step 7's automation areas.
 * Steps 2 and 8 hold no field of their own (the build log's late-findings map for the API).
 */
export function stepOfField(fieldKey: string): StepNumber | undefined {
  if (STEP_1_FIELDS.includes(fieldKey)) return 1;
  if (STEP_3_FACTS.includes(fieldKey)) return 3;
  if (SCOPE_FIELDS.includes(fieldKey)) return 4;
  if (STEP_5_FIELDS.includes(fieldKey)) return 5;
  if (GOAL_FIELDS.includes(fieldKey)) return 6;
  if (AUTOMATION_FIELDS.includes(fieldKey)) return 7;
  return undefined;
}

/** The registered question that asks for a field, if any (a field of a multi-select belongs to its question). */
export function questionOfField(fieldKey: string): QuestionDefinition | undefined {
  return QUESTIONS.find((question) => question.kind === 'question' && question.fieldKeys.includes(fieldKey));
}

/** The registered questions of a step, in the order rule 6 gives them: impactRank of their first field. */
export function questionsOfStep(step: StepNumber): QuestionDefinition[] {
  const rank = (question: QuestionDefinition): number => Math.min(...question.fieldKeys.map((key) => fieldOf(key)?.impactRank ?? Number.MAX_SAFE_INTEGER));
  return QUESTIONS.filter((question) => question.kind === 'question' && question.step === step).sort((a, b) => rank(a) - rank(b));
}

/** The one derive, with the production registry's lookups: no dataset is approved, no calculated input is derived in phase 3. */
export function deriveField(
  field: RegistryFieldDefinition,
  subjectId: string,
  candidates: readonly Candidate[],
  events: DeriveEvents,
  documents: readonly DocumentRecord[],
): FieldState {
  const byId = new Map(documents.map((document) => [document.id, document]));
  return derive(field, candidates, events, {
    subjectId,
    document: (documentId) => byId.get(documentId),
    unit: lookups.unit,
    // No calculated or estimated candidate exists before the phase 5 engine; one read as "not known to be active" is stale.
    inputState: () => undefined,
    // The production registry declares no reference dataset (G1-12): no reference candidate is ever eligible.
    datasetApproved: () => false,
    formulaDeclared: declaredFormulaLookup(productionRegistry.formulas),
    stageOrder: lookups.stageOrder,
  });
}

/** Every gate that is closed, with the items it waits for (their names, as the gate files write them). */
export function closedGates(gates: GateSource): ReadonlyMap<GateId, readonly string[]> {
  const closed = new Map<GateId, readonly string[]>();
  for (const id of GATE_IDS) {
    const reading = readGate(gates, id);
    if (!reading.open) closed.set(id, reading.waitsFor.map((item) => item.item));
  }
  return closed;
}
