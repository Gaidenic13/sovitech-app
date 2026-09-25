/**
 * G4-6 (docs/guardrails.md section 7; rule 4 "Documents that disagree", "Routing").
 * Situation: tender shows 6 CTAs and as-built shows 5.
 * Expected: conflict. As-built is proposed as active, and it goes to the engineer.
 *
 * The two documents each state a number of air handling units, held as TEST
 * readings of one count field (qualifier "ahu"). The register count of assets is
 * a different value, calculated from the asset register (2.5; G4-3); what this
 * case exercises is how disagreeing documents are handled: a conflict, a proposal
 * by document stage and never by issue date (the tender here carries the later
 * date), and routing to the engineer, because equipment is an engineer field
 * (rule 3). The stage order is rule 4's list, injected as TEST registry data.
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { derive, type DocumentStage } from '@sovitech/domain';
import {
  TEST_STAGE_ORDER,
  documentReading,
  testContext,
  testDocument,
  testEvents,
  testField,
} from './_support/builders';

const PROJECT = 'test-project-g4-6';
const BUILDING = 'test-building-g4-6';

const ahuCountField = testField('test.building.ahu_count_stated', {
  kind: 'count',
  subject: 'building',
  unit: 'count',
  qualifierRequired: true,
  qualifiers: ['ahu'],
  confirmBy: 'engineer',
});

function expectConflictLaterStageProposedForEngineer(
  laterStage: DocumentStage,
  earlierStage: DocumentStage,
  laterStageCount: number,
  earlierStageCount: number,
  laterStageArrivesFirst: boolean,
): void {
  // The earlier-stage document is issued after the later-stage one: a date never decides.
  const later = testDocument('test-doc-g4-6-later-stage', PROJECT, laterStage, { issueDate: '2019-03-01' });
  const earlier = testDocument('test-doc-g4-6-earlier-stage', PROJECT, earlierStage, { issueDate: '2024-11-01' });
  const fromLater = documentReading({
    id: 'test-cand-g4-6-later-stage',
    subjectId: BUILDING,
    field: ahuCountField,
    document: later,
    value: { quantity: { value: laterStageCount, unit: 'count', qualifier: 'ahu' } },
    minute: laterStageArrivesFirst ? 0 : 30,
  });
  const fromEarlier = documentReading({
    id: 'test-cand-g4-6-earlier-stage',
    subjectId: BUILDING,
    field: ahuCountField,
    document: earlier,
    value: { quantity: { value: earlierStageCount, unit: 'count', qualifier: 'ahu' } },
    minute: laterStageArrivesFirst ? 30 : 0,
  });
  const context = testContext({ subjectId: BUILDING, documents: [later, earlier], stageOrder: TEST_STAGE_ORDER });

  const state = derive(ahuCountField, [fromEarlier, fromLater], testEvents({}), context);

  // Conflict.
  expect(state.state).toBe('conflict');
  expect(state.activeCandidateId).toBeNull();
  // The later-stage document is proposed as active.
  expect(state.conflict?.proposedCandidateId).toBe(fromLater.id);
  // It goes to the engineer.
  expect(state.conflict?.routedTo).toBe('engineer');
  expect(state.review?.list).toBe('sovitech_will_check');
}

test('F-VALUE-04 · G4-6: tender shows 6 CTAs, as-built 5: conflict, as-built proposed as active, for the engineer', () => {
  expectConflictLaterStageProposedForEngineer('as_built', 'tender', 5, 6, false);

  // Property: any two different counts, any stage from rule 4's first tier against any design stage,
  // in either arrival order.
  fc.assert(
    fc.property(
      fc.constantFrom<DocumentStage>('as_built', 'site_survey', 'nameplate_photo'),
      fc.constantFrom<DocumentStage>('shop_drawing', 'execution', 'tender', 'technical_design', 'permit', 'feasibility'),
      fc.nat({ max: 60 }),
      fc.nat({ max: 60 }),
      fc.boolean(),
      (laterStage, earlierStage, laterStageCount, earlierStageCount, laterStageArrivesFirst) => {
        fc.pre(laterStageCount !== earlierStageCount);
        expectConflictLaterStageProposedForEngineer(
          laterStage,
          earlierStage,
          laterStageCount,
          earlierStageCount,
          laterStageArrivesFirst,
        );
      },
    ),
  );
});
