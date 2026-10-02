/**
 * The workspace's server-side copy (phase 4; build log, phase 4 plan, "Where copy lives"): what fills the slot of
 * rule 7's "Not available yet: {missing}" (the registry's rule line `not_available_yet_named`), and the delete
 * confirmation's statement. Each names its source; no word here is a status or a badge 2.8 does not write.
 */
import type { DisplayObject, ValueId } from '../browser/contract';
import { formatCount, type FormatOptions } from '../formatting';

/**
 * What a "Not available yet" line names (rule 7: "It names what is missing"; prompt 3 5.3), each from the gate or
 * the decision that holds it back:
 * - `assetTaxonomy`: `dataset-asset-taxonomy` (counts by type read "Not available yet"; 2.5 "Counts are shown
 *   broken down by asset type"); the name step 3 already uses;
 * - `pointTemplates`: `dataset-point-templates` (PRD R-053, R-067);
 * - `floorStructure`: rule 8, "Floors" (PRD R-077: "naming the floor structure"; G7-14);
 * - `systemsInScope`: PRD R-071 ("'Not available yet' naming the systems in scope"; G7-15);
 * - `sovitechDesign`: proposal 7.2.10 and dashboards 8.8 (SOVITECH's design levels are not the register; R-058,
 *   R-071; G1-27).
 */
export const MISSING = {
  assetTaxonomy: 'SOVITECH asset taxonomy',
  pointTemplates: 'SOVITECH point templates',
  floorStructure: 'floor structure',
  systemsInScope: 'the systems in scope',
  sovitechDesign: "SOVITECH's design of the controllers, networks and integrations",
} as const;

/**
 * The delete confirmation's statement (UD-42): its words are design/dashboards-spec.md 7.1.1's row "15's delete and
 * replace" ("The confirmation states the effect ('N values will return to Unknown')") and US-DOCS-21 AC1 ("<n> values
 * will return to Unknown"); a count of one takes the singular. Not a 2.8 status line: a confirmation's statement of
 * what Delete will do, derived from stored state (ADR 0045 decision 7). A test checks the words against the spec.
 */
export const DELETE_EFFECT = {
  many: '{count} values will return to Unknown',
  one: '{count} value will return to Unknown',
  source: 'design/dashboards-spec.md 7.1.1, "15\'s delete and replace"; US-DOCS-21 AC1',
} as const;

/** The delete effect as its own bound `line` display object (`document:<id>.deleteEffect`; G4-39). */
export function deleteEffectDisplay(valueId: ValueId, count: number, format: FormatOptions): DisplayObject {
  if (!Number.isInteger(count) || count < 0) throw new Error('view-model: the delete effect counts fields, a whole number');
  const figure = formatCount(count, format).text;
  const text = (count === 1 ? DELETE_EFFECT.one : DELETE_EFFECT.many).replace('{count}', figure);
  return { valueId, kind: 'line', text, parts: [figure], shape: 'value' };
}
