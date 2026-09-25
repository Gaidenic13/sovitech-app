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
 * list and no exemption by file path.
 */

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
  /** A status line or stage label from the 2.8 status-line table. */
  | { readonly kind: 'status_line'; readonly statusLineId: string; readonly text: string }
  /** A sentence the app builds from stored state; `{name}` marks a filled slot. */
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

export const ALLOWANCE_KINDS: readonly ReservedTermAllowanceKind[] = Object.freeze(
  Object.keys(ALLOWANCE_FIELDS) as ReservedTermAllowanceKind[],
);

export class ReservedTermAllowanceError extends Error {
  readonly problems: readonly string[];
  constructor(problems: readonly string[]) {
    super(`Invalid reserved-term allowances:\n- ${problems.join('\n- ')}`);
    this.name = 'ReservedTermAllowanceError';
    this.problems = problems;
  }
}

export interface AllowanceSet {
  readonly entries: readonly ReservedTermAllowance[];
  /** The entry that allows `text` as a whole copy unit, if any. */
  match(text: string): ReservedTermAllowance | undefined;
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

function problemsOf(value: unknown, position: number): string[] {
  const where = `entry ${position + 1}`;
  if (typeof value !== 'object' || value === null) return [`${where} is not an object`];
  const record = value as Record<string, unknown>;
  const kind = record['kind'];
  if (typeof kind !== 'string' || !Object.hasOwn(ALLOWANCE_FIELDS, kind)) {
    return [`${where} has kind ${JSON.stringify(kind)}; the kinds are ${ALLOWANCE_KINDS.join(', ')}`];
  }
  const fields = ALLOWANCE_FIELDS[kind as ReservedTermAllowanceKind];
  const allowedKeys = new Set(['kind', ...fields.strings, ...(kind === 'generated_sentence' ? ['readsStoredState'] : [])]);
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
  if (problems.length > 0) return problems;
  const copy = record[fields.copy] as string;
  const fixedText = kind === 'generated_sentence' ? copy.replace(PLACEHOLDER, '\u0000') : copy;
  if (findReservedTerms(fixedText).length === 0) {
    problems.push(`${where} (${kind}) holds no reserved term in its fixed text, so it allows nothing: remove it`);
  }
  return problems;
}

function templatePattern(template: string): RegExp {
  const parts = canonical(template).split(PLACEHOLDER).map(escapeForRegExp);
  return new RegExp(`^${parts.join('.+?')}$`, 'su');
}

/**
 * Checks and freezes a list of allowance entries. Throws
 * ReservedTermAllowanceError when any entry is outside the closed set of kinds,
 * carries an unknown key or an empty field, allows nothing, or repeats an id.
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
  const templates: Array<{ pattern: RegExp; entry: ReservedTermAllowance }> = [];
  for (const entry of frozen) {
    if (entry.kind === 'generated_sentence') templates.push({ pattern: templatePattern(entry.template), entry });
    else fixed.set(canonical(copyOf(entry)), entry);
  }
  return Object.freeze({
    entries: frozen,
    match(text: string): ReservedTermAllowance | undefined {
      const unit = canonical(text);
      return fixed.get(unit) ?? templates.find((template) => template.pattern.test(unit))?.entry;
    },
  });
}

/** No allowance at all. */
export const NO_ALLOWANCES: AllowanceSet = createAllowanceSet([]);

/**
 * The allowances later phases register, each built from its registry entry.
 * Phase 0 registers none.
 */
export const REGISTERED_ALLOWANCE_ENTRIES: readonly ReservedTermAllowance[] = [];

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
  /** Verbatim document text shown with its source, such as an evidence excerpt or original text. */
  | { readonly kind: 'verbatim_document_text'; readonly documentId: string; readonly contentHash: string };

export interface ScanCopyOptions {
  readonly allowances: AllowanceSet;
  readonly context?: CopyContext;
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
  if (options.allowances.match(text) !== undefined) return [];
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
