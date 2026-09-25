/**
 * G12-7 (docs/guardrails.md section 7; 2.4, Field states: "pending: Analysis that may produce a value is
 * still running"; rule 12, "Code records coverage": code, not a person, records what was analysed).
 * Phase 1 review, round 3, adversarial finding X3. (G12-5 and G12-6 are reserved by prompt 3 for phase 2.)
 * Situation: an `analysis_started` event on a field from the owner.
 * Expected: the field is not pending: it stays unknown.
 *
 * The event is listed among those derive did not apply (`analysis_not_system`). The controls: a run the
 * system started is pending until the system finishes it, and an owner's finish does not end it.
 */
import { expect, test } from 'vitest';
import { derive, type FieldEvent } from '@sovitech/domain';
import { testContext, testEvents, testField, testTime } from './_support/builders';

const BUILDING = 'test-building-g12-7';
const buildingType = testField('test.building.type', { kind: 'enum', subject: 'building', options: ['TEST-type-a'], confirmBy: 'owner' });
const context = testContext({ subjectId: BUILDING });

function run(type: 'analysis_started' | 'analysis_finished', role: FieldEvent['role'], by: string, minute: number): FieldEvent {
  return { subjectId: BUILDING, fieldKey: buildingType.key, type, by, role, at: testTime(minute) };
}

test('F-VALUE-02 · G12-7: an analysis start from the owner does not make the field pending; it stays unknown', () => {
  const state = derive(buildingType, [], testEvents({ field: [run('analysis_started', 'owner', 'test-owner', 1)] }), context);
  expect(state.state).toBe('unknown');
  expect(state.refusedEvents.map((refused) => refused.refusal)).toEqual(['analysis_not_system']);
});

test('F-VALUE-02 · G12-7 control: a run the system started is pending until the system finishes it', () => {
  const started = run('analysis_started', 'system', 'test-analysis-job', 1);
  expect(derive(buildingType, [], testEvents({ field: [started] }), context).state).toBe('pending');
  expect(derive(buildingType, [], testEvents({ field: [started, run('analysis_finished', 'owner', 'test-owner', 2)] }), context).state).toBe('pending');
  expect(derive(buildingType, [], testEvents({ field: [started, run('analysis_finished', 'system', 'test-analysis-job', 2)] }), context).state).toBe('unknown');
});
