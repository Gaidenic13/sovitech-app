/**
 * Helpers of the TEST bodies (packages/engine/test-formulas/bodies/): reading the values the engine hands a body, TEST
 * tables as exact intervals, and a TEST estimate's shape. TEST code only (prompt 3 5.4 and phase 5): nothing in apps/
 * or packages/*\/src imports this folder.
 *
 * A TEST table of the wrong shape throws, naming what is wrong; no value is ever read as zero or filled in (rule 1).
 * An input the body needs and does not hold is named as missing (rule 7), never assumed.
 */
import type { Decimal } from 'decimal.js';
import type { BodyInputs, BodyOutput } from '../src/catalogue';
import { exact, hull, interval, midpoint, percentOf, point, type Interval } from '../src/interval';
import type { Missing, MissingInputReason } from '../src/results';
import { lookup } from './lib';

/** The entries of a TEST dataset the formula requires (the engine hands only the datasets it may read). */
export function entriesOf(inputs: BodyInputs, id: string): Readonly<Record<string, unknown>> {
  if (!id.includes('TEST')) throw new Error(`TEST bodies read TEST datasets only, not ${id}`);
  const dataset = inputs.datasets.get(id);
  if (dataset === undefined) throw new Error(`the TEST dataset ${id} was not handed to the body`);
  return dataset.entries;
}

/** A whole number of a TEST table, as stored. Throws on anything else. */
function wholeAt(table: unknown, path: readonly string[], what: string): number {
  const value = lookup(table, ...path);
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) throw new Error(`${what} is not a whole number in the TEST table: ${JSON.stringify(value)}`);
  return value;
}

/** A whole number of a TEST table, exactly. */
export function tableNumber(table: unknown, path: readonly string[], what: string): Decimal {
  return exact(wholeAt(table, path, what));
}

/** A TEST table's `{ low, high }`, as an interval. */
export function tableRange(table: unknown, path: readonly string[], what: string): Interval {
  return interval(tableNumber(table, [...path, 'low'], `${what}.low`), tableNumber(table, [...path, 'high'], `${what}.high`));
}

/** A TEST table's `{ low, high }` in percent, as the interval of factors it names. */
export function tablePercentRange(table: unknown, path: readonly string[], what: string): Interval {
  return interval(percentOf(wholeAt(table, [...path, 'low'], `${what}.low`)), percentOf(wholeAt(table, [...path, 'high'], `${what}.high`)));
}

/** A TEST table's number in percent, as the factor it names. */
export function tablePercent(table: unknown, path: readonly string[], what: string): Interval {
  return point(percentOf(wholeAt(table, path, what)));
}

/** An input named as missing, with why (rule 7: "Not available yet" names what is missing). */
export function missingInput(inputs: BodyInputs, fieldKey: string, reason: MissingInputReason): Missing {
  return { kind: 'input', fieldKey, subjectId: inputs.fields.get(fieldKey)?.subjectId ?? '', reason };
}

/** Not available, naming what is missing. */
export function notAvailable(...missing: readonly Missing[]): BodyOutput {
  return { kind: 'not_available', missing };
}

/** The choices an enum or decision input runs over: its value, the values of a conflict, or its options when unknown. */
export function choicesOf(inputs: BodyInputs, fieldKey: string): readonly string[] {
  const reading = inputs.readings.get(fieldKey);
  if (reading !== undefined) {
    const choices = [...new Set(reading.values.flatMap((value) => (value.choice === undefined ? [] : [value.choice])))];
    if (choices.length === 0) throw new Error(`${fieldKey} holds no choice`);
    return choices;
  }
  const options = inputs.over.get(fieldKey);
  if (options === undefined || options.length === 0) throw new Error(`${fieldKey} was handed neither a value nor options to range over`);
  return options;
}

/** Whether a decision holds `option` for certain, may hold it (ranged over), or does not. */
export function decisionHolds(inputs: BodyInputs, fieldKey: string, option: string): 'yes' | 'maybe' | 'no' {
  const choices = choicesOf(inputs, fieldKey);
  if (!choices.includes(option)) return 'no';
  return choices.length === 1 ? 'yes' : 'maybe';
}

/**
 * A quantity input in `unit` as an interval: its one value, or the hull of the values a range runs over (rule 4), of
 * the fact `qualifier` when one is named. Undefined when the input holds no such value: the body then names it.
 */
export function quantityOf(inputs: BodyInputs, fieldKey: string, unit: string, qualifier?: string): Interval | undefined {
  const reading = inputs.readings.get(fieldKey);
  if (reading === undefined) return undefined;
  const values = reading.values.filter((value) => qualifier === undefined || value.qualifier === qualifier);
  if (values.length === 0) return undefined;
  const points = values.map((value) => {
    if (value.quantity === undefined) throw new Error(`${fieldKey} holds no quantity`);
    if (value.quantity.unit !== unit) throw new Error(`${fieldKey} is in ${value.quantity.unit}, not ${unit}: TEST bodies convert nothing`);
    return point(value.quantity.value);
  });
  return hull(points);
}

/** A TEST estimate: the method's range, with its midpoint as the central value (a TEST method's choice), or not available when the range is a point. */
export function testEstimate(range: Interval, unit: string, qualifier?: string, assumptions: readonly string[] = []): BodyOutput {
  if (range.low.equals(range.high)) return notAvailable({ kind: 'method', name: 'TEST: the range has no width, so it is no estimate (rule 9)' });
  return { kind: 'estimate', value: point(midpoint(range)), range, unit, ...(qualifier === undefined ? {} : { qualifier }), assumptions };
}

/** An exact value (a calculated output). */
export function testValue(value: Decimal, unit: string, qualifier?: string, assumptions: readonly string[] = []): BodyOutput {
  return { kind: 'value', value: point(value), unit, ...(qualifier === undefined ? {} : { qualifier }), assumptions };
}

/** Every combination of the choices of `keys` (a cartesian product), as records. Refuses more than 4096. */
export function combinations(inputs: BodyInputs, keys: readonly string[]): readonly Readonly<Record<string, string>>[] {
  let result: Record<string, string>[] = [{}];
  for (const key of keys) {
    const choices = choicesOf(inputs, key);
    result = result.flatMap((partial) => choices.map((choice) => ({ ...partial, [key]: choice })));
    if (result.length > 4096) throw new Error('TEST: too many unknown choices to range over');
  }
  return result;
}

/** The text an input holds (one value; refuse-policy formulas only). Undefined when the body was handed none. */
export function textOf(inputs: BodyInputs, fieldKey: string): string | undefined {
  const texts = [...new Set((inputs.readings.get(fieldKey)?.values ?? []).flatMap((value) => (value.text === undefined ? [] : [value.text])))];
  if (texts.length > 1) throw new Error(`${fieldKey} holds more than one text`);
  return texts[0];
}
