/**
 * G4-44 (new in phase 4 part B; 2.3, "Revisions are declared, never guessed": "A document is a revision of another only
 * through `supersedes`. The old one is then superseded"; the derive keeps one direction per pair of documents and ignores
 * every declaration on a cycle, packages/domain/src/documents.ts; finding A-5, its server half).
 * Situation: the owner declares A a revision of B, then B a revision of A; in a second project, A of B, B of C and C of
 * A.
 * Expected: Documents names a "Revision of" only where the derive applies the declaration: B as a revision of A in the
 * first project, and no row in the second.
 *
 * Over a TEST database, through the API (`documents.revisionOf`, 204 each; no new refusal: the web's panel leaves out a
 * document that would close a cycle): before the fix the first project showed both rows as a revision of the other, and
 * the second three such rows, while the derive superseded only A, then nothing. Every account and document is TEST data.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DocumentsResponseSchema } from '@sovitech/view-model/browser';
import { signIn, startTestApi, type Auth, type TestApi } from './_support/api';
import { newOwnerProject, serviceOf, testDocumentIn } from './_support/workspace-store';

let api: TestApi;
let owner: Auth;

beforeAll(async () => {
  api = await startTestApi({ devLogin: true });
  const [ownerId] = api.devAccountIds;
  if (ownerId === undefined) throw new Error('no TEST development owner');
  owner = await signIn(api, ownerId);
}, 180_000);

afterAll(async () => {
  await api.stop();
});

/** Each row's file name and the file name it is a revision of ("none" when the row names none). */
async function revisions(projectId: string): Promise<Record<string, string>> {
  const response = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/workspace/documents`, headers: { ...owner } });
  expect(response.statusCode, response.body).toBe(200);
  const parsed = DocumentsResponseSchema.parse(response.json());
  const text = (valueId: string): string => parsed.displayObjects.find((display) => display.valueId === valueId)?.text ?? '?';
  return Object.fromEntries(parsed.view.rows.map((row) => [text(row.fileName), row.revisionOf === null ? 'none' : text(row.revisionOf)]));
}

async function declare(projectId: string, documentId: string, revisionOf: string): Promise<void> {
  const response = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/documents/${documentId}/revision-of`, headers: { ...owner }, payload: { revisionOf } });
  expect(response.statusCode, response.body).toBe(204);
}

describe('G4-44 · 2.3 "Revisions are declared, never guessed": Documents names only the revisions the derive applies', { timeout: 120_000 }, () => {
  it('A-5 · R-028 · UD-43 · G4-44: A of B then B of A shows B as a revision of A only; A of B, B of C and C of A shows none', async () => {
    const pair = await newOwnerProject(api, owner, 'G4-44 pair');
    const pairService = await serviceOf(api, pair.projectId, 'G4-44 pair');
    const [a, b] = await Promise.all(['A', 'B'].map((name) => testDocumentIn(api, { projectId: pair.projectId, serviceId: pairService, label: `G4-44 pair ${name}`, fileName: `TEST ${name}.pdf`, pages: ['TEST'] })));
    if (a === undefined || b === undefined) throw new Error('two TEST documents');
    await declare(pair.projectId, a.id, b.id);
    expect(await revisions(pair.projectId)).toEqual({ 'TEST A.pdf': 'TEST B.pdf', 'TEST B.pdf': 'none' });
    await declare(pair.projectId, b.id, a.id);
    expect(await revisions(pair.projectId)).toEqual({ 'TEST A.pdf': 'none', 'TEST B.pdf': 'TEST A.pdf' });

    const cycle = await newOwnerProject(api, owner, 'G4-44 cycle');
    const cycleService = await serviceOf(api, cycle.projectId, 'G4-44 cycle');
    const documents = await Promise.all(['A', 'B', 'C'].map((name) => testDocumentIn(api, { projectId: cycle.projectId, serviceId: cycleService, label: `G4-44 cycle ${name}`, fileName: `TEST ${name}.pdf`, pages: ['TEST'] })));
    const [ca, cb, cc] = documents;
    if (ca === undefined || cb === undefined || cc === undefined) throw new Error('three TEST documents');
    await declare(cycle.projectId, ca.id, cb.id);
    await declare(cycle.projectId, cb.id, cc.id);
    expect(await revisions(cycle.projectId)).toEqual({ 'TEST A.pdf': 'TEST B.pdf', 'TEST B.pdf': 'TEST C.pdf', 'TEST C.pdf': 'none' });
    await declare(cycle.projectId, cc.id, ca.id);
    expect(await revisions(cycle.projectId)).toEqual({ 'TEST A.pdf': 'none', 'TEST B.pdf': 'none', 'TEST C.pdf': 'none' });
  });
});
