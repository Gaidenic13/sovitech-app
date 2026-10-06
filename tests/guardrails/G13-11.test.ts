/**
 * G13-11 (new in phase 5, for the integrator to index; rule 13, "Isolation": "Every document, excerpt, embedding and
 * cache entry is keyed by project id, and retrieval filters by project before ranking"; "Project boundary").
 * Situation: a session scoped to project B reads proposal snapshots, their outputs and pending documents, generated
 * outputs and quotation records.
 * Expected: no project A row.
 *
 * Over a TEST database: project A has a stored proposal (with a pending document), an exported proposal and a TEST
 * quotation record (TEST accounts only). Through the API, B's owner reaches none of A's: A's routes read as not found;
 * A's snapshot and output ids under B's own project read as not found, and an export of A's snapshot is refused; B's
 * versions list and Reports hold none of A's rows. At the store, a session scoped to B reads no row of A from any of the
 * phase 5 tables (row-level security). Every account and value is TEST data; the uploaded file is a fixture.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestAccount, insertTestQuotationRecord } from '@sovitech/db/testing';
import { ExportResponseSchema, GenerateResponseSchema, ProposalVersionsResponseSchema, ReportsResponseSchema } from '@sovitech/view-model/browser';
import { fixtureBytes, signIn, startTestApi, upload, type Auth, type TestApi } from './_support/api';
import { newOwnerProject } from './_support/workspace-store';

let api: TestApi;
let ownerA: Auth;

beforeAll(async () => {
  api = await startTestApi({ devLogin: true });
  const [ownerId] = api.devAccountIds;
  if (ownerId === undefined) throw new Error('no TEST development owner');
  ownerA = await signIn(api, ownerId);
}, 180_000);

afterAll(async () => {
  await api.stop();
});

const TABLES = ['proposal_snapshots', 'proposal_snapshot_candidates', 'proposal_snapshot_formulas', 'proposal_snapshot_outputs', 'proposal_snapshot_pending_documents', 'proposal_snapshot_paragraphs', 'generated_outputs', 'quotation_records', 'quotation_record_inputs'] as const;

describe('G13-11 · rule 13: the stored proposal, its parts, generated outputs and quotation records stay with their project', { timeout: 90_000 }, () => {
  it('G13-11 · rule 13 "Isolation" · G13-5: a session scoped to project B reads no project A row, through the API or at the store', async () => {
    const a = await newOwnerProject(api, ownerA, 'G13-11 A');
    expect((await upload(api, ownerA, a.projectId, 'memoriu-tehnic.pdf', fixtureBytes('fixtures/pdf/memoriu-tehnic.pdf'))).status).toBe(201);
    const generated = await api.app.inject({ method: 'POST', url: `/api/projects/${a.projectId}/proposals`, headers: { ...ownerA }, payload: {} });
    const { snapshotId } = GenerateResponseSchema.parse(generated.json());
    const exported = await api.app.inject({ method: 'POST', url: `/api/projects/${a.projectId}/proposals/${snapshotId}/exports`, headers: { ...ownerA }, payload: {} });
    const { outputId } = ExportResponseSchema.parse(exported.json());
    const [ownerAId] = api.devAccountIds;
    const engineer = await createTestAccount(api.database, { label: 'G13-11 engineer', kind: 'person', roles: ['sovitech_engineer'] });
    const reviewer = await createTestAccount(api.database, { label: 'G13-11 commercial reviewer', kind: 'person', roles: [] });
    await insertTestQuotationRecord(api.database, { projectId: a.projectId, scopeUserId: ownerAId ?? '', snapshotId, reviewingEngineerId: engineer, commercialReviewerId: reviewer, issuedOn: '2026-10-01', validUntil: '2026-12-31', inputs: [] });

    const ownerBId = await createTestAccount(api.database, { label: 'G13-11 owner B', kind: 'person', roles: ['owner'] });
    const ownerB = await signIn(api, ownerBId);
    const b = await newOwnerProject(api, ownerB, 'G13-11 B');
    const get = (path: string) => api.app.inject({ method: 'GET', url: path, headers: { ...ownerB } });
    for (const path of ['proposals', `proposals/${snapshotId}`, `proposals/${snapshotId}/print`, 'reports', `exports/${outputId}/file`, 'exports/equipment']) {
      expect((await get(`/api/projects/${a.projectId}/${path}`)).statusCode, path).toBe(404);
    }
    for (const path of [`proposals/${snapshotId}`, `proposals/${snapshotId}/print`, `exports/${outputId}/file`]) {
      expect((await get(`/api/projects/${b.projectId}/${path}`)).statusCode, path).toBe(404);
    }
    expect((await api.app.inject({ method: 'POST', url: `/api/projects/${b.projectId}/proposals/${snapshotId}/exports`, headers: { ...ownerB }, payload: {} })).statusCode).toBe(404);
    expect((await api.app.inject({ method: 'POST', url: `/api/projects/${a.projectId}/proposals`, headers: { ...ownerB }, payload: {} })).statusCode).toBe(404);
    expect(ProposalVersionsResponseSchema.parse((await get(`/api/projects/${b.projectId}/proposals`)).json()).view.versions).toEqual([]);
    expect(ReportsResponseSchema.parse((await get(`/api/projects/${b.projectId}/reports`)).json()).view.state).toBe('none_generated');

    // The store: B's scope reads no row of A's from any phase 5 table (row-level security), A's own scope reads them.
    for (const table of TABLES) {
      const rowsB = await api.database.as('app', `SELECT project_id FROM sovitech.${table}`, [], { userId: ownerBId, projectId: b.projectId });
      expect(rowsB.filter((row) => (row as { project_id: string }).project_id === a.projectId), table).toEqual([]);
      const rowsAViaB = await api.database.as('app', `SELECT project_id FROM sovitech.${table}`, [], { userId: ownerBId, projectId: a.projectId });
      expect(rowsAViaB, table).toEqual([]);
    }
    const ownA = await api.database.as('app', 'SELECT id FROM sovitech.generated_outputs', [], { userId: ownerAId ?? '', projectId: a.projectId });
    expect(ownA).toEqual([{ id: outputId }]);
  });
});
