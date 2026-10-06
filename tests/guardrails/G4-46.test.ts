/**
 * G4-46 (new in phase 5 part B, for the integrator to index; 2.4, "A generated proposal keeps a snapshot of the
 * candidate ids and formula versions it used"; rule 4, "A new value is always added, never swapped in"; ADR 0048
 * decision 2; migration 0016).
 * Situation: after a proposal was stored, a later transaction adds a candidate id or a formula row to its snapshot; or
 * a member writes a snapshot naming someone other than themself as its writer, or writes one without acting as the
 * project's owner or its system service account.
 * Expected: the store refuses each: a part of a snapshot is written only with it, by its writer, in its transaction
 * (SVX17, now on the 0005 tables too); a snapshot names the user making the request as its writer, an owner of the
 * project or the project's system service account (SVX19). The stored proposal reads as it was generated.
 *
 * Over a TEST database (the store's own guards; packages/db). The writers the app has keep working: the owner's
 * Generate (snapshot and parts in one transaction), and a regeneration by the project's system service account. Every
 * account, project and value is TEST data.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { StoreRefusal, addProjectMember, newId, readProposalSnapshot, readProposalVersions, recordGeneratedProposal, withRequest, type GeneratedProposalWrite, type Request } from '@sovitech/db';
import { createTestAccount, createTestDocumentValue, createTestProject, createTestService, startTestDatabase, type TestDatabase } from '@sovitech/db/testing';

const HASH = `sha256:${'c'.repeat(64)}`;

let database: TestDatabase;
let ownerId: string;
let engineerId: string;
let serviceId: string;
let projectId: string;

beforeAll(async () => {
  database = await startTestDatabase();
  ownerId = await createTestAccount(database, { label: 'G4-46 owner', kind: 'person', roles: ['owner'] });
  engineerId = await createTestAccount(database, { label: 'G4-46 engineer', kind: 'person', roles: ['sovitech_engineer'] });
  projectId = await createTestProject(database, { ownerId, isDemo: false });
  serviceId = await createTestService(database, { projectId, label: 'G4-46' });
  await addProjectMember(database.operator.db, { projectId, userId: engineerId });
}, 240_000);

afterAll(async () => {
  await database?.stop();
});

/** The store's refusal code a write ends with, or undefined when it was stored. */
async function refusalOf(work: Promise<unknown>): Promise<string | undefined> {
  try {
    await work;
  } catch (error) {
    if (error instanceof StoreRefusal) return error.refusal;
    throw error;
  }
  return undefined;
}

function generation(createdBy: string, candidateIds: readonly string[] = []): GeneratedProposalWrite {
  return {
    inputsHash: HASH,
    candidateIds,
    formulas: [{ formulaId: 'capexPreliminaryEstimate', formulaVersion: '1' }],
    outputs: [{ output: 'capex.preliminaryEstimate', formulaId: 'capexPreliminaryEstimate', formulaVersion: '1', candidateId: null, missing: ['dataset:sovitech-point-templates'], incomplete: false }],
    pendingDocumentIds: [],
    paragraphs: [],
    createdBy,
  };
}

const as = <T>(userId: string, work: (request: Request) => Promise<T>): Promise<T> => withRequest(database.app, { userId, projectId }, work);

/** A candidate id added to a snapshot, in a request of its own. */
const addCandidate = (userId: string, snapshotId: string, candidateId: string) =>
  as(userId, (request) => request.trx.insertInto('proposal_snapshot_candidates').values({ snapshot_id: snapshotId, project_id: projectId, candidate_id: candidateId }).execute());

/** A formula row added to a snapshot, in a request of its own. */
const addFormula = (userId: string, snapshotId: string) =>
  as(userId, (request) => request.trx.insertInto('proposal_snapshot_formulas').values({ snapshot_id: snapshotId, project_id: projectId, formula_id: 'TEST-forged', formula_version: '9.9.9' }).execute());

/** A bare snapshot row naming `createdBy` as its writer, written by `userId`. */
const writeSnapshot = (userId: string, createdBy: string) =>
  as(userId, async (request) => {
    const id = newId();
    await request.trx.insertInto('proposal_snapshots').values({ id, project_id: projectId, inputs_hash: HASH, created_by: createdBy }).execute();
    return id;
  });

describe('G4-46 · 2.4 · rule 4: a stored snapshot is never added to, and names its own writer', { timeout: 120_000 }, () => {
  it('G4-46 · 2.4 · rule 4 · SVX17: a candidate id or a formula row added to a stored snapshot after its transaction is refused, whoever writes it; the proposal reads as generated', async () => {
    const snapshotId = await as(ownerId, (request) => recordGeneratedProposal(request, generation(ownerId)));
    const before = await as(ownerId, (request) => readProposalSnapshot(request, snapshotId));
    const later = await createTestDocumentValue(database, { projectId, label: 'G4-46 later value' });
    for (const userId of [ownerId, engineerId, serviceId]) {
      expect(await refusalOf(addCandidate(userId, snapshotId, later.candidateId)), `candidate by ${userId}`).toBe('snapshot_part_not_with_its_snapshot');
      expect(await refusalOf(addFormula(userId, snapshotId)), `formula by ${userId}`).toBe('snapshot_part_not_with_its_snapshot');
    }
    const after = await as(ownerId, (request) => readProposalSnapshot(request, snapshotId));
    expect(after?.candidateIds).toEqual(before?.candidateIds);
    expect(after?.formulas).toEqual([{ formulaId: 'capexPreliminaryEstimate', formulaVersion: '1' }]);
  });

  it('G4-46 · 2.4 · rule 4 · SVX17: a part written in the snapshot\'s transaction by another user, or naming another user\'s snapshot, is refused', async () => {
    const value = await createTestDocumentValue(database, { projectId, label: 'G4-46 same transaction' });
    // The owner's snapshot of an earlier transaction, added to inside a new transaction that writes a snapshot of its own.
    const earlier = await as(ownerId, (request) => recordGeneratedProposal(request, generation(ownerId)));
    const mixed = as(ownerId, async (request) => {
      await recordGeneratedProposal(request, generation(ownerId));
      await request.trx.insertInto('proposal_snapshot_candidates').values({ snapshot_id: earlier, project_id: projectId, candidate_id: value.candidateId }).execute();
    });
    expect(await refusalOf(mixed)).toBe('snapshot_part_not_with_its_snapshot');
  });

  it('G4-46 · 2.4 · rule 4 · SVX19: a snapshot names the user making the request as its writer, an owner of the project or its system service account', async () => {
    const listedBefore = (await as(ownerId, (request) => readProposalVersions(request))).map((version) => version.id);
    // A member who is no owner, in the owner's name or in their own.
    expect(await refusalOf(writeSnapshot(engineerId, ownerId))).toBe('snapshot_not_from_the_requesting_writer');
    expect(await refusalOf(writeSnapshot(engineerId, engineerId))).toBe('snapshot_not_from_the_requesting_writer');
    // The owner, in the system's name.
    expect(await refusalOf(writeSnapshot(ownerId, serviceId))).toBe('snapshot_not_from_the_requesting_writer');
    // A service account that is not a member of the project.
    const stranger = await createTestAccount(database, { label: 'G4-46 other service', kind: 'service', roles: [] });
    expect(await refusalOf(writeSnapshot(stranger, stranger))).toBeDefined();
    expect((await as(ownerId, (request) => readProposalVersions(request))).map((version) => version.id)).toEqual(listedBefore);

    // The writers the app has: the owner's Generate, with its parts in its transaction, and a regeneration by the system.
    const value = await createTestDocumentValue(database, { projectId, label: 'G4-46 used value' });
    const own = await as(ownerId, (request) => recordGeneratedProposal(request, generation(ownerId, [value.candidateId])));
    const regenerated = await as(serviceId, (request) => recordGeneratedProposal(request, generation(serviceId, [value.candidateId])));
    const versions = await as(ownerId, (request) => readProposalVersions(request));
    expect(versions.map((version) => version.id)).toEqual(expect.arrayContaining([own, regenerated]));
    expect(versions.find((version) => version.id === regenerated)?.createdBy).toBe(serviceId);
    expect((await as(ownerId, (request) => readProposalSnapshot(request, own)))?.candidateIds).toEqual([value.candidateId]);
  });
});
