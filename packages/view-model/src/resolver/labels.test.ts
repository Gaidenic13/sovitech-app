/**
 * The words the resolver builds display text from where a value is a key (./labels.ts): every
 * registered option has one, none holds a digit (a label is fixed copy outside a value's figures)
 * or a reserved term (2.8), and the UI catalogue labels the same options with the same words on the
 * input controls (apps/web/src/copy/en.json), read here as a file, never imported (a package never
 * imports an app).
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { LEVEL_TYPES, productionRegistry } from '@sovitech/registry';
import { findReservedTerms } from '@sovitech/registry/reserved-terms';
import { DECISION_LABELS, OPTION_LABELS, QUALIFIER_LABELS, STAGE_LABELS, optionLabel, qualifierLabel } from './labels';

const CATALOGUE = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../apps/web/src/copy/en.json');

describe('F-VALUE-10 · rule 8: the words of options, qualifiers and stages', () => {
  it('F-VALUE-12 · rule 8: every registered option and qualifier of the production registry has its words', () => {
    for (const field of productionRegistry.fields) {
      for (const option of field.options ?? []) {
        expect(optionLabel(field.key, field.kind, option), `${field.key}.${option}`).not.toBe(option);
      }
      for (const qualifier of field.qualifiers ?? []) expect(QUALIFIER_LABELS[qualifier], `${field.key} ${qualifier}`).toBeDefined();
    }
    for (const level of LEVEL_TYPES) expect(QUALIFIER_LABELS[level]).toBeDefined();
    expect(qualifierLabel('unknown')).toBe('Unknown');
    expect(qualifierLabel(null)).toBe('Unknown');
  });

  it('G2-1 · 2.8 "Reserved terms": no label holds a digit or a reserved term', () => {
    const labels = [
      ...Object.values(OPTION_LABELS).flatMap((options) => Object.values(options)),
      ...Object.values(DECISION_LABELS),
      ...Object.values(QUALIFIER_LABELS),
      ...Object.values(STAGE_LABELS),
    ];
    for (const label of labels) {
      expect(label, label).not.toMatch(/\d/u);
      expect(findReservedTerms(label), label).toEqual([]);
    }
  });

  it('ADR 0036: the UI catalogue labels the same options with the same words', () => {
    const catalogue: unknown = parse(readFileSync(CATALOGUE, 'utf8'));
    const options = (catalogue as { options?: Record<string, Record<string, string>> }).options ?? {};
    let compared = 0;
    for (const [fieldKey, labels] of Object.entries(OPTION_LABELS)) {
      for (const [option, label] of Object.entries(labels)) {
        const shown = options[fieldKey]?.[option];
        if (shown === undefined) continue;
        compared += 1;
        expect(shown, `${fieldKey}.${option}`).toBe(label);
      }
    }
    expect(compared).toBeGreaterThan(0);
  });
});
