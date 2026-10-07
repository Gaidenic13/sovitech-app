/**
 * The phase 5 services (docs/adr/0048, 0049, 0050): Generate, the stored proposal and its versions, the print view,
 * the export record and its PDF, Reports, and the Equipment register's CSV. Each runs in the requesting user's own
 * request on a project that user may see (row-level security: another project reads as not found, rule 13), reads the
 * project state the wizard and the workspace read (one derive, one resolver: G2-7), and answers the contract's
 * envelope with the project header (the demo line from the project's flag only, rule 10).
 *
 * Rules kept here (each cites its source; the ADRs say more):
 * - **Generate**: the owner check, then the project's write lock (`lockProjectWrites`; ADR 0036 decision 13), then the
 *   read; the engine runs over the derived state (`runEngine` with the services' catalogue, the production one in the
 *   app; the closed gates from `readGate`; datasets only as loaded, approved ones: none today); any candidate it produced
 *   is written as the system's service account (2.1: the engine only; ./engine.ts), under the project's write lock,
 *   superseding every earlier engine value of its field read there (G4-47); the snapshot is recorded (2.4) with
 *   its outputs, its pending documents and its inputs hash; nothing else is written: no owner answer, no skip, no
 *   accepted suggestion (rule 3; US-PROPOSAL-01 AC3; G3-23). Drafting (R-115) runs only where a drafting service is set
 *   (no key: none) and the `ai-processor-route` guard allows it (the demo's values only): its accepted paragraphs are
 *   stored with the snapshot; a refusal or failure stores none and never fails Generate (rule 7).
 * - **Regeneration** (`regenerateAfterAnalysis`, called when an analysis job ends): when every document the latest
 *   snapshot recorded as still being read has finished, a new version is generated as the system (US-PROPOSAL-11 AC6;
 *   rule 7 "Your estimate will update when they finish"); nothing else regenerates (prompt 3 5.2 "After Generate").
 * - **Reads**: the stored snapshot only, never newer values in its figures (US-PROPOSAL-03 AC3); the engine's
 *   `snapshotChanges` and `quotationStanding` for "Out of date, recalculating" and "Superseded" (2.4; rule 10); the
 *   stage from `priceStageOf` (rule 10); the open items from the current state, as step 8 plans them (rule 7).
 * - **Exports**: a generated output is recorded per export (who started it, when, which snapshot); the PDF is printed
 *   from the web's print route of that snapshot each time it is downloaded (ADR 0050), so erasure reaches every later
 *   download (rule 13; G13-12); no export file is stored.
 * - No document text, excerpt or file name in a log (rule 13): codes and ids only.
 */
import {
  databaseTime,
  lockProjectWrites,
  newId,
  readCandidates,
  readGeneratedOutputs,
  readProposalSnapshot,
  readProposalVersions,
  readQuotationRecords,
  readVisibleAccounts,
  recordGeneratedOutput,
  recordGeneratedProposal,
  withRequest,
  type GeneratedProposalWrite,
  type ParagraphWrite,
  type Request,
  type StoredProposal,
  type StoredQuotationRecordRow,
} from '@sovitech/db';
import type { DraftingInput, TokenForAi } from '@sovitech/ai';
import {
  headlineOutputOf,
  priceStageOf,
  quotationStanding,
  runEngine,
  snapshotChanges,
  snapshotRecordOf,
  type CurrentInputs,
  type EngineRun,
  type PriceStageReading,
  type QuotationStanding,
  type SnapshotChanges,
  type SnapshotOutputRow,
  type StoredQuotationRecord,
  type StoredSnapshot,
} from '@sovitech/engine';
import { OUTPUT, SYSTEMS } from '@sovitech/registry';
import type { GateSource } from '@sovitech/registry/gates';
import type {
  DisplayObject,
  EquipmentExportQuery,
  ExportResponse,
  GenerateResponse,
  ProjectHeader,
  ProposalPrintResponse,
  ProposalResponse,
  ProposalVersionsResponse,
  ReportsQuery,
  ReportsResponse,
} from '@sovitech/view-model/browser';
import {
  EXPORT_FILE_NAMES,
  OUTPUT_LABELS,
  badgeOf,
  equipmentCsv,
  hasEligible,
  lineOf,
  proposalPrintView as buildPrintView,
  proposalView as buildProposalView,
  reportsView as buildReportsView,
  versionsView as buildVersionsView,
  type Built,
  type GeneratedOutput,
  type ProposalBuildInput,
  type ProposalField,
} from '@sovitech/view-model/server';
import { inProject, requireOwner } from '../documents/service';
import { ApiRefusal, notFound } from '../errors';
import type { ApiServices } from '../services';
import { Displays, askedOf } from '../wizard/displays';
import { planProject } from '../wizard/plan';
import { readProjectState, type ProjectState } from '../wizard/project-state';
import { closedGates, registryOf, type ApiRegistry } from '../wizard/registry';
import { projectHeader, reviewLists, stillReading, type ViewContext } from '../wizard/views';
import { workspaceProjectOf } from '../workspace/service';
import { ExportUnavailable } from './export';
import {
  catalogueInputs,
  earlierEngineValues,
  engineInputOf,
  engineOf,
  ensureEngineMember,
  producedCandidates,
  readsOf,
  writeEngineCandidates,
  writeEngineCandidatesIn,
  type ProposalEngine,
} from './engine';

/** Who asks, for which project (the route's session user and path parameter). */
export interface ProposalScope {
  readonly userId: string;
  readonly projectId: string;
}

/** A PDF or CSV the route streams, with its media type and download name. */
export interface FileAnswer {
  readonly contentType: 'application/pdf' | 'text/csv; charset=utf-8';
  readonly fileName: string;
  readonly body: Uint8Array;
}

/** What a generation reads of the services (the API's, or the worker's for a regeneration). */
export type GenerationServices = Pick<ApiServices, 'store' | 'registry' | 'engine' | 'extractionAccountId' | 'drafting' | 'log'>;

/** The owner's message when the PDF could not be prepared (rule 7: nothing is lost; the owner can try again). Draft wording. */
/** The refusal's message when a PDF could not be printed (the proposal's and, from phase 6, a Metrics page's: R-121). */
export const EXPORT_UNAVAILABLE = 'The PDF could not be prepared. Nothing was lost; you can try again.';

// ---------------------------------------------------------------------------------------------
// Shared reading
// ---------------------------------------------------------------------------------------------

/** The project as a phase 5 screen reads it: the wizard's state and plan, and one display per value id (G2-7). Exported for the Metrics pages (phase 6, ../metrics/service.ts). */
export async function viewContextOf(services: ApiServices, request: Request, gates: GateSource, scope: ProposalScope): Promise<ViewContext> {
  const state = await readProjectState(request, scope, registryOf(services));
  return { state, plan: planProject(state), displays: new Displays(), gates: closedGates(gates) };
}

/** The contract's envelope: `asOf`, the project header (the name bound; the demo line from the flag only) and every display. */
export function envelope<View>(context: ViewContext, built: Built<View>): { asOf: string; project: ProjectHeader; displayObjects: DisplayObject[]; view: View } {
  const project = projectHeader(context);
  for (const display of built.displayObjects) context.displays.add(display);
  return { asOf: context.state.asOf, project, displayObjects: context.displays.list(), view: built.view };
}

/** The documents still being read (queued or analysing) when a proposal is generated (rule 7). */
function pendingDocumentIds(state: ProjectState): string[] {
  return state.activeDocuments.filter((document) => document.analysis.status === 'queued' || document.analysis.status === 'analysing').map((document) => document.id);
}

/** A formula ref `<id>@<version>` split back into its parts. */
function formulaOf(ref: string): { readonly formulaId: string; readonly formulaVersion: string } {
  const at = ref.lastIndexOf('@');
  if (at <= 0) throw new Error('a snapshot output names no formula version');
  return { formulaId: ref.slice(0, at), formulaVersion: ref.slice(at + 1) };
}

/**
 * A missing item's code as the store keeps it (migration 0015: codes only, never text, rule 13): a method's name is the
 * engine's words (a TEST body may name one in a sentence); its characters outside a code's are written as `_`. The view
 * names a missing method by the output's own label, never by this code's text.
 */
function storedCode(code: string): string {
  return code.replace(/[^A-Za-z0-9_.:-]/gu, '_').slice(0, 200);
}

/** What the store keeps for one generation (engine `snapshotRecordOf`; migration 0015). */
function snapshotWriteOf(run: EngineRun, pending: readonly string[], paragraphs: readonly ParagraphWrite[], createdBy: string): GeneratedProposalWrite {
  const record = snapshotRecordOf(run, pending);
  return {
    inputsHash: record.inputsHash,
    candidateIds: record.candidateIds,
    formulas: record.formulas,
    outputs: record.outputs.map((row) => ({ output: row.output, ...formulaOf(row.formula), candidateId: row.candidateId, missing: [...new Set(row.missing.map(storedCode))], incomplete: row.incomplete })),
    pendingDocumentIds: record.pendingDocumentIds,
    paragraphs,
    createdBy,
  };
}

// ---------------------------------------------------------------------------------------------
// Drafting (R-115): value tokens only, through the production boundary
// ---------------------------------------------------------------------------------------------

/** The one paragraph slot a generation asks for, with its purpose written by code. */
const SUMMARY_SLOT = { id: 'summary', purpose: 'A short introduction to this preliminary proposal for the building owner, in plain words; every figure only through a token given.' };

/**
 * The drafting request of a generation, built by code from the run and the project's state (one project only; rule 13):
 * a `{{calc:<output>}}` token for each output with a figure, a `{{value:<field key>}}` token for each input with a value,
 * each with its label; the scope decisions as facts in words. No figure leaves as text (rule 2).
 */
function draftingInputOf(state: ProjectState, run: EngineRun, catalogue: Required<ProposalEngine>['catalogue']): DraftingInput {
  const tokens: TokenForAi[] = [];
  for (const output of run.outputs) {
    if (output.kind === 'not_available') continue;
    tokens.push({ projectId: state.projectId, token: `{{calc:${output.output}}}`, label: OUTPUT_LABELS[output.output] ?? output.output, badge: badgeOf(output.candidate.source === 'estimated' ? 'estimated' : 'calculated').label, status: [] });
  }
  for (const key of catalogueInputs(catalogue)) {
    const field = state.fields.get(key);
    if (field === undefined || field.state.activeCandidateId === null) continue;
    tokens.push({ projectId: state.projectId, token: `{{value:${key}}}`, label: field.field.label, badge: null, status: [] });
  }
  const facts = SYSTEMS.flatMap((system) => {
    const field = state.fields.get(`project.scope.${system.id}`);
    const choice = field?.candidates.find((candidate) => candidate.id === field.state.activeCandidateId)?.choice;
    if (choice === 'include') return [{ projectId: state.projectId, text: `${system.name} is in the scope the owner chose.` }];
    if (choice === 'exclude') return [{ projectId: state.projectId, text: `${system.name} is left out of the scope by the owner.` }];
    return [];
  });
  return { project: { id: state.projectId, demo: state.isDemo }, slots: [SUMMARY_SLOT], tokens, facts, provenance: { kind: 'project' } };
}

/** The paragraphs the output validator accepted, or none (no drafting service; refused; failed): never a failed Generate (rule 7). */
async function draftParagraphs(services: GenerationServices, state: ProjectState, run: EngineRun): Promise<ParagraphWrite[]> {
  if (services.drafting === undefined) return [];
  const engine = engineOf(services);
  try {
    const drafted = await services.drafting.draft(draftingInputOf(state, run, engine.catalogue));
    if (drafted.outcome !== 'completed') {
      services.log({ event: 'proposal_not_drafted', code: drafted.outcome, projectId: state.projectId });
      return [];
    }
    return drafted.paragraphs.map((paragraph, ordinal) => ({ slot: paragraph.slot, ordinal, text: paragraph.text, modelId: drafted.modelId }));
  } catch {
    services.log({ event: 'proposal_not_drafted', code: 'drafting_error', projectId: state.projectId });
    return [];
  }
}

// ---------------------------------------------------------------------------------------------
// Generate (R-109, R-110; UD-07 is the web's while this request runs)
// ---------------------------------------------------------------------------------------------

/** One generation in a request that holds the project's write lock: read, run, store. Writes nothing but the snapshot. */
async function generateIn(
  services: GenerationServices,
  request: Request,
  gates: GateSource,
  scope: ProposalScope,
): Promise<{ readonly kind: 'stored'; readonly snapshotId: string } | { readonly kind: 'candidates'; readonly run: EngineRun; readonly state: ProjectState; readonly pending: readonly string[] }> {
  const registry = registryOf(services);
  const engine = engineOf(services);
  const state = await readProjectState(request, scope, registry);
  const at = await databaseTime(request);
  const run = runEngine(engine.catalogue, engineInputOf(state, new Set(closedGates(gates).keys()), engine, services.extractionAccountId), { newId, at });
  // A body answer the engine refused (rule 9's range, 2.1's source, rule 8's unit) left no candidate; it is logged by its
  // code, its formula and its output only (rule 13: no text). Section 8 lists no guardrail event type for it, so none is
  // written (proposal P-5-ENGINE-REFUSAL-EVENT in the build log); with no production body, none happens live.
  for (const refusal of run.refusals) {
    services.log({ event: 'engine_answer_refused', code: refusal.reason, projectId: scope.projectId, codes: [refusal.formula, refusal.output] });
  }
  const pending = pendingDocumentIds(state);
  if (producedCandidates(run).length > 0 && scope.userId !== services.extractionAccountId) {
    // The engine's values are the system's (2.1): its account joins the project here, and writes them in its own request.
    await ensureEngineMember(request, scope.projectId, services.extractionAccountId);
    return { kind: 'candidates', run, state, pending };
  }
  if (producedCandidates(run).length > 0) {
    // The system's own request (a regeneration), which holds the project's write lock: its values are written in it.
    await writeEngineCandidatesIn(request, registry, services.extractionAccountId, producedCandidates(run), earlierEngineValues(state));
  }
  const paragraphs = await draftParagraphs(services, state, run);
  return { kind: 'stored', snapshotId: await recordGeneratedProposal(request, snapshotWriteOf(run, pending, paragraphs, scope.userId)) };
}


/**
 * `POST …/proposals` (R-109): one press, one stored version. Never blocked by missing data or running analysis (rule 7):
 * every output that cannot be produced is stored as what it was missing.
 */
export async function generateProposal(services: ApiServices, gates: GateSource, scope: ProposalScope): Promise<GenerateResponse> {
  const first = await inProject(services, scope, async (request) => {
    await requireOwner(request);
    await lockProjectWrites(request);
    return generateIn(services, request, gates, scope);
  });
  if (first.kind === 'stored') return { snapshotId: first.snapshotId };
  // A run that produced values (TEST catalogues only, while no production body exists): the system writes them in its
  // own request, under the project's write lock, superseding every earlier engine value it reads there (a concurrent
  // Generate's among them: G4-47); then the owner's request stores the snapshot that names them. A snapshot stored
  // after a later answer reads honestly as "Out of date, recalculating" (2.4).
  await writeEngineCandidates(services.store, registryOf(services), { projectId: scope.projectId, accountId: services.extractionAccountId }, producedCandidates(first.run));
  const snapshotId = await inProject(services, scope, async (request) => {
    await requireOwner(request);
    await lockProjectWrites(request);
    const paragraphs = await draftParagraphs(services, first.state, first.run);
    return recordGeneratedProposal(request, snapshotWriteOf(first.run, first.pending, paragraphs, scope.userId));
  });
  return { snapshotId };
}

/**
 * After an analysis job ends (done, or failed for good): when every document the latest stored proposal recorded as
 * still being read has finished, a new version is generated as the system (US-PROPOSAL-11 AC6; rule 7: "Your estimate
 * will update when they finish"). Nothing else regenerates. Returns the new version's id, or null.
 */
export async function regenerateAfterAnalysis(services: GenerationServices, gates: GateSource, input: { readonly projectId: string; readonly systemAccountId: string }): Promise<string | null> {
  const scope = { userId: input.systemAccountId, projectId: input.projectId };
  return withRequest(services.store, scope, async (request) => {
    await lockProjectWrites(request);
    const [latest] = await readProposalVersions(request);
    if (latest === undefined) return null;
    const stored = await readProposalSnapshot(request, latest.id);
    if (stored === undefined || stored.pendingDocumentIds.length === 0) return null;
    const state = await readProjectState(request, scope, registryOf(services));
    const reading = new Set(pendingDocumentIds(state));
    if (stored.pendingDocumentIds.some((documentId) => reading.has(documentId))) return null;
    const generated = await generateIn(services, request, gates, scope);
    if (generated.kind !== 'stored') return null;
    services.log({ event: 'proposal_regenerated', code: 'analysis_finished', projectId: input.projectId });
    return generated.snapshotId;
  });
}

// ---------------------------------------------------------------------------------------------
// The stored proposal (UD-06, UD-01's content) and its versions
// ---------------------------------------------------------------------------------------------

/** A stored quotation record as the engine reads it. */
function quotationRecordOf(row: StoredQuotationRecordRow): StoredQuotationRecord {
  return {
    id: row.id,
    recordNumber: row.recordNumber,
    reviewingEngineerId: row.reviewingEngineerId,
    commercialReviewerId: row.commercialReviewerId,
    issuedOn: row.issuedOn,
    validUntil: row.validUntil,
    currency: row.currency,
    vatBasis: row.vatBasis,
    proposalSnapshotId: row.proposalSnapshotId,
    inputs: row.inputs,
  };
}

/** The current derived state of the project's fields, as the staleness checks read it. */
function currentInputsOf(state: ProjectState): CurrentInputs {
  return {
    fields: [...state.fields.values()].map((field) => ({
      subjectId: field.subjectId,
      fieldKey: field.field.key,
      state: field.state,
      candidates: field.candidates,
      events: field.candidateEvents,
      fieldEvents: field.fieldEvents,
    })),
    documentEvents: state.documentEvents,
  };
}

/** Every stored quotation record of the project, with its standing against the current inputs (rule 10). */
async function quotationsOf(request: Request, current: CurrentInputs): Promise<{ readonly record: StoredQuotationRecord; readonly standing: QuotationStanding }[]> {
  return (await readQuotationRecords(request)).map((row) => {
    const record = quotationRecordOf(row);
    return { record, standing: quotationStanding(record, current) };
  });
}

/**
 * A stored proposal as the staleness check and the stage read it: its snapshot, what changed since (engine
 * `snapshotChanges`), and its output rows, each with its `outOfDate` (an input it reads changed after generation, with
 * the first dated change: "Out of date, recalculating"), so a current record over an out-of-date figure reads
 * "Superseded" (rule 10; A-4). One reading for the stored proposal and for Reports (G2-7).
 */
function storedReadingOf(stored: StoredProposal, current: CurrentInputs, catalogue: Required<ProposalEngine>['catalogue']): { readonly snapshot: StoredSnapshot; readonly changes: SnapshotChanges; readonly rows: SnapshotOutputRow[] } {
  const snapshot: StoredSnapshot = {
    id: stored.id,
    createdAt: stored.createdAt,
    inputsHash: stored.inputsHash,
    candidateIds: stored.candidateIds,
    outputs: stored.outputs.map((output) => ({ ...output, missing: [...output.missing] })),
  };
  const changes = snapshotChanges(snapshot, current, readsOf(catalogue));
  const rows = stored.outputs.map((output) => {
    const row: SnapshotOutputRow = {
      output: output.output,
      formula: `${output.formulaId}@${output.formulaVersion}`,
      candidateId: output.candidateId,
      missing: output.missing,
      incomplete: output.incomplete,
      outOfDate: changes.outOfDateOutputs.has(output.output) ? { changedOn: changes.outOfDateOn.get(output.output) ?? null } : null,
    };
    return row;
  });
  return { snapshot, changes, rows };
}

/** The project's fields as the proposal's builders read them. */
export function proposalFieldsOf(state: ProjectState): ProposalField[] {
  return [...state.fields.values()].map((field) => ({
    field: field.field,
    subjectId: field.subjectId,
    subjectKind: field.subjectKind,
    state: field.state,
    candidates: field.candidates,
    candidateEvents: field.candidateEvents,
    asked: askedOf(state, field),
    missingNow: !hasEligible(field.intake),
  }));
}

/**
 * Whether rule 7's `first_estimate` row allows the stage 1 fallback for a stored proposal, from its own rows: its stage
 * 2 row (the preliminary investment estimate) names, among what it was missing, an input whose registry field is a
 * first-estimate field. Read from the snapshot alone, an earlier version's headline never switches stage after it was
 * generated (R-110; 2.4; G4-45).
 */
export function firstEstimateFallbackOf(rows: readonly SnapshotOutputRow[], registry: Pick<ApiRegistry, 'fieldByKey'>): boolean {
  const stage2 = rows.find((row) => row.output === OUTPUT.preliminaryEstimate);
  if (stage2 === undefined) return false;
  return stage2.missing.some((code) => {
    // `input:<subject id>:<field key>:<reason>` (engine `missingCode`; codes only, rule 13).
    const [kind, , fieldKey] = code.split(':');
    return kind === 'input' && fieldKey !== undefined && registry.fieldByKey.get(fieldKey)?.criticality === 'first_estimate';
  });
}

/** Everything the proposal's builders read for one stored version; 404 for a version the project does not hold (rule 13). */
export async function proposalInputOf(services: ApiServices, request: Request, context: ViewContext, snapshotId: string): Promise<ProposalBuildInput> {
  const { state } = context;
  const engine = engineOf(services);
  const stored = await readProposalSnapshot(request, snapshotId);
  if (stored === undefined) throw notFound();
  const versions = await readProposalVersions(request);
  const named = new Set([...stored.candidateIds, ...stored.outputs.flatMap((output) => (output.candidateId === null ? [] : [output.candidateId]))]);
  const candidates = await readCandidates(request, [...named]);
  const current = currentInputsOf(state);
  const { snapshot, changes, rows } = storedReadingOf(stored, current, engine.catalogue);
  const records = await quotationsOf(request, current);
  const none: PriceStageReading = { stage: null, quotationRecordId: null, superseded: null };
  const stage = (output: string): PriceStageReading => {
    const row = rows.find((entry) => entry.output === output);
    return row === undefined ? none : priceStageOf({ output: row, records, snapshotId: stored.id });
  };
  // Rule 7's `first_estimate` row, read from the snapshot's own rows (R-110: "readable as generated"; 2.4), never from
  // today's answers, gates or catalogue: see `firstEstimateFallbackOf`. `headlineOutputOf` then takes stage 1 only
  // when its row holds a complete figure, which exists only where its dataset was approved at generation (G7-2a);
  // else stage 2's line (G7-2b).
  const fallbackAllowed = firstEstimateFallbackOf(rows, registryOf(services));
  const lists = reviewLists(context);
  // Rule 7's "Your estimate will update when they finish" only where it is true (R-110; US-PROPOSAL-11 AC6): on the
  // latest version, while a document it recorded as still being read is read now (when it finishes, the regeneration
  // stores a new version that records any later upload as pending). Then step 8's own display (G2-7). An earlier
  // version, and its print view, never carry it (G4-45, G7-20).
  const latest = versions[0]?.id === stored.id;
  const readingNow = new Set(pendingDocumentIds(state));
  const reading = latest && stored.pendingDocumentIds.some((documentId) => readingNow.has(documentId)) ? stillReading(context) : null;
  return {
    projectId: state.projectId,
    buildingId: state.buildingId,
    header: projectHeader(context),
    snapshot: { ...snapshot, pendingDocumentIds: stored.pendingDocumentIds, drafted: stored.paragraphs },
    snapshotCandidates: new Map(candidates.map((candidate) => [candidate.id, candidate])),
    current: proposalFieldsOf(state),
    changes,
    quotations: records,
    stage,
    headlineOutput: headlineOutputOf(rows, fallbackAllowed),
    catalogue: engine.catalogue,
    versions: versions.map((version) => ({ snapshotId: version.id, createdAt: version.createdAt })),
    stillReading: reading === null ? null : (context.displays.list().find((display) => display.valueId === reading) ?? null),
    openItems: { view: { count: lists.forYou.count, items: lists.forYou.items, more: lists.forYou.more, sovitechWillCheck: lists.sovitechWillCheck }, displays: [] },
    closedGates: new Set(context.gates.keys()),
    documents: state.documents,
    activeDocumentIds: new Set(state.activeDocuments.map((document) => document.id)),
    fileName: state.fileName,
    projectType: state.projectType,
    verificationOf: verificationsOf(state),
  };
}

/** Each candidate's verification now, derived, on any subject of the project (2.4: provisional status is computed on read). */
function verificationsOf(state: ProjectState): ProposalBuildInput['verificationOf'] {
  const verification = new Map<string, NonNullable<ReturnType<ProposalBuildInput['verificationOf']>>>();
  for (const field of [...state.fields.values(), ...state.subjectFields.values()]) {
    for (const derived of field.state.candidates) verification.set(derived.candidateId, derived.verification);
  }
  return (candidateId) => verification.get(candidateId);
}

/** `GET …/proposals`: the stored versions, newest first (the landing shows the latest, or phase 3's preview while none). */
export async function listProposals(services: ApiServices, gates: GateSource, scope: ProposalScope): Promise<ProposalVersionsResponse> {
  return inProject(services, scope, async (request) => {
    const context = await viewContextOf(services, request, gates, scope);
    const versions = await readProposalVersions(request);
    return envelope(context, buildVersionsView(versions.map((version) => ({ snapshotId: version.id, createdAt: version.createdAt }))));
  });
}

/** `GET …/proposals/:snapshotId` (UD-06 with UD-01's content). */
export async function proposalView(services: ApiServices, gates: GateSource, scope: ProposalScope, snapshotId: string): Promise<ProposalResponse> {
  return inProject(services, scope, async (request) => {
    const context = await viewContextOf(services, request, gates, scope);
    return envelope(context, buildProposalView(await proposalInputOf(services, request, context, snapshotId)));
  });
}

/** `GET …/proposals/:snapshotId/print`: what the print route renders and the PDF prints (no action on any display). */
export async function proposalPrintView(services: ApiServices, gates: GateSource, scope: ProposalScope, snapshotId: string): Promise<ProposalPrintResponse> {
  return inProject(services, scope, async (request) => {
    const context = await viewContextOf(services, request, gates, scope);
    const built = buildPrintView(await proposalInputOf(services, request, context, snapshotId));
    const answer = envelope(context, built);
    // A printed page has no button (ADR 0050 decision 1): the open items' and the header's displays too carry no action.
    return { ...answer, displayObjects: answer.displayObjects.map(withoutActions) };
  });
}

/** A display with no action. */
function withoutActions(display: DisplayObject): DisplayObject {
  if (display.actions === undefined) return display;
  const copy: DisplayObject = { ...display };
  delete copy.actions;
  return copy;
}

// ---------------------------------------------------------------------------------------------
// Exports (R-118; ADR 0050)
// ---------------------------------------------------------------------------------------------

/** `POST …/proposals/:snapshotId/exports`: records an export the owner starts (who, when, which snapshot); no file is stored. */
export async function recordExport(services: ApiServices, scope: ProposalScope, snapshotId: string): Promise<ExportResponse> {
  return inProject(services, scope, async (request) => {
    await requireOwner(request);
    await lockProjectWrites(request);
    if ((await readProposalSnapshot(request, snapshotId)) === undefined) throw notFound();
    return { outputId: await recordGeneratedOutput(request, { kind: 'proposal_pdf', snapshotId, startedBy: scope.userId }) };
  });
}

/** A stored time as the store gives it (`2026-10-06T21:04:05.123456Z`): its date, hour and minute digits, as stored. */
const STORED_MINUTE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/u;

/**
 * The download name of a proposal's PDF (DR-5): the stem of `EXPORT_FILE_NAMES.proposal` and the printed snapshot's
 * generation time, `preliminary-proposal-YYYY-MM-DD-HHMM.pdf`, so two versions never save under one name. The digits
 * are the stored time's own (UTC, as the store keeps it; no arithmetic); no document text (rule 13). A Metrics page's
 * PDF (phase 6, R-121) names its own file the same way (`fileName`: `EXPORT_FILE_NAMES.payback` or `.lifecycle`).
 */
export function exportFileNameOf(snapshotCreatedAt: string | undefined, fileName: string = EXPORT_FILE_NAMES.proposal): string {
  const match = snapshotCreatedAt === undefined ? null : STORED_MINUTE.exec(snapshotCreatedAt);
  if (match === null) return fileName;
  const [, year, month, day, hour, minute] = match;
  return `${fileName.replace(/\.pdf$/u, '')}-${year ?? ''}-${month ?? ''}-${day ?? ''}-${hour ?? ''}${minute ?? ''}.pdf`;
}

/**
 * The PDF of a recorded export, printed from the print route with the requester's own session (ADR 0050). `signal` is
 * aborted when the requester went away: the printer then never opens a page for it, or closes the one it opened.
 */
export async function exportFile(
  services: ApiServices,
  scope: ProposalScope,
  outputId: string,
  session: { readonly cookieHeader: string; readonly signal?: AbortSignal },
): Promise<FileAnswer> {
  const found = await inProject(services, scope, async (request) => {
    const output = (await readGeneratedOutputs(request)).find((entry) => entry.id === outputId);
    if (output === undefined) return undefined;
    return { output, snapshotCreatedAt: (await readProposalVersions(request)).find((version) => version.id === output.snapshotId)?.createdAt };
  });
  if (found === undefined) throw notFound();
  const { output } = found;
  const { printer, webOrigin } = services;
  if (printer === undefined || webOrigin === undefined) throw new ApiRefusal(503, 'export_unavailable', EXPORT_UNAVAILABLE);
  let body: Uint8Array;
  try {
    body = await printer.print({
      webOrigin,
      cookieHeader: session.cookieHeader,
      projectId: scope.projectId,
      snapshotId: output.snapshotId,
      ...(session.signal === undefined ? {} : { signal: session.signal }),
    });
  } catch (error) {
    // The reason is a code (rule 13: no document text in a log).
    services.log({ event: 'export_failed', code: error instanceof ExportUnavailable ? error.reason : 'export_failed', projectId: scope.projectId });
    throw new ApiRefusal(503, 'export_unavailable', EXPORT_UNAVAILABLE);
  }
  return { contentType: 'application/pdf', fileName: exportFileNameOf(found.snapshotCreatedAt), body };
}

/** `GET …/reports` (DB-18; R-119): the generated outputs, filtered, sorted and paged. */
export async function reportsView(services: ApiServices, gates: GateSource, scope: ProposalScope, query: ReportsQuery): Promise<ReportsResponse> {
  return inProject(services, scope, async (request) => {
    const context = await viewContextOf(services, request, gates, scope);
    const outputs = await readGeneratedOutputs(request);
    const versions = new Map((await readProposalVersions(request)).map((version) => [version.id, version.createdAt]));
    const names = new Map((await readVisibleAccounts(request)).map((account) => [account.id, account.displayName]));
    // "Superseded: inputs changed on <date>" on a row only where the stored proposal it prints reads it (R-119;
    // US-REPORTS-05 AC15; none in the live app, which holds no quotation record): its stage 2 figure, read with the same
    // records, standings and out-of-date rows as the proposal (`priceStageOf`; G2-7). A snapshot with no figure, or one
    // whose record is current over inputs as generated, carries no line.
    const current = currentInputsOf(context.state);
    const records = await quotationsOf(request, current);
    const supersededBySnapshot = new Map<string, { readonly changedOn: string } | null>();
    const supersededOf = async (snapshotId: string): Promise<{ readonly changedOn: string } | null> => {
      if (!records.some((entry) => entry.record.proposalSnapshotId === snapshotId)) return null;
      const known = supersededBySnapshot.get(snapshotId);
      if (known !== undefined) return known;
      const stored = await readProposalSnapshot(request, snapshotId);
      const stage2 = stored === undefined ? undefined : storedReadingOf(stored, current, engineOf(services).catalogue).rows.find((row) => row.output === OUTPUT.preliminaryEstimate);
      const reading = stage2 === undefined ? null : priceStageOf({ output: stage2, records, snapshotId }).superseded;
      const line = reading === null ? null : { changedOn: reading.changedOn };
      supersededBySnapshot.set(snapshotId, line);
      return line;
    };
    const listed: GeneratedOutput[] = [];
    for (const output of outputs) {
      listed.push({
        id: output.id,
        kind: output.kind,
        snapshotId: output.snapshotId,
        startedAt: output.startedAt,
        snapshotCreatedAt: versions.get(output.snapshotId) ?? output.startedAt,
        startedByName: names.get(output.startedBy) ?? badgeOf('unknown').label,
        superseded: await supersededOf(output.snapshotId),
      });
    }
    return envelope(context, buildReportsView(listed, query));
  });
}

/** `GET …/exports/equipment` (R-066): the register as the page's filters narrow it, as CSV. */
export async function equipmentExport(services: ApiServices, gates: GateSource, scope: ProposalScope, query: EquipmentExportQuery): Promise<FileAnswer> {
  return inProject(services, scope, async (request) => {
    const state = await readProjectState(request, scope, registryOf(services));
    const project = workspaceProjectOf(state, planProject(state), gates);
    const csv = equipmentCsv(project, query, state.isDemo ? lineOf('demo_data').text : null);
    return { contentType: 'text/csv; charset=utf-8', fileName: EXPORT_FILE_NAMES.equipment, body: Buffer.from(csv, 'utf8') };
  });
}

/** Kept for the printer's module (./export.ts), which refuses with it until its builder writes it. */
export class ProposalServiceNotBuilt extends Error {
  constructor(what: string) {
    super(`apps/api proposal: ${what} is not built yet (phase 5 part A)`);
    this.name = 'ProposalServiceNotBuilt';
  }
}
