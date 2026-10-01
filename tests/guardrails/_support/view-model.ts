/**
 * In-memory TEST helpers for the guardrail cases of the view-model (phase 3): the question engine
 * and the one resolver of `@sovitech/view-model/server`, over fields derived by the domain's one
 * derive function from TEST records (./builders.ts).
 *
 * Ids are UUID-shaped (the wizard contract's `UuidSchema`), all starting `0192f0e4-7e57-`, so a
 * display object the resolver makes from them satisfies the contract's schema; every record is
 * visibly synthetic. Nothing is written anywhere.
 */
import { derive, type Candidate, type DeriveEvents, type DocumentRecord, type FieldState } from '@sovitech/domain';
import { productionRegistry } from '@sovitech/registry';
import type { RegistryFieldDefinition } from '@sovitech/registry/validation';
import { DEFAULT_FORMAT_OPTIONS, type IntakeField, type ResolveFieldInput } from '@sovitech/view-model/server';
import { testContext, testEvents } from './builders';

/** A TEST id in UUID form: `0192f0e4-7e57-7000-8000-<n in 12 hex digits>`. */
export function uuid(n: number): string {
  return `0192f0e4-7e57-7000-8000-${n.toString(16).padStart(12, '0')}`;
}

/** A TEST content hash as the store writes it. */
export function contentHash(n: number): string {
  return `sha256:${n.toString(16).padStart(64, '0')}`;
}

/** The production registry's field by key. */
export function productionField(key: string): RegistryFieldDefinition {
  const field = productionRegistry.fields.find((entry) => entry.key === key);
  if (field === undefined) throw new Error(`no production field ${key}`);
  return field;
}

/** A TEST registry field, with the strict defaults (estimation forbidden, no tolerance) and the label "TEST <key>". */
export function registryField(key: string, entry: Pick<RegistryFieldDefinition, 'kind' | 'subject'> & Partial<RegistryFieldDefinition>): RegistryFieldDefinition {
  return { label: `TEST ${key}`, estimation: 'forbidden', criticality: 'optional', affects: [], impactRank: 1, confirmBy: 'owner', ...entry, key };
}

/** The field derived from TEST records, with the closed unit registry and the TEST formulas of the test runner. */
export function derived(
  field: RegistryFieldDefinition,
  subjectId: string,
  candidates: readonly Candidate[],
  events: DeriveEvents = testEvents({}),
  documents: readonly DocumentRecord[] = [],
  inputStates?: ReadonlyMap<string, FieldState>,
): FieldState {
  return derive(field, candidates, events, testContext({ subjectId, documents, ...(inputStates === undefined ? {} : { inputStates }) }));
}

/** A field as the question engine reads it: derived from TEST records, with the owner's skips. */
export function intakeFieldOf(
  field: RegistryFieldDefinition,
  subjectId: string,
  candidates: readonly Candidate[] = [],
  events: DeriveEvents = testEvents({}),
  documents: readonly DocumentRecord[] = [],
): IntakeField {
  return {
    field,
    subjectId,
    state: derived(field, subjectId, candidates, events, documents),
    candidates,
    skippedAt: events.field.filter((event) => event.type === 'skipped' && event.role === 'owner' && event.subjectId === subjectId && event.fieldKey === field.key).map((event) => event.at),
  };
}

/** The resolver's input for a field the question engine read, on a screen with the given actions. */
export function resolveInputOf(
  field: IntakeField,
  subjectKind: RegistryFieldDefinition['subject'],
  extra: Partial<ResolveFieldInput> & { readonly documents?: readonly DocumentRecord[]; readonly fileNames?: Readonly<Record<string, string>> } = {},
): ResolveFieldInput {
  const { documents = [], fileNames = {}, ...rest } = extra;
  return {
    field: field.field,
    subject: { id: field.subjectId, kind: subjectKind },
    state: field.state,
    candidates: field.candidates,
    document: (id) => documents.find((document) => document.id === id),
    fileName: (id) => fileNames[id],
    projectType: 'new_construction',
    asked: false,
    searchedCoverage: undefined,
    actions: [],
    format: DEFAULT_FORMAT_OPTIONS,
    ...rest,
  };
}
