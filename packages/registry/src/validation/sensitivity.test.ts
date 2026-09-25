/**
 * The sensitivity-test harness (docs/guardrails.md rule 6; F-QUESTION-03).
 * Phase 0 proves it on a tiny in-test registry and TEST formula: an answer
 * that reaches a declared output passes, and a question with no effect fails
 * (the shape of G6-1). Everything here is synthetic.
 */
import { describe, expect, it } from 'vitest';
import { PROPOSED_SETTINGS } from './policy';
import type { RegistryFieldDefinition, RegistryBundle } from './schema';
import { runSensitivityTest, type SensitivitySuite } from './sensitivity';

const choiceField: RegistryFieldDefinition = {
  key: 'building.testChoice',
  label: 'Test choice',
  subject: 'building',
  kind: 'enum',
  options: ['alpha', 'beta'],
  estimation: 'forbidden',
  criticality: 'optional',
  impactRank: 1,
  confirmBy: 'owner',
  confirmByBasis: 'use_and_occupancy',
  affects: [{ output: 'test.output', via: 'formula:testOutput@1' }],
};

function registry(overrides: Partial<RegistryBundle> = {}): RegistryBundle {
  return {
    id: 'TEST-sensitivity-registry',
    version: '1',
    units: [],
    fields: [choiceField],
    questions: [{ id: 'q.testChoice', kind: 'question', fieldKeys: ['building.testChoice'] }],
    formulas: [{ id: 'testOutput', version: '1', inputs: ['building.testChoice'], outputs: ['test.output'] }],
    templateSlots: [],
    datasets: [],
    settings: PROPOSED_SETTINGS,
    ...overrides,
  };
}

function suite(overrides: Partial<SensitivitySuite> = {}): SensitivitySuite {
  return {
    fixture: { id: 'TEST-fixture-project', values: { 'building.testChoice': 'alpha' } },
    formulas: {
      'formula:testOutput@1': (inputs) => ({ 'test.output': inputs['building.testChoice'] === 'alpha' ? 'first' : 'second' }),
    },
    ...overrides,
  };
}

describe('runSensitivityTest', () => {
  it('passes a question whose answer changes a declared output', () => {
    const report = runSensitivityTest(registry(), suite());
    expect(report.ok).toBe(true);
    expect(report.outcomes).toEqual([
      {
        questionId: 'q.testChoice',
        fieldKey: 'building.testChoice',
        ok: true,
        answersTried: 2,
        changed: ['test.output via formula:testOutput@1'],
      },
    ]);
  });

  it('G6-1 shape: fails a question whose answer changes no declared output', () => {
    const report = runSensitivityTest(registry(), suite({ formulas: { 'formula:testOutput@1': () => ({ 'test.output': 'same' }) } }));
    expect(report.ok).toBe(false);
    expect(report.outcomes[0]?.ok).toBe(false);
    expect(report.outcomes[0]?.problem).toContain('changed no declared output');
  });

  it('counts only declared outputs: a change in an undeclared output does not save the question', () => {
    const report = runSensitivityTest(
      registry(),
      suite({
        formulas: {
          'formula:testOutput@1': (inputs) => ({ 'test.output': 'same', 'test.undeclared': inputs['building.testChoice'] }),
        },
      }),
    );
    expect(report.ok).toBe(false);
  });

  it('passes only the formula its declared inputs, so a formula cannot read an undeclared field', () => {
    const seen: string[][] = [];
    runSensitivityTest(
      registry(),
      suite({
        fixture: { id: 'TEST-fixture-project', values: { 'building.testChoice': 'alpha', 'building.notAnInput': 'x' } },
        formulas: {
          'formula:testOutput@1': (inputs) => {
            seen.push(Object.keys(inputs).sort());
            return { 'test.output': inputs['building.testChoice'] };
          },
        },
      }),
    );
    expect(seen).toEqual([['building.testChoice'], ['building.testChoice']]);
  });

  it('fails when no TEST implementation exists for a declared formula', () => {
    const report = runSensitivityTest(registry(), suite({ formulas: {} }));
    expect(report.ok).toBe(false);
    expect(report.outcomes[0]?.problem).toContain('no TEST implementation for formula:testOutput@1');
  });

  it('fails when the formula throws, naming the error', () => {
    const report = runSensitivityTest(
      registry(),
      suite({
        formulas: {
          'formula:testOutput@1': () => {
            throw new Error('boom');
          },
        },
      }),
    );
    expect(report.outcomes[0]?.problem).toContain('boom');
  });

  it('fails when the formula returns no value for the declared output', () => {
    const report = runSensitivityTest(registry(), suite({ formulas: { 'formula:testOutput@1': () => ({}) } }));
    expect(report.outcomes[0]?.problem).toContain('returned no test.output');
  });

  it('fails when fewer than two answers can be tried', () => {
    const report = runSensitivityTest(registry({ fields: [{ ...choiceField, options: undefined, kind: 'text' }] }), suite());
    expect(report.outcomes[0]?.problem).toContain('fewer than two answers');
  });

  it('takes answers for a quantity question from the fixture probes', () => {
    const quantityField: RegistryFieldDefinition = {
      ...choiceField,
      kind: 'quantity',
      options: undefined,
      unit: 'm2',
      dimension: 'area',
    };
    const report = runSensitivityTest(
      registry({ fields: [quantityField] }),
      suite({
        fixture: {
          id: 'TEST-fixture-project',
          values: {},
          probes: { 'building.testChoice': [{ value: '1', unit: 'm2' }, { value: '2', unit: 'm2' }] },
        },
        formulas: { 'formula:testOutput@1': (inputs) => ({ 'test.output': inputs['building.testChoice'] }) },
      }),
    );
    expect(report.ok).toBe(true);
  });

  it('proves each field of a multi-select question on its own', () => {
    const optionField = (key: string, rank: number): RegistryFieldDefinition => ({
      ...choiceField,
      key,
      kind: 'decision',
      options: ['include', 'exclude'],
      impactRank: rank,
      confirmByBasis: 'owner_choice',
      affects: [{ output: 'test.scope', via: 'formula:testScope@1' }],
    });
    const report = runSensitivityTest(
      registry({
        fields: [optionField('project.system.a', 1), optionField('project.system.b', 2)],
        questions: [{ id: 'q.systems', kind: 'question', fieldKeys: ['project.system.a', 'project.system.b'] }],
        formulas: [{ id: 'testScope', version: '1', inputs: ['project.system.a', 'project.system.b'], outputs: ['test.scope'] }],
      }),
      suite({
        fixture: { id: 'TEST-fixture-project', values: { 'project.system.a': 'exclude', 'project.system.b': 'exclude' } },
        // Only system a reaches the output: system b's answer changes nothing.
        formulas: { 'formula:testScope@1': (inputs) => ({ 'test.scope': inputs['project.system.a'] }) },
      }),
    );
    expect(report.outcomes.map((outcome) => [outcome.fieldKey, outcome.ok])).toEqual([
      ['project.system.a', true],
      ['project.system.b', false],
    ]);
    expect(report.ok).toBe(false);
  });

  it('reads a template slot consumer through its TEST template', () => {
    const report = runSensitivityTest(
      registry({
        fields: [{ ...choiceField, affects: [{ output: 'proposal.testLine', via: 'template:proposal.testLine' }] }],
        formulas: [],
        templateSlots: [{ id: 'proposal.testLine', reads: ['building.testChoice'] }],
      }),
      suite({ formulas: {}, templates: { 'template:proposal.testLine': (inputs) => `line ${String(inputs['building.testChoice'])}` } }),
    );
    expect(report.ok).toBe(true);
  });

  it('refuses a dataset that is not a TEST dataset (prompt 3 5.4)', () => {
    const report = runSensitivityTest(registry(), suite({ datasets: { 'sovitech-cost-ranges': {} } }));
    expect(report.ok).toBe(false);
    expect(report.suiteProblems[0]).toContain('sovitech-cost-ranges');
    expect(report.outcomes).toEqual([]);
  });

  it('passes TEST datasets to the formula', () => {
    let received: unknown;
    runSensitivityTest(
      registry(),
      suite({
        datasets: { 'TEST-dataset': { marker: 'synthetic' } },
        formulas: {
          'formula:testOutput@1': (inputs, context) => {
            received = context.datasets['TEST-dataset'];
            return { 'test.output': inputs['building.testChoice'] };
          },
        },
      }),
    );
    expect(received).toEqual({ marker: 'synthetic' });
  });

  it('fails a question with no declared output to watch', () => {
    const report = runSensitivityTest(registry({ fields: [{ ...choiceField, affects: [] }] }), suite());
    expect(report.outcomes[0]?.problem).toContain('no declared output');
  });

  it('treats structurally equal outputs as unchanged, whatever their key order', () => {
    const report = runSensitivityTest(
      registry(),
      suite({
        formulas: {
          'formula:testOutput@1': (inputs) =>
            inputs['building.testChoice'] === 'alpha' ? { 'test.output': { a: 1, b: 2 } } : { 'test.output': { b: 2, a: 1 } },
        },
      }),
    );
    expect(report.ok).toBe(false);
  });
});
