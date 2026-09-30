/**
 * G11-7 (docs/guardrails.md section 7; rule 11, "Read-only by default. The BMS may monitor their
 * status and alarms. It never commands, resets, inhibits, delays or overrides them"; "Only four
 * verbs": "Any action triggered by a fire alarm, or affecting smoke control, dampers,
 * pressurisation, evacuation lighting or lifts in fire mode, counts as life-safety control ...
 * the only allowed verbs are monitor, display, log and alarm"; "Enforced by: The AI output
 * validator. It checks life-safety verbs"; F-PROPOSAL-04). Phase 2 review, adversarial finding
 * "the rule 11 check is a denylist that fires only when a control verb follows a BMS mention"
 * (high). G11-2 is AHU shutdown as BMS logic; this case is the BMS acting on a life-safety system
 * itself, whatever the wording.
 * Situation: AI text has the BMS act on a life-safety system with a verb other than monitor,
 * display, log or alarm: in the passive, as a noun, with a verb on no list, or in Romanian.
 * Expected: rejected.
 *
 * The control: the four verbs, and a reaction given to the fire system, pass.
 */
import { validateDraftingOutput, type DraftingValidationContext } from '@sovitech/ai';
import { describe, expect, test } from 'vitest';

const PROJECT = 'test-project-g11-7';
const context: DraftingValidationContext = { projectId: PROJECT, slots: new Set(['fire']), tokens: new Set(), names: [] };
const draft = (text: string) => validateDraftingOutput({ paragraphs: [{ slot: 'fire', text }], notes: [] }, context);

const BMS_ACTS = [
  'On fire alarm, the smoke dampers are closed by the BMS.',
  'Shutdown of the smoke extraction fans by the BMS on fire alarm.',
  'The BMS will manage the fire dampers.',
  'The stair pressurisation fans are started via the BMS on fire alarm.',
  'Desfumarea este oprită de sistemul BMS.',
  'Sistemul BMS va opri desfumarea.',
  'Clapetele antifoc sunt închise prin BMS la alarma de incendiu.',
  // Phase 2 fix round 3, the verifier's finding "rule 11 residuals" (verify2c/ai/g112b.out and
  // g112c.out): a verb of provision or scope, in the passive, off every list or in the Romanian
  // reflexive passive, each of which passed. The same finding's nouns of scope or charge and verbless
  // pairings, which name no verb, are case G11-8.
  'Smoke extraction is provided by the BMS.',
  'Stairwell pressurisation is provided by the BMS.',
  'Desfumarea se face prin BMS.',
  'Evacuarea fumului se face prin BMS.',
  'The BMS includes smoke control.',
  // Close variants of the same forms.
  'Smoke control is provided through the BMS.',
  'Stair pressurisation is ensured by the BMS in fire mode.',
  'Desfumarea se asigură prin BMS.',
  'Presurizarea scărilor se face din BMS.',
  'Desfumarea intră în sarcina BMS.',
  'Desfumarea face parte din BMS.',
  'The BMS scope covers the fire dampers.',
  'Smoke control is integrated into the BMS.',
  'The BMS monitors the fire alarm and looks after the smoke fans.',
  'Smoke extraction relies on the BMS, which monitors the fire alarm.',
  // Phase 2 fix round 4, the verifier's findings "the check recognises the BMS only by its listed names" and "the
  // residual is broader than its examples" (verify2d/ai/fresh3.out, prose2.out, fresh/natural.out): the BMS by
  // another name, through "this system", "its" or "there", in the passive, with a verb on no list, or in Romanian.
  'GTC oprește desfumarea.',
  'Tablourile de automatizare opresc desfumarea.',
  'The head-end resets the fire alarm panel.',
  'SOVITECH controls reset the fire alarm panel.',
  'The controls system shuts the fire dampers.',
  'The B.M.S. stops the smoke fans.',
  'The BMS covers HVAC and lighting. This system also provides smoke extraction.',
  'The BMS covers HVAC and lighting. The same system handles smoke extraction.',
  'BMS-ul acoperă HVAC și iluminatul. Acest sistem oprește desfumarea.',
  'BMS-ul acoperă HVAC și iluminatul. Același sistem asigură desfumarea.',
  'The BMS covers HVAC. Smoke extraction is also done there.',
  'The BMS monitors the fire alarm, and smoke extraction is then started from its workstation.',
  'The BMS monitors the fire alarm; from there, operators start smoke extraction.',
  'Fire dampers move on a signal from the BMS.',
  'The BMS monitors the fire alarm and then smoke extraction follows from it.',
];

describe('G11-7: the BMS acting on a life-safety system, in any wording', () => {
  for (const text of BMS_ACTS) {
    test(`F-PROPOSAL-04 · G11-7: rejected: "${text}"`, () => {
      const result = draft(text);
      expect(result.accepted.paragraphs).toEqual([]);
      expect(result.rejections).toHaveLength(1);
      expect(result.rejections[0]?.rules).toContain('life_safety_control');
      expect(result.guardrailEvents).toContainEqual({ type: 'ai_output_rejected', projectId: PROJECT, reason: 'life_safety_control' });
    });
  }

  test('F-PROPOSAL-04 · G11-7 (control): the BMS monitors, displays, logs and alarms; the fire system reacts', () => {
    for (const text of [
      'The BMS monitors the status of the fire dampers and raises an alarm on a fault.',
      'The BMS displays the fire mode of each panel and logs the fire alarm.',
      'On fire alarm, the smoke dampers are closed by the fire system through a hardwired interlock; the BMS only displays their position.',
      'The BMS covers HVAC and lighting. This system also displays the fire mode and logs the fire alarm.',
      'The BAS displays the fire mode; the fire dampers close on a signal from the fire alarm panel.',
    ]) {
      const result = draft(text);
      expect(result.rejections, text).toEqual([]);
      expect(result.accepted.paragraphs, text).toHaveLength(1);
    }
  });
});
