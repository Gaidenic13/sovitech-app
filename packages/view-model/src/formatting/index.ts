/**
 * The formatting module (guardrails rule 9, "Rounding" and "Enforced by: The formatting module. It
 * owns rounding"; rule 8, "Parsing" and "Approximate wording is kept"; F-RENDER-04; PRD R-043;
 * US-REVIEW-02). The one place in the app that turns a stored number into text: rounding happens
 * only here, and only at display (stored values are never rounded). It is the ESLint allowlist's
 * `no-number-coercion` and `rounding-exempt` home (tools/eslint-rules/allowlist.js), server side
 * only: the browser receives the text it produces inside display objects and never formats a number.
 *
 * Every function is pure and total over its stated inputs, uses decimal.js for arithmetic (rule 9,
 * "Arithmetic lives in code"; a number is read as the decimal its shortest round-trip text names,
 * never from text: the rule 8 parser is the one place text becomes a number), and returns
 * `FormattedValue`: the whole text and the parts a component renders apart (each figure, the unit
 * symbol), each part a substring of the text (the render contract's `parts`).
 *
 * - Number format of the interface: English separators by default (the interface language is
 *   English, prompt 3 5.2 "UI language"; the owner's choice of interface number format is D-26,
 *   app-alignment decision 6): "45,600.5". `ro` writes Romanian separators ("45.600,5", rule 8,
 *   "Romanian format") so Romanian can be added; document values keep their own notation because
 *   they show as written (formatAsWritten).
 * - Units: only from the closed unit registry (2.7), by code, with the dimension check done before
 *   (the resolver never formats a quantity whose unit's dimension differs from its field's; derive
 *   refuses such a candidate). The symbol comes from the registry entry (`m2` → "m²"). A count
 *   (`count`) shows no symbol: what it counts is its qualifier label (rule 8, "Counts state what
 *   they count"), carried beside the text in the display object's `measure`.
 * - A count of zero is "0" only when a document, the owner or an engineer said so (rule 1, "Zero is
 *   a value"); it is never "-0" (phase 1 R4-6). Nothing here turns a missing value into a zero: a
 *   missing value is not passed in; the resolver shows its missing wording instead.
 */
import { Decimal } from 'decimal.js';
import type { OriginalText, UnitDefinition } from '@sovitech/domain';

/** The interface number format. */
export type NumberFormat = 'en' | 'ro';

export interface FormatOptions {
  readonly numberFormat: NumberFormat;
}

/** The interface default while D-26 is open: English (prompt 3 5.2 "UI language"). */
export const DEFAULT_FORMAT_OPTIONS: FormatOptions = Object.freeze({ numberFormat: 'en' });

/** A formatted value: the whole text, and the parts a component may render in separate elements. */
export interface FormattedValue {
  readonly text: string;
  readonly parts: readonly string[];
}

/** A stored range, as the engine produced it (rule 9: "Ranges come from the method"). */
export interface StoredRange {
  readonly low: number;
  readonly high: number;
}

/** Enough precision that no arithmetic here rounds before the display step does (doubles hold at most 17 significant digits). */
const Exact = Decimal.clone({ precision: 60, rounding: Decimal.ROUND_HALF_UP, toExpNeg: -60, toExpPos: 60 });
type Exact = InstanceType<typeof Exact>;

/** The unit code whose symbol is not shown: a count states what it counts through its qualifier label (rule 8). */
export const COUNT_UNIT_CODE = 'count';

/** Rule 9's measure of a wide range: (high − low) / (high + low) of 5% or more. */
const WIDE_RANGE = new Exact(5).dividedBy(100);

/** The months of the render allowlist's `date-day-month-year` format ("D MMM YYYY"). */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** A stored number as an exact decimal. Throws on NaN and infinities, which are no value (rule 1). */
function exact(value: number, what: string): Exact {
  if (!Number.isFinite(value)) throw new RangeError(`formatting: ${what} is not a finite number`);
  return new Exact(value);
}

/**
 * An exact decimal in the interface format: thousands grouped, the decimal mark of the format, no
 * exponent, and never "-0". The digits are the decimal's own; nothing is rounded here.
 */
function formatDecimal(decimal: Exact, options: FormatOptions): string {
  const value = decimal.isZero() ? decimal.abs() : decimal;
  const plain = value.toFixed();
  const negative = plain.startsWith('-');
  const unsigned = negative ? plain.slice(1) : plain;
  const [integer = '', fraction = ''] = unsigned.split('.');
  const groupMark = options.numberFormat === 'ro' ? '.' : ',';
  const decimalMark = options.numberFormat === 'ro' ? ',' : '.';
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/gu, groupMark);
  return `${negative ? '-' : ''}${grouped}${fraction === '' ? '' : `${decimalMark}${fraction}`}`;
}

/** A stored number exactly as stored, in the interface format (no rounding). */
export function formatExactNumber(value: number, options: FormatOptions): string {
  return formatDecimal(exact(value, 'the value'), options);
}

/** The unit symbol shown after a figure, or none for a count. */
function shownSymbol(unit: UnitDefinition | undefined): string | undefined {
  if (unit === undefined || unit.code === COUNT_UNIT_CODE) return undefined;
  return unit.symbol;
}

/** A figure with its unit symbol, and the figure and symbol as parts. */
function withUnit(figure: string, unit: UnitDefinition | undefined): FormattedValue {
  const symbol = shownSymbol(unit);
  if (symbol === undefined) return { text: figure, parts: [figure] };
  return { text: `${figure} ${symbol}`, parts: [figure, symbol] };
}

/** Parts in order of first appearance, each once. */
function distinct(parts: readonly string[]): readonly string[] {
  return [...new Set(parts.filter((part) => part !== ''))];
}

/** Each run of figures written in a text ("45.600", "1,5", "3", "12"), as a part. */
function writtenFigures(text: string): readonly string[] {
  return distinct([...text.matchAll(/\d(?:[\d.,\u00A0\u202F\u2009 ]*\d)?/gu)].map((match) => match[0].trim()));
}

/**
 * A document value as written (rule 9: "Document values display as written"): the candidate's
 * original text exactly as the excerpt holds it (a Romanian "mp" area with its thousands dot, or "cca." before it), with its figures as
 * parts. "about" is not added: the original already carries its approximate wording (rule 8).
 * Whitespace is collapsed, as the render test compares it; no character is otherwise changed.
 */
export function formatAsWritten(original: OriginalText): FormattedValue {
  const text = original.text.replace(/\s+/gu, ' ').trim();
  if (text === '') throw new RangeError('formatting: an original text is empty, so it is no value as written');
  return { text, parts: writtenFigures(text) };
}

/**
 * A value the owner typed, shown in the interface format with its unit symbol, never re-rounded
 * (it is what the owner entered).
 */
export function formatOwnerQuantity(value: number, unit: UnitDefinition, options: FormatOptions): FormattedValue {
  return withUnit(formatExactNumber(value, options), unit);
}

/**
 * A calculated value with no more significant figures than its least precise input (rule 9,
 * "Calculated values"). `significantFigures` is the least precise input's, which the caller reads
 * from the inputs' own display precision.
 */
export function formatCalculated(value: number, significantFigures: number, unit: UnitDefinition, options: FormatOptions): FormattedValue {
  return withUnit(formatDecimal(calculatedShown(value, significantFigures), options), unit);
}

/** A calculated value as its display shows it: rounded half up to `significantFigures` (rule 9, "Calculated values"). */
function calculatedShown(value: number, significantFigures: number): Exact {
  requireSignificantFigures(significantFigures);
  return exact(value, 'the calculated value').toSignificantDigits(significantFigures, Decimal.ROUND_HALF_UP);
}

/**
 * The number a calculated value's display shows (`formatCalculated`'s figure, as a number): for a chart that places the
 * value where its label says it is (G9-9; phase 6 part B, A-5). Layout only, never shown as text.
 */
export function calculatedAsShown(value: number, significantFigures: number): number {
  return calculatedShown(value, significantFigures).toNumber();
}

/** A whole count (rule 8, "Counts state what they count": the caller adds the qualifier label). Never "-0". */
export function formatCount(count: number, options: FormatOptions): FormattedValue {
  if (!Number.isInteger(count) || count < 0) throw new RangeError('formatting: a count is a whole number of zero or more');
  const figure = formatExactNumber(count, options);
  return { text: figure, parts: [figure] };
}

function requireSignificantFigures(significantFigures: number): void {
  if (!Number.isInteger(significantFigures) || significantFigures < 1 || significantFigures > 17) {
    throw new RangeError('formatting: significant figures are a whole number from 1 to 17');
  }
}

function requireRange(range: StoredRange): { readonly low: Exact; readonly high: Exact } {
  const low = exact(range.low, 'the low bound');
  const high = exact(range.high, 'the high bound');
  if (low.greaterThan(high)) throw new RangeError('formatting: a range needs low ≤ high');
  return { low, high };
}

/**
 * Rule 9's significant figures for an estimate or a stage 1-2 price: 2 when the range is wide,
 * meaning (high − low) / (high + low) is 5% or more, 3 otherwise. A range whose bounds add up to
 * zero, or to less than zero, has no such measure and is read as wide (the fewer figures claim less).
 */
export function rangeSignificantFigures(range: StoredRange): 2 | 3 {
  const { low, high } = requireRange(range);
  const sum = high.plus(low);
  if (sum.lessThanOrEqualTo(0)) return 2;
  return high.minus(low).dividedBy(sum).greaterThanOrEqualTo(WIDE_RANGE) ? 2 : 3;
}

/**
 * A range rounded outward to `significantFigures` (rule 9: "Ranges round outward. 5,230 to 6,380
 * displays as 5,200 to 6,400. Rounding never narrows a range"): the low bound rounded down, the
 * high bound rounded up, as decimal strings. The displayed range is never narrower than the stored
 * one (US-REVIEW-02 AC6).
 */
export function roundRangeOutward(range: StoredRange, significantFigures: number): { readonly low: string; readonly high: string } {
  requireSignificantFigures(significantFigures);
  const { low, high } = requireRange(range);
  return {
    low: low.toSignificantDigits(significantFigures, Decimal.ROUND_FLOOR).toFixed(),
    high: high.toSignificantDigits(significantFigures, Decimal.ROUND_CEIL).toFixed(),
  };
}

/** The outward-rounded bounds of a range, as exact decimals. */
function outward(range: StoredRange, significantFigures: number): { readonly low: Exact; readonly high: Exact } {
  const { low, high } = requireRange(range);
  return {
    low: low.toSignificantDigits(significantFigures, Decimal.ROUND_FLOOR),
    high: high.toSignificantDigits(significantFigures, Decimal.ROUND_CEIL),
  };
}

/**
 * An estimate with its range, in the form "about <value> (<low> to <high>)" (2.8 "Estimated"; G9-1:
 * "about 5,800 (5,200 to 6,400)"), the value to rule 9's significant figures and the bounds rounded
 * outward. "about" only on estimates and on originals written as approximate (rule 8; US-REVIEW-02
 * AC7). Refuses (throws) a range that does not satisfy low < value < high (rule 9: "It must satisfy
 * low < value < high"): the engine's error, never displayed. With a unit that shows a symbol, the
 * symbol follows the value and the high bound: "about 5,800 m² (5,200 to 6,400 m²)".
 */
export function formatEstimate(value: number, range: StoredRange, unit: UnitDefinition | undefined, options: FormatOptions): FormattedValue {
  const numbers = estimateShown(value, range);
  const shown = formatDecimal(numbers.value, options);
  const low = formatDecimal(numbers.low, options);
  const high = formatDecimal(numbers.high, options);
  const symbol = shownSymbol(unit);
  if (symbol === undefined) return { text: `about ${shown} (${low} to ${high})`, parts: distinct([shown, low, high]) };
  return { text: `about ${shown} ${symbol} (${low} to ${high} ${symbol})`, parts: distinct([shown, low, high, symbol]) };
}

/**
 * The numbers an estimate's display shows (`formatEstimate`'s): the value to rule 9's significant figures, rounded half
 * up, and the bounds rounded outward to the same figures. Refuses a range that does not satisfy low < value < high.
 */
function estimateShown(value: number, range: StoredRange): { readonly value: Exact; readonly low: Exact; readonly high: Exact } {
  const figure = exact(value, 'the estimate');
  const bounds = requireRange(range);
  if (!(bounds.low.lessThan(figure) && figure.lessThan(bounds.high))) {
    throw new RangeError('formatting: an estimate needs low < value < high (rule 9, "Ranges come from the method")');
  }
  const significantFigures = rangeSignificantFigures(range);
  const rounded = outward(range, significantFigures);
  return { value: figure.toSignificantDigits(significantFigures, Decimal.ROUND_HALF_UP), low: rounded.low, high: rounded.high };
}

/**
 * The numbers an estimate's display shows, as numbers (`formatEstimate`'s central value and outward-rounded bounds): for
 * a chart that places the estimate where its label says it is, so a labelled bound never falls off the axis (G9-9;
 * phase 6 part B, A-5). The rounded central value may sit on a rounded bound. Layout only, never shown as text.
 */
export function estimateAsShown(value: number, range: StoredRange): { readonly value: number; readonly low: number; readonly high: number } {
  const shown = estimateShown(value, range);
  return { value: shown.value.toNumber(), low: shown.low.toNumber(), high: shown.high.toNumber() };
}

/**
 * A range over a conflict's values, an ambiguous reading's readings or an unknown enum's options
 * (rule 1, "Ranges need a basis"; rule 4 "show a range over the values where the formula allows
 * it"): the lowest and highest, each exactly as stored (never rounded, so never narrowed), in the
 * interface format: "28 to 30", "1.5 to 1,500 kW". One distinct value reads as that value.
 */
export function formatRangeOverValues(values: readonly number[], unit: UnitDefinition | undefined, options: FormatOptions): FormattedValue {
  if (values.length === 0) throw new RangeError('formatting: a range over values needs at least one value');
  let lowest = exact(values[0] ?? Number.NaN, 'a value of the range');
  let highest = lowest;
  for (const value of values.slice(1)) {
    const next = exact(value, 'a value of the range');
    if (next.lessThan(lowest)) lowest = next;
    if (next.greaterThan(highest)) highest = next;
  }
  const low = formatDecimal(lowest, options);
  if (lowest.equals(highest)) return withUnit(low, unit);
  const high = formatDecimal(highest, options);
  const symbol = shownSymbol(unit);
  if (symbol === undefined) return { text: `${low} to ${high}`, parts: distinct([low, high]) };
  return { text: `${low} to ${high} ${symbol}`, parts: distinct([low, high, symbol]) };
}

/** An ISO 8601 date-time with a zone, as the store writes it (common.ts `IsoTimestamp`). */
const ISO_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u;

/**
 * A calendar date for a `<time>` element, in the render allowlist's `date-day-month-year` format
 * ("D MMM YYYY", "30 Sep 2026"), with its ISO date for the `datetime` attribute. Used for 2.8's
 * dated lines ("Superseded: inputs changed on <date>", "AI inference, verified by SOVITECH on <date>").
 * The date is the calendar date the timestamp itself writes, in the zone it carries (the store
 * writes UTC), so the text and the `datetime` attribute always name the same day. Throws for text
 * that is not a date-time with a zone, or names no real day.
 */
export function formatDate(isoTimestamp: string): { readonly datetime: string; readonly text: string } {
  const match = ISO_TIMESTAMP.exec(isoTimestamp);
  const [, yearText, monthText, dayText] = match ?? [];
  if (yearText === undefined || monthText === undefined || dayText === undefined || Number.isNaN(Date.parse(isoTimestamp))) {
    throw new RangeError('formatting: a date needs an ISO 8601 date-time with a zone');
  }
  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);
  const day = Number.parseInt(dayText, 10);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthName = MONTHS[month - 1];
  if (monthName === undefined || day < 1 || day > daysInMonth) throw new RangeError('formatting: the timestamp names no real day');
  return { datetime: `${yearText}-${monthText}-${dayText}`, text: `${String(day)} ${monthName} ${yearText}` };
}

/**
 * A date with its time, "D MMM YYYY, HH:MM" ("6 Oct 2026, 14:05"), from the ISO timestamp's own text: the calendar
 * date as `formatDate` writes it and the hours and minutes the timestamp carries, in the zone it carries (the store
 * writes UTC), with no arithmetic. One place for a displayed time (phase 5 part B, DR-5: Reports' "Date Generated" and
 * a stored proposal's generation, so two versions of one day read apart; US-PROPOSAL-11 AC3). Which zone a displayed
 * time is shown in is the owner's open question (phase 5's "Questions for the owner", 2); the answer lands here. Throws
 * as `formatDate` does.
 */
export function formatDateAndTime(isoTimestamp: string): { readonly datetime: string; readonly text: string } {
  const date = formatDate(isoTimestamp);
  const time = /T(\d{2}):(\d{2})/u.exec(isoTimestamp);
  const [, hours, minutes] = time ?? [];
  if (hours === undefined || minutes === undefined || Number.parseInt(hours, 10) > 23 || Number.parseInt(minutes, 10) > 59) {
    throw new RangeError('formatting: a time needs an ISO 8601 date-time with a zone');
  }
  return { datetime: isoTimestamp, text: `${date.text}, ${hours}:${minutes}` };
}

/** Chart positions (phase 6; ./plot.ts; docs/adr/0052 decision 4): layout only, from the same values as the displays (G9-9). */
export { plotPositions, type PlotInput, type PlotPosition, type PlotPositions } from './plot';
