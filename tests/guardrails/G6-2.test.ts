/**
 * G6-2 (docs/guardrails.md section 7; rule 6 "Every field names what it changes":
 * "Categories alone, such as 'proposal', are not enough").
 * Situation: a field's `affects` lists only "proposal".
 * Expected: registry validation fails.
 *
 * Run on the production registry: the control validates clean, then any
 * registered field whose `affects` is replaced by a category (in the `via`, the
 * output, or both) fails validation with `affects-not-concrete`, and the
 * registry check CI runs fails too.
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { productionRegistry } from '@sovitech/registry';
import { validateRegistry, type RegistryBundle } from '@sovitech/registry/validation';
import { repoInputs, runRegistry } from '../../tools/checks/registry/core';

const CATEGORIES = ['proposal', 'Proposal', 'dashboards', 'report', 'estimate', 'metrics'] as const;

function withAffects(fieldKey: string, affects: RegistryBundle['fields'][number]['affects']): RegistryBundle {
  return {
    ...productionRegistry,
    fields: productionRegistry.fields.map((field) => (field.key === fieldKey ? { ...field, affects } : field)),
  };
}

test('G6-2 · control: the production registry validates clean', () => {
  const validation = validateRegistry(productionRegistry, { scope: 'production' });
  expect(validation.problems).toEqual([]);
  expect(validation.ok).toBe(true);
  expect(productionRegistry.fields.length).toBeGreaterThan(0);
});

test('G6-2 · a field whose affects lists only "proposal" fails registry validation', () => {
  const [first] = productionRegistry.fields;
  expect(first).toBeDefined();
  if (first === undefined) return;
  const validation = validateRegistry(withAffects(first.key, [{ output: 'proposal', via: 'proposal' }]), { scope: 'production' });
  expect(validation.ok).toBe(false);
  expect(validation.problems.map((problem) => problem.code)).toContain('affects-not-concrete');
  expect(validation.problems.find((problem) => problem.code === 'affects-not-concrete')?.message).toContain('G6-2');
});

test('G6-2 · any registered field with only a category in its affects fails, and so does the registry check', async () => {
  const repo = await repoInputs();
  const keys = productionRegistry.fields.map((field) => field.key);
  fc.assert(
    fc.property(fc.constantFrom(...keys), fc.constantFrom(...CATEGORIES), fc.constantFrom(...CATEGORIES), (fieldKey, output, via) => {
      const registry = withAffects(fieldKey, [{ output, via }]);
      const validation = validateRegistry(registry, { scope: 'production' });
      expect(validation.ok).toBe(false);
      expect(validation.problems.some((problem) => problem.code === 'affects-not-concrete' && problem.message.startsWith(fieldKey))).toBe(true);
      const result = runRegistry({ ...repo, registry });
      expect(result.ok).toBe(false);
      expect(result.details.join('\n')).toContain('[affects-not-concrete]');
    }),
    { numRuns: 60 },
  );
});
