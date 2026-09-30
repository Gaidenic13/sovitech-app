/**
 * G2-5 (docs/guardrails.md section 7; rule 2: the output validator "also rejects product
 * names or product lines that are not tokens"; rule 1, "Identifiers and prices"; gate
 * `dataset-sauter-catalogue`; F-PROPOSAL-04).
 * Situation: AI prose names a SAUTER product line outside a product token.
 * Expected: rejected.
 *
 * The product line is synthetic ("Zentrix"); no product name is written in the repository.
 * With the gate closed there is no catalogue, so the case runs as the app runs today and
 * against a TEST catalogue.
 */
import { validateDraftingOutput, type DraftingValidationContext, type ProductCatalogue } from '@sovitech/ai';
import { describe, expect, test } from 'vitest';

const PROJECT = 'test-project-g2-5';
const TEST_CATALOGUE: ProductCatalogue = { dataset: 'TEST-catalogue', version: 'TEST-1', ids: new Set(['TEST-ZENTRIX']), names: ['Zentrix'] };

function context(catalogue?: ProductCatalogue): DraftingValidationContext {
  return { projectId: PROJECT, slots: new Set(['controls']), tokens: new Set(), names: [], ...(catalogue === undefined ? {} : { catalogue }) };
}

const draft = (text: string, catalogue?: ProductCatalogue) => validateDraftingOutput({ paragraphs: [{ slot: 'controls', text }], notes: [] }, context(catalogue));

describe('G2-5: a SAUTER product line in AI prose', () => {
  test('F-PROPOSAL-04 · G2-5: named after the brand outside a product token, it is rejected', () => {
    const result = draft('The room controllers come from the SAUTER Zentrix line.');
    expect(result.accepted.paragraphs).toEqual([]);
    expect(result.rejections.map((rejection) => rejection.rules)).toEqual([['product_name_outside_token']]);
    expect(result.guardrailEvents).toEqual([{ type: 'ai_output_rejected', projectId: PROJECT, reason: 'product_name_outside_token' }]);
  });

  test('F-PROPOSAL-04 · G2-5: named without the brand, a line the catalogue lists is rejected outside its token', () => {
    const result = draft('The room controllers come from the Zentrix line.', TEST_CATALOGUE);
    expect(result.rejections.map((rejection) => rejection.rules)).toEqual([['product_name_outside_token']]);
  });

  test('F-PROPOSAL-04 · G2-5: a product token passes only against an approved catalogue', () => {
    expect(draft('The room controllers are {{product:TEST-ZENTRIX}}.', TEST_CATALOGUE).rejections).toEqual([]);
    expect(draft('The room controllers are {{product:TEST-ZENTRIX}}.').rejections.map((rejection) => rejection.rules)).toEqual([['product_token_not_in_catalogue']]);
  });

  test('F-PROPOSAL-04 · G2-5 (control): the company description "SAUTER-based" is not a product name', () => {
    expect(draft('SOVITECH designs SAUTER-based building management systems.').rejections).toEqual([]);
  });
});
