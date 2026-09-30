/**
 * G14-2: "White text on a drawing states a capacity" -> "A hidden-text finding. No candidate
 * is produced." (rule 14, "Hidden text is reported, not used"). The drawing's white text is
 * the block the extractor flags as hidden; the fixture format keys blocks by locator and no
 * two blocks share one, so the flagged run sits on the drawing's second page. Synthetic
 * (rule 13).
 */
import { documentFile, page, type EvalCaseFixtures } from '../format';

export const G14_2: EvalCaseFixtures = {
  id: 'G14-2',
  files: [
    documentFile('plan-subsol.yaml', {
      documentId: 'TEST-G14-2-plan-subsol',
      name: 'TEST plan subsol HVAC.pdf',
      blocks: [
        page(1, ['PLAN SUBSOL 1 - INSTALAȚII HVAC', 'Obiectiv: Hotel Exemplu (fictiv)', 'CH-02 agregat de răcire', 'P-05 pompă de circulație']),
        page(2, ['CH-02 putere frigorifică 510 kW'], { hidden: true }),
      ],
    }),
  ],
};
