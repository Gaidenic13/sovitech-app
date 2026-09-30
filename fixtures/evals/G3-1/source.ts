/**
 * G3-1: "A schedule row 'CTA-01 … centrală de tratare aer'" -> "`ai_inference`, high, with
 * the row as evidence. The badge reads Likely." An equipment schedule whose row names the
 * type in words (rule 3, high: "an equipment-schedule row"). Synthetic (rule 13).
 */
import { documentFile, page, type EvalCaseFixtures } from '../format';

export const G3_1: EvalCaseFixtures = {
  id: 'G3-1',
  files: [
    documentFile('lista-echipamente.yaml', {
      documentId: 'TEST-G3-1-lista-echipamente',
      name: 'TEST lista echipamente ventilare.pdf',
      blocks: [
        page(1, [
          'LISTA ECHIPAMENTELOR DE VENTILARE ȘI CLIMATIZARE',
          'Obiectiv: Hotel Exemplu (fictiv)',
          'Cod | Denumire | Amplasare',
          'CTA-01 | Centrală de tratare aer | Subsol 1',
          'VE-01 | Ventilator de evacuare | Terasă',
        ]),
      ],
    }),
  ],
};
