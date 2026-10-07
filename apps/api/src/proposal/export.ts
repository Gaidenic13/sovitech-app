/**
 * The PDF printer (docs/adr/0050-exports-print-route-and-pdf.md; prompt 3 phase 5: "a print route rendered to PDF with
 * Playwright"; guardrails 2.8 "Prominence"; rule 10 "Labelled everywhere"; rule 13).
 *
 * One headless Chromium (playwright-core 1.63.0 and the headless shell of the browser build the e2e setup installed;
 * nothing is downloaded at run time), launched on the first export, closed when it has been idle for a while and when
 * the server closes; one print at a time, in a bounded queue (at most `maxWaiting` prints wait behind the one
 * printing; one more is refused at once, `printer_busy`, so no requester holds every other one's export for long), and
 * at most one print per session, waiting or printing (a second one from the same session while its first waits or
 * prints is refused at once, `printer_busy` too, so one member holding several downloads cannot fill the queue and
 * turn every other member's Download away: phase 5, the final verification's item 3, A-7's residual), each in a fresh
 * browser context that:
 * - carries only the requester's own session cookie, set for the web origin (`SOVITECH_WEB_ORIGIN`; the API's config),
 *   so the print route reads exactly what that user may read (rule 13), and nothing is minted for it: no other cookie
 *   of the request (the CSRF cookie among them) is carried;
 * - refuses every request, and every WebSocket, that does not go to the web origin (the print page and its `/api`
 *   calls through the web origin's proxy): no font, script or image from a third party, no network beyond the app;
 *   service workers and downloads are refused, dialogs dismissed;
 * - opens the print route the request names (`/projects/<projectId>/print/proposals/<snapshotId>`, or, for a Metrics page
 *   with "Export Report", `/projects/<projectId>/print/metrics/<page>/<snapshotId>`: phase 6, R-121, docs/adr/0052
 *   decision 7; any other page is refused), waits for the page's ready marker
 *   (`data-print-ready="true"` on the document element, set once the view is loaded and rendered, or
 *   `data-print-ready="failed"`, which refuses the export; a page that leaves the print route, to sign-in, refuses it
 *   at once), waits for its fonts, and prints A4 with backgrounds (the page's own `@page` rule sets the size and the
 *   margins), with no header or footer template: the print page repeats the demo line on every page itself, and no
 *   page number is printed (prompt 3 section 7: no page numbers or totals);
 * - is closed after the print, whatever happened.
 * Time and memory are bounded: the whole print, from the request to the last byte (its wait in the queue counted), has
 * `timeoutMs`; the renderer's JavaScript heap is capped and one renderer process serves the browser. A print whose
 * requester went away (its `signal` aborted: the route ties it to the request's connection) never opens a page while
 * it waits, and closes its context while it prints. A print that does not finish in time, a page that reports
 * failure, a session the page could not use, a full queue or a browser that cannot start answers `ExportUnavailable`
 * (the route answers 503 `export_unavailable`; the web says the PDF could not be prepared, nothing is lost and the
 * owner can try again: rule 7). Its `reason` is a code, never document text (rule 13: logs hold codes and ids only).
 * Nothing is written to disk: the bytes go to the response (rule 13: no stored copy of an export, ADR 0050 decision 3).
 */
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core';
import { METRICS_EXPORT_PAGES, UUID_PATTERN, type MetricsExportPage } from '@sovitech/view-model/browser';
import { SESSION_COOKIE } from '../auth/sessions';

export interface PrintRequest {
  /** The web origin the print route is served from (dev: Vite at 127.0.0.1:5173; e2e: vite preview at 127.0.0.1:4173). */
  readonly webOrigin: string;
  /** The requester's Cookie header, from which only the session cookie is carried into the print context. */
  readonly cookieHeader: string;
  readonly projectId: string;
  /** The stored version the print route prints. */
  readonly snapshotId: string;
  /**
   * Which page of it the print route prints: absent for the stored proposal (R-118), or a Metrics page with "Export
   * Report" (`payback`, `lifecycle`: R-121; docs/adr/0052 decision 7; ADR 0050 amended in phase 6). Any other page is
   * refused (`request_invalid`) before a page opens.
   */
  readonly metricsPage?: MetricsExportPage;
  /** Aborted when the requester went away: a waiting print never opens a page, a running one closes its context. */
  readonly signal?: AbortSignal;
}

export interface PdfPrinter {
  print(request: PrintRequest): Promise<Uint8Array>;
  close(): Promise<void>;
}

/**
 * Why a print could not be produced, as a code (rule 13: never document text):
 * - `request_invalid`: the web origin is not an http(s) origin, an id is not a UUID, or the Metrics page named has no
 *   "Export Report";
 * - `not_signed_in`: the request carried no session cookie, or the print page left for sign-in;
 * - `page_failed`: the print page reported that its view could not be loaded (`data-print-ready="failed"`);
 * - `timeout`: the print did not finish within its time;
 * - `browser_unavailable`: the browser could not be started, or failed while printing;
 * - `printer_closed`: the server is closing;
 * - `printer_busy`: the queue is full (`maxWaiting` prints wait behind the one printing), or the same session already
 *   has a print waiting or printing;
 * - `request_closed`: the requester went away before the print was done (the request's connection closed).
 */
export const EXPORT_FAILURES = ['request_invalid', 'not_signed_in', 'page_failed', 'timeout', 'browser_unavailable', 'printer_closed', 'printer_busy', 'request_closed'] as const;
export type ExportFailure = (typeof EXPORT_FAILURES)[number];

/** A print that could not be produced: the route answers 503 `export_unavailable` (ADR 0050 decision 2). */
export class ExportUnavailable extends Error {
  override name = 'ExportUnavailable';
  /** The contract's refusal code (routes.ts `exports.file`: `503 export_unavailable`). */
  readonly code = 'export_unavailable';

  constructor(readonly reason: ExportFailure) {
    super(`export_unavailable: ${reason}`);
  }
}

export interface PdfPrinterOptions {
  /** The whole print's time, from the request to the last byte: its wait in the queue counts. */
  readonly timeoutMs: number;
  /** How long the browser stays open with no print before it is closed to free its memory (default two minutes). */
  readonly idleCloseMs?: number;
  /**
   * How many prints may wait behind the one printing (default 2); one more is refused at once (`printer_busy`). Each
   * session holds at most one of the waiting and printing prints.
   */
  readonly maxWaiting?: number;
}

/** The attribute the print page sets on the document element (apps/web/src/proposal/ProposalPrintPage.tsx). */
export const PRINT_READY_ATTRIBUTE = 'data-print-ready';

/**
 * The print route of a stored proposal, or of a Metrics page of it with "Export Report" (apps/web/src/routes.tsx
 * APP_PATHS: `/projects/:projectId/print/proposals/:snapshotId`, `/projects/:projectId/print/metrics/:page/:snapshotId`).
 */
export function printPathOf(projectId: string, snapshotId: string, metricsPage?: MetricsExportPage): string {
  return metricsPage === undefined ? `/projects/${projectId}/print/proposals/${snapshotId}` : `/projects/${projectId}/print/metrics/${metricsPage}/${snapshotId}`;
}

/** Whether a request's Metrics page is one with "Export Report" (or none: the stored proposal). */
function knownPage(metricsPage: string | undefined): metricsPage is MetricsExportPage | undefined {
  return metricsPage === undefined || (METRICS_EXPORT_PAGES as readonly string[]).includes(metricsPage);
}

const DEFAULT_IDLE_CLOSE_MS = 2 * 60 * 1000;
const DEFAULT_MAX_WAITING = 2;

/**
 * The browser's flags beyond Playwright's defaults: a capped JavaScript heap for the renderer and one renderer process
 * (the machine runs the API, the database and the e2e stack beside it; prompt 3 phase 5's resources note), no GPU.
 */
const BROWSER_ARGS = ['--js-flags=--max-old-space-size=256', '--renderer-process-limit=1', '--disable-gpu', '--disable-extensions'];

/** A4 at the CSS pixel's 96 dpi: the page lays out at the paper's width while it loads (210 mm × 297 mm). */
const A4_VIEWPORT = { width: 794, height: 1123 } as const;

/** The value of the session cookie in a Cookie header, as sent (still signed and encoded), or undefined. */
export function sessionCookieOf(cookieHeader: string): string | undefined {
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === SESSION_COOKIE) {
      const value = part.slice(separator + 1).trim();
      return value === '' ? undefined : value;
    }
  }
  return undefined;
}

/** The web origin as an origin (`http://127.0.0.1:4173`), or undefined when it is not an http(s) origin with nothing after it. */
export function webOriginOf(text: string): string | undefined {
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return undefined;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
  if (url.username !== '' || url.password !== '' || url.search !== '' || url.hash !== '' || (url.pathname !== '/' && url.pathname !== '')) return undefined;
  return url.origin;
}

/** Whether a URL goes to the origin (a URL that does not parse goes nowhere it may). */
function onOrigin(url: string, origin: string): boolean {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}

/** The print's clock: what remains of its time, and a race that stops waiting when it runs out. */
class Deadline {
  private readonly endsAt: number;

  constructor(timeoutMs: number) {
    this.endsAt = Date.now() + timeoutMs;
  }

  remaining(): number {
    return Math.max(1, this.endsAt - Date.now());
  }

  expired(): boolean {
    return Date.now() >= this.endsAt;
  }

  /**
   * Resolves as `work` does, or rejects with `timeout` when the time runs out first, or with `request_closed` when the
   * requester goes away first (`stop` then stops the work).
   */
  race<T>(work: Promise<T>, stop: () => void, signal?: AbortSignal): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const end = (failure: ExportFailure) => () => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        stop();
        reject(new ExportUnavailable(failure));
      };
      const timer = setTimeout(end('timeout'), this.remaining());
      const onAbort = end('request_closed');
      if (signal?.aborted === true) {
        onAbort();
        return;
      }
      signal?.addEventListener('abort', onAbort, { once: true });
      work.then(
        (value) => {
          clearTimeout(timer);
          signal?.removeEventListener('abort', onAbort);
          resolve(value);
        },
        (error: unknown) => {
          clearTimeout(timer);
          signal?.removeEventListener('abort', onAbort);
          reject(error instanceof Error ? error : new Error(String(error)));
        },
      );
    });
  }
}

/** Maps what went wrong while printing to its code: a deadline's own error is kept, anything from the browser is `browser_unavailable`. */
function failureOf(error: unknown): ExportUnavailable {
  return error instanceof ExportUnavailable ? error : new ExportUnavailable('browser_unavailable');
}

/**
 * What the two page functions below read in the browser. The API compiles without the DOM's types (apps/api/tsconfig.json),
 * so they reach the page's globals through this shape; Playwright runs them in the page, where `globalThis` is the window.
 */
interface PrintWindow {
  readonly document: { readonly documentElement: { getAttribute(name: string): string | null }; readonly fonts: { readonly ready: Promise<unknown> } };
  readonly location: { readonly pathname: string };
}

/** Waits for the print page's ready marker; `left` when the page went elsewhere (to sign-in: its session was not accepted). */
async function readiness(page: Page, path: string, timeoutMs: number): Promise<'true' | 'failed' | 'left'> {
  const handle = await page.waitForFunction(
    ({ attribute, printPath }) => {
      const window = globalThis as unknown as PrintWindow;
      const state = window.document.documentElement.getAttribute(attribute);
      if (state === 'true' || state === 'failed') return state;
      return window.location.pathname === printPath ? false : 'left';
    },
    { attribute: PRINT_READY_ATTRIBUTE, printPath: path },
    { timeout: timeoutMs, polling: 100 },
  );
  const state: unknown = await handle.jsonValue();
  return state === 'true' || state === 'failed' ? state : 'left';
}

/** Opens the print route in a fresh context with the session cookie only, and prints it. */
async function printOnce(
  browser: Browser,
  request: { readonly origin: string; readonly session: string; readonly path: string; readonly signal?: AbortSignal },
  deadline: Deadline,
): Promise<Uint8Array> {
  let context: BrowserContext | undefined;
  const stop = () => {
    void context?.close().catch(() => undefined);
  };
  const work = async (): Promise<Uint8Array> => {
    context = await browser.newContext({
      viewport: A4_VIEWPORT,
      serviceWorkers: 'block',
      acceptDownloads: false,
      javaScriptEnabled: true,
    });
    context.setDefaultTimeout(deadline.remaining());
    // The requester's session only (rule 13): the API reads the project as that user, with row-level security.
    await context.addCookies([{ name: SESSION_COOKIE, value: request.session, url: request.origin, httpOnly: true, sameSite: 'Lax' }]);
    // No network beyond the web origin (ADR 0050 decision 2).
    await context.route('**/*', (route) => (onOrigin(route.request().url(), request.origin) ? route.continue() : route.abort('blockedbyclient')));
    await context.routeWebSocket(
      (url) => !onOrigin(url.href.replace(/^ws/u, 'http'), request.origin),
      (socket) => socket.close(),
    );
    const page = await context.newPage();
    page.on('dialog', (dialog) => void dialog.dismiss().catch(() => undefined));
    const response = await page.goto(`${request.origin}${request.path}`, { waitUntil: 'domcontentloaded', timeout: deadline.remaining() });
    if (response === null || !response.ok()) throw new ExportUnavailable('page_failed');
    const state = await readiness(page, request.path, deadline.remaining());
    if (state === 'failed') throw new ExportUnavailable('page_failed');
    if (state === 'left') throw new ExportUnavailable('not_signed_in');
    await page.evaluate(async () => {
      await (globalThis as unknown as PrintWindow).document.fonts.ready;
    });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      tagged: true,
      outline: false,
    });
    return new Uint8Array(pdf);
  };
  try {
    return await deadline.race(work(), stop, request.signal);
  } catch (error) {
    throw failureOf(error);
  } finally {
    await (context as BrowserContext | undefined)?.close().catch(() => undefined);
  }
}

/** A print asked for: its request, its clock (started when it was asked for) and how to answer it. */
interface PrintJob {
  readonly request: PrintRequest;
  readonly deadline: Deadline;
  /** Answers the requester once; later answers are ignored. */
  answer(outcome: { readonly pdf: Uint8Array } | { readonly failure: ExportUnavailable }): void;
}

/** The one printer of a server (created by `buildServer`, closed in its `onClose` hook). */
export function createPdfPrinter(options: PdfPrinterOptions): PdfPrinter {
  const idleCloseMs = options.idleCloseMs ?? DEFAULT_IDLE_CLOSE_MS;
  const maxWaiting = options.maxWaiting ?? DEFAULT_MAX_WAITING;
  let browser: Promise<Browser> | undefined;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  /** The prints waiting for their turn, in the order they were asked for. */
  const waiting: PrintJob[] = [];
  /** The print printing now, until it settled. */
  let printing: Promise<void> | undefined;
  /** The sessions (their cookie values, as sent) with a print waiting or printing: one print each, until it is answered. */
  const sessionsHolding = new Set<string>();
  let closed = false;

  const closeBrowser = async (): Promise<void> => {
    const open = browser;
    browser = undefined;
    if (open === undefined) return;
    const launched = await open.catch(() => undefined);
    await launched?.close().catch(() => undefined);
  };

  const browserOf = async (deadline: Deadline): Promise<Browser> => {
    if (browser !== undefined) {
      const current = await browser.catch(() => undefined);
      if (current?.isConnected() === true) return current;
      browser = undefined;
    }
    // The process's signals stay its own (phase 6 part B, I-10): by default Playwright installs SIGTERM, SIGINT and SIGHUP
    // handlers while its browser is open, which close the browser and leave the process running, so an API stopped within
    // the idle time after an export kept its port. Its exit handler still closes the browser when the process exits.
    const launching = chromium.launch({ headless: true, args: BROWSER_ARGS, timeout: deadline.remaining(), handleSIGTERM: false, handleSIGINT: false, handleSIGHUP: false });
    browser = launching;
    try {
      return await launching;
    } catch {
      if (browser === launching) browser = undefined;
      throw new ExportUnavailable('browser_unavailable');
    }
  };

  const turn = async (request: PrintRequest, deadline: Deadline): Promise<Uint8Array> => {
    if (closed) throw new ExportUnavailable('printer_closed');
    if (request.signal?.aborted === true) throw new ExportUnavailable('request_closed');
    if (deadline.expired()) throw new ExportUnavailable('timeout');
    if (idleTimer !== undefined) clearTimeout(idleTimer);
    try {
      const origin = webOriginOf(request.webOrigin);
      if (origin === undefined || !UUID_PATTERN.test(request.projectId) || !UUID_PATTERN.test(request.snapshotId) || !knownPage(request.metricsPage)) {
        throw new ExportUnavailable('request_invalid');
      }
      const session = sessionCookieOf(request.cookieHeader);
      if (session === undefined) throw new ExportUnavailable('not_signed_in');
      const open = await deadline.race(browserOf(deadline), () => undefined, request.signal);
      const path = printPathOf(request.projectId, request.snapshotId, request.metricsPage);
      return await printOnce(open, { origin, session, path, ...(request.signal === undefined ? {} : { signal: request.signal }) }, deadline);
    } finally {
      if (!closed) {
        idleTimer = setTimeout(() => void closeBrowser(), idleCloseMs);
        idleTimer.unref();
      }
    }
  };

  /** Prints the next waiting print, if none is printing: one at a time, in the order asked for. */
  const next = (): void => {
    if (printing !== undefined) return;
    const job = waiting.shift();
    if (job === undefined) return;
    printing = (async () => {
      try {
        job.answer({ pdf: await turn(job.request, job.deadline) });
      } catch (error) {
        job.answer({ failure: error instanceof ExportUnavailable ? error : new ExportUnavailable('browser_unavailable') });
      } finally {
        printing = undefined;
        next();
      }
    })();
  };

  return {
    print(request) {
      if (closed) return Promise.reject(new ExportUnavailable('printer_closed'));
      if (request.signal?.aborted === true) return Promise.reject(new ExportUnavailable('request_closed'));
      // A print is a session's: with no session cookie it is refused before it takes a place in the queue.
      const session = sessionCookieOf(request.cookieHeader);
      if (session === undefined) return Promise.reject(new ExportUnavailable('not_signed_in'));
      // One print per session, waiting or printing: a second one is refused at once, so no member fills the queue.
      if (sessionsHolding.has(session)) return Promise.reject(new ExportUnavailable('printer_busy'));
      // One printing and `maxWaiting` waiting: one more is refused at once, never queued without bound.
      if (printing !== undefined && waiting.length >= maxWaiting) return Promise.reject(new ExportUnavailable('printer_busy'));
      // The print's clock starts now: its wait in the queue counts toward its time.
      const deadline = new Deadline(options.timeoutMs);
      return new Promise<Uint8Array>((resolve, reject) => {
        let done = false;
        const leaveQueue = (failure: ExportFailure) => () => {
          const at = waiting.indexOf(job);
          // Only a print still waiting leaves the queue here; a running one ends through its own race.
          if (at < 0) return;
          waiting.splice(at, 1);
          job.answer({ failure: new ExportUnavailable(failure) });
        };
        const onAbort = leaveQueue('request_closed');
        const waitTimer = setTimeout(leaveQueue('timeout'), deadline.remaining());
        const job: PrintJob = {
          request,
          deadline,
          answer(outcome) {
            if (done) return;
            done = true;
            sessionsHolding.delete(session);
            clearTimeout(waitTimer);
            request.signal?.removeEventListener('abort', onAbort);
            if ('pdf' in outcome) resolve(outcome.pdf);
            else reject(outcome.failure);
          },
        };
        request.signal?.addEventListener('abort', onAbort, { once: true });
        sessionsHolding.add(session);
        waiting.push(job);
        next();
      });
    },
    async close() {
      closed = true;
      if (idleTimer !== undefined) clearTimeout(idleTimer);
      for (const job of waiting.splice(0)) job.answer({ failure: new ExportUnavailable('printer_closed') });
      await printing;
      await closeBrowser();
    },
  };
}
