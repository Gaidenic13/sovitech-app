/**
 * What the wizard and the workspace read from the registry (packages/registry/src/production): the fields each step
 * shows, the step a field's findings belong to (late findings, G7-4), how an owner's answer is taken for a field (the
 * contract's InputSpec), the derive context, the suggestion rules, and the closed gates with what each waits for.
 * Nothing here holds copy: labels are the registry's; wording is the view-model's and the UI catalogue's.
 *
 * The registry seam (phase 4; docs/adr/0044-workspace-api-contract.md decision 4; carried from phase 3's "Waiting":
 * G5-3 through the served view): every reader takes an `ApiRegistry`, which `ApiServices.registry` carries. The entry
 * points (src/index.ts, src/worker-main.ts) pass `PRODUCTION_API_REGISTRY` and nothing else, and no environment
 * variable or config file selects another (`registryOf` reads only the services the entry built). Tests build TEST
 * registries in tests/ (never through the gate-opening test utilities, which stay `tests/proposed/`'s), so the served
 * views can be proven over TEST fields while production behaviour is unchanged.
 */
import { declaredFormulaLookup, derive, type Candidate, type DeriveEvents, type DocumentRecord, type FieldDefinition, type FieldState } from '@sovitech/domain';
import {
  AUTOMATION_FIELDS,
  GOAL_FIELDS,
  SCOPE_FIELDS,
  SYSTEMS,
  productionRegistry,
  registryLookups,
  type RegistryLookups,
} from '@sovitech/registry';
import { GATE_IDS, readGate, type GateId, type GateSource } from '@sovitech/registry/gates';
import type { QuestionDefinition, RegistryBundle, RegistryFieldDefinition } from '@sovitech/registry/validation';
import type { StepNumber } from '@sovitech/view-model/browser';
import { PRODUCTION_SUGGESTION_RULES, STEP_1_FIELDS, STEP_3_FACTS, STEP_5_FIELDS, productionStepOfField, type SuggestionRule } from '@sovitech/view-model/server';

/** The registry the API reads: the bundle, its lookups, the step of each field, and the suggestion rules. */
export interface ApiRegistry {
  readonly bundle: RegistryBundle;
  readonly lookups: RegistryLookups;
  /** Each field by its key. */
  readonly fieldByKey: ReadonlyMap<string, RegistryFieldDefinition>;
  /** The step whose stepper item a field's findings dot, and whose confirmations it counts in (rule 5's budget covers steps 3 to 7). */
  readonly stepOfField: (fieldKey: string) => StepNumber | undefined;
  /** The suggestion rules (rule 3): none in production (PRD R-005, R-006, R-051: no detection field, D-11, D-12). */
  readonly suggestionRules: readonly SuggestionRule[];
}

/**
 * The fields of each step and the step of a production field: the view-model's one step-of-field map
 * (packages/view-model/src/intake/steps.ts; DR-12, phase 6), which the stored proposal's basis reads too. Step 3's
 * registry question is step 8's inline ask; steps 2 and 8 hold no field of their own (the build log's late-findings map
 * for the API).
 */
export { AUTOMATION_FIELDS, GOAL_FIELDS, SCOPE_FIELDS, STEP_1_FIELDS, STEP_3_FACTS, STEP_5_FIELDS, SYSTEMS, productionStepOfField };

/**
 * An `ApiRegistry` over a bundle: the production steps, plus the steps a TEST registry names for its own TEST fields,
 * and the suggestion rules it gives (the production rules, none, by default).
 */
export function apiRegistryOf(
  bundle: RegistryBundle,
  extras: { readonly steps?: ReadonlyMap<string, StepNumber>; readonly suggestionRules?: readonly SuggestionRule[] } = {},
): ApiRegistry {
  const steps = extras.steps ?? new Map<string, StepNumber>();
  return {
    bundle,
    lookups: registryLookups(bundle),
    fieldByKey: new Map(bundle.fields.map((field) => [field.key, field])),
    stepOfField: (fieldKey) => productionStepOfField(fieldKey) ?? steps.get(fieldKey),
    suggestionRules: extras.suggestionRules ?? PRODUCTION_SUGGESTION_RULES,
  };
}

/** The production registry, as the entry points serve it (and the only one they can). */
export const PRODUCTION_API_REGISTRY: ApiRegistry = apiRegistryOf(productionRegistry);

/** The registry a request reads: the services' (the entry points set the production one), else the production one. */
export function registryOf(services: { readonly registry?: ApiRegistry }): ApiRegistry {
  return services.registry ?? PRODUCTION_API_REGISTRY;
}

export function fieldOf(registry: ApiRegistry, key: string): RegistryFieldDefinition | undefined {
  return registry.fieldByKey.get(key);
}

export function questionOf(registry: ApiRegistry, id: string): QuestionDefinition | undefined {
  return registry.bundle.questions.find((question) => question.id === id);
}

/** The registered question that asks for a field, if any (a field of a multi-select belongs to its question). */
export function questionOfField(registry: ApiRegistry, fieldKey: string): QuestionDefinition | undefined {
  return registry.bundle.questions.find((question) => question.kind === 'question' && question.fieldKeys.includes(fieldKey));
}

/** The registered questions of a step, in the order rule 6 gives them: impactRank of their first field. */
export function questionsOfStep(registry: ApiRegistry, step: StepNumber): QuestionDefinition[] {
  const rank = (question: QuestionDefinition): number => Math.min(...question.fieldKeys.map((key) => fieldOf(registry, key)?.impactRank ?? Number.MAX_SAFE_INTEGER));
  return registry.bundle.questions.filter((question) => question.kind === 'question' && question.step === step).sort((a, b) => rank(a) - rank(b));
}

/** The one derive, with the registry's lookups: no dataset is approved, no calculated input is derived before phase 5. */
export function deriveField(
  registry: ApiRegistry,
  field: FieldDefinition,
  subjectId: string,
  candidates: readonly Candidate[],
  events: DeriveEvents,
  documents: readonly DocumentRecord[],
): FieldState {
  const byId = new Map(documents.map((document) => [document.id, document]));
  return derive(field, candidates, events, {
    subjectId,
    document: (documentId) => byId.get(documentId),
    unit: registry.lookups.unit,
    // No calculated or estimated candidate exists before the phase 5 engine; one read as "not known to be active" is stale.
    inputState: () => undefined,
    // The production registry declares no reference dataset (G1-12): no reference candidate is ever eligible.
    datasetApproved: () => false,
    formulaDeclared: declaredFormulaLookup(registry.bundle.formulas),
    stageOrder: registry.lookups.stageOrder,
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
