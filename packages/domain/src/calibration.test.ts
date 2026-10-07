/**
 * Rule 3's calibration of the confidence tiers' wording (docs/guardrails.md rule 3: "The app records how often owners and
 * engineers correct each confidence tier and item type. When corrections for a tier exceed the threshold set by the
 * approver (proposed: 10% over the last 50 decisions), that tier's wording drops one step until the cause is fixed.
 * Confidence never changes verification."; PRD R-152 and its "Until decided" line, D-53; docs/adr/0054).
 *
 * The domain halves of G3-6, G3-24 and G3-25 live in their case files (tests/guardrails/); these are the mechanism's
 * properties over generated decisions. Every setting here is a TEST setting, named where it is used; production passes
 * none (`null`). Every field key is a TEST key.
 */
import fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { calibrateTiers, wordingTier, type Calibration, type CalibrationDecision, type CalibrationSetting } from './calibration';
import type { Confidence } from './model';

const TIERS: readonly Confidence[] = ['high', 'medium', 'low'];

/** The TEST setting of these properties: rule 3's proposed figures, as a TEST setting (never the registry's). */
const TEST_SETTING: CalibrationSetting = { correctionRatePercent: 10, window: 50 };

const tierArb = fc.constantFrom<Confidence>('high', 'medium', 'low');
const fieldArb = fc.constantFrom('test.asset.type', 'test.building.type', 'test.asset.system');
const outcomeArb = fc.constantFrom<'agreed' | 'corrected'>('agreed', 'corrected');
const byArb = fc.constantFrom<'owner' | 'sovitech_engineer'>('owner', 'sovitech_engineer');
/** Distinct times, one second apart, from a TEST day. */
const timeOf = (second: number): string => new Date(Date.UTC(2026, 8, 1, 0, 0, 0) + second * 1000).toISOString();

const decisionsArb = fc
  .array(fc.record({ tier: tierArb, fieldKey: fieldArb, outcome: outcomeArb, by: byArb }), { maxLength: 160 })
  .map((entries) => entries.map((entry, index): CalibrationDecision => ({ ...entry, at: timeOf(index) })));

const settingArb = fc.record({ correctionRatePercent: fc.integer({ min: 0, max: 100 }), window: fc.integer({ min: 1, max: 80 }) });

function tierOf(calibration: Calibration, tier: Confidence) {
  const entry = calibration.find((candidate) => candidate.tier === tier);
  if (entry === undefined) throw new Error(`no ${tier} entry`);
  return entry;
}

describe('rule 3 · R-152 · ADR 0054: calibrateTiers', () => {
  test('R-152 "Until decided" · G3-24: with no threshold set (null), no tier ever drops, and every decision of a tier is counted', () => {
    fc.assert(
      fc.property(decisionsArb, (decisions) => {
        const calibration = calibrateTiers(decisions, null);
        expect(calibration.map((entry) => entry.tier)).toEqual(TIERS);
        for (const tier of TIERS) {
          const own = decisions.filter((decision) => decision.tier === tier);
          const entry = tierOf(calibration, tier);
          expect(entry.dropped).toBe(false);
          expect(entry.decisions).toBe(own.length);
          expect(entry.corrections).toBe(own.filter((decision) => decision.outcome === 'corrected').length);
          expect(wordingTier(tier, calibration)).toBe(tier);
        }
      }),
    );
  });

  test('rule 3: a drop needs a correction; low never drops further; a tier drops exactly while its window\'s corrections are more than the rate', () => {
    fc.assert(
      fc.property(decisionsArb, settingArb, (decisions, setting) => {
        const calibration = calibrateTiers(decisions, setting);
        expect(tierOf(calibration, 'low').dropped).toBe(false);
        expect(wordingTier('low', calibration)).toBe('low');
        for (const tier of TIERS) {
          const entry = tierOf(calibration, tier);
          const window = decisions
            .filter((decision) => decision.tier === tier)
            .slice(-setting.window);
          expect(entry.decisions).toBe(window.length);
          const corrections = window.filter((decision) => decision.outcome === 'corrected').length;
          expect(entry.corrections).toBe(corrections);
          if (entry.dropped) expect(entry.corrections).toBeGreaterThan(0);
          if (tier !== 'low') expect(entry.dropped).toBe(corrections * 100 > setting.correctionRatePercent * window.length);
        }
      }),
    );
  });

  test('rule 3, "until the cause is fixed": the window holds the newest decisions, so agreements after the corrections end the drop (TEST setting: 10% over the last 50)', () => {
    const corrected = Array.from({ length: 6 }, (_, index): CalibrationDecision => ({ tier: 'high', fieldKey: 'test.asset.type', outcome: 'corrected', by: 'owner', at: timeOf(index) }));
    const agreedBefore = Array.from({ length: 44 }, (_, index): CalibrationDecision => ({ tier: 'high', fieldKey: 'test.asset.type', outcome: 'agreed', by: 'owner', at: timeOf(100 + index) }));
    const dropped = calibrateTiers([...corrected, ...agreedBefore], TEST_SETTING);
    // 6 of 50 is 12%, more than 10%: Likely reads Possible.
    expect(tierOf(dropped, 'high')).toMatchObject({ decisions: 50, corrections: 6, dropped: true });
    expect(wordingTier('high', dropped)).toBe('medium');
    // Fifty newer agreements push the corrections out of the window: the drop ends.
    const agreedAfter = Array.from({ length: 50 }, (_, index): CalibrationDecision => ({ tier: 'high', fieldKey: 'test.asset.type', outcome: 'agreed', by: 'owner', at: timeOf(1000 + index) }));
    const fixed = calibrateTiers([...corrected, ...agreedBefore, ...agreedAfter], TEST_SETTING);
    expect(tierOf(fixed, 'high')).toMatchObject({ decisions: 50, corrections: 0, dropped: false });
    expect(wordingTier('high', fixed)).toBe('high');
    // The counts per item type still hold every correction recorded (R-152: "counted per confidence tier and item type").
    expect(tierOf(fixed, 'high').correctionsByField).toEqual({ 'test.asset.type': 6 });
  });

  test('rule 3: the window is read newest by time, whatever order the decisions arrive in', () => {
    fc.assert(
      fc.property(decisionsArb, settingArb, (decisions, setting) => {
        const shuffled = [...decisions].reverse();
        expect(calibrateTiers(shuffled, setting)).toEqual(calibrateTiers(decisions, setting));
      }),
    );
  });

  test('R-152: corrections are counted per tier and item type over every recorded decision of the tier', () => {
    fc.assert(
      fc.property(decisionsArb, fc.option(settingArb, { nil: null }), (decisions, setting) => {
        const calibration = calibrateTiers(decisions, setting);
        for (const tier of TIERS) {
          const expected: Record<string, number> = {};
          for (const decision of decisions) {
            if (decision.tier !== tier || decision.outcome !== 'corrected') continue;
            const counted = expected[decision.fieldKey];
            expected[decision.fieldKey] = counted === undefined ? 1 : counted + 1;
          }
          expect(tierOf(calibration, tier).correctionsByField).toEqual(expected);
        }
      }),
    );
  });

  test('rule 3, "Confidence never changes verification": the calibration reads tier, item type, outcome and time only (who decided changes nothing)', () => {
    fc.assert(
      fc.property(decisionsArb, settingArb, (decisions, setting) => {
        const flipped = decisions.map((decision) => ({ ...decision, by: decision.by === 'owner' ? ('sovitech_engineer' as const) : ('owner' as const) }));
        expect(calibrateTiers(flipped, setting)).toEqual(calibrateTiers(decisions, setting));
      }),
    );
  });

  test('ADR 0054: a setting outside rule 3\'s shape is refused, never read as some other threshold', () => {
    expect(() => calibrateTiers([], { correctionRatePercent: -1, window: 50 })).toThrow(RangeError);
    expect(() => calibrateTiers([], { correctionRatePercent: 101, window: 50 })).toThrow(RangeError);
    expect(() => calibrateTiers([], { correctionRatePercent: 10, window: 0 })).toThrow(RangeError);
    expect(() => calibrateTiers([], { correctionRatePercent: 10, window: 2.5 })).toThrow(RangeError);
    expect(() => calibrateTiers([], { correctionRatePercent: Number.NaN, window: 50 })).toThrow(RangeError);
  });

  test('wordingTier: no calibration reads each tier as itself; a dropped high reads medium, a dropped medium reads low', () => {
    for (const tier of TIERS) expect(wordingTier(tier, null)).toBe(tier);
    const allDropped: Calibration = [
      { tier: 'high', decisions: 1, corrections: 1, correctionsByField: {}, dropped: true },
      { tier: 'medium', decisions: 1, corrections: 1, correctionsByField: {}, dropped: true },
      { tier: 'low', decisions: 1, corrections: 1, correctionsByField: {}, dropped: false },
    ];
    expect(wordingTier('high', allDropped)).toBe('medium');
    expect(wordingTier('medium', allDropped)).toBe('low');
    expect(wordingTier('low', allDropped)).toBe('low');
  });
});
