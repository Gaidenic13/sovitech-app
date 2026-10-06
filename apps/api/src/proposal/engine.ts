/**
 * The calculation engine as Generate runs it (phase 5; docs/adr/0047-calculation-engine.md, 0048 decisions 1 and 2):
 * the engine's input read from the project's derived state (the one derive, as the wizard reads it: guardrails 2.4),
 * the catalogue and the datasets the services carry (the production catalogue and no dataset in the app: nothing is
 * approved), and the writing of the candidates a body produced, as the system's service account (2.1: `calculated` and
 * `estimated` come from "The calculation engine only"; ADR 0013: every source but `user` from a service account that is
 * a member of the project; never in the owner's name, G2-9), under the project's write lock, superseding every earlier
 * engine value of the field (2.4, "Recalculation"; G4-47).
 *
 * The drafting seam (PRD R-115; ADR 0048 decision 10) is here too: a drafting request names value tokens only, built by
 * code from the run's outputs and inputs, and runs through the production boundary, the `ai-processor-route` guard and
 * the output validator (packages/ai). The entry points set no drafting service (no key), so nothing is drafted.
 */
import {
  addProjectMember,
  appendCandidateEvent,
  insertCandidate,
  lockProjectMembership,
  lockProjectWrites,
  readVisibleAccounts,
  withRequest,
  type Request,
  type Store,
} from '@sovitech/db';
import type { DraftingInput, DraftingRun } from '@sovitech/ai';
import {
  PRODUCTION_CATALOGUE,
  fieldKeyOf,
  type DatasetAccess,
  type EngineCandidate,
  type EngineField,
  type EngineInput,
  type EngineRun,
  type FormulaCatalogue,
} from '@sovitech/engine';
import type { ApiServices } from '../services';
import { readProjectState, type ProjectState } from '../wizard/project-state';
import type { ApiRegistry } from '../wizard/registry';

/** The engine Generate runs (the services' seam). */
export interface ProposalEngine {
  readonly catalogue: FormulaCatalogue;
  /** Loaded, approved datasets by id (or TEST datasets in the test runner); none in the app. */
  readonly datasets?: DatasetAccess;
}

/** Drafting the proposal's prose (PRD R-115): one call through the production boundary per generation. */
export interface ProposalDrafting {
  draft(input: DraftingInput): Promise<DraftingRun>;
}

/** The engine of a request: the services' seam, else the production catalogue with no dataset. */
export function engineOf(services: Pick<ApiServices, 'engine'>): Required<ProposalEngine> {
  return { catalogue: services.engine?.catalogue ?? PRODUCTION_CATALOGUE, datasets: services.engine?.datasets ?? (() => undefined) };
}

/** The input fields a catalogue's formulas read (each once). */
export function catalogueInputs(catalogue: FormulaCatalogue): readonly string[] {
  const keys: string[] = [];
  for (const formula of catalogue.formulas) for (const key of formula.signature.inputs) if (!keys.includes(key)) keys.push(key);
  return keys;
}

/** The input fields an output's formula reads (for the staleness check: engine `snapshotChanges`). */
export function readsOf(catalogue: FormulaCatalogue): (output: string) => readonly string[] {
  return (output) => catalogue.formulas.find((formula) => formula.signature.outputs.includes(output))?.signature.inputs ?? [];
}

/** The engine's input over the project's derived state: every registered field of the project and its building. */
export function engineInputOf(state: ProjectState, closedGates: ReadonlySet<string>, engine: Required<ProposalEngine>, author: string): EngineInput {
  const fields = new Map<string, EngineField>();
  for (const wizardField of state.fields.values()) {
    fields.set(fieldKeyOf(wizardField.subjectId, wizardField.field.key), {
      definition: wizardField.field,
      subjectId: wizardField.subjectId,
      state: wizardField.state,
      candidates: wizardField.candidates,
    });
  }
  return {
    projectId: state.projectId,
    fields,
    subjectOf: (fieldKey) => state.fields.get(fieldKey)?.subjectId,
    closedGates,
    datasets: engine.datasets,
    author,
  };
}

/** The candidates a run produced (a figure or an incomplete total). None while no production body exists. */
export function producedCandidates(run: EngineRun): EngineCandidate[] {
  return run.outputs.flatMap((output) => (output.kind === 'not_available' ? [] : [output.candidate]));
}

/** Makes the system's service account a member of the project, in the owner's request (as an upload does: ADR 0013). */
export async function ensureEngineMember(request: Request, projectId: string, accountId: string): Promise<void> {
  await lockProjectMembership(request);
  const members = await readVisibleAccounts(request);
  if (!members.some((account) => account.id === accountId)) await addProjectMember(request, { projectId, userId: accountId });
}

/**
 * The engine's earlier values of an output field that nothing superseded or withdrew yet (the engine supersedes them
 * when it writes a new one: 2.4, "Recalculation"), read from the stored events, not from a derived state (a TEST
 * formula's value is refused by the production derive, G1-16, and is still the engine's to supersede).
 */
export function earlierEngineValues(state: ProjectState): (subjectId: string, fieldKey: string) => readonly string[] {
  return (subjectId, fieldKey) => {
    const field = state.fields.get(fieldKey);
    if (field === undefined || field.subjectId !== subjectId) return [];
    const ended = new Set(field.candidateEvents.filter((event) => event.type === 'superseded' || event.type === 'withdrawn').map((event) => event.candidateId));
    return field.candidates.filter((candidate) => (candidate.source === 'calculated' || candidate.source === 'estimated') && !ended.has(candidate.id)).map((candidate) => candidate.id);
  };
}

/**
 * Writes the candidates a run produced in a request that already holds the project's write lock, as the system's
 * service account (2.1; the store's guard SVX11), each on the output field its formula names, and supersedes every
 * earlier engine value of that field the request reads (2.4, "When any input's active candidate changes, the engine
 * appends a new calculated candidate and supersedes the old one"; a system event the store allows on a calculated or
 * estimated value only, SVX13). A candidate on a field the registry does not declare is refused (the engine never
 * writes one: ADR 0047 decision 5).
 */
export async function writeEngineCandidatesIn(
  request: Request,
  registry: ApiRegistry,
  accountId: string,
  candidates: readonly EngineCandidate[],
  earlier: (subjectId: string, fieldKey: string) => readonly string[],
): Promise<void> {
  for (const candidate of candidates) {
    const field = registry.fieldByKey.get(candidate.fieldKey);
    if (field === undefined) throw new Error('the engine produced a candidate on a field the registry does not declare');
    const written = await insertCandidate(request, { ...candidate, createdBy: accountId }, field);
    if (written.outcome !== 'stored') throw new Error(`the store refused the engine's candidate (${written.refusal})`);
    for (const old of earlier(candidate.subjectId, candidate.fieldKey)) {
      await appendCandidateEvent(request, { candidateId: old, type: 'superseded', by: accountId, role: 'system', reason: 'recalculated' });
    }
  }
}

/**
 * The owner's Generate: writes the candidates a run produced in the system's own request (2.1), under the project's
 * write lock (ADR 0048 decision 1), so no other writer of the project runs between the read and the writes. The earlier
 * engine values are read again in that request, after the lock: a value another Generate wrote since this run read
 * the project is superseded too, so each output field keeps one engine value that nothing ended (2.4; rule 4; G4-47).
 */
export async function writeEngineCandidates(
  store: Store,
  registry: ApiRegistry,
  scope: { readonly projectId: string; readonly accountId: string },
  candidates: readonly EngineCandidate[],
): Promise<void> {
  if (candidates.length === 0) return;
  const requestScope = { userId: scope.accountId, projectId: scope.projectId };
  await withRequest(store, requestScope, async (request) => {
    await lockProjectWrites(request);
    const state = await readProjectState(request, requestScope, registry);
    await writeEngineCandidatesIn(request, registry, scope.accountId, candidates, earlierEngineValues(state));
  });
}
