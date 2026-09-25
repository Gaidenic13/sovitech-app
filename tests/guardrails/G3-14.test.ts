/**
 * G3-14 (docs/guardrails.md section 7; section 10, "What counts as loosening. Any change that lets more
 * values through ... When unsure, treat the change as loosening" and "It fails on any loosening without an
 * approval record"; rule 3, "Choices belong to the owner"; 2.6, `decision`: "an owner choice (rule 3)").
 * Phase 1 review, round 3, adversarial finding 4 (L2): the loosening check did not read a field's kind,
 * which G3-9's refusal keys on.
 * Situation: with no approval record, a registry change turns the owner's decision on Fire Safety in
 * scope into another kind (`enum`).
 * Expected: the loosening check fails.
 *
 * Run on the repository's own inputs (the unapproved baseline, gates and approvals read from git), with
 * only the registry changed, and through the CI check on its seeded bad input
 * (`tools/checks/loosening/seeded/field-kind-away-from-decision`). Once a decision field is an `enum`,
 * a document or an inference may stand on it (G3-9 no longer applies), so the check names rule 3. The
 * property turns every decision field of the production registry into each other kind. The control: the
 * repository as it is passes.
 */
import { join } from 'node:path';
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { evaluateLoosening, loadRepoLooseningInputs, type LooseningInputs, type RegistryFieldDefinition } from '@sovitech/registry/validation';
import { runLoosening, seededInputs } from '../../tools/checks/loosening/core';

const repo = loadRepoLooseningInputs();
const LOOSENING = 'a loosening against unapproved baseline v0 with no approval reference';

function withKind(key: string, kind: RegistryFieldDefinition['kind']): LooseningInputs {
  return { ...repo, registry: { ...repo.registry, fields: repo.registry.fields.map((field) => (field.key === key ? { ...field, kind } : field)) } };
}

test('G3-14 · control: the repository as it is passes the loosening check, and Fire Safety in scope is recorded as a decision', () => {
  expect(evaluateLoosening(repo).problems).toEqual([]);
  expect(repo.baseline.fields['project.scope.fire_safety']).toMatchObject({ kind: 'decision' });
});

test('G3-14 · Fire Safety in scope turned from a decision into an enum, with no approval record: the loosening check fails', () => {
  const report = evaluateLoosening(withKind('project.scope.fire_safety', 'enum'));
  expect(report.ok).toBe(false);
  const line = report.problems.find((problem) => problem.startsWith('fields.project.scope.fire_safety.kind: '));
  expect(line, report.problems.join('\n')).toContain('kind decision → enum: away from an owner decision');
  expect(line).toContain('Choices belong to the owner');
  expect(line).toContain(LOOSENING);
});

test('G3-14 · the CI check fails on its seeded bad input for the same change', async () => {
  const result = runLoosening(await seededInputs(join(import.meta.dirname, '..', '..', 'tools', 'checks', 'loosening', 'seeded', 'field-kind-away-from-decision')));
  expect(result.ok).toBe(false);
  expect(result.details.join('\n')).toContain('problem: fields.project.scope.fire_safety.kind: kind decision → enum: away from an owner decision');
});

test('G3-14 · any decision field of the production registry turned into another kind fails the loosening check', () => {
  const decisions = repo.registry.fields.filter((field) => field.kind === 'decision').map((field) => field.key);
  expect(decisions.length).toBeGreaterThan(0);
  fc.assert(
    fc.property(fc.constantFrom(...decisions), fc.constantFrom<RegistryFieldDefinition['kind']>('enum', 'text', 'count', 'quantity'), (key, kind) => {
      const report = evaluateLoosening(withKind(key, kind));
      expect(report.ok).toBe(false);
      expect(report.problems.some((problem) => problem.startsWith(`fields.${key}.kind: `) && problem.includes(LOOSENING))).toBe(true);
    }),
    { numRuns: 40 },
  );
});
