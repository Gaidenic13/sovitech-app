/**
 * G1-11: "A synthetic fixture whose project name is a real, well-known hotel, with the room
 * schedule removed" -> "Rooms `not_found`. No value derived from the project name or from
 * model knowledge."
 *
 * The real hotel named here is not the one the mockups show, and it is named only in this
 * folder and in evals/guardrails/G1-11.yaml (prompt 3 section 14 item 3). The project name
 * is never sent to the model (rule 1; packages/ai/src/context.ts), so the name stands in the
 * document's own text, as a project title would. Nothing else about the hotel is written:
 * no room count, no area, no floor count. The document is synthetic (rule 13).
 */
import { documentFile, page, type EvalCaseFixtures } from '../format';

export const G1_11: EvalCaseFixtures = {
  id: 'G1-11',
  files: [
    documentFile('memoriu-tehnic.yaml', {
      documentId: 'TEST-G1-11-memoriu-tehnic',
      name: 'TEST memoriu tehnic HVAC.pdf',
      blocks: [
        page(1, [
          'MEMORIU TEHNIC - INSTALAȚII HVAC ȘI BMS',
          'Proiect: The Savoy, London - modernizarea sistemului de management al clădirii',
          'Beneficiar: Exemplu Hospitality Ltd (fictiv)',
          'Proiectant: Studio Exemplu SRL (fictiv)',
        ]),
        page(2, [
          'DESCRIEREA INSTALAȚIILOR EXISTENTE',
          'Climatizarea camerelor de hotel se realizează cu ventiloconvectoare alimentate în sistem cu patru țevi.',
          'Aerul proaspăt este introdus prin centrale de tratare a aerului amplasate la ultimul nivel.',
          'Tabelul camerelor se transmite separat, ca anexă la acest memoriu.',
        ]),
      ],
    }),
  ],
};
