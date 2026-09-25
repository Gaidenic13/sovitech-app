/**
 * The change notice of a declared revision (docs/guardrails.md 2.3, "Changes are
 * announced": one notice on the review step listing the changed values, "Rev B
 * changed 3 values"; F-VALUE-07). Pure: it reads derived field states, never
 * stored ones. The wording is the status-line registry's; this returns the
 * changes it counts, each with the candidates behind it.
 */
import { documentStatuses } from './documents';
import type { FieldState } from './field-state';
import type { Candidate, DocumentEvent, DocumentRecord } from './model';

/** One value a declared revision changed. */
export interface RevisionChange {
  readonly subjectId: string;
  readonly fieldKey: string;
  /** The earlier revision's candidate. */
  readonly fromCandidateId: string;
  /** The declared revision's candidate. */
  readonly toCandidateId: string;
  /**
   * `superseded`: the earlier value is superseded, the new one stands (2.3).
   * `conflict`: a person checked the earlier value, so the new one puts the field
   * in conflict instead (2.3, "Checked values are never overridden silently").
   */
  readonly outcome: 'superseded' | 'conflict';
}

/** The one notice of a declared revision. */
export interface RevisionNotice {
  readonly revisionDocumentId: string;
  readonly changes: readonly RevisionChange[];
}

/** Whether two candidates hold the same value: the same quantity, key or text. */
function sameValue(a: Candidate, b: Candidate): boolean {
  if (a.quantity !== undefined || b.quantity !== undefined) {
    return (
      a.quantity?.value === b.quantity?.value &&
      a.quantity?.unit === b.quantity?.unit &&
      a.quantity?.qualifier === b.quantity?.qualifier
    );
  }
  return a.choice === b.choice && a.text === b.text;
}

/**
 * The values a declared revision changed, over the derived fields given (pass
 * each field's state with its candidates, and the project's document events).
 * A value counts when a candidate citing the revision differs from a candidate
 * of the same field that cites only a document the revision supersedes, and the
 * earlier one is either superseded now or in conflict with the new one.
 */
export function revisionNotice(
  revision: DocumentRecord,
  fields: readonly { readonly state: FieldState; readonly candidates: readonly Candidate[] }[],
  documentEvents: readonly DocumentEvent[],
  record: (documentId: string) => DocumentRecord | undefined,
): RevisionNotice {
  const documents = documentStatuses(documentEvents, record);
  const changes: RevisionChange[] = [];
  for (const { state, candidates } of fields) {
    const statusOf = (id: string) => state.candidates.find((candidate) => candidate.candidateId === id)?.status;
    const inConflict = new Set(state.conflicts.flatMap((conflict) => conflict.candidateIds));
    const citesRevision = (candidate: Candidate): boolean =>
      candidate.evidence.some((evidence) => evidence.documentId === revision.id);
    const onlyEarlier = (candidate: Candidate): boolean =>
      candidate.evidence.length > 0 &&
      candidate.evidence.every((evidence) => documents.successors(evidence.documentId).has(revision.id));
    for (const later of candidates.filter((candidate) => citesRevision(candidate) && statusOf(candidate.id) === 'eligible')) {
      for (const earlier of candidates.filter(onlyEarlier)) {
        if (earlier.quantity?.qualifier !== later.quantity?.qualifier || sameValue(earlier, later)) continue;
        const outcome =
          statusOf(earlier.id) === 'superseded'
            ? 'superseded'
            : inConflict.has(earlier.id) && inConflict.has(later.id)
              ? 'conflict'
              : null;
        if (outcome === null) continue;
        changes.push({
          subjectId: state.subjectId,
          fieldKey: state.fieldKey,
          fromCandidateId: earlier.id,
          toCandidateId: later.id,
          outcome,
        });
      }
    }
  }
  return {
    revisionDocumentId: revision.id,
    changes: changes.sort(
      (a, b) =>
        a.subjectId.localeCompare(b.subjectId) ||
        a.fieldKey.localeCompare(b.fieldKey) ||
        a.fromCandidateId.localeCompare(b.fromCandidateId) ||
        a.toCandidateId.localeCompare(b.toCandidateId),
    ),
  };
}
