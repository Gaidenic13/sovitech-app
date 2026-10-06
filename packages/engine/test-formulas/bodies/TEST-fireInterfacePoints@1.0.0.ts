/**
 * TEST body of `TEST-fireInterfacePoints@1.0.0` (G11-3, G10-7; rule 11: "The interface points stay in scope. The
 * proposal includes these interface points: a fire-alarm input and a fire-mode status per affected panel. It never
 * leaves them out"; guardrails section 5, step 4: leaving Fire Safety unchecked never removes them). A calculated count
 * from the register: one fire-alarm input and one fire-mode status per AHU panel while HVAC is in scope. The formula
 * does not read the Fire Safety scope decision at all, so no answer to it can remove them.
 */
import { scopeFieldKey } from '@sovitech/registry';
import type { FormulaBody } from '../../src/catalogue';
import { choicesOf, notAvailable, quantityOf, testValue } from '../engine-lib';
import { TEST_FIELDS } from '../fields';

export const body: FormulaBody = (inputs) => {
  const panels = quantityOf(inputs, TEST_FIELDS.ahuPanels.key, 'count');
  if (panels === undefined) throw new Error('TEST: a refuse-policy body was run without the AHU panels');
  if (!choicesOf(inputs, scopeFieldKey('hvac')).includes('include')) {
    const none = notAvailable({ kind: 'method', name: 'TEST: no AHU panel in the BMS scope' });
    return { 'points.TEST_fireAlarmInputs': none, 'points.TEST_fireModeStatuses': none };
  }
  const note = ['TEST: per affected panel, as rule 11 names them'];
  return { 'points.TEST_fireAlarmInputs': testValue(panels.low, 'count', undefined, note), 'points.TEST_fireModeStatuses': testValue(panels.low, 'count', undefined, note) };
};
