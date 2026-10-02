/**
 * G11-10 (new in phase 4; rule 11, "Life-safety systems"; section 5, step 4: "Detected systems may be preselected
 * with Suggested, except life-safety systems"; rule 3, "Choices belong to the owner"; PRD R-051, R-052; the same
 * reading as G11-9, on System Scope after Generate).
 * Situation: a document names Fire Safety, and System Scope shows the systems the documents name with Suggested.
 * Expected: Fire Safety is not preselected and shows no Suggested.
 *
 * The registry declares no detection field (proposal P-3-DETECTION-FIELDS), so the case uses TEST detection fields
 * and step 4's suggestion rule as the proposal would register it (scopeSuggestionRule), through the intake's one guard
 * (suggestionsFor). System Scope's row for Fire Safety carries no suggestion, its switch is off and its decision shows
 * no Suggested badge, while HVAC beside it is Suggested; "Save and Continue" with a page that reports a Suggested Fire
 * Safety accepts nothing for it (planScopeDecisions). The API half, through the served System Scope over a TEST
 * database with a TEST registry, is tests/api/workspace-test-registry.test.ts ("G11-10 · …").
 */
import { expect, test } from 'vitest';
import { productionRegistry, scopeFieldKey } from '@sovitech/registry';
import { planScopeDecisions, scopeSuggestionRule, suggestionsFor, systemScopeView } from '@sovitech/view-model/server';
import { documentReading, testDocument } from './_support/builders';
import { intakeFieldOf, registryField, uuid } from './_support/view-model';
import { displayOf, testWorkspace, type TestSubjectField } from './_support/workspace';

const PROJECT = uuid(1);
const BUILDING = uuid(2);
const schematic = { ...testDocument(uuid(10), PROJECT, 'unknown'), contentHash: `sha256:${'1'.repeat(64)}` };
const detectionKey = (system: string): string => `building.testDetection.${system}`;
const scopeFields = productionRegistry.fields.filter((field) => field.key.startsWith('project.scope.'));

test('US-SCOPE-06 · R-052 · F-QUESTION-06 · G11-10: Fire Safety named by a TEST detection is not preselected on System Scope and shows no Suggested; HVAC beside it is', () => {
  const detections: TestSubjectField[] = ['fire_safety', 'hvac'].map((system, index) => {
    const field = registryField(detectionKey(system), { kind: 'enum', subject: 'building', options: ['present'], confirmBy: 'owner' });
    return { field, subjectId: BUILDING, subjectKind: 'building', candidates: [documentReading({ id: uuid(100 + index), subjectId: BUILDING, field, document: schematic, value: { choice: 'present' }, minute: 1 })] };
  });
  const scope = scopeFields.map((field) => intakeFieldOf(field, PROJECT));
  const detected = detections.map((entry) => intakeFieldOf(entry.field, BUILDING, entry.candidates, undefined, [schematic]));
  const suggestions = suggestionsFor([...detected, ...scope], [scopeSuggestionRule(detectionKey, () => 'TEST schema incendiu.pdf')]);
  const project = testWorkspace({
    projectId: PROJECT,
    buildingId: BUILDING,
    documents: [schematic],
    fileNames: { [schematic.id]: 'TEST schema incendiu.pdf' },
    fields: [...detections, ...scopeFields.map((field) => ({ field, subjectId: PROJECT, subjectKind: 'project' as const }))],
    suggestions,
  });
  const { view, displayObjects } = systemScopeView(project);
  const fire = view.systems.find((row) => row.systemId === 'fire_safety');
  const hvac = view.systems.find((row) => row.systemId === 'hvac');
  expect(fire).toMatchObject({ lifeSafety: true, included: false, suggestion: null });
  expect(displayOf(displayObjects, fire?.decision ?? '').badge?.id).not.toBe('suggested');
  expect(hvac).toMatchObject({ included: true });
  expect(hvac?.suggestion?.reason.text).toBe('Suggested because TEST schema incendiu.pdf names HVAC');
  expect(displayOf(displayObjects, hvac?.decision ?? '').badge?.id).toBe('suggested');

  // A page that reports a Suggested Fire Safety on "Save and Continue": nothing is accepted for it.
  const writes = planScopeDecisions({
    projectId: PROJECT,
    fields: scope,
    suggestions,
    request: { decisions: [], visibleSuggestions: [{ field: { subjectId: PROJECT, fieldKey: scopeFieldKey('fire_safety') }, choice: 'include' }, { field: { subjectId: PROJECT, fieldKey: scopeFieldKey('hvac') }, choice: 'include' }] },
  });
  expect(writes.acceptedSuggestions.map((entry) => entry.fieldKey)).toEqual([scopeFieldKey('hvac')]);
  expect(writes.answers).toEqual([]);
  expect(writes.ignoredSuggestions).toBe(1);
});
