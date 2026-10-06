/**
 * Prints a stored proposal's print view to PDF, for the guardrail cases about exports (G10-5, G10-13, and G13-12's
 * PDF half): the print document as the app renders it (apps/web/src/proposal/print/PrintDocument.tsx, rendered to
 * markup with React's server renderer), with the app's own stylesheets (the tokens with their print scope, the kit's,
 * the print route's), served on a TEST web origin on 127.0.0.1 at the print route's path, printed by the API's own
 * printer (apps/api/src/proposal/export.ts: the headless Chromium of the installed build, A4, the session cookie only,
 * nothing beyond the origin), and read back page by page with pypdfium2 from the extractor's environment, through the
 * figure checks' reader (tools/checks/mockup-figures/document-text.ts `readPdfs`).
 *
 * The print view it prints is the one the case hands in: one the API served (G10-13, G13-12) or a TEST one in the
 * contract's shapes (G10-5). The page is the markup the app's print route renders once its view has loaded, so the
 * served HTML carries the print scope and the ready marker the route sets then (`data-print-page`,
 * `data-print-ready="true"`); the route's own loading and marker logic is proven by its component tests
 * (apps/web/src/proposal/ProposalPrintPage.test.tsx) and, on the e2e stack, by the render test of the print route.
 *
 * It launches Chromium: a case that uses it runs under the e2e lock with one worker (prompt 3 phase 5's resources
 * note). Nothing here catches an error: a failure fails the case (tools/checks/index, `[support]`). The PDF is written
 * to a temporary folder only for the reader, and removed.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { findReservedTerms, REGISTERED_ALLOWANCE_ENTRIES, type ReservedTermMatch } from '@sovitech/registry/reserved-terms';
import type { ProposalPrintResponse } from '@sovitech/view-model/browser';
import { createPdfPrinter } from '../../../apps/api/src/proposal/export';
import { PrintDocument } from '../../../apps/web/src/proposal/print/PrintDocument';
import { readPdfs } from '../../../tools/checks/mockup-figures/document-text';

const REPOSITORY_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/** The stylesheets the print route uses, as files: the tokens (with the print scope), the kit's, the print route's. */
const STYLESHEETS = ['packages/ui/src/tokens.css', 'packages/ui/src/ui.css', 'apps/web/src/proposal/print/print.css'];

/** A TEST session cookie for a print whose page reads nothing from the API (the static markup). */
export const TEST_PRINT_COOKIE = 'sovitech_session=TEST-print-session';

export interface PrintedProposal {
  /** Each page's text, in order, as pypdfium2 reads it (line breaks as `\n`). */
  readonly pages: readonly string[];
  /** The print document's markup, as the app renders it. */
  readonly markup: string;
  /** The Cookie header of every request the print route received. */
  readonly cookies: readonly string[];
}

function listen(server: Server): Promise<string> {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (typeof address !== 'object' || address === null) throw new Error('the TEST web origin has no port');
      resolve(`http://127.0.0.1:${String(address.port)}`);
    });
  });
}

function close(server: Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

/** Every page's text of a PDF, read with pypdfium2. */
export function pdfPages(bytes: Uint8Array): string[] {
  const folder = mkdtempSync(join(tmpdir(), 'sovitech-print-case-'));
  const path = join(folder, 'proposal.pdf');
  writeFileSync(path, bytes);
  const read = readPdfs([{ name: 'proposal.pdf', path }]);
  rmSync(folder, { recursive: true, force: true });
  if (read.problems.length > 0) throw new Error(`the printed PDF could not be read: ${read.problems.join('; ')}`);
  return read.parts.filter((part) => /#page=\d+$/u.test(part.where)).map((part) => part.text);
}

/** The lines of a page's text, trimmed, with no empty line. */
export function linesOf(page: string): string[] {
  return page
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

/** The print route's page as the app renders it once its view has loaded: the print document, the app's stylesheets, the print scope and the ready marker. */
export function printPageHtml(response: ProposalPrintResponse): { readonly html: string; readonly markup: string } {
  const markup = renderToStaticMarkup(<PrintDocument response={response} />);
  const styles = STYLESHEETS.map((file) => readFileSync(join(REPOSITORY_ROOT, file), 'utf8')).join('\n');
  const html = `<!doctype html><html lang="en" data-print-page="" data-print-ready="true"><head><meta charset="utf-8"><title>Preliminary proposal</title><style>${styles}</style></head><body>${markup}</body></html>`;
  return { html, markup };
}

/** The print route's page when its view could not be loaded: the refusal marker the printer reads (apps/web ProposalPrintPage). */
const FAILED_PAGE = '<!doctype html><html lang="en" data-print-page="" data-print-ready="failed"><head><meta charset="utf-8"><title>TEST</title></head><body><main>TEST</main></body></html>';

/** Where a TEST web origin gets the print view of a project's snapshot, as the print route would read it with the request's cookies. */
export type PrintViewSource = (request: { readonly projectId: string; readonly snapshotId: string; readonly cookieHeader: string }) => Promise<ProposalPrintResponse | undefined>;

export interface PrintOrigin {
  /** The origin (`http://127.0.0.1:<port>`). */
  readonly origin: string;
  /** The Cookie header of every request the print route received. */
  readonly cookies: readonly string[];
  /** The print documents' markup, one per page served. */
  readonly markups: readonly string[];
  stop(): Promise<void>;
}

/**
 * A TEST web origin on 127.0.0.1 that serves the print route as the app does: for `/projects/<id>/print/proposals/<id>`
 * it reads the print view from `source` with the request's own cookies (the app's print route reads `proposals.print`
 * through the web origin's `/api` proxy with them) and serves the print document, or the refusal marker when there is
 * no view; any other path is not found.
 */
export async function startPrintOrigin(source: PrintViewSource): Promise<PrintOrigin> {
  const cookies: string[] = [];
  const markups: string[] = [];
  const server = createServer((request, reply) => {
    const cookieHeader = request.headers.cookie ?? '';
    cookies.push(cookieHeader);
    const match = /^\/projects\/([0-9a-f-]{36})\/print\/proposals\/([0-9a-f-]{36})$/u.exec(new URL(request.url ?? '/', 'http://127.0.0.1').pathname);
    if (match === null) {
      reply.writeHead(404, { 'content-type': 'text/plain' }).end('TEST not found');
      return;
    }
    void source({ projectId: match[1] ?? '', snapshotId: match[2] ?? '', cookieHeader }).then((response) => {
      if (response === undefined) {
        reply.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(FAILED_PAGE);
        return;
      }
      const page = printPageHtml(response);
      markups.push(page.markup);
      reply.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(page.html);
    });
  });
  const origin = await listen(server);
  return { origin, cookies, markups, stop: () => close(server) };
}

/** Prints the print view as the app's print route shows it, with the API's printer, and reads the PDF back. */
export async function printProposal(response: ProposalPrintResponse, options: { readonly cookieHeader?: string } = {}): Promise<PrintedProposal> {
  const web = await startPrintOrigin(() => Promise.resolve(response));
  const printer = createPdfPrinter({ timeoutMs: 60_000 });
  try {
    const bytes = await printer.print({
      webOrigin: web.origin,
      cookieHeader: options.cookieHeader ?? TEST_PRINT_COOKIE,
      projectId: response.project.projectId,
      snapshotId: response.view.proposal.snapshotId,
    });
    return { pages: pdfPages(bytes), markup: web.markups[0] ?? '', cookies: web.cookies };
  } finally {
    await printer.close();
    await web.stop();
  }
}

/** The badge labels 2.8 allows to hold a reserved term (the registered allowances of the badge kind). */
const ALLOWED_BADGE_LABELS = REGISTERED_ALLOWANCE_ENTRIES.flatMap((entry) => (entry.kind === 'badge' ? [entry.label] : []));

/**
 * The reserved terms in a printed page's text (2.8 "Reserved terms"; prompt 3 phase 5: "Every export passes the
 * reserved-term scan"), outside 2.8's own badge labels. A PDF's text carries no element marks, so this scan allows
 * less than the render test's on the print route: only the badge labels 2.8 lists, never a status line or a sentence
 * (no case printing with it shows "Formal quotation" or an engineer-verified sentence).
 */
export function reservedTermsInPrint(text: string): ReservedTermMatch[] {
  let rest = text.replace(/\s+/gu, ' ');
  for (const label of ALLOWED_BADGE_LABELS) rest = rest.split(label).join(' ');
  return findReservedTerms(rest);
}
