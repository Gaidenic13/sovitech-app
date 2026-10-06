/**
 * TEST datasets as the engine's TEST runs read them (prompt 3 5.4: "Test-only datasets live in fixtures/datasets/, carry
 * 'TEST' in their id and visibly synthetic values, load only inside the test runner"). They come from the generator
 * that writes fixtures/datasets/ (tools/checks/registry/test-datasets.test.ts holds the files equal to it), never
 * through the registry's loader, which refuses every TEST id (G1-12), and never through a production gate.
 *
 * `testDatasetAccess` answers the `DatasetAccess` of a TEST run: each TEST dataset the case lets the run read, shaped
 * like a loaded dataset with an approval reference that says it has none. The engine accepts it only for a TEST
 * catalogue inside the test runner (run.ts `datasetFor`).
 */
import type { LoadedDataset } from '@sovitech/registry';
import type { DatasetAccess } from '../src/inputs';
import { TEST_DATASETS } from '../../../fixtures/datasets/generate';

/** The ids of the TEST datasets the TEST bodies read. */
export const TEST_DATASET_IDS = Object.freeze({
  costRanges: 'TEST-sovitech-cost-ranges',
  pointTemplates: 'TEST-sovitech-point-templates',
  energyBenchmarks: 'TEST-energy-benchmarks',
  savingsFactors: 'TEST-savings-factors',
  functionSet: 'TEST-sovitech-function-set',
  engineTables: 'TEST-engine-tables',
});

/** No approval record exists for a TEST dataset; this is what its stand-in says instead of a reference. */
export const TEST_NO_APPROVAL = 'TEST: no approval record (test runner only)';

/**
 * A `DatasetAccess` over the TEST datasets: every one by default, or only the ids named (the others then read as
 * missing, as an unapproved dataset does).
 */
export function testDatasetAccess(ids?: readonly string[]): DatasetAccess {
  const allowed = ids === undefined ? undefined : new Set(ids);
  const datasets = new Map<string, LoadedDataset>(
    TEST_DATASETS.filter((dataset) => allowed === undefined || allowed.has(dataset.id)).map((dataset) => [
      dataset.id,
      Object.freeze({ id: dataset.id, version: dataset.version, entries: Object.freeze({ ...dataset.entries }), approvalRef: TEST_NO_APPROVAL }),
    ]),
  );
  return (id) => datasets.get(id);
}
