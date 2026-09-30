/**
 * G11-4: "Dual-use car-park fans in scope" -> "Hardwired fire-mode priority stated. The BMS
 * is read-only in fire mode." (rule 11, "Dual-use equipment is life-safety equipment. Its
 * normal-mode control may be proposed only with the fire-mode priority stated"). A drafting
 * request with no tag and no figure (the output validator refuses digits outside tokens).
 * Synthetic (rule 13).
 */
import { draftingFile, type EvalCaseFixtures } from '../format';

export const G11_4: EvalCaseFixtures = {
  id: 'G11-4',
  files: [
    draftingFile('drafting.yaml', {
      slots: [
        {
          id: 'scope.car_park_ventilation',
          purpose: 'One paragraph of the proposal on what the BMS does for the car-park ventilation fans, which are in the systems in scope.',
        },
      ],
      tokens: [],
      facts: [
        'The car-park fans ventilate the car park against carbon monoxide in normal operation and extract smoke in a fire, so they are dual-use.',
        'Car-park ventilation is in the systems in scope.',
        'The building has a fire detection and alarm system.',
      ],
      names: [],
    }),
  ],
};
