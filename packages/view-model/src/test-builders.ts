/**
 * TEST builders for this package's own tests (resolver, intake): visibly synthetic records, in
 * memory only. Not exported by any entry of the package (package.json `exports`), so no app code
 * reaches it; the guardrail cases in tests/guardrails/ keep their own builders.
 *
 * Ids are UUID-shaped (the contract's `UuidSchema`), all starting `0192f0e4-7e57-`, so a TEST record
 * reads as one; content hashes are `sha256:` and 64 hex digits, as the store writes them.
 */
import { derive, type Candidate, type CandidateEvent, type DeriveEvents, type DocumentEvent, type DocumentRecord, type DocumentStage, type FieldEvent, type FieldState, type Quantity } from '@sovitech/domain';
import { productionRegistry, unitByCode } from '@sovitech/registry';
import type { RegistryFieldDefinition } from '@sovitech/registry/validation';
import type { IntakeField } from './intake';

/** A TEST id in UUID form: `0192f0e4-7e57-7000-8000-<n in 12 hex digits>`. */
export function testId(n: number): string {
  return `0192f0e4-7e57-7000-8000-${n.toString(16).padStart(12, '0')}`;
}

/** A TEST content hash as the store writes it. */
export function testHash(n: number): string {
  return `sha256:${n.toString(16).padStart(64, '0')}`;
}

/** A time on the TEST day, 2026-09-30, `minute` minutes after 09:00 UTC. */
export function testTime(minute: number): string {
  return new Date(Date.UTC(2026, 8, 30, 9, minute)).toISOString();
}

/** The production registry's field by key. */
export function productionField(key: string): RegistryFieldDefinition {
  const field = productionRegistry.fields.find((entry) => entry.key === key);
  if (field === undefined) throw new Error(`no production field ${key}`);
  return field;
}

/** A TEST registry field: strict defaults (estimation forbidden, no tolerance), label "TEST <key>". */
export function testField(key: string, entry: Pick<RegistryFieldDefinition, 'kind' | 'subject'> & Partial<RegistryFieldDefinition>): RegistryFieldDefinition {
  return { label: `TEST ${key}`, estimation: 'forbidden', criticality: 'optional', affects: [], impactRank: 1, confirmBy: 'owner', ...entry, key };
}

/** A TEST document record. */
export function testDocument(n: number, stage: DocumentStage = 'unknown', extra: Partial<DocumentRecord> = {}): DocumentRecord {
  return {
    id: testId(n),
    projectId: testId(1),
    contentHash: testHash(n),
    kind: 'architectural',
    stage,
    analysis: { status: 'analysed', coverage: 'pages 1-4 of 4' },
    ...extra,
  };
}

export type TestValue = { readonly quantity: Quantity; readonly original?: string } | { readonly choice: string } | { readonly text: string };

function valueOf(value: TestValue): Pick<Candidate, 'quantity' | 'choice' | 'text' | 'original'> {
  if ('quantity' in value) return { quantity: value.quantity, ...(value.original === undefined ? {} : { original: { text: value.original } }) };
  if ('choice' in value) return { choice: value.choice };
  return { text: value.text };
}

/** A value read from a TEST document (or inferred from it), with verified evidence on one page. */
export function found(input: {
  readonly id: number;
  readonly subjectId: string;
  readonly field: RegistryFieldDefinition;
  readonly document: DocumentRecord;
  readonly value: TestValue;
  readonly minute: number;
  readonly page?: number;
  readonly excerpt?: string;
  readonly source?: 'document' | 'ai_inference';
  readonly confidence?: Candidate['confidence'];
  readonly alternatives?: readonly Quantity[];
}): Candidate {
  return {
    id: testId(input.id),
    subjectId: input.subjectId,
    fieldKey: input.field.key,
    ...valueOf(input.value),
    ...(input.alternatives === undefined ? {} : { alternatives: input.alternatives }),
    source: input.source ?? 'document',
    evidence: [
      {
        documentId: input.document.id,
        contentHash: input.document.contentHash,
        locator: { page: input.page ?? 1 },
        excerpt: input.excerpt ?? 'TEST excerpt',
        check: 'text_match',
      },
    ],
    ...(input.confidence === undefined ? {} : { confidence: input.confidence }),
    createdBy: 'test-extractor',
    authorRole: 'system',
    createdAt: testTime(input.minute),
  };
}

/** The owner's own answer. */
export function answered(input: { readonly id: number; readonly subjectId: string; readonly field: RegistryFieldDefinition; readonly value: TestValue; readonly minute: number }): Candidate {
  return {
    id: testId(input.id),
    subjectId: input.subjectId,
    fieldKey: input.field.key,
    ...valueOf(input.value),
    source: 'user',
    evidence: [],
    createdBy: 'test-owner',
    authorRole: 'owner',
    createdAt: testTime(input.minute),
  };
}

/** 2.1: the owner's own entry on an owner or either field is user_confirmed when created. */
export function confirmedByOwner(candidate: Candidate): CandidateEvent {
  return { candidateId: candidate.id, type: 'user_confirmed', by: 'test-owner', role: 'owner', at: candidate.createdAt };
}

/** The owner's skip of a field. */
export function skippedByOwner(subjectId: string, fieldKey: string, minute: number): FieldEvent {
  return { subjectId, fieldKey, type: 'skipped', by: 'test-owner', role: 'owner', at: testTime(minute) };
}

/** Derive events from parts. */
export function events(parts: { readonly candidate?: readonly CandidateEvent[]; readonly field?: readonly FieldEvent[]; readonly document?: readonly DocumentEvent[] } = {}): DeriveEvents {
  return { candidate: parts.candidate ?? [], field: parts.field ?? [], document: parts.document ?? [] };
}

/** The one derive function over TEST records (the closed unit registry; no dataset approved; no formula declared). */
export function stateOf(field: RegistryFieldDefinition, subjectId: string, candidates: readonly Candidate[], derivedEvents: DeriveEvents = events(), documents: readonly DocumentRecord[] = []): FieldState {
  return derive(field, candidates, derivedEvents, {
    subjectId,
    document: (id) => documents.find((document) => document.id === id),
    unit: unitByCode,
    inputState: () => undefined,
    datasetApproved: () => false,
  });
}

/** A field as the question engine reads it, derived from TEST records. */
export function intakeField(
  field: RegistryFieldDefinition,
  subjectId: string,
  candidates: readonly Candidate[] = [],
  derivedEvents: DeriveEvents = events(),
  documents: readonly DocumentRecord[] = [],
): IntakeField {
  return {
    field,
    subjectId,
    state: stateOf(field, subjectId, candidates, derivedEvents, documents),
    candidates,
    skippedAt: derivedEvents.field.filter((event) => event.type === 'skipped' && event.role === 'owner' && event.fieldKey === field.key && event.subjectId === subjectId).map((event) => event.at),
  };
}
