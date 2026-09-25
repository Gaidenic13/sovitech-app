/**
 * The closed unit registry (docs/guardrails.md 2.7 "Units"; rule 8 "Units come
 * from the registry, grouped by dimension"; F-REGISTRY-02).
 *
 * Each entry has an ASCII code, a display symbol and a dimension, the shape of
 * 2.7 (`UnitDefinition` in @sovitech/domain), plus two registry extras:
 * - `written`: the forms a document or an owner may write the unit in, which
 *   `mapWrittenUnit` reads. A form not listed maps to nothing, so its value
 *   gives no quantity candidate (prompt 3 section 7).
 * - `toBase`: where rule 8's table fixes the conversion exactly, the unit's
 *   size in its dimension's base unit, as a decimal (energy counts in J, which
 *   is not a registered unit, so kWh, MWh and GJ all have whole factors and
 *   compare exactly; GJ over kWh does not terminate). Legacy power and energy
 *   units (kcal/h, Gcal/h, TR, BTU/h, Gcal), currencies, and units whose
 *   conversion needs a stated condition (gas volume at normal conditions, water
 *   head, a valve's flow coefficient) carry none: rule 8 converts them "by
 *   calculation", with the definition or the rate stated (F-CALC-06, phase 5).
 *
 * Dimensions follow rule 8's table. Where one row of the table holds units that
 * no exact factor joins, each is its own dimension, so a value cannot pass the
 * dimension check into a field it does not measure (the stricter reading, listed
 * for the approver): kvs (a flow coefficient) is not a flow; kVA and kVAr are not
 * W; K (a temperature difference) is not °C; m head is not a pressure in Pa;
 * %RH is not a plain percentage; Nm³ is not m³. DN is a size designation, not a
 * length (rule 8).
 *
 * Units rule 8 lacks (durations, currency ratios, CO₂) are not here: adding them
 * is proposal 7.2.22, gated by `units-7.2.22`.
 */

/** Rule 8's dimensions, in the order of its table. */
export const DIMENSIONS = [
  'area',
  'volume',
  'length',
  'nominal_size',
  'volume_flow',
  'flow_coefficient',
  'power',
  'apparent_power',
  'reactive_power',
  'energy',
  'normal_volume',
  'energy_per_year',
  'energy_intensity',
  'power_density',
  'temperature',
  'temperature_difference',
  'relative_humidity',
  'pressure',
  'head',
  'current',
  'voltage',
  'frequency',
  'concentration',
  'mass_concentration',
  'illuminance',
  'sound_level',
  'percent',
  'hours_per_year',
  'count',
  'currency',
] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export interface UnitEntry {
  /** ASCII code, as candidates and fields store it (2.7). */
  readonly code: string;
  /** Display symbol. */
  readonly symbol: string;
  readonly dimension: Dimension;
  /** Forms the unit is written in, besides its code and symbol. */
  readonly written: readonly string[];
  /** The unit's size in its dimension's base unit, as a decimal, where rule 8 fixes it exactly. */
  readonly toBase?: string;
}

const unit = (code: string, symbol: string, dimension: Dimension, written: readonly string[] = [], toBase?: string): UnitEntry =>
  Object.freeze({ code, symbol, dimension, written: Object.freeze([...written]), ...(toBase === undefined ? {} : { toBase }) });

/**
 * Every unit the app accepts, in the order of rule 8's table. A dimension's base
 * unit is the entry whose `toBase` is "1".
 */
export const UNIT_REGISTRY: readonly UnitEntry[] = Object.freeze([
  // Area, volume, length.
  unit('m2', 'm²', 'area', ['mp', 'm.p.', 'mp.', 'sqm'], '1'),
  unit('m3', 'm³', 'volume', ['mc', 'm.c.'], '1'),
  unit('m', 'm', 'length', [], '1'),
  unit('mm', 'mm', 'length', [], '0.001'),
  unit('DN', 'DN', 'nominal_size'),
  // Flow.
  unit('m3/h', 'm³/h', 'volume_flow', ['mc/h', 'mc/ora', 'mc/oră'], '1'),
  unit('l/s', 'l/s', 'volume_flow', ['L/s'], '3.6'),
  unit('l/min', 'l/min', 'volume_flow', ['L/min'], '0.06'),
  unit('kvs', 'kvs', 'flow_coefficient', ['Kvs', 'KVS']),
  // Power.
  unit('W', 'W', 'power', [], '1'),
  unit('kW', 'kW', 'power', [], '1000'),
  unit('MW', 'MW', 'power', [], '1000000'),
  unit('kcal/h', 'kcal/h', 'power'),
  unit('Gcal/h', 'Gcal/h', 'power'),
  unit('TR', 'TR', 'power'),
  unit('BTU/h', 'BTU/h', 'power', ['Btu/h']),
  unit('kVA', 'kVA', 'apparent_power'),
  unit('kVAr', 'kVAr', 'reactive_power', ['kvar', 'kVAR']),
  // Energy.
  unit('kWh', 'kWh', 'energy', [], '3600000'),
  unit('MWh', 'MWh', 'energy', [], '3600000000'),
  unit('GJ', 'GJ', 'energy', [], '1000000000'),
  unit('Gcal', 'Gcal', 'energy'),
  unit('Nm3', 'Nm³', 'normal_volume', ['Nmc']),
  // Energy over time.
  unit('kWh/a', 'kWh/a', 'energy_per_year', ['kWh/an', 'kWh/year', 'kWh/yr'], '1'),
  unit('MWh/a', 'MWh/a', 'energy_per_year', ['MWh/an', 'MWh/year', 'MWh/yr'], '1000'),
  unit('kWh/m2a', 'kWh/m²·a', 'energy_intensity', ['kWh/m²a', 'kWh/m2·a', 'kWh/m²/an', 'kWh/mp·an', 'kWh/mp/an', 'kWh/m²/a', 'kWh/m2/a'], '1'),
  unit('W/m2', 'W/m²', 'power_density', ['W/mp'], '1'),
  // Temperature.
  unit('degC', '°C', 'temperature', ['ºC', 'grd C', 'grd. C'], '1'),
  unit('K', 'K', 'temperature_difference', [], '1'),
  unit('%RH', '%RH', 'relative_humidity', ['% RH', '%UR', '% UR'], '1'),
  // Pressure and head.
  unit('Pa', 'Pa', 'pressure', [], '1'),
  unit('kPa', 'kPa', 'pressure', [], '1000'),
  unit('bar', 'bar', 'pressure', [], '100000'),
  unit('mbar', 'mbar', 'pressure', [], '100'),
  unit('m_head', 'm head', 'head', ['mCA', 'mca', 'm CA', 'm.c.a.', 'mH2O', 'mH₂O', 'm H2O', 'm H₂O', 'mWS'], '1'),
  // Electrical.
  unit('A', 'A', 'current', [], '1'),
  unit('mA', 'mA', 'current', [], '0.001'),
  unit('V', 'V', 'voltage', [], '1'),
  unit('Hz', 'Hz', 'frequency', [], '1'),
  // Air and light.
  unit('ppm', 'ppm', 'concentration', [], '1'),
  unit('ug/m3', 'µg/m³', 'mass_concentration', ['μg/m³', 'µg/m3', 'μg/m3', 'µg/mc'], '1'),
  unit('lx', 'lx', 'illuminance', ['lux'], '1'),
  unit('dB(A)', 'dB(A)', 'sound_level', ['dBA', 'dB (A)'], '1'),
  // Other.
  unit('%', '%', 'percent', [], '1'),
  unit('h/a', 'h/a', 'hours_per_year', ['h/an', 'ore/an'], '1'),
  unit('count', 'count', 'count', [], '1'),
  unit('EUR', 'EUR', 'currency', ['€', 'euro', 'Euro', 'EURO']),
  unit('RON', 'RON', 'currency', ['lei', 'Lei', 'LEI']),
]);

const BY_CODE: ReadonlyMap<string, UnitEntry> = new Map(UNIT_REGISTRY.map((entry) => [entry.code, entry]));

/**
 * Written forms, after `normaliseWritten`. Letter case is kept: "MW" is not
 * "mW", "MWh" is not "mWh". A form that could be two units (Romanian "ml" is a
 * millilitre or a linear metre) is left out, so it maps to nothing.
 */
const BY_WRITTEN: ReadonlyMap<string, UnitEntry> = (() => {
  const map = new Map<string, UnitEntry>();
  for (const entry of UNIT_REGISTRY) {
    for (const form of [entry.code, entry.symbol, ...entry.written]) {
      const key = normaliseWritten(form);
      const earlier = map.get(key);
      if (earlier !== undefined && earlier.code !== entry.code) {
        throw new Error(`packages/registry/src/units/units.ts: the written form "${form}" names both ${earlier.code} and ${entry.code}`);
      }
      map.set(key, entry);
    }
  }
  return map;
})();

/** Unicode NFC, superscript digits as digits, no spaces around "/" or "·", single spaces, trimmed. */
function normaliseWritten(text: string): string {
  return text
    .normalize('NFC')
    .replace(/\u00B2/gu, '2')
    .replace(/\u00B3/gu, '3')
    .replace(/[\u00A0\u202F\u2009]/gu, ' ')
    .replace(/\s*([/·])\s*/gu, '$1')
    .replace(/\s+/gu, ' ')
    .trim();
}

/** The registry entry for a code, or undefined: the registry is closed. */
export function unitByCode(code: string): UnitEntry | undefined {
  return BY_CODE.get(code);
}

/**
 * The unit a written form names, or undefined when the closed registry cannot
 * map it. A value whose unit maps to nothing gives no quantity candidate.
 */
export function mapWrittenUnit(written: string): UnitEntry | undefined {
  return BY_WRITTEN.get(normaliseWritten(written));
}

/** The 2.7 shape of the registry (code, symbol, dimension), as the registry bundle and the domain's UnitLookup take it. */
export const UNIT_DEFINITIONS: readonly { readonly code: string; readonly symbol: string; readonly dimension: string }[] = Object.freeze(
  UNIT_REGISTRY.map((entry) => Object.freeze({ code: entry.code, symbol: entry.symbol, dimension: entry.dimension })),
);
