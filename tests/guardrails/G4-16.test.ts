/**
 * G4-16 (docs/guardrails.md section 7; 2.5 "A type disagreement is a conflict, not a second asset"; rule 4 "Routing").
 * Situation: CTA-01 is inferred as a fan on M-201 and read as an AHU in schedule M-001.
 * Expected: one asset with a type conflict in the engineer queue. The count is 1.
 *
 * The asset's type is a field on the asset subject (2.5), an engineer field
 * (rule 3: equipment types). The two readings are inferences with their evidence
 * (the symbol on the plan, the schedule row); the type keys are TEST keys, since
 * the asset taxonomy is not an approved dataset (`dataset-asset-taxonomy`).
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import {
  derive,
  deriveAssetRegister,
  planAssetIdentity,
  type AssetAppearance,
  type AssetIdentity,
  type DocumentRecord,
} from '@sovitech/domain';
import { documentReading, testContext, testDocument, testDocumentStatuses, testEvents, testField } from './_support/builders';

const PROJECT = 'test-project-g4-16';

const plan = testDocument('test-doc-g4-16-m-201', PROJECT, 'technical_design', { kind: 'mep' });
const schedule = testDocument('test-doc-g4-16-m-001', PROJECT, 'technical_design', { kind: 'mep' });

const typeField = testField('test.asset.type', { kind: 'enum', subject: 'asset', confirmBy: 'engineer' });

function appearanceOn(document: DocumentRecord, tagAsWritten: string): AssetAppearance {
  return {
    id: `test-appearance-g4-16-${document.id}`,
    projectId: PROJECT,
    tagAsWritten,
    evidence: [{ documentId: document.id, contentHash: document.contentHash, locator: { page: 1 }, excerpt: tagAsWritten, check: 'text_match' }],
  };
}

function expectOneAssetTypeConflictForEngineer(planTypeKey: string, scheduleTypeKey: string, scheduleFirst: boolean): void {
  // Identity: the same tag on both sheets is one asset.
  const arriving = scheduleFirst
    ? [appearanceOn(schedule, 'CTA-01'), appearanceOn(plan, 'CTA-01')]
    : [appearanceOn(plan, 'CTA-01'), appearanceOn(schedule, 'CTA-01')];
  const identities: AssetIdentity[] = [];
  for (const appearance of arriving) {
    const decision = planAssetIdentity(identities, appearance);
    if (decision.kind === 'new_asset') identities.push({ assetId: 'test-asset-g4-16-cta-01', projectId: PROJECT, normalisedTag: decision.normalisedTag });
  }
  const register = deriveAssetRegister({ projectId: PROJECT, identities, appearances: arriving, events: [], documents: testDocumentStatuses() });
  const [asset] = register.assets;
  if (asset === undefined) throw new Error('the register holds no asset');

  // The type field of that one asset: two inferences that disagree.
  const fromPlan = documentReading({
    id: 'test-cand-g4-16-plan-symbol',
    subjectId: asset.assetId,
    field: typeField,
    document: plan,
    value: { choice: planTypeKey },
    minute: scheduleFirst ? 30 : 0,
    source: 'ai_inference',
    confidence: 'medium',
  });
  const fromSchedule = documentReading({
    id: 'test-cand-g4-16-schedule-row',
    subjectId: asset.assetId,
    field: typeField,
    document: schedule,
    value: { choice: scheduleTypeKey },
    minute: scheduleFirst ? 0 : 30,
    source: 'ai_inference',
    confidence: 'high',
  });
  const type = derive(typeField, [fromPlan, fromSchedule], testEvents({}), testContext({ subjectId: asset.assetId, documents: [plan, schedule] }));

  // One asset ...
  expect(register.assets).toHaveLength(1);
  expect(asset.appearanceIds).toHaveLength(2);
  // ... with a type conflict in the engineer queue ...
  expect(type.state).toBe('conflict');
  expect(type.conflict?.routedTo).toBe('engineer');
  expect(type.review).toEqual({ list: 'sovitech_will_check', reason: 'conflict' });
  // ... and the count is 1.
  expect(register.countable).toEqual([asset.assetId]);
}

test('F-VALUE-08 · F-VALUE-04 · G4-16: CTA-01 a fan on M-201 and an AHU in schedule M-001: one asset, a type conflict for the engineer, count 1', () => {
  expectOneAssetTypeConflictForEngineer('TEST-fan', 'TEST-ahu', false);

  // Property: any two different type keys, in either arrival order.
  fc.assert(
    fc.property(
      fc.constantFrom('TEST-fan', 'TEST-ahu', 'TEST-fcu', 'TEST-pump'),
      fc.constantFrom('TEST-fan', 'TEST-ahu', 'TEST-fcu', 'TEST-pump'),
      fc.boolean(),
      (planTypeKey, scheduleTypeKey, scheduleFirst) => {
        fc.pre(planTypeKey !== scheduleTypeKey);
        expectOneAssetTypeConflictForEngineer(planTypeKey, scheduleTypeKey, scheduleFirst);
      },
    ),
  );
});
