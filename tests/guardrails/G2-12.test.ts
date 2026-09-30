/**
 * G2-12 (docs/guardrails.md section 7; 2.8, "Reserved terms": "Where they are flagged: everywhere
 * else. That includes ... all AI-written text", and "Matching is whole-word, and ignores case and
 * diacritics"; rule 11, "Enforced by: The AI output validator. It checks ... reserved compliance
 * terms"; F-PROPOSAL-04). The phase 2 verifier's closing check, new problem "small-capital Latin
 * letters and letter-spaced words pass reserved_term" (low; verify2c/ai/prose.out), fixed in the fix
 * round of 2026-09-30. G2-11 is look-alike letters of another script and zero-width splits; this
 * case is Latin letter forms that Unicode normalisation keeps, and a word written letter by letter.
 * Situation: AI-written text spells a reserved term in small capitals or other Latin letter forms
 * that normalisation keeps, or with its letters spaced apart.
 * Expected: rejected.
 *
 * Before the fix each spelling passed: NFKC does not fold small capitals, and the whole-word match
 * read a spaced word as single letters. The control: small capitals and spaced letters with no
 * reserved term, and single letters used as labels, pass.
 */
import { validateDraftingOutput, type DraftingValidationContext } from '@sovitech/ai';
import { describe, expect, test } from 'vitest';

const PROJECT = 'test-project-g2-12';
const context: DraftingValidationContext = { projectId: PROJECT, slots: new Set(['summary']), tokens: new Set(), names: [] };
const draft = (text: string) => validateDraftingOutput({ paragraphs: [{ slot: 'summary', text }], notes: [] }, context);

const SPELLINGS = [
  // The verifier's two spellings: "verified" in small capitals, "compliant" letter-spaced.
  'The equipment list was ᴠᴇʀɪꜰɪᴇᴅ by the designer.',
  'The installation is c o m p l i a n t with the design.',
  // Close variants: another word in small capitals, dotted and hyphenated letters, Romanian.
  'The installation is ᴄᴏᴍᴘʟɪᴀɴᴛ with the design.',
  'The equipment list was V. E. R. I. F. I. E. D. by the designer.',
  'The equipment list was v-e-r-i-f-i-e-d by the designer.',
  'Echipamentul a fost v e r i f i c a t de proiectant.',
  // Phase 2 fix round 4, the verifier's finding "a spaced reserved term right after a one-letter word is read joined
  // with that word" (verify2d/ai/fresh3.out): "It is a q u o t e." was read "aquote", and passed.
  'It is a q u o t e.',
  'This is a f i n a l figure.',
  'It is a c e r t i f i e d design.',
  'This is a q u o t a t i o n.',
  'The price is a b i n d i n g figure.',
  'Este o o f e r t ă.',
];

describe('G2-12: a reserved term spelt in small capitals or letter by letter', () => {
  for (const text of SPELLINGS) {
    test(`F-PROPOSAL-04 · G2-12: rejected: "${text}"`, () => {
      const result = draft(text);
      expect(result.accepted.paragraphs).toEqual([]);
      expect(result.rejections).toHaveLength(1);
      expect(result.rejections[0]?.rules).toContain('reserved_term');
    });
  }

  test('F-PROPOSAL-04 · G2-12 (control): small capitals and spaced letters with no reserved term, and letters as labels, pass', () => {
    for (const text of [
      'The equipment list was ʀᴇᴠɪᴇᴡᴇᴅ by the designer.',
      'The equipment list was r e v i e w e d by the designer.',
      'The plant rooms are in wing C.',
      'Rooms A, B and C are on level II.',
      'It is a b c list.',
      'I am the owner.',
    ]) {
      const result = draft(text);
      expect(result.rejections, text).toEqual([]);
      expect(result.accepted.paragraphs, text).toHaveLength(1);
    }
  });
});
