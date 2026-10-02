/**
 * G13-9 (new in phase 4; rule 13, "Project boundary": "Uploaded documents, excerpts and extracted values serve only the
 * project they were uploaded to"; rule 1 (a project's name is the owner's own answer, never another's); PRD R-145, the
 * project switcher, UD-32).
 * Situation: a user who is a member of projects A and B opens the project switcher.
 * Expected: it lists A and B, under the names entered on step 1, and no other project.
 *
 * The switcher reads `projects.list` (docs/adr/0043, 0044 decision 2). Over a TEST database, through the API: a third
 * project C of another TEST owner exists, and the demo project of no member; the list names A and B only, each by its
 * step 1 name as a display object (Provided by you), and the workspace of C reads as not found (rule 13). The rendered
 * half (the switcher opened on a workspace page) is the shell's (apps/web). Every value is TEST data.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ProjectListResponseSchema } from '@sovitech/view-model/browser';
import { createTestAccount } from '@sovitech/db/testing';
import { signIn, startTestApi, type Auth, type TestApi } from './_support/api';
import { newOwnerProject } from './_support/workspace-store';

let api: TestApi;
let owner: Auth;
let other: Auth;

beforeAll(async () => {
  api = await startTestApi({ devLogin: true });
  const [ownerId] = api.devAccountIds;
  if (ownerId === undefined) throw new Error('no TEST development owner');
  owner = await signIn(api, ownerId);
  other = await signIn(api, await createTestAccount(api.database, { label: 'G13-9 other owner', kind: 'person', roles: ['owner'] }));
}, 180_000);

afterAll(async () => {
  await api.stop();
});

describe('G13-9 · rule 13: the project switcher lists the user\'s own projects only', { timeout: 120_000 }, () => {
  it('US-ADMIN-06 · R-145 · UD-32 · G13-9: a member of A and B sees A and B under their step 1 names, and no other project', async () => {
    const a = await newOwnerProject(api, owner, 'G13-9 project A');
    const b = await newOwnerProject(api, owner, 'G13-9 project B');
    const c = await newOwnerProject(api, other, 'G13-9 project C');

    const response = await api.app.inject({ method: 'GET', url: '/api/projects', headers: { ...owner } });
    expect(response.statusCode, response.body).toBe(200);
    const list = ProjectListResponseSchema.parse(response.json());
    expect(list.projects.map((row) => row.projectId).sort()).toEqual([a.projectId, b.projectId].sort());
    const names = new Map(list.displayObjects.map((display) => [display.valueId, display]));
    for (const [project, name] of [
      [a, 'TEST G13-9 project A'],
      [b, 'TEST G13-9 project B'],
    ] as const) {
      const row = list.projects.find((entry) => entry.projectId === project.projectId);
      const display = names.get(row?.name ?? '');
      expect(display?.text).toBe(name);
      expect(display?.badge?.id).toBe('provided_by_you');
      expect(row?.isDemo).toBe(false);
      expect(row?.demoLine).toBeNull();
    }
    expect(JSON.stringify(list)).not.toContain(c.projectId);
    expect(JSON.stringify(list)).not.toContain('G13-9 project C');

    // Another project's workspace reads as not found (rule 13).
    const foreign = await api.app.inject({ method: 'GET', url: `/api/projects/${c.projectId}/workspace`, headers: { ...owner } });
    expect(foreign.statusCode).toBe(404);
  });
});
