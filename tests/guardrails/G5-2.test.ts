/**
 * G5-2 (docs/guardrails.md section 7; rule 5, "A confirmation is a question too"; rule 7, "What is
 * not an open item").
 * Situation: rooms 424 read from a document (source `document`, qualifier guest rooms stated, not in
 * conflict).
 * Expected: no confirmation prompt, and not an open item.
 *
 * Rule 5's third test fails: the value is read literally with what it counts stated, so it is not
 * uncertain. The case holds on the production rooms field (an engineer field, which fails the first
 * test too) and on a TEST owner field of the first-estimate set, where only the third test decides.
 */
import { expect, test } from 'vitest';
import {
  confirmationCandidates,
  openItems,
  passesConfirmationTest,
  resolveField,
  selectConfirmations,
} from '@sovitech/view-model/server';
import { documentReading, testDocument } from './_support/builders';
import { intakeFieldOf, productionField, registryField, resolveInputOf, uuid } from './_support/view-model';

const PROJECT = uuid(1);
const BUILDING = uuid(2);
const roomSchedule = { ...testDocument(uuid(10), PROJECT, 'unknown'), contentHash: `sha256:${'b'.repeat(64)}` };

test('US-REVIEW-04 AC6 · F-QUESTION-02 · F-QUESTION-07 · G5-2: rooms 424 from a document, guest rooms stated: no confirmation, not an open item', () => {
  const productionRooms = productionField('building.rooms');
  const ownerRooms = registryField('building.testRooms', {
    kind: 'count',
    subject: 'building',
    unit: 'count',
    qualifierRequired: true,
    qualifiers: ['all_spaces', 'guest_rooms', 'keys'],
    confirmBy: 'owner',
    criticality: 'first_estimate',
    valueShape: 'non_negative_integer',
  });
  for (const rooms of [productionRooms, ownerRooms]) {
    const read = documentReading({ id: uuid(20), subjectId: BUILDING, field: rooms, document: roomSchedule, value: { quantity: { value: 424, unit: 'count', qualifier: 'guest_rooms' } }, minute: 1 });
    const field = intakeFieldOf(rooms, BUILDING, [read], undefined, [roomSchedule]);
    expect(field.state.state).toBe('known');
    expect(field.state.conflict).toBeNull();

    // No confirmation prompt.
    expect(passesConfirmationTest(field)).toBe(false);
    const candidates = confirmationCandidates([field], () => 3);
    expect(candidates).toEqual([]);
    const { shown, overflow } = selectConfirmations(candidates, 7);

    // Not an open item, for the owner or for the engineer.
    const items = openItems({ fields: [field], confirmationsLeft: shown, confirmationOverflow: overflow, unverifiedAssetTypes: 0, siteSurveyNeeded: false });
    expect(items.forYou).toEqual([]);
    expect(items.engineer).toEqual([]);

    // Shown with its badge and what it counts, and no confirmation action: the field's summary and its guest-rooms fact.
    const [summary, fact] = resolveField(resolveInputOf(field, 'building', { documents: [roomSchedule] }));
    expect(summary?.text).toBe('424 guest rooms');
    expect(fact?.valueId).toBe(`building:${BUILDING}.${rooms.key.slice('building.'.length)}.guest_rooms`);
    expect(fact?.text).toBe('424');
    expect(fact?.measure?.qualifierLabel).toBe('guest rooms');
    for (const display of [summary, fact]) {
      expect(display?.badge).toBeDefined();
      expect((display?.actions ?? []).some((action) => action.kind === 'confirm')).toBe(false);
    }
  }
});
