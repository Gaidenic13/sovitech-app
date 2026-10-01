/**
 * Step 3's facts as the screen lays them out (OB-3, UD-34, UD-45; PRD R-045): pure helpers over the
 * value ids a view names and the display objects it was served. Nothing here reads a number or forms
 * a value: every value, badge and line stays in its display object (guardrails rule 2).
 *
 * - `factTree`: the resolver serves a multi-fact field (floors by level type, rooms and zones by what
 *   they count) as the field's own display and one display per fact, and a field in conflict as the
 *   field's display and one display per value in conflict (packages/view-model/src/resolver,
 *   `resolveField`). Their value ids extend the field's (`<field id>.<qualifier>`, `<id>.value<n>`,
 *   `<id>.unqualified<n>`), so the tree is read from the ids alone: a child is listed under the
 *   nearest id it extends. A value element never holds another (tests/e2e/render/README.md), so the
 *   children render beside their field, never inside it.
 * - `shownConfirmations`: the confirmations the screen shows ("Is this right? Yes · Edit"), which
 *   Continue reports so that the ones left unanswered are skipped (rule 7: "Continue counts as
 *   skipping"; a declined confirmation joins "For you" at step 8, US-REVIEW-06 AC1).
 * - `conflictChoices`: the values of a conflict put to the owner, each with the candidate its choice
 *   names (rule 4; US-REVIEW-11 AC3). A conflict routed to the engineer carries no choice.
 */
import type { Action, DisplayObject } from '@sovitech/view-model/browser';
import type { Displays } from '../../wizard/use-step-view';

export interface FactNode {
  readonly display: DisplayObject;
  readonly children: readonly FactNode[];
}

export type ConfirmAction = Extract<Action, { kind: 'confirm' }>;
export type ResolveAction = Extract<Action, { kind: 'resolve_conflict' }>;
export type EditAction = Extract<Action, { kind: 'edit' }>;

/** The ids in view order, each under the nearest listed id it extends (`<parent>.<segment>`). Ids with no display are dropped. */
export function factTree(ids: readonly string[], displays: Displays): FactNode[] {
  const listed = [...new Set(ids)].filter((id) => displays.has(id));
  const parentOf = new Map<string, string | undefined>();
  for (const id of listed) {
    const ancestors = listed.filter((other) => other !== id && id.startsWith(`${other}.`));
    const nearest = ancestors.sort((left, right) => right.length - left.length)[0];
    parentOf.set(id, nearest);
  }
  const build = (id: string): FactNode => {
    const display = displays.get(id);
    if (display === undefined) throw new Error(`no display for ${id}`);
    return { display, children: listed.filter((child) => parentOf.get(child) === id).map(build) };
  };
  return listed.filter((id) => parentOf.get(id) === undefined).map(build);
}

function allNodes(nodes: readonly FactNode[]): FactNode[] {
  return nodes.flatMap((node) => [node, ...allNodes(node.children)]);
}

export function actionOf<K extends Action['kind']>(display: DisplayObject, kind: K): Extract<Action, { kind: K }> | undefined {
  return (display.actions ?? []).find((action): action is Extract<Action, { kind: K }> => action.kind === kind);
}

/** The candidate ids of the confirmations on screen, once each. */
export function shownConfirmations(nodes: readonly FactNode[]): string[] {
  const ids = allNodes(nodes).flatMap((node) => {
    const confirm = actionOf(node.display, 'confirm');
    return confirm === undefined ? [] : [confirm.candidateId];
  });
  return [...new Set(ids)];
}

/** The value ids of the rows on screen that show a confirmation, in order (the warning row leads to the first). */
export function confirmationRows(nodes: readonly FactNode[]): string[] {
  return allNodes(nodes)
    .filter((node) => actionOf(node.display, 'confirm') !== undefined)
    .map((node) => node.display.valueId);
}

/** The candidate a conflict's choice names for one of its values, or undefined when the value is not a choice put to the owner. */
export function choiceFor(parent: DisplayObject, childValueId: string): { readonly action: ResolveAction; readonly candidateId: string } | undefined {
  const resolve = actionOf(parent, 'resolve_conflict');
  const choice = resolve?.choices.find((entry) => entry.valueId === childValueId);
  return resolve === undefined || choice === undefined ? undefined : { action: resolve, candidateId: choice.candidateId };
}

/** Whether any display on screen is still waiting for analysis: 2.8's pending badge, "Reading documents…" (US-REVIEW-09 AC1). */
export function anyReading(nodes: readonly FactNode[]): boolean {
  return allNodes(nodes).some((node) => node.display.missing === 'reading_documents' || node.display.badge?.id === 'reading_documents');
}

/** The value id of a document's file name, from the value id of its status line (`document:<id>.coverage` → `document:<id>.fileName`). */
export function fileNameIdOf(statusValueId: string): string | undefined {
  const match = /^(document:[^.]+)\.coverage$/u.exec(statusValueId);
  return match?.[1] === undefined ? undefined : `${match[1]}.fileName`;
}
