/**
 * G8-17 (docs/guardrails.md section 7; section 10, "What counts as loosening. Any change that lets more
 * values through" and "It fails on any loosening without an approval record"; 2.7, "That dimension check
 * is how 'kW and kWh are never interchangeable' is enforced"; rule 8, "Units come from the registry,
 * grouped by dimension"). Phase 1 review, round 3, adversarial finding 4: the closed unit registry was in
 * no snapshot, so a new written form or a merged dimension left the check green.
 * Situation: with no approval record, a written form is added to a unit, or two dimensions are merged
 * (kVA into power), in the closed unit registry.
 * Expected: the loosening check fails.
 *
 * Run on the repository's own inputs with only the unit registry changed, and through the CI check on its
 * two seeded bad inputs (`unit-written-form-added`, `unit-dimensions-merged`). A new written form maps
 * more text to a unit; kVA read as power would pass the dimension check into kW fields. The property adds
 * a written form to any registered unit. The control: the repository as it is passes, with every unit
 * recorded.
 */
import { join } from 'node:path';
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { currentRegistryLists, evaluateLoosening, loadRepoLooseningInputs, type LooseningInputs } from '@sovitech/registry/validation';
import { runLoosening, seededInputs } from '../../tools/checks/loosening/core';

const repo = loadRepoLooseningInputs();
const lists = currentRegistryLists();
const LOOSENING = 'a loosening against unapproved baseline v0 with no approval reference';
const SEEDED = join(import.meta.dirname, '..', '..', 'tools', 'checks', 'loosening', 'seeded');

type UnitEntry = (typeof lists.units)[number];

function withUnit(code: string, change: (unit: UnitEntry) => UnitEntry): LooseningInputs {
  expect(lists.units.some((unit) => unit.code === code)).toBe(true);
  return { ...repo, registryLists: { ...lists, units: lists.units.map((unit) => (unit.code === code ? change(unit) : unit)) } };
}

test('G8-17 · control: the repository as it is passes, with every unit of the closed registry recorded', () => {
  expect(evaluateLoosening(repo).problems).toEqual([]);
  expect(Object.keys(repo.baseline.units).sort()).toEqual(lists.units.map((unit) => unit.code).sort());
  expect(repo.baseline.units['kVA']).toMatchObject({ dimension: 'apparent_power' });
});

test('G8-17 · a written form added to m2, with no approval record: the loosening check fails', () => {
  const report = evaluateLoosening(withUnit('m2', (unit) => ({ ...unit, written: [...unit.written, 'TEST-mp'] })));
  expect(report.ok).toBe(false);
  const line = report.problems.find((problem) => problem.startsWith('units.m2.written: '));
  expect(line, report.problems.join('\n')).toContain('added TEST-mp');
  expect(line).toContain(LOOSENING);
});

test('G8-17 · kVA merged into power, with no approval record: the loosening check fails', () => {
  const report = evaluateLoosening(withUnit('kVA', (unit) => ({ ...unit, dimension: 'power' })));
  expect(report.ok).toBe(false);
  expect(report.problems.find((problem) => problem.startsWith('units.kVA.dimension: ')), report.problems.join('\n')).toContain(
    'the unit kVA moved from dimension apparent_power to power',
  );
});

test('G8-17 · the CI check fails on both seeded bad inputs', async () => {
  const written = runLoosening(await seededInputs(join(SEEDED, 'unit-written-form-added')));
  expect(written.ok).toBe(false);
  expect(written.details.join('\n')).toContain('problem: units.m2.written: the written forms of m2: added TEST-mp');
  const merged = runLoosening(await seededInputs(join(SEEDED, 'unit-dimensions-merged')));
  expect(merged.ok).toBe(false);
  expect(merged.details.join('\n')).toContain('problem: units.kVA.dimension: the unit kVA moved from dimension apparent_power to power');
});

test('G8-17 · a written form added to any registered unit fails the check', () => {
  fc.assert(
    fc.property(fc.constantFrom(...lists.units.map((unit) => unit.code)), (code) => {
      const report = evaluateLoosening(withUnit(code, (unit) => ({ ...unit, written: [...unit.written, 'TEST-form'] })));
      expect(report.ok).toBe(false);
      expect(report.problems.some((problem) => problem.startsWith(`units.${code}.written: `) && problem.includes(LOOSENING))).toBe(true);
    }),
    { numRuns: 60 },
  );
});
