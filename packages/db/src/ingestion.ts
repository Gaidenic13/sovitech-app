/**
 * The store's side of ingestion (prompt 3 section 10, phase 2; migration 0010;
 * docs/adr/0025-document-storage-and-ingestion.md): a document's stored file,
 * its extracted text in bulk, the extractor's findings and the engineer-only
 * record of an IFC model, and the model id of every AI candidate. Appends and
 * reads only; there is no update or delete method here (guardrails 2.4).
 *
 * What these rows hold, and never hold (rule 13, "Logs and error reports never
 * contain document text"; "Isolation"):
 * - `document_files`: the format code detected and the size; the file name is
 *   owner text, kept in `document_texts` under {@link FILE_NAME_PART}, where the
 *   erasure removes it with the rest of the document's text;
 * - `document_findings` and `document_model_records`: codes, ids, class names,
 *   counts and GlobalIds; the authoring tool is header text, kept in
 *   `document_texts` under {@link AUTHORING_TOOL_PART};
 * - `candidate_ai_origins`: a model id.
 * Every row names the request's own user as its writer, and the store refuses
 * the rest (0010, `sovitech_guard.ingestion_record_written`, SVX16 and SVE11).
 */
import { sql } from 'kysely';
import { refusing } from './errors';
import { newId } from './ids';
import { projectOf, type Request } from './request';
import type { StoredFormat } from './schema';

/** The document_texts part holding a document's file name as uploaded (owner text; removed by the erasure). */
export function fileNamePart(documentId: string): string {
  return `file:name:${documentId}`;
}
export const FILE_NAME_PART = 'file:name:<document id>';

/** The document_texts part holding an IFC model's authoring tool as its header writes it. */
export const AUTHORING_TOOL_PART = 'ifc:header:authoring_tool';

/** Records the stored file of a document the request's user registered, in the same request (0010). */
export async function recordDocumentFile(
  request: Request,
  input: { readonly documentId: string; readonly contentHash: string; readonly format: StoredFormat; readonly byteSize: number; readonly createdBy: string },
): Promise<void> {
  const projectId = projectOf(request);
  await refusing(() =>
    request.trx
      .insertInto('document_files')
      .values({
        document_id: input.documentId,
        project_id: projectId,
        content_hash: input.contentHash,
        format: input.format,
        byte_size: input.byteSize,
        created_by: input.createdBy,
      })
      .execute(),
  );
}

/** One part of extracted text (a page, a sheet, a cell) of one content hash. */
export interface TextPart {
  readonly part: string;
  readonly text: string;
}

/** How many parts one INSERT carries. */
const TEXT_BATCH = 500;

/**
 * Stores the extracted text of a content hash, part by part, keyed by project id and
 * content hash (rule 13). The store refuses text for a content hash no document of the
 * project holds (SVX06) or whose every such document is erased (SVE11). Runs in the
 * request's transaction, which is READ COMMITTED (SVE12).
 */
export async function storeDocumentTexts(
  request: Request,
  input: { readonly contentHash: string; readonly parts: readonly TextPart[]; readonly createdBy: string },
): Promise<void> {
  const projectId = projectOf(request);
  for (let start = 0; start < input.parts.length; start += TEXT_BATCH) {
    const batch = input.parts.slice(start, start + TEXT_BATCH);
    await refusing(() =>
      request.trx
        .insertInto('document_texts')
        .values(batch.map((part) => ({ project_id: projectId, content_hash: input.contentHash, part: part.part, text: part.text, created_by: input.createdBy })))
        .execute(),
    );
  }
}

/** The parts of extracted text of one content hash that start with `prefix`, in the project in scope. */
export async function readDocumentTexts(request: Request, contentHash: string, prefix: string): Promise<TextPart[]> {
  projectOf(request);
  const rows = await request.trx
    .selectFrom('document_texts')
    .select(['part', 'text'])
    .where('content_hash', '=', contentHash)
    .where(sql<boolean>`starts_with(part, ${prefix})`)
    .orderBy('part')
    .execute();
  return rows.map((row) => ({ part: row.part, text: row.text }));
}

/** One part of extracted text of one content hash, if the project in scope holds it. */
export async function readDocumentText(request: Request, contentHash: string, part: string): Promise<string | undefined> {
  projectOf(request);
  const row = await request.trx
    .selectFrom('document_texts')
    .select('text')
    .where('content_hash', '=', contentHash)
    .where('part', '=', part)
    .executeTakeFirst();
  return row?.text;
}

/** A rule 14 finding as the extractor reported it: a kind, a code and a locator (the contract's Finding). */
export interface StoredFinding {
  readonly id: string;
  readonly documentId: string;
  readonly contentHash: string;
  readonly kind: 'embedded_instruction' | 'hidden_text' | 'schema_error' | 'hidden_content';
  readonly code: string;
  readonly locator: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
}

export async function recordDocumentFinding(
  request: Request,
  input: Omit<StoredFinding, 'id' | 'createdAt'> & { readonly id?: string; readonly createdBy: string },
): Promise<string> {
  const projectId = projectOf(request);
  const id = input.id ?? newId();
  await refusing(() =>
    request.trx
      .insertInto('document_findings')
      .values({
        id,
        project_id: projectId,
        document_id: input.documentId,
        content_hash: input.contentHash,
        kind: input.kind,
        code: input.code,
        locator: JSON.stringify(input.locator),
        created_by: input.createdBy,
      })
      .execute(),
  );
  return id;
}

export async function readDocumentFindings(request: Request, documentId: string): Promise<StoredFinding[]> {
  projectOf(request);
  const rows = await request.trx
    .selectFrom('document_findings')
    .selectAll()
    .where('document_id', '=', documentId)
    .orderBy('created_at')
    .orderBy('id')
    .execute();
  return rows.map((row) => ({
    id: row.id,
    documentId: row.document_id,
    contentHash: row.content_hash,
    kind: row.kind,
    code: row.code,
    locator: row.locator,
    createdAt: row.created_at,
  }));
}

/** The engineer-only record of an IFC model (PRD R-023): codes, ids and counts only. */
export interface StoredModelRecord {
  readonly id: string;
  readonly documentId: string;
  readonly contentHash: string;
  readonly ifcSchema: string;
  readonly ifcProjectGlobalId?: string;
  readonly classesPresent: readonly string[];
  readonly processing: 'complete' | 'partial' | 'failed';
  readonly schemaCheck: { readonly tool: string; readonly version: string; readonly outcome: 'no_problems' | 'problems' | 'not_run' };
  /** The contract's IdsResults: the IDS reference, the tool, and per specification its id, outcome, counts and failing GlobalIds. */
  readonly idsResults?: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
}

export async function recordModelRecord(
  request: Request,
  input: Omit<StoredModelRecord, 'id' | 'createdAt'> & { readonly id?: string; readonly createdBy: string },
): Promise<string> {
  const projectId = projectOf(request);
  const id = input.id ?? newId();
  await refusing(() =>
    request.trx
      .insertInto('document_model_records')
      .values({
        id,
        project_id: projectId,
        document_id: input.documentId,
        content_hash: input.contentHash,
        ifc_schema: input.ifcSchema,
        ifc_project_global_id: input.ifcProjectGlobalId ?? null,
        classes_present: [...input.classesPresent],
        processing: input.processing,
        schema_check_tool: input.schemaCheck.tool,
        schema_check_version: input.schemaCheck.version,
        schema_check_outcome: input.schemaCheck.outcome,
        ids_results: input.idsResults === undefined ? null : JSON.stringify(input.idsResults),
        created_by: input.createdBy,
      })
      .execute(),
  );
  return id;
}

export async function readModelRecords(request: Request, documentId: string): Promise<StoredModelRecord[]> {
  projectOf(request);
  const rows = await request.trx
    .selectFrom('document_model_records')
    .selectAll()
    .where('document_id', '=', documentId)
    .orderBy('created_at', 'desc')
    .orderBy('id', 'desc')
    .execute();
  return rows.map((row) => ({
    id: row.id,
    documentId: row.document_id,
    contentHash: row.content_hash,
    ifcSchema: row.ifc_schema,
    ...(row.ifc_project_global_id === null ? {} : { ifcProjectGlobalId: row.ifc_project_global_id }),
    classesPresent: row.classes_present,
    processing: row.processing,
    schemaCheck: { tool: row.schema_check_tool, version: row.schema_check_version, outcome: row.schema_check_outcome },
    ...(row.ids_results === null ? {} : { idsResults: row.ids_results }),
    createdAt: row.created_at,
  }));
}

/** Records the model id with a candidate the AI proposed, in the request that wrote the candidate (0010). */
export async function recordCandidateAiOrigin(
  request: Request,
  input: { readonly candidateId: string; readonly modelId: string; readonly createdBy: string },
): Promise<void> {
  const projectId = projectOf(request);
  await refusing(() =>
    request.trx
      .insertInto('candidate_ai_origins')
      .values({ candidate_id: input.candidateId, project_id: projectId, model_id: input.modelId, created_by: input.createdBy })
      .execute(),
  );
}

/** The model ids of candidates, by candidate id, in the project in scope. */
export async function readCandidateAiOrigins(request: Request, candidateIds: readonly string[]): Promise<Map<string, string>> {
  projectOf(request);
  if (candidateIds.length === 0) return new Map();
  const rows = await request.trx
    .selectFrom('candidate_ai_origins')
    .select(['candidate_id', 'model_id'])
    .where('candidate_id', 'in', [...candidateIds])
    .execute();
  return new Map(rows.map((row) => [row.candidate_id, row.model_id]));
}

/** A document's stored file, as recorded at registration. */
export interface StoredFile {
  readonly documentId: string;
  readonly contentHash: string;
  readonly format: StoredFormat;
  /** Bytes, as text: an int8 column reads back as a string, and a size is never a value of the value model. */
  readonly byteSize: string;
}

export async function readDocumentFiles(request: Request): Promise<StoredFile[]> {
  projectOf(request);
  const rows = await request.trx.selectFrom('document_files').selectAll().orderBy('document_id').execute();
  return rows.map((row) => ({ documentId: row.document_id, contentHash: row.content_hash, format: row.format, byteSize: row.byte_size }));
}
