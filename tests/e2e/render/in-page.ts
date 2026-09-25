/**
 * The in-page half of the render test (docs/adr/0006-render-test.md).
 *
 * `installRenderHarness` is injected into every frame of the page under test before the
 * page's own scripts run (render-check.ts, `prepareRenderCheck`). Playwright serialises it
 * with Function#toString, so it must be self-contained: nothing from module scope is used
 * inside it except types, which disappear at compile time.
 *
 * It installs `window.__sovitechRenderHarness` with:
 * - `scan()`: the G2-1 snapshot. It walks the document, open and closed shadow roots, the
 *   document title, shown and announced attributes, form field values and CSS generated
 *   content, and reports every number (number characters, and number words in English and
 *   Romanian) that is neither inside a value element nor accepted by an allowlist entry;
 *   every number inside a value element that is not made of what its display object
 *   declares; every value element inside another; every value element whose id is malformed
 *   or was served no display object; and every element drawing pixels the test cannot read
 *   that is not on the reviewed `unreadable` list. It also hands back the shown copy (copy
 *   units) for the reserved-term scan, which runs on the Node side.
 * - `readTimeline()`: the G2-8 record. From document start it samples every value element
 *   on each DOM mutation and each animation frame (text when shown, null when hidden or
 *   removed), notes running animations on value elements that show a number, and keeps
 *   unbound numbers that were shown at some moment after DOMContentLoaded and are gone.
 * - `settling()`: the readiness marker and the page's pending timers, for the wait.
 * - `hoverAndFocus()`: pointer, mouse and focus entry events on everything a hover or focus
 *   could change, so what they show is read too.
 */
import type {
  AllowlistEntry,
  AnimationRecord,
  CopyUnit,
  DateTimeEntry,
  HarnessConfig,
  PageFinding,
  PageScanResult,
  PageSettling,
  RenderHarnessApi,
  ServedDisplay,
  StepNumberEntry,
  TimelineData,
  TimelineRecord,
  UnreadableEntry,
} from './contract';

export function installRenderHarness(config: HarnessConfig): void {
  if (window.__sovitechRenderHarness !== undefined) return;

  // ---------------------------------------------------------------- the page's timers
  // Captured before the page's scripts run: the harness's own waits use these, and the
  // page's setTimeout calls are tracked, so the check can wait for a timer that is still
  // due (a count-up started after a delay).
  const originalSetTimeout = window.setTimeout.bind(window);
  const originalClearTimeout = window.clearTimeout.bind(window);
  const originalSetInterval = window.setInterval.bind(window);
  const pendingTimers = new Map<number, number>();
  const trackedSetTimeout = function trackedSetTimeout(handler: TimerHandler, timeout?: number, ...rest: unknown[]): number {
    const delay = typeof timeout === 'number' && timeout > 0 ? timeout : 0;
    let id = 0;
    const run =
      typeof handler === 'function'
        ? function tracked(this: unknown, ...args: unknown[]): unknown {
            pendingTimers.delete(id);
            return (handler as (...values: unknown[]) => unknown).apply(this, args);
          }
        : handler;
    id = originalSetTimeout(run, timeout, ...rest);
    pendingTimers.set(id, performance.now() + delay);
    return id;
  };
  window.setTimeout = trackedSetTimeout as typeof window.setTimeout;
  window.clearTimeout = function trackedClearTimeout(id?: number): void {
    if (id !== undefined) pendingTimers.delete(id);
    originalClearTimeout(id);
  } as typeof window.clearTimeout;

  // ---------------------------------------------------------------- hover and focus listeners
  const HOVER_FOCUS_EVENTS = new Set([
    'mouseenter', 'mouseover', 'mousemove', 'pointerenter', 'pointerover', 'pointermove', 'focus', 'focusin',
  ]);
  const hoverListenerTargets = new WeakSet<EventTarget>();
  let hoverListenerOnRoot = false;
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function trackedAddEventListener(
    this: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void {
    if (HOVER_FOCUS_EVENTS.has(type)) {
      hoverListenerTargets.add(this);
      if (this === window || this === document) hoverListenerOnRoot = true;
    }
    originalAddEventListener.call(this, type, listener, options);
  };

  // ---------------------------------------------------------------- settings
  const NUMBER_CHAR = /\p{N}/u;
  const VALUE_ATTR = config.valueIdAttribute;
  const VALUE_SELECTOR = `[${VALUE_ATTR}]`;
  const COPY_ATTR = config.copyKindAttribute;
  const valueIdPattern = new RegExp(config.valueIdPattern.source, config.valueIdPattern.flags);
  // Always given (render-check.ts refuses to build a config without it): every value id on
  // the page must be one the screen was served a display object for.
  let displayObjects = new Map<string, ServedDisplay>(Object.entries(config.displayObjects));
  const declaredCache = new Map<string, string[]>();
  const entriesById = new Map<string, AllowlistEntry>(config.allowlist.map((entry) => [entry.id, entry]));
  const unreadableById = new Map<string, UnreadableEntry>(config.unreadable.map((entry) => [entry.id, entry]));
  const dateEntries = config.allowlist.filter((entry): entry is DateTimeEntry => entry.category === 'date_time');
  const fixedTexts = new Map<string, string>();
  for (const entry of config.allowlist) {
    if (entry.category === 'fixed_interface_copy') fixedTexts.set(entry.text, entry.id);
  }
  const longestFixedText = Math.max(0, ...[...fixedTexts.keys()].map((text) => text.length));
  const SKIPPED_ELEMENTS = new Set(['script', 'style', 'template']);
  const UNREADABLE_ELEMENTS = new Set(['canvas', 'img', 'video', 'embed', 'object']);
  const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
  const SVG_SHAPES = 'path, use, polygon, polyline, line, rect, circle, ellipse';
  const SVG_TEXT = 'text, textPath, tspan, foreignObject';
  const CSS_URL = /\burl\(/u;
  const RANGE_ELEMENTS = new Set(['progress', 'meter']);
  const INPUT_TYPES_WITH_SHOWN_VALUE = new Set([
    'text', 'search', 'tel', 'url', 'email', 'number', 'range', 'date', 'time', 'datetime-local', 'month', 'week',
    'button', 'submit', 'reset',
  ]);
  const BUTTON_INPUT_TYPES = new Set(['button', 'submit', 'reset']);
  const NON_NUMERIC_LIST_STYLES = new Set([
    'none', 'disc', 'circle', 'square', 'disclosure-open', 'disclosure-closed',
    'lower-alpha', 'upper-alpha', 'lower-latin', 'upper-latin', 'lower-greek', 'lower-roman', 'upper-roman',
  ]);
  const INTERACTIVE_SELECTOR = [
    'a[href]', 'area[href]', 'button', 'input', 'select', 'textarea', 'summary', 'label', 'details',
    '[tabindex]', '[contenteditable]:not([contenteditable="false"])', '[title]', '[aria-describedby]', '[aria-details]',
    '[aria-description]', '[aria-haspopup]', '[aria-expanded]',
    '[role="button"]', '[role="link"]', '[role="tab"]', '[role="menuitem"]', '[role="option"]', '[role="switch"]',
    '[role="checkbox"]', '[role="radio"]', '[role="treeitem"]', '[role="gridcell"]', '[role="row"]', '[role="slider"]',
    '[onmouseenter]', '[onmouseover]', '[onmousemove]', '[onpointerenter]', '[onpointerover]', '[onfocus]', '[onfocusin]',
  ].join(', ');
  const MAX_HOVER_TARGETS = 3000;
  const TIMELINE_ATTRIBUTES = ['aria-label', 'aria-valuetext', 'aria-valuenow', 'title'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DATE_TOKENS = ['YYYY', 'MMM', 'MM', 'DD', 'D', 'HH', 'mm'];
  const COUNTER = '\u0000counter';
  const ELEMENT_NODE = 1;
  const TEXT_NODE = 3;
  const DOCUMENT_NODE = 9;
  const FRAGMENT_NODE = 11;
  const fromDocumentStart = document.readyState === 'loading';

  const WORD_EDGE_BEFORE = '(?<![\\p{L}\\p{N}_])';
  const WORD_EDGE_AFTER = '(?![\\p{L}\\p{N}_])';
  const numberWordPatterns = {
    en: new RegExp(`${WORD_EDGE_BEFORE}(?:${config.numberWords.en.join('|')})${WORD_EDGE_AFTER}`, 'u'),
    ro: new RegExp(`${WORD_EDGE_BEFORE}(?:${config.numberWords.ro.join('|')})${WORD_EDGE_AFTER}`, 'u'),
  };

  // ---------------------------------------------------------------- shadow roots
  const closedRoots = new WeakMap<Element, ShadowRoot>();
  const knownRoots = new Set<ShadowRoot>();
  const OBSERVE_OPTIONS: MutationObserverInit = { subtree: true, childList: true, characterData: true, attributes: true };
  // The callback runs only after this function has returned, so everything it uses exists by then.
  const observer = new MutationObserver((mutations) => guarded(() => onMutations(mutations)));

  function registerRoot(root: ShadowRoot): void {
    if (knownRoots.has(root)) return;
    knownRoots.add(root);
    observer.observe(root, OBSERVE_OPTIONS);
  }

  const originalAttachShadow = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function attachShadowObserved(this: Element, init: ShadowRootInit): ShadowRoot {
    const root = originalAttachShadow.call(this, init);
    closedRoots.set(this, root);
    registerRoot(root);
    return root;
  };

  function shadowOf(element: Element): ShadowRoot | null {
    return element.shadowRoot ?? closedRoots.get(element) ?? null;
  }

  // ---------------------------------------------------------------- tree helpers
  function normalise(text: string): string {
    return text.replace(/\s+/gu, ' ').trim();
  }

  function clip(text: string): string {
    const tidy = normalise(text);
    return tidy.length > 160 ? `${tidy.slice(0, 157)}...` : tidy;
  }

  /** The parent in the composed (rendered) tree: the assigned slot, the parent, or the shadow host. */
  function composedParent(node: Node): Node | null {
    const slot = (node as Partial<Slottable>).assignedSlot;
    if (slot !== undefined && slot !== null) return slot;
    const parent = node.parentNode;
    if (parent === null) return null;
    if (parent.nodeType === FRAGMENT_NODE && 'host' in parent) return (parent as ShadowRoot).host;
    return parent;
  }

  function composedParentElement(node: Node): Element | null {
    let current = composedParent(node);
    while (current !== null && current.nodeType !== ELEMENT_NODE) current = composedParent(current);
    return current as Element | null;
  }

  function closestComposed(node: Node, test: (element: Element) => boolean): Element | null {
    let current: Element | null = node.nodeType === ELEMENT_NODE ? (node as Element) : composedParentElement(node);
    while (current !== null) {
      if (test(current)) return current;
      current = composedParentElement(current);
    }
    return null;
  }

  /** True when the node sits in an element whose text is never shown (script, style, template). */
  function insideSkipped(node: Node): boolean {
    let current: Node | null = node.nodeType === ELEMENT_NODE ? node : node.parentNode;
    while (current !== null && current.nodeType === ELEMENT_NODE) {
      if (SKIPPED_ELEMENTS.has((current as Element).localName)) return true;
      current = current.parentNode;
    }
    return false;
  }

  function label(element: Element): string {
    let text = element.localName;
    if (element.id !== '') text += `#${element.id}`;
    else {
      const classes = (element.getAttribute('class') ?? '').trim();
      if (classes !== '') text += `.${classes.split(/\s+/u).slice(0, 2).join('.')}`;
    }
    const valueId = element.getAttribute(VALUE_ATTR);
    if (valueId !== null) text += `[${VALUE_ATTR}="${valueId}"]`;
    return text;
  }

  /** A short path to the node, with >>> where it crosses into a shadow root. */
  function describe(node: Node): string {
    const labels: string[] = [];
    let current: Element | null = node.nodeType === ELEMENT_NODE ? (node as Element) : composedParentElement(node);
    while (current !== null && labels.length < 5) {
      const crossed = current.parentNode !== null && current.parentNode.nodeType === FRAGMENT_NODE;
      labels.unshift(crossed ? `>>> ${label(current)}` : label(current));
      current = composedParentElement(current);
    }
    if (node.nodeType === TEXT_NODE) labels.push('#text');
    return labels.join(' > ').replace(/ > >>> /gu, ' >>> ');
  }

  /** The text as rendered: shadow content instead of light children, slots filled; `skip` left out. */
  function flatText(node: Node, skip: Element | null = null): string {
    if (node.nodeType === TEXT_NODE) return (node as Text).data;
    if (node.nodeType !== ELEMENT_NODE && node.nodeType !== FRAGMENT_NODE) return '';
    let children: ArrayLike<Node> = node.childNodes;
    if (node.nodeType === ELEMENT_NODE) {
      const element = node as Element;
      if (element === skip) return ' ';
      if (SKIPPED_ELEMENTS.has(element.localName)) return '';
      if (element.localName === 'slot') children = (element as HTMLSlotElement).assignedNodes({ flatten: true });
      const shadow = shadowOf(element);
      if (shadow !== null) children = shadow.childNodes;
    }
    let text = '';
    for (let index = 0; index < children.length; index += 1) {
      const child = children[index];
      if (child !== undefined) text += flatText(child, skip);
    }
    return text;
  }

  // ---------------------------------------------------------------- numbers
  /** Whether the nearest `lang` around the node is Romanian. */
  function isRomanian(node: Node): boolean {
    const element = closestComposed(node, (candidate) => candidate.hasAttribute('lang'));
    const lang = element?.getAttribute('lang') ?? document.documentElement.lang;
    return /^ro\b/iu.test(lang);
  }

  function fold(text: string): string {
    return text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
  }

  /** The number words of the node's language in the text, or null. */
  function numberWordIn(text: string, node: Node): string | null {
    const found = numberWordPatterns[isRomanian(node) ? 'ro' : 'en'].exec(fold(text));
    return found === null ? null : found[0];
  }

  /** True when the text holds a number: a number character, or a number word of the node's language. */
  function hasNumber(text: string, node: Node): boolean {
    return NUMBER_CHAR.test(text) || numberWordIn(text, node) !== null;
  }

  // ---------------------------------------------------------------- text runs
  /** The first text node of the run of adjacent text nodes the node belongs to. */
  function runStart(node: Text): Text {
    let current: Text = node;
    while (current.previousSibling !== null && current.previousSibling.nodeType === TEXT_NODE) {
      current = current.previousSibling as Text;
    }
    return current;
  }

  /** The text of a run of adjacent text nodes, from its first node: what a framework split, read as one. */
  function runText(start: Text): string {
    let text = start.data;
    for (let next = start.nextSibling; next !== null && next.nodeType === TEXT_NODE; next = next.nextSibling) {
      text += (next as Text).data;
    }
    return text;
  }

  // ---------------------------------------------------------------- dates
  interface Moment {
    year?: number;
    month?: number;
    day?: number;
    hour?: number;
    minute?: number;
  }

  function toInt(text: string | undefined): number {
    return text === undefined ? Number.NaN : parseInt(text, 10);
  }

  function parseDatetime(value: string): Moment | null {
    const trimmed = value.trim();
    const full =
      /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/u.exec(trimmed);
    if (full !== null) {
      const moment: Moment = { year: toInt(full[1]), month: toInt(full[2]), day: toInt(full[3]) };
      if (full[4] !== undefined) {
        moment.hour = toInt(full[4]);
        moment.minute = toInt(full[5]);
      }
      return validMoment(moment) ? moment : null;
    }
    const time = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?$/u.exec(trimmed);
    if (time !== null) {
      const moment: Moment = { hour: toInt(time[1]), minute: toInt(time[2]) };
      return validMoment(moment) ? moment : null;
    }
    return null;
  }

  function validMoment(moment: Moment): boolean {
    if (moment.month !== undefined && (moment.month < 1 || moment.month > 12)) return false;
    if (moment.day !== undefined && moment.year !== undefined && moment.month !== undefined) {
      const daysInMonth = new Date(Date.UTC(moment.year, moment.month, 0)).getUTCDate();
      if (moment.day < 1 || moment.day > daysInMonth) return false;
    }
    if (moment.hour !== undefined && (moment.hour < 0 || moment.hour > 23)) return false;
    if (moment.minute !== undefined && (moment.minute < 0 || moment.minute > 59)) return false;
    return true;
  }

  function pad(value: number, width: number): string {
    return String(value).padStart(width, '0');
  }

  /** The moment written in a format, or null when the format needs a part the moment lacks. */
  function formatMoment(moment: Moment, format: string): string | null {
    let output = '';
    let position = 0;
    while (position < format.length) {
      const token = DATE_TOKENS.find((candidate) => format.startsWith(candidate, position));
      if (token === undefined) {
        output += format.charAt(position);
        position += 1;
        continue;
      }
      position += token.length;
      const { year, month, day, hour, minute } = moment;
      if (token === 'YYYY' && year !== undefined) output += pad(year, 4);
      else if (token === 'MMM' && month !== undefined) output += MONTHS[month - 1] ?? '?';
      else if (token === 'MM' && month !== undefined) output += pad(month, 2);
      else if (token === 'DD' && day !== undefined) output += pad(day, 2);
      else if (token === 'D' && day !== undefined) output += String(day);
      else if (token === 'HH' && hour !== undefined) output += pad(hour, 2);
      else if (token === 'mm' && minute !== undefined) output += pad(minute, 2);
      else return null;
    }
    return output;
  }

  // ---------------------------------------------------------------- the scan (G2-1)
  interface Found extends PageFinding {
    node: Node;
  }

  interface Sink {
    found: Found[];
    numberTexts: number;
    boundNumberTexts: number;
    allowlistUse: Record<string, number>;
    unreadable: string[];
  }

  function newSink(): Sink {
    return { found: [], numberTexts: 0, boundNumberTexts: 0, allowlistUse: {}, unreadable: [] };
  }

  function use(sink: Sink, entryId: string): void {
    // A tally of allowlist uses, not an engineering value; an absent entry starts at one use.
    const previous = sink.allowlistUse[entryId];
    sink.allowlistUse[entryId] = previous === undefined ? 1 : previous + 1;
  }

  function report(sink: Sink, kind: PageFinding['kind'], node: Node, text: string, detail: string): void {
    sink.found.push({ kind, where: describe(node), text: clip(text), detail, node });
  }

  function valueIdState(valueId: string): 'bound' | 'malformed' | 'unknown' {
    if (!valueIdPattern.test(valueId)) return 'malformed';
    if (!displayObjects.has(valueId)) return 'unknown';
    return 'bound';
  }

  /** Every string a value element may show numbers from: its text, lines, parts and excerpts, longest first. */
  function declaredStrings(valueId: string): string[] {
    const cached = declaredCache.get(valueId);
    if (cached !== undefined) return cached;
    const display = displayObjects.get(valueId);
    const strings =
      display === undefined
        ? []
        : [display.text, ...(display.lines ?? []), ...(display.parts ?? []), ...(display.evidence ?? []).map((item) => item.excerpt)]
            .map(normalise)
            .filter((text) => text !== '')
            .sort((left, right) => right.length - left.length);
    declaredCache.set(valueId, strings);
    return strings;
  }

  /**
   * null when every number in `text` belongs to a string the value's display object declares;
   * otherwise why not. The declared strings are cut out of the text, longest first, and no
   * number may remain.
   */
  function displayProblem(valueId: string, text: string, node: Node): string | null {
    let residue = normalise(text);
    for (const declared of declaredStrings(valueId)) residue = residue.split(declared).join('\u0000');
    if (!hasNumber(residue, node)) return null;
    const display = displayObjects.get(valueId);
    const left = normalise(residue.split('\u0000').join(' … '));
    return `the display object of ${valueId} declares "${display?.text ?? ''}"${
      display?.lines !== undefined && display.lines.length > 0 ? ` with lines ${display.lines.map((line) => `"${line}"`).join(', ')}` : ''
    }${display?.parts !== undefined && display.parts.length > 0 ? ` and parts ${display.parts.map((part) => `"${part}"`).join(', ')}` : ''}; this text also shows "${clip(left)}", which it does not serve`;
  }

  /**
   * Every element carrying a value id: a malformed id, one the screen was served no display
   * object for, or one inside another value element fails once, on the element, whether or
   * not it shows a number.
   */
  function checkValueElement(sink: Sink, element: Element): void {
    const valueId = element.getAttribute(VALUE_ATTR);
    if (valueId === null) return;
    const state = valueIdState(valueId);
    // The finding's text is the attribute alone, so a value that changes while its id stays
    // bad is one finding, not a new one each time; what it shows goes into the detail.
    const attribute = `${VALUE_ATTR}="${valueId}"`;
    const showing = `it shows "${clip(flatText(element))}"`;
    if (state === 'malformed') {
      report(sink, 'malformed-value-id', element, attribute, `"${valueId}" is not a value id, so it ties nothing; ${showing}`);
    } else if (state === 'unknown') {
      report(
        sink,
        'unknown-value-id',
        element,
        attribute,
        `"${valueId}" is not among the value ids this screen was served display objects for; ${showing}`,
      );
    }
    const parent = composedParentElement(element);
    const outer = parent === null ? null : closestComposed(parent, (candidate) => candidate.hasAttribute(VALUE_ATTR));
    if (outer !== null) {
      report(
        sink,
        'nested-value-element',
        element,
        attribute,
        `a value element sits inside the value element ${VALUE_ATTR}="${outer.getAttribute(VALUE_ATTR) ?? ''}"; a value element holds its own value only`,
      );
    }
  }

  /**
   * Whether a value element settles the number: bound to a served id and made of what its
   * display object declares (counted as bound), not made of it (reported here), or tied to a
   * bad id that checkValueElement reports on the element itself.
   */
  function settledByValueId(sink: Sink, node: Node, text: string): boolean {
    const element = closestComposed(node, (candidate) => candidate.hasAttribute(VALUE_ATTR));
    if (element === null) return false;
    const valueId = element.getAttribute(VALUE_ATTR) ?? '';
    if (valueIdState(valueId) !== 'bound') return true;
    const problem = displayProblem(valueId, text, node);
    if (problem === null) sink.boundNumberTexts += 1;
    else report(sink, 'display-mismatch', node, text, problem);
    return true;
  }

  /** null when the marked element fits its entry; otherwise why not. */
  function markerProblem(sink: Sink, marker: Element): string | null {
    const entryId = marker.getAttribute(config.allowAttribute) ?? '';
    const entry = entriesById.get(entryId);
    if (entry === undefined) return `${config.allowAttribute}="${entryId}" names no allowlist entry`;
    const shown = normalise(flatText(marker));
    if (entry.category === 'step_number') {
      const problem = stepProblem(marker, entry, shown);
      if (problem === null) use(sink, entry.id);
      return problem;
    }
    if (entry.category === 'character_counter') {
      const fieldId = marker.getAttribute(config.counterForAttribute);
      if (fieldId === null || fieldId === '') return `a character counter needs ${config.counterForAttribute} naming its text field`;
      const root = marker.getRootNode() as Document | ShadowRoot;
      const field = root.getElementById(fieldId);
      if (!(field instanceof HTMLInputElement) && !(field instanceof HTMLTextAreaElement)) {
        return `${config.counterForAttribute}="${fieldId}" names no text field`;
      }
      if (field.maxLength <= 0) return `the field "${fieldId}" has no maxlength to count against`;
      const expected = entry.format.replace('{count}', String(field.value.length)).replace('{max}', String(field.maxLength));
      if (shown === expected) {
        use(sink, entry.id);
        return null;
      }
      return `"${shown}" is not the field's own count, "${expected}"`;
    }
    return `entry "${entry.id}" (${entry.category}) is not used through ${config.allowAttribute}; only step numbers and character counters are`;
  }

  /** Every element registering the stepper container of a step-number entry, shadow roots included. */
  function stepperContainers(entryId: string): Element[] {
    const selector = `[${config.stepperAttribute}]`;
    const found: Element[] = [...document.querySelectorAll(selector)];
    for (const root of knownRoots) found.push(...root.querySelectorAll(selector));
    return found.filter((element) => element.getAttribute(config.stepperAttribute) === entryId);
  }

  /**
   * null when a step-number marker sits in the one stepper container its entry registers,
   * an <ol> of exactly `steps` <li> items, as the only marker of its item, shows its item's
   * position, and the item shows nothing else but the registered title of that step;
   * otherwise why not.
   */
  function stepProblem(marker: Element, stepEntry: StepNumberEntry, shown: string): string | null {
    if (!new RegExp(stepEntry.pattern, 'u').test(shown)) {
      return `"${shown}" does not fit step-number entry "${stepEntry.id}" (${stepEntry.pattern})`;
    }
    const registered = `${config.stepperAttribute}="${stepEntry.id}"`;
    const container = closestComposed(marker, (element) => element.getAttribute(config.stepperAttribute) === stepEntry.id);
    if (container === null) {
      return `a step number is accepted only inside the stepper container ${registered}, and this marker sits outside it`;
    }
    const containers = stepperContainers(stepEntry.id);
    if (containers.length !== 1) {
      return `the page registers ${String(containers.length)} stepper containers ${registered}; step numbers are accepted in one only`;
    }
    if (container.localName !== 'ol') {
      return `the stepper container ${registered} is a <${container.localName}>; it must be an ordered list (<ol>)`;
    }
    const items = [...container.children];
    if (items.length !== stepEntry.steps || items.some((item) => item.localName !== 'li')) {
      const kinds = items.map((item) => item.localName).join(', ');
      return `the stepper container ${registered} must hold exactly ${String(stepEntry.steps)} <li> items and nothing else; it holds: ${kinds === '' ? 'nothing' : kinds}`;
    }
    const item = closestComposed(marker, (element) => element.parentElement === container && element.localName === 'li');
    if (item === null) return `the marker is not inside an item of the stepper container ${registered}`;
    const position = items.indexOf(item) + 1;
    const markers = [...item.querySelectorAll(`[${config.allowAttribute}]`)].filter(
      (element) => element.getAttribute(config.allowAttribute) === stepEntry.id,
    );
    if (markers.length !== 1) {
      return `item ${String(position)} of the stepper holds ${String(markers.length)} step-number markers; a step shows its number once`;
    }
    if (shown !== String(position)) {
      return `"${shown}" sits in item ${String(position)} of the stepper; a step number equals its item's position`;
    }
    const title = stepEntry.titles[position - 1] ?? '';
    const rest = normalise(flatText(item, marker));
    if (rest !== title) {
      return `item ${String(position)} of the stepper reads "${clip(rest)}" beside its number; a stepper item shows its number and the registered title of its step, "${title}", and nothing else`;
    }
    return null;
  }

  /** null when the <time> element fits a date_time entry; otherwise why not. */
  function timeProblem(sink: Sink, time: Element): string | null {
    const datetime = time.getAttribute('datetime');
    if (datetime === null) return '<time> without a datetime attribute';
    const moment = parseDatetime(datetime);
    if (moment === null) return `datetime="${datetime}" is not a valid date or time`;
    const shown = normalise(time.textContent ?? '');
    for (const dateEntry of dateEntries) {
      if (formatMoment(moment, dateEntry.format) === shown) {
        use(sink, dateEntry.id);
        return null;
      }
    }
    const formats = dateEntries.map((dateEntry) => dateEntry.format).join(', ');
    return `"${shown}" is not its own datetime "${datetime}" in an allowlisted format (${formats === '' ? 'none listed' : formats})`;
  }

  /** Fixed copy: the text itself, or an enclosing element's whole text, reads as one entry. */
  function fixedCopyAccepts(sink: Sink, node: Node, text: string): boolean {
    const direct = fixedTexts.get(text);
    if (direct !== undefined) {
      use(sink, direct);
      return true;
    }
    let element = node.nodeType === ELEMENT_NODE ? (node as Element) : composedParentElement(node);
    while (element !== null) {
      const whole = normalise(element.textContent ?? '');
      if (whole.length > longestFixedText) return false;
      const entryId = fixedTexts.get(whole);
      if (entryId !== undefined) {
        use(sink, entryId);
        return true;
      }
      element = composedParentElement(element);
    }
    return false;
  }

  function numberDetail(text: string, node: Node, where: string): string {
    const word = NUMBER_CHAR.test(text) ? null : numberWordIn(text, node);
    return word === null ? `a number ${where}` : `a number written as a word ("${word}") ${where}`;
  }

  /** Checks the run of adjacent text nodes that starts at `start`. */
  function checkText(sink: Sink, start: Text): void {
    if (insideSkipped(start)) return;
    const parent = start.parentNode;
    if (parent !== null && parent.nodeType === ELEMENT_NODE && (parent as Element).localName === 'textarea') return;
    const text = normalise(runText(start));
    if (!hasNumber(text, start)) return;
    sink.numberTexts += 1;
    if (settledByValueId(sink, start, text)) return;
    const marker = closestComposed(start, (element) => element.hasAttribute(config.allowAttribute));
    if (marker !== null) {
      const problem = markerProblem(sink, marker);
      if (problem !== null) report(sink, 'allowlist-misuse', start, text, problem);
      return;
    }
    const time = closestComposed(start, (element) => element.localName === 'time');
    if (time !== null) {
      const problem = timeProblem(sink, time);
      if (problem !== null) report(sink, 'allowlist-misuse', start, text, problem);
      return;
    }
    if (fixedCopyAccepts(sink, start, text)) return;
    report(sink, 'bare-digit', start, text, numberDetail(text, start, 'outside any value element, on no allowlist entry'));
  }

  function checkShownValue(
    sink: Sink,
    element: Element,
    name: string,
    value: string,
    kind: 'bare-digit-attribute' | 'bare-digit-input',
  ): void {
    const text = normalise(value);
    if (!hasNumber(text, element)) return;
    sink.numberTexts += 1;
    if (settledByValueId(sink, element, text)) return;
    const entryId = fixedTexts.get(text);
    if (entryId !== undefined) {
      use(sink, entryId);
      return;
    }
    report(sink, kind, element, `${name}="${text}"`, `${name} holds ${numberDetail(text, element, 'outside any value element, on no allowlist entry')}`);
  }

  /** What CSS generated content shows: its strings and attr() values, or COUNTER for counter(). */
  function generatedText(element: Element, content: string): string | null {
    if (content === '' || content === 'none' || content === 'normal') return null;
    if (/\bcounters?\(/u.test(content)) return COUNTER;
    // An image in generated content is pixels, not text: checkUnreadable reports it, and its
    // URL string is not shown text.
    const withoutImages = content.replace(/\burl\(\s*(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^)]*)\s*\)/gu, '');
    let shown = '';
    for (const match of withoutImages.matchAll(/"((?:[^"\\]|\\.)*)"|attr\(\s*([^\s),]+)[^)]*\)/gu)) {
      if (match[1] !== undefined) shown += match[1].replace(/\\(.)/gu, '$1');
      else if (match[2] !== undefined) shown += element.getAttribute(match[2]) ?? '';
    }
    return shown;
  }

  /** Descriptions of the generated content on this element that shows numbers. */
  function generatedNumbers(element: Element): string[] {
    const found: string[] = [];
    for (const pseudo of ['::before', '::after']) {
      const content = getComputedStyle(element, pseudo).content;
      const shown = generatedText(element, content);
      if (shown !== null && (shown === COUNTER || hasNumber(shown, element))) found.push(`${pseudo} content: ${content}`);
    }
    const style = getComputedStyle(element);
    if (style.display.split(' ').includes('list-item') && style.listStyleImage === 'none') {
      const markerContent = getComputedStyle(element, '::marker').content;
      const markerText = generatedText(element, markerContent);
      if (markerText !== null) {
        if (markerText === COUNTER || hasNumber(markerText, element)) found.push(`::marker content: ${markerContent}`);
      } else {
        const type = style.listStyleType;
        if (type.startsWith('"') ? hasNumber(type, element) : !NON_NUMERIC_LIST_STYLES.has(type)) {
          found.push(`list marker (list-style-type: ${type})`);
        }
      }
    }
    return found;
  }

  /** A length attribute in CSS pixels ("200" or "200px"), or 0. */
  function attributePx(element: Element, name: string): number {
    const value = element.getAttribute(name);
    if (value === null || !/^\s*\d+(?:\.\d+)?(?:px)?\s*$/u.test(value)) return 0;
    return parseFloat(value);
  }

  /** An outermost inline <svg> larger than an icon that draws shapes and holds no text. */
  function isSvgGraphic(element: Element): boolean {
    if (element.namespaceURI !== SVG_NAMESPACE || element.localName !== 'svg') return false;
    const parent = composedParentElement(element);
    if (parent !== null && parent.namespaceURI === SVG_NAMESPACE) return false;
    const box = element.getBoundingClientRect();
    const width = Math.max(box.width, attributePx(element, 'width'));
    const height = Math.max(box.height, attributePx(element, 'height'));
    if (width <= config.iconMaxPx && height <= config.iconMaxPx) return false;
    if (element.querySelector(SVG_SHAPES) === null) return false;
    const texts = [...element.querySelectorAll(SVG_TEXT)];
    return !texts.some((text) => normalise(text.textContent ?? '') !== '');
  }

  /** The kind of pixels the element draws that the test cannot read, or null. */
  function unreadableKind(element: Element): UnreadableEntry['element'] | null {
    const name = element.localName;
    if (element.namespaceURI === SVG_NAMESPACE && name === 'image') return 'svg-image';
    if (isSvgGraphic(element)) return 'svg-graphic';
    if (element.namespaceURI !== SVG_NAMESPACE && UNREADABLE_ELEMENTS.has(name)) return name as UnreadableEntry['element'];
    if (element instanceof HTMLInputElement && element.type === 'image') return 'input-image';
    const style = getComputedStyle(element);
    const images = [style.backgroundImage, style.borderImageSource, style.maskImage, style.content];
    if (style.display.split(' ').includes('list-item')) images.push(style.listStyleImage);
    for (const pseudo of ['::before', '::after']) {
      const generated = getComputedStyle(element, pseudo);
      images.push(generated.content, generated.backgroundImage, generated.borderImageSource, generated.maskImage);
    }
    return images.some((value) => typeof value === 'string' && CSS_URL.test(value)) ? 'css-image' : null;
  }

  /** The path of the file an element loads, or null when it names none. */
  function loadedPath(element: Element): string | null {
    let raw: string | null = null;
    if (element instanceof HTMLImageElement) raw = element.currentSrc !== '' ? element.currentSrc : element.getAttribute('src');
    else if (element instanceof HTMLVideoElement) raw = element.currentSrc !== '' ? element.currentSrc : element.getAttribute('src');
    else if (element instanceof HTMLObjectElement) raw = element.getAttribute('data');
    else if (element instanceof HTMLEmbedElement || element instanceof HTMLInputElement) raw = element.getAttribute('src');
    else if (element.namespaceURI === SVG_NAMESPACE) raw = element.getAttribute('href') ?? element.getAttribute('xlink:href');
    if (raw === null || raw === '') return null;
    try {
      const url = new URL(raw, document.baseURI);
      return url.protocol === 'data:' ? null : url.pathname;
    } catch {
      return null;
    }
  }

  /** null when the element is the file its reviewed entry names (or the entry names none); otherwise why not. */
  function unreadableSrcProblem(element: Element, unreadableEntry: UnreadableEntry): string | null {
    if (unreadableEntry.src === undefined) return null;
    const path = loadedPath(element);
    if (path !== null && new RegExp(unreadableEntry.src, 'u').test(path)) return null;
    return `entry "${unreadableEntry.id}" covers only files whose path matches ${unreadableEntry.src}, and this element loads ${path === null ? 'no such file' : `"${path}"`}`;
  }

  /** Pixels the test cannot read pass only through a reviewed entry of the `unreadable` list. */
  function checkUnreadable(sink: Sink, element: Element): void {
    const kind = unreadableKind(element);
    if (kind === null) return;
    const marked = element.getAttribute(config.unreadableAttribute);
    const reviewed = marked === null ? undefined : unreadableById.get(marked);
    const srcProblem = reviewed !== undefined && reviewed.element === kind ? unreadableSrcProblem(element, reviewed) : null;
    if (reviewed !== undefined && reviewed.element === kind && srcProblem === null) {
      use(sink, reviewed.id);
      sink.unreadable.push(`${describe(element)} (${reviewed.id})`);
      return;
    }
    const why =
      marked === null
        ? `it carries no ${config.unreadableAttribute}`
        : reviewed === undefined
          ? `${config.unreadableAttribute}="${marked}" names no entry of the reviewed unreadable list`
          : reviewed.element !== kind
            ? `entry "${reviewed.id}" is for ${reviewed.element}, not ${kind}`
            : (srcProblem ?? '');
    report(
      sink,
      'unreadable-pixels',
      element,
      `<${element.localName}> (${kind})`,
      `the render test cannot read the pixels this element draws, and ${why} in tests/e2e/render/allowlist.ts`,
    );
  }

  function checkElement(sink: Sink, element: Element): void {
    checkValueElement(sink, element);
    checkUnreadable(sink, element);
    for (const name of config.scannedAttributes) {
      const value = element.getAttribute(name);
      if (value !== null) checkShownValue(sink, element, name, value, 'bare-digit-attribute');
    }
    if (RANGE_ELEMENTS.has(element.localName)) {
      for (const name of config.rangeElementAttributes) {
        const value = element.getAttribute(name);
        if (value !== null) checkShownValue(sink, element, name, value, 'bare-digit-attribute');
      }
    }
    if (element instanceof HTMLInputElement && INPUT_TYPES_WITH_SHOWN_VALUE.has(element.type)) {
      checkShownValue(sink, element, 'value', element.value, 'bare-digit-input');
    }
    if (element instanceof HTMLTextAreaElement) checkShownValue(sink, element, 'value', element.value, 'bare-digit-input');
    for (const described of generatedNumbers(element)) {
      report(sink, 'generated-digits', element, described, 'CSS generated content shows a number that no DOM text holds');
    }
  }

  /** Scans a node and everything under it, shadow roots included. */
  function scanNode(sink: Sink, root: Node): void {
    if (root.nodeType === TEXT_NODE) {
      checkText(sink, runStart(root as Text));
      return;
    }
    if (root.nodeType === ELEMENT_NODE) {
      if (insideSkipped(root)) return;
      visit(sink, root as Element);
    }
    if (root.nodeType !== ELEMENT_NODE && root.nodeType !== FRAGMENT_NODE && root.nodeType !== DOCUMENT_NODE) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.nodeType === ELEMENT_NODE && SKIPPED_ELEMENTS.has((node as Element).localName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      if (node.nodeType === TEXT_NODE) {
        // A run of adjacent text nodes is read once, from its first node.
        const previous = node.previousSibling;
        if (previous === null || previous.nodeType !== TEXT_NODE) checkText(sink, node as Text);
      } else visit(sink, node as Element);
    }
  }

  function visit(sink: Sink, element: Element): void {
    checkElement(sink, element);
    const shadow = shadowOf(element);
    if (shadow !== null) {
      registerRoot(shadow);
      scanNode(sink, shadow);
    }
  }

  function strip(found: Found): PageFinding {
    return { kind: found.kind, where: found.where, text: found.text, detail: found.detail };
  }

  // ---------------------------------------------------------------- copy units (2.8 reserved terms)
  const SHOWN_COPY_ATTRIBUTES = config.scannedAttributes;

  function isBlockContainer(element: Element): boolean {
    const display = getComputedStyle(element).display;
    if (display === 'contents') return false;
    if (display === 'none') return true;
    return !display.startsWith('inline');
  }

  function markedElement(node: Node): Element | null {
    return closestComposed(node, (element) => element.hasAttribute(COPY_ATTR));
  }

  /** The inline text of a container, split where a block or a marked element breaks it. */
  function inlineSegments(container: Node): string[] {
    const segments: string[] = [];
    let current = '';
    const walk = (node: Node): void => {
      for (let child = node.firstChild; child !== null; child = child.nextSibling) {
        if (child.nodeType === TEXT_NODE) {
          current += (child as Text).data;
          continue;
        }
        if (child.nodeType !== ELEMENT_NODE) continue;
        const element = child as Element;
        if (SKIPPED_ELEMENTS.has(element.localName)) continue;
        if (element.localName === 'br') {
          current += ' ';
          continue;
        }
        if (element.hasAttribute(COPY_ATTR) || isBlockContainer(element)) {
          segments.push(current);
          current = '';
          continue;
        }
        walk(element);
      }
    };
    walk(container);
    segments.push(current);
    return segments.map(normalise).filter((segment) => segment !== '');
  }

  function unitContext(node: Node): Pick<CopyUnit, 'copyKind' | 'documentId' | 'contentHash'> {
    const marked = markedElement(node);
    if (marked === null) return { copyKind: null, documentId: null, contentHash: null };
    return {
      copyKind: marked.getAttribute(COPY_ATTR),
      documentId: marked.getAttribute(config.evidenceDocumentAttribute),
      contentHash: marked.getAttribute(config.evidenceHashAttribute),
    };
  }

  /** The shown copy of one tree (the document or a shadow root), unit by unit. */
  function collectCopyUnitsOf(root: Document | ShadowRoot, units: CopyUnit[]): void {
    if (root.nodeType === FRAGMENT_NODE) {
      for (const segment of inlineSegments(root)) units.push({ text: segment, where: describe((root as ShadowRoot).host), source: 'text', copyKind: null, documentId: null, contentHash: null });
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
      acceptNode(node) {
        return SKIPPED_ELEMENTS.has((node as Element).localName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      },
    });
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      const element = node as Element;
      const context = unitContext(element);
      const marked = markedElement(element);
      if (marked === element) {
        const text = normalise(flatText(element));
        if (text !== '') units.push({ text, where: describe(element), source: 'text', ...context });
      } else if (marked === null && isBlockContainer(element)) {
        for (const segment of inlineSegments(element)) units.push({ text: segment, where: describe(element), source: 'text', ...context });
      }
      for (const name of SHOWN_COPY_ATTRIBUTES) {
        const value = element.getAttribute(name);
        if (value !== null && normalise(value) !== '') {
          units.push({ text: normalise(value), where: describe(element), source: 'attribute', name, ...context });
        }
      }
      if (element instanceof HTMLInputElement && BUTTON_INPUT_TYPES.has(element.type) && normalise(element.value) !== '') {
        units.push({ text: normalise(element.value), where: describe(element), source: 'attribute', name: 'value', ...context });
      }
      for (const pseudo of ['::before', '::after']) {
        const shown = generatedText(element, getComputedStyle(element, pseudo).content);
        if (shown !== null && shown !== COUNTER && normalise(shown) !== '') {
          units.push({ text: normalise(shown), where: `${describe(element)}${pseudo}`, source: 'generated', name: pseudo, ...context });
        }
      }
    }
  }

  function collectCopyUnits(): CopyUnit[] {
    const units: CopyUnit[] = [];
    collectCopyUnitsOf(document, units);
    for (const root of knownRoots) collectCopyUnitsOf(root, units);
    return units;
  }

  function scan(): PageScanResult {
    discoverRoots();
    const sink = newSink();
    scanNode(sink, document);
    return {
      findings: sink.found.map(strip),
      numberTexts: sink.numberTexts,
      boundNumberTexts: sink.boundNumberTexts,
      allowlistUse: sink.allowlistUse,
      unreadable: sink.unreadable,
      copyUnits: collectCopyUnits(),
    };
  }

  // ---------------------------------------------------------------- the timeline (G2-8)
  let started = performance.now();
  let nextKey = 1;
  const elementKeys = new WeakMap<Element, number>();
  const lastState = new Map<number, string>();
  const records: TimelineRecord[] = [];
  const animations: AnimationRecord[] = [];
  const animationKeys = new Set<string>();
  const transient: Array<Found & { t: number }> = [];
  const transientKeys = new Set<string>();
  const errors: string[] = [];

  function now(): number {
    return Math.round(performance.now() - started);
  }

  function keyOf(element: Element): number {
    let key = elementKeys.get(element);
    if (key === undefined) {
      key = nextKey;
      nextKey += 1;
      elementKeys.set(element, key);
    }
    return key;
  }

  function isShown(element: Element): boolean {
    if (!element.isConnected) return false;
    if (typeof element.checkVisibility === 'function') {
      return element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
    }
    return element.getClientRects().length > 0;
  }

  /** What a value element shows and announces. */
  function displayText(element: Element): string {
    let text = normalise(flatText(element));
    for (const name of TIMELINE_ATTRIBUTES) {
      const value = element.getAttribute(name);
      if (value !== null) text += ` [${name}=${normalise(value)}]`;
    }
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) text += ` [value=${normalise(element.value)}]`;
    return text;
  }

  function sample(element: Element): void {
    const valueId = element.getAttribute(VALUE_ATTR) ?? '';
    const text = valueId !== '' && isShown(element) ? displayText(element) : null;
    const key = keyOf(element);
    const state = `${valueId}\u0001${text ?? '\u0000'}`;
    if (lastState.get(key) === state) return;
    lastState.set(key, state);
    records.push({ t: now(), key, valueId, text, where: describe(element) });
  }

  function valueElements(): Element[] {
    const found: Element[] = [...document.querySelectorAll(VALUE_SELECTOR)];
    for (const root of knownRoots) found.push(...root.querySelectorAll(VALUE_SELECTOR));
    return found;
  }

  function subtreeShowsGeneratedNumbers(element: Element): boolean {
    if (generatedNumbers(element).length > 0) return true;
    const descendants = element.querySelectorAll('*');
    for (let index = 0; index < descendants.length && index < 200; index += 1) {
      const descendant = descendants[index];
      if (descendant !== undefined && generatedNumbers(descendant).length > 0) return true;
    }
    return false;
  }

  function animationName(animation: Animation): string {
    if (typeof CSSAnimation !== 'undefined' && animation instanceof CSSAnimation) return `CSS animation "${animation.animationName}"`;
    if (typeof CSSTransition !== 'undefined' && animation instanceof CSSTransition) {
      return `CSS transition of ${animation.transitionProperty}`;
    }
    return animation.id === '' ? 'script animation' : `script animation "${animation.id}"`;
  }

  function sampleAnimations(): void {
    const running: Animation[] = [...document.getAnimations()];
    for (const root of knownRoots) running.push(...root.getAnimations());
    for (const animation of running) {
      if (animation.playState !== 'running') continue;
      const effect = animation.effect;
      if (!(effect instanceof KeyframeEffect) || effect.target === null) continue;
      const target = effect.target;
      const valueElement = closestComposed(target, (element) => element.hasAttribute(VALUE_ATTR));
      if (valueElement === null) continue;
      const pseudo = effect.pseudoElement;
      const showsNumber =
        pseudo !== null || hasNumber(displayText(valueElement), valueElement) || subtreeShowsGeneratedNumbers(valueElement);
      if (!showsNumber) continue;
      const valueId = valueElement.getAttribute(VALUE_ATTR) ?? '';
      const name = animationName(animation);
      const where = `${describe(target)}${pseudo ?? ''}`;
      const key = `${valueId}\u0001${name}\u0001${where}`;
      if (animationKeys.has(key)) continue;
      animationKeys.add(key);
      animations.push({ t: now(), valueId, name, where });
    }
  }

  function sampleAll(): void {
    for (const element of valueElements()) sample(element);
    sampleAnimations();
  }

  function discoverRoots(): void {
    const elements = document.querySelectorAll('*');
    for (let index = 0; index < elements.length; index += 1) {
      const element = elements[index];
      const shadow = element === undefined ? null : shadowOf(element);
      if (shadow !== null) registerRoot(shadow);
    }
  }

  function recordTransient(sink: Sink): void {
    for (const found of sink.found) {
      // A value element whose text is not its display object while it changes is the G2-8
      // timeline's to report (a count-up); the snapshot reports what stays.
      if (found.kind === 'display-mismatch') continue;
      const key = `${found.kind}\u0001${found.where}\u0001${found.text}`;
      if (transientKeys.has(key)) continue;
      transientKeys.add(key);
      transient.push({ ...found, t: now() });
    }
  }

  /** True when the node still shows the same finding, so the snapshot scan reports it instead. */
  function stillShown(transientEntry: Found): boolean {
    if (!transientEntry.node.isConnected) return false;
    const sink = newSink();
    if (transientEntry.node.nodeType === TEXT_NODE) checkText(sink, runStart(transientEntry.node as Text));
    else if (transientEntry.node.nodeType === ELEMENT_NODE) checkElement(sink, transientEntry.node as Element);
    return sink.found.some((found) => found.kind === transientEntry.kind && found.text === transientEntry.text);
  }

  function guarded(task: () => void): void {
    try {
      task();
    } catch (error) {
      if (errors.length < 20) errors.push(error instanceof Error ? (error.stack ?? error.message) : String(error));
    }
  }

  let transientActive = document.readyState !== 'loading';

  function onMutations(mutations: MutationRecord[]): void {
    const toSample = new Set<Element>();
    const toScan = new Set<Node>();
    const collectValueElements = (node: Node): void => {
      if (node.nodeType !== ELEMENT_NODE) return;
      const element = node as Element;
      if (element.hasAttribute(VALUE_ATTR)) toSample.add(element);
      for (const inner of element.querySelectorAll(VALUE_SELECTOR)) toSample.add(inner);
    };
    for (const mutation of mutations) {
      for (let element = closestComposed(mutation.target, () => true); element !== null; element = composedParentElement(element)) {
        if (element.hasAttribute(VALUE_ATTR)) toSample.add(element);
      }
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          collectValueElements(node);
          toScan.add(node.nodeType === TEXT_NODE ? runStart(node as Text) : node);
        });
        mutation.removedNodes.forEach(collectValueElements);
      } else {
        if (mutation.type === 'attributes') collectValueElements(mutation.target);
        toScan.add(mutation.target.nodeType === TEXT_NODE ? runStart(mutation.target as Text) : mutation.target);
      }
    }
    for (const element of toSample) sample(element);
    if (!transientActive) return;
    const sink = newSink();
    for (const node of toScan) {
      if (node.isConnected) scanNode(sink, node);
    }
    recordTransient(sink);
  }

  observer.observe(document, OBSERVE_OPTIONS);

  if (!transientActive) {
    document.addEventListener(
      'DOMContentLoaded',
      () =>
        guarded(() => {
          transientActive = true;
          const sink = newSink();
          scanNode(sink, document);
          recordTransient(sink);
        }),
      { once: true },
    );
  }

  const onFrame = (): void => {
    guarded(sampleAll);
    requestAnimationFrame(onFrame);
  };
  requestAnimationFrame(onFrame);
  let ticks = 0;
  originalSetInterval(() => {
    ticks += 1;
    guarded(() => {
      if (ticks % 5 === 0) discoverRoots();
      sampleAll();
    });
  }, 100);

  const pause = (ms: number): Promise<void> => new Promise((resolve) => originalSetTimeout(resolve, ms));

  async function scrollThrough(): Promise<void> {
    const scrollers: Element[] = [];
    if (document.scrollingElement !== null) scrollers.push(document.scrollingElement);
    for (const element of document.querySelectorAll('*')) {
      if (scrollers.length >= 50) break;
      if (element === document.scrollingElement) continue;
      const style = getComputedStyle(element);
      const scrollsY = /(auto|scroll)/u.test(style.overflowY) && element.scrollHeight > element.clientHeight + 1;
      const scrollsX = /(auto|scroll)/u.test(style.overflowX) && element.scrollWidth > element.clientWidth + 1;
      if (scrollsY || scrollsX) scrollers.push(element);
    }
    for (const scroller of scrollers) {
      const maxY = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      const maxX = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
      const stepY = Math.max(100, Math.floor(scroller.clientHeight * 0.8));
      const stepX = Math.max(100, Math.floor(scroller.clientWidth * 0.8));
      const stops: Array<[number, number]> = [];
      for (let y = 0; y < maxY; y += stepY) stops.push([0, y]);
      stops.push([0, maxY]);
      for (let x = stepX; x < maxX; x += stepX) stops.push([x, maxY]);
      if (maxX > 0) stops.push([maxX, maxY]);
      for (const [left, top] of stops) {
        scroller.scrollTo({ left, top, behavior: 'instant' });
        // Two frames and a pause, so intersection observers see the new position.
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        await pause(60);
      }
      scroller.scrollTo({ left: 0, top: 0, behavior: 'instant' });
    }
  }

  // ---------------------------------------------------------------- hover and focus
  function underHoverListener(element: Element): boolean {
    if (hoverListenerOnRoot) return true;
    for (let current: Element | null = element; current !== null; current = composedParentElement(current)) {
      if (hoverListenerTargets.has(current)) return true;
      const root = current.getRootNode();
      if (root !== document && hoverListenerTargets.has(root)) return true;
    }
    return false;
  }

  function hoverTargets(): Element[] {
    const all: Element[] = [...document.querySelectorAll('*')];
    for (const root of knownRoots) all.push(...root.querySelectorAll('*'));
    return all.filter((element) => !insideSkipped(element) && (element.matches(INTERACTIVE_SELECTOR) || underHoverListener(element)));
  }

  /** Lets the page run what an event scheduled (its render task), and the mutation observer record it. */
  const yieldToPage = (): Promise<void> =>
    new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => {
        channel.port1.close();
        resolve();
      };
      channel.port2.postMessage(null);
    });

  async function hoverAndFocus(): Promise<number> {
    const targets = hoverTargets().slice(0, MAX_HOVER_TARGETS);
    for (const target of targets) {
      if (!target.isConnected) continue;
      const bubbling = { bubbles: true, composed: true, cancelable: true, view: window };
      const direct = { bubbles: false, composed: true, cancelable: false, view: window };
      target.dispatchEvent(new PointerEvent('pointerover', bubbling));
      target.dispatchEvent(new PointerEvent('pointerenter', direct));
      target.dispatchEvent(new MouseEvent('mouseover', bubbling));
      target.dispatchEvent(new MouseEvent('mouseenter', direct));
      target.dispatchEvent(new MouseEvent('mousemove', bubbling));
      target.dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true, view: window }));
      target.dispatchEvent(new FocusEvent('focus', { bubbles: false, composed: true, view: window }));
      await yieldToPage();
    }
    return targets.length;
  }

  function settling(): PageSettling {
    const at = performance.now();
    let nextDue: number | null = null;
    for (const [id, due] of pendingTimers) {
      // A string handler cannot be wrapped; it is dropped once long past due.
      if (due < at - 1000) {
        pendingTimers.delete(id);
        continue;
      }
      if (nextDue === null || due < nextDue) nextDue = due;
    }
    return {
      ready: document.body !== null && document.body.hasAttribute(config.readyAttribute),
      pendingTimers: pendingTimers.size,
      nextTimerInMs: nextDue === null ? null : Math.max(0, Math.round(nextDue - at)),
    };
  }

  function setDisplayObjects(served: Record<string, ServedDisplay>): void {
    displayObjects = new Map(Object.entries(served));
    declaredCache.clear();
    // An element recorded while its display object had not arrived yet is not a finding.
    for (let index = transient.length - 1; index >= 0; index -= 1) {
      const entryFound = transient[index];
      if (entryFound === undefined || entryFound.kind !== 'unknown-value-id' || entryFound.node.nodeType !== ELEMENT_NODE) continue;
      if (displayObjects.has((entryFound.node as Element).getAttribute(VALUE_ATTR) ?? '')) transient.splice(index, 1);
    }
  }

  const api: RenderHarnessApi = {
    version: 2,
    scan,
    scrollThrough,
    hoverAndFocus,
    settling,
    setDisplayObjects,
    readTimeline(): TimelineData {
      guarded(sampleAll);
      if (errors.length > 0) throw new Error(`The render harness failed inside the page:\n${errors.join('\n')}`);
      return {
        records: records.slice(),
        animations: animations.slice(),
        transient: transient.filter((found) => !stillShown(found)).map((found) => ({ ...strip(found), t: found.t })),
        fromDocumentStart,
      };
    },
    activity(): number {
      return records.length + animations.length + transient.length;
    },
    reset(served: Record<string, ServedDisplay>): void {
      setDisplayObjects(served);
      records.length = 0;
      animations.length = 0;
      animationKeys.clear();
      transient.length = 0;
      transientKeys.clear();
      lastState.clear();
      started = performance.now();
      guarded(sampleAll);
    },
  };
  Object.defineProperty(window, '__sovitechRenderHarness', { value: api, configurable: false, writable: false });
}
