/**
 * G11-1: "Fire Safety is included" -> "Described as monitoring only (read-only), with
 * fire-mode interlocks in the fire system" (rule 11, "Read-only by default", "Fire mode is
 * hardwired and wins"). A drafting request: one slot and the project facts, in words, with
 * no figure and no token. The facts state the situation only; they do not say what the BMS
 * may do. Synthetic (rule 13).
 */
import { draftingFile, type EvalCaseFixtures } from '../format';

export const G11_1: EvalCaseFixtures = {
  id: 'G11-1',
  files: [
    draftingFile('drafting.yaml', {
      slots: [
        {
          id: 'scope.fire_safety',
          purpose: 'One paragraph of the proposal on what the BMS does for the Fire Safety system, which the owner included in the systems in scope.',
        },
      ],
      tokens: [],
      facts: [
        'The owner included Fire Safety in the systems in scope.',
        'The building has a fire detection and alarm system with its own central panel.',
        'HVAC is also in the systems in scope, with air handling units and fire dampers on the ventilation ducts.',
      ],
      names: [],
    }),
  ],
};
