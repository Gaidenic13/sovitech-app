/**
 * The PDF printer (./export.ts; docs/adr/0050-exports-print-route-and-pdf.md decisions 1 and 2), against TEST pages a
 * local TEST web origin serves on 127.0.0.1 (no app, no API, no database): the real printer, the real headless Chromium
 * of the installed build, and the PDF's text read back with pypdfium2 from the extractor's environment, the PDF reader
 * the extractor and the figure checks use (tools/checks/mockup-figures/pdf_text.py).
 *
 * It launches Chromium: run it under the e2e lock with one worker (prompt 3 phase 5's resources note). Every page and
 * text here is TEST data.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { readPdfs } from '../../../../tools/checks/mockup-figures/document-text';
import { ExportUnavailable, createPdfPrinter, printPathOf, sessionCookieOf, webOriginOf, type PdfPrinter } from './export';

const PROJECT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e9f';
const READY = '0192f0e4-0000-7000-8000-000000000001';
const FAILED = '0192f0e4-0000-7000-8000-000000000002';
const NEVER = '0192f0e4-0000-7000-8000-000000000003';
const LEAVES = '0192f0e4-0000-7000-8000-000000000004';
const SLOW = '0192f0e4-0000-7000-8000-000000000005';
const MISSING = '0192f0e4-0000-7000-8000-000000000006';
/** Pages that only the queue's tests open, so whether they were ever served is theirs to read. */
const WAITER = '0192f0e4-0000-7000-8000-000000000007';
const LATE = '0192f0e4-0000-7000-8000-000000000008';

/** A signed session cookie as the API sets it (TEST value), with the CSRF cookie and another beside it. */
const SESSION = 's%3ATEST-session.TEST-signature';
const COOKIE_HEADER = `_csrf=TEST-csrf-secret; sovitech_session=${SESSION}; other=TEST-other`;

/**
 * The Cookie header of another TEST session (another member, or the same member signed in elsewhere): the printer holds
 * at most one print per session, so prints asked for together come from sessions of their own.
 */
const sessionHeader = (name: string): string => `_csrf=TEST-csrf-secret; sovitech_session=s%3ATEST-session-${name}.TEST-signature`;

/** Reads every page's text of a PDF with pypdfium2, through the figure checks' reader (the extractor's environment). */
function pdfPages(bytes: Uint8Array): string[] {
  const folder = mkdtempSync(join(tmpdir(), 'sovitech-export-test-'));
  const path = join(folder, 'print.pdf');
  writeFileSync(path, bytes);
  const read = readPdfs([{ name: 'print.pdf', path }]);
  rmSync(folder, { recursive: true, force: true });
  expect(read.problems).toEqual([]);
  return read.parts.filter((part) => /#page=\d+$/u.test(part.where)).map((part) => part.text);
}

/** What the TEST origins saw. */
const seen = { pageCookies: [] as string[], apiCookies: [] as string[], offOrigin: [] as string[], slowServedAt: [] as number[], served: [] as string[], metricsServed: [] as string[] };

/** A TEST page: TEST text long enough for several A4 pages, with a running header row the print repeats on each page. */
function testPage(script: string): string {
  const rows = Array.from({ length: 140 }, (_, index) => `<p>TEST paragraph ${'x'.repeat(index % 30)} for the printer test.</p>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>TEST print</title>
<style>@page { size: A4; margin: 16mm; } body { font: 14px sans-serif; }</style>
<link rel="stylesheet" href="OFF/style.css"></head><body>
<table role="presentation"><thead><tr><td>TEST running header</td></tr></thead><tbody><tr><td>${rows}</td></tr></tbody></table>
<img alt="" src="OFF/pixel.png">
<script>${script}</script></body></html>`;
}

const READY_SCRIPT = `
fetch('/api/echo').then(() => fetch('OFF/beacon', { mode: 'no-cors' }).catch(() => undefined))
  .then(() => { document.documentElement.setAttribute('data-print-ready', 'true'); });`;

function pageFor(snapshotId: string): string | undefined {
  switch (snapshotId) {
    case READY:
      return testPage(READY_SCRIPT);
    case FAILED:
      return testPage(`document.documentElement.setAttribute('data-print-ready', 'failed');`);
    case NEVER:
      return testPage('');
    case LEAVES:
      return testPage(`history.replaceState(null, '', '/sign-in');`);
    case SLOW:
    case WAITER:
    case LATE:
      return testPage(`setTimeout(() => document.documentElement.setAttribute('data-print-ready', 'true'), 400);`);
    default:
      return undefined;
  }
}

function listen(handler: (request: IncomingMessage, response: ServerResponse) => void): Promise<{ server: Server; origin: string }> {
  const server = createServer(handler);
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (typeof address !== 'object' || address === null) throw new Error('the TEST origin has no port');
      resolve({ server, origin: `http://127.0.0.1:${String(address.port)}` });
    });
  });
}

let web: { server: Server; origin: string };
let off: { server: Server; origin: string };
let printer: PdfPrinter;

beforeAll(async () => {
  off = await listen((request, response) => {
    seen.offOrigin.push(request.url ?? '');
    response.writeHead(200, { 'content-type': 'text/plain' }).end('TEST');
  });
  web = await listen((request, response) => {
    const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    if (path === '/api/echo') {
      seen.apiCookies.push(request.headers.cookie ?? '');
      response.writeHead(200, { 'content-type': 'application/json' }).end('{}');
      return;
    }
    // Phase 6 (R-121; docs/adr/0052 decision 7): a Metrics page's print route, a TEST page naming the page it is.
    const metrics = /^\/projects\/([0-9a-f-]+)\/print\/metrics\/([a-z]+)\/([0-9a-f-]+)$/u.exec(path);
    if (metrics !== null) {
      seen.pageCookies.push(request.headers.cookie ?? '');
      seen.metricsServed.push(`${metrics[2] ?? ''}:${metrics[3] ?? ''}`);
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(testPage(`document.documentElement.setAttribute('data-print-ready', 'true');`).replace('TEST running header', `TEST running header of the ${metrics[2] ?? ''} page`));
      return;
    }
    const match = /^\/projects\/([0-9a-f-]+)\/print\/proposals\/([0-9a-f-]+)$/u.exec(path);
    const html = match === null ? undefined : pageFor(match[2] ?? '');
    if (html === undefined) {
      response.writeHead(404, { 'content-type': 'text/plain' }).end('TEST not found');
      return;
    }
    seen.pageCookies.push(request.headers.cookie ?? '');
    seen.served.push(match?.[2] ?? '');
    if (match?.[2] === SLOW) seen.slowServedAt.push(Date.now());
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(html.replaceAll('OFF', off.origin));
  });
  printer = createPdfPrinter({ timeoutMs: 8_000 });
});

afterAll(async () => {
  await printer.close();
  await new Promise<void>((resolve) => web.server.close(() => resolve()));
  await new Promise<void>((resolve) => off.server.close(() => resolve()));
});

const request = (snapshotId: string, cookieHeader = COOKIE_HEADER) => ({ webOrigin: web.origin, cookieHeader, projectId: PROJECT, snapshotId });

/** The refusal a print ends with, or undefined when it printed. */
async function refusalOf(print: Promise<Uint8Array>): Promise<ExportUnavailable | undefined> {
  return print.then(
    () => undefined,
    (error: unknown) => {
      expect(error).toBeInstanceOf(ExportUnavailable);
      return error as ExportUnavailable;
    },
  );
}

describe('ADR 0050 decision 2 · R-118 · F-EXPORT-01: the PDF printer', () => {
  it('ADR 0050 · R-118: prints the print route to an A4 PDF once its ready marker is set, every page read back as text, the running header on each page', async () => {
    const pdf = await printer.print(request(READY));
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe('%PDF-');
    const pages = pdfPages(pdf);
    expect(pages.length).toBeGreaterThan(1);
    for (const [index, text] of pages.entries()) expect(text, `page ${String(index + 1)}`).toContain('TEST running header');
    expect(pages.join('\n')).toContain('TEST paragraph');
  }, 60_000);

  it('ADR 0050 · rule 13: the print context carries the requester\'s session cookie only, to the web origin only', () => {
    expect(seen.pageCookies.length).toBeGreaterThan(0);
    expect(seen.apiCookies.length).toBeGreaterThan(0);
    for (const header of [...seen.pageCookies, ...seen.apiCookies]) expect(header).toBe(`sovitech_session=${SESSION}`);
  });

  it('ADR 0050 decision 2: every request off the web origin is refused (no stylesheet, image or fetch reached the other origin)', () => {
    expect(seen.offOrigin).toEqual([]);
  });

  it('ADR 0050 (amended in phase 6) · ADR 0052 decision 7 · R-121: a request naming a Metrics page prints that page\'s print route of the snapshot, not the proposal\'s', async () => {
    for (const metricsPage of ['payback', 'lifecycle'] as const) {
      const pages = pdfPages(await printer.print({ ...request(READY), metricsPage }));
      expect(pages.length).toBeGreaterThan(1);
      for (const [index, text] of pages.entries()) expect(text, `${metricsPage}, page ${String(index + 1)}`).toContain(`TEST running header of the ${metricsPage} page`);
      expect(seen.metricsServed).toContain(`${metricsPage}:${READY}`);
    }
  }, 60_000);

  it('ADR 0050 (amended in phase 6) · R-121: a Metrics page with no Export Report is refused before any page opens (request_invalid)', async () => {
    const served = seen.metricsServed.length;
    const refusal = await refusalOf(printer.print({ ...request(READY), metricsPage: 'opex' as never }));
    expect(refusal?.reason).toBe('request_invalid');
    expect(seen.metricsServed).toHaveLength(served);
  });

  it('ADR 0050 · rule 7: a page that reports failure answers export_unavailable (page_failed), never a PDF', async () => {
    expect((await refusalOf(printer.print(request(FAILED))))?.reason).toBe('page_failed');
  }, 60_000);

  it('ADR 0050: a page that leaves the print route (to sign-in) answers export_unavailable (not_signed_in) at once, not at the time limit', async () => {
    const started = Date.now();
    expect((await refusalOf(printer.print(request(LEAVES))))?.reason).toBe('not_signed_in');
    expect(Date.now() - started).toBeLessThan(8_000);
  }, 60_000);

  it('ADR 0050: a request with no session cookie is refused before any page opens (not_signed_in)', async () => {
    const before = seen.pageCookies.length;
    expect((await refusalOf(printer.print(request(READY, '_csrf=TEST-csrf-secret; other=TEST-other'))))?.reason).toBe('not_signed_in');
    expect(seen.pageCookies.length).toBe(before);
  }, 60_000);

  it('ADR 0050: an id that is not a UUID or a web origin that is not an http(s) origin is refused (request_invalid)', async () => {
    expect((await refusalOf(printer.print({ ...request(READY), snapshotId: '../../api/projects' })))?.reason).toBe('request_invalid');
    expect((await refusalOf(printer.print({ ...request(READY), webOrigin: 'file:///etc' })))?.reason).toBe('request_invalid');
    expect((await refusalOf(printer.print({ ...request(READY), webOrigin: `${web.origin}/elsewhere` })))?.reason).toBe('request_invalid');
  }, 60_000);

  it('ADR 0050: a print route that is not found answers export_unavailable (page_failed)', async () => {
    expect((await refusalOf(printer.print(request(MISSING))))?.reason).toBe('page_failed');
  }, 60_000);

  it('ADR 0050 decision 2: a page that never becomes ready answers export_unavailable (timeout) within the time limit', async () => {
    const short = createPdfPrinter({ timeoutMs: 2_500 });
    const started = Date.now();
    const refusal = await refusalOf(short.print(request(NEVER)));
    const took = Date.now() - started;
    await short.close();
    expect(refusal?.reason).toBe('timeout');
    expect(took).toBeLessThan(6_000);
  }, 60_000);

  it('ADR 0050 decision 2: one print at a time; prints asked for together each answer, in turn (the second page opens only once the first PDF is done)', async () => {
    seen.slowServedAt.length = 0;
    const done: number[] = [];
    const [first, second] = await Promise.all([
      printer.print(request(SLOW, sessionHeader('in-turn-1'))).then((pdf) => {
        done[0] = Date.now();
        return pdf;
      }),
      printer.print(request(SLOW, sessionHeader('in-turn-2'))).then((pdf) => {
        done[1] = Date.now();
        return pdf;
      }),
    ]);
    expect(new TextDecoder().decode(first.slice(0, 5))).toBe('%PDF-');
    expect(new TextDecoder().decode(second.slice(0, 5))).toBe('%PDF-');
    expect(seen.slowServedAt).toHaveLength(2);
    expect(seen.slowServedAt[1]).toBeGreaterThanOrEqual(done[0] ?? Number.POSITIVE_INFINITY);
  }, 60_000);

  it('ADR 0050: a closed printer refuses to print (printer_closed)', async () => {
    const closing = createPdfPrinter({ timeoutMs: 8_000 });
    await closing.close();
    expect((await refusalOf(closing.print(request(READY))))?.reason).toBe('printer_closed');
  }, 60_000);
});

/** How a print ended, and when, in milliseconds from `since`. */
async function outcomeOf(print: Promise<Uint8Array>, since: number): Promise<{ readonly outcome: string; readonly ms: number }> {
  return print.then(
    (pdf) => ({ outcome: new TextDecoder().decode(pdf.slice(0, 5)), ms: Date.now() - since }),
    (error: unknown) => ({ outcome: error instanceof ExportUnavailable ? error.reason : 'not_export_unavailable', ms: Date.now() - since }),
  );
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('ADR 0050 decision 2 · rule 7 · A-7: the queue is bounded, its wait is counted, and a print whose requester went away stops', () => {
  it('ADR 0050 decision 2 · A-7: one printing and two waiting; a further print is refused at once (printer_busy), and the queue then drains', async () => {
    const queued = createPdfPrinter({ timeoutMs: 8_000, maxWaiting: 2 });
    const started = Date.now();
    // Five members (five sessions) at once: the bound is the queue's, not a session's.
    const outcomes = await Promise.all(Array.from({ length: 5 }, (_, index) => outcomeOf(queued.print(request(SLOW, sessionHeader(`bound-${String(index)}`))), started)));
    expect(outcomes.map((entry) => entry.outcome)).toEqual(['%PDF-', '%PDF-', '%PDF-', 'printer_busy', 'printer_busy']);
    for (const refused of outcomes.slice(3)) expect(refused.ms).toBeLessThan(250);
    const again = await outcomeOf(queued.print(request(SLOW, sessionHeader('bound-3'))), Date.now());
    await queued.close();
    expect(again.outcome).toBe('%PDF-');
  }, 60_000);

  it('A-7 · ADR 0050 decision 2 · rule 7 · the final verification, item 3: one print per session, waiting or printing: the same session\'s second and third are refused at once (printer_busy) while another member\'s print waits and prints; the session prints again once its print is answered', async () => {
    const shared = createPdfPrinter({ timeoutMs: 8_000 });
    const memberA = sessionHeader('member-a');
    const memberB = sessionHeader('member-b');
    // One member asks for three downloads at once, then another member asks for one (the finding's case: before the
    // cap, A held the printing place and both waiting places, and B was refused at once).
    const started = Date.now();
    const fromA = [0, 1, 2].map(() => outcomeOf(shared.print(request(SLOW, memberA)), started));
    const fromB = outcomeOf(shared.print(request(SLOW, memberB)), started);
    const [firstA, secondA, thirdA] = await Promise.all(fromA);
    expect([firstA?.outcome, secondA?.outcome, thirdA?.outcome]).toEqual(['%PDF-', 'printer_busy', 'printer_busy']);
    for (const refused of [secondA, thirdA]) expect(refused?.ms).toBeLessThan(250);
    expect((await fromB).outcome).toBe('%PDF-');
    // Once its print is answered, the session prints again.
    expect((await outcomeOf(shared.print(request(SLOW, memberA)), Date.now())).outcome).toBe('%PDF-');
    // Waiting counts as holding: A's print waits behind B's, and A's next one is refused at once.
    const printingB = outcomeOf(shared.print(request(SLOW, memberB)), Date.now());
    const leaving = new AbortController();
    const waitingA = outcomeOf(shared.print({ ...request(LATE, memberA), signal: leaving.signal }), Date.now());
    const askedAgain = Date.now();
    const againA = await outcomeOf(shared.print(request(SLOW, memberA)), askedAgain);
    expect(againA.outcome).toBe('printer_busy');
    expect(againA.ms).toBeLessThan(250);
    // A print that leaves the queue (its requester went away) frees its session at once: the next one waits and prints.
    leaving.abort();
    expect((await waitingA).outcome).toBe('request_closed');
    const afterLeaving = outcomeOf(shared.print(request(SLOW, memberA)), Date.now());
    expect((await printingB).outcome).toBe('%PDF-');
    expect((await afterLeaving).outcome).toBe('%PDF-');
    await shared.close();
  }, 60_000);

  it('ADR 0050 decision 2 · A-7: a print\'s time counts its wait in the queue: behind a print that takes its whole time, it ends within its own time from the request', async () => {
    const short = createPdfPrinter({ timeoutMs: 3_000 });
    const started = Date.now();
    const first = outcomeOf(short.print(request(NEVER, sessionHeader('counted-1'))), started);
    await wait(200);
    const asked = Date.now();
    const second = await outcomeOf(short.print(request(LATE, sessionHeader('counted-2'))), asked);
    await short.close();
    expect((await first).outcome).toBe('timeout');
    expect(second.outcome).toBe('timeout');
    expect(second.ms).toBeLessThan(3_000 + 1_000);
  }, 60_000);

  it('ADR 0050 decision 2 · A-7: a print whose requester went away while it waits never opens a page (request_closed), and the queue goes on', async () => {
    const queue = createPdfPrinter({ timeoutMs: 8_000 });
    const started = Date.now();
    const first = outcomeOf(queue.print(request(SLOW)), started);
    const gone = new AbortController();
    const waiting = outcomeOf(queue.print({ ...request(WAITER, sessionHeader('waiter')), signal: gone.signal }), started);
    await wait(50);
    const abortedAt = Date.now();
    gone.abort();
    const left = await waiting;
    expect(left.outcome).toBe('request_closed');
    expect(Date.now() - abortedAt).toBeLessThan(250);
    expect((await first).outcome).toBe('%PDF-');
    expect((await outcomeOf(queue.print(request(SLOW)), Date.now())).outcome).toBe('%PDF-');
    await queue.close();
    expect(seen.served).not.toContain(WAITER);
    // A requester already gone is refused before any page opens.
    const before = new AbortController();
    before.abort();
    expect((await refusalOf(createPdfPrinter({ timeoutMs: 8_000 }).print({ ...request(WAITER), signal: before.signal })))?.reason).toBe('request_closed');
    expect(seen.served).not.toContain(WAITER);
  }, 60_000);

  it('ADR 0050 decision 2 · A-7: a print whose requester went away while it prints closes its page at once (request_closed), not at its time limit; the next one prints', async () => {
    const running = createPdfPrinter({ timeoutMs: 8_000 });
    const gone = new AbortController();
    const started = Date.now();
    const print = outcomeOf(running.print({ ...request(NEVER), signal: gone.signal }), started);
    // Wait until its page was served (it never becomes ready), then go away.
    const served = seen.served.length;
    while (seen.served.length === served && Date.now() - started < 6_000) await wait(50);
    const abortedAt = Date.now();
    gone.abort();
    const ended = await print;
    expect(ended.outcome).toBe('request_closed');
    expect(Date.now() - abortedAt).toBeLessThan(1_000);
    expect((await outcomeOf(running.print(request(SLOW)), Date.now())).outcome).toBe('%PDF-');
    await running.close();
  }, 60_000);
});

describe('I-10 (phase 6 part B) · ADR 0050: the printer leaves the API\'s signals alone', () => {
  it('I-10 (phase 6 part B) · ADR 0050: the printer launches its browser without taking SIGTERM, SIGINT or SIGHUP from the API, so a stopped API never keeps running with its port held', async () => {
    const launch = vi.spyOn(chromium, 'launch').mockRejectedValue(new Error('TEST no browser'));
    const own = createPdfPrinter({ timeoutMs: 5_000 });
    try {
      expect((await refusalOf(own.print(request(READY))))?.reason).toBe('browser_unavailable');
      expect(launch).toHaveBeenCalledWith(expect.objectContaining({ handleSIGTERM: false, handleSIGINT: false, handleSIGHUP: false }));
    } finally {
      launch.mockRestore();
      await own.close();
    }
  });
});

describe('ADR 0050: the printer\'s request parsing', () => {
  it('reads the session cookie alone from a Cookie header, as sent', () => {
    expect(sessionCookieOf(COOKIE_HEADER)).toBe(SESSION);
    expect(sessionCookieOf('_csrf=TEST; other=TEST')).toBeUndefined();
    expect(sessionCookieOf('sovitech_session=')).toBeUndefined();
    expect(sessionCookieOf('xsovitech_session=TEST')).toBeUndefined();
  });

  it('accepts an http(s) origin with nothing after it, and nothing else', () => {
    expect(webOriginOf('http://127.0.0.1:4173')).toBe('http://127.0.0.1:4173');
    expect(webOriginOf('http://127.0.0.1:4173/')).toBe('http://127.0.0.1:4173');
    expect(webOriginOf('http://127.0.0.1:4173/projects')).toBeUndefined();
    expect(webOriginOf('http://TEST:TEST@127.0.0.1:4173')).toBeUndefined();
    expect(webOriginOf('javascript:alert(1)')).toBeUndefined();
    expect(webOriginOf('not a url')).toBeUndefined();
  });

  it('opens the print route of apps/web/src/routes.tsx', () => {
    expect(printPathOf(PROJECT, READY)).toBe(`/projects/${PROJECT}/print/proposals/${READY}`);
  });

  it('ADR 0052 decision 7 · R-121: opens the print route of a Metrics page with Export Report (apps/web/src/routes.tsx)', () => {
    expect(printPathOf(PROJECT, READY, 'payback')).toBe(`/projects/${PROJECT}/print/metrics/payback/${READY}`);
    expect(printPathOf(PROJECT, READY, 'lifecycle')).toBe(`/projects/${PROJECT}/print/metrics/lifecycle/${READY}`);
  });
});
