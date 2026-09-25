/**
 * Field state (docs/guardrails.md 2.4 "Derived, never stored"; F-VALUE-02 to
 * F-VALUE-04). Phase 0 declares the one derive function and what it returns;
 * phase 1 builds it.
 */
import type {
  Candidate,
  CandidateEvent,
  CandidateReference,
  DocumentEvent,
  DocumentRecord,
  FieldDefinition,
  FieldEvent,
  Source,
  Verification,
} from './model';
import { declareNotImplemented } from './not-implemented';

/** 2.4, the Field states table. */
export const FIELD_STATES = ['unknown', 'pending', 'skipped', 'not_applicable', 'known', 'conflict'] as const;
export type FieldStateName = (typeof FIELD_STATES)[number];

/** 2.4 "When more than one state could apply, the order is: ...". The first that applies wins. */
export const FIELD_STATE_PRECEDENCE = [
  'conflict',
  'known',
  'pending',
  'not_applicable',
  'skipped',
  'unknown',
] as const satisfies readonly FieldStateName[];

/** 2.4 "Active candidate", step 1: highest verification first. */
export const VERIFICATION_PRECEDENCE = [
  'engineer_verified',
  'user_confirmed',
  'owner_acknowledged',
  'unverified',
] as const satisfies readonly Verification[];

/** 2.4 "Active candidate", step 2: then by source. */
export const SOURCE_PRECEDENCE = [
  'user',
  'document',
  'calculated',
  'ai_inference',
  'reference',
  'estimated',
] as const satisfies readonly Source[];

/** A candidate's current status. Eligible means not rejected, superseded or withdrawn (2.4). */
export type CandidateStatus = 'eligible' | 'rejected' | 'superseded' | 'withdrawn';

/** Each candidate as derived from its events (2.4). */
export interface DerivedCandidate {
  readonly candidateId: string;
  readonly verification: Verification;
  readonly status: CandidateStatus;
}

/** An open conflict (rule 4): the eligible candidates that disagree, and whose queue it is in. */
export interface DerivedConflict {
  readonly candidateIds: readonly string[];
  /** Rule 4 "Routing". */
  readonly routedTo: 'owner' | 'engineer';
}

/**
 * The 2.8 status lines that follow from a field's own candidates and events, as
 * keys. Their wording lives in the status-line registry (@sovitech/registry).
 */
export const FIELD_STATUS_LINES = ['out_of_date_recalculating', 'from_superseded_revision', 'source_document_removed'] as const;
export type FieldStatusLine = (typeof FIELD_STATUS_LINES)[number];

/**
 * Where a field's state puts it on the review step (step 8): the owner's "For you"
 * list or the "SOVITECH will check" groups (rule 7 "Open items are short, and say
 * who acts"). Only states that list the field whatever the question engine decides
 * appear here: an open conflict (rule 4) and a removed source document (2.3).
 */
export interface ReviewItem {
  readonly list: 'for_you' | 'sovitech_will_check';
  readonly reason: 'conflict' | 'source_document_removed';
}

/** What derive returns for one field on one subject. Never stored. */
export interface FieldState {
  readonly subjectId: string;
  readonly fieldKey: string;
  readonly state: FieldStateName;
  /** None while a conflict is open (rule 4 "Until a conflict is resolved"), and none without an eligible candidate. */
  readonly activeCandidateId: string | null;
  readonly candidates: readonly DerivedCandidate[];
  readonly conflict: DerivedConflict | null;
  /** 2.4 "Provisional", computed on read. */
  readonly provisional: boolean;
  /** 2.4 "Recalculation": a calculated or estimated candidate whose inputs are no longer all active. */
  readonly stale: boolean;
  readonly statusLines: readonly FieldStatusLine[];
  readonly review: ReviewItem | null;
}

/** The append-only events that concern one field: its candidates', its own, and its documents'. */
export interface DeriveEvents {
  readonly candidate: readonly CandidateEvent[];
  readonly field: readonly FieldEvent[];
  readonly document: readonly DocumentEvent[];
}

/** No events at all. */
export const NO_EVENTS: DeriveEvents = Object.freeze({
  candidate: Object.freeze([]),
  field: Object.freeze([]),
  document: Object.freeze([]),
});

/** What derive reads beyond the field's own candidates and events. Every lookup is read-only. */
export interface DeriveContext {
  /** Document records by id: stage (rule 4 order) and `supersedes` (2.3 revisions). */
  readonly document: (documentId: string) => DocumentRecord | undefined;
  /**
   * The derived state of the field that holds an input candidate of a calculated or
   * estimated candidate (2.4 "Provisional", "Recalculation"). Undefined when the
   * caller has not derived it.
   */
  readonly inputState: (candidateId: string) => FieldState | undefined;
  /** Whether a reference candidate's dataset version has an approval record (2.4; G1-12). */
  readonly datasetApproved: (reference: CandidateReference) => boolean;
}

/**
 * The one derive function (2.4 "Derived, never stored"; F-VALUE-02): the field
 * state, the active candidate, each candidate's verification and status, whether
 * the value is provisional and whether it is stale, with the conflict and its
 * routing (rule 4) and the review-step entry. Pure: it never changes its inputs.
 */
export type Derive = (
  field: FieldDefinition,
  candidates: readonly Candidate[],
  events: DeriveEvents,
  context: DeriveContext,
) => FieldState;

/** The one thrower of derive's NotImplementedError (declared once, when the package loads). */
const deriveNotImplemented = declareNotImplemented('derive');

export const derive: Derive = () => deriveNotImplemented();
