/**
 * G1-9 (docs/guardrails.md section 7; rule 1 "Formulas declare how they handle unknowns":
 * "Each formula's `unknownPolicy` must be declared, and the default is `refuse`").
 * Situation: the formula has no declared unknownPolicy.
 * Expected: treated as refuse.
 *
 * Phase 1 declares formula signatures before their bodies exist (prompt 3
 * section 10). The registry reads a signature's policy, and plans every run
 * from it: the sensitivity test runs formulas through that plan today, and the
 * engine does from phase 5. The case checks the three places a policy is read:
 * the signature itself, the run plan (an unknown input refuses the run and
 * names what is missing, where a declared `range_over_options` would range over
 * the options), and the sensitivity test, which never calls the body of a
 * refused run. The formula here is a TEST signature; the production registry
 * declares a policy on every signature it holds.
 */
import fc from 'fast-check';
import { expect, test, vi } from 'vitest';
import { planFormulaRun, resolveUnknownPolicy } from '@sovitech/registry';
import { PROPOSED_SETTINGS, runSensitivityTest, type RegistryBundle, type RegistryFieldDefinition } from '@sovitech/registry/validation';

const scheduleField: RegistryFieldDefinition = {
  key: 'project.TEST_schedule',
  label: 'TEST schedule',
  subject: 'project',
  kind: 'enum',
  options: ['TEST_a', 'TEST_b', 'TEST_c'],
  estimation: 'forbidden',
  criticality: 'optional',
  affects: [{ output: 'TEST.energy', via: 'formula:TEST_energyNoPolicy@1' }],
  impactRank: 1,
  confirmBy: 'owner',
  confirmByBasis: 'use_and_occupancy',
};

const areaField: RegistryFieldDefinition = {
  key: 'building.TEST_area',
  label: 'TEST area',
  subject: 'building',
  kind: 'quantity',
  unit: 'm2',
  qualifierRequired: true,
  estimation: 'forbidden',
  criticality: 'optional',
  affects: [{ output: 'TEST.energy', via: 'formula:TEST_energyNoPolicy@1' }],
  impactRank: 2,
  confirmBy: 'engineer',
};

/** A TEST signature with no unknownPolicy. */
const noPolicy = {
  id: 'TEST_energyNoPolicy',
  version: '1',
  inputs: [scheduleField.key, areaField.key],
  outputs: ['TEST.energy'],
} as const;

const fields = new Map([scheduleField, areaField].map((field) => [field.key, field]));
const lookup = (key: string): RegistryFieldDefinition | undefined => fields.get(key);

test('G1-9 · a signature with no declared unknownPolicy is read as refuse', () => {
  expect(resolveUnknownPolicy(noPolicy)).toBe('refuse');
  expect(resolveUnknownPolicy({ ...noPolicy, unknownPolicy: 'range_over_options' })).toBe('range_over_options');
});

test('G1-9 · an unknown input refuses the run and names what is missing; the declared range policy would range instead', () => {
  const unknownSchedule = (key: string): boolean => key !== scheduleField.key;
  expect(planFormulaRun(noPolicy, unknownSchedule, lookup)).toEqual({ action: 'refuse', policy: 'refuse', missing: [scheduleField.key] });
  // The same unknown enum under a declared range_over_options policy ranges over its options.
  expect(planFormulaRun({ ...noPolicy, unknownPolicy: 'range_over_options' }, unknownSchedule, lookup)).toEqual({
    action: 'range_over_options',
    policy: 'range_over_options',
    over: [{ fieldKey: scheduleField.key, options: ['TEST_a', 'TEST_b', 'TEST_c'] }],
  });
  // With every input known, the run goes ahead under either policy.
  expect(planFormulaRun(noPolicy, () => true, lookup)).toEqual({ action: 'run', policy: 'refuse' });
});

test('G1-9 · whichever inputs are unknown, a formula with no declared policy never runs on a partial input set', () => {
  fc.assert(
    fc.property(fc.subarray([scheduleField.key, areaField.key], { minLength: 1 }), (unknown) => {
      const plan = planFormulaRun(noPolicy, (key) => !unknown.includes(key), lookup);
      expect(plan.action).toBe('refuse');
      if (plan.action === 'refuse') expect([...plan.missing].sort()).toEqual([...unknown].sort());
    }),
  );
});

test('G1-9 · the sensitivity test does not call the body of a refused run', () => {
  const registry: RegistryBundle = {
    id: 'TEST-g1-9',
    version: 'TEST',
    units: [{ code: 'm2', symbol: 'm²', dimension: 'area' }],
    fields: [scheduleField, areaField],
    questions: [{ id: 'q.TEST_schedule', kind: 'question', fieldKeys: [scheduleField.key] }],
    formulas: [{ ...noPolicy, inputs: [...noPolicy.inputs], outputs: [...noPolicy.outputs] }],
    templateSlots: [],
    datasets: [],
    settings: PROPOSED_SETTINGS,
  };
  const body = vi.fn(() => ({ 'TEST.energy': 'TEST computed' }));
  // The fixture project holds no area, so every run of the formula is refused.
  const report = runSensitivityTest(registry, {
    fixture: { id: 'TEST-g1-9-fixture', values: { [scheduleField.key]: 'TEST_a' } },
    formulas: { 'formula:TEST_energyNoPolicy@1': body },
  });
  expect(body).not.toHaveBeenCalled();
  expect(report.ok).toBe(false);
  expect(report.outcomes[0]?.problem).toContain('refused');
  expect(report.outcomes[0]?.problem).toContain(areaField.key);
});
