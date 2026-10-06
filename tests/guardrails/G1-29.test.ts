/**
 * G1-29 (new in phase 5, for the integrator to index; rule 1, "Unknown propagates": "No numeric stand-in. Code never
 * substitutes 0 ... This covers sums, averages, ratios, charts, sorting and exports"; 2.8 "Prominence"; 7.1-r25: "keeps
 * each badge on the same line as its figure", as columns in a tabular export; PRD R-066, US-ASSETS-11 AC6).
 * Situation: the Equipment register is exported with values no source holds.
 * Expected: an unknown value reads "Unknown", with its badge beside it, never 0 or blank.
 *
 * Through the API over a TEST database: two TEST tags read from a TEST document (their type, system, location, level
 * and zone unknown: no asset field is registered and the taxonomy gate is closed), exported as CSV: each row's tag as
 * written with its badge and source, and every other cell "Unknown" with the badge "Unknown"; no cell reads 0 and no
 * value cell is blank; the count reads "Not available yet", naming the taxonomy, never a number. Every account and value
 * is TEST data. The file is read after its optional UTF-8 byte order mark (ADR 0050 decision 4, amended in part B: A-5),
 * as RFC 4180 records (tests/guardrails/_support/csv.ts).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { recordAssetAppearance, withRequest } from '@sovitech/db';
import { signIn, startTestApi, type Auth, type TestApi } from './_support/api';
import { readCsv } from './_support/csv';
import { newOwnerProject, serviceOf, testDocumentIn } from './_support/workspace-store';

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

describe('G1-29 · rule 1: unknown values in the Equipment export', { timeout: 60_000 }, () => {
  it('G1-29 · US-ASSETS-11 AC6 · R-066 · 7.1-r25: every unknown cell reads "Unknown" with its badge beside it; no 0, no blank value, no count', async () => {
    const { projectId } = await newOwnerProject(api, owner, 'G1-29');
    const serviceId = await serviceOf(api, projectId, 'G1-29');
    const list = await testDocumentIn(api, { projectId, serviceId, label: 'G1-29 list', fileName: 'TEST lista G1-29.pdf', pages: ['TEST lista G1-29'] });
    await withRequest(api.database.app, { userId: serviceId, projectId }, async (request) => {
      for (const tag of ['TEST-FCU-01', 'TEST-FCU-02']) {
        await recordAssetAppearance(request, { tagAsWritten: tag, evidence: [{ documentId: list.id, contentHash: list.contentHash, locator: { page: 1 }, excerpt: 'TEST lista G1-29', check: 'text_match' }], createdBy: serviceId });
      }
    });
    const response = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/exports/equipment`, headers: { ...owner } });
    expect(response.statusCode, response.body).toBe(200);
    // The records after the optional UTF-8 byte order mark the writer puts first (ADR 0050 decision 4, amended: A-5).
    const { records } = readCsv(response.body);
    const [header, ...rest] = records;
    expect(header).toHaveLength(18);
    const rows = rest.slice(0, -1);
    expect(rows.map((row) => row[0])).toEqual(['TEST-FCU-01', 'TEST-FCU-02']);
    for (const row of rows) {
      expect(row).toHaveLength(18);
      expect(row.slice(1, 3)).toEqual(['From document', 'Found in TEST lista G1-29.pdf, page 1']);
      for (let cell = 3; cell < 18; cell += 3) {
        expect(row[cell], `value ${String(cell)}`).toBe('Unknown');
        expect(row[cell + 1], `badge ${String(cell)}`).toBe('Unknown');
      }
      for (let cell = 0; cell < 18; cell += 3) expect(row[cell]?.trim(), `value ${String(cell)}`).not.toBe('');
      expect(row.includes('0')).toBe(false);
    }
    expect(records.at(-1)).toEqual(['Equipment count', 'Not available yet: SOVITECH asset taxonomy']);
    expect(records.flat()).not.toContain('0');
    expect(response.body).not.toMatch(/(^|,)0(,|\r|$)/mu);
  });
});
