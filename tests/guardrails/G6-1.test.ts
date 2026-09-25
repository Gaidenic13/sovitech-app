/**
 * G6-1 (docs/guardrails.md section 7; rule 6 "A sensitivity test proves it").
 * Situation: a question's answer changes no output on the fixture.
 * Expected: registry validation fails.
 *
 * Run on the production registry and its sensitivity suite, the synthetic
 * fixture project with the TEST datasets and TEST formulas loaded
 * (tools/checks/registry/sensitivity-suite.ts; prompt 3 section 10, phase 1).
 * First the control: every registered question passes. Then, for any question
 * field, each TEST formula and template the field's `affects` names is replaced
 * by one that ignores the answer (it computes with the fixture's own value in
 * its place), so the answer changes no declared output. The sensitivity test
 * names that field, and the registry check, which CI runs, fails.
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { productionRegistry } from '@sovitech/registry';
import { parseVia, runSensitivityTest, type SensitivitySuite, type TestFormula, type TestTemplate } from '@sovitech/registry/validation';
import { repoInputs, runRegistry } from '../../tools/checks/registry/core';
import { loadSensitivitySuite } from '../../tools/checks/registry/sensitivity-suite';

const questionFields = productionRegistry.questions.flatMap((question) => question.fieldKeys.map((fieldKey) => ({ question: question.id, fieldKey })));

/** The sensitivity suite with every consumer of `fieldKey` blind to it: the fixture's value stands in for the answer. */
function blindTo(sensitivity: SensitivitySuite, fieldKey: string): SensitivitySuite {
  const field = productionRegistry.fields.find((item) => item.key === fieldKey);
  const consumers = new Set(field?.affects.map((entry) => entry.via) ?? []);
  const fixed = sensitivity.fixture.values[fieldKey];
  const formulas: Record<string, TestFormula> = {};
  for (const [ref, formula] of Object.entries(sensitivity.formulas)) {
    formulas[ref] = consumers.has(ref) ? (inputs, context) => formula({ ...inputs, [fieldKey]: fixed }, context) : formula;
  }
  const templates: Record<string, TestTemplate> = {};
  for (const [ref, template] of Object.entries(sensitivity.templates ?? {})) {
    templates[ref] = consumers.has(ref) ? (inputs) => template({ ...inputs, [fieldKey]: fixed }) : template;
  }
  return { ...sensitivity, formulas, templates };
}

test('G6-1 · control: on the fixture project every registered question changes a declared output', async () => {
  const sensitivity = await loadSensitivitySuite();
  expect(sensitivity).toBeDefined();
  if (sensitivity === undefined) return;
  expect(questionFields.length).toBeGreaterThan(0);
  const report = runSensitivityTest(productionRegistry, sensitivity);
  expect(report.suiteProblems).toEqual([]);
  expect(report.outcomes.filter((outcome) => !outcome.ok)).toEqual([]);
  expect(report.outcomes).toHaveLength(questionFields.length);
});

test('G6-1 · a question whose answer reaches no output fails registry validation, for any question field', async () => {
  const sensitivity = await loadSensitivitySuite();
  expect(sensitivity).toBeDefined();
  if (sensitivity === undefined) return;
  const repo = await repoInputs();
  await fc.assert(
    fc.asyncProperty(fc.constantFrom(...questionFields), async ({ question, fieldKey }) => {
      const blind = blindTo(sensitivity, fieldKey);
      const report = runSensitivityTest(productionRegistry, blind);
      const outcome = report.outcomes.find((item) => item.questionId === question && item.fieldKey === fieldKey);
      expect(outcome?.ok).toBe(false);
      expect(outcome?.problem).toContain('changed no declared output');
      // Each consumer the field names was still evaluated: the answer reached nothing.
      const field = productionRegistry.fields.find((item) => item.key === fieldKey);
      expect(field?.affects.every((entry) => parseVia(entry.via) !== undefined)).toBe(true);

      const result = runRegistry({ ...repo, suite: blind });
      expect(result.ok).toBe(false);
      expect(result.details.join('\n')).toContain(`${question} / ${fieldKey}`);
      expect(result.details.join('\n')).toContain('G6-1');
      return true;
    }),
    { numRuns: questionFields.length * 2 },
  );
});
