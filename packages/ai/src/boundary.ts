/**
 * The AI boundary: one call path for every task (guardrails section 6, "AI boundary";
 * prompt 3 section 10, phase 2, "The AI boundary"; F-EXTRACT-02, F-EXTRACT-03,
 * F-PROPOSAL-03, F-PROPOSAL-04).
 *
 * In order, for each request:
 * 1. The context is built from one project only (context.ts; rule 13; G13-2).
 * 2. The `ai-processor-route` gate's runtime guard checks every item the request would
 *    send; anything that is not fixture content is refused before the call, and logged
 *    by code and id (guard.ts).
 * 3. The request goes out with the system prompt loaded at run time, the data in delimited
 *    blocks and the structured-output schema (transport.ts).
 * 4. A response naming another model than MODEL_ID is refused (`model_mismatch`); a
 *    refusal, a cut-off or an unreadable output gives nothing.
 * 5. The output validator checks every item (validator/output.ts). What passes becomes a
 *    proposal carrying the model id the API returned and when it arrived, for the evidence
 *    verifier; nothing here decides a source, a confidence or a state.
 *
 * Retries never lead the model (rule 12, "Retries never lead the model"): a whole output
 * that could not be used is asked for again with the identical request; a field whose
 * items were refused is asked for again with the same documents and only the refused
 * fields listed, and no word about what failed. A field refused in both attempts stays
 * unknown, with an `ai_output_rejected` event (`failed_validation_twice`).
 */
import type { CandidateProposal, GuardrailEvent, ProposedEvidence } from '@sovitech/domain';
import { readGate, type GateSource } from '@sovitech/registry/gates';
import {
  buildDraftingContext,
  buildExtractionContext,
  type DraftingContext,
  type DraftingInput,
  type ExtractionContext,
  type ExtractionInput,
  type SentCoverage,
} from './context';
import { checkProcessorRoute, type FixtureManifest, type RouteItem, type RouteRefusal } from './guard';
import { MODEL_ID } from './model';
import type { SystemPrompt } from './prompt';
import type { AiCandidate, AiFinding, AiNote, AiNotFound, DraftingOutput } from './schema';
import type { ModelResponse, ModelTransport, OutputProblem } from './transport';
import {
  validateDraftingOutput,
  validateExtractionOutput,
  type DraftingValidation,
  type DraftingValidationContext,
  type EngineerFlag,
  type ExtractionValidation,
  type ExtractionValidationContext,
  type Rejection,
} from './validator';

/** One log record of the boundary. Codes and ids only, never text (rule 13). */
export interface BoundaryLogRecord {
  readonly event: 'ai_route_refused' | 'ai_output_unusable';
  readonly task: 'extract' | 'draft';
  readonly projectId: string;
  readonly codes: readonly string[];
  readonly documentIds?: readonly string[];
  readonly paths?: readonly string[];
  readonly attempt?: number;
}

export type BoundaryLog = (record: BoundaryLogRecord) => void;

/** The default log: one JSON line on standard error. */
export const stderrLog: BoundaryLog = (record) => {
  process.stderr.write(`${JSON.stringify(record)}\n`);
};

export interface BoundaryDeps {
  readonly transport: ModelTransport;
  /** A production gate source (in the app, the one the start-up check issued). */
  readonly gates: GateSource;
  readonly manifest: FixtureManifest;
  readonly systemPrompt: SystemPrompt;
  /** The repository root (fixture files are re-hashed from it). */
  readonly root: string;
  readonly log?: BoundaryLog;
}

/** A candidate the AI proposed, with the model id that proposed it (build-readiness 3 item 6: "the model id stored with every candidate"). */
export interface AiProposal {
  readonly candidate: AiCandidate;
  /** The model id the API returned for the response that carried it. */
  readonly modelId: string;
  /** When that response arrived. */
  readonly proposedAt: string;
  readonly attempt: number;
}

/** One attempt of a request. */
export interface AttemptRecord {
  readonly attempt: number;
  readonly fieldKeys?: readonly string[];
  readonly modelId?: string;
  readonly receivedAt?: string;
  readonly problem?: OutputProblem | 'model_mismatch';
}

export type ExtractionRun =
  | { readonly outcome: 'refused'; readonly refusals: readonly RouteRefusal[] }
  | {
      readonly outcome: 'failed';
      readonly problem: OutputProblem | 'model_mismatch';
      readonly attempts: readonly AttemptRecord[];
      readonly coverage: readonly SentCoverage[];
      readonly guardrailEvents: readonly GuardrailEvent[];
    }
  | {
      readonly outcome: 'completed';
      readonly modelId: string;
      readonly proposals: readonly AiProposal[];
      readonly notFound: readonly AiNotFound[];
      readonly missingFieldKeys: readonly string[];
      readonly findings: readonly AiFinding[];
      readonly notes: readonly AiNote[];
      readonly rejections: readonly Rejection[];
      readonly engineerFlags: readonly EngineerFlag[];
      readonly guardrailEvents: readonly GuardrailEvent[];
      readonly coverage: readonly SentCoverage[];
      readonly attempts: readonly AttemptRecord[];
      /** Each usable attempt's validation, in order (the eval runner reads the first). */
      readonly validations: readonly ExtractionValidation[];
    };

export type DraftingRun =
  | { readonly outcome: 'refused'; readonly refusals: readonly RouteRefusal[] }
  | {
      readonly outcome: 'failed';
      readonly problem: OutputProblem | 'model_mismatch';
      readonly attempts: readonly AttemptRecord[];
      readonly guardrailEvents: readonly GuardrailEvent[];
    }
  | {
      readonly outcome: 'completed';
      readonly modelId: string;
      readonly draftedAt: string;
      readonly paragraphs: readonly DraftingOutput['paragraphs'][number][];
      readonly notes: readonly AiNote[];
      readonly rejections: readonly Rejection[];
      readonly guardrailEvents: readonly GuardrailEvent[];
      readonly attempts: readonly AttemptRecord[];
      readonly validation: DraftingValidation;
    };

/** A reading of one response: usable with its validation, or why not. */
export type ResponseReading<V> =
  | { readonly usable: true; readonly modelId: string; readonly receivedAt: string; readonly validation: V }
  | { readonly usable: false; readonly problem: OutputProblem | 'model_mismatch'; readonly modelId: string };

export class GateClosedError extends Error {
  override name = 'GateClosedError';
}

/** Reads an extraction response: the model check, then the validator. Pure. */
export function readExtractionResponse(
  response: ModelResponse,
  context: ExtractionValidationContext,
  expectedModelId: string,
): ResponseReading<ExtractionValidation> {
  if (response.model !== expectedModelId) return { usable: false, problem: 'model_mismatch', modelId: response.model };
  if (response.problem !== undefined) return { usable: false, problem: response.problem, modelId: response.model };
  return { usable: true, modelId: response.model, receivedAt: response.receivedAt, validation: validateExtractionOutput(response.output, context) };
}

/** Reads a drafting response: the model check, then the validator. Pure. */
export function readDraftingResponse(
  response: ModelResponse,
  context: DraftingValidationContext,
  expectedModelId: string,
): ResponseReading<DraftingValidation> {
  if (response.model !== expectedModelId) return { usable: false, problem: 'model_mismatch', modelId: response.model };
  if (response.problem !== undefined) return { usable: false, problem: response.problem, modelId: response.model };
  return { usable: true, modelId: response.model, receivedAt: response.receivedAt, validation: validateDraftingOutput(response.output, context) };
}

/** Maps an accepted AI candidate to the domain's proposal, for the evidence verifier, once code has resolved its subject. */
export function toCandidateProposal(proposal: AiProposal, subjectId: string): CandidateProposal {
  const candidate = proposal.candidate;
  const evidence: ProposedEvidence[] = candidate.evidence.map((entry) => ({
    documentId: entry.documentId,
    contentHash: entry.contentHash,
    locator: {
      ...(entry.locator.page === null ? {} : { page: entry.locator.page }),
      ...(entry.locator.sheet === null ? {} : { sheet: entry.locator.sheet }),
      ...(entry.locator.cell === null ? {} : { cell: entry.locator.cell }),
    },
    excerpt: entry.excerpt,
  }));
  const quantityOf = (quantity: { value: number; unit: string; qualifier: string | null; approximate: boolean }) => ({
    value: quantity.value,
    unit: quantity.unit,
    ...(quantity.qualifier === null ? {} : { qualifier: quantity.qualifier }),
    ...(quantity.approximate ? { approximate: true } : {}),
  });
  const value = candidate.value;
  return {
    subjectId,
    fieldKey: candidate.fieldKey,
    ...(value.kind === 'quantity'
      ? { quantity: quantityOf(value.quantity), ...(value.alternatives.length === 0 ? {} : { alternatives: value.alternatives.map(quantityOf) }) }
      : value.kind === 'choice'
        ? { choice: value.choice }
        : { text: value.text }),
    source: candidate.source,
    evidence,
    ...(candidate.original === null
      ? {}
      : { original: candidate.original.locale === null ? { text: candidate.original.text } : { text: candidate.original.text, locale: candidate.original.locale } }),
    ...(candidate.confidence === null ? {} : { confidence: candidate.confidence }),
    // The kind of inference the model names is not passed on (phase 2 review): the verifier then
    // refuses every inferred count cited to excerpts that hold digits, because a sum the model names
    // a direct count would otherwise pass (rule 1). Passing it waits for a check that tells the two
    // apart (proposal P-2-INFERENCE-KIND, build log phase 2).
  };
}

function refusedRun(deps: BoundaryDeps, task: 'extract' | 'draft', projectId: string, refusals: readonly RouteRefusal[]) {
  (deps.log ?? stderrLog)({
    event: 'ai_route_refused',
    task,
    projectId,
    codes: [...new Set(refusals.map((refusal) => refusal.code))],
    documentIds: refusals.flatMap((refusal) => (refusal.documentId === undefined ? [] : [refusal.documentId])),
    paths: refusals.flatMap((refusal) => (refusal.path === undefined ? [] : [refusal.path])),
  });
  return { outcome: 'refused' as const, refusals };
}

function routeCheck(deps: BoundaryDeps, items: readonly RouteItem[], project: { id: string; demo: boolean }) {
  return checkProcessorRoute(items, { gates: deps.gates, manifest: deps.manifest, project, root: deps.root });
}

/** How a run is made, which differs between the app and the eval runner. */
export interface RunPolicy {
  /** Whether a glossary that is not from an open `dataset-glossary` gate may be sent (the eval runner's TEST glossary). */
  readonly testGlossary: boolean;
  /** How many times a request may be sent (1 for evals: each sample is one call). */
  readonly maxAttempts: 1 | 2;
  /**
   * The model id a response must name. MODEL_ID in the app and the eval runner; the
   * transport always sends MODEL_ID, so another value only lets a unit test read a
   * hand-built response that names a TEST model and no real one.
   */
  readonly expectedModelId: string;
  /**
   * Whether a drafting request may name a fixture file as the source of its values (the
   * eval runner, which builds the request from that file). In the app, drafting values
   * always come from a project, and the route guard lets them through for the demo project only.
   */
  readonly fixtureProvenance: boolean;
}

export const APP_POLICY: RunPolicy = Object.freeze({ testGlossary: false, maxAttempts: 2, expectedModelId: MODEL_ID, fixtureProvenance: false });
export const EVAL_POLICY: RunPolicy = Object.freeze({ testGlossary: true, maxAttempts: 1, expectedModelId: MODEL_ID, fixtureProvenance: true });

function assertReferenceGates(input: ExtractionInput, deps: BoundaryDeps, policy: RunPolicy): void {
  if (input.glossary !== undefined && !policy.testGlossary && !readGate(deps.gates, 'dataset-glossary').open) {
    throw new GateClosedError(
      'A glossary was handed to an extraction request while the dataset-glossary gate is closed: abbreviations are not expanded (prompt 3 section 5.4).',
    );
  }
  if (policy.testGlossary && input.glossary !== undefined && !input.glossary.dataset.startsWith('TEST-')) {
    throw new GateClosedError('Only a TEST glossary may be handed to an eval request.');
  }
  if (readGate(deps.gates, 'dataset-sauter-catalogue').open) {
    throw new GateClosedError('The dataset-sauter-catalogue gate reads open, but no approved catalogue loader is built: refusing (fail closed).');
  }
}

function validationContextFor(context: ExtractionContext): ExtractionValidationContext {
  return { projectId: context.projectId, fields: context.fields, documents: context.documents, units: context.units, names: context.names };
}

/** Field keys whose items the validator refused in an attempt. */
function refusedFieldKeys(validation: ExtractionValidation): Set<string> {
  const keys = new Set<string>();
  for (const rejection of validation.rejections) if ('fieldKey' in rejection.item) keys.add(rejection.item.fieldKey);
  return keys;
}

/** Runs an extraction with the given policy. The app uses runExtraction; the eval runner passes its own policy. */
export async function runExtractionWith(input: ExtractionInput, deps: BoundaryDeps, policy: RunPolicy): Promise<ExtractionRun> {
  assertReferenceGates(input, deps, policy);
  const context = buildExtractionContext(input);
  const route = routeCheck(deps, context.routeItems, input.project);
  if (!route.allowed) return refusedRun(deps, 'extract', context.projectId, route.refusals);
  const log = deps.log ?? stderrLog;

  const attempts: AttemptRecord[] = [];
  const guardrailEvents: GuardrailEvent[] = [];
  const send = async (attemptContext: ExtractionContext, attempt: number) => {
    const response = await deps.transport({ system: deps.systemPrompt.text, content: attemptContext.content, output: 'extraction' });
    const reading = readExtractionResponse(response, validationContextFor(attemptContext), policy.expectedModelId);
    const fieldKeys = [...attemptContext.fields.keys()];
    if (!reading.usable) {
      attempts.push({ attempt, fieldKeys, modelId: reading.modelId, problem: reading.problem });
      guardrailEvents.push({ type: 'ai_output_rejected', projectId: context.projectId, reason: reading.problem });
      log({ event: 'ai_output_unusable', task: 'extract', projectId: context.projectId, codes: [reading.problem], attempt });
    } else attempts.push({ attempt, fieldKeys, modelId: reading.modelId, receivedAt: reading.receivedAt });
    return reading;
  };

  let first = await send(context, 1);
  if (!first.usable && policy.maxAttempts > 1) first = await send(context, 2);
  if (!first.usable) {
    return { outcome: 'failed', problem: first.problem, attempts, coverage: context.coverage, guardrailEvents };
  }

  const proposalsOf = (reading: Extract<ResponseReading<ExtractionValidation>, { usable: true }>, attempt: number, keep: (key: string) => boolean) =>
    reading.validation.accepted.candidates
      .filter((candidate) => keep(candidate.fieldKey))
      .map((candidate): AiProposal => ({ candidate, modelId: reading.modelId, proposedAt: reading.receivedAt, attempt }));

  const validations: ExtractionValidation[] = [first.validation];
  const refused = refusedFieldKeys(first.validation);
  const retryKeys = [...refused].filter((key) => context.fields.has(key));
  const firstAttempt = attempts.length;
  const merged = {
    proposals: proposalsOf(first, firstAttempt, () => true),
    notFound: [...first.validation.accepted.notFound],
    missingFieldKeys: [...first.validation.accepted.missingFieldKeys],
    findings: [...first.validation.accepted.findings],
    notes: [...first.validation.accepted.notes],
    rejections: [...first.validation.rejections],
    engineerFlags: [...first.validation.engineerFlags],
  };
  guardrailEvents.push(...first.validation.guardrailEvents);

  if (retryKeys.length > 0 && policy.maxAttempts > 1 && attempts.length < policy.maxAttempts) {
    const narrowed = buildExtractionContext({ ...input, fields: input.fields.filter((field) => retryKeys.includes(field.key)) });
    const second = await send(narrowed, attempts.length + 1);
    const again = second.usable ? refusedFieldKeys(second.validation) : new Set(retryKeys);
    if (second.usable) {
      validations.push(second.validation);
      const retried = new Set(retryKeys);
      merged.proposals.push(...proposalsOf(second, attempts.length, (key) => retried.has(key)));
      merged.notFound.push(...second.validation.accepted.notFound.filter((answer) => retried.has(answer.fieldKey)));
      merged.missingFieldKeys.push(...second.validation.accepted.missingFieldKeys.filter((key) => retried.has(key) && !merged.missingFieldKeys.includes(key)));
      merged.rejections.push(...second.validation.rejections);
      merged.engineerFlags.push(...second.validation.engineerFlags);
      guardrailEvents.push(...second.validation.guardrailEvents);
    }
    for (const key of retryKeys) {
      if (again.has(key)) guardrailEvents.push({ type: 'ai_output_rejected', projectId: context.projectId, fieldKey: key, reason: 'failed_validation_twice' });
    }
  }

  return {
    outcome: 'completed',
    modelId: first.modelId,
    ...merged,
    guardrailEvents,
    coverage: context.coverage,
    attempts,
    validations,
  };
}

/** Runs an extraction in the app. */
export function runExtraction(input: ExtractionInput, deps: BoundaryDeps): Promise<ExtractionRun> {
  return runExtractionWith(input, deps, APP_POLICY);
}

/** Runs a drafting request with the policy's number of attempts (a retry only when the whole output could not be used). */
export async function runDraftingWith(input: DraftingInput, deps: BoundaryDeps, policy: RunPolicy): Promise<DraftingRun> {
  const maxAttempts = policy.maxAttempts;
  if (input.provenance.kind === 'fixture_file' && !policy.fixtureProvenance) {
    throw new GateClosedError('A drafting request named a fixture file as its source outside the eval runner: in the app, drafting values come from a project.');
  }
  if (readGate(deps.gates, 'dataset-sauter-catalogue').open) {
    throw new GateClosedError('The dataset-sauter-catalogue gate reads open, but no approved catalogue loader is built: refusing (fail closed).');
  }
  const context: DraftingContext = buildDraftingContext(input);
  const route = routeCheck(deps, context.routeItems, input.project);
  if (!route.allowed) return refusedRun(deps, 'draft', context.projectId, route.refusals);
  const log = deps.log ?? stderrLog;
  const validationContext: DraftingValidationContext = { projectId: context.projectId, slots: context.slots, tokens: context.tokens, names: context.names };

  const attempts: AttemptRecord[] = [];
  const guardrailEvents: GuardrailEvent[] = [];
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await deps.transport({ system: deps.systemPrompt.text, content: context.content, output: 'drafting' });
    const reading = readDraftingResponse(response, validationContext, policy.expectedModelId);
    if (!reading.usable) {
      attempts.push({ attempt, modelId: reading.modelId, problem: reading.problem });
      guardrailEvents.push({ type: 'ai_output_rejected', projectId: context.projectId, reason: reading.problem });
      log({ event: 'ai_output_unusable', task: 'draft', projectId: context.projectId, codes: [reading.problem], attempt });
      if (attempt === maxAttempts) return { outcome: 'failed', problem: reading.problem, attempts, guardrailEvents };
      continue;
    }
    attempts.push({ attempt, modelId: reading.modelId, receivedAt: reading.receivedAt });
    guardrailEvents.push(...reading.validation.guardrailEvents);
    return {
      outcome: 'completed',
      modelId: reading.modelId,
      draftedAt: reading.receivedAt,
      paragraphs: reading.validation.accepted.paragraphs,
      notes: reading.validation.accepted.notes,
      rejections: reading.validation.rejections,
      guardrailEvents,
      attempts,
      validation: reading.validation,
    };
  }
  throw new RangeError('maxAttempts must be 1 or 2');
}

/** Runs a drafting request in the app. */
export function runDrafting(input: DraftingInput, deps: BoundaryDeps): Promise<DraftingRun> {
  return runDraftingWith(input, deps, APP_POLICY);
}
