/**
 * Field state (docs/guardrails.md 2.4 "Derived, never stored"; rule 4; F-VALUE-02
 * to F-VALUE-07). The one derive function: from a field's candidates and the
 * append-only events that concern them, it computes the field state, the
 * active candidate, each candidate's verification and status, whether the
 * value is provisional and whether it is stale, with the conflict test of rule
 * 4, its routing and the stage proposal. It is pure: it reads its inputs and
 * returns a new object, and it never changes, stores or rounds anything.
 *
 * The rules are in docs/guardrails.md; comments here point to them rather than
 * restate them. Where the text leaves a choice, derive takes the side that
 * keeps a value visible and in front of a person (more conflicts, fewer
 * silent choices), and the choice is named where it is made (ADR 0016).
 */
import { disagreementOf, readingsOf, spreadExceedsTolerance } from './conflict';
import { documentStatuses, type DocumentStatuses } from './documents';
import {
  UNKNOWN_QUALIFIER,
  VERIFIED_EVIDENCE_MATCHES,
  type Candidate,
  type CandidateEvent,
  type CandidateReference,
  type DocumentEvent,
  type DocumentRecord,
  type DocumentStage,
  type EvidenceMatch,
  type FieldDefinition,
  type FieldEvent,
  type Source,
  type UnitLookup,
  type Verification,
} from './model';
import { atOrBefore, olderFirst } from './time';

// ---------------------------------------------------------------------------
// Closed lists
// ---------------------------------------------------------------------------

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

/**
 * A candidate's current status. Eligible means not rejected, superseded or
 * withdrawn (2.4). `refused` is a candidate no event rejected that breaks a rule
 * the value model holds on every read (see {@link REFUSAL_REASONS}); it is never
 * eligible.
 */
export const CANDIDATE_STATUSES = ['eligible', 'rejected', 'superseded', 'withdrawn', 'refused'] as const;
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

/**
 * Why a stored candidate is refused on read. The write paths refuse these
 * already (the verifier, the engine, the dataset gate, the unit check); derive
 * refuses them again so that a candidate that got past a write path never
 * becomes a value.
 */
export const REFUSAL_REASONS = [
  /** A `reference` candidate whose dataset version has no approval record (2.1, 2.4; G1-12). */
  'unapproved_dataset',
  /**
   * A `reference` candidate from a dataset the field's registry entry does not list
   * in `referenceDatasets` (2.1 `reference`; section 10: a reference dataset is
   * added per field, and adding one is a loosening).
   */
  'dataset_not_for_field',
  /** An `estimated` candidate on a field whose registry entry forbids estimation (rule 1, "Estimation"). */
  'estimation_forbidden',
  /** A `document` or `ai_inference` candidate with no evidence (2.4: "at least one verified entry"). */
  'no_evidence',
  /**
   * A `document` candidate none of whose evidence entries matched at its location
   * (`text_match`, `ocr_match` or `region_rendered`; 2.4: "at least one verified
   * entry"; rule 1: `document` is "written literally ... at a verified location").
   * An `unverifiable` entry alone makes no document value.
   */
  'unverified_evidence',
  /** An `ai_inference` whose evidence is all `unverifiable`, with a confidence above low (rule 1: "Unverifiable evidence caps confidence at low"). */
  'confidence_above_cap',
  /** An `ai_inference` quantity other than a direct count (rule 1, "Enforced by"). */
  'inferred_quantity',
  /** A `calculated` or `estimated` candidate with no method (2.4, rule 9). */
  'no_method',
  /**
   * A `calculated` or `estimated` candidate whose formula id and version no declared
   * formula names, or a TEST formula outside the test runner (2.1: "The calculation
   * engine only"; 2.4 "Formula versions are immutable"; prompt 3 5.4). Also every
   * such candidate when the caller passes no `formulaDeclared` lookup.
   */
  'unknown_formula',
  /**
   * A `calculated` candidate with no input candidates: a formula over this
   * project's values that read none (2.1), such as a count of 0 over an empty
   * register (rule 1: "None found is not zero").
   */
  'no_inputs',
  /** An `estimated` candidate with no range (rule 9, "The engine. It requires method and range"). */
  'no_range',
  /**
   * A candidate from any source but `user` on a `decision` field: a choice belongs to
   * the owner, and a suggestion is a preselection the app renders, not a candidate
   * (rule 3, "Facts versus choices"; 2.6 `decision`).
   */
  'choice_not_owner',
  /**
   * A `user` candidate on a `decision` field whose author did not act as the owner
   * (`Candidate.authorRole`), such as an engineer's own entry "include" on Fire Safety
   * in scope: rule 3, "Choices belong to the owner"; 2.1, an engineer's `user` value is
   * a site survey entry, a fact, never the owner's choice; rule 11, Fire Safety stays
   * the owner's opt-in. A candidate that records no author role is refused the same way.
   */
  'choice_author_not_owner',
  /** A quantity whose unit is not in the closed unit registry, or measures another dimension than its field (2.7; rule 8). */
  'unit_dimension',
  /** A quantity whose stated qualifier is not one the field registers (rule 8, "Qualifiers that must be stated"; rule 4, "Only like with like"). */
  'qualifier_unregistered',
  /**
   * The value does not fit the field's kind: a number that is not finite, a count
   * (or one of its readings) that is not a whole number of zero or more (2.6 kind
   * `count`), or a choice outside the options the field lists (2.4 `choice`: "enum
   * key"). A shape, never a plausibility range (rule 8).
   */
  'value_shape',
] as const;
export type RefusalReason = (typeof REFUSAL_REASONS)[number];

/**
 * Why a stored event does not hold. Derive ignores such an event and lists it in
 * {@link FieldState.refusedEvents}, so the caller can record it; the value it
 * would have changed stays as it was.
 */
export const EVENT_REFUSALS = [
  /** A verification event from a role that may not give it (2.1; rule 3; rule 10). */
  'verification_wrong_role',
  /** An event that must name who wrote it and does not. */
  'by_missing',
  /** A `rejected` event by the system: a rejection is a person's (rule 4). */
  'rejected_by_system',
  /** An owner's rejection or withdrawal of an engineer_verified value (rule 4: "never overruled by the owner"). */
  'owner_overrules_engineer',
  /**
   * A rejection by an engineer of a `user` answer on a `decision` field (rule 3:
   * "Choices belong to the owner"; rule 7: late findings never "change an answer the
   * owner gave"). The owner's choice stays; an engineer who questions it leaves a note,
   * never a rejection.
   */
  'engineer_overrules_owner_choice',
  /**
   * An owner's rejection on an engineer or for_quotation field with no later owner
   * value for the same fact: on such a field the owner acknowledges or notes, the
   * engineer verifies (rule 3); a rejection holds only as part of a correction
   * (rule 4). The value stays eligible and is listed for the engineer.
   */
  'owner_rejection_without_value',
  /**
   * A `superseded` event that is not the engine's recalculation of a calculated or
   * estimated candidate (2.4 "Recalculation"). A revision supersedes only through a
   * declared revision (2.3), which derive reads from the document events.
   */
  'superseded_not_recalculation',
  /**
   * A `withdrawn` event that is neither the removal of every document the
   * candidate cites (by the system, for `document_erased` or `document_deleted`;
   * 2.3 "Deleting a document", rule 13 "Erasure") nor a person withdrawing their
   * own `user` candidate.
   */
  'withdrawn_not_removal',
  /** A `conflict_resolved` event by the system: only a person resolves (rule 4). */
  'resolution_by_system',
  /** A `conflict_resolved` event without who, why, the chosen candidate or the candidates it covered. */
  'resolution_incomplete',
  /**
   * A resolution by someone the conflict is not routed to, or a rejection of a side of an open conflict by
   * an engineer, or by the owner with no value of their own, who may not resolve it (rule 4, "Routing":
   * "Conflicts on owner fields go to the owner"; "Only the right person's resolution closes a conflict").
   * The conflict stays with the person it is routed to.
   */
  'resolver_not_routed',
  /** A `skipped` field event from anyone but the owner (2.4 Field states: "skipped: The owner chose Skip for now"; rule 7). */
  'skip_not_owner',
  /**
   * An `analysis_started` or `analysis_finished` field event from anyone but the
   * system (2.4 Field states: "pending: Analysis that may produce a value is still
   * running"; rule 12: code, not a person, records analysis).
   */
  'analysis_not_system',
  /**
   * A document's `withdrawn` event by the system that names no owner's or engineer's own
   * withdrawal of that document (2.3, "Deleting a document"; rule 13; rule 4, "Never
   * silently overwrite"). The document stays, with every value it supports (documents.ts).
   */
  'withdrawal_without_request',
  /**
   * A document's `erased` event that is neither the owner's nor the audited erasure
   * function's own as the system (rule 13, "Erasure"). The document stays (documents.ts).
   */
  'erasure_outside_function',
] as const;
export type EventRefusal = (typeof EVENT_REFUSALS)[number];

/**
 * A stored event derive did not apply, and why. A document event is listed when a
 * candidate of the field cites its document.
 */
export type RefusedEvent =
  | { readonly kind: 'candidate'; readonly event: CandidateEvent; readonly refusal: EventRefusal }
  | { readonly kind: 'field'; readonly event: FieldEvent; readonly refusal: EventRefusal }
  | { readonly kind: 'document'; readonly event: DocumentEvent; readonly refusal: EventRefusal };

/** The reasons of a system withdrawal that removes a document (2.3 "Deleting a document"; rule 13 "Erasure"). */
export const DOCUMENT_REMOVAL_REASONS = ['document_erased', 'document_deleted'] as const;

/** Each candidate as derived from its events (2.4). */
export interface DerivedCandidate {
  readonly candidateId: string;
  readonly verification: Verification;
  readonly status: CandidateStatus;
  /** Why it is refused; null unless `status` is `refused`. */
  readonly refusal: RefusalReason | null;
}

/**
 * The kinds of conflict. `values_differ` and `units_differ` are candidates of one
 * fact that disagree (rule 4, "Conflict test"); the other two are a value with an
 * unknown qualifier that matches no qualified reading, or more than one (rule 4,
 * "An unknown qualifier is still compared").
 */
export const CONFLICT_KINDS = ['values_differ', 'units_differ', 'unqualified_matches_none', 'unqualified_matches_several'] as const;
export type ConflictKind = (typeof CONFLICT_KINDS)[number];

/** An open conflict (rule 4): the eligible candidates that disagree, and whose queue it is in. */
export interface DerivedConflict {
  readonly kind: ConflictKind;
  /** The fact it is about; null for a field without qualifiers and for an unqualified value. */
  readonly qualifier: string | null;
  readonly candidateIds: readonly string[];
  /** Rule 4 "Routing". */
  readonly routedTo: 'owner' | 'engineer';
  /**
   * Rule 4 "Documents that disagree": the candidate the app proposes by document
   * stage, for the person who decides; null when the candidates are not all
   * from documents, a stage is not in the order, no order was supplied, or the
   * best stage holds disagreeing candidates. It is never the active candidate:
   * until a person resolves the conflict the field has none.
   */
  readonly proposedCandidateId: string | null;
}

/**
 * One fact of a field: its eligible candidates with one known qualifier (or,
 * for a field without qualifiers, all of them). "Values with different known
 * qualifiers are different facts and are not compared" (rule 4), so a field
 * such as an area can hold several facts: its usable and its gross area.
 */
export interface FactState {
  readonly qualifier: string | null;
  readonly state: 'known' | 'conflict';
  /** The eligible candidates still compared: after a resolution, the chosen one and those that arrived later. */
  readonly candidateIds: readonly string[];
  /** Candidates a resolution set aside; eligible, still shown, no longer compared. */
  readonly setAsideIds: readonly string[];
  /**
   * None while the fact is in conflict (rule 4 "Until a conflict is resolved"), and
   * none while its one candidate is an ambiguous reading ({@link FactState.ambiguous}).
   */
  readonly activeCandidateId: string | null;
  /**
   * The fact's one candidate carries alternative readings that differ (rule 8:
   * "Ambiguous readings keep both ... It is never silently read one way"). The
   * fact is known, but it has no single value: a formula reads it only as a
   * range over the readings (`range_over_options`), and whether to ask which
   * reading is right is the question engine's decision (rule 5, "an ambiguous
   * reading").
   */
  readonly ambiguous: boolean;
  readonly conflict: DerivedConflict | null;
  readonly provisional: boolean;
  readonly stale: boolean;
}

/**
 * A value with an unknown qualifier that matches exactly one qualified reading
 * within tolerance: the app shows a confirmation naming that reading (rule 4;
 * G4-11). Whether and where it is shown is the question engine's decision
 * (rule 5, its test and budget).
 */
export interface ReadingToConfirm {
  readonly candidateId: string;
  readonly qualifier: string;
  readonly matchedCandidateIds: readonly string[];
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
 * appear here: an open conflict (rule 4), a removed source document (2.3), and a
 * document value the owner corrected or questioned on an engineer or for_quotation
 * field (rule 4, "A correction is a resolution"; rule 3).
 */
export interface ReviewItem {
  readonly list: 'for_you' | 'sovitech_will_check';
  readonly reason: 'conflict' | 'source_document_removed' | 'owner_correction';
}

/** What set a field not applicable (2.4, "Field states"). */
export type NotApplicableBasis =
  | {
      readonly kind: 'event';
      readonly by: string;
      readonly role: 'owner' | 'sovitech_engineer';
      readonly reason: string;
      readonly at: string;
    }
  | { readonly kind: 'registry_condition'; readonly conditionId: string };

/** What derive returns for one field on one subject. Never stored. It carries no number of its own. */
export interface FieldState {
  readonly subjectId: string;
  readonly fieldKey: string;
  readonly state: FieldStateName;
  /**
   * The active candidate of a known field that holds one fact. None while a
   * conflict is open (rule 4 "Until a conflict is resolved"), none without an
   * eligible candidate, none while the one fact is an ambiguous reading, and none
   * when the field holds several facts (then each fact in
   * {@link FieldState.facts} names its own).
   */
  readonly activeCandidateId: string | null;
  /** Every candidate, by id. */
  readonly candidates: readonly DerivedCandidate[];
  /** The facts of a field with eligible candidates, by qualifier. */
  readonly facts: readonly FactState[];
  /** Every open conflict: of the facts, and of values with an unknown qualifier. */
  readonly conflicts: readonly DerivedConflict[];
  /**
   * The field's open conflict as one: the first of {@link FieldState.conflicts},
   * or, when there are several, all their candidates, routed to the engineer if
   * any of them is. Null when there is none.
   */
  readonly conflict: DerivedConflict | null;
  /** Values with an unknown qualifier that match exactly one qualified reading (rule 4; G4-11). */
  readonly readingsToConfirm: readonly ReadingToConfirm[];
  /** 2.4 "Provisional", computed on read. False for a field with no value. */
  readonly provisional: boolean;
  /** 2.4 "Recalculation": an active calculated or estimated candidate whose inputs are no longer all active. */
  readonly stale: boolean;
  readonly statusLines: readonly FieldStatusLine[];
  readonly review: ReviewItem | null;
  /** What set the field not applicable; null unless `state` is `not_applicable`. */
  readonly notApplicable: NotApplicableBasis | null;
  /** The stored events that did not hold, with why: for the caller to record (section 8), never applied. */
  readonly refusedEvents: readonly RefusedEvent[];
}

/** The append-only events that concern one field: its candidates', its own, and the project's document events. */
export interface DeriveEvents {
  readonly candidate: readonly CandidateEvent[];
  readonly field: readonly FieldEvent[];
  /**
   * Document events. Pass every document event of the project: a revision
   * declared on a document that no candidate of this field cites still
   * supersedes its predecessor (2.3).
   */
  readonly document: readonly DocumentEvent[];
}

/** No events at all. */
export const NO_EVENTS: DeriveEvents = Object.freeze({
  candidate: Object.freeze([]),
  field: Object.freeze([]),
  document: Object.freeze([]),
});

/**
 * A registry condition that makes a field not applicable (2.4: "a registry
 * condition on known fields that have their own sources"), as the registry
 * evaluated it for this subject, with the derived states it read.
 */
export interface NotApplicableCondition {
  readonly conditionId: string;
  /** The derived states of the fields the condition reads. Each must be known, without conflict. */
  readonly basedOn: readonly FieldState[];
}

/** What derive reads beyond the field's own candidates and events. Every lookup is read-only. */
export interface DeriveContext {
  /** The subject the field belongs to. Every candidate must be on it. */
  readonly subjectId: string;
  /** Document records by id: stage (rule 4 order) and `supersedes` (2.3 revisions). */
  readonly document: (documentId: string) => DocumentRecord | undefined;
  /**
   * The closed unit registry (2.7): the dimension check runs on every quantity
   * candidate of a quantity or count field, on every read. A unit it does not
   * hold, or of another dimension than the field's unit, refuses the candidate.
   */
  readonly unit: UnitLookup;
  /**
   * The derived state of the field that holds an input candidate of a calculated or
   * estimated candidate (2.4 "Provisional", "Recalculation"). Undefined when the
   * caller has not derived it, which derive reads as "not known to be active":
   * the value is then stale and provisional.
   */
  readonly inputState: (candidateId: string) => FieldState | undefined;
  /**
   * Whether a reference candidate's dataset version has an approval record for this
   * field (2.4; G1-12; section 10: reference datasets are listed per field). Derive
   * also refuses a dataset the field's `referenceDatasets` does not list, whatever
   * the lookup answers.
   */
  readonly datasetApproved: (reference: CandidateReference, field: FieldDefinition) => boolean;
  /**
   * Whether a calculated or estimated candidate's formula id and version are
   * declared (2.1: "The calculation engine only"; 2.4 "Formula versions are
   * immutable"), never a TEST formula outside the test runner (prompt 3 5.4). The
   * registry's declared signatures give it ({@link declaredFormulaLookup}); the test
   * runner builds its own. Without it, every calculated or estimated candidate is
   * refused (`unknown_formula`), so a caller that forgets it shows fewer values,
   * never more.
   */
  readonly formulaDeclared?: (formulaId: string, formulaVersion: string) => boolean;
  /**
   * Rule 4's document-stage order for proposing an active candidate, best tier
   * first; an approver setting the registry carries (D-53). Without it derive
   * proposes nothing, and a person decides as always.
   */
  readonly stageOrder?: readonly (readonly DocumentStage[])[];
  /**
   * The registry condition that makes this field not applicable on this subject,
   * if one holds. Without it no registry condition applies.
   */
  readonly notApplicableCondition?: (field: FieldDefinition) => NotApplicableCondition | undefined;
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const rankIn = <T>(order: readonly T[], item: T): number => order.indexOf(item);

/** Newest first; text order where a time does not parse, so the order stays total. */
const newerFirst = (a: string, b: string): number => olderFirst(b, a);

const filled = (text: string | undefined): text is string => text !== undefined && text.trim() !== '';

const VERIFIED_CHECKS: ReadonlySet<EvidenceMatch> = new Set(VERIFIED_EVIDENCE_MATCHES);
const REMOVAL_REASONS: ReadonlySet<string> = new Set(DOCUMENT_REMOVAL_REASONS);

/** The qualifier of a quantity candidate as the conflict test reads it: null when unknown (rule 8 "basis unknown"). */
function qualifierOf(candidate: Candidate): string | null {
  const qualifier = candidate.quantity?.qualifier;
  return qualifier === undefined || qualifier.trim() === '' || qualifier === UNKNOWN_QUALIFIER ? null : qualifier;
}

const isQuantityField = (field: FieldDefinition): boolean => field.kind === 'quantity' || field.kind === 'count';

/**
 * Whether a field holds the owner's own choice (rule 3, "Choices belong to the
 * owner"; 2.6: "decision: an owner choice"): a `decision` field. Only the owner's own
 * `user` answer sets it, and no engineer's rejection takes it away. The registry's
 * `confirmByBasis` is not read here: reading the project type as the owner's choice
 * is proposal P-1-OWNER-CHOICE-BASIS (ADR 0016 decision 20), so a document that
 * disagrees with the owner's step 1 answer puts the field in conflict (rule 4).
 */
export function isOwnerChoice(field: FieldDefinition): boolean {
  return field.kind === 'decision';
}

/** 2.6 kind `count`: a whole number of zero or more. */
const isCountValue = (value: number): boolean => Number.isInteger(value) && value >= 0;

/** A TEST id, as prompt 3 5.4 marks TEST datasets and formulas ("carry 'TEST' in their id"). */
const isTestId = (id: string): boolean => id.includes('TEST');

/**
 * {@link DeriveContext.formulaDeclared} over declared formula signatures (the
 * registry's id and version of each formula): true only for a pair the list
 * declares, and never for a TEST formula (prompt 3 5.4: no TEST formula outside
 * the test runner; the test runner builds its own lookup).
 */
export function declaredFormulaLookup(
  signatures: readonly { readonly id: string; readonly version: string }[],
): (formulaId: string, formulaVersion: string) => boolean {
  const declared = new Set(signatures.filter((signature) => !isTestId(signature.id)).map((signature) => `${signature.id}@${signature.version}`));
  return (formulaId, formulaVersion) => !isTestId(formulaId) && declared.has(`${formulaId}@${formulaVersion}`);
}

/** Whether a calculated or estimated candidate's formula is declared (see {@link DeriveContext.formulaDeclared}). */
function formulaIsDeclared(method: NonNullable<Candidate['method']>, context: DeriveContext): boolean {
  const lookup: unknown = context.formulaDeclared;
  if (typeof lookup !== 'function' || !filled(method.formulaId) || !filled(method.formulaVersion)) return false;
  return context.formulaDeclared?.(method.formulaId, method.formulaVersion) === true;
}

/** Whether a stated qualifier on an alternative reading departs from the candidate's own. */
function alternativeQualifierDiffers(candidate: Candidate): boolean {
  const own = candidate.quantity?.qualifier;
  return (candidate.alternatives ?? []).some((alternative) => alternative.qualifier !== undefined && alternative.qualifier !== own);
}

/** 2.7: the unit of every reading is in the closed registry and measures the field's dimension. */
function unitFits(field: FieldDefinition, unitCode: string, context: DeriveContext): boolean {
  const lookup: unknown = context.unit;
  if (typeof lookup !== 'function' || field.unit === undefined) return false;
  const fieldUnit = context.unit(field.unit);
  const unit = context.unit(unitCode);
  return fieldUnit !== undefined && unit !== undefined && fieldUnit.dimension === unit.dimension;
}

/** Why a candidate breaks a rule held on every read, or null. */
function refusalOf(field: FieldDefinition, candidate: Candidate, context: DeriveContext): RefusalReason | null {
  switch (field.kind) {
    case 'quantity':
    case 'count': {
      const quantity = candidate.quantity;
      if (quantity === undefined || !Number.isFinite(quantity.value) || !filled(quantity.unit)) return 'value_shape';
      const alternatives = candidate.alternatives ?? [];
      if (alternatives.some((alternative) => !Number.isFinite(alternative.value) || alternative.unit !== quantity.unit)) {
        return 'value_shape';
      }
      if (alternativeQualifierDiffers(candidate)) return 'value_shape';
      if (field.kind === 'count' && ![quantity.value, ...alternatives.map((alternative) => alternative.value)].every(isCountValue)) {
        return 'value_shape';
      }
      if (!unitFits(field, quantity.unit, context)) return 'unit_dimension';
      const qualifier = qualifierOf(candidate);
      if (qualifier !== null && !(field.qualifiers ?? []).includes(qualifier)) return 'qualifier_unregistered';
      break;
    }
    case 'enum':
    case 'decision':
      if (!filled(candidate.choice)) return 'value_shape';
      if (field.options !== undefined && !field.options.includes(candidate.choice)) return 'value_shape';
      break;
    case 'text':
      if (candidate.text === undefined) return 'value_shape';
      break;
  }
  if (isOwnerChoice(field) && candidate.source !== 'user') return 'choice_not_owner';
  if (isOwnerChoice(field) && candidate.authorRole !== 'owner') return 'choice_author_not_owner';
  switch (candidate.source) {
    case 'document':
      if (candidate.evidence.length === 0) return 'no_evidence';
      return candidate.evidence.some((evidence) => VERIFIED_CHECKS.has(evidence.check)) ? null : 'unverified_evidence';
    case 'ai_inference':
      if (candidate.evidence.length === 0) return 'no_evidence';
      if (field.kind === 'quantity') return 'inferred_quantity';
      if (!candidate.evidence.some((evidence) => VERIFIED_CHECKS.has(evidence.check)) && candidate.confidence !== 'low') {
        return 'confidence_above_cap';
      }
      return null;
    case 'reference':
      if (candidate.reference === undefined || !context.datasetApproved(candidate.reference, field)) return 'unapproved_dataset';
      return (field.referenceDatasets ?? []).includes(candidate.reference.dataset) ? null : 'dataset_not_for_field';
    case 'calculated':
      if (candidate.method === undefined) return 'no_method';
      if (candidate.method.inputCandidateIds.length === 0) return 'no_inputs';
      return formulaIsDeclared(candidate.method, context) ? null : 'unknown_formula';
    case 'estimated':
      if (field.estimation !== 'allowed') return 'estimation_forbidden';
      if (candidate.method === undefined) return 'no_method';
      if (!formulaIsDeclared(candidate.method, context)) return 'unknown_formula';
      return candidate.range === undefined ? 'no_range' : null;
    case 'user':
      return null;
  }
}

/**
 * A candidate's current verification: the highest level an event by the right
 * role gives it (2.1, rule 3, rule 10), and the verification events that do not hold.
 */
function verificationOf(
  field: FieldDefinition,
  events: readonly CandidateEvent[],
): { readonly level: Verification; readonly refused: readonly RefusedEvent[] } {
  let best: Verification = 'unverified';
  const refused: RefusedEvent[] = [];
  for (const event of events) {
    let level: Verification | null = null;
    if (event.type === 'engineer_verified') {
      if (event.role !== 'sovitech_engineer') refused.push({ kind: 'candidate', event, refusal: 'verification_wrong_role' });
      else if (!filled(event.by)) refused.push({ kind: 'candidate', event, refusal: 'by_missing' });
      else level = 'engineer_verified';
    }
    if (event.type === 'user_confirmed') {
      // 2.1: the owner confirms a value they are the right person to confirm; on an engineer field it stays unverified.
      if (event.role !== 'owner' || field.confirmBy === 'engineer') refused.push({ kind: 'candidate', event, refusal: 'verification_wrong_role' });
      else level = 'user_confirmed';
    }
    if (event.type === 'owner_acknowledged') {
      if (event.role !== 'owner') refused.push({ kind: 'candidate', event, refusal: 'verification_wrong_role' });
      else level = 'owner_acknowledged';
    }
    if (level !== null && rankIn(VERIFICATION_PRECEDENCE, level) < rankIn(VERIFICATION_PRECEDENCE, best)) best = level;
  }
  return { level: best, refused };
}

/** Whether a verification is a check a person made that a revision may not override silently (2.3). */
const isChecked = (verification: Verification): boolean =>
  verification === 'engineer_verified' || verification === 'user_confirmed';

/** Whether every document the candidate cites is removed (2.3 "Deleting a document"; rule 13 "Erasure"). */
const allEvidenceRemoved = (candidate: Candidate, documents: DocumentStatuses): boolean =>
  candidate.evidence.length > 0 && candidate.evidence.every((evidence) => documents.removed(evidence.documentId));

/**
 * Whether a `withdrawn` event holds, or why not. It holds when the system
 * records the removal of every document the candidate cites (2.3, rule 13), or
 * when a person withdraws their own `user` candidate; an owner never withdraws a
 * value that carries engineer_verified (rule 4).
 */
function withdrawalRefusal(
  event: CandidateEvent,
  candidate: Candidate,
  verification: Verification,
  documents: DocumentStatuses,
): EventRefusal | null {
  if (!filled(event.by)) return 'by_missing';
  if (event.role === 'system') {
    return event.reason !== undefined && REMOVAL_REASONS.has(event.reason) && allEvidenceRemoved(candidate, documents)
      ? null
      : 'withdrawn_not_removal';
  }
  if (candidate.source !== 'user' || event.by !== candidate.createdBy) return 'withdrawn_not_removal';
  if (event.role === 'owner' && verification === 'engineer_verified') return 'owner_overrules_engineer';
  return null;
}

/** Whether a `superseded` event holds, or why not: only the engine's recalculation (2.4 "Recalculation"). */
function supersessionRefusal(event: CandidateEvent, candidate: Candidate): EventRefusal | null {
  if (!filled(event.by)) return 'by_missing';
  const recalculated = event.role === 'system' && (candidate.source === 'calculated' || candidate.source === 'estimated');
  return recalculated ? null : 'superseded_not_recalculation';
}

/** Candidate ordering for the active candidate (2.4): verification, then source, then newest; id last so the order is total. */
function activeOrder(
  verification: ReadonlyMap<string, Verification>,
): (a: Candidate, b: Candidate) => number {
  return (a, b) =>
    rankIn(VERIFICATION_PRECEDENCE, verification.get(a.id) ?? 'unverified') -
      rankIn(VERIFICATION_PRECEDENCE, verification.get(b.id) ?? 'unverified') ||
    rankIn(SOURCE_PRECEDENCE, a.source) - rankIn(SOURCE_PRECEDENCE, b.source) ||
    newerFirst(a.createdAt, b.createdAt) ||
    a.id.localeCompare(b.id);
}

/** Rule 4 "Routing". */
function routeOf(field: FieldDefinition, members: readonly Candidate[], verification: ReadonlyMap<string, Verification>): 'owner' | 'engineer' {
  if (members.some((candidate) => verification.get(candidate.id) === 'engineer_verified')) return 'engineer';
  return field.confirmBy === 'engineer' ? 'engineer' : 'owner';
}

/** The best stage tier of a candidate's evidence, or null when a document is unknown or its stage is not in the order. */
function stageTierOf(
  candidate: Candidate,
  context: DeriveContext,
  documents: DocumentStatuses,
  order: readonly (readonly DocumentStage[])[],
): number | null {
  const tiers: number[] = [];
  for (const evidence of candidate.evidence) {
    if (documents.removed(evidence.documentId)) continue;
    const record = context.document(evidence.documentId);
    if (record === undefined) return null;
    const tier = order.findIndex((stages) => stages.includes(record.stage));
    if (tier < 0) return null;
    tiers.push(tier);
  }
  const sorted = tiers.sort((a, b) => a - b);
  return sorted[0] ?? null;
}

/** Rule 4 "Documents that disagree": the candidate proposed by stage, or null. Never by issue date. */
function stageProposal(
  field: FieldDefinition,
  members: readonly Candidate[],
  context: DeriveContext,
  documents: DocumentStatuses,
  verification: ReadonlyMap<string, Verification>,
): string | null {
  const order = context.stageOrder;
  if (order === undefined) return null;
  const ranked: { candidate: Candidate; tier: number }[] = [];
  for (const candidate of members) {
    if (candidate.source !== 'document' && candidate.source !== 'ai_inference') return null;
    const tier = stageTierOf(candidate, context, documents, order);
    if (tier === null) return null;
    ranked.push({ candidate, tier });
  }
  const bestTier = ranked.map((entry) => entry.tier).sort((a, b) => a - b)[0];
  if (bestTier === undefined) return null;
  const best = ranked.filter((entry) => entry.tier === bestTier).map((entry) => entry.candidate);
  if (best.length === members.length) return null;
  if (disagreementOf(field, best) !== null) return null;
  return [...best].sort(activeOrder(verification))[0]?.id ?? null;
}

/** Whether a candidate is the active candidate of one of a field's facts, and that fact. */
function factHolding(state: FieldState, candidateId: string): FactState | undefined {
  return state.facts.find((fact) => fact.activeCandidateId === candidateId);
}

/** 2.4 "Provisional" and "Recalculation" for one active candidate. */
function provisionalAndStale(
  candidate: Candidate,
  verification: Verification,
  context: DeriveContext,
): { readonly provisional: boolean; readonly stale: boolean } {
  const inputs = candidate.method?.inputCandidateIds ?? [];
  if ((candidate.source === 'calculated' || candidate.source === 'estimated') && inputs.length > 0) {
    // Calculated candidates are transparent; an estimate's own method is not a leaf (G9-7).
    let provisional = false;
    let stale = false;
    for (const inputId of inputs) {
      const state = context.inputState(inputId);
      const fact = state === undefined ? undefined : factHolding(state, inputId);
      if (fact === undefined) {
        // Not known to be active: an input in conflict, ambiguous, replaced, or not derived by the caller.
        stale = true;
        provisional = true;
      } else if (fact.provisional) {
        provisional = true;
      }
    }
    return { provisional, stale };
  }
  // A leaf of the input graph.
  if (candidate.source === 'reference') return { provisional: false, stale: false };
  if (candidate.source === 'estimated') return { provisional: true, stale: false };
  if (candidate.source === 'ai_inference' && verification !== 'engineer_verified') return { provisional: true, stale: false };
  return { provisional: !isChecked(verification), stale: false };
}

/** Rule 8: a lone candidate whose readings differ by more than the field's tolerance has no single value. */
function isAmbiguousReading(field: FieldDefinition, candidate: Candidate): boolean {
  if (!isQuantityField(field) || candidate.alternatives === undefined || candidate.alternatives.length === 0) return false;
  return spreadExceedsTolerance(field, readingsOf(candidate));
}

// ---------------------------------------------------------------------------
// Resolutions
// ---------------------------------------------------------------------------

interface WorkingFact {
  readonly qualifier: string | null;
  readonly members: readonly Candidate[];
  readonly setAside: readonly Candidate[];
  /** The candidates an owner's resolution set aside: on an engineer or for_quotation field they go to the engineer queue. */
  readonly setAsideByOwner: readonly Candidate[];
}

/** Which complete resolutions applied somewhere, and which were refused for the route of the conflict they chose in. */
interface ResolutionTally {
  readonly applied: Set<FieldEvent>;
  readonly notRouted: Set<FieldEvent>;
}

/** The resolvers a conflict accepts (rule 4, "Only the right person's resolution closes a conflict"). */
function mayResolve(field: FieldDefinition, route: 'owner' | 'engineer', role: FieldEvent['role']): boolean {
  if (route === 'engineer') return role === 'sovitech_engineer';
  if (role === 'owner') return true;
  return role === 'sovitech_engineer' && field.confirmBy === 'either';
}

/** Whether the resolution's person was shown the candidate: it is in the covered set and existed then. */
function covers(resolution: FieldEvent, candidate: Candidate): boolean {
  return (resolution.coveredCandidateIds ?? []).includes(candidate.id) && atOrBefore(candidate.createdAt, resolution.at);
}

/**
 * Applies the `conflict_resolved` events to one fact, oldest first. A resolution
 * holds when a person the conflict is routed to chose one of the candidates it
 * covered, with a reason, and the covered candidates disagreed: the chosen one
 * stays in play, the others it covered are set aside, and every candidate
 * outside the covered set is compared again (a new disagreement reopens the
 * conflict). "Covered" is the set the resolution names, never a time window.
 */
function resolveFact(
  field: FieldDefinition,
  fact: WorkingFact,
  resolutions: readonly FieldEvent[],
  verification: ReadonlyMap<string, Verification>,
  tally: ResolutionTally,
): WorkingFact {
  let members = fact.members;
  let setAside = fact.setAside;
  let setAsideByOwner = fact.setAsideByOwner;
  for (const resolution of resolutions) {
    const covered = members.filter((candidate) => covers(resolution, candidate));
    const chosen = covered.find((candidate) => candidate.id === resolution.chosenCandidateId);
    if (chosen === undefined || disagreementOf(field, covered) === null) continue;
    if (!mayResolve(field, routeOf(field, covered, verification), resolution.role)) {
      tally.notRouted.add(resolution);
      continue;
    }
    tally.applied.add(resolution);
    const losers = covered.filter((candidate) => candidate.id !== chosen.id);
    setAside = [...setAside, ...losers];
    if (resolution.role === 'owner') setAsideByOwner = [...setAsideByOwner, ...losers];
    members = members.filter((candidate) => candidate.id === chosen.id || !covered.includes(candidate));
  }
  return { qualifier: fact.qualifier, members, setAside, setAsideByOwner };
}

/** One assessment of a field's candidates: their statuses, the facts and the open conflicts (see derive). */
interface Assessment {
  readonly status: ReadonlyMap<string, CandidateStatus>;
  readonly eligible: readonly Candidate[];
  readonly workingFacts: readonly WorkingFact[];
  readonly facts: readonly FactState[];
  readonly conflicts: readonly DerivedConflict[];
  readonly readingsToConfirm: readonly ReadingToConfirm[];
  readonly tally: ResolutionTally;
}

/** What the resolutions make of a value with an unknown qualifier that is in conflict with qualified readings. */
type UnqualifiedOutcome =
  | { readonly kind: 'open' }
  /** The person chose a qualified reading: the unqualified value is set aside, with that reading's fact. */
  | { readonly kind: 'set_aside'; readonly chosen: Candidate; readonly byOwner: boolean }
  /** The person chose the unqualified value itself, having seen every reading it was compared with: a fact of its own. */
  | { readonly kind: 'alone' };

/**
 * Rule 4's resolution for an unqualified value (`unqualified_matches_none` or
 * `unqualified_matches_several`): the latest resolution that covers the value,
 * by a person the conflict is routed to, decides. Choosing a qualified reading
 * sets the value aside; choosing the value keeps it as a fact of its own, but only
 * while every reading it was compared with is one the person saw.
 */
function resolveUnqualified(
  field: FieldDefinition,
  value: Candidate,
  compared: readonly Candidate[],
  resolutions: readonly FieldEvent[],
  verification: ReadonlyMap<string, Verification>,
  tally: ResolutionTally,
): UnqualifiedOutcome {
  let outcome: UnqualifiedOutcome = { kind: 'open' };
  for (const resolution of resolutions) {
    if (!covers(resolution, value)) continue;
    const chosen = compared.find((candidate) => candidate.id === resolution.chosenCandidateId && covers(resolution, candidate));
    if (chosen === undefined) continue;
    if (!mayResolve(field, routeOf(field, compared, verification), resolution.role)) {
      tally.notRouted.add(resolution);
      continue;
    }
    if (chosen.id !== value.id) {
      tally.applied.add(resolution);
      outcome = { kind: 'set_aside', chosen, byOwner: resolution.role === 'owner' };
    } else if (compared.every((candidate) => covers(resolution, candidate))) {
      tally.applied.add(resolution);
      outcome = { kind: 'alone' };
    }
  }
  return outcome;
}

const byId = (a: Candidate, b: Candidate): number => a.id.localeCompare(b.id);
const ids = (candidates: readonly Candidate[]): string[] => candidates.map((candidate) => candidate.id).sort();

/** An optional text as a sort key that tells an absent value from an empty one. */
const keyOf = (text: string | undefined): string => (text === undefined ? '-' : `+${text}`);

/** An optional list of ids as a sort key, in id order, that tells an absent list from an empty one. */
const keyOfIds = (list: readonly string[] | undefined): string => (list === undefined ? '-' : `+${[...list].sort().join(',')}`);

/**
 * A total order on refused events, so the list never depends on the order events were passed in. Every field
 * of the event is in the key, and an absent optional value sorts apart from an empty one, so two events that
 * differ only there still have one order.
 */
function refusedKey(refused: RefusedEvent): string {
  const event = refused.event;
  let target: string;
  let extra: string[];
  switch (refused.kind) {
    case 'candidate':
      target = refused.event.candidateId;
      extra = [keyOf(refused.event.bulkId)];
      break;
    case 'field':
      target = `${refused.event.subjectId}/${refused.event.fieldKey}`;
      extra = [keyOf(refused.event.chosenCandidateId), keyOfIds(refused.event.coveredCandidateIds)];
      break;
    case 'document':
      target = refused.event.documentId;
      extra = [keyOf(refused.event.revisionOf), keyOf(refused.event.id), keyOf(refused.event.requestEventId)];
      break;
  }
  return [refused.kind, target, event.type, event.at, event.role, event.by, keyOf(event.reason), ...extra, refused.refusal].join('\u0000');
}

// ---------------------------------------------------------------------------
// derive
// ---------------------------------------------------------------------------

export const derive: Derive = (field, candidates, events, context) => {
  // --- Inputs: one field on one subject.
  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (candidate.fieldKey !== field.key || candidate.subjectId !== context.subjectId) {
      throw new Error(
        `derive reads one field on one subject: candidate ${candidate.id} is ${candidate.subjectId}/${candidate.fieldKey}, ` +
          `not ${context.subjectId}/${field.key}`,
      );
    }
    if (seen.has(candidate.id)) throw new Error(`derive received candidate ${candidate.id} twice`);
    seen.add(candidate.id);
  }
  const candidateEvents = new Map<string, CandidateEvent[]>();
  for (const event of events.candidate) {
    if (!seen.has(event.candidateId)) continue;
    const list = candidateEvents.get(event.candidateId);
    if (list === undefined) candidateEvents.set(event.candidateId, [event]);
    else list.push(event);
  }
  const fieldEvents = events.field.filter((event) => event.subjectId === context.subjectId && event.fieldKey === field.key);
  const documents = documentStatuses(events.document, context.document);
  const refusedEvents: RefusedEvent[] = [];
  // A document's withdrawal or erasure that does not hold removes nothing (2.3; rule 13); list the ones
  // that concern a document this field's candidates cite.
  const cited = new Set(candidates.flatMap((candidate) => candidate.evidence.map((evidence) => evidence.documentId)));
  for (const entry of documents.refused) {
    if (cited.has(entry.event.documentId)) refusedEvents.push({ kind: 'document', event: entry.event, refusal: entry.refusal });
  }
  const factKey = (candidate: Candidate): string | null => (isQuantityField(field) ? qualifierOf(candidate) : null);

  // --- Pass 1: each candidate's verification, refusal and withdrawal.
  const verification = new Map<string, Verification>();
  const refusal = new Map<string, RefusalReason | null>();
  const withdrawnIds = new Set<string>();
  const removedWithDocument = new Set<string>();
  for (const candidate of candidates) {
    const own = candidateEvents.get(candidate.id) ?? [];
    const checks = verificationOf(field, own);
    verification.set(candidate.id, checks.level);
    refusedEvents.push(...checks.refused);
    refusal.set(candidate.id, refusalOf(field, candidate, context));

    if (allEvidenceRemoved(candidate, documents)) {
      withdrawnIds.add(candidate.id);
      removedWithDocument.add(candidate.id);
    }
    for (const event of own.filter((entry) => entry.type === 'withdrawn')) {
      const why = withdrawalRefusal(event, candidate, checks.level, documents);
      if (why !== null) refusedEvents.push({ kind: 'candidate', event, refusal: why });
      else withdrawnIds.add(candidate.id);
    }
  }

  // --- Pass 2: rejections (rule 4) and supersession by the engine (2.4).
  const engineerChecks = field.confirmBy === 'engineer' || field.criticality === 'for_quotation';
  const ownerChoice = isOwnerChoice(field);
  /**
   * Rule 4 "A correction is a resolution": the same owner's value for the same fact (or with an unknown
   * qualifier, as a correction typed in another unit is), entered no earlier than the value it corrects.
   */
  const correctedBy = (event: CandidateEvent, rejected: Candidate): boolean =>
    candidates.some(
      (other) =>
        other.id !== rejected.id &&
        other.source === 'user' &&
        other.createdBy === event.by &&
        (factKey(other) === factKey(rejected) || factKey(other) === null) &&
        atOrBefore(rejected.createdAt, other.createdAt) &&
        refusal.get(other.id) === null &&
        !withdrawnIds.has(other.id),
    );
  const ownerRejected: Candidate[] = [];
  const ownerNotes: Candidate[] = [];
  const engineerRejected = new Set<string>();
  /** Rejections that hold unless they take a side of an open conflict their author may not resolve (rule 4; below). */
  const heldRejections: { readonly event: CandidateEvent; readonly candidate: Candidate; readonly role: 'owner' | 'sovitech_engineer' }[] = [];
  const rejectedIds = new Set<string>();
  const supersededIds = new Set<string>();
  for (const candidate of candidates) {
    const own = candidateEvents.get(candidate.id) ?? [];
    const level = verification.get(candidate.id) ?? 'unverified';
    for (const event of own) {
      if (event.type === 'rejected') {
        if (event.role === 'system') refusedEvents.push({ kind: 'candidate', event, refusal: 'rejected_by_system' });
        else if (!filled(event.by)) refusedEvents.push({ kind: 'candidate', event, refusal: 'by_missing' });
        else if (event.role === 'sovitech_engineer' && ownerChoice && candidate.source === 'user') {
          // Rule 3: the owner's choice is theirs; an engineer who questions it leaves a note, never a rejection.
          refusedEvents.push({ kind: 'candidate', event, refusal: 'engineer_overrules_owner_choice' });
        } else if (event.role === 'sovitech_engineer') {
          // Held until the open conflicts are known: rule 4 lets it take a side only of one the engineer may resolve.
          heldRejections.push({ event, candidate, role: 'sovitech_engineer' });
        } else if (level === 'engineer_verified') {
          refusedEvents.push({ kind: 'candidate', event, refusal: 'owner_overrules_engineer' });
        } else if (engineerChecks && !correctedBy(event, candidate)) {
          refusedEvents.push({ kind: 'candidate', event, refusal: 'owner_rejection_without_value' });
          ownerNotes.push(candidate);
        } else if (!correctedBy(event, candidate)) {
          // The owner's rejection with no value of their own: held like an engineer's. The owner's correction (their
          // own value) is rule 4's own resolution, "A correction is a resolution", and holds as it stands.
          heldRejections.push({ event, candidate, role: 'owner' });
        } else {
          ownerRejected.push(candidate);
          rejectedIds.add(candidate.id);
        }
      }
      if (event.type === 'superseded') {
        const why = supersessionRefusal(event, candidate);
        if (why !== null) refusedEvents.push({ kind: 'candidate', event, refusal: why });
        else supersededIds.add(candidate.id);
      }
    }
  }

  // --- Resolutions (rule 4): a person, a reason, the chosen candidate and the candidates it covered, by id.
  const resolutions: FieldEvent[] = [];
  for (const event of fieldEvents) {
    if (event.type !== 'conflict_resolved') continue;
    if (event.role === 'system') {
      refusedEvents.push({ kind: 'field', event, refusal: 'resolution_by_system' });
      continue;
    }
    const chosen = event.chosenCandidateId;
    const covered = event.coveredCandidateIds ?? [];
    if (chosen === undefined || !filled(event.reason) || !filled(event.by) || !covered.includes(chosen)) {
      refusedEvents.push({ kind: 'field', event, refusal: 'resolution_incomplete' });
      continue;
    }
    resolutions.push(event);
  }
  resolutions.sort(
    (a, b) =>
      olderFirst(a.at, b.at) ||
      (a.chosenCandidateId ?? '').localeCompare(b.chosenCandidateId ?? '') ||
      a.role.localeCompare(b.role) ||
      a.by.localeCompare(b.by) ||
      (a.reason ?? '').localeCompare(b.reason ?? '') ||
      [...(a.coveredCandidateIds ?? [])].sort().join(',').localeCompare([...(b.coveredCandidateIds ?? [])].sort().join(',')),
  );

  /**
   * The candidates' statuses, the facts and the open conflicts, given the candidates that rejections
   * which hold have rejected. Pure over its argument: it is run once without the engineer's rejections
   * held back in pass 2, to see which open conflicts they would take a side of, and once more with the
   * ones that hold (rule 4, "Only the right person's resolution closes a conflict").
   */
  const assess = (rejected: ReadonlySet<string>): Assessment => {
    const baseStatus = new Map<string, CandidateStatus>();
    for (const candidate of candidates) {
      let status: CandidateStatus = 'eligible';
      if (withdrawnIds.has(candidate.id)) status = 'withdrawn';
      else if (rejected.has(candidate.id)) status = 'rejected';
      else if (supersededIds.has(candidate.id)) status = 'superseded';
      else if (refusal.get(candidate.id) !== null) status = 'refused';
      baseStatus.set(candidate.id, status);
    }

    // --- Supersession by a declared revision (2.3): a newer revision's candidate for the same fact
    // supersedes the old one, unless a person checked the old one (then the two are compared).
    const status = new Map(baseStatus);
    for (const old of candidates) {
      if (baseStatus.get(old.id) !== 'eligible' || old.evidence.length === 0) continue;
      if (isChecked(verification.get(old.id) ?? 'unverified')) continue;
      const citedByNewer = (documentId: string): boolean => {
        const later = documents.successors(documentId);
        return candidates.some(
          (other) =>
            other.id !== old.id &&
            baseStatus.get(other.id) === 'eligible' &&
            factKey(other) === factKey(old) &&
            other.evidence.some((evidence) => later.has(evidence.documentId)),
        );
      };
      const live = old.evidence.filter((evidence) => !documents.removed(evidence.documentId));
      if (live.length > 0 && live.every((evidence) => citedByNewer(evidence.documentId))) status.set(old.id, 'superseded');
    }

    const eligible = candidates.filter((candidate) => status.get(candidate.id) === 'eligible').sort(byId);
    const tally: ResolutionTally = { applied: new Set(), notRouted: new Set() };

    // --- Facts, and values with an unknown qualifier (rule 4, "What is compared").
    const byQualifier = new Map<string | null, Candidate[]>();
    const unqualified: Candidate[] = [];
    for (const candidate of eligible) {
      const key = factKey(candidate);
      if (isQuantityField(field) && key === null) {
        unqualified.push(candidate);
        continue;
      }
      const list = byQualifier.get(key);
      if (list === undefined) byQualifier.set(key, [candidate]);
      else list.push(candidate);
    }
    const qualifiedFacts = [...byQualifier.entries()].map(([qualifier, members]) =>
      resolveFact(field, { qualifier, members, setAside: [], setAsideByOwner: [] }, resolutions, verification, tally),
    );

    // An unknown qualifier is compared with every qualified candidate of the same unit; with qualified
    // readings only in other units it matches none of them (rule 4: "never left unreconciled").
    const readingsToConfirm: ReadingToConfirm[] = [];
    const unqualifiedConflicts: DerivedConflict[] = [];
    const unqualifiedAlone: Candidate[] = [];
    const setAsideWith = new Map<string | null, { setAside: Candidate[]; byOwner: Candidate[] }>();
    for (const value of unqualified) {
      const qualified = qualifiedFacts.filter((fact) => fact.qualifier !== null && fact.members.length > 0);
      if (qualified.length === 0) {
        unqualifiedAlone.push(value);
        continue;
      }
      const unit = value.quantity?.unit;
      const sameUnit = qualified.filter((fact) => fact.members.every((member) => member.quantity?.unit === unit));
      let kind: ConflictKind;
      let compared: Candidate[];
      if (sameUnit.length === 0) {
        kind = 'unqualified_matches_none';
        compared = [value, ...qualified.flatMap((fact) => fact.members)];
      } else {
        const matched = sameUnit.filter(
          (fact) => disagreementOf(field, fact.members) === null && disagreementOf(field, [...fact.members, value]) === null,
        );
        const [only] = matched;
        if (matched.length === 1 && only !== undefined && only.qualifier !== null) {
          readingsToConfirm.push({ candidateId: value.id, qualifier: only.qualifier, matchedCandidateIds: ids(only.members) });
          continue;
        }
        kind = matched.length === 0 ? 'unqualified_matches_none' : 'unqualified_matches_several';
        compared = [value, ...sameUnit.flatMap((fact) => fact.members)];
      }
      const outcome = resolveUnqualified(field, value, compared, resolutions, verification, tally);
      if (outcome.kind === 'alone') {
        unqualifiedAlone.push(value);
      } else if (outcome.kind === 'set_aside') {
        const chosenKey = factKey(outcome.chosen);
        const entry = setAsideWith.get(chosenKey) ?? { setAside: [], byOwner: [] };
        entry.setAside.push(value);
        if (outcome.byOwner) entry.byOwner.push(value);
        setAsideWith.set(chosenKey, entry);
      } else {
        unqualifiedConflicts.push({
          kind,
          qualifier: null,
          candidateIds: ids(compared),
          routedTo: routeOf(field, compared, verification),
          proposedCandidateId: null,
        });
      }
    }
    const workingFacts: WorkingFact[] = qualifiedFacts.map((fact) => {
      const extra = setAsideWith.get(fact.qualifier);
      return extra === undefined
        ? fact
        : { ...fact, setAside: [...fact.setAside, ...extra.setAside], setAsideByOwner: [...fact.setAsideByOwner, ...extra.byOwner] };
    });
    if (unqualifiedAlone.length > 0) {
      workingFacts.push(
        resolveFact(field, { qualifier: null, members: unqualifiedAlone, setAside: [], setAsideByOwner: [] }, resolutions, verification, tally),
      );
    }

    // --- Each fact: conflict, an ambiguous reading, or an active candidate; provisional, stale.
    const facts: FactState[] = workingFacts
      .map((fact): FactState => {
        const kind = disagreementOf(field, fact.members);
        const common = { qualifier: fact.qualifier, candidateIds: ids(fact.members), setAsideIds: ids(fact.setAside) };
        if (kind !== null) {
          const conflict: DerivedConflict = {
            kind,
            qualifier: fact.qualifier,
            candidateIds: ids(fact.members),
            routedTo: routeOf(field, fact.members, verification),
            proposedCandidateId: kind === 'values_differ' ? stageProposal(field, fact.members, context, documents, verification) : null,
          };
          return { ...common, state: 'conflict', activeCandidateId: null, ambiguous: false, conflict, provisional: true, stale: false };
        }
        const [lone] = fact.members;
        if (fact.members.length === 1 && lone !== undefined && isAmbiguousReading(field, lone)) {
          return { ...common, state: 'known', activeCandidateId: null, ambiguous: true, conflict: null, provisional: true, stale: false };
        }
        const active = [...fact.members].sort(activeOrder(verification))[0];
        if (active === undefined) throw new Error('a fact always holds a candidate');
        const flags = provisionalAndStale(active, verification.get(active.id) ?? 'unverified', context);
        return { ...common, state: 'known', activeCandidateId: active.id, ambiguous: false, conflict: null, ...flags };
      })
      .sort((a, b) => (a.qualifier ?? '').localeCompare(b.qualifier ?? ''));

    const conflicts = [...facts.flatMap((fact) => (fact.conflict === null ? [] : [fact.conflict])), ...unqualifiedConflicts];
    return { status, eligible, workingFacts, facts, conflicts, readingsToConfirm, tally };
  };

  // --- A rejection by an engineer, or by the owner with no value of their own (rule 4, "Routing": "Conflicts on
  // owner fields go to the owner", a conflict with an engineer_verified candidate goes to the engineer queue, and
  // "Only the right person's resolution closes a conflict"): one that takes a side of an open conflict its author may
  // not resolve holds no more than the same person's `conflict_resolved` would (`mayResolve`); it is listed, and the
  // conflict stays with the person it is routed to. Outside any open conflict it holds as before.
  let assessment = assess(rejectedIds);
  if (heldRejections.length > 0) {
    const before = assessment;
    let applied = 0;
    for (const held of heldRejections) {
      const sides = before.conflicts.filter((conflict) => conflict.candidateIds.includes(held.candidate.id));
      if (sides.some((conflict) => !mayResolve(field, conflict.routedTo, held.role))) {
        refusedEvents.push({ kind: 'candidate', event: held.event, refusal: 'resolver_not_routed' });
        continue;
      }
      applied += 1;
      rejectedIds.add(held.candidate.id);
      if (held.role === 'sovitech_engineer') engineerRejected.add(held.candidate.id);
      else ownerRejected.push(held.candidate);
    }
    if (applied > 0) assessment = assess(rejectedIds);
  }
  const { status, eligible, workingFacts, facts, conflicts, tally } = assessment;
  const readingsToConfirm = [...assessment.readingsToConfirm];

  for (const resolution of tally.notRouted) {
    if (!tally.applied.has(resolution)) refusedEvents.push({ kind: 'field', event: resolution, refusal: 'resolver_not_routed' });
  }

  // --- Skips and analysis runs count only from the person or process 2.4 names: a skip is the
  // owner's (rule 7, "Skip means skip"), and analysis is recorded by code (rule 12).
  const countedFieldEvents: FieldEvent[] = [];
  for (const event of fieldEvents) {
    if (event.type === 'skipped') {
      if (event.role !== 'owner') refusedEvents.push({ kind: 'field', event, refusal: 'skip_not_owner' });
      else if (!filled(event.by)) refusedEvents.push({ kind: 'field', event, refusal: 'by_missing' });
      else countedFieldEvents.push(event);
    }
    if (event.type === 'analysis_started' || event.type === 'analysis_finished') {
      if (event.role !== 'system') refusedEvents.push({ kind: 'field', event, refusal: 'analysis_not_system' });
      else if (!filled(event.by)) refusedEvents.push({ kind: 'field', event, refusal: 'by_missing' });
      else countedFieldEvents.push(event);
    }
  }
  const started = countedFieldEvents.filter((event) => event.type === 'analysis_started').length;
  const finished = countedFieldEvents.filter((event) => event.type === 'analysis_finished').length;
  const skipped = countedFieldEvents.some((event) => event.type === 'skipped');

  // --- The state, by 2.4's precedence.
  const notApplicable = notApplicableBasis(field, fieldEvents, context);
  let state: FieldStateName;
  if (conflicts.length > 0) state = 'conflict';
  else if (facts.length > 0 || readingsToConfirm.length > 0) state = 'known';
  else if (started > finished) state = 'pending';
  else if (notApplicable !== null) state = 'not_applicable';
  else if (skipped) state = 'skipped';
  else state = 'unknown';

  const [onlyFact] = facts;
  const activeCandidateId = state === 'known' && facts.length === 1 && onlyFact !== undefined ? onlyFact.activeCandidateId : null;
  const provisional = state === 'conflict' || (state === 'known' && facts.some((fact) => fact.provisional));
  const stale = facts.some((fact) => fact.stale);

  // --- Status lines (2.8) and the review-step entry.
  const statusLines: FieldStatusLine[] = [];
  if (stale) statusLines.push('out_of_date_recalculating');
  const shownIds = new Set(
    facts.flatMap((fact) => (fact.activeCandidateId !== null ? [fact.activeCandidateId] : fact.ambiguous ? fact.candidateIds : [])),
  );
  const shownCandidates = candidates.filter((candidate) => shownIds.has(candidate.id));
  const onlyFromSuperseded = shownCandidates.some(
    (candidate) =>
      candidate.evidence.length > 0 &&
      candidate.evidence.every((evidence) => documents.status(evidence.documentId) === 'superseded'),
  );
  if (onlyFromSuperseded) statusLines.push('from_superseded_revision');
  const sourceRemoved = eligible.length === 0 && candidates.some((candidate) => removedWithDocument.has(candidate.id));
  if (sourceRemoved) statusLines.push('source_document_removed');

  const merged = mergedConflict(conflicts);
  const overruledByOwner = [...ownerRejected, ...workingFacts.flatMap((fact) => fact.setAsideByOwner)];
  const review = reviewItem(field, state, conflicts, sourceRemoved, overruledByOwner, ownerNotes, engineerRejected, shownCandidates, verification);

  return {
    subjectId: context.subjectId,
    fieldKey: field.key,
    state,
    activeCandidateId,
    candidates: [...candidates].sort(byId).map((candidate) => ({
      candidateId: candidate.id,
      verification: verification.get(candidate.id) ?? 'unverified',
      status: status.get(candidate.id) ?? 'eligible',
      refusal: status.get(candidate.id) === 'refused' ? (refusal.get(candidate.id) ?? null) : null,
    })),
    facts,
    conflicts,
    conflict: merged,
    readingsToConfirm: readingsToConfirm.sort((a, b) => a.candidateId.localeCompare(b.candidateId)),
    provisional,
    stale,
    statusLines,
    review,
    notApplicable: state === 'not_applicable' ? notApplicable : null,
    refusedEvents: refusedEvents
      .map((entry) => ({ entry, key: refusedKey(entry) }))
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(({ entry }) => entry),
  };
};

/** The field's conflicts as one (see {@link FieldState.conflict}). */
function mergedConflict(conflicts: readonly DerivedConflict[]): DerivedConflict | null {
  const [first] = conflicts;
  if (first === undefined) return null;
  if (conflicts.length === 1) return first;
  return {
    kind: first.kind,
    qualifier: null,
    candidateIds: [...new Set(conflicts.flatMap((conflict) => conflict.candidateIds))].sort(),
    routedTo: conflicts.some((conflict) => conflict.routedTo === 'engineer') ? 'engineer' : 'owner',
    proposedCandidateId: null,
  };
}

/** 2.4 "not_applicable": a named owner or engineer with a reason, or a registry condition on known fields. Never absence. */
function notApplicableBasis(
  field: FieldDefinition,
  fieldEvents: readonly FieldEvent[],
  context: DeriveContext,
): NotApplicableBasis | null {
  const marked = fieldEvents
    .filter((event) => event.type === 'marked_not_applicable' && event.role !== 'system' && filled(event.by) && filled(event.reason))
    .sort(
      (a, b) =>
        newerFirst(a.at, b.at) ||
        a.by.localeCompare(b.by) ||
        a.role.localeCompare(b.role) ||
        (a.reason ?? '').localeCompare(b.reason ?? ''),
    )[0];
  if (marked !== undefined && marked.role !== 'system' && marked.reason !== undefined) {
    return { kind: 'event', by: marked.by, role: marked.role, reason: marked.reason, at: marked.at };
  }
  const condition = context.notApplicableCondition?.(field);
  if (
    condition !== undefined &&
    filled(condition.conditionId) &&
    condition.basedOn.length > 0 &&
    condition.basedOn.every(
      (basis) => basis.fieldKey !== field.key && basis.state === 'known' && basis.conflict === null && basis.facts.length > 0,
    )
  ) {
    return { kind: 'registry_condition', conditionId: condition.conditionId };
  }
  return null;
}

/** The review-step entry the state decides (see {@link ReviewItem}). An owner conflict comes first. */
function reviewItem(
  field: FieldDefinition,
  state: FieldStateName,
  conflicts: readonly DerivedConflict[],
  sourceRemoved: boolean,
  overruledByOwner: readonly Candidate[],
  ownerNotes: readonly Candidate[],
  engineerRejected: ReadonlySet<string>,
  shownCandidates: readonly Candidate[],
  verification: ReadonlyMap<string, Verification>,
): ReviewItem | null {
  if (conflicts.length > 0) {
    const forOwner = conflicts.some((conflict) => conflict.routedTo === 'owner');
    return { list: forOwner ? 'for_you' : 'sovitech_will_check', reason: 'conflict' };
  }
  if (sourceRemoved && state !== 'not_applicable') return { list: 'for_you', reason: 'source_document_removed' };
  // Rule 4: on an engineer or for_quotation field, the document value the owner rejected (or set aside by resolving a
  // conflict) also goes to the engineer queue, until the field's value carries an engineer_verified event or an engineer
  // rejected that value too. Rule 3: an owner's rejection with no value of their own is the owner's note on the value,
  // which stays eligible and goes to the engineer queue until an engineer verifies or rejects it.
  const engineerChecks = field.confirmBy === 'engineer' || field.criticality === 'for_quotation';
  const engineerChecked = shownCandidates.some((candidate) => verification.get(candidate.id) === 'engineer_verified');
  const waiting = overruledByOwner.some(
    (candidate) =>
      (candidate.source === 'document' || candidate.source === 'ai_inference') && !engineerRejected.has(candidate.id),
  );
  const noted = ownerNotes.some(
    (candidate) => verification.get(candidate.id) !== 'engineer_verified' && !engineerRejected.has(candidate.id),
  );
  if (engineerChecks && ((waiting && !engineerChecked) || noted)) return { list: 'sovitech_will_check', reason: 'owner_correction' };
  return null;
}
