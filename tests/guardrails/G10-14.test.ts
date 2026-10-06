/**
 * G10-14 (new in phase 5, for the integrator to index; rule 10, "Demo data": "Every screen and export for them shows
 * 'Demo data, not an assessment of the real building'"; PRD R-066, R-118's near miss: GS-1 checks screens only).
 * Situation: the demo project's Equipment register is exported.
 * Expected: the file's first line is the demo line.
 *
 * Through the API over a TEST database: a TEST demo project (created by a TEST seed account, the only kind that may
 * flag one) with a TEST tag; its Equipment CSV's first record, after the optional UTF-8 byte order mark the writer puts
 * before it (ADR 0050 decision 4, amended in part B: A-5), is one cell, "Demo data, not an assessment of the real
 * building" (quoted, as RFC 4180 quotes a cell holding a comma), then the header; a project not flagged demo exports no
 * demo line anywhere (G10-10's export half). Every account and value is TEST data.
 *
 * Part B (V-5; prompt 3 phase 5, "Every export passes the reserved-term scan"; 2.8 "Reserved terms"; ADR 0050 decision 5
 * as corrected): the produced text of the demo's CSV and of a project's that is not the demo is scanned with the one
 * reserved-term list, 2.8's allowances applied by column (tests/guardrails/_support/csv.ts: a badge column's registered
 * badge label whole; a source column's verbatim source text, the cited file's name as uploaded; nothing else), and holds
 * no reserved term outside them. The scan's own column rules are proven first on a TEST text, so a scan that passes
 * everything cannot pass the case. The e2e flow (d) scans the seeded demo's downloaded file the same way (group 3).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { recordAssetAppearance, withRequest } from '@sovitech/db';
import { createTestAccount, createTestProject, createTestService } from '@sovitech/db/testing';
import { signIn, startTestApi, type Auth, type TestApi } from './_support/api';
import { BYTE_ORDER_MARK, readCsv, reservedTermsInEquipmentCsv } from './_support/csv';
import { newOwnerProject, testDocumentIn } from './_support/workspace-store';

const DEMO_LINE = 'Demo data, not an assessment of the real building';

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

/** A TEST tag read from a TEST document; answers the document's file name as uploaded. */
async function withTag(projectId: string, label: string): Promise<string> {
  const serviceId = await createTestService(api.database, { projectId, label });
  const fileName = `TEST lista ${label}.pdf`;
  const list = await testDocumentIn(api, { projectId, serviceId, label: `${label} list`, fileName, pages: [`TEST lista ${label}`] });
  await withRequest(api.database.app, { userId: serviceId, projectId }, (request) =>
    recordAssetAppearance(request, { tagAsWritten: 'TEST-AHU-01', evidence: [{ documentId: list.id, contentHash: list.contentHash, locator: { page: 1 }, excerpt: `TEST lista ${label}`, check: 'text_match' }], createdBy: serviceId }),
  );
  return fileName;
}

/** The demo project's export and another project's, each with one TEST tag. */
async function twoExports(label: string): Promise<{ readonly demo: { readonly body: string; readonly fileName: string }; readonly other: { readonly body: string; readonly fileName: string } }> {
  const seedId = await createTestAccount(api.database, { label: `${label} demo seed`, kind: 'seed', roles: ['owner'] });
  const demoId = await createTestProject(api.database, { ownerId: seedId, isDemo: true });
  const demoFile = await withTag(demoId, `${label} demo`);
  const seed = await signIn(api, seedId);
  const demo = await api.app.inject({ method: 'GET', url: `/api/projects/${demoId}/exports/equipment`, headers: { ...seed } });
  expect(demo.statusCode, demo.body).toBe(200);

  const { projectId } = await newOwnerProject(api, owner, `${label} other`);
  const otherFile = await withTag(projectId, `${label} other`);
  const other = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/exports/equipment`, headers: { ...owner } });
  expect(other.statusCode, other.body).toBe(200);
  return { demo: { body: demo.body, fileName: demoFile }, other: { body: other.body, fileName: otherFile } };
}

describe('G10-14 · rule 10: the demo line on the demo\'s Equipment export', { timeout: 60_000 }, () => {
  it('G10-14 · R-066 · R-118 · G10-10: the demo project\'s CSV starts with the demo line (after the optional byte order mark); another project\'s holds none', async () => {
    const { demo, other } = await twoExports('G10-14');
    const demoFile = readCsv(demo.body);
    // The byte order mark, when written, is the file's first character only; the demo line is still the first line.
    expect(demo.body.indexOf(BYTE_ORDER_MARK, 1)).toBe(-1);
    expect(demo.body.startsWith(demoFile.byteOrderMark ? `${BYTE_ORDER_MARK}"${DEMO_LINE}"\r\n` : `"${DEMO_LINE}"\r\n`)).toBe(true);
    const [first, second] = demoFile.records;
    // One cell, quoted as RFC 4180 quotes a cell that holds a comma: a spreadsheet reads it as the demo line.
    expect(first).toEqual([DEMO_LINE]);
    expect(second?.slice(0, 3)).toEqual(['Tag', 'Tag badge', 'Tag source']);

    expect(other.body).not.toContain(DEMO_LINE);
    const otherFile = readCsv(other.body);
    expect(otherFile.records[0]?.[0]).toBe('Tag');
    expect(otherFile.records.some((record) => record.some((cell) => cell.includes(DEMO_LINE)))).toBe(false);
  });
});

describe('G10-14 (part B, V-5) · 2.8 "Reserved terms": the Equipment export passes the reserved-term scan', { timeout: 60_000 }, () => {
  it('G10-14 · V-5 · 2.8: the scan applies each allowance to its own column only, so it flags what 2.8 does not allow', () => {
    const header = 'Tag,Tag badge,Tag source,Type,Type badge,Type source';
    const csv = (row: string): string => `${BYTE_ORDER_MARK}"${DEMO_LINE}"\r\n${header}\r\n${row}\r\nEquipment count,Not available yet: TEST taxonomy\r\n`;
    const scan = (row: string) => reservedTermsInEquipmentCsv(readCsv(csv(row)), { citedFileNames: ['TEST lista final.pdf'] });
    // Allowed: a registered badge label whole in a badge column; the cited file's name, as uploaded, in a source column.
    expect(scan('TEST-AHU-01,Verified by SOVITECH,"Found in TEST lista final.pdf, page 1",Unknown,Unknown,')).toEqual([]);
    // Flagged: the same badge words in a value or source column; a reserved term in a badge column that is no badge
    // label; a reserved term in the source line's own words; one in a value cell.
    expect(scan('Verified by SOVITECH,From document,"Found in TEST lista final.pdf, page 1",Unknown,Unknown,').map((finding) => [finding.column, finding.role])).toEqual([[0, 'value']]);
    expect(scan('TEST-AHU-01,TEST verified badge,"Found in TEST lista final.pdf, page 1",Unknown,Unknown,').map((finding) => [finding.column, finding.role])).toEqual([[1, 'badge']]);
    expect(scan('TEST-AHU-01,From document,"Found in TEST lista final.pdf, page 1, final reading",Unknown,Unknown,').map((finding) => [finding.column, finding.role])).toEqual([[2, 'source']]);
    expect(scan('TEST-AHU-01,From document,"Found in TEST lista final.pdf, page 1",TEST certified AHU,Unknown,').map((finding) => [finding.column, finding.role])).toEqual([[3, 'value']]);
    expect(scan('TEST-AHU-01,From document,"Found in TEST lista final.pdf, page 1",Unknown,Unknown,Verified by SOVITECH').map((finding) => [finding.column, finding.role])).toEqual([[5, 'source']]);
  });

  it('G10-14 · V-5 · prompt 3 phase 5 "Every export passes the reserved-term scan": the demo\'s CSV and another project\'s hold no reserved term outside 2.8\'s allowances, by column', async () => {
    const { demo, other } = await twoExports('G10-14 scan');
    for (const [name, exported] of [
      ['demo', demo],
      ['other', other],
    ] as const) {
      const file = readCsv(exported.body);
      // The scan reads the whole table: the header, the TEST tag's row and the count line.
      expect(file.records.some((record) => record[0] === 'TEST-AHU-01'), name).toBe(true);
      expect(file.records.at(-1)?.[0], name).toBe('Equipment count');
      expect(reservedTermsInEquipmentCsv(file, { citedFileNames: [exported.fileName] }), `${name}: ${exported.body}`).toEqual([]);
    }
  });
});
