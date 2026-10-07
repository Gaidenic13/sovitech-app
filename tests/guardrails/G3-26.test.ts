/**
 * G3-26 (new in phase 7; guardrails section 10: "lowering ... the calibration threshold" is a loosening, and "Metrics
 * prompt a review, never an edit"; rule 3, "the threshold set by the approver"; PRD R-152: "no control lowers the
 * threshold", and R-151: "No page has a control that widens a tolerance, allows estimation, raises the budget or changes
 * a threshold"; US-ADMIN-22 AC4; docs/adr/0054 decision 4).
 * Situation: the admin opens the confidence calibration counts.
 * Expected: the counts show per tier and item type, and no control on the page sets, lowers or changes the threshold.
 *
 * The view half (the rendered page is the web's half): UD-41's calibration view, built from TEST decisions with no
 * threshold set (D-53), shows each tier's corrections per item type and the threshold's state as a line, and carries
 * no action; the view has no field a control could write; the contract has no admin route but the three reads, and no
 * route of any kind names the threshold. Every decision is TEST data.
 */
import { describe, expect, test } from 'vitest';
import { calibrateTiers } from '@sovitech/domain';
import { ADMIN_GUARDRAIL_EVENT_TYPES, AdminGuardrailEventsResponseSchema, ROUTES } from '@sovitech/view-model/browser';
import { adminGuardrailEventsView } from '@sovitech/view-model/server';

const at = (minute: number): string => new Date(Date.UTC(2026, 9, 6, 9, minute)).toISOString();

describe('G3-26 · section 10 · R-151 · R-152 · ADR 0054 decision 4', () => {
  test('G3-26: the counts show per tier and item type, and nothing on the page sets, lowers or changes the threshold', () => {
    const calibration = calibrateTiers(
      [
        { tier: 'high', fieldKey: 'test.asset.type', outcome: 'corrected', by: 'owner', at: at(1) },
        { tier: 'high', fieldKey: 'test.asset.type', outcome: 'corrected', by: 'owner', at: at(2) },
        { tier: 'high', fieldKey: 'test.building.type', outcome: 'corrected', by: 'owner', at: at(3) },
        { tier: 'medium', fieldKey: 'test.building.type', outcome: 'corrected', by: 'owner', at: at(4) },
        { tier: 'medium', fieldKey: 'test.building.type', outcome: 'agreed', by: 'owner', at: at(5) },
      ],
      null,
    );
    const response = adminGuardrailEventsView({
      asOf: at(10),
      projects: [],
      counts: [],
      totals: ADMIN_GUARDRAIL_EVENT_TYPES.map((type) => ({ type, count: 0 })),
      inferenceDecisions: [],
      calibration,
      threshold: null,
      proposedThreshold: { correctionRatePercent: 10, window: 50 },
      erasures: [],
    });
    expect(AdminGuardrailEventsResponseSchema.safeParse(response).success).toBe(true);
    const text = (valueId: string): string | undefined => response.displayObjects.find((display) => display.valueId === valueId)?.text;
    const { tiers } = response.view.calibration;
    // Per tier and item type.
    expect(tiers.map((tier) => [tier.tier, tier.items.map((item) => [item.fieldKey, text(item.corrections)])])).toEqual([
      ['high', [['test.asset.type', '2'], ['test.building.type', '1']]],
      ['medium', [['test.building.type', '1']]],
      ['low', []],
    ]);
    expect(text(response.view.calibration.threshold)).toBe("Not set: the approver sets it (the guardrails propose 10% over the last 50 decisions). No tier's wording changes until then.");
    // No control: no action on any display, a view with no field to write, and no route that writes an admin setting.
    for (const display of response.displayObjects) expect(display.actions, display.valueId).toBeUndefined();
    expect(Object.keys(response.view.calibration).sort()).toEqual(['threshold', 'tiers']);
    expect(ROUTES.filter((route) => route.path.startsWith('/api/admin')).map((route) => route.method)).toEqual(['GET', 'GET', 'GET']);
    expect(ROUTES.some((route) => /threshold|calibration|setting/iu.test(route.path))).toBe(false);
  });
});
