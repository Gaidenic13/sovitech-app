/**
 * The tables of the gated IFC value path (migration 0013), typed for the IFC modules only, and
 * their reads: the IFC evidence entries that reads.ts merges into a candidate's or an appearance's
 * evidence, the register of linked model elements, and the engineer's list of refused values.
 * The writes are in ./ifc-evidence.ts, behind the `ifc-values` gate. While the gate is closed the
 * tables hold no row, and every read here returns nothing.
 */
import { sql, type ColumnType, type Transaction } from 'kysely';
import type { IfcEvidence, IfcEvidenceLocator, IfcEvidencePath } from '@sovitech/domain';
import { projectOf, type Request } from './request';
import type { Database, DatabaseTime } from './schema';

// ---------------------------------------------------------------------------
// The tables (migration 0013), typed for this module only
// ---------------------------------------------------------------------------

interface IfcEvidenceTable {
  id: string;
  project_id: string;
  candidate_id: string | null;
  appearance_id: string | null;
  ordinal: number;
  document_id: string;
  content_hash: string;
  ifc_schema: string;
  global_id: string;
  step_ids: ColumnType<string[], readonly number[], never>;
  path: ColumnType<IfcEvidencePath, string, never>;
  evidence_check: 'text_match';
  created_by: string;
  created_at: DatabaseTime;
}

interface IfcEvidenceExcerptsTable {
  evidence_id: string;
  project_id: string;
  document_id: string;
  content_hash: string;
  text: string;
  erased_at: ColumnType<string | null, never, never>;
  created_by: string;
  created_at: DatabaseTime;
}

/** What a model element became: a level per storey, a zone per space or zone, the building, or an appearance. */
export const IFC_ELEMENT_KINDS = ['building', 'storey', 'space', 'zone', 'element'] as const;
export type IfcElementKind = (typeof IFC_ELEMENT_KINDS)[number];

interface IfcElementsTable {
  id: string;
  project_id: string;
  document_id: string;
  content_hash: string;
  global_id: string;
  step_id: ColumnType<string, number, never>;
  ifc_class: string;
  element_kind: IfcElementKind;
  subject_id: string | null;
  appearance_id: string | null;
  container_global_id: string | null;
  container_step_id: ColumnType<string | null, number | null, never>;
  created_by: string;
  created_at: DatabaseTime;
}

interface IfcValueRefusalsTable {
  id: string;
  project_id: string;
  document_id: string;
  content_hash: string;
  proposal_id: string;
  global_id: string;
  field_key: string;
  step_ids: ColumnType<string[], readonly number[], never>;
  code: string;
  created_by: string;
  created_at: DatabaseTime;
}

export interface IfcTables extends Database {
  ifc_evidence: IfcEvidenceTable;
  ifc_evidence_excerpts: IfcEvidenceExcerptsTable;
  ifc_elements: IfcElementsTable;
  ifc_value_refusals: IfcValueRefusalsTable;
}

export function ifcTrx(request: Request): Transaction<IfcTables> {
  return request.trx as unknown as Transaction<IfcTables>;
}

/** One model element as the value path linked it, only while `ifc-values` reads open: ids and names of classes, never text. */
export interface IfcElementLink {
  readonly documentId: string;
  readonly contentHash: string;
  readonly globalId: string;
  readonly stepId: number;
  readonly ifcClass: string;
  readonly kind: IfcElementKind;
  readonly subjectId?: string;
  readonly appearanceId?: string;
  readonly container?: { readonly globalId: string; readonly stepId: number };
}

/** A value the path refused, for the engineer: the proposal, the element, the statements and a code. Never text. */
export interface IfcValueRefusal {
  readonly documentId: string;
  readonly contentHash: string;
  readonly proposalId: string;
  readonly globalId: string;
  readonly fieldKey: string;
  readonly stepIds: readonly number[];
  readonly code: string;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** The IFC evidence entries of candidates or appearances, by owner, in ordinal order (reads.ts merges them with 2.4's). */
export async function ifcEvidenceByOwner(
  request: Request,
  owner: 'candidate_id' | 'appearance_id',
  ids: readonly string[],
): Promise<Map<string, IfcEvidence[]>> {
  const byOwner = new Map<string, IfcEvidence[]>();
  if (ids.length === 0) return byOwner;
  const trx = ifcTrx(request);
  const rows = await trx
    .selectFrom('ifc_evidence')
    .select(['id', 'candidate_id', 'appearance_id', 'document_id', 'content_hash', 'ifc_schema', 'global_id', 'path', 'evidence_check'])
    .select(sql<number[]>`step_ids::float8[]`.as('step_numbers'))
    .where(owner, 'in', [...ids])
    .orderBy(owner)
    .orderBy('ordinal')
    .execute();
  if (rows.length === 0) return byOwner;
  const excerpts = await trx.selectFrom('ifc_evidence_excerpts').select(['evidence_id', 'text']).where('evidence_id', 'in', rows.map((row) => row.id)).execute();
  const excerptOf = new Map(excerpts.map((excerpt) => [excerpt.evidence_id, excerpt.text]));
  for (const row of rows) {
    const key = row[owner];
    const excerpt = excerptOf.get(row.id);
    if (key === null) continue;
    if (excerpt === undefined) throw new Error(`IFC evidence ${row.id} has no excerpt row`);
    const locator: IfcEvidenceLocator = { schema: row.ifc_schema, globalId: row.global_id, stepIds: row.step_numbers, path: row.path };
    const list = byOwner.get(key) ?? [];
    list.push({ documentId: row.document_id, contentHash: row.content_hash, locator: {}, ifc: locator, excerpt, check: row.evidence_check });
    byOwner.set(key, list);
  }
  return byOwner;
}

/** A linked model element as stored. */
export interface StoredIfcElement extends IfcElementLink {
  readonly id: string;
}

/** The model elements the value path linked, in the project in scope, of one document or of all. */
export async function readIfcElements(request: Request, documentId?: string): Promise<StoredIfcElement[]> {
  projectOf(request);
  let query = ifcTrx(request)
    .selectFrom('ifc_elements')
    .select(['id', 'document_id', 'content_hash', 'global_id', 'ifc_class', 'element_kind', 'subject_id', 'appearance_id', 'container_global_id'])
    .select(sql<number>`step_id::float8`.as('step_number'))
    .select(sql<number | null>`container_step_id::float8`.as('container_step_number'))
    .orderBy('document_id')
    .orderBy('global_id');
  if (documentId !== undefined) query = query.where('document_id', '=', documentId);
  const rows = await query.execute();
  return rows.map((row) => ({
    id: row.id,
    documentId: row.document_id,
    contentHash: row.content_hash,
    globalId: row.global_id,
    stepId: row.step_number,
    ifcClass: row.ifc_class,
    kind: row.element_kind,
    ...(row.subject_id === null ? {} : { subjectId: row.subject_id }),
    ...(row.appearance_id === null ? {} : { appearanceId: row.appearance_id }),
    ...(row.container_global_id === null || row.container_step_number === null
      ? {}
      : { container: { globalId: row.container_global_id, stepId: row.container_step_number } }),
  }));
}

/** The values the path refused, for the engineer, in the project in scope, of one document or of all. */
export async function readIfcValueRefusals(request: Request, documentId?: string): Promise<IfcValueRefusal[]> {
  projectOf(request);
  let query = ifcTrx(request)
    .selectFrom('ifc_value_refusals')
    .select(['document_id', 'content_hash', 'proposal_id', 'global_id', 'field_key', 'code'])
    .select(sql<number[]>`step_ids::float8[]`.as('step_numbers'))
    .orderBy('created_at')
    .orderBy('id');
  if (documentId !== undefined) query = query.where('document_id', '=', documentId);
  const rows = await query.execute();
  return rows.map((row) => ({
    documentId: row.document_id,
    contentHash: row.content_hash,
    proposalId: row.proposal_id,
    globalId: row.global_id,
    fieldKey: row.field_key,
    stepIds: row.step_numbers,
    code: row.code,
  }));
}
