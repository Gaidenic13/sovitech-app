/**
 * G8-16 (docs/guardrails.md section 7; section 10, "What counts as loosening. Any change that lets more
 * values through" and "It fails on any loosening without an approval record"; rule 8, "Qualifiers that
 * must be stated"; the list G8-14 refuses against). Phase 1 review, round 3, adversarial finding 4 (L1):
 * the loosening check did not read a field's registered qualifiers.
 * Situation: with no approval record, a qualifier (for example "Gross_Total") is added to those the gross
 * floor area field registers.
 * Expected: the loosening check fails.
 *
 * Run on the repository's own inputs with only the registry changed, and through the CI check on its
 * seeded bad input (`tools/checks/loosening/seeded/field-qualifier-added`). With "Gross_Total" registered,
 * the misspelt basis would again form a fact of its own that escapes rule 4's comparison (G8-14). The
 * property adds any qualifier the field does not register. The control: the repository as it is passes,
 * with `gross_total` the one qualifier recorded.
 */
import { join } from 'node:path';
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { evaluateLoosening, loadRepoLooseningInputs, type LooseningInputs } from '@sovitech/registry/validation';
import { runLoosening, seededInputs } from '../../tools/checks/loosening/core';

const repo = loadRepoLooseningInputs();
const AREA = 'building.grossFloorArea';
const LOOSENING = 'a loosening against unapproved baseline v0 with no approval reference';

function withQualifiersAdded(added: readonly string[]): LooseningInputs {
  return {
    ...repo,
    registry: { ...repo.registry, fields: repo.registry.fields.map((field) => (field.key === AREA ? { ...field, qualifiers: [...(field.qualifiers ?? []), ...added] } : field)) },
  };
}

test('G8-16 · control: the repository as it is passes, with gross_total the one qualifier recorded for the gross floor area', () => {
  expect(evaluateLoosening(repo).problems).toEqual([]);
  expect(repo.baseline.fields[AREA]).toMatchObject({ qualifiers: ['gross_total'] });
});

test('G8-16 · "Gross_Total" added to the qualifiers the gross floor area registers, with no approval record: the loosening check fails', () => {
  const report = evaluateLoosening(withQualifiersAdded(['Gross_Total']));
  expect(report.ok).toBe(false);
  const line = report.problems.find((problem) => problem.startsWith(`fields.${AREA}.qualifiers: `));
  expect(line, report.problems.join('\n')).toContain('added Gross_Total');
  expect(line).toContain(LOOSENING);
});

test('G8-16 · the CI check fails on its seeded bad input (Gross_Total and usable added)', async () => {
  const result = runLoosening(await seededInputs(join(import.meta.dirname, '..', '..', 'tools', 'checks', 'loosening', 'seeded', 'field-qualifier-added')));
  expect(result.ok).toBe(false);
  expect(result.details.join('\n')).toContain(`problem: fields.${AREA}.qualifiers: qualifiers [gross_total] → [Gross_Total, gross_total, usable] (added Gross_Total, usable;`);
});

test('G8-16 · any qualifier the field does not register, added with no approval record, fails the check', () => {
  fc.assert(
    fc.property(fc.constantFrom('Gross_Total', 'usable', 'heated_usable', 'conditioned', 'footprint', 'GROSS_TOTAL', 'TEST-basis'), (qualifier) => {
      const report = evaluateLoosening(withQualifiersAdded([qualifier]));
      expect(report.ok).toBe(false);
      expect(report.problems.some((problem) => problem.startsWith(`fields.${AREA}.qualifiers: `) && problem.includes(LOOSENING))).toBe(true);
    }),
  );
});
