/**
 * G1-8 (docs/guardrails.md section 7; rule 1; rule 12; 2.4 "Field states").
 * Situation: no parking drawings uploaded.
 * Expected: parking fields stay unknown, not not_applicable.
 *
 * Other documents were uploaded and analysed for every registry field (section 4:
 * analysis never stops early); none of them yields a parking candidate.
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { unitByCode } from '@sovitech/registry';
import {
  NO_EVENTS,
  derive,
  type DeriveContext,
  type DocumentRecord,
  type FieldDefinition,
  type FieldEvent,
} from '@sovitech/domain';

const PROJECT = 'test-project-g1-8';

const base = {
  subject: 'project',
  estimation: 'forbidden',
  criticality: 'optional',
  affects: [],
  impactRank: 1,
  confirmBy: 'owner',
} as const satisfies Partial<FieldDefinition>;

/** TEST parking fields of three kinds. */
const parkingFields: readonly FieldDefinition[] = [
  { ...base, key: 'test.parking.levels', label: 'TEST parking levels', kind: 'count', unit: 'count' },
  { ...base, key: 'test.parking.ventilation', label: 'TEST parking ventilation type', kind: 'enum' },
  { ...base, key: 'test.parking.area', label: 'TEST parking area', kind: 'quantity', unit: 'm2', qualifierRequired: true },
];

/** The documents that were uploaded: none is a parking drawing. */
const uploaded: readonly DocumentRecord[] = [
  {
    id: 'test-doc-g1-8-arh',
    projectId: PROJECT,
    contentHash: 'sha256:test-g1-8-arh',
    kind: 'architectural',
    stage: 'technical_design',
    analysis: { status: 'analysed', coverage: 'TEST full coverage' },
  },
  {
    id: 'test-doc-g1-8-bill',
    projectId: PROJECT,
    contentHash: 'sha256:test-g1-8-bill',
    kind: 'energy_bill',
    stage: 'bill',
    analysis: { status: 'analysed', coverage: 'TEST full coverage' },
  },
];

const context: DeriveContext = {
  subjectId: PROJECT,
  document: (id) => uploaded.find((document) => document.id === id),
  unit: unitByCode,
  inputState: () => undefined,
  datasetApproved: () => false,
};

/** Finished analysis runs over the field: each run starts and finishes, by the system. */
function finishedRuns(field: FieldDefinition, runs: number): FieldEvent[] {
  return Array.from({ length: runs }, (_, run) =>
    (['analysis_started', 'analysis_finished'] as const).map(
      (type, step): FieldEvent => ({
        subjectId: PROJECT,
        fieldKey: field.key,
        type,
        by: 'test-analysis-job',
        role: 'system',
        at: new Date(Date.UTC(2026, 8, 25, 10, run, step)).toISOString(),
      }),
    ),
  ).flat();
}

function expectUnknownNotNotApplicable(field: FieldDefinition, runs: number): void {
  const state = derive(field, [], { ...NO_EVENTS, field: finishedRuns(field, runs) }, context);
  expect(state.state).not.toBe('not_applicable');
  expect(state.state).toBe('unknown');
}

test('F-VALUE-02 · F-VALUE-06 · G1-8: no parking drawings uploaded: parking fields stay unknown, not not_applicable', () => {
  for (const field of parkingFields) expectUnknownNotNotApplicable(field, 1);

  // Property: however many analysis runs have finished, absence never sets not_applicable.
  fc.assert(
    fc.property(fc.constantFrom(...parkingFields), fc.integer({ min: 0, max: 4 }), (field, runs) => {
      expectUnknownNotNotApplicable(field, runs);
    }),
  );
});
