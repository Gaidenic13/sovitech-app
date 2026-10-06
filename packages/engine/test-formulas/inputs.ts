/**
 * Builds the `EngineInput` of a TEST run from TEST candidates and events (prompt 3 5.4: TEST code, test runner only).
 * Every field is derived with the domain's one derive function (2.4), never by hand, so a TEST run reads exactly what
 * the app would read from the same records. The candidates and events come from the case (tests/guardrails/_support/
 * builders.ts holds the one builder of engineer verifications, in memory: prompt 3 section 14 item 3); nothing here
 * writes a verification.
 */
import {
  NO_EVENTS,
  derive,
  type Candidate,
  type CandidateReference,
  type DeriveEvents,
  type DocumentRecord,
  type FieldDefinition,
  type FieldState,
  type SubjectKind,
} from '@sovitech/domain';
import { unitByCode } from '@sovitech/registry';
import { fieldKeyOf, type DatasetAccess, type EngineField, type EngineInput } from '../src/inputs';
import type { CurrentInputs } from '../src/staleness';
import { testDatasetAccess } from './datasets';
import { TEST_FORMULA_VERSION } from './engine';
import { testFieldDefinition } from './fields';

/** One TEST field of a run: its registry entry, its subject, its candidates and the events that concern them. */
export interface TestEntry {
  readonly definition: FieldDefinition;
  readonly subjectId: string;
  readonly candidates: readonly Candidate[];
  readonly events?: Partial<DeriveEvents>;
}

export interface TestEngineInputOptions {
  readonly projectId: string;
  /** The fields, in dependency order: an engine candidate's inputs come before it. */
  readonly entries: readonly TestEntry[];
  /** The subject each kind of field lives on, for the fields no entry holds (output fields): project, building, ... */
  readonly subjects?: Partial<Record<SubjectKind, string>>;
  readonly closedGates?: Iterable<string>;
  /** Default: every TEST dataset. */
  readonly datasets?: DatasetAccess;
  /** Default: `test-engine`. */
  readonly author?: string;
  readonly documents?: readonly DocumentRecord[];
  /** Default: every `TEST-…` formula at the TEST version. */
  readonly formulaDeclared?: (formulaId: string, formulaVersion: string) => boolean;
  /** Default: no dataset approved. A case that reads a TEST reference value as approved says so here (test runner only). */
  readonly datasetApproved?: (reference: CandidateReference, field: FieldDefinition) => boolean;
  /** Default: the TEST fields, then the production registry's. */
  readonly fieldDefinition?: (fieldKey: string) => FieldDefinition | undefined;
}

/** The default `formulaDeclared` of a TEST run: TEST formulas at the TEST version. */
export function testFormulaVersionDeclared(formulaId: string, formulaVersion: string): boolean {
  return formulaId.startsWith('TEST-') && formulaVersion === TEST_FORMULA_VERSION;
}

/** Derives each entry in order (an engine candidate's inputs read the states derived before it). */
export function deriveEntries(options: Omit<TestEngineInputOptions, 'projectId' | 'subjects' | 'closedGates' | 'datasets' | 'author' | 'fieldDefinition'>): EngineField[] {
  const derived: EngineField[] = [];
  const stateOf = (candidateId: string): FieldState | undefined =>
    derived.find((field) => field.state.candidates.some((candidate) => candidate.candidateId === candidateId))?.state;
  for (const entry of options.entries) {
    const events: DeriveEvents = {
      candidate: entry.events?.candidate ?? NO_EVENTS.candidate,
      field: entry.events?.field ?? NO_EVENTS.field,
      document: entry.events?.document ?? NO_EVENTS.document,
    };
    const state = derive(entry.definition, entry.candidates, events, {
      subjectId: entry.subjectId,
      document: (id) => options.documents?.find((document) => document.id === id),
      unit: unitByCode,
      inputState: stateOf,
      datasetApproved: options.datasetApproved ?? (() => false),
      formulaDeclared: options.formulaDeclared ?? testFormulaVersionDeclared,
    });
    derived.push({ definition: entry.definition, subjectId: entry.subjectId, state, candidates: entry.candidates });
  }
  return derived;
}

/** The `EngineInput` of a TEST run. */
export function testEngineInput(options: TestEngineInputOptions): EngineInput {
  const fields = deriveEntries(options);
  const fieldDefinition = options.fieldDefinition ?? testFieldDefinition;
  const subjectByKey = new Map(fields.map((field) => [field.definition.key, field.subjectId]));
  return {
    projectId: options.projectId,
    fields: new Map(fields.map((field) => [fieldKeyOf(field.subjectId, field.definition.key), field])),
    subjectOf: (fieldKey) => {
      const own = subjectByKey.get(fieldKey);
      if (own !== undefined) return own;
      const kind = fieldDefinition(fieldKey)?.subject;
      return kind === undefined ? undefined : options.subjects?.[kind];
    },
    closedGates: new Set(options.closedGates ?? []),
    datasets: options.datasets ?? testDatasetAccess(),
    author: options.author ?? 'test-engine',
    fieldDefinition,
  };
}

/** The `CurrentInputs` of the staleness check over TEST entries (each derived as `deriveEntries` derives it). */
export function testCurrentInputs(
  options: Omit<TestEngineInputOptions, 'projectId' | 'subjects' | 'closedGates' | 'datasets' | 'author' | 'fieldDefinition'> & {
    readonly documentEvents?: CurrentInputs['documentEvents'];
  },
): CurrentInputs {
  const fields = deriveEntries(options);
  return {
    fields: fields.map((field, index) => ({
      subjectId: field.subjectId,
      fieldKey: field.definition.key,
      state: field.state,
      candidates: field.candidates,
      events: options.entries[index]?.events?.candidate ?? [],
      fieldEvents: options.entries[index]?.events?.field ?? [],
    })),
    ...(options.documentEvents === undefined ? {} : { documentEvents: options.documentEvents }),
  };
}
