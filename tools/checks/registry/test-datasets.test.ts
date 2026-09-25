/**
 * The TEST datasets are visibly synthetic (prompt 3 section 5.4: "carry 'TEST' in their id
 * and visibly synthetic values"; "Never write plausible-looking engineering or price data").
 *
 * Phase 1 review (verifier finding 10, adversarial finding 20): the tables held values inside
 * real-world ranges (energy intensities of 100 to 150 per m², cost ranges of 10 to 21 per m²,
 * savings of 2 to 8 %), which read as engineering and price data once lifted out of their
 * file. Every number now lies in the band 9001 to 9099, which no rate, price, percentage,
 * intensity or point count reaches, and every dataset carries TEST in its id, version and
 * description. The sensitivity test still passes on them (G6-1; the registry check).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SYNTHETIC_HIGH, SYNTHETIC_LOW, TEST_DATASETS } from '../../../fixtures/datasets/generate';
import { TEST_DATASETS_DIR } from './sensitivity-suite';

/** Every number in a JSON value, with its path. */
function numbers(value: unknown, path = ''): Array<{ path: string; value: number }> {
  if (typeof value === 'number') return [{ path, value }];
  if (Array.isArray(value)) return value.flatMap((item, index) => numbers(item, `${path}[${index}]`));
  if (typeof value === 'object' && value !== null) return Object.entries(value).flatMap(([key, item]) => numbers(item, `${path}.${key}`));
  return [];
}

const files = readdirSync(TEST_DATASETS_DIR).filter((name) => name.startsWith('TEST-') && name.endsWith('.json'));

describe('the TEST datasets in fixtures/datasets/', () => {
  it('are the files their generator writes, one per dataset', () => {
    expect(files.sort()).toEqual(TEST_DATASETS.map((dataset) => `${dataset.id}.json`).sort());
    for (const dataset of TEST_DATASETS) {
      expect(readFileSync(join(TEST_DATASETS_DIR, `${dataset.id}.json`), 'utf8'), dataset.id).toBe(`${JSON.stringify(dataset, null, 2)}\n`);
    }
  });

  it.each(files)('%s carries TEST in its id, version and description', (name) => {
    const dataset = JSON.parse(readFileSync(join(TEST_DATASETS_DIR, name), 'utf8')) as Record<string, unknown>;
    for (const key of ['id', 'version', 'description']) expect(String(dataset[key]), key).toContain('TEST');
  });

  it.each(files)('%s holds only numbers from 9001 to 9099, none of which reads as a real value', (name) => {
    const dataset = JSON.parse(readFileSync(join(TEST_DATASETS_DIR, name), 'utf8')) as Record<string, unknown>;
    const outside = numbers(dataset['entries']).filter((item) => !Number.isInteger(item.value) || item.value < SYNTHETIC_LOW || item.value > SYNTHETIC_HIGH);
    expect(outside).toEqual([]);
  });

  it('keeps a distinct value for every option an answer can take, so the sensitivity test can see each answer', () => {
    const byId = new Map(TEST_DATASETS.map((dataset) => [dataset.id, dataset.entries]));
    const distinct = (table: unknown): boolean => {
      const values = Object.values(table as Record<string, unknown>).map((value) => JSON.stringify(value));
      return new Set(values).size === values.length;
    };
    const energy = byId.get('TEST-energy-benchmarks') as Record<string, unknown>;
    const cost = byId.get('TEST-sovitech-cost-ranges') as Record<string, unknown>;
    for (const table of [energy['intensityByBuildingType'], energy['occupancyPercent'], energy['schedulePercent'], cost['countryPercent'], cost['projectTypePercent']]) {
      expect(distinct(table)).toBe(true);
    }
  });
});
