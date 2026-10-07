/**
 * G3-24 (new in phase 7; rule 3: "The app records how often owners and engineers correct each confidence tier and item
 * type", and the drop applies only "When corrections for a tier exceed the threshold set by the approver"; PRD R-152
 * "Until decided" (D-53): "Corrections are counted per confidence tier and item type, and no tier's wording changes";
 * docs/adr/0054 decisions 1 and 3).
 * Situation: owners correct inferences of the Likely and Possible tiers while the approver has not set the correction
 * threshold.
 * Expected: the corrections are counted per tier and item type, and every tier's wording stays as it is.
 *
 * The domain half: `calibrateTiers` with no setting (null) counts every correction and drops no tier. The store and API
 * half, over a TEST database: owners correct a Likely and a Possible inference of the building type through the
 * wizard's Edit (each logs section 8's `owner_corrected_inference` with the tier the owner was shown); the admin's
 * calibration counts read one correction for each tier and that item type, the threshold not set and every tier's
 * wording unchanged; and a third project's Likely inference still reads Likely on its own step 5. Every account,
 * document and value is TEST data.
 */
import { afterAll, beforeAll, describe, expect, it, test } from 'vitest';
import { calibrateTiers, wordingTier, type CalibrationDecision } from '@sovitech/domain';
import { FIELD } from '@sovitech/registry';
import { AdminGuardrailEventsResponseSchema, StepResponseSchema } from '@sovitech/view-model/browser';
import { adminGet, adminOf, inferredValue } from './_support/admin';
import { signIn, startTestApi, type Auth, type TestApi } from './_support/api';
import { newOwnerProject, productionFieldOf, serviceOf, testDocumentIn } from './_support/workspace-store';

const LONG = { timeout: 120_000 };
const at = (minute: number): string => new Date(Date.UTC(2026, 9, 6, 9, minute)).toISOString();

describe('G3-24 · rule 3 · R-152 "Until decided" · ADR 0054', () => {
  test('G3-24 (the domain half): with no threshold set, corrections of Likely and Possible inferences are counted per tier and item type, and no tier\'s wording changes', () => {
    const decisions: CalibrationDecision[] = [
      ...Array.from({ length: 30 }, (_, index): CalibrationDecision => ({ tier: 'high', fieldKey: 'test.building.type', outcome: 'corrected', by: 'owner', at: at(index) })),
      { tier: 'medium', fieldKey: 'test.building.type', outcome: 'corrected', by: 'owner', at: at(40) },
      { tier: 'medium', fieldKey: 'test.asset.type', outcome: 'corrected', by: 'owner', at: at(41) },
    ];
    const calibration = calibrateTiers(decisions, null);
    expect(calibration.map((tier) => [tier.tier, tier.correctionsByField, tier.dropped])).toEqual([
      ['high', { 'test.building.type': 30 }, false],
      ['medium', { 'test.asset.type': 1, 'test.building.type': 1 }, false],
      ['low', {}, false],
    ]);
    for (const tier of ['high', 'medium', 'low'] as const) expect(wordingTier(tier, calibration)).toBe(tier);
  });
});

describe('G3-24 (the store and API half)', LONG, () => {
  let api: TestApi;
  let owner: Auth;
  let admin: Auth;

  beforeAll(async () => {
    api = await startTestApi({ devLogin: true });
    const [ownerId] = api.devAccountIds;
    if (ownerId === undefined) throw new Error('no TEST development owner');
    owner = await signIn(api, ownerId);
    ({ admin } = await adminOf(api, 'G3-24'));
  }, 240_000);

  afterAll(async () => {
    await api.stop();
  });

  /** A project whose building type is inferred "hotel" from one TEST page, at the tier the page's words support. */
  async function inferredProject(label: string, page: string, confidence: 'high' | 'medium') {
    const { projectId, buildingId } = await newOwnerProject(api, owner, label);
    const serviceId = await serviceOf(api, projectId, label);
    const document = await testDocumentIn(api, { projectId, serviceId, label: `${label} page`, fileName: 'TEST memoriu.pdf', pages: [page] });
    const inferenceId = await inferredValue(api, { projectId, serviceId, subjectId: buildingId, field: productionFieldOf(FIELD.buildingType), choice: 'hotel', confidence, from: [{ document, page: 1, excerpt: page }] });
    return { projectId, buildingId, inferenceId };
  }

  const typeBadge = async (projectId: string, buildingId: string): Promise<string | undefined> => {
    const five = StepResponseSchema.parse((await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/steps/5`, headers: { ...owner } })).json());
    return five.displayObjects.find((display) => display.valueId === `building:${buildingId}.type`)?.badge?.id;
  };

  it('G3-24: owners correct a Likely and a Possible inference; the corrections are counted per tier and item type, and every tier\'s wording stays as it is', async () => {
    const likely = await inferredProject('G3-24 likely', 'TEST Destinatia cladirii: hotel', 'high');
    const possible = await inferredProject('G3-24 possible', 'TEST Tabel camere: camere', 'medium');
    const untouched = await inferredProject('G3-24 untouched', 'TEST Destinatia: hotel', 'high');
    expect(await typeBadge(likely.projectId, likely.buildingId)).toBe('likely');
    expect(await typeBadge(possible.projectId, possible.buildingId)).toBe('possible');

    for (const corrected of [likely, possible]) {
      const edit = await api.app.inject({
        method: 'POST',
        url: `/api/projects/${corrected.projectId}/fields/edit`,
        headers: { ...owner },
        payload: { field: { subjectId: corrected.buildingId, fieldKey: FIELD.buildingType }, value: { kind: 'choice', choice: 'office' }, corrects: [corrected.inferenceId] },
      });
      expect(edit.statusCode, edit.body).toBe(200);
    }
    const logged = await api.database.asAdministrator<{ reason: string; field_key: string }>(
      `SELECT reason, field_key FROM sovitech.guardrail_events WHERE type = 'owner_corrected_inference' AND project_id = ANY($1::uuid[]) ORDER BY reason`,
      [[likely.projectId, possible.projectId]],
    );
    expect(logged).toEqual([
      { reason: 'confidence:high', field_key: FIELD.buildingType },
      { reason: 'confidence:medium', field_key: FIELD.buildingType },
    ]);

    const response = await adminGet(api, admin, 'guardrail-events');
    expect(response.statusCode, response.body).toBe(200);
    const { view, displayObjects } = AdminGuardrailEventsResponseSchema.parse(response.json());
    const text = (valueId: string): string | undefined => displayObjects.find((display) => display.valueId === valueId)?.text;
    // Counted per tier and item type.
    expect(view.calibration.tiers.map((tier) => [tier.tier, tier.items.map((item) => [item.fieldKey, text(item.corrections)])])).toEqual([
      ['high', [[FIELD.buildingType, '1']]],
      ['medium', [[FIELD.buildingType, '1']]],
      ['low', []],
    ]);
    // No threshold set: every tier's wording stays as it is.
    expect(text(view.calibration.threshold)).toBe("Not set: the approver sets it (the guardrails propose 10% over the last 50 decisions). No tier's wording changes until then.");
    expect(view.calibration.tiers.map((tier) => [tier.tier, tier.dropped, text(tier.wording)])).toEqual([
      ['high', false, 'Likely, unchanged'],
      ['medium', false, 'Possible, unchanged'],
      ['low', false, 'Please check or SOVITECH will check, unchanged'],
    ]);
    // What the owner sees on another project's Likely inference is unchanged too.
    expect(await typeBadge(untouched.projectId, untouched.buildingId)).toBe('likely');
  });
});
