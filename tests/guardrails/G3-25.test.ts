/**
 * G3-25 (new in phase 7; rule 3: "When corrections for a tier exceed the threshold set by the approver ..., that tier's
 * wording drops one step until the cause is fixed. Confidence never changes verification."; 2.4, "Provisional. A value
 * is provisional when any leaf of its input graph is: ... an `ai_inference` that is not engineer_verified"; 2.8's badge
 * order; docs/adr/0054-confidence-calibration.md decision 3).
 * Situation: corrections for "Likely" exceed the threshold (a TEST setting), and the tier holds an engineer_verified
 * inference and an unverified one.
 * Expected: each keeps its verification and its provisional status, and only the unverified inference's badge drops to
 * Possible.
 *
 * The setting this case runs with: a TEST setting of 10% over the last 50 decisions (guardrails section 7, "the case
 * names the setting"). The domain half: the calibration is not an input of derive, so each value's derived verification
 * and provisional status are what they are with or without it. The resolver half: the verified inference reads Verified
 * by SOVITECH with "AI inference, verified by SOVITECH on <date>" whether or not its tier dropped; the unverified one
 * reads Possible. The engineer's verification is built in memory for this derive test only (./_support/builders.ts
 * `engineerVerificationInMemory`; prompt 3 section 14 item 3); nothing writes it. Every value is TEST data.
 */
import { describe, expect, test } from 'vitest';
import { calibrateTiers, type Calibration, type CalibrationDecision, type CalibrationSetting } from '@sovitech/domain';
import { resolveField } from '@sovitech/view-model/server';
import { documentReading, engineerVerificationInMemory, testDocument, testEvents, testTime } from './_support/builders';
import { intakeFieldOf, registryField, resolveInputOf, uuid } from './_support/view-model';

/** The TEST setting this case names: 10% over the last 50 decisions. */
const TEST_SETTING: CalibrationSetting = { correctionRatePercent: 10, window: 50 };

const at = (second: number): string => new Date(Date.UTC(2026, 8, 25, 8, 0, second)).toISOString();
/** Fifty TEST decisions on "Likely" inferences, ten of them corrections (20%, over the TEST threshold). */
const DECISIONS: readonly CalibrationDecision[] = Array.from({ length: 50 }, (_, index) => ({
  tier: 'high' as const,
  fieldKey: 'test.asset.type',
  outcome: index < 10 ? ('corrected' as const) : ('agreed' as const),
  by: 'owner' as const,
  at: at(index),
}));

const PROJECT = uuid(1);
const VERIFIED_ASSET = uuid(2);
const OPEN_ASSET = uuid(3);
const schedule = testDocument(uuid(4), PROJECT, 'technical_design');
const assetType = registryField('test.asset.type', { kind: 'enum', subject: 'asset', options: ['ahu', 'fan'], confirmBy: 'engineer' });

const verifiedInference = documentReading({ id: uuid(10), subjectId: VERIFIED_ASSET, field: assetType, document: schedule, value: { choice: 'ahu' }, minute: 1, source: 'ai_inference', confidence: 'high' });
const openInference = documentReading({ id: uuid(11), subjectId: OPEN_ASSET, field: assetType, document: schedule, value: { choice: 'ahu' }, minute: 2, source: 'ai_inference', confidence: 'high' });
const verification = engineerVerificationInMemory(verifiedInference.id, 30);

const verifiedField = intakeFieldOf(assetType, VERIFIED_ASSET, [verifiedInference], testEvents({ candidate: [verification] }), [schedule]);
const openField = intakeFieldOf(assetType, OPEN_ASSET, [openInference], testEvents({}), [schedule]);

function display(field: typeof verifiedField, calibration: Calibration | null, events: readonly (typeof verification)[] = []) {
  const valueId = `asset:${field.subjectId}.test.asset.type`;
  const found = resolveField(resolveInputOf(field, 'asset', { documents: [schedule], fileNames: { [schedule.id]: 'TEST schedule.pdf' }, candidateEvents: events, calibration })).find(
    (entry) => entry.valueId === valueId,
  );
  if (found === undefined) throw new Error(`no display ${valueId}`);
  return found;
}

describe('G3-25 · rule 3 · 2.4 · ADR 0054 (TEST setting: 10% over the last 50 decisions)', () => {
  const calibration = calibrateTiers(DECISIONS, TEST_SETTING);

  test('G3-25 (the domain half): the tier dropped, and each inference keeps its derived verification and its provisional status', () => {
    expect(calibration[0]).toMatchObject({ tier: 'high', dropped: true });
    // Both are high: the excerpt names the type (the derived tier, G3-18).
    expect(verifiedField.state.candidates[0]).toMatchObject({ verification: 'engineer_verified', confidence: 'high' });
    expect(openField.state.candidates[0]).toMatchObject({ verification: 'unverified', confidence: 'high' });
    // 2.4: the verified inference is not provisional, the unverified one is. The calibration is no input of derive.
    expect(verifiedField.state.provisional).toBe(false);
    expect(openField.state.provisional).toBe(true);
  });

  test('G3-25 (the resolver half): only the unverified inference\'s badge drops to Possible; the verified one reads Verified by SOVITECH with its dated line', () => {
    const verifiedShown = display(verifiedField, calibration, [verification]);
    expect(verifiedShown.badge?.id).toBe('verified_by_sovitech');
    expect(verifiedShown.sourceLine?.text).toBe('AI inference, verified by SOVITECH on 25 Sep 2026');
    expect(display(openField, calibration).badge?.id).toBe('possible');
    // Without the calibration (the control): the same verification, and Likely for the open one.
    expect(display(verifiedField, null, [verification])).toEqual(verifiedShown);
    expect(display(openField, null).badge?.id).toBe('likely');
    expect(testTime(30).startsWith('2026-09-25')).toBe(true);
  });
});
