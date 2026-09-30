/**
 * The switch that lets the app read uploaded IFC models (./model-reading.ts): until the owner
 * decides D-01, no model is read in the live app (PRD R-023, R-024 "Until decided"; prompt 3
 * section 4, the stricter line), and only a test can make the switch. Every value is TEST data.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { SETTING_NAMES } from '../config';
import { readModelsForTests, readsModels } from './model-reading';

const REPOSITORY_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

/** Every TypeScript source under a folder, tests left out. */
function sources(folder: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(folder)) {
    const path = join(folder, name);
    if (name === 'node_modules' || name === 'dist') continue;
    if (statSync(path).isDirectory()) found.push(...sources(path));
    else if (/\.(?:ts|tsx|mts|cts)$/u.test(name) && !/\.test\.[cm]?tsx?$/u.test(name)) found.push(path);
  }
  return found;
}

describe('the model-reading switch (PRD R-023, R-024; D-01)', () => {
  const vitest = process.env['VITEST'];
  afterEach(() => {
    process.env['VITEST'] = vitest;
  });

  it('R-023 · R-024 · F-INGEST-03: reads no model without the switch, or with a look-alike object; reads with the one a test was issued', () => {
    expect(readsModels(undefined)).toBe(false);
    expect(readsModels({})).toBe(false);
    const lookAlike = Object.freeze({ readsModels: true as const });
    expect(readsModels({ modelReading: lookAlike })).toBe(false);
    expect(readsModels({ modelReading: readModelsForTests() })).toBe(true);
  });

  it('R-023 · R-024: the switch is issued only inside the Vitest runner', () => {
    process.env['VITEST'] = 'false';
    expect(() => readModelsForTests()).toThrow(/tests only/u);
    delete process.env['VITEST'];
    expect(() => readModelsForTests()).toThrow(/tests only/u);
  });

  it('R-023 · R-024: no source of the apps calls for the switch, and no setting names one', () => {
    const callers = ['apps', 'packages']
      .flatMap((folder) => sources(join(REPOSITORY_ROOT, folder)))
      .filter((path) => readFileSync(path, 'utf8').includes('readModelsForTests'))
      .map((path) => relative(REPOSITORY_ROOT, path));
    expect(callers).toEqual(['apps/api/src/documents/model-reading.ts']);
    expect(SETTING_NAMES.filter((name) => /MODEL|IFC_READ|READ_MODELS/u.test(name) && name !== 'SOVITECH_IFC_READER_IMAGE')).toEqual([]);
  });
});
