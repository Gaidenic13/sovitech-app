/**
 * The value model of docs/guardrails.md section 2, as types.
 *
 * Each closed list is a readonly array with its type derived from it, so code and
 * tests can iterate it; model.test.ts checks every list against the text of
 * docs/guardrails.md. Section numbers point to the rule that governs each type:
 * read the rule there rather than a paraphrase here.
 */

// ---------------------------------------------------------------------------
// 2.1 Sources and verification
// ---------------------------------------------------------------------------

/** 2.1, the Source table, in its order. */
export const SOURCES = ['document', 'user', 'ai_inference', 'calculated', 'estimated', 'reference'] as const;
export type Source = (typeof SOURCES)[number];

/** 2.1 "The AI can only ever produce `document` or `ai_inference`". */
export type ProposedSource = Extract<Source, 'document' | 'ai_inference'>;

/** 2.1, the Verification table, in its order. */
export const VERIFICATIONS = ['unverified', 'owner_acknowledged', 'user_confirmed', 'engineer_verified'] as const;
export type Verification = (typeof VERIFICATIONS)[number];

/** Who acts in an event (2.3, 2.4). */
export type Role = 'owner' | 'sovitech_engineer' | 'system';

// ---------------------------------------------------------------------------
// 2.7 Units, 2.4 quantities
// ---------------------------------------------------------------------------

/**
 * An ASCII unit code from the closed unit registry (2.7, rule 8), for example 'm2'.
 * The registry and its dimension check live in @sovitech/registry.
 */
export type UnitCode = string;

/** 2.4 `Candidate.quantity`: value, unit, qualifier and the approximate flag (rule 8). */
export interface Quantity {
  readonly value: number;
  readonly unit: UnitCode;
  readonly qualifier?: string;
  readonly approximate?: boolean;
}

/** 2.4 `Candidate.original`: the text exactly as written, with its locale (rule 8). */
export interface OriginalText {
  readonly text: string;
  readonly locale?: string;
}

export type Confidence = 'high' | 'medium' | 'low';

// ---------------------------------------------------------------------------
// 2.3 Documents
// ---------------------------------------------------------------------------

/** 2.3 `DocumentRecord.kind`. */
export const DOCUMENT_KINDS = [
  'architectural',
  'mep',
  'electrical',
  'existing_bms',
  'energy_bill',
  'specification',
  'boq',
  'photo',
  'certificate',
  'other',
] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

/** 2.3 `DocumentRecord.stage`. Rule 4 "Documents that disagree" orders them for a proposal. */
export const DOCUMENT_STAGES = [
  'feasibility',
  'permit',
  'technical_design',
  'tender',
  'execution',
  'shop_drawing',
  'as_built',
  'site_survey',
  'nameplate_photo',
  'bill',
  'unknown',
] as const;
export type DocumentStage = (typeof DOCUMENT_STAGES)[number];

export type DocumentAnalysisStatus = 'queued' | 'analysing' | 'analysed' | 'partly_analysed' | 'stored_only' | 'failed';

/**
 * 2.3 `DocumentRecord`. It has no model or schema field: that is ifc-input 6.2.2,
 * a proposal that is not approved.
 */
export interface DocumentRecord {
  readonly id: string;
  readonly projectId: string;
  readonly contentHash: string;
  readonly kind: DocumentKind;
  readonly stage: DocumentStage;
  readonly revision?: string;
  readonly issueDate?: string;
  /** Set only as 2.3 "Revisions are declared, never guessed" allows. */
  readonly supersedes?: string;
  readonly analysis: {
    readonly status: DocumentAnalysisStatus;
    /** Recorded by code (rule 12). */
    readonly coverage: string;
  };
}

/** 2.3 `DocumentEvent.type`. */
export const DOCUMENT_EVENT_TYPES = ['declared_revision_of', 'withdrawn', 'erased'] as const;
export type DocumentEventType = (typeof DOCUMENT_EVENT_TYPES)[number];

/** 2.3 `DocumentEvent`: document status is derived from these. */
export interface DocumentEvent {
  readonly documentId: string;
  readonly type: DocumentEventType;
  readonly by: string;
  readonly role: Role;
  readonly at: string;
  readonly reason?: string;
}

// ---------------------------------------------------------------------------
// 2.4 Candidates, evidence and events
// ---------------------------------------------------------------------------

/**
 * 2.4 `Evidence.locator`. It has no IFC field (no GlobalId, STEP id or property
 * path): that is ifc-input 6.2.1, a proposal that is not approved, and prompt 3
 * section 8 forbids encoding one into these fields.
 */
export interface EvidenceLocator {
  readonly page?: number;
  readonly sheet?: string;
  readonly cell?: string;
  readonly bbox?: readonly [number, number, number, number];
}

/** The keys of {@link EvidenceLocator}, in 2.4's order. */
export const EVIDENCE_LOCATOR_KEYS = ['page', 'sheet', 'cell', 'bbox'] as const satisfies readonly (keyof EvidenceLocator)[];

/** 2.4 `Evidence.check`: set by code, never by the AI. */
export const EVIDENCE_MATCHES = ['text_match', 'ocr_match', 'region_rendered', 'unverifiable'] as const;
export type EvidenceMatch = (typeof EVIDENCE_MATCHES)[number];

/** 2.4 `Evidence`, as stored on a candidate after the verifier ran. */
export interface Evidence {
  readonly documentId: string;
  readonly contentHash: string;
  readonly locator: EvidenceLocator;
  /** Verbatim, original language, never translated (2.4). Rule 13 "Erasure" is its only change. */
  readonly excerpt: string;
  readonly check: EvidenceMatch;
}

/** 2.4 `Candidate.method`, for `calculated` and `estimated`. */
export interface CandidateMethod {
  readonly formulaId: string;
  readonly formulaVersion: string;
  /** The ids of the candidates the method used (2.4). */
  readonly inputCandidateIds: readonly string[];
  readonly unknownPolicy: 'refuse' | 'exclude_and_count' | 'range_over_options';
  readonly assumptions: readonly string[];
}

/** 2.4 `Candidate.reference`, for `reference`. */
export interface CandidateReference {
  readonly dataset: string;
  readonly version: string;
  readonly key: string;
}

/** 2.4 `Candidate`. Candidates never change after they are written. */
export interface Candidate {
  readonly id: string;
  readonly subjectId: string;
  readonly fieldKey: string;
  readonly quantity?: Quantity;
  /** An enum key. */
  readonly choice?: string;
  readonly text?: string;
  /** An ambiguous reading keeps both (rule 8). */
  readonly alternatives?: readonly Quantity[];
  readonly source: Source;
  /** `document` and `ai_inference`: at least one entry that passed the verifier. */
  readonly evidence: readonly Evidence[];
  readonly original?: OriginalText;
  readonly method?: CandidateMethod;
  readonly reference?: CandidateReference;
  /** `estimated`: produced by the method, never typed (rule 9). */
  readonly range?: { readonly low: number; readonly high: number };
  /** Capped by code (rule 3). */
  readonly confidence?: Confidence;
  readonly createdBy: string;
  readonly createdAt: string;
}

/** 2.4 `CandidateEvent.type`. */
export const CANDIDATE_EVENT_TYPES = [
  'user_confirmed',
  'owner_acknowledged',
  'engineer_verified',
  'rejected',
  'superseded',
  'withdrawn',
  'accepted_suggestion',
] as const;
export type CandidateEventType = (typeof CANDIDATE_EVENT_TYPES)[number];

/**
 * 2.4 `CandidateEvent`. Append-only. Rule 10 names the only writer of
 * `engineer_verified` (the review endpoint, through the guarded function).
 */
export interface CandidateEvent {
  readonly candidateId: string;
  readonly type: CandidateEventType;
  readonly by: string;
  readonly role: Role;
  readonly at: string;
  readonly reason?: string;
  readonly bulkId?: string;
}

/** 2.4 `FieldEvent.type`. */
export const FIELD_EVENT_TYPES = [
  'skipped',
  'marked_not_applicable',
  'conflict_raised',
  'conflict_resolved',
  'analysis_started',
  'analysis_finished',
] as const;
export type FieldEventType = (typeof FIELD_EVENT_TYPES)[number];

/** 2.4 `FieldEvent`. Append-only. */
export interface FieldEvent {
  readonly subjectId: string;
  readonly fieldKey: string;
  readonly type: FieldEventType;
  readonly by: string;
  readonly role: Role;
  readonly at: string;
  readonly reason?: string;
  readonly chosenCandidateId?: string;
}

// ---------------------------------------------------------------------------
// 2.6 Field registry entries
// ---------------------------------------------------------------------------

/**
 * 2.6 `FieldDefinition`. The type lives here because the derive function and the
 * verifier read it; the registry of entries and its validation live in
 * @sovitech/registry.
 */
export interface FieldDefinition {
  readonly key: string;
  readonly label: string;
  readonly subject: 'project' | 'building' | 'level' | 'zone' | 'asset' | 'document' | 'metering_point';
  /** `decision`: an owner choice (rule 3). */
  readonly kind: 'quantity' | 'count' | 'enum' | 'text' | 'decision';
  readonly unit?: UnitCode;
  readonly qualifierRequired?: boolean;
  readonly estimation: 'forbidden' | 'allowed';
  /** Rule 4. Counts default to zero tolerance. */
  readonly tolerance?: { readonly absolute?: number; readonly relative?: number; readonly reason: string };
  /** Rule 8. */
  readonly plausible?: { readonly low: number; readonly high: number; readonly basis: string };
  readonly criticality: 'required' | 'first_estimate' | 'for_quotation' | 'optional';
  /** Rule 6: concrete formula ids or template slots. */
  readonly affects: readonly { readonly output: string; readonly via: string }[];
  readonly impactRank: number;
  readonly confirmBy: 'owner' | 'engineer' | 'either';
  /** Rule 6: a closed list. */
  readonly identity?: boolean;
  /** Rule 1 "Material exclusions". */
  readonly minorForTotals?: boolean;
}

// ---------------------------------------------------------------------------
// Section 8 Guardrail events
// ---------------------------------------------------------------------------

/** Section 8, in its order. */
export const GUARDRAIL_EVENT_TYPES = [
  'ai_output_rejected',
  'evidence_not_found',
  'question_for_known_field',
  'owner_corrected_inference',
  'engineer_corrected_accepted_item',
  'conflict_raised',
  'reserved_term_blocked',
  'embedded_instruction',
  'confirmation_budget_exceeded',
  'skipped',
] as const;
export type GuardrailEventType = (typeof GUARDRAIL_EVENT_TYPES)[number];

/** One enforcement, logged (section 8). It never carries document text (rule 13). */
export interface GuardrailEvent {
  readonly type: GuardrailEventType;
  readonly projectId: string;
  readonly subjectId?: string;
  readonly fieldKey?: string;
  /** A code naming why, never an excerpt or other document text. */
  readonly reason?: string;
}
