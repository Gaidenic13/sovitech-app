/**
 * G7-5 (docs/guardrails.md section 7; rule 7, "Open items are short, and say who acts": "For you.
 * Only items the owner can resolve ... SOVITECH will check. Engineer items, one line per group ...
 * Counts count only what the owner can act on").
 * Situation: 126 engineer items and 2 owner items are open at step 8.
 * Expected: "2 things for you to check" and one line "SOVITECH will check 126 equipment
 * classifications".
 *
 * The two owner items: a conflict on an owner field that a later document raised against the
 * owner's answer (rule 4), and a confirmation the owner left on step 5 (rule 7). The 126 engineer
 * items: asset types not yet checked. The open-item planner lists them; the resolver writes the two
 * counts in the registry's rule lines, each number bound to its value id.
 */
import { expect, test } from 'vitest';
import { lineOf, openItems, projectValueId, resolveLine, DEFAULT_FORMAT_OPTIONS } from '@sovitech/view-model/server';
import { documentReading, ownerAnswer, ownerConfirmation, testDocument, testEvents } from './_support/builders';
import { intakeFieldOf, productionField, registryField, uuid } from './_support/view-model';

const PROJECT = uuid(1);
const BUILDING = uuid(2);
const laterDocument = { ...testDocument(uuid(10), PROJECT, 'unknown'), contentHash: `sha256:${'d'.repeat(64)}` };

test('US-REVIEW-12 AC3 AC4 · F-QUESTION-07 · G7-5: 126 engineer items and 2 owner items: "2 things for you to check" and one line "SOVITECH will check 126 equipment classifications"', () => {
  // Owner item 1: an owner field in conflict, routed to the owner.
  const ownerCount = registryField('project.testCount', { kind: 'count', subject: 'project', unit: 'count', confirmBy: 'owner', impactRank: 30, valueShape: 'non_negative_integer' });
  const answer = ownerAnswer({ id: uuid(20), subjectId: PROJECT, field: ownerCount, value: { quantity: { value: 28, unit: 'count' } }, minute: 1 });
  const later = documentReading({ id: uuid(21), subjectId: PROJECT, field: ownerCount, document: laterDocument, value: { quantity: { value: 30, unit: 'count' } }, minute: 9 });
  const conflicted = intakeFieldOf(ownerCount, PROJECT, [answer, later], testEvents({ candidate: [ownerConfirmation(answer)] }), [laterDocument]);
  expect(conflicted.state.conflict?.routedTo).toBe('owner');

  // Owner item 2: the building type's confirmation, left on step 5.
  const buildingType = productionField('building.type');
  const inferred = documentReading({ id: uuid(22), subjectId: BUILDING, field: buildingType, document: laterDocument, value: { choice: 'hotel' }, minute: 2, source: 'ai_inference', confidence: 'medium' });
  const typeField = intakeFieldOf(buildingType, BUILDING, [inferred], undefined, [laterDocument]);
  const left = { fieldKey: buildingType.key, candidateId: inferred.id, impactRank: buildingType.impactRank, step: 5 as const };

  const items = openItems({ fields: [conflicted, typeField], confirmationsLeft: [left], confirmationOverflow: [], unverifiedAssetTypes: 126, siteSurveyNeeded: false });
  expect(items.forYou.map((item) => item.reason).sort()).toEqual(['confirmation', 'conflict']);
  expect(items.engineer).toEqual([{ group: 'equipment_classifications', count: 126, fieldLabels: [] }]);

  const owner = resolveLine(projectValueId(PROJECT, 'openItems.owner'), 'things_for_you', { count: items.forYou.length }, DEFAULT_FORMAT_OPTIONS);
  expect(owner.text).toBe('2 things for you to check');
  expect(owner.parts).toEqual(['2']);
  const [group] = items.engineer;
  if (group === undefined) throw new Error('one engineer line');
  const engineer = resolveLine(projectValueId(PROJECT, `openItems.engineer.${group.group}`), 'sovitech_will_check_equipment', { count: group.count }, DEFAULT_FORMAT_OPTIONS);
  expect(engineer.text).toBe('SOVITECH will check 126 equipment classifications');
  expect(engineer.valueId).toBe(`project:${PROJECT}.openItems.engineer.equipment_classifications`);

  // Counts count only what the owner can act on: never the engineer's 126 in the owner's count.
  expect(owner.text).not.toContain('126');
  expect(() => lineOf('things_for_you', { count: '2' })).toThrow(/number/u);
});
