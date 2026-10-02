/**
 * G2-15 (new in phase 4 part B; rule 2, "Every value has a source and a verification level (2.1), and the owner sees both
 * (2.8)", which holds only while a value shows as it was stored; rule 14, "Material, not commands": what a document
 * writes never changes how the app's copy reads; the same reading as G2-13 and G2-14, for an equipment tag; finding
 * A-7, its display half).
 * Situation: an equipment tag is written in a document with bidirectional or format controls (U+202E, U+2066 to
 * U+2069, U+200F, U+200B).
 * Expected: Equipment, the inspector and the asset record show the tag without those controls; a tag of controls only
 * shows the missing wording, never an empty text.
 *
 * Over a TEST database, through the API: the tag is stored as written (2.5; the identity, `normaliseTag`, is unchanged:
 * triage proposal P-4B-TAG-FORMAT-CONTROLS), and served without the controls (packages/view-model/src/workspace/
 * registers.ts `servedTag`, the same characters as `servedFileName`): Equipment's tag cell, the asset record's heading
 * (the inspector reads the same `workspace.asset`) and its evidence entries. A search is read the same way, so a search
 * of controls alone finds nothing. Before the fix "TEST" U+202E "VCV-02" showed as "TEST20-VCV", and a search of U+202E
 * found it. The controls are written as escapes in this file, never as the characters themselves.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { recordAssetAppearance, withRequest } from '@sovitech/db';
import { AssetResponseSchema, EquipmentResponseSchema, type DisplayObject } from '@sovitech/view-model/browser';
import { signIn, startTestApi, type Auth, type TestApi } from './_support/api';
import { newOwnerProject, serviceOf, testDocumentIn } from './_support/workspace-store';

const CONTROLS = /[\p{Bidi_Control}\p{Cf}]/u;

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

function textOf(displays: readonly DisplayObject[], valueId: string): string | undefined {
  return displays.find((display) => display.valueId === valueId)?.text;
}

describe('G2-15 · rules 2 and 14: an equipment tag is shown without bidirectional and format controls', { timeout: 120_000 }, () => {
  it('A-7 · R-065 · UD-08 · G2-15: Equipment, the inspector and the asset record show the tag without the controls; a search of controls alone finds nothing', async () => {
    const { projectId } = await newOwnerProject(api, owner, 'G2-15 tags');
    const serviceId = await serviceOf(api, projectId, 'G2-15');
    const list = await testDocumentIn(api, { projectId, serviceId, label: 'G2-15 list', fileName: 'TEST lista G2-15.pdf', pages: ['TEST tags'] });
    const written = ['TEST\u202EVCV-02', 'TEST\u2066VCV-03\u2069', 'TEST\u200FVCV-04\u200B', '\u202E\u2066'];
    const assetIds = await withRequest(api.database.app, { userId: serviceId, projectId }, async (request) => {
      const ids: string[] = [];
      for (const tag of written) {
        const appearance = await recordAssetAppearance(request, { tagAsWritten: tag, evidence: [{ documentId: list.id, contentHash: list.contentHash, locator: { page: 1 }, excerpt: 'TEST tags', check: 'text_match' }], createdBy: serviceId });
        ids.push(appearance.assetId ?? '');
      }
      return ids;
    });
    // Stored as written.
    const stored = await api.database.asAdministrator<{ tag: string }>('SELECT tag_as_written AS tag FROM sovitech.asset_appearances WHERE project_id = $1 ORDER BY id', [projectId]);
    expect(stored.map((row) => row.tag).sort()).toEqual([...written].sort());

    const listed = EquipmentResponseSchema.parse((await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/workspace/equipment`, headers: { ...owner } })).json());
    const tags = listed.view.rows.map((row) => ({ assetId: row.assetId, text: textOf(listed.displayObjects, row.tag) }));
    const served = new Map(tags.map((entry) => [entry.assetId, entry.text]));
    expect(assetIds.map((assetId) => served.get(assetId))).toEqual(['TESTVCV-02', 'TESTVCV-03', 'TESTVCV-04', 'Unknown']);
    for (const display of listed.displayObjects) expect(display.text, display.valueId).not.toMatch(CONTROLS);

    for (const [index, assetId] of assetIds.entries()) {
      const record = AssetResponseSchema.parse((await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/workspace/equipment/${assetId}`, headers: { ...owner } })).json());
      expect(textOf(record.displayObjects, record.view.tag), `record ${String(index)}`).toBe(served.get(assetId));
      for (const entry of record.view.evidence) expect(textOf(record.displayObjects, entry.display), `evidence ${String(index)}`).toBe(served.get(assetId));
      for (const display of record.displayObjects) expect(display.text, display.valueId).not.toMatch(CONTROLS);
    }

    const search = async (text: string): Promise<number> => {
      const response = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/workspace/equipment?search=${encodeURIComponent(text)}`, headers: { ...owner } });
      expect(response.statusCode, response.body).toBe(200);
      return EquipmentResponseSchema.parse(response.json()).view.rows.length;
    };
    expect(await search('\u202E')).toBe(0);
    expect(await search('vcv-02')).toBe(1);
    expect(await search('TEST\u202EVCV-02')).toBe(1);
  });
});
