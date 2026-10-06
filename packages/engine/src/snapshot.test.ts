/** The snapshot record, the inputs hash and the candidate hash (docs/adr/0048; 2.4 "A generated proposal keeps a snapshot"). */
import { describe, expect, test } from 'vitest';
import { NO_EVENTS, derive, type Candidate, type FieldDefinition } from '@sovitech/domain';
import { unitByCode } from '@sovitech/registry';
import { fieldKeyOf, type EngineField, type EngineInput } from './inputs';
import type { EngineRun } from './results';
import { candidateHashOf, inputsHashOf, missingCode, snapshotRecordOf } from './snapshot';

const FIELD: FieldDefinition = { key: 'project.TEST_answer', label: 'TEST answer', subject: 'project', kind: 'enum', options: ['TEST_a', 'TEST_b'], estimation: 'forbidden', criticality: 'optional', affects: [], impactRank: 1, confirmBy: 'owner' };
const candidate = (id: string, choice: string): Candidate => ({ id, subjectId: 'test-p', fieldKey: FIELD.key, choice, source: 'user', evidence: [], createdBy: 'test-owner', authorRole: 'owner', createdAt: '2026-09-25T09:00:00.000Z' });
const engineField = (candidates: readonly Candidate[]): EngineField => ({
  definition: FIELD,
  subjectId: 'test-p',
  candidates,
  state: derive(FIELD, candidates, NO_EVENTS, { subjectId: 'test-p', document: () => undefined, unit: unitByCode, inputState: () => undefined, datasetApproved: () => false }),
});
const input = (fields: readonly EngineField[]): EngineInput => ({
  projectId: 'test-p',
  fields: new Map(fields.map((field) => [fieldKeyOf(field.subjectId, field.definition.key), field])),
  subjectOf: () => 'test-p',
  closedGates: new Set(),
  datasets: () => undefined,
  author: 'test-engine',
});

describe('ADR 0048 · the snapshot', () => {
  test('the inputs hash is stable for the same state and moves with an active candidate, a formula version or a dataset version', () => {
    const base = inputsHashOf(input([engineField([candidate('test-c1', 'TEST_a')])]), ['TEST-f@1.0.0'], []);
    expect(base).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(inputsHashOf(input([engineField([candidate('test-c1', 'TEST_a')])]), ['TEST-f@1.0.0'], [])).toBe(base);
    expect(inputsHashOf(input([engineField([candidate('test-c2', 'TEST_a')])]), ['TEST-f@1.0.0'], [])).not.toBe(base);
    expect(inputsHashOf(input([engineField([candidate('test-c1', 'TEST_a')])]), ['TEST-f@1.0.1'], [])).not.toBe(base);
    expect(inputsHashOf(input([engineField([candidate('test-c1', 'TEST_a')])]), ['TEST-f@1.0.0'], [{ id: 'TEST-d', version: 'TEST-1' }])).not.toBe(base);
    // A conflict decides by both candidates, and differs from either alone.
    expect(inputsHashOf(input([engineField([candidate('test-c1', 'TEST_a'), candidate('test-c2', 'TEST_b')])]), ['TEST-f@1.0.0'], [])).not.toBe(base);
  });

  test('a record holds the inputs, the produced candidates, the formulas run, the outputs with their codes, and the pending documents', () => {
    const run: EngineRun = {
      outputs: [
        { kind: 'not_available', output: 'TEST.a', formula: 'TEST-f@1.0.0', missing: [{ kind: 'dataset', datasetId: 'TEST-d', name: 'TEST d', gate: 'TEST-g' }, { kind: 'input', fieldKey: 'project.TEST_x', subjectId: 'test-p', reason: 'skipped' }] },
      ],
      formulasRun: [],
      inputCandidateIds: ['test-c2', 'test-c1'],
      datasets: [],
      inputsHash: 'sha256:TEST',
      refusals: [],
    };
    expect(snapshotRecordOf(run, ['test-doc-2', 'test-doc-1', 'test-doc-2'])).toEqual({
      inputsHash: 'sha256:TEST',
      candidateIds: ['test-c1', 'test-c2'],
      formulas: [],
      outputs: [{ output: 'TEST.a', formula: 'TEST-f@1.0.0', candidateId: null, missing: ['dataset:TEST-d', 'input:test-p:project.TEST_x:skipped'], incomplete: false }],
      pendingDocumentIds: ['test-doc-1', 'test-doc-2'],
    });
    expect(missingCode({ kind: 'method', name: 'TEST-f' })).toBe('method:TEST-f');
    expect(missingCode({ kind: 'unit', name: 'TEST unit', gate: 'units-7.2.22' })).toBe('unit:units-7.2.22');
  });

  test('rule 10 · a candidate hash is the same for the same content, in any key order, and moves with any change', () => {
    const one = candidate('test-c1', 'TEST_a');
    const reordered = Object.fromEntries(Object.entries(one).reverse()) as unknown as Candidate;
    expect(candidateHashOf(reordered)).toBe(candidateHashOf(one));
    expect(candidateHashOf({ ...one, choice: 'TEST_b' })).not.toBe(candidateHashOf(one));
    expect(candidateHashOf(one)).toMatch(/^sha256:[0-9a-f]{64}$/u);
  });
});
