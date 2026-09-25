/**
 * A quantity as written: a number and its unit, such as "12.345 mp", "2.500 W"
 * or "cca. 25 mCA" (docs/guardrails.md rule 8, "Parsing" and "Units come from
 * the registry"; F-REGISTRY-03).
 *
 * The number is read by `parseNumber` (both readings of an ambiguous text are
 * kept); the unit is mapped by the closed unit registry. A unit that maps to
 * nothing gives no quantity: the result is refused with `unit_unknown`, and no
 * quantity candidate can be formed from it (prompt 3 section 7). Nothing is
 * converted: "25 mCA" stays 25 in m head, the unit it names (G8-6), and the text
 * is kept as written for `Candidate.original`.
 */
import { mapWrittenUnit } from '../units/units';
import { parseNumber, type NumberLocale, type NumberRefusal } from './parse-number';

export interface QuantityReading {
  readonly value: number;
  readonly decimal: string;
  /** The registry code of the unit as written. */
  readonly unit: string;
  readonly locales: readonly NumberLocale[];
}

export type QuantityRefusal = NumberRefusal | 'no_unit' | 'unit_unknown';

export type QuantityParse =
  | {
      readonly ok: true;
      /** The text exactly as given, for `Candidate.original`. */
      readonly original: string;
      readonly readings: readonly QuantityReading[];
      readonly ambiguous: boolean;
      readonly approximate: boolean;
      readonly unitAsWritten: string;
      readonly hintContradicted?: true;
    }
  | { readonly ok: false; readonly original: string; readonly reason: QuantityRefusal; readonly unitAsWritten?: string };

/** The shortest number part that ends in a digit, then the unit, which starts with neither a digit nor a separator. */
const QUANTITY_TEXT = /^(.*?\d)\s*([^\d\s.,][\s\S]*)$/u;

export function parseQuantityText(text: string, options: { readonly locale?: NumberLocale } = {}): QuantityParse {
  const original = text;
  const match = QUANTITY_TEXT.exec(text.normalize('NFC').trim());
  if (match === null) {
    const number = parseNumber(text, options);
    return { ok: false, original, reason: number.ok ? 'no_unit' : number.reason };
  }
  const numberText = match[1] ?? '';
  const unitAsWritten = (match[2] ?? '').trim();
  const number = parseNumber(numberText, options);
  if (!number.ok) return { ok: false, original, reason: number.reason, unitAsWritten };
  const unit = mapWrittenUnit(unitAsWritten);
  if (unit === undefined) return { ok: false, original, reason: 'unit_unknown', unitAsWritten };
  return Object.freeze({
    ok: true as const,
    original,
    readings: Object.freeze(
      number.readings.map((reading) => Object.freeze({ value: reading.value, decimal: reading.decimal, unit: unit.code, locales: reading.locales })),
    ),
    ambiguous: number.ambiguous,
    approximate: number.approximate,
    unitAsWritten,
    ...(number.hintContradicted === true ? { hintContradicted: true as const } : {}),
  });
}
