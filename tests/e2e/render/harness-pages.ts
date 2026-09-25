/**
 * The render harness's own test pages, under tests/e2e/pages/ (docs/adr/0006-render-test.md).
 * Each bad page holds one kind of fault and names the violation kinds the check must report
 * for it, no more and no fewer; the clean page must pass. The case files G2-1 and G2-8, the
 * reserved-term test in tools/checks/render and the canaries in render.spec.ts load them from
 * file:// URLs.
 *
 * Every page declares the display objects it stands for in one
 * `<script type="application/json" data-render-display-objects>` tag, and the check runs with
 * exactly those (read from the file here, never from the live page), as it runs an app screen
 * with the display objects the page received from the API. Every value on these pages is a
 * visibly synthetic TEST value in a digit pattern (1, 12, 123, 1,234, 12,345).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { DisplayObjects, ViolationKind } from './contract';
import { readDeclaredDisplayObjects } from './display-objects';
import type { RenderCheckOptions, RunOptions } from './render-check';

export interface HarnessPage {
  /** Path under tests/e2e/pages/. */
  file: string;
  /** What the page shows. */
  about: string;
  /** The violation kinds the check must report, sorted; empty means the page must pass. */
  expectKinds: ViolationKind[];
  /** Where a page holds several faults of one kind: how many violations of that kind the check must report. */
  expectCounts?: Partial<Record<ViolationKind, number>>;
  options?: RunOptions;
}

export const PAGES_DIRECTORY = fileURLToPath(new URL('../pages/', import.meta.url));

export function harnessPageUrl(file: string): string {
  return pathToFileURL(`${PAGES_DIRECTORY}${file}`).href;
}

/** The display objects a harness page declares, read from its file. */
export function harnessPageDisplayObjects(file: string): DisplayObjects {
  return readDeclaredDisplayObjects(readFileSync(join(PAGES_DIRECTORY, file), 'utf8'), `tests/e2e/pages/${file}`);
}

/** The options a harness page is checked with: its run options and the display objects it declares. */
export function harnessPageOptions(page: HarnessPage): RenderCheckOptions {
  return { ...page.options, displayObjects: harnessPageDisplayObjects(page.file) };
}

/** Every page file under tests/e2e/pages/, as a path relative to it, sorted. */
export function harnessPageFiles(): string[] {
  const found: string[] = [];
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.html')) found.push(relative(PAGES_DIRECTORY, path).split('\\').join('/'));
    }
  };
  walk(PAGES_DIRECTORY);
  return found.sort();
}

/**
 * Every number tied to a value id as its display object declares it, or to an allowlist entry;
 * no value that changes or animates; no reserved term outside a place 2.8 allows.
 */
export const CLEAN_PAGE: HarnessPage = {
  file: 'clean.html',
  about:
    'values as served, in shadow roots, slots and SVG, split into declared parts, a pending value that later shows one number, a bound hover tooltip, an evidence excerpt holding a reserved term, the one registered stepper, an icon, the reviewed logo image, and each allowlist entry in use',
  expectKinds: [],
};

/** G2-1: a screen renders a digit outside a bound value element, and the render test fails. */
export const G2_1_PAGES: readonly HarnessPage[] = [
  { file: 'g2-1/bare-digit-text.html', about: 'a digit in plain text', expectKinds: ['bare-digit'] },
  { file: 'g2-1/bare-digit-aria-label.html', about: 'a digit in an aria-label', expectKinds: ['bare-digit-attribute'] },
  { file: 'g2-1/bare-digit-title.html', about: 'a digit in a title attribute', expectKinds: ['bare-digit-attribute'] },
  { file: 'g2-1/bare-digit-hidden.html', about: 'a digit in a collapsed section', expectKinds: ['bare-digit'] },
  { file: 'g2-1/document-title.html', about: 'a digit in the document title', expectKinds: ['bare-digit'] },
  { file: 'g2-1/generated-content.html', about: 'a digit in CSS generated content', expectKinds: ['generated-digits'] },
  { file: 'g2-1/ordered-list.html', about: 'numbered list markers', expectKinds: ['generated-digits'] },
  { file: 'g2-1/input-value.html', about: 'a number in a text field with no value id', expectKinds: ['bare-digit-input'] },
  { file: 'g2-1/progress.html', about: 'an upload percentage on a progress bar', expectKinds: ['bare-digit-attribute'] },
  { file: 'g2-1/non-latin-digits.html', about: 'Arabic-Indic digits and a vulgar fraction', expectKinds: ['bare-digit'] },
  { file: 'g2-1/superscript-digit.html', about: 'a superscript two outside a value element', expectKinds: ['bare-digit'] },
  { file: 'g2-1/shadow-dom-open.html', about: 'a digit in an open shadow root', expectKinds: ['bare-digit'] },
  { file: 'g2-1/shadow-dom-closed.html', about: 'a digit in a closed shadow root', expectKinds: ['bare-digit'] },
  { file: 'g2-1/iframe.html', about: 'a digit in a frame', expectKinds: ['bare-digit'] },
  { file: 'g2-1/transient-digit.html', about: 'a digit shown for a moment after load', expectKinds: ['transient-digit'] },
  {
    file: 'g2-1/malformed-value-id.html',
    about: 'empty and malformed value ids',
    expectKinds: ['malformed-value-id'],
    expectCounts: { 'malformed-value-id': 2 },
  },
  { file: 'g2-1/unknown-value-id.html', about: 'a value id the screen was not served', expectKinds: ['unknown-value-id'] },
  {
    file: 'g2-1/unknown-value-id-no-number.html',
    about: 'a value id the screen was not served, on an element with no number',
    expectKinds: ['unknown-value-id'],
  },
  {
    file: 'g2-1/container-ties-card.html',
    about: 'one served value id around a whole card of numbers its display object does not declare',
    expectKinds: ['display-mismatch'],
    expectCounts: { 'display-mismatch': 3 },
  },
  {
    file: 'g2-1/bound-literal-differs.html',
    about: 'served value ids around a literal and around the value with a typed figure beside it',
    expectKinds: ['display-mismatch'],
    expectCounts: { 'display-mismatch': 2 },
  },
  {
    file: 'g2-1/nested-value-element.html',
    about: 'a value element inside another value element',
    expectKinds: ['nested-value-element'],
    expectCounts: { 'nested-value-element': 1 },
  },
  {
    file: 'g2-1/number-words.html',
    about: 'numbers written as English and Romanian words, in text and in an aria-label',
    expectKinds: ['bare-digit', 'bare-digit-attribute'],
    expectCounts: { 'bare-digit': 3, 'bare-digit-attribute': 1 },
  },
  { file: 'g2-1/time-misuse.html', about: 'a quantity inside a time element', expectKinds: ['allowlist-misuse'] },
  { file: 'g2-1/step-number-misuse.html', about: 'a quantity marked as a step number', expectKinds: ['allowlist-misuse'] },
  {
    file: 'g2-1/step-number-outside-stepper.html',
    about: 'a step-number marker on "6" before "air handling units", outside any stepper',
    expectKinds: ['allowlist-misuse'],
    expectCounts: { 'allowlist-misuse': 1 },
  },
  {
    file: 'g2-1/step-title-misuse.html',
    about: 'a valid stepper whose item 6 shows its number beside a quantity instead of its step title',
    expectKinds: ['allowlist-misuse'],
    expectCounts: { 'allowlist-misuse': 1 },
  },
  {
    file: 'g2-1/step-number-wrong-position.html',
    about: 'a step number that is not its item position in the stepper',
    expectKinds: ['allowlist-misuse'],
    expectCounts: { 'allowlist-misuse': 1 },
  },
  {
    file: 'g2-1/step-number-twice-in-item.html',
    about: 'a second step-number marker in one stepper item',
    expectKinds: ['allowlist-misuse'],
    expectCounts: { 'allowlist-misuse': 2 },
  },
  {
    file: 'g2-1/stepper-item-count.html',
    about: 'a registered stepper with six items instead of eight',
    expectKinds: ['allowlist-misuse'],
    expectCounts: { 'allowlist-misuse': 6 },
  },
  {
    file: 'g2-1/stepper-twice.html',
    about: 'two registered steppers on one page',
    expectKinds: ['allowlist-misuse'],
    expectCounts: { 'allowlist-misuse': 16 },
  },
  {
    file: 'g2-1/stepper-not-ordered.html',
    about: 'a registered stepper that is not an ordered list',
    expectKinds: ['allowlist-misuse'],
    expectCounts: { 'allowlist-misuse': 8 },
  },
  { file: 'g2-1/character-counter-misuse.html', about: 'a counter that does not count its field', expectKinds: ['allowlist-misuse'] },
  { file: 'g2-1/unknown-marker.html', about: 'a marker naming no allowlist entry', expectKinds: ['allowlist-misuse'] },
  { file: 'g2-1/fixed-copy-variant.html', about: 'reviewed copy with a changed figure', expectKinds: ['bare-digit'] },
  {
    file: 'g2-1/canvas.html',
    about: 'a number drawn on a canvas',
    expectKinds: ['unreadable-pixels'],
    expectCounts: { 'unreadable-pixels': 1 },
  },
  { file: 'g2-1/img.html', about: 'a number in an image', expectKinds: ['unreadable-pixels'], expectCounts: { 'unreadable-pixels': 1 } },
  {
    file: 'g2-1/unreadable-other.html',
    about: 'a video, an embed, an object, an SVG image and an image input',
    expectKinds: ['unreadable-pixels'],
    expectCounts: { 'unreadable-pixels': 5 },
  },
  {
    file: 'g2-1/css-image.html',
    about: 'a background image and an image in generated content',
    expectKinds: ['unreadable-pixels'],
    expectCounts: { 'unreadable-pixels': 2 },
  },
  {
    file: 'g2-1/svg-path-glyphs.html',
    about: 'inline SVG drawings larger than an icon with no text: a path and a <use> sprite',
    expectKinds: ['unreadable-pixels'],
    expectCounts: { 'unreadable-pixels': 2 },
  },
  {
    file: 'g2-1/unreadable-marker-unknown.html',
    about: 'a canvas marked with an entry the reviewed unreadable list does not have',
    expectKinds: ['unreadable-pixels'],
    expectCounts: { 'unreadable-pixels': 1 },
  },
  {
    file: 'g2-1/unreadable-wrong-kind.html',
    about: 'a canvas marked with the reviewed entry of an image',
    expectKinds: ['unreadable-pixels'],
    expectCounts: { 'unreadable-pixels': 1 },
  },
  {
    file: 'g2-1/unreadable-wrong-image.html',
    about: 'another image marked with the reviewed entry of the logo file',
    expectKinds: ['unreadable-pixels'],
    expectCounts: { 'unreadable-pixels': 1 },
  },
  {
    file: 'g2-1/hover-only-digit.html',
    about: 'numbers shown only in :hover generated content and in a mouseenter tooltip',
    expectKinds: ['bare-digit', 'generated-digits'],
    expectCounts: { 'bare-digit': 1, 'generated-digits': 1 },
  },
  {
    file: 'g2-1/focus-only-digit.html',
    about: 'numbers shown only in :focus-within generated content and by a focus listener',
    expectKinds: ['bare-digit', 'generated-digits'],
    expectCounts: { 'bare-digit': 1, 'generated-digits': 1 },
  },
  {
    file: 'g2-1/not-ready.html',
    about: 'a page served a display object that never sets its readiness marker',
    expectKinds: ['not-ready'],
    options: { maxWindowMs: 3000 },
  },
];

/** G2-8: a value element animates a count-up from 0 to its value, and the render test fails. */
export const G2_8_PAGES: readonly HarnessPage[] = [
  { file: 'g2-8/count-up.html', about: 'a count-up in place, frame by frame', expectKinds: ['value-changed-while-shown'] },
  {
    file: 'g2-8/count-up-replace.html',
    about: 'a count-up that swaps in new elements with the same value id',
    expectKinds: ['value-changed-while-shown'],
  },
  { file: 'g2-8/count-up-delayed.html', about: 'a count-up that starts after the load event', expectKinds: ['value-changed-while-shown'] },
  {
    file: 'g2-8/count-up-late.html',
    about: 'a count-up that starts 2.5 s after the load event, from a timer',
    expectKinds: ['value-changed-while-shown'],
  },
  {
    file: 'g2-8/count-up-after-ready.html',
    about: 'a count-up that starts after the readiness marker, with no timer',
    expectKinds: ['value-changed-while-shown'],
  },
  {
    file: 'g2-8/count-up-on-scroll.html',
    about: 'a count-up that starts when scrolled into view',
    expectKinds: ['value-changed-while-shown'],
  },
  {
    file: 'g2-8/count-up-flipbook.html',
    about: 'hidden value elements shown one after another (the hidden ones also hold numbers not served)',
    expectKinds: ['display-mismatch', 'value-changed-while-shown'],
  },
  { file: 'g2-8/count-up-aria.html', about: 'an announced value that counts up', expectKinds: ['value-changed-while-shown'] },
  { file: 'g2-8/css-counter.html', about: 'a CSS counter animated in generated content', expectKinds: ['generated-digits', 'value-animated'] },
  {
    file: 'g2-8/odometer.html',
    about: 'a digit column rolling inside the value element (its digits are not the value served)',
    expectKinds: ['display-mismatch', 'value-animated'],
  },
  { file: 'g2-8/fade-in.html', about: 'a value element that fades in (no value animates)', expectKinds: ['value-animated'] },
];

/** Guardrails 2.8: shown copy holds a reserved term outside the places 2.8 allows, and the render check fails. */
/** G10-9: the stage 3 label "Formal quotation" served with no stored quotation record fails the render test (rule 10; 2.8). */
export const G10_9_PAGE: HarnessPage = {
  file: 'reserved-terms/stage-3-label-without-record.html',
  about: 'the status line "Formal quotation" served by a price display object that names no stored quotation record',
  expectKinds: ['reserved-term'],
  expectCounts: { 'reserved-term': 1 },
};

/** G3-11: the generated sentence "AI inference, verified by SOVITECH on {date}" with words in its date slot fails the render test (2.8; rule 3; rule 14). */
export const G3_11_PAGE: HarnessPage = {
  file: 'reserved-terms/sentence-slot-with-words.html',
  about: 'the generated sentence "AI inference, verified by SOVITECH on ..." served with words, not a date, in its date slot',
  expectKinds: ['reserved-term'],
  expectCounts: { 'reserved-term': 1 },
};

export const RESERVED_TERM_PAGES: readonly HarnessPage[] = [
  {
    file: 'reserved-terms/object-keys-label.html',
    about: 'capitalised reserved terms held as object keys and rendered through Object.keys',
    expectKinds: ['reserved-term'],
    expectCounts: { 'reserved-term': 3 },
  },
  {
    file: 'reserved-terms/tagged-template.html',
    about: 'reserved terms in copy built with tagged templates, in English and Romanian',
    expectKinds: ['reserved-term'],
    expectCounts: { 'reserved-term': 3 },
  },
  {
    file: 'reserved-terms/shown-attributes.html',
    about: 'reserved terms in an aria-label, a title, a placeholder, a submit value and ::after content',
    expectKinds: ['reserved-term'],
    expectCounts: { 'reserved-term': 5 },
  },
  {
    file: 'reserved-terms/marked-without-allowance.html',
    about: 'a badge, a status line and an action label with no registered allowance, and a marker naming no place of 2.8',
    expectKinds: ['reserved-term'],
    expectCounts: { 'reserved-term': 4 },
  },
  {
    file: 'reserved-terms/excerpt-not-served.html',
    about: 'evidence excerpts naming another document, without a content hash, and not served at all',
    expectKinds: ['reserved-term'],
    expectCounts: { 'reserved-term': 3 },
  },
  G10_9_PAGE,
  G3_11_PAGE,
];

/** Every harness page, each listed once. */
export const ALL_HARNESS_PAGES: readonly HarnessPage[] = [CLEAN_PAGE, ...G2_1_PAGES, ...G2_8_PAGES, ...RESERVED_TERM_PAGES];
