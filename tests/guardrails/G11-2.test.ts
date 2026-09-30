/**
 * G11-2 (docs/guardrails.md section 7; rule 11, "Read-only by default. The BMS may monitor
 * their status and alarms. It never commands, resets, inhibits, delays or overrides them";
 * "Fire mode is hardwired and wins. The fire system reacts, not the BMS"; "Only four
 * verbs"; "Enforced by: The AI output validator. It checks life-safety verbs";
 * F-PROPOSAL-04).
 * Situation: AI text describes AHU shutdown on fire alarm as BMS logic.
 * Expected: rejected.
 */
import { validateDraftingOutput, validateExtractionOutput, type DraftingValidationContext } from '@sovitech/ai';
import { describe, expect, test } from 'vitest';

const PROJECT = 'test-project-g11-2';
const context: DraftingValidationContext = { projectId: PROJECT, slots: new Set(['fire']), tokens: new Set(), names: [] };
const draft = (text: string) => validateDraftingOutput({ paragraphs: [{ slot: 'fire', text }], notes: [] }, context);

const AS_BMS_LOGIC = [
  'On fire alarm, the BMS shuts down the AHUs.',
  'The BMS stops all air handling units when the fire alarm is triggered.',
  'The AHU shutdown on fire alarm is part of the BMS logic.',
  'BMS logic: on fire alarm, switch off the AHUs and close the fire dampers.',
  'La alarma de incendiu, sistemul BMS oprește centralele de tratare a aerului.',
  // The same situation in the passive, as a nominalisation, with verbs off any list, and in
  // Romanian (phase 2 review, adversarial finding "the rule 11 life-safety check is inverted").
  'On fire alarm, the AHUs are shut down by the BMS.',
  'On fire alarm, the air handling units are stopped by the BMS.',
  'On fire alarm, the AHUs stop via the BMS.',
  'Shutdown of the AHUs on fire alarm is done by the BMS.',
  'On fire alarm the BMS takes the AHUs offline.',
  'On fire alarm the BMS switches the AHUs off.',
  'The fire alarm is monitored by the BMS, which then stops the AHUs.',
  'La alarma de incendiu, centralele de tratare a aerului sunt oprite de sistemul BMS.',
  'Oprirea centralelor de tratare a aerului la alarma de incendiu se face prin BMS.',
  // The same situation with the BMS spelled letter by letter, by another of its names, or through "the same
  // system" after a sentence that names it (phase 2 fix round 4, the verifier's finding "the check recognises the
  // BMS only by its listed names", verify2d/ai/fresh3.out and prose2.out).
  'The B.M.S. shuts down the AHUs on fire alarm.',
  'The B M S shuts down the AHUs on fire alarm.',
  'The B-M-S shuts down the AHUs on fire alarm.',
  'The BAS shuts down the AHUs on fire alarm.',
  'The BEMS shuts down the AHUs on fire alarm.',
  'The building controls shut down the AHUs on fire alarm.',
  'On fire alarm, the AHUs are shut down by the B.M.S.',
  'On fire alarm, the AHUs are shut down by the BAS.',
  'Sistemul B.M.S. oprește centralele de tratare a aerului la alarma de incendiu.',
  'Sistemul de control al clădirii oprește CTA-urile la alarmă de incendiu.',
  'The SCADA stops the AHUs on fire alarm.',
  'The automation panels stop the AHUs on fire alarm.',
  'On fire alarm, the controllers stop the AHUs.',
  'The BMS covers HVAC and lighting. The same system shuts down the AHUs on fire alarm.',
];

describe('G11-2: AHU shutdown on fire alarm as BMS logic', () => {
  for (const text of AS_BMS_LOGIC) {
    test(`F-PROPOSAL-04 · G11-2: rejected: "${text}"`, () => {
      const result = draft(text);
      expect(result.accepted.paragraphs).toEqual([]);
      expect(result.rejections.map((rejection) => rejection.rules)).toEqual([['life_safety_control']]);
      expect(result.guardrailEvents).toEqual([{ type: 'ai_output_rejected', projectId: PROJECT, reason: 'life_safety_control' }]);
    });
  }

  test('F-PROPOSAL-04 · G11-2: in an engineer note of an extraction, rejected too', () => {
    const note = { audience: 'engineer' as const, text: 'The BMS shuts down the AHUs on fire alarm.', wouldChange: null, locations: [] };
    const result = validateExtractionOutput(
      { candidates: [], notFound: [], missingFieldKeys: [], findings: [], notes: [note] },
      { projectId: PROJECT, fields: new Map(), documents: new Map(), units: new Set(), names: [] },
    );
    expect(result.accepted.notes).toEqual([]);
    expect(result.rejections[0]?.rules).toEqual(['life_safety_control']);
  });

  test('F-PROPOSAL-04 · G11-2 (control): in the passive, the fire system reacts through a hardwired interlock and the BMS shows the fire mode', () => {
    const result = draft('On fire alarm, the AHUs are shut down by the fire system through a hardwired interlock; the BMS only displays the fire mode.');
    expect(result.rejections).toEqual([]);
    expect(result.accepted.paragraphs).toHaveLength(1);
  });

  test('F-PROPOSAL-04 · G11-2 (control): by another of the BMS\'s names, the fire system reacts and the BMS only shows the fire mode', () => {
    for (const text of [
      'On fire alarm, the fire system stops the AHUs through a hardwired interlock; the BAS only displays the fire mode.',
      'On fire alarm, the AHUs are shut down by the fire system; the B.M.S. monitors the fire alarm and logs it.',
      'The BMS covers HVAC and lighting. The same system displays the fire mode of each AHU panel.',
    ]) {
      const result = draft(text);
      expect(result.rejections, text).toEqual([]);
      expect(result.accepted.paragraphs, text).toHaveLength(1);
    }
  });

  test('F-PROPOSAL-04 · G11-2 (control): the fire system reacts through a hardwired interlock and the BMS shows the fire mode', () => {
    const result = draft(
      'On fire alarm, the fire system stops the AHUs through a hardwired interlock, which overrides the BMS; the BMS monitors and displays the fire mode and logs the alarm.',
    );
    expect(result.rejections).toEqual([]);
    expect(result.accepted.paragraphs).toHaveLength(1);
  });
});
