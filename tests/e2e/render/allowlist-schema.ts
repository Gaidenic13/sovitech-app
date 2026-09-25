/**
 * Validation of the render allowlist (tests/e2e/render/allowlist.ts). The render check
 * refuses to run on an allowlist that fails it, and tools/checks/render runs it in
 * `pnpm checks`, with seeded bad allowlists in its self-test.
 *
 * What it holds the file to (docs/adr/0006-render-test.md):
 * - only rule 2's four categories, and no field beyond each category's own;
 * - a unique kebab-case id, a reason and a source on every entry;
 * - dates and times: a format made of the known tokens, with at least one of them;
 * - step numbers: an anchored pattern that accepts no multi-digit quantity, a `steps` count
 *   (the items of the one stepper container) whose positions 1 to `steps` the pattern
 *   accepts, and nothing past them, and one registered title per step: tidy, with a letter,
 *   no number (characters or number words) and no title listed twice;
 * - character counters: a format with {count} and {max} and no digit of its own;
 * - fixed interface copy: tidy text with at least one letter and one number character,
 *   never a bare number, and no copy listed twice;
 * - the reviewed `unreadable` list: a unique kebab-case id, one of the known kinds of element
 *   whose pixels the test cannot read, a reason and a source; no id shared with an entry;
 *   for an element that loads a file, an anchored `src` pattern naming that file; for an
 *   element that loads none (a canvas, a CSS image, an inline SVG drawing), the one component
 *   file that draws it, under apps/ or packages/ (phase 1; the render check's source scan,
 *   unreadable-markers.ts, accepts its marker only in that file);
 * - fixed interface copy that reads as a quantity is refused: a number next to a unit of
 *   guardrails rule 8 ("TEST 12 kW", "34.500 mp") or next to a word that names what a count
 *   counts ("TEST rooms 212", "12 camere") is an engineering value, which renders bound to a
 *   value id, never as fixed copy (phase 1; the same review finding). "Max file size 500 MB"
 *   passes: MB is no unit of rule 8, and a file size counts nothing in the building.
 */
import { z } from 'zod';
import { ALLOWLIST_CATEGORIES, NUMBER_WORDS, UNREADABLE_KINDS, type AllowlistEntry, type UnreadableEntry } from './contract';

const NUMBER_CHAR = /\p{N}/u;
const LETTER = /\p{L}/u;
const NUMBER_WORD = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${[...new Set([...NUMBER_WORDS.en, ...NUMBER_WORDS.ro])].join('|')})(?![\\p{L}\\p{N}_])`, 'u');

function holdsNumber(text: string): boolean {
  return NUMBER_CHAR.test(text) || NUMBER_WORD.test(text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase());
}
/** Tokens a date_time format may use. Longest first, so MMM wins over MM. */
export const DATE_TOKENS = ['YYYY', 'MMM', 'MM', 'DD', 'D', 'HH', 'mm'] as const;
/** Quantities no step-number pattern may accept. */
const QUANTITY_PROBES = ['0', '9', '10', '12', '100', '1000', '1,000', '12,345', '0.5', '1.5', '-1'];
/** The most steps a stepper may register; the wizard has eight. */
const MAX_STEPS = 9;

const base = {
  id: z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/, 'id must be kebab-case'),
  reason: z.string().trim().min(40, 'reason must say, in a sentence, why the digits carry no stored-state meaning'),
  source: z.string().trim().min(5, 'source must name where the entry comes from'),
};

const entrySchema = z.discriminatedUnion('category', [
  z.strictObject({ ...base, category: z.literal('date_time'), format: z.string().min(1) }),
  z.strictObject({
    ...base,
    category: z.literal('step_number'),
    pattern: z.string().min(1),
    steps: z.number().int().min(2).max(MAX_STEPS),
    titles: z.array(z.string()),
  }),
  z.strictObject({ ...base, category: z.literal('character_counter'), format: z.string().min(1) }),
  z.strictObject({ ...base, category: z.literal('fixed_interface_copy'), text: z.string().min(1) }),
]);

const unreadableSchema = z.strictObject({
  ...base,
  element: z.enum(UNREADABLE_KINDS),
  src: z.string().min(1).optional(),
  component: z.string().min(1).optional(),
});

/** Kinds of unreadable element that load a file, and so must name it in `src`. */
const FILE_KINDS: ReadonlySet<string> = new Set(['img', 'svg-image', 'input-image', 'video', 'embed', 'object']);

/** A component file an unreadable entry may name: app or package code, in a language that can set the marker. */
export const COMPONENT_PATH = /^(?:apps|packages)\/(?:[A-Za-z0-9_.@-]+\/)*[A-Za-z0-9_.@-]+\.(?:tsx|ts|jsx|js|mts|cts|css|html)$/;

function componentProblems(entry: UnreadableEntry, at: string): string[] {
  if (entry.component === undefined) {
    return FILE_KINDS.has(entry.element)
      ? []
      : [`${at}: component is missing; an element that loads no file (${entry.element}) names the one component file that draws it, where alone its marker is accepted`];
  }
  if (!COMPONENT_PATH.test(entry.component) || entry.component.split('/').includes('..')) {
    return [`${at}: component "${entry.component}" is not a file path under apps/ or packages/ with a script, style or markup extension`];
  }
  return [];
}

function unreadableProblems(entry: UnreadableEntry): string[] {
  const at = `unreadable entry "${entry.id}" (${entry.element})`;
  const component = componentProblems(entry, at);
  if (!FILE_KINDS.has(entry.element)) {
    return entry.src === undefined ? component : [`${at}: src is only for elements that load a file`, ...component];
  }
  if (component.length > 0) return component;
  if (entry.src === undefined) return [`${at}: src is missing; an entry for an element that loads a file names that file`];
  if (!entry.src.endsWith('$')) return [`${at}: src "${entry.src}" must be anchored with $ at the end of the path`];
  try {
    new RegExp(entry.src, 'u');
  } catch (error) {
    return [`${at}: src "${entry.src}" does not compile: ${String(error)}`];
  }
  return [];
}

const allowlistSchema = z.strictObject({ entries: z.array(entrySchema), unreadable: z.array(unreadableSchema) });

export interface AllowlistValidation {
  ok: boolean;
  problems: string[];
  entries: AllowlistEntry[];
  unreadable: UnreadableEntry[];
}

/** Splits a date_time format into tokens and literal text. */
export function tokeniseDateFormat(format: string): Array<{ token: (typeof DATE_TOKENS)[number] } | { literal: string }> {
  const parts: Array<{ token: (typeof DATE_TOKENS)[number] } | { literal: string }> = [];
  let position = 0;
  let literal = '';
  while (position < format.length) {
    const token = DATE_TOKENS.find((candidate) => format.startsWith(candidate, position));
    if (token === undefined) {
      literal += format.charAt(position);
      position += 1;
      continue;
    }
    if (literal !== '') {
      parts.push({ literal });
      literal = '';
    }
    parts.push({ token });
    position += token.length;
  }
  if (literal !== '') parts.push({ literal });
  return parts;
}

function entryProblems(entry: AllowlistEntry): string[] {
  const at = `entry "${entry.id}" (${entry.category})`;
  const problems: string[] = [];
  switch (entry.category) {
    case 'date_time': {
      const parts = tokeniseDateFormat(entry.format);
      if (!parts.some((part) => 'token' in part)) problems.push(`${at}: format "${entry.format}" uses no date or time token`);
      if (parts.some((part) => 'literal' in part && NUMBER_CHAR.test(part.literal))) {
        problems.push(`${at}: format "${entry.format}" has a literal number character`);
      }
      break;
    }
    case 'step_number': {
      if (!entry.pattern.startsWith('^') || !entry.pattern.endsWith('$')) {
        problems.push(`${at}: pattern "${entry.pattern}" must be anchored with ^ and $`);
        break;
      }
      let pattern: RegExp;
      try {
        pattern = new RegExp(entry.pattern, 'u');
      } catch (error) {
        problems.push(`${at}: pattern "${entry.pattern}" does not compile: ${String(error)}`);
        break;
      }
      const accepted = QUANTITY_PROBES.filter((probe) => probe.length > 1 && pattern.test(probe));
      if (accepted.length > 0) {
        problems.push(`${at}: pattern "${entry.pattern}" accepts quantities (${accepted.join(', ')}); a step number is one digit`);
      }
      if (pattern.test('0')) problems.push(`${at}: pattern "${entry.pattern}" accepts 0, which is no wizard step`);
      const positions = Array.from({ length: entry.steps }, (_, index) => String(index + 1));
      const refused = positions.filter((position) => !pattern.test(position));
      if (refused.length > 0) {
        problems.push(`${at}: pattern "${entry.pattern}" refuses positions ${refused.join(', ')} of its ${entry.steps}-item stepper`);
      }
      const beyond = Array.from({ length: 10 - entry.steps }, (_, index) => String(entry.steps + 1 + index)).filter(
        (probe) => probe.length === 1 && pattern.test(probe),
      );
      if (beyond.length > 0) {
        problems.push(
          `${at}: pattern "${entry.pattern}" accepts ${beyond.join(', ')}, past the last position of its ${entry.steps}-item stepper`,
        );
      }
      if (entry.titles.length !== entry.steps) {
        problems.push(`${at}: titles must name each of its ${entry.steps} steps once, in order; it names ${entry.titles.length}`);
      }
      const seenTitles = new Set<string>();
      entry.titles.forEach((title, index) => {
        const which = `${at}: title ${index + 1} "${title}"`;
        if (title.replace(/\s+/gu, ' ').trim() !== title || title === '') problems.push(`${which} must be tidy text with single spaces`);
        if (!LETTER.test(title)) problems.push(`${which} has no letter`);
        if (holdsNumber(title)) problems.push(`${which} has a number; a step title names the step and counts nothing`);
        if (seenTitles.has(title)) problems.push(`${which} is listed twice`);
        seenTitles.add(title);
      });
      break;
    }
    case 'character_counter': {
      if (!entry.format.includes('{count}') || !entry.format.includes('{max}')) {
        problems.push(`${at}: format "${entry.format}" must contain {count} and {max}`);
      }
      if (NUMBER_CHAR.test(entry.format.replace('{count}', '').replace('{max}', ''))) {
        problems.push(`${at}: format "${entry.format}" has a number character of its own`);
      }
      break;
    }
    case 'fixed_interface_copy': {
      const tidy = entry.text.replace(/\s+/gu, ' ').trim();
      if (tidy !== entry.text) problems.push(`${at}: text must have single spaces and no leading or trailing space`);
      if (!holdsNumber(entry.text)) problems.push(`${at}: text "${entry.text}" has no number character or number word, so it needs no entry`);
      if (!LETTER.test(entry.text)) problems.push(`${at}: text "${entry.text}" is a bare number, which is never fixed copy`);
      if (entry.text.length > 80) problems.push(`${at}: text is longer than 80 characters; fixed copy is a short label or line`);
      const quantity = readsAsQuantity(entry.text);
      if (quantity !== undefined) {
        problems.push(
          `${at}: text "${entry.text}" reads as a quantity (${quantity}): an engineering value renders bound to a value id, never as fixed copy (guardrails rule 2)`,
        );
      }
      break;
    }
  }
  return problems;
}

/**
 * Units of guardrails rule 8 ("Units come from the registry, grouped by dimension"), as a
 * reader of copy meets them: the table's symbols, their ASCII and Romanian spellings, and the
 * currencies. Folded to lower case without diacritics; `²`, `³` and `·` kept. A unit test
 * (tools/checks/render/check.test.ts) reads the table of docs/guardrails.md and fails when a
 * symbol of it is missing here.
 */
export const QUANTITY_UNITS: ReadonlySet<string> = new Set([
  // Area, volume, length
  'm²', 'm³', 'm', 'mm', 'cm', 'km', 'm2', 'm3', 'mp', 'mc', 'sqm', 'dn',
  // Flow
  'm³/h', 'm3/h', 'l/s', 'l/min', 'kvs', 'l', 'mc/h',
  // Power
  'w', 'kw', 'mw', 'kva', 'kvar', 'kcal/h', 'gcal/h', 'tr', 'btu/h',
  // Energy, energy over time
  'kwh', 'mwh', 'gwh', 'gj', 'gcal', 'nm³', 'nm3', 'kwh/a', 'mwh/a', 'kwh/m²·a', 'kwh/m2a', 'kwh/m²a', 'w/m²', 'w/m2',
  // Temperature, humidity
  '°c', 'c', 'k', '%rh', 'rh',
  // Pressure and head
  'pa', 'kpa', 'bar', 'mbar', 'mca', 'mh₂o', 'mh2o', 'mca/mh₂o', 'head',
  // Electrical
  'a', 'v', 'hz', 'ma',
  // Air and light
  'ppm', 'µg/m³', 'µg/m3', 'lx', 'lux', 'db', 'db(a)',
  // Other
  '%', 'h/a', 'h', 'count', 'eur', '€', 'ron', 'lei', 'usd', '$',
]);

/**
 * Words that name what a count counts (guardrails rule 8, "Counts state what they count", and
 * 2.5's asset types), English and Romanian, singular and plural, folded. A number next to one
 * is a count of the building, which renders bound.
 */
export const COUNT_NOUNS: ReadonlySet<string> = new Set([
  'room', 'rooms', 'guest', 'key', 'keys', 'space', 'spaces', 'floor', 'floors', 'storey', 'storeys', 'story', 'stories', 'level', 'levels',
  'zone', 'zones', 'asset', 'assets', 'point', 'points', 'item', 'items', 'equipment', 'system', 'systems', 'building', 'buildings',
  'unit', 'units', 'apartment', 'apartments', 'bed', 'beds', 'occupant', 'occupants', 'people', 'person', 'persons', 'seat', 'seats',
  'ahu', 'ahus', 'fcu', 'fcus', 'vav', 'vavs', 'pump', 'pumps', 'fan', 'fans', 'chiller', 'chillers', 'boiler', 'boilers', 'meter', 'meters',
  'controller', 'controllers', 'panel', 'panels', 'sensor', 'sensors', 'valve', 'valves', 'damper', 'dampers', 'device', 'devices',
  'luminaire', 'luminaires', 'lift', 'lifts', 'elevator', 'elevators', 'motor', 'motors', 'drive', 'drives',
  'camera', 'camere', 'etaj', 'etaje', 'nivel', 'niveluri', 'zona', 'puncte', 'punct', 'echipament', 'echipamente', 'cladire', 'cladiri',
  'spatiu', 'spatii', 'loc', 'locuri', 'apartament', 'apartamente', 'pompa', 'pompe', 'ventilator', 'ventilatoare', 'cazan', 'cazane',
  'contor', 'contoare', 'senzor', 'senzori', 'clapeta', 'clapete', 'tablou', 'tablouri', 'uta', 'cta', 'vcv', 'subsol', 'subsoluri',
]);

function foldWord(word: string): string {
  return word.normalize('NFKD').replace(/[\u0300-\u036f]/gu, '').toLowerCase();
}

/** QUANTITY_UNITS and COUNT_NOUNS as a copy unit's words fold (NFKD reads m² as m2, µ as μ). */
const FOLDED_UNITS: ReadonlySet<string> = new Set([...QUANTITY_UNITS].map(foldWord));
const FOLDED_COUNT_NOUNS: ReadonlySet<string> = new Set([...COUNT_NOUNS].map(foldWord));

/**
 * Why a fixed-copy text reads as a quantity, or undefined when it does not: a number next to
 * a unit of rule 8, joined to it ("12kW") or one word away ("12 kW"), or next to a word that
 * names what a count counts ("rooms 212", "212 guest rooms", "12 camere").
 */
export function readsAsQuantity(text: string): string | undefined {
  const tokens = text.split(/[\s,;:()[\]]+/u).filter((token) => token !== '');
  const isNumber = (token: string): boolean => /^[+\-−]?\p{N}+(?:[.,]\p{N}+)*$/u.test(token) || NUMBER_WORD.test(foldWord(token));
  const isUnit = (token: string): boolean => FOLDED_UNITS.has(foldWord(token).replace(/[.]$/u, ''));
  const isCount = (token: string): boolean => FOLDED_COUNT_NOUNS.has(foldWord(token).replace(/[.]$/u, ''));
  for (const [index, token] of tokens.entries()) {
    const attached = /^[+\-−]?\p{N}+(?:[.,]\p{N}+)*(.+)$/u.exec(token);
    if (attached !== null && isUnit(attached[1] ?? '')) return `"${token}" is a number with a unit of guardrails rule 8`;
    if (!isNumber(token)) continue;
    const before = tokens[index - 1];
    const after = tokens[index + 1];
    if (after !== undefined && isUnit(after)) return `"${token} ${after}" is a number with a unit of guardrails rule 8`;
    for (const neighbour of [before, after]) {
      if (neighbour !== undefined && isCount(neighbour)) return `"${token}" sits next to "${neighbour}", which names what a count counts`;
    }
  }
  return undefined;
}

/** Validates an allowlist value (the default export shape of allowlist.ts, or a seeded JSON file). */
export function validateAllowlist(input: unknown): AllowlistValidation {
  const parsed = allowlistSchema.safeParse(input);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
      if (issue.code === 'invalid_union') {
        return `${path}: not one of rule 2's categories (${ALLOWLIST_CATEGORIES.join(', ')}), or its fields do not match its category`;
      }
      if (issue.code === 'unrecognized_keys') return `${path}: has fields no allowlist entry has (${issue.keys.join(', ')})`;
      if (issue.code === 'invalid_type' && issue.message.includes('received undefined')) return `${path}: is missing`;
      return `${path}: ${issue.message}`;
    });
    return { ok: false, problems, entries: [], unreadable: [] };
  }
  const entries = parsed.data.entries as AllowlistEntry[];
  const unreadable = parsed.data.unreadable as UnreadableEntry[];
  const problems: string[] = [];
  const seenIds = new Set<string>();
  const seenTexts = new Set<string>();
  for (const entry of entries) {
    if (seenIds.has(entry.id)) problems.push(`entry id "${entry.id}" is listed twice`);
    seenIds.add(entry.id);
    if (entry.category === 'fixed_interface_copy') {
      if (seenTexts.has(entry.text)) problems.push(`fixed copy "${entry.text}" is listed twice`);
      seenTexts.add(entry.text);
    }
    problems.push(...entryProblems(entry));
  }
  for (const entry of unreadable) {
    if (seenIds.has(entry.id)) problems.push(`entry id "${entry.id}" is listed twice`);
    seenIds.add(entry.id);
    problems.push(...unreadableProblems(entry));
  }
  return { ok: problems.length === 0, problems, entries, unreadable };
}

/** One line per entry, for the build log and the check's details. */
export function describeEntries(entries: readonly AllowlistEntry[]): string[] {
  return entries.map((entry) => {
    const what =
      entry.category === 'date_time'
        ? `format "${entry.format}" inside <time datetime>`
        : entry.category === 'step_number'
          ? `pattern ${entry.pattern} in [data-render-allow="${entry.id}"], equal to its item's position in the one <ol data-render-stepper="${entry.id}"> of ${entry.steps} items, each item showing only its number and its title (${entry.titles.join(', ')})`
          : entry.category === 'character_counter'
            ? `"${entry.format}" from the field named by data-counter-for, in [data-render-allow="${entry.id}"]`
            : `"${entry.text}"`;
    return `${entry.id} · ${entry.category} · ${what} · reason: ${entry.reason} · source: ${entry.source}`;
  });
}

/** One line per reviewed unreadable element, for the build log and the check's details. */
export function describeUnreadable(entries: readonly UnreadableEntry[]): string[] {
  return entries.map(
    (entry) =>
      `${entry.id} · unreadable ${entry.element} · in [data-render-unreadable="${entry.id}"]${entry.src === undefined ? '' : `, file path matching ${entry.src}`}${entry.component === undefined ? '' : `, drawn only by ${entry.component}`} · reason: ${entry.reason} · source: ${entry.source}`,
  );
}
