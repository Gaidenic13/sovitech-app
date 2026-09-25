/**
 * @sovitech/registry/validation: the registry's shape, registry validation,
 * the sensitivity test and the loosening snapshot (docs/guardrails.md 2.6,
 * rule 6 and section 10; build-readiness 3 item 2; prompt 3 5.2 and 5.4).
 *
 * See docs/adr/0005-gates-mechanism.md.
 */
export * from './policy';
export * from './schema';
export { isTestId, validateRegistry, type RegistryProblem, type RegistryProblemCode, type RegistryScope, type RegistryValidation, type ValidateOptions } from './validate';
export {
  canonical,
  runSensitivityTest,
  type SensitivityOutcome,
  type SensitivityReport,
  type SensitivitySuite,
  type SensitivityValues,
  type TestFormula,
  type TestFormulaContext,
  type TestTemplate,
} from './sensitivity';
export {
  BASELINE_FILE_NAME,
  BASELINE_NAME,
  baselinePolicyProblems,
  compareSnapshots,
  currentRegistryLists,
  parseSnapshot,
  projectSnapshot,
  renderSnapshot,
  snapshotSchema,
  type DifferenceTarget,
  type FieldSnapshot,
  type FormulaSnapshot,
  type GateSnapshot,
  type RegistryLists,
  type UnitSnapshot,
  type SettingsSnapshot,
  type Snapshot,
  type SnapshotDifference,
  type SnapshotMeta,
} from './snapshot';
export { evaluateLoosening, type LooseningInputs, type LooseningReport } from './loosening';
export {
  BASELINE_PATH,
  PRODUCTION_SNAPSHOTS_DIR,
  loadProductionRegistry,
  loadRepoLooseningInputs,
  parseRegistryShape,
  readApprovedSnapshots,
  readSnapshotFile,
} from './repo';
