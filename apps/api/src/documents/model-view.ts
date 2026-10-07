/**
 * A stored IFC model shown as a document: its conversion for viewing, queued, served and erased with it (the viewer
 * step, part 1; the owner's decision of 2026-10-05 on D-03, "1 b", for display only; PRD R-025 under its four
 * conditions: keyed and served after the access check, erased with the document, no text in the scene, and the document
 * named with its stage and revision; docs/build-log.md, "The viewer step", item 3).
 *
 * Nothing here reads the model, and nothing it records is a value: a conversion record holds codes, ids, sizes and
 * times (`model_view_events`, migration 0017), and no candidate, field event, finding, badge, field state or Documents
 * line comes from it (R-022, R-025; G1-30). Documents keeps "Not analysed: IFC model stored, not analysed" for a model
 * converted for viewing (G12-5), and no "Not found in the analysed documents" statement counts it as searched (R-029).
 *
 * Every read and write runs in the requesting user's own request, scoped to the project (row-level security; the
 * store's guards decide who may write which event: SVX20, SVE11).
 */
import {
  appendModelViewEvent,
  modelViewStateOf,
  queueModelView,
  readDocumentFiles,
  readModelViewEvents,
  readProjectDocuments,
  type ModelViewFailure,
  type ModelViewState,
  type Request,
} from '@sovitech/db';
import { documentStatuses, type DocumentRecord, type DocumentStatuses } from '@sovitech/domain';
import { notFound } from '../errors';

/** The project's documents with their derived statuses (as ./service.ts reads them; kept here so neither module imports the other). */
async function projectDocuments(request: Request): Promise<{ readonly documents: readonly DocumentRecord[]; readonly statuses: DocumentStatuses }> {
  const { documents, events } = await readProjectDocuments(request);
  const byId = new Map(documents.map((document) => [document.id, document]));
  return { documents, statuses: documentStatuses(events, (documentId) => byId.get(documentId)) };
}

/** The converted view file and the storey index, as the store keeps them under the hash's `derived/` folder. */
export const VIEW_FILES = { fragments: 'viewer.frag', storeys: 'storeys.json' } as const;

/**
 * Failures of the environment, not of the model: a conversion that ended with one of these is queued again when the
 * worker starts (the image rebuilt, the daemon back, the host's disk mended, the job's own error gone). A model's own
 * failure (`parse_failed`, `no_geometry`, `out_of_memory`, `timed_out`, `output_refused`) is not: the same bytes would
 * fail the same way.
 */
export const RETRIED_AT_START: ReadonlySet<ModelViewFailure> = new Set(['stale_image', 'sandbox_unavailable', 'output_unavailable', 'internal_error']);

/** The project's current IFC models (stored, not withdrawn, erased or superseded), in Documents' order. */
export async function currentModels(request: Request): Promise<readonly DocumentRecord[]> {
  const { documents, statuses } = await projectDocuments(request);
  const models = new Set((await readDocumentFiles(request)).filter((file) => file.format === 'ifc').map((file) => file.documentId));
  return documents.filter((document) => models.has(document.id) && statuses.status(document.id) === 'active');
}

/**
 * An IFC document of the project, not erased, that holds these bytes: `preferred` when it still does, else the first
 * other. A conversion's events name it; undefined when no such document is left (the conversion stores nothing).
 */
export async function modelHolding(request: Request, contentHash: string, preferred?: string): Promise<DocumentRecord | undefined> {
  const { documents, statuses } = await projectDocuments(request);
  const models = new Set((await readDocumentFiles(request)).filter((file) => file.format === 'ifc').map((file) => file.documentId));
  const holding = documents.filter((document) => document.contentHash === contentHash && models.has(document.id) && statuses.status(document.id) !== 'erased');
  return holding.find((document) => document.id === preferred) ?? holding[0];
}

/** The state of the project's conversion of these bytes, derived from its events. */
export async function modelViewState(request: Request, contentHash: string): Promise<ModelViewState> {
  return modelViewStateOf(await readModelViewEvents(request, { contentHash }), contentHash);
}

/**
 * Whether a conversion of bytes in this state is queued: never converted (or its view files went with an earlier
 * document), failed for a reason of the environment (RETRIED_AT_START), or recorded as being prepared. Bytes the
 * project already holds a view of are not converted again (a second document of the same bytes reuses the view), and
 * bytes whose conversion failed on the model itself would fail the same way. Bytes being prepared are queued only when
 * no conversion of them is open (`queueModelView` keeps one open job per project and bytes): a record left reading
 * "being prepared" with nothing running (a worker that could not reach the store to record its end) is queued again
 * at the worker's start, never left so (the review of part 1, V-2 and A-5).
 */
export function conversionWanted(state: ModelViewState): boolean {
  return state.kind === 'none' || state.kind === 'preparing' || (state.kind === 'failed' && RETRIED_AT_START.has(state.code));
}

/**
 * Queues the conversion of a stored IFC model's bytes for viewing when `conversionWanted` says so. Writes the `queued`
 * event with the job, in the caller's request. Returns the job id, or undefined when nothing was queued.
 */
export async function queueConversion(request: Request, input: { readonly documentId: string; readonly contentHash: string; readonly createdBy: string }): Promise<string | undefined> {
  if (!conversionWanted(await modelViewState(request, input.contentHash))) return undefined;
  return queueModelView(request, input);
}

/**
 * The model a view file may be served for: an IFC document of the project in scope that is current (stored, not
 * withdrawn, erased or superseded: US-MODEL-04 AC7) and whose bytes have a `converted` record. Anything else reads as
 * not found, saying nothing of another project (rule 13).
 */
export async function viewableModel(request: Request, documentId: string): Promise<{ readonly contentHash: string }> {
  const model = (await currentModels(request)).find((document) => document.id === documentId);
  if (model === undefined) throw notFound();
  if ((await modelViewState(request, model.contentHash)).kind !== 'converted') throw notFound();
  return { contentHash: model.contentHash };
}

/**
 * Records that a model's view files went with their document (rule 13, "Erasure"; ifc-input 6.2.16): an `erased` event
 * naming the erased document, when the bytes had a conversion record and the last event is not already `erased`. Run in
 * the erasure's request, under the project's write lock, once the files are removed.
 */
export async function recordViewErased(request: Request, input: { readonly documentId: string; readonly contentHash: string; readonly createdBy: string }): Promise<boolean> {
  const events = await readModelViewEvents(request, { contentHash: input.contentHash });
  const latest = events.at(-1);
  if (latest === undefined || latest.type === 'erased') return false;
  await appendModelViewEvent(request, { documentId: input.documentId, contentHash: input.contentHash, type: 'erased', createdBy: input.createdBy });
  return true;
}
