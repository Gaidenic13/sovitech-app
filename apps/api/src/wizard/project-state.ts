/**
 * One project's state as the wizard reads it, in the user's own request (row-level security scopes
 * every read to the project; another project reads as not found, rule 13): every production field of
 * the project and its building, derived with the one derive function (2.4: "Derived, never stored"),
 * the project's documents with their derived statuses and file names, the asset register, and what a
 * completed AI run searched (rule 12). Nothing here writes a value; the one write is the building
 * subject, created once when a project made before the wizard has none (a subject holds no value).
 *
 * The question engine (`@sovitech/view-model/server` intake) and the resolver read this; the step
 * views, the writes and late findings are built on it.
 */
import {
  databaseTime,
  ensureBuildingSubject,
  projectIsDemo,
  readAssetRegisterInputs,
  readDocumentFiles,
  readDocumentText,
  readDocumentTexts,
  readProjectFieldInputs,
  readProjectSubjects,
  requestActsAs,
  fileNamePart,
  type Request,
  type StoredFile,
} from '@sovitech/db';
import {
  deriveAssetRegister,
  documentStatuses,
  type AssetAppearance,
  type AssetRegister,
  type Candidate,
  type CandidateEvent,
  type DocumentEvent,
  type DocumentRecord,
  type DocumentStatuses,
  type FieldEvent,
  type FieldState,
  type SubjectKind,
} from '@sovitech/domain';
import { FIELD } from '@sovitech/registry';
import type { RegistryFieldDefinition } from '@sovitech/registry/validation';
import type { IntakeField } from '@sovitech/view-model/server';
import { notFound } from '../errors';
import { AI_SEARCH_PART_PREFIX, formatCoverage, readAiSearches, searchedCoverage, type FieldSearch } from '../documents/coverage';
import { servedFileName } from '../documents/file-names';
import { PRODUCTION_API_REGISTRY, deriveField, type ApiRegistry } from './registry';

/** One registered field of the project, derived (the project's and the building's; and, phase 4, a level's, a zone's or an asset's). */
export interface WizardField {
  readonly field: RegistryFieldDefinition;
  readonly subjectId: string;
  readonly subjectKind: Extract<SubjectKind, 'project' | 'building' | 'level' | 'zone' | 'asset'>;
  readonly candidates: readonly Candidate[];
  /** The field's candidate events (the dates 2.8's generated sentences name). */
  readonly candidateEvents: readonly CandidateEvent[];
  readonly fieldEvents: readonly FieldEvent[];
  readonly state: FieldState;
  /** The question engine's view of it (packages/view-model/src/intake). */
  readonly intake: IntakeField;
}

export interface ProjectState {
  /** The registry the state was read with (the API's registry seam: production in the app, TEST in tests; docs/adr/0044 decision 4). */
  readonly registry: ApiRegistry;
  readonly projectId: string;
  readonly userId: string;
  readonly isDemo: boolean;
  /** When the store was read (the database's clock): the late-findings ledger's time, never shown. */
  readonly asOf: string;
  readonly buildingId: string;
  /** Whether the request's user acts as the owner here (a member holding `owner`). */
  readonly actsAsOwner: boolean;
  readonly fields: ReadonlyMap<string, WizardField>;
  /**
   * The registered fields of the project's level, zone and asset subjects (phase 4's registers), by subject and key
   * (`subjectFieldKey`): none while the registry declares no field for those kinds (the production registry: ADR 0045
   * decision 1). The question engine never plans them (`intakeFields` reads `fields` only).
   */
  readonly subjectFields: ReadonlyMap<string, WizardField>;
  /** The project's level, zone and asset subjects, oldest first. */
  readonly subjects: readonly { readonly id: string; readonly kind: SubjectKind }[];
  /** The project type as the owner answered it on step 1 (the active candidate's key), or undefined. */
  readonly projectType: string | undefined;
  readonly documents: readonly DocumentRecord[];
  readonly documentEvents: readonly DocumentEvent[];
  readonly statuses: DocumentStatuses;
  /** The documents not withdrawn or erased, in id order. */
  readonly activeDocuments: readonly DocumentRecord[];
  readonly files: ReadonlyMap<string, StoredFile>;
  /**
   * The file name as uploaded, by document id (owner text; shown in source lines and rows), as served: without
   * its format and bidirectional controls (`servedFileName`), undefined when nothing is left to show.
   */
  readonly fileName: (documentId: string) => string | undefined;
  readonly register: AssetRegister;
  /** Every stored asset appearance (its tag as written and its evidence; 2.5). */
  readonly appearances: readonly AssetAppearance[];
  /** The coverage a completed AI run searched for a field, as a "Not found in the analysed documents" line may cite it; undefined while nothing was. */
  readonly searchedCoverage: (fieldKey: string) => string | undefined;
}

/** A field's own `skipped` events by the owner, the only ones that skip it (G7-7), oldest first. */
function ownerSkips(state: FieldState, events: readonly FieldEvent[]): string[] {
  const refused = new Set(state.refusedEvents.filter((entry) => entry.kind === 'field').map((entry) => entry.event));
  return events.filter((event) => event.type === 'skipped' && event.role === 'owner' && !refused.has(event)).map((event) => event.at);
}

/** What completed AI runs searched, per field; nothing (and no statement) while no run is stored (rule 12; G12-8). */
async function searchesOf(request: Request, documents: readonly DocumentRecord[], statuses: DocumentStatuses): Promise<(fieldKey: string) => string | undefined> {
  let anyRun = false;
  for (const contentHash of new Set(documents.map((document) => document.contentHash))) {
    if ((await readDocumentTexts(request, contentHash, AI_SEARCH_PART_PREFIX)).length > 0) anyRun = true;
  }
  if (!anyRun) return () => undefined;
  const search: Omit<FieldSearch, 'fieldKey'> = await readAiSearches(request, documents);
  return (fieldKey) => {
    const searched = searchedCoverage(documents, statuses.status, { ...search, fieldKey });
    if (searched.length === 0) return undefined;
    return searched.map((entry) => formatCoverage({ kind: 'read', unit: entry.unit, ranges: entry.ranges, total: entry.total })).join('; ');
  };
}

/**
 * Reads the project's state in the request (scoped to the project). A project the user may not see
 * reads as not found. `createBuilding`: create the building subject when the project has none and
 * the user acts as the owner (projects made through the API and the demo seed have one already).
 */
export async function readProjectState(
  request: Request,
  input: { readonly userId: string; readonly projectId: string },
  registry: ApiRegistry = PRODUCTION_API_REGISTRY,
): Promise<ProjectState> {
  const isDemo = await projectIsDemo(request);
  if (isDemo === undefined) throw notFound();
  const asOf = await databaseTime(request);
  const actsAsOwner = await requestActsAs(request, 'owner');
  const subjects = await readProjectSubjects(request);
  let buildingId = subjects.find((subject) => subject.kind === 'building')?.id;
  if (buildingId === undefined) {
    if (!actsAsOwner) throw notFound();
    buildingId = await ensureBuildingSubject(request, input.userId);
  }
  // A level's, a zone's or an asset's fields are read only where the registry declares a field for that kind.
  const registered = new Set(registry.bundle.fields.map((field) => field.subject));
  const others = subjects.filter((subject): subject is typeof subject & { readonly kind: WizardField['subjectKind'] } =>
    (subject.kind === 'level' || subject.kind === 'zone' || subject.kind === 'asset') && registered.has(subject.kind),
  );
  const inputs = await readProjectFieldInputs(request, [input.projectId, buildingId, ...others.map((subject) => subject.id)]);
  const fields = new Map<string, WizardField>();
  for (const field of registry.bundle.fields) {
    if (field.subject !== 'project' && field.subject !== 'building') continue;
    const subjectId = field.subject === 'project' ? input.projectId : buildingId;
    const fieldInputs = inputs.fieldInputs(subjectId, field.key);
    const state = deriveField(registry, field, subjectId, fieldInputs.candidates, fieldInputs.events, fieldInputs.documents);
    const intake: IntakeField = { field, subjectId, state, candidates: fieldInputs.candidates, skippedAt: ownerSkips(state, fieldInputs.events.field) };
    fields.set(field.key, {
      field,
      subjectId,
      subjectKind: field.subject,
      candidates: fieldInputs.candidates,
      candidateEvents: fieldInputs.events.candidate,
      fieldEvents: fieldInputs.events.field,
      state,
      intake,
    });
  }
  const subjectFields = new Map<string, WizardField>();
  for (const subject of others) {
    for (const field of registry.bundle.fields) {
      if (field.subject !== subject.kind) continue;
      const fieldInputs = inputs.fieldInputs(subject.id, field.key);
      const state = deriveField(registry, field, subject.id, fieldInputs.candidates, fieldInputs.events, fieldInputs.documents);
      const intake: IntakeField = { field, subjectId: subject.id, state, candidates: fieldInputs.candidates, skippedAt: ownerSkips(state, fieldInputs.events.field) };
      subjectFields.set(subjectFieldKey(subject.id, field.key), {
        field,
        subjectId: subject.id,
        subjectKind: subject.kind,
        candidates: fieldInputs.candidates,
        candidateEvents: fieldInputs.events.candidate,
        fieldEvents: fieldInputs.events.field,
        state,
        intake,
      });
    }
  }
  const typeField = fields.get(FIELD.projectType);
  const typeCandidate = typeField?.candidates.find((candidate) => candidate.id === typeField.state.activeCandidateId);

  const documents = inputs.documents;
  const byId = new Map(documents.map((document) => [document.id, document]));
  const statuses = documentStatuses(inputs.documentEvents, (documentId) => byId.get(documentId));
  const activeDocuments = documents.filter((document) => !statuses.removed(document.id));
  const files = new Map((await readDocumentFiles(request)).map((file) => [file.documentId, file]));
  const names = new Map<string, string>();
  for (const document of activeDocuments) {
    // Served without its format and bidirectional controls (servedFileName); the stored name is kept as uploaded.
    const name = servedFileName(await readDocumentText(request, document.contentHash, fileNamePart(document.id)));
    if (name !== undefined) names.set(document.id, name);
  }
  const registerInputs = await readAssetRegisterInputs(request);
  const register = deriveAssetRegister(registerInputs);
  const searched = await searchesOf(request, documents, statuses);

  return {
    registry,
    projectId: input.projectId,
    userId: input.userId,
    isDemo,
    asOf,
    buildingId,
    actsAsOwner,
    fields,
    subjectFields,
    subjects: subjects.filter((subject) => subject.kind === 'level' || subject.kind === 'zone' || subject.kind === 'asset').map((subject) => ({ id: subject.id, kind: subject.kind })),
    projectType: typeCandidate?.choice,
    documents,
    documentEvents: inputs.documentEvents,
    statuses,
    activeDocuments,
    files,
    fileName: (documentId) => names.get(documentId),
    register,
    appearances: registerInputs.appearances,
    searchedCoverage: searched,
  };
}

/** The key of a field on a level, zone or asset subject in `ProjectState.subjectFields`. */
export function subjectFieldKey(subjectId: string, fieldKey: string): string {
  return `${subjectId}\u0000${fieldKey}`;
}

/** A registered field of the state on any of the project's subjects (the project's, the building's, a level's, a zone's or an asset's), or undefined. */
export function fieldOnSubject(state: ProjectState, subjectId: string, fieldKey: string): WizardField | undefined {
  const own = state.fields.get(fieldKey);
  if (own !== undefined && own.subjectId === subjectId) return own;
  return state.subjectFields.get(subjectFieldKey(subjectId, fieldKey));
}

/** A field of the state, which every production field of the project and its building is. */
export function fieldIn(state: ProjectState, fieldKey: string): WizardField {
  const found = state.fields.get(fieldKey);
  if (found === undefined) throw new Error(`the wizard reads no field ${fieldKey}`);
  return found;
}

/** Whether any active document is still being read (queued or analysing), and how many. */
export function stillReadingCount(state: ProjectState): number {
  return state.activeDocuments.filter((document) => document.analysis.status === 'queued' || document.analysis.status === 'analysing').length;
}
