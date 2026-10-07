/**
 * G3-6 (docs/guardrails.md section 7; rule 3: "The app records how often owners and engineers correct each confidence
 * tier and item type. When corrections for a tier exceed the threshold set by the approver (proposed: 10% over the last
 * 50 decisions), that tier's wording drops one step until the cause is fixed. Confidence never changes verification.";
 * PRD R-152, US-ADMIN-22; docs/adr/0054-confidence-calibration.md).
 * Situation: corrections for "Likely" exceed the threshold.
 * Expected: the wording for that tier drops to Possible.
 *
 * The setting this case runs with (guardrails section 7: "Where behaviour depends on a registry setting, the case names
 * the setting"): a TEST setting of 10% over the last 50 decisions, rule 3's proposed figures written here as a TEST
 * setting. The approver has not set the threshold (D-53), so production passes none and no tier's wording changes (PRD
 * R-152 "Until decided"; G3-24 proves that reading); this case proves the mechanism the approver's setting would drive
 * (ADR 0054 decision 2): the domain's `calibrateTiers` and `wordingTier`, and the one resolver's badge, which reads the
 * wording tier of the derived tier (G3-18). Every value, document and decision is TEST data.
 */
import { describe, expect, test } from 'vitest';
import { calibrateTiers, wordingTier, type CalibrationDecision, type CalibrationSetting } from '@sovitech/domain';
import { resolveField } from '@sovitech/view-model/server';
import { documentReading, testDocument, testEvents } from './_support/builders';
import { intakeFieldOf, registryField, resolveInputOf, uuid } from './_support/view-model';

/** The TEST setting this case names: 10% over the last 50 decisions (rule 3's proposed figures, as a TEST setting). */
const TEST_SETTING: CalibrationSetting = { correctionRatePercent: 10, window: 50 };

const at = (second: number): string => new Date(Date.UTC(2026, 8, 25, 9, 0, second)).toISOString();

/** Fifty TEST decisions on "Likely" inferences, `corrected` of them corrections, the rest agreements, oldest first. */
function likelyDecisions(corrected: number): CalibrationDecision[] {
  return Array.from({ length: 50 }, (_, index): CalibrationDecision => ({
    tier: 'high',
    fieldKey: 'test.asset.type',
    outcome: index < corrected ? 'corrected' : 'agreed',
    by: 'owner',
    at: at(index),
  }));
}

const PROJECT = uuid(1);
const ASSET = uuid(2);
const schedule = testDocument(uuid(3), PROJECT, 'technical_design');
const assetType = registryField('test.asset.type', { kind: 'enum', subject: 'asset', options: ['ahu', 'fan'], confirmBy: 'engineer' });

describe('G3-6 · rule 3 · R-152 · ADR 0054 (TEST setting: 10% over the last 50 decisions)', () => {
  test('G3-6 (the domain half): six corrections in the last fifty "Likely" decisions (12%) drop the tier\'s wording to Possible; five (10%) do not', () => {
    const over = calibrateTiers(likelyDecisions(6), TEST_SETTING);
    expect(over[0]).toMatchObject({ tier: 'high', decisions: 50, corrections: 6, dropped: true });
    expect(wordingTier('high', over)).toBe('medium');
    // The other tiers keep their wording.
    expect(wordingTier('medium', over)).toBe('medium');
    expect(wordingTier('low', over)).toBe('low');

    // The control: corrections at the threshold do not exceed it.
    const atThreshold = calibrateTiers(likelyDecisions(5), TEST_SETTING);
    expect(atThreshold[0]).toMatchObject({ tier: 'high', corrections: 5, dropped: false });
    expect(wordingTier('high', atThreshold)).toBe('high');
  });

  test('G3-6 (the resolver half): an inferred AHU of high confidence reads Possible, not Likely, once its tier dropped; Likely with no calibration (the control)', () => {
    const inferred = documentReading({ id: uuid(10), subjectId: ASSET, field: assetType, document: schedule, value: { choice: 'ahu' }, minute: 1, source: 'ai_inference', confidence: 'high' });
    const field = intakeFieldOf(assetType, ASSET, [inferred], testEvents({}), [schedule]);
    // The derived tier is high: the excerpt names the type (G3-18 reads the derived tier, never the stored one).
    expect(field.state.candidates.find((entry) => entry.candidateId === inferred.id)?.confidence).toBe('high');
    const valueId = `asset:${ASSET}.test.asset.type`;
    const shown = (calibration: ReturnType<typeof calibrateTiers> | null) => {
      const displays = resolveField(resolveInputOf(field, 'asset', { documents: [schedule], fileNames: { [schedule.id]: 'TEST schedule.pdf' }, calibration }));
      const display = displays.find((entry) => entry.valueId === valueId);
      if (display === undefined) throw new Error(`no display ${valueId}`);
      return display;
    };
    const dropped = shown(calibrateTiers(likelyDecisions(6), TEST_SETTING));
    expect(dropped.badge?.id).toBe('possible');
    expect(dropped.sourceLine?.text).toBe('Inferred from TEST schedule.pdf, page 1');
    // The control: no calibration (production passes none) leaves the badge Likely.
    expect(shown(null).badge?.id).toBe('likely');
    // And a calibration whose tier did not drop leaves it Likely too.
    expect(shown(calibrateTiers(likelyDecisions(5), TEST_SETTING)).badge?.id).toBe('likely');
  });
});
