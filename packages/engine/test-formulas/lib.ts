/**
 * Helpers of the TEST formulas: reading TEST datasets and TEST answers, and exact
 * whole-number arithmetic. TEST code only (prompt 3 5.4 and phase 5): nothing in
 * apps/ or packages/*\/src imports this folder.
 *
 * A TEST dataset or answer of the wrong shape throws, naming what is wrong; no
 * value is ever read as zero or filled in (rule 1).
 */
import type { TestFormulaContext } from '@sovitech/registry/validation';

/** A TEST dataset's entries, by id. Throws when the suite did not load it, or its id carries no "TEST". */
export function testDataset(context: TestFormulaContext, id: string): Record<string, unknown> {
  if (!id.includes('TEST')) throw new Error(`TEST formulas read TEST datasets only, not ${id}`);
  const dataset = context.datasets[id];
  if (typeof dataset !== 'object' || dataset === null) throw new Error(`the TEST dataset ${id} is not loaded`);
  const entries = (dataset as { entries?: unknown }).entries;
  if (typeof entries !== 'object' || entries === null) throw new Error(`the TEST dataset ${id} has no entries`);
  return entries as Record<string, unknown>;
}

/** The value at a path of keys, or undefined where the TEST table has none. */
export function lookup(table: unknown, ...path: readonly string[]): unknown {
  let at: unknown = table;
  for (const key of path) {
    if (typeof at !== 'object' || at === null || !Object.hasOwn(at, key)) return undefined;
    at = (at as Record<string, unknown>)[key];
  }
  return at;
}

/** A whole number from a TEST table or answer, as a bigint. Throws on anything else. */
export function whole(value: unknown, what: string): bigint {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) throw new Error(`${what} is not a whole number in the TEST data: ${JSON.stringify(value)}`);
  return BigInt(value);
}

/** A TEST range `{ low, high }` of whole numbers. */
export function wholeRange(value: unknown, what: string): { readonly low: bigint; readonly high: bigint } {
  return { low: whole(lookup(value, 'low'), `${what}.low`), high: whole(lookup(value, 'high'), `${what}.high`) };
}

/** The whole-number value of a TEST quantity answer in the unit given. */
export function wholeQuantity(answer: unknown, unit: string, qualifier: string, what: string): bigint {
  if (lookup(answer, 'unit') !== unit || lookup(answer, 'qualifier') !== qualifier) {
    throw new Error(`${what} is not a TEST quantity in ${unit} with the qualifier ${qualifier}: ${JSON.stringify(answer)}`);
  }
  return whole(lookup(answer, 'value'), what);
}

/** A count by qualifier from a TEST answer (`{ upper: 3, ground: 1 }`). Throws when the qualifier has no count. */
export function countOf(answer: unknown, qualifier: string, what: string): bigint {
  const count = lookup(answer, qualifier);
  if (count === undefined) throw new Error(`${what} has no count for ${qualifier}: a missing count is unknown, never zero`);
  return whole(count, `${what}.${qualifier}`);
}

/** The sum of a list of whole numbers. */
export function sum(values: readonly bigint[]): bigint {
  return values.reduce((total, value) => total + value, 0n);
}

/** `value / 10^scale` as exact decimal text, with no rounding. */
export function decimalText(value: bigint, scale: number): string {
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString().padStart(scale + 1, '0');
  const integer = digits.slice(0, digits.length - scale);
  const fraction = digits.slice(digits.length - scale).replace(/0+$/u, '');
  return `${negative ? '-' : ''}${integer}${fraction === '' ? '' : `.${fraction}`}`;
}
