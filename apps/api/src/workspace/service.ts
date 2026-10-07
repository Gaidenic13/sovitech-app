/**
 * The workspace's services (phase 4; docs/adr/0044-workspace-api-contract.md): each reads the project's state in the
 * user's own request (row-level security: another project reads as not found, rule 13), derives with the one derive
 * function (2.4) and the registry the services carry (the registry seam, ADR 0044 decision 4), resolves every value
 * with the one resolver as the wizard does (so a value id shows one display on every screen, G2-7), hands the state to
 * the view-model's workspace builders (`@sovitech/view-model/server`), and answers the contract's envelope: `asOf`, the
 * project header (with the demo line from the project's flag only, rule 10) and the display objects the view names.
 *
 * Rules kept here (each cites its source; the contract's doc comments say more):
 * - gates only through `readGate` (`closedGates`); file names only as served (`servedFileName`, G2-14, through the
 *   project state); no document text, excerpt or file name in a log (rule 13): codes and ids only;
 * - the owner's writes (`decideScope`, `concernMany`) take the owner check, then the project's write lock, then read
 *   the state (`lockProjectWrites`; ADR 0036 decision 13), write only what the view-model's planners plan through the
 *   store's one path, and append, never change (2.4); a decision equal to the stored one writes nothing (7.1.1-C8);
 *   nothing is skipped from here (rule 7's skips are the wizard's);
 * - no count outside the engine (ADR 0045 decision 2); nothing from an IFC model, no model area (R-078, R-080);
 * - a conflict a read derives first is logged once, as section 8's `conflict_raised` (../wizard/conflicts.ts; G4-48).
 */
import { lockProjectWrites, databaseTime, newId, readAssetRegisterInputs, readDocumentRegistrations, type Request } from '@sovitech/db';
import { deriveAssetRegister, documentStatuses, type CandidateEvent, type DocumentEvent, type FieldState } from '@sovitech/domain';
import type { GateSource } from '@sovitech/registry/gates';
import { FIELD, SCOPE_FIELDS } from '@sovitech/registry';
import type {
  AssetResponse,
  DeleteEffectResponse,
  DisplayObject,
  DocumentsResponse,
  EquipmentQuery,
  EquipmentResponse,
  FieldWriteResponse,
  ProjectHeader,
  ScopeDecisionsRequest,
  SystemScopeResponse,
  TopologyResponse,
  WorkspaceFrameResponse,
  ZonesQuery,
  ZonesResponse,
} from '@sovitech/view-model/browser';
import {
  assetView as buildAssetView,
  continueRecords,
  deleteEffectView as buildDeleteEffectView,
  documentsView as buildDocumentsView,
  equipmentView as buildEquipmentView,
  frameView as buildFrameView,
  lineOf,
  planConcern,
  planScopeDecisions,
  systemScopeView as buildSystemScopeView,
  topologyView as buildTopologyView,
  zonesView as buildZonesView,
  type Built,
  type DocumentFacts,
  type WithoutDocument,
  type WorkspaceField,
  type WorkspaceProject,
} from '@sovitech/view-model/server';
import { inProject, requireOwner } from '../documents/service';
import { notFound } from '../errors';
import type { ApiServices } from '../services';
import { appendRecords } from '../wizard/answers';
import { Displays, resolveSubjectField, resolveWizardField } from '../wizard/displays';
import { intakeFields, planProject, type WizardPlan } from '../wizard/plan';
import { fieldOnSubject, readProjectState, stillReadingCount, type ProjectState, type WizardField } from '../wizard/project-state';
import { logStateConflicts } from '../wizard/conflicts';
import { closedGates, deriveField, registryOf } from '../wizard/registry';
import { fieldOfCandidate } from '../wizard/service';
import { namedSubjectDisplays } from './naming';

/** The request's user and the project in scope. */
export interface WorkspaceScope {
  readonly userId: string;
  readonly projectId: string;
}

/** The floor selection a view is read with (a `LevelOption.key`; a view state that writes nothing). */
export interface LevelSelection {
  readonly level?: string;
}

// ---------------------------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------------------------

/** A wizard field as the workspace builders read it. */
function workspaceFieldOf(wizardField: WizardField): WorkspaceField {
  return {
    field: wizardField.field,
    subjectId: wizardField.subjectId,
    subjectKind: wizardField.subjectKind,
    state: wizardField.state,
    candidates: wizardField.candidates,
    candidateEvents: wizardField.candidateEvents,
  };
}

/**
 * The project as the workspace builders read it: the state the wizard reads (the same derive, the same served file
 * names), the question engine's suggestions (rule 3; the intake's one guard), the closed gates, and the one way every
 * screen resolves a field (the wizard's `resolveWizardField` for the project's and the building's fields, with the
 * same actions and the same plan; `resolveSubjectField` for a zone's, a level's or an asset's).
 */
export function workspaceProjectOf(state: ProjectState, plan: WizardPlan, gates: GateSource): WorkspaceProject {
  const fields = [...state.fields.values(), ...state.subjectFields.values()];
  return {
    projectId: state.projectId,
    buildingId: state.buildingId,
    projectType: state.projectType,
    documents: state.documents,
    activeDocuments: state.activeDocuments,
    fileName: state.fileName,
    // Rule 12 (G12-8): nothing counts as searched until a completed AI run searched it.
    searched: fields.some((wizardField) => state.searchedCoverage(wizardField.field.key) !== undefined),
    closedGates: new Set(closedGates(gates).keys()),
    field: (subjectId, fieldKey) => {
      const found = fieldOnSubject(state, subjectId, fieldKey);
      return found === undefined ? undefined : workspaceFieldOf(found);
    },
    fields: fields.map(workspaceFieldOf),
    resolve: (subjectId, fieldKey) => {
      const found = fieldOnSubject(state, subjectId, fieldKey);
      if (found === undefined) return undefined;
      if (found.subjectKind === 'project' || found.subjectKind === 'building') return resolveWizardField(state, fieldKey, plan.confirmationOf.get(fieldKey), plan.suggestions);
      return resolveSubjectField(state, subjectId, fieldKey);
    },
    register: state.register,
    appearances: state.appearances,
    zoneIds: state.subjects.filter((subject) => subject.kind === 'zone').map((subject) => subject.id),
    suggestions: plan.suggestions,
    readingCount: stillReadingCount(state),
  };
}

interface WorkspaceRead {
  readonly state: ProjectState;
  readonly plan: WizardPlan;
  readonly project: WorkspaceProject;
}

async function read(services: ApiServices, request: Request, gates: GateSource, scope: WorkspaceScope): Promise<WorkspaceRead> {
  const state = await readProjectState(request, scope, registryOf(services));
  // Section 8: a conflict this read derives first is logged once (`conflict_raised`; G4-48), and nothing served changes.
  await logStateConflicts(request, state);
  const plan = planProject(state);
  return { state, plan, project: workspaceProjectOf(state, plan, gates) };
}

/**
 * The envelope of every workspace response (common.ts `screenEnvelope`): the project's name, bound and resolved as
 * every screen resolves it, the demo line on the demo project only (rule 10; R-139: the footer carries it), and one
 * display per value id across the header and the view (G2-7).
 */
function envelope<View>(read: WorkspaceRead, built: Built<View>): { asOf: string; project: ProjectHeader; displayObjects: DisplayObject[]; view: View } {
  const { state, plan } = read;
  const displays = new Displays();
  const [name] = displays.addAll(resolveWizardField(state, FIELD.projectName, plan.confirmationOf.get(FIELD.projectName), plan.suggestions));
  if (name === undefined) throw new Error('the resolver gave no display for the project name');
  displays.addAll(built.displayObjects);
  const project: ProjectHeader = { projectId: state.projectId, name, isDemo: state.isDemo, demoLine: state.isDemo ? lineOf('demo_data') : null };
  return { asOf: state.asOf, project, displayObjects: displays.list(), view: built.view };
}

/** `GET …/workspace`: the frame (pages, project card, footer, level register). */
export async function frameView(services: ApiServices, gates: GateSource, scope: WorkspaceScope): Promise<WorkspaceFrameResponse> {
  return inProject(services, scope, async (request) => {
    const state = await read(services, request, gates, scope);
    return envelope(state, buildFrameView(state.project));
  });
}

/** What the store holds about each active document besides its record: its format, when it was added, whether its original is stored, its declared revision. */
async function documentFacts(services: ApiServices, request: Request, state: ProjectState): Promise<DocumentFacts[]> {
  const added = new Map((await readDocumentRegistrations(request)).map((entry) => [entry.documentId, entry.addedAt]));
  const facts: DocumentFacts[] = [];
  for (const document of state.activeDocuments) {
    const addedAt = added.get(document.id);
    const file = state.files.get(document.id);
    if (addedAt === undefined) continue;
    facts.push({
      documentId: document.id,
      format: file?.format ?? 'other',
      addedAt,
      downloadable: file !== undefined && (await services.files.exists(services.files.originalPath(state.projectId, document.contentHash))),
      // 2.3: "Revisions are declared, never guessed": the declaration the derive applies (a person's, one direction per
      // pair, none on a cycle), never a raw declaration or code's proposal, so a row names only what supersedes (G4-44).
      declaredRevisionOf: state.statuses.predecessor(document.id) ?? null,
      kindSource: 'stored_default',
    });
  }
  return facts;
}

/** `GET …/workspace/documents` (DB-15). */
export async function documentsView(services: ApiServices, gates: GateSource, scope: WorkspaceScope): Promise<DocumentsResponse> {
  return inProject(services, scope, async (request) => {
    const state = await read(services, request, gates, scope);
    return envelope(state, buildDocumentsView(state.project, await documentFacts(services, request, state.state)));
  });
}

/**
 * The project as Delete would leave it (2.3, "Deleting a document"; G4-39, G4-41, G4-42): every registered field derived
 * again with the one derive function, and the asset register with its own, over the stored candidates and events with
 * the owner's withdrawal of the document added to the document events (as `documents.delete` appends it), so a value
 * only this document holds is withdrawn, its revision declarations no longer supersede an older value, and an asset
 * only it shows leaves the count. Nothing is written.
 */
async function withoutDocument(request: Request, state: ProjectState, documentId: string): Promise<WithoutDocument> {
  const removal: DocumentEvent = { documentId, type: 'withdrawn', by: state.userId, role: 'owner', at: state.asOf, reason: 'owner_deleted_document' };
  const documentEvents = [...state.documentEvents, removal];
  const key = (subjectId: string, fieldKey: string): string => `${subjectId}\u0000${fieldKey}`;
  const states = new Map<string, FieldState>();
  for (const wizardField of [...state.fields.values(), ...state.subjectFields.values()]) {
    const events = { candidate: wizardField.candidateEvents, field: wizardField.fieldEvents, document: documentEvents };
    states.set(key(wizardField.subjectId, wizardField.field.key), deriveField(state.registry, wizardField.field, wizardField.subjectId, wizardField.candidates, events, state.documents));
  }
  const byId = new Map(state.documents.map((document) => [document.id, document]));
  const inputs = await readAssetRegisterInputs(request);
  const register = deriveAssetRegister({ ...inputs, documents: documentStatuses(documentEvents, (id) => byId.get(id)) });
  return { state: (subjectId, fieldKey) => states.get(key(subjectId, fieldKey)), countable: register.countable };
}

/** `GET …/workspace/documents/:documentId/delete-effect` (UD-42; G4-39): 404 for a document that is not listed. */
export async function deleteEffectView(services: ApiServices, gates: GateSource, scope: WorkspaceScope, documentId: string): Promise<DeleteEffectResponse> {
  return inProject(services, scope, async (request) => {
    const state = await read(services, request, gates, scope);
    if (!state.state.activeDocuments.some((document) => document.id === documentId)) throw notFound();
    const built = buildDeleteEffectView(state.project, documentId, await withoutDocument(request, state.state, documentId));
    if (built === undefined) throw notFound();
    return envelope(state, built);
  });
}

/** `GET …/workspace/system-scope` (DB-16). */
export async function systemScopeView(services: ApiServices, gates: GateSource, scope: WorkspaceScope, selection: LevelSelection): Promise<SystemScopeResponse> {
  return inProject(services, scope, async (request) => {
    const state = await read(services, request, gates, scope);
    return envelope(state, buildSystemScopeView(state.project, selection));
  });
}

/**
 * `POST …/workspace/system-scope/decisions` (R-052; 7.1.1-C8; G3-20, G4-38, G4-40, G11-10): under the owner check and
 * the project's write lock, the view-model plans the decisions (`planScopeDecisions`: an equal decision writes nothing;
 * a decision on a value the screen did not show is refused `shown_value_changed`; a visible suggestion is accepted only
 * when the server makes it now, never on a life-safety system), the intake turns them into candidates and events
 * (`continueRecords`: `user_confirmed`, and `accepted_suggestion` naming what suggested it), and the store appends
 * them; the answer is System Scope as it now stands (derived on read, 2.4).
 */
export async function decideScope(services: ApiServices, gates: GateSource, scope: WorkspaceScope, body: ScopeDecisionsRequest): Promise<SystemScopeResponse> {
  const registry = registryOf(services);
  return inProject(services, scope, async (request) => {
    await requireOwner(request);
    await lockProjectWrites(request);
    const state = await readProjectState(request, scope, registry);
    const plan = planProject(state);
    const at = await databaseTime(request);
    const fields = intakeFields(state).filter((field) => SCOPE_FIELDS.includes(field.field.key));
    const writes = planScopeDecisions({ projectId: scope.projectId, fields, suggestions: plan.suggestions, request: body });
    const records = continueRecords({ projectId: scope.projectId, writes, fields, owner: scope.userId, at, newId });
    await appendRecords(request, registry, records, scope.userId, 'system_scope');
    if (writes.ignoredSuggestions > 0) services.log({ event: 'suggestion_ignored', code: 'not_suggested_now', projectId: scope.projectId });
    const after = await read(services, request, gates, scope);
    return envelope(after, buildSystemScopeView(after.project));
  });
}

/** `GET …/workspace/equipment` (DB-17). */
export async function equipmentView(services: ApiServices, gates: GateSource, scope: WorkspaceScope, query: EquipmentQuery): Promise<EquipmentResponse> {
  return inProject(services, scope, async (request) => {
    const state = await read(services, request, gates, scope);
    return envelope(state, buildEquipmentView(state.project, query));
  });
}

/** `GET …/workspace/equipment/:assetId` (UD-08): 404 for an asset the register does not list (rule 13). */
export async function assetView(services: ApiServices, gates: GateSource, scope: WorkspaceScope, assetId: string): Promise<AssetResponse> {
  return inProject(services, scope, async (request) => {
    const state = await read(services, request, gates, scope);
    const built = buildAssetView(state.project, assetId);
    if (built === undefined) throw notFound();
    return envelope(state, built);
  });
}

/**
 * `POST …/fields/concern-many` ("Something's wrong" on a selection of equipment; R-065; rule 3; G3-10, G3-19): each
 * candidate's concern as `fields.concern` records it (the owner's rejection with no value of their own, for the
 * engineer queue; refused on an engineer_verified value), in one request under the project's write lock; a candidate
 * the owner already rejected records nothing again. A candidate of another project reads as not found (rule 13).
 */
export async function concernMany(services: ApiServices, scope: WorkspaceScope, candidateIds: readonly string[]): Promise<FieldWriteResponse> {
  const registry = registryOf(services);
  return inProject(services, scope, async (request) => {
    await requireOwner(request);
    await lockProjectWrites(request);
    const state = await readProjectState(request, scope, registry);
    const at = await databaseTime(request);
    const touched = new Map<string, WizardField>();
    const events: CandidateEvent[] = [];
    for (const candidateId of new Set(candidateIds)) {
      const wizardField = fieldOfCandidate(state, candidateId);
      touched.set(`${wizardField.subjectId} ${wizardField.field.key}`, wizardField);
      const event = planConcern({ fields: [wizardField.intake], candidateId, by: scope.userId, at, prior: wizardField.candidateEvents });
      if (event !== null) events.push(event);
    }
    await appendRecords(request, registry, { candidateEvents: events }, scope.userId, 'concern');
    const after = await readProjectState(request, scope, registry);
    const plan = planProject(after);
    const displays = new Displays();
    for (const wizardField of touched.values()) {
      if (wizardField.subjectKind === 'project' || wizardField.subjectKind === 'building') {
        displays.addAll(resolveWizardField(after, wizardField.field.key, plan.confirmationOf.get(wizardField.field.key), plan.suggestions));
      } else {
        // As Equipment serves them: a level by the register's label, a zone by its name (G8-24), one display per id (G2-7).
        displays.addAll(namedSubjectDisplays(after, wizardField.subjectId, wizardField.field.key, resolveSubjectField(after, wizardField.subjectId, wizardField.field.key)));
      }
    }
    return { displayObjects: displays.list() };
  });
}

/** `GET …/workspace/zones` (DB-20). */
export async function zonesView(services: ApiServices, gates: GateSource, scope: WorkspaceScope, query: ZonesQuery): Promise<ZonesResponse> {
  return inProject(services, scope, async (request) => {
    const state = await read(services, request, gates, scope);
    return envelope(state, buildZonesView(state.project, query));
  });
}

/** `GET …/workspace/topology` (DB-08's Logical view). */
export async function topologyView(services: ApiServices, gates: GateSource, scope: WorkspaceScope, selection: LevelSelection): Promise<TopologyResponse> {
  return inProject(services, scope, async (request) => {
    const state = await read(services, request, gates, scope);
    return envelope(state, buildTopologyView(state.project, selection));
  });
}
