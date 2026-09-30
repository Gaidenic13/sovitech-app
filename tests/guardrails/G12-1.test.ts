/**
 * G12-1 (docs/guardrails.md section 7; rule 12, "Partial processing is shown with its
 * coverage": "RVT model stored, not analysed"; 2.8, "File stored but not analysed"; prompt
 * 3 5.2 "Parsing scope" and 5.3; PRD R-014, R-022).
 * Situation: an RVT file uploaded with no parser.
 * Expected: status line "Not analysed: RVT model stored, not analysed", and nothing
 * extracted.
 *
 * No RVT fixture exists (the generators write IFC, PDF and XLSX), so the case uploads TEST
 * bytes through the real upload protocol, with a guard that accepts those bytes' hash in
 * place of the owner's fixtures-only guard (a dependency the case hands in; the guard
 * itself is tested in tests/api/uploads.test.ts). The RVT file is stored under its project
 * and content hash, reads the 2.8 line word for word, and nothing is extracted: no analysis
 * job, no extracted text (its file name is the only text of it kept), no finding. The same
 * holds for the other formats stored and not analysed, each with its file type in the
 * slot: the substitutions prompt 3 5.3 lists for the approver.
 */
import { createHash } from 'node:crypto';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { STORED_ONLY_WORD } from '../../apps/api/src/documents/formats';
import { documentList, ownerWithProject, signIn, startTestApi, upload, type Auth, type TestApi } from './_support/api';

const TEST_FILES = {
  rvt: Buffer.from('TEST bytes standing in for an RVT model: not a real model'),
  dwg: Buffer.from('TEST bytes standing in for a DWG drawing: not a real drawing'),
  docx: Buffer.from('TEST bytes standing in for a DOCX file: not a real file'),
  jpg: Buffer.from('TEST bytes standing in for a JPG image: not a real image'),
  png: Buffer.from('TEST bytes standing in for a PNG image: not a real image'),
  zip: Buffer.from('TEST bytes standing in for a ZIP archive: not a real archive'),
} as const;
const hashOf = (bytes: Buffer): string => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;

let api: TestApi;
let ownerId: string;
let projectId: string;
let auth: Auth;

beforeAll(async () => {
  const accepted = new Set(Object.values(TEST_FILES).map(hashOf));
  api = await startTestApi({ uploadGuard: { accepts: (contentHash) => accepted.has(contentHash) } });
  ({ ownerId, projectId } = await ownerWithProject(api, 'G12-1'));
  auth = await signIn(api, ownerId);
}, 240_000);

afterAll(async () => {
  await api.stop();
});

test('F-INGEST-03 · R-014 · R-022 · G12-1: an RVT file uploaded with no parser reads "Not analysed: RVT model stored, not analysed", and nothing is extracted', async () => {
  const uploaded = await upload(api, auth, projectId, 'TEST model.rvt', TEST_FILES.rvt);
  expect(uploaded.status).toBe(201);
  const documentId = uploaded.body.documentId ?? '';
  expect(uploaded.body.statusLine).toEqual({
    kind: 'status_line',
    statusLineId: 'not_analysed',
    text: 'Not analysed: RVT model stored, not analysed',
    slots: { fileType: 'RVT model' },
  });
  expect(await documentList(api, auth, projectId)).toMatchObject([{ documentId, format: 'rvt', statusLine: { text: 'Not analysed: RVT model stored, not analysed' } }]);

  // Stored, under its project and content hash.
  expect(await api.files.exists(api.files.originalPath(projectId, hashOf(TEST_FILES.rvt)))).toBe(true);
  // Nothing extracted: no analysis job, no text but the file name, no finding, no candidate.
  const rows = async (sql: string) => api.database.asAdministrator(sql, [projectId]);
  expect(await rows('SELECT id FROM sovitech_work.analysis_jobs WHERE project_id = $1')).toEqual([]);
  expect(await rows('SELECT part FROM sovitech.document_texts WHERE project_id = $1')).toEqual([{ part: `file:name:${documentId}` }]);
  expect(await rows('SELECT id FROM sovitech.document_findings WHERE project_id = $1')).toEqual([]);
  expect(await rows('SELECT id FROM sovitech.candidates WHERE project_id = $1')).toEqual([]);
  expect(await rows(`SELECT status, coverage FROM sovitech.document_analysis_events WHERE project_id = $1`)).toEqual([
    { status: 'stored_only', coverage: 'stored: RVT model' },
  ]);
});

test('G12-1, the G12-1 form for the other formats stored and not analysed (prompt 3 5.3): the file type in the slot, nothing extracted', async () => {
  for (const [format, bytes] of Object.entries(TEST_FILES)) {
    if (format === 'rvt') continue;
    const word = STORED_ONLY_WORD[format as keyof typeof STORED_ONLY_WORD];
    const uploaded = await upload(api, auth, projectId, `TEST file.${format}`, bytes);
    expect(uploaded.body.statusLine, format).toMatchObject({ statusLineId: 'not_analysed', text: `Not analysed: ${word} stored, not analysed` });
  }
  expect(await api.database.asAdministrator('SELECT id FROM sovitech_work.analysis_jobs WHERE project_id = $1', [projectId])).toEqual([]);
});
