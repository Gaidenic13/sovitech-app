/**
 * G4-40 (new in phase 4; rule 4, "A new value is always added, never swapped in. It becomes a new candidate, and the
 * history is kept"; 2.4: "Candidates never change after they are written. Everything that happens to them later is an
 * append-only event"; PRD R-052, 7.1.1-C8: System Scope is the only scope editor after Generate).
 * Situation: the owner changes a system's scope on System Scope.
 * Expected: a new decision candidate holds it, and the earlier candidate is kept, unchanged, in the history.
 *
 * Over a TEST database, through the API's `workspace.systemScope.decide`: HVAC included (the switch on), then excluded
 * (the switch off, naming the value the screen showed). The second press adds a candidate; the first stays stored
 * exactly as it was written (same row, same value, no event of its own beyond its creation's `user_confirmed`); the
 * decision reads the newer one, Provided by you. A press equal to the stored decision writes nothing (7.1.1-C8), and a
 * press that names a value the field no longer shows is refused `shown_value_changed` with nothing stored (rule 4;
 * G4-36). Every value is TEST data.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { scopeFieldKey } from '@sovitech/registry';
import { SystemScopeResponseSchema } from '@sovitech/view-model/browser';
import { signIn, startTestApi, type Auth, type TestApi } from './_support/api';
import { newOwnerProject } from './_support/workspace-store';

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

interface Row {
  readonly id: string;
  readonly choice: string;
  readonly created_at: string;
  readonly source: string;
}

async function stored(projectId: string): Promise<readonly Row[]> {
  return api.database.asAdministrator<Row>(`SELECT id, choice, created_at::text, source FROM sovitech.candidates WHERE subject_id = $1 AND field_key = $2 ORDER BY created_at, id`, [projectId, scopeFieldKey('hvac')]);
}

function decide(projectId: string, choice: 'include' | 'exclude', corrects: readonly string[]) {
  return api.app.inject({
    method: 'POST',
    url: `/api/projects/${projectId}/workspace/system-scope/decisions`,
    headers: { ...owner },
    payload: { decisions: [{ field: { subjectId: projectId, fieldKey: scopeFieldKey('hvac') }, choice, corrects }], visibleSuggestions: [] },
  });
}

describe('G4-40 · rule 4: a changed scope decision is added, never swapped in', { timeout: 120_000 }, () => {
  it('US-SCOPE-06 · R-052 · F-VALUE-12 · G4-40: the owner changes HVAC on System Scope: a new candidate holds it, the earlier one is kept unchanged in the history', async () => {
    const { projectId } = await newOwnerProject(api, owner, 'G4-40');
    const first = await decide(projectId, 'include', []);
    expect(first.statusCode, first.body).toBe(200);
    const [included] = await stored(projectId);
    expect(included).toMatchObject({ choice: 'include', source: 'user' });

    // The same press again writes nothing (7.1.1-C8).
    expect((await decide(projectId, 'include', [included?.id ?? ''])).statusCode).toBe(200);
    expect(await stored(projectId)).toEqual([included]);

    const changed = await decide(projectId, 'exclude', [included?.id ?? '']);
    expect(changed.statusCode, changed.body).toBe(200);
    const rows = await stored(projectId);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(included);
    expect(rows[1]).toMatchObject({ choice: 'exclude', source: 'user' });
    const view = SystemScopeResponseSchema.parse(changed.json());
    const decision = view.displayObjects.find((display) => display.valueId === `project:${projectId}.scope.hvac`);
    expect(decision?.badge?.id).toBe('provided_by_you');
    expect(view.view.systems.find((row) => row.systemId === 'hvac')?.included).toBe(false);
    // The earlier candidate has no event but its own creation's: it was not rejected, superseded or withdrawn.
    const events = await api.database.asAdministrator<{ type: string }>(`SELECT type FROM sovitech.candidate_events WHERE candidate_id = $1`, [included?.id ?? '']);
    expect(events.map((event) => event.type)).toEqual(['user_confirmed']);

    // A press from a screen that showed the earlier value: refused, nothing stored (rule 4; G4-36).
    const stale = await decide(projectId, 'include', [included?.id ?? '']);
    expect(stale.statusCode).toBe(409);
    expect((stale.json() as { code: string }).code).toBe('shown_value_changed');
    expect(await stored(projectId)).toHaveLength(2);
  });
});
