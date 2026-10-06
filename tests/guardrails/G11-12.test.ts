/**
 * G11-12 (rule 11, "Fire mode is hardwired and wins": "The interface points stay in scope. The proposal includes these
 * interface points: a fire-alarm input and a fire-mode status per affected panel. It never leaves them out"; PRD R-112
 * near miss): "A proposal generated while no point-template version is approved" → "It names the fire-alarm input and
 * the fire-mode status per affected panel as in scope, with no figure".
 *
 * Proven on the stored proposal (phase 5's view-model): with every dataset gate closed (the live app) the points read
 * "Not available yet", naming the SOVITECH point templates, and the proposal still names the interface points in rule
 * 11's words, as their own line with no figure; whether Fire Safety is in scope, left out or not answered, the line is
 * there; with Fire Safety in scope its monitoring-only sentence (section 5, step 4) is shown too, generated from stored
 * state (R-113), and no sentence gives the BMS any action on a life-safety system.
 */
import { describe, expect, it } from 'vitest';
import { FIRE_SAFETY_MONITORING_ONLY, INTERFACE_POINTS, proposalView } from '@sovitech/view-model/server';
import { testEvents } from './_support/builders';
import { displayById, ownerAnswer, testProposalFields, testProposalInput } from './_support/proposal';

describe('G11-12 · rule 11: the interface points are named while no point template is approved', () => {
  it('G11-12 · R-112 · R-113 · US-PROPOSAL-06: the line names the fire-alarm input and the fire-mode status per affected panel, with no figure, whatever the scope', () => {
    for (const choice of [undefined, 'exclude', 'include'] as const) {
      const answers = choice === undefined ? [] : [ownerAnswer(260, 'project.scope.fire_safety', { choice })];
      const fields = testProposalFields({ candidates: answers.map((answer) => answer.candidate), events: testEvents({ candidate: answers.map((answer) => answer.event) }) });
      const built = proposalView(testProposalInput({ fields }));
      const line = displayById(built.displayObjects, built.view.points.interfacePoints);
      expect(line.text, String(choice)).toBe(INTERFACE_POINTS);
      expect(line.text).toBe('The proposal includes these interface points: a fire-alarm input and a fire-mode status per affected panel.');
      expect(line.text).not.toMatch(/\p{N}/u);
      expect(line.parts).toBeUndefined();
      for (const output of built.view.points.outputs) {
        expect(displayById(built.displayObjects, output.display).text.startsWith('Not available yet: SOVITECH point templates'), output.output).toBe(true);
      }
      const fire = built.view.scope.systems.find((system) => system.systemId === 'fire_safety');
      expect(fire?.lifeSafety).toBe(true);
      if (choice === 'include') {
        expect(displayById(built.displayObjects, fire?.sentence ?? '').text).toBe(FIRE_SAFETY_MONITORING_ONLY);
        expect(built.view.lifeSafety).toEqual([fire?.sentence, built.view.points.interfacePoints]);
      } else {
        expect(fire?.sentence).toBeNull();
        expect(built.view.lifeSafety).toEqual([built.view.points.interfacePoints]);
      }
    }
  });
});
