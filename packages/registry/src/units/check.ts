/**
 * The dimension check (docs/guardrails.md 2.7: "The validator rejects any
 * candidate whose unit dimension differs from its field's dimension. That
 * dimension check is how 'kW and kWh are never interchangeable' is enforced";
 * rule 8; G8-4; F-REGISTRY-02), and the exact comparison within a dimension
 * that the plausibility check needs.
 *
 * A comparison converts both sides into the dimension's base unit by exact
 * decimal factors (./units.ts), with no rounding and no division, so it never
 * reads a value past its bound or inside it by a binary fraction. Nothing here
 * produces a value to store or show: a converted value is a calculation, which
 * the engine records (rule 8, "Conversion happens only within a dimension and
 * is recorded as a calculation"; F-CALC-06).
 */
import { compareDecimals, decimalOf, multiplyDecimals, type ScaledDecimal } from '@sovitech/domain';
import { unitByCode, type UnitEntry } from './units';

/** The part of a field the dimension check reads. */
export interface UnitCheckedField {
  readonly key: string;
  readonly kind: 'quantity' | 'count' | 'enum' | 'text' | 'decision';
  readonly unit?: string;
}

export type UnitRefusal = 'unit_unknown' | 'field_unit_unknown' | 'field_takes_no_quantity' | 'dimension_mismatch';

export type UnitCheck =
  | { readonly ok: true; readonly unit: UnitEntry; readonly fieldUnit: UnitEntry }
  | {
      readonly ok: false;
      readonly reason: UnitRefusal;
      readonly message: string;
      readonly fieldDimension?: string;
      readonly candidateDimension?: string;
    };

/**
 * Whether a quantity may be a candidate of `field`: its unit is in the closed
 * registry, the field measures something, and both have the same dimension.
 * Anything else is refused, and no quantity candidate is formed.
 */
export function checkQuantityUnit(field: UnitCheckedField, quantity: { readonly value?: number; readonly unit: string }): UnitCheck {
  if (field.unit === undefined || (field.kind !== 'quantity' && field.kind !== 'count')) {
    return {
      ok: false,
      reason: 'field_takes_no_quantity',
      message: `${field.key} is a ${field.kind} field with no unit: it takes no quantity`,
    };
  }
  const fieldUnit = unitByCode(field.unit);
  if (fieldUnit === undefined) {
    return {
      ok: false,
      reason: 'field_unit_unknown',
      message: `${field.key} names the unit ${field.unit}, which the unit registry does not hold (2.7)`,
    };
  }
  const unit = unitByCode(quantity.unit);
  if (unit === undefined) {
    return {
      ok: false,
      reason: 'unit_unknown',
      message: `the unit ${quantity.unit} is not in the closed unit registry, so the value gives no quantity candidate (2.7, rule 8)`,
      fieldDimension: fieldUnit.dimension,
    };
  }
  if (unit.dimension !== fieldUnit.dimension) {
    return {
      ok: false,
      reason: 'dimension_mismatch',
      message: `${field.key} measures ${fieldUnit.dimension} (${fieldUnit.symbol}); a value in ${unit.symbol} measures ${unit.dimension} (2.7, the dimension check)`,
      fieldDimension: fieldUnit.dimension,
      candidateDimension: unit.dimension,
    };
  }
  return { ok: true, unit, fieldUnit };
}

/** A decimal written as digits with an optional fraction, as `toBase` holds it. */
const FACTOR_TEXT = /^(\d+)(?:\.(\d+))?$/;

/** A `toBase` factor as a scaled decimal. The factors are the registry's own constants, never document text. */
function factorOf(entry: UnitEntry): ScaledDecimal | undefined {
  if (entry.toBase === undefined) return undefined;
  const match = FACTOR_TEXT.exec(entry.toBase);
  const whole = match?.[1];
  if (whole === undefined) throw new Error(`packages/registry/src/units/units.ts: ${entry.code} has a malformed toBase "${entry.toBase}"`);
  const fraction = match?.[2] ?? '';
  return { digits: BigInt(`${whole}${fraction}`), exponent: -BigInt(fraction.length) };
}

/**
 * A value in the base unit of its dimension, exactly, or undefined when the unit
 * has no exact factor (a legacy unit, a currency) or is not registered.
 */
export function inBaseUnit(value: number, unitCode: string): ScaledDecimal | undefined {
  const entry = unitByCode(unitCode);
  if (entry === undefined) return undefined;
  const factor = factorOf(entry);
  return factor === undefined ? undefined : multiplyDecimals(decimalOf(value), factor);
}

/**
 * Compares two values of one dimension exactly: -1, 0 or 1, or undefined when
 * the units differ in dimension or one has no exact factor. Values in the same
 * unit always compare.
 */
export function compareAcrossUnits(a: { readonly value: number; readonly unit: string }, b: { readonly value: number; readonly unit: string }): -1 | 0 | 1 | undefined {
  if (a.unit === b.unit) return unitByCode(a.unit) === undefined ? undefined : compareDecimals(decimalOf(a.value), decimalOf(b.value));
  const unitA = unitByCode(a.unit);
  const unitB = unitByCode(b.unit);
  if (unitA === undefined || unitB === undefined || unitA.dimension !== unitB.dimension) return undefined;
  const left = inBaseUnit(a.value, a.unit);
  const right = inBaseUnit(b.value, b.unit);
  if (left === undefined || right === undefined) return undefined;
  return compareDecimals(left, right);
}
