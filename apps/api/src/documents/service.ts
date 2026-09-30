/**
 * Documents in a project: registration after an upload, the owner's list, the
 * erasure job, declared revisions, and the engineer-only record of a model
 * (guardrails 2.3, rule 12, rule 13; F-INGEST-02, F-INGEST-03, F-INGEST-06,
 * F-INGEST-07, F-INGEST-08, F-IFC-01; PRD R-013, R-014, R-016, R-022, R-023;
 * docs/adr/0025-document-storage-and-ingestion.md).
 *
 * Every read and write runs in the requesting user's own request, scoped to the
 * project (row-level security; the store's guards decide what that user may write).
 */
import {
  addProjectMember,
  appendDocumentEvent,
  cancelQueuedAnalysis,
  deleteUploadSession,
  enqueueAnalysis,
  eraseDocument,
  fileNamePart,
  projectVisible,
  readDocumentFiles,
  readDocumentFindings,
  readDocumentText,
  readModelRecords,
  readProjectDocuments,
  readVisibleAccounts,
  recordDocumentFile,
  registerDocument,
  requestActsAs,
  storeDocumentTexts,
  withRequest,
  AUTHORING_TOOL_PART,
  type Request,
  type RequestScope,
  type StoredFinding,
  type StoredFormat,
  type StoredModelRecord,
  type UploadSession,
} from '@sovitech/db';
import { documentStatuses, type DocumentRecord, type DocumentStage, type DocumentStatuses } from '@sovitech/domain';
import { ApiRefusal, forbidden, notFound } from '../errors';
import type { ApiServices } from '../services';
import { formatCoverage, statusLineOf, type DocumentStatusLine } from './coverage';
import { routingOf } from './formats';
import { readsModels, type ModelReadingServices } from './model-reading';

/** Runs `work` in the user's own request on a project that user may see; any other project reads as not found. */
export async function inProject<T>(services: Pick<ApiServices, 'store'>, scope: Required<RequestScope>, work: (request: Request) => Promise<T>): Promise<T> {
  return withRequest(services.store, scope, async (request) => {
    if (!(await projectVisible(request))) throw notFound();
    return work(request);
  });
}

/** Refuses unless the request's user acts as the owner in the project (a member holding `owner`). */
export async function requireOwner(request: Request): Promise<void> {
  if (!(await requestActsAs(request, 'owner'))) throw forbidden('owner_only');
}

/** The project's documents with their derived statuses (2.3: derived from the document events, never stored). */
export async function projectDocuments(request: Request): Promise<{ readonly documents: readonly DocumentRecord[]; readonly statuses: DocumentStatuses }> {
  const { documents, events } = await readProjectDocuments(request);
  const byId = new Map(documents.map((document) => [document.id, document]));
  return { documents, statuses: documentStatuses(events, (documentId) => byId.get(documentId)) };
}

// ---------------------------------------------------------------------------
// Registration (F-INGEST-02, F-INGEST-03)
// ---------------------------------------------------------------------------

/**
 * Registers a complete, accepted upload in the owner's request: the `DocumentRecord`
 * with its first analysis event, the stored file, the file name (owner text, kept with
 * the document's text so the erasure removes it), and, for a file the extractor reads,
 * its analysis job, with the extraction service account made a member of the project
 * by the owner. The upload session goes in the same transaction.
 *
 * - Kind: the record's `kind` has no unknown value (2.3); `other` is recorded until a
 *   classification is stored, and is never shown as the document's kind (the product doc
 *   issue in the build log). Stage `unknown`, no revision: code sets neither from the file
 *   name (2.3; R-022).
 * - Status: `queued` with coverage `pending` for a file the extractor analyses;
 *   `stored_only` naming its file type (G12-1) for every other, an IFC model included
 *   (G12-5).
 * - An IFC model queues no reader job: until the owner decides D-01, no model is read
 *   (PRD R-023, R-024 "Until decided"; ./model-reading.ts). Only a test's switch queues it.
 */
export async function registerUpload(
  services: Pick<ApiServices, 'extractionAccountId'> & ModelReadingServices,
  request: Request,
  input: { readonly session: UploadSession; readonly contentHash: string; readonly byteSize: number },
): Promise<DocumentRecord> {
  const { session, contentHash } = input;
  const routing = routingOf(session.format);
  const analysis =
    routing.kind === 'analyse'
      ? { status: 'queued' as const, coverage: formatCoverage({ kind: 'pending' }) }
      : { status: 'stored_only' as const, coverage: formatCoverage({ kind: 'stored', word: routing.word }) };
  const document = await registerDocument(request, {
    contentHash,
    kind: 'other',
    stage: 'unknown',
    analysis,
    createdBy: session.userId,
  });
  await recordDocumentFile(request, { documentId: document.id, contentHash, format: session.format, byteSize: input.byteSize, createdBy: session.userId });
  await storeDocumentTexts(request, { contentHash, parts: [{ part: fileNamePart(document.id), text: session.fileName }], createdBy: session.userId });
  if (routing.kind === 'analyse' || (routing.engineerRecord && readsModels(services))) {
    const members = await readVisibleAccounts(request);
    if (!members.some((account) => account.id === services.extractionAccountId)) {
      await addProjectMember(request, { projectId: session.projectId, userId: services.extractionAccountId });
    }
    await enqueueAnalysis(request, { projectId: session.projectId, documentId: document.id, contentHash });
  }
  await deleteUploadSession(request.trx, { id: session.id, projectId: session.projectId, userId: session.userId });
  return document;
}

// ---------------------------------------------------------------------------
// The owner's list (F-INGEST-08)
// ---------------------------------------------------------------------------

/** One row of the owner's document list. No model-check line, schema line, finding or count (R-022; ifc-input 6.2.14). */
export interface OwnerDocumentRow {
  readonly documentId: string;
  /** The file name as uploaded (owner text; a document value the view-model binds). */
  readonly fileName: string | null;
  readonly format: StoredFormat | null;
  /** As recorded; `unknown` until a document states it. */
  readonly stage: DocumentStage;
  /** As written in the title block; absent when none is recorded. */
  readonly revision?: string;
  readonly statusLine: DocumentStatusLine;
}

/** The documents the owner sees: every document not withdrawn or erased, with its 2.8 status line. */
export async function ownerDocumentList(request: Request): Promise<OwnerDocumentRow[]> {
  const { documents, statuses } = await projectDocuments(request);
  const files = new Map((await readDocumentFiles(request)).map((file) => [file.documentId, file]));
  const rows: OwnerDocumentRow[] = [];
  for (const document of documents) {
    const status = statuses.status(document.id);
    if (status === 'withdrawn' || status === 'erased') continue;
    rows.push({
      documentId: document.id,
      fileName: (await readDocumentText(request, document.contentHash, fileNamePart(document.id))) ?? null,
      format: files.get(document.id)?.format ?? null,
      stage: document.stage,
      ...(document.revision === undefined ? {} : { revision: document.revision }),
      statusLine: statusLineOf(document.analysis),
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// The engineer's view of a model (R-023, R-024; stricter choice for ifc-input 6.2.14)
// ---------------------------------------------------------------------------

export interface EngineerDocumentRecord {
  readonly documentId: string;
  readonly format: StoredFormat | null;
  /** The latest engineer-only record of the model: codes, ids and counts (none before the extractor reads it). */
  readonly modelRecord: (StoredModelRecord & { readonly authoringTool?: string }) | null;
  readonly findings: readonly StoredFinding[];
}

/**
 * The engineer's record of a document: the model's header, schema check and IDS results
 * as stored (spec ids, counts, failing GlobalIds; never report text), and the rule 14
 * findings. Only a person holding `sovitech_engineer` reads it; the owner's screens never
 * show a model-check line (R-022; the stricter choice ifc-input 6.2.14 would make a rule).
 */
export async function engineerDocumentRecord(request: Request, documentId: string): Promise<EngineerDocumentRecord> {
  if (!(await requestActsAs(request, 'sovitech_engineer'))) throw forbidden('engineer_only');
  const { documents } = await projectDocuments(request);
  const document = documents.find((candidate) => candidate.id === documentId);
  if (document === undefined) throw notFound();
  const files = await readDocumentFiles(request);
  const [latest] = await readModelRecords(request, documentId);
  const authoringTool = latest === undefined ? undefined : await readDocumentText(request, document.contentHash, AUTHORING_TOOL_PART);
  return {
    documentId,
    format: files.find((file) => file.documentId === documentId)?.format ?? null,
    modelRecord: latest === undefined ? null : { ...latest, ...(authoringTool === undefined ? {} : { authoringTool }) },
    findings: await readDocumentFindings(request, documentId),
  };
}

// ---------------------------------------------------------------------------
// Declared revisions (F-INGEST-06; G4-13, G4-14)
// ---------------------------------------------------------------------------

/**
 * Declares one document a revision of another, by the owner or an engineer in their own
 * name (2.3: "Revisions are declared, never guessed"). The superseded status and the
 * supersession of the older values are derived (derive; G4-13, G4-14).
 */
export async function declareRevision(request: Request, input: { readonly userId: string; readonly documentId: string; readonly revisionOf: string }): Promise<void> {
  const role = (await requestActsAs(request, 'owner')) ? 'owner' : (await requestActsAs(request, 'sovitech_engineer')) ? 'sovitech_engineer' : undefined;
  if (role === undefined) throw forbidden('owner_or_engineer_only');
  const { documents, statuses } = await projectDocuments(request);
  for (const id of [input.documentId, input.revisionOf]) {
    const status = documents.some((document) => document.id === id) ? statuses.status(id) : undefined;
    if (status === undefined || status === 'withdrawn' || status === 'erased') throw notFound();
  }
  if (input.documentId === input.revisionOf) throw new ApiRefusal(422, 'revision_of_itself');
  await appendDocumentEvent(request, { documentId: input.documentId, type: 'declared_revision_of', revisionOf: input.revisionOf, by: input.userId, role });
}

// ---------------------------------------------------------------------------
// Deletion: the one audited erasure job (F-INGEST-07; rule 13 "Erasure"; G13-3)
// ---------------------------------------------------------------------------

export interface DeletionReport {
  readonly documentId: string;
  readonly contentHash: string;
  /** Another document of the project holds the same bytes and is not erased: its file, text and derived files stay (US-DOCS-21 AC8). */
  readonly filesKeptForAnotherDocument: boolean;
}

/**
 * Deletes a document on its owner's request: the owner's `withdrawn` event (2.3,
 * "Deleting a document") and the audited erasure in the same request (rule 13: the
 * excerpts become "[erased]", the extracted text and the file name go, the erased event,
 * the values only this document supports withdrawn with their ids and values kept), the
 * document's queued analyses cancelled; then, once that has committed, every file keyed to
 * its content hash in the project, the original, derived files and job folders, unless
 * another document of the project holds the same bytes. Nothing is left keyed to the
 * erased hash (the stricter choice ifc-input 6.2.16 would make a rule).
 */
export async function deleteDocument(
  services: Pick<ApiServices, 'store' | 'files' | 'log'>,
  scope: Required<RequestScope>,
  documentId: string,
): Promise<DeletionReport> {
  const report = await inProject(services, scope, async (request) => {
    await requireOwner(request);
    const { documents, statuses } = await projectDocuments(request);
    const document = documents.find((candidate) => candidate.id === documentId);
    if (document === undefined) throw notFound();
    const status = statuses.status(documentId);
    if (status !== 'erased') {
      if (status !== 'withdrawn') {
        await appendDocumentEvent(request, { documentId, type: 'withdrawn', by: scope.userId, role: 'owner', reason: 'owner_deleted_document' });
      }
      await eraseDocument(request, { documentId, role: 'owner', reason: 'owner_deleted_document' });
    }
    await cancelQueuedAnalysis(request.trx, { projectId: scope.projectId, documentId });
    const twin = documents.some(
      (other) => other.id !== documentId && other.contentHash === document.contentHash && statuses.status(other.id) !== 'erased',
    );
    return { documentId, contentHash: document.contentHash, filesKeptForAnotherDocument: twin };
  });
  if (!report.filesKeptForAnotherDocument) {
    await services.files.removeHash(scope.projectId, report.contentHash);
    const left = await services.files.filesKeyedTo(scope.projectId, report.contentHash);
    if (left.length > 0) {
      services.log({ event: 'erasure_files_left', code: 'files_left', projectId: scope.projectId, documentId });
      throw new ApiRefusal(409, 'erasure_files_left');
    }
  }
  services.log({ event: 'document_erased', projectId: scope.projectId, documentId });
  return report;
}

/**
 * Removes every content-hash folder of the project that no document of the project, not
 * erased, holds: bytes promoted by an upload whose registration never committed, or left by
 * an erasure interrupted after its commit. Run in any request scoped to the project.
 */
export async function removeUnheldFiles(services: Pick<ApiServices, 'files'>, request: Request, projectId: string): Promise<readonly string[]> {
  const { documents, statuses } = await projectDocuments(request);
  const held = new Set(documents.filter((document) => statuses.status(document.id) !== 'erased').map((document) => document.contentHash));
  const removed: string[] = [];
  for (const contentHash of await services.files.hashesOf(projectId)) {
    if (held.has(contentHash)) continue;
    await services.files.removeHash(projectId, contentHash);
    removed.push(contentHash);
  }
  return removed;
}

/** Whether a project may download a document's original: it is the project's, and not erased. */
export async function downloadableDocument(request: Request, documentId: string): Promise<{ readonly contentHash: string; readonly fileName: string | null }> {
  const { documents, statuses } = await projectDocuments(request);
  const document = documents.find((candidate) => candidate.id === documentId);
  if (document === undefined) throw notFound();
  const status = statuses.status(documentId);
  if (status === 'erased' || status === 'withdrawn') throw notFound();
  return { contentHash: document.contentHash, fileName: (await readDocumentText(request, document.contentHash, fileNamePart(documentId))) ?? null };
}
