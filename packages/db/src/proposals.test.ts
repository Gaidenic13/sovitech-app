/**
 * Migration 0015 and ./proposals.ts: the stored proposal's parts and the generated outputs (phase 5;
 * docs/adr/0048-stored-proposal-and-price-stage.md decision 2, docs/adr/0050-exports-print-route-and-pdf.md decision 3).
 * Blocking: part of `pnpm test`. Every account, project and value is TEST data; the database is a throwaway
 * Testcontainers Postgres.
 *
 * - A generation is stored with its parts and reads back as written (2.4: "A generated proposal keeps a snapshot of the
 *   candidate ids and formula versions it used").
 * - The four tables are append-only for the app's login (rule 4; G4-20's guard, extended), project-scoped (rule 13),
 *   and a part is written only with its snapshot, by its writer, in its transaction (SVX17): a stored proposal is never
 *   added to later.
 * - An output row names what was missing as codes only, and never both a complete figure and a missing item.
 * - A generated output is started only by the owner making the request, in their own name (SVX18).
 * - Quotation records have no writer in the app (`no_writer_decided`); the TEST machinery writes one with TEST
 *   accounts only, and it reads back with its inputs.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { StoreRefusal } from './errors';
import { newId } from './ids';
import { addProjectMember } from './guarded';
import {
  readGeneratedOutputs,
  readPendingDocumentsBySnapshot,
  readProposalSnapshot,
  readProposalVersions,
  readQuotationRecords,
  recordGeneratedOutput,
  recordGeneratedProposal,
  type GeneratedProposalWrite,
} from './proposals';
import { withRequest } from './request';
import { createTestAccount, createTestDocumentValue, createTestProject, insertTestQuotationRecord, startTestDatabase, testContentHash, type TestDatabase } from './testing';
import { recordProposalSnapshot, registerDocument } from './writes';

const LONG = { timeout: 120_000 };
const HASH = `sha256:${'a'.repeat(64)}`;

let database: TestDatabase;
let ownerId: string;
let otherOwnerId: string;
let engineerId: string;
let projectId: string;
let otherProjectId: string;

beforeAll(async () => {
  database = await startTestDatabase();
  ownerId = await createTestAccount(database, { label: '0015 owner', kind: 'person', roles: ['owner'] });
  otherOwnerId = await createTestAccount(database, { label: '0015 other owner', kind: 'person', roles: ['owner'] });
  engineerId = await createTestAccount(database, { label: '0015 engineer', kind: 'person', roles: ['sovitech_engineer'] });
  projectId = await createTestProject(database, { ownerId, isDemo: false });
  otherProjectId = await createTestProject(database, { ownerId: otherOwnerId, isDemo: false });
  await addProjectMember(database.operator.db, { projectId, userId: engineerId });
}, 240_000);

afterAll(async () => {
  await database.stop();
});

async function refusalOf(work: Promise<unknown>): Promise<string | undefined> {
  try {
    await work;
  } catch (error) {
    if (error instanceof StoreRefusal) return error.refusal;
    throw error;
  }
  return undefined;
}

/** A TEST document of the project, registered by its owner. */
async function testDocument(label: string): Promise<string> {
  return withRequest(database.app, { userId: ownerId, projectId }, async (request) =>
    (await registerDocument(request, { contentHash: testContentHash(`0015 ${label}`), kind: 'other', stage: 'unknown', analysis: { status: 'queued', coverage: 'TEST pending' }, createdBy: ownerId })).id,
  );
}

function generation(pending: readonly string[]): GeneratedProposalWrite {
  return {
    inputsHash: HASH,
    candidateIds: [],
    formulas: [],
    outputs: [
      { output: 'capex.preliminaryEstimate', formulaId: 'capexPreliminaryEstimate', formulaVersion: '1', candidateId: null, missing: ['dataset:sovitech-point-templates', 'input:00000000-0000-7000-8000-000000000001:building.grossFloorArea:unknown'], incomplete: false },
      { output: 'measures.priorityOrder', formulaId: 'measurePriority', formulaVersion: '1', candidateId: null, missing: ['dataset:sovitech-function-set'], incomplete: false },
    ],
    pendingDocumentIds: pending,
    paragraphs: [],
    createdBy: ownerId,
  };
}

describe('0015: the stored proposal and the generated outputs', LONG, () => {
  it('2.4 · ADR 0048: a generation is stored with its outputs, missing codes and pending documents, and reads back as written', async () => {
    const pending = await testDocument('pending');
    const snapshotId = await withRequest(database.app, { userId: ownerId, projectId }, (request) => recordGeneratedProposal(request, generation([pending])));
    const stored = await withRequest(database.app, { userId: ownerId, projectId }, (request) => readProposalSnapshot(request, snapshotId));
    expect(stored?.outputs.map((output) => [output.output, output.candidateId, output.missing])).toEqual([
      ['capex.preliminaryEstimate', null, ['dataset:sovitech-point-templates', 'input:00000000-0000-7000-8000-000000000001:building.grossFloorArea:unknown']],
      ['measures.priorityOrder', null, ['dataset:sovitech-function-set']],
    ]);
    expect(stored?.pendingDocumentIds).toEqual([pending]);
    expect(stored?.createdBy).toBe(ownerId);
    const versions = await withRequest(database.app, { userId: ownerId, projectId }, (request) => readProposalVersions(request));
    expect(versions.map((version) => version.id)).toContain(snapshotId);
    const bySnapshot = await withRequest(database.app, { userId: ownerId, projectId }, (request) => readPendingDocumentsBySnapshot(request));
    expect(bySnapshot.get(snapshotId)).toEqual([pending]);
  });

  it('rule 4 · G4-20 (extended to 0015): no row of the four tables is updated, deleted or truncated by the app', async () => {
    const snapshotId = await withRequest(database.app, { userId: ownerId, projectId }, (request) => recordGeneratedProposal(request, generation([])));
    const outputId = await withRequest(database.app, { userId: ownerId, projectId }, (request) => recordGeneratedOutput(request, { kind: 'proposal_pdf', snapshotId, startedBy: ownerId }));
    const scope = { userId: ownerId, projectId };
    for (const statement of [
      "UPDATE sovitech.proposal_snapshot_outputs SET incomplete = true WHERE snapshot_id = $1",
      'DELETE FROM sovitech.proposal_snapshot_outputs WHERE snapshot_id = $1',
      'DELETE FROM sovitech.generated_outputs WHERE snapshot_id = $1',
      "UPDATE sovitech.generated_outputs SET kind = 'proposal_pdf' WHERE snapshot_id = $1",
    ]) {
      await expect(database.as('app', statement, [snapshotId], scope), statement).rejects.toThrow();
    }
    for (const table of ['proposal_snapshot_outputs', 'proposal_snapshot_pending_documents', 'proposal_snapshot_paragraphs', 'generated_outputs']) {
      await expect(database.as('app', `TRUNCATE sovitech.${table}`, [], scope), table).rejects.toThrow();
    }
    const outputs = await withRequest(database.app, scope, (request) => readGeneratedOutputs(request));
    expect(outputs.find((output) => output.id === outputId)).toMatchObject({ kind: 'proposal_pdf', snapshotId, startedBy: ownerId });
  });

  it('SVX17: a part of a snapshot is written only with it, by its writer, in its transaction: never added to later', async () => {
    const snapshotId = await withRequest(database.app, { userId: ownerId, projectId }, (request) => recordProposalSnapshot(request, { inputsHash: HASH, candidateIds: [], formulas: [], createdBy: ownerId }));
    const later = withRequest(database.app, { userId: ownerId, projectId }, (request) =>
      request.trx
        .insertInto('proposal_snapshot_outputs')
        .values({ snapshot_id: snapshotId, project_id: projectId, ordinal: 0, output_key: 'capex.preliminaryEstimate', formula_id: 'capexPreliminaryEstimate', formula_version: '1', candidate_id: null, missing: ['dataset:sovitech-cost-ranges'], incomplete: false, created_by: ownerId })
        .execute(),
    );
    expect(await refusalOf(later)).toBe('snapshot_part_not_with_its_snapshot');
    // Another member writing a part of the owner's committed snapshot in the owner's name: refused too.
    const forged = withRequest(database.app, { userId: engineerId, projectId }, (request) =>
      request.trx
        .insertInto('proposal_snapshot_outputs')
        .values({ snapshot_id: snapshotId, project_id: projectId, ordinal: 0, output_key: 'capex.preliminaryEstimate', formula_id: 'capexPreliminaryEstimate', formula_version: '1', candidate_id: null, missing: ['dataset:sovitech-cost-ranges'], incomplete: false, created_by: ownerId })
        .execute(),
    );
    expect(await refusalOf(forged)).toBe('snapshot_part_not_with_its_snapshot');
    // And a snapshot of their own naming the owner as its writer is refused before any part (SVX19, migration 0016).
    const named = withRequest(database.app, { userId: engineerId, projectId }, (request) => recordProposalSnapshot(request, { inputsHash: HASH, candidateIds: [], formulas: [], createdBy: ownerId }));
    expect(await refusalOf(named)).toBe('snapshot_not_from_the_requesting_writer');
  });

  it('SVX17 · SVX19 (migration 0016): the 0005 parts are written only with their snapshot, and a snapshot only by an owner or the project\'s system service account, in their own name', async () => {
    const snapshotId = await withRequest(database.app, { userId: ownerId, projectId }, (request) => recordGeneratedProposal(request, generation([])));
    const value = await createTestDocumentValue(database, { projectId, label: '0016 later value' });
    const laterCandidate = withRequest(database.app, { userId: ownerId, projectId }, (request) =>
      request.trx.insertInto('proposal_snapshot_candidates').values({ snapshot_id: snapshotId, project_id: projectId, candidate_id: value.candidateId }).execute(),
    );
    expect(await refusalOf(laterCandidate)).toBe('snapshot_part_not_with_its_snapshot');
    const laterFormula = withRequest(database.app, { userId: ownerId, projectId }, (request) =>
      request.trx.insertInto('proposal_snapshot_formulas').values({ snapshot_id: snapshotId, project_id: projectId, formula_id: 'TEST-forged', formula_version: '9.9.9' }).execute(),
    );
    expect(await refusalOf(laterFormula)).toBe('snapshot_part_not_with_its_snapshot');
    const own = withRequest(database.app, { userId: engineerId, projectId }, (request) => recordProposalSnapshot(request, { inputsHash: HASH, candidateIds: [], formulas: [], createdBy: engineerId }));
    expect(await refusalOf(own)).toBe('snapshot_not_from_the_requesting_writer');
    const serviceId = value.serviceId;
    const regenerated = await withRequest(database.app, { userId: serviceId, projectId }, (request) =>
      recordProposalSnapshot(request, { inputsHash: HASH, candidateIds: [value.candidateId], formulas: [{ formulaId: 'capexPreliminaryEstimate', formulaVersion: '1' }], createdBy: serviceId }),
    );
    const stored = await withRequest(database.app, { userId: ownerId, projectId }, (request) => readProposalSnapshot(request, regenerated));
    expect(stored).toMatchObject({ createdBy: serviceId, candidateIds: [value.candidateId] });
  });

  it('rule 7 · rule 13: an output row names what was missing as codes only; no figure with nothing missing, and no complete figure with a missing item', async () => {
    const value = await createTestDocumentValue(database, { projectId, label: '0015 figure' });
    const write = (missing: readonly string[], candidateId: string | null, incomplete = false) =>
      withRequest(database.app, { userId: ownerId, projectId }, (request) =>
        recordGeneratedProposal(request, { ...generation([]), outputs: [{ output: 'capex.preliminaryEstimate', formulaId: 'capexPreliminaryEstimate', formulaVersion: '1', candidateId, missing, incomplete }] }),
      );
    await expect(write([], null)).rejects.toThrow();
    await expect(write(['dataset:sovitech-cost-ranges'], value.candidateId)).rejects.toThrow();
    await expect(write(['TEST free text: Suprafata 1.234,5 mp'], null)).rejects.toThrow();
    await expect(write([], value.candidateId)).resolves.toMatch(/^[0-9a-f-]{36}$/u);
    await expect(write(['input:00000000-0000-7000-8000-000000000001:building.grossFloorArea:unknown'], value.candidateId, true)).resolves.toMatch(/^[0-9a-f-]{36}$/u);
  });

  it('SVX18: a generated output is started only by the owner making the request, in their own name', async () => {
    const snapshotId = await withRequest(database.app, { userId: ownerId, projectId }, (request) => recordGeneratedProposal(request, generation([])));
    expect(await refusalOf(withRequest(database.app, { userId: ownerId, projectId }, (request) => recordGeneratedOutput(request, { kind: 'proposal_pdf', snapshotId, startedBy: engineerId })))).toBe(
      'output_not_started_by_the_requesting_owner',
    );
    expect(await refusalOf(withRequest(database.app, { userId: engineerId, projectId }, (request) => recordGeneratedOutput(request, { kind: 'proposal_pdf', snapshotId, startedBy: engineerId })))).toBe(
      'output_not_started_by_the_requesting_owner',
    );
  });

  it('rule 13 · G13-11 (the store): a session scoped to project B reads no snapshot, part, generated output or quotation record of project A', async () => {
    const pending = await testDocument('isolation');
    const snapshotId = await withRequest(database.app, { userId: ownerId, projectId }, (request) => recordGeneratedProposal(request, generation([pending])));
    await withRequest(database.app, { userId: ownerId, projectId }, (request) => recordGeneratedOutput(request, { kind: 'proposal_pdf', snapshotId, startedBy: ownerId }));
    const reviewer = await createTestAccount(database, { label: '0015 commercial reviewer', kind: 'person', roles: [] });
    await insertTestQuotationRecord(database, { projectId, scopeUserId: ownerId, snapshotId, reviewingEngineerId: engineerId, commercialReviewerId: reviewer, issuedOn: '2026-10-01', validUntil: '2026-12-31', inputs: [] });
    const other = { userId: otherOwnerId, projectId: otherProjectId };
    expect(await withRequest(database.app, other, (request) => readProposalSnapshot(request, snapshotId))).toBeUndefined();
    expect(await withRequest(database.app, other, (request) => readProposalVersions(request))).toEqual([]);
    expect(await withRequest(database.app, other, (request) => readGeneratedOutputs(request))).toEqual([]);
    expect(await withRequest(database.app, other, (request) => readQuotationRecords(request))).toEqual([]);
    expect((await withRequest(database.app, other, (request) => readPendingDocumentsBySnapshot(request))).size).toBe(0);
    for (const table of ['proposal_snapshot_outputs', 'proposal_snapshot_pending_documents', 'proposal_snapshot_paragraphs', 'generated_outputs', 'quotation_records']) {
      expect(await database.as('app', `SELECT 1 FROM sovitech.${table}`, [], other), table).toEqual([]);
    }
  });

  it('rule 10 · ADR 0048 decision 8: the app cannot write a quotation record; the TEST machinery writes one naming TEST accounts, which reads back with its inputs', async () => {
    const value = await createTestDocumentValue(database, { projectId, label: '0015 quotation input' });
    const snapshotId = await withRequest(database.app, { userId: ownerId, projectId }, (request) => recordGeneratedProposal(request, { ...generation([]), candidateIds: [value.candidateId] }));
    await expect(
      database.as(
        'app',
        `INSERT INTO sovitech.quotation_records (id, project_id, record_number, reviewing_engineer_id, commercial_reviewer_id, issued_on, valid_until, currency, vat_basis, inclusions, exclusions)
         VALUES ($1, $2, 'TEST', $3, $3, '2026-10-01', '2026-12-31', 'EUR', 'TEST', '{}', '{}')`,
        [newId(), projectId, engineerId],
        { userId: ownerId, projectId },
      ),
    ).rejects.toThrow();
    const reviewer = await createTestAccount(database, { label: '0015 reviewer two', kind: 'person', roles: [] });
    const recordId = await insertTestQuotationRecord(database, { projectId, scopeUserId: ownerId, snapshotId, reviewingEngineerId: engineerId, commercialReviewerId: reviewer, issuedOn: '2026-10-02', validUntil: '2026-12-31', inputs: [{ candidateId: value.candidateId, candidateHash: `sha256:${'b'.repeat(64)}` }] });
    const records = await withRequest(database.app, { userId: ownerId, projectId }, (request) => readQuotationRecords(request));
    const record = records.find((entry) => entry.id === recordId);
    expect(record).toMatchObject({ proposalSnapshotId: snapshotId, reviewingEngineerId: engineerId, commercialReviewerId: reviewer, currency: 'EUR', issuedOn: '2026-10-02' });
    expect(record?.recordNumber.startsWith('TEST')).toBe(true);
    expect(record?.inputs.map((input) => input.candidateId)).toEqual([value.candidateId]);
  });
});
