/**
 * @sovitech/registry/gates: the one function that reads gates, and the gate
 * source built only from packages/registry/gates/ (prompt 3 section 5.4).
 * Every gate starts closed. No environment variable or config file opens one:
 * nothing in this entry reads either. An override exists only in the
 * test-utils entry, for tests/proposed/; the internal path it uses is not
 * re-exported here.
 *
 * See docs/adr/0005-gates-mechanism.md.
 */
export { GATE_IDS, WAIT_KINDS, isGateId, type GateDefinition, type GateId, type WaitKind, type WaitsForItem } from './schema';
export { GateFileError, PRODUCTION_GATES_DIR, gateSetProblems, loadGateDefinitions, parseGateFile } from './load';
export {
  GateApprovalError,
  assertGatesStartupSafe,
  checkProductionDefinitions,
  isProductionSource,
  isStartupCheckedSource,
  productionGateSource,
  readGate,
  type GateReading,
  type GateSource,
  type GateSourceKind,
} from './source';
export { targetOf, verifyGates } from './verify';
export {
  APPROVAL_BRANCH,
  APPROVAL_DOCUMENT_PATHS,
  REPO_ROOT,
  approvalBaseCommit,
  approvalDocumentEdits,
  approverOfCell,
  existsAtRef,
  isApproverName,
  loadRepoApprovalContext,
  localDate,
  parseApprovalContext,
  readBaseApprovalDocuments,
  readWorkingTreeApprovalDocuments,
  repoApprovalDocumentEdits,
  resolveApprovalRef,
  type ApprovalBase,
  type ApprovalContext,
  type ApprovalDocuments,
  type ApprovalTarget,
  type ChangeLogRow,
  type DatasetApprovalRecord,
  type OwnerDecisionRecord,
  type Resolution,
} from '../approvals';
