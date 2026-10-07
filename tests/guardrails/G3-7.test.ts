/**
 * G3-7 (docs/guardrails.md section 7; rule 3, "AI inference is a proposal until the right person confirms it" and "An
 * engineer verifies technical facts: equipment types and ratings ..."; rule 10, "Engineer verification is an
 * authenticated action": "Only the engineer review endpoint writes `engineer_verified`. The caller must be an
 * authenticated user with the `sovitech_engineer` role, who has opened the item"; 2.8: "Engineer verified | Verified by
 * SOVITECH | 'AI inference, verified by SOVITECH on 12 Oct'"; PRD R-128 Guardrail behaviour: "Once an engineer verifies
 * an inference, it reads 'Verified by SOVITECH' with the source line 'AI inference, verified by SOVITECH on <date>'").
 * Situation: an engineer verifies an AI-inferred AHU.
 * Expected: badge Verified by SOVITECH, and the line reads "AI inference, verified by SOVITECH".
 *
 * How it is proven while PRD D-16 is open. R-128 "Until decided" builds no engineer page and no review endpoint
 * (docs/adr/0053 decision 1), so the TEST engineer verifies through the store's one guarded function, as G10-3 and
 * G10-8 do: the data-access layer's `openReviewItem` (the engineer opened the item) then `verifyCandidate`
 * (`sovitech.verify_candidate`, the only writer of `engineer_verified`), in the engineer's own request on a TEST project
 * that is not a demo. Prompt 3 section 14's "database tests verify through the review endpoint" reads "through the
 * guarded function" until the endpoint exists (logged in the build log, phase 7).
 * - The AHU (an asset's type, a TEST engineer field on a TEST registry: no asset field is in the production registry,
 *   ADR 0045 decision 1) is read back from the store and resolved through the API's own path (`readProjectState`, the
 *   one resolver): Verified by SOVITECH, "AI inference, verified by SOVITECH on <date>", the date the store recorded.
 * - No page serves an asset's type while `dataset-asset-taxonomy` is closed (prompt 3 5.4: "Asset types stay Unknown"),
 *   so Equipment and the asset record still read it Unknown after the verification: verification opens no gate.
 * - The same served on a page no gate holds: an AI-inferred building type verified the same way reads Verified by
 *   SOVITECH with the dated line on step 5 and on the extracted facts (UD-45).
 * Every account, document and value is TEST data.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { openReviewItem, recordAssetAppearance, verifyCandidate, withRequest } from '@sovitech/db';
import { createTestAccount } from '@sovitech/db/testing';
import { FIELD } from '@sovitech/registry';
import { AssetResponseSchema, EquipmentResponseSchema, ExtractedResponseSchema, StepResponseSchema } from '@sovitech/view-model/browser';
import { formatDate } from '@sovitech/view-model/server';
import { resolveSubjectField } from '../../apps/api/src/wizard/displays';
import { readProjectState } from '../../apps/api/src/wizard/project-state';
import { registryOf } from '../../apps/api/src/wizard/registry';
import { inferredValue } from './_support/admin';
import { signIn, startTestApi, type Auth, type TestApi } from './_support/api';
import { registryField } from './_support/view-model';
import { newOwnerProject, productionFieldOf, serviceOf, testDocumentIn, testRegistry } from './_support/workspace-store';

const LONG = { timeout: 120_000 };
const ASSET_TYPE = registryField('asset.type', { kind: 'enum', subject: 'asset', options: ['ahu', 'fan'], confirmBy: 'engineer' });

let api: TestApi;
let owner: Auth;
let ownerId: string;
let engineerId: string;

beforeAll(async () => {
  api = await startTestApi({ devLogin: true, registry: testRegistry({ fields: [ASSET_TYPE] }) });
  const [devOwner] = api.devAccountIds;
  if (devOwner === undefined) throw new Error('no TEST development owner');
  ownerId = devOwner;
  owner = await signIn(api, ownerId);
  engineerId = await createTestAccount(api.database, { label: 'G3-7 engineer', kind: 'person', roles: ['sovitech_engineer'] });
}, 240_000);

afterAll(async () => {
  await api.stop();
});

/** The TEST engineer opens the item, then verifies it through the guarded function, in the engineer's own request. */
async function verifyAsEngineer(projectId: string, candidateId: string): Promise<string> {
  return withRequest(api.database.app, { userId: engineerId, projectId }, async (request) => {
    await openReviewItem(request, { candidateId });
    return (await verifyCandidate(request, { candidateId, reason: 'confidence:high' })).at;
  });
}

describe('G3-7 · rule 3 · rule 10 · 2.8 · R-128 Guardrail behaviour', LONG, () => {
  it('G3-7: a TEST engineer who opened the item verifies an AI-inferred AHU through the guarded function: Verified by SOVITECH, "AI inference, verified by SOVITECH on <date>"', async () => {
    const { projectId } = await newOwnerProject(api, owner, 'G3-7 AHU');
    const serviceId = await serviceOf(api, projectId, 'G3-7 AHU');
    const schedule = await testDocumentIn(api, { projectId, serviceId, label: 'G3-7 schedule', fileName: 'TEST schedule.pdf', pages: ['TEST CTA-01 ahu'] });
    const assetId = await withRequest(api.database.app, { userId: serviceId, projectId }, async (request) => {
      const appearance = await recordAssetAppearance(request, {
        tagAsWritten: 'TEST-CTA-01',
        evidence: [{ documentId: schedule.id, contentHash: schedule.contentHash, locator: { page: 1 }, excerpt: 'TEST CTA-01 ahu', check: 'text_match' }],
        createdBy: serviceId,
      });
      if (appearance.assetId === null) throw new Error('the TEST tag made no asset');
      return appearance.assetId;
    });
    const inferenceId = await inferredValue(api, { projectId, serviceId, subjectId: assetId, field: ASSET_TYPE, choice: 'ahu', confidence: 'high', from: [{ document: schedule, page: 1, excerpt: 'TEST CTA-01 ahu' }] });
    const valueId = `asset:${assetId}.type`;
    const typeDisplay = async () => {
      const state = await withRequest(api.database.app, { userId: ownerId, projectId }, (request) => readProjectState(request, { userId: ownerId, projectId }, registryOf(api.services)));
      const display = resolveSubjectField(state, assetId, ASSET_TYPE.key).find((entry) => entry.valueId === valueId);
      if (display === undefined) throw new Error(`no display ${valueId}`);
      return display;
    };
    // Before: an inference, Likely, its source line naming where it was inferred.
    expect((await typeDisplay()).badge?.id).toBe('likely');

    const at = await verifyAsEngineer(projectId, inferenceId);
    const events = await api.database.asAdministrator<{ actor: string; role: string }>(`SELECT actor, role FROM sovitech.candidate_events WHERE candidate_id = $1 AND type = 'engineer_verified'`, [inferenceId]);
    expect(events).toEqual([{ actor: engineerId, role: 'sovitech_engineer' }]);

    const after = await typeDisplay();
    expect(after.badge).toEqual({ id: 'verified_by_sovitech', label: 'Verified by SOVITECH' });
    expect(after.sourceLine).toEqual({ id: 'ai_inference_engineer_verified_line', kind: 'generated_sentence', text: `AI inference, verified by SOVITECH on ${formatDate(at).text}` });
  });

  it('prompt 3 5.4 (dataset-asset-taxonomy closed) · G3-7: verification opens no gate: Equipment and the asset record still read the verified type Unknown', async () => {
    const { projectId } = await newOwnerProject(api, owner, 'G3-7 gate');
    const serviceId = await serviceOf(api, projectId, 'G3-7 gate');
    const schedule = await testDocumentIn(api, { projectId, serviceId, label: 'G3-7 gate schedule', fileName: 'TEST schedule.pdf', pages: ['TEST CTA-02 ahu'] });
    const assetId = await withRequest(api.database.app, { userId: serviceId, projectId }, async (request) => {
      const appearance = await recordAssetAppearance(request, {
        tagAsWritten: 'TEST-CTA-02',
        evidence: [{ documentId: schedule.id, contentHash: schedule.contentHash, locator: { page: 1 }, excerpt: 'TEST CTA-02 ahu', check: 'text_match' }],
        createdBy: serviceId,
      });
      if (appearance.assetId === null) throw new Error('the TEST tag made no asset');
      return appearance.assetId;
    });
    const inferenceId = await inferredValue(api, { projectId, serviceId, subjectId: assetId, field: ASSET_TYPE, choice: 'ahu', confidence: 'high', from: [{ document: schedule, page: 1, excerpt: 'TEST CTA-02 ahu' }] });
    await verifyAsEngineer(projectId, inferenceId);
    const listed = EquipmentResponseSchema.parse((await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/workspace/equipment`, headers: { ...owner } })).json());
    const row = listed.view.rows.find((entry) => entry.type === `asset:${assetId}.type`);
    expect(listed.displayObjects.find((display) => display.valueId === row?.type)).toMatchObject({ text: 'Unknown', badge: { id: 'unknown' } });
    const record = AssetResponseSchema.parse((await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/workspace/equipment/${assetId}`, headers: { ...owner } })).json());
    expect(record.displayObjects.find((display) => display.valueId === `asset:${assetId}.type`)).toMatchObject({ text: 'Unknown' });
  });

  it('G3-7 · 2.8 (served): an AI-inferred building type verified the same way reads Verified by SOVITECH with the dated line on step 5 and on the extracted facts', async () => {
    const { projectId, buildingId } = await newOwnerProject(api, owner, 'G3-7 served');
    const serviceId = await serviceOf(api, projectId, 'G3-7 served');
    const memo = await testDocumentIn(api, { projectId, serviceId, label: 'G3-7 memo', fileName: 'TEST memoriu.pdf', pages: ['TEST Destinatia cladirii: hotel'] });
    const inferenceId = await inferredValue(api, {
      projectId,
      serviceId,
      subjectId: buildingId,
      field: productionFieldOf(FIELD.buildingType),
      choice: 'hotel',
      confidence: 'high',
      from: [{ document: memo, page: 1, excerpt: 'TEST Destinatia cladirii: hotel' }],
    });
    const at = await verifyAsEngineer(projectId, inferenceId);
    const line = `AI inference, verified by SOVITECH on ${formatDate(at).text}`;
    const valueId = `building:${buildingId}.type`;
    const five = StepResponseSchema.parse((await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/steps/5`, headers: { ...owner } })).json());
    const extracted = ExtractedResponseSchema.parse((await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/extracted`, headers: { ...owner } })).json());
    for (const displays of [five.displayObjects, extracted.displayObjects]) {
      const display = displays.find((entry) => entry.valueId === valueId);
      expect(display?.badge?.id).toBe('verified_by_sovitech');
      expect(display?.sourceLine?.text).toBe(line);
    }
  });
});
