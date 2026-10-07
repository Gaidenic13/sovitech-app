/**
 * Rule 3's calibration of the confidence tiers' wording (docs/guardrails.md rule 3: "The app records how often owners and
 * engineers correct each confidence tier and item type. When corrections for a tier exceed the threshold set by the
 * approver (proposed: 10% over the last 50 decisions), that tier's wording drops one step until the cause is fixed.
 * Confidence never changes verification."; PRD R-152 and its "Until decided" line (D-53); US-ADMIN-22; case G3-6 and the
 * phase 7 cases G3-24 and G3-25; docs/adr/0054-confidence-calibration.md).
 *
 * What the domain builder writes here (ADR 0054 holds the readings, each listed for the approver with D-53):
 * - **A decision** is a person's act that settles an inference: an owner's confirmation of it (agreement) or correction
 *   of it (the owner's value replacing it, `owner_corrected_inference`), and an engineer's verification of it (agreement)
 *   or rejection of it (correction). An owner's "Looks right" (`owner_acknowledged`) and "Something's wrong" note are
 *   not decisions on confidence: the first is no confirmation (rule 3), the second changes no value.
 * - **The tier** of a decision is the derived tier the person was shown (ADR 0016 decision 22; G3-18), recorded with the
 *   decision when it is made, never recomputed later.
 * - **The window** is the last `window` decisions of that tier, app-wide (rule 3: "the app records"), newest by time;
 *   fewer decisions than the window count as they are. A tier's wording drops one step while its corrections in the
 *   window are more than `correctionRatePercent` of the decisions in it; the drop ends when they are no longer (the
 *   window's own reading of "until the cause is fixed"). Low stays low.
 * - **Pure, and it never touches verification or provisional status**: the result is a wording step per tier, read only
 *   by the resolver's badge choice (packages/view-model/src/resolver), never by derive (G3-25).
 * - **The threshold**: `null` while the approver has not set it (D-53). With `null`, no tier drops and the corrections
 *   are only counted (R-152 "Until decided"; the stricter reading recorded in ADR 0054 and the build log, phase 7). The
 *   tests pass a TEST setting, named in each case (guardrails section 7: "Where behaviour depends on a registry
 *   setting, the case names the setting").
 *
 * The types and `wordingTier` are the phase 7 planner's; `calibrateTiers` is the store and domain builder's (ADR 0054,
 * "Built").
 */
import type { Confidence } from './model';
import { olderFirst } from './time';

/** One decision on an inference, as recorded: the tier the person was shown, the field (the item type), the outcome and when. */
export interface CalibrationDecision {
  readonly tier: Confidence;
  readonly fieldKey: string;
  readonly outcome: 'agreed' | 'corrected';
  readonly by: 'owner' | 'sovitech_engineer';
  readonly at: string;
}

/** The approver's threshold (rule 3; the registry's `settings.calibrationThreshold`), or null while it is not set (D-53). */
export interface CalibrationSetting {
  readonly correctionRatePercent: number;
  readonly window: number;
}

/** One tier's counts and whether its wording reads one step lower now. */
export interface TierCalibration {
  readonly tier: Confidence;
  /** Decisions in the window (at most the setting's window; all of the tier's when no threshold is set). */
  readonly decisions: number;
  /** Corrections in the window. */
  readonly corrections: number;
  /** Corrections per item type (field key), over all of the tier's decisions recorded. */
  readonly correctionsByField: Readonly<Record<string, number>>;
  /** True only when a threshold is set and the window's corrections exceed it. */
  readonly dropped: boolean;
}

/** The three tiers' calibration, in the order high, medium, low. */
export type Calibration = readonly [TierCalibration, TierCalibration, TierCalibration];

/** The wording step a tier reads: its own, or one lower when it dropped. Low stays low. */
export function wordingTier(tier: Confidence, calibration: Calibration | null): Confidence {
  if (calibration === null) return tier;
  const entry = calibration.find((candidate) => candidate.tier === tier);
  if (entry === undefined || !entry.dropped) return tier;
  return tier === 'high' ? 'medium' : 'low';
}

/** A setting outside rule 3's shape (a rate from 0 to 100 percent, a whole window of one decision or more) is refused, never read as another threshold. */
function checkedSetting(setting: CalibrationSetting): CalibrationSetting {
  const { correctionRatePercent, window } = setting;
  if (!Number.isFinite(correctionRatePercent) || correctionRatePercent < 0 || correctionRatePercent > 100) {
    throw new RangeError('calibration: the correction rate is a percentage from 0 to 100');
  }
  if (!Number.isInteger(window) || window < 1) throw new RangeError('calibration: the window is a whole number of decisions, one or more');
  return setting;
}

/** One tier's decisions, newest first by time (olderFirst reads every time to the nanosecond; ties keep the later-recorded first). */
function newestFirst(decisions: readonly CalibrationDecision[]): CalibrationDecision[] {
  return decisions
    .map((decision, index) => ({ decision, index }))
    .sort((a, b) => olderFirst(b.decision.at, a.decision.at) || b.index - a.index)
    .map((entry) => entry.decision);
}

/** Corrections per item type (field key), in key order, over the decisions given. */
function correctionsPerField(decisions: readonly CalibrationDecision[]): Readonly<Record<string, number>> {
  const counts = new Map<string, number>();
  for (const decision of decisions) {
    if (decision.outcome !== 'corrected') continue;
    const counted = counts.get(decision.fieldKey);
    counts.set(decision.fieldKey, counted === undefined ? 1 : counted + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

/** One tier's calibration. */
function calibrateTier(tier: Confidence, all: readonly CalibrationDecision[], setting: CalibrationSetting | null): TierCalibration {
  const own = all.filter((decision) => decision.tier === tier);
  const correctionsByField = correctionsPerField(own);
  // R-152 "Until decided" (D-53): with no threshold set, every decision is counted and no tier drops.
  if (setting === null) {
    return { tier, decisions: own.length, corrections: own.filter((decision) => decision.outcome === 'corrected').length, correctionsByField, dropped: false };
  }
  const window = newestFirst(own).slice(0, setting.window);
  const corrections = window.filter((decision) => decision.outcome === 'corrected').length;
  // "When corrections for a tier exceed the threshold": more than the rate of the decisions in the window, compared in
  // whole numbers (no division). Low stays low: it has no lower wording to drop to.
  const dropped = tier !== 'low' && corrections * 100 > setting.correctionRatePercent * window.length;
  return { tier, decisions: window.length, corrections, correctionsByField, dropped };
}

/**
 * Calibrates the three tiers from the recorded decisions (see the module comment). Pure: it reads each decision's tier,
 * field key, outcome and time, nothing else, and never a verification. With a `null` setting (the approver has not set
 * the threshold, D-53) no tier drops.
 */
export function calibrateTiers(decisions: readonly CalibrationDecision[], setting: CalibrationSetting | null): Calibration {
  const checked = setting === null ? null : checkedSetting(setting);
  return [calibrateTier('high', decisions, checked), calibrateTier('medium', decisions, checked), calibrateTier('low', decisions, checked)];
}
