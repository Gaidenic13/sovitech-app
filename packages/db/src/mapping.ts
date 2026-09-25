/**
 * Rows to the domain's types (guardrails section 2) and back. Every optional
 * property of a domain type is left out when its column is null, never filled
 * with a stand-in (rule 1).
 */
import type { Selectable } from 'kysely';
import type {
  Candidate,
  CandidateEvent,
  DocumentEvent,
  DocumentRecord,
  Evidence,
  EvidenceLocator,
  FieldEvent,
  Quantity,
} from '@sovitech/domain';
import type {
  CandidateEventsTable,
  CandidatesTable,
  DocumentAnalysisEventsTable,
  DocumentEventsTable,
  DocumentsTable,
  EvidenceExcerptsTable,
  EvidenceLocatorsTable,
  FieldEventsTable,
  StoredQuantity,
} from './schema';

type CandidateRow = Selectable<CandidatesTable>;
type LocatorRow = Selectable<EvidenceLocatorsTable>;
type ExcerptRow = Pick<Selectable<EvidenceExcerptsTable>, 'evidence_id' | 'text'>;

function present<K extends string, V>(key: K, value: V | null | undefined): { [P in K]?: V } {
  return (value === null || value === undefined ? {} : { [key]: value }) as { [P in K]?: V };
}

function quantityOf(stored: unknown): Quantity {
  if (typeof stored !== 'object' || stored === null) throw new Error('an alternative reading is not an object');
  const { value, unit, qualifier, approximate } = stored as Partial<Record<keyof StoredQuantity, unknown>>;
  if (typeof value !== 'number' || !Number.isFinite(value) || typeof unit !== 'string') {
    throw new Error('an alternative reading lacks a finite value or a unit');
  }
  return {
    value,
    unit,
    ...present('qualifier', typeof qualifier === 'string' ? qualifier : undefined),
    ...present('approximate', typeof approximate === 'boolean' ? approximate : undefined),
  };
}

/** A domain quantity as stored in `candidates.alternatives`. */
export function storedQuantityOf(quantity: Quantity): StoredQuantity {
  return {
    value: quantity.value,
    unit: quantity.unit,
    ...present('qualifier', quantity.qualifier),
    ...present('approximate', quantity.approximate),
  };
}

export function locatorOf(row: LocatorRow): EvidenceLocator {
  const bbox = row.bbox;
  const [x0, y0, x1, y1] = bbox ?? [];
  return {
    ...present('page', row.page),
    ...present('sheet', row.sheet),
    ...present('cell', row.cell),
    ...(x0 === undefined || y0 === undefined || x1 === undefined || y1 === undefined ? {} : { bbox: [x0, y0, x1, y1] as const }),
  };
}

export function evidenceOf(locator: LocatorRow, excerpt: ExcerptRow | undefined): Evidence {
  if (excerpt === undefined) throw new Error(`evidence ${locator.id} has no excerpt row`);
  return {
    documentId: locator.document_id,
    contentHash: locator.content_hash,
    locator: locatorOf(locator),
    excerpt: excerpt.text,
    check: locator.evidence_check,
  };
}

export function candidateOf(row: CandidateRow, evidence: readonly Evidence[]): Candidate {
  const quantity =
    row.quantity_value === null || row.quantity_unit === null
      ? undefined
      : {
          value: row.quantity_value,
          unit: row.quantity_unit,
          ...present('qualifier', row.quantity_qualifier),
          ...present('approximate', row.quantity_approximate),
        };
  const method =
    row.method_formula_id === null ||
    row.method_formula_version === null ||
    row.method_input_candidate_ids === null ||
    row.method_unknown_policy === null ||
    row.method_assumptions === null
      ? undefined
      : {
          formulaId: row.method_formula_id,
          formulaVersion: row.method_formula_version,
          inputCandidateIds: row.method_input_candidate_ids,
          unknownPolicy: row.method_unknown_policy,
          assumptions: row.method_assumptions,
        };
  const reference =
    row.reference_dataset === null || row.reference_version === null || row.reference_key === null
      ? undefined
      : { dataset: row.reference_dataset, version: row.reference_version, key: row.reference_key };
  const range = row.range_low === null || row.range_high === null ? undefined : { low: row.range_low, high: row.range_high };
  return {
    id: row.id,
    subjectId: row.subject_id,
    fieldKey: row.field_key,
    ...present('quantity', quantity),
    ...present('choice', row.choice),
    ...present('text', row.text_value),
    ...present('alternatives', row.alternatives === null ? undefined : row.alternatives.map(quantityOf)),
    source: row.source,
    evidence,
    ...present(
      'original',
      row.original_text === null ? undefined : { text: row.original_text, ...present('locale', row.original_locale) },
    ),
    ...present('method', method),
    ...present('reference', reference),
    ...present('range', range),
    ...present('confidence', row.confidence),
    createdBy: row.created_by,
    authorRole: row.author_role,
    createdAt: row.created_at,
  };
}

export function candidateEventOf(row: Selectable<CandidateEventsTable>): CandidateEvent {
  return {
    candidateId: row.candidate_id,
    type: row.type,
    by: row.actor,
    role: row.role,
    at: row.at,
    ...present('reason', row.reason),
    ...present('bulkId', row.bulk_id),
  };
}

/** A field event; a resolution carries the exact candidates it covered (0003: `covered_candidate_ids`; rule 4). */
export function fieldEventOf(row: Selectable<FieldEventsTable>): FieldEvent {
  return {
    subjectId: row.subject_id,
    fieldKey: row.field_key,
    type: row.type,
    by: row.actor,
    role: row.role,
    at: row.at,
    ...present('reason', row.reason),
    ...present('chosenCandidateId', row.chosen_candidate_id),
    ...present('coveredCandidateIds', row.covered_candidate_ids),
  };
}

export function documentEventOf(row: Selectable<DocumentEventsTable>): DocumentEvent {
  return {
    id: row.id,
    documentId: row.document_id,
    type: row.type,
    by: row.actor,
    role: row.role,
    at: row.at,
    ...present('revisionOf', row.revision_of_document_id),
    ...present('reason', row.reason),
    ...present('requestEventId', row.request_event_id),
  };
}

/**
 * 2.3 DocumentRecord from its row, its latest analysis event and its document
 * events. `supersedes` is the target of the latest revision the owner or an
 * engineer declared on it; without one, the revision code proposed at
 * registration (which supersedes nothing until someone declares it: the
 * domain's documentStatuses needs the declaration).
 */
export function documentRecordOf(
  row: Selectable<DocumentsTable>,
  analysis: Pick<Selectable<DocumentAnalysisEventsTable>, 'status' | 'coverage'>,
  events: readonly Selectable<DocumentEventsTable>[],
): DocumentRecord {
  const declared = events
    .filter(
      (event) =>
        event.document_id === row.id &&
        event.type === 'declared_revision_of' &&
        event.role !== 'system' &&
        event.revision_of_document_id !== null,
    )
    .sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id))
    .at(-1);
  const supersedes = declared?.revision_of_document_id ?? row.supersedes_proposed;
  return {
    id: row.id,
    projectId: row.project_id,
    contentHash: row.content_hash,
    kind: row.kind,
    stage: row.stage,
    ...present('revision', row.revision),
    ...present('issueDate', row.issue_date),
    ...present('supersedes', supersedes),
    analysis: { status: analysis.status, coverage: analysis.coverage },
  };
}
