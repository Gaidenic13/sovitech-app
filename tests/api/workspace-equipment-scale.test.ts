/**
 * The equipment register at 5,000 rows (prompt 3 section 11, "Registers: the equipment register stays responsive at
 * 5,000 rows"; docs/adr/0041 performance budgets, proposed; docs/adr/0044 decision 7: the register pages on the
 * server, 50 rows a page, so no virtual list is added). Over a TEST database: 5,000 tagged TEST appearances, then the
 * first page, a page deep in the list, and a search. The test proves the paging is right at that size and writes the
 * time each read took to its output (`[measure]` lines) for ADR 0041; a miss of the budget is reported, not failed
 * (prompt 3 section 11). Every value is TEST data.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { recordAssetAppearance, withRequest } from '@sovitech/db';
import { EquipmentResponseSchema } from '@sovitech/view-model/browser';
import { signIn, startTestApi, type Auth, type TestApi } from '../guardrails/_support/api';
import { newOwnerProject, serviceOf, testDocumentIn } from '../guardrails/_support/workspace-store';

const ROWS = 5000;

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

describe('prompt 3 section 11 · ADR 0041 · ADR 0044 decision 7: Equipment at 5,000 rows', { timeout: 600_000 }, () => {
  it('R-066 · R-017: 5,000 tagged assets page 50 at a time with previous and next, deep pages and search included; the times are written for ADR 0041', async () => {
    const { projectId } = await newOwnerProject(api, owner, 'equipment scale');
    const serviceId = await serviceOf(api, projectId, 'equipment scale');
    const list = await testDocumentIn(api, { projectId, serviceId, label: 'scale list', fileName: 'TEST lista mare.pdf', pages: ['TEST lista'] });
    const seeded = performance.now();
    await withRequest(api.database.app, { userId: serviceId, projectId }, async (request) => {
      for (let index = 1; index <= ROWS; index += 1) {
        await recordAssetAppearance(request, { tagAsWritten: `TEST-VCV-${String(index).padStart(4, '0')}`, evidence: [{ documentId: list.id, contentHash: list.contentHash, locator: { page: 1 }, excerpt: 'TEST lista', check: 'text_match' }], createdBy: serviceId });
      }
    });
    const seedMs = performance.now() - seeded;
    const timed = async (path: string) => {
      const started = performance.now();
      const response = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/${path}`, headers: { ...owner } });
      const ms = performance.now() - started;
      expect(response.statusCode, response.body.slice(0, 200)).toBe(200);
      return { view: EquipmentResponseSchema.parse(response.json()).view, ms };
    };
    const first = await timed('workspace/equipment');
    const again = await timed('workspace/equipment');
    const deep = await timed('workspace/equipment?page=100');
    const search = await timed('workspace/equipment?search=vcv-4999');
    expect(first.view.rows).toHaveLength(50);
    expect(first.view.page).toEqual({ hasPrevious: false, hasNext: true });
    expect(deep.view.rows).toHaveLength(50);
    expect(deep.view.page).toEqual({ hasPrevious: true, hasNext: false });
    expect(search.view.rows).toHaveLength(1);
    process.stdout.write(
      `[measure] equipment register, ${String(ROWS)} TEST assets: seed ${seedMs.toFixed(0)} ms; first page ${first.ms.toFixed(0)} ms, again ${again.ms.toFixed(0)} ms; page 100 ${deep.ms.toFixed(0)} ms; search ${search.ms.toFixed(0)} ms\n`,
    );
  });
});
