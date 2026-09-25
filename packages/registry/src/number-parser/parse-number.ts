/**
 * The one number parser (docs/guardrails.md rule 8, "Parsing"; F-REGISTRY-03).
 *
 * - Romanian writes 12.345 for twelve thousand three hundred and forty-five and
 *   1,5 for one and a half; English writes 12,345 and 1.5 (rule 8 gives its own
 *   example). Locale is read per value, not per
 *   document: a hint (the table's locale, where the extractor knows it) only
 *   settles a value that reads two ways.
 * - An ambiguous reading keeps both. "1.500" with no hint is 1.5 or 1500, and the
 *   result says so; it is never read one way silently.
 * - Approximate wording is kept: "cca.", "aprox.", "~", "circa", "peste" and
 *   "about" (rule 8's words) mark the reading `approximate`.
 * - The text is kept exactly as written (`original`).
 * - A value is returned only when a JavaScript number holds it exactly: its
 *   decimal is carried alongside, and a number whose digits a double cannot hold
 *   is refused rather than rounded (rule 9: stored values are never rounded).
 *
 * This folder is the one place code turns text into a number (the lint ban
 * `no-number-coercion` exempts it; tools/eslint-rules/allowlist.js).
 */

import { compareDecimals, decimalOf, type ScaledDecimal } from '@sovitech/domain';

export type NumberLocale = 'ro' | 'en';

export interface NumberReading {
  /** The value, which a double holds exactly as `decimal` writes it. */
  readonly value: number;
  /** The value as a plain decimal: "1500", "1.5", "-0.25". */
  readonly decimal: string;
  /** The locales under which the text reads this way. */
  readonly locales: readonly NumberLocale[];
}

export interface ParsedNumber {
  /** The text exactly as given. */
  readonly original: string;
  /** One reading, or two for an ambiguous text (rule 8). */
  readonly readings: readonly NumberReading[];
  /** Two readings, and no hint to settle them. */
  readonly ambiguous: boolean;
  /** "cca.", "aprox.", "~", "circa", "peste" or "about" was written with it. */
  readonly approximate: boolean;
  /** The approximate word as written, if any. */
  readonly approximateWord?: string;
  /** The hint settled a text that reads two ways. */
  readonly settledByHint?: NumberLocale;
  /** The text reads one way only, and not under the hint given (locale is read per value). */
  readonly hintContradicted?: true;
}

export type NumberRefusal =
  | 'empty'
  | 'not_a_number'
  | 'no_valid_reading'
  | 'not_exact_in_double';

export type NumberParse = ({ readonly ok: true } & ParsedNumber) | { readonly ok: false; readonly original: string; readonly reason: NumberRefusal };

/** Rule 8's approximate words, case ignored; "~" may touch the number. */
const APPROXIMATE = /^(?:(cca\.?|aprox\.?|circa|peste|about)\s+|(~)\s*)/iu;

/** Spaces used as thousands separators: space, no-break space, narrow no-break space, thin space. */
const GROUP_SPACE = /[ \u00A0\u202F\u2009]/u;

/** A signed run of digits with separators: nothing else may stand in the number. */
const NUMBER_TEXT = /^([-\u2212]?)(\d[\d.,\u00A0\u202F\u2009 ]*\d|\d)$/u;

interface Candidate {
  readonly integer: string;
  readonly fraction: string;
  readonly locales: readonly NumberLocale[];
}

/** Whether `groups` are thousands groups: the first of 1 to 3 digits (no leading zero unless alone), the rest of 3. */
function thousands(groups: readonly string[]): boolean {
  const [first, ...rest] = groups;
  if (first === undefined || rest.length === 0) return false;
  if (!/^\d{1,3}$/u.test(first) || (first.length > 1 && first.startsWith('0'))) return false;
  if (first === '0') return false;
  return rest.every((group) => /^\d{3}$/u.test(group));
}

/** The readings of an unsigned number text under one locale, or none. */
function readAs(text: string, locale: NumberLocale): Candidate | undefined {
  const decimalMark = locale === 'ro' ? ',' : '.';
  const groupMark = locale === 'ro' ? '.' : ',';
  const decimalAt = text.lastIndexOf(decimalMark);
  const integerPart = decimalAt < 0 ? text : text.slice(0, decimalAt);
  const fractionPart = decimalAt < 0 ? '' : text.slice(decimalAt + 1);
  if (decimalAt >= 0 && !/^\d+$/u.test(fractionPart)) return undefined;
  if (integerPart.includes(decimalMark)) return undefined;
  if (/^\d+$/u.test(integerPart)) return { integer: integerPart, fraction: fractionPart, locales: [locale] };
  // Grouped: one kind of separator only (the locale's own mark, or spaces), each group of three.
  const bySpace = integerPart.split(GROUP_SPACE);
  const byMark = integerPart.split(groupMark);
  const groups = bySpace.length > 1 && byMark.length === 1 ? bySpace : byMark.length > 1 && bySpace.length === 1 ? byMark : undefined;
  if (groups === undefined || !thousands(groups)) return undefined;
  return { integer: groups.join(''), fraction: fractionPart, locales: [locale] };
}

/** The decimal text of a reading: no leading zeros, no trailing fraction zeros, "-" kept. */
function decimalText(negative: boolean, integer: string, fraction: string): string {
  const whole = integer.replace(/^0+(?=\d)/u, '');
  const part = fraction.replace(/0+$/u, '');
  const body = part === '' ? whole : `${whole}.${part}`;
  return negative && /[1-9]/u.test(body) ? `-${body}` : body;
}

/** A plain decimal ("-12.5") as a scaled decimal, digit for digit. */
function scaledOf(decimal: string): ScaledDecimal {
  const negative = decimal.startsWith('-');
  const [integer = '', fraction = ''] = decimal.replace('-', '').split('.');
  const digits = BigInt(`${integer}${fraction}`);
  return { digits: negative ? -digits : digits, exponent: -BigInt(fraction.length) };
}

/** The double that holds `decimal` exactly, or undefined when none does. */
function exactNumber(decimal: string): number | undefined {
  const value = Number(decimal);
  if (!Number.isFinite(value)) return undefined;
  // A double holds the decimal exactly when its shortest text names the same decimal.
  return compareDecimals(decimalOf(value), scaledOf(decimal)) === 0 ? value : undefined;
}

/**
 * Reads a number as rule 8 does. `locale` is the hint for the table or value,
 * where one is known; it settles only a text that reads two ways.
 */
export function parseNumber(text: string, options: { readonly locale?: NumberLocale } = {}): NumberParse {
  const original = text;
  const trimmed = text.normalize('NFC').trim();
  if (trimmed === '') return { ok: false, original, reason: 'empty' };
  const approximateMatch = APPROXIMATE.exec(trimmed);
  const approximateWord = approximateMatch === null ? undefined : (approximateMatch[1] ?? approximateMatch[2]);
  const rest = approximateMatch === null ? trimmed : trimmed.slice(approximateMatch[0].length);
  const number = NUMBER_TEXT.exec(rest);
  if (number === null) return { ok: false, original, reason: 'not_a_number' };
  const negative = number[1] !== '';
  const body = number[2] ?? '';

  const candidates = (['ro', 'en'] as const).map((locale) => readAs(body, locale)).filter((item): item is Candidate => item !== undefined);
  // Readings with the same decimal are one reading, under both locales.
  const byDecimal = new Map<string, { integer: string; fraction: string; locales: NumberLocale[] }>();
  for (const candidate of candidates) {
    const decimal = decimalText(negative, candidate.integer, candidate.fraction);
    const earlier = byDecimal.get(decimal);
    if (earlier === undefined) byDecimal.set(decimal, { integer: candidate.integer, fraction: candidate.fraction, locales: [...candidate.locales] });
    else earlier.locales.push(...candidate.locales);
  }
  if (byDecimal.size === 0) return { ok: false, original, reason: 'no_valid_reading' };

  let readings = [...byDecimal.entries()].map(([decimal, reading]) => ({ decimal, locales: reading.locales }));
  let settledByHint: NumberLocale | undefined;
  if (readings.length > 1 && options.locale !== undefined) {
    const hint = options.locale;
    readings = readings.filter((reading) => reading.locales.includes(hint));
    settledByHint = hint;
  }
  // The text reads one way only, and not under the hint: locale is read per value (rule 8), so the
  // one reading stands, and the result says the hint did not fit, for whoever caps confidence.
  const hintContradicted = options.locale !== undefined && readings.every((reading) => !reading.locales.includes(options.locale as NumberLocale));

  const exact: NumberReading[] = [];
  for (const reading of readings) {
    const value = exactNumber(reading.decimal);
    if (value === undefined) return { ok: false, original, reason: 'not_exact_in_double' };
    exact.push(Object.freeze({ value, decimal: reading.decimal, locales: Object.freeze([...reading.locales]) }));
  }
  return Object.freeze({
    ok: true as const,
    original,
    readings: Object.freeze(exact),
    ambiguous: exact.length > 1,
    approximate: approximateWord !== undefined,
    ...(approximateWord === undefined ? {} : { approximateWord }),
    ...(settledByHint === undefined ? {} : { settledByHint }),
    ...(hintContradicted ? { hintContradicted } : {}),
  });
}
