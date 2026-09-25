/**
 * The render test (guardrails rule 2; 2.8 "Reserved terms"; G2-1, G2-8; F-RENDER-06), Node
 * side. docs/adr/0006-render-test.md records the reading and the decisions.
 *
 * Use it from a Playwright spec or, through Playwright's library API, from a Vitest case:
 *
 *   await prepareRenderCheck(page, { displayObjects });   // before the first navigation
 *   await page.goto(url);
 *   const report = await runRenderCheck(page);
 *   expect(report.ok, formatRenderReport(report)).toBe(true);
 *
 * or, with a Browser, `await checkUrl(browser, url, { displayObjects })`. `displayObjects` is
 * required: for an app screen, `displayObjectsFromApi()` (api-display-objects.ts), so the
 * check takes the display objects the page itself receives from the API; for a harness page
 * under tests/e2e/pages/, the display objects the page declares (harness-pages.ts). A check
 * without them is refused, and typed display objects are refused on any page but the
 * harness's own (an empty set, for a screen that shows no value, is accepted anywhere).
 *
 * A check waits until the page has loaded, set its readiness marker (required when the screen
 * was served display objects), finished its network requests and its pending timers, and
 * stayed quiet; then scrolls the page and every scroll container; forces :hover, :focus,
 * :focus-within and :focus-visible on every element and dispatches pointer, mouse and focus
 * entry events where a hover or focus could change something; waits again; then reads, in
 * every frame, the snapshot scan (G2-1), the unbound numbers that were shown and are gone
 * (G2-1), the value timeline and the animations on value elements (G2-8), and the shown copy
 * for reserved terms (2.8).
 */
import type { Browser, BrowserContext, CDPSession, Frame, Page, Request } from '@playwright/test';
import { RENDER_ALLOWLIST } from './allowlist';
import { validateAllowlist } from './allowlist-schema';
import { collectApiDisplayObjects, isRegisteredApiSource, type ApiDisplayObjectCollector, type ApiDisplayObjectSource } from './api-display-objects';
import {
  COPY_KIND_ATTRIBUTE,
  COUNTER_FOR_ATTRIBUTE,
  EVIDENCE_DOCUMENT_ATTRIBUTE,
  EVIDENCE_HASH_ATTRIBUTE,
  ICON_MAX_PX,
  NUMBER_WORDS,
  RANGE_ELEMENT_ATTRIBUTES,
  READY_ATTRIBUTE,
  RENDER_ALLOW_ATTRIBUTE,
  SCANNED_ATTRIBUTES,
  STEPPER_ATTRIBUTE,
  UNREADABLE_ATTRIBUTE,
  VALUE_ID_ATTRIBUTE,
  VALUE_ID_PATTERN,
  VIOLATION_CASES,
  type AllowlistEntry,
  type DisplayObjects,
  type HarnessConfig,
  type PageFinding,
  type PageSettling,
  type ServedDisplay,
  type UnreadableEntry,
  type Violation,
  type ViolationKind,
} from './contract';
import { checkedDisplayObjects } from './display-objects';
import { installRenderHarness } from './in-page';
import { reservedTermFindings } from './rendered-copy';
import { findValueChanges, summariseTexts } from './timeline';

export interface PrepareOptions {
  /**
   * Required: the display objects the screen and state was served. An app screen names
   * `displayObjectsFromApi()`; a harness page gives the display objects it declares. Every
   * `data-value-id` outside them fails, and every number inside a value element must be made
   * of what its display object declares. An empty object means the screen shows no value.
   */
  displayObjects: DisplayObjects | ApiDisplayObjectSource;
}

export interface RunOptions {
  /** Least time to observe after the last of: the start of the call, the readiness marker, the last network response. Default 1500 ms. */
  minWindowMs?: number;
  /** How long the value elements must stay unchanged before the check reads them. Default 500 ms. */
  quietMs?: number;
  /** Longest time to wait for the page to settle; a page still unsettled then is read as it is. Default 10000 ms. */
  maxWindowMs?: number;
}

export type RenderCheckOptions = PrepareOptions & RunOptions;

export interface RenderReport {
  ok: boolean;
  url: string;
  violations: Violation[];
  stats: {
    frames: number;
    numberTexts: number;
    boundNumberTexts: number;
    allowlistUse: Record<string, number>;
    timelineRecords: number;
    observedMs: number;
    unreadable: string[];
    /** Units of shown copy matched against the reserved terms. */
    copyUnits: number;
    /** Elements given forced :hover and :focus states, and elements given entry events. */
    forcedElements: number;
    hoverTargets: number;
    /** Whether the readiness marker was set, and whether the screen had to set it. */
    ready: boolean;
    readyRequired: boolean;
    notes: string[];
  };
}

/** The allowlist, validated; the render test never runs on a malformed one. */
export function loadAllowlist(): { entries: AllowlistEntry[]; unreadable: UnreadableEntry[] } {
  const validation = validateAllowlist(RENDER_ALLOWLIST);
  if (!validation.ok) {
    throw new Error(`tests/e2e/render/allowlist.ts is not valid:\n  ${validation.problems.join('\n  ')}`);
  }
  return { entries: validation.entries, unreadable: validation.unreadable };
}

/** Where the harness's own pages live; typed display objects are accepted only for pages here. */
const HARNESS_PAGES_URL = new URL('../pages/', import.meta.url).href;

/** Whether a URL is one of the harness's own pages (tests/e2e/pages/). */
export function isHarnessPageUrl(url: string): boolean {
  return url.startsWith(HARNESS_PAGES_URL);
}

const MISSING_DISPLAY_OBJECTS =
  'The render check needs displayObjects: for an app screen displayObjectsFromApi() (the display objects the page receives from the API), for a harness page the display objects it declares. A check without them is refused.';

/**
 * The display objects of a check, validated: the registered API source, or an object from
 * value ids to what each shows. Anything else (none, a function, a list, a malformed id or
 * display) is refused.
 */
export function checkedCheckDisplayObjects(options: Partial<PrepareOptions> | undefined): DisplayObjects | ApiDisplayObjectSource {
  const source: unknown = options?.displayObjects;
  if (source === undefined || source === null) throw new Error(MISSING_DISPLAY_OBJECTS);
  if (isRegisteredApiSource(source)) return source;
  return checkedDisplayObjects(source, 'the display objects given to the render check');
}

export function harnessConfig(displayObjects: DisplayObjects): HarnessConfig {
  const allowlist = loadAllowlist();
  return {
    valueIdAttribute: VALUE_ID_ATTRIBUTE,
    valueIdPattern: { source: VALUE_ID_PATTERN.source, flags: VALUE_ID_PATTERN.flags },
    allowAttribute: RENDER_ALLOW_ATTRIBUTE,
    counterForAttribute: COUNTER_FOR_ATTRIBUTE,
    stepperAttribute: STEPPER_ATTRIBUTE,
    unreadableAttribute: UNREADABLE_ATTRIBUTE,
    readyAttribute: READY_ATTRIBUTE,
    copyKindAttribute: COPY_KIND_ATTRIBUTE,
    evidenceDocumentAttribute: EVIDENCE_DOCUMENT_ATTRIBUTE,
    evidenceHashAttribute: EVIDENCE_HASH_ATTRIBUTE,
    scannedAttributes: [...SCANNED_ATTRIBUTES],
    rangeElementAttributes: [...RANGE_ELEMENT_ATTRIBUTES],
    displayObjects: { ...displayObjects },
    numberWords: { en: [...NUMBER_WORDS.en], ro: [...NUMBER_WORDS.ro] },
    iconMaxPx: ICON_MAX_PX,
    allowlist: allowlist.entries,
    unreadable: allowlist.unreadable,
  };
}

/**
 * The script injected into every frame. Build tools may wrap named functions in a `__name`
 * helper (esbuild's keepNames); the wrapper supplies a no-op so the serialised function
 * runs as written.
 */
export function harnessScript(displayObjects: DisplayObjects): string {
  const config = JSON.stringify(harnessConfig(displayObjects));
  return `(() => {\n  const __name = (target) => target;\n  (${installRenderHarness.toString()})(${config});\n})();`;
}

// ---------------------------------------------------------------- what a prepared check holds

interface NetworkTracker {
  inflight: Set<Request>;
  lastSettledAt: number;
}

type Prepared =
  | { mode: 'static'; displayObjects: DisplayObjects; network: NetworkTracker }
  | { mode: 'api'; collector: ApiDisplayObjectCollector; network: NetworkTracker };

const PREPARED = new WeakMap<Page | BrowserContext, Prepared>();

function isPage(target: Page | BrowserContext): target is Page {
  return 'goto' in target;
}

function trackNetwork(target: Page | BrowserContext): NetworkTracker {
  const tracker: NetworkTracker = { inflight: new Set(), lastSettledAt: Date.now() };
  const started = (request: Request): void => {
    tracker.inflight.add(request);
  };
  const settled = (request: Request): void => {
    tracker.inflight.delete(request);
    tracker.lastSettledAt = Date.now();
  };
  if (isPage(target)) {
    target.on('request', started);
    target.on('requestfinished', settled);
    target.on('requestfailed', settled);
  } else {
    target.on('request', started);
    target.on('requestfinished', settled);
    target.on('requestfailed', settled);
  }
  return tracker;
}

function preparedFor(page: Page): Prepared {
  const prepared = PREPARED.get(page) ?? PREPARED.get(page.context());
  if (prepared === undefined) {
    throw new Error('The render harness is not prepared: call prepareRenderCheck(page, { displayObjects }) before the first page.goto().');
  }
  return prepared;
}

function servedNow(prepared: Prepared): Record<string, ServedDisplay> {
  return prepared.mode === 'api' ? prepared.collector.current() : { ...prepared.displayObjects };
}

/** Puts display objects into the harness of every frame of a page (the API adapter's delivery). */
async function deliverDisplayObjects(page: Page, displayObjects: Record<string, ServedDisplay>): Promise<void> {
  for (const frame of page.frames()) {
    if (frame.isDetached()) continue;
    await frame.evaluate((served) => window.__sovitechRenderHarness?.setDisplayObjects(served), displayObjects);
  }
}

/**
 * Installs the harness so it runs before the page's own scripts. Call before navigating.
 * `options.displayObjects` is required; without it this throws.
 */
export async function prepareRenderCheck(target: Page | BrowserContext, options: PrepareOptions): Promise<void> {
  const source = checkedCheckDisplayObjects(options);
  const network = trackNetwork(target);
  if (isRegisteredApiSource(source)) {
    const collector = await collectApiDisplayObjects(target, deliverDisplayObjects);
    await target.addInitScript({ content: harnessScript({}) });
    PREPARED.set(target, { mode: 'api', collector, network });
    return;
  }
  await target.addInitScript({ content: harnessScript(source) });
  PREPARED.set(target, { mode: 'static', displayObjects: source, network });
}

/**
 * Starts a new observation from what the page shows now (after an owner action or an in-page
 * route change). A check prepared from the API keeps taking the display objects the page
 * receives, and refuses typed ones; a harness page may give new ones.
 */
export async function resetRenderCheck(page: Page, options?: Partial<PrepareOptions>): Promise<void> {
  const prepared = preparedFor(page);
  if (options?.displayObjects !== undefined) {
    if (prepared.mode === 'api') {
      throw new Error('This check takes its display objects from the API; resetRenderCheck does not accept typed ones.');
    }
    const source = checkedCheckDisplayObjects(options);
    if (isRegisteredApiSource(source)) throw new Error('A check prepared with typed display objects cannot switch to the API source; prepare a new page.');
    prepared.displayObjects = source;
  }
  const served = servedNow(prepared);
  for (const frame of page.frames()) {
    if (frame.isDetached()) continue;
    await frame.evaluate((known) => window.__sovitechRenderHarness?.reset(known), served);
  }
}

/*
 * Functions handed to frame.evaluate stay one-liners that call into the harness. The harness
 * itself is injected with a `__name` shim; a longer function here could be wrapped by the
 * build tool in helpers the page lacks, and would then fail in the page, not here.
 */

async function scrollEverything(page: Page): Promise<void> {
  for (const frame of page.frames()) {
    if (frame.isDetached()) continue;
    await frame.evaluate(() => window.__sovitechRenderHarness?.scrollThrough());
  }
}

async function frameActivity(frame: Frame): Promise<number> {
  if (frame.isDetached()) return 0;
  return frame.evaluate(() => window.__sovitechRenderHarness?.activity() ?? -1);
}

async function frameSettling(frame: Frame): Promise<PageSettling | null> {
  if (frame.isDetached()) return null;
  return frame.evaluate(() => window.__sovitechRenderHarness?.settling() ?? null);
}

interface Settled {
  ready: boolean;
  timedOut: boolean;
  why: string[];
}

/**
 * Waits until the page is settled: the readiness marker set (when required), no request in
 * flight, no page timer due before the budget ends, at least `minWindowMs` since the last of
 * `since`, the marker and the last response, and the value elements quiet for `quietMs`.
 * Returns when settled or when `budgetMs` has passed since `since`.
 */
async function settle(
  page: Page,
  network: NetworkTracker,
  windows: { minWindowMs: number; quietMs: number; budgetMs: number },
  readyRequired: boolean,
  since: number,
): Promise<Settled> {
  let lastActivity = Number.NaN;
  let lastChange = Date.now();
  let readySince: number | null = null;
  for (;;) {
    let activity = 0;
    let nextTimer: number | null = null;
    for (const frame of page.frames()) {
      activity += await frameActivity(frame);
      const settling = await frameSettling(frame);
      if (settling !== null && settling.nextTimerInMs !== null && (nextTimer === null || settling.nextTimerInMs < nextTimer)) {
        nextTimer = settling.nextTimerInMs;
      }
    }
    const main = await frameSettling(page.mainFrame());
    const ready = main?.ready ?? false;
    const now = Date.now();
    if (activity !== lastActivity) {
      lastActivity = activity;
      lastChange = now;
    }
    if (ready && readySince === null) readySince = now;
    const anchor = Math.max(since, readySince ?? since, network.lastSettledAt);
    const readyOk = !readyRequired || ready;
    const netIdle = network.inflight.size === 0;
    const timerDue = nextTimer !== null && now + nextTimer <= since + windows.budgetMs;
    if (readyOk && netIdle && !timerDue && now - anchor >= windows.minWindowMs && now - lastChange >= windows.quietMs) {
      return { ready, timedOut: false, why: [] };
    }
    if (now - since >= windows.budgetMs) {
      const why: string[] = [];
      if (!readyOk) why.push(`the readiness marker ${READY_ATTRIBUTE} was never set on <body>`);
      if (!netIdle) why.push(`${String(network.inflight.size)} request(s) still in flight`);
      if (timerDue) why.push(`a page timer was still due in ${String(nextTimer)} ms`);
      if (now - lastChange < windows.quietMs) why.push('the value elements were still changing');
      return { ready, timedOut: true, why };
    }
    await page.waitForTimeout(100);
  }
}

/** Pseudo-classes forced on every element before the last read. */
const FORCED_PSEUDO_CLASSES = ['hover', 'focus', 'focus-within', 'focus-visible'];

interface CdpNode {
  nodeId: number;
  nodeType: number;
  nodeName: string;
  children?: CdpNode[];
  shadowRoots?: CdpNode[];
  contentDocument?: CdpNode;
}

function elementNodeIds(node: CdpNode, into: number[]): void {
  if (node.nodeType === 1 && node.nodeName.toLowerCase() !== 'template') into.push(node.nodeId);
  for (const child of node.children ?? []) elementNodeIds(child, into);
  for (const root of node.shadowRoots ?? []) elementNodeIds(root, into);
  if (node.contentDocument !== undefined) elementNodeIds(node.contentDocument, into);
}

/**
 * Forces :hover, :focus, :focus-within and :focus-visible on every element (Chrome DevTools
 * Protocol, CSS.forcePseudoState), so CSS that shows something only then is read; and
 * dispatches entry events in every frame, so scripts that show something on hover or focus
 * do so while observed. The session stays open until the check has read the page.
 */
async function forceHoverAndFocus(page: Page): Promise<{ session: CDPSession; forced: number; targets: number; notes: string[] }> {
  const session = await page.context().newCDPSession(page);
  const notes: string[] = [];
  await session.send('DOM.enable');
  await session.send('CSS.enable');
  const { root } = (await session.send('DOM.getDocument', { depth: -1, pierce: true })) as { root: CdpNode };
  const ids: number[] = [];
  elementNodeIds(root, ids);
  let forced = 0;
  let gone = 0;
  for (let index = 0; index < ids.length; index += 200) {
    const batch = ids.slice(index, index + 200);
    const results = await Promise.allSettled(
      batch.map((nodeId) => session.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: FORCED_PSEUDO_CLASSES })),
    );
    for (const result of results) {
      if (result.status === 'fulfilled') forced += 1;
      else if (/no node/iu.test(String(result.reason))) gone += 1;
      else throw result.reason instanceof Error ? result.reason : new Error(String(result.reason));
    }
  }
  if (gone > 0) notes.push(`${String(gone)} element(s) left the page before their hover and focus states could be forced.`);
  let targets = 0;
  for (const frame of page.frames()) {
    if (frame.isDetached()) continue;
    targets += await frame.evaluate(() => window.__sovitechRenderHarness?.hoverAndFocus() ?? Promise.resolve(0));
  }
  return { session, forced, targets, notes };
}

function violation(kind: ViolationKind, frameUrl: string, where: string, text: string, detail: string): Violation {
  return { kind, caseId: VIOLATION_CASES[kind], frameUrl, where, text, detail };
}

function fromFinding(finding: PageFinding, frameUrl: string): Violation {
  return violation(finding.kind, frameUrl, finding.where, finding.text, finding.detail);
}

/** Runs the render check on the page as it is now. The harness must be prepared before navigation. */
export async function runRenderCheck(page: Page, options: RunOptions = {}): Promise<RenderReport> {
  const windows = {
    minWindowMs: options.minWindowMs ?? 1500,
    quietMs: options.quietMs ?? 500,
    maxWindowMs: options.maxWindowMs ?? 10_000,
  };
  const prepared = preparedFor(page);
  const started = Date.now();
  if (prepared.mode === 'static' && Object.keys(prepared.displayObjects).length > 0 && !isHarnessPageUrl(page.url())) {
    throw new Error(
      `Typed display objects are accepted only on the harness's own pages (tests/e2e/pages/); ${page.url()} takes its display objects from the API (displayObjectsFromApi() in tests/e2e/render/api-display-objects.ts).`,
    );
  }
  await page.waitForLoadState('load');
  const mainInstalled = await page.evaluate(() => window.__sovitechRenderHarness !== undefined);
  if (!mainInstalled) {
    throw new Error('The render harness is not installed: call prepareRenderCheck(page, { displayObjects }) before the first page.goto().');
  }
  const readyRequired = prepared.mode === 'api' || Object.keys(prepared.displayObjects).length > 0;
  const notes: string[] = [];

  // 1. Loaded, ready, network idle, timers fired, quiet.
  const first = await settle(page, prepared.network, { ...windows, budgetMs: windows.maxWindowMs }, readyRequired, started);
  if (first.timedOut) notes.push(`The page did not settle within ${String(windows.maxWindowMs)} ms: ${first.why.join('; ')}.`);
  // 2. Scroll everything, then wait for what scrolling set off.
  await scrollEverything(page);
  await settle(page, prepared.network, { minWindowMs: 0, quietMs: windows.quietMs, budgetMs: windows.maxWindowMs }, false, Date.now());
  // 3. Hover and focus everything, then wait for what they set off.
  const hover = await forceHoverAndFocus(page);
  try {
    notes.push(...hover.notes);
    await settle(page, prepared.network, { minWindowMs: windows.quietMs, quietMs: windows.quietMs, budgetMs: windows.maxWindowMs }, false, Date.now());
    return await readPage(page, prepared, { readyRequired, ready: first.ready, maxWindowMs: windows.maxWindowMs, started, notes, hover });
  } finally {
    await hover.session.detach();
  }
}

/** Reads every frame once the page has settled, and builds the report. */
async function readPage(
  page: Page,
  prepared: Prepared,
  state: {
    readyRequired: boolean;
    ready: boolean;
    maxWindowMs: number;
    started: number;
    notes: string[];
    hover: { forced: number; targets: number };
  },
): Promise<RenderReport> {
  const { readyRequired, notes, hover, started } = state;

  if (prepared.mode === 'api') {
    const problems = prepared.collector.problems();
    if (problems.length > 0) throw new Error(`The API served display objects the render check could not read:\n  ${problems.join('\n  ')}`);
  }
  const served = servedNow(prepared);
  const violations: Violation[] = [];
  const stats: RenderReport['stats'] = {
    frames: 0,
    numberTexts: 0,
    boundNumberTexts: 0,
    allowlistUse: {},
    timelineRecords: 0,
    observedMs: 0,
    unreadable: [],
    copyUnits: 0,
    forcedElements: hover.forced,
    hoverTargets: hover.targets,
    ready: state.ready,
    readyRequired,
    notes,
  };
  if (readyRequired && !state.ready) {
    violations.push(
      violation(
        'not-ready',
        page.url(),
        'body',
        '',
        `the screen was served display objects but never set ${READY_ATTRIBUTE} on <body> within ${String(state.maxWindowMs)} ms, so it was read before it said it had rendered its data`,
      ),
    );
  }

  for (const frame of page.frames()) {
    const frameUrl = frame.url();
    stats.frames += 1;
    const installed = await frame.evaluate(() => window.__sovitechRenderHarness !== undefined);
    if (!installed) {
      violations.push(
        violation('frame-not-observed', frameUrl, `frame "${frame.name()}"`, '', 'the render harness did not run in this frame, so it was not observed'),
      );
      continue;
    }
    const timeline = await frame.evaluate(() => {
      const harness = window.__sovitechRenderHarness;
      if (harness === undefined) throw new Error('harness missing');
      return harness.readTimeline();
    });
    const scan = await frame.evaluate(() => {
      const harness = window.__sovitechRenderHarness;
      if (harness === undefined) throw new Error('harness missing');
      return harness.scan();
    });
    if (!timeline.fromDocumentStart) {
      violations.push(
        violation('frame-not-observed', frameUrl, `frame "${frame.name()}"`, '', 'the render harness started after the document had loaded, so its start was not observed'),
      );
    }

    // G2-1: the snapshot.
    for (const finding of scan.findings) violations.push(fromFinding(finding, frameUrl));
    // G2-1: unbound numbers shown at some moment and gone by the end.
    for (const finding of timeline.transient) {
      violations.push(
        violation(
          'transient-digit',
          frameUrl,
          finding.where,
          finding.text,
          `${finding.kind} shown ${finding.t} ms into the observation and gone by its end: ${finding.detail}`,
        ),
      );
    }
    // G2-8: a value id that showed one number, then another.
    for (const change of findValueChanges(timeline.records)) {
      violations.push(
        violation(
          'value-changed-while-shown',
          frameUrl,
          change.where,
          summariseTexts(change.texts),
          `value id ${change.valueId} showed ${change.texts.length} different numbers in turn; only the formatted value may ever be shown`,
        ),
      );
    }
    // G2-8: animations on value elements that show a number.
    for (const animation of timeline.animations) {
      violations.push(
        violation(
          'value-animated',
          frameUrl,
          animation.where,
          animation.name,
          `value id ${animation.valueId} animated while showing a number, ${animation.t} ms into the observation; no value animates`,
        ),
      );
    }
    // 2.8: reserved terms in shown copy outside the places 2.8 allows.
    for (const finding of reservedTermFindings(scan.copyUnits, served)) {
      const unit = finding.unit;
      violations.push(
        violation(
          'reserved-term',
          frameUrl,
          unit.where,
          unit.source === 'text' ? unit.text : `${unit.name ?? unit.source}: ${unit.text}`,
          `reserved term ${finding.terms.map((term) => `"${term}"`).join(', ')}: ${finding.detail}`,
        ),
      );
    }

    stats.numberTexts += scan.numberTexts;
    stats.boundNumberTexts += scan.boundNumberTexts;
    stats.copyUnits += scan.copyUnits.length;
    for (const [entryId, count] of Object.entries(scan.allowlistUse)) {
      // A tally of allowlist uses, not an engineering value.
      const previous = stats.allowlistUse[entryId];
      stats.allowlistUse[entryId] = previous === undefined ? count : previous + count;
    }
    stats.timelineRecords += timeline.records.length;
    stats.unreadable.push(...scan.unreadable.map((where) => `${frameUrl} ${where}`));
  }
  stats.observedMs = Date.now() - started;
  if (stats.unreadable.length > 0) {
    notes.push('Reviewed elements on the unreadable list draw pixels the test does not read (ifc-input 6.2.15 covers text drawn into them).');
  }
  return { ok: violations.length === 0, url: page.url(), violations, stats };
}

/**
 * Opens the URL in a fresh 1440x900 context, runs the render check, and closes the context.
 * `options.displayObjects` is required; without it this rejects before opening anything.
 */
export async function checkUrl(browser: Browser, url: string, options: RenderCheckOptions): Promise<RenderReport> {
  checkedCheckDisplayObjects(options);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  try {
    await prepareRenderCheck(context, options);
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'load' });
    return await runRenderCheck(page, options);
  } finally {
    await context.close();
  }
}

/** The distinct violation kinds of a report, sorted: handy for strict assertions. */
export function violationKinds(report: RenderReport): ViolationKind[] {
  return [...new Set(report.violations.map((item) => item.kind))].sort();
}

/** A readable account of a report, for assertion messages. */
export function formatRenderReport(report: RenderReport): string {
  const lines = [
    `Render check of ${report.url}: ${report.ok ? 'passed' : `${report.violations.length} violation(s)`}`,
    `  number texts: ${report.stats.numberTexts} (in value elements, as served: ${report.stats.boundNumberTexts}); copy units: ${report.stats.copyUnits}; allowlist use: ${JSON.stringify(report.stats.allowlistUse)}; timeline records: ${report.stats.timelineRecords}; hover and focus: ${report.stats.forcedElements} forced, ${report.stats.hoverTargets} reached; ready: ${String(report.stats.ready)}${report.stats.readyRequired ? ' (required)' : ''}; observed ${report.stats.observedMs} ms`,
  ];
  for (const item of report.violations) {
    const frame = item.frameUrl === report.url ? '' : ` [frame ${item.frameUrl}]`;
    lines.push(`  ${item.caseId} ${item.kind}${frame} at ${item.where}: ${item.text === '' ? '' : `"${item.text}" `}(${item.detail})`);
  }
  for (const note of report.stats.notes) lines.push(`  note: ${note}`);
  return lines.join('\n');
}
