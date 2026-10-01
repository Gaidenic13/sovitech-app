/**
 * G11-9 (new in phase 3, indexed in docs/guardrails.md section 7 at v1.8; rule 11,
 * "Life-safety systems"; section 5, step 4: "Detected systems may be preselected with Suggested,
 * except life-safety systems"; US-SCOPE-02 AC2).
 * Situation: a document names Fire Safety (a TEST detection), and step 4 preselects detected systems
 *   with Suggested.
 * Expected: Fire Safety is not preselected and shows no Suggested.
 *
 * The registry declares no detection field yet (proposal P-3-DETECTION-FIELDS), so the case builds
 * TEST detection fields and runs step 4's suggestion rule as the proposal would register it
 * (scopeSuggestionRule). Whatever the detections name, the guard every rule's output passes
 * (suggestionsFor) never suggests Fire Safety, nor the systems the catalogue never preselects; a
 * rule that names Fire Safety itself is dropped; a page that reports a Suggested Fire Safety has it
 * ignored on Continue; and the decision shows no Suggested badge.
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { SYSTEMS, productionRegistry, scopeFieldKey } from '@sovitech/registry';
import { planContinue, resolveField, scopeSuggestionRule, suggestionsFor, type SuggestionRule } from '@sovitech/view-model/server';
import { documentReading, testDocument } from './_support/builders';
import { intakeFieldOf, registryField, resolveInputOf, uuid } from './_support/view-model';

const PROJECT = uuid(1);
const BUILDING = uuid(2);
const schematic = { ...testDocument(uuid(10), PROJECT, 'unknown'), contentHash: `sha256:${'1'.repeat(64)}` };
const detectionKey = (system: string): string => `building.testDetection.${system}`;
const scopeFields = productionRegistry.fields.filter((field) => field.key.startsWith('project.scope.'));
const guarded = new Set(SYSTEMS.filter((system) => system.lifeSafety || system.neverPreselected).map((system) => scopeFieldKey(system.id)));

function detected(systems: readonly string[]): ReturnType<typeof intakeFieldOf>[] {
  return systems.map((system, index) => {
    const field = registryField(detectionKey(system), { kind: 'enum', subject: 'building', options: ['present'], confirmBy: 'owner' });
    const found = documentReading({ id: uuid(100 + index), subjectId: BUILDING, field, document: schematic, value: { choice: 'present' }, minute: 1 });
    return intakeFieldOf(field, BUILDING, [found], undefined, [schematic]);
  });
}

test('US-SCOPE-02 AC2 · F-QUESTION-06 · G11-9: Fire Safety named by a TEST detection on step 4 is not preselected and shows no Suggested', () => {
  const fireSafety = scopeFieldKey('fire_safety');
  const rule = scopeSuggestionRule(detectionKey, () => 'Schema incendiu.pdf');
  const scope = scopeFields.map((field) => intakeFieldOf(field, PROJECT));

  // Fire Safety detected: no suggestion; HVAC detected beside it: suggested, for contrast.
  const suggestions = suggestionsFor([...detected(['fire_safety', 'hvac']), ...scope], [rule]);
  expect(suggestions.map((suggestion) => suggestion.fieldKey)).toEqual([scopeFieldKey('hvac')]);

  // A rule that names Fire Safety itself is dropped by the guard.
  const rogue: SuggestionRule = () => [{ fieldKey: fireSafety, subjectId: PROJECT, choice: 'include', reasonLineId: 'suggested_because', reasonSlots: { reason: 'TEST' }, suggestedBy: 'TEST-rogue' }];
  expect(suggestionsFor(scope, [rogue])).toEqual([]);

  // The card shows no Suggested: the decision reads Unknown, not preselected.
  const fireField = scope.find((field) => field.field.key === fireSafety);
  if (fireField === undefined) throw new Error('the registry holds the Fire Safety decision');
  const [card] = resolveField(resolveInputOf(fireField, 'project'));
  expect(card?.badge?.id).toBe('unknown');
  expect(card?.shape).toBe('missing');

  // A page that reports a Suggested Fire Safety has it ignored on Continue, never written as the owner's answer.
  const writes = planContinue({
    step: 4,
    fields: scope,
    suggestions,
    request: {
      answers: [],
      multi: [{ questionId: 'q.project.systemsInScope', ticked: [fireSafety] }],
      visibleSuggestions: [{ field: { subjectId: PROJECT, fieldKey: fireSafety }, choice: 'include' }],
      shown: { questions: ['q.project.systemsInScope'], confirmations: [] },
    },
  });
  expect(writes.acceptedSuggestions).toEqual([]);
  expect(writes.ignoredSuggestions).toBe(1);
  // Ticking it is the owner's own opt-in (rule 11: Fire Safety stays opt-in), an ordinary answer.
  expect(writes.answers.find((answer) => answer.fieldKey === fireSafety)?.choice).toBe('include');

  // Property: whatever the detections name, no life-safety system and no system never preselected is suggested.
  fc.assert(
    fc.property(fc.subarray(SYSTEMS.map((system) => system.id)), (named) => {
      const kept = suggestionsFor([...detected(named), ...scope], [rule]);
      for (const suggestion of kept) expect(guarded.has(suggestion.fieldKey)).toBe(false);
      expect(kept.map((suggestion) => suggestion.fieldKey).sort()).toEqual(
        named.map((system) => scopeFieldKey(system)).filter((key) => !guarded.has(key)).sort(),
      );
    }),
    { numRuns: 60 },
  );
});
