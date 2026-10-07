/**
 * Unit tests of the engine's chart series (phase 6; ./series.ts; docs/adr/0047 amended, docs/adr/0052 decision 4):
 * `checkSeries` over seeded bad declarations (each problem code once, and a good catalogue with none), `runEngine`
 * refusing a catalogue whose series are faulted, and `seriesRowsOf` (one snapshot's rows, one formula version, a row
 * with no candidate kept as a labelled gap, never dropped: G1-5, G9-8, G9-9). The TEST catalogues are written inline
 * (src/ may not reach packages/engine/test-formulas/); the guardrail cases G1-5 and G9-9 run the TEST series
 * themselves.
 */
import { describe, expect, test } from 'vitest';
import type { FormulaCatalogue, EngineFormula } from './catalogue';
import { EngineInputError } from './errors';
import { runEngine } from './run';
import { PRODUCTION_CATALOGUE } from './catalogue';
import { checkSeries, seriesOf, seriesRowsOf, type SeriesDeclaration, type SeriesProblemCode } from './series';
import type { SnapshotOutputRow } from './snapshot';

const formula = (id: string, outputs: readonly string[]): EngineFormula => ({
  signature: { id, version: '1.0.0', inputs: [], outputs: [...outputs], unknownPolicy: 'refuse', estimated: false },
  requires: [],
  outputFields: Object.fromEntries(outputs.map((output) => [output, undefined])),
});

const TEST_FORMULA = formula('TEST-bySystem', ['capex.TEST_bySystem.hvac', 'capex.TEST_bySystem.cctv', 'capex.TEST_bySystem.total']);
const TEST_SEQUENCE = formula('TEST-flow', ['cashFlow.TEST_cumulative.y00', 'cashFlow.TEST_cumulative.y01', 'payback.TEST_periods']);

const BREAKDOWN: SeriesDeclaration = {
  id: 'capex.TEST_bySystem',
  kind: 'breakdown',
  formula: 'TEST-bySystem',
  total: 'capex.TEST_bySystem.total',
  points: [
    { key: 'hvac', output: 'capex.TEST_bySystem.hvac', name: { kind: 'system', systemId: 'hvac' } },
    { key: 'cctv', output: 'capex.TEST_bySystem.cctv', name: { kind: 'system', systemId: 'cctv' } },
  ],
};
const SEQUENCE: SeriesDeclaration = {
  id: 'cashFlow.TEST_cumulative',
  kind: 'sequence',
  formula: 'TEST-flow',
  total: null,
  points: [
    { key: 'y00', output: 'cashFlow.TEST_cumulative.y00', name: { kind: 'text', text: 'TEST year 0' } },
    { key: 'y01', output: 'cashFlow.TEST_cumulative.y01', name: { kind: 'text', text: 'TEST year 1' } },
  ],
};

const testCatalogueOf = (series: readonly SeriesDeclaration[], formulas: readonly EngineFormula[] = [TEST_FORMULA, TEST_SEQUENCE]): FormulaCatalogue => ({ kind: 'test', formulas, series });

/** The codes `checkSeries` finds for one declaration added to the good TEST catalogue. */
function codesOf(declaration: SeriesDeclaration, kind: FormulaCatalogue['kind'] = 'test', formulas?: readonly EngineFormula[]): SeriesProblemCode[] {
  const catalogue: FormulaCatalogue = kind === 'test' ? testCatalogueOf([declaration], formulas) : { kind, formulas: formulas ?? [], series: [declaration] };
  return checkSeries(catalogue).map((problem) => problem.code);
}

const row = (output: string, formulaRef: SnapshotOutputRow['formula'], candidateId: string | null): SnapshotOutputRow => ({
  output,
  formula: formulaRef,
  candidateId,
  missing: candidateId === null ? ['input:TEST-project:project.scope.cctv:unknown'] : [],
  incomplete: false,
});

describe('ADR 0047 (phase 6) · ADR 0052 decision 4 · checkSeries', () => {
  test('ADR 0047 · a good TEST catalogue has no problem; the production catalogue declares no series and has none', () => {
    expect(checkSeries(testCatalogueOf([BREAKDOWN, SEQUENCE]))).toEqual([]);
    expect(seriesOf(PRODUCTION_CATALOGUE)).toEqual([]);
    expect(checkSeries(PRODUCTION_CATALOGUE)).toEqual([]);
    expect(seriesOf({ kind: 'test', formulas: [] })).toEqual([]);
  });

  test.each<[string, SeriesDeclaration, SeriesProblemCode]>([
    ['an id that is no value-id path', { ...BREAKDOWN, id: 'capex.TEST-bySystem' }, 'series_id_invalid'],
    ['an id with an empty segment', { ...BREAKDOWN, id: 'capex..TEST_bySystem' }, 'series_id_invalid'],
    ['a formula the catalogue does not hold', { ...BREAKDOWN, formula: 'TEST-elsewhere' }, 'formula_not_in_catalogue'],
    ['a total that is no output of the formula', { ...BREAKDOWN, total: 'capex.TEST_other' }, 'output_not_of_formula'],
    ['a point whose output is no output of the formula', { ...BREAKDOWN, points: [{ key: 'hvac', output: 'payback.TEST_periods', name: { kind: 'system', systemId: 'hvac' } }] }, 'output_not_of_formula'],
    ['a point key that is no value-id segment', { ...BREAKDOWN, points: [{ key: 'Hvac', output: 'capex.TEST_bySystem.hvac', name: { kind: 'system', systemId: 'hvac' } }] }, 'point_key_invalid'],
    ['a point key that starts with a digit', { ...BREAKDOWN, points: [{ key: '0hvac', output: 'capex.TEST_bySystem.hvac', name: { kind: 'system', systemId: 'hvac' } }] }, 'point_key_invalid'],
    [
      'a point key used twice',
      {
        ...BREAKDOWN,
        points: [
          { key: 'hvac', output: 'capex.TEST_bySystem.hvac', name: { kind: 'system', systemId: 'hvac' } },
          { key: 'hvac', output: 'capex.TEST_bySystem.cctv', name: { kind: 'system', systemId: 'cctv' } },
        ],
      },
      'point_key_repeated',
    ],
    [
      'an output drawn twice',
      {
        ...BREAKDOWN,
        points: [
          { key: 'hvac', output: 'capex.TEST_bySystem.hvac', name: { kind: 'system', systemId: 'hvac' } },
          { key: 'cctv', output: 'capex.TEST_bySystem.hvac', name: { kind: 'system', systemId: 'cctv' } },
        ],
      },
      'output_repeated',
    ],
    ['the total drawn again as a point', { ...BREAKDOWN, points: [{ key: 'hvac', output: 'capex.TEST_bySystem.total', name: { kind: 'system', systemId: 'hvac' } }] }, 'output_repeated'],
    ['a breakdown with no total', { ...BREAKDOWN, total: null }, 'breakdown_without_total'],
    ['a sequence with a total', { ...SEQUENCE, total: 'payback.TEST_periods' }, 'sequence_with_total'],
    ['a series with no point', { ...BREAKDOWN, points: [] }, 'no_points'],
    ['a series in a TEST catalogue whose id carries no TEST', { ...BREAKDOWN, id: 'capex.bySystem' }, 'production_series_in_test'],
  ])('ADR 0047 · %s is refused (%s)', (_what, declaration, code) => {
    expect(codesOf(declaration)).toContain(code);
  });

  test('ADR 0047 · G1-16 · a TEST series in the production catalogue is refused (by its id or its formula), and a series repeated in one catalogue', () => {
    expect(codesOf(BREAKDOWN, 'production', [TEST_FORMULA])).toContain('test_series_in_production');
    expect(codesOf({ ...BREAKDOWN, id: 'capex.bySystem' }, 'production', [TEST_FORMULA])).toContain('test_series_in_production');
    const repeated = checkSeries(testCatalogueOf([BREAKDOWN, BREAKDOWN]));
    expect(repeated.map((problem) => problem.code)).toEqual(['series_id_repeated']);
    expect(repeated[0]?.series).toBe('capex.TEST_bySystem');
    expect(repeated[0]?.message.length).toBeGreaterThan(0);
  });

  test('ADR 0047 · G9-4 · runEngine refuses a catalogue whose series are faulted, before any formula runs (as it refuses a misdeclared benchmark: G9-4)', () => {
    const faulted = testCatalogueOf([{ ...BREAKDOWN, total: null }]);
    const input = { projectId: 'TEST-project', fields: new Map(), subjectOf: () => undefined, closedGates: new Set<string>(), datasets: () => undefined, author: 'TEST-engine' };
    expect(() => runEngine(faulted, input, { newId: () => 'TEST-id', at: '2026-10-07T09:00:00.000Z' })).toThrow(EngineInputError);
    expect(() => runEngine(faulted, input, { newId: () => 'TEST-id', at: '2026-10-07T09:00:00.000Z' })).toThrow(/breakdown_without_total/u);
    const run = runEngine(testCatalogueOf([BREAKDOWN, SEQUENCE]), input, { newId: () => 'TEST-id', at: '2026-10-07T09:00:00.000Z' });
    expect(run.outputs.map((output) => output.output)).toEqual([...TEST_FORMULA.signature.outputs, ...TEST_SEQUENCE.signature.outputs]);
  });
});

describe('ADR 0047 (phase 6) · G9-8 · G9-9 · G1-5 · seriesRowsOf', () => {
  const ref = 'TEST-bySystem@1.0.0' as const;
  const rows: SnapshotOutputRow[] = [
    row('capex.TEST_bySystem.total', ref, 'TEST-candidate-total'),
    row('capex.TEST_bySystem.cctv', ref, null),
    row('capex.TEST_bySystem.hvac', ref, 'TEST-candidate-hvac'),
    row('points.TEST_other', 'TEST-other@1.0.0', 'TEST-candidate-other'),
  ];

  test('G9-8 · the total and each point are the snapshot\'s own rows, in the declared order, from one formula version', () => {
    const read = seriesRowsOf(BREAKDOWN, rows);
    expect(read?.formula).toBe(ref);
    expect(read?.total?.candidateId).toBe('TEST-candidate-total');
    expect(read?.points.map((entry) => [entry.point.key, entry.row.candidateId])).toEqual([
      ['hvac', 'TEST-candidate-hvac'],
      ['cctv', null],
    ]);
    expect(read?.declaration).toBe(BREAKDOWN);
  });

  test('G1-5 · a point with no candidate stays in the answer with what it was missing: a labelled gap, never dropped and never zero', () => {
    const gap = seriesRowsOf(BREAKDOWN, rows)?.points.find((entry) => entry.point.key === 'cctv');
    expect(gap?.row).toEqual(row('capex.TEST_bySystem.cctv', ref, null));
  });

  test('ADR 0047 · a snapshot holding no row of the series answers null (generated with a catalogue that did not declare it); a sequence has no total', () => {
    expect(seriesRowsOf(BREAKDOWN, [row('points.TEST_other', 'TEST-other@1.0.0', 'TEST-x')])).toBeNull();
    expect(seriesRowsOf(BREAKDOWN, [])).toBeNull();
    const sequence = seriesRowsOf(SEQUENCE, [row('cashFlow.TEST_cumulative.y00', 'TEST-flow@1.0.0', 'a'), row('cashFlow.TEST_cumulative.y01', 'TEST-flow@1.0.0', 'b')]);
    expect(sequence?.total).toBeNull();
    expect(sequence?.points).toHaveLength(2);
  });

  test('G9-9 · rows of two formula versions, of another formula, or a row twice are refused', () => {
    const mixed = rows.map((entry) => (entry.output === 'capex.TEST_bySystem.cctv' ? { ...entry, formula: 'TEST-bySystem@2.0.0' as const } : entry));
    expect(() => seriesRowsOf(BREAKDOWN, mixed)).toThrow(EngineInputError);
    const other = rows.map((entry) => (entry.output.startsWith('capex.') ? { ...entry, formula: 'TEST-elsewhere@1.0.0' as const } : entry));
    expect(() => seriesRowsOf(BREAKDOWN, other)).toThrow(EngineInputError);
    expect(() => seriesRowsOf(BREAKDOWN, [...rows, row('capex.TEST_bySystem.hvac', ref, 'TEST-candidate-again')])).toThrow(EngineInputError);
  });

  test('A-2 (phase 6 part B) · G1-31 · a snapshot holding only part of the series (generated by an earlier formula version that output the total and no line) answers null: the series did not run there, never a refusal', () => {
    // P-6-SERIES-SIGNATURES: a next version outputs lines beside a total every earlier version already stored.
    const earlier = [row('capex.TEST_bySystem.total', 'TEST-bySystem@0.9.0', 'TEST-candidate-total'), row('points.TEST_other', 'TEST-other@1.0.0', 'TEST-x')];
    expect(seriesRowsOf(BREAKDOWN, earlier)).toBeNull();
    expect(seriesRowsOf(BREAKDOWN, rows.filter((entry) => entry.output !== 'capex.TEST_bySystem.cctv'))).toBeNull();
  });
});

describe('A-3 (phase 6 part B) · rule 10 · checkSeries: the parts of an investment carry its stage', () => {
  const staged = formula('TEST-staged', ['capex.preliminaryEstimate', 'capex.TEST_staged.hvac', 'capex.indicativeRange']);
  const investment: SeriesDeclaration = {
    id: 'capex.TEST_staged',
    kind: 'breakdown',
    formula: 'TEST-staged',
    total: 'capex.preliminaryEstimate',
    points: [{ key: 'hvac', output: 'capex.TEST_staged.hvac', name: { kind: 'system', systemId: 'hvac' } }],
  };

  test('A-3 · rule 10, "Investment figures move through three stages, and each has a fixed name": a breakdown whose total carries a stage and one of whose parts does not is refused', () => {
    expect(codesOf(investment, 'test', [staged])).toEqual(['investment_part_without_stage']);
  });

  test('A-3 · a breakdown whose total carries no stage, or whose parts all carry one, has no such problem', () => {
    expect(codesOf(BREAKDOWN)).toEqual([]);
    expect(codesOf({ ...investment, points: [{ key: 'hvac', output: 'capex.indicativeRange', name: { kind: 'system', systemId: 'hvac' } }] }, 'test', [staged])).toEqual([]);
  });
});
