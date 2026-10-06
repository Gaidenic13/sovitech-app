/**
 * G9-7 (docs/guardrails.md section 7; 2.4 "Provisional": a value is provisional when a leaf of its input graph is
 * unverified, owner-acknowledged only, estimated, an unverified inference or in conflict; "Approved reference data is
 * not provisional"; rule 9 "No laundering").
 * Situation: an OPEX estimate whose inputs are an engineer-verified asset register, an approved climate dataset and an
 * owner-entered schedule.
 * Expected: Estimated, and not Provisional.
 *
 * Engine case (the engine builder), with `TEST-operatingEnergyFromRegister@1.0.0` (a TEST method over TEST hours, a TEST
 * climate value and the register's rated electrical input): the engine's candidate is `estimated`, names exactly its
 * three inputs, and, derived by the one derive function over those inputs' states, is not provisional; an estimate's
 * own method is not a leaf (2.4). The climate value is a TEST reference candidate that this case's derive context
 * reads as approved (a TEST approval, test runner only; no approval record exists). Control: with the register not
 * verified, the same estimate is provisional.
 */
import { describe, expect, test } from 'vitest';
import { FIELD } from '@sovitech/registry';
import { runEngine, type EngineCandidate } from '@sovitech/engine';
import type { Candidate } from '@sovitech/domain';
import { testCatalogue } from '../../packages/engine/test-formulas/engine';
import { TEST_FIELDS, productionField } from '../../packages/engine/test-formulas/fields';
import { deriveEntries, testEngineInput, type TestEntry } from '../../packages/engine/test-formulas/inputs';
import { documentReading, engineerVerificationInMemory, ownerAnswer, ownerConfirmation, testDocument, testTime } from './_support/builders';

const PROJECT = 'test-project-g9-7';
const BUILDING = 'test-building-g9-7';
const register = testDocument('test-doc-g9-7-register', PROJECT, 'as_built');
const approvedClimate = (reference: { readonly dataset: string }): boolean => reference.dataset === 'TEST-climate-reference';

function inputs(registerVerified: boolean): TestEntry[] {
  const schedule = productionField(FIELD.operatingSchedule);
  const rated = documentReading({ id: 'test-cand-g9-7-rated', subjectId: BUILDING, field: TEST_FIELDS.ratedElectricalInput, document: register, value: { quantity: { value: 120, unit: 'kW' } }, minute: 1 });
  const climate: Candidate = {
    id: 'test-cand-g9-7-climate',
    subjectId: PROJECT,
    fieldKey: TEST_FIELDS.climateFactor.key,
    quantity: { value: 9081, unit: '%' },
    source: 'reference',
    evidence: [],
    reference: { dataset: 'TEST-climate-reference', version: 'TEST-1', key: 'TEST city A' },
    createdBy: 'test-reference-loader',
    authorRole: 'system',
    createdAt: testTime(1),
  };
  const answer = ownerAnswer({ id: 'test-cand-g9-7-schedule', subjectId: PROJECT, field: schedule, value: { choice: 'business_hours' }, minute: 2 });
  return [
    { definition: TEST_FIELDS.ratedElectricalInput, subjectId: BUILDING, candidates: [rated], events: { candidate: registerVerified ? [engineerVerificationInMemory(rated.id, 3)] : [] } },
    { definition: TEST_FIELDS.climateFactor, subjectId: PROJECT, candidates: [climate] },
    { definition: schedule, subjectId: PROJECT, candidates: [answer], events: { candidate: [ownerConfirmation(answer)] } },
  ];
}

let ids = 0;
function estimateOver(entries: readonly TestEntry[]): EngineCandidate {
  const input = testEngineInput({ projectId: PROJECT, entries, subjects: { project: PROJECT, building: BUILDING }, datasetApproved: approvedClimate });
  const [output] = runEngine(testCatalogue({ mirrored: false, extra: ['TEST-operatingEnergyFromRegister'] }), input, {
    newId: () => `test-cand-g9-7-out-${String((ids += 1))}`,
    at: '2026-10-05T09:00:00Z',
  }).outputs;
  if (output?.kind !== 'figure') throw new Error(`no TEST operating estimate: ${JSON.stringify(output)}`);
  return output.candidate;
}

/** The estimate as stored, derived with its inputs' states (2.4 "Provisional", computed on read). */
function derivedOutput(entries: readonly TestEntry[], candidate: EngineCandidate) {
  const stored: Candidate = { ...candidate, createdAt: testTime(10), authorRole: 'system' };
  const fields = deriveEntries({ entries: [...entries, { definition: TEST_FIELDS.operatingEnergy, subjectId: PROJECT, candidates: [stored] }], datasetApproved: approvedClimate });
  const state = fields.at(-1)?.state;
  if (state === undefined) throw new Error('no derived state');
  return state;
}

describe('G9-7 · an estimate over an engineer-verified register, approved climate data and an owner schedule: Estimated, not Provisional', () => {
  test('G9-7 · the engine estimates it from exactly those three inputs', () => {
    const entries = inputs(true);
    const candidate = estimateOver(entries);
    expect(candidate.source).toBe('estimated');
    expect(candidate.range).toBeDefined();
    expect(candidate.method.inputCandidateIds).toEqual(['test-cand-g9-7-climate', 'test-cand-g9-7-rated', 'test-cand-g9-7-schedule']);
  });

  test('G9-7 · derived over its inputs, it is known and not provisional: an estimate is not a leaf of its own input graph', () => {
    const entries = inputs(true);
    const state = derivedOutput(entries, estimateOver(entries));
    expect(state.state).toBe('known');
    expect(state.provisional).toBe(false);
    expect(state.stale).toBe(false);
  });

  test('G9-7 · control: with the register not verified, the same estimate is provisional', () => {
    const entries = inputs(false);
    expect(derivedOutput(entries, estimateOver(entries)).provisional).toBe(true);
  });
});
