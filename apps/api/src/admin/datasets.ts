/**
 * UD-40's datasets (phase 7; docs/adr/0053 decision 7; PRD R-150 "Until decided": "The page lists each dataset and
 * version with its approval status, which reads that it has no approval record while no approver is named, and it has
 * no review, approval, edit or import control"; R-141; R-132 "Until decided"; prompt 3 5.4).
 *
 * - **Which datasets**: each dataset a gate waits for (a `waitsFor` item of kind `dataset`), in the order of the gates,
 *   read through `readGate` on the API's own gate source (the one function that reads gates); and each dataset the
 *   registry declares (none in production: "0 datasets"). A gate reading names an item by its words and its D id; the
 *   dataset's key (`waitsFor[].dataset`) is read from the gate files' definitions, matched by the gate and the item's
 *   words, never their open state. No IFC mapping table is listed as a dataset (R-132 "Until decided": "the datasets
 *   page lists no IFC mapping table as a dataset that shapes candidates"). A TEST dataset (an id holding "TEST") belongs
 *   to the test runner only (prompt 3 5.4; G1-12): a TEST registry's are left off the page, and one found in the
 *   production registry or a production gate file is never hidden: the page fails loudly instead (phase 7 part B, the
 *   adversarial review's finding A-7).
 * - **Version**: the registry's declared version, or none received.
 * - **Approval status**: read from stored approval records only, through the registry's one test
 *   (`datasetApprovalLookup`), for a declared version; with no declared version there is nothing a record could approve.
 *   No approver is named (D-05) and no record reaches the app (D-47), so every dataset reads "No approval record".
 * Nothing here writes: no approval record, dataset, gate or reference is created or changed (prompt 3 5.4).
 */
import { datasetApprovalLookup } from '@sovitech/registry';
import { GATE_IDS, PRODUCTION_GATES_DIR, loadGateDefinitions, loadRepoApprovalContext, readGate, type GateSource } from '@sovitech/registry/gates';
import type { AdminDatasetInput } from '@sovitech/view-model/server';
import { PRODUCTION_API_REGISTRY, type ApiRegistry } from '../wizard/registry';

/** R-132 "Until decided": the IFC mapping tables are not listed as a dataset (ifc-input 6.2.10, not approved; D-37). */
const NOT_LISTED: ReadonlySet<string> = new Set(['ifc-mapping-tables']);

/** A TEST dataset's id (prompt 3 5.4: they load only inside the test runner, and never feed the app). */
const isTestDataset = (key: string): boolean => /TEST/u.test(key);

/** Each gate's dataset items by the gate and the item's words: the dataset key the gate file names (metadata only). */
function datasetKeys(): ReadonlyMap<string, string> {
  const keys = new Map<string, string>();
  for (const gate of loadGateDefinitions(PRODUCTION_GATES_DIR)) {
    for (const item of gate.waitsFor) {
      if (item.kind === 'dataset' && item.dataset !== undefined) keys.set(`${gate.id}\u0000${item.item}`, item.dataset);
    }
  }
  return keys;
}

/** A TEST dataset outside the test runner: a leak of test data into production (prompt 3 5.4; G1-12), never hidden. */
function testDatasetLeak(where: string, key: string): Error {
  return new Error(`UD-40: the TEST dataset ${key} is named by ${where} outside the test runner (prompt 3 5.4; G1-12)`);
}

/**
 * UD-40's input: the datasets the gates wait for and the registry declares, each with its version, approval status and
 * gates. `testRunner`: whether the registry is a test's (anything but the API's production registry), whose TEST
 * datasets are left off the page; with the production registry a TEST dataset throws (A-7).
 */
export function adminDatasetsOf(gates: GateSource, registry: ApiRegistry, testRunner: boolean = registry !== PRODUCTION_API_REGISTRY): AdminDatasetInput[] {
  const keys = datasetKeys();
  const listed = new Map<string, { name: string; gates: { gateId: string; dId: string }[] }>();
  for (const gateId of GATE_IDS) {
    for (const item of readGate(gates, gateId).waitsFor) {
      if (item.kind !== 'dataset') continue;
      const key = keys.get(`${gateId}\u0000${item.item}`);
      if (key === undefined) throw new Error(`the gate ${gateId} waits for a dataset its file does not name`);
      if (isTestDataset(key)) throw testDatasetLeak(`the production gate file of ${gateId}`, key);
      if (NOT_LISTED.has(key)) continue;
      const entry = listed.get(key) ?? { name: item.item, gates: [] };
      entry.gates.push({ gateId, dId: item.dId });
      listed.set(key, entry);
    }
  }
  for (const dataset of registry.bundle.datasets) {
    if (isTestDataset(dataset.id) && !testRunner) throw testDatasetLeak('the production registry', dataset.id);
  }
  const declared = registry.bundle.datasets.filter((dataset) => !isTestDataset(dataset.id) && !NOT_LISTED.has(dataset.id));
  for (const dataset of declared) {
    if (!listed.has(dataset.id)) listed.set(dataset.id, { name: dataset.id, gates: [] });
  }
  // Approval records are read only for a declared version (none in production): no context is loaded otherwise.
  const approved =
    declared.length === 0
      ? () => false
      : (() => {
          const lookup = datasetApprovalLookup(registry.bundle, loadRepoApprovalContext());
          return (id: string, version: string) => lookup({ dataset: id, version, key: '' });
        })();
  return [...listed.entries()].map(([datasetKey, entry]) => {
    const declaration = declared.find((dataset) => dataset.id === datasetKey);
    return {
      datasetKey,
      name: entry.name,
      version: declaration?.version ?? null,
      approved: declaration === undefined ? false : approved(datasetKey, declaration.version),
      gates: entry.gates,
    };
  });
}
