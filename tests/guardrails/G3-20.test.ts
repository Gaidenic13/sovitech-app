/**
 * G3-20 (new in phase 4; rule 3, "A suggestion left in place counts as the owner's answer ... On Continue, each
 * suggestion that was visible, labelled and left in place is written as a new `user` candidate, with a
 * `user_confirmed` event and an `accepted_suggestion` event. The event's reason names what suggested it. The badge
 * reads 'Provided by you', and the answer is not provisional"; PRD R-052: System Scope's "Save and Continue"; the same
 * reading as G3-4, on the scope editor after Generate).
 * Situation: a visible Suggested system on System Scope, left in place, then "Save and Continue".
 * Expected: a new `user` candidate with `user_confirmed` and `accepted_suggestion` events; Provided by you; not
 * provisional.
 *
 * The registry declares no detection field (proposal P-3-DETECTION-FIELDS), so the case serves System Scope over a
 * TEST database with a TEST registry (the API's registry seam, docs/adr/0044 decision 4): a TEST detection field for
 * HVAC and step 4's suggestion rule as the proposal would register it (scopeSuggestionRule). A TEST document names HVAC;
 * System Scope shows HVAC Suggested with its reason; "Save and Continue" reports it; the server accepts it because it
 * suggests it now. A suggestion the page reports that the server does not make now (Lighting) is ignored. Nothing is
 * skipped from System Scope (no `skipped` event). Every value is TEST data.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { scopeFieldKey } from '@sovitech/registry';
import { SystemScopeResponseSchema, type DisplayObject } from '@sovitech/view-model/browser';
import { scopeSuggestionRule } from '@sovitech/view-model/server';
import { signIn, startTestApi, type Auth, type TestApi } from './_support/api';
import { registryField } from './_support/view-model';
import { documentValue, newOwnerProject, serviceOf, testDocumentIn, testRegistry } from './_support/workspace-store';

const detectionKey = (system: string): string => `building.testDetection.${system}`;
const detectionField = registryField(detectionKey('hvac'), { kind: 'enum', subject: 'building', options: ['present'], confirmBy: 'owner' });

let api: TestApi;
let owner: Auth;
let ownerId: string;

beforeAll(async () => {
  // The file name the rule's reason names comes from the stored name, as the API serves it.
  api = await startTestApi({ devLogin: true, registry: testRegistry({ fields: [detectionField], suggestionRules: [scopeSuggestionRule(detectionKey, () => 'TEST schema HVAC.pdf')] }) });
  const [id] = api.devAccountIds;
  if (id === undefined) throw new Error('no TEST development owner');
  ownerId = id;
  owner = await signIn(api, ownerId);
}, 180_000);

afterAll(async () => {
  await api.stop();
});

function scopeOf(body: unknown): { readonly view: ReturnType<typeof SystemScopeResponseSchema.parse>['view']; readonly displays: readonly DisplayObject[] } {
  const parsed = SystemScopeResponseSchema.parse(body);
  return { view: parsed.view, displays: parsed.displayObjects };
}

describe('G3-20 · rule 3: a Suggested system left in place on System Scope is the owner\'s answer on "Save and Continue"', { timeout: 120_000 }, () => {
  it('US-SCOPE-07 · R-052 · F-VALUE-06 · G3-20: a new user candidate with user_confirmed and accepted_suggestion (naming what suggested it), Provided by you, not provisional; an unmade suggestion is ignored; nothing is skipped', async () => {
    const { projectId, buildingId } = await newOwnerProject(api, owner, 'G3-20');
    const serviceId = await serviceOf(api, projectId, 'G3-20');
    const schematic = await testDocumentIn(api, { projectId, serviceId, label: 'G3-20 schema', fileName: 'TEST schema HVAC.pdf', pages: ['TEST present'] });
    const detection = await documentValue(api, { projectId, serviceId, subjectId: buildingId, field: detectionField, value: { choice: 'present' }, from: [{ document: schematic, page: 1, excerpt: 'TEST present' }] });

    const shown = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/workspace/system-scope`, headers: { ...owner } });
    expect(shown.statusCode, shown.body).toBe(200);
    const before = scopeOf(shown.json());
    const hvac = before.view.systems.find((row) => row.systemId === 'hvac');
    expect(hvac).toMatchObject({ included: true });
    expect(hvac?.suggestion?.reason.text).toBe('Suggested because TEST schema HVAC.pdf names HVAC');
    expect(before.displays.find((display) => display.valueId === hvac?.decision)?.badge?.id).toBe('suggested');

    const saved = await api.app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/workspace/system-scope/decisions`,
      headers: { ...owner },
      payload: {
        decisions: [],
        visibleSuggestions: [
          { field: { subjectId: projectId, fieldKey: scopeFieldKey('hvac') }, choice: 'include' },
          { field: { subjectId: projectId, fieldKey: scopeFieldKey('lighting') }, choice: 'include' },
        ],
      },
    });
    expect(saved.statusCode, saved.body).toBe(200);
    const after = scopeOf(saved.json());
    const decision = after.displays.find((display) => display.valueId === `project:${projectId}.scope.hvac`);
    expect(decision?.badge?.id).toBe('provided_by_you');
    expect(after.view.systems.find((row) => row.systemId === 'hvac')).toMatchObject({ included: true, suggestion: null });
    expect(after.displays.find((display) => display.valueId === `project:${projectId}.scope.lighting`)?.badge?.id).toBe('not_provided_yet');

    const candidates = await api.database.asAdministrator<{ id: string; source: string; created_by: string; choice: string }>(
      `SELECT id, source, created_by, choice FROM sovitech.candidates WHERE subject_id = $1 AND field_key = $2`,
      [projectId, scopeFieldKey('hvac')],
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ source: 'user', created_by: ownerId, choice: 'include' });
    const events = await api.database.asAdministrator<{ type: string; reason: string | null; role: string }>(`SELECT type, reason, role FROM sovitech.candidate_events WHERE candidate_id = $1 ORDER BY type`, [candidates[0]?.id ?? '']);
    expect(events.map((event) => event.type)).toEqual(['accepted_suggestion', 'user_confirmed']);
    expect(events.find((event) => event.type === 'accepted_suggestion')?.reason).toBe(`detection:${detection}`);
    expect(events.every((event) => event.role === 'owner')).toBe(true);
    // Not provisional: the owner's answer has no provisional line, and nothing was skipped from System Scope.
    expect((decision?.lines ?? []).some((line) => line.text.startsWith('Provisional'))).toBe(false);
    const skipped = await api.database.asAdministrator<{ n: number }>(`SELECT count(*)::integer AS n FROM sovitech.field_events WHERE project_id = $1 AND type = 'skipped'`, [projectId]);
    expect(skipped[0]?.n).toBe(0);
    const lighting = await api.database.asAdministrator<{ n: number }>(`SELECT count(*)::integer AS n FROM sovitech.candidates WHERE subject_id = $1 AND field_key = $2`, [projectId, scopeFieldKey('lighting')]);
    expect(lighting[0]?.n).toBe(0);
  });
});
