/**
 * The render-test contract (guardrails rule 2, "Render test"; 2.8 "Reserved terms";
 * F-RENDER-06; G2-1, G2-8). docs/adr/0006-render-test.md records the reading and the
 * decisions behind it.
 *
 * - A value renders inside an element carrying `data-value-id="<subject kind>:<subject id>.<field path>"`,
 *   for example `document:<id>.coverage` or `project:<id>.openItems.owner` (prompt 3 section 7).
 *   The nearest such element decides: an empty or malformed id ties nothing.
 * - Every check is given the display objects the screen and state was served (value id to
 *   what it shows: the formatted value or range, its lines, the parts a component may render
 *   apart, its evidence excerpts). A `data-value-id` outside them fails, with or without a
 *   number in it. Inside a value element, every text holding a number must be made of what
 *   its display object declares, a value element never holds another one, and nothing else
 *   with a number is tied by it.
 * - Every other number (number characters, and number words in English and Romanian) on a
 *   screen must fit one entry of the one allowlist file, tests/e2e/render/allowlist.ts,
 *   within rule 2's four categories.
 * - Pixels the test cannot read (canvas, img, video, embed, object, SVG image, image input,
 *   CSS images, and inline SVG drawings larger than an icon with no text) fail unless the
 *   element is on the reviewed `unreadable` list of that file.
 * - A value element shows only its formatted value: no count-up, no intermediate numbers,
 *   and no animation while it shows a number (G2-8; prompt 3 section 11).
 * - Shown copy (text, shown attributes, generated content) holds no reserved term of 2.8
 *   outside the places 2.8 allows, which the app marks with `data-copy-kind`.
 *
 * This file holds names and types only, so the in-page harness, the Node side and the
 * repository check agree on them.
 */

/** The attribute that ties an element, and everything inside it, to a value id. */
export const VALUE_ID_ATTRIBUTE = 'data-value-id';

/**
 * On `<body>`: set by the app once the screen has rendered the data it asked for. A check
 * whose screen was served display objects waits for it, and fails when it never comes.
 */
export const READY_ATTRIBUTE = 'data-render-ready';

/**
 * On a harness page only (tests/e2e/pages/): a `<script type="application/json">` carrying
 * this attribute declares the display objects the page stands for, as the API would serve
 * them. The Node side reads it from the file before the page loads; the in-page harness never
 * reads it, and an app screen never declares its own (its display objects come from the API).
 */
export const DISPLAY_OBJECTS_SCRIPT_ATTRIBUTE = 'data-render-display-objects';

/**
 * Marks an element whose copy stands in one of the places guardrails 2.8 allows a reserved
 * term. The value names the place; the element's whole text is one copy unit.
 */
export const COPY_KIND_ATTRIBUTE = 'data-copy-kind';

/**
 * The places 2.8 allows a reserved term, as markers. Each but `evidence-excerpt` is honoured
 * only when a registered allowance of the matching kind (packages/registry reserved terms)
 * covers the whole unit; since the phase 1 review, a `badge`, `status-line` or
 * `generated-sentence` unit also only when a served display object carries that text among its
 * lines (2.8: built from stored state), and the stage 3 label only when that display object
 * names its stored quotation record. `evidence-excerpt` is honoured only when the unit is an
 * excerpt the served display objects declare, with its document id and content hash.
 */
export const COPY_KINDS = [
  'badge',
  'status-line',
  'action-label',
  'evidence-excerpt',
  'registry-qualifier',
  'generated-sentence',
] as const;
export type CopyKind = (typeof COPY_KINDS)[number];

/** On an `evidence-excerpt` element: the id of the document the excerpt was read from. */
export const EVIDENCE_DOCUMENT_ATTRIBUTE = 'data-document-id';
/** On an `evidence-excerpt` element: the content hash of the revision the excerpt was read from. */
export const EVIDENCE_HASH_ATTRIBUTE = 'data-content-hash';

/** An evidence excerpt a display object carries (guardrails 2.4 Evidence), as shown. */
export interface ServedEvidence {
  documentId: string;
  contentHash: string;
  /** The verbatim excerpt, as the screen shows it. */
  excerpt: string;
}

/**
 * What the screen was served for one value id (from phase 3, the view-model's display object;
 * on a harness page, what the page declares). Texts are compared with whitespace collapsed.
 */
export interface ServedDisplay {
  /** The formatted value or range, as the view-model formats it, e.g. "TEST 12,345 m²". */
  text: string;
  /** The badge, source line and status lines the display object carries, each as shown. */
  lines?: readonly string[];
  /**
   * Pieces of `text` or of a line that a component renders in separate elements (the figure
   * and its unit, for example). Each must occur in `text` or in one line.
   */
  parts?: readonly string[];
  /** Evidence excerpts shown with the value; each may be shown verbatim, marked `evidence-excerpt`. */
  evidence?: readonly ServedEvidence[];
  /**
   * For a stage 3 price only: the id of the stored quotation record it was derived from
   * (guardrails rule 10, "Stage 3 is derived, not passed"). Only a display object carrying it
   * may show the stage 3 label "Formal quotation", which 2.8 allows at stage 3 only.
   */
  quotationRecordId?: string;
}

/** Value id to what the screen was served for it. */
export type DisplayObjects = Readonly<Record<string, ServedDisplay>>;

/**
 * A value id: subject kind, a colon, the subject id, then one or more dot-separated field
 * path segments. Phase 3's view-model may narrow this (a tightening); it never widens it.
 */
export const VALUE_ID_PATTERN = /^[a-z][a-z0-9_]*:[A-Za-z0-9_-]+(?:\.[A-Za-z][A-Za-z0-9_]*)+$/;

/** Marks an element whose number is a step number or a character counter; the value is an allowlist entry id. */
export const RENDER_ALLOW_ATTRIBUTE = 'data-render-allow';

/**
 * Registers the one stepper container of a step-number entry; the value is the entry id.
 * The container is an `<ol>` whose element children are exactly the entry's `steps` `<li>`
 * items, and a step number is accepted only inside it, equal to its item's position.
 */
export const STEPPER_ATTRIBUTE = 'data-render-stepper';

/**
 * On an element whose pixels the render test cannot read: the id of its entry on the
 * reviewed `unreadable` list of allowlist.ts. Without it, such an element fails.
 */
export const UNREADABLE_ATTRIBUTE = 'data-render-unreadable';

/**
 * What draws pixels the render test cannot read: `<canvas>`, `<img>`, `<video>`, `<embed>`,
 * `<object>`, an SVG `<image>`, an `<input type="image">`, a CSS image (a `url()` in a
 * background, border image, mask, list marker image or generated content), and an inline
 * `<svg>` larger than an icon that draws shapes (paths, `<use>`, polygons and the like) and
 * holds no text (`svg-graphic`): its shapes could draw digits the test cannot read.
 */
export const UNREADABLE_KINDS = [
  'canvas',
  'img',
  'video',
  'embed',
  'object',
  'svg-image',
  'input-image',
  'css-image',
  'svg-graphic',
] as const;
export type UnreadableKind = (typeof UNREADABLE_KINDS)[number];

/**
 * The largest box, in CSS pixels on each side, an inline SVG drawing may have and still count
 * as an icon (the app's icons sit on a 24px grid; onboarding-spec 2.1). A larger one with no
 * text is `svg-graphic`.
 */
export const ICON_MAX_PX = 32;

/**
 * Number words read as number texts, whole word, case and diacritics ignored (folded to
 * ASCII here). English words apply where the nearest `lang` is not Romanian; Romanian words
 * where it is. Left out because they are common words too: English "one"; Romanian "un",
 * "o", "una", "nouă" (also "new") and "mie" (also "to me"). docs/adr/0006-render-test.md
 * decision 4.
 */
export const NUMBER_WORDS = {
  en: [
    'zero', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
    'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty', 'thirty',
    'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety', 'hundred', 'hundreds', 'thousand', 'thousands',
    'million', 'millions', 'billion', 'billions', 'dozen', 'dozens',
  ],
  ro: [
    'zero', 'unu', 'doi', 'doua', 'trei', 'patru', 'cinci', 'sase', 'sapte', 'opt', 'zece', 'unsprezece',
    'doisprezece', 'douasprezece', 'treisprezece', 'paisprezece', 'cincisprezece', 'saisprezece',
    'saptesprezece', 'optsprezece', 'nouasprezece', 'douazeci', 'treizeci', 'patruzeci', 'cincizeci',
    'saizeci', 'saptezeci', 'optzeci', 'nouazeci', 'suta', 'sute', 'mii', 'milion', 'milioane', 'miliard',
    'miliarde',
  ],
} as const satisfies Record<'en' | 'ro', readonly string[]>;

/** On a character-counter element: the id of the text field whose characters it counts. */
export const COUNTER_FOR_ATTRIBUTE = 'data-counter-for';

/**
 * Attributes whose text a browser shows or announces. The render test reads each of them
 * on every element. Removing one is a loosening of the test.
 */
export const SCANNED_ATTRIBUTES: readonly string[] = [
  'aria-label',
  'aria-description',
  'aria-roledescription',
  'aria-valuetext',
  'aria-valuenow',
  'aria-valuemin',
  'aria-valuemax',
  'aria-placeholder',
  'aria-braillelabel',
  'aria-brailleroledescription',
  'title',
  'alt',
  'placeholder',
  'label',
];

/** Attributes read on `<progress>` and `<meter>`, which draw and announce their numbers. */
export const RANGE_ELEMENT_ATTRIBUTES: readonly string[] = ['value', 'max', 'min', 'low', 'high', 'optimum'];

/** Rule 2's allowlist categories, and only these (prompt 3 section 7). */
export const ALLOWLIST_CATEGORIES = ['date_time', 'step_number', 'character_counter', 'fixed_interface_copy'] as const;
export type AllowlistCategory = (typeof ALLOWLIST_CATEGORIES)[number];

interface EntryBase {
  /** Kebab-case id; step-number and character-counter elements name it in `data-render-allow`. */
  id: string;
  /** Why the digits carry no engineering meaning and no stored state. */
  reason: string;
  /** Where the copy or the category comes from (guardrails, spec, PRD). */
  source: string;
}

/**
 * A date or time: accepted only inside a `<time>` element whose `datetime` attribute is a
 * valid date or time and whose text is that same moment written in `format`.
 * Tokens: D, DD, MMM, MM, YYYY, HH, mm; everything else is literal.
 */
export interface DateTimeEntry extends EntryBase {
  category: 'date_time';
  format: string;
}

/**
 * A wizard step number: accepted only in an element marked with this entry's id, whose whole
 * text matches `pattern`, inside the one stepper container that registers this entry
 * (`data-render-stepper="<id>"`, an `<ol>` of exactly `steps` `<li>` items), equal to the
 * position of the item it sits in, in an item that shows nothing but that number and the
 * registered title of its step.
 */
export interface StepNumberEntry extends EntryBase {
  category: 'step_number';
  pattern: string;
  /** How many items the stepper container holds; `pattern` accepts exactly 1 to `steps`. */
  steps: number;
  /** The title of each step, in order, one per item: an item's text is its number and this title. */
  titles: readonly string[];
}

/**
 * A character counter: accepted only in an element marked with this entry's id, tied to a
 * text field by `data-counter-for`, whose text is `format` filled with the field's own
 * character count ({count}) and maxlength ({max}).
 */
export interface CharacterCounterEntry extends EntryBase {
  category: 'character_counter';
  format: string;
}

/** Fixed interface copy: accepted where a text node, an enclosing element or an attribute reads exactly `text`. */
export interface FixedCopyEntry extends EntryBase {
  category: 'fixed_interface_copy';
  text: string;
}

export type AllowlistEntry = DateTimeEntry | StepNumberEntry | CharacterCounterEntry | FixedCopyEntry;

/**
 * A reviewed element whose pixels the render test cannot read, accepted only when it carries
 * `data-render-unreadable="<id>"` and is of the kind `element` names. Each entry says why its
 * pixels hold no number (for example the model viewer's canvas, which draws no text, or the
 * brand logo).
 */
export interface UnreadableEntry {
  id: string;
  element: UnreadableKind;
  /**
   * For an element that loads a file (every kind except `canvas` and `css-image`), required:
   * a pattern, anchored with `$`, that the path of the file's URL must match, so the entry
   * covers that one file and not every element of its kind. Not allowed on the other kinds.
   */
  src?: string;
  /**
   * The one component file that draws the element, a path under apps/ or packages/. Required
   * for the kinds that load no file (`canvas`, `css-image`, `svg-graphic`), which `src` cannot
   * tie to one image; optional for the others. The render check's source scan accepts the
   * marker `data-render-unreadable="<id>"` of such an entry only in that file (phase 1; phase 0
   * review round 2, adversarial finding 10, remainder).
   */
  component?: string;
  /** Why its pixels carry no number and no engineering value. */
  reason: string;
  source: string;
}

/** The shape of tests/e2e/render/allowlist.ts. */
export interface Allowlist {
  entries: readonly AllowlistEntry[];
  /** The reviewed list of elements whose pixels the render test cannot read. */
  unreadable: readonly UnreadableEntry[];
}

/**
 * What went wrong, per violation, and the indexed case or rule it belongs to. The reserved-term
 * scan of rendered pages belongs to guardrails 2.8 "Reserved terms"; its indexed cases (G10-1,
 * G11-6) have no case file yet, so its findings name the rule.
 */
export const VIOLATION_CASES = {
  /** A number (characters or words) in text outside any value element. */
  'bare-digit': 'G2-1',
  /** A number in a shown or announced attribute outside any value element. */
  'bare-digit-attribute': 'G2-1',
  /** A number in a form field's shown value outside any value element. */
  'bare-digit-input': 'G2-1',
  /** A number character, number word or counter in CSS generated content, anywhere. */
  'generated-digits': 'G2-1',
  /** The nearest `data-value-id` is empty or not a value id. */
  'malformed-value-id': 'G2-1',
  /** A well-formed value id the screen was served no display object for. */
  'unknown-value-id': 'G2-1',
  /** A number inside a value element that is not made of what its display object declares. */
  'display-mismatch': 'G2-1',
  /** A value element inside another value element. */
  'nested-value-element': 'G2-1',
  /** A `<time>` or marked element whose text does not fit its allowlist entry. */
  'allowlist-misuse': 'G2-1',
  /** An unbound number shown at some moment of the observation and gone by its end. */
  'transient-digit': 'G2-1',
  /** A frame the harness could not observe from its start. */
  'frame-not-observed': 'G2-1',
  /** A screen served display objects never set the readiness marker, so it was read unsettled. */
  'not-ready': 'G2-1',
  /** An element that draws pixels the test cannot read, not on the reviewed `unreadable` list. */
  'unreadable-pixels': 'G2-1',
  /** One value id showed one number, then stopped showing it while showing another. */
  'value-changed-while-shown': 'G2-8',
  /** An animation ran on a value element, or inside it, while it showed a number. */
  'value-animated': 'G2-8',
  /** Shown copy holds a reserved term outside the places 2.8 allows. */
  'reserved-term': '2.8',
} as const;

export type ViolationKind = keyof typeof VIOLATION_CASES;
export type RenderCaseId = (typeof VIOLATION_CASES)[ViolationKind];

/** One finding of the render check. */
export interface Violation {
  kind: ViolationKind;
  caseId: RenderCaseId;
  /** URL of the frame the finding is in. */
  frameUrl: string;
  /** A short CSS-like path to the element, with `>>>` at shadow-root boundaries. */
  where: string;
  /** The text at fault, whitespace collapsed, cut to 160 characters. */
  text: string;
  detail: string;
}

/** A finding as the in-page harness reports it, before the frame URL and case id are added. */
export interface PageFinding {
  kind: Exclude<ViolationKind, 'value-changed-while-shown' | 'frame-not-observed' | 'not-ready' | 'reserved-term'>;
  where: string;
  text: string;
  detail: string;
}

/** The settings the in-page harness receives, as plain JSON. */
export interface HarnessConfig {
  valueIdAttribute: string;
  valueIdPattern: { source: string; flags: string };
  allowAttribute: string;
  counterForAttribute: string;
  stepperAttribute: string;
  unreadableAttribute: string;
  readyAttribute: string;
  copyKindAttribute: string;
  evidenceDocumentAttribute: string;
  evidenceHashAttribute: string;
  scannedAttributes: string[];
  rangeElementAttributes: string[];
  /**
   * The display objects the screen was served, value id to what it shows. Every
   * `data-value-id` outside them fails. Always given; from the API on an app screen, where
   * it grows as the page receives display objects (`setDisplayObjects`).
   */
  displayObjects: Record<string, ServedDisplay>;
  numberWords: { en: string[]; ro: string[] };
  iconMaxPx: number;
  allowlist: AllowlistEntry[];
  unreadable: UnreadableEntry[];
}

/**
 * One unit of shown copy for the reserved-term scan: the text of a block of the page (inline
 * content joined), a marked element's whole text, a shown attribute, or generated content.
 */
export interface CopyUnit {
  text: string;
  where: string;
  source: 'text' | 'attribute' | 'generated';
  /** The attribute name or pseudo-element, when not text. */
  name?: string;
  /** The `data-copy-kind` of the nearest marked element around the unit, or null. */
  copyKind: string | null;
  /** On an evidence excerpt: its document id and content hash as marked, or null. */
  documentId: string | null;
  contentHash: string | null;
}

/** What one snapshot scan of a document found. */
export interface PageScanResult {
  findings: PageFinding[];
  /** Texts, attributes and field values holding a number (characters or words). */
  numberTexts: number;
  /** Of those, how many sit inside a value element whose display object declares them. */
  boundNumberTexts: number;
  /** Allowlist entry id (or reviewed unreadable entry id) to the number of texts or elements it accepted. */
  allowlistUse: Record<string, number>;
  /** Reviewed elements whose pixels the test cannot read, accepted through the `unreadable` list. */
  unreadable: string[];
  /** The shown copy, for the reserved-term scan on the Node side. */
  copyUnits: CopyUnit[];
}

/** How far the page has settled, for the wait before the check reads it. */
export interface PageSettling {
  /** true once `<body>` carries the readiness marker. */
  ready: boolean;
  /** setTimeout callbacks still waiting (the page's own, not the harness's). */
  pendingTimers: number;
  /** Milliseconds until the next of them is due, or null. */
  nextTimerInMs: number | null;
}

/** One observation of one value element: its text when shown, or null when hidden or removed. */
export interface TimelineRecord {
  /** Milliseconds since the observation started. */
  t: number;
  /** A number unique to the element within its document. */
  key: number;
  valueId: string;
  text: string | null;
  where: string;
}

/** A running animation seen on a value element, or inside one, while it showed a number. */
export interface AnimationRecord {
  t: number;
  valueId: string;
  name: string;
  where: string;
}

/** What the in-page recorder hands back. */
export interface TimelineData {
  records: TimelineRecord[];
  animations: AnimationRecord[];
  transient: Array<PageFinding & { t: number }>;
  /** true when the harness ran before the document's own scripts. */
  fromDocumentStart: boolean;
}

/** The API the harness installs on `window` in every frame. */
export interface RenderHarnessApi {
  version: 2;
  scan(): PageScanResult;
  readTimeline(): TimelineData;
  /** A count that grows with every new record; used to wait until the page is quiet. */
  activity(): number;
  /** Readiness marker and pending timers. */
  settling(): PageSettling;
  /** Replaces the display objects the screen was served (the API adapter, as they arrive). */
  setDisplayObjects(displayObjects: Record<string, ServedDisplay>): void;
  /** Starts a new observation from the current state, with the display objects the screen now holds. */
  reset(displayObjects: Record<string, ServedDisplay>): void;
  /**
   * Scrolls the document and every scroll container through their whole extent and back,
   * so values that change when they scroll into view do so while observed.
   */
  scrollThrough(): Promise<void>;
  /**
   * Dispatches pointer, mouse and focus entry events (never leave or blur) on every element a
   * hover or focus could change: interactive elements, elements with a title or a description,
   * and elements under a hover or focus listener. Returns how many elements it reached.
   */
  hoverAndFocus(): Promise<number>;
}

declare global {
  interface Window {
    __sovitechRenderHarness?: RenderHarnessApi;
  }
}
