/**
 * System Scope's rows as the page holds them (DB-16; PRD R-052; US-SCOPE-05, US-SCOPE-06): pure helpers over the
 * served `workspace.systemScope` view, so the rules that decide what the page may draw and send are tested apart from
 * the page (./scope-model.test.ts).
 *
 * - **What a row's In Scope control shows** (`scopeControlOf`): a recorded decision draws the switch on (include) or
 *   off (exclude); a visible Suggested preselection draws it on, labelled Suggested with its reason (rule 3); a system
 *   with no recorded decision and no suggestion is **undecided**, and is never drawn as switched off or excluded
 *   (US-SCOPE-05 AC4; R-052: "never drawn as off or excluded"), so it offers "Include" and "Leave out" instead of a
 *   switch. A life-safety system, or one the catalogue never preselects, is never drawn on by a suggestion, whatever
 *   the page is served (rule 11; section 5, step 4; G11-10).
 * - **One decision per press** (`decisionRequest`): the decision field and the candidates the screen showed as its
 *   value, taken from the decision display's served Edit action (`shownCandidateIds`: rule 4, "A correction is a
 *   resolution"; ADR 0036 decision 11, refused `shown_value_changed` when the value changed meanwhile, G4-36, G4-38).
 *   The page never sends `fields.edit` for a scope decision: System Scope's route writes it (R-052; 7.1.1-C8).
 * - **"Save and Continue"** (`visibleSuggestionsOf`): each suggestion that is visible, labelled and left in place is
 *   reported, so the server writes it as the owner's answer (rule 3: "A suggestion left in place counts as the owner's
 *   answer"; G3-20); nothing else is sent, so decisions already recorded and unchanged write nothing (7.1.1-C8;
 *   US-SCOPE-06 AC5).
 */
import type { Action, DisplayObject, FieldRef, ScopeDecisionsRequest, SystemScopeRow } from '@sovitech/view-model/browser';

type EditAction = Extract<Action, { kind: 'edit' }>;

/** What a row's In Scope cell draws. */
export type ScopeControl = 'on' | 'off' | 'undecided';

/** A scope decision's choice (the contract's `ScopeDecisionSchema.choice`). */
export type ScopeChoice = 'include' | 'exclude';

/** Whether the catalogue lets the app preselect this system at all (rule 11; R-051 until D-64). */
export function maySuggest(row: SystemScopeRow): boolean {
  return !row.lifeSafety && !row.neverPreselected;
}

/** Whether the served decision is a recorded answer (not missing, not a suggestion). */
export function isRecorded(decision: DisplayObject | undefined): boolean {
  return decision !== undefined && decision.shape !== 'missing' && decision.badge?.id !== 'suggested';
}

/** Whether the row shows a Suggested preselection the owner may leave in place (visible and labelled: rule 3). */
export function suggestionShown(row: SystemScopeRow, decision: DisplayObject | undefined): boolean {
  return maySuggest(row) && row.suggestion !== null && !isRecorded(decision) && decision?.badge?.id === 'suggested';
}

/** The In Scope control a row draws (see the header). */
export function scopeControlOf(row: SystemScopeRow, decision: DisplayObject | undefined): ScopeControl {
  if (isRecorded(decision)) return row.included ? 'on' : 'off';
  if (suggestionShown(row, decision)) return 'on';
  return 'undecided';
}

/** The decision display's served Edit action: the field it writes and the candidates the screen shows as its value. */
export function decisionEditOf(decision: DisplayObject | undefined): EditAction | undefined {
  return (decision?.actions ?? []).find((action): action is EditAction => action.kind === 'edit');
}

/** The decision field a row answers, from its display (its Edit action, else its field reference). */
export function decisionFieldOf(decision: DisplayObject | undefined): FieldRef | undefined {
  return decisionEditOf(decision)?.field ?? decision?.field;
}

/**
 * The body of one press: the system's decision as the owner set it, naming what the screen showed (an undecided or
 * Suggested row shows no candidate, so it names none). Undefined when the display names no field to write.
 */
export function decisionRequest(decision: DisplayObject | undefined, choice: ScopeChoice): ScopeDecisionsRequest | undefined {
  const field = decisionFieldOf(decision);
  if (field === undefined) return undefined;
  const corrects = decisionEditOf(decision)?.shownCandidateIds ?? [];
  return { decisions: [{ field: { subjectId: field.subjectId, fieldKey: field.fieldKey }, choice, corrects: [...corrects] }], visibleSuggestions: [] };
}

/** The visible suggestions left in place, as "Save and Continue" reports them (rule 3; G3-20). */
export function visibleSuggestionsOf(rows: readonly SystemScopeRow[], decisions: ReadonlyMap<string, DisplayObject>): ScopeDecisionsRequest['visibleSuggestions'] {
  const visible: ScopeDecisionsRequest['visibleSuggestions'][number][] = [];
  for (const row of rows) {
    const decision = decisions.get(row.decision);
    const field = decisionFieldOf(decision);
    if (field === undefined || !suggestionShown(row, decision)) continue;
    visible.push({ field: { subjectId: field.subjectId, fieldKey: field.fieldKey }, choice: 'include' });
  }
  return visible;
}
