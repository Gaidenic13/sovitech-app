/**
 * G2-10 (docs/guardrails.md section 7; rule 2, "Numbers in prose are references, not text": "The
 * output validator rejects any digit sequence in AI prose that is not a token"; rule 9, "Arithmetic
 * lives in code": the AI "never writes a number it was not given"; F-PROPOSAL-04). Phase 2 review,
 * adversarial finding "homoglyphs and number glyphs pass the prose checks" (low).
 * Situation: AI prose writes a figure in numerals other than ASCII digits (fullwidth, superscript,
 * mathematical bold, Arabic-Indic, a dingbat, the Roman numeral character), or as a Roman numeral
 * before a counted noun ("XII floors").
 * Expected: rejected.
 *
 * Before the fix each of these passed the digit rule, which read ASCII digits only. The control: a
 * letter after a label word ("wing C", "level II") and a unit's superscript (m²) are not figures.
 */
import { validateDraftingOutput, type DraftingValidationContext } from '@sovitech/ai';
import { describe, expect, test } from 'vitest';

const PROJECT = 'test-project-g2-10';
const context: DraftingValidationContext = {
  projectId: PROJECT,
  slots: new Set(['building']),
  tokens: new Set(['{{value:building.floors}}']),
  names: [],
};
const draft = (text: string) => validateDraftingOutput({ paragraphs: [{ slot: 'building', text }], notes: [] }, context);

const FIGURES = [
  'The building has \uFF11\uFF12 floors above ground.',
  'The chiller is rated at \u2078\u2070\u2070 kW.',
  'The chiller is rated at \u{1D7D6}\u{1D7CE}\u{1D7CE} kW.',
  'The chiller is rated at \u0668\u0660\u0660 kW.',
  'The chiller is rated at \u2791 kW.',
  'The building has \u216B floors above ground.',
  'The building has XII floors above ground.',
  'Clădirea are XII etaje.',
];

describe('G2-10: a figure written in other numerals in AI prose', () => {
  for (const text of FIGURES) {
    test(`F-PROPOSAL-04 · G2-10: rejected: "${text}"`, () => {
      const result = draft(text);
      expect(result.accepted.paragraphs).toEqual([]);
      expect(result.rejections).toHaveLength(1);
      expect(result.rejections[0]?.rules.some((rule) => rule === 'digit_outside_token' || rule === 'number_word')).toBe(true);
      expect(result.guardrailEvents.map((event) => event.type)).toContain('ai_output_rejected');
    });
  }

  test('F-PROPOSAL-04 · G2-10 (control): a label letter, a numbered label and a unit symbol are not figures; the token passes', () => {
    for (const text of ['The AHU serves wing C of the building.', 'The plant room is on level II, beside the stair core.', 'The rooms are listed in m² in the schedule.', 'The building has {{value:building.floors}} above ground.']) {
      const result = draft(text);
      expect(result.rejections, text).toEqual([]);
      expect(result.accepted.paragraphs, text).toHaveLength(1);
    }
  });
});
