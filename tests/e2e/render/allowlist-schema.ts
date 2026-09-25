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
 *   for an element that loads a file, an anchored `src` pattern naming that file.
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

const unreadableSchema = z.strictObject({ ...base, element: z.enum(UNREADABLE_KINDS), src: z.string().min(1).optional() });

/** Kinds of unreadable element that load a file, and so must name it in `src`. */
const FILE_KINDS: ReadonlySet<string> = new Set(['img', 'svg-image', 'input-image', 'video', 'embed', 'object']);

function unreadableProblems(entry: UnreadableEntry): string[] {
  const at = `unreadable entry "${entry.id}" (${entry.element})`;
  if (!FILE_KINDS.has(entry.element)) {
    return entry.src === undefined ? [] : [`${at}: src is only for elements that load a file`];
  }
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
      break;
    }
  }
  return problems;
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
      `${entry.id} · unreadable ${entry.element} · in [data-render-unreadable="${entry.id}"]${entry.src === undefined ? '' : `, file path matching ${entry.src}`} · reason: ${entry.reason} · source: ${entry.source}`,
  );
}
