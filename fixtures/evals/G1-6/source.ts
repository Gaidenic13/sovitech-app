/**
 * G1-6: "A chiller datasheet says 'compatibil BMS'" -> "Interface unknown ... No protocol
 * candidate, and no integration points." The datasheet names no protocol and no contact
 * (rule 1, "Interfaces": "Compatibil BMS" does not name a protocol). Synthetic (rule 13).
 */
import { documentFile, page, type EvalCaseFixtures } from '../format';

export const G1_6: EvalCaseFixtures = {
  id: 'G1-6',
  files: [
    documentFile('fisa-tehnica-chiller.yaml', {
      documentId: 'TEST-G1-6-fisa-tehnica',
      name: 'TEST fisa tehnica agregat racire.pdf',
      blocks: [
        page(1, [
          'FIȘĂ TEHNICĂ - AGREGAT DE RĂCIRE A APEI',
          'Producător: Exemplu Frig SRL (fictiv)',
          'Cod echipament în proiect: CH-01',
          'Tip: agregat de răcire cu condensare în aer',
          'Automatizare: tablou de comandă propriu, compatibil BMS',
          'Alimentare: 400 V 3~ 50 Hz',
        ]),
        page(2, [
          'MONTAJ ȘI PUNERE ÎN FUNCȚIUNE',
          'Echipamentul se livrează cu tabloul de comandă montat și testat în fabrică.',
          'Punerea în funcțiune se face de către service-ul autorizat al producătorului.',
        ]),
      ],
    }),
  ],
};
