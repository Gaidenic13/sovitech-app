/**
 * G11-8 (docs/guardrails.md section 7; rule 11, "Read-only by default. The BMS may monitor their
 * status and alarms. It never commands, resets, inhibits, delays or overrides them"; "Only four
 * verbs": "Any action triggered by a fire alarm, or affecting smoke control, dampers,
 * pressurisation, evacuation lighting or lifts in fire mode, counts as life-safety control ...
 * the only allowed verbs are monitor, display, log and alarm"; "Enforced by: The AI output
 * validator. It checks life-safety verbs"; F-PROPOSAL-04). The phase 2 verifier's closing check,
 * new problem "rule 11 residuals" (medium; verify2c/ai/g112b.out and g112c.out), fixed in the fix
 * round of 2026-09-30. G11-7 is the BMS acting with a verb other than the four; this case is text
 * that gives a life-safety system to the BMS with no verb at all, so it names none of the four.
 * Situation: AI text gives a life-safety system to the BMS with no action verb: as the BMS's part,
 * job, function or responsibility, as what the BMS is, or as a bare pairing.
 * Expected: rejected.
 *
 * Before the fix each of these passed: the check looked for a verb, and these sentences have none
 * the BMS acts with. The control: a pairing that says what the BMS may do (monitor, a status it
 * reads, a connection for reads only) passes, and so does a system given to the fire system.
 */
import { validateDraftingOutput, type DraftingValidationContext } from '@sovitech/ai';
import { describe, expect, test } from 'vitest';

const PROJECT = 'test-project-g11-8';
const context: DraftingValidationContext = { projectId: PROJECT, slots: new Set(['fire']), tokens: new Set(), names: [] };
const draft = (text: string) => validateDraftingOutput({ paragraphs: [{ slot: 'fire', text }], notes: [] }, context);

const GIVEN_TO_THE_BMS = [
  // The verifier's sentences.
  'Smoke control is the job of the BMS.',
  'Smoke control is part of the BMS.',
  'Fire dampers: BMS.',
  // Close variants of the same forms.
  'Smoke control is the responsibility of the BMS.',
  'Smoke extraction is a BMS function.',
  'The BMS is the smoke control system and displays fire alarms.',
  'Clapetele antifoc: BMS.',
  'Smoke extraction via BMS.',
  'BMS: smoke control.',
  // Phase 2 fix round 4, the verifier's finding "the residual is broader than its examples" (verify2d/ai/prose2.out):
  // the BMS's job or concern through "its" in a clause that does not name it, and a bare pairing with another of its names.
  'The BMS monitors the fire alarm; smoke extraction is its concern.',
  'The BMS monitors the fire alarm; smoke extraction is its job.',
  'The BMS monitors the fire alarm; smoke extraction is its business.',
  'The BMS monitors the fire alarm; smoke extraction is its responsibility.',
  'Fire dampers: BAS.',
  'Smoke extraction: B.M.S.',
];

describe('G11-8: a life-safety system given to the BMS with no verb', () => {
  for (const text of GIVEN_TO_THE_BMS) {
    test(`F-PROPOSAL-04 · G11-8: rejected: "${text}"`, () => {
      const result = draft(text);
      expect(result.accepted.paragraphs).toEqual([]);
      expect(result.rejections).toHaveLength(1);
      expect(result.rejections[0]?.rules).toContain('life_safety_control');
      expect(result.guardrailEvents).toContainEqual({ type: 'ai_output_rejected', projectId: PROJECT, reason: 'life_safety_control' });
    });
  }

  test('F-PROPOSAL-04 · G11-8 (control): a pairing that says the BMS reads, and a system given to the fire system, pass', () => {
    for (const text of [
      'Fire dampers: BMS monitoring only.',
      'Fire dampers: status monitored by the BMS.',
      'The fire alarm panel is connected to the BMS.',
      'Smoke control is part of the fire system, and the BMS displays its fire-mode status.',
      'The BMS displays the fire mode. Smoke extraction is not its concern.',
      'Fire dampers: BAS monitoring only.',
    ]) {
      const result = draft(text);
      expect(result.rejections, text).toEqual([]);
      expect(result.accepted.paragraphs, text).toHaveLength(1);
    }
  });
});
