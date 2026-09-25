/**
 * The unknown-input plan of a declared formula signature (docs/guardrails.md
 * rule 1, "Formulas declare how they handle unknowns" and "Ranges need a
 * basis"). The default is G1-9's (tests/guardrails/G1-9.test.ts). Every entry
 * here is a TEST entry.
 */
import { describe, expect, it } from 'vitest';
import { planFormulaRun, resolveUnknownPolicy } from './unknown-policy';

const fields = new Map([
  ['building.TEST_type', { kind: 'enum' as const, options: ['TEST_a', 'TEST_b'] }],
  ['building.TEST_flag', { kind: 'decision' as const, options: ['selected', 'not_selected'] }],
  ['building.TEST_area', { kind: 'quantity' as const }],
  ['building.TEST_single', { kind: 'enum' as const, options: ['TEST_only'] }],
]);
const field = (key: string) => fields.get(key);
const inputs = [...fields.keys()];

describe('planFormulaRun', () => {
  it('runs when every input is known, under any policy', () => {
    for (const unknownPolicy of ['refuse', 'exclude_and_count', 'range_over_options'] as const) {
      expect(planFormulaRun({ inputs, unknownPolicy }, () => true, field)).toEqual({ action: 'run', policy: unknownPolicy });
    }
  });

  it('ranges over the options of unknown enums and decisions, and refuses an unknown with no basis for a range', () => {
    const unknown = new Set(['building.TEST_type', 'building.TEST_flag']);
    expect(planFormulaRun({ inputs, unknownPolicy: 'range_over_options' }, (key) => !unknown.has(key), field)).toEqual({
      action: 'range_over_options',
      policy: 'range_over_options',
      over: [
        { fieldKey: 'building.TEST_type', options: ['TEST_a', 'TEST_b'] },
        { fieldKey: 'building.TEST_flag', options: ['selected', 'not_selected'] },
      ],
    });
    for (const key of ['building.TEST_area', 'building.TEST_single', 'building.TEST_absent']) {
      const plan = planFormulaRun({ inputs: [...inputs, 'building.TEST_absent'], unknownPolicy: 'range_over_options' }, (input) => input !== key, field);
      expect(plan, key).toEqual({ action: 'refuse', policy: 'range_over_options', missing: [key] });
    }
  });

  it('leaves unknown inputs out and counts them under exclude_and_count', () => {
    expect(planFormulaRun({ inputs, unknownPolicy: 'exclude_and_count' }, (key) => key !== 'building.TEST_area', field)).toEqual({
      action: 'exclude_and_count',
      policy: 'exclude_and_count',
      excluded: ['building.TEST_area'],
    });
  });

  it('reads a declared policy as declared', () => {
    expect(resolveUnknownPolicy({ inputs, unknownPolicy: 'exclude_and_count' })).toBe('exclude_and_count');
  });
});
