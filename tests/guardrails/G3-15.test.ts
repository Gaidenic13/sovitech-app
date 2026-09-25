/**
 * G3-15 (docs/guardrails.md section 7; 2.6, `kind` ... `decision`: "an owner choice (rule 3)", and
 * `confirmBy`; rule 3, "Who confirms. The registry's confirmBy decides. The owner confirms facts they know:
 * ... their own choices" and "Choices belong to the owner"). Phase 1 review, round 3, registry validation's
 * half of adversarial finding 14.
 * Situation: a decision field is registered with `confirmBy` engineer or either.
 * Expected: registry validation fails.
 *
 * Run on the production registry: the control validates clean, then every decision field, its
 * `confirmBy` moved to engineer or either, fails validation with `owner-choice-not-owner`, and the
 * registry check CI runs fails too (its seeded bad input is
 * `tools/checks/registry/seeded/decision-not-owner`).
 */
import { join } from 'node:path';
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { productionRegistry } from '@sovitech/registry';
import { validateRegistry, type RegistryBundle, type RegistryFieldDefinition } from '@sovitech/registry/validation';
import { repoInputs, runRegistry, seededInputs } from '../../tools/checks/registry/core';

function withConfirmBy(fieldKey: string, confirmBy: RegistryFieldDefinition['confirmBy']): RegistryBundle {
  return { ...productionRegistry, fields: productionRegistry.fields.map((field) => (field.key === fieldKey ? { ...field, confirmBy } : field)) };
}

const decisions = productionRegistry.fields.filter((field) => field.kind === 'decision').map((field) => field.key);

test('G3-15 · control: the production registry validates clean, and each of its decision fields names the owner in confirmBy', () => {
  const validation = validateRegistry(productionRegistry, { scope: 'production' });
  expect(validation.problems).toEqual([]);
  expect(decisions.length).toBeGreaterThan(0);
  for (const key of decisions) expect(productionRegistry.fields.find((field) => field.key === key)?.confirmBy, key).toBe('owner');
});

test('G3-15 · the Fire Safety decision registered with confirmBy engineer or either fails registry validation', () => {
  for (const confirmBy of ['engineer', 'either'] as const) {
    const validation = validateRegistry(withConfirmBy('project.scope.fire_safety', confirmBy), { scope: 'production' });
    expect(validation.ok, confirmBy).toBe(false);
    expect(validation.problems.map((problem) => problem.code), confirmBy).toContain('owner-choice-not-owner');
  }
});

test('G3-15 · any decision field registered with confirmBy engineer or either fails, and so does the registry check', async () => {
  const repo = await repoInputs();
  fc.assert(
    fc.property(fc.constantFrom(...decisions), fc.constantFrom<RegistryFieldDefinition['confirmBy']>('engineer', 'either'), (fieldKey, confirmBy) => {
      const registry = withConfirmBy(fieldKey, confirmBy);
      const validation = validateRegistry(registry, { scope: 'production' });
      expect(validation.ok).toBe(false);
      expect(validation.problems.some((problem) => problem.code === 'owner-choice-not-owner' && problem.message.startsWith(fieldKey))).toBe(true);
      const result = runRegistry({ ...repo, registry });
      expect(result.ok).toBe(false);
      expect(result.details.join('\n')).toContain('[owner-choice-not-owner]');
    }),
    { numRuns: 40 },
  );
});

test('G3-15 · the registry check fails on its seeded bad input, a decision field an engineer confirms', async () => {
  const result = runRegistry(await seededInputs(join(import.meta.dirname, '..', '..', 'tools', 'checks', 'registry', 'seeded', 'decision-not-owner')));
  expect(result.ok).toBe(false);
  expect(result.details.join('\n')).toContain('[owner-choice-not-owner] project.seedScope is a decision field with confirmBy engineer');
});
