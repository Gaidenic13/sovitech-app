/**
 * The stored proposal and the generated outputs (phase 5; migrations 0005 and 0015; guardrails 2.4, "A generated
 * proposal keeps a snapshot of the candidate ids and formula versions it used"; rule 7, rule 10, rule 13;
 * docs/adr/0048-stored-proposal-and-price-stage.md, docs/adr/0050-exports-print-route-and-pdf.md).
 *
 * - `recordGeneratedProposal` writes one generation in the request's own transaction: the snapshot (0005: its inputs
 *   hash, the candidate ids it read and produced, the formulas whose body ran) and its parts (0015: one row per output
 *   with what was missing as codes, the documents still being read, the drafted paragraphs the validator accepted).
 *   The store refuses a part written by anyone but the snapshot's writer, or after the snapshot's transaction (SVX17),
 *   so a stored proposal is complete when it commits and never added to later.
 * - The reads return what was stored, never a value recomputed: the view-model reads the stored proposal as
 *   generated (US-PROPOSAL-03 AC3).
 * - Quotation records (rule 10, "Stage 3 is derived, not passed") are read only: nothing in the app writes one (PRD
 *   R-129 "Until decided"; the guard `no_writer_decided`).
 * - A generated output is recorded by the owner making the request, in their own name (SVX18). No export file is
 *   stored (ADR 0050 decision 3).
 *
 * Codes and ids only: nothing here holds document text (rule 13).
 */
import { refusing } from './errors';
import { newId } from './ids';
import { projectOf, type Request } from './request';
import { recordProposalSnapshot } from './writes';

/** One output row of a generation, as the engine's snapshot record gives it. */
export interface SnapshotOutputWrite {
  readonly output: string;
  readonly formulaId: string;
  readonly formulaVersion: string;
  readonly candidateId: string | null;
  /** Codes, never text: `dataset:<id>`, `method:<formula>`, `unit:<gate>`, `input:<subject>:<field>:<reason>`. */
  readonly missing: readonly string[];
  readonly incomplete: boolean;
}

/** An AI-drafted paragraph the output validator accepted (PRD R-115), with the model id the API returned. */
export interface ParagraphWrite {
  readonly slot: string;
  readonly ordinal: number;
  readonly text: string;
  readonly modelId: string;
}

export interface GeneratedProposalWrite {
  readonly id?: string;
  readonly inputsHash: string;
  readonly candidateIds: readonly string[];
  readonly formulas: readonly { readonly formulaId: string; readonly formulaVersion: string }[];
  readonly outputs: readonly SnapshotOutputWrite[];
  readonly pendingDocumentIds: readonly string[];
  readonly paragraphs: readonly ParagraphWrite[];
  /** The user making the request (the owner who pressed Generate, or the system account of a regeneration). */
  readonly createdBy: string;
}

/** Stores one generated proposal and its parts in the request's transaction; returns the snapshot's id. */
export async function recordGeneratedProposal(request: Request, input: GeneratedProposalWrite): Promise<string> {
  const projectId = projectOf(request);
  const snapshotId = await recordProposalSnapshot(request, {
    ...(input.id === undefined ? {} : { id: input.id }),
    inputsHash: input.inputsHash,
    candidateIds: [...new Set(input.candidateIds)],
    formulas: input.formulas,
    createdBy: input.createdBy,
  });
  await refusing(async () => {
    if (input.outputs.length > 0) {
      await request.trx
        .insertInto('proposal_snapshot_outputs')
        .values(
          input.outputs.map((output, ordinal) => ({
            snapshot_id: snapshotId,
            project_id: projectId,
            ordinal,
            output_key: output.output,
            formula_id: output.formulaId,
            formula_version: output.formulaVersion,
            candidate_id: output.candidateId,
            missing: [...output.missing],
            incomplete: output.incomplete,
            created_by: input.createdBy,
          })),
        )
        .execute();
    }
    const pending = [...new Set(input.pendingDocumentIds)];
    if (pending.length > 0) {
      await request.trx
        .insertInto('proposal_snapshot_pending_documents')
        .values(pending.map((documentId) => ({ snapshot_id: snapshotId, project_id: projectId, document_id: documentId, created_by: input.createdBy })))
        .execute();
    }
    if (input.paragraphs.length > 0) {
      await request.trx
        .insertInto('proposal_snapshot_paragraphs')
        .values(
          input.paragraphs.map((paragraph) => ({
            snapshot_id: snapshotId,
            project_id: projectId,
            slot: paragraph.slot,
            ordinal: paragraph.ordinal,
            text: paragraph.text,
            model_id: paragraph.modelId,
            created_by: input.createdBy,
          })),
        )
        .execute();
    }
  });
  return snapshotId;
}

/** One stored version, for the versions list. */
export interface StoredProposalVersion {
  readonly id: string;
  readonly createdAt: string;
  readonly createdBy: string;
}

/** The project's stored proposals, newest first (US-PROPOSAL-11 AC3). */
export async function readProposalVersions(request: Request): Promise<StoredProposalVersion[]> {
  projectOf(request);
  const rows = await request.trx.selectFrom('proposal_snapshots').select(['id', 'created_at', 'created_by']).orderBy('created_at', 'desc').orderBy('id', 'desc').execute();
  return rows.map((row) => ({ id: row.id, createdAt: row.created_at, createdBy: row.created_by }));
}

/** One stored proposal, as it was generated. */
export interface StoredProposal {
  readonly id: string;
  readonly inputsHash: string;
  readonly createdAt: string;
  readonly createdBy: string;
  readonly candidateIds: readonly string[];
  readonly formulas: readonly { readonly formulaId: string; readonly formulaVersion: string }[];
  readonly outputs: readonly SnapshotOutputWrite[];
  readonly pendingDocumentIds: readonly string[];
  readonly paragraphs: readonly ParagraphWrite[];
}

/** A stored proposal of the project in scope, or undefined (another project's reads as none: rule 13). */
export async function readProposalSnapshot(request: Request, snapshotId: string): Promise<StoredProposal | undefined> {
  projectOf(request);
  const snapshot = await request.trx.selectFrom('proposal_snapshots').selectAll().where('id', '=', snapshotId).executeTakeFirst();
  if (snapshot === undefined) return undefined;
  const [candidates, formulas, outputs, pending, paragraphs] = await Promise.all([
    request.trx.selectFrom('proposal_snapshot_candidates').select('candidate_id').where('snapshot_id', '=', snapshotId).orderBy('candidate_id').execute(),
    request.trx.selectFrom('proposal_snapshot_formulas').select(['formula_id', 'formula_version']).where('snapshot_id', '=', snapshotId).orderBy('formula_id').execute(),
    request.trx.selectFrom('proposal_snapshot_outputs').selectAll().where('snapshot_id', '=', snapshotId).orderBy('ordinal').execute(),
    request.trx.selectFrom('proposal_snapshot_pending_documents').select('document_id').where('snapshot_id', '=', snapshotId).orderBy('document_id').execute(),
    request.trx.selectFrom('proposal_snapshot_paragraphs').selectAll().where('snapshot_id', '=', snapshotId).orderBy('slot').orderBy('ordinal').execute(),
  ]);
  return {
    id: snapshot.id,
    inputsHash: snapshot.inputs_hash,
    createdAt: snapshot.created_at,
    createdBy: snapshot.created_by,
    candidateIds: candidates.map((row) => row.candidate_id),
    formulas: formulas.map((row) => ({ formulaId: row.formula_id, formulaVersion: row.formula_version })),
    outputs: outputs.map((row) => ({
      output: row.output_key,
      formulaId: row.formula_id,
      formulaVersion: row.formula_version,
      candidateId: row.candidate_id,
      missing: row.missing,
      incomplete: row.incomplete,
    })),
    pendingDocumentIds: pending.map((row) => row.document_id),
    paragraphs: paragraphs.map((row) => ({ slot: row.slot, ordinal: row.ordinal, text: row.text, modelId: row.model_id })),
  };
}

/** The documents a stored proposal recorded as still being read, by snapshot, for the regeneration rule 7 promises. */
export async function readPendingDocumentsBySnapshot(request: Request): Promise<ReadonlyMap<string, readonly string[]>> {
  projectOf(request);
  const rows = await request.trx.selectFrom('proposal_snapshot_pending_documents').select(['snapshot_id', 'document_id']).orderBy('snapshot_id').orderBy('document_id').execute();
  const bySnapshot = new Map<string, string[]>();
  for (const row of rows) {
    const list = bySnapshot.get(row.snapshot_id);
    if (list === undefined) bySnapshot.set(row.snapshot_id, [row.document_id]);
    else list.push(row.document_id);
  }
  return bySnapshot;
}

/** A stored quotation record (rule 10's list), with a hash of every input candidate. Read only. */
export interface StoredQuotationRecordRow {
  readonly id: string;
  readonly recordNumber: string;
  readonly reviewingEngineerId: string;
  readonly commercialReviewerId: string;
  readonly issuedOn: string;
  readonly validUntil: string;
  readonly currency: string;
  readonly vatBasis: string;
  readonly inclusions: readonly string[];
  readonly exclusions: readonly string[];
  readonly proposalSnapshotId: string | null;
  readonly createdAt: string;
  readonly inputs: readonly { readonly candidateId: string; readonly candidateHash: string }[];
}

/** The project's quotation records (none in the live app: nothing writes one, PRD R-129). */
export async function readQuotationRecords(request: Request): Promise<StoredQuotationRecordRow[]> {
  projectOf(request);
  const rows = await request.trx.selectFrom('quotation_records').selectAll().orderBy('created_at').orderBy('id').execute();
  if (rows.length === 0) return [];
  const inputs = await request.trx
    .selectFrom('quotation_record_inputs')
    .select(['record_id', 'candidate_id', 'candidate_hash'])
    .where('record_id', 'in', rows.map((row) => row.id))
    .orderBy('record_id')
    .orderBy('candidate_id')
    .execute();
  return rows.map((row) => ({
    id: row.id,
    recordNumber: row.record_number,
    reviewingEngineerId: row.reviewing_engineer_id,
    commercialReviewerId: row.commercial_reviewer_id,
    issuedOn: row.issued_on,
    validUntil: row.valid_until,
    currency: row.currency,
    vatBasis: row.vat_basis,
    inclusions: row.inclusions,
    exclusions: row.exclusions,
    proposalSnapshotId: row.proposal_snapshot_id,
    createdAt: row.created_at,
    inputs: inputs.filter((input) => input.record_id === row.id).map((input) => ({ candidateId: input.candidate_id, candidateHash: input.candidate_hash })),
  }));
}

/** A generated output (Reports' row; ADR 0050). */
export interface StoredGeneratedOutput {
  readonly id: string;
  readonly kind: 'proposal_pdf';
  readonly snapshotId: string;
  readonly startedBy: string;
  readonly startedAt: string;
}

/** Records an export the owner making the request started; returns its id. */
export async function recordGeneratedOutput(request: Request, input: { readonly id?: string; readonly kind: 'proposal_pdf'; readonly snapshotId: string; readonly startedBy: string }): Promise<string> {
  const projectId = projectOf(request);
  const id = input.id ?? newId();
  await refusing(() =>
    request.trx.insertInto('generated_outputs').values({ id, project_id: projectId, kind: input.kind, snapshot_id: input.snapshotId, started_by: input.startedBy }).execute(),
  );
  return id;
}

/** The project's generated outputs, oldest first. */
export async function readGeneratedOutputs(request: Request): Promise<StoredGeneratedOutput[]> {
  projectOf(request);
  const rows = await request.trx.selectFrom('generated_outputs').selectAll().orderBy('started_at').orderBy('id').execute();
  return rows.map((row) => ({ id: row.id, kind: row.kind, snapshotId: row.snapshot_id, startedBy: row.started_by, startedAt: row.started_at }));
}
