/**
 * The tables of schema `sovitech`, as Kysely sees them (migrations 0001-0005).
 * Rows map 1:1 to the domain types of @sovitech/domain (guardrails section 2);
 * mapping.ts turns one into the other.
 *
 * Columns the database sets (every time column, and the generated subject kinds)
 * cannot be written: the app role has no INSERT privilege on them, and their
 * insert type here is `never`. Timestamps read back as ISO 8601 strings in UTC
 * with microseconds (connection.ts). Nothing here is ever updated or deleted.
 */
import type { ColumnType, JSONColumnType } from 'kysely';
import type {
  AppRole,
  AssetEventType,
  CandidateEventType,
  Confidence,
  DocumentAnalysisStatus,
  DocumentEventType,
  DocumentKind,
  DocumentStage,
  EvidenceMatch,
  FieldEventType,
  GuardrailEventType,
  Role,
  Source,
  SubjectKind,
} from '@sovitech/domain';

/** A time the database sets on insert. */
export type DatabaseTime = ColumnType<string, never, never>;
/** A column the database computes. */
export type Computed<T> = ColumnType<T, never, never>;

export type AccountKind = 'person' | 'service' | 'seed';
export type UnknownPolicy = 'refuse' | 'exclude_and_count' | 'range_over_options';

/** One quantity of an ambiguous reading, as stored in `candidates.alternatives`. */
export interface StoredQuantity {
  readonly value: number;
  readonly unit: string;
  readonly qualifier?: string;
  readonly approximate?: boolean;
}

export interface AppUsersTable {
  id: string;
  display_name: string;
  kind: AccountKind;
  created_at: DatabaseTime;
}

export interface AppRoleEventsTable {
  id: string;
  user_id: string;
  role: AppRole;
  type: 'granted' | 'revoked';
  actor_user_id: string | null;
  actor_database_role: string;
  at: DatabaseTime;
  reason: string;
}

export interface AppUserRolesView {
  user_id: string;
  role: AppRole;
  since: string;
}

/**
 * What the app reads about accounts (0006): its own account and the members of
 * the project in scope. The tables behind it are read in full on the operator's
 * login only (rule 13, project boundary).
 */
export interface RequestAccountsView {
  id: ColumnType<string, never, never>;
  display_name: ColumnType<string, never, never>;
  kind: ColumnType<AccountKind, never, never>;
}

/** The current app roles of the request's own account and of the members of the project in scope (0006). */
export interface RequestAccountRolesView {
  user_id: ColumnType<string, never, never>;
  role: ColumnType<AppRole, never, never>;
  since: ColumnType<string, never, never>;
}

export interface ProjectsTable {
  id: string;
  is_demo: boolean;
  created_by: string;
  created_at: DatabaseTime;
}

export interface ProjectMembersTable {
  project_id: string;
  user_id: string;
  added_by: string | null;
  added_at: DatabaseTime;
}

export interface AuditEventsTable {
  id: string;
  project_id: string | null;
  type: 'app_user_created' | 'app_role_granted' | 'app_role_revoked' | 'project_created' | 'project_member_added' | 'document_erased';
  actor_user_id: string | null;
  actor_database_role: string;
  target_user_id: string | null;
  document_id: string | null;
  details: JSONColumnType<Record<string, unknown>, never, never>;
  reason: string | null;
  at: DatabaseTime;
}

export interface SubjectsTable {
  id: string;
  project_id: string;
  kind: SubjectKind;
  created_by: string;
  created_at: DatabaseTime;
}

export interface DocumentsTable {
  id: string;
  project_id: string;
  subject_kind: Computed<'document'>;
  content_hash: string;
  kind: DocumentKind;
  stage: DocumentStage;
  revision: string | null;
  issue_date: string | null;
  supersedes_proposed: string | null;
  created_by: string;
  created_at: DatabaseTime;
}

export interface DocumentEventsTable {
  id: string;
  project_id: string;
  document_id: string;
  type: DocumentEventType;
  revision_of_document_id: string | null;
  actor: string;
  role: Role;
  at: DatabaseTime;
  reason: string | null;
  /** For a system withdrawal: the owner's or engineer's own withdrawal of the document it carries out (0002; SVX15). */
  request_event_id: string | null;
}

export interface DocumentAnalysisEventsTable {
  id: string;
  project_id: string;
  document_id: string;
  status: DocumentAnalysisStatus;
  coverage: string;
  actor: string;
  at: DatabaseTime;
}

export interface DocumentTextsTable {
  project_id: string;
  content_hash: string;
  part: string;
  text: string;
  created_by: string;
  created_at: DatabaseTime;
}

export interface CandidatesTable {
  id: string;
  project_id: string;
  subject_id: string;
  field_key: string;
  quantity_value: number | null;
  quantity_unit: string | null;
  quantity_qualifier: string | null;
  quantity_approximate: boolean | null;
  choice: string | null;
  text_value: string | null;
  alternatives: ColumnType<StoredQuantity[] | null, string | null, never>;
  source: Source;
  original_text: string | null;
  original_locale: string | null;
  method_formula_id: string | null;
  method_formula_version: string | null;
  method_input_candidate_ids: string[] | null;
  method_unknown_policy: UnknownPolicy | null;
  method_assumptions: string[] | null;
  reference_dataset: string | null;
  reference_version: string | null;
  reference_key: string | null;
  range_low: number | null;
  range_high: number | null;
  confidence: Confidence | null;
  created_by: string;
  /** Set by the store's guard from the request (0003, 0009); the app never writes it. */
  author_role: ColumnType<Role, never, never>;
  created_at: DatabaseTime;
}

export interface EvidenceLocatorsTable {
  id: string;
  project_id: string;
  candidate_id: string | null;
  appearance_id: string | null;
  ordinal: number;
  document_id: string;
  content_hash: string;
  page: number | null;
  sheet: string | null;
  cell: string | null;
  bbox: number[] | null;
  evidence_check: EvidenceMatch;
  created_at: DatabaseTime;
}

export interface EvidenceExcerptsTable {
  evidence_id: string;
  project_id: string;
  content_hash: string;
  text: string;
  erased_at: ColumnType<string | null, never, never>;
  created_at: DatabaseTime;
}

export interface CandidateEventsTable {
  id: string;
  project_id: string;
  candidate_id: string;
  type: CandidateEventType;
  actor: string;
  role: Role;
  at: DatabaseTime;
  reason: string | null;
  bulk_id: string | null;
}

export interface FieldEventsTable {
  id: string;
  project_id: string;
  subject_id: string;
  field_key: string;
  type: FieldEventType;
  actor: string;
  role: Role;
  at: DatabaseTime;
  reason: string | null;
  chosen_candidate_id: string | null;
  /** conflict_resolved only: the exact candidates the resolution covered, all of this field. */
  covered_candidate_ids: string[] | null;
}

export interface AssetIdentitiesTable {
  asset_id: string;
  project_id: string;
  subject_kind: Computed<'asset'>;
  normalised_tag: string;
  created_by: string;
  created_at: DatabaseTime;
}

export interface AssetAppearancesTable {
  id: string;
  project_id: string;
  asset_id: string | null;
  tag_as_written: string | null;
  created_by: string;
  created_at: DatabaseTime;
}

export interface AssetEventsTable {
  id: string;
  project_id: string;
  asset_id: string;
  type: AssetEventType;
  related_asset_ids: string[];
  actor: string;
  role: 'sovitech_engineer';
  at: DatabaseTime;
  reason: string;
}

export interface GuardrailEventsTable {
  id: string;
  project_id: string;
  type: GuardrailEventType;
  subject_id: string | null;
  field_key: string | null;
  reason: string | null;
  actor: string;
  at: DatabaseTime;
}

/** Written only by sovitech.open_review_item. */
export interface ReviewItemOpensTable {
  id: ColumnType<string, never, never>;
  project_id: ColumnType<string, never, never>;
  candidate_id: ColumnType<string, never, never>;
  user_id: ColumnType<string, never, never>;
  opened_at: DatabaseTime;
}

/** Rule 10's stage 3 record. Read-only here: nothing writes one yet (PRD D-20). */
export interface QuotationRecordsTable {
  id: ColumnType<string, never, never>;
  project_id: ColumnType<string, never, never>;
  record_number: ColumnType<string, never, never>;
  reviewing_engineer_id: ColumnType<string, never, never>;
  commercial_reviewer_id: ColumnType<string, never, never>;
  issued_on: ColumnType<string, never, never>;
  valid_until: ColumnType<string, never, never>;
  currency: ColumnType<string, never, never>;
  vat_basis: ColumnType<string, never, never>;
  inclusions: ColumnType<string[], never, never>;
  exclusions: ColumnType<string[], never, never>;
  proposal_snapshot_id: ColumnType<string | null, never, never>;
  created_at: DatabaseTime;
}

export interface QuotationRecordInputsTable {
  record_id: ColumnType<string, never, never>;
  project_id: ColumnType<string, never, never>;
  candidate_id: ColumnType<string, never, never>;
  candidate_hash: ColumnType<string, never, never>;
}

export interface ProposalSnapshotsTable {
  id: string;
  project_id: string;
  inputs_hash: string;
  created_by: string;
  created_at: DatabaseTime;
}

export interface ProposalSnapshotCandidatesTable {
  snapshot_id: string;
  project_id: string;
  candidate_id: string;
}

export interface ProposalSnapshotFormulasTable {
  snapshot_id: string;
  project_id: string;
  formula_id: string;
  formula_version: string;
}

/** Schema `sovitech`: the store opens Kysely with `withSchema('sovitech')`. */
export interface Database {
  app_users: AppUsersTable;
  app_role_events: AppRoleEventsTable;
  app_user_roles: AppUserRolesView;
  request_accounts: RequestAccountsView;
  request_account_roles: RequestAccountRolesView;
  projects: ProjectsTable;
  project_members: ProjectMembersTable;
  audit_events: AuditEventsTable;
  subjects: SubjectsTable;
  documents: DocumentsTable;
  document_events: DocumentEventsTable;
  document_analysis_events: DocumentAnalysisEventsTable;
  document_texts: DocumentTextsTable;
  candidates: CandidatesTable;
  evidence_locators: EvidenceLocatorsTable;
  evidence_excerpts: EvidenceExcerptsTable;
  candidate_events: CandidateEventsTable;
  field_events: FieldEventsTable;
  asset_identities: AssetIdentitiesTable;
  asset_appearances: AssetAppearancesTable;
  asset_events: AssetEventsTable;
  guardrail_events: GuardrailEventsTable;
  review_item_opens: ReviewItemOpensTable;
  quotation_records: QuotationRecordsTable;
  quotation_record_inputs: QuotationRecordInputsTable;
  proposal_snapshots: ProposalSnapshotsTable;
  proposal_snapshot_candidates: ProposalSnapshotCandidatesTable;
  proposal_snapshot_formulas: ProposalSnapshotFormulasTable;
}
