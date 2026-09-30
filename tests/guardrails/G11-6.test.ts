/**
 * G11-6 (docs/guardrails.md section 7; rule 11, "Compliance": "Before engineer
 * verification, the wording is 'aims to support BAC class B (EN ISO 52120-1:2021)'";
 * "The app never attests compliance"; "Enforced by: The AI output validator. It checks
 * ... reserved compliance terms"; 2.8, reserved terms in all AI-written text;
 * F-PROPOSAL-04).
 * Situation: text claims EN ISO 52120-1 class A compliance with no verification in context.
 * Expected: rejected. "Aims to support … class A" passes.
 *
 * The standard's identifier carries digits, which pass only when an approved standards
 * dataset lists it (rule 2's allowlist; build-readiness decision 9: none is approved, so
 * the app names no standard today). The passing sentence is checked both ways.
 */
import { validateDraftingOutput, type DraftingValidationContext } from '@sovitech/ai';
import { describe, expect, test } from 'vitest';

const PROJECT = 'test-project-g11-6';
const STANDARD = 'EN ISO 52120-1:2021';

function context(standards: readonly string[] = []): DraftingValidationContext {
  return { projectId: PROJECT, slots: new Set(['bac']), tokens: new Set(), names: [], standardIdentifiers: standards };
}

const draft = (text: string, standards: readonly string[] = []) => validateDraftingOutput({ paragraphs: [{ slot: 'bac', text }], notes: [] }, context(standards));

const CLAIMS = [
  'The building is compliant with EN ISO 52120-1:2021 class A.',
  'The design complies with BAC class A of EN ISO 52120-1:2021.',
  'The building meets BAC class A.',
  'The installation achieves class A under EN ISO 52120-1:2021.',
  'The design reaches BAC class A.',
  'The system ensures compliance with the standard for class A.',
  'Clădirea este conformă cu clasa BAC A.',
  // A reserved term spelt with a Cyrillic look-alike letter (phase 2 review, adversarial finding
  // "homoglyphs and number glyphs pass the prose checks").
  'The building is c\u043Empliant with EN ISO 52120-1:2021 class A.',
  'The design m\u0435ets BAC class A.',
];

describe('G11-6: a compliance claim with no verification in context', () => {
  for (const text of CLAIMS) {
    test(`F-PROPOSAL-04 · G11-6: rejected, even with the standard allowlisted: "${text}"`, () => {
      const result = draft(text, [STANDARD]);
      expect(result.accepted.paragraphs).toEqual([]);
      expect(result.rejections).toHaveLength(1);
      expect(result.rejections[0]?.rules.some((rule) => ['reserved_term', 'bac_class_claim', 'compliance_claim'].includes(rule))).toBe(true);
    });
  }

  test('F-PROPOSAL-04 · G11-6: "Aims to support BAC class A" passes', () => {
    expect(draft('The proposed functions aim to support BAC class A.').rejections).toEqual([]);
    expect(draft(`The design aims to support BAC class A (${STANDARD}).`, [STANDARD]).rejections).toEqual([]);
  });

  test('F-PROPOSAL-04 · G11-6: the standard with no approved standards dataset carries digits the validator refuses', () => {
    expect(draft(`The design aims to support BAC class A (${STANDARD}).`).rejections.map((rejection) => rejection.rules)).toEqual([['digit_outside_token']]);
  });
});
