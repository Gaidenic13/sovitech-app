/**
 * G10-16 (new in phase 6; docs/guardrails.md section 7 at 1.12; T).
 * Situation: the demo project's Payback Analysis or Lifecycle Analysis is exported (Export Report).
 * Expected: every page of the file carries "Demo data, not an assessment of the real building".
 * Follows from rule 10, "Labelled everywhere": "Demo projects are flagged `demo`. Every screen and export for them shows
 * 'Demo data, not an assessment of the real building'"; G10-13, the same reading for the exported proposal; PRD R-121
 * ("through the export frame of R-118").
 *
 * Through the API, over a TEST database, with the API's own routes, printer and print views, end to end:
 * - a TEST project flagged demo (the flag is the store's; the API never sets it) and its TEST owner; the owner presses
 *   Generate (`proposals.generate`) and presses Export Report on Payback and on Lifecycle Analysis
 *   (`exports.metrics` of the stored version);
 * - the API, built with the production gate source and the printer of apps/api/src/proposal/export.ts, opens the
 *   Metrics print route on a TEST web origin on 127.0.0.1 with the owner's session cookie only; that origin serves the
 *   route as the app does: it reads the page's print view (`metrics.payback.print`, `metrics.lifecycle.print`) from the
 *   same API with the cookies the printer sent, and serves the app's printed Metrics page for it
 *   (tests/guardrails/_support/print.tsx);
 * - each downloaded PDF's pages are read with pypdfium2, and every one holds the demo line, word for word as 2.8 writes
 *   it, as its first line.
 * Beside the case: the same exports of a TEST project not flagged demo carry the line on no page (G10-10's reading for
 * exports), the printer carried the session cookie alone (rule 13), each file is named by its page and its version's
 * generation time (no document text: rule 13), and no page holds a reserved term outside 2.8's own badge labels.
 *
 * It launches Chromium: run it under the e2e lock with one worker.
 */
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addProjectMember } from '@sovitech/db';
import { createTestAccount, createTestProject } from '@sovitech/db/testing';
import { statusLineById } from '@sovitech/registry';
import { assertGatesStartupSafe } from '@sovitech/registry/gates';
import { GenerateResponseSchema, LifecycleResponseSchema, PaybackResponseSchema, type MetricsExportPage } from '@sovitech/view-model/browser';
import { createPdfPrinter, type PdfPrinter } from '../../apps/api/src/proposal/export';
import { buildServer } from '../../apps/api/src/server';
import type { MetricsPrintResponse } from '../../apps/web/src/workspace/pages/metrics/print/MetricsPrintDocument';
import { signIn, startTestApi, type Auth, type TestApi } from './_support/api';
import { linesOf, pdfPages, reservedTermsInPrint, startPrintOrigin, type PrintOrigin } from './_support/print';

/** 2.8's demo line, as the registry holds it. */
const DEMO_LINE = statusLineById('demo_data').text;
const PAGES = ['payback', 'lifecycle'] as const;

let api: TestApi | undefined;
let app: FastifyInstance | undefined;
let printer: PdfPrinter | undefined;
let web: PrintOrigin | undefined;
let owner: Auth = { cookie: '', 'csrf-token': '' };
const demoFiles = new Map<MetricsExportPage, { readonly pages: readonly string[]; readonly name: string }>();
const otherFiles = new Map<MetricsExportPage, { readonly pages: readonly string[]; readonly name: string }>();

function server(): FastifyInstance {
  if (app === undefined) throw new Error('G10-16: the API was not built');
  return app;
}

/** The page's print view the app's print route reads with the request's cookies, or nothing when the API refuses it. */
async function printView(request: { readonly projectId: string; readonly page: MetricsExportPage; readonly snapshotId: string; readonly cookieHeader: string }): Promise<MetricsPrintResponse | undefined> {
  const answer = await server().inject({ method: 'GET', url: `/api/projects/${request.projectId}/metrics/${request.page}/print?snapshot=${request.snapshotId}`, headers: { cookie: request.cookieHeader } });
  if (answer.statusCode !== 200) return undefined;
  return request.page === 'payback' ? { page: 'payback', response: PaybackResponseSchema.parse(answer.json()) } : { page: 'lifecycle', response: LifecycleResponseSchema.parse(answer.json()) };
}

/** Generate, then press Export Report on each page, as the project's owner: each PDF's pages and its file name. */
async function exportedPages(projectId: string, into: Map<MetricsExportPage, { readonly pages: readonly string[]; readonly name: string }>): Promise<void> {
  const generated = await server().inject({ method: 'POST', url: `/api/projects/${projectId}/proposals`, headers: { ...owner, 'content-type': 'application/json' }, payload: {} });
  expect(generated.statusCode, generated.body).toBe(201);
  const { snapshotId } = GenerateResponseSchema.parse(generated.json());
  for (const page of PAGES) {
    const file = await server().inject({ method: 'GET', url: `/api/projects/${projectId}/exports/metrics/${page}?snapshot=${snapshotId}`, headers: { cookie: owner.cookie } });
    expect(file.statusCode, file.body).toBe(200);
    expect(file.headers['content-type']).toBe('application/pdf');
    const disposition = String(file.headers['content-disposition'] ?? '');
    into.set(page, { pages: pdfPages(new Uint8Array(file.rawPayload)), name: /filename="([^"]+)"/u.exec(disposition)?.[1] ?? '' });
  }
}

beforeAll(async () => {
  api = await startTestApi();
  // The demo project as the store allows one: created by a demo seed account, with the TEST owner made a member.
  const seed = await createTestAccount(api.database, { label: 'G10-16 demo seed', kind: 'seed', roles: ['owner'] });
  const demoProject = await createTestProject(api.database, { ownerId: seed, isDemo: true });
  const ownerId = await createTestAccount(api.database, { label: 'G10-16 owner', kind: 'person', roles: ['owner'] });
  await addProjectMember(api.database.operator.db, { projectId: demoProject, userId: ownerId });
  const otherProject = await createTestProject(api.database, { ownerId, isDemo: false });
  owner = await signIn(api, ownerId);
  web = await startPrintOrigin(() => Promise.resolve(undefined), printView);
  printer = createPdfPrinter({ timeoutMs: 60_000 });
  app = buildServer({ gates: assertGatesStartupSafe(), services: { ...api.services, printer, webOrigin: web.origin } });
  await app.ready();
  await exportedPages(demoProject, demoFiles);
  await exportedPages(otherProject, otherFiles);
}, 300_000);

afterAll(async () => {
  await printer?.close();
  await web?.stop();
  await app?.close();
  await api?.stop();
});

describe('G10-16 · R-121 · rule 10: the demo project\'s exported Payback and Lifecycle Analysis carry the demo line on every page', () => {
  it('G10-16: each export prints its page, and every page carries "Demo data, not an assessment of the real building" as its first line', () => {
    expect([...demoFiles.keys()]).toEqual([...PAGES]);
    for (const [page, file] of demoFiles) {
      expect(file.pages.length, page).toBeGreaterThanOrEqual(1);
      expect(file.pages.join('\n'), page).toContain(page === 'payback' ? 'Payback Analysis' : 'Lifecycle Analysis');
      for (const [index, text] of file.pages.entries()) expect(linesOf(text)[0], `${page}, page ${String(index + 1)} of ${String(file.pages.length)}`).toBe(DEMO_LINE);
    }
  });

  it('G10-16 (beside the case) · G10-10\'s reading for exports: a project not flagged demo carries the line on no page', () => {
    expect([...otherFiles.keys()]).toEqual([...PAGES]);
    for (const file of otherFiles.values()) for (const text of file.pages) expect(text).not.toContain(DEMO_LINE);
  });

  it('G10-16 (beside the case) · rule 13: the printer opened the print route with the owner\'s session cookie alone; each file is named by its page and version', () => {
    const cookies = web?.cookies ?? [];
    expect(cookies.length).toBeGreaterThanOrEqual(4);
    for (const header of cookies) {
      expect(header.startsWith('sovitech_session=')).toBe(true);
      expect(header).not.toContain(';');
      expect(owner.cookie).toContain(header);
    }
    for (const [page, file] of [...demoFiles, ...otherFiles]) {
      expect(file.name, page).toMatch(page === 'payback' ? /^payback-analysis-\d{4}-\d{2}-\d{2}-\d{4}\.pdf$/u : /^lifecycle-analysis-\d{4}-\d{2}-\d{2}-\d{4}\.pdf$/u);
    }
  });

  it('G10-16 (beside the case) · 2.8 "Reserved terms": no page of any export holds a reserved term outside 2.8\'s own badge labels', () => {
    for (const file of [...demoFiles.values(), ...otherFiles.values()]) for (const text of file.pages) expect(reservedTermsInPrint(text)).toEqual([]);
  });
});
