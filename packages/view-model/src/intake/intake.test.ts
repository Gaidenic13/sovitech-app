/**
 * The question engine (F-QUESTION-01 to F-QUESTION-09; guardrails rules 3, 4, 5, 6, 7 and 8,
 * section 4): ask, confirm or show; the confirmation test and budget; Continue's writes and their
 * records; the owner's typed values; open items; inline asks; output availability; late findings;
 * suggestions and their guard; the owner's field actions.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { derive, type Candidate, type CandidateEvent } from '@sovitech/domain';
import { productionRegistry, unitByCode } from '@sovitech/registry';
import type { QuestionDefinition, RegistryFieldDefinition } from '@sovitech/registry/validation';
import { DisplayObjectSchema, type ContinueRequest } from '../browser/contract';
import { DEFAULT_FORMAT_OPTIONS } from '../formatting';
import {
  answered,
  confirmedByOwner,
  events,
  found,
  intakeField,
  productionField,
  skippedByOwner,
  testDocument,
  testField,
  testId,
  testTime,
} from '../test-builders';
import {
  confirmationCandidateOf,
  continueRecords,
  findingStepOf,
  findingsOf,
  inlineAsks,
  IntakeRefusal,
  lateFindings,
  openItems,
  outputAvailability,
  parseOwnerAnswer,
  passesConfirmationTest,
  planAcknowledge,
  planConcern,
  planConfirmation,
  planConflictResolution,
  planContinue,
  planQuestion,
  planSkip,
  proposalStage,
  ownerText,
  shownCandidateIdsOf,
  questionsForKnownFields,
  requestedInlineAsk,
  resolveOutputLine,
  scopeSuggestionRule,
  selectConfirmations,
  suggestionsFor,
  type ConfirmationCandidate,
  type IntakeField,
  type Suggestion,
} from './index';

const PROJECT = testId(1);
const BUILDING = testId(2);
const DOC = testDocument(10);
const QUESTIONS = productionRegistry.questions;
const question = (id: string): QuestionDefinition => {
  const found = QUESTIONS.find((entry) => entry.id === id);
  if (found === undefined) throw new Error(`no question ${id}`);
  return found;
};
const refusalOf = (run: () => unknown): string | undefined => {
  try {
    run();
  } catch (error) {
    if (error instanceof IntakeRefusal) return error.code;
    throw error;
  }
  return undefined;
};

const area = productionField('building.grossFloorArea');
const buildingType = productionField('building.type');
const rooms = productionField('building.rooms');
const occupancy = productionField('project.occupancy');
const schedule = productionField('project.operatingSchedule');
const goals = productionRegistry.fields.filter((field) => field.key.startsWith('project.goal.'));
const scope = productionRegistry.fields.filter((field) => field.key.startsWith('project.scope.'));
const inferredHotel = (id = 20, confidence: Candidate['confidence'] = 'medium'): Candidate =>
  found({ id, subjectId: BUILDING, field: buildingType, document: DOC, value: { choice: 'hotel' }, minute: 1, source: 'ai_inference', confidence, excerpt: '212 camere' });

const emptyRequest = (overrides: Partial<ContinueRequest> = {}): ContinueRequest => ({
  answers: [],
  multi: [],
  visibleSuggestions: [],
  shown: { questions: [], confirmations: [] },
  ...overrides,
});

describe('F-QUESTION-02 · rule 5: the confirmation test', () => {
  it('US-REVIEW-05 AC1 · §5-5a: an inferred building type passes; the owner\'s own answer, an engineer field and a stated qualifier do not', () => {
    expect(passesConfirmationTest(intakeField(buildingType, BUILDING, [inferredHotel()], events(), [DOC]))).toBe(true);
    const own = answered({ id: 21, subjectId: BUILDING, field: buildingType, value: { choice: 'hotel' }, minute: 1 });
    expect(passesConfirmationTest(intakeField(buildingType, BUILDING, [own], events({ candidate: [confirmedByOwner(own)] })))).toBe(false);
    const guestRooms = found({ id: 22, subjectId: BUILDING, field: rooms, document: DOC, value: { quantity: { value: 212, unit: 'count', qualifier: 'guest_rooms' } }, minute: 1 });
    expect(passesConfirmationTest(intakeField(rooms, BUILDING, [guestRooms], events(), [DOC]))).toBe(false);
    const confirmed = inferredHotel(23);
    expect(passesConfirmationTest(intakeField(buildingType, BUILDING, [confirmed], events({ candidate: [{ candidateId: confirmed.id, type: 'user_confirmed', by: 'test-owner', role: 'owner', at: testTime(5) }] }), [DOC]))).toBe(false);
  });

  it('G8-2 · rule 5 test 3: a value whose basis is unknown is uncertain on an owner field of the first-estimate set', () => {
    const ownerArea = testField('building.testArea', { kind: 'quantity', subject: 'building', unit: 'm2', qualifierRequired: true, qualifiers: ['gross_total'], criticality: 'first_estimate', confirmBy: 'either' });
    const noBasis = found({ id: 24, subjectId: BUILDING, field: ownerArea, document: DOC, value: { quantity: { value: 45600, unit: 'm2' }, original: '45.600 mp' }, minute: 1 });
    const field = intakeField(ownerArea, BUILDING, [noBasis], events(), [DOC]);
    expect(passesConfirmationTest(field)).toBe(true);
    expect(confirmationCandidateOf(field)?.id).toBe(noBasis.id);
    const withBasis = { ...noBasis, quantity: { value: 45600, unit: 'm2', qualifier: 'gross_total' } };
    expect(passesConfirmationTest(intakeField(ownerArea, BUILDING, [withBasis], events(), [DOC]))).toBe(false);
  });

  it('G5-3 · rule 5 "Budget": the first N by impactRank are shown, the rest overflow, and going over is a defect', () => {
    const candidates: ConfirmationCandidate[] = [5, 3, 9, 1].map((rank, index) => ({ fieldKey: `test.f${String(index)}`, candidateId: testId(index), impactRank: rank, step: 5 }));
    const selection = selectConfirmations(candidates, 2);
    expect(selection.shown.map((entry) => entry.impactRank)).toEqual([1, 3]);
    expect(selection.overflow.map((entry) => entry.impactRank)).toEqual([5, 9]);
    expect(selection.defect).toBe(true);
    expect(selectConfirmations(candidates, 7).defect).toBe(false);
  });
});

describe('F-QUESTION-01 · F-QUESTION-04 · rules 5 and 7: ask, confirm or show', () => {
  it('US-INTAKE-05 · rule 7: an unanswered non-required question is asked with Skip for now; a required one without; after a skip, not again', () => {
    expect(planQuestion({ question: question('q.project.occupancy'), fields: [intakeField(occupancy, PROJECT)], shownConfirmations: new Set(), visibleSuggestion: false }).plan).toEqual({ kind: 'ask', skip: true, afterSkip: false });
    const name = productionField('project.name');
    expect(planQuestion({ question: question('q.project.name'), fields: [intakeField(name, PROJECT)], shownConfirmations: new Set(), visibleSuggestion: false }).plan).toMatchObject({ kind: 'ask', skip: false });
    const skipped = intakeField(occupancy, PROJECT, [], events({ field: [skippedByOwner(PROJECT, occupancy.key, 1)] }));
    expect(planQuestion({ question: question('q.project.occupancy'), fields: [skipped], shownConfirmations: new Set(), visibleSuggestion: false }).plan).toEqual({ kind: 'skipped' });
  });

  it('US-INTAKE-07 AC5 · §5-5a: the inferred type is confirmed only within the budget; declined, it is not prompted again until a new value arrives', () => {
    const hotel = inferredHotel();
    const field = intakeField(buildingType, BUILDING, [hotel], events(), [DOC]);
    expect(planQuestion({ question: question('c.building.type'), fields: [field], shownConfirmations: new Set([hotel.id]), visibleSuggestion: false }).plan).toEqual({ kind: 'confirm', candidateId: hotel.id });
    expect(planQuestion({ question: question('c.building.type'), fields: [field], shownConfirmations: new Set(), visibleSuggestion: false }).plan).toEqual({ kind: 'show' });
    expect(planQuestion({ question: question('q.building.type'), fields: [field], shownConfirmations: new Set(), visibleSuggestion: false }).plan).toEqual({ kind: 'show' });
    const declined = intakeField(buildingType, BUILDING, [hotel], events({ field: [skippedByOwner(BUILDING, buildingType.key, 5)] }), [DOC]);
    expect(planQuestion({ question: question('c.building.type'), fields: [declined], shownConfirmations: new Set([hotel.id]), visibleSuggestion: false }).plan).toEqual({ kind: 'skipped' });
    const newer = { ...inferredHotel(25), createdAt: testTime(9) };
    const again = intakeField(buildingType, BUILDING, [hotel, newer], events({ field: [skippedByOwner(BUILDING, buildingType.key, 5)] }), [DOC]);
    expect(planQuestion({ question: question('c.building.type'), fields: [again], shownConfirmations: new Set([hotel.id, newer.id]), visibleSuggestion: false }).plan.kind).toBe('confirm');
  });

  it('section 4 · GS-1: for any field state, a question with a value on any of its fields is never asked, and the defect check finds none', () => {
    fc.assert(
      fc.property(fc.subarray(goals, { minLength: 1 }), fc.boolean(), fc.boolean(), (answeredGoals, skippedFirst, visible) => {
        const fields = goals.map((goal, index) => {
          const answer = answeredGoals.includes(goal) ? [answered({ id: 100 + index, subjectId: PROJECT, field: goal, value: { choice: 'selected' }, minute: 2 })] : [];
          const skips = skippedFirst && index === 0 ? [skippedByOwner(PROJECT, goal.key, 1)] : [];
          return intakeField(goal, PROJECT, answer, events({ field: skips }));
        });
        const { plan, questionForKnownField } = planQuestion({ question: question('q.project.goals'), fields, shownConfirmations: new Set(), visibleSuggestion: visible });
        expect(plan.kind).toBe('show');
        expect(questionForKnownField).toBe(false);
        expect(questionsForKnownFields(new Map([['q.project.goals', plan]]), fields)).toEqual([]);
      }),
      { numRuns: 100 },
    );
    const empty = goals.map((goal) => intakeField(goal, PROJECT));
    const known = [intakeField(goals[0]!, PROJECT, [answered({ id: 120, subjectId: PROJECT, field: goals[0]!, value: { choice: 'selected' }, minute: 1 })]), ...empty.slice(1)];
    expect(questionsForKnownFields(new Map([['q.project.goals', { kind: 'ask', skip: true, afterSkip: false }]]), known)).toEqual(['q.project.goals']);
  });
});

describe('F-QUESTION-08 · rule 7: step 8 inline asks', () => {
  const slots = productionRegistry.settings.firstEstimateSet.members;
  const everything = (overrides: IntakeField[]): IntakeField[] => {
    const base = [intakeField(area, BUILDING), intakeField(buildingType, BUILDING), ...scope.map((field) => intakeField(field, PROJECT))];
    return base.map((field) => overrides.find((override) => override.field.key === field.field.key) ?? field);
  };

  it('US-INTAKE-17 AC1 AC6: each missing first-estimate slot is asked once; the area until its first skip, a field asked earlier until its second', () => {
    expect(inlineAsks(everything([]), slots).map((ask) => ask.fieldKeys[0])).toEqual(['building.grossFloorArea', 'building.type', 'project.scope.hvac']);
    const areaSkipped = intakeField(area, BUILDING, [], events({ field: [skippedByOwner(BUILDING, area.key, 1)] }));
    const typeSkippedOnce = intakeField(buildingType, BUILDING, [], events({ field: [skippedByOwner(BUILDING, buildingType.key, 1)] }));
    const typeSkippedTwice = intakeField(buildingType, BUILDING, [], events({ field: [skippedByOwner(BUILDING, buildingType.key, 1), skippedByOwner(BUILDING, buildingType.key, 9)] }));
    expect(inlineAsks(everything([areaSkipped, typeSkippedOnce]), slots).map((ask) => ask.fieldKeys[0])).toEqual(['building.type', 'project.scope.hvac']);
    expect(inlineAsks(everything([areaSkipped, typeSkippedTwice]), slots).map((ask) => ask.fieldKeys[0])).toEqual(['project.scope.hvac']);
    const scopeAsk = inlineAsks(everything([]), slots).find((ask) => ask.fieldKeys.length > 1);
    expect(scopeAsk?.fieldKeys).toEqual(scope.map((field) => field.key));
  });
});

describe('F-QUESTION-04 · F-QUESTION-06 · F-VALUE-06: what a Continue writes', () => {
  it('US-INTAKE-08 · rule 7: an answer is written; an unchanged answer is not; a shown question left unanswered is skipped', () => {
    const fields = [intakeField(occupancy, PROJECT), intakeField(schedule, PROJECT)];
    const writes = planContinue({
      step: 5,
      fields,
      suggestions: [],
      request: emptyRequest({
        answers: [{ field: { subjectId: PROJECT, fieldKey: schedule.key }, value: { kind: 'choice', choice: 'business_hours' }, corrects: [] }],
        shown: { questions: ['q.project.occupancy', 'q.project.operatingSchedule'], confirmations: [] },
      }),
    });
    expect(writes.answers).toEqual([{ fieldKey: schedule.key, subjectId: PROJECT, choice: 'business_hours', rejects: [] }]);
    expect(writes.skips).toEqual([{ fieldKey: occupancy.key, subjectId: PROJECT }]);
    const own = answered({ id: 30, subjectId: PROJECT, field: schedule, value: { choice: 'business_hours' }, minute: 1 });
    const unchanged = planContinue({
      step: 5,
      fields: [intakeField(schedule, PROJECT, [own], events({ candidate: [confirmedByOwner(own)] }))],
      suggestions: [],
      request: emptyRequest({ answers: [{ field: { subjectId: PROJECT, fieldKey: schedule.key }, value: { kind: 'choice', choice: 'business_hours' }, corrects: [] }] }),
    });
    expect(unchanged.answers).toEqual([]);
  });

  it('rule 3 · rule 4 · §5-5a: tapping another tile corrects the found type, which the answer names; a confirmation left unanswered is skipped', () => {
    const hotel = inferredHotel();
    const field = intakeField(buildingType, BUILDING, [hotel], events(), [DOC]);
    const corrected = planContinue({
      step: 5,
      fields: [field],
      suggestions: [],
      request: emptyRequest({ answers: [{ field: { subjectId: BUILDING, fieldKey: buildingType.key }, value: { kind: 'choice', choice: 'office' }, corrects: [hotel.id, testId(999)] }], shown: { questions: [], confirmations: [hotel.id] } }),
    });
    expect(corrected.answers).toEqual([{ fieldKey: buildingType.key, subjectId: BUILDING, choice: 'office', rejects: [hotel.id] }]);
    expect(corrected.skips).toEqual([]);
    const left = planContinue({ step: 5, fields: [field], suggestions: [], request: emptyRequest({ shown: { questions: [], confirmations: [hotel.id] } }), shownConfirmations: new Set([hotel.id]) });
    expect(left.skips).toEqual([{ fieldKey: buildingType.key, subjectId: BUILDING }]);
    const records = continueRecords({ projectId: PROJECT, writes: corrected, fields: [field], owner: 'test-owner', at: testTime(10), newId: () => testId(500) });
    expect(records.candidateEvents).toContainEqual(expect.objectContaining({ candidateId: hotel.id, type: 'rejected', role: 'owner' }));
    expect(records.guardrailEvents).toContainEqual(expect.objectContaining({ type: 'owner_corrected_inference', reason: 'confidence:medium' }));
  });

  it('US-INTAKE-21 AC2 · rule 7: step 1\'s Next on an existing project takes each of the four answers, country and city among them; nothing required is skipped', () => {
    const fields = ['project.name', 'project.type', 'project.country', 'project.city'].map((key) => intakeField(productionField(key), PROJECT));
    const writes = planContinue({
      step: 1,
      fields,
      suggestions: [],
      request: emptyRequest({
        answers: [
          { field: { subjectId: PROJECT, fieldKey: 'project.country' }, value: { kind: 'text', text: 'RO' }, corrects: [] },
          { field: { subjectId: PROJECT, fieldKey: 'project.city' }, value: { kind: 'text', text: 'Cluj-Napoca' }, corrects: [] },
        ],
        shown: { questions: ['q.project.name', 'q.project.type', 'q.project.location'], confirmations: [] },
      }),
    });
    expect(writes.answers.map((answer) => answer.fieldKey)).toEqual(['project.country', 'project.city']);
    expect(writes.skips).toEqual([]);
  });

  it('F-QUESTION-04 · rule 6: answer_invalid: a field not asked on the step, an option the field does not list, a malformed request', () => {
    const fields = [intakeField(occupancy, PROJECT)];
    const wrongStep = (): unknown => planContinue({ step: 6, fields, suggestions: [], request: emptyRequest({ answers: [{ field: { subjectId: PROJECT, fieldKey: occupancy.key }, value: { kind: 'choice', choice: 'mixed' }, corrects: [] }] }) });
    expect(refusalOf(wrongStep)).toBe('answer_invalid');
    const badOption = (): unknown => planContinue({ step: 5, fields, suggestions: [], request: emptyRequest({ answers: [{ field: { subjectId: PROJECT, fieldKey: occupancy.key }, value: { kind: 'choice', choice: 'maybe' }, corrects: [] }] }) });
    expect(refusalOf(badOption)).toBe('answer_invalid');
    expect(refusalOf(() => planContinue({ step: 5, fields, suggestions: [], request: { answers: 'all' } }))).toBe('answer_invalid');
  });

  it('US-SCOPE-02 AC4 AC9 · 2.6: a multi-select is read as a whole: the ticked chosen, the others not, and only where it differs from the stored decision', () => {
    const hvac = answered({ id: 40, subjectId: PROJECT, field: scope[0]!, value: { choice: 'include' }, minute: 1 });
    const fields = scope.map((field, index) => (index === 0 ? intakeField(field, PROJECT, [hvac], events({ candidate: [confirmedByOwner(hvac)] })) : intakeField(field, PROJECT)));
    const writes = planContinue({ step: 4, fields, suggestions: [], request: emptyRequest({ multi: [{ questionId: 'q.project.systemsInScope', ticked: [scope[0]!.key, scope[1]!.key] }] }) });
    expect(writes.answers.find((answer) => answer.fieldKey === scope[0]!.key)).toBeUndefined();
    expect(writes.answers.find((answer) => answer.fieldKey === scope[1]!.key)?.choice).toBe('include');
    expect(writes.answers.filter((answer) => answer.choice === 'exclude')).toHaveLength(scope.length - 2);
    expect(writes.skips).toEqual([]);
    const untick = planContinue({ step: 4, fields, suggestions: [], request: emptyRequest({ multi: [{ questionId: 'q.project.systemsInScope', ticked: [] }] }) });
    expect(untick.answers).toEqual([{ fieldKey: scope[0]!.key, subjectId: PROJECT, choice: 'exclude', rejects: [] }]);
    expect(untick.skips).toEqual([]);
  });

  it('rule 3: a visible suggestion is accepted only when the server suggests it now; any other is ignored and counted', () => {
    const area0 = productionRegistry.fields.find((field) => field.key === 'project.automation.hvac')!;
    const fields = productionRegistry.fields.filter((field) => field.key.startsWith('project.automation.')).map((field) => intakeField(field, PROJECT));
    const suggestion: Suggestion = { fieldKey: area0.key, subjectId: PROJECT, choice: 'selected', reasonLineId: 'suggested_because', reasonSlots: { reason: 'HVAC is in scope' }, suggestedBy: 'test-rule:hvac' };
    const request = emptyRequest({
      multi: [{ questionId: 'q.project.automationAreas', ticked: [area0.key, 'project.automation.lighting'] }],
      visibleSuggestions: [
        { field: { subjectId: PROJECT, fieldKey: area0.key }, choice: 'selected' },
        { field: { subjectId: PROJECT, fieldKey: 'project.automation.lighting' }, choice: 'selected' },
      ],
    });
    const writes = planContinue({ step: 7, fields, suggestions: [suggestion], request });
    expect(writes.acceptedSuggestions).toEqual([suggestion]);
    expect(writes.answers.find((answer) => answer.fieldKey === 'project.automation.lighting')?.choice).toBe('selected');
    expect(writes.ignoredSuggestions).toBe(1);
  });
});

describe('F-VALUE-05 · rule 8: the owner\'s typed value', () => {
  it('G8-21 · US-INTAKE-17 AC7: "1.500" reads two ways and is refused; a unit of another dimension, a missing qualifier and a fractional count are refused', () => {
    expect(refusalOf(() => parseOwnerAnswer(area, { kind: 'quantity', raw: '1.500', qualifier: 'gross_total' }))).toBe('number_ambiguous');
    expect(parseOwnerAnswer(area, { kind: 'quantity', raw: '45600', qualifier: 'gross_total' })).toEqual({ quantity: { value: 45600, unit: 'm2', qualifier: 'gross_total' }, original: { text: '45600' } });
    expect(parseOwnerAnswer(area, { kind: 'quantity', raw: '45 600 mp', qualifier: 'gross_total' })).toEqual({ quantity: { value: 45600, unit: 'm2', qualifier: 'gross_total' }, original: { text: '45 600 mp' } });
    expect(parseOwnerAnswer(area, { kind: 'quantity', raw: 'cca. 2350', qualifier: 'gross_total' })).toEqual({ quantity: { value: 2350, unit: 'm2', qualifier: 'gross_total', approximate: true }, original: { text: 'cca. 2350' } });
    expect(refusalOf(() => parseOwnerAnswer(area, { kind: 'quantity', raw: '45600 kWh', qualifier: 'gross_total' }))).toBe('unit_mismatch');
    expect(refusalOf(() => parseOwnerAnswer(area, { kind: 'quantity', raw: '45600' }))).toBe('qualifier_required');
    expect(refusalOf(() => parseOwnerAnswer(area, { kind: 'quantity', raw: '45600', qualifier: 'Gross_Total' }))).toBe('answer_invalid');
    expect(refusalOf(() => parseOwnerAnswer(rooms, { kind: 'quantity', raw: '2,5', qualifier: 'guest_rooms' }))).toBe('answer_invalid');
    expect(refusalOf(() => parseOwnerAnswer(buildingType, { kind: 'choice', choice: 'castle' }))).toBe('answer_invalid');
    expect(unitByCode('m2')?.symbol).toBe('m²');
  });
});

describe('F-QUESTION-07 · rule 7: open items say who acts', () => {
  it('US-REVIEW-12 AC1 AC2 · G7-5: owner conflicts, confirmations left and missing first-estimate slots are for the owner, by impact; the rest one line per group', () => {
    const ownerCount = testField('project.testCount', { kind: 'count', subject: 'project', unit: 'count', confirmBy: 'owner', impactRank: 30, valueShape: 'non_negative_integer' });
    const own = answered({ id: 50, subjectId: PROJECT, field: ownerCount, value: { quantity: { value: 28, unit: 'count' } }, minute: 1 });
    const doc = found({ id: 51, subjectId: PROJECT, field: ownerCount, document: DOC, value: { quantity: { value: 30, unit: 'count' } }, minute: 9 });
    const conflicted = intakeField(ownerCount, PROJECT, [own, doc], events({ candidate: [confirmedByOwner(own)] }), [DOC]);
    const hotel = inferredHotel();
    const typeField = intakeField(buildingType, BUILDING, [hotel], events(), [DOC]);
    const fields = [conflicted, typeField, intakeField(area, BUILDING), ...scope.map((field) => intakeField(field, PROJECT))];
    const left: ConfirmationCandidate = { fieldKey: buildingType.key, candidateId: hotel.id, impactRank: buildingType.impactRank, step: 5 };
    const overflow: ConfirmationCandidate = { fieldKey: area.key, candidateId: testId(77), impactRank: area.impactRank, step: 3 };
    const items = openItems({ fields, confirmationsLeft: [left], confirmationOverflow: [overflow], unverifiedAssetTypes: 131, siteSurveyNeeded: true });
    expect(items.forYou.map((item) => [item.fieldKey, item.reason])).toEqual([
      [area.key, 'first_estimate_missing'],
      [buildingType.key, 'confirmation'],
      [scope[0]!.key, 'first_estimate_missing'],
      [ownerCount.key, 'conflict'],
    ]);
    expect(items.engineer).toEqual([
      { group: 'equipment_classifications', count: 131, fieldLabels: [] },
      { group: 'site_survey', count: 1, fieldLabels: [] },
      { group: 'engineer_values', count: 1, fieldLabels: ['Gross floor area'] },
    ]);
  });
});

describe('F-PROPOSAL-07 · rule 7 · prompt 3 5.4: which outputs will be available', () => {
  it('US-INTAKE-16 AC3: with every dataset gate closed, every output reads "Not available yet", naming the datasets and the owner\'s missing inputs with Add', () => {
    const fields = [intakeField(area, BUILDING), intakeField(buildingType, BUILDING), ...scope.map((field) => intakeField(field, PROJECT))];
    const closed = new Set(['dataset-cost-ranges', 'dataset-point-templates']);
    const plans = outputAvailability({ fields, closedGates: closed });
    expect(plans.map((plan) => plan.output)).toEqual(productionRegistry.formulas.flatMap((formula) => formula.outputs));
    for (const plan of plans) expect(plan.availability).toBe('not_available_yet');
    const indicative = plans.find((plan) => plan.output === 'capex.indicativeRange')!;
    expect(indicative.missingDatasets).toEqual(['SOVITECH cost ranges and benchmarks']);
    expect(indicative.missingFields).toEqual([area.key, buildingType.key, scope[0]!.key]);
    expect(plans.find((plan) => plan.output === 'measures.priorityOrder')?.missingDatasets).toEqual(['SOVITECH function set']);
    const line = resolveOutputLine({ projectId: PROJECT, plan: indicative, fields, format: DEFAULT_FORMAT_OPTIONS });
    DisplayObjectSchema.parse(line);
    expect(line).toMatchObject({
      valueId: `project:${PROJECT}.outputs.capex.indicativeRange`,
      kind: 'line',
      shape: 'missing',
      missing: 'not_available_yet',
      text: 'Not available yet: SOVITECH cost ranges and benchmarks; gross floor area; building type; systems in scope',
    });
    expect(line.actions?.map((action) => (action.kind === 'add' ? action.label : ''))).toEqual(['Add gross floor area', 'Add building type', 'Add systems in scope']);
    expect(line.lines).toBeUndefined();
    const onlyOwner = outputAvailability({ fields, closedGates: new Set() }).find((plan) => plan.output === 'capex.indicativeRange')!;
    expect(resolveOutputLine({ projectId: PROJECT, plan: onlyOwner, fields, format: DEFAULT_FORMAT_OPTIONS }).lines?.[0]?.text).toBe('Add the gross floor area to see this.');
  });

  it('R-003 · US-INTAKE-16 AC3 · US-INTAKE-17 AC2 · G7-11 · rule 7: with the building type and the systems answered and the gross floor area missing, the stage 2 output (the line the Proposal card shows) names the area beside the datasets, with "Add gross floor area"; with the datasets approved it is still not available, and once the area holds a value it names the datasets only', () => {
    const hotel = answered({ id: 140, subjectId: BUILDING, field: buildingType, value: { choice: 'hotel' }, minute: 1 });
    const included = answered({ id: 141, subjectId: PROJECT, field: scope[0]!, value: { choice: 'include' }, minute: 1 });
    const answeredFields = [
      intakeField(area, BUILDING),
      intakeField(buildingType, BUILDING, [hotel], events({ candidate: [confirmedByOwner(hotel)] })),
      ...scope.map((field, index) => (index === 0 ? intakeField(field, PROJECT, [included]) : intakeField(field, PROJECT))),
    ];
    const closed = new Set(['dataset-cost-ranges', 'dataset-point-templates']);
    // The stage the rules give: the area is missing and the registry allows no Indicative range without it (`refuse`).
    expect(proposalStage({ fields: answeredFields, closedGates: closed })).toBe('preliminary_investment_estimate');
    const preliminary = outputAvailability({ fields: answeredFields, closedGates: closed }).find((plan) => plan.output === 'capex.preliminaryEstimate')!;
    expect(preliminary).toEqual({
      output: 'capex.preliminaryEstimate',
      availability: 'not_available_yet',
      missingDatasets: ['SOVITECH point templates', 'SOVITECH cost ranges and benchmarks'],
      missingFields: [area.key],
    });
    const line = resolveOutputLine({ projectId: PROJECT, plan: preliminary, fields: answeredFields, format: DEFAULT_FORMAT_OPTIONS });
    DisplayObjectSchema.parse(line);
    expect(line).toMatchObject({
      valueId: `project:${PROJECT}.outputs.capex.preliminaryEstimate`,
      missing: 'not_available_yet',
      text: 'Not available yet: SOVITECH point templates; SOVITECH cost ranges and benchmarks; gross floor area',
      actions: [{ kind: 'add', field: { subjectId: BUILDING, fieldKey: area.key }, label: 'Add gross floor area', step: 8 }],
    });
    // The same action the outputs that read the area carry (the Indicative range's).
    const indicative = outputAvailability({ fields: answeredFields, closedGates: closed }).find((plan) => plan.output === 'capex.indicativeRange')!;
    expect(resolveOutputLine({ projectId: PROJECT, plan: indicative, fields: answeredFields, format: DEFAULT_FORMAT_OPTIONS }).actions).toEqual(line.actions);
    // Rule 10's stage 1 basis: no stage 2 figure while first-estimate data is missing, the datasets approved or not.
    const approved = outputAvailability({ fields: answeredFields, closedGates: new Set() }).find((plan) => plan.output === 'capex.preliminaryEstimate')!;
    expect(approved).toMatchObject({ availability: 'not_available_yet', missingDatasets: [], missingFields: [area.key] });
    expect(resolveOutputLine({ projectId: PROJECT, plan: approved, fields: answeredFields, format: DEFAULT_FORMAT_OPTIONS })).toMatchObject({
      text: 'Not available yet: gross floor area',
      lines: [{ id: 'add_to_see_this', text: 'Add the gross floor area to see this.' }],
    });
    // With the area answered, only the datasets are missing, and the owner has nothing to add.
    const typed = answered({ id: 142, subjectId: BUILDING, field: area, value: { quantity: { value: 2400, unit: 'm2', qualifier: 'gross_total' } }, minute: 2 });
    const complete = answeredFields.map((field) => (field.field.key === area.key ? intakeField(area, BUILDING, [typed]) : field));
    const after = outputAvailability({ fields: complete, closedGates: closed }).find((plan) => plan.output === 'capex.preliminaryEstimate')!;
    expect(after.missingFields).toEqual([]);
    const datasetsOnly = resolveOutputLine({ projectId: PROJECT, plan: after, fields: complete, format: DEFAULT_FORMAT_OPTIONS });
    expect(datasetsOnly.text).toBe('Not available yet: SOVITECH point templates; SOVITECH cost ranges and benchmarks');
    expect(datasetsOnly.actions ?? []).toEqual([]);
    expect(outputAvailability({ fields: complete, closedGates: new Set() }).find((plan) => plan.output === 'capex.preliminaryEstimate')?.availability).toBe('range');
    // Outputs that carry no stage still wait only for what their formula reads (the points estimate never reads the area).
    expect(outputAvailability({ fields: answeredFields, closedGates: closed }).find((plan) => plan.output === 'points.hardwareIo')?.missingFields).toEqual([]);
  });
});

describe('F-QUESTION-09 · rule 7: late findings', () => {
  it('US-INTAKE-19 · G7-4: a dot on each left step with a finding after the owner left it, never the step on screen or step 2; one notice for what arrived since the last poll', () => {
    const left = new Map([
      [3, testTime(10)],
      [4, testTime(10)],
      [5, testTime(10)],
    ] as const);
    const findings = [
      { id: 'a', step: 3 as const, arrivedAt: testTime(12) },
      { id: 'b', step: 3 as const, arrivedAt: testTime(13) },
      { id: 'c', step: 4 as const, arrivedAt: testTime(5) },
      { id: 'd', step: 6 as const, arrivedAt: testTime(14) },
      { id: 'e', step: 2 as const, arrivedAt: testTime(14) },
    ];
    expect(lateFindings({ left, current: 6, since: undefined, findings })).toEqual({ dots: [3], noticeCount: 0 });
    expect(lateFindings({ left, current: 6, since: testTime(12), findings })).toEqual({ dots: [3], noticeCount: 1 });
    expect(lateFindings({ left, current: 3, since: testTime(1), findings })).toEqual({ dots: [], noticeCount: 0 });
  });

  it('ADR 0039 decision 3: findings are values that are not the owner\'s own, on the step that shows their field', () => {
    const floors = productionField('building.floors');
    expect(findingStepOf(intakeField(floors, BUILDING))).toBe(3);
    expect(findingStepOf(intakeField(area, BUILDING))).toBe(3);
    expect(findingStepOf(intakeField(buildingType, BUILDING))).toBe(5);
    expect(findingStepOf(intakeField(scope[0]!, PROJECT))).toBe(4);
    expect(findingStepOf(intakeField(goals[0]!, PROJECT))).toBe(6);
    const own = answered({ id: 60, subjectId: PROJECT, field: occupancy, value: { choice: 'mixed' }, minute: 3 });
    const fields = [intakeField(buildingType, BUILDING, [inferredHotel()], events(), [DOC]), intakeField(occupancy, PROJECT, [own])];
    expect(findingsOf(fields)).toEqual([{ id: `candidate:${testId(20)}`, step: 5, arrivedAt: testTime(1) }]);
  });
});

describe('F-QUESTION-06 · rules 3 and 11: suggestions and their guard', () => {
  const detectionKey = (system: string): string => `building.testDetection.${system}`;
  const detectionField = (system: string): RegistryFieldDefinition => testField(detectionKey(system), { kind: 'enum', subject: 'building', options: ['present'], confirmBy: 'owner' });
  const detected = (system: string, id: number): IntakeField =>
    intakeField(detectionField(system), BUILDING, [found({ id, subjectId: BUILDING, field: detectionField(system), document: DOC, value: { choice: 'present' }, minute: 1 })], events(), [DOC]);

  it('US-SCOPE-02 AC1 AC2 · G11-9: a detected system is suggested with its reason; a life-safety system or one never preselected is not', () => {
    const fields = [detected('hvac', 70), detected('fire_safety', 71), detected('access_control', 72), ...scope.map((field) => intakeField(field, PROJECT))];
    const rule = scopeSuggestionRule(detectionKey, () => 'Schema instalatii.pdf');
    const kept = suggestionsFor(fields, [rule]);
    expect(kept).toEqual([
      {
        fieldKey: 'project.scope.hvac',
        subjectId: PROJECT,
        choice: 'include',
        reasonLineId: 'suggested_because_document_names',
        reasonSlots: { document: 'Schema instalatii.pdf', system: 'HVAC' },
        suggestedBy: `detection:${testId(70)}`,
      },
    ]);
    expect(suggestionsFor(fields)).toEqual([]);
  });

  it('rule 3 "Facts versus choices" · rule 7: never a fact, never over an answer or a skip, never an option the field does not list', () => {
    const typeField = intakeField(buildingType, BUILDING);
    const skipped = intakeField(occupancy, PROJECT, [], events({ field: [skippedByOwner(PROJECT, occupancy.key, 1)] }));
    const open = intakeField(schedule, PROJECT);
    const rule = (): Suggestion[] => [
      { fieldKey: buildingType.key, subjectId: BUILDING, choice: 'hotel', reasonLineId: 'suggested_because', reasonSlots: { reason: 'x' }, suggestedBy: 'test' },
      { fieldKey: occupancy.key, subjectId: PROJECT, choice: 'mixed', reasonLineId: 'suggested_because', reasonSlots: { reason: 'x' }, suggestedBy: 'test' },
      { fieldKey: schedule.key, subjectId: PROJECT, choice: 'always', reasonLineId: 'suggested_because', reasonSlots: { reason: 'x' }, suggestedBy: 'test' },
      { fieldKey: schedule.key, subjectId: PROJECT, choice: 'business_hours', reasonLineId: 'suggested_because', reasonSlots: { reason: 'x' }, suggestedBy: 'test' },
    ];
    expect(suggestionsFor([typeField, skipped, open], [rule]).map((suggestion) => `${suggestion.fieldKey}=${suggestion.choice}`)).toEqual(['project.operatingSchedule=business_hours']);
  });
});

describe('F-REVIEW-03 · F-REVIEW-04 · rules 3, 4, 5 and 7: the owner\'s field actions', () => {
  const who = { by: 'test-owner', at: testTime(20) };
  const engineerType = testField('building.testAssetType', { kind: 'enum', subject: 'building', options: ['ahu', 'fan'], confirmBy: 'engineer' });

  it('G3-3 · G3-10: "Looks right" is owner_acknowledged on engineer items only; "Something\'s wrong" is the owner\'s note', () => {
    const inferred = found({ id: 80, subjectId: BUILDING, field: engineerType, document: DOC, value: { choice: 'ahu' }, minute: 1, source: 'ai_inference', confidence: 'medium' });
    const field = intakeField(engineerType, BUILDING, [inferred], events(), [DOC]);
    expect(planAcknowledge({ fields: [field], candidateIds: [inferred.id, inferred.id], ...who })).toEqual([{ candidateId: inferred.id, type: 'owner_acknowledged', by: 'test-owner', role: 'owner', at: testTime(20) }]);
    expect(refusalOf(() => planAcknowledge({ fields: [intakeField(buildingType, BUILDING, [inferredHotel()], events(), [DOC])], candidateIds: [testId(20)], ...who }))).toBe('not_an_engineer_field');
    const concern = { candidateId: inferred.id, type: 'rejected' as const, by: 'test-owner', role: 'owner' as const, at: testTime(20), reason: 'owner_concern' };
    expect(planConcernOf(field, inferred.id)).toEqual(concern);
    const after = derive(engineerType, [inferred], events({ candidate: [concern] }), { subjectId: BUILDING, document: () => DOC, unit: unitByCode, inputState: () => undefined, datasetApproved: () => false });
    expect(after.activeCandidateId).toBe(inferred.id);
  });

  it('G3-3 · G3-10 · rule 3 · ADR 0036 decision 13: "Looks right" on a value this owner already acknowledged, and "Something\'s wrong" on one this owner already rejected, plan nothing; another owner\'s, another value or the other action is planned as before', () => {
    const inferred = found({ id: 81, subjectId: BUILDING, field: engineerType, document: DOC, value: { choice: 'ahu' }, minute: 1, source: 'ai_inference', confidence: 'medium' });
    const other = found({ id: 82, subjectId: BUILDING, field: engineerType, document: DOC, value: { choice: 'ahu' }, minute: 2, source: 'document' });
    const acknowledged: CandidateEvent = { candidateId: inferred.id, type: 'owner_acknowledged', by: 'test-owner', role: 'owner', at: testTime(10), reason: 'looks_right' };
    const rejected: CandidateEvent = { candidateId: inferred.id, type: 'rejected', by: 'test-owner', role: 'owner', at: testTime(11), reason: 'owner_concern' };
    const field = intakeField(engineerType, BUILDING, [inferred, other], events({ candidate: [acknowledged, rejected] }), [DOC]);
    // A repeat of this owner's own action records nothing; with no item left, the plan is empty.
    expect(planAcknowledge({ fields: [field], candidateIds: [inferred.id], ...who, prior: [acknowledged, rejected] })).toEqual([]);
    expect(planConcern({ fields: [field], candidateId: inferred.id, ...who, prior: [acknowledged, rejected] })).toBeNull();
    // In one bulk, only the item not yet acknowledged is planned.
    expect(planAcknowledge({ fields: [field], candidateIds: [inferred.id, other.id], ...who, prior: [acknowledged] })).toEqual([{ candidateId: other.id, type: 'owner_acknowledged', by: 'test-owner', role: 'owner', at: testTime(20) }]);
    // The other action on the same value is not a repeat: a concern after "Looks right", and "Looks right" after a concern.
    expect(planConcern({ fields: [field], candidateId: inferred.id, ...who, prior: [acknowledged] })).toMatchObject({ type: 'rejected', reason: 'owner_concern' });
    expect(planAcknowledge({ fields: [field], candidateIds: [inferred.id], ...who, prior: [rejected] })).toMatchObject([{ type: 'owner_acknowledged' }]);
    // Another owner's acknowledgement or concern is theirs, not this owner's.
    const theirs = [acknowledged, rejected].map((event) => ({ ...event, by: 'test-other-owner' }));
    expect(planAcknowledge({ fields: [field], candidateIds: [inferred.id], ...who, prior: theirs })).toHaveLength(1);
    expect(planConcern({ fields: [field], candidateId: inferred.id, ...who, prior: theirs })).not.toBeNull();
    // The refusals still come first: a repeat on a value an engineer has since verified is refused, never a quiet no-op.
    const verification: CandidateEvent = { candidateId: inferred.id, type: 'engineer_verified', by: 'test-engineer', role: 'sovitech_engineer', at: testTime(12) };
    const verified = intakeField(engineerType, BUILDING, [inferred], events({ candidate: [rejected, verification] }), [DOC]);
    expect(refusalOf(() => planConcern({ fields: [verified], candidateId: inferred.id, ...who, prior: [rejected, verification] }))).toBe('shown_value_changed');
  });

  it('US-REVIEW-05 AC4: Yes on a shown confirmation is user_confirmed; not shown, refused', () => {
    const hotel = inferredHotel();
    const field = intakeField(buildingType, BUILDING, [hotel], events(), [DOC]);
    expect(planConfirmation({ fields: [field], candidateId: hotel.id, shownConfirmations: new Set([hotel.id]), ...who })).toMatchObject({ type: 'user_confirmed', role: 'owner' });
    expect(refusalOf(() => planConfirmation({ fields: [field], candidateId: hotel.id, shownConfirmations: new Set(), ...who }))).toBe('confirmation_not_shown');
  });

  it('US-REVIEW-11 AC3: the owner resolves an owner conflict, naming what they saw; an engineer\'s conflict or a closed one is refused', () => {
    const count = testField('project.testCount', { kind: 'count', subject: 'project', unit: 'count', confirmBy: 'owner', valueShape: 'non_negative_integer' });
    const a = found({ id: 90, subjectId: PROJECT, field: count, document: DOC, value: { quantity: { value: 3, unit: 'count' } }, minute: 1 });
    const b = found({ id: 91, subjectId: PROJECT, field: count, document: DOC, value: { quantity: { value: 4, unit: 'count' } }, minute: 2 });
    const field = intakeField(count, PROJECT, [a, b], events(), [DOC]);
    expect(planConflictResolution({ field, chosenCandidateId: b.id, ...who })).toMatchObject({ type: 'conflict_resolved', chosenCandidateId: b.id, coveredCandidateIds: [a.id, b.id], role: 'owner' });
    expect(refusalOf(() => planConflictResolution({ field: intakeField(count, PROJECT, [a], events(), [DOC]), chosenCandidateId: a.id, ...who }))).toBe('conflict_not_open');
    const engineerCount = { ...count, key: 'project.testEngineerCount', confirmBy: 'engineer' as const };
    const engineerField = intakeField(engineerCount, PROJECT, [{ ...a, fieldKey: engineerCount.key }, { ...b, fieldKey: engineerCount.key }], events(), [DOC]);
    expect(refusalOf(() => planConflictResolution({ field: engineerField, chosenCandidateId: b.id, ...who }))).toBe('routed_to_engineer');
  });

  it('G7-3 · rule 7: Skip for now skips each field; never a required question or one with a value', () => {
    expect(planSkip({ question: question('q.project.occupancy'), fields: [intakeField(occupancy, PROJECT)], ...who })).toEqual([{ subjectId: PROJECT, fieldKey: occupancy.key, type: 'skipped', by: 'test-owner', role: 'owner', at: testTime(20) }]);
    expect(refusalOf(() => planSkip({ question: question('q.project.name'), fields: [intakeField(productionField('project.name'), PROJECT)], ...who }))).toBe('question_required');
    const own = answered({ id: 95, subjectId: PROJECT, field: occupancy, value: { choice: 'mixed' }, minute: 1 });
    expect(refusalOf(() => planSkip({ question: question('q.project.occupancy'), fields: [intakeField(occupancy, PROJECT, [own])], ...who }))).toBe('question_answered');
  });
});

function planConcernOf(field: IntakeField, candidateId: string): unknown {
  return planConcern({ fields: [field], candidateId, by: 'test-owner', at: testTime(20) });
}

describe('phase 3 part B: the question engine\'s own refusals and readings (the unit half of G4-36, G7-9, G2-13, G8-22, G8-23, G3-19, G7-10, G10-11)', () => {
  const who = { by: 'test-owner', at: testTime(30) };

  it('G4-36 · rule 4: an answer on Continue that does not name the value the field shows is refused; one that names it, or repeats the owner\'s own, passes', () => {
    const own = answered({ id: 100, subjectId: BUILDING, field: buildingType, value: { choice: 'hotel' }, minute: 1 });
    const field = intakeField(buildingType, BUILDING, [own], events({ candidate: [confirmedByOwner(own)] }));
    expect(shownCandidateIdsOf(field.state)).toEqual([own.id]);
    const answer = (choice: string, corrects: string[]) =>
      planContinue({ step: 5, fields: [field], suggestions: [], request: emptyRequest({ answers: [{ field: { subjectId: BUILDING, fieldKey: buildingType.key }, value: { kind: 'choice', choice }, corrects }] }) });
    expect(refusalOf(() => answer('office', []))).toBe('shown_value_changed');
    expect(answer('office', [own.id]).answers).toEqual([{ fieldKey: buildingType.key, subjectId: BUILDING, choice: 'office', rejects: [own.id] }]);
    expect(answer('hotel', []).answers).toEqual([]);
    const hotel = inferredHotel(101);
    const foundType = intakeField(buildingType, BUILDING, [hotel], events(), [DOC]);
    expect(refusalOf(() => planContinue({ step: 5, fields: [foundType], suggestions: [], request: emptyRequest({ answers: [{ field: { subjectId: BUILDING, fieldKey: buildingType.key }, value: { kind: 'choice', choice: 'office' }, corrects: [] }] }) }))).toBe('shown_value_changed');
  });

  it('G7-9 · G2-13 · rules 2 and 7: owner text that shows nothing, or holds a control, a lone surrogate or a bidirectional control, is refused; Romanian diacritics pass', () => {
    const name = productionField('project.name');
    for (const blank of ['\u200B', '\u200D\u2060', '\u200E\u200F', '\u180E', '\u3164', '\u2800', '\u115F\u1160', '\uFFA0', ' \u00A0 ']) {
      expect(refusalOf(() => ownerText(name, blank)), JSON.stringify(blank)).toBe('answer_invalid');
    }
    for (const refused of ['TEST\u0000NUL', 'TEST\uD800x', 'TEST \u202E21 egap', 'TEST\u2066x\u2069', 'TEST\u001Bx']) {
      expect(refusalOf(() => ownerText(name, refused)), JSON.stringify(refused)).toBe('answer_invalid');
    }
    expect(ownerText(name, '  Hotel  Știrbei   Brașov ')).toBe('Hotel Știrbei Brașov');
    expect(parseOwnerAnswer(name, { kind: 'text', text: 'Casa Țăranului' })).toEqual({ text: 'Casa Țăranului' });
  });

  it('G8-22 · rule 8: an area below zero is refused; zero and a large value stay (the plausibility check is rule 8\'s Please check)', () => {
    expect(refusalOf(() => parseOwnerAnswer(area, { kind: 'quantity', raw: '-5', qualifier: 'gross_total' }))).toBe('answer_invalid');
    expect(refusalOf(() => parseOwnerAnswer(area, { kind: 'quantity', raw: '-5 mp', qualifier: 'gross_total' }))).toBe('answer_invalid');
    expect(parseOwnerAnswer(area, { kind: 'quantity', raw: '0', qualifier: 'gross_total' }).quantity?.value).toBe(0);
    expect(parseOwnerAnswer(area, { kind: 'quantity', raw: '999999999', qualifier: 'gross_total' }).quantity?.value).toBe(999999999);
  });

  it('G8-23 · rule 8: a typed quantity keeps its entry exactly as written, and Continue\'s records carry an original they are given', () => {
    expect(parseOwnerAnswer(area, { kind: 'quantity', raw: 'cca. 1 234,5 mp', qualifier: 'gross_total' })).toEqual({
      quantity: { value: 1234.5, unit: 'm2', qualifier: 'gross_total', approximate: true },
      original: { text: 'cca. 1 234,5 mp' },
    });
    const field = intakeField(occupancy, PROJECT);
    const records = continueRecords({
      projectId: PROJECT,
      writes: { answers: [{ fieldKey: occupancy.key, subjectId: PROJECT, choice: 'mixed', original: { text: 'TEST as written' }, rejects: [] }], acceptedSuggestions: [], skips: [], ignoredSuggestions: 0 },
      fields: [field],
      owner: 'test-owner',
      at: testTime(40),
      newId: () => testId(600),
    });
    expect(records.candidates[0]?.original).toEqual({ text: 'TEST as written' });
  });

  it('G3-19 · rule 4: "Something\'s wrong" on a value an engineer verified is refused', () => {
    const engineerType = testField('building.testAssetType', { kind: 'enum', subject: 'building', options: ['ahu', 'fan'], confirmBy: 'engineer' });
    const inferred = found({ id: 110, subjectId: BUILDING, field: engineerType, document: DOC, value: { choice: 'ahu' }, minute: 1, source: 'ai_inference', confidence: 'medium' });
    const verification: CandidateEvent = { candidateId: inferred.id, type: 'engineer_verified', by: 'test-engineer', role: 'sovitech_engineer', at: testTime(5) };
    const verified = intakeField(engineerType, BUILDING, [inferred], events({ candidate: [verification] }), [DOC]);
    expect(refusalOf(() => planConcern({ fields: [verified], candidateId: inferred.id, ...who }))).toBe('shown_value_changed');
    const unverified = intakeField(engineerType, BUILDING, [inferred], events(), [DOC]);
    expect(planConcern({ fields: [unverified], candidateId: inferred.id, ...who })).toMatchObject({ type: 'rejected', reason: 'owner_concern' });
  });

  it('G7-10 · rule 7: a skip counts only where the question is asked now; a repeat writes nothing; an early skip of step 8\'s ask is refused', () => {
    const areaQuestion = question('q.building.grossFloorArea');
    const fresh = [intakeField(area, BUILDING)];
    const skipsOf = (fields: IntakeField[], context: Parameters<typeof planSkip>[0]['context']) => planSkip({ question: areaQuestion, fields, ...who, context });
    const ask = { kind: 'ask', skip: true, afterSkip: false } as const;
    expect(skipsOf(fresh, { step: 8, plan: ask, inlineAskNow: true })).toEqual([{ subjectId: BUILDING, fieldKey: area.key, type: 'skipped', by: 'test-owner', role: 'owner', at: testTime(30), reason: 'generate_without_it' }]);
    expect(refusalOf(() => skipsOf(fresh, { step: 3, plan: ask, inlineAskNow: true }))).toBe('answer_invalid');
    expect(skipsOf(fresh, { plan: ask, inlineAskNow: true })).toHaveLength(1);
    const skippedOnce = [intakeField(area, BUILDING, [], events({ field: [skippedByOwner(BUILDING, area.key, 10)] }))];
    expect(skipsOf(skippedOnce, { step: 8, plan: { kind: 'skipped' }, inlineAskNow: false })).toEqual([]);
    expect(skipsOf(skippedOnce, { plan: { kind: 'skipped' }, inlineAskNow: false })).toEqual([]);
    const typeQuestion = question('q.building.type');
    const typeSkippedOnStep5 = [intakeField(buildingType, BUILDING, [], events({ field: [skippedByOwner(BUILDING, buildingType.key, 10)] }))];
    expect(planSkip({ question: typeQuestion, fields: typeSkippedOnStep5, ...who, context: { step: 5, plan: { kind: 'skipped' }, inlineAskNow: true } })).toEqual([]);
    expect(planSkip({ question: typeQuestion, fields: typeSkippedOnStep5, ...who, context: { step: 8, plan: { kind: 'skipped' }, inlineAskNow: true } })).toMatchObject([{ reason: 'generate_without_it' }]);
    // G7-11 · PRD R-012: the ask step 8 serves on the owner's "Add" (a first-estimate field with no value, its skip
    // since outdated by a later value its author withdrew) is a skip at step 8 too; from another step it is not.
    const withdrawn = answered({ id: 125, subjectId: BUILDING, field: area, value: { quantity: { value: 900, unit: 'm2', qualifier: 'gross_total' } }, minute: 20 });
    const rejectedLater = intakeField(area, BUILDING, [withdrawn], events({ field: [skippedByOwner(BUILDING, area.key, 10)], candidate: [{ candidateId: withdrawn.id, type: 'withdrawn', by: 'test-owner', role: 'owner', at: testTime(25) }] }));
    expect(requestedInlineAsk([rejectedLater], area.key)).toEqual({ fieldKeys: [area.key], subjectId: BUILDING });
    expect(refusalOf(() => skipsOf([rejectedLater], { step: 8, plan: { kind: 'skipped' }, inlineAskNow: false }))).toBe('answer_invalid');
    expect(skipsOf([rejectedLater], { step: 8, plan: { kind: 'skipped' }, inlineAskNow: false, requestedAskNow: true })).toMatchObject([{ reason: 'generate_without_it' }]);
    expect(refusalOf(() => skipsOf([rejectedLater], { step: 3, plan: { kind: 'skipped' }, inlineAskNow: false, requestedAskNow: true }))).toBe('answer_invalid');
    expect(requestedInlineAsk([intakeField(area, BUILDING, [withdrawn], events())], area.key)).toBeUndefined();
    expect(requestedInlineAsk([intakeField(occupancy, PROJECT)], occupancy.key)).toBeUndefined();
    const hotel = inferredHotel(120);
    const shownQuestion = intakeField(buildingType, BUILDING, [hotel], events(), [DOC]);
    const forged = planContinue({ step: 5, fields: [shownQuestion], suggestions: [], request: emptyRequest({ shown: { questions: [], confirmations: [hotel.id] } }), shownConfirmations: new Set() });
    expect(forged.skips).toEqual([]);
  });

  it('G10-11 · rule 10: with every dataset gate closed the Proposal card names "Preliminary investment estimate"; "Indicative range" only where its formula runs without the missing input and its dataset is approved', () => {
    const everything = productionRegistry.fields.filter((field) => field.criticality === 'first_estimate').map((field) => intakeField(field, field.subject === 'project' ? PROJECT : BUILDING));
    const closed = new Set(['dataset-cost-ranges', 'dataset-point-templates']);
    expect(proposalStage({ fields: everything, closedGates: closed })).toBe('preliminary_investment_estimate');
    expect(proposalStage({ fields: everything, closedGates: new Set() })).toBe('preliminary_investment_estimate');
    const lenient = productionRegistry.formulas.map((formula) => (formula.id === 'capexIndicativeRange' ? { ...formula, unknownPolicy: 'range_over_options' as const } : formula));
    expect(proposalStage({ fields: everything, closedGates: new Set(), formulas: lenient })).toBe('indicative_range');
    expect(proposalStage({ fields: everything, closedGates: closed, formulas: lenient })).toBe('preliminary_investment_estimate');
  });
});
