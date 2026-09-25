/**
 * The one reserved-term list of docs/guardrails.md 2.8, English and Romanian,
 * and its matcher: whole word, ignoring case and diacritics, multi-word terms
 * across any whitespace or one hyphen or dash ("firm-price" is "firm price").
 * The copy check (tools/checks/reserved-terms), the AI
 * output validator and the render and export scans all read this module.
 *
 * The lists below repeat 2.8 character for character, in its order. The copy
 * check fails when they drift from docs/guardrails.md, because removing a term
 * is a loosening (guardrails section 10).
 *
 * Reserved terms may appear only in the places 2.8 names. Those places are
 * expressed as typed allowance entries (action labels, badges, status lines,
 * generated sentences built from stored state, registry qualifier labels) or as
 * the typed context of verbatim document text. There is no free-text exemption
 * list and no exemption by file path. Since the phase 1 review an allowance also
 * holds in fewer places: in source only inside the copy registries that define
 * its text (the same text elsewhere is flagged); its slots take typed values
 * (a date, a number), never words; and the stage 3 label holds only with a
 * stored quotation record (ADR 0011, phase 1 review amendment).
 */

import { COPY_ALLOWANCES } from './copy/allowances';

/** English terms, as docs/guardrails.md 2.8 lists them. */
export const RESERVED_TERMS_EN = [
  'confirmed',
  'verified',
  'exact',
  'precise',
  'guaranteed',
  'will save',
  'will reduce',
  'certified',
  'compliant',
  'complies',
  'meets',
  'conforms',
  'in line with',
  'achieves class',
  'final',
  'definitive',
  'binding',
  'firm price',
  'quote',
  'quotation',
  'offer',
] as const;

/** Romanian terms, as docs/guardrails.md 2.8 lists them. */
export const RESERVED_TERMS_RO = [
  'confirmat',
  'verificat',
  'exact',
  'garantat',
  'certificat',
  'conform',
  'conformitate',
  'în conformitate cu',
  'final',
  'definitiv',
  'ofertă',
  'ofertă fermă',
  'cotație',
  'deviz',
] as const;

export type ReservedTermLanguage = 'en' | 'ro';
export type ReservedTerm = (typeof RESERVED_TERMS_EN)[number] | (typeof RESERVED_TERMS_RO)[number];

export interface ReservedTermEntry {
  /** The term as 2.8 spells it. */
  readonly term: ReservedTerm;
  /** The lists that hold it; two terms are on both lists. */
  readonly languages: readonly ReservedTermLanguage[];
}

/** Every term once, with the lists that hold it. */
export const RESERVED_TERMS: readonly ReservedTermEntry[] = buildEntries();

function buildEntries(): ReservedTermEntry[] {
  const byTerm = new Map<ReservedTerm, ReservedTermLanguage[]>();
  for (const term of RESERVED_TERMS_EN) byTerm.set(term, ['en']);
  for (const term of RESERVED_TERMS_RO) byTerm.set(term, [...(byTerm.get(term) ?? []), 'ro']);
  return [...byTerm].map(([term, languages]) => Object.freeze({ term, languages: Object.freeze(languages) }));
}

// ---------------------------------------------------------------------------
// Folding: the text both sides are compared in.

interface Folded {
  /** Lower case, no combining marks, compatibility forms decomposed, whitespace as ' '. */
  readonly text: string;
  /** For each UTF-16 unit of `text`: where its source character starts in the original. */
  readonly start: readonly number[];
  /** For each UTF-16 unit of `text`: where its source character ends in the original. */
  readonly end: readonly number[];
}

const MARKS = /\p{M}/gu;
const FORMAT_CHARACTERS = /\p{Cf}/u;
const WHITESPACE = /^\s$/u;

function foldCharacter(character: string): string {
  if (WHITESPACE.test(character)) return ' ';
  if (FORMAT_CHARACTERS.test(character)) return '';
  const once = character.normalize('NFKD').replace(MARKS, '').toLowerCase();
  // Lower-casing can bring a mark back (U+0130 becomes i plus a dot above).
  return once.normalize('NFKD').replace(MARKS, '');
}

/**
 * Folds `text` for matching: case, diacritics (including the cedilla and
 * comma-below forms of s and t), compatibility forms such as ligatures, soft
 * hyphens and zero-width characters, and whitespace. Keeps a map back to the
 * original positions.
 */
function fold(text: string): Folded {
  let folded = '';
  const start: number[] = [];
  const end: number[] = [];
  let position = 0;
  for (const character of text) {
    const piece = foldCharacter(character);
    for (let unit = 0; unit < piece.length; unit += 1) {
      start.push(position);
      end.push(position + character.length);
    }
    folded += piece;
    position += character.length;
  }
  return { text: folded, start, end };
}

/** The folded form of a term or copy unit, with runs of whitespace as one space. */
export function foldForMatching(text: string): string {
  return fold(text).text.replace(/ +/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Matching.

const WORD_CHARACTER = String.raw`[\p{L}\p{N}_]`;

interface CompiledTerm {
  readonly entry: ReservedTermEntry;
  readonly source: string;
}

function escapeForRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * What may stand between the words of a multi-word term: a run of spaces (any
 * whitespace folds to a space), or one hyphen or dash with no space around it,
 * so a hyphenated spelling such as "firm-price" or "in-line-with" is the same
 * term. A dash with spaces around it separates clauses and does not join words.
 */
const WORD_JOINER = String.raw`(?: +|[\-‐‑‒–—])`;

const COMPILED: readonly CompiledTerm[] = RESERVED_TERMS.map((entry) => ({
  entry,
  source: foldForMatching(entry.term).split(' ').map(escapeForRegExp).join(WORD_JOINER),
}))
  // Longest first, so an overlapping shorter term never hides a longer one.
  .sort((left, right) => right.source.length - left.source.length);

const MATCHER = new RegExp(
  `(?<!${WORD_CHARACTER})(?:${COMPILED.map((compiled) => `(${compiled.source})`).join('|')})(?!${WORD_CHARACTER})`,
  'gu',
);

export interface ReservedTermMatch {
  /** The term as 2.8 spells it. */
  readonly term: ReservedTerm;
  readonly languages: readonly ReservedTermLanguage[];
  /** UTF-16 offset of the match in the text that was scanned. */
  readonly index: number;
  /** UTF-16 length of the match in the text that was scanned. */
  readonly length: number;
  /** The matched text as written. */
  readonly text: string;
}

/**
 * Every reserved term in `text`, whole word, ignoring case and diacritics.
 * Where terms overlap, the longest is reported once. Allowances are not
 * applied here: use `scanCopy` for copy.
 */
export function findReservedTerms(text: string): ReservedTermMatch[] {
  const folded = fold(text);
  const matches: ReservedTermMatch[] = [];
  MATCHER.lastIndex = 0;
  for (let found = MATCHER.exec(folded.text); found !== null; found = MATCHER.exec(folded.text)) {
    const group = found.findIndex((value, position) => position > 0 && value !== undefined);
    const compiled = COMPILED[group - 1];
    const first = found.index;
    const last = found.index + found[0].length - 1;
    const index = folded.start[first];
    const stop = folded.end[last];
    if (compiled === undefined || index === undefined || stop === undefined) continue;
    matches.push({
      term: compiled.entry.term,
      languages: compiled.entry.languages,
      index,
      length: stop - index,
      text: text.slice(index, stop),
    });
  }
  return matches;
}

// ---------------------------------------------------------------------------
// Allowances: the places 2.8 allows, as typed entries.

/**
 * The stored records an allowance can be bound to. `quotation_record`: rule 10's stage 3
 * ("Stage 3 is derived, not passed. It comes from a stored quotation record"; "Templates
 * read the stage from the record"), which 2.8 allows as "Formal quotation" at stage 3 only.
 */
export const ALLOWANCE_RECORDS = ['quotation_record'] as const;
export type AllowanceRecord = (typeof ALLOWANCE_RECORDS)[number];

/**
 * One place where 2.8 allows a reserved term. Later phases build these from
 * their registries (actions, badges, status lines, sentence templates, field
 * qualifiers) and add them to REGISTERED_ALLOWANCE_ENTRIES. Verbatim document
 * text is not an entry: it is the `verbatim_document_text` context of `scanCopy`.
 */
export type ReservedTermAllowance =
  /** An action label, such as a button. */
  | { readonly kind: 'action_label'; readonly actionId: string; readonly label: string }
  /** A badge label from the 2.8 badge table. */
  | { readonly kind: 'badge'; readonly badgeId: string; readonly label: string }
  /**
   * A status line or stage label from the 2.8 status-line table; `{name}` marks a typed slot.
   * `requiresRecord` binds it to copy derived from that stored record: set on the stage 3
   * label, which then holds only where a stored quotation record is named (rule 10).
   */
  | { readonly kind: 'status_line'; readonly statusLineId: string; readonly text: string; readonly requiresRecord?: AllowanceRecord }
  /** A sentence the app builds from stored state; `{name}` marks a typed slot. */
  | {
      readonly kind: 'generated_sentence';
      readonly templateId: string;
      readonly template: string;
      /** The stored state the sentence is built from, for example an event type. */
      readonly readsStoredState: readonly string[];
    }
  /** A registry qualifier label, such as the label of an energy qualifier. */
  | { readonly kind: 'qualifier_label'; readonly fieldKey: string; readonly qualifier: string; readonly label: string };

export type ReservedTermAllowanceKind = ReservedTermAllowance['kind'];

/** The closed set of allowance kinds, and the fields each one carries. */
const ALLOWANCE_FIELDS: Readonly<Record<ReservedTermAllowanceKind, { id: string; copy: string; strings: readonly string[] }>> = {
  action_label: { id: 'actionId', copy: 'label', strings: ['actionId', 'label'] },
  badge: { id: 'badgeId', copy: 'label', strings: ['badgeId', 'label'] },
  status_line: { id: 'statusLineId', copy: 'text', strings: ['statusLineId', 'text'] },
  generated_sentence: { id: 'templateId', copy: 'template', strings: ['templateId', 'template'] },
  qualifier_label: { id: 'fieldKey', copy: 'label', strings: ['fieldKey', 'qualifier', 'label'] },
};

/** The kinds whose copy may hold `{slot}` placeholders, each filled from stored state by type. */
const TEMPLATE_KINDS: ReadonlySet<ReservedTermAllowanceKind> = new Set(['status_line', 'generated_sentence']);

export const ALLOWANCE_KINDS: readonly ReservedTermAllowanceKind[] = Object.freeze(
  Object.keys(ALLOWANCE_FIELDS) as ReservedTermAllowanceKind[],
);

/**
 * The type of each slot name an allowance template may hold (a closed list). A slot
 * is filled from stored state, so its text must read as its type and nothing else:
 * a `date` slot takes a calendar date as the app writes one ("12 Oct", "25 Sep 2026",
 * "2026-09-25"; 2.8's "on 12 Oct" and the render allowlist's "D MMM YYYY"); a
 * `number` slot takes digits with their separators (the equipment and page counts
 * of 2.8's status lines). A word
 * never fills either. Adding a slot name or a type accepts more text: list it for the
 * approver with the phase that needs it (ADR 0011, phase 1 review amendment).
 */
export const SLOT_TYPES: Readonly<Record<string, 'date' | 'number'>> = Object.freeze({
  date: 'date',
  count: 'number',
  analysed: 'number',
  total: 'number',
});

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

const SLOT_PATTERNS: Readonly<Record<'date' | 'number', string>> = {
  date: String.raw`\d{1,2} (?:${MONTHS.join('|')})(?: \d{4})?|\d{4}-\d{2}-\d{2}`,
  number: String.raw`\d+(?:[.,]\d+)*`,
};

/** Two-digit texts, "00" to "99". Dates are checked as text: numbers are read from text only by the rule 8 parser. */
const TWO_DIGITS: readonly string[] = Array.from({ length: 100 }, (_, index) => `${index < 10 ? '0' : ''}${index}`);
/** Two-digit texts that are multiples of 4, for leap years. */
const MULTIPLES_OF_FOUR: ReadonlySet<string> = new Set(TWO_DIGITS.filter((_, index) => index % 4 === 0));

/** Whether a four-digit year text is a leap year (Gregorian); no year: 29 Feb may exist. */
function isLeapYear(year: string | undefined): boolean {
  if (year === undefined) return true;
  const century = year.slice(0, 2);
  const within = year.slice(2);
  return within === '00' ? MULTIPLES_OF_FOUR.has(century) : MULTIPLES_OF_FOUR.has(within);
}

/** Whether `text`, which matched the date pattern, names a day the calendar has ("31 Feb" does not). */
function isCalendarDate(text: string): boolean {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(text);
  const written = /^(\d{1,2}) ([A-Z][a-z]{2})(?: (\d{4}))?$/u.exec(text);
  const year = iso?.[1] ?? written?.[3];
  // Month and day as positions in lists of their texts: 1 to 12, and 1 to 31.
  const month = iso === null ? MONTHS.indexOf((written?.[2] ?? '') as (typeof MONTHS)[number]) : TWO_DIGITS.indexOf(iso[2] ?? '') - 1;
  const dayText = iso?.[3] ?? written?.[1] ?? '';
  const day = TWO_DIGITS.indexOf(dayText.length === 1 ? `0${dayText}` : dayText);
  if (month < 0 || month > 11 || day < 1) return false;
  const lengths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const length = lengths[month];
  return length !== undefined && day <= length;
}

export class ReservedTermAllowanceError extends Error {
  readonly problems: readonly string[];
  constructor(problems: readonly string[]) {
    super(`Invalid reserved-term allowances:\n- ${problems.join('\n- ')}`);
    this.name = 'ReservedTermAllowanceError';
    this.problems = problems;
  }
}

/** What a copy unit is known to come from, for the allowances bound to it. */
export interface AllowanceConditions {
  /**
   * The unit is text defined in a copy registry itself (packages/registry/src/copy/**),
   * where an allowance's own text is written: a slot may then hold its own placeholder
   * (`{date}`), and an allowance bound to a stored record holds as its definition.
   */
  readonly copyRegistry?: boolean;
  /** The id of the stored quotation record the unit is derived from (rule 10, stage 3), if any. */
  readonly quotationRecordId?: string;
}

export interface AllowanceSet {
  readonly entries: readonly ReservedTermAllowance[];
  /** The entry that allows `text` as a whole copy unit under these conditions, if any. */
  match(text: string, conditions?: AllowanceConditions): ReservedTermAllowance | undefined;
}

const PLACEHOLDER = /\{[^{}]*\}/g;

function canonical(text: string): string {
  return text.normalize('NFC').replace(/\s+/gu, ' ').trim();
}

function copyOf(entry: ReservedTermAllowance): string {
  switch (entry.kind) {
    case 'action_label':
    case 'badge':
    case 'qualifier_label':
      return entry.label;
    case 'status_line':
      return entry.text;
    case 'generated_sentence':
      return entry.template;
  }
}

function idOf(entry: ReservedTermAllowance): string {
  switch (entry.kind) {
    case 'action_label':
      return entry.actionId;
    case 'badge':
      return entry.badgeId;
    case 'status_line':
      return entry.statusLineId;
    case 'generated_sentence':
      return entry.templateId;
    case 'qualifier_label':
      return `${entry.fieldKey}:${entry.qualifier}`;
  }
}

/** The slot names of a template, in order. */
function slotNames(template: string): string[] {
  return [...template.matchAll(PLACEHOLDER)].map((match) => match[0].slice(1, -1));
}

function problemsOf(value: unknown, position: number): string[] {
  const where = `entry ${position + 1}`;
  if (typeof value !== 'object' || value === null) return [`${where} is not an object`];
  const record = value as Record<string, unknown>;
  const kind = record['kind'];
  if (typeof kind !== 'string' || !Object.hasOwn(ALLOWANCE_FIELDS, kind)) {
    return [`${where} has kind ${JSON.stringify(kind)}; the kinds are ${ALLOWANCE_KINDS.join(', ')}`];
  }
  const fields = ALLOWANCE_FIELDS[kind as ReservedTermAllowanceKind];
  const optional = kind === 'generated_sentence' ? ['readsStoredState'] : kind === 'status_line' ? ['requiresRecord'] : [];
  const allowedKeys = new Set(['kind', ...fields.strings, ...optional]);
  const problems: string[] = [];
  for (const key of Object.keys(record)) {
    if (!allowedKeys.has(key)) problems.push(`${where} (${kind}) has the unknown key "${key}"`);
  }
  for (const key of fields.strings) {
    const field = record[key];
    if (typeof field !== 'string' || field.trim() === '') problems.push(`${where} (${kind}) needs a non-empty "${key}"`);
  }
  if (kind === 'generated_sentence') {
    const reads = record['readsStoredState'];
    if (!Array.isArray(reads) || reads.length === 0 || !reads.every((item) => typeof item === 'string' && item.trim() !== '')) {
      problems.push(`${where} (generated_sentence) needs "readsStoredState": the stored state it is built from`);
    }
  }
  if ('requiresRecord' in record && !(ALLOWANCE_RECORDS as readonly unknown[]).includes(record['requiresRecord'])) {
    problems.push(`${where} (${kind}) has "requiresRecord" ${JSON.stringify(record['requiresRecord'])}; the records are ${ALLOWANCE_RECORDS.join(', ')}`);
  }
  if (problems.length > 0) return problems;
  const copy = record[fields.copy] as string;
  const template = TEMPLATE_KINDS.has(kind as ReservedTermAllowanceKind);
  const fixedText = template ? copy.replace(PLACEHOLDER, '\u0000') : copy;
  if (findReservedTerms(fixedText).length === 0) {
    problems.push(`${where} (${kind}) holds no reserved term in its fixed text, so it allows nothing: remove it`);
  }
  if (template) {
    for (const name of slotNames(copy)) {
      if (!Object.hasOwn(SLOT_TYPES, name)) {
        problems.push(`${where} (${kind}) has the slot {${name}}, which has no type; the typed slots are ${Object.keys(SLOT_TYPES).map((slot) => `{${slot}}`).join(', ')}`);
      }
    }
  }
  return problems;
}

/** A template with typed slots. `definitions`: a slot may also hold its own placeholder, as the copy registry writes it. */
interface TemplatePattern {
  readonly pattern: RegExp;
  readonly types: readonly ('date' | 'number')[];
}

function templatePattern(template: string, definitions: boolean): TemplatePattern {
  const text = canonical(template);
  const fixed = text.split(PLACEHOLDER).map(escapeForRegExp);
  const names = slotNames(text);
  const types = names.map((name) => SLOT_TYPES[name] ?? 'number');
  let source = fixed[0] ?? '';
  names.forEach((name, position) => {
    const typed = SLOT_PATTERNS[types[position] ?? 'number'];
    source += `(${definitions ? `${escapeForRegExp(`{${name}}`)}|` : ''}${typed})${fixed[position + 1] ?? ''}`;
  });
  return { pattern: new RegExp(`^${source}$`, 'u'), types };
}

/**
 * Whether a template covers a copy unit: the fixed text matches, each slot reads as its
 * type (a date slot as a calendar date, a number slot as digits; a word fills neither),
 * and no text filling a slot holds a reserved term itself. A slot is filled from stored
 * state, so a slot that carries "verified" or "firm price" would pass the allowance's
 * reserved term through a place 2.8 does not allow.
 */
function templateCovers(template: TemplatePattern, unit: string): boolean {
  const match = template.pattern.exec(unit);
  if (match === null) return false;
  return match.slice(1).every((slot, position) => {
    if (slot === undefined || findReservedTerms(slot).length > 0) return false;
    if (slot.startsWith('{')) return true;
    return template.types[position] !== 'date' || isCalendarDate(slot);
  });
}

/** Whether an entry's stored-record binding holds for these conditions. */
function recordHolds(entry: ReservedTermAllowance, conditions: AllowanceConditions): boolean {
  if (entry.kind !== 'status_line' || entry.requiresRecord === undefined) return true;
  if (conditions.copyRegistry === true) return true;
  return typeof conditions.quotationRecordId === 'string' && conditions.quotationRecordId.trim() !== '';
}

/**
 * Checks and freezes a list of allowance entries. Throws
 * ReservedTermAllowanceError when any entry is outside the closed set of kinds,
 * carries an unknown key or an empty field, allows nothing, holds a slot with no
 * type, names an unknown record, or repeats an id.
 */
export function createAllowanceSet(entries: readonly ReservedTermAllowance[]): AllowanceSet {
  const problems = entries.flatMap((entry, position) => problemsOf(entry, position));
  const seen = new Set<string>();
  if (problems.length === 0) {
    for (const entry of entries) {
      const key = `${entry.kind}:${idOf(entry)}`;
      if (seen.has(key)) problems.push(`${entry.kind} "${idOf(entry)}" is registered twice`);
      seen.add(key);
    }
  }
  if (problems.length > 0) throw new ReservedTermAllowanceError(problems);
  const frozen = Object.freeze(entries.map((entry) => Object.freeze({ ...entry })));
  const fixed = new Map<string, ReservedTermAllowance>();
  const templates: Array<{ shown: TemplatePattern; defined: TemplatePattern; entry: ReservedTermAllowance }> = [];
  for (const entry of frozen) {
    const copy = copyOf(entry);
    if (TEMPLATE_KINDS.has(entry.kind) && slotNames(copy).length > 0) {
      templates.push({ shown: templatePattern(copy, false), defined: templatePattern(copy, true), entry });
    } else {
      fixed.set(canonical(copy), entry);
    }
  }
  return Object.freeze({
    entries: frozen,
    match(text: string, conditions: AllowanceConditions = {}): ReservedTermAllowance | undefined {
      const unit = canonical(text);
      const exact = fixed.get(unit);
      if (exact !== undefined && recordHolds(exact, conditions)) return exact;
      return templates.find(
        (template) => recordHolds(template.entry, conditions) && templateCovers(conditions.copyRegistry === true ? template.defined : template.shown, unit),
      )?.entry;
    },
  });
}

/**
 * No allowance at all. The AI output validator (phase 2) scans AI-written text with
 * this set, never with the registered one: 2.8 flags reserved terms in "all AI-written
 * text", and the app, not the AI, builds every badge, status line and generated
 * sentence from stored state (rules 2, 11 and 14).
 */
export const NO_ALLOWANCES: AllowanceSet = createAllowanceSet([]);

/**
 * The allowances the registries register, each built from its registry entry.
 * Phase 1 registers the texts of the badge, status-line and generated-sentence
 * registries that hold a reserved term (./copy/allowances.ts), each word for word
 * a text 2.8 lists for its kind (ADR 0011). The source scan applies them only to
 * copy inside the copy registries (tools/checks/reserved-terms, COPY_REGISTRIES);
 * the render check only to marked copy the screen was served; the AI output
 * validator never (NO_ALLOWANCES).
 */
export const REGISTERED_ALLOWANCE_ENTRIES: readonly ReservedTermAllowance[] = COPY_ALLOWANCES;

let registered: AllowanceSet | undefined;

/** REGISTERED_ALLOWANCE_ENTRIES as a checked set. Throws when an entry is invalid. */
export function registeredAllowances(): AllowanceSet {
  registered ??= createAllowanceSet(REGISTERED_ALLOWANCE_ENTRIES);
  return registered;
}

// ---------------------------------------------------------------------------
// Scanning copy.

/** Where a piece of text comes from. */
export type CopyContext =
  /** App copy, AI-written text, exports: reserved terms are flagged unless an allowance covers the whole unit. */
  | { readonly kind: 'copy' }
  /**
   * Text defined in a copy registry (packages/registry/src/copy/**): an allowance's own text as
   * its registry writes it, slots as `{name}` included. Only the source scan of the copy
   * registries uses it.
   */
  | { readonly kind: 'copy_registry' }
  /** Verbatim document text shown with its source, such as an evidence excerpt or original text. */
  | { readonly kind: 'verbatim_document_text'; readonly documentId: string; readonly contentHash: string };

export interface ScanCopyOptions {
  readonly allowances: AllowanceSet;
  readonly context?: CopyContext;
  /**
   * The stored quotation record the unit is derived from, when it is (rule 10, stage 3).
   * An allowance bound to that record ("Formal quotation") holds only when it is named.
   */
  readonly quotationRecordId?: string;
}

/**
 * The reserved terms that `text`, one copy unit, may not carry. Empty when the
 * unit is verbatim document text or a registered allowance covers it whole.
 */
export function scanCopy(text: string, options: ScanCopyOptions): ReservedTermMatch[] {
  const context = options.context ?? { kind: 'copy' };
  if (context.kind === 'verbatim_document_text') {
    if (context.documentId.trim() === '' || context.contentHash.trim() === '') {
      throw new TypeError('Verbatim document text needs the document id and the content hash it was read from.');
    }
    return [];
  }
  const conditions: AllowanceConditions = {
    copyRegistry: context.kind === 'copy_registry',
    ...(options.quotationRecordId === undefined ? {} : { quotationRecordId: options.quotationRecordId }),
  };
  if (options.allowances.match(text, conditions) !== undefined) return [];
  return findReservedTerms(text);
}

// ---------------------------------------------------------------------------
// Reading the lists from docs/guardrails.md, for the drift check.

/**
 * Reads the English and Romanian lists from the "Reserved terms" part of
 * docs/guardrails.md 2.8, as written there. Throws when either line is missing.
 */
export function parseGuardrailsReservedTerms(markdown: string): { en: string[]; ro: string[] } {
  const heading = markdown.indexOf('**Reserved terms.**');
  if (heading < 0) throw new Error('docs/guardrails.md has no "**Reserved terms.**" part.');
  const part = markdown.slice(heading, heading + 3000);
  const read = (label: string): string[] => {
    const line = new RegExp(`^\\s*-\\s*${label}:\\s*(.+)$`, 'mu').exec(part);
    const list = line?.[1];
    if (list === undefined) throw new Error(`docs/guardrails.md 2.8 has no "${label}:" list line.`);
    return list
      .trim()
      .replace(/\.$/u, '')
      .split(',')
      .map((term) => term.trim());
  };
  return { en: read('English'), ro: read('Romanian') };
}
