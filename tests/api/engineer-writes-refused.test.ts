/**
 * Phase 7 part B, the read-only adversarial review's finding A-3 (PRD R-128 "Until decided" (D-16): "No engineer
 * verifies, rejects, resolves, merges, splits, removes or records a survey in the app"; ADR 0053, amended in part B;
 * guardrails 2.3, "Revisions are declared, never guessed"; rule 13).
 *
 * Phase 7 made a development engineer account that can sign in, and the store lets a person holding `sovitech_engineer`
 * act on every project by role (ADR 0013 decision 5), a member or not, the demo included. A declared revision
 * supersedes the older document's unverified values (2.3), so an engineer's declaration changes what the owner sees.
 * While D-16 is open no engineer acts in the app, so the API takes a revision declaration from the project's owner
 * only: an engineer or a commercial reviewer is refused 403 `owner_only` with nothing stored, on another owner's project
 * and on the demo, and the owner's own declaration still holds. Over a TEST database; every account, project and
 * document is TEST data.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestAccount, createTestProject } from '@sovitech/db/testing';
import { signIn, startTestApi, type Auth, type TestApi } from '../guardrails/_support/api';
import { newOwnerProject, serviceOf, testDocumentIn } from '../guardrails/_support/workspace-store';

const LONG = { timeout: 120_000 };

let api: TestApi;
let owner: Auth;
let engineer: Auth;
let reviewer: Auth;

beforeAll(async () => {
  api = await startTestApi({ devLogin: true });
  const [ownerId] = api.devAccountIds;
  if (ownerId === undefined) throw new Error('no TEST development owner');
  owner = await signIn(api, ownerId);
  engineer = await signIn(api, await createTestAccount(api.database, { label: 'A-3 engineer', kind: 'person', roles: ['sovitech_engineer'] }));
  reviewer = await signIn(api, await createTestAccount(api.database, { label: 'A-3 commercial reviewer', kind: 'person', roles: ['sovitech_commercial_reviewer'] }));
}, 240_000);

afterAll(async () => {
  await api.stop();
});

function declare(auth: Auth, projectId: string, documentId: string, revisionOf: string) {
  return api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/documents/${documentId}/revision-of`, headers: { ...auth }, payload: { revisionOf } });
}

async function declarations(projectId: string): Promise<readonly { readonly role: string }[]> {
  return api.database.asAdministrator<{ role: string }>(`SELECT role FROM sovitech.document_events WHERE project_id = $1 AND type = 'declared_revision_of'`, [projectId]);
}

describe('A-3 · R-128 "Until decided" (D-16): a revision is declared by the owner only while no engineer acts in the app', LONG, () => {
  it('A-3: an engineer who is not a member, and a commercial reviewer, declaring a revision on another owner\'s project are refused 403 owner_only, and nothing is stored', async () => {
    const { projectId } = await newOwnerProject(api, owner, 'A-3 revisions');
    const serviceId = await serviceOf(api, projectId, 'A-3 revisions');
    const older = await testDocumentIn(api, { projectId, serviceId, label: 'A-3 plan rev A', fileName: 'TEST plan rev A.pdf', pages: ['TEST plan A'] });
    const newer = await testDocumentIn(api, { projectId, serviceId, label: 'A-3 plan rev B', fileName: 'TEST plan rev B.pdf', pages: ['TEST plan B'] });

    for (const auth of [engineer, reviewer]) {
      const refused = await declare(auth, projectId, newer.id, older.id);
      expect(refused.statusCode, refused.body).toBe(403);
      expect(refused.json()).toMatchObject({ code: 'owner_only' });
    }
    expect(await declarations(projectId)).toEqual([]);

    const declared = await declare(owner, projectId, newer.id, older.id);
    expect(declared.statusCode, declared.body).toBe(204);
    expect(await declarations(projectId)).toEqual([{ role: 'owner' }]);
  });

  it('A-3: an engineer declaring a revision on a demo project is refused 403 owner_only, and nothing is stored', async () => {
    const seedOwner = await createTestAccount(api.database, { label: 'A-3 demo seed', kind: 'seed', roles: ['owner'] });
    const demoId = await createTestProject(api.database, { ownerId: seedOwner, isDemo: true });
    const serviceId = await serviceOf(api, demoId, 'A-3 demo');
    const older = await testDocumentIn(api, { projectId: demoId, serviceId, label: 'A-3 demo rev A', fileName: 'TEST demo rev A.pdf', pages: ['TEST demo A'] });
    const newer = await testDocumentIn(api, { projectId: demoId, serviceId, label: 'A-3 demo rev B', fileName: 'TEST demo rev B.pdf', pages: ['TEST demo B'] });

    const refused = await declare(engineer, demoId, newer.id, older.id);
    expect(refused.statusCode, refused.body).toBe(403);
    expect(refused.json()).toMatchObject({ code: 'owner_only' });
    expect(await declarations(demoId)).toEqual([]);
  });
});
