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
export const EVENT_ROLES = ['owner', 'sovitech_engineer', 'system'] as const;
export type Role = (typeof EVENT_ROLES)[number];

/**
 * The app roles of prompt 3 section 10 (the contract's personas). Only
 * `sovitech_engineer` may write `engineer_verified` (rule 10) and asset events
 * (2.5); `sovitech_commercial_reviewer` co-signs the stage 3 record of rule 10; holding
 * `sovitech_admin` never permits verification.
 */
export const APP_ROLES = ['owner', 'sovitech_engineer', 'sovitech_commercial_reviewer', 'sovitech_admin'] as const;
export type AppRole = (typeof APP_ROLES)[number];

// ---------------------------------------------------------------------------
// 2.2 Subjects
// ---------------------------------------------------------------------------

/** 2.2: the kinds of subject a value belongs to, in 2.2's order. */
export const SUBJECT_KINDS = ['project', 'building', 'level', 'zone', 'asset', 'document', 'metering_point'] as const;
export type SubjectKind = (typeof SUBJECT_KINDS)[number];

/** One subject (2.2). "The area of level 3" is one field on one subject. */
export interface Subject {
  readonly id: string;
  readonly projectId: string;
  readonly kind: SubjectKind;
}

/** 2.5 `FieldRef`: a field on a subject (an asset's tag, type, ratings and the rest are fields on the asset). */
export interface FieldRef {
  readonly subjectId: string;
  readonly fieldKey: string;
}

// ---------------------------------------------------------------------------
// 2.7 Units, 2.4 quantities
// ---------------------------------------------------------------------------

/**
 * An ASCII unit code from the closed unit registry (2.7, rule 8), for example 'm2'.
 * The registry and its dimension check live in @sovitech/registry.
 */
export type UnitCode = string;

/**
 * 2.7: a unit registry entry, for example `{ code: 'm2', symbol: 'm²', dimension: 'area' }`.
 * The closed list of entries, their dimensions and the dimension check live in
 * @sovitech/registry, which implements this shape; the domain never imports the
 * registry, so code that needs a unit is handed a {@link UnitLookup}.
 */
export interface UnitDefinition {
  readonly code: UnitCode;
  readonly symbol: string;
  readonly dimension: string;
}

/** The registry's unit lookup, injected; undefined for a code the closed registry does not hold. */
export type UnitLookup = (code: UnitCode) => UnitDefinition | undefined;

/**
 * Rule 8: "A value with no stated basis ... is stored with basis `unknown`". A
 * quantity whose qualifier is absent, empty or this key has an unknown
 * qualifier, and is compared with every qualified candidate of the same unit
 * (rule 4, "An unknown qualifier is still compared").
 */
export const UNKNOWN_QUALIFIER = 'unknown';

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
  /**
   * For `declared_revision_of`: the document this one revises, as the declaration
   * named it (the store's `revision_of_document_id`). 2.3 keeps the target on the
   * record (`supersedes`); carrying it on the event lets a later declaration on the
   * same pair replace an earlier one. Absent, the record's `supersedes` is read.
   */
  readonly revisionOf?: string;
  /** The stored event's id (the store's `document_events.id`), so another event can name it. */
  readonly id?: string;
  /**
   * For a `withdrawn` event by the system: the id of the owner's or engineer's own
   * `withdrawn` event on the same document that the system's job carries out (the
   * store's `request_event_id`). A system withdrawal that names none, or names an
   * event that is not a person's withdrawal of that document, removes nothing: 2.3
   * and rule 13 describe no document leaving without a person's action, and rule 4
   * keeps a value from going silently (documents.ts).
   */
  readonly requestEventId?: string;
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

/**
 * The checks that matched an entry at its location (2.4: "at least one verified
 * entry"; rule 1: "Evidence is verified by code"). `unverifiable` is not one of them.
 */
export const VERIFIED_EVIDENCE_MATCHES = ['text_match', 'ocr_match', 'region_rendered'] as const satisfies readonly EvidenceMatch[];

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
  /**
   * The role its author acted in when it was written (2.1, "Who can create it"):
   * `owner` or `sovitech_engineer` for a `user` value (the owner's own action, or an
   * engineer's site survey entry), `system` for every other source. The store sets it
   * from the request (`candidates.author_role`, migrations 0003 and 0009), never from
   * the caller's word, and every stored candidate carries it. On a `decision` field only
   * a `user` value whose author acted as the owner is a candidate (rule 3, "Choices
   * belong to the owner"); a candidate without it is never read as the owner's choice.
   */
  readonly authorRole?: Role;
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
  /**
   * For `conflict_resolved`: the candidates, by id, that the person was shown and
   * compared (rule 4: "A conflict is put to someone only when values arrive
   * without that person having seen both"). A resolution covers these and no
   * other; a candidate outside the set is compared again. A resolution without
   * them covers nothing.
   */
  readonly coveredCandidateIds?: readonly string[];
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
  readonly subject: SubjectKind;
  /** `decision`: an owner choice (rule 3). */
  readonly kind: 'quantity' | 'count' | 'enum' | 'text' | 'decision';
  readonly unit?: UnitCode;
  readonly qualifierRequired?: boolean;
  /**
   * The qualifier keys a candidate of this field may carry, besides the unknown
   * qualifier (rule 8: the area basis, what a count counts, the level type). A
   * registry extra (2.6 names only `qualifierRequired`); the registry's field
   * entries carry it. A stated qualifier outside this list is refused on read, so
   * a misspelt basis never forms a fact of its own that escapes rule 4's
   * comparison. A field without the list takes no stated qualifier.
   */
  readonly qualifiers?: readonly string[];
  /**
   * The keys an `enum` or `decision` candidate may carry (2.4 `choice`: "enum key";
   * 2.6 `kind`). A registry extra; the registry's field entries carry it. When the
   * field lists options, a choice outside them is refused on read (`value_shape`).
   */
  readonly options?: readonly string[];
  /**
   * Which of rule 3's owner facts makes the owner the right person to confirm
   * (`confirmBy: 'owner'`). A registry extra, read by registry validation and the
   * loosening check. {@link OWNER_CHOICE_BASIS} records the registry's reading that a
   * field is the owner's own choice (the project type answered on step 1). derive does
   * not read it: only a `decision` field holds the owner's choice there (rule 3 names
   * the choices; reading the project type as one is proposal P-1-OWNER-CHOICE-BASIS,
   * ADR 0016 decision 20).
   */
  readonly confirmByBasis?: string;
  /**
   * The reference datasets a `reference` candidate of this field may come from
   * (2.1 `reference`: "from the named dataset and version"; section 10: adding a
   * reference dataset is a loosening). A registry extra. A field without the list
   * takes no `reference` candidate.
   */
  readonly referenceDatasets?: readonly string[];
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

/**
 * The `confirmByBasis` of a field that holds the owner's own choice (rule 3, "Who
 * confirms": "their own choices"; "Choices belong to the owner").
 */
export const OWNER_CHOICE_BASIS = 'owner_choice';

/** 2.6 `FieldDefinition.kind`, in its order. */
export const FIELD_KINDS = ['quantity', 'count', 'enum', 'text', 'decision'] as const satisfies readonly FieldDefinition['kind'][];

/** The registry's field lookup, injected; undefined for a key the registry does not hold. */
export type FieldLookup = (key: string) => FieldDefinition | undefined;

// ---------------------------------------------------------------------------
// 2.5 Assets and identity
// ---------------------------------------------------------------------------

/** 2.5 `Asset.configuration` values, as its comment lists them. */
export const ASSET_CONFIGURATIONS = ['single', 'duty_standby', 'twin_head', 'n_plus_1'] as const;
export type AssetConfiguration = (typeof ASSET_CONFIGURATIONS)[number];

/**
 * 2.5 `Asset`. Every attribute but `lifeSafety` is a field on the asset subject,
 * so it has candidates, events and a derived state like any other value.
 */
export interface Asset {
  readonly id: string;
  /** As written: 'CTA-01', 'VCV-3.12', 'P1.1'. */
  readonly tag?: FieldRef;
  /** From the asset taxonomy in reference data. */
  readonly type: FieldRef;
  readonly location?: FieldRef;
  readonly serves?: FieldRef;
  readonly configuration?: FieldRef;
  /** Qualified quantities (rule 8). */
  readonly ratings: readonly FieldRef[];
  readonly interface?: FieldRef;
  /** Rule 11. */
  readonly lifeSafety: boolean;
}

/** 2.5 `AssetEvent.type`. */
export const ASSET_EVENT_TYPES = ['merged_into', 'split_from', 'removed'] as const;
export type AssetEventType = (typeof ASSET_EVENT_TYPES)[number];

/** 2.5 `AssetEvent`: "Only engineer accounts write them". Append-only. */
export interface AssetEvent {
  readonly assetId: string;
  readonly type: AssetEventType;
  readonly relatedAssetIds: readonly string[];
  readonly by: string;
  readonly role: 'sovitech_engineer';
  readonly at: string;
  readonly reason: string;
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
