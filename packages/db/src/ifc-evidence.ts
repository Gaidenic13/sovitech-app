/**
 * The store's side of the gated IFC value path (prompt 3 section 8, "Output per file"; section
 * 10, phase 2; migration 0013; docs/adr/0033-ifc-value-path-api-half.md): IFC evidence entries
 * of candidates and asset appearances (ifc-input 6.2.1's locator, a proposal), their excerpts,
 * the register of model elements linked to subjects, and the engineer's list of refused values.
 *
 * Every write here reads the `ifc-values` gate first, through the registry's one gate function,
 * and throws {@link IfcValuesClosed} before it touches the request when the gate reads closed.
 * The gate reads closed in every source but the test-utils override of tests/proposed/ (prompt 3
 * 5.4), so outside that suite nothing is ever written to these tables. The tables are left out
 * of the store's shared Kysely `Database` type, so no other module writes them by a typed query;
 * `insertCandidate` refuses an IFC evidence entry (writes.ts), and 2.4's locator check refuses an
 * IFC key (G1-13).
 *
 * Appends and reads only; there is no update or delete method (guardrails 2.4). The erasure
 * (rule 13) erases the excerpts and withdraws the candidates it leaves without a source (0013).
 */
import { sql } from 'kysely';
import { isIfcEvidence, type Candidate, type IfcEvidence, type Quantity } from '@sovitech/domain';
import { checkQuantityUnit, type UnitCheckedField, type UnitRefusal } from '@sovitech/registry';
import { readGate, type GateSource } from '@sovitech/registry/gates';
import { constraintOf, refusing, scrubbed } from './errors';
import { newId } from './ids';
import { candidateOf, storedQuantityOf } from './mapping';
import { ifcTrx, type IfcElementLink, type IfcValueRefusal } from './ifc-reads';
import { projectOf, type Request } from './request';
import { appendGuardrailEvent, assetForTag, type EvidenceStoreRefusal } from './writes';

/** A write of the IFC value path while `ifc-values` reads closed. Nothing was written. */
export class IfcValuesClosed extends Error {
  override readonly name = 'IfcValuesClosed';
  constructor() {
    super('ifc-values reads closed: the IFC value path writes nothing (prompt 3 5.4)');
  }
}

/** Throws unless `ifc-values` reads open in `gates`; called first by every write here. */
export function assertIfcValuesOpen(gates: GateSource): void {
  if (!readGate(gates, 'ifc-values').open) throw new IfcValuesClosed();
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

async function insertIfcEvidence(
  request: Request,
  projectId: string,
  owner: { readonly candidateId: string } | { readonly appearanceId: string },
  evidence: readonly IfcEvidence[],
  createdBy: string,
): Promise<void> {
  const trx = ifcTrx(request);
  for (const [ordinal, entry] of evidence.entries()) {
    const id = newId();
    await trx
      .insertInto('ifc_evidence')
      .values({
        id,
        project_id: projectId,
        candidate_id: 'candidateId' in owner ? owner.candidateId : null,
        appearance_id: 'appearanceId' in owner ? owner.appearanceId : null,
        ordinal,
        document_id: entry.documentId,
        content_hash: entry.contentHash,
        ifc_schema: entry.ifc.schema,
        global_id: entry.ifc.globalId,
        step_ids: [...entry.ifc.stepIds],
        path: JSON.stringify(entry.ifc.path),
        evidence_check: entry.check,
        created_by: createdBy,
      })
      .execute();
    await trx
      .insertInto('ifc_evidence_excerpts')
      .values({ evidence_id: id, project_id: projectId, document_id: entry.documentId, content_hash: entry.contentHash, text: entry.excerpt, created_by: createdBy })
      .execute();
  }
}

/** A candidate of the IFC value path before the store sets its time and author role. */
export type NewIfcCandidate = Omit<Candidate, 'createdAt' | 'authorRole' | 'evidence'> & { readonly evidence: readonly IfcEvidence[] };

export type IfcCandidateWrite =
  | { readonly outcome: 'stored'; readonly candidate: Candidate }
  | { readonly outcome: 'rejected'; readonly refusal: EvidenceStoreRefusal; readonly guardrailEventId: string }
  | { readonly outcome: 'refused'; readonly refusal: UnitRefusal; readonly reading: 'quantity' | { readonly alternative: number } };

function unitRefusal(field: UnitCheckedField, candidate: NewIfcCandidate): Extract<IfcCandidateWrite, { outcome: 'refused' }> | undefined {
  const readings: readonly { readonly reading: 'quantity' | { readonly alternative: number }; readonly quantity: Quantity }[] = [
    ...(candidate.quantity === undefined ? [] : [{ reading: 'quantity' as const, quantity: candidate.quantity }]),
    ...(candidate.alternatives ?? []).map((quantity, alternative) => ({ reading: { alternative }, quantity })),
  ];
  for (const { reading, quantity } of readings) {
    const verdict = checkQuantityUnit(field, quantity);
    if (!verdict.ok) return { outcome: 'refused', refusal: verdict.reason, reading };
  }
  return undefined;
}

/**
 * Stores a candidate of the IFC value path with its IFC evidence, only while `ifc-values` reads
 * open (it throws IfcValuesClosed first otherwise). The same checks as `insertCandidate`: the
 * unit's dimension against the field (2.7), the evidence's project and revision by foreign key
 * (a refusal writes one evidence_not_found event, G13-1), the author and source (0009), and, at
 * commit, a matched entry for a document value (0013).
 */
export async function insertIfcCandidate(
  request: Request,
  gates: GateSource,
  candidate: NewIfcCandidate,
  field: UnitCheckedField,
): Promise<IfcCandidateWrite> {
  assertIfcValuesOpen(gates);
  const projectId = projectOf(request);
  if (field.key !== candidate.fieldKey) throw new Error(`insertIfcCandidate was handed the field ${field.key} for a candidate of ${candidate.fieldKey}`);
  if (candidate.evidence.length === 0 || !candidate.evidence.every(isIfcEvidence)) {
    throw new Error('a candidate of the IFC value path is stored with IFC evidence entries only');
  }
  const refusedUnit = unitRefusal(field, candidate);
  if (refusedUnit !== undefined) return refusedUnit;
  await sql`SAVEPOINT sovitech_ifc_candidate`.execute(request.trx);
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
        method_formula_id: null,
        method_formula_version: null,
        method_input_candidate_ids: null,
        method_unknown_policy: null,
        method_assumptions: null,
        reference_dataset: null,
        reference_version: null,
        reference_key: null,
        range_low: null,
        range_high: null,
        confidence: candidate.confidence ?? null,
        created_by: candidate.createdBy,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    await insertIfcEvidence(request, projectId, { candidateId: candidate.id }, candidate.evidence, candidate.createdBy);
    await sql`RELEASE SAVEPOINT sovitech_ifc_candidate`.execute(request.trx);
    return { outcome: 'stored', candidate: candidateOf(row, candidate.evidence) };
  } catch (error) {
    await sql`ROLLBACK TO SAVEPOINT sovitech_ifc_candidate`.execute(request.trx);
    if (constraintOf(error) !== 'ifc_evidence_document_fk') throw scrubbed(error);
    const visible = await request.trx.selectFrom('documents').select(['id', 'content_hash']).where('id', 'in', candidate.evidence.map((entry) => entry.documentId)).execute();
    const hashOf = new Map(visible.map((document) => [document.id, document.content_hash]));
    const refusal: EvidenceStoreRefusal = candidate.evidence.every((entry) => hashOf.has(entry.documentId)) ? 'content_hash' : 'document_in_project';
    const subject = await request.trx.selectFrom('subjects').select('id').where('id', '=', candidate.subjectId).executeTakeFirst();
    const guardrailEventId = await appendGuardrailEvent(request, {
      type: 'evidence_not_found',
      ...(subject === undefined ? {} : { subjectId: candidate.subjectId }),
      fieldKey: candidate.fieldKey,
      reason: `ifc.${refusal}`,
      actor: candidate.createdBy,
    });
    return { outcome: 'rejected', refusal, guardrailEventId };
  }
}

/**
 * One appearance of equipment in a model, with its IFC evidence, only while `ifc-values` reads
 * open. A tagged appearance joins the asset of its tag (one tag, one asset: 2.5); an untagged one
 * joins none and is listed as a possible duplicate, never counted (2.5; ifc-input 6.2.5 would
 * count them, behind `ifc-untagged-count`).
 */
export async function recordIfcAppearance(
  request: Request,
  gates: GateSource,
  input: { readonly tagAsWritten?: string; readonly evidence: readonly IfcEvidence[]; readonly createdBy: string },
): Promise<{ readonly appearanceId: string; readonly assetId: string | null }> {
  assertIfcValuesOpen(gates);
  const projectId = projectOf(request);
  if (input.evidence.length === 0 || !input.evidence.every(isIfcEvidence)) throw new Error('an IFC appearance is recorded with IFC evidence entries only');
  const asset = input.tagAsWritten === undefined ? null : await assetForTag(request, { tagAsWritten: input.tagAsWritten, createdBy: input.createdBy });
  const appearanceId = newId();
  await refusing(async () => {
    await request.trx
      .insertInto('asset_appearances')
      .values({ id: appearanceId, project_id: projectId, asset_id: asset?.assetId ?? null, tag_as_written: asset === null ? null : (input.tagAsWritten ?? null), created_by: input.createdBy })
      .execute();
    await insertIfcEvidence(request, projectId, { appearanceId }, input.evidence, input.createdBy);
  });
  return { appearanceId, assetId: asset?.assetId ?? null };
}


export async function recordIfcElement(request: Request, gates: GateSource, link: IfcElementLink & { readonly createdBy: string }): Promise<string> {
  assertIfcValuesOpen(gates);
  const projectId = projectOf(request);
  const id = newId();
  await refusing(() =>
    ifcTrx(request)
      .insertInto('ifc_elements')
      .values({
        id,
        project_id: projectId,
        document_id: link.documentId,
        content_hash: link.contentHash,
        global_id: link.globalId,
        step_id: link.stepId,
        ifc_class: link.ifcClass,
        element_kind: link.kind,
        subject_id: link.subjectId ?? null,
        appearance_id: link.appearanceId ?? null,
        container_global_id: link.container?.globalId ?? null,
        container_step_id: link.container?.stepId ?? null,
        created_by: link.createdBy,
      })
      .execute(),
  );
  return id;
}


export async function recordIfcValueRefusal(request: Request, gates: GateSource, refusal: IfcValueRefusal & { readonly createdBy: string }): Promise<string> {
  assertIfcValuesOpen(gates);
  const projectId = projectOf(request);
  const id = newId();
  await refusing(() =>
    ifcTrx(request)
      .insertInto('ifc_value_refusals')
      .values({
        id,
        project_id: projectId,
        document_id: refusal.documentId,
        content_hash: refusal.contentHash,
        proposal_id: refusal.proposalId,
        global_id: refusal.globalId,
        field_key: refusal.fieldKey,
        step_ids: [...refusal.stepIds],
        code: refusal.code,
        created_by: refusal.createdBy,
      })
      .execute(),
  );
  return id;
}

export {
  IFC_ELEMENT_KINDS,
  ifcEvidenceByOwner,
  readIfcElements,
  readIfcValueRefusals,
  type IfcElementKind,
  type IfcElementLink,
  type IfcValueRefusal,
  type StoredIfcElement,
} from './ifc-reads';
