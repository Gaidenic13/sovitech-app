/**
 * Step 4's systems as the page holds them between Continue presses (OB-4; PRD R-051; US-SCOPE-01 to
 * US-SCOPE-03): pure helpers over the served step 4 view, so the rules that decide what the page may
 * send are tested apart from the page.
 *
 * - A card starts ticked from the served `selected` (the owner's stored decision, or a visible
 *   suggestion). A life-safety card, and one the catalogue never preselects (Access Control and
 *   Elevators until D-64), starts ticked only from the owner's own stored decision: the page never
 *   ticks Fire Safety by itself, whatever it is served (rule 11; US-SCOPE-02 AC2, US-SCOPE-03 AC1).
 * - A suggestion counts as visible only on a card the catalogue may preselect, left ticked and not
 *   touched by the owner (rule 3: "a suggestion that was visible, labelled and left in place"; G3-4).
 *   A card the owner touched is the owner's own answer.
 * - Continue sends the whole question (actions.ts `MultiAnswer`): the decision fields ticked, the
 *   visible suggestions left in place, and the question as shown, so that with nothing ticked or
 *   suggested it is recorded as skipped, never as a decision against every system (rule 7; PRD R-051
 *   "Proposed (PRD interim, reversible) until D-64").
 */
import type { Action, ContinueRequest, DisplayObject, StepView } from '@sovitech/view-model/browser';

export type Step4View = Extract<StepView, { step: 4 }>;
export type SystemCard = Step4View['systems'][number];

/** The owner's changes on this page, by decision field key: ticked or not. */
export type Ticks = ReadonlyMap<string, boolean>;

/** The decision field a card answers (its display's field reference), or undefined when the display names none. */
export function decisionFieldOf(decision: DisplayObject | undefined): { readonly subjectId: string; readonly fieldKey: string } | undefined {
  return decision?.field;
}

/** Whether a card may carry a preselection at all (rule 11; R-051 until D-64). */
export function mayPreselect(card: SystemCard): boolean {
  return !card.lifeSafety && !card.neverPreselected;
}

/** Whether the served decision is the owner's own stored answer (not a suggestion, not missing). */
export function isOwnerDecision(decision: DisplayObject | undefined): boolean {
  return decision !== undefined && decision.shape !== 'missing' && decision.badge?.id !== 'suggested';
}

/** The tick a card starts with, as served (see the header). */
export function servedTick(card: SystemCard, decision: DisplayObject | undefined): boolean {
  if (!mayPreselect(card)) return card.selected && isOwnerDecision(decision);
  return card.selected;
}

export function tickOf(card: SystemCard, decision: DisplayObject | undefined, ticks: Ticks): boolean {
  const key = decisionFieldOf(decision)?.fieldKey;
  const changed = key === undefined ? undefined : ticks.get(key);
  return changed ?? servedTick(card, decision);
}

/** Whether the card's suggestion is visible and left in place (rule 3; G3-4). */
export function suggestionShown(card: SystemCard, decision: DisplayObject | undefined, ticks: Ticks): boolean {
  const key = decisionFieldOf(decision)?.fieldKey;
  if (!mayPreselect(card) || card.suggestion === null || key === undefined || ticks.has(key)) return false;
  return tickOf(card, decision, ticks);
}

/** The option a decision's "in scope" answer writes: the first option of its served Edit (2.6: `include`, then `exclude`). */
export function positiveOptionOf(decision: DisplayObject | undefined): string | undefined {
  const edit = (decision?.actions ?? []).find((action): action is Extract<Action, { kind: 'edit' }> => action.kind === 'edit');
  return edit !== undefined && edit.input.kind === 'choice' ? edit.input.options[0] : undefined;
}

/** The Continue body of step 4 (actions.ts `ContinueRequest`). */
export function continueBody(view: Step4View, decisions: ReadonlyMap<string, DisplayObject>, ticks: Ticks): ContinueRequest {
  const ticked: string[] = [];
  const visibleSuggestions: ContinueRequest['visibleSuggestions'][number][] = [];
  for (const card of view.systems) {
    const decision = decisions.get(card.decision);
    const field = decisionFieldOf(decision);
    if (field === undefined) continue;
    if (tickOf(card, decision, ticks)) ticked.push(field.fieldKey);
    const choice = positiveOptionOf(decision);
    if (suggestionShown(card, decision, ticks) && choice !== undefined) visibleSuggestions.push({ field: { subjectId: field.subjectId, fieldKey: field.fieldKey }, choice });
  }
  return {
    answers: [],
    multi: [{ questionId: view.question.questionId, ticked }],
    visibleSuggestions,
    shown: { questions: [view.question.questionId], confirmations: [] },
  };
}
