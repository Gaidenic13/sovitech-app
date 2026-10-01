/**
 * @sovitech/db: the store of guardrails section 2 on Postgres (prompt 3 5.2
 * "Database"): hand-written SQL migrations with the database roles, row-level
 * security, the append-only guards and the two guarded functions; and the
 * data-access layer the API uses. Only apps/api imports it (prompt 3 section 6);
 * guardrail case files may import it to drive the store (ADR 0007, reading 2).
 *
 * There is no update or delete method anywhere in this package.
 */
export { openStore, isoTimestamp, type Store, type StoreOptions } from './connection';
export { STORE_REFUSALS, StoreError, StoreRefusal, refusalOf, scrubbed, sqlStateOf, type StoreRefusalCode } from './errors';
export { newId } from './ids';
export { POSTGRES_IMAGE, RYUK_IMAGE } from './images';
export {
  GUARDS_MIGRATION,
  LOGIN_ROLES,
  MIGRATIONS_DIRECTORY,
  checksumOf,
  guardProblems,
  loadMigrations,
  loginUrl,
  migrationOf,
  runMigrations,
  type LoginRole,
  type Migration,
  type MigrationReport,
  type MigrationRunner,
  type MigrationSettings,
} from './migrate';
export { withRequest, projectOf, type Request, type RequestScope } from './request';
export { databaseTime, ensureBuildingSubject, existingSubjects, lockProjectWrites, projectIsDemo, projectVisible, requestActsAs } from './scope';
export type { AccountKind, Database, StoredFormat } from './schema';
export {
  AUTHORING_TOOL_PART,
  FILE_NAME_PART,
  fileNamePart,
  readCandidateAiOrigins,
  readDocumentFiles,
  readDocumentFindings,
  readDocumentText,
  readDocumentTexts,
  readModelRecords,
  recordCandidateAiOrigin,
  recordDocumentFile,
  recordDocumentFinding,
  recordModelRecord,
  storeDocumentTexts,
  type StoredFile,
  type StoredFinding,
  type StoredModelRecord,
  type TextPart,
} from './ingestion';
export {
  IFC_ELEMENT_KINDS,
  IfcValuesClosed,
  assertIfcValuesOpen,
  insertIfcCandidate,
  readIfcElements,
  readIfcValueRefusals,
  recordIfcAppearance,
  recordIfcElement,
  recordIfcValueRefusal,
  type IfcCandidateWrite,
  type IfcElementKind,
  type IfcElementLink,
  type IfcValueRefusal,
  type NewIfcCandidate,
  type StoredIfcElement,
} from './ifc-evidence';
export {
  cancelQueuedAnalysis,
  claimAnalysisJob,
  claimAbandonedUpload,
  claimUploadLease,
  createUploadSession,
  deleteAbandonedUpload,
  deleteUploadSession,
  enqueueAnalysis,
  failAnalysisJob,
  finishAnalysisJob,
  openAnalysisJobs,
  readAnalysisJobs,
  readUploadSession,
  readUserUploadSessions,
  releaseAbandonedUpload,
  releaseUploadLease,
  staleUploadSessions,
  type AnalysisJob,
  type UploadFormat,
  type UploadSession,
} from './work';
export {
  appendAssetEvent,
  appendCandidateEvent,
  appendDocumentEvent,
  appendFieldEvent,
  appendGuardrailEvent,
  assetForTag,
  createSubject,
  insertCandidate,
  recordAssetAppearance,
  recordDocumentAnalysis,
  recordProposalSnapshot,
  registerDocument,
  storeDocumentText,
  type AssetEventWrite,
  type CandidateWrite,
  type EvidenceStoreRefusal,
  type NewCandidate,
  type NewCandidateEvent,
  type NewDocument,
  type NewDocumentEvent,
  type NewFieldEvent,
} from './writes';
export {
  addProjectMember,
  createAppUser,
  createProject,
  eraseDocument,
  grantAppRole,
  lockProjectMembership,
  openReviewItem,
  revokeAppRole,
  verifyCandidate,
  type ErasureReport,
} from './guarded';
export {
  deriveContextFor,
  readAssetRegisterInputs,
  readCandidates,
  readFieldInputs,
  readGuardrailEvents,
  readProjectDocuments,
  readProjectFieldInputs,
  readUserRoles,
  readVisibleAccounts,
  type FieldInputs,
  type ProjectDocuments,
  type ProjectFieldInputs,
  type VisibleAccount,
} from './reads';
export { readProjectSubjects, readUserProjects, type ProjectSubject, type UserProject } from './projects';
