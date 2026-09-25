/**
 * The rule 8 parser (docs/guardrails.md rule 8, "Parsing" and "Floors";
 * F-REGISTRY-03). Its extraction cases (G8-2, G8-3, G8-9) are phase 2 evals;
 * these are the parser's own tests. Every number here is a TEST value.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { FLOOR_NOTATION_LETTERS, parseFloorNotation } from './floor-notation';
import { parseNumber, type NumberParse } from './parse-number';
import { parseQuantityText } from './parse-quantity';

const values = (parse: NumberParse): number[] => (parse.ok ? parse.readings.map((reading) => reading.value).sort((a, b) => a - b) : []);

describe('parseNumber: Romanian and English formats, read per value (rule 8)', () => {
  it('reads Romanian thousands and decimals, and English ones', () => {
    expect(values(parseNumber('1.234.567'))).toEqual([1_234_567]);
    expect(values(parseNumber('1,5'))).toEqual([1.5]);
    expect(values(parseNumber('1,234,567'))).toEqual([1_234_567]);
    expect(values(parseNumber('12.5'))).toEqual([12.5]);
    expect(values(parseNumber('1.234,5'))).toEqual([1_234.5]);
    expect(values(parseNumber('1,234.5'))).toEqual([1_234.5]);
    expect(values(parseNumber('12 345'))).toEqual([12_345]);
    expect(values(parseNumber('-3,5'))).toEqual([-3.5]);
    expect(values(parseNumber('−7'))).toEqual([-7]);
  });

  it('keeps both readings of an ambiguous number, "1.500" as 1.5 or 1500, and never reads it one way silently', () => {
    for (const text of ['1.500', '1,500', '12.345', '12,345']) {
      const parse = parseNumber(text);
      expect(parse.ok && parse.ambiguous, text).toBe(true);
      expect(values(parse)).toHaveLength(2);
    }
    expect(values(parseNumber('1.500'))).toEqual([1.5, 1_500]);
    expect(values(parseNumber('1,500'))).toEqual([1.5, 1_500]);
  });

  it('lets the table\'s locale settle an ambiguous number, and says so', () => {
    const ro = parseNumber('12.345', { locale: 'ro' });
    expect(values(ro)).toEqual([12_345]);
    expect(ro.ok && ro.settledByHint).toBe('ro');
    expect(values(parseNumber('12.345', { locale: 'en' }))).toEqual([12.345]);
  });

  it('reads a number that reads one way only as that, and marks a hint it contradicts', () => {
    const parse = parseNumber('1.234.567', { locale: 'en' });
    expect(values(parse)).toEqual([1_234_567]);
    expect(parse.ok && parse.hintContradicted).toBe(true);
    expect(parse.ok && parse.ambiguous).toBe(false);
  });

  it('does not read a leading zero group as thousands: "0,500" is one half, "0.500" is one half', () => {
    expect(values(parseNumber('0,500'))).toEqual([0.5]);
    expect(values(parseNumber('0.500'))).toEqual([0.5]);
  });

  it('keeps rule 8\'s approximate words, and the text as written', () => {
    for (const [text, word] of [
      ['cca. 1.200', 'cca.'],
      ['aprox. 12', 'aprox.'],
      ['~12', '~'],
      ['circa 12', 'circa'],
      ['peste 12', 'peste'],
      ['about 12', 'about'],
    ] as const) {
      const parse = parseNumber(text);
      expect(parse.ok && parse.approximate, text).toBe(true);
      expect(parse.ok && parse.approximateWord, text).toBe(word);
      expect(parse.original).toBe(text);
    }
    expect(parseNumber('12').ok && parseNumber('12')).toMatchObject({ approximate: false });
  });

  it('refuses what is not one number, and a number a double cannot hold exactly', () => {
    expect(parseNumber('')).toMatchObject({ ok: false, reason: 'empty' });
    expect(parseNumber('12 m')).toMatchObject({ ok: false, reason: 'not_a_number' });
    expect(parseNumber('1.23.4')).toMatchObject({ ok: false, reason: 'no_valid_reading' });
    expect(parseNumber('12,34,5')).toMatchObject({ ok: false, reason: 'no_valid_reading' });
    expect(parseNumber('123456789012345678')).toMatchObject({ ok: false, reason: 'not_exact_in_double' });
  });

  it('reads back any whole number written in either format with its locale', () => {
    const group = (digits: string, mark: string): string => digits.replace(/\B(?=(\d{3})+(?!\d))/gu, mark);
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 9_007_199_254 }), fc.integer({ min: 1, max: 99 }), (whole, cents) => {
        const fraction = cents < 10 ? `0${String(cents)}` : String(cents);
        const expected = `${String(whole)}.${fraction}`.replace(/0$/u, '');
        const ro = parseNumber(`${group(String(whole), '.')},${fraction}`, { locale: 'ro' });
        const en = parseNumber(`${group(String(whole), ',')}.${fraction}`, { locale: 'en' });
        expect(ro.ok && ro.readings.map((reading) => reading.decimal)).toEqual([expected]);
        expect(en.ok && en.readings.map((reading) => reading.decimal)).toEqual([expected]);
      }),
    );
  });
});

describe('parseQuantityText: a number and its registered unit', () => {
  it('maps the unit as written and keeps both readings', () => {
    const area = parseQuantityText('12.345 mp');
    expect(area.ok).toBe(true);
    if (!area.ok) return;
    expect(area.ambiguous).toBe(true);
    expect(area.readings.map((reading) => [reading.value, reading.unit]).sort(([a], [b]) => Number(a) - Number(b))).toEqual([
      [12.345, 'm2'],
      [12_345, 'm2'],
    ]);
    expect(area.unitAsWritten).toBe('mp');
    expect(area.original).toBe('12.345 mp');
  });

  it('keeps the unit named: "25 mCA" stays in m head, with no conversion', () => {
    const head = parseQuantityText('cca. 25 mCA');
    expect(head.ok && head.readings.map((reading) => [reading.value, reading.unit])).toEqual([[25, 'm_head']]);
    expect(head.ok && head.approximate).toBe(true);
  });

  it('gives no quantity for a unit the closed registry cannot map, or no unit at all', () => {
    expect(parseQuantityText('12 furlongs')).toMatchObject({ ok: false, reason: 'unit_unknown', unitAsWritten: 'furlongs' });
    expect(parseQuantityText('12')).toMatchObject({ ok: false, reason: 'no_unit' });
    expect(parseQuantityText('12 ml')).toMatchObject({ ok: false, reason: 'unit_unknown' });
  });
});

describe('parseFloorNotation: the regim de înălțime (rule 8, "Floors")', () => {
  it('reads rule 8\'s own example into counts by level type, and keeps the text', () => {
    expect(parseFloorNotation('3S+P+Mz+12E+Er')).toEqual({
      original: '3S+P+Mz+12E+Er',
      counts: { below_ground: 3, ground: 1, mezzanine: 1, upper: 12, setback_or_technical: 1 },
      unrecognised: [],
      repeated: [],
    });
  });

  it('reads only the letters of rule 8\'s example; roof plant is never read from the notation', () => {
    expect(FLOOR_NOTATION_LETTERS).toEqual(['S', 'P', 'Mz', 'E', 'Er']);
    expect(parseFloorNotation('2S+P+Mz+4E+Er')?.counts).toEqual({ below_ground: 2, ground: 1, mezzanine: 1, upper: 4, setback_or_technical: 1 });
  });

  // Phase 1 review, verifier finding 9: D, Et and M were expanded in code while the glossary
  // (rule 8, "Abbreviations") is not approved (gate dataset-glossary, closed).
  it('expands no letter beyond rule 8\'s example while the glossary is not approved: D, Et and M stay Unknown, text kept', () => {
    const notation = parseFloorNotation('2S+D+P+4E+Et+M');
    expect(notation?.original).toBe('2S+D+P+4E+Et+M');
    expect(notation?.unrecognised).toEqual(['D', 'Et', 'M']);
    expect(notation?.counts).toEqual({ below_ground: 2, ground: 1, upper: 4 });
    expect(notation?.counts).not.toHaveProperty('semi_basement');
    expect(notation?.counts).not.toHaveProperty('attic');
    expect(notation?.counts).not.toHaveProperty('setback_or_technical');
    expect(parseFloorNotation('3D+P+2M')?.unrecognised).toEqual(['3D', '2M']);
  });

  it('guesses nothing: an unknown part stays unrecognised, a repeated level type gets no count, and nothing reads as zero', () => {
    const notation = parseFloorNotation('S+P+2P+X+4E+Er+2Er');
    expect(notation?.unrecognised).toEqual(['2P', 'X']);
    expect(notation?.repeated).toEqual(['setback_or_technical']);
    expect(notation?.counts).toEqual({ below_ground: 1, ground: 1, upper: 4 });
    expect(Object.values(notation?.counts ?? {})).not.toContain(0);
    expect(parseFloorNotation('0E+P')?.unrecognised).toEqual(['0E']);
  });

  it('is not a notation without "+"-joined parts', () => {
    expect(parseFloorNotation('P')).toBeUndefined();
    expect(parseFloorNotation('P++E')).toBeUndefined();
  });
});
