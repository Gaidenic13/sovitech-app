/**
 * Appending to the store. There is no update or delete method here or anywhere
 * in this package (guardrails 2.4: "Storage has no update or delete method for
 * candidates"); the database refuses both for every role in any case.
 *
 * Every write runs in a request (request.ts), in its project. The database sets
 * every time. Ids are UUIDv7, generated here when the caller gives none.
 */
import { sql } from 'kysely';
import {
  assetEventRefusal,
  deriveAssetRegister,
  normaliseTag,
  planAssetIdentity,
  type AssetEvent,
  type AssetEventRefusal,
  type Candidate,
  type CandidateEvent,
  type CandidateEventType,
  type DocumentAnalysisStatus,
  type DocumentEvent,
  type DocumentKind,
  type DocumentRecord,
  type DocumentStage,
  type Evidence,
  type FieldEvent,
  type GuardrailEventType,
  type ProposedAssetEvent,
  type Quantity,
  type Subject,
  type SubjectKind,
} from '@sovitech/domain';
import { checkQuantityUnit, type UnitCheckedField, type UnitRefusal } from '@sovitech/registry';
import { constraintOf, refusing, scrubbed } from './errors';
import { newId } from './ids';
import { candidateEventOf, candidateOf, documentEventOf, documentRecordOf, fieldEventOf, storedQuantityOf } from './mapping';
import { readAssetRegisterInputs } from './reads';
import { projectOf, type Request } from './request';

// ---------------------------------------------------------------------------
// Subjects and documents
// ---------------------------------------------------------------------------

export async function createSubject(
  request: Request,
  input: { readonly id?: string; readonly kind: Exclude<SubjectKind, 'project'>; readonly createdBy: string },
): Promise<Subject> {
  const projectId = projectOf(request);
  const id = input.id ?? newId();
  await refusing(() =>
    request.trx.insertInto('subjects').values({ id, project_id: projectId, kind: input.kind, created_by: input.createdBy }).execute(),
  );
  return { id, projectId, kind: input.kind };
}

export interface NewDocument {
  readonly id?: string;
  readonly contentHash: string;
  readonly kind: DocumentKind;
  readonly stage: DocumentStage;
  readonly revision?: string;
  readonly issueDate?: string;
  /** A revision code proposed from the title block (2.3); it counts only once the owner or an engineer declares it. */
  readonly supersedesProposed?: string;
  readonly analysis: { readonly status: DocumentAnalysisStatus; readonly coverage: string };
  readonly createdBy: string;
}

/** Registers a document: its subject, its record and its first analysis event (2.3). */
export async function registerDocument(request: Request, input: NewDocument): Promise<DocumentRecord> {
  const projectId = projectOf(request);
  const id = input.id ?? newId();
  return refusing(async () => {
    await request.trx.insertInto('subjects').values({ id, project_id: projectId, kind: 'document', created_by: input.createdBy }).execute();
    const row = await request.trx
      .insertInto('documents')
      .values({
        id,
        project_id: projectId,
        content_hash: input.contentHash,
        kind: input.kind,
        stage: input.stage,
        revision: input.revision ?? null,
        issue_date: input.issueDate ?? null,
        supersedes_proposed: input.supersedesProposed ?? null,
        created_by: input.createdBy,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    await request.trx
      .insertInto('document_analysis_events')
      .values({
        id: newId(),
        project_id: projectId,
        document_id: id,
        status: input.analysis.status,
        coverage: input.analysis.coverage,
        actor: input.createdBy,
      })
      .execute();
    return documentRecordOf(row, input.analysis, []);
  });
}

/** Records a new analysis status and coverage for a document (rule 12: recorded by code). */
export async function recordDocumentAnalysis(
  request: Request,
  input: {
    readonly id?: string;
    readonly documentId: string;
    readonly status: DocumentAnalysisStatus;
    readonly coverage: string;
    readonly actor: string;
  },
): Promise<void> {
  const projectId = projectOf(request);
  await refusing(() =>
    request.trx
      .insertInto('document_analysis_events')
      .values({
        id: input.id ?? newId(),
        project_id: projectId,
        document_id: input.documentId,
        status: input.status,
        coverage: input.coverage,
        actor: input.actor,
      })
      .execute(),
  );
}

/**
 * A declared revision or a withdrawal (2.3). An erased event is written only by
 * the erasure function (guarded.ts, eraseDocument). The owner and an engineer
 * withdraw a document in their own name; the system withdraws one only as the job
 * carrying out such a person's withdrawal, whose id it names in `requestEventId`
 * (0002, 0009 SVX15).
 */
export type NewDocumentEvent = Omit<DocumentEvent, 'at' | 'type' | 'id' | 'requestEventId'> & { readonly id?: string } & (
    | { readonly type: 'declared_revision_of'; readonly revisionOf: string }
    | { readonly type: 'withdrawn'; readonly requestEventId?: string }
  );

export async function appendDocumentEvent(request: Request, event: NewDocumentEvent): Promise<DocumentEvent> {
  const projectId = projectOf(request);
  const row = await refusing(() =>
    request.trx
      .insertInto('document_events')
      .values({
        id: event.id ?? newId(),
        project_id: projectId,
        document_id: event.documentId,
        type: event.type,
        revision_of_document_id: event.type === 'declared_revision_of' ? event.revisionOf : null,
        actor: event.by,
        role: event.role,
        reason: event.reason ?? null,
        request_event_id: event.type === 'withdrawn' ? (event.requestEventId ?? null) : null,
      })
      .returningAll()
      .executeTakeFirstOrThrow(),
  );
  return documentEventOf(row);
}

/** Extracted text of a document, keyed by project id and content hash (rule 13). */
export async function storeDocumentText(
  request: Request,
  input: { readonly contentHash: string; readonly part: string; readonly text: string; readonly createdBy: string },
): Promise<void> {
  const projectId = projectOf(request);
  await refusing(() =>
    request.trx
      .insertInto('document_texts')
      .values({ project_id: projectId, content_hash: input.contentHash, part: input.part, text: input.text, created_by: input.createdBy })
      .execute(),
  );
}

// ---------------------------------------------------------------------------
// Candidates, evidence and events
// ---------------------------------------------------------------------------

/** A candidate before the store sets its time. */
/**
 * A candidate to store. The store sets `createdAt` and `authorRole` (the role its author acted
 * in, from the request: 0009's guard), so the caller names neither.
 */
export type NewCandidate = Omit<Candidate, 'createdAt' | 'authorRole'>;

/** Why the store refused a candidate's evidence (rule 1 checks 1 and 2, at the store). */
export type EvidenceStoreRefusal = 'document_in_project' | 'content_hash';

export type CandidateWrite =
  | { readonly outcome: 'stored'; readonly candidate: Candidate }
  | {
      readonly outcome: 'rejected';
      readonly refusal: EvidenceStoreRefusal;
      readonly evidenceIndex: number;
      /** The evidence_not_found guardrail event written for it (section 8). */
      readonly guardrailEventId: string;
    }
  | {
      /**
       * The unit check refused the quantity, or one of its alternative readings
       * (2.7: "The validator rejects any candidate whose unit dimension differs
       * from its field's dimension"; rule 8; G8-4): a unit outside the closed
       * registry, another dimension, or a quantity on a field that takes none.
       * Nothing is stored.
       */
      readonly outcome: 'refused';
      readonly refusal: UnitRefusal;
      /** Which reading was refused: the quantity, or an alternative by its index. */
      readonly reading: 'quantity' | { readonly alternative: number };
      readonly message: string;
    };

/** The first quantity of a candidate the unit check refuses, if any (the quantity, then each alternative). */
function unitRefusalOf(
  field: UnitCheckedField,
  candidate: NewCandidate,
): Extract<CandidateWrite, { outcome: 'refused' }> | undefined {
  const readings: readonly { readonly reading: 'quantity' | { readonly alternative: number }; readonly quantity: Quantity }[] = [
    ...(candidate.quantity === undefined ? [] : [{ reading: 'quantity' as const, quantity: candidate.quantity }]),
    ...(candidate.alternatives ?? []).map((quantity, alternative) => ({ reading: { alternative }, quantity })),
  ];
  for (const { reading, quantity } of readings) {
    const verdict = checkQuantityUnit(field, quantity);
    if (!verdict.ok) return { outcome: 'refused', refusal: verdict.reason, reading, message: verdict.message };
  }
  return undefined;
}

async function insertEvidence(
  request: Request,
  projectId: string,
  owner: { readonly candidateId: string } | { readonly appearanceId: string },
  evidence: readonly Evidence[],
): Promise<void> {
  for (const [ordinal, entry] of evidence.entries()) {
    const id = newId();
    await request.trx
      .insertInto('evidence_locators')
      .values({
        id,
        project_id: projectId,
        candidate_id: 'candidateId' in owner ? owner.candidateId : null,
        appearance_id: 'appearanceId' in owner ? owner.appearanceId : null,
        ordinal,
        document_id: entry.documentId,
        content_hash: entry.contentHash,
        page: entry.locator.page ?? null,
        sheet: entry.locator.sheet ?? null,
        cell: entry.locator.cell ?? null,
        bbox: entry.locator.bbox === undefined ? null : [...entry.locator.bbox],
        evidence_check: entry.check,
      })
      .execute();
    await request.trx
      .insertInto('evidence_excerpts')
      .values({ evidence_id: id, project_id: projectId, content_hash: entry.contentHash, text: entry.excerpt })
      .execute();
  }
}

/** Which evidence entry the store refused, and why: a document outside the project, or another revision. */
async function evidenceRefusal(
  request: Request,
  evidence: readonly Evidence[],
): Promise<{ readonly refusal: EvidenceStoreRefusal; readonly evidenceIndex: number }> {
  const visible = await request.trx
    .selectFrom('documents')
    .select(['id', 'content_hash'])
    .where('id', 'in', evidence.map((entry) => entry.documentId))
    .execute();
  const hashOf = new Map(visible.map((row) => [row.id, row.content_hash]));
  for (const [index, entry] of evidence.entries()) {
    const hash = hashOf.get(entry.documentId);
    if (hash === undefined) return { refusal: 'document_in_project', evidenceIndex: index };
    if (hash !== entry.contentHash) return { refusal: 'content_hash', evidenceIndex: index };
  }
  throw new Error('the store refused evidence that names documents of this project with their content hashes');
}

/**
 * Stores a candidate of `field` with its evidence (2.4). Candidates never change
 * after this.
 *
 * - The quantity and every alternative reading pass the registry's unit check
 *   against `field` first (2.7, rule 8): a unit outside the closed registry, or
 *   of another dimension, is refused and nothing is stored (`refused`).
 * - Evidence that cites a document of another project, or another revision of a
 *   document, is refused by the store's foreign key; the candidate is not
 *   stored, and one evidence_not_found guardrail event is written instead (rule
 *   13; G13-1 at the store).
 * - The store refuses (StoreRefusal) a candidate whose author is not the
 *   request's own user, or whose source that user may not create (2.1: `user`
 *   from the owner or an engineer, every other source from a service account
 *   that is a member of the project), and evidence citing an erased document
 *   (rule 13). A document candidate without verified evidence, or an
 *   ai_inference candidate without evidence, fails at commit (rule 1).
 */
export async function insertCandidate(request: Request, candidate: NewCandidate, field: UnitCheckedField): Promise<CandidateWrite> {
  const projectId = projectOf(request);
  if (field.key !== candidate.fieldKey) {
    throw new Error(`insertCandidate was handed the field ${field.key} for a candidate of ${candidate.fieldKey}`);
  }
  const unitRefusal = unitRefusalOf(field, candidate);
  if (unitRefusal !== undefined) return unitRefusal;
  await sql`SAVEPOINT sovitech_candidate`.execute(request.trx);
  try {
    const row = await request.trx
      .insertInto('candidates')
      .values({
        id: candidate.id,
        project_id: projectId,
        subject_id: candidate.subjectId,
        field_key: candidate.fieldKey,
        quantity_value: candidate.quantity?.value ?? null,
        quantity_unit: candidate.quantity?.unit ?? null,
        quantity_qualifier: candidate.quantity?.qualifier ?? null,
        quantity_approximate: candidate.quantity?.approximate ?? null,
        choice: candidate.choice ?? null,
        text_value: candidate.text ?? null,
        alternatives: candidate.alternatives === undefined ? null : JSON.stringify(candidate.alternatives.map(storedQuantityOf)),
        source: candidate.source,
        original_text: candidate.original?.text ?? null,
        original_locale: candidate.original?.locale ?? null,
        method_formula_id: candidate.method?.formulaId ?? null,
        method_formula_version: candidate.method?.formulaVersion ?? null,
        method_input_candidate_ids: candidate.method === undefined ? null : [...candidate.method.inputCandidateIds],
        method_unknown_policy: candidate.method?.unknownPolicy ?? null,
        method_assumptions: candidate.method === undefined ? null : [...candidate.method.assumptions],
        reference_dataset: candidate.reference?.dataset ?? null,
        reference_version: candidate.reference?.version ?? null,
        reference_key: candidate.reference?.key ?? null,
        range_low: candidate.range?.low ?? null,
        range_high: candidate.range?.high ?? null,
        confidence: candidate.confidence ?? null,
        created_by: candidate.createdBy,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    await insertEvidence(request, projectId, { candidateId: candidate.id }, candidate.evidence);
    await sql`RELEASE SAVEPOINT sovitech_candidate`.execute(request.trx);
    return { outcome: 'stored', candidate: candidateOf(row, candidate.evidence) };
  } catch (error) {
    await sql`ROLLBACK TO SAVEPOINT sovitech_candidate`.execute(request.trx);
    if (constraintOf(error) !== 'evidence_locators_document_fk') throw scrubbed(error);
    const { refusal, evidenceIndex } = await evidenceRefusal(request, candidate.evidence);
    const subject = await request.trx.selectFrom('subjects').select('id').where('id', '=', candidate.subjectId).executeTakeFirst();
    const guardrailEventId = await appendGuardrailEvent(request, {
      type: 'evidence_not_found',
      ...(subject === undefined ? {} : { subjectId: candidate.subjectId }),
      fieldKey: candidate.fieldKey,
      reason: refusal,
      actor: candidate.createdBy,
    });
    return { outcome: 'rejected', refusal, evidenceIndex, guardrailEventId };
  }
}

/**
 * A candidate event (2.4). engineer_verified is not one of the types here: it
 * is written only by verifyCandidate (guarded.ts), through the database's one
 * guarded function, and the store refuses it from anywhere else.
 */
export type NewCandidateEvent = Omit<CandidateEvent, 'at' | 'type'> & {
  readonly id?: string;
  readonly type: Exclude<CandidateEventType, 'engineer_verified'>;
};

export async function appendCandidateEvent(request: Request, event: NewCandidateEvent): Promise<CandidateEvent> {
  const projectId = projectOf(request);
  const row = await refusing(() =>
    request.trx
      .insertInto('candidate_events')
      .values({
        id: event.id ?? newId(),
        project_id: projectId,
        candidate_id: event.candidateId,
        type: event.type,
        actor: event.by,
        role: event.role,
        reason: event.reason ?? null,
        bulk_id: event.bulkId ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow(),
  );
  return candidateEventOf(row);
}

/**
 * A field event (2.4). A `conflict_resolved` event records why (`reason`) and
 * names the exact candidates the resolution covered, `coveredCandidateIds` (the
 * ones shown to the person who resolved it, the chosen one among them); the
 * store refuses a resolution without either, and any covered id that is not a
 * candidate of this subject and field. No other type carries covered ids.
 */
export type NewFieldEvent = Omit<FieldEvent, 'at'> & { readonly id?: string };

export async function appendFieldEvent(request: Request, event: NewFieldEvent): Promise<FieldEvent> {
  const projectId = projectOf(request);
  const row = await refusing(() =>
    request.trx
      .insertInto('field_events')
      .values({
        id: event.id ?? newId(),
        project_id: projectId,
        subject_id: event.subjectId,
        field_key: event.fieldKey,
        type: event.type,
        actor: event.by,
        role: event.role,
        reason: event.reason ?? null,
        chosen_candidate_id: event.chosenCandidateId ?? null,
        covered_candidate_ids: event.coveredCandidateIds === undefined ? null : [...event.coveredCandidateIds],
      })
      .returningAll()
      .executeTakeFirstOrThrow(),
  );
  return fieldEventOf(row);
}

// ---------------------------------------------------------------------------
// Assets (2.5)
// ---------------------------------------------------------------------------

/** The asset of a tag: the project's existing identity for it, or a new one (one tag, one asset). */
export async function assetForTag(
  request: Request,
  input: { readonly tagAsWritten: string; readonly createdBy: string; readonly assetId?: string },
): Promise<{ readonly assetId: string; readonly normalisedTag: string; readonly created: boolean }> {
  const projectId = projectOf(request);
  const normalisedTag = normaliseTag(input.tagAsWritten);
  if (normalisedTag === null) throw new Error('an untagged appearance has no asset');
  const identities = await request.trx
    .selectFrom('asset_identities')
    .select(['asset_id', 'normalised_tag'])
    .where('normalised_tag', '=', normalisedTag)
    .execute();
  const decision = planAssetIdentity(
    identities.map((row) => ({ assetId: row.asset_id, projectId, normalisedTag: row.normalised_tag })),
    { projectId, tagAsWritten: input.tagAsWritten },
  );
  if (decision.kind === 'existing_asset') return { assetId: decision.assetId, normalisedTag, created: false };
  const assetId = input.assetId ?? newId();
  await refusing(async () => {
    await request.trx.insertInto('subjects').values({ id: assetId, project_id: projectId, kind: 'asset', created_by: input.createdBy }).execute();
    await request.trx
      .insertInto('asset_identities')
      .values({ asset_id: assetId, project_id: projectId, normalised_tag: normalisedTag, created_by: input.createdBy })
      .execute();
  });
  return { assetId, normalisedTag, created: true };
}

/**
 * One appearance of equipment, with every evidence entry that shows it (one or
 * more, in one or several documents of the project). A tagged appearance joins
 * the asset of its tag; an untagged one joins none and is listed as a possible
 * duplicate (2.5). It stays evidence while any entry cites a document that is
 * not removed (2.3, "A candidate or asset with evidence from other active
 * documents keeps that evidence").
 */
export async function recordAssetAppearance(
  request: Request,
  input: { readonly id?: string; readonly tagAsWritten?: string; readonly evidence: readonly Evidence[]; readonly createdBy: string },
): Promise<{ readonly appearanceId: string; readonly assetId: string | null }> {
  const projectId = projectOf(request);
  if (input.evidence.length === 0) throw new Error('an asset appearance is recorded with at least one evidence entry');
  const id = input.id ?? newId();
  const asset =
    input.tagAsWritten === undefined || normaliseTag(input.tagAsWritten) === null
      ? null
      : await assetForTag(request, { tagAsWritten: input.tagAsWritten, createdBy: input.createdBy });
  await refusing(async () => {
    await request.trx
      .insertInto('asset_appearances')
      .values({
        id,
        project_id: projectId,
        asset_id: asset === null ? null : asset.assetId,
        tag_as_written: asset === null ? null : (input.tagAsWritten ?? null),
        created_by: input.createdBy,
      })
      .execute();
    await insertEvidence(request, projectId, { appearanceId: id }, input.evidence);
  });
  return { appearanceId: id, assetId: asset === null ? null : asset.assetId };
}

export type AssetEventWrite =
  | { readonly outcome: 'appended'; readonly event: AssetEvent }
  | { readonly outcome: 'refused'; readonly refusal: AssetEventRefusal };

/**
 * A merge, split or remove event (2.5). The domain's assetEventRefusal decides
 * against the register as it stands; the store then refuses any event not from
 * the engineer making the request.
 */
export async function appendAssetEvent(
  request: Request,
  event: Omit<ProposedAssetEvent, 'at'> & { readonly id?: string },
): Promise<AssetEventWrite> {
  const projectId = projectOf(request);
  const register = deriveAssetRegister(await readAssetRegisterInputs(request));
  const status = new Map(register.assets.map((asset) => [asset.assetId, asset.status]));
  const refusal = assetEventRefusal({ ...event, at: '' }, (assetId) => status.get(assetId));
  if (refusal !== null) return { outcome: 'refused', refusal };
  const row = await refusing(() =>
    request.trx
      .insertInto('asset_events')
      .values({
        id: event.id ?? newId(),
        project_id: projectId,
        asset_id: event.assetId,
        type: event.type,
        related_asset_ids: [...event.relatedAssetIds],
        actor: event.by,
        role: 'sovitech_engineer',
        reason: event.reason,
      })
      .returningAll()
      .executeTakeFirstOrThrow(),
  );
  return {
    outcome: 'appended',
    event: {
      assetId: row.asset_id,
      type: row.type,
      relatedAssetIds: row.related_asset_ids,
      by: row.actor,
      role: row.role,
      at: row.at,
      reason: row.reason,
    },
  };
}

// ---------------------------------------------------------------------------
// Guardrail events and proposal snapshots
// ---------------------------------------------------------------------------

/** Logs one enforcement (section 8). The reason is a code, never document text (rule 13); the store refuses anything else. */
export async function appendGuardrailEvent(
  request: Request,
  event: {
    readonly id?: string;
    readonly type: GuardrailEventType;
    readonly subjectId?: string;
    readonly fieldKey?: string;
    readonly reason?: string;
    readonly actor: string;
  },
): Promise<string> {
  const projectId = projectOf(request);
  const id = event.id ?? newId();
  await refusing(() =>
    request.trx
      .insertInto('guardrail_events')
      .values({
        id,
        project_id: projectId,
        type: event.type,
        subject_id: event.subjectId ?? null,
        field_key: event.fieldKey ?? null,
        reason: event.reason ?? null,
        actor: event.actor,
      })
      .execute(),
  );
  return id;
}

/** A generated proposal's snapshot: the candidate ids and formula versions it used (2.4). */
export async function recordProposalSnapshot(
  request: Request,
  input: {
    readonly id?: string;
    readonly inputsHash: string;
    readonly candidateIds: readonly string[];
    readonly formulas: readonly { readonly formulaId: string; readonly formulaVersion: string }[];
    readonly createdBy: string;
  },
): Promise<string> {
  const projectId = projectOf(request);
  const id = input.id ?? newId();
  await refusing(async () => {
    await request.trx
      .insertInto('proposal_snapshots')
      .values({ id, project_id: projectId, inputs_hash: input.inputsHash, created_by: input.createdBy })
      .execute();
    if (input.candidateIds.length > 0) {
      await request.trx
        .insertInto('proposal_snapshot_candidates')
        .values(input.candidateIds.map((candidateId) => ({ snapshot_id: id, project_id: projectId, candidate_id: candidateId })))
        .execute();
    }
    if (input.formulas.length > 0) {
      await request.trx
        .insertInto('proposal_snapshot_formulas')
        .values(
          input.formulas.map((formula) => ({
            snapshot_id: id,
            project_id: projectId,
            formula_id: formula.formulaId,
            formula_version: formula.formulaVersion,
          })),
        )
        .execute();
    }
  });
  return id;
}
