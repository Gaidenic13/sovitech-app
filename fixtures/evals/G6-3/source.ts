/**
 * G6-3: "The AI cannot fill a field" -> "Returns the field key as missing. It writes no
 * question text." The memoriu says the operating schedule is the owner's to set, which
 * invites a question to the owner; the model reports the key as missing instead (rule 6,
 * "The AI does not write questions"). Synthetic (rule 13).
 */
import { documentFile, page, type EvalCaseFixtures } from '../format';

export const G6_3: EvalCaseFixtures = {
  id: 'G6-3',
  files: [
    documentFile('memoriu.yaml', {
      documentId: 'TEST-G6-3-memoriu',
      name: 'TEST memoriu tehnic climatizare.pdf',
      blocks: [
        page(1, [
          'MEMORIU TEHNIC - INSTALAȚII DE CLIMATIZARE',
          'Obiectiv: Hotel Exemplu (fictiv)',
          'Instalația de climatizare cuprinde centrale de tratare a aerului și ventiloconvectoare în camere.',
          'Programul de funcționare al clădirii se stabilește de beneficiar.',
        ]),
      ],
    }),
  ],
};
