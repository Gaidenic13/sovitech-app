/**
 * The closed unit registry, the dimension check and exact comparison within a
 * dimension (docs/guardrails.md 2.7 and rule 8). Values here are TEST values.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { checkPlausibility } from './plausibility';
import { checkQuantityUnit, compareAcrossUnits, inBaseUnit } from './check';
import { DIMENSIONS, UNIT_DEFINITIONS, UNIT_REGISTRY, mapWrittenUnit, unitByCode } from './units';

/** Every unit rule 8's table names, as the table writes it. */
const RULE_8_UNITS = [
  'm²', 'm³', 'm', 'mm', 'DN',
  'm³/h', 'l/s', 'l/min', 'kvs',
  'W', 'kW', 'MW', 'kVA', 'kVAr', 'kcal/h', 'Gcal/h', 'TR', 'BTU/h',
  'kWh', 'MWh', 'GJ', 'Gcal', 'Nm³',
  'kWh/a', 'MWh/a', 'kWh/m²·a', 'W/m²',
  '°C', 'K', '%RH',
  'Pa', 'kPa', 'bar', 'mbar', 'm head', 'mCA', 'mH₂O',
  'A', 'V', 'Hz', 'mA',
  'ppm', 'µg/m³', 'lx', 'dB(A)',
  '%', 'h/a', 'count', 'EUR', 'RON',
] as const;

describe('the unit registry (2.7, rule 8)', () => {
  it('maps every unit rule 8 lists, and holds no unit twice', () => {
    for (const written of RULE_8_UNITS) expect(mapWrittenUnit(written), written).toBeDefined();
    expect(new Set(UNIT_REGISTRY.map((unit) => unit.code)).size).toBe(UNIT_REGISTRY.length);
  });

  // Phase 1 review, verifier finding 8: the build log and ADR 0017 said 49 units; the registry
  // holds 48. The count is pinned here so the documents cannot drift from it unnoticed.
  it('holds 48 units, as ADR 0017 records', () => {
    expect(UNIT_REGISTRY).toHaveLength(48);
  });

  it('holds 2.7\'s shape for the registry bundle: an ASCII code, a symbol and a dimension', () => {
    for (const unit of UNIT_DEFINITIONS) {
      expect(unit.code).toMatch(/^[\x20-\x7E]+$/);
      expect(Object.keys(unit).sort()).toEqual(['code', 'dimension', 'symbol']);
      expect(DIMENSIONS).toContain(unit.dimension);
    }
  });

  it('reads Romanian units as written: mp is m², mc is m³, mCA is m head, kWh/an is kWh/a, lei is RON', () => {
    expect(mapWrittenUnit('mp')?.code).toBe('m2');
    expect(mapWrittenUnit('mc')?.code).toBe('m3');
    expect(mapWrittenUnit('mCA')?.code).toBe('m_head');
    expect(mapWrittenUnit('kWh/an')?.code).toBe('kWh/a');
    expect(mapWrittenUnit('lei')?.code).toBe('RON');
    expect(mapWrittenUnit(' kWh / m² · a ')?.code).toBe('kWh/m2a');
  });

  it('keeps letter case: MW is not mW, MWh is not mWh; unknown forms map to nothing', () => {
    expect(mapWrittenUnit('MW')?.code).toBe('MW');
    expect(mapWrittenUnit('mW')).toBeUndefined();
    expect(mapWrittenUnit('mWh')).toBeUndefined();
    // Romanian "ml" is a millilitre or a linear metre: it maps to neither.
    expect(mapWrittenUnit('ml')).toBeUndefined();
    expect(mapWrittenUnit('furlong')).toBeUndefined();
  });

  it('keeps apart what no exact factor joins: kVA is not kW, K is not °C, kvs is not a flow, m head is not Pa', () => {
    expect(unitByCode('kVA')?.dimension).not.toBe(unitByCode('kW')?.dimension);
    expect(unitByCode('K')?.dimension).not.toBe(unitByCode('degC')?.dimension);
    expect(unitByCode('kvs')?.dimension).not.toBe(unitByCode('m3/h')?.dimension);
    expect(unitByCode('m_head')?.dimension).not.toBe(unitByCode('Pa')?.dimension);
    expect(unitByCode('DN')?.dimension).not.toBe(unitByCode('mm')?.dimension);
    expect(unitByCode('Nm3')?.dimension).not.toBe(unitByCode('m3')?.dimension);
  });

  it('gives each dimension with exact factors one base unit, whose factor is 1 (energy counts in J, which no document writes)', () => {
    for (const dimension of DIMENSIONS) {
      const withFactor = UNIT_REGISTRY.filter((unit) => unit.dimension === dimension && unit.toBase !== undefined);
      if (withFactor.length === 0) continue;
      expect(withFactor.filter((unit) => unit.toBase === '1'), dimension).toHaveLength(dimension === 'energy' ? 0 : 1);
    }
    // In J, every registered energy factor is whole: kWh, MWh and GJ compare exactly (GJ over kWh does not terminate).
    expect(UNIT_REGISTRY.filter((unit) => unit.dimension === 'energy' && unit.toBase !== undefined).map((unit) => unit.toBase)).toEqual([
      '3600000',
      '3600000000',
      '1000000000',
    ]);
  });

  it('carries no factor for the conversions rule 8 leaves to a stated definition or rate', () => {
    for (const code of ['kcal/h', 'Gcal/h', 'TR', 'BTU/h', 'Gcal', 'EUR', 'RON', 'kvs', 'Nm3', 'DN', 'kVA', 'kVAr']) {
      expect(unitByCode(code)?.toBase, code).toBeUndefined();
    }
  });
});

describe('the dimension check (G8-4)', () => {
  const area = { key: 'building.TEST_area', kind: 'quantity' as const, unit: 'm2' };

  it('accepts a unit of the field\'s dimension, and refuses another dimension, an unknown unit, or a field with no unit', () => {
    expect(checkQuantityUnit(area, { unit: 'm2' })).toMatchObject({ ok: true });
    expect(checkQuantityUnit(area, { unit: 'm3' })).toMatchObject({ ok: false, reason: 'dimension_mismatch' });
    expect(checkQuantityUnit(area, { unit: 'acre' })).toMatchObject({ ok: false, reason: 'unit_unknown' });
    expect(checkQuantityUnit({ key: 'building.TEST_type', kind: 'enum' }, { unit: 'm2' })).toMatchObject({ ok: false, reason: 'field_takes_no_quantity' });
    expect(checkQuantityUnit({ ...area, unit: 'acre' }, { unit: 'm2' })).toMatchObject({ ok: false, reason: 'field_unit_unknown' });
  });

  it('never lets power and energy stand for each other, in either direction', () => {
    const power = { key: 'asset.TEST_power', kind: 'quantity' as const, unit: 'kW' };
    const energy = { key: 'metering_point.TEST_energy', kind: 'quantity' as const, unit: 'kWh' };
    expect(checkQuantityUnit(power, { unit: 'kWh' })).toMatchObject({ ok: false, reason: 'dimension_mismatch' });
    expect(checkQuantityUnit(energy, { unit: 'kW' })).toMatchObject({ ok: false, reason: 'dimension_mismatch' });
  });
});

describe('exact comparison within a dimension', () => {
  it('compares across units with no binary rounding', () => {
    expect(compareAcrossUnits({ value: 1, unit: 'kW' }, { value: 1_000, unit: 'W' })).toBe(0);
    expect(compareAcrossUnits({ value: 0.1, unit: 'kW' }, { value: 100, unit: 'W' })).toBe(0);
    expect(compareAcrossUnits({ value: 1, unit: 'l/s' }, { value: 3.6, unit: 'm3/h' })).toBe(0);
    expect(compareAcrossUnits({ value: 1, unit: 'kWh' }, { value: 3_600_000, unit: 'kWh' })).toBe(-1);
    expect(compareAcrossUnits({ value: 1, unit: 'kW' }, { value: 1, unit: 'kWh' })).toBeUndefined();
    expect(compareAcrossUnits({ value: 1, unit: 'kcal/h' }, { value: 1, unit: 'W' })).toBeUndefined();
    expect(inBaseUnit(2.5, 'kW')).toEqual({ digits: 25_000n, exponent: -1n });
  });

  it('orders values in two units of one dimension the way it orders them in one', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_000_000 }), fc.integer({ min: 0, max: 1_000_000 }), (watts, kiloWattsThousandths) => {
        const kW = { value: kiloWattsThousandths / 1_000, unit: 'kW' };
        const W = { value: watts, unit: 'W' };
        const expected = kiloWattsThousandths === watts ? 0 : kiloWattsThousandths < watts ? -1 : 1;
        expect(compareAcrossUnits(kW, W)).toBe(expected);
      }),
    );
  });
});

describe('the plausibility check (rule 8)', () => {
  const owner = { key: 'building.TEST_count', unit: 'count', confirmBy: 'owner' as const, plausible: { low: 1, high: 9, basis: 'TEST range' } };

  it('lets the owner clear an owner field, never with an acknowledgement', () => {
    expect(checkPlausibility(owner, { value: 12, unit: 'count' }, { verification: 'user_confirmed' })).toMatchObject({ status: 'outside', usableInTotals: true });
    expect(checkPlausibility(owner, { value: 12, unit: 'count' }, { verification: 'owner_acknowledged' })).toMatchObject({ badge: 'please_check', usableInTotals: false });
  });

  it('holds a value it cannot compare with the range as it holds one outside it', () => {
    const heat = { key: 'asset.TEST_heat', unit: 'kW', confirmBy: 'engineer' as const, plausible: { low: 1, high: 9, basis: 'TEST range' } };
    expect(checkPlausibility(heat, { value: 5, unit: 'kcal/h' }, { verification: 'unverified' })).toMatchObject({
      status: 'not_comparable',
      badge: 'please_check',
      usableInTotals: false,
    });
  });
});
