/**
 * Unit and property tests of `runEngine` (docs/adr/0047 decision 5 and "Built"): requirements and gates, the dataset
 * boundary (prompt 3 5.4), the readings of inputs (unknown, skipped, pending, ambiguous), the refusals of a body's
 * answer, and determinism (the same input gives the same run and the same hash). The TEST catalogues here are written
 * inline (src/ may not reach packages/engine/test-formulas/); the guardrail cases run the TEST formulas themselves.
 */
import fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { NO_EVENTS, derive, type Candidate, type FieldDefinition, type FieldEvent } from '@sovitech/domain';
import { unitByCode, type LoadedDataset } from '@sovitech/registry';
import type { BodyOutput, EngineFormula, FormulaBody, FormulaCatalogue } from './catalogue';
import { EngineInputError } from './errors';
import { fieldKeyOf, type EngineField, type EngineInput } from './inputs';
import { exact, interval, point, type Interval } from './interval';
import { methodNotesOf } from './notes';
import { runEngine } from './run';

const PROJECT = 'test-project-run';
const CHOICE: FieldDefinition = {
  key: 'project.TEST_choice',
  label: 'TEST choice',
  subject: 'project',
  kind: 'enum',
  options: ['TEST_a', 'TEST_b', 'TEST_c'],
  estimation: 'forbidden',
  criticality: 'optional',
  affects: [],
  impactRank: 1,
  confirmBy: 'owner',
};
const AMOUNT: FieldDefinition = { ...CHOICE, key: 'project.TEST_amount', label: 'TEST amount', kind: 'quantity', unit: 'kWh', options: undefined, confirmBy: 'engineer' };
const OUT: FieldDefinition = { ...AMOUNT, key: 'project.TEST_out', label: 'TEST out', estimation: 'allowed' };
const definitions = new Map([CHOICE, AMOUNT, OUT].map((field) => [field.key, field]));

const at = (minute: number): string => new Date(Date.UTC(2026, 8, 25, 9, minute)).toISOString();
const choice = (id: string, value: string, minute = 1): Candidate => ({ id, subjectId: PROJECT, fieldKey: CHOICE.key, choice: value, source: 'user', evidence: [], createdBy: 'test-owner', authorRole: 'owner', createdAt: at(minute) });
const amount = (id: string, value: number, alternatives?: readonly number[]): Candidate => ({
  id,
  subjectId: PROJECT,
  fieldKey: AMOUNT.key,
  quantity: { value, unit: 'kWh' },
  ...(alternatives === undefined ? {} : { alternatives: alternatives.map((reading) => ({ value: reading, unit: 'kWh' })), confidence: 'low' as const }),
  source: 'user',
  evidence: [],
  createdBy: 'test-engineer',
  authorRole: 'sovitech_engineer',
  createdAt: at(1),
});

function field(definition: FieldDefinition, candidates: readonly Candidate[], fieldEvents: readonly FieldEvent[] = []): EngineField {
  const state = derive(definition, candidates, { ...NO_EVENTS, field: fieldEvents }, {
    subjectId: PROJECT,
    document: () => undefined,
    unit: unitByCode,
    inputState: () => undefined,
    datasetApproved: () => false,
  });
  return { definition, subjectId: PROJECT, state, candidates };
}

function input(fields: readonly EngineField[], extra: Partial<EngineInput> = {}): EngineInput {
  return {
    projectId: PROJECT,
    fields: new Map(fields.map((item) => [fieldKeyOf(item.subjectId, item.definition.key), item])),
    subjectOf: () => PROJECT,
    closedGates: new Set(),
    datasets: () => undefined,
    author: 'test-engine',
    fieldDefinition: (key) => definitions.get(key),
    ...extra,
  };
}

/** A TEST body: the amount times a factor per choice (1, 2, 3 for TEST_a, b, c), an estimate with a width of 10%. */
const FACTOR: Readonly<Record<string, number>> = { TEST_a: 1, TEST_b: 2, TEST_c: 3 };
const body: FormulaBody = (inputs) => {
  const amountValues = inputs.readings.get(AMOUNT.key)?.values ?? [];
  const choices = inputs.readings.get(CHOICE.key)?.values.map((value) => value.choice ?? '') ?? inputs.over.get(CHOICE.key) ?? [];
  const lows: Interval[] = [];
  for (const option of choices) for (const value of amountValues) lows.push(point(value.quantity?.value.times(exact(FACTOR[option] ?? Number.NaN)) ?? exact(Number.NaN)));
  const low = lows.map((item) => item.low).reduce((a, b) => (a.lessThan(b) ? a : b));
  const high = lows.map((item) => item.high).reduce((a, b) => (a.greaterThan(b) ? a : b)).times(exact(1.1));
  const range = interval(low.times(exact(0.9)), high);
  return { 'TEST.out': { kind: 'estimate', value: point(range.low.plus(range.high).times(exact(0.5))), range, unit: 'kWh', assumptions: ['TEST method'] } };
};

function catalogue(overrides: Partial<EngineFormula> = {}, policy: 'refuse' | 'range_over_options' = 'range_over_options'): FormulaCatalogue {
  return {
    kind: 'test',
    formulas: [
      {
        signature: { id: 'TEST-runUnit', version: '1.0.0', inputs: [CHOICE.key, AMOUNT.key], outputs: ['TEST.out'], unknownPolicy: policy, estimated: true },
        requires: [],
        outputFields: { 'TEST.out': OUT.key },
        body,
        ...overrides,
      },
    ],
  };
}

const sequence = (): (() => string) => {
  let n = 0;
  return () => `test-cand-run-${String((n += 1))}`;
};
const options = () => ({ newId: sequence(), at: at(30) });

describe('ADR 0047 decision 5 · runEngine', () => {
  test('property · the same input gives the same run and the same inputs hash; ids aside, nothing varies', () => {
    fc.assert(
      fc.property(fc.constantFrom('TEST_a', 'TEST_b', 'TEST_c', null), fc.integer({ min: 1, max: 1_000_000 }), (picked, value) => {
        const fields = [field(CHOICE, picked === null ? [] : [choice('test-cand-choice', picked)]), field(AMOUNT, [amount('test-cand-amount', value)])];
        const first = runEngine(catalogue(), input(fields), options());
        const second = runEngine(catalogue(), input([...fields].reverse()), options());
        expect(second).toEqual(first);
      }),
      { numRuns: 60 },
    );
  });

  test('property · the inputs hash changes whenever an input candidate deciding the value changes', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1_000_000 }), fc.integer({ min: 1, max: 1_000_000 }), (a, b) => {
        const run = (id: string, value: number) => runEngine(catalogue(), input([field(CHOICE, [choice('test-cand-choice', 'TEST_a')]), field(AMOUNT, [amount(id, value)])]), options());
        expect(run('test-cand-x', a).inputsHash === run('test-cand-y', b).inputsHash).toBe(false);
        expect(run('test-cand-x', a).inputsHash).toBe(run('test-cand-x', b).inputsHash);
      }),
      { numRuns: 30 },
    );
  });

  test('a skipped enum under range_over_options ranges over its options; under refuse it names it skipped', () => {
    const skipped: FieldEvent = { subjectId: PROJECT, fieldKey: CHOICE.key, type: 'skipped', by: 'test-owner', role: 'owner', at: at(2) };
    const fields = [field(CHOICE, [], [skipped]), field(AMOUNT, [amount('test-cand-amount', 100)])];
    const [ranged] = runEngine(catalogue(), input(fields), options()).outputs;
    expect(ranged?.kind).toBe('figure');
    if (ranged?.kind === 'figure') expect(methodNotesOf(ranged.candidate.method)).toContainEqual({ kind: 'range_over_options', subjectId: PROJECT, fieldKey: CHOICE.key });
    const [refused] = runEngine(catalogue({}, 'refuse'), input(fields), options()).outputs;
    expect(refused).toMatchObject({ kind: 'not_available', missing: [{ kind: 'input', fieldKey: CHOICE.key, reason: 'skipped' }] });
  });

  test('an analysis still running names the input pending; a missing field reads unknown', () => {
    const started: FieldEvent = { subjectId: PROJECT, fieldKey: AMOUNT.key, type: 'analysis_started', by: 'test-system', role: 'system', at: at(2) };
    const [pending] = runEngine(catalogue({}, 'refuse'), input([field(CHOICE, [choice('test-cand-choice', 'TEST_a')]), field(AMOUNT, [], [started])]), options()).outputs;
    expect(pending).toMatchObject({ kind: 'not_available', missing: [{ kind: 'input', fieldKey: AMOUNT.key, reason: 'pending' }] });
    const [absent] = runEngine(catalogue({}, 'refuse'), input([field(CHOICE, [choice('test-cand-choice', 'TEST_a')])]), options()).outputs;
    expect(absent).toMatchObject({ kind: 'not_available', missing: [{ kind: 'input', fieldKey: AMOUNT.key, reason: 'unknown' }] });
  });

  test('rule 8 · an ambiguous reading is never read one way: named ambiguous without a range, ranged over both readings with one', () => {
    const fields = [field(CHOICE, [choice('test-cand-choice', 'TEST_a')]), field(AMOUNT, [amount('test-cand-amount', 1.5, [1500])])];
    expect(runEngine(catalogue({}, 'refuse'), input(fields), options()).outputs[0]).toMatchObject({ kind: 'not_available', missing: [{ kind: 'input', reason: 'ambiguous' }] });
    const [ranged] = runEngine(catalogue(), input(fields), options()).outputs;
    expect(ranged?.kind).toBe('figure');
    if (ranged?.kind !== 'figure') return;
    expect(methodNotesOf(ranged.candidate.method)).toContainEqual({ kind: 'range_over_values', subjectId: PROJECT, fieldKey: AMOUNT.key });
    expect(ranged.candidate.range?.low).toBeLessThan(1.5);
    expect(ranged.candidate.range?.high).toBeGreaterThan(1500);
  });

  test('a closed gate or a missing dataset names the dataset; a closed unit gate names the unit; the body never runs', () => {
    let ran = false;
    const watched: FormulaBody = (inputs) => {
      ran = true;
      return body(inputs);
    };
    const requires = [
      { kind: 'dataset' as const, datasetId: 'TEST-held', name: 'TEST held dataset', gate: 'TEST-gate' },
      { kind: 'unit' as const, name: 'TEST unit', gate: 'TEST-unit-gate' },
    ];
    const stand: LoadedDataset = { id: 'TEST-held', version: 'TEST-1', entries: {}, approvalRef: 'TEST: none' };
    const fields = [field(CHOICE, [choice('test-cand-choice', 'TEST_a')]), field(AMOUNT, [amount('test-cand-amount', 100)])];
    const [output] = runEngine(catalogue({ body: watched, requires }), input(fields, { closedGates: new Set(['TEST-gate', 'TEST-unit-gate']), datasets: () => stand }), options()).outputs;
    expect(output).toMatchObject({
      kind: 'not_available',
      missing: [
        { kind: 'dataset', datasetId: 'TEST-held', gate: 'TEST-gate' },
        { kind: 'unit', gate: 'TEST-unit-gate' },
      ],
    });
    expect(ran).toBe(false);
  });

  test('prompt 3 5.4 · a TEST catalogue is refused outside the test runner; a production catalogue refuses TEST formulas and datasets', () => {
    const saved = process.env['VITEST'];
    delete process.env['VITEST'];
    try {
      expect(() => runEngine(catalogue(), input([]), options())).toThrow(/test runner/u);
    } finally {
      process.env['VITEST'] = saved;
    }
    const production = (formula: EngineFormula): FormulaCatalogue => ({ kind: 'production', formulas: [formula] });
    const [formula] = catalogue().formulas;
    if (formula === undefined) throw new Error('no formula');
    expect(() => runEngine(production(formula), input([]), options())).toThrow(/TEST formula/u);
    const real = { ...formula, signature: { ...formula.signature, id: 'runUnit' }, requires: [{ kind: 'dataset' as const, datasetId: 'TEST-x', name: 'TEST x', gate: null }] };
    expect(() => runEngine(production(real), input([]), options())).toThrow(/TEST dataset/u);
    // A production formula never reads a dataset the loader did not accept.
    const loaded = { ...real, requires: [{ kind: 'dataset' as const, datasetId: 'sovitech-x', name: 'x', gate: null }] };
    const forged: LoadedDataset = { id: 'sovitech-x', version: '1', entries: {}, approvalRef: 'forged' };
    const fields = [field(CHOICE, [choice('test-cand-choice', 'TEST_a')]), field(AMOUNT, [amount('test-cand-amount', 100)])];
    expect(() => runEngine(production(loaded), input(fields, { datasets: () => forged }), options())).toThrow(EngineInputError);
  });

  test('a body answer the engine cannot hold is refused and recorded: an undeclared output, a missing one, no output field, a wrong unit', () => {
    const fields = [field(CHOICE, [choice('test-cand-choice', 'TEST_a')]), field(AMOUNT, [amount('test-cand-amount', 100)])];
    const answer = (out: Readonly<Record<string, BodyOutput>>): FormulaBody => () => out;
    const estimateIn = (unit: string): BodyOutput => ({ kind: 'estimate', value: point(exact(2)), range: interval(exact(1), exact(3)), unit, assumptions: [] });
    const reasons = (formula: Partial<EngineFormula>, extra: Partial<EngineInput> = {}) => runEngine(catalogue(formula), input(fields, extra), options()).refusals.map((refusal) => refusal.reason);
    expect(reasons({ body: answer({ 'TEST.out': estimateIn('kWh'), 'TEST.other': estimateIn('kWh') }) })).toEqual(['answer_undeclared']);
    expect(reasons({ body: answer({}) })).toEqual(['answer_missing']);
    expect(reasons({ outputFields: {} })).toEqual(['no_output_field']);
    expect(reasons({}, { fieldDefinition: () => undefined })).toEqual(['no_output_field']);
    // Without a registry lookup, the output field's entry as the input hands it serves.
    const handed = runEngine(catalogue(), { ...input([...fields, field(OUT, [])]), fieldDefinition: undefined }, options());
    expect(handed.refusals).toEqual([]);
    expect(handed.outputs[0]?.kind).toBe('figure');
    expect(reasons({ body: answer({ 'TEST.out': estimateIn('kW') }) })).toEqual(['output_field_unit']);
    expect(reasons({}, { fieldDefinition: (key) => (key === OUT.key ? { ...OUT, estimation: 'forbidden' } : definitions.get(key)) })).toEqual(['output_field_estimation_forbidden']);
  });

  test('a figure carries its method: formula, version, the exact inputs, the policy, the coded notes and the range', () => {
    const fields = [field(CHOICE, [choice('test-cand-choice', 'TEST_b')]), field(AMOUNT, [amount('test-cand-amount', 100)])];
    const [output] = runEngine(catalogue(), input(fields), options()).outputs;
    expect(output?.kind).toBe('figure');
    if (output?.kind !== 'figure') return;
    expect(output.candidate).toMatchObject({
      id: 'test-cand-run-1',
      subjectId: PROJECT,
      fieldKey: OUT.key,
      source: 'estimated',
      evidence: [],
      createdBy: 'test-engine',
      method: { formulaId: 'TEST-runUnit', formulaVersion: '1.0.0', inputCandidateIds: ['test-cand-amount', 'test-cand-choice'], unknownPolicy: 'range_over_options', assumptions: ['note:TEST method'] },
      range: { low: 180, high: 220 },
      quantity: { value: 200, unit: 'kWh' },
    });
  });
});
