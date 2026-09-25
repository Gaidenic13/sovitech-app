/**
 * The plausibility check (docs/guardrails.md rule 8, "Plausibility checks": "A
 * value outside its field's plausible range ... becomes Please check and is not
 * used in totals until confirmed. ... It is never auto-corrected"; G8-10;
 * F-VALUE-09).
 *
 * The production registry holds no plausible range (prompt 3 5.2 "Registry
 * values": the check waits for SOVITECH ranges, D-93), so in production the
 * check reports `no_range` and flags nothing; cases use TEST entries. The range
 * is in the field's unit; a candidate in another unit of the same dimension is
 * compared by exact factors (./check.ts). A value that cannot be compared with
 * the range (a legacy unit with no exact factor) is treated like one outside it:
 * nothing shows that it is plausible. Cross-checks between fields (cooling W/m²
 * on the stated area basis, airflow against the area served) need SOVITECH
 * ranges too and are not built.
 *
 * "Until confirmed" is read by `confirmBy`: on an engineer field only
 * `engineer_verified` clears it; on an owner or either field `user_confirmed`
 * does too. `owner_acknowledged` never does (rule 3).
 */
import type { Verification } from '@sovitech/domain';
import { compareAcrossUnits } from './check';

/** The part of a field the check reads. */
export interface PlausibilityField {
  readonly key: string;
  readonly unit?: string;
  readonly confirmBy: 'owner' | 'engineer' | 'either';
  readonly plausible?: { readonly low: number; readonly high: number; readonly basis: string };
}

export interface Plausibility {
  /** `no_range`: the field has none, so the check does not run. */
  readonly status: 'no_range' | 'within' | 'outside' | 'not_comparable';
  /** The 2.8 badge the value takes while the check holds it (rule 8: "becomes Please check"). */
  readonly badge?: 'please_check';
  /** Whether a total may use the value (rule 8: "not used in totals until confirmed"). */
  readonly usableInTotals: boolean;
}

function confirmed(field: PlausibilityField, verification: Verification): boolean {
  if (verification === 'engineer_verified') return true;
  return verification === 'user_confirmed' && field.confirmBy !== 'engineer';
}

export function checkPlausibility(
  field: PlausibilityField,
  quantity: { readonly value: number; readonly unit: string },
  state: { readonly verification: Verification },
): Plausibility {
  const range = field.plausible;
  if (range === undefined || field.unit === undefined) return { status: 'no_range', usableInTotals: true };
  const low = compareAcrossUnits(quantity, { value: range.low, unit: field.unit });
  const high = compareAcrossUnits(quantity, { value: range.high, unit: field.unit });
  const status: Plausibility['status'] =
    low === undefined || high === undefined ? 'not_comparable' : low < 0 || high > 0 ? 'outside' : 'within';
  if (status === 'within') return { status, usableInTotals: true };
  if (confirmed(field, state.verification)) return { status, usableInTotals: true };
  return { status, badge: 'please_check', usableInTotals: false };
}
