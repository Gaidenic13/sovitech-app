/**
 * Property tests of the one derive function (docs/guardrails.md 2.4, rule 4):
 * inputs never change, events and candidates are sets (their order never
 * matters), no number is ever derived (so never a zero for an unknown), state
 * precedence, not_applicable only from a named person with a reason or a
 * registry condition, refusals never become values, and the conflict test over
 * the whole spread. The indexed guardrail cases (tests/guardrails/) prove the
 * section 7 situations; these prove the invariants over arbitrary inputs.
 * Every value is TEST data.
 */
import fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import {
  CANDIDATE_EVENT_TYPES,
  EVENT_ROLES,
  FIELD_EVENT_TYPES,
  declaredFormulaLookup,
  derive,
  planOwnerCorrection,
  type Candidate,
  type CandidateEvent,
  type DeriveContext,
  type DeriveEvents,
  type DocumentEvent,
  type DocumentRecord,
  type DocumentStage,
  type FieldDefinition,
  type FieldEvent,
  type FieldState,
  type UnitLookup,
} from './index';

const SUBJECT = 'test-subject';
const FIELD_KEY = 'test.subject.value';

const documents: readonly DocumentRecord[] = (['as_built', 'tender', 'technical_design'] as const).map((stage, index) => ({
  id: `test-doc-${String(index)}`,
  projectId: 'test-project',
  contentHash: `sha256:test-doc-${String(index)}`,
  kind: 'mep',
  stage,
  analysis: { status: 'analysed', coverage: 'TEST full coverage' },
  ...(index === 1 ? { supersedes: 'test-doc-2' } : {}),
}));

const STAGE_ORDER: readonly (readonly DocumentStage[])[] = [['as_built'], ['tender'], ['technical_design']];

/** A TEST unit registry: u1 and u2 measure one TEST dimension, u3 another (2.7). */
const TEST_DIMENSIONS: ReadonlyMap<string, string> = new Map([
  ['u1', 'TEST-dimension-a'],
  ['u2', 'TEST-dimension-a'],
  ['u3', 'TEST-dimension-b'],
  ['count', 'count'],
  ['m2', 'area'],
  ['kW', 'power'],
  ['MW', 'power'],
  ['kWh/a', 'energy_per_year'],
]);
const TEST_UNITS: UnitLookup = (code) => {
  const dimension = TEST_DIMENSIONS.get(code);
  return dimension === undefined ? undefined : { code, symbol: code, dimension };
};

const time = (minute: number): string => new Date(Date.UTC(2026, 8, 25, 9, minute)).toISOString();

const fieldArb: fc.Arbitrary<FieldDefinition> = fc
  .record({
    kind: fc.constantFrom<FieldDefinition['kind']>('quantity', 'count', 'enum', 'text', 'decision'),
    confirmBy: fc.constantFrom<FieldDefinition['confirmBy']>('owner', 'engineer', 'either'),
    estimation: fc.constantFrom<FieldDefinition['estimation']>('forbidden', 'allowed'),
    criticality: fc.constantFrom<FieldDefinition['criticality']>('required', 'first_estimate', 'for_quotation', 'optional'),
    tolerance: fc.option(
      fc.record({
        absolute: fc.option(fc.integer({ min: 0, max: 5 }), { nil: undefined }),
        relative: fc.option(fc.constantFrom(0.01, 0.05), { nil: undefined }),
        reason: fc.constantFrom('TEST tolerance', ''),
      }),
      { nil: undefined },
    ),
    confirmByBasis: fc.constantFrom<string | undefined>(undefined, undefined, 'owner_choice', 'use_and_occupancy'),
    options: fc.constantFrom<readonly string[] | undefined>(undefined, undefined, ['x', 'y'], ['x']),
    referenceDatasets: fc.constantFrom<readonly string[] | undefined>(undefined, ['TEST-dataset'], ['TEST-dataset-other']),
  })
  .map(({ tolerance, confirmByBasis, options, referenceDatasets, ...entry }) => ({
    ...(confirmByBasis === undefined ? {} : { confirmByBasis }),
    ...(options === undefined ? {} : { options }),
    ...(referenceDatasets === undefined ? {} : { referenceDatasets }),
    key: FIELD_KEY,
    label: 'TEST value',
    subject: 'building',
    unit: 'u1',
    qualifierRequired: true,
    qualifiers: ['a', 'b'],
    affects: [],
    impactRank: 1,
    ...entry,
    ...(tolerance === undefined ? {} : { tolerance: stripUndefined(tolerance) }),
  }));

function stripUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

const candidateArb = (index: number): fc.Arbitrary<Candidate> =>
  fc
    .record({
      source: fc.constantFrom<Candidate['source']>('document', 'user', 'ai_inference', 'calculated', 'estimated', 'reference'),
      value: fc.oneof({ arbitrary: fc.integer({ min: 0, max: 60 }), weight: 8 }, { arbitrary: fc.constantFrom(2.5, -3), weight: 1 }),
      unit: fc.constantFrom('u1', 'u1', 'u1', 'u2', 'u3'),
      qualifier: fc.constantFrom<string | undefined>('a', 'a', 'b', undefined, 'unknown', 'c'),
      choice: fc.constantFrom('x', 'y'),
      evidenceDocs: fc.subarray([0, 1, 2]),
      check: fc.constantFrom<'text_match' | 'unverifiable'>('text_match', 'text_match', 'unverifiable'),
      confidence: fc.constantFrom<Candidate['confidence']>('high', 'low', undefined),
      alternative: fc.option(fc.integer({ min: 0, max: 60 }), { nil: undefined, freq: 4 }),
      inputs: fc.subarray(['test-input-0', 'test-input-1']),
      minute: fc.integer({ min: 0, max: 50 }),
      withRange: fc.boolean(),
      author: fc.constantFrom<'owner' | 'sovitech_engineer'>('owner', 'owner', 'sovitech_engineer'),
    })
    .map((drawn): Candidate => {
      const id = `test-cand-${String(index)}`;
      const found = drawn.source === 'document' || drawn.source === 'ai_inference';
      const worked = drawn.source === 'calculated' || drawn.source === 'estimated';
      return {
        id,
        subjectId: SUBJECT,
        fieldKey: FIELD_KEY,
        quantity: { value: drawn.value, unit: drawn.unit, ...(drawn.qualifier === undefined ? {} : { qualifier: drawn.qualifier }) },
        choice: drawn.choice,
        text: 'TEST text',
        source: drawn.source,
        evidence: found
          ? drawn.evidenceDocs.map((docIndex) => {
              const document = documents[docIndex] ?? documents[0];
              if (document === undefined) throw new Error('fixture has documents');
              return { documentId: document.id, contentHash: document.contentHash, locator: { page: 1 }, excerpt: 'TEST', check: drawn.check };
            })
          : [],
        ...(drawn.alternative === undefined ? {} : { alternatives: [{ value: drawn.alternative, unit: drawn.unit }] }),
        ...(drawn.confidence === undefined ? {} : { confidence: drawn.confidence }),
        ...(worked
          ? {
              method: {
                formulaId: 'TEST-formula',
                formulaVersion: '1.0.0',
                inputCandidateIds: drawn.inputs,
                unknownPolicy: 'refuse',
                assumptions: [],
              },
            }
          : {}),
        ...(drawn.source === 'estimated' && drawn.withRange ? { range: { low: drawn.value, high: drawn.value + 1 } } : {}),
        ...(drawn.source === 'reference' ? { reference: { dataset: 'TEST-dataset', version: '1', key: 'k' } } : {}),
        createdBy: 'test-writer',
        authorRole: drawn.source === 'user' ? drawn.author : 'system',
        createdAt: time(drawn.minute),
      };
    });

const candidatesArb: fc.Arbitrary<Candidate[]> = fc
  .integer({ min: 0, max: 6 })
  .chain((count) => fc.tuple(...Array.from({ length: count }, (_, index) => candidateArb(index))))
  .map((list) => [...list]);

const roleArb = fc.constantFrom(...EVENT_ROLES);

function eventsArb(candidates: readonly Candidate[]): fc.Arbitrary<DeriveEvents> {
  const ids = candidates.map((candidate) => candidate.id);
  const candidateEvent: fc.Arbitrary<CandidateEvent> =
    ids.length === 0
      ? fc.constant({ candidateId: 'test-none', type: 'rejected', by: 'test-x', role: 'owner', at: time(0) })
      : fc
          .record({
            candidateId: fc.constantFrom(...ids),
            type: fc.constantFrom(...CANDIDATE_EVENT_TYPES),
            by: fc.constantFrom('test-person', '', 'test-writer'),
            role: roleArb,
            at: fc.integer({ min: 0, max: 60 }).map(time),
            reason: fc.constantFrom<string | undefined>(undefined, 'document_erased', 'TEST reason'),
          })
          .map(({ reason, ...event }) => ({ ...event, ...(reason === undefined ? {} : { reason }) }));
  const fieldEvent: fc.Arbitrary<FieldEvent> = fc
    .record({
      type: fc.constantFrom(...FIELD_EVENT_TYPES),
      by: fc.constantFrom('test-person', ''),
      role: roleArb,
      at: fc.integer({ min: 0, max: 60 }).map(time),
      reason: fc.constantFrom<string | undefined>('TEST reason', undefined, ''),
      chosen: fc.option(fc.constantFrom(...(ids.length === 0 ? ['test-none'] : ids)), { nil: undefined }),
      covered: fc.option(fc.subarray(ids.length === 0 ? ['test-none'] : ids), { nil: undefined }),
    })
    .map(({ reason, chosen, covered, ...event }) => ({
      subjectId: SUBJECT,
      fieldKey: FIELD_KEY,
      ...event,
      ...(reason === undefined ? {} : { reason }),
      ...(chosen === undefined ? {} : { chosenCandidateId: chosen }),
      ...(covered === undefined ? {} : { coveredCandidateIds: chosen === undefined ? covered : [...new Set([chosen, ...covered])] }),
    }));
  const documentEvent: fc.Arbitrary<DocumentEvent> = fc.record({
    documentId: fc.constantFrom(...documents.map((document) => document.id)),
    type: fc.constantFrom('declared_revision_of', 'withdrawn', 'erased'),
    by: fc.constant('test-person'),
    role: roleArb,
    at: fc.integer({ min: 0, max: 60 }).map(time),
  });
  return fc.record({
    candidate: fc.array(candidateEvent, { maxLength: 8 }),
    field: fc.array(fieldEvent, { maxLength: 6 }),
    document: fc.array(documentEvent, { maxLength: 3 }),
  });
}

/** The derived state of a TEST input field whose active candidate is `id`. */
function inputState(id: string, provisional: boolean): FieldState {
  return {
    subjectId: 'test-input-subject',
    fieldKey: 'test.input',
    state: 'known',
    activeCandidateId: id,
    candidates: [{ candidateId: id, verification: 'user_confirmed', status: 'eligible', refusal: null }],
    facts: [
      { qualifier: null, state: 'known', candidateIds: [id], setAsideIds: [], activeCandidateId: id, ambiguous: false, conflict: null, provisional, stale: false },
    ],
    conflicts: [],
    conflict: null,
    readingsToConfirm: [],
    provisional,
    stale: false,
    statusLines: [],
    review: null,
    notApplicable: null,
    refusedEvents: [],
  };
}

/** Input states for the two TEST inputs: each known and active (provisional or not), or not derived. */
const inputStatesArb: fc.Arbitrary<ReadonlyMap<string, FieldState>> = fc
  .subarray(['test-input-0', 'test-input-1'])
  .chain((known) =>
    fc
      .tuple(...known.map((id) => fc.boolean().map((provisional) => [id, provisional] as const)))
      .map((entries) => new Map(entries.map(([id, provisional]): [string, FieldState] => [id, inputState(id, provisional)]))),
  );

/**
 * Inside this test runner the TEST formulas the tests name ('TEST-formula', 'TEST-count', 'TEST-sum') are declared at
 * version 1.0.0 (prompt 3 5.4: TEST formulas load inside the test runner only); any other id or version is not.
 */
const testFormulaDeclared = (formulaId: string, formulaVersion: string): boolean => formulaId.startsWith('TEST-') && formulaVersion === '1.0.0';

function contextOf(inputStates: ReadonlyMap<string, FieldState>, approved: boolean, formulas: 'declared' | 'undeclared' = 'declared'): DeriveContext {
  return {
    subjectId: SUBJECT,
    document: (id) => documents.find((document) => document.id === id),
    unit: TEST_UNITS,
    inputState: (id) => inputStates.get(id),
    datasetApproved: () => approved,
    ...(formulas === 'declared' ? { formulaDeclared: testFormulaDeclared } : {}),
    stageOrder: STAGE_ORDER,
  };
}

const worldArb = fc
  .tuple(fieldArb, candidatesArb, inputStatesArb, fc.boolean(), fc.constantFrom<'declared' | 'undeclared'>('declared', 'declared', 'undeclared'))
  .chain(([field, candidates, inputStates, approved, formulas]) =>
    eventsArb(candidates).map((events) => ({ field, candidates, events, context: contextOf(inputStates, approved, formulas) })),
  );

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const inner of Object.values(value)) deepFreeze(inner);
    Object.freeze(value);
  }
  return value;
}

/** Every number anywhere in a value. */
function numbersIn(value: unknown): unknown[] {
  if (typeof value === 'number' || typeof value === 'bigint') return [value];
  if (value === null || typeof value !== 'object') return [];
  return Object.values(value).flatMap(numbersIn);
}

const shuffled = <T>(items: readonly T[], keys: readonly number[]): T[] =>
  items
    .map((item, index) => ({ item, key: keys[index % Math.max(keys.length, 1)] ?? index }))
    .sort((a, b) => a.key - b.key)
    .map((entry) => entry.item);

describe('derive: invariants over arbitrary candidates and events', () => {
  test('it never changes its inputs, and gives the same answer twice (pure; inputs are append-only records)', () => {
    fc.assert(
      fc.property(worldArb, ({ field, candidates, events, context }) => {
        const frozenCandidates = deepFreeze(structuredClone(candidates));
        const frozenEvents = deepFreeze(structuredClone(events));
        const first = derive(field, frozenCandidates, frozenEvents, context);
        expect(derive(field, frozenCandidates, frozenEvents, context)).toEqual(first);
        expect(frozenCandidates).toEqual(candidates);
        expect(frozenEvents).toEqual(events);
      }),
      { numRuns: 300 },
    );
  });

  test('candidates and events are sets: their order never changes the state', () => {
    fc.assert(
      fc.property(worldArb, fc.array(fc.nat(), { minLength: 1, maxLength: 12 }), ({ field, candidates, events, context }, keys) => {
        const reordered: DeriveEvents = {
          candidate: shuffled(events.candidate, keys),
          field: shuffled(events.field, [...keys].reverse()),
          document: shuffled(events.document, keys),
        };
        expect(derive(field, shuffled(candidates, keys), reordered, context)).toEqual(derive(field, candidates, events, context));
      }),
      { numRuns: 300 },
    );
  });

  test('no number is ever derived: a field state holds ids, states and flags only, so an unknown is never a zero', () => {
    fc.assert(
      fc.property(worldArb, ({ field, candidates, events, context }) => {
        const state = derive(field, candidates, events, context);
        expect(numbersIn(state)).toEqual([]);
        if (state.state !== 'known' && state.state !== 'conflict') {
          expect(state.activeCandidateId).toBeNull();
          expect(state.facts).toEqual([]);
          expect(state.provisional).toBe(false);
        }
      }),
      { numRuns: 300 },
    );
  });

  test('state precedence: a value in play means known or conflict; a conflict has no active candidate and is provisional', () => {
    fc.assert(
      fc.property(worldArb, ({ field, candidates, events, context }) => {
        const state = derive(field, candidates, events, context);
        const eligible = state.candidates.filter((candidate) => candidate.status === 'eligible').map((candidate) => candidate.candidateId);
        if (eligible.length > 0) expect(['known', 'conflict']).toContain(state.state);
        else expect(['unknown', 'pending', 'not_applicable', 'skipped']).toContain(state.state);
        if (state.state === 'conflict') {
          expect(state.activeCandidateId).toBeNull();
          expect(state.provisional).toBe(true);
          for (const conflict of state.conflicts) for (const id of conflict.candidateIds) expect(eligible).toContain(id);
        }
        for (const fact of state.facts) {
          if (fact.activeCandidateId !== null) expect(eligible).toContain(fact.activeCandidateId);
        }
        if (state.activeCandidateId !== null) expect(state.state).toBe('known');
      }),
      { numRuns: 300 },
    );
  });

  test('not_applicable only from a named owner or engineer with a reason, or a registry condition; absence never sets it', () => {
    fc.assert(
      fc.property(worldArb, ({ field, candidates, events, context }) => {
        const state = derive(field, candidates, events, context);
        const marked = events.field.some(
          (event) =>
            event.type === 'marked_not_applicable' &&
            event.role !== 'system' &&
            event.by.trim() !== '' &&
            (event.reason ?? '').trim() !== '',
        );
        if (!marked) expect(state.state).not.toBe('not_applicable');
        if (state.state === 'not_applicable') expect(state.notApplicable?.kind).toBe('event');
      }),
      { numRuns: 300 },
    );
  });

  test('a skipped field with an eligible candidate is known or in conflict (2.4: a new candidate removes it from the open items)', () => {
    fc.assert(
      fc.property(worldArb, ({ field, candidates, events, context }) => {
        const skip: FieldEvent = { subjectId: SUBJECT, fieldKey: FIELD_KEY, type: 'skipped', by: 'test-owner', role: 'owner', at: time(0) };
        const before = derive(field, candidates, events, context);
        const after = derive(field, candidates, { ...events, field: [...events.field, skip] }, context);
        if (before.state === 'known' || before.state === 'conflict') expect(after.state).toBe(before.state);
      }),
      { numRuns: 200 },
    );
  });

  test('refusals never become values: estimation forbidden, unapproved datasets, missing or unverified evidence, no method or inputs, choices not the owner\'s, units and qualifiers outside the registry', () => {
    fc.assert(
      fc.property(worldArb, ({ field, candidates, events, context }) => {
        const state = derive(field, candidates, events, context);
        const quantityField = field.kind === 'quantity' || field.kind === 'count';
        for (const derived of state.candidates) {
          const candidate = candidates.find((entry) => entry.id === derived.candidateId);
          if (candidate === undefined) throw new Error('every candidate is derived');
          const matched = candidate.evidence.some((evidence) => evidence.check !== 'unverifiable');
          const unit = candidate.quantity?.unit ?? '';
          const qualifier = candidate.quantity?.qualifier;
          const worked = candidate.source === 'calculated' || candidate.source === 'estimated';
          const formula = candidate.method;
          const readings = [candidate.quantity?.value, ...(candidate.alternatives ?? []).map((alternative) => alternative.value)];
          const choice = candidate.choice ?? '';
          const mustRefuse =
            (candidate.source === 'estimated' && field.estimation === 'forbidden') ||
            (candidate.source === 'reference' && !context.datasetApproved({ dataset: 'TEST-dataset', version: '1', key: 'k' }, field)) ||
            (candidate.source === 'reference' && !(field.referenceDatasets ?? []).includes('TEST-dataset')) ||
            (worked && (formula === undefined || context.formulaDeclared?.(formula.formulaId, formula.formulaVersion) !== true)) ||
            (field.kind === 'count' && !readings.every((value) => value !== undefined && Number.isInteger(value) && value >= 0)) ||
            ((field.kind === 'enum' || field.kind === 'decision') && field.options !== undefined && !field.options.includes(choice)) ||
            (field.kind === 'decision' && candidate.source === 'user' && candidate.authorRole !== 'owner') ||
            ((candidate.source === 'document' || candidate.source === 'ai_inference') && candidate.evidence.length === 0) ||
            (candidate.source === 'document' && !matched) ||
            (candidate.source === 'ai_inference' && !matched && candidate.confidence !== 'low') ||
            (candidate.source === 'ai_inference' && field.kind === 'quantity') ||
            (candidate.source === 'calculated' && (candidate.method?.inputCandidateIds.length ?? 1) === 0) ||
            (field.kind === 'decision' && candidate.source !== 'user') ||
            (quantityField && TEST_UNITS(unit)?.dimension !== TEST_UNITS(field.unit ?? '')?.dimension) ||
            (quantityField && qualifier !== undefined && qualifier !== 'unknown' && !(field.qualifiers ?? []).includes(qualifier));
          if (mustRefuse) expect(derived.status).not.toBe('eligible');
        }
      }),
      { numRuns: 300 },
    );
  });

  test('a system event never changes a value that is not the engine\'s: it cannot reject, supersede or withdraw a found or entered value', () => {
    fc.assert(
      fc.property(
        worldArb,
        fc.array(fc.tuple(fc.nat(), fc.constantFrom<CandidateEvent['type']>('rejected', 'superseded', 'withdrawn'), fc.constantFrom('document_erased', 'document_deleted', 'TEST')), {
          minLength: 1,
          maxLength: 4,
        }),
        ({ field, candidates, events, context }, extra) => {
          const targets = candidates.filter((candidate) => candidate.source !== 'calculated' && candidate.source !== 'estimated');
          if (targets.length === 0) return;
          const systemEvents: CandidateEvent[] = extra.map(([index, type, reason]) => {
            const target = targets[index % targets.length];
            if (target === undefined) throw new Error('targets is not empty');
            return { candidateId: target.id, type, by: 'test-system', role: 'system', at: time(59), reason };
          });
          const before = derive(field, candidates, events, context);
          const after = derive(field, candidates, { ...events, candidate: [...events.candidate, ...systemEvents] }, context);
          expect(after.candidates).toEqual(before.candidates);
          expect(after.state).toBe(before.state);
          expect(after.facts).toEqual(before.facts);
          expect(after.conflicts).toEqual(before.conflicts);
        },
      ),
      { numRuns: 300 },
    );
  });

  test('a resolution never sets aside a candidate it did not cover', () => {
    fc.assert(
      fc.property(worldArb, ({ field, candidates, events, context }) => {
        const state = derive(field, candidates, events, context);
        const coveredAnywhere = new Set(
          events.field.filter((event) => event.type === 'conflict_resolved').flatMap((event) => event.coveredCandidateIds ?? []),
        );
        for (const fact of state.facts) for (const id of fact.setAsideIds) expect(coveredAnywhere.has(id)).toBe(true);
      }),
      { numRuns: 300 },
    );
  });

  test('an ambiguous fact has no active value, and a field whose one fact is ambiguous has none either', () => {
    fc.assert(
      fc.property(worldArb, ({ field, candidates, events, context }) => {
        const state = derive(field, candidates, events, context);
        for (const fact of state.facts) if (fact.ambiguous) expect(fact.activeCandidateId).toBeNull();
        if (state.facts.length === 1 && state.facts[0]?.ambiguous === true) expect(state.activeCandidateId).toBeNull();
      }),
      { numRuns: 300 },
    );
  });

  test('the owner never overrules an engineer: an engineer_verified candidate is not rejected by an owner event', () => {
    fc.assert(
      fc.property(worldArb, ({ field, candidates, events, context }) => {
        const state = derive(field, candidates, events, context);
        for (const derived of state.candidates) {
          if (derived.verification !== 'engineer_verified' || derived.status !== 'rejected') continue;
          const byEngineer = events.candidate.some(
            (event) => event.candidateId === derived.candidateId && event.type === 'rejected' && event.role === 'sovitech_engineer',
          );
          expect(byEngineer).toBe(true);
        }
      }),
      { numRuns: 300 },
    );
  });

  test('verification comes only from the right role: engineer_verified only from an engineer, user_confirmed never on an engineer field', () => {
    fc.assert(
      fc.property(worldArb, ({ field, candidates, events, context }) => {
        const state = derive(field, candidates, events, context);
        for (const derived of state.candidates) {
          const own = events.candidate.filter((event) => event.candidateId === derived.candidateId);
          if (derived.verification === 'engineer_verified') {
            expect(own.some((event) => event.type === 'engineer_verified' && event.role === 'sovitech_engineer')).toBe(true);
          }
          if (derived.verification === 'user_confirmed') expect(field.confirmBy).not.toBe('engineer');
        }
      }),
      { numRuns: 300 },
    );
  });
});

describe('derive: the conflict test over the whole spread (rule 4)', () => {
  const count = (tolerance?: FieldDefinition['tolerance']): FieldDefinition => ({
    key: FIELD_KEY,
    label: 'TEST count',
    subject: 'building',
    kind: 'count',
    unit: 'count',
    qualifierRequired: true,
    qualifiers: ['guest_rooms', 'all_spaces', 'below_ground', 'ground', 'upper_floors'],
    estimation: 'forbidden',
    criticality: 'optional',
    affects: [],
    impactRank: 1,
    confirmBy: 'owner',
    ...(tolerance === undefined ? {} : { tolerance }),
  });
  const reading = (index: number, value: number, qualifier = 'guest_rooms'): Candidate => {
    const document = documents[index % documents.length] ?? documents[0];
    if (document === undefined) throw new Error('fixture has documents');
    return {
      id: `test-cand-spread-${String(index)}`,
      subjectId: SUBJECT,
      fieldKey: FIELD_KEY,
      quantity: { value, unit: 'count', qualifier },
      source: 'document',
      evidence: [{ documentId: document.id, contentHash: document.contentHash, locator: { page: 1 }, excerpt: 'TEST', check: 'text_match' }],
      createdBy: 'test-extractor',
      createdAt: time(index),
    };
  };
  const context = contextOf(new Map(), false);
  const events: DeriveEvents = { candidate: [], field: [], document: [] };

  test('adding a candidate to a conflicting set keeps the conflict: small steps never drift past the tolerance', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 500 }), { minLength: 2, maxLength: 6 }),
        fc.integer({ min: 0, max: 500 }),
        fc.option(fc.integer({ min: 0, max: 20 }), { nil: undefined }),
        (values, extra, absolute) => {
          const field = count(absolute === undefined ? undefined : { absolute, reason: 'TEST: a stated reason' });
          const before = derive(field, values.map((value, index) => reading(index, value)), events, context);
          const after = derive(field, [...values, extra].map((value, index) => reading(index, value)), events, context);
          if (before.state === 'conflict') expect(after.state).toBe('conflict');
        },
      ),
    );
  });

  test('with no tolerance, counts conflict exactly when they differ; a tolerance without a reason is no tolerance', () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 0, max: 50 }), { minLength: 1, maxLength: 5 }), (values) => {
        const expected = new Set(values).size > 1 ? 'conflict' : 'known';
        const candidates = values.map((value, index) => reading(index, value));
        expect(derive(count(), candidates, events, context).state).toBe(expected);
        expect(derive(count({ absolute: 1000, reason: '  ' }), candidates, events, context).state).toBe(expected);
      }),
    );
  });

  test('an absolute tolerance holds exactly up to its bound', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1000 }), fc.integer({ min: 0, max: 30 }), fc.integer({ min: 0, max: 30 }), (base, step, bound) => {
        const field = count({ absolute: bound, reason: 'TEST: a stated reason' });
        const state = derive(field, [reading(0, base), reading(1, base + step)], events, context);
        expect(state.state).toBe(step > bound ? 'conflict' : 'known');
      }),
    );
  });

  test('different known qualifiers are different facts, never compared', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 500 }), fc.integer({ min: 0, max: 500 }), (first, second) => {
        const state = derive(count(), [reading(0, first, 'guest_rooms'), reading(1, second, 'all_spaces')], events, context);
        expect(state.state).toBe('known');
        expect(state.facts.map((fact) => fact.qualifier)).toEqual(['all_spaces', 'guest_rooms']);
        expect(state.activeCandidateId).toBeNull();
      }),
    );
  });

  test('an unknown qualifier matching no qualified reading is a conflict (rule 4: never left unreconciled)', () => {
    const state = derive(
      count(),
      [reading(0, 8, 'below_ground'), reading(1, 28, 'upper_floors'), reading(2, 30, 'unknown')],
      events,
      context,
    );
    expect(state.state).toBe('conflict');
    expect(state.conflict?.kind).toBe('unqualified_matches_none');
  });

  test('an unknown qualifier matching several readings is a conflict, not a guess between them', () => {
    const state = derive(
      count(),
      [reading(0, 1, 'below_ground'), reading(1, 1, 'ground'), { ...reading(2, 1), quantity: { value: 1, unit: 'count' } }],
      events,
      context,
    );
    expect(state.state).toBe('conflict');
    expect(state.conflict?.kind).toBe('unqualified_matches_several');
  });
});

describe('derive: resolutions, not applicable, pending, stale and provisional', () => {
  const owned = (confirmBy: FieldDefinition['confirmBy']): FieldDefinition => ({
    key: FIELD_KEY,
    label: 'TEST floors',
    subject: 'building',
    kind: 'count',
    unit: 'count',
    qualifierRequired: true,
    qualifiers: ['upper_floors'],
    estimation: 'forbidden',
    criticality: 'optional',
    affects: [],
    impactRank: 1,
    confirmBy,
  });
  const doc = documents[2];
  if (doc === undefined) throw new Error('fixture has documents');
  const reading = (id: string, value: number, minute: number): Candidate => ({
    id,
    subjectId: SUBJECT,
    fieldKey: FIELD_KEY,
    quantity: { value, unit: 'count', qualifier: 'upper_floors' },
    source: 'document',
    evidence: [{ documentId: doc.id, contentHash: doc.contentHash, locator: { page: 1 }, excerpt: 'TEST', check: 'text_match' }],
    createdBy: 'test-extractor',
    createdAt: time(minute),
  });
  const fieldEvent = (event: Omit<FieldEvent, 'subjectId' | 'fieldKey'>): FieldEvent => ({ subjectId: SUBJECT, fieldKey: FIELD_KEY, ...event });
  const resolved = (
    role: FieldEvent['role'],
    chosen: string,
    minute: number,
    reason = 'TEST: the owner knows',
    covered: readonly string[] = ['test-a', 'test-b'],
  ): FieldEvent =>
    fieldEvent({ type: 'conflict_resolved', by: 'test-person', role, at: time(minute), reason, chosenCandidateId: chosen, coveredCandidateIds: covered });
  const context = contextOf(new Map(), false);
  const two = [reading('test-a', 12, 0), reading('test-b', 14, 5)];

  test('the right person, with a reason, closes a conflict: the chosen candidate is active, the other set aside and still eligible', () => {
    const state = derive(owned('owner'), two, { candidate: [], field: [resolved('owner', 'test-b', 10)], document: [] }, context);
    expect(state.state).toBe('known');
    expect(state.activeCandidateId).toBe('test-b');
    expect(state.facts[0]?.setAsideIds).toEqual(['test-a']);
    expect(state.candidates.find((candidate) => candidate.candidateId === 'test-a')?.status).toBe('eligible');
  });

  test('only the right person closes it: not the owner on an engineer field, not the system, not without a reason', () => {
    for (const [field, event] of [
      [owned('engineer'), resolved('owner', 'test-b', 10)],
      [owned('owner'), resolved('system', 'test-b', 10)],
      [owned('owner'), resolved('owner', 'test-b', 10, ' ')],
      [owned('owner'), resolved('owner', 'test-unknown', 10)],
    ] as const) {
      expect(derive(field, two, { candidate: [], field: [event], document: [] }, context).state).toBe('conflict');
    }
    expect(derive(owned('engineer'), two, { candidate: [], field: [resolved('sovitech_engineer', 'test-b', 10)], document: [] }, context).state).toBe(
      'known',
    );
  });

  test('a value that arrives after the resolution is compared again, and a new disagreement reopens the conflict', () => {
    const later = reading('test-c', 16, 20);
    const agreeing = reading('test-d', 14, 20);
    const events = { candidate: [], field: [resolved('owner', 'test-b', 10)], document: [] };
    expect(derive(owned('owner'), [...two, later], events, context).state).toBe('conflict');
    expect(derive(owned('owner'), [...two, agreeing], events, context).state).toBe('known');
  });

  test('not_applicable: a named owner or engineer with a reason sets it; the system, a blank name or no reason does not', () => {
    const marked = (role: FieldEvent['role'], by: string, reason?: string): FieldEvent =>
      fieldEvent({ type: 'marked_not_applicable', by, role, at: time(1), ...(reason === undefined ? {} : { reason }) });
    const stateOf = (event: FieldEvent) => derive(owned('owner'), [], { candidate: [], field: [event], document: [] }, context);
    expect(stateOf(marked('owner', 'test-owner', 'TEST: no parking')).state).toBe('not_applicable');
    expect(stateOf(marked('owner', 'test-owner', 'TEST: no parking')).notApplicable).toMatchObject({ kind: 'event', role: 'owner' });
    for (const event of [marked('system', 'test-ai', 'TEST'), marked('owner', ' ', 'TEST'), marked('sovitech_engineer', 'test-engineer')]) {
      expect(stateOf(event).state).toBe('unknown');
    }
  });

  test('not_applicable by a registry condition only on known fields without conflict', () => {
    const known = derive(owned('owner'), [reading('test-a', 0, 0)], { candidate: [], field: [], document: [] }, context);
    const conflicted = derive(owned('owner'), two, { candidate: [], field: [], document: [] }, context);
    const conditioned = (basedOn: readonly FieldState[]): DeriveContext => ({
      ...context,
      notApplicableCondition: () => ({ conditionId: 'TEST-no-parking-levels', basedOn }),
    });
    const other: FieldDefinition = { ...owned('owner'), key: 'test.subject.other' };
    const none = { candidate: [], field: [], document: [] };
    expect(derive(other, [], none, conditioned([known])).notApplicable).toEqual({ kind: 'registry_condition', conditionId: 'TEST-no-parking-levels' });
    expect(derive(other, [], none, conditioned([conflicted])).state).toBe('unknown');
    expect(derive(other, [], none, conditioned([])).state).toBe('unknown');
  });

  test('pending while more analyses started than finished; known wins over pending', () => {
    const started = fieldEvent({ type: 'analysis_started', by: 'test-job', role: 'system', at: time(1) });
    const finished = fieldEvent({ type: 'analysis_finished', by: 'test-job', role: 'system', at: time(2) });
    const none = { candidate: [], document: [] };
    expect(derive(owned('owner'), [], { ...none, field: [started] }, context).state).toBe('pending');
    expect(derive(owned('owner'), [], { ...none, field: [started, finished] }, context).state).toBe('unknown');
    expect(derive(owned('owner'), [reading('test-a', 3, 0)], { ...none, field: [started] }, context).state).toBe('known');
  });

  test('a calculated value is stale and provisional when an input is no longer active, and transparent otherwise', () => {
    const calculated = (inputs: string[]): Candidate => ({
      id: 'test-calc',
      subjectId: SUBJECT,
      fieldKey: FIELD_KEY,
      quantity: { value: 3, unit: 'count', qualifier: 'upper_floors' },
      source: 'calculated',
      evidence: [],
      method: { formulaId: 'TEST-count', formulaVersion: '1.0.0', inputCandidateIds: inputs, unknownPolicy: 'refuse', assumptions: [] },
      createdBy: 'test-engine',
      createdAt: time(0),
    });
    const none = { candidate: [], field: [], document: [] };
    const withInputs: DeriveContext = {
      ...contextOf(new Map(), false),
      inputState: (id) => (id === 'test-input-0' ? inputState(id, false) : undefined),
    };
    const current = derive(owned('owner'), [calculated(['test-input-0'])], none, withInputs);
    expect(current.stale).toBe(false);
    expect(current.provisional).toBe(false);
    const replaced = derive(owned('owner'), [calculated(['test-input-0', 'test-input-1'])], none, withInputs);
    expect(replaced.stale).toBe(true);
    expect(replaced.provisional).toBe(true);
    expect(replaced.statusLines).toContain('out_of_date_recalculating');
  });
});

describe('derive: an owner resolution on a for_quotation field', () => {
  test('the document value the owner set aside goes to the engineer queue (rule 4), as a correction would', () => {
    const doc = documents[2];
    if (doc === undefined) throw new Error('fixture has documents');
    const field: FieldDefinition = {
      key: FIELD_KEY,
      label: 'TEST area',
      subject: 'building',
      kind: 'quantity',
      unit: 'm2',
      qualifierRequired: true,
      qualifiers: ['gross_total'],
      estimation: 'forbidden',
      criticality: 'for_quotation',
      affects: [],
      impactRank: 1,
      confirmBy: 'owner',
    };
    const reading = (id: string, value: number, minute: number): Candidate => ({
      id,
      subjectId: SUBJECT,
      fieldKey: FIELD_KEY,
      quantity: { value, unit: 'm2', qualifier: 'gross_total' },
      source: 'document',
      evidence: [{ documentId: doc.id, contentHash: doc.contentHash, locator: { page: 1 }, excerpt: 'TEST', check: 'text_match' }],
      createdBy: 'test-extractor',
      createdAt: time(minute),
    });
    const resolution: FieldEvent = {
      subjectId: SUBJECT,
      fieldKey: FIELD_KEY,
      type: 'conflict_resolved',
      by: 'test-owner',
      role: 'owner',
      at: time(10),
      reason: 'TEST: the owner knows',
      chosenCandidateId: 'test-b',
      coveredCandidateIds: ['test-a', 'test-b'],
    };
    const state = derive(field, [reading('test-a', 100, 0), reading('test-b', 120, 5)], { candidate: [], field: [resolution], document: [] }, contextOf(new Map(), false));
    expect(state.state).toBe('known');
    expect(state.review).toEqual({ list: 'sovitech_will_check', reason: 'owner_correction' });
  });
});

/**
 * The phase 1 review's attacks on derive, each reproduced with TEST data and
 * refused (phase 1 verifier and adversarial findings; ADR 0016).
 */
describe('derive: the phase 1 review attacks', () => {
  const tender = documents[1];
  const asBuilt = documents[0];
  if (tender === undefined || asBuilt === undefined) throw new Error('fixture has documents');
  const context = contextOf(new Map(), false);
  const none: DeriveEvents = { candidate: [], field: [], document: [] };
  const field = (entry: Partial<FieldDefinition> & Pick<FieldDefinition, 'kind'>): FieldDefinition => ({
    key: FIELD_KEY,
    label: 'TEST field',
    subject: 'building',
    estimation: 'forbidden',
    criticality: 'optional',
    affects: [],
    impactRank: 1,
    confirmBy: 'owner',
    ...entry,
  });
  const found = (
    id: string,
    document: DocumentRecord,
    rest: Omit<Candidate, 'id' | 'subjectId' | 'fieldKey' | 'source' | 'evidence' | 'createdBy' | 'createdAt'>,
    minute: number,
    check: 'text_match' | 'unverifiable' = 'text_match',
  ): Candidate => ({
    id,
    subjectId: SUBJECT,
    fieldKey: FIELD_KEY,
    source: 'document',
    evidence: [{ documentId: document.id, contentHash: document.contentHash, locator: { page: 1 }, excerpt: 'TEST', check }],
    createdBy: 'test-extractor',
    createdAt: time(minute),
    ...rest,
  });
  const entered = (
    id: string,
    rest: Omit<Candidate, 'id' | 'subjectId' | 'fieldKey' | 'source' | 'evidence' | 'createdBy' | 'createdAt'>,
    minute: number,
    by = 'test-owner',
  ): Candidate => ({
    id,
    subjectId: SUBJECT,
    fieldKey: FIELD_KEY,
    source: 'user',
    evidence: [],
    createdBy: by,
    authorRole: by === 'test-owner' ? 'owner' : 'sovitech_engineer',
    createdAt: time(minute),
    ...rest,
  });
  const statusOf = (state: FieldState, id: string) => state.candidates.find((candidate) => candidate.candidateId === id);
  const refusalsOf = (state: FieldState) => state.refusedEvents.map((refused) => refused.refusal);

  describe('superseded and withdrawn events (high)', () => {
    const ahuCount = field({ kind: 'count', unit: 'count', qualifierRequired: true, qualifiers: ['ahu'], confirmBy: 'engineer' });
    const fromTender = found('test-tender-ahu', tender, { quantity: { value: 6, unit: 'count', qualifier: 'ahu' } }, 0);
    const fromAsBuilt = found('test-asbuilt-ahu', asBuilt, { quantity: { value: 5, unit: 'count', qualifier: 'ahu' } }, 0);
    const both = [fromTender, fromAsBuilt];
    const event = (type: CandidateEvent['type'], role: CandidateEvent['role'], reason?: string, by = 'test-actor'): CandidateEvent => ({
      candidateId: fromAsBuilt.id,
      type,
      by,
      role,
      at: time(30),
      ...(reason === undefined ? {} : { reason }),
    });

    test('documents that disagree stay in conflict for the engineer, whatever superseded or withdrawn event is appended', () => {
      expect(derive(ahuCount, both, none, context)).toMatchObject({ state: 'conflict', review: { list: 'sovitech_will_check', reason: 'conflict' } });
      for (const [appended, refusal] of [
        [event('superseded', 'system'), 'superseded_not_recalculation'],
        [event('superseded', 'sovitech_engineer'), 'superseded_not_recalculation'],
        [event('withdrawn', 'owner'), 'withdrawn_not_removal'],
        [event('withdrawn', 'sovitech_engineer'), 'withdrawn_not_removal'],
        [event('withdrawn', 'system'), 'withdrawn_not_removal'],
        [event('withdrawn', 'system', 'document_erased'), 'withdrawn_not_removal'],
        [event('withdrawn', 'system', 'document_deleted'), 'withdrawn_not_removal'],
        [event('rejected', 'system'), 'rejected_by_system'],
      ] as const) {
        const state = derive(ahuCount, both, { ...none, candidate: [appended] }, context);
        expect(state.state).toBe('conflict');
        expect(statusOf(state, fromAsBuilt.id)?.status).toBe('eligible');
        expect(state.refusedEvents).toEqual([{ kind: 'candidate', event: appended, refusal }]);
      }
    });

    test("the system's withdrawal holds when every document the candidate cites is removed, with a removal reason", () => {
      const erased: DocumentEvent = { documentId: asBuilt.id, type: 'erased', by: 'test-owner', role: 'owner', at: time(29) };
      const state = derive(ahuCount, both, { ...none, candidate: [event('withdrawn', 'system', 'document_erased')], document: [erased] }, context);
      expect(statusOf(state, fromAsBuilt.id)?.status).toBe('withdrawn');
      expect(state).toMatchObject({ state: 'known', activeCandidateId: fromTender.id, refusedEvents: [] });
    });

    test('the engine supersedes its own calculated candidate on recalculation, and nothing else', () => {
      const calculated = (id: string, value: number, minute: number): Candidate => ({
        id,
        subjectId: SUBJECT,
        fieldKey: FIELD_KEY,
        quantity: { value, unit: 'count', qualifier: 'ahu' },
        source: 'calculated',
        evidence: [],
        method: { formulaId: 'TEST-count', formulaVersion: '1.0.0', inputCandidateIds: ['test-input-0'], unknownPolicy: 'refuse', assumptions: [] },
        createdBy: 'test-engine',
        createdAt: time(minute),
      });
      const old = calculated('test-calc-old', 4, 0);
      const recalculated = calculated('test-calc-new', 5, 10);
      const byEngine: CandidateEvent = { candidateId: old.id, type: 'superseded', by: 'test-engine', role: 'system', at: time(10) };
      const state = derive(ahuCount, [old, recalculated], { ...none, candidate: [byEngine] }, context);
      expect(statusOf(state, old.id)?.status).toBe('superseded');
      expect(state).toMatchObject({ state: 'known', activeCandidateId: recalculated.id });
    });

    test('a person withdraws only their own entered value, and the owner never an engineer_verified one', () => {
      const own = entered('test-own-ahu', { quantity: { value: 5, unit: 'count', qualifier: 'ahu' } }, 0);
      const withdraw = (by: string, role: CandidateEvent['role']): CandidateEvent => ({ candidateId: own.id, type: 'withdrawn', by, role, at: time(30) });
      expect(statusOf(derive(ahuCount, [own], { ...none, candidate: [withdraw('test-owner', 'owner')] }, context), own.id)?.status).toBe('withdrawn');
      const other = derive(ahuCount, [own], { ...none, candidate: [withdraw('test-someone-else', 'owner')] }, context);
      expect(statusOf(other, own.id)?.status).toBe('eligible');
      expect(refusalsOf(other)).toEqual(['withdrawn_not_removal']);
      const byEngineer: CandidateEvent = { candidateId: own.id, type: 'engineer_verified', by: 'test-engineer', role: 'sovitech_engineer', at: time(20) };
      const overruled = derive(ahuCount, [own], { ...none, candidate: [byEngineer, withdraw('test-owner', 'owner')] }, context);
      expect(statusOf(overruled, own.id)?.status).toBe('eligible');
      expect(refusalsOf(overruled)).toEqual(['owner_overrules_engineer']);
    });

    test('a withdrawal by the owner of their own value is not a removed source document', () => {
      const own = entered('test-own-area', { quantity: { value: 5, unit: 'count', qualifier: 'ahu' } }, 0);
      const state = derive(ahuCount, [own], { ...none, candidate: [{ candidateId: own.id, type: 'withdrawn', by: 'test-owner', role: 'owner', at: time(30) }] }, context);
      expect(state.state).toBe('unknown');
      expect(state.statusLines).not.toContain('source_document_removed');
    });

    /**
     * Adversarial finding X6 (phase 1 review, round 3; low): the owner's revision declaration or
     * document deletion, both of which 2.3 allows, takes one side out of an engineer-routed conflict,
     * and the engineer no longer sees the disagreement. Changing that adds an engineer queue entry, so
     * it waits for the approver (P-1-OWNER-REMOVAL-ENGINEER-CONFLICT, build log phase 1); these tests
     * pin today's reading so that a change is visible.
     */
    describe('pinned until the approver decides P-1-OWNER-REMOVAL-ENGINEER-CONFLICT (not a reading derive may change alone)', () => {
      test('today the owner declaring the tender a revision of the as-built ends the engineer-routed conflict on the tender value', () => {
        const declared: DocumentEvent = { documentId: tender.id, type: 'declared_revision_of', by: 'test-owner', role: 'owner', at: time(30), revisionOf: asBuilt.id };
        const state = derive(ahuCount, both, { ...none, document: [declared] }, context);
        expect(statusOf(state, fromAsBuilt.id)?.status).toBe('superseded');
        expect(state).toMatchObject({ state: 'known', activeCandidateId: fromTender.id, review: null, refusedEvents: [] });
      });

      test('today the owner deleting the as-built document ends the engineer-routed conflict on the tender value', () => {
        const deleted: DocumentEvent = { documentId: asBuilt.id, type: 'withdrawn', by: 'test-owner', role: 'owner', at: time(30) };
        const state = derive(ahuCount, both, { ...none, document: [deleted] }, context);
        expect(statusOf(state, fromAsBuilt.id)?.status).toBe('withdrawn');
        expect(state).toMatchObject({ state: 'known', activeCandidateId: fromTender.id, review: null, refusedEvents: [] });
      });
    });
  });

  test('a decision is the owner\'s: an AI inference or a document never sets it (medium)', () => {
    const fireSafety = field({ kind: 'decision' });
    const inferred: Candidate = { ...found('test-ai-include', tender, { choice: 'include', confidence: 'high' }, 0), source: 'ai_inference' };
    const written = found('test-doc-include', tender, { choice: 'include' }, 0);
    for (const candidate of [inferred, written]) {
      const state = derive(fireSafety, [candidate], none, context);
      expect(state.state).toBe('unknown');
      expect(statusOf(state, candidate.id)).toMatchObject({ status: 'refused', refusal: 'choice_not_owner' });
    }
    const owners = entered('test-owner-include', { choice: 'include' }, 0);
    expect(derive(fireSafety, [owners], none, context)).toMatchObject({ state: 'known', activeCandidateId: owners.id });
  });

  describe('units and qualifiers (medium)', () => {
    const annualEnergy = field({ kind: 'quantity', unit: 'kWh/a', qualifierRequired: true, qualifiers: ['final_energy'] });

    test('a unit of another dimension, or outside the registry, is refused (2.7; G8-4 at derive)', () => {
      for (const unit of ['kW', 'banana']) {
        const candidate = entered(`test-energy-${unit}`, { quantity: { value: 1_250_000, unit, qualifier: 'final_energy' } }, 0);
        const state = derive(annualEnergy, [candidate], none, context);
        expect(state.state).toBe('unknown');
        expect(statusOf(state, candidate.id)).toMatchObject({ status: 'refused', refusal: 'unit_dimension' });
      }
      const fits = entered('test-energy-kwh', { quantity: { value: 1_250_000, unit: 'kWh/a', qualifier: 'final_energy' } }, 0);
      expect(derive(annualEnergy, [fits], none, context).state).toBe('known');
    });

    test('without the unit registry no quantity is a value', () => {
      const candidate = entered('test-energy-kwh', { quantity: { value: 1_250_000, unit: 'kWh/a', qualifier: 'final_energy' } }, 0);
      const blind = { ...context, unit: undefined } as unknown as DeriveContext;
      expect(statusOf(derive(annualEnergy, [candidate], none, blind), candidate.id)).toMatchObject({ refusal: 'unit_dimension' });
    });

    test('a qualifier the field does not register is refused, so a misspelt basis never forms a fact of its own', () => {
      const area = field({ kind: 'quantity', unit: 'm2', qualifierRequired: true, qualifiers: ['gross_total'] });
      const registered = entered('test-area-registered', { quantity: { value: 1000, unit: 'm2', qualifier: 'gross_total' } }, 0);
      const misspelt = entered('test-area-misspelt', { quantity: { value: 1200, unit: 'm2', qualifier: 'Gross_Total' } }, 0);
      const state = derive(area, [registered, misspelt], none, context);
      expect(statusOf(state, misspelt.id)).toMatchObject({ status: 'refused', refusal: 'qualifier_unregistered' });
      expect(state.facts).toHaveLength(1);
    });

    test('an unqualified value next to qualified readings in another unit matches none of them: a conflict, not a fact of its own', () => {
      const capacity = field({ kind: 'quantity', unit: 'kW', qualifierRequired: true, qualifiers: ['cooling_output'] });
      const unqualified = entered('test-cap-mw', { quantity: { value: 1.5, unit: 'MW' } }, 0);
      const cooling = found('test-cap-kw', tender, { quantity: { value: 1200, unit: 'kW', qualifier: 'cooling_output' } }, 0);
      const state = derive(capacity, [unqualified, cooling], none, context);
      expect(state.state).toBe('conflict');
      expect(state.conflict).toMatchObject({ kind: 'unqualified_matches_none', candidateIds: [cooling.id, unqualified.id].sort() });
    });
  });

  test('an ambiguous reading is never read one way: the fact is known with no single value, and provisional (medium)', () => {
    const capacity = field({ kind: 'quantity', unit: 'kW', qualifierRequired: true, qualifiers: ['cooling_output'] });
    const ambiguous = found('test-amb', tender, {
      quantity: { value: 1500, unit: 'kW', qualifier: 'cooling_output' },
      alternatives: [{ value: 1.5, unit: 'kW', qualifier: 'cooling_output' }, { value: 1500, unit: 'kW', qualifier: 'cooling_output' }],
      confidence: 'low',
    }, 0);
    const state = derive(capacity, [ambiguous], none, context);
    expect(state).toMatchObject({ state: 'known', activeCandidateId: null, provisional: true });
    expect(state.facts).toEqual([expect.objectContaining({ ambiguous: true, activeCandidateId: null, candidateIds: [ambiguous.id] })]);
    // Alternatives that read the same value are no ambiguity.
    const plain = found('test-plain', tender, { quantity: { value: 1500, unit: 'kW', qualifier: 'cooling_output' }, alternatives: [{ value: 1500, unit: 'kW' }] }, 0);
    expect(derive(capacity, [plain], none, context)).toMatchObject({ state: 'known', activeCandidateId: plain.id });
    // A calculation that read the ambiguous value is stale: it has no single input value.
    const readIt: DeriveContext = { ...context, inputState: (id) => (id === ambiguous.id ? state : undefined) };
    const calculated: Candidate = {
      id: 'test-calc-cap',
      subjectId: SUBJECT,
      fieldKey: FIELD_KEY,
      quantity: { value: 3000, unit: 'kW', qualifier: 'cooling_output' },
      source: 'calculated',
      evidence: [],
      method: { formulaId: 'TEST-sum', formulaVersion: '1.0.0', inputCandidateIds: [ambiguous.id], unknownPolicy: 'refuse', assumptions: [] },
      createdBy: 'test-engine',
      createdAt: time(5),
    };
    expect(derive(capacity, [calculated], none, readIt)).toMatchObject({ stale: true, provisional: true });
  });

  test("a document value needs an entry whose check matched at its location; 'unverifiable' alone makes none (medium)", () => {
    const area = field({ kind: 'quantity', unit: 'm2', qualifierRequired: true, qualifiers: ['gross_total'] });
    const unverifiable = found('test-unverifiable', tender, { quantity: { value: 900, unit: 'm2', qualifier: 'gross_total' } }, 0, 'unverifiable');
    const state = derive(area, [unverifiable], none, context);
    expect(state.state).toBe('unknown');
    expect(statusOf(state, unverifiable.id)).toMatchObject({ status: 'refused', refusal: 'unverified_evidence' });
    // An inference on unverifiable evidence stands only at low confidence (rule 1).
    const types = field({ kind: 'enum' });
    const inferred = (confidence: Candidate['confidence']): Candidate => ({
      ...found(`test-inferred-${String(confidence)}`, tender, { choice: 'ahu', ...(confidence === undefined ? {} : { confidence }) }, 0, 'unverifiable'),
      source: 'ai_inference',
    });
    expect(statusOf(derive(types, [inferred('high')], none, context), 'test-inferred-high')).toMatchObject({ refusal: 'confidence_above_cap' });
    expect(derive(types, [inferred('low')], none, context).state).toBe('known');
  });

  describe('resolution coverage is the set the resolution names (medium)', () => {
    const floors = field({ kind: 'count', unit: 'count', qualifierRequired: true, qualifiers: ['upper_floors'] });
    const a = found('test-a', tender, { quantity: { value: 12, unit: 'count', qualifier: 'upper_floors' } }, 0);
    const b = found('test-b', tender, { quantity: { value: 14, unit: 'count', qualifier: 'upper_floors' } }, 1);
    const resolution = (at: string, covered: readonly string[] | undefined): FieldEvent => ({
      subjectId: SUBJECT,
      fieldKey: FIELD_KEY,
      type: 'conflict_resolved',
      by: 'test-owner',
      role: 'owner',
      at,
      reason: 'TEST: the owner knows',
      chosenCandidateId: b.id,
      ...(covered === undefined ? {} : { coveredCandidateIds: covered }),
    });

    test('a candidate created before the resolution but outside its covered set reopens the conflict', () => {
      const late: Candidate = { ...found('test-late', tender, { quantity: { value: 20, unit: 'count', qualifier: 'upper_floors' } }, 0), createdAt: time(4) };
      const state = derive(floors, [a, b, late], { ...none, field: [resolution(time(5), [a.id, b.id])] }, context);
      expect(state.state).toBe('conflict');
      expect(state.conflict?.candidateIds).toEqual([b.id, late.id]);
    });

    test('a candidate created within the same millisecond after the resolution is not covered, even if named', () => {
      const late: Candidate = { ...found('test-late', tender, { quantity: { value: 20, unit: 'count', qualifier: 'upper_floors' } }, 0), createdAt: '2026-09-25T09:05:00.000800Z' };
      const state = derive(floors, [a, b, late], { ...none, field: [resolution('2026-09-25T09:05:00.000500Z', [a.id, b.id, late.id])] }, context);
      expect(state.state).toBe('conflict');
      expect(state.conflict?.candidateIds).toEqual([b.id, late.id]);
    });

    test('a resolution without its covered set covers nothing, and is listed as refused', () => {
      const event = resolution(time(5), undefined);
      const state = derive(floors, [a, b], { ...none, field: [event] }, context);
      expect(state.state).toBe('conflict');
      expect(state.refusedEvents).toEqual([{ kind: 'field', event, refusal: 'resolution_incomplete' }]);
    });

    test('a resolution by someone the conflict is not routed to is listed as refused', () => {
      const engineerField = field({ kind: 'count', unit: 'count', qualifierRequired: true, qualifiers: ['upper_floors'], confirmBy: 'engineer' });
      const event = resolution(time(5), [a.id, b.id]);
      const state = derive(engineerField, [a, b], { ...none, field: [event] }, context);
      expect(state.state).toBe('conflict');
      expect(state.refusedEvents).toEqual([{ kind: 'field', event, refusal: 'resolver_not_routed' }]);
    });
  });

  test('a calculated candidate that read no input is refused: a count of 0 over nothing is not a value (low)', () => {
    const ahuCount = field({ kind: 'count', unit: 'count', qualifierRequired: true, qualifiers: ['ahu'] });
    const empty: Candidate = {
      id: 'test-calc-empty',
      subjectId: SUBJECT,
      fieldKey: FIELD_KEY,
      quantity: { value: 0, unit: 'count', qualifier: 'ahu' },
      source: 'calculated',
      evidence: [],
      method: { formulaId: 'TEST-count', formulaVersion: '1.0.0', inputCandidateIds: [], unknownPolicy: 'refuse', assumptions: [] },
      createdBy: 'test-engine',
      createdAt: time(0),
    };
    const state = derive(ahuCount, [empty], none, context);
    expect(state.state).toBe('unknown');
    expect(statusOf(state, empty.id)).toMatchObject({ status: 'refused', refusal: 'no_inputs' });
  });

  describe("an owner's rejection on an engineer or for_quotation field holds only with the owner's own value (low)", () => {
    const capacity = (entry: Partial<FieldDefinition>) =>
      field({ kind: 'quantity', unit: 'kW', qualifierRequired: true, qualifiers: ['cooling_output'], confirmBy: 'engineer', ...entry });
    const shown = found('test-shown', tender, { quantity: { value: 640, unit: 'kW', qualifier: 'cooling_output' } }, 0);
    const rejection: CandidateEvent = { candidateId: shown.id, type: 'rejected', by: 'test-owner', role: 'owner', at: time(10) };

    test('alone, it is the owner\'s note: the value stays eligible and goes to the engineer queue', () => {
      for (const entry of [{ confirmBy: 'engineer' as const }, { confirmBy: 'owner' as const, criticality: 'for_quotation' as const }]) {
        const state = derive(capacity(entry), [shown], { ...none, candidate: [rejection] }, context);
        expect(state).toMatchObject({ state: 'known', activeCandidateId: shown.id, review: { list: 'sovitech_will_check', reason: 'owner_correction' } });
        expect(state.refusedEvents).toEqual([{ kind: 'candidate', event: rejection, refusal: 'owner_rejection_without_value' }]);
      }
    });

    test("with the owner's later value for the same fact, it is a correction", () => {
      const own = entered('test-own', { quantity: { value: 700, unit: 'kW', qualifier: 'cooling_output' } }, 10);
      const state = derive(capacity({}), [shown, own], { ...none, candidate: [rejection] }, context);
      expect(state).toMatchObject({ state: 'known', activeCandidateId: own.id, review: { list: 'sovitech_will_check', reason: 'owner_correction' } });
      expect(statusOf(state, shown.id)?.status).toBe('rejected');
      // Someone else's value, or one entered before the value it would correct, does not pair.
      for (const other of [
        entered('test-other', { quantity: { value: 700, unit: 'kW', qualifier: 'cooling_output' } }, 10, 'test-someone-else'),
        { ...own, createdAt: '2026-09-25T08:00:00.000Z' },
      ]) {
        expect(statusOf(derive(capacity({}), [shown, other], { ...none, candidate: [rejection] }, context), shown.id)?.status).not.toBe('rejected');
      }
    });

    test('a correction typed in another unit pairs too: the owner is not asked about the value they just gave', () => {
      const forQuotation = capacity({ confirmBy: 'owner', criticality: 'for_quotation' });
      const shownState = derive(forQuotation, [shown], none, context);
      const plan = planOwnerCorrection({
        projectId: 'test-project',
        field: forQuotation,
        state: shownState,
        shown,
        value: { quantity: { value: 0.7, unit: 'MW' } },
        candidateId: 'test-own-mw',
        by: 'test-owner',
        at: time(10),
      });
      expect(plan.candidate.quantity?.qualifier).toBeUndefined();
      const state = derive(forQuotation, [shown, plan.candidate], { ...none, candidate: plan.candidateEvents }, context);
      expect(state).toMatchObject({ state: 'known', activeCandidateId: plan.candidate.id, review: { list: 'sovitech_will_check', reason: 'owner_correction' } });
      expect(state.conflicts).toEqual([]);
    });

    test('on an owner field the owner rejects without a value of their own', () => {
      const state = derive(capacity({ confirmBy: 'owner' }), [shown], { ...none, candidate: [rejection] }, context);
      expect(state.state).toBe('unknown');
      expect(statusOf(state, shown.id)?.status).toBe('rejected');
    });
  });

  describe('resolutions apply to a value with an unknown qualifier too (low)', () => {
    const floors = field({ kind: 'count', unit: 'count', qualifierRequired: true, qualifiers: ['upper_floors', 'below_ground'] });
    const upper = found('test-upper', tender, { quantity: { value: 30, unit: 'count', qualifier: 'upper_floors' } }, 0);
    const below = found('test-below', tender, { quantity: { value: 8, unit: 'count', qualifier: 'below_ground' } }, 0);
    const own = entered('test-own', { quantity: { value: 28, unit: 'count' } }, 2);
    const all = [upper, below, own];
    const resolution = (chosen: string, covered: readonly string[]): FieldEvent => ({
      subjectId: SUBJECT,
      fieldKey: FIELD_KEY,
      type: 'conflict_resolved',
      by: 'test-owner',
      role: 'owner',
      at: time(10),
      reason: 'TEST: the owner meant the upper floors',
      chosenCandidateId: chosen,
      coveredCandidateIds: covered,
    });

    test('unresolved, the value that matches no reading is a conflict', () => {
      expect(derive(floors, all, none, context).conflict?.kind).toBe('unqualified_matches_none');
    });

    test('choosing a qualified reading sets the unqualified value aside with that fact', () => {
      const state = derive(floors, all, { ...none, field: [resolution(upper.id, [upper.id, below.id, own.id])] }, context);
      expect(state.state).toBe('known');
      expect(state.facts.find((fact) => fact.qualifier === 'upper_floors')?.setAsideIds).toEqual([own.id]);
      expect(statusOf(state, own.id)?.status).toBe('eligible');
    });

    test('choosing the unqualified value keeps it as a fact of its own only while every compared reading was seen', () => {
      const kept = derive(floors, all, { ...none, field: [resolution(own.id, [upper.id, below.id, own.id])] }, context);
      expect(kept.state).toBe('known');
      expect(kept.facts.map((fact) => fact.qualifier)).toEqual([null, 'below_ground', 'upper_floors']);
      // A later reading that agrees with its own fact was not seen: the value is compared again.
      const later = found('test-later', tender, { quantity: { value: 8, unit: 'count', qualifier: 'below_ground' } }, 1);
      const reopened = derive(floors, [...all, later], { ...none, field: [resolution(own.id, [upper.id, below.id, own.id])] }, context);
      expect(reopened.state).toBe('conflict');
      expect(reopened.conflicts.map((conflict) => conflict.kind)).toEqual(['unqualified_matches_none']);
    });
  });
});

describe('derive: the phase 1 round 3 attacks', () => {
  const none: DeriveEvents = { candidate: [], field: [], document: [] };
  const context = contextOf(new Map(), false);
  const asBuilt = documents[0];
  if (asBuilt === undefined) throw new Error('fixture has documents');
  const field = (entry: Partial<FieldDefinition> & Pick<FieldDefinition, 'kind'>): FieldDefinition => ({
    key: FIELD_KEY,
    label: 'TEST field',
    subject: 'project',
    estimation: 'forbidden',
    criticality: 'optional',
    affects: [],
    impactRank: 1,
    confirmBy: 'owner',
    ...entry,
  });
  type Rest = Omit<Candidate, 'id' | 'subjectId' | 'fieldKey' | 'source' | 'evidence' | 'createdBy' | 'createdAt'>;
  const entered = (id: string, rest: Rest, minute: number, by = 'test-owner'): Candidate => ({
    id,
    subjectId: SUBJECT,
    fieldKey: FIELD_KEY,
    source: 'user',
    evidence: [],
    createdBy: by,
    authorRole: by === 'test-owner' ? 'owner' : 'sovitech_engineer',
    createdAt: time(minute),
    ...rest,
  });
  const found = (id: string, rest: Rest, minute: number, source: 'document' | 'ai_inference' = 'document'): Candidate => ({
    id,
    subjectId: SUBJECT,
    fieldKey: FIELD_KEY,
    source,
    evidence: [{ documentId: asBuilt.id, contentHash: asBuilt.contentHash, locator: { page: 1 }, excerpt: 'TEST', check: 'text_match' }],
    ...(source === 'ai_inference' ? { confidence: 'low' as const } : {}),
    createdBy: 'test-extractor',
    createdAt: time(minute),
    ...rest,
  });
  const answered = (candidate: Candidate): CandidateEvent => ({ candidateId: candidate.id, type: 'user_confirmed', by: candidate.createdBy, role: 'owner', at: candidate.createdAt });
  const rejection = (candidate: Candidate, role: CandidateEvent['role'], minute: number, by = 'test-engineer'): CandidateEvent => ({
    candidateId: candidate.id,
    type: 'rejected',
    by,
    role,
    at: time(minute),
    reason: 'TEST reason',
  });
  const statusOf = (state: FieldState, id: string) => state.candidates.find((candidate) => candidate.candidateId === id);
  const refusalsOf = (state: FieldState) => state.refusedEvents.map((refused) => refused.refusal);

  const fireSafety = field({ kind: 'decision', options: ['include', 'exclude'], confirmByBasis: 'owner_choice' });
  const projectType = field({ kind: 'enum', options: ['TEST-type-a', 'TEST-type-b'], confirmByBasis: 'owner_choice', criticality: 'required' });

  describe('an engineer never takes the owner\'s choice away (rule 3, "Choices belong to the owner"; adversarial X1)', () => {
    test('an engineer\'s rejection of the owner\'s "exclude" is refused, and the owner\'s choice stays the value', () => {
      const owners = entered('test-owner-choice', { choice: 'exclude' }, 1);
      const state = derive(fireSafety, [owners], { ...none, candidate: [answered(owners), rejection(owners, 'sovitech_engineer', 2)] }, context);
      expect(state.state).toBe('known');
      expect(state.activeCandidateId).toBe(owners.id);
      expect(statusOf(state, owners.id)).toMatchObject({ status: 'eligible', verification: 'user_confirmed' });
      expect(refusalsOf(state)).toEqual(['engineer_overrules_owner_choice']);
      expect(state.review).toBeNull();
    });

    test('control: the owner changes their own choice, and an engineer\'s rejection still holds on a fact', () => {
      const first = entered('test-owner-first', { choice: 'include' }, 1);
      const second = entered('test-owner-second', { choice: 'exclude' }, 3);
      const changed = derive(fireSafety, [first, second], { ...none, candidate: [answered(first), answered(second), rejection(first, 'owner', 3, 'test-owner')] }, context);
      expect(changed.activeCandidateId).toBe(second.id);
      expect(statusOf(changed, first.id)?.status).toBe('rejected');

      const buildingType = field({ kind: 'enum', options: ['TEST-type-a'], confirmByBasis: 'use_and_occupancy', subject: 'building' });
      const inferred = found('test-inferred-type', { choice: 'TEST-type-a' }, 1, 'ai_inference');
      const rejected = derive(buildingType, [inferred], { ...none, candidate: [rejection(inferred, 'sovitech_engineer', 2)] }, context);
      expect(statusOf(rejected, inferred.id)?.status).toBe('rejected');
      expect(refusalsOf(rejected)).toEqual([]);
    });

    test('property: no rejection by an engineer or the system changes an owner-choice field', () => {
      fc.assert(
        fc.property(
          fc.constant(fireSafety),
          fc.array(fc.tuple(fc.constantFrom('a', 'b'), fc.integer({ min: 0, max: 20 })), { minLength: 1, maxLength: 4 }),
          fc.array(fc.tuple(fc.nat(), fc.constantFrom<CandidateEvent['role']>('sovitech_engineer', 'system'), fc.integer({ min: 0, max: 30 })), {
            minLength: 1,
            maxLength: 4,
          }),
          (choiceField, answers, rejections) => {
            const options = choiceField.options ?? [];
            const candidates = answers.map(([pick, minute], index) =>
              entered(`test-owner-${String(index)}`, { choice: pick === 'a' ? (options[0] ?? '') : (options[1] ?? '') }, minute),
            );
            const events: DeriveEvents = { ...none, candidate: candidates.map(answered) };
            const extra = rejections.map(([index, role, minute]) => {
              const target = candidates[index % candidates.length];
              if (target === undefined) throw new Error('candidates is not empty');
              return rejection(target, role, minute);
            });
            const before = derive(choiceField, candidates, events, context);
            const after = derive(choiceField, candidates, { ...events, candidate: [...events.candidate, ...extra] }, context);
            expect(after.candidates).toEqual(before.candidates);
            expect(after.state).toBe(before.state);
            expect(after.activeCandidateId).toBe(before.activeCandidateId);
            expect(after.facts).toEqual(before.facts);
          },
        ),
        { numRuns: 200 },
      );
    });
  });

  describe('pinned until the approver decides P-1-CHOICE-ENGINEER-EVENT (not a reading derive may change alone)', () => {
    test('today an engineer_verified event on the owner\'s older answer outranks the owner\'s later answer on a choice field', () => {
      const older = entered('test-owner-include', { choice: 'include' }, 1);
      const later = entered('test-owner-exclude', { choice: 'exclude' }, 5);
      const verification: CandidateEvent = { candidateId: older.id, type: 'engineer_verified', by: 'test-engineer', role: 'sovitech_engineer', at: time(3) };
      const withdrawnByOwner = rejection(older, 'owner', 5, 'test-owner');
      expect(derive(fireSafety, [older, later], { ...none, candidate: [answered(older), answered(later)] }, context).activeCandidateId).toBe(later.id);
      const state = derive(fireSafety, [older, later], { ...none, candidate: [answered(older), answered(later), verification, withdrawnByOwner] }, context);
      // 2.4 ranks verification first, and rule 4 refuses the owner's rejection of an engineer_verified value.
      expect(state.activeCandidateId).toBe(older.id);
      expect(refusalsOf(state)).toEqual(['owner_overrules_engineer']);
    });
  });

  describe('pinned until the approver decides P-1-OWNER-CHOICE-BASIS (not a reading derive may change alone)', () => {
    // Rule 3 names the choices (systems, goals, automation areas, occupancy or schedule); it does not name the
    // project type. Round 3 read the registry's `confirmByBasis: owner_choice` in derive (ADR 0016 decision 20), which
    // showed fewer "Two values" labels than rule 4 as written; round 4 reverted it, so today's reading is rule 4's.
    test('today a document or an AI inference that disagrees with the owner\'s project type puts the field in conflict, routed to the owner', () => {
      const owners = entered('test-owner-type', { choice: 'TEST-type-a' }, 1);
      const inferred = found('test-inferred', { choice: 'TEST-type-b' }, 2, 'ai_inference');
      const read = found('test-read', { choice: 'TEST-type-b' }, 3);
      for (const other of [inferred, read]) {
        const state = derive(projectType, [owners, other], { ...none, candidate: [answered(owners)] }, context);
        expect(state.state, other.source).toBe('conflict');
        expect(state.activeCandidateId, other.source).toBeNull();
        expect(state.conflict, other.source).toMatchObject({ kind: 'values_differ', routedTo: 'owner', candidateIds: [owners.id, other.id].sort() });
        expect(statusOf(state, other.id), other.source).toMatchObject({ status: 'eligible', refusal: null });
        expect(state.review, other.source).toEqual({ list: 'for_you', reason: 'conflict' });
      }
    });

    test('today an engineer\'s rejection of the owner\'s project type holds, as on any fact the owner confirms (see also P-1-OWNER-FACT-REJECTION)', () => {
      const owners = entered('test-owner-type', { choice: 'TEST-type-a' }, 1);
      const state = derive(projectType, [owners], { ...none, candidate: [answered(owners), rejection(owners, 'sovitech_engineer', 2)] }, context);
      expect(statusOf(state, owners.id)?.status).toBe('rejected');
      expect(refusalsOf(state)).toEqual([]);
    });

    test('control: a decision field still takes only the owner\'s own answer', () => {
      const owners = entered('test-owner-scope', { choice: 'exclude' }, 1);
      const read = found('test-read-scope', { choice: 'include' }, 2);
      const state = derive(fireSafety, [owners, read], { ...none, candidate: [answered(owners)] }, context);
      expect(state).toMatchObject({ state: 'known', activeCandidateId: owners.id });
      expect(statusOf(state, read.id)).toMatchObject({ status: 'refused', refusal: 'choice_not_owner' });
    });
  });

  describe('value shapes (2.6 kinds; adversarial X4 and X5)', () => {
    const rooms = field({ kind: 'count', unit: 'count', qualifiers: ['guest_rooms'], subject: 'building', confirmBy: 'engineer' });
    const count = (id: string, value: number, alternative?: number): Candidate =>
      entered(id, { quantity: { value, unit: 'count', qualifier: 'guest_rooms' }, ...(alternative === undefined ? {} : { alternatives: [{ value: alternative, unit: 'count' }] }) }, 1);

    test('a count that is not a whole number of zero or more, in its value or an alternative reading, is refused', () => {
      for (const candidate of [count('test-fraction', 2.5), count('test-negative', -3), count('test-alt-fraction', 3, 3.5), count('test-alt-negative', 3, -1)]) {
        const state = derive(rooms, [candidate], none, context);
        expect(state.state, candidate.id).toBe('unknown');
        expect(statusOf(state, candidate.id), candidate.id).toMatchObject({ status: 'refused', refusal: 'value_shape' });
      }
    });

    test('control: 0 and a whole count stand (a count of 0 from a person is a value: rule 1, "Zero is a value")', () => {
      for (const candidate of [count('test-zero', 0), count('test-whole', 7), count('test-ambiguous-whole', 1, 1500)]) {
        expect(statusOf(derive(rooms, [candidate], none, context), candidate.id)?.status, candidate.id).toBe('eligible');
      }
    });

    test('a choice outside the options the field lists is refused; a field without options takes any key', () => {
      const enumField = field({ kind: 'enum', options: ['TEST-type-a'], subject: 'building' });
      const outside = entered('test-outside', { choice: 'TEST-not-an-option' }, 1);
      expect(statusOf(derive(enumField, [outside], none, context), outside.id)).toMatchObject({ status: 'refused', refusal: 'value_shape' });
      const maybe = entered('test-maybe', { choice: 'maybe' }, 1);
      expect(statusOf(derive(fireSafety, [maybe], none, context), maybe.id)).toMatchObject({ status: 'refused', refusal: 'value_shape' });
      const open = field({ kind: 'enum', subject: 'building' });
      expect(statusOf(derive(open, [outside], none, context), outside.id)?.status).toBe('eligible');
    });
  });

  describe('formula and dataset lookups (2.1; 2.4 "Formula versions are immutable"; section 10; prompt 3 5.4)', () => {
    const points = field({ kind: 'count', unit: 'count', qualifiers: ['hardware_io'], subject: 'building', confirmBy: 'engineer', estimation: 'allowed' });
    const inputs = new Map([['test-input-0', inputState('test-input-0', false)]]);
    const worked = (id: string, source: 'calculated' | 'estimated', formulaId: string, formulaVersion = '1.0.0'): Candidate => ({
      id,
      subjectId: SUBJECT,
      fieldKey: FIELD_KEY,
      quantity: { value: 9001, unit: 'count', qualifier: 'hardware_io' },
      source,
      evidence: [],
      method: { formulaId, formulaVersion, inputCandidateIds: ['test-input-0'], unknownPolicy: 'refuse', assumptions: [] },
      ...(source === 'estimated' ? { range: { low: 9000, high: 9002 } } : {}),
      createdBy: 'test-engine',
      createdAt: time(1),
    });
    const production = declaredFormulaLookup([
      { id: 'pointsEstimate', version: '1' },
      { id: 'TEST-points', version: '1.0.0' },
    ]);

    test('a calculated or estimated candidate from an undeclared formula, another version, or with no lookup, is refused', () => {
      const declared: DeriveContext = { ...contextOf(inputs, false), formulaDeclared: production };
      const undeclared: DeriveContext = contextOf(inputs, false, 'undeclared');
      for (const source of ['calculated', 'estimated'] as const) {
        expect(statusOf(derive(points, [worked('test-a', source, 'pointsEstimate', '1')], none, declared), 'test-a')?.status, source).toBe('eligible');
        for (const [candidate, lookup] of [
          [worked('test-b', source, 'TEST-forged', '9.9.9'), declared],
          [worked('test-c', source, 'pointsEstimate', '2'), declared],
          [worked('test-d', source, 'pointsEstimate', '1'), undeclared],
          [worked('test-e', source, 'pointsEstimate', ''), declared],
        ] as const) {
          const state = derive(points, [candidate], none, lookup);
          expect(state.state, `${source} ${candidate.id}`).toBe('unknown');
          expect(statusOf(state, candidate.id), `${source} ${candidate.id}`).toMatchObject({ status: 'refused', refusal: 'unknown_formula' });
        }
      }
    });

    test('the registry\'s lookup never declares a TEST formula, even one it lists (outside the test runner)', () => {
      expect(production('TEST-points', '1.0.0')).toBe(false);
      expect(production('pointsEstimate', '1')).toBe(true);
      const state = derive(points, [worked('test-f', 'calculated', 'TEST-points')], none, { ...contextOf(inputs, false), formulaDeclared: production });
      expect(statusOf(state, 'test-f')).toMatchObject({ status: 'refused', refusal: 'unknown_formula' });
    });

    test('a reference candidate from an approved dataset the field does not list is refused; the lookup sees the field', () => {
      const reference = (dataset: string): Candidate => ({
        id: `test-ref-${dataset}`,
        subjectId: SUBJECT,
        fieldKey: FIELD_KEY,
        quantity: { value: 9003, unit: 'count', qualifier: 'hardware_io' },
        source: 'reference',
        evidence: [],
        reference: { dataset, version: '1', key: 'TEST-key' },
        createdBy: 'test-code',
        createdAt: time(1),
      });
      const listed = { ...points, referenceDatasets: ['TEST-dataset-listed'] };
      const seen: string[] = [];
      const approvedAll: DeriveContext = {
        ...context,
        datasetApproved: (_reference, forField) => {
          seen.push(forField.key);
          return true;
        },
      };
      expect(statusOf(derive(listed, [reference('TEST-dataset-other')], none, approvedAll), 'test-ref-TEST-dataset-other')).toMatchObject({
        status: 'refused',
        refusal: 'dataset_not_for_field',
      });
      expect(statusOf(derive(points, [reference('TEST-dataset-listed')], none, approvedAll), 'test-ref-TEST-dataset-listed')?.refusal).toBe('dataset_not_for_field');
      expect(statusOf(derive(listed, [reference('TEST-dataset-listed')], none, approvedAll), 'test-ref-TEST-dataset-listed')?.status).toBe('eligible');
      expect(seen).toContain(FIELD_KEY);
      // With no approval record the refusal stays G1-12's.
      expect(statusOf(derive(listed, [reference('TEST-dataset-listed')], none, context), 'test-ref-TEST-dataset-listed')?.refusal).toBe('unapproved_dataset');
    });
  });

  describe('skips and analysis runs from the right role (2.4 Field states; rule 7; rule 12; adversarial X3)', () => {
    const buildingType = field({ kind: 'enum', options: ['TEST-type-a'], subject: 'building' });
    const fieldEvent = (type: FieldEvent['type'], role: FieldEvent['role'], minute: number, by = 'test-actor'): FieldEvent => ({
      subjectId: SUBJECT,
      fieldKey: FIELD_KEY,
      type,
      by,
      role,
      at: time(minute),
    });

    test('a skip from the system or an engineer is refused: the owner never chose Skip for now', () => {
      for (const role of ['system', 'sovitech_engineer'] as const) {
        const state = derive(buildingType, [], { ...none, field: [fieldEvent('skipped', role, 1)] }, context);
        expect(state.state, role).toBe('unknown');
        expect(refusalsOf(state), role).toEqual(['skip_not_owner']);
      }
      expect(derive(buildingType, [], { ...none, field: [fieldEvent('skipped', 'owner', 1, 'test-owner')] }, context).state).toBe('skipped');
      expect(refusalsOf(derive(buildingType, [], { ...none, field: [fieldEvent('skipped', 'owner', 1, '')] }, context))).toEqual(['by_missing']);
    });

    test('analysis runs count only from the system: an owner cannot start one forever, or finish one the system started', () => {
      const startedByOwner = derive(buildingType, [], { ...none, field: [fieldEvent('analysis_started', 'owner', 1)] }, context);
      expect(startedByOwner.state).toBe('unknown');
      expect(refusalsOf(startedByOwner)).toEqual(['analysis_not_system']);
      const finishedByOwner = derive(
        buildingType,
        [],
        { ...none, field: [fieldEvent('analysis_started', 'system', 1, 'test-job'), fieldEvent('analysis_finished', 'owner', 2)] },
        context,
      );
      expect(finishedByOwner.state).toBe('pending');
      expect(refusalsOf(finishedByOwner)).toEqual(['analysis_not_system']);
      const byEngineer = derive(buildingType, [], { ...none, field: [fieldEvent('analysis_started', 'sovitech_engineer', 1)] }, context);
      expect(byEngineer.state).toBe('unknown');
    });
  });

  describe('units of one dimension (pinned until the approver decides P-1-UNIT-FACTORS; reverify, Speed)', () => {
    const cooling = field({ kind: 'quantity', unit: 'kW', qualifiers: ['cooling_output'], subject: 'asset' });
    const reading = (id: string, value: number, unit: string, qualifier: string | undefined, minute: number): Candidate =>
      entered(id, { quantity: { value, unit, ...(qualifier === undefined ? {} : { qualifier }) } }, minute);

    test('derive converts nothing: 1.2 MW and 1,200 kW are compared as two units, whether or not they are equal', () => {
      const unqualified = derive(cooling, [reading('test-mw', 1.2, 'MW', undefined, 1), reading('test-kw', 1200, 'kW', 'cooling_output', 2)], none, context);
      expect(unqualified.conflicts.map((conflict) => conflict.kind)).toEqual(['unqualified_matches_none']);
      for (const megawatts of [1.2, 1.3]) {
        const qualified = derive(cooling, [reading('test-mw', megawatts, 'MW', 'cooling_output', 1), reading('test-kw', 1200, 'kW', 'cooling_output', 2)], none, context);
        expect(qualified.conflicts.map((conflict) => conflict.kind), String(megawatts)).toEqual(['units_differ']);
      }
    });
  });
});

/**
 * The phase 1 review, round 4 (NEW-A from round 3's closing verification, and the gap found at integration of round 3),
 * each reproduced with TEST data first (scratchpad build/fix4/probe-domain.before.json) and refused.
 */
describe('derive: the phase 1 round 4 fixes', () => {
  const tender = documents[1];
  const asBuilt = documents[0];
  if (tender === undefined || asBuilt === undefined) throw new Error('fixture has documents');
  const context = contextOf(new Map(), false);
  const none: DeriveEvents = { candidate: [], field: [], document: [] };
  const field = (entry: Partial<FieldDefinition> & Pick<FieldDefinition, 'kind'>): FieldDefinition => ({
    key: FIELD_KEY,
    label: 'TEST field',
    subject: 'building',
    estimation: 'forbidden',
    criticality: 'optional',
    affects: [],
    impactRank: 1,
    confirmBy: 'owner',
    ...entry,
  });
  type Rest = Omit<Candidate, 'id' | 'subjectId' | 'fieldKey' | 'source' | 'evidence' | 'createdBy' | 'createdAt' | 'authorRole'>;
  const found = (id: string, document: DocumentRecord, rest: Rest, minute: number): Candidate => ({
    id,
    subjectId: SUBJECT,
    fieldKey: FIELD_KEY,
    source: 'document',
    evidence: [{ documentId: document.id, contentHash: document.contentHash, locator: { page: 1 }, excerpt: 'TEST', check: 'text_match' }],
    createdBy: 'test-extractor',
    authorRole: 'system',
    createdAt: time(minute),
    ...rest,
  });
  const entered = (id: string, rest: Rest, minute: number, author: 'owner' | 'sovitech_engineer' | undefined): Candidate => ({
    id,
    subjectId: SUBJECT,
    fieldKey: FIELD_KEY,
    source: 'user',
    evidence: [],
    createdBy: author === 'sovitech_engineer' ? 'test-engineer' : 'test-owner',
    ...(author === undefined ? {} : { authorRole: author }),
    createdAt: time(minute),
    ...rest,
  });
  const statusOf = (state: FieldState, id: string) => state.candidates.find((candidate) => candidate.candidateId === id);

  /**
   * Round 4 (NEW-A) found a job's service account's document withdrawal read as a deletion; round 4's fix held every
   * withdrawal to the owner, which refused the engineers 2.3's `DocumentEvent` names; round 5 corrected that. The
   * situation round 4 indexed as G4-32 (tender 6 against as-built 5, the as-built document withdrawn by the job) is
   * proven here and at the store (packages/db/src/access.test.ts); its section 7 row was taken back in round 5
   * because its expected result rests on a reading (ADR 0016 decision 21).
   */
  describe('a document is withdrawn by the owner or an engineer, by the system only for a person\'s withdrawal it names, and erased by the owner or the erasure function (2.3; rule 13; rule 4)', () => {
    const ahuCount = field({ kind: 'count', unit: 'count', qualifierRequired: true, qualifiers: ['ahu'], confirmBy: 'engineer' });
    const fromTender = found('test-tender-ahu', tender, { quantity: { value: 6, unit: 'count', qualifier: 'ahu' } }, 0);
    const fromAsBuilt = found('test-asbuilt-ahu', asBuilt, { quantity: { value: 5, unit: 'count', qualifier: 'ahu' } }, 0);
    const both = [fromTender, fromAsBuilt];
    const removal = (
      type: 'withdrawn' | 'erased',
      role: DocumentEvent['role'],
      reason: string | undefined,
      by = `test-${role}`,
      extra: Pick<DocumentEvent, 'id' | 'requestEventId'> = {},
      minute = 30,
    ): DocumentEvent => ({
      documentId: asBuilt.id,
      type,
      by,
      role,
      at: time(minute),
      ...(reason === undefined ? {} : { reason }),
      ...extra,
    });
    const followUp: CandidateEvent = { candidateId: fromAsBuilt.id, type: 'withdrawn', by: 'test-job', role: 'system', at: time(31), reason: 'document_deleted' };
    const expectConflictForTheEngineer = (state: FieldState, label: string): void => {
      expect(state.state, label).toBe('conflict');
      expect(state.activeCandidateId, label).toBeNull();
      expect(state.conflict?.routedTo, label).toBe('engineer');
      expect(state.review, label).toEqual({ list: 'sovitech_will_check', reason: 'conflict' });
      expect(statusOf(state, fromAsBuilt.id)?.status, label).toBe('eligible');
      expect(state.statusLines, label).toEqual([]);
    };

    test('a withdrawal by the job with no person\'s withdrawal behind it, or an erasure outside the erasure function, removes nothing: the conflict stays for the engineer', () => {
      for (const [appended, refusal] of [
        [removal('withdrawn', 'system', 'TEST'), 'withdrawal_without_request'],
        [removal('withdrawn', 'system', 'document_deleted'), 'withdrawal_without_request'],
        [removal('withdrawn', 'system', 'document_erased'), 'withdrawal_without_request'],
        [removal('withdrawn', 'system', 'document_deleted', 'test-job', { id: 'test-job-event', requestEventId: 'test-event-missing' }), 'withdrawal_without_request'],
        [removal('erased', 'system', 'TEST'), 'erasure_outside_function'],
        [removal('erased', 'system', undefined), 'erasure_outside_function'],
        [removal('erased', 'sovitech_engineer', 'document_erased'), 'erasure_outside_function'],
        [removal('withdrawn', 'owner', 'TEST', ''), 'by_missing'],
        [removal('withdrawn', 'sovitech_engineer', 'TEST', ''), 'by_missing'],
      ] as const) {
        const label = `${appended.type}/${appended.role}/${appended.reason ?? '-'}/${appended.by}/${appended.requestEventId ?? '-'}`;
        const state = derive(ahuCount, both, { ...none, document: [appended], candidate: [followUp] }, context);
        expectConflictForTheEngineer(state, label);
        expect(state.refusedEvents, label).toEqual([
          { kind: 'candidate', event: followUp, refusal: 'withdrawn_not_removal' },
          { kind: 'document', event: appended, refusal },
        ]);
      }
    });

    test('controls: the owner\'s or an engineer\'s own withdrawal, the job carrying either out, the owner\'s erasure and the erasure function\'s remove the document', () => {
      const byOwner = removal('withdrawn', 'owner', undefined, 'test-owner', { id: 'test-event-owner' });
      const byEngineer = removal('withdrawn', 'sovitech_engineer', 'TEST', 'test-engineer', { id: 'test-event-engineer' });
      const job = (request: DocumentEvent): DocumentEvent =>
        removal('withdrawn', 'system', 'document_deleted', 'test-job', { id: `test-job-for-${request.id ?? ''}`, ...(request.id === undefined ? {} : { requestEventId: request.id }) }, 31);
      for (const appended of [
        [byOwner],
        [byEngineer],
        [byOwner, job(byOwner)],
        [byEngineer, job(byEngineer)],
        [removal('erased', 'owner', 'document_erased')],
        [removal('erased', 'system', 'document_erased')],
      ]) {
        const label = appended.map((event) => `${event.type}/${event.role}`).join(' ');
        const state = derive(ahuCount, both, { ...none, document: appended, candidate: [followUp] }, context);
        expect(statusOf(state, fromAsBuilt.id)?.status, label).toBe('withdrawn');
        expect(state, label).toMatchObject({ state: 'known', activeCandidateId: fromTender.id, refusedEvents: [] });
      }
    });

    test('a refused document event is listed only where a candidate of the field cites its document', () => {
      const state = derive(ahuCount, [fromTender], { ...none, document: [removal('withdrawn', 'system', 'TEST')] }, context);
      expect(state).toMatchObject({ state: 'known', activeCandidateId: fromTender.id, refusedEvents: [] });
    });

    test('property: no withdrawal by the job without a person\'s withdrawal of that document behind it, and no erasure outside the erasure function, changes a field', () => {
      const personal = removal('withdrawn', 'owner', undefined, 'test-owner', { id: 'test-event-owner-elsewhere' });
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              documentId: fc.constantFrom(...documents.map((document) => document.id)),
              type: fc.constantFrom<'withdrawn' | 'erased'>('withdrawn', 'erased'),
              role: fc.constantFrom<DocumentEvent['role']>('system', 'sovitech_engineer'),
              reason: fc.constantFrom<string | undefined>(undefined, 'TEST', 'document_deleted', 'document_erased'),
              // A job may name nothing, an id no event has, or a person's withdrawal of another document.
              request: fc.constantFrom<string | undefined>(undefined, 'test-event-missing', 'test-event-owner-elsewhere'),
              minute: fc.integer({ min: 0, max: 60 }),
            }),
            { minLength: 1, maxLength: 4 },
          ),
          fc.boolean(),
          (drawn, followed) => {
            const appended = drawn
              // The engineer's own withdrawal holds (2.3), and so does the erasure function's erasure: leave both out.
              .filter((entry) => !(entry.type === 'withdrawn' && entry.role === 'sovitech_engineer'))
              .filter((entry) => !(entry.type === 'erased' && entry.role === 'system' && entry.reason === 'document_erased'))
              .map(
                (entry, index): DocumentEvent => ({
                  documentId: entry.documentId,
                  type: entry.type,
                  by: `test-${entry.role}`,
                  role: entry.role,
                  at: time(entry.minute),
                  ...(entry.reason === undefined ? {} : { reason: entry.reason }),
                  ...(entry.type === 'withdrawn' && entry.request !== undefined ? { id: `test-drawn-${String(index)}`, requestEventId: entry.request } : {}),
                }),
              );
            // The owner's withdrawal of a document no candidate of this field cites, which a drawn job may name.
            const elsewhere: DocumentEvent = { ...personal, documentId: 'test-doc-elsewhere' };
            const followUps = followed ? both.map((candidate): CandidateEvent => ({ ...followUp, candidateId: candidate.id })) : [];
            const before = derive(ahuCount, both, { ...none, document: [elsewhere] }, context);
            const after = derive(ahuCount, both, { ...none, document: [elsewhere, ...appended], candidate: followUps }, context);
            expect(after.candidates).toEqual(before.candidates);
            expect(after.state).toBe(before.state);
            expect(after.facts).toEqual(before.facts);
            expect(after.conflicts).toEqual(before.conflicts);
            expect(after.review).toEqual(before.review);
            // Each one on a document the field's candidates cite is listed, and none other.
            const cited = new Set([tender.id, asBuilt.id]);
            const listed = after.refusedEvents.filter((refused) => refused.kind === 'document');
            expect(listed).toHaveLength(appended.filter((event) => cited.has(event.documentId)).length);
            expect(listed.every((refused) => refused.refusal === (refused.event.type === 'withdrawn' ? 'withdrawal_without_request' : 'erasure_outside_function'))).toBe(true);
          },
        ),
        { numRuns: 300 },
      );
    });
  });

  describe('an engineer\'s own `user` entry never sets the owner\'s decision (rule 3, "Choices belong to the owner"; 2.1; rule 11)', () => {
    const fireSafety = field({ kind: 'decision', subject: 'project', options: ['include', 'exclude'] });

    test('an engineer\'s own "include" on Fire Safety in scope is refused, and the field stays unknown', () => {
      const engineers = entered('test-engineer-include', { choice: 'include' }, 1, 'sovitech_engineer');
      const state = derive(fireSafety, [engineers], none, context);
      expect(state.state).toBe('unknown');
      expect(state.activeCandidateId).toBeNull();
      expect(state.candidates).toEqual([{ candidateId: engineers.id, verification: 'unverified', status: 'refused', refusal: 'choice_author_not_owner' }]);
    });

    test('an engineer\'s later entry never replaces the owner\'s answer, with or without its user_confirmed event', () => {
      for (const withEvent of [true, false]) {
        const owners = entered('test-owner-exclude', { choice: 'exclude' }, 1, 'owner');
        const engineers = entered('test-engineer-include', { choice: 'include' }, 5, 'sovitech_engineer');
        const events: DeriveEvents = withEvent ? { ...none, candidate: [{ candidateId: owners.id, type: 'user_confirmed', by: 'test-owner', role: 'owner', at: time(1) }] } : none;
        const state = derive(fireSafety, [owners, engineers], events, context);
        expect(state.activeCandidateId, String(withEvent)).toBe(owners.id);
        expect(statusOf(state, engineers.id), String(withEvent)).toMatchObject({ status: 'refused', refusal: 'choice_author_not_owner' });
      }
    });

    test('a `user` value that records no author role is never the owner\'s choice', () => {
      const unknownAuthor = entered('test-no-author', { choice: 'include' }, 1, undefined);
      expect(statusOf(derive(fireSafety, [unknownAuthor], none, context), unknownAuthor.id)).toMatchObject({ status: 'refused', refusal: 'choice_author_not_owner' });
    });

    test('controls: the owner\'s own answer sets the decision; an engineer\'s site entry on an engineer field stays a value (2.1)', () => {
      const owners = entered('test-owner-include', { choice: 'include' }, 1, 'owner');
      expect(derive(fireSafety, [owners], none, context)).toMatchObject({ state: 'known', activeCandidateId: owners.id });
      const ahuCount = field({ kind: 'count', unit: 'count', qualifiers: ['ahu'], confirmBy: 'engineer' });
      const site = entered('test-site-ahu', { quantity: { value: 5, unit: 'count', qualifier: 'ahu' } }, 1, 'sovitech_engineer');
      expect(derive(ahuCount, [site], none, context)).toMatchObject({ state: 'known', activeCandidateId: site.id });
    });

    test('property: an engineer\'s entries added to the owner\'s answers never change the decision', () => {
      fc.assert(
        fc.property(
          fc.array(fc.tuple(fc.constantFrom('include', 'exclude'), fc.integer({ min: 0, max: 30 })), { maxLength: 3 }),
          fc.array(fc.tuple(fc.constantFrom('include', 'exclude'), fc.integer({ min: 0, max: 30 })), { minLength: 1, maxLength: 3 }),
          (ownerAnswers, engineerEntries) => {
            const owners = ownerAnswers.map(([choice, minute], index) => entered(`test-owner-${String(index)}`, { choice }, minute, 'owner'));
            const engineers = engineerEntries.map(([choice, minute], index) => entered(`test-engineer-${String(index)}`, { choice }, minute, 'sovitech_engineer'));
            const before = derive(fireSafety, owners, none, context);
            const after = derive(fireSafety, [...owners, ...engineers], none, context);
            expect(after.state).toBe(before.state);
            expect(after.activeCandidateId).toBe(before.activeCandidateId);
            expect(after.facts).toEqual(before.facts);
            for (const engineer of engineers) expect(statusOf(after, engineer.id)?.refusal).toBe('choice_author_not_owner');
          },
        ),
        { numRuns: 200 },
      );
    });
  });
});

describe('derive: the phase 1 round 5 fixes', () => {
  const [asBuilt, tender, design] = documents;
  if (asBuilt === undefined || tender === undefined || design === undefined) throw new Error('fixture has documents');
  const context = contextOf(new Map(), false);
  const none: DeriveEvents = { candidate: [], field: [], document: [] };
  const field = (entry: Partial<FieldDefinition> & Pick<FieldDefinition, 'kind'>): FieldDefinition => ({
    key: FIELD_KEY,
    label: 'TEST field',
    subject: 'building',
    estimation: 'forbidden',
    criticality: 'first_estimate',
    affects: [],
    impactRank: 1,
    confirmBy: 'owner',
    ...entry,
  });
  type Rest = Omit<Candidate, 'id' | 'subjectId' | 'fieldKey' | 'source' | 'evidence' | 'createdBy' | 'createdAt' | 'authorRole'>;
  const found = (id: string, document: DocumentRecord, rest: Rest, minute: number): Candidate => ({
    id,
    subjectId: SUBJECT,
    fieldKey: FIELD_KEY,
    source: 'document',
    evidence: [{ documentId: document.id, contentHash: document.contentHash, locator: { page: 1 }, excerpt: 'TEST', check: 'text_match' }],
    createdBy: 'test-extractor',
    authorRole: 'system',
    createdAt: time(minute),
    ...rest,
  });
  const answered = (id: string, rest: Rest, minute: number): Candidate => ({
    id,
    subjectId: SUBJECT,
    fieldKey: FIELD_KEY,
    source: 'user',
    evidence: [],
    createdBy: 'test-owner',
    authorRole: 'owner',
    createdAt: time(minute),
    ...rest,
  });
  const rejection = (candidate: Candidate, role: CandidateEvent['role'], minute: number): CandidateEvent => ({
    candidateId: candidate.id,
    type: 'rejected',
    by: role === 'owner' ? 'test-owner' : 'test-engineer',
    role,
    at: time(minute),
    reason: 'TEST reason',
  });
  const statusOf = (state: FieldState, id: string) => state.candidates.find((candidate) => candidate.candidateId === id);

  /**
   * Round 4's verification, NP-1 (medium): an engineer's `rejected` event on one side of a conflict routed to the owner
   * closed it, while the same engineer's `conflict_resolved` on the pair was refused (`resolver_not_routed`). Rule 4:
   * "Conflicts on owner fields go to the owner"; "Only the right person's resolution closes a conflict". Indexed as G4-33.
   */
  describe('an engineer\'s rejection never takes a side of a conflict routed to the owner (rule 4; NP-1)', () => {
    const buildingType = field({ kind: 'enum', options: ['TEST-type-hotel', 'TEST-type-office', 'TEST-type-other'], confirmByBasis: 'use_and_occupancy' });
    const hotel = found('test-read-hotel', design, { choice: 'TEST-type-hotel' }, 1);
    const office = found('test-read-office', tender, { choice: 'TEST-type-office' }, 2);
    const expectForTheOwner = (state: FieldState, label: string): void => {
      expect(state.state, label).toBe('conflict');
      expect(state.activeCandidateId, label).toBeNull();
      expect(state.conflict?.routedTo, label).toBe('owner');
      expect(state.review, label).toEqual({ list: 'for_you', reason: 'conflict' });
    };

    test('two documents disagree on the building type, and an engineer rejects one: refused, and the conflict stays with the owner', () => {
      expectForTheOwner(derive(buildingType, [hotel, office], none, context), 'before');
      for (const target of [hotel, office]) {
        const event = rejection(target, 'sovitech_engineer', 3);
        const state = derive(buildingType, [hotel, office], { ...none, candidate: [event] }, context);
        expectForTheOwner(state, target.id);
        expect(state.conflict?.candidateIds, target.id).toEqual([hotel.id, office.id].sort());
        expect(statusOf(state, target.id)?.status, target.id).toBe('eligible');
        expect(state.refusedEvents, target.id).toEqual([{ kind: 'candidate', event, refusal: 'resolver_not_routed' }]);
      }
    });

    test('the owner\'s step 1 project type against a document that disagrees: an engineer\'s rejection of either side is refused', () => {
      const projectType = field({ kind: 'enum', subject: 'project', options: ['TEST-type-a', 'TEST-type-b'], confirmByBasis: 'owner_choice', criticality: 'required' });
      const owners = answered('test-owner-type', { choice: 'TEST-type-a' }, 0);
      const read = found('test-read-type', design, { choice: 'TEST-type-b' }, 1);
      const answerEvent: CandidateEvent = { candidateId: owners.id, type: 'user_confirmed', by: 'test-owner', role: 'owner', at: time(0) };
      for (const target of [owners, read]) {
        const event = rejection(target, 'sovitech_engineer', 4);
        const state = derive(projectType, [owners, read], { ...none, candidate: [answerEvent, event] }, context);
        expectForTheOwner(state, target.id);
        expect(state.refusedEvents, target.id).toEqual([{ kind: 'candidate', event, refusal: 'resolver_not_routed' }]);
      }
    });

    test('one side of three: an engineer\'s rejection of any one of three disagreeing values is refused too', () => {
      const other = found('test-read-other', asBuilt, { choice: 'TEST-type-other' }, 3);
      const event = rejection(office, 'sovitech_engineer', 4);
      const state = derive(buildingType, [hotel, office, other], { ...none, candidate: [event] }, context);
      expectForTheOwner(state, 'three');
      expect(state.conflict?.candidateIds).toEqual([hotel.id, office.id, other.id].sort());
      expect(state.refusedEvents).toEqual([{ kind: 'candidate', event, refusal: 'resolver_not_routed' }]);
    });

    test('controls: the owner\'s rejection closes it; an engineer\'s holds on an engineer-routed conflict, on an `either` field, and outside any conflict', () => {
      const byOwner = derive(buildingType, [hotel, office], { ...none, candidate: [rejection(office, 'owner', 3)] }, context);
      expect(byOwner).toMatchObject({ state: 'known', activeCandidateId: hotel.id, refusedEvents: [] });

      const ahuCount = field({ kind: 'count', unit: 'count', qualifiers: ['ahu'], confirmBy: 'engineer', criticality: 'for_quotation' });
      const six = found('test-tender-ahu', tender, { quantity: { value: 6, unit: 'count', qualifier: 'ahu' } }, 1);
      const five = found('test-asbuilt-ahu', asBuilt, { quantity: { value: 5, unit: 'count', qualifier: 'ahu' } }, 2);
      const byEngineer = derive(ahuCount, [six, five], { ...none, candidate: [rejection(six, 'sovitech_engineer', 3)] }, context);
      expect(byEngineer).toMatchObject({ state: 'known', activeCandidateId: five.id, refusedEvents: [] });

      const either = { ...buildingType, confirmBy: 'either' as const };
      const onEither = derive(either, [hotel, office], { ...none, candidate: [rejection(office, 'sovitech_engineer', 3)] }, context);
      expect(onEither).toMatchObject({ state: 'known', activeCandidateId: hotel.id, refusedEvents: [] });

      const alone = derive(buildingType, [hotel], { ...none, candidate: [rejection(hotel, 'sovitech_engineer', 3)] }, context);
      expect(statusOf(alone, hotel.id)?.status).toBe('rejected');
      expect(alone.refusedEvents).toEqual([]);
    });

    test('a conflict the owner already resolved is no longer open: an engineer\'s later rejection of the value set aside holds', () => {
      const resolved: FieldEvent = {
        subjectId: SUBJECT,
        fieldKey: FIELD_KEY,
        type: 'conflict_resolved',
        by: 'test-owner',
        role: 'owner',
        at: time(3),
        reason: 'TEST reason',
        chosenCandidateId: hotel.id,
        coveredCandidateIds: [hotel.id, office.id],
      };
      const event = rejection(office, 'sovitech_engineer', 4);
      const state = derive(buildingType, [hotel, office], { ...none, candidate: [event], field: [resolved] }, context);
      expect(state).toMatchObject({ state: 'known', activeCandidateId: hotel.id, refusedEvents: [] });
      expect(statusOf(state, office.id)?.status).toBe('rejected');
    });

    test('property: on an owner field, no set of an engineer\'s rejections changes a conflict routed to the owner, and each is listed', () => {
      fc.assert(
        fc.property(
          fc.array(fc.tuple(fc.constantFrom('TEST-type-hotel', 'TEST-type-office', 'TEST-type-other'), fc.constantFrom(0, 1, 2), fc.integer({ min: 0, max: 20 })), {
            minLength: 2,
            maxLength: 4,
          }),
          fc.array(fc.tuple(fc.nat(), fc.integer({ min: 0, max: 30 })), { minLength: 1, maxLength: 4 }),
          (reads, rejections) => {
            const candidates = reads.map(([choice, doc, minute], index) => {
              const document = documents[doc];
              if (document === undefined) throw new Error('fixture has documents');
              return found(`test-read-${String(index)}`, document, { choice }, minute);
            });
            const before = derive(buildingType, candidates, none, context);
            fc.pre(before.state === 'conflict');
            const events = rejections.map(([index, minute]) => {
              const target = candidates[index % candidates.length];
              if (target === undefined) throw new Error('candidates is not empty');
              return rejection(target, 'sovitech_engineer', minute);
            });
            const after = derive(buildingType, candidates, { ...none, candidate: events }, context);
            expect(after.state).toBe('conflict');
            expect(after.conflicts).toEqual(before.conflicts);
            expect(after.candidates).toEqual(before.candidates);
            expect(after.review).toEqual({ list: 'for_you', reason: 'conflict' });
            const inConflict = new Set(before.conflicts.flatMap((conflict) => conflict.candidateIds));
            const listed = after.refusedEvents.filter((refused) => refused.refusal === 'resolver_not_routed');
            expect(listed).toHaveLength(events.filter((event) => inConflict.has(event.candidateId)).length);
          },
        ),
        { numRuns: 300 },
      );
    });
  });

  /**
   * Found while fixing NP-1, its mirror: on an owner field, a conflict with an engineer_verified side is routed to the
   * engineer (rule 4: "A conflict in which any candidate is engineer_verified goes to the engineer queue, whatever the
   * field's confirmBy"), and the owner's rejection of the other side, with no value of their own, closed it while the
   * owner's `conflict_resolved` on the pair was refused. The owner's correction (a value of their own) is rule 4's "A
   * correction is a resolution" and holds as before.
   */
  describe('the owner\'s rejection with no value of their own never takes a side of a conflict routed to the engineer (rule 4)', () => {
    const buildingType = field({ kind: 'enum', options: ['TEST-type-hotel', 'TEST-type-office'] });
    const hotel = found('test-read-hotel', design, { choice: 'TEST-type-hotel' }, 1);
    const office = found('test-read-office', tender, { choice: 'TEST-type-office' }, 2);
    const engineerCheck: CandidateEvent = { candidateId: hotel.id, type: 'engineer_verified', by: 'test-engineer', role: 'sovitech_engineer', at: time(3) };

    test('refused: the conflict stays in the engineer queue', () => {
      const before = derive(buildingType, [hotel, office], { ...none, candidate: [engineerCheck] }, context);
      expect(before).toMatchObject({ state: 'conflict', conflict: { routedTo: 'engineer' } });
      const event = rejection(office, 'owner', 4);
      const state = derive(buildingType, [hotel, office], { ...none, candidate: [engineerCheck, event] }, context);
      expect(state).toMatchObject({ state: 'conflict', activeCandidateId: null, conflict: { routedTo: 'engineer' }, review: { list: 'sovitech_will_check', reason: 'conflict' } });
      expect(statusOf(state, office.id)?.status).toBe('eligible');
      expect(state.refusedEvents).toEqual([{ kind: 'candidate', event, refusal: 'resolver_not_routed' }]);
    });

    test('controls: the owner\'s correction holds; the owner\'s rejection holds on a conflict routed to the owner and outside any conflict', () => {
      const own = answered('test-owner-hotel', { choice: 'TEST-type-hotel' }, 4);
      const answerEvent: CandidateEvent = { candidateId: own.id, type: 'user_confirmed', by: 'test-owner', role: 'owner', at: time(4) };
      const corrected = derive(buildingType, [hotel, office, own], { ...none, candidate: [engineerCheck, answerEvent, rejection(office, 'owner', 4)] }, context);
      expect(corrected).toMatchObject({ state: 'known', activeCandidateId: hotel.id, refusedEvents: [] });
      expect(statusOf(corrected, office.id)?.status).toBe('rejected');

      const forTheOwner = derive(buildingType, [hotel, office], { ...none, candidate: [rejection(office, 'owner', 4)] }, context);
      expect(forTheOwner).toMatchObject({ state: 'known', activeCandidateId: hotel.id, refusedEvents: [] });

      const alone = derive(buildingType, [office], { ...none, candidate: [rejection(office, 'owner', 4)] }, context);
      expect(statusOf(alone, office.id)?.status).toBe('rejected');
      expect(alone.refusedEvents).toEqual([]);
    });
  });

  test('found while fixing: two refused events that differ only in an absent or empty reason keep one order, whatever order they arrive in', () => {
    const buildingType = field({ kind: 'enum', options: ['TEST-type-hotel'] });
    const skip = (reason: string | undefined, coveredCandidateIds?: readonly string[]): FieldEvent => ({
      subjectId: SUBJECT,
      fieldKey: FIELD_KEY,
      type: 'skipped',
      by: 'test-job',
      role: 'system',
      at: time(5),
      ...(reason === undefined ? {} : { reason }),
      ...(coveredCandidateIds === undefined ? {} : { coveredCandidateIds }),
    });
    for (const [first, second] of [
      [skip(undefined), skip('')],
      [skip('TEST', []), skip('TEST')],
    ] as const) {
      const forward = derive(buildingType, [], { ...none, field: [first, second] }, context);
      const backward = derive(buildingType, [], { ...none, field: [second, first] }, context);
      expect(forward.refusedEvents).toHaveLength(2);
      expect(backward.refusedEvents).toEqual(forward.refusedEvents);
    }
  });

  /**
   * 2.3's `DocumentEvent` names an engineer for `withdrawn`, and "Deleting a document" does not say who deletes, so an
   * engineer's own deletion holds (round 5). Whether an engineer may delete a document without the owner, and what such
   * a deletion does to a conflict routed to the owner, is a question for the approver (build log, phase 1, "Questions
   * for the owner", item 12); the mirror, the owner's deletion ending a conflict routed to the engineer, is proposal
   * P-1-OWNER-REMOVAL-ENGINEER-CONFLICT. These tests pin today's reading so that a change is visible.
   */
  describe('pinned until the approver answers the engineers-and-document-deletion question (not a reading derive may change alone)', () => {
    test('today an engineer deleting the document behind one side of a conflict routed to the owner ends that conflict on the other side', () => {
      const buildingType = field({ kind: 'enum', options: ['TEST-type-hotel', 'TEST-type-office'] });
      const hotel = found('test-read-hotel', design, { choice: 'TEST-type-hotel' }, 1);
      const office = found('test-read-office', tender, { choice: 'TEST-type-office' }, 2);
      const deleted: DocumentEvent = { documentId: tender.id, type: 'withdrawn', by: 'test-engineer', role: 'sovitech_engineer', at: time(30) };
      const state = derive(buildingType, [hotel, office], { ...none, document: [deleted] }, context);
      expect(statusOf(state, office.id)?.status).toBe('withdrawn');
      expect(state).toMatchObject({ state: 'known', activeCandidateId: hotel.id, review: null, refusedEvents: [] });
    });
  });
});
