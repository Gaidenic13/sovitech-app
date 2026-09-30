/**
 * Product names, product lines and model numbers (guardrails rule 1, "Identifiers and
 * prices: SAUTER model numbers, product names and product lines ... come only from
 * reference data"; rule 2, "It also rejects product names or product lines that are not
 * tokens"; gate `dataset-sauter-catalogue`: "No SAUTER product line, product or model name
 * anywhere"; F-EXTRACT-05, "SAUTER model numbers and product names not in the approved
 * catalogue are rejected and flagged"; G1-3, G2-5).
 *
 * No product name is written here: the catalogue is a reference dataset, and none is
 * approved (the gate is closed). Without it the check still finds the brand word
 * followed by a name or a code: "SAUTER" followed by anything but a generic noun
 * ("SAUTER-based", "SAUTER products", "SAUTER BMS") or the end of the phrase is a product
 * reference. With an approved catalogue, its names are found anywhere, and a reference in
 * a candidate's value passes only when the catalogue lists it.
 */
import { WORD, foldKeepingIndices, spansOf, type Span } from './text';

/** An approved SAUTER catalogue version (a reference dataset). None exists while the gate is closed. */
export interface ProductCatalogue {
  readonly dataset: string;
  readonly version: string;
  /** Catalogue ids usable in `{{product:<catalogueId>}}`. */
  readonly ids: ReadonlySet<string>;
  /** Product names, product lines and model numbers as the catalogue writes them. */
  readonly names: readonly string[];
}

const BRAND = new RegExp(String.raw`(?<!${WORD})sauter(?!${WORD})`, 'gu');

/** Words after the brand that name no product (folded). */
const GENERIC = new Set([
  'based', 'products', 'product', 'bms', 'system', 'systems', 'equipment', 'controls', 'technology', 'solutions', 'devices',
  'components', 'range', 'portfolio', 'integration', 'integrator', 'partner', 'ag', 'group', 'company', 'romania',
  'produse', 'produsele', 'echipamente', 'sistem', 'sisteme', 'tehnologie', 'solutii', 'componente', 'partener',
]);

/** Words that end the brand's phrase (folded): the brand used as a name. */
const STOPWORDS = new Set([
  'and', 'or', 'the', 'a', 'an', 'in', 'of', 'for', 'to', 'with', 'is', 'are', 'as', 'at', 'by', 'from', 'on', 'that', 'which', 'this',
  'si', 'sau', 'de', 'cu', 'pentru', 'din', 'la', 'pe', 'este', 'sunt', 'ca', 'care',
]);

/** A word that reads as a product or model code: a digit, a capital inside a word, or a capitalised hyphenated code. */
function isCodeLike(word: string): boolean {
  return /\p{N}/u.test(word) || /\p{Ll}\p{Lu}/u.test(word) || /^\p{Lu}{2,}-/u.test(word) || /-\p{Lu}{2,}/u.test(word);
}

export interface ProductReference extends Span {
  /** The brand and the words that name the product, as written. */
  readonly phrase: string;
}

/** The words after an index, up to three, stopping at the end of the phrase. */
function followingWords(text: string, from: number): { word: string; end: number }[] {
  const words: { word: string; end: number }[] = [];
  const pattern = /[\s\-–:]*([\p{L}\p{N}][\p{L}\p{N}./_-]*)/uy;
  pattern.lastIndex = from;
  for (let match = pattern.exec(text); match !== null && words.length < 3; match = pattern.exec(text)) {
    words.push({ word: (match[1] ?? '').replace(/[._-]+$/u, ''), end: match.index + match[0].length });
    if (/^\s*[,;:.!?()]/u.test(text.slice(pattern.lastIndex))) break;
  }
  return words;
}

/**
 * After a generic noun ("SAUTER products ..."), the first code-like word before a
 * stopword names a product ("SAUTER product XY-12"); none means the brand phrase names no
 * product.
 */
function codeAfterGeneric(words: readonly { word: string; end: number }[]): { word: string; end: number } | undefined {
  for (const entry of words.slice(1)) {
    if (STOPWORDS.has(foldKeepingIndices(entry.word))) return undefined;
    if (isCodeLike(entry.word)) return entry;
  }
  return undefined;
}

/** The name after the brand, extended over the code-like words that follow it ("SAUTER XY 12"). */
function codeRun(words: readonly { word: string; end: number }[]): { word: string; end: number } | undefined {
  let last = words[0];
  for (const entry of words.slice(1)) {
    if (STOPWORDS.has(foldKeepingIndices(entry.word)) || !isCodeLike(entry.word)) break;
    last = entry;
  }
  return last;
}

/** The brand followed by a product name or code in `masked` (tokens masked). */
function brandReferences(masked: string): ProductReference[] {
  const folded = foldKeepingIndices(masked);
  const found: ProductReference[] = [];
  for (const brand of spansOf(BRAND, folded)) {
    const words = followingWords(masked, brand.index + brand.length);
    const first = words[0];
    if (first === undefined) continue;
    const firstFolded = foldKeepingIndices(first.word);
    if (STOPWORDS.has(firstFolded)) continue;
    const last = GENERIC.has(firstFolded) ? codeAfterGeneric(words) : codeRun(words);
    if (last === undefined) continue;
    found.push({ index: brand.index, length: last.end - brand.index, phrase: masked.slice(brand.index, last.end) });
  }
  return found;
}

function escapeForRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Catalogue names in `masked` (tokens masked), whole word, ignoring case and diacritics. */
function catalogueNames(masked: string, catalogue: ProductCatalogue | undefined): ProductReference[] {
  if (catalogue === undefined || catalogue.names.length === 0) return [];
  const folded = foldKeepingIndices(masked);
  const pattern = new RegExp(
    `(?<!${WORD})(?:${[...catalogue.names]
      .map((name) => foldKeepingIndices(name).trim())
      .filter((name) => name !== '')
      .sort((left, right) => right.length - left.length)
      .map((name) => escapeForRegExp(name).replace(/\s+/g, String.raw`\s+`))
      .join('|')})(?!${WORD})`,
    'gu',
  );
  return spansOf(pattern, folded).map((span) => ({ ...span, phrase: masked.slice(span.index, span.index + span.length) }));
}

/** Every product reference in prose outside tokens (rule 2): the brand with a name or code, and catalogue names. */
export function productReferences(masked: string, catalogue: ProductCatalogue | undefined): ProductReference[] {
  return [...brandReferences(masked), ...catalogueNames(masked, catalogue)];
}

/** Whether the catalogue lists the product a reference names. */
export function inCatalogue(reference: ProductReference, catalogue: ProductCatalogue | undefined): boolean {
  if (catalogue === undefined) return false;
  const phrase = foldKeepingIndices(reference.phrase).replace(/\s+/g, ' ').trim();
  return catalogue.names.some((name) => {
    const folded = foldKeepingIndices(name).replace(/\s+/g, ' ').trim();
    return folded !== '' && ` ${phrase} `.includes(` ${folded} `);
  });
}

/**
 * Product references in a candidate's value that the catalogue does not list (G1-3):
 * each is refused and flagged for the engineer. With no approved catalogue, every one.
 */
export function identifiersNotInCatalogue(text: string, catalogue: ProductCatalogue | undefined): ProductReference[] {
  return brandReferences(text).filter((reference) => !inCatalogue(reference, catalogue));
}
