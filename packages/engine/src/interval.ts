/**
 * Exact decimal intervals (guardrails rule 9, "Arithmetic lives in code"; "Stored values are never rounded. Rounding
 * happens only when a value is displayed"; "Ranges come from the method ... It must satisfy low < value < high, and it
 * widens when inputs are inferred"; prompt 3 section 6: "decimal.js intervals").
 *
 * Every figure the engine computes is a `Decimal` or an `Interval` of two, never a JavaScript number in between: a
 * number appears only where a candidate is written (`toCandidateNumber`, at the boundary of the domain's
 * `Quantity.value`, which is a number), and nothing here rounds. Ranges combine by interval arithmetic (the sum of two
 * ranges is the range of their sums; a range over options is the hull of the options' ranges, `range_over_options`).
 *
 * Exactness: every decimal here belongs to `EngineDecimal`, a decimal.js constructor whose precision no sum or product
 * of engine inputs reaches (a product of two decimals has at most the digits of both), so `plus` and `times` never
 * round. Operands made by another constructor are read into it first. Nothing divides: a share of a hundred is a
 * product with the exact decimal 0.01 (`percentOf`), and a midpoint a product with 0.5.
 */
import { Decimal } from 'decimal.js';
import { EngineInputError } from './errors';

/**
 * The engine's decimal constructor. decimal.js rounds `plus` and `times` to `precision` significant digits; at a
 * million digits that never happens to a product of engine inputs, so the arithmetic is exact. The rounding mode is
 * never reached; it is named so no default stands in for a choice.
 */
const EngineDecimal = Decimal.clone({ precision: 1_000_000, rounding: Decimal.ROUND_HALF_EVEN, toExpNeg: -1_000_000, toExpPos: 1_000_000 });

/** A closed interval [low, high] of exact decimals; low <= high. A point is an interval with low = high. */
export interface Interval {
  readonly low: Decimal;
  readonly high: Decimal;
}

/** An estimate as rule 9 states it: a central value strictly inside its range (low < value < high). */
export interface Estimate {
  readonly value: Decimal;
  readonly range: Interval;
}

/** A decimal read into the engine's constructor (a decimal of another constructor keeps its value exactly). */
function own(value: Decimal): Decimal {
  if (!Decimal.isDecimal(value)) throw new EngineInputError('an interval bound must be a decimal');
  if (!value.isFinite()) throw new EngineInputError(`an interval bound must be finite, not ${value.toString()}`);
  // decimal.js constructors share one prototype, so `instanceof` cannot tell them apart; each instance names its own.
  return value.constructor === EngineDecimal ? value : new EngineDecimal(value);
}

/**
 * The exact decimal a number names: its shortest round-trip text read as a decimal (the domain's `decimalOf` reading),
 * never its binary expansion. Text never becomes a decimal here (the lint ban `no-decimal-from-text`: only the rule 8
 * parser reads text); a candidate's quantity and a loaded dataset's entries are numbers already.
 */
export function exact(value: number): Decimal {
  if (!Number.isFinite(value)) throw new RangeError(`@sovitech/engine: not a finite number: ${String(value)}`);
  return new EngineDecimal(value);
}

/** `value` hundredths, exactly (a percentage as the factor it names). */
export function percentOf(value: number): Decimal {
  return exact(value).times(new EngineDecimal('0.01'));
}

/** The interval [low, high]; throws when low > high. */
export function interval(low: Decimal, high: Decimal): Interval {
  const lower = own(low);
  const upper = own(high);
  if (lower.greaterThan(upper)) throw new EngineInputError(`an interval needs low <= high, not ${lower.toString()} > ${upper.toString()}`);
  return Object.freeze({ low: lower, high: upper });
}

/** The point interval [value, value]. */
export function point(value: Decimal): Interval {
  return interval(value, value);
}

/** Whether an interval is a point (low = high). */
export function isPoint(value: Interval): boolean {
  return value.low.equals(value.high);
}

/** The sum of intervals ([0, 0] for none is never used: a sum of nothing is refused, rule 1 "Zero is a value"). */
export function sum(intervals: readonly Interval[]): Interval {
  if (intervals.length === 0) throw new EngineInputError('a sum of nothing is refused: "None found" is not zero (rule 1, "Zero is a value")');
  return intervals
    .map((item) => interval(item.low, item.high))
    .reduce((total, item) => Object.freeze({ low: total.low.plus(item.low), high: total.high.plus(item.high) }));
}

/** The product of two intervals (all four corner products; signs handled). */
export function multiply(a: Interval, b: Interval): Interval {
  const left = interval(a.low, a.high);
  const right = interval(b.low, b.high);
  const corners = [left.low.times(right.low), left.low.times(right.high), left.high.times(right.low), left.high.times(right.high)];
  return interval(EngineDecimal.min(...corners), EngineDecimal.max(...corners));
}

/** The hull of several intervals: the smallest interval holding each (a range over options, G7-1, G10-6, G1-7). */
export function hull(intervals: readonly Interval[]): Interval {
  if (intervals.length === 0) throw new EngineInputError('the hull of nothing is refused: a range needs a basis (rule 1, "Ranges need a basis")');
  const items = intervals.map((item) => interval(item.low, item.high));
  return interval(EngineDecimal.min(...items.map((item) => item.low)), EngineDecimal.max(...items.map((item) => item.high)));
}

/** The midpoint of an interval, exactly (a TEST method's central value; a SOVITECH method states its own). */
export function midpoint(range: Interval): Decimal {
  const bounds = interval(range.low, range.high);
  return bounds.low.plus(bounds.high).times(new EngineDecimal('0.5'));
}

/** Whether `value` lies strictly inside `range` (rule 9: low < value < high). */
export function strictlyInside(value: Decimal, range: Interval): boolean {
  return range.low.lessThan(value) && value.lessThan(range.high);
}

/**
 * An estimate from a method's central value and range, refused unless low < value < high (rule 9; G9-12). A range
 * whose bounds are equal is no estimate: the formula is then calculated, not estimated.
 */
export function estimate(value: Decimal, range: Interval): Estimate {
  const central = own(value);
  const bounds = interval(range.low, range.high);
  if (!strictlyInside(central, bounds)) {
    throw new EngineInputError(
      `an estimate needs low < value < high (rule 9), not ${bounds.low.toString()} < ${central.toString()} < ${bounds.high.toString()}`,
    );
  }
  return Object.freeze({ value: central, range: bounds });
}

/** The domain's `Quantity.value` (a number) of an exact decimal, refused when the number would not read back as the same decimal. */
export function toCandidateNumber(value: Decimal): number {
  const decimal = own(value);
  const number = decimal.toNumber();
  if (!Number.isFinite(number) || !new EngineDecimal(number).equals(decimal)) {
    throw new EngineInputError(`no JavaScript number holds ${decimal.toString()} without rounding, so no candidate can hold it (rule 9)`);
  }
  return number;
}
