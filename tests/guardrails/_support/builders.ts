/**
 * In-memory TEST builders for the guardrail cases of the value model (derive, the
 * conflict test, owner corrections, asset identity; docs/guardrails.md section 2).
 *
 * Every record here is visibly synthetic: ids start with "test-", labels with
 * "TEST". Nothing is written anywhere. Registry values a case needs (a tolerance,
 * `confirmBy`, the stage order) are built by the case itself as a TEST registry
 * entry; nothing here is production registry data.
 *
 * This is the one file in tests/ that builds `engineer_verified` events, in memory
 * only, for derive tests (prompt 3 section 14 item 3: it is the grep's allowlisted
 * builder). Database tests verify through the review endpoint instead.
 */
import { unitByCode } from '@sovitech/registry';
import {
  NO_EVENTS,
  documentStatuses,
  type Candidate,
  type CandidateEvent,
  type DeriveContext,
  type DeriveEvents,
  type DocumentEvent,
  type DocumentRecord,
  type DocumentStage,
  type DocumentStatuses,
  type FieldDefinition,
  type FieldEvent,
  type FieldState,
  type Quantity,
} from '@sovitech/domain';

/**
 * Rule 4's document-stage order ("Documents that disagree"), as a TEST registry
 * setting written from the rule's own list. In the app the registry carries it as
 * approver setting 4 (proposed; the approver confirms it).
 */
export const TEST_STAGE_ORDER: readonly (readonly DocumentStage[])[] = [
  ['site_survey', 'as_built', 'nameplate_photo'],
  ['shop_drawing'],
  ['execution'],
  ['tender'],
  ['technical_design'],
  ['permit'],
  ['feasibility'],
  ['unknown'],
];

/** A time on the TEST day, 2026-09-25, `minute` minutes after 09:00 UTC. */
export function testTime(minute: number): string {
  return new Date(Date.UTC(2026, 8, 25, 9, minute)).toISOString();
}

/** A TEST field registry entry: the defaults are the strict ones (no tolerance, estimation forbidden). */
export function testField(
  key: string,
  entry: Pick<FieldDefinition, 'kind' | 'subject'> & Partial<Omit<FieldDefinition, 'key'>>,
): FieldDefinition {
  return {
    label: `TEST ${key}`,
    estimation: 'forbidden',
    criticality: 'optional',
    affects: [],
    impactRank: 1,
    confirmBy: 'owner',
    ...entry,
    key,
  };
}

/** A TEST document record, analysed in full. */
export function testDocument(
  id: string,
  projectId: string,
  stage: DocumentStage,
  extra: Partial<Pick<DocumentRecord, 'kind' | 'revision' | 'issueDate' | 'supersedes'>> = {},
): DocumentRecord {
  return {
    id,
    projectId,
    contentHash: `sha256:${id}`,
    kind: 'architectural',
    stage,
    analysis: { status: 'analysed', coverage: 'TEST full coverage' },
    ...extra,
  };
}

/** The value a candidate carries: a quantity, or an enum or decision key. */
export type TestValue = { readonly quantity: Quantity } | { readonly choice: string };

/** A candidate read from a document, its evidence on one page with the check code set (source `document` unless named). */
export function documentReading(input: {
  readonly id: string;
  readonly subjectId: string;
  readonly field: FieldDefinition;
  readonly document: DocumentRecord;
  readonly value: TestValue;
  readonly minute: number;
  readonly page?: number;
  readonly source?: 'document' | 'ai_inference';
  readonly confidence?: Candidate['confidence'];
}): Candidate {
  const shown = 'quantity' in input.value ? `${String(input.value.quantity.value)} ${input.value.quantity.unit}` : input.value.choice;
  return {
    id: input.id,
    subjectId: input.subjectId,
    fieldKey: input.field.key,
    ...input.value,
    source: input.source ?? 'document',
    evidence: [
      {
        documentId: input.document.id,
        contentHash: input.document.contentHash,
        locator: { page: input.page ?? 1 },
        excerpt: `TEST ${shown}`,
        check: 'text_match',
      },
    ],
    ...(input.confidence === undefined ? {} : { confidence: input.confidence }),
    createdBy: 'test-extractor',
    authorRole: 'system',
    createdAt: testTime(input.minute),
  };
}

/** The owner's own answer (source `user`, written by the owner acting as the owner). */
export function ownerAnswer(input: {
  readonly id: string;
  readonly subjectId: string;
  readonly field: FieldDefinition;
  readonly value: TestValue;
  readonly minute: number;
}): Candidate {
  return {
    id: input.id,
    subjectId: input.subjectId,
    fieldKey: input.field.key,
    ...input.value,
    source: 'user',
    evidence: [],
    createdBy: 'test-owner',
    authorRole: 'owner',
    createdAt: testTime(input.minute),
  };
}

/**
 * An engineer's own entry (source `user`, written by a person acting as
 * `sovitech_engineer`): on an engineer field, a site survey entry (2.1).
 */
export function engineerEntry(input: {
  readonly id: string;
  readonly subjectId: string;
  readonly field: FieldDefinition;
  readonly value: TestValue;
  readonly minute: number;
}): Candidate {
  return {
    id: input.id,
    subjectId: input.subjectId,
    fieldKey: input.field.key,
    ...input.value,
    source: 'user',
    evidence: [],
    createdBy: 'test-engineer',
    authorRole: 'sovitech_engineer',
    createdAt: testTime(input.minute),
  };
}

/** 2.1: the owner's own entry on an owner or either field gets a user_confirmed event when it is created. */
export function ownerConfirmation(candidate: Candidate): CandidateEvent {
  return { candidateId: candidate.id, type: 'user_confirmed', by: 'test-owner', role: 'owner', at: candidate.createdAt };
}

/**
 * An engineer's verification of a candidate, in memory, for a derive test only.
 * Nothing writes it anywhere (rule 10; prompt 3 section 14 item 3).
 */
export function engineerVerificationInMemory(candidateId: string, minute: number): CandidateEvent {
  return { candidateId, type: 'engineer_verified', by: 'test-engineer', role: 'sovitech_engineer', at: testTime(minute) };
}

/** A declared revision (2.3): a `declared_revision_of` event on the newer record, by the owner, naming the record it revises. */
export function declaredRevision(revision: DocumentRecord, minute: number): DocumentEvent {
  return {
    documentId: revision.id,
    type: 'declared_revision_of',
    by: 'test-owner',
    role: 'owner',
    at: testTime(minute),
    ...(revision.supersedes === undefined ? {} : { revisionOf: revision.supersedes }),
  };
}

/** Derive events from parts; the rest empty. */
export function testEvents(parts: {
  readonly candidate?: readonly CandidateEvent[];
  readonly field?: readonly FieldEvent[];
  readonly document?: readonly DocumentEvent[];
}): DeriveEvents {
  return {
    candidate: parts.candidate ?? NO_EVENTS.candidate,
    field: parts.field ?? NO_EVENTS.field,
    document: parts.document ?? NO_EVENTS.document,
  };
}

/**
 * `DeriveContext.formulaDeclared` inside the test runner: every TEST formula a case
 * names ('TEST-…') is declared at version 1.0.0, and nothing else is (prompt 3 5.4:
 * TEST formulas load inside the test runner only; the app's lookup never declares one).
 */
export function testFormulaDeclared(formulaId: string, formulaVersion: string): boolean {
  return formulaId.startsWith('TEST-') && formulaVersion === '1.0.0';
}

/**
 * A derive context over a list of TEST documents, with the closed unit registry
 * of @sovitech/registry (2.7). Input states are those given; no dataset is approved;
 * the TEST formulas are declared ({@link testFormulaDeclared}) unless the case passes
 * its own lookup, or `null` for none.
 */
export function testContext(input: {
  readonly subjectId: string;
  readonly documents?: readonly DocumentRecord[];
  readonly inputStates?: ReadonlyMap<string, FieldState>;
  readonly stageOrder?: readonly (readonly DocumentStage[])[];
  readonly formulaDeclared?: ((formulaId: string, formulaVersion: string) => boolean) | null;
}): DeriveContext {
  const documents = input.documents ?? [];
  const formulaDeclared = input.formulaDeclared === undefined ? testFormulaDeclared : input.formulaDeclared;
  return {
    subjectId: input.subjectId,
    document: (id) => documents.find((document) => document.id === id),
    unit: unitByCode,
    inputState: (candidateId) => input.inputStates?.get(candidateId),
    datasetApproved: () => false,
    ...(formulaDeclared === null ? {} : { formulaDeclared }),
    ...(input.stageOrder === undefined ? {} : { stageOrder: input.stageOrder }),
  };
}

/** The document statuses of TEST documents from their events (2.3); with no events, no document is removed. */
export function testDocumentStatuses(
  events: readonly DocumentEvent[] = [],
  documents: readonly DocumentRecord[] = [],
): DocumentStatuses {
  return documentStatuses(events, (id) => documents.find((document) => document.id === id));
}

/** Deep-freezes a value, so any change a function under test makes to its inputs throws. */
export function frozen<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const inner of Object.values(value)) frozen(inner);
    Object.freeze(value);
  }
  return value;
}
