/**
 * G9-6 (docs/guardrails.md section 7; rule 8, "Counts state what they count: rooms: all spaces, guest rooms or keys ...
 * A count with an unknown qualifier cannot feed a per-unit estimate"; rule 9, "No laundering"; rule 1, "Values not
 * written literally become inferences, and the AI never derives quantities"; 2.5, "Every equipment count is calculated
 * from the asset register").
 * Situation: 424 spaces including technical rooms.
 * Expected: stored as all_spaces. Room controllers are not derived from it.
 *
 * Over a TEST database, through the API. The count is stated with what it counts where the store can know it: the
 * owner's own entry on step 3's rooms row (Edit; the registry requires the qualifier, rule 8) of 424 counting all
 * spaces is stored with qualifier `all_spaces`; the workspace's project card and step 3 show it as all spaces, never as
 * guest rooms or keys; and nothing is derived from it: no asset (no room controller) enters the register, every
 * equipment count by type and every points figure reads "Not available yet" naming the missing SOVITECH dataset, and no
 * served text holds a figure computed from 424.
 *
 * Beside the case (found while writing it, phase 4): the same words read from a TEST document through the one ingestion
 * path (apps/api/src/ingestion/proposals.ts; the verifier's five checks) are stored with the qualifier unknown, whatever
 * the proposal says, because the verifier reads a qualifier only from the rule 8 words it holds (packages/domain
 * evidence.ts `RULE_8_QUALIFIER_WORDS`), and it holds none for rooms. That is stricter than the Expected (rule 8: "A
 * count with an unknown qualifier cannot feed a per-unit estimate"; it is shown with "Unknown" as what it counts, never
 * as guest rooms), and listed for the integrator: the words that state "all spaces" in a document ("spații", "inclusiv
 * încăperi tehnice") are the glossary's to approve (rule 8, "Abbreviations"; `dataset-glossary`). Every value is TEST
 * data.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ensureBuildingSubject, withRequest } from '@sovitech/db';
import { productionRegistry, registryLookups } from '@sovitech/registry';
import { EquipmentResponseSchema, StepResponseSchema, SystemScopeResponseSchema, WorkspaceFrameResponseSchema, type DisplayObject } from '@sovitech/view-model/browser';
import { ingestProposals } from '../../apps/api/src/ingestion/proposals';
import { signIn, startTestApi, type Auth, type TestApi } from './_support/api';
import { newOwnerProject, serviceOf, testDocumentIn } from './_support/workspace-store';

const lookups = registryLookups(productionRegistry);
const EXCERPT = 'TEST 424 spatii, inclusiv incaperi tehnice';

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

async function served<T>(projectId: string, path: string, schema: { parse: (body: unknown) => T }): Promise<T> {
  const response = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/${path}`, headers: { ...owner } });
  expect(response.statusCode, response.body).toBe(200);
  return schema.parse(response.json());
}

function texts(displays: readonly DisplayObject[]): string[] {
  return displays.flatMap((display) => [display.text, ...(display.lines ?? []).map((line) => line.text), ...(display.sourceLine === undefined ? [] : [display.sourceLine.text])]);
}

describe('G9-6 · rule 8: a count states what it counts, and nothing is derived from it', { timeout: 120_000 }, () => {
  it('US-REVIEW-14 · R-049 · US-REVIEW-07 · F-VALUE-11 · G9-6: 424 spaces counting all spaces, technical rooms included, is stored as all_spaces, shown as all spaces, and no room controller, asset or points figure is derived from it', async () => {
    const { projectId, buildingId } = await newOwnerProject(api, owner, 'G9-6');
    const edited = await api.app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/fields/edit`,
      headers: { ...owner },
      payload: { field: { subjectId: buildingId, fieldKey: 'building.rooms' }, value: { kind: 'quantity', raw: '424', qualifier: 'all_spaces' }, corrects: [] },
    });
    expect(edited.statusCode, edited.body).toBe(200);
    await expectNothingDerived(projectId, buildingId, 'all_spaces');
  });

  it('G9-6 (beside the case) · rule 8: the same words read from a document through the verifier are stored with the qualifier unknown (no rule 8 words for rooms), shown as Unknown, never guest rooms, and nothing is derived from them', async () => {
    const { projectId, buildingId } = await newOwnerProject(api, owner, 'G9-6 document');
    const serviceId = await serviceOf(api, projectId, 'G9-6');
    const memoriu = await testDocumentIn(api, { projectId, serviceId, label: 'G9-6 memoriu', fileName: 'TEST memoriu G9-6.pdf', pages: [EXCERPT] });
    const outcomes = await withRequest(api.database.app, { userId: serviceId, projectId }, async (request) => {
      await ensureBuildingSubject(request, serviceId);
      return ingestProposals(request, {
        projectId,
        serviceId,
        field: lookups.field,
        proposals: [
          {
            proposal: {
              subjectId: buildingId,
              fieldKey: 'building.rooms',
              quantity: { value: 424, unit: 'count', qualifier: 'all_spaces' },
              source: 'document',
              evidence: [{ documentId: memoriu.id, contentHash: memoriu.contentHash, locator: { page: 1 }, excerpt: EXCERPT }],
              original: { text: '424 spatii', locale: 'ro-RO' },
            },
          },
        ],
      });
    });
    expect(outcomes.map((outcome) => outcome.outcome)).toEqual(['stored']);
    await expectNothingDerived(projectId, buildingId, null);
  });
});

/** What the case expects of a stored rooms count of 424: its qualifier as stored, shown as such, and nothing derived from it. */
async function expectNothingDerived(projectId: string, buildingId: string, qualifier: 'all_spaces' | null): Promise<void> {
  const [stored] = await api.database.asAdministrator<{ qualifier: string | null; value: string }>(
    `SELECT quantity_qualifier AS qualifier, quantity_value::text AS value FROM sovitech.candidates WHERE subject_id = $1 AND field_key = 'building.rooms'`,
    [buildingId],
  );
  expect(stored?.qualifier ?? null).toBe(qualifier);

  // Shown as all spaces on the project card and on step 3: one value id, one display.
  const frame = await served(projectId, 'workspace', WorkspaceFrameResponseSchema);
  const [roomsId] = frame.view.projectCard.rooms;
  expect(roomsId).toBe(`building:${buildingId}.rooms`);
  const card = frame.displayObjects.find((display) => display.valueId === roomsId);
  expect(card?.text).toContain(qualifier === null ? '424 spatii (Unknown)' : '424 all spaces');
  expect(card?.text).not.toMatch(/guest rooms|keys/u);
  const step3 = await served(projectId, 'steps/3', StepResponseSchema);
  expect(step3.displayObjects.find((display) => display.valueId === roomsId)?.text).toBe(card?.text);

  // Nothing derived: no asset, every count by type and every points figure "Not available yet", no figure from 424.
  const [assets] = await api.database.asAdministrator<{ n: number }>(`SELECT count(*)::integer AS n FROM sovitech.asset_identities WHERE project_id = $1`, [projectId]);
  expect(assets?.n).toBe(0);
  const equipment = await served(projectId, 'workspace/equipment', EquipmentResponseSchema);
  expect(equipment.view.rows).toEqual([]);
  expect(equipment.displayObjects.find((display) => display.valueId === equipment.view.total)?.text).toBe('Not available yet: SOVITECH asset taxonomy');
  const scope = await served(projectId, 'workspace/system-scope', SystemScopeResponseSchema);
  for (const row of scope.view.systems) {
    expect(scope.displayObjects.find((display) => display.valueId === row.equipment)?.text).toBe('Not available yet: SOVITECH asset taxonomy');
    expect(scope.displayObjects.find((display) => display.valueId === row.points)?.text).toBe('Not available yet: SOVITECH point templates');
  }
  for (const text of [...texts(frame.displayObjects), ...texts(equipment.displayObjects), ...texts(scope.displayObjects)]) {
    expect(text).not.toMatch(/\b(controller|controllers|points?)\b.*\d|\d.*\b(controller|controllers|guest rooms)\b/iu);
  }
}
