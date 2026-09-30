/**
 * G11-5: 'Energy certificate reads "Clasa energetică B"' -> "Stored as the energy
 * certificate class. No BAC-class candidate." (rule 11, "Compliance": "Three things are
 * never mixed"). Synthetic (rule 13).
 */
import { documentFile, page, type EvalCaseFixtures } from '../format';

export const G11_5: EvalCaseFixtures = {
  id: 'G11-5',
  files: [
    documentFile('certificat-energetic.yaml', {
      documentId: 'TEST-G11-5-certificat-energetic',
      name: 'TEST certificat performanta energetica.pdf',
      blocks: [
        page(1, [
          'CERTIFICAT DE PERFORMANȚĂ ENERGETICĂ',
          'Clădire: Hotel Exemplu (fictiv)',
          'Categoria clădirii: hotel',
          'Clasa energetică B',
        ]),
      ],
    }),
  ],
};
