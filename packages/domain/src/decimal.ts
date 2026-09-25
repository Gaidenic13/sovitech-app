/**
 * Decimal comparison without binary rounding, for the conflict test
 * (docs/guardrails.md rule 4, "Conflict test"): whether the spread of a field's
 * values is larger than its tolerance. It decides a yes or no only; no result
 * of it is stored or shown, so it rounds nothing (rule 9, "Rounding").
 *
 * A JavaScript number is read as the decimal its shortest round-trip text
 * names ("0.01" is one hundredth, not the nearest binary fraction), and the
 * arithmetic runs on integers, so a spread equal to the tolerance is never
 * read as larger than it (G4-2) and a spread just over it is never read as
 * within it (G4-10).
 *
 * The domain has no dependency on decimal.js (packages/domain depends on
 * nothing), so these few operations are written here on BigInt.
 */

/** `digits × 10^exponent`, with no rounding. */
export interface ScaledDecimal {
  readonly digits: bigint;
  readonly exponent: bigint;
}

const NUMBER_TEXT = /^(-?)(\d+)(?:\.(\d+))?e([+-]\d+)$/;

/** The decimal a finite number's shortest round-trip text names. Throws on NaN and infinities. */
export function decimalOf(value: number): ScaledDecimal {
  if (!Number.isFinite(value)) throw new RangeError(`not a finite number: ${String(value)}`);
  const text = String(value);
  const withExponent = text.includes('e') ? text : `${text}e+0`;
  const match = NUMBER_TEXT.exec(withExponent);
  if (match === null) throw new RangeError(`unreadable number text: ${text}`);
  const [, sign, whole, fraction, exponentText] = match;
  if (whole === undefined || exponentText === undefined) throw new RangeError(`unreadable number text: ${text}`);
  const fractionDigits = fraction === undefined ? '' : fraction;
  const unsigned = BigInt(`${whole}${fractionDigits}`);
  return {
    digits: sign === '-' ? -unsigned : unsigned,
    exponent: BigInt(exponentText) - BigInt(fractionDigits.length),
  };
}

/** Both values over one common exponent (the smaller of the two). */
function aligned(a: ScaledDecimal, b: ScaledDecimal): { readonly a: bigint; readonly b: bigint; readonly exponent: bigint } {
  if (a.exponent === b.exponent) return { a: a.digits, b: b.digits, exponent: a.exponent };
  if (a.exponent > b.exponent) return { a: a.digits * 10n ** (a.exponent - b.exponent), b: b.digits, exponent: b.exponent };
  return { a: a.digits, b: b.digits * 10n ** (b.exponent - a.exponent), exponent: a.exponent };
}

/** -1, 0 or 1 as `a` is less than, equal to or greater than `b`. */
export function compareDecimals(a: ScaledDecimal, b: ScaledDecimal): -1 | 0 | 1 {
  const pair = aligned(a, b);
  if (pair.a === pair.b) return 0;
  return pair.a < pair.b ? -1 : 1;
}

/** `a - b`, with no rounding. */
export function subtractDecimals(a: ScaledDecimal, b: ScaledDecimal): ScaledDecimal {
  const pair = aligned(a, b);
  return { digits: pair.a - pair.b, exponent: pair.exponent };
}

/** `a × b`, with no rounding. */
export function multiplyDecimals(a: ScaledDecimal, b: ScaledDecimal): ScaledDecimal {
  return { digits: a.digits * b.digits, exponent: a.exponent + b.exponent };
}

/** `|a|`. */
export function absoluteDecimal(a: ScaledDecimal): ScaledDecimal {
  return a.digits < 0n ? { digits: -a.digits, exponent: a.exponent } : a;
}

/** The larger of two decimals. */
export function largerDecimal(a: ScaledDecimal, b: ScaledDecimal): ScaledDecimal {
  return compareDecimals(a, b) >= 0 ? a : b;
}
