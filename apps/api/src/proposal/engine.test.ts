/**
 * The engine's seam in the API (phase 5; docs/adr/0047 decisions 2 and 6, 0048 decision 1): the entry points serve the
 * production catalogue with no dataset (none is approved) and no drafting (no key); only tests hand in a TEST catalogue,
 * through the services, which no environment variable or config file sets.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PRODUCTION_CATALOGUE } from '@sovitech/engine';
import { productionRegistry } from '@sovitech/registry';
import { catalogueInputs, engineOf, readsOf } from './engine';

describe('ADR 0047 · ADR 0048: the engine Generate runs', () => {
  it('ADR 0047 decision 2 · prompt 3 phase 5: with no seam, the production catalogue runs, with no dataset and no body', () => {
    const engine = engineOf({});
    expect(engine.catalogue).toBe(PRODUCTION_CATALOGUE);
    expect(engine.catalogue.kind).toBe('production');
    expect(engine.catalogue.formulas.every((formula) => formula.body === undefined)).toBe(true);
    for (const id of ['sovitech-cost-ranges', 'sovitech-point-templates', 'TEST-sovitech-cost-ranges']) expect(engine.datasets(id)).toBeUndefined();
  });

  it('prompt 3 5.4 · ADR 0044 decision 4: the entry points set no engine seam, no drafting service and nothing a setting could open', () => {
    for (const entry of ['../index.ts', '../worker-main.ts']) {
      const source = readFileSync(new URL(entry, import.meta.url), 'utf8');
      expect(source, entry).not.toMatch(/\bengine\s*:/u);
      expect(source, entry).not.toMatch(/\bdrafting\s*:/u);
      expect(source, entry).not.toMatch(/test-formulas|testCatalogue|TEST_DATASET/u);
    }
  });

  it('rule 6 · 2.4: the inputs the catalogue reads are the registry\'s signatures\' inputs, and an output reads its own formula\'s', () => {
    const inputs = catalogueInputs(PRODUCTION_CATALOGUE);
    for (const formula of productionRegistry.formulas) for (const key of formula.inputs) expect(inputs).toContain(key);
    expect(readsOf(PRODUCTION_CATALOGUE)('capex.indicativeRange')).toEqual(productionRegistry.formulas.find((formula) => formula.id === 'capexIndicativeRange')?.inputs);
    expect(readsOf(PRODUCTION_CATALOGUE)('no.such.output')).toEqual([]);
  });
});
