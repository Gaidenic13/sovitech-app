/**
 * G7-7 (docs/guardrails.md section 7; 2.4, Field states: "skipped: The owner chose Skip for now. The
 * field stays unknown."; rule 7, "Skip for now" and "Skip means skip"). Phase 1 review, round 3,
 * adversarial finding X3.
 * Situation: a `skipped` event on the building type from the system or from an engineer.
 * Expected: the field is not skipped: it stays unknown.
 *
 * The event is listed among those derive did not apply (`skip_not_owner`), so it never keeps the
 * question from being asked. The control: the owner's own skip holds.
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { derive, type FieldEvent } from '@sovitech/domain';
import { testContext, testEvents, testField, testTime } from './_support/builders';

const BUILDING = 'test-building-g7-7';
const buildingType = testField('test.building.type', { kind: 'enum', subject: 'building', options: ['TEST-type-a'], confirmBy: 'owner', criticality: 'first_estimate' });
const context = testContext({ subjectId: BUILDING });

function skip(role: FieldEvent['role'], by: string, minute: number): FieldEvent {
  return { subjectId: BUILDING, fieldKey: buildingType.key, type: 'skipped', by, role, at: testTime(minute) };
}

test('F-VALUE-06 · G7-7: a skip from the system or an engineer does not skip the building type; it stays unknown', () => {
  fc.assert(
    fc.property(fc.constantFrom<FieldEvent['role']>('system', 'sovitech_engineer'), fc.integer({ min: 0, max: 59 }), (role, minute) => {
      const state = derive(buildingType, [], testEvents({ field: [skip(role, 'test-actor', minute)] }), context);
      expect(state.state).toBe('unknown');
      expect(state.refusedEvents.map((refused) => refused.refusal)).toEqual(['skip_not_owner']);
    }),
  );
});

test('F-VALUE-06 · G7-7 control: the owner\'s own skip holds', () => {
  expect(derive(buildingType, [], testEvents({ field: [skip('owner', 'test-owner', 1)] }), context).state).toBe('skipped');
});
