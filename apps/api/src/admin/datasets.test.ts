/**
 * UD-40's datasets (apps/api/src/admin/datasets.ts), phase 7 part B, the read-only adversarial review's finding A-7:
 * a TEST dataset belongs to the test runner only (prompt 3 5.4; G1-12). A TEST registry's TEST datasets are left off
 * the page; the same dataset in the production registry is never hidden: the page's input fails loudly. Every dataset
 * here is a TEST declaration; nothing is loaded or approved.
 */
import { describe, expect, test } from 'vitest';
import { productionRegistry } from '@sovitech/registry';
import { assertGatesStartupSafe } from '@sovitech/registry/gates';
import { PRODUCTION_API_REGISTRY, apiRegistryOf } from '../wizard/registry';
import { adminDatasetsOf } from './datasets';

const withTestDataset = apiRegistryOf({ ...productionRegistry, datasets: [{ id: 'TEST-cost-ranges', version: 'TEST-1' }] });

describe('UD-40 · A-7 · prompt 3 5.4 · G1-12: a TEST dataset is never hidden outside the test runner', () => {
  test('A-7: a TEST registry\'s TEST dataset is left off the page in the test runner', () => {
    const listed = adminDatasetsOf(assertGatesStartupSafe(), withTestDataset);
    expect(listed.map((dataset) => dataset.datasetKey)).not.toContain('TEST-cost-ranges');
    expect(listed.length).toBeGreaterThan(0);
  });

  test('A-7: a TEST dataset in the production registry fails the page loudly, never hidden', () => {
    expect(() => adminDatasetsOf(assertGatesStartupSafe(), withTestDataset, false)).toThrow(/TEST dataset TEST-cost-ranges .* outside the test runner/u);
  });

  test('A-7: the production registry, as it is, lists every gate\'s dataset and throws nothing', () => {
    expect(adminDatasetsOf(assertGatesStartupSafe(), PRODUCTION_API_REGISTRY).length).toBeGreaterThan(0);
  });
});
