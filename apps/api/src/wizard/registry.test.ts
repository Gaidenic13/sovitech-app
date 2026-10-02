/**
 * The registry seam (phase 4; docs/adr/0044-workspace-api-contract.md decision 4): the production entry serves the
 * production registry and nothing else, and every wizard and workspace module reads the registry it is handed, never a
 * module-level import of the production one (so a TEST registry reaches the served views in tests only, and the app
 * cannot be pointed at another).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { productionRegistry } from '@sovitech/registry';
import { PRODUCTION_SUGGESTION_RULES } from '@sovitech/view-model/server';
import { PRODUCTION_API_REGISTRY, apiRegistryOf, productionStepOfField, registryOf } from './registry';

const SOURCE = new URL('../', import.meta.url);

describe('ADR 0044 decision 4: the registry seam', () => {
  it('ADR 0044 · G5-3: the production entry serves the production registry, its steps and no suggestion rule', () => {
    expect(PRODUCTION_API_REGISTRY.bundle).toBe(productionRegistry);
    expect(PRODUCTION_API_REGISTRY.suggestionRules).toBe(PRODUCTION_SUGGESTION_RULES);
    expect(PRODUCTION_API_REGISTRY.suggestionRules).toEqual([]);
    expect(registryOf({})).toBe(PRODUCTION_API_REGISTRY);
    for (const field of productionRegistry.fields) expect(PRODUCTION_API_REGISTRY.stepOfField(field.key)).toBe(productionStepOfField(field.key));
    const entry = readFileSync(new URL('index.ts', SOURCE), 'utf8');
    expect(entry).toContain('registry: PRODUCTION_API_REGISTRY');
    expect(entry).not.toMatch(/process\.env[^\n]*registry|registry[^\n]*process\.env/iu);
  });

  it('ADR 0044: a TEST step never moves a production field, and a TEST registry carries its own fields', () => {
    const steps = new Map([['project.name', 7 as const], ['building.testFact', 3 as const]]);
    const test = apiRegistryOf({ ...productionRegistry, fields: [...productionRegistry.fields] }, { steps });
    expect(test.stepOfField('project.name')).toBe(1);
    expect(test.stepOfField('building.testFact')).toBe(3);
  });

  it('ADR 0044: no wizard or workspace module imports the production registry bundle except the seam itself', () => {
    for (const folder of ['wizard', 'workspace']) {
      for (const name of readdirSync(new URL(`${folder}/`, SOURCE))) {
        if (!name.endsWith('.ts') || name.endsWith('.test.ts') || (folder === 'wizard' && name === 'registry.ts')) continue;
        const text = readFileSync(new URL(`${folder}/${name}`, SOURCE), 'utf8');
        expect(text, `${folder}/${name}`).not.toMatch(/\bproductionRegistry\b|\bPRODUCTION_QUESTIONS\b|\bPRODUCTION_SUGGESTION_RULES\b/u);
      }
    }
    const projects = readFileSync(new URL('projects/service.ts', SOURCE), 'utf8');
    expect(projects).not.toMatch(/\bproductionRegistry\b/u);
  });
});
