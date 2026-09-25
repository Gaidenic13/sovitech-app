/**
 * The evidence verifier (docs/guardrails.md rule 1 "Enforced by"; 2.1; F-EXTRACT-04,
 * with the source and inference limits of F-EXTRACT-05). One verifier serves the
 * extractor and the AI (prompt 3 section 6). Phase 0 declares it; phase 2 builds it
 * (the ownership check, G13-1, is a phase 1 case).
 */
import type {
  Candidate,
  Confidence,
  DocumentRecord,
  Evidence,
  EvidenceLocator,
  FieldDefinition,
  GuardrailEvent,
  OriginalText,
  ProposedSource,
  Quantity,
  UnitCode,
} from './model';
import { declareNotImplemented } from './not-implemented';

/** Rule 1's five checks, in its order. */
export const EVIDENCE_CHECKS = [
  /** The document belongs to this project. */
  'document_in_project',
  /** The content hash matches. */
  'content_hash_matches',
  /** The locator exists. */
  'locator_exists',
  /** The excerpt occurs at that location, after normalising whitespace and diacritics. */
  'excerpt_at_locator',
  /** For `document`, the value parses from the excerpt itself. */
  'value_in_excerpt',
] as const;
export type EvidenceCheckName = (typeof EVIDENCE_CHECKS)[number];

/** Evidence as proposed: 2.4 `Evidence` before code sets `check`. */
export type ProposedEvidence = Omit<Evidence, 'check'>;

/**
 * A candidate as the extractor or the AI proposes it, before verification. Its
 * source is a claim: code decides between `document` and `ai_inference` (2.1).
 */
export interface CandidateProposal {
  readonly subjectId: string;
  readonly fieldKey: string;
  readonly quantity?: Quantity;
  readonly choice?: string;
  readonly text?: string;
  readonly alternatives?: readonly Quantity[];
  readonly source: ProposedSource;
  readonly evidence: readonly ProposedEvidence[];
  readonly original?: OriginalText;
  readonly confidence?: Confidence;
}

/** Text found at a locator of one stored revision: the native text layer, or OCR. */
export interface LocatedText {
  readonly text: string;
  readonly layer: 'text' | 'ocr';
}

/** One reading of a quantity written in a text, from the rule 8 parser; an ambiguous number gives two. */
export interface QuantityReading {
  readonly value: number;
  readonly unit: UnitCode | null;
}

/** What the verifier reads. Every lookup is read-only. */
export interface ProposalContext {
  /** The project the proposal is for. */
  readonly projectId: string;
  readonly field: FieldDefinition;
  /** Any stored document by id. It may return another project's record: check 1 is the verifier's. */
  readonly document: (documentId: string) => DocumentRecord | undefined;
  /** Extracted text at a locator of one revision; undefined when that locator does not exist in it. */
  readonly textAt: (documentId: string, contentHash: string, locator: EvidenceLocator) => LocatedText | undefined;
  /** The rule 8 number and notation parser (@sovitech/registry), injected. */
  readonly readQuantities: (text: string) => readonly QuantityReading[];
  /** Id and creation stamp for the candidate, when one is accepted (UUIDv7 and time come from app code). */
  readonly candidateId: string;
  readonly createdBy: string;
  readonly createdAt: string;
}

/** Why a proposal was rejected. */
export type ProposalRejection =
  | { readonly kind: 'no_evidence' }
  | { readonly kind: 'evidence_check_failed'; readonly check: EvidenceCheckName; readonly evidenceIndex: number }
  /** Rule 1: an `ai_inference` quantity other than a direct count. */
  | { readonly kind: 'inferred_quantity_not_direct_count' };

/**
 * The verifier's answer. An accepted proposal becomes a candidate whose source and
 * confidence code decided; a rejected one becomes nothing but its guardrail events
 * (rule 1 "Failures are rejected", section 8).
 */
export type ProposalVerdict =
  | {
      readonly outcome: 'accepted';
      readonly candidate: Candidate;
      readonly guardrailEvents: readonly GuardrailEvent[];
    }
  | {
      readonly outcome: 'rejected';
      readonly rejection: ProposalRejection;
      readonly guardrailEvents: readonly GuardrailEvent[];
    };

/** Verifies a proposal's evidence with rule 1's five checks and decides its source. Pure. */
export type VerifyProposal = (proposal: CandidateProposal, context: ProposalContext) => ProposalVerdict;

/** The one thrower of verifyProposal's NotImplementedError (declared once, when the package loads). */
const verifyProposalNotImplemented = declareNotImplemented('verify-proposal');

/** The evidence entries of a proposal that name a document; a malformed entry is left to the shape check (phase 2). */
function evidenceEntries(proposal: CandidateProposal | undefined): readonly { readonly index: number; readonly documentId: string }[] {
  const evidence: unknown = proposal?.evidence;
  if (!Array.isArray(evidence)) return [];
  return evidence.flatMap((entry: unknown, index) =>
    typeof entry === 'object' && entry !== null && 'documentId' in entry && typeof entry.documentId === 'string'
      ? [{ index, documentId: entry.documentId }]
      : [],
  );
}

/**
 * Phase 1 builds check 1 (the document belongs to this project; rule 13 "Enforced
 * by"; G13-1): any evidence entry whose document is unknown or belongs to another
 * project rejects the proposal, logged as `evidence_not_found` in the project where
 * it was attempted, with a code and never document text. Everything else, the
 * other four checks, the proposal's shape (a strict runtime schema, G1-13) and the
 * source and inference limits, is phase 2 and still throws NotImplementedError.
 */
export const verifyProposal: VerifyProposal = (proposal, context) => {
  for (const entry of evidenceEntries(proposal)) {
    const record = context.document(entry.documentId);
    if (record === undefined || record.projectId !== context.projectId) {
      return {
        outcome: 'rejected',
        rejection: { kind: 'evidence_check_failed', check: 'document_in_project', evidenceIndex: entry.index },
        guardrailEvents: [
          {
            type: 'evidence_not_found',
            projectId: context.projectId,
            subjectId: proposal.subjectId,
            fieldKey: proposal.fieldKey,
            reason: 'document_in_project',
          },
        ],
      };
    }
  }
  return verifyProposalNotImplemented();
};
