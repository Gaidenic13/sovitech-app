/**
 * G13-3 (docs/guardrails.md section 7; rule 13, "Erasure": one audited erasure job "removes
 * the file, its extracted text and its embeddings; replaces the excerpt text in every
 * evidence entry that cites it with '[erased]'; writes an `erased` document event;
 * withdraws the affected candidates. They keep their ids and values."; 2.3, "Deleting a
 * document"; F-INGEST-07; PRD R-016).
 * Situation: the owner requests erasure of a document.
 * Expected: file, text, embeddings and excerpts removed. Candidates withdrawn, with
 * "[erased]" excerpts. No other field's history changes.
 *
 * On a TEST database, the owner uploads two synthetic PDFs: the technical memo
 * (fixtures/pdf/memoriu-tehnic.pdf) and the area schedule (fixtures/pdf/tabel-suprafete.pdf).
 * The extractor (scripted from their ground truth) stores their text, and the one ingestion
 * path stores a value from each: the floors below ground from the memo's regim de înălțime
 * and the building area from the schedule. The owner then deletes the memo through the API.
 * Its file, and every file keyed to its content hash, is gone; its extracted text is
 * deleted (no embeddings exist in this build); its excerpt reads "[erased]"; its value is
 * withdrawn by the system with the erasure's reason, keeping its id and its value; the
 * document carries an `erased` event and one audit event records the erasure with ids and
 * counts. The area's candidate, its events and its evidence are as they were.
 */
import { afterAll, beforeAll, expect, test } from 'vitest';
import { ensureBuildingSubject, readProjectDocuments, withRequest } from '@sovitech/db';
import { productionRegistry, registryLookups } from '@sovitech/registry';
import { ingestProposals } from '../../apps/api/src/ingestion/proposals';
import { ScriptedRunner, fixtureBytes, ownerWithProject, signIn, startTestApi, testWorker, upload, type Auth, type TestApi } from './_support/api';
import { pdfOutput } from './_support/outputs';

const lookups = registryLookups(productionRegistry);

let api: TestApi;
let ownerId: string;
let projectId: string;
let auth: Auth;
let memoId: string;
let memoHash: string;
let scheduleId: string;
let scheduleHash: string;
let floorsCandidate: string;
let areaCandidate: string;

beforeAll(async () => {
  api = await startTestApi();
  ({ ownerId, projectId } = await ownerWithProject(api, 'G13-3'));
  auth = await signIn(api, ownerId);
  memoId = (await upload(api, auth, projectId, 'memoriu-tehnic.pdf', fixtureBytes('fixtures/pdf/memoriu-tehnic.pdf'))).body.documentId ?? '';
  scheduleId = (await upload(api, auth, projectId, 'tabel-suprafete.pdf', fixtureBytes('fixtures/pdf/tabel-suprafete.pdf'))).body.documentId ?? '';
  const runner = new ScriptedRunner((_job, job) =>
    pdfOutput(job, job.documentId === memoId ? 'fixtures/pdf/ground-truth/memoriu-tehnic.json' : 'fixtures/pdf/ground-truth/tabel-suprafete.json'),
  );
  await testWorker(api, runner).drain();
  const documents = (await withRequest(api.database.app, { userId: ownerId, projectId }, (request) => readProjectDocuments(request))).documents;
  memoHash = documents.find((document) => document.id === memoId)?.contentHash ?? '';
  scheduleHash = documents.find((document) => document.id === scheduleId)?.contentHash ?? '';
  const outcomes = await withRequest(api.database.app, { userId: api.extractionAccountId, projectId }, async (request) => {
    const building = await ensureBuildingSubject(request, api.extractionAccountId);
    return ingestProposals(request, {
      projectId,
      serviceId: api.extractionAccountId,
      field: lookups.field,
      proposals: [
        {
          proposal: {
            subjectId: building,
            fieldKey: 'building.floors',
            quantity: { value: 2, unit: 'count', qualifier: 'below_ground' },
            source: 'document',
            evidence: [{ documentId: memoId, contentHash: memoHash, locator: { page: 1 }, excerpt: 'Regim de inaltime: 2S+P+2E' }],
            original: { text: '2S', locale: 'ro-RO' },
          },
        },
        {
          proposal: {
            subjectId: building,
            fieldKey: 'building.grossFloorArea',
            quantity: { value: 6170, unit: 'm2' },
            alternatives: [{ value: 6.17, unit: 'm2' }],
            source: 'document',
            evidence: [{ documentId: scheduleId, contentHash: scheduleHash, locator: { page: 1 }, excerpt: 'Suprafata cladirii: 6.170 mp' }],
            original: { text: '6.170 mp', locale: 'ro-RO' },
          },
        },
      ],
    });
  });
  const stored = outcomes.map((outcome) => (outcome.outcome === 'stored' ? outcome.candidateId : ''));
  [floorsCandidate = '', areaCandidate = ''] = stored;
}, 240_000);

afterAll(async () => {
  await api.stop();
});

/** Everything stored about a candidate: its row, its events, its evidence and excerpts. */
async function history(candidateId: string): Promise<Record<string, unknown>> {
  return {
    candidate: await api.database.asAdministrator('SELECT * FROM sovitech.candidates WHERE id = $1', [candidateId]),
    events: await api.database.asAdministrator('SELECT type, role, reason FROM sovitech.candidate_events WHERE candidate_id = $1 ORDER BY at', [candidateId]),
    evidence: await api.database.asAdministrator(
      `SELECT locator.document_id, locator.page, excerpt.text FROM sovitech.evidence_locators AS locator
       JOIN sovitech.evidence_excerpts AS excerpt ON excerpt.evidence_id = locator.id WHERE locator.candidate_id = $1`,
      [candidateId],
    ),
  };
}

test('F-INGEST-07 · R-016 · G13-3: the owner requests erasure of a document: file, text and excerpts removed, candidates withdrawn with "[erased]" excerpts, no other field\'s history changes', async () => {
  expect(floorsCandidate).not.toBe('');
  expect(areaCandidate).not.toBe('');
  const floorsBefore = await history(floorsCandidate);
  const areaBefore = await history(areaCandidate);
  expect(floorsBefore['evidence']).toEqual([{ document_id: memoId, page: 1, text: 'Regim de inaltime: 2S+P+2E' }]);

  const deleted = await api.app.inject({ method: 'DELETE', url: `/api/projects/${projectId}/documents/${memoId}`, headers: { ...auth } });
  expect(deleted.statusCode).toBe(200);

  // The file, and every file keyed to its hash, removed; the other document's file kept.
  expect(await api.files.filesKeyedTo(projectId, memoHash)).toEqual([]);
  expect(await api.files.exists(api.files.originalPath(projectId, scheduleHash))).toBe(true);
  // The extracted text removed (the file name with it); no embeddings exist in this build.
  expect(await api.database.asAdministrator('SELECT part FROM sovitech.document_texts WHERE project_id = $1 AND content_hash = $2', [projectId, memoHash])).toEqual([]);
  // The candidate withdrawn by the erasure, with its id and value kept, and its excerpt "[erased]".
  const floorsAfter = await history(floorsCandidate);
  expect(floorsAfter['candidate']).toEqual(floorsBefore['candidate']);
  expect(floorsAfter['events']).toEqual([{ type: 'withdrawn', role: 'system', reason: 'document_erased' }]);
  expect(floorsAfter['evidence']).toEqual([{ document_id: memoId, page: 1, text: '[erased]' }]);
  // The erased event, and one audit event with ids and counts.
  expect(await api.database.asAdministrator('SELECT type, role, reason FROM sovitech.document_events WHERE document_id = $1 ORDER BY at', [memoId])).toEqual([
    { type: 'withdrawn', role: 'owner', reason: 'owner_deleted_document' },
    { type: 'erased', role: 'owner', reason: 'document_erased' },
  ]);
  const audit = await api.database.asAdministrator<{ details: Record<string, unknown> }>(
    `SELECT details FROM sovitech.audit_events WHERE project_id = $1 AND type = 'document_erased'`,
    [projectId],
  );
  expect(audit).toHaveLength(1);
  expect(audit[0]?.details).toMatchObject({ excerpts_erased: 1, candidates_withdrawn: 1, text_kept_for_another_document: false });
  // No other field's history changes.
  expect(await history(areaCandidate)).toEqual(areaBefore);
});
