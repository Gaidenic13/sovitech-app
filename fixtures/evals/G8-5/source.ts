/**
 * G8-5: '"Putere frigorifică 1.200 kW / putere electrică absorbită 380 kW"' -> "Two fields:
 * cooling output and electrical input" (rule 8, "Power": "A chiller's cooling capacity and
 * its electrical input are two fields"). The line is the case's own, from guardrails
 * section 7 (prompt 3 section 14 item 3). Synthetic (rule 13).
 */
import { documentFile, page, type EvalCaseFixtures } from '../format';

export const G8_5: EvalCaseFixtures = {
  id: 'G8-5',
  files: [
    documentFile('fisa-tehnica.yaml', {
      documentId: 'TEST-G8-5-fisa-tehnica',
      name: 'TEST fisa tehnica agregat racire.pdf',
      blocks: [
        page(1, [
          'FIȘĂ TEHNICĂ - AGREGAT DE RĂCIRE CH-01',
          'Producător: Exemplu Frig SRL (fictiv)',
          'Putere frigorifică 1.200 kW / putere electrică absorbită 380 kW',
        ]),
      ],
    }),
  ],
};
