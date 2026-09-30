/**
 * The readings of the numbers written in an excerpt, for the verifier's check 5
 * ("for `document`, the value parses from the excerpt itself": guardrails rule 1) and
 * the domain's `ProposalContext.readQuantities`. Every number goes through the one rule
 * 8 parser of packages/registry (`parseQuantityText`, `parseNumber`): both readings of an
 * ambiguous number are kept, approximate wording is kept, and a unit maps only through
 * the closed unit registry. A number whose following word is not a unit gives a reading
 * with no unit, which only a count can match.
 */
import type { QuantityReading } from '@sovitech/domain';
import { parseNumber, parseQuantityText } from '@sovitech/registry';

/**
 * A number as written, whole: a minus sign that belongs to it (not one glued to a word, as in
 * "CTA-01"), thousands groups joined by a space ("1 500", "12 345,5"), or digits with inner
 * group or decimal separators; optionally after an approximate word, and the word that follows
 * it (a unit, perhaps). The verifier reads the same tokens (packages/domain, evidence.ts,
 * NUMBER_TOKEN) and keeps only a token's own readings, so a part of a number is never read.
 */
const NUMBER_AND_WORD =
  /(?:(?:cca\.|aprox\.|circa|peste|about|~)\s*)?((?:(?<![\p{L}\p{N}])[-\u2212](?=\d))?(?:\d{1,3}(?:[ \u00A0\u202F\u2009]\d{3})+(?:[.,]\d+)?(?![\d.,])|\d(?:[\d.,]*\d)?))(?:\s*([^\s\d,;:()[\]][^\s,;:()[\]]*))?/giu;

export function readQuantities(text: string): QuantityReading[] {
  const readings: QuantityReading[] = [];
  for (const match of text.matchAll(NUMBER_AND_WORD)) {
    const whole = match[0];
    const number = match[1];
    if (number === undefined) continue;
    const word = match[2]?.replace(/[.]+$/u, '');
    const withUnit = word === undefined || word === '' ? undefined : parseQuantityText(whole.replace(/[.]+$/u, ''));
    if (withUnit?.ok === true) {
      for (const reading of withUnit.readings) readings.push({ value: reading.value, unit: reading.unit });
      continue;
    }
    const bare = parseNumber(number);
    if (bare.ok) for (const reading of bare.readings) readings.push({ value: reading.value, unit: null });
  }
  return readings;
}
