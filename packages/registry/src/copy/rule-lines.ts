/**
 * The rule lines: sentences the guardrails' rules write word for word for the wizard, which are not
 * 2.8 badges or status lines (docs/guardrails.md rules 4, 5, 7 and 12, section 4, 2.8's example
 * lines, section 5). The view-model fills their slots from stored state and serves them in display
 * objects (kind `rule_line`); the UI never repeats their words (a UI catalogue that repeated them
 * would duplicate registry copy, and the reserved-term check reads both). None holds a reserved term,
 * so none needs an allowance (./allowances.ts).
 *
 * Action labels ("Generate without it", "Looks right", "Something's wrong", "Skip for now", "Edit", "Yes")
 * are fixed interface copy in the UI catalogue (apps/web/src/copy/en.json), not rule lines.
 *
 * Slots: `{name}`. A slot named `count` takes a whole number formatted by the view-model's formatting
 * module and bound to the value id the view-model derives from the stored state it counts (prompt 3
 * section 7); every other slot takes a registry label or a stored name. A `_one` variant is the same
 * sentence in the singular, used when the count is 1. A `_vowel` variant is the same sentence with
 * "an" for "a", used when the slot's word starts with a vowel.
 *
 * Phase 3 (planner) wrote the list; the view-model builder adds the test that reads each `source`
 * sentence from docs/guardrails.md (the words outside the slots must occur there), as copy.test.ts
 * does for 2.8.
 */

export interface RuleLineDefinition {
  readonly id: string;
  /** The sentence, with `{slot}` where the guardrails write an example value or a placeholder. */
  readonly template: string;
  /** Where the guardrails write it. */
  readonly source: string;
}

const rule = (id: string, template: string, source: string): RuleLineDefinition => Object.freeze({ id, template, source });

export const RULE_LINES: readonly RuleLineDefinition[] = Object.freeze([
  // Rule 7, "Skip for now"
  rule('provide_later', 'You can provide this later.', 'rule 7, "Skip for now"; 2.8 "No value, never asked or skipped"'),
  // Rule 7, "first_estimate" row: the step 8 inline ask
  rule('inline_ask', 'To show your investment estimate we need {field}.', 'rule 7, criticality table, `first_estimate`'),
  // Rule 7, "Open items are short, and say who acts"
  rule('things_for_you', '{count} things for you to check', 'rule 7, "Counts"'),
  rule('things_for_you_one', '{count} thing for you to check', 'rule 7, "Counts" (singular)'),
  rule('and_more', 'and {count} more', 'rule 7, "For you"'),
  rule('sovitech_will_check_equipment', 'SOVITECH will check {count} equipment classifications', 'G7-5; rule 7, "SOVITECH will check"'),
  rule('sovitech_will_check_equipment_one', 'SOVITECH will check {count} equipment classification', 'G7-5; rule 7 (singular)'),
  // Rule 7, "Late findings never interrupt"
  rule('late_findings_notice', "We found {count} more things in your documents. You'll see them on the review step.", 'rule 7, "Late findings never interrupt"'),
  rule('late_findings_notice_one', "We found {count} more thing in your documents. You'll see it on the review step.", 'rule 7 (singular)'),
  rule('still_reading', 'Still reading {count} files. Your estimate will update when they finish.', 'rule 7, "Analysis still running never blocks Generate"'),
  rule('still_reading_one', 'Still reading {count} file. Your estimate will update when it finishes.', 'rule 7 (singular)'),
  // 2.8 "Not available yet" example line, and rule 4's form of it
  rule('add_to_see_this', 'Add the {field} to see this.', '2.8, "Output missing a first-estimate input": "Add the building area to see this. [Add area]"'),
  rule('add_action', 'Add {field}', '2.8, "Output missing a first-estimate input" ("[Add area]")'),
  rule('not_available_yet_named', 'Not available yet: {missing}', 'rule 4, "Until a conflict is resolved" ("Not available yet: two values for floors"); prompt 3 5.3'),
  rule('not_available_yet_two_values', 'Not available yet: two values for {field}', 'rule 4, "Until a conflict is resolved"; G4-12'),
  rule('provisional_two_values', 'Provisional: two values for {field}', 'rule 4, "Until a conflict is resolved"'),
  // 2.3, "Changes are announced": the review step's one notice per declared revision. The revision
  // as written names it; while no classifier reads title blocks (US-DOCS-08), the file name as uploaded.
  rule('revision_changed', '{revision} changed {count} values', '2.3, "Changes are announced" ("Rev B changed 3 values"); G4-13'),
  rule('revision_changed_one', '{revision} changed {count} value', '2.3 (singular)'),
  // Rule 4, conflicts
  rule('conflict_for_owner', 'Documents say {documentValue}. You entered {ownerValue}. Which is right?', '2.8, "Two values"; US-REVIEW-11 AC2'),
  rule('conflict_for_engineer', 'Documents disagree on this. A SOVITECH engineer will check it.', 'rule 4, "Routing"'),
  // Rule 5 and section 5, confirmations
  rule('is_this_right', 'Is this right?', 'section 5, step 3 ("Is this right? Yes · Edit")'),
  rule('yes_building_type', "Yes, it's a {buildingType}", 'section 4, example ("Yes, it\'s a hotel"); section 5, step 5'),
  rule('yes_building_type_vowel', "Yes, it's an {buildingType}", 'section 4 (the same words, "an" before a vowel: "Yes, it\'s an office")'),
  // Rule 12
  rule('not_found_coverage', 'Not found in the analysed documents ({coverage}).', 'rule 12; 2.8, "Supported system not found (step 4)"'),
  rule('not_found_can_include', 'Not found in the analysed documents ({coverage}). You can still include it.', '2.8, "Supported system not found (step 4)"'),
  // 2.8 "Suggested" and section 4's evidence line
  rule('suggested_because', 'Suggested because {reason}', '2.8, "Owner choice preselected"'),
  rule('suggested_because_document_names', 'Suggested because {document} names {system}', 'US-SCOPE-02 AC1; 2.8 "Suggested"'),
  rule('guest_rooms_in', '{count} guest rooms in {document}', 'section 4, example ("212 guest rooms in Room Schedule.xlsx")'),
]);

export type RuleLineId = string;

const BY_ID: ReadonlyMap<string, RuleLineDefinition> = new Map(RULE_LINES.map((entry) => [entry.id, entry]));

export function ruleLineById(id: RuleLineId): RuleLineDefinition {
  const entry = BY_ID.get(id);
  if (entry === undefined) throw new Error(`packages/registry/src/copy/rule-lines.ts: no rule line ${id}`);
  return entry;
}
