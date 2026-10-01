/**
 * Suggested preselections (F-QUESTION-06; guardrails rule 3, "Facts versus choices"; section 5,
 * steps 4 and 5 to 7; PRD R-005, R-006, R-051): a visible, labelled preselection of an owner's
 * choice with a one-line reason naming what suggests it. A suggestion is never a candidate: it
 * becomes one only when the owner leaves it in place and presses Continue (planContinue).
 *
 * What may be suggested (the guard every rule's output passes, `suggestionsFor`):
 * - only a choice: a decision field (systems in scope, goals, automation areas), or the occupancy or
 *   the operating schedule (rule 3: "occupancy or schedule where no document states them"); never a
 *   fact (building type, areas, counts, which systems exist);
 * - only on a field with no answer, not skipped (rule 7, "Skip means skip"), with a registered option;
 * - never a life-safety system (rule 11; section 5, step 4: "except life-safety systems") and never a
 *   system the catalogue marks `neverPreselected` (Access Control and Elevators until D-64).
 *
 * The production rules: none. Step 4 would suggest a system a detection names, but the registry
 * declares no detection field (proposal P-3-DETECTION-FIELDS), and steps 5 to 7 carry no
 * suggestion until D-11 and D-12 (PRD R-005, R-006 "Until decided"). `scopeSuggestionRule` is the
 * step 4 rule the proposal would register; cases prove the mechanism with TEST detection fields.
 */
import { SYSTEMS, scopeFieldKey } from '@sovitech/registry';
import { eligibleCandidates, fieldRefKey, hasEligible, type IntakeField } from './model';

/**
 * A visible Suggested preselection with its one-line reason naming what suggests it (rule 3).
 */
export interface Suggestion {
  readonly fieldKey: string;
  readonly subjectId: string;
  readonly choice: string;
  readonly reasonLineId: string;
  readonly reasonSlots: Readonly<Record<string, string>>;
  /** What suggested it, for the `accepted_suggestion` event's reason (rule 3). */
  readonly suggestedBy: string;
}

/** A suggestion rule, so a TEST rule can prove the mechanism where no production rule exists yet (G3-4 on an automation area). */
export type SuggestionRule = (fields: readonly IntakeField[]) => readonly Suggestion[];

export const PRODUCTION_SUGGESTION_RULES: readonly SuggestionRule[] = [];

/** The scope fields of rule 11's life-safety systems and of the systems never preselected (catalogue). */
const NEVER_SUGGESTED: ReadonlySet<string> = new Set(SYSTEMS.filter((system) => system.lifeSafety || system.neverPreselected).map((system) => scopeFieldKey(system.id)));

/** Whether a field holds an owner's choice that rule 3 lets the app preselect. */
function isChoice(field: IntakeField): boolean {
  const definition = field.field;
  if (definition.kind === 'decision') return true;
  return definition.subject === 'project' && definition.kind === 'enum' && definition.confirmByBasis === 'use_and_occupancy';
}

/**
 * The suggestions the rules make that rule 3, rule 7 and rule 11 allow, one per field (the first
 * rule's). A suggestion the guard drops is simply not shown: no badge, no preselection.
 */
export function suggestionsFor(fields: readonly IntakeField[], rules: readonly SuggestionRule[] = PRODUCTION_SUGGESTION_RULES): Suggestion[] {
  const byRef = new Map(fields.map((field) => [fieldRefKey(field.subjectId, field.field.key), field]));
  const kept = new Map<string, Suggestion>();
  for (const rule of rules) {
    for (const suggestion of rule(fields)) {
      const key = fieldRefKey(suggestion.subjectId, suggestion.fieldKey);
      const field = byRef.get(key);
      if (field === undefined || kept.has(key)) continue;
      if (!isChoice(field) || NEVER_SUGGESTED.has(field.field.key)) continue;
      if (hasEligible(field) || field.skippedAt.length > 0) continue;
      if (!(field.field.options ?? []).includes(suggestion.choice)) continue;
      kept.set(key, suggestion);
    }
  }
  return [...kept.values()];
}

/**
 * Step 4's rule, as proposal P-3-DETECTION-FIELDS would register it: a system whose detection field
 * (`detectionFieldKey(system)`, on the building) has an eligible value is suggested in scope
 * (`include`), with the reason "Suggested because <document> names <system>" (US-SCOPE-02 AC1).
 * Life-safety systems and those never preselected are dropped by the guard, whatever the
 * detection says (G11-9).
 */
export function scopeSuggestionRule(detectionFieldKey: (systemId: string) => string, fileName: (documentId: string) => string | undefined): SuggestionRule {
  return (fields) => {
    const suggestions: Suggestion[] = [];
    for (const system of SYSTEMS) {
      const detection = fields.find((field) => field.field.key === detectionFieldKey(system.id));
      const scope = fields.find((field) => field.field.key === scopeFieldKey(system.id));
      if (detection === undefined || scope === undefined) continue;
      const found = eligibleCandidates(detection).find((candidate) => candidate.evidence.length > 0);
      const documentId = found?.evidence[0]?.documentId;
      const name = documentId === undefined ? undefined : fileName(documentId);
      if (found === undefined || name === undefined) continue;
      suggestions.push({
        fieldKey: scope.field.key,
        subjectId: scope.subjectId,
        choice: 'include',
        reasonLineId: 'suggested_because_document_names',
        reasonSlots: { document: name, system: system.name },
        suggestedBy: `detection:${found.id}`,
      });
    }
    return suggestions;
  };
}
