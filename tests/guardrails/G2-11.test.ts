/**
 * G2-11 (docs/guardrails.md section 7; 2.8, "Reserved terms": "Where they are flagged: everywhere
 * else. That includes ... all AI-written text", and "Matching is whole-word, and ignores case and
 * diacritics"; rule 11, "Enforced by: The AI output validator. It checks ... reserved compliance
 * terms"; F-PROPOSAL-04). Phase 2 review, adversarial finding "homoglyphs and number glyphs pass
 * the prose checks" (low).
 * Situation: AI-written text spells a reserved term with look-alike letters of another script
 * ("verified" with a Cyrillic "e", U+0435, "compliant" with a Cyrillic "o", U+043E) or splits it with a zero-width
 * character.
 * Expected: rejected.
 *
 * Before the fix each spelling passed the reserved-term check, which compared the letters as
 * written. A document-borne instruction could steer the model to such a spelling (rule 14).
 */
import { validateDraftingOutput, validateExtractionOutput, type DraftingValidationContext } from '@sovitech/ai';
import { describe, expect, test } from 'vitest';

const PROJECT = 'test-project-g2-11';
const context: DraftingValidationContext = { projectId: PROJECT, slots: new Set(['summary']), tokens: new Set(), names: [] };
const draft = (text: string) => validateDraftingOutput({ paragraphs: [{ slot: 'summary', text }], notes: [] }, context);

const SPELLINGS = [
  'The equipment list was v\u0435rified by the designer.',
  'The installation is c\u043Empliant with the design.',
  'The equipment list was veri\u200Bfied by the designer.',
  'The figures are fin\u0430l.',
  'Echipamentul a fost v\u0435rificat de proiectant.',
];

describe('G2-11: a reserved term spelt with look-alike letters or split by an invisible character', () => {
  for (const text of SPELLINGS) {
    test(`F-PROPOSAL-04 · G2-11: rejected: "${text}"`, () => {
      const result = draft(text);
      expect(result.accepted.paragraphs).toEqual([]);
      expect(result.rejections).toHaveLength(1);
      expect(result.rejections[0]?.rules).toContain('reserved_term');
    });
  }

  test('F-PROPOSAL-04 · G2-11: in an engineer note of an extraction, rejected too', () => {
    const note = { audience: 'engineer' as const, text: 'The designer marked the list as v\u0435rified.', wouldChange: null, locations: [] };
    const result = validateExtractionOutput(
      { candidates: [], notFound: [], missingFieldKeys: [], findings: [], notes: [note] },
      { projectId: PROJECT, fields: new Map(), documents: new Map(), units: new Set(), names: [] },
    );
    expect(result.accepted.notes).toEqual([]);
    expect(result.rejections[0]?.rules).toContain('reserved_term');
  });

  test('F-PROPOSAL-04 · G2-11 (control): the same sentence without a reserved term passes', () => {
    const result = draft('The equipment list was reviewed by the designer.');
    expect(result.rejections).toEqual([]);
    expect(result.accepted.paragraphs).toHaveLength(1);
  });
});
