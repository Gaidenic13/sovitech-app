/**
 * The evidence verifier (docs/guardrails.md rule 1 "Enforced by"; 2.1; F-EXTRACT-04,
 * with the source and inference limits of F-EXTRACT-05). One verifier serves the
 * extractor and the AI (prompt 3 section 6): the ingestion path in apps/api calls it
 * for every proposed candidate, and stores a candidate only when it is accepted.
 *
 * What it does, in order (docs/adr/0027-evidence-verifier-and-ingestion.md):
 * 1. The proposal's shape against its field: a proposed source (`document` or
 *    `ai_inference`, 2.1), the field it names, a value of the field's kind, a choice
 *    among the field's options, an inference kind that fits, and no candidate at all on
 *    an owner's decision (rule 3, "Choices belong to the owner"; G3-9, as derive refuses it).
 * 2. Rule 1's five checks, each over every evidence entry before the next check runs:
 *    the document belongs to this project; the content hash matches; the locator exists
 *    (the strict runtime shape of 2.4 `Evidence.locator`, which has no IFC field, G1-13,
 *    then the stored text at that place); the excerpt occurs there after normalising
 *    whitespace and diacritics, on token boundaries (it never starts or ends inside a
 *    word or a number, so "2.345 mp" does not occur in "12.345 mp", and a sheet read as
 *    a whole is read one cell at a time); and, for `document`, the value parses from the
 *    excerpt itself: from a whole number token of the located text inside the excerpt,
 *    through the rule 8 parser, in every entry (2.1 `document`: "Written literally").
 * 3. Code decides the source (2.1: "code decides which of the two applies"): a value that
 *    does not parse from every excerpt is not written literally, so it is an inference
 *    (G2-2). An inferred quantity other than a direct count is rejected (G1-10), and so
 *    is one whose excerpts hold digits it may have been derived from, unless the
 *    proposal names it a direct count. A text that is not written is refused, since
 *    code cannot read AI-written words as an inference. A choice whose every mention in
 *    the evidence is negated ("nu este un hotel") is refused; a choice is `document`
 *    only through a label-value pattern the registry registers (none today), otherwise
 *    it is an inference (rule 3; section 4's example).
 * 4. Code sets what rule 8 asks of a value written literally: every reading of an
 *    ambiguous number ("1.500": 1.5 and 1500, with low confidence), the approximate word
 *    ("cca.", "aprox.", "~", "circa", "peste", "about"), the qualifier only where the
 *    excerpt states it (rule 8's words; otherwise unknown), and `original` from the
 *    matched token as written. The AI's own `original` is never stored. Each entry's
 *    excerpt is stored as the located text writes it, at the place check 4 matched (2.4:
 *    "verbatim"), never the proposer's copy, which matched only after normalisation.
 * 5. Code sets each entry's check and caps the confidence (rule 3): low on unverifiable
 *    evidence ("Unverifiable evidence caps confidence at low"), high only when an excerpt
 *    names the chosen option ("High (Likely): Verified text evidence names the type"),
 *    otherwise medium; and below high when an entry's excerpt reads as naming the option
 *    only because it leaves out the negation its located text writes, so the cap derive
 *    recomputes from the stored evidence that remains (./confidence.ts) never reads
 *    higher than this one. The glossary tier waits for the `dataset-glossary` gate.
 *
 * Every rejection comes with its guardrail event (section 8), which names codes and ids,
 * never an excerpt or other document text (rule 13).
 */
import type {
  Candidate,
  Confidence,
  DocumentRecord,
  Evidence,
  EvidenceLocator,
  EvidenceMatch,
  FieldDefinition,
  GuardrailEvent,
  GuardrailEventType,
  OriginalText,
  ProposedSource,
  Quantity,
  UnitCode,
} from './model';
import { decimalOf } from './decimal';
import { EVIDENCE_LOCATOR_KEYS, UNKNOWN_QUALIFIER } from './model';
import { declareNotImplemented } from './not-implemented';

/** Rule 1's five checks, in its order. */
export const EVIDENCE_CHECKS = [
  /** The document belongs to this project. */
  'document_in_project',
  /** The content hash matches. */
  'content_hash_matches',
  /** The locator exists. */
  'locator_exists',
  /** The excerpt occurs at that location, after normalising whitespace and diacritics. */
  'excerpt_at_locator',
  /** For `document`, the value parses from the excerpt itself. */
  'value_in_excerpt',
] as const;
export type EvidenceCheckName = (typeof EVIDENCE_CHECKS)[number];

/** Evidence as proposed: 2.4 `Evidence` before code sets `check`. */
export type ProposedEvidence = Omit<Evidence, 'check'>;

/**
 * What an inference is (2.1 `ai_inference`: "a type recognised from a symbol, a direct
 * count of items visible at the cited locations, an expanded abbreviation"). The AI output
 * schema's `inference` names one of these (packages/ai, INFERENCE_KINDS).
 */
export const PROPOSED_INFERENCES = ['direct_count', 'type_from_text', 'type_from_symbol', 'abbreviation_expansion', 'classification'] as const;
export type ProposedInference = (typeof PROPOSED_INFERENCES)[number];

/**
 * A candidate as the extractor or the AI proposes it, before verification. Its
 * source is a claim: code decides between `document` and `ai_inference` (2.1).
 */
export interface CandidateProposal {
  readonly subjectId: string;
  readonly fieldKey: string;
  readonly quantity?: Quantity;
  readonly choice?: string;
  readonly text?: string;
  readonly alternatives?: readonly Quantity[];
  readonly source: ProposedSource;
  /** For `ai_inference`: what kind of inference the proposer says it is. A `document` proposal carries none. */
  readonly inference?: ProposedInference;
  readonly evidence: readonly ProposedEvidence[];
  /** The proposer's copy of the value as written. Never stored: code sets `original` from the matched token. */
  readonly original?: OriginalText;
  readonly confidence?: Confidence;
}

/** Text found at a locator of one stored revision: the native text layer, or OCR. */
export interface LocatedText {
  readonly text: string;
  readonly layer: 'text' | 'ocr';
}

/** One reading of a quantity written in a text, from the rule 8 parser; an ambiguous number gives two. */
export interface QuantityReading {
  readonly value: number;
  readonly unit: UnitCode | null;
}

/**
 * Why a locator is refused by its strict runtime shape (2.4 `Evidence.locator`):
 * - `ifc_field`: it carries an IFC locator or a part of one (a GlobalId, STEP ids, a
 *   property path). 2.4 has no IFC field: that is ifc-input 6.2.1, a proposal that is
 *   not approved (G1-13);
 * - `unknown_key`: any other key 2.4 does not name;
 * - `shape`: a key 2.4 names, of the wrong type or combination (a page and a sheet, a
 *   cell with no sheet, a box that is not four ordered numbers).
 */
export type LocatorProblem = 'ifc_field' | 'unknown_key' | 'shape';

export type LocatorParse =
  | { readonly ok: true; readonly locator: EvidenceLocator }
  | { readonly ok: false; readonly problem: LocatorProblem };

/**
 * The strict runtime locator schema, injected (the extraction contract's
 * `parseEvidenceLocator`, packages/extraction-contract; the domain depends on no
 * package). The verifier applies its own floor first (the keys and types of 2.4), so a
 * caller that injects nothing still refuses every IFC key; the ingestion path always
 * injects the contract's schema as well.
 */
export type LocatorParser = (input: unknown) => LocatorParse;

/** What the verifier reads. Every lookup is read-only. */
export interface ProposalContext {
  /** The project the proposal is for. */
  readonly projectId: string;
  readonly field: FieldDefinition;
  /** Any stored document by id. It may return another project's record: check 1 is the verifier's. */
  readonly document: (documentId: string) => DocumentRecord | undefined;
  /**
   * Extracted text at a locator of one revision; undefined when that locator does not exist in it. A sheet read
   * as a whole (a sheet with no cell) holds its cells one per line: a line break there is a cell boundary.
   */
  readonly textAt: (documentId: string, contentHash: string, locator: EvidenceLocator) => LocatedText | undefined;
  /**
   * The rule 8 number and notation parser (@sovitech/registry), injected. The verifier hands it one number token
   * of the located text at a time, with the approximate word before it and the word after it (its unit, perhaps),
   * and keeps only the readings of that token's own digits and sign.
   */
  readonly readQuantities: (text: string) => readonly QuantityReading[];
  /** The strict runtime locator schema (G1-13), injected; see {@link LocatorParser}. */
  readonly parseLocator?: LocatorParser;
  /**
   * The registry's label-value patterns for a choice of this field: whether the excerpt (normalised as check 4
   * compares it) writes the choice literally, such as a field label, a colon and the option's word. The registry
   * registers none today, so a choice is never `document`: it is an inference, its confidence capped (rule 3).
   */
  readonly labelValue?: (choice: string, excerpt: string) => boolean;
  /** Id and creation stamp for the candidate, when one is accepted (UUIDv7 and time come from app code). */
  readonly candidateId: string;
  readonly createdBy: string;
  readonly createdAt: string;
}

/**
 * Why a proposal's shape is refused before any evidence is read:
 * - `source`: a source the AI and the extractor may not propose (2.1; rule 2 "The schema");
 * - `field`: it names another field than the one the verifier was handed;
 * - `value_kind`: no value, more than one, or one of another kind than the field's;
 * - `choice_not_listed`: a choice the field does not list (2.4 `choice`: "enum key");
 * - `decision_field`: any value on an owner's decision field (rule 3, "Choices belong to
 *   the owner"; 2.6 `decision`; G3-9);
 * - `inference_kind`: an inference kind on a `document` proposal, one 2.1 does not name,
 *   or a direct count that is not a quantity.
 */
export type ProposalShapeProblem = 'source' | 'field' | 'value_kind' | 'choice_not_listed' | 'decision_field' | 'inference_kind';

/** Why a proposal was rejected. */
export type ProposalRejection =
  | { readonly kind: 'no_evidence' }
  | { readonly kind: 'malformed'; readonly problem: ProposalShapeProblem }
  | {
      readonly kind: 'evidence_check_failed';
      readonly check: EvidenceCheckName;
      readonly evidenceIndex: number;
      /** For `locator_exists`, when the locator's shape was refused rather than not found in the document. */
      readonly locatorProblem?: LocatorProblem;
    }
  /**
   * Rule 1: an `ai_inference` quantity other than a direct count: not a whole count of one or more ("Zero is a
   * value": none found is not zero), named another kind of inference, or cited to excerpts that hold digits it
   * may be derived from without being named a direct count ("Sums ... are never produced by the AI").
   */
  | { readonly kind: 'inferred_quantity_not_direct_count' }
  /** Every mention of the chosen option in the evidence is negated ("nu este un hotel"): the evidence says otherwise. */
  | { readonly kind: 'choice_negated' }
  /** A text proposed as `document` that is not written in every excerpt: code does not store AI-written words. */
  | { readonly kind: 'text_not_written' };

/**
 * The verifier's answer. An accepted proposal becomes a candidate whose source and
 * confidence code decided; a rejected one becomes nothing but its guardrail events
 * (rule 1 "Failures are rejected", section 8).
 */
export type ProposalVerdict =
  | {
      readonly outcome: 'accepted';
      readonly candidate: Candidate;
      /** For an `ai_inference` candidate, the inference kind code accepted, for the store to keep with it. */
      readonly inference?: ProposedInference;
      readonly guardrailEvents: readonly GuardrailEvent[];
    }
  | {
      readonly outcome: 'rejected';
      readonly rejection: ProposalRejection;
      readonly guardrailEvents: readonly GuardrailEvent[];
    };

/** Verifies a proposal's evidence with rule 1's five checks and decides its source. Pure. */
export type VerifyProposal = (proposal: CandidateProposal, context: ProposalContext) => ProposalVerdict;

/**
 * The stub error of `verify-proposal`, kept only as the probe the harness's own
 * self-tests reach (tools/vitest/stub-probe.ts, tools/checks/index/pending-wrapper.test.ts,
 * the seeded runs): a call with no proposal at all, or with no context to verify against
 * (no document, text or parser lookups, so no check could run). The verifier is built; no guardrail
 * case waits for it. Retiring the probe (DOMAIN_FEATURES left empty, the pending wrapper
 * removed) is a harness change (tools/vitest/README.md, "Which stub the harness's own
 * tests reach").
 */
const verifyProposalNotImplemented = declareNotImplemented('verify-proposal');

/** Whether a context carries the lookups the checks need (the store's documents, text and the rule 8 parser). */
function isProposalContext(context: unknown): context is ProposalContext {
  if (typeof context !== 'object' || context === null) return false;
  const lookups = context as Partial<Record<'document' | 'textAt' | 'readQuantities', unknown>>;
  return typeof lookups.document === 'function' && typeof lookups.textAt === 'function' && typeof lookups.readQuantities === 'function';
}

// ---------------------------------------------------------------------------
// Text normalisation (rule 1, check 4), keeping each character's place as written
// ---------------------------------------------------------------------------

/** Text as check 4 compares it, with the place in the text as written of each UTF-16 unit. */
interface NormalisedText {
  readonly raw: string;
  readonly text: string;
  readonly from: readonly number[];
  readonly to: readonly number[];
}

/**
 * Diacritics removed (NFD, then every combining mark dropped, so "ș" and "ş", "ț" and "ţ"
 * and the plain letters read alike) and every run of whitespace one space, trimmed. Case
 * is kept: an excerpt is verbatim (2.4).
 */
function normaliseMapped(raw: string): NormalisedText {
  let text = '';
  const from: number[] = [];
  const to: number[] = [];
  let space: { readonly start: number; readonly end: number } | undefined;
  let at = 0;
  for (const character of raw) {
    const start = at;
    at += character.length;
    if (/\s/u.test(character)) {
      if (text !== '' && space === undefined) space = { start, end: at };
      continue;
    }
    const kept = character.normalize('NFD').replace(/\p{M}+/gu, '');
    if (kept === '') continue;
    if (space !== undefined) {
      text += ' ';
      from.push(space.start);
      to.push(space.end);
      space = undefined;
    }
    for (let unit = 0; unit < kept.length; unit += 1) {
      from.push(start);
      to.push(at);
    }
    text += kept;
  }
  return { raw, text, from, to };
}

/** Text as check 4 compares it: see {@link normaliseMapped}. */
export function normaliseForExcerpt(text: string): string {
  return normaliseMapped(text).text;
}

/** A combining mark: a diacritic written as its own character after its letter (NFD text). */
const COMBINING_MARK = /^\p{M}$/u;

/**
 * The text as written behind `[start, end)` of its normalised form: every character from the first to the last, with
 * the diacritics that follow the last one when they are written as combining marks, so the slice is verbatim.
 */
function writtenSlice(place: NormalisedText, start: number, end: number): string {
  const first = place.from[start];
  let last = place.to[end - 1];
  if (first === undefined || last === undefined) return '';
  for (const character of place.raw.slice(last)) {
    if (!COMBINING_MARK.test(character)) break;
    last += character.length;
  }
  return place.raw.slice(first, last);
}

// ---------------------------------------------------------------------------
// Tokens (rule 1, checks 4 and 5; rule 8, "Parsing")
// ---------------------------------------------------------------------------

const isWordCharacter = (character: string | undefined): boolean => character !== undefined && /[\p{L}\p{N}]/u.test(character);

/**
 * A number as written in normalised text: digits joined by "." or "," (so 12.345 and 1,5 are one token), or groups
 * of three joined by a space (12 345, as the rule 8 parser reads them). A minus sign in front of it belongs to it.
 */
interface NumberToken {
  readonly start: number;
  readonly end: number;
  readonly negative: boolean;
  /** Its digits without leading or trailing zeros, to tell its own readings from a reading of a part of it. */
  readonly digits: string;
  /** False for a number glued to a word, as in a tag or a sheet number ("CTA-01", "M-201", "VCV-3.12"): it states no quantity. */
  readonly standalone: boolean;
}

const NUMBER_TOKEN = /(?<!\d)(?:\d{1,3}(?: \d{3})+(?:[.,]\d+)?(?!\d)|\d+(?:[.,]\d+)*)/gu;

function significantDigits(digits: string): string {
  return digits.replace(/^0+/u, '').replace(/0+$/u, '');
}

function numberTokens(text: string): NumberToken[] {
  const tokens: NumberToken[] = [];
  for (const match of text.matchAll(NUMBER_TOKEN)) {
    const at = match.index;
    if (at === undefined) continue;
    const before = text[at - 1];
    const beforeThat = text[at - 2];
    const signed = (before === '-' || before === '−') && !isWordCharacter(beforeThat);
    const glued = isWordCharacter(before) || (before !== undefined && /[-/_.−]/u.test(before) && isWordCharacter(beforeThat));
    tokens.push({
      start: signed ? at - 1 : at,
      end: at + match[0].length,
      negative: signed,
      digits: significantDigits(match[0].replace(/\D/gu, '')),
      standalone: !glued,
    });
  }
  return tokens;
}

/** A place of the located text an excerpt may occur in: the whole text, or one cell of a sheet read as a whole. */
interface Place extends NormalisedText {
  readonly tokens: readonly NumberToken[];
}

function placesOf(located: string, wholeSheet: boolean): Place[] {
  return (wholeSheet ? located.split(/\r\n|\r|\n/u) : [located]).map((raw) => {
    const normalised = normaliseMapped(raw);
    return { ...normalised, tokens: numberTokens(normalised.text) };
  });
}

/** Whether a boundary at `at` falls inside a word or a number (a token of the text). */
function splitsToken(place: Place, at: number): boolean {
  if (isWordCharacter(place.text[at - 1]) && isWordCharacter(place.text[at])) return true;
  return place.tokens.some((token) => token.start < at && at < token.end);
}

/** Where `needle` (normalised) occurs in `[from, until)` of a place, never starting or ending inside a token. */
interface Span {
  readonly place: Place;
  readonly start: number;
  readonly end: number;
}

function boundedOccurrences(needle: string, place: Place, from: number, until: number): Span[] {
  const spans: Span[] = [];
  if (needle === '') return spans;
  let at = place.text.indexOf(needle, from);
  while (at !== -1 && at + needle.length <= until) {
    const end = at + needle.length;
    if (!splitsToken(place, at) && !splitsToken(place, end)) spans.push({ place, start: at, end });
    at = place.text.indexOf(needle, at + 1);
  }
  return spans;
}

function excerptSpans(excerpt: string, places: readonly Place[]): Span[] {
  const needle = normaliseForExcerpt(excerpt);
  return places.flatMap((place) => boundedOccurrences(needle, place, 0, place.text.length));
}

/**
 * Whether `excerpt` occurs in `located` after normalisation, on token boundaries: never starting or ending inside a
 * word or a number. An excerpt that normalises to nothing never occurs.
 */
export function excerptOccurs(excerpt: string, located: string): boolean {
  return excerptSpans(excerpt, placesOf(located, false)).length > 0;
}

// ---------------------------------------------------------------------------
// Rule 8 at verification: readings, the approximate word, the stated qualifier
// ---------------------------------------------------------------------------

/** Rule 8's approximate words ("cca.", "aprox.", "~", "circa", "peste" and "about"), written just before a number. */
const APPROXIMATE_WORD = /(?<![\p{L}\p{N}])(?:(?:cca\.?|aprox\.?|circa|peste|about) |~ ?)$/iu;

/** The word right after a number, in the excerpt: its unit, a count's noun, or letters glued to it ("12E"). */
const WORD_AFTER = /^( ?)([^\s\d.,;:()[\]+\-/=][^\s,;:()[\]+]*)/u;

/**
 * The words rule 8 writes for qualifiers a document states ("Qualifiers that must be stated"; "Floors"): the area
 * bases with their abbreviations, and the level types with the letters of rule 8's own regim example
 * "3S+P+Mz+12E+Er" (the letters the registry's floor-notation parser reads). Abbreviations and letters match as
 * written; phrases ignore case and diacritics, and a level phrase's last word may carry a Romanian ending
 * ("subsoluri", "etajele"). A qualifier with no words here is never stated, so a document value of it is stored with
 * its qualifier unknown.
 */
interface QualifierWords {
  readonly qualifier: string;
  readonly abbreviations?: readonly string[];
  readonly phrases?: readonly string[];
  readonly letters?: readonly string[];
  readonly inflected?: boolean;
}

const RULE_8_QUALIFIER_WORDS: readonly (readonly QualifierWords[])[] = [
  [
    { qualifier: 'footprint', abbreviations: ['Sc', 'Ac'], phrases: ['suprafață construită'] },
    { qualifier: 'gross_total', abbreviations: ['Scd', 'Acd', 'Ad'], phrases: ['suprafață construită desfășurată'] },
    { qualifier: 'usable', abbreviations: ['Su', 'Au'], phrases: ['suprafață utilă'] },
    { qualifier: 'heated_usable', phrases: ['arie utilă încălzită'] },
  ],
  [
    { qualifier: 'below_ground', phrases: ['subsol'], letters: ['S'], inflected: true },
    { qualifier: 'semi_basement', phrases: ['demisol'], inflected: true },
    { qualifier: 'ground', phrases: ['parter'], letters: ['P'], inflected: true },
    { qualifier: 'mezzanine', phrases: ['mezanin'], letters: ['Mz'], inflected: true },
    { qualifier: 'upper', phrases: ['etaje'], letters: ['E'], inflected: true },
    { qualifier: 'setback_or_technical', phrases: ['etaj retras', 'etaj tehnic'], letters: ['Er'], inflected: true },
    { qualifier: 'attic', phrases: ['mansardă'], inflected: true },
    { qualifier: 'roof_plant', phrases: ['roof plant'] },
  ],
];

/** The qualifier words the proposal's qualifier, or the field's, belongs with. */
function qualifierWordsFor(field: FieldDefinition, proposed: string | undefined): readonly QualifierWords[] {
  const registered = field.qualifiers ?? [];
  return RULE_8_QUALIFIER_WORDS.find((group) => group.some((words) => words.qualifier === proposed || registered.includes(words.qualifier))) ?? [];
}

const escapeForPattern = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');

/** Where each word of a qualifier occurs in a normalised text: its qualifier and where it ends. */
function qualifierMentions(text: string, group: readonly QualifierWords[]): { readonly qualifier: string; readonly start: number; readonly end: number }[] {
  const lower = text.toLowerCase();
  const found: { qualifier: string; start: number; end: number }[] = [];
  for (const words of group) {
    for (const abbreviation of words.abbreviations ?? []) {
      for (const match of text.matchAll(new RegExp(`(?<![\\p{L}\\p{N}])${escapeForPattern(abbreviation)}(?![\\p{L}\\p{N}])`, 'gu'))) {
        if (match.index !== undefined) found.push({ qualifier: words.qualifier, start: match.index, end: match.index + match[0].length });
      }
    }
    for (const phrase of words.phrases ?? []) {
      const ending = words.inflected === true ? '\\p{L}*' : '';
      const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escapeForPattern(normaliseForExcerpt(phrase).toLowerCase())}${ending}(?![\\p{L}\\p{N}])`, 'gu');
      for (const match of lower.matchAll(pattern)) {
        if (match.index !== undefined) found.push({ qualifier: words.qualifier, start: match.index, end: match.index + match[0].length });
      }
    }
  }
  return found;
}

/**
 * The qualifier the text states for one number: letters glued to it ("12E"), else the word after it ("3 subsoluri"),
 * else the nearest qualifier word in its label, the text since the number before it ("Sc 2.350 mp, Scd 45.600 mp").
 * At one place the longest word wins ("suprafață construită desfășurată" over "suprafață construită").
 */
function statedQualifier(
  place: Place,
  token: NumberToken,
  wordAfter: { readonly word: string; readonly glued: boolean } | undefined,
  labelStart: number,
  group: readonly QualifierWords[],
): string | undefined {
  if (wordAfter !== undefined) {
    if (wordAfter.glued) {
      const byLetter = group.find((words) => (words.letters ?? []).includes(wordAfter.word));
      if (byLetter !== undefined) return byLetter.qualifier;
    }
    const inWord = qualifierMentions(wordAfter.word, group).find((mention) => mention.start === 0 && mention.end === wordAfter.word.length);
    if (inWord !== undefined) return inWord.qualifier;
  }
  const mentions = qualifierMentions(place.text.slice(labelStart, token.start), group);
  const nearest = mentions.sort((a, b) => b.end - a.end || b.end - b.start - (a.end - a.start))[0];
  return nearest?.qualifier;
}

/** What one number token of an excerpt says: its readings, whether it is approximate, and how it is written. */
interface TokenReading {
  readonly readings: readonly QuantityReading[];
  readonly approximate: boolean;
  /** The token as written in the located text, from its approximate word to the word after it: `Candidate.original`. */
  readonly written: string;
  readonly wordAfter?: { readonly word: string; readonly glued: boolean };
}

/** A reading is this token's own when it names the token's digits and sign: never a part of the number. */
function readsToken(reading: QuantityReading, token: NumberToken): boolean {
  if (!Number.isFinite(reading.value) || reading.value < 0 !== token.negative) return false;
  return significantDigits(decimalOf(reading.value).digits.toString().replace('-', '')) === token.digits;
}

/** How far before a number its approximate word is looked for: the longest word, its space and the character before it. */
const APPROXIMATE_REACH = 12;

function readToken(span: Span, token: NumberToken, context: ProposalContext): TokenReading {
  const place = span.place;
  const before = place.text.slice(0, token.start).slice(-APPROXIMATE_REACH);
  const marker = APPROXIMATE_WORD.exec(before);
  const markerStart = marker === null ? token.start : token.start - before.length + marker.index;
  const after = WORD_AFTER.exec(place.text.slice(token.end, span.end));
  const space = after?.[1] ?? '';
  const word = after?.[2]?.replace(/\.+$/u, '');
  const wordAfter = word === undefined || word === '' ? undefined : { word, glued: space === '' };
  const wordEnd = wordAfter === undefined ? token.end : token.end + space.length + wordAfter.word.length;
  const readings = context.readQuantities(place.text.slice(markerStart, wordEnd)).filter((reading) => readsToken(reading, token));
  return {
    readings,
    approximate: marker !== null,
    written: writtenSlice(place, markerStart, wordEnd),
    ...(wordAfter === undefined ? {} : { wordAfter }),
  };
}

/** The standalone number tokens of a span, each with where its label starts (after the token before it). */
function tokensIn(span: Span): { readonly token: NumberToken; readonly labelStart: number }[] {
  const all = span.place.tokens;
  return all.flatMap((token, index) => {
    if (!token.standalone || token.start < span.start || token.end > span.end) return [];
    const previous = all[index - 1];
    const labelStart = previous === undefined || previous.end < span.start ? span.start : previous.end;
    return [{ token, labelStart }];
  });
}

// ---------------------------------------------------------------------------
// The value against its field, and against its excerpts (rule 1, check 5)
// ---------------------------------------------------------------------------

type ValueKind = 'quantity' | 'choice' | 'text';

function valueKindOf(proposal: CandidateProposal): ValueKind | 'none' | 'several' {
  const kinds: ValueKind[] = [];
  if (proposal.quantity !== undefined) kinds.push('quantity');
  if (proposal.choice !== undefined) kinds.push('choice');
  if (proposal.text !== undefined) kinds.push('text');
  const [only] = kinds;
  if (only === undefined) return 'none';
  return kinds.length > 1 ? 'several' : only;
}

const FIELD_VALUE_KIND: Readonly<Record<FieldDefinition['kind'], ValueKind>> = {
  quantity: 'quantity',
  count: 'quantity',
  enum: 'choice',
  decision: 'choice',
  text: 'text',
};

function shapeProblem(proposal: CandidateProposal, field: FieldDefinition): ProposalShapeProblem | undefined {
  const source: unknown = proposal.source;
  if (source !== 'document' && source !== 'ai_inference') return 'source';
  if (proposal.fieldKey !== field.key) return 'field';
  if (field.kind === 'decision') return 'decision_field';
  const kind = valueKindOf(proposal);
  if (kind !== FIELD_VALUE_KIND[field.kind]) return 'value_kind';
  if (proposal.alternatives !== undefined && kind !== 'quantity') return 'value_kind';
  if (kind === 'choice' && field.options !== undefined && !field.options.includes(proposal.choice ?? '')) return 'choice_not_listed';
  const inference: unknown = proposal.inference;
  if (inference !== undefined) {
    if (source === 'document' || !(PROPOSED_INFERENCES as readonly unknown[]).includes(inference)) return 'inference_kind';
    if (inference === 'direct_count' && kind !== 'quantity') return 'inference_kind';
  }
  return undefined;
}

/** Every reading the proposal carries: the quantity, then each alternative. */
function proposedReadings(proposal: CandidateProposal): readonly Quantity[] {
  return proposal.quantity === undefined ? [] : [proposal.quantity, ...(proposal.alternatives ?? [])];
}

/** A reading of the excerpt matches a proposed reading: the same value, and the same unit (a bare number for a count). */
function readingMatches(reading: QuantityReading, proposed: Quantity, field: FieldDefinition): boolean {
  if (reading.value !== proposed.value) return false;
  if (reading.unit === proposed.unit) return true;
  return reading.unit === null && field.kind === 'count' && proposed.unit === 'count';
}

/** A stated qualifier key, or undefined for none: absent, blank or `unknown` (rule 8, basis `unknown`). */
function qualifierKey(qualifier: string | undefined): string | undefined {
  return qualifier === undefined || qualifier.trim() === '' || qualifier === UNKNOWN_QUALIFIER ? undefined : qualifier;
}

/** A number token that bears a proposed quantity: its readings, how it is written, the qualifier the excerpt states, and where. */
interface Bearing extends TokenReading {
  readonly qualifier: string | undefined;
  /** The place of the excerpt the token was read in. */
  readonly span: Span;
}

/**
 * Check 5 for a quantity in one entry: the whole number tokens of the located text inside the excerpt whose readings
 * hold the proposed quantity and each proposed alternative (`reads`), and among them those with a qualifier the
 * excerpt states that is the proposal's (or, when the proposal names none, one the field registers), or none
 * (`bearings`).
 */
function quantityBearings(proposal: CandidateProposal, spans: readonly Span[], context: ProposalContext): { readonly reads: boolean; readonly bearings: Bearing[] } {
  const quantity = proposal.quantity;
  const bearings: Bearing[] = [];
  if (quantity === undefined) return { reads: false, bearings };
  const proposed = qualifierKey(quantity.qualifier);
  const group = qualifierWordsFor(context.field, proposed);
  const registered = context.field.qualifiers ?? [];
  let reads = false;
  for (const span of spans) {
    for (const { token, labelStart } of tokensIn(span)) {
      const read = readToken(span, token, context);
      if (!proposedReadings(proposal).every((reading) => read.readings.some((found) => readingMatches(found, reading, context.field)))) continue;
      reads = true;
      const stated = statedQualifier(span.place, token, read.wordAfter, labelStart, group);
      if (stated !== undefined && (proposed === undefined ? !registered.includes(stated) : proposed !== stated)) continue;
      bearings.push({ ...read, qualifier: stated, span });
    }
  }
  return { reads, bearings };
}

/**
 * Whether the spans hold any digit: a count cited to them may be derived from the numbers written there (rule 1,
 * "Sums, products, ratios, scale readings, and any quantity derived from other quantities are never produced by the
 * AI"), so it is a direct count only when the proposal names it one.
 */
function holdsDigits(spans: readonly Span[]): boolean {
  return spans.some((span) => /\d/u.test(span.place.text.slice(span.start, span.end)));
}

/** Negations as Romanian and English write them, after normalisation ("nu este un hotel", "not a hotel"). */
const NEGATIONS: ReadonlySet<string> = new Set(['nu', 'nici', 'niciun', 'nicio', 'fara', 'non', 'not', 'no', 'never', 'without', 'neither', 'nor']);
/** How many words before a mention a negation governs it, within its clause. */
const NEGATION_REACH = 5;

/**
 * Each whole-word mention of a choice's option word in a span (the key, with "_" read as a space), and whether a
 * negation governs it: one of the few words before it in its clause, read in the located text, so an excerpt that
 * leaves the negation out still reads as negated.
 */
function optionMentions(choice: string, span: Span): { readonly negated: boolean }[] {
  const word = normaliseForExcerpt(choice.replace(/_/gu, ' ')).toLowerCase();
  const lower = span.place.text.toLowerCase();
  // Lower case keeps every place of normalised text, which has no combining marks; if it ever did not, no mention is read.
  if (word === '' || lower.length !== span.place.text.length) return [];
  return boundedOccurrences(word, { ...span.place, text: lower }, span.start, span.end).map((mention) => {
    const clause = lower.slice(0, mention.start).split(/[.;:!?,]/u).at(-1) ?? '';
    const words = clause.split(/[^\p{L}\p{N}]+/u).filter((part) => part !== '');
    return { negated: words.slice(-NEGATION_REACH).some((part) => NEGATIONS.has(part)) };
  });
}

/** Whether a span names the option with a mention no negation governs, read in its located text. */
function spanNamesChoice(choice: string, span: Span): boolean {
  return optionMentions(choice, span).some((mention) => !mention.negated);
}

/**
 * Whether a stored excerpt, read on its own, names a choice's option with a mention no negation governs (rule 3, "High
 * ('Likely'). Verified text evidence names the type"). This is the reading the value model can repeat from what is
 * stored (derive re-caps an inference against the evidence that remains, ./confidence.ts). Read on its own an excerpt
 * never sees more negations than its located text shows, so the verifier caps an inference below high when an entry
 * reads as naming the option only because its excerpt leaves the negation out.
 */
export function excerptNamesChoice(choice: string, excerpt: string): boolean {
  const [place] = placesOf(excerpt, false);
  return place !== undefined && spanNamesChoice(choice, { place, start: 0, end: place.text.length });
}

/**
 * Rule 1, "A direct count of symbols or items visible at the cited locations may be an `ai_inference` count": a
 * whole number of one or more, in the unit count, on a count field, with no alternative reading. Anything else an
 * inference cannot hold; a count of 0 needs a document, the owner or an engineer saying so ("Zero is a value").
 */
function isDirectCount(proposal: CandidateProposal, field: FieldDefinition): boolean {
  const quantity = proposal.quantity;
  if (quantity === undefined) return true;
  return (
    field.kind === 'count' &&
    quantity.unit === 'count' &&
    Number.isInteger(quantity.value) &&
    quantity.value >= 1 &&
    (proposal.alternatives === undefined || proposal.alternatives.length === 0)
  );
}

const CONFIDENCE_ORDER: readonly Confidence[] = ['low', 'medium', 'high'];

/** The lower of two confidences. */
function lowerOf(a: Confidence, b: Confidence): Confidence {
  return CONFIDENCE_ORDER.indexOf(a) <= CONFIDENCE_ORDER.indexOf(b) ? a : b;
}

/** The quantity as code sets it for a value written literally (rule 8): every reading, the approximate word, the stated qualifier. */
function writtenQuantity(quantity: Quantity, bearings: readonly Bearing[]): { readonly quantity: Quantity; readonly alternatives?: readonly Quantity[]; readonly original?: OriginalText } {
  const qualifier = bearings.find((bearing) => bearing.qualifier !== undefined)?.qualifier;
  const approximate = bearings.some((bearing) => bearing.approximate);
  const shaped = (value: number): Quantity => ({
    value,
    unit: quantity.unit,
    ...(qualifier === undefined ? {} : { qualifier }),
    ...(approximate ? { approximate: true } : {}),
  });
  const values: number[] = [quantity.value];
  for (const bearing of bearings) for (const reading of bearing.readings) if (!values.includes(reading.value)) values.push(reading.value);
  const written = bearings[0]?.written;
  return {
    quantity: shaped(quantity.value),
    ...(values.length >= 2 ? { alternatives: values.map(shaped) } : {}),
    ...(written === undefined || written === '' ? {} : { original: { text: written } }),
  };
}

// ---------------------------------------------------------------------------
// The locator's shape (2.4 Evidence.locator; G1-13)
// ---------------------------------------------------------------------------

const LOCATOR_KEYS: ReadonlySet<string> = new Set(EVIDENCE_LOCATOR_KEYS);
/** Keys that name an IFC locator or a part of one, as the extraction contract's x-ifc-locator-keys lists them. */
const IFC_KEY = /^(?:ifc|globalids?|guid|stepids?|step|path)$/iu;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The domain's floor of the strict locator check: the keys and types 2.4 names, nothing else. */
export function locatorShapeProblem(input: unknown): LocatorProblem | undefined {
  if (!isRecord(input)) return 'shape';
  const keys = Object.keys(input);
  if (keys.some((key) => IFC_KEY.test(key))) return 'ifc_field';
  if (keys.some((key) => !LOCATOR_KEYS.has(key))) return 'unknown_key';
  const { page, sheet, cell, bbox } = input;
  if (page !== undefined && !(typeof page === 'number' && Number.isInteger(page) && page >= 1)) return 'shape';
  if (sheet !== undefined && !(typeof sheet === 'string' && sheet.trim() !== '')) return 'shape';
  if (cell !== undefined && !(typeof cell === 'string' && cell.trim() !== '')) return 'shape';
  if (page !== undefined && sheet !== undefined) return 'shape';
  if (page === undefined && sheet === undefined) return 'shape';
  if (cell !== undefined && sheet === undefined) return 'shape';
  if (bbox !== undefined) {
    if (!Array.isArray(bbox) || bbox.length !== 4 || !bbox.every((part) => typeof part === 'number' && Number.isFinite(part))) return 'shape';
    const [x0, y0, x1, y1] = bbox as readonly number[];
    if (x0 === undefined || y0 === undefined || x1 === undefined || y1 === undefined || x0 > x1 || y0 > y1) return 'shape';
    if (page === undefined) return 'shape';
  }
  return undefined;
}

function parsedLocator(input: unknown, parser: LocatorParser | undefined): LocatorParse {
  const floor = locatorShapeProblem(input);
  if (floor !== undefined) return { ok: false, problem: floor };
  if (parser === undefined) return { ok: true, locator: input as EvidenceLocator };
  return parser(input);
}

// ---------------------------------------------------------------------------
// The verifier
// ---------------------------------------------------------------------------

/**
 * Verifies one proposal (see the module comment). A call with no proposal, or with no
 * context, reaches the harness probe (see {@link verifyProposalNotImplemented}); the
 * TypeScript signature never allows either.
 */
export const verifyProposal: VerifyProposal = (proposal, context) => {
  if ((proposal as CandidateProposal | undefined) === undefined || !isProposalContext(context)) return verifyProposalNotImplemented();
  const rejected = (rejection: ProposalRejection, type: GuardrailEventType, reason: string): ProposalVerdict => ({
    outcome: 'rejected',
    rejection,
    guardrailEvents: [{ type, projectId: context.projectId, subjectId: proposal.subjectId, fieldKey: proposal.fieldKey, reason }],
  });
  const checkFailed = (check: EvidenceCheckName, evidenceIndex: number, locatorProblem?: LocatorProblem): ProposalVerdict =>
    rejected(
      { kind: 'evidence_check_failed', check, evidenceIndex, ...(locatorProblem === undefined ? {} : { locatorProblem }) },
      'evidence_not_found',
      locatorProblem === undefined ? check : `${check}.${locatorProblem}`,
    );
  const refused = (kind: 'inferred_quantity_not_direct_count' | 'choice_negated' | 'text_not_written'): ProposalVerdict =>
    rejected({ kind }, 'ai_output_rejected', kind);

  const evidence: unknown = proposal.evidence;
  const entries: readonly ProposedEvidence[] = Array.isArray(evidence) ? (evidence as readonly ProposedEvidence[]) : [];

  // Check 1 first, on every entry, before anything is read of the proposal: another
  // project's document is never read further (rule 13; G13-1).
  for (const [index, entry] of entries.entries()) {
    const record = isRecord(entry) && typeof entry.documentId === 'string' ? context.document(entry.documentId) : undefined;
    if (record === undefined || record.projectId !== context.projectId) return checkFailed('document_in_project', index);
  }

  const shape = shapeProblem(proposal, context.field);
  if (shape !== undefined) return rejected({ kind: 'malformed', problem: shape }, 'ai_output_rejected', `proposal_${shape}`);
  if (entries.length === 0) return rejected({ kind: 'no_evidence' }, 'evidence_not_found', 'no_evidence');

  // Check 2: the content hash matches the stored revision.
  for (const [index, entry] of entries.entries()) {
    const record = context.document(entry.documentId);
    if (record === undefined || typeof entry.contentHash !== 'string' || entry.contentHash !== record.contentHash) {
      return checkFailed('content_hash_matches', index);
    }
  }

  // Check 3: the locator's strict shape, then the place in the stored text.
  const located: { readonly locator: EvidenceLocator; readonly places: readonly Place[]; readonly check: EvidenceMatch }[] = [];
  for (const [index, entry] of entries.entries()) {
    const parse = parsedLocator(entry.locator, context.parseLocator);
    if (!parse.ok) return checkFailed('locator_exists', index, parse.problem);
    const at = context.textAt(entry.documentId, entry.contentHash, parse.locator);
    if (at === undefined) return checkFailed('locator_exists', index);
    const wholeSheet = parse.locator.sheet !== undefined && parse.locator.cell === undefined;
    located.push({ locator: parse.locator, places: placesOf(at.text, wholeSheet), check: at.layer === 'ocr' ? 'ocr_match' : 'text_match' });
  }

  // Check 4: the excerpt occurs at that place, on token boundaries.
  const spans: Span[][] = [];
  for (const [index, entry] of entries.entries()) {
    const place = located[index];
    const found = place === undefined || typeof entry.excerpt !== 'string' ? [] : excerptSpans(entry.excerpt, place.places);
    if (found.length === 0) return checkFailed('excerpt_at_locator', index);
    spans.push(found);
  }
  const allSpans = spans.flat();

  // Check 5 decides the source: `document` only for a value that parses from every excerpt itself.
  const quantity = proposal.quantity;
  const choice = proposal.choice;
  const text = proposal.text;
  let source: ProposedSource = 'ai_inference';
  let written: ReturnType<typeof writtenQuantity> | undefined;
  let writtenText: string | undefined;
  /** Per entry: the place of its excerpt whose text is stored (2.4 "verbatim"): the one that bears the value, else the first. */
  const cited: (Span | undefined)[] = spans.map((entrySpans) => entrySpans[0]);
  /** Per entry: whether it names the chosen option with a mention no negation governs, read in its located text. */
  let names: readonly boolean[] = spans.map(() => false);
  if (quantity !== undefined && proposal.source === 'document') {
    const found = spans.map((entrySpans) => quantityBearings(proposal, entrySpans, context));
    const missing = found.findIndex((entry) => entry.bearings.length === 0);
    if (missing === -1) {
      source = 'document';
      written = writtenQuantity(quantity, found.flatMap((entry) => entry.bearings));
      for (const [index, entry] of found.entries()) cited[index] = entry.bearings[0]?.span ?? cited[index];
    } else if (found.some((entry) => entry.reads)) {
      // Written in one excerpt, but not in every one, or under another qualifier than the one it states: a
      // `document` value whose evidence does not all bear it (padding), or a fact the field does not hold.
      return checkFailed('value_in_excerpt', missing);
    }
  } else if (choice !== undefined) {
    const mentions = allSpans.flatMap((span) => optionMentions(choice, span));
    if (mentions.length > 0 && mentions.every((mention) => mention.negated)) return refused('choice_negated');
    names = spans.map((entrySpans) => entrySpans.some((span) => spanNamesChoice(choice, span)));
    for (const [index, entrySpans] of spans.entries()) cited[index] = entrySpans.find((span) => spanNamesChoice(choice, span)) ?? cited[index];
    const labelValue = context.labelValue;
    if (
      proposal.source === 'document' &&
      labelValue !== undefined &&
      spans.every((entrySpans) => entrySpans.some((span) => labelValue(choice, span.place.text.slice(span.start, span.end))))
    ) {
      source = 'document';
    }
  } else if (text !== undefined) {
    const needle = normaliseForExcerpt(text);
    const occurrences = spans.map((entrySpans) => entrySpans.flatMap((span) => boundedOccurrences(needle, span.place, span.start, span.end)));
    const [first] = occurrences.flat();
    if (proposal.source === 'document') {
      if (first === undefined || !occurrences.every((found) => found.length > 0)) return refused('text_not_written');
      source = 'document';
      writtenText = writtenSlice(first.place, first.start, first.end);
      for (const [index, entrySpans] of spans.entries()) {
        cited[index] = entrySpans.find((span) => boundedOccurrences(needle, span.place, span.start, span.end).length > 0) ?? cited[index];
      }
    }
  }
  const named = names.some(Boolean);

  // An inferred quantity: a direct count only, and one named so when its excerpts hold digits (rule 1).
  if (source === 'ai_inference' && quantity !== undefined) {
    if (!isDirectCount(proposal, context.field)) return refused('inferred_quantity_not_direct_count');
    if (proposal.inference === undefined ? holdsDigits(allSpans) : proposal.inference !== 'direct_count') {
      return refused('inferred_quantity_not_direct_count');
    }
  }

  // 2.4: the excerpt is stored verbatim, as the located text writes it (its diacritics, case and spacing): the place
  // check 4 matched, never the proposer's copy of it, which matched only after normalisation.
  // (Check 4 found a place for every entry, so each has one.)
  const verified: Evidence[] = entries.map((entry, index) => {
    const span = cited[index];
    return {
      documentId: entry.documentId,
      contentHash: entry.contentHash,
      locator: located[index]?.locator ?? entry.locator,
      excerpt: span === undefined ? entry.excerpt : writtenSlice(span.place, span.start, span.end),
      check: located[index]?.check ?? 'unverifiable',
    };
  });
  // Rule 3: unverifiable evidence caps at low; high only where an excerpt names the chosen option; otherwise medium.
  // An inference keeps the confidence it claimed, under the cap, or low when it claimed none; a choice claimed as
  // written, whose excerpt names it, takes the tier its evidence gives (section 4: "Likely only if a document named
  // the building type"). The cap must hold again from what is stored, entry by entry, when some of the evidence is
  // later removed (2.3; derive re-caps from the evidence that remains, ./confidence.ts): an entry whose stored excerpt
  // reads as naming the option only because it leaves out the negation its located text writes would read higher on
  // its own than it is, so such an entry keeps the inference below high.
  const hidesNegation = choice !== undefined && verified.some((entry, index) => excerptNamesChoice(choice, entry.excerpt) && names[index] !== true);
  const cap: Confidence = verified.some((entry) => entry.check === 'unverifiable') ? 'low' : named && !hidesNegation ? 'high' : 'medium';
  const claimed: Confidence = proposal.confidence ?? (proposal.source === 'document' && named ? 'high' : 'low');
  const confidence: Confidence | undefined = source === 'ai_inference' ? lowerOf(claimed, cap) : written?.alternatives === undefined ? undefined : 'low';
  const inference: ProposedInference | undefined =
    source === 'ai_inference' ? (quantity !== undefined ? 'direct_count' : proposal.inference) : undefined;
  const inferredQuantity: Quantity | undefined =
    quantity === undefined ? undefined : { value: quantity.value, unit: quantity.unit, ...(quantity.qualifier === undefined ? {} : { qualifier: quantity.qualifier }) };
  const storedQuantity = written?.quantity ?? inferredQuantity;
  const storedText = writtenText ?? text;

  const candidate: Candidate = {
    id: context.candidateId,
    subjectId: proposal.subjectId,
    fieldKey: proposal.fieldKey,
    ...(storedQuantity === undefined ? {} : { quantity: storedQuantity }),
    ...(choice === undefined ? {} : { choice }),
    ...(storedText === undefined ? {} : { text: storedText }),
    ...(written?.alternatives === undefined ? {} : { alternatives: written.alternatives }),
    source,
    evidence: verified,
    ...(written?.original === undefined ? {} : { original: written.original }),
    ...(confidence === undefined ? {} : { confidence }),
    createdBy: context.createdBy,
    createdAt: context.createdAt,
  };
  return { outcome: 'accepted', candidate, ...(inference === undefined ? {} : { inference }), guardrailEvents: [] };
};
