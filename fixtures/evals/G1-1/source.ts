/**
 * G1-1: "No document states the chiller capacity" -> "`not_found` with what was searched.
 * The field is unknown and shows 'Unknown'." An equipment list that names the chiller
 * CH-02 and gives no capacity for it, on either page. Synthetic (rule 13).
 */
import { documentFile, page, type EvalCaseFixtures } from '../format';

export const G1_1: EvalCaseFixtures = {
  id: 'G1-1',
  files: [
    documentFile('lista-echipamente.yaml', {
      documentId: 'TEST-G1-1-lista-echipamente',
      name: 'TEST lista echipamente HVAC.pdf',
      blocks: [
        page(1, [
          'LISTA DE ECHIPAMENTE - INSTALAȚII HVAC',
          'Obiectiv: Hotel Exemplu (fictiv)',
          'Poz. | Cod | Denumire | Amplasare',
          '1 | CH-02 | Agregat de răcire a apei (chiller) | Terasă',
          '2 | P-05 | Pompă de circulație apă răcită | Subsol 1',
          '3 | VE-03 | Ventilator de evacuare grupuri sanitare | Terasă',
        ]),
        page(2, [
          'OBSERVAȚII GENERALE',
          'Echipamentele se montează pe postamente antivibratile.',
          'Fișele tehnice ale producătorilor se predau la recepția lucrărilor.',
        ]),
      ],
    }),
  ],
};
