/**
 * The revision panel against the derive, over a TEST database through the API (the final verifier's NP-2; its probe
 * `revision.adv.test.ts` as an API sequence; 2.3 "Revisions are declared, never guessed"; ADR 0016 decision 17: "On one
 * pair of documents the later declaration replaces the earlier one, so declaring B a revision of A after A a revision
 * of B corrects the first"; G4-44's first project).
 *
 * The owner declares B a revision of A by mistake. Documents serves B's "Revision of" A; the panel on A, read from the
 * served rows by the web's own function (`revisionCandidates`), offers B, and declaring A a revision of B (204) is the
 * correction the derive applies: A's "Revision of" is B and B's is none. Before the fix the panel on A offered nothing
 * (it left out every document whose chain reaches A, a direct pair included), so Documents had no way to correct the
 * direction. A document whose chain reaches the row through another document stays left out (a cycle, which the derive
 * ignores with every declaration on it: G4-44's second project). Every account and document is TEST data.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DocumentsResponseSchema, type DocumentRow } from '@sovitech/view-model/browser';
import { revisionCandidates } from '../../apps/web/src/workspace/pages/documents/revisions';
import { signIn, startTestApi, type Auth, type TestApi } from '../guardrails/_support/api';
import { newOwnerProject, serviceOf, testDocumentIn } from '../guardrails/_support/workspace-store';

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

interface Served {
  readonly rows: readonly DocumentRow[];
  /** A row's file name as served. */
  readonly name: (row: DocumentRow) => string;
  /** Each row's file name and the file name it is a revision of ("none" when it names none). */
  readonly revisions: Record<string, string>;
  /** The file names the revision panel offers on the row of `fileName`. */
  readonly offered: (fileName: string) => string[];
}

async function served(projectId: string): Promise<Served> {
  const response = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/workspace/documents`, headers: { ...owner } });
  expect(response.statusCode, response.body).toBe(200);
  const parsed = DocumentsResponseSchema.parse(response.json());
  const text = (valueId: string): string => parsed.displayObjects.find((display) => display.valueId === valueId)?.text ?? '?';
  const name = (row: DocumentRow): string => text(row.fileName);
  const rows = parsed.view.rows;
  return {
    rows,
    name,
    revisions: Object.fromEntries(rows.map((row) => [name(row), row.revisionOf === null ? 'none' : text(row.revisionOf)])),
    offered: (fileName) => {
      const current = rows.find((row) => name(row) === fileName);
      if (current === undefined) throw new Error(`no row ${fileName}`);
      return revisionCandidates(current, rows)
        .map(name)
        .sort();
    },
  };
}

async function declare(projectId: string, documentId: string, revisionOf: string): Promise<void> {
  const response = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/documents/${documentId}/revision-of`, headers: { ...owner }, payload: { revisionOf } });
  expect(response.statusCode, response.body).toBe(204);
}

describe('UD-43 · 2.3 "Revisions are declared, never guessed": the revision panel offers the correction the derive applies', { timeout: 120_000 }, () => {
  it('NP-2 · A-5 · G4-44 · ADR 0016 decision 17: B declared a revision of A by mistake; the panel on A offers B, and declaring A a revision of B corrects the direction; a document that would close a cycle through another stays left out', async () => {
    const project = await newOwnerProject(api, owner, 'NP-2 correction');
    const serviceId = await serviceOf(api, project.projectId, 'NP-2 correction');
    const [a, b, c] = await Promise.all(
      ['A', 'B', 'C'].map((name) => testDocumentIn(api, { projectId: project.projectId, serviceId, label: `NP-2 correction ${name}`, fileName: `TEST ${name}.pdf`, pages: ['TEST'] })),
    );
    if (a === undefined || b === undefined || c === undefined) throw new Error('three TEST documents');

    // The mistake: B declared a revision of A.
    await declare(project.projectId, b.id, a.id);
    let now = await served(project.projectId);
    expect(now.revisions).toEqual({ 'TEST A.pdf': 'none', 'TEST B.pdf': 'TEST A.pdf', 'TEST C.pdf': 'none' });
    // The panel on A offers B (the reverse of a direct pair is a correction) and C.
    expect(now.offered('TEST A.pdf')).toEqual(['TEST B.pdf', 'TEST C.pdf']);

    // The correction: A declared a revision of B; the later declaration on the pair stands.
    await declare(project.projectId, a.id, b.id);
    now = await served(project.projectId);
    expect(now.revisions).toEqual({ 'TEST A.pdf': 'TEST B.pdf', 'TEST B.pdf': 'none', 'TEST C.pdf': 'none' });
    // Corrected back, if that was the mistake: B's panel offers A again.
    expect(now.offered('TEST B.pdf')).toEqual(['TEST A.pdf', 'TEST C.pdf']);

    // C declared a revision of A: C -> A -> B. On B, A is its direct revision (offered); C reaches B through A, so
    // declaring B a revision of C would close a cycle, and C is left out.
    await declare(project.projectId, c.id, a.id);
    now = await served(project.projectId);
    expect(now.revisions).toEqual({ 'TEST A.pdf': 'TEST B.pdf', 'TEST B.pdf': 'none', 'TEST C.pdf': 'TEST A.pdf' });
    expect(now.offered('TEST B.pdf')).toEqual(['TEST A.pdf']);
    expect(now.offered('TEST A.pdf')).toEqual(['TEST B.pdf', 'TEST C.pdf']);
  });
});
