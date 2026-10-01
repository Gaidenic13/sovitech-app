/**
 * Reading the store for the domain. State is never stored: callers derive it
 * with the domain's derive and deriveAssetRegister from what these return
 * (guardrails 2.4, "Derived, never stored"). Every read runs in a request, and
 * row-level security shows it only the project in scope.
 */
import type { Selectable } from 'kysely';
import {
  documentStatuses,
  type AppRole,
  type AssetAppearance,
  type AssetIdentity,
  type Candidate,
  type CandidateEvent,
  type DeriveContext,
  type DeriveEvents,
  type DocumentEvent,
  type DocumentRecord,
  type DocumentStatuses,
  type Evidence,
  type FieldEvent,
  type GuardrailEventType,
  type ProposedAssetEvent,
} from '@sovitech/domain';
import { ifcEvidenceByOwner } from './ifc-reads';
import { candidateEventOf, candidateOf, documentEventOf, documentRecordOf, evidenceOf, fieldEventOf } from './mapping';
import { projectOf, type Request } from './request';
import type { AccountKind, EvidenceLocatorsTable } from './schema';

/** Every document of the project in scope, and every document event of it. */
export interface ProjectDocuments {
  readonly documents: readonly DocumentRecord[];
  readonly events: readonly DocumentEvent[];
}

export async function readProjectDocuments(request: Request): Promise<ProjectDocuments> {
  projectOf(request);
  const [rows, analyses, eventRows] = await Promise.all([
    request.trx.selectFrom('documents').selectAll().orderBy('id').execute(),
    request.trx
      .selectFrom('document_analysis_events')
      .select(['document_id', 'status', 'coverage', 'at', 'id'])
      .orderBy('document_id')
      .orderBy('at', 'desc')
      .orderBy('id', 'desc')
      .execute(),
    request.trx.selectFrom('document_events').selectAll().orderBy('at').orderBy('id').execute(),
  ]);
  const latestAnalysis = new Map<string, { status: (typeof analyses)[number]['status']; coverage: string }>();
  for (const analysis of analyses) {
    if (!latestAnalysis.has(analysis.document_id)) latestAnalysis.set(analysis.document_id, analysis);
  }
  const documents = rows.map((row) => {
    const analysis = latestAnalysis.get(row.id);
    // The store keeps no document without its first analysis event (SVX12, at commit).
    if (analysis === undefined) throw new Error(`document ${row.id} has no analysis event`);
    return documentRecordOf(row, analysis, eventRows);
  });
  return { documents, events: eventRows.map(documentEventOf) };
}

async function evidenceFor(
  request: Request,
  owner: 'candidate_id' | 'appearance_id',
  ids: readonly string[],
): Promise<Map<string, Evidence[]>> {
  const byOwner = new Map<string, Evidence[]>();
  if (ids.length === 0) return byOwner;
  const locators: Selectable<EvidenceLocatorsTable>[] = await request.trx
    .selectFrom('evidence_locators')
    .selectAll()
    .where(owner, 'in', [...ids])
    .orderBy(owner)
    .orderBy('ordinal')
    .execute();
  const excerpts = locators.length === 0
    ? []
    : await request.trx
        .selectFrom('evidence_excerpts')
        .select(['evidence_id', 'text'])
        .where('evidence_id', 'in', locators.map((locator) => locator.id))
        .execute();
  const excerptOf = new Map(excerpts.map((excerpt) => [excerpt.evidence_id, excerpt]));
  for (const locator of locators) {
    const key = locator[owner];
    if (key === null) continue;
    const list = byOwner.get(key) ?? [];
    list.push(evidenceOf(locator, excerptOf.get(locator.id)));
    byOwner.set(key, list);
  }
  // The gated IFC value path's entries (migration 0013; none while `ifc-values` is closed): a
  // candidate or an appearance has 2.4 entries or IFC entries, never both (./ifc-evidence.ts).
  for (const [key, entries] of await ifcEvidenceByOwner(request, owner, ids)) {
    byOwner.set(key, [...(byOwner.get(key) ?? []), ...entries]);
  }
  return byOwner;
}

/** Candidates by id, with their evidence, in the project in scope. */
export async function readCandidates(request: Request, ids: readonly string[]): Promise<Candidate[]> {
  if (ids.length === 0) return [];
  const rows = await request.trx.selectFrom('candidates').selectAll().where('id', 'in', [...ids]).orderBy('id').execute();
  const evidence = await evidenceFor(request, 'candidate_id', rows.map((row) => row.id));
  return rows.map((row) => candidateOf(row, evidence.get(row.id) ?? []));
}

/** What derive needs for one field on one subject, besides the registry's lookups. */
export interface FieldInputs {
  readonly subjectId: string;
  readonly fieldKey: string;
  readonly candidates: readonly Candidate[];
  /** The field's candidate and field events, and every document event of the project (DeriveEvents). */
  readonly events: DeriveEvents;
  /** Every document of the project, for the stage order and declared revisions. */
  readonly documents: readonly DocumentRecord[];
}

export async function readFieldInputs(
  request: Request,
  field: { readonly subjectId: string; readonly fieldKey: string },
): Promise<FieldInputs> {
  projectOf(request);
  const rows = await request.trx
    .selectFrom('candidates')
    .selectAll()
    .where('subject_id', '=', field.subjectId)
    .where('field_key', '=', field.fieldKey)
    .orderBy('id')
    .execute();
  const ids = rows.map((row) => row.id);
  const [evidence, candidateEvents, fieldEvents, projectDocuments] = await Promise.all([
    evidenceFor(request, 'candidate_id', ids),
    ids.length === 0
      ? Promise.resolve([])
      : request.trx.selectFrom('candidate_events').selectAll().where('candidate_id', 'in', ids).orderBy('at').orderBy('id').execute(),
    request.trx
      .selectFrom('field_events')
      .selectAll()
      .where('subject_id', '=', field.subjectId)
      .where('field_key', '=', field.fieldKey)
      .orderBy('at')
      .orderBy('id')
      .execute(),
    readProjectDocuments(request),
  ]);
  return {
    subjectId: field.subjectId,
    fieldKey: field.fieldKey,
    candidates: rows.map((row) => candidateOf(row, evidence.get(row.id) ?? [])),
    events: {
      candidate: candidateEvents.map(candidateEventOf),
      field: fieldEvents.map(fieldEventOf),
      document: projectDocuments.events,
    },
    documents: projectDocuments.documents,
  };
}

/**
 * What derive needs for every field of the given subjects of the project in scope, read at once
 * (the wizard's step views derive every field of the project and its building on each request;
 * readFieldInputs per field would read the project's documents once per field). Each field's
 * inputs are the same as readFieldInputs gives: its candidates with their evidence, its
 * candidate and field events, and every document and document event of the project.
 */
export interface ProjectFieldInputs {
  readonly documents: readonly DocumentRecord[];
  readonly documentEvents: readonly DocumentEvent[];
  /** The inputs of one field on one subject; empty candidates and events when none is stored. */
  fieldInputs(subjectId: string, fieldKey: string): FieldInputs;
  /** Every (subject, field) pair with a stored candidate or field event, in id order. */
  readonly storedFields: readonly { readonly subjectId: string; readonly fieldKey: string }[];
}

const pairKey = (subjectId: string, fieldKey: string): string => `${subjectId}\u0000${fieldKey}`;

export async function readProjectFieldInputs(request: Request, subjectIds: readonly string[]): Promise<ProjectFieldInputs> {
  projectOf(request);
  const ids = [...new Set(subjectIds)];
  const [rows, fieldEventRows, projectDocuments] = await Promise.all([
    ids.length === 0 ? Promise.resolve([]) : request.trx.selectFrom('candidates').selectAll().where('subject_id', 'in', ids).orderBy('id').execute(),
    ids.length === 0
      ? Promise.resolve([])
      : request.trx.selectFrom('field_events').selectAll().where('subject_id', 'in', ids).orderBy('at').orderBy('id').execute(),
    readProjectDocuments(request),
  ]);
  const candidateIds = rows.map((row) => row.id);
  const [evidence, candidateEventRows] = await Promise.all([
    evidenceFor(request, 'candidate_id', candidateIds),
    candidateIds.length === 0
      ? Promise.resolve([])
      : request.trx.selectFrom('candidate_events').selectAll().where('candidate_id', 'in', candidateIds).orderBy('at').orderBy('id').execute(),
  ]);
  const candidatesByPair = new Map<string, Candidate[]>();
  const pairOfCandidate = new Map<string, string>();
  const stored = new Map<string, { subjectId: string; fieldKey: string }>();
  for (const row of rows) {
    const key = pairKey(row.subject_id, row.field_key);
    const list = candidatesByPair.get(key) ?? [];
    list.push(candidateOf(row, evidence.get(row.id) ?? []));
    candidatesByPair.set(key, list);
    pairOfCandidate.set(row.id, key);
    if (!stored.has(key)) stored.set(key, { subjectId: row.subject_id, fieldKey: row.field_key });
  }
  const candidateEventsByPair = new Map<string, CandidateEvent[]>();
  for (const row of candidateEventRows) {
    const key = pairOfCandidate.get(row.candidate_id);
    if (key === undefined) continue;
    const list = candidateEventsByPair.get(key) ?? [];
    list.push(candidateEventOf(row));
    candidateEventsByPair.set(key, list);
  }
  const fieldEventsByPair = new Map<string, FieldEvent[]>();
  for (const row of fieldEventRows) {
    const key = pairKey(row.subject_id, row.field_key);
    const list = fieldEventsByPair.get(key) ?? [];
    list.push(fieldEventOf(row));
    fieldEventsByPair.set(key, list);
    if (!stored.has(key)) stored.set(key, { subjectId: row.subject_id, fieldKey: row.field_key });
  }
  return {
    documents: projectDocuments.documents,
    documentEvents: projectDocuments.events,
    storedFields: [...stored.values()].sort((a, b) => (a.subjectId === b.subjectId ? a.fieldKey.localeCompare(b.fieldKey) : a.subjectId.localeCompare(b.subjectId))),
    fieldInputs: (subjectId, fieldKey) => {
      const key = pairKey(subjectId, fieldKey);
      return {
        subjectId,
        fieldKey,
        candidates: candidatesByPair.get(key) ?? [],
        events: { candidate: candidateEventsByPair.get(key) ?? [], field: fieldEventsByPair.get(key) ?? [], document: projectDocuments.events },
        documents: projectDocuments.documents,
      };
    },
  };
}

/**
 * A DeriveContext for these inputs: the subject, and the document lookup over
 * every document of the project. The rest (input states, dataset approval, the
 * stage order, registry conditions) comes from the registry and the engine.
 */
export function deriveContextFor(
  inputs: FieldInputs,
  rest: Omit<DeriveContext, 'subjectId' | 'document'>,
): DeriveContext {
  const byId = new Map(inputs.documents.map((document) => [document.id, document]));
  return { ...rest, subjectId: inputs.subjectId, document: (documentId) => byId.get(documentId) };
}

/**
 * The stored identities, appearances and asset events of the project in scope,
 * and the statuses of its documents (from every document event of the project),
 * for deriveAssetRegister. Each appearance carries every evidence entry stored
 * for it, in ordinal order, whichever documents they cite: it stays evidence
 * while any of them cites a document that is not withdrawn or erased (2.3,
 * "Deleting a document": "A candidate or asset with evidence from other active
 * documents keeps that evidence").
 */
export async function readAssetRegisterInputs(request: Request): Promise<{
  readonly projectId: string;
  readonly identities: readonly AssetIdentity[];
  readonly appearances: readonly AssetAppearance[];
  readonly events: readonly ProposedAssetEvent[];
  readonly documents: DocumentStatuses;
}> {
  const projectId = projectOf(request);
  const [identities, appearances, events, projectDocuments] = await Promise.all([
    request.trx.selectFrom('asset_identities').select(['asset_id', 'project_id', 'normalised_tag']).orderBy('asset_id').execute(),
    request.trx.selectFrom('asset_appearances').selectAll().orderBy('id').execute(),
    request.trx.selectFrom('asset_events').selectAll().orderBy('at').orderBy('id').execute(),
    readProjectDocuments(request),
  ]);
  const recordOf = new Map(projectDocuments.documents.map((document) => [document.id, document]));
  const documents = documentStatuses(projectDocuments.events, (documentId) => recordOf.get(documentId));
  const evidence = await evidenceFor(request, 'appearance_id', appearances.map((row) => row.id));
  return {
    projectId,
    identities: identities.map((row) => ({ assetId: row.asset_id, projectId: row.project_id, normalisedTag: row.normalised_tag })),
    appearances: appearances.map((row) => {
      const entries = evidence.get(row.id) ?? [];
      // The store keeps no appearance without evidence (SVX03, at commit).
      if (entries.length === 0) throw new Error(`appearance ${row.id} has no evidence`);
      return {
        id: row.id,
        projectId: row.project_id,
        ...(row.tag_as_written === null ? {} : { tagAsWritten: row.tag_as_written }),
        evidence: entries,
      };
    }),
    events: events.map((row) => ({
      assetId: row.asset_id,
      type: row.type,
      relatedAssetIds: row.related_asset_ids,
      by: row.actor,
      role: row.role,
      at: row.at,
      reason: row.reason,
    })),
    documents,
  };
}

/**
 * The app roles a user holds now (derived from the grant and revoke events), as
 * the request may read them: its own user's, or a member's of the project in
 * scope (the request view of 0006; rule 13, project boundary). Any other user
 * reads as holding none.
 */
export async function readUserRoles(request: Request, userId: string): Promise<AppRole[]> {
  const rows = await request.trx
    .selectFrom('request_account_roles')
    .select('role')
    .where('user_id', '=', userId)
    .orderBy('role')
    .execute();
  return rows.map((row) => row.role);
}

/** An account as the request may read it: its own, or a member's of the project in scope. */
export interface VisibleAccount {
  readonly id: string;
  readonly displayName: string;
  readonly kind: AccountKind;
}

/** The request's own account and the members of the project in scope (0006). */
export async function readVisibleAccounts(request: Request): Promise<VisibleAccount[]> {
  const rows = await request.trx.selectFrom('request_accounts').select(['id', 'display_name', 'kind']).orderBy('id').execute();
  return rows.map((row) => ({ id: row.id, displayName: row.display_name, kind: row.kind }));
}

/**
 * The guardrail events of one type in the project in scope (section 8), oldest first: codes and ids
 * only, never document text (rule 13). The wizard reads them so that a defect it logs on every
 * rendering of a screen (a confirmation over the budget) is logged once per field.
 */
export async function readGuardrailEvents(
  request: Request,
  type: GuardrailEventType,
): Promise<readonly { readonly id: string; readonly subjectId: string | null; readonly fieldKey: string | null; readonly reason: string | null; readonly at: string }[]> {
  projectOf(request);
  const rows = await request.trx
    .selectFrom('guardrail_events')
    .select(['id', 'subject_id', 'field_key', 'reason', 'at'])
    .where('type', '=', type)
    .orderBy('at')
    .orderBy('id')
    .execute();
  return rows.map((row) => ({ id: row.id, subjectId: row.subject_id, fieldKey: row.field_key, reason: row.reason, at: row.at }));
}
