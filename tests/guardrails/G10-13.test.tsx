/**
 * G10-13 (new in phase 5; rule 10, "Labelled everywhere": "Demo projects are flagged `demo`. Every screen and export for
 * them shows 'Demo data, not an assessment of the real building'"; 2.8's demo line; PRD R-118's near miss: GS-1 checks
 * screens only; docs/adr/0050-exports-print-route-and-pdf.md decisions 1 and 2).
 * Situation: the demo project's proposal is exported to PDF.
 * Expected: every page carries "Demo data, not an assessment of the real building".
 *
 * Through the API, over a TEST database, with the API's own routes, printer and print view, end to end:
 * - a TEST project flagged demo (the flag is the store's; the API never sets it) and its TEST owner; the owner presses
 *   Generate (`proposals.generate`), exports the stored proposal (`proposals.export`) and downloads its PDF
 *   (`exports.file`);
 * - the API, built with the production gate source and the printer of apps/api/src/proposal/export.ts, opens the print
 *   route on a TEST web origin on 127.0.0.1 with the owner's session cookie only; that origin serves the print route as
 *   the app does: it reads the print view (`proposals.print`) from the same API with the cookies the printer sent, and
 *   serves the app's print document for it (tests/guardrails/_support/print.tsx);
 * - the downloaded PDF's pages are read with pypdfium2: there are several (the cover, the body and the appendix each
 *   start a page), and every one holds the demo line, word for word as 2.8 writes it.
 * Beside the case: the same export of a TEST project not flagged demo carries the line on no page (rule 10, read with
 * the first promise: G10-10's reading for exports), the printer carried the session cookie alone (rule 13), and no page
 * holds a reserved term outside 2.8's own badge labels.
 *
 * It launches Chromium: run it under the e2e lock with one worker.
 */
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addProjectMember } from '@sovitech/db';
import { createTestAccount, createTestProject } from '@sovitech/db/testing';
import { statusLineById } from '@sovitech/registry';
import { assertGatesStartupSafe } from '@sovitech/registry/gates';
import { ExportResponseSchema, GenerateResponseSchema, ProposalPrintResponseSchema, type ProposalPrintResponse } from '@sovitech/view-model/browser';
import { createPdfPrinter, type PdfPrinter } from '../../apps/api/src/proposal/export';
import { buildServer } from '../../apps/api/src/server';
import { signIn, startTestApi, type Auth, type TestApi } from './_support/api';
import { linesOf, pdfPages, reservedTermsInPrint, startPrintOrigin, type PrintOrigin } from './_support/print';

/** 2.8's demo line, as the registry holds it. */
const DEMO_LINE = statusLineById('demo_data').text;

let api: TestApi | undefined;
let app: FastifyInstance | undefined;
let printer: PdfPrinter | undefined;
let web: PrintOrigin | undefined;
let owner: Auth = { cookie: '', 'csrf-token': '' };
let demoPages: readonly string[] = [];
let otherPages: readonly string[] = [];

/** The print view the app's print route reads with the request's cookies, or nothing when the API refuses it. */
function server(): FastifyInstance {
  if (app === undefined) throw new Error('G10-13: the API was not built');
  return app;
}

async function printView(request: { readonly projectId: string; readonly snapshotId: string; readonly cookieHeader: string }): Promise<ProposalPrintResponse | undefined> {
  const answer = await server().inject({ method: 'GET', url: `/api/projects/${request.projectId}/proposals/${request.snapshotId}/print`, headers: { cookie: request.cookieHeader } });
  return answer.statusCode === 200 ? ProposalPrintResponseSchema.parse(answer.json()) : undefined;
}

/** Generate, export and download the PDF of a project's proposal, as its owner; the PDF's pages. */
async function exportedPages(projectId: string): Promise<readonly string[]> {
  const headers = { ...owner, 'content-type': 'application/json' };
  const generated = await server().inject({ method: 'POST', url: `/api/projects/${projectId}/proposals`, headers, payload: {} });
  expect(generated.statusCode, generated.body).toBe(201);
  const { snapshotId } = GenerateResponseSchema.parse(generated.json());
  const recorded = await server().inject({ method: 'POST', url: `/api/projects/${projectId}/proposals/${snapshotId}/exports`, headers, payload: {} });
  expect(recorded.statusCode, recorded.body).toBe(201);
  const { outputId } = ExportResponseSchema.parse(recorded.json());
  const file = await server().inject({ method: 'GET', url: `/api/projects/${projectId}/exports/${outputId}/file`, headers: { cookie: owner.cookie } });
  expect(file.statusCode, file.body).toBe(200);
  expect(file.headers['content-type']).toBe('application/pdf');
  return pdfPages(new Uint8Array(file.rawPayload));
}

beforeAll(async () => {
  api = await startTestApi();
  // The demo project as the store allows one: created by a demo seed account (the app never flags a project demo), with
  // the TEST owner made a member, as the seed makes the development owner a member of the demo.
  const seed = await createTestAccount(api.database, { label: 'G10-13 demo seed', kind: 'seed', roles: ['owner'] });
  const demoProject = await createTestProject(api.database, { ownerId: seed, isDemo: true });
  const ownerId = await createTestAccount(api.database, { label: 'G10-13 owner', kind: 'person', roles: ['owner'] });
  await addProjectMember(api.database.operator.db, { projectId: demoProject, userId: ownerId });
  const otherProject = await createTestProject(api.database, { ownerId, isDemo: false });
  owner = await signIn(api, ownerId);
  web = await startPrintOrigin(printView);
  printer = createPdfPrinter({ timeoutMs: 60_000 });
  app = buildServer({ gates: assertGatesStartupSafe(), services: { ...api.services, printer, webOrigin: web.origin } });
  await app.ready();
  demoPages = await exportedPages(demoProject);
  otherPages = await exportedPages(otherProject);
}, 240_000);

afterAll(async () => {
  await printer?.close();
  await web?.stop();
  await app?.close();
  await api?.stop();
});

describe('G10-13 · R-118 · rule 10: the demo project\'s exported proposal carries the demo line on every page', () => {
  it('G10-13: the export has several pages, and every one carries "Demo data, not an assessment of the real building"', () => {
    expect(demoPages.length).toBeGreaterThanOrEqual(3);
    for (const [index, page] of demoPages.entries()) {
      expect(linesOf(page), `page ${String(index + 1)} of ${String(demoPages.length)}`).toContain(DEMO_LINE);
    }
  });

  it('G10-13 · rule 10: the line is the first thing on each page, above the page\'s own content', () => {
    for (const [index, page] of demoPages.entries()) expect(linesOf(page)[0], `page ${String(index + 1)}`).toBe(DEMO_LINE);
  });

  it('G10-13 (beside the case) · G10-10\'s reading for exports: a project not flagged demo carries the line on no page', () => {
    expect(otherPages.length).toBeGreaterThanOrEqual(3);
    for (const page of otherPages) expect(page).not.toContain(DEMO_LINE);
  });

  it('G10-13 (beside the case) · rule 13: the printer opened the print route with the owner\'s session cookie alone', () => {
    const cookies = web?.cookies ?? [];
    expect(cookies.length).toBeGreaterThanOrEqual(2);
    for (const header of cookies) {
      expect(header.startsWith('sovitech_session=')).toBe(true);
      expect(header).not.toContain(';');
      expect(owner.cookie).toContain(header);
    }
  });

  it('G10-13 (beside the case) · 2.8 "Reserved terms": no page of either export holds a reserved term outside 2.8\'s own badge labels', () => {
    for (const page of [...demoPages, ...otherPages]) expect(reservedTermsInPrint(page)).toEqual([]);
  });
});
