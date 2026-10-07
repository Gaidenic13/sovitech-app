/**
 * TEST body of `TEST-capexBySystem@1.0.0` (phase 6; the TEST breakdown series `capex.TEST_bySystem`: G1-5, G9-8,
 * G10-7; rule 1 "A chart shows an unknown as a labelled gap"; docs/adr/0052 decision 4). TEST method, not SOVITECH's
 * (no source defines investment by system: the build log's P-6-SERIES-SIGNATURES): each system's line is the TEST
 * per-building range of that system for the building type (TEST engine tables, the table the stage 1 mirror reads),
 * and the total is the sum of the lines, one formula giving every line and the total (G9-9).
 *
 * Unknowns, under `range_over_options` (the engine hands an unknown enum or decision with its options):
 * - a system whose decision may be include or exclude (unknown, ranged over its options, or two values read as a
 *   range: rule 4) has **no line**: whether it has a cost at all is not known, so its line is not available, naming
 *   the decision (a labelled gap, never a zero: G1-5); the total ranges over both options (nothing for exclude, the
 *   line for include, as the savings mirror ranges an area: rule 1, "Ranges need a basis");
 * - an excluded system has no line (G10-7: "It contributes no cost ... line"); the view-model lists it among the
 *   exclusions by the decision as used, never as a gap;
 * - an unknown building type ranges each line over its options; an option with no TEST range (`other`) leaves every
 *   output not available, naming the building type when it was unknown.
 * Never a zero for an unknown, never a typed range (rule 9: the range is the method's).
 */
import { FIELD, SYSTEMS, scopeFieldKey } from '@sovitech/registry';
import type { BodyOutput, FormulaBody } from '../../src/catalogue';
import { exact, hull, point, sum, type Interval } from '../../src/interval';
import { choicesOf, decisionHolds, entriesOf, missingInput, notAvailable, tableRange, testEstimate } from '../engine-lib';
import { TEST_DATASET_IDS } from '../datasets';
import { lookup } from '../lib';

/** The output of a system's line (value-id safe: `capex.TEST_bySystem.<system id>`). */
export const lineOutputOf = (systemId: string): string => `capex.TEST_bySystem.${systemId}`;

/** The output of the total. */
export const TOTAL_OUTPUT = 'capex.TEST_bySystem.total';

/** Every output, the lines in the catalogue's order of systems, then the total. */
export const OUTPUTS: readonly string[] = [...SYSTEMS.map((system) => lineOutputOf(system.id)), TOTAL_OUTPUT];

/** What an excluded system adds to the total: nothing, by the owner's decision. */
const NOTHING: Interval = point(exact(0));

export const body: FormulaBody = (inputs) => {
  const tables = entriesOf(inputs, TEST_DATASET_IDS.engineTables);
  const types = choicesOf(inputs, FIELD.buildingType);
  if (types.some((type) => lookup(tables, 'perBuildingByTypeAndSystem', type) === undefined)) {
    const missing = inputs.readings.has(FIELD.buildingType)
      ? notAvailable({ kind: 'method', name: 'TEST: no TEST range for the building type' })
      : notAvailable(missingInput(inputs, FIELD.buildingType, 'unknown'));
    return Object.fromEntries(OUTPUTS.map((output) => [output, missing]));
  }
  const answers: Record<string, BodyOutput> = {};
  const parts: Interval[] = [];
  for (const system of SYSTEMS) {
    const fieldKey = scopeFieldKey(system.id);
    const holds = decisionHolds(inputs, fieldKey, 'include');
    const line = hull(types.map((type) => tableRange(tables, ['perBuildingByTypeAndSystem', type, system.id], `perBuildingByTypeAndSystem.${type}.${system.id}`)));
    if (holds === 'yes') {
      answers[lineOutputOf(system.id)] = testEstimate(line, 'EUR');
      parts.push(line);
    } else if (holds === 'maybe') {
      // Two values read as a range (rule 4) name the conflict; an unknown decision ranged over its options names it unknown.
      answers[lineOutputOf(system.id)] = notAvailable(missingInput(inputs, fieldKey, inputs.readings.get(fieldKey)?.kind === 'range' ? 'conflict' : 'unknown'));
      parts.push(hull([NOTHING, line]));
    } else {
      answers[lineOutputOf(system.id)] = notAvailable({ kind: 'method', name: 'TEST: out of scope, so no line' });
    }
  }
  answers[TOTAL_OUTPUT] = parts.length === 0 ? notAvailable({ kind: 'method', name: 'TEST: no system in scope' }) : testEstimate(sum(parts), 'EUR');
  return answers;
};
