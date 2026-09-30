/**
 * G3-2: "A symbol match with no label or legend" -> "Confidence at most medium, and
 * Possible".
 *
 * A text fixture cannot draw a symbol: what the extractor stores of a plan is its text
 * layer. So the plan's text holds only a tag pattern that usually means the type, beside
 * the symbol it labels, with no legend, no schedule and no glossary sent, which rule 3
 * names in the same tier ("Medium ('Possible'). A symbol or tag pattern that usually means
 * the type, with no legend or schedule confirming it"). Synthetic (rule 13).
 */
import { documentFile, page, type EvalCaseFixtures } from '../format';

export const G3_2: EvalCaseFixtures = {
  id: 'G3-2',
  files: [
    documentFile('plan-subsol.yaml', {
      documentId: 'TEST-G3-2-plan-subsol',
      name: 'TEST plan subsol ventilare.pdf',
      blocks: [page(1, ['PLAN SUBSOL 1 - INSTALAȚII DE VENTILARE', 'Scara 1:100', 'UTA-2', 'Cota ±0,00'])],
    }),
  ],
};
