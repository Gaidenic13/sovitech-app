/**
 * G2-3 (docs/guardrails.md section 7; rule 2, "Numbers in prose are references, not text":
 * "The output validator rejects any digit sequence in AI prose that is not a token";
 * F-PROPOSAL-04).
 * Situation: AI prose contains "34,500 m²" typed as text.
 * Expected: rejected. Only `{{value:…}}` tokens pass.
 */
import fc from 'fast-check';
import { validateDraftingOutput, validateExtractionOutput, type DraftingValidationContext } from '@sovitech/ai';
import { describe, expect, test } from 'vitest';

const PROJECT = 'test-project-g2-3';
const context: DraftingValidationContext = {
  projectId: PROJECT,
  slots: new Set(['building']),
  tokens: new Set(['{{value:building.gross_floor_area}}']),
  names: [],
};

const draft = (text: string) => validateDraftingOutput({ paragraphs: [{ slot: 'building', text }], notes: [] }, context);

describe('G2-3: a figure typed into AI prose', () => {
  test('F-PROPOSAL-04 · G2-3: "34,500 m²" typed as text is rejected', () => {
    const result = draft('The gross floor area is 34,500 m², including basements.');
    expect(result.accepted.paragraphs).toEqual([]);
    expect(result.rejections).toEqual([
      { item: { kind: 'paragraph', index: 0, slot: 'building' }, rules: ['digit_outside_token'], positions: [{ rule: 'digit_outside_token', index: 24, length: 6 }] },
    ]);
    expect(result.guardrailEvents).toEqual([{ type: 'ai_output_rejected', projectId: PROJECT, reason: 'digit_outside_token' }]);
  });

  test('F-PROPOSAL-04 · G2-3: the same figure in Romanian format, or in an engineer note, is rejected too', () => {
    expect(draft('Suprafața construită desfășurată este 34.500 mp.').rejections[0]?.rules).toEqual(['digit_outside_token']);
    const note = { audience: 'engineer' as const, text: 'The memoriu gives 34,500 m² as the gross area.', wouldChange: null, locations: [] };
    const extraction = validateExtractionOutput(
      { candidates: [], notFound: [], missingFieldKeys: [], findings: [], notes: [note] },
      { projectId: PROJECT, fields: new Map(), documents: new Map(), units: new Set(), names: [] },
    );
    expect(extraction.accepted.notes).toEqual([]);
    expect(extraction.rejections[0]?.rules).toEqual(['digit_outside_token']);
  });

  // Phase 2 review, adversarial finding "homoglyphs and number glyphs pass the prose checks".
  test('F-PROPOSAL-04 · G2-3: the same figure typed in other numeral forms (fullwidth, superscript, mathematical, Arabic-Indic, with a zero-width space) is rejected too', () => {
    for (const typed of ['３４,５００', '³⁴,⁵⁰⁰', '𝟑𝟒,𝟓𝟎𝟎', '٣٤٬٥٠٠', '34,\u200B500']) {
      const result = draft(`The gross floor area is ${typed} m², including basements.`);
      expect(result.accepted.paragraphs, typed).toEqual([]);
      expect(result.rejections[0]?.rules, typed).toEqual(['digit_outside_token']);
    }
  });

  test('F-PROPOSAL-04 · G2-3: only the {{value:…}} token passes', () => {
    const result = draft('The gross floor area is {{value:building.gross_floor_area}}, including basements.');
    expect(result.rejections).toEqual([]);
    expect(result.accepted.paragraphs).toEqual([{ slot: 'building', text: 'The gross floor area is {{value:building.gross_floor_area}}, including basements.' }]);
  });

  test('F-PROPOSAL-04 · G2-3 (property): any digit sequence typed where the token should be is rejected', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 99_999_999 }), fc.constantFrom('', ',', '.', ' '), fc.constantFrom('m²', 'mp', 'kW', '%', ''), (value, separator, unit) => {
        const typed = `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
        const result = draft(`The area is ${typed} ${unit} in the schedule.`);
        expect(result.accepted.paragraphs).toEqual([]);
        expect(result.rejections[0]?.rules).toContain('digit_outside_token');
      }),
    );
  });
});
