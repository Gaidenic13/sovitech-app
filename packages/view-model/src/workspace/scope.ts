/**
 * System Scope (DB-16; PRD R-051 to R-055, R-058; US-SCOPE-05 to US-SCOPE-08, US-SCOPE-10; docs/adr/0044): the only
 * scope editor after Generate. One row per system of the catalogue (the eight of step 4: R-055), each with the same
 * decision display as step 4's card and step 8's row (`project:<id>.scope.<system>`, G2-7), its Suggested
 * preselection only where the intake's one guard allows one (never a life-safety or never-preselected system: rule
 * 11; G11-10), its equipment by type and its points as "Not available yet" naming the missing datasets (2.5; R-053),
 * and the levels and zones its equipment's own stored values name (Unknown otherwise). No Controllers, Network or
 * Integrations, no canvas or view-mode control (R-054, R-058).
 *
 * The decisions (`planScopeDecisions`; R-052; 7.1.1-C8; rules 3, 4 and 7):
 * - a switch press is one decision: written as a new `user` candidate with `user_confirmed` (2.1) where it differs
 *   from the owner's stored decision; equal to it, nothing is written (7.1.1-C8); the earlier candidate stays, kept
 *   unchanged in the history (rule 4: "A new value is always added, never swapped in"; G4-40); the owner decides on
 *   what they saw, both ways, else `shown_value_changed` and nothing is stored (rule 4; G4-36, G4-38);
 * - "Save and Continue" reports the visible suggestions: each one the server also suggests now, on a field with no
 *   value and no decision in the same request, is the owner's answer (rule 3: "A suggestion left in place counts as
 *   the owner's answer"; G3-20); any other is ignored and counted;
 * - nothing is skipped from here (rule 7's skips are step 4's; no `skipped` event), and a life-safety system is
 *   included only by the owner's own switch (opt-in, rule 11), never by a suggestion.
 */
import { SYSTEMS, scopeFieldKey, type SystemOption } from '@sovitech/registry';
import { ScopeDecisionsRequestSchema, type ScopeDecisionsRequest, type SystemScopeResponse, type SystemScopeRow } from '../browser/contract';
import { IntakeRefusal, fieldRefKey, hasEligible, ownerAnswerOf, shownCandidateIdsOf, type ContinueWrites, type IntakeField, type Suggestion } from '../intake';
import { lineOf, valueIdOf } from '../resolver';
import type { Built, WorkspaceProject } from './inputs';
import { equipmentCountDisplay, pointsDisplay, systemLevelsDisplay, systemZonesDisplay } from './registers';
import { DisplaySet, ownDisplay, projectPath } from './shared';

/** The registry's scope question (step 4's): the one question System Scope answers. */
export const SCOPE_QUESTION_ID = 'q.project.systemsInScope';

/** Whether a system may carry a Suggested preselection (rule 11; section 5 step 4; D-64 on the safe side). */
function suggestible(system: SystemOption): boolean {
  return !system.lifeSafety && !system.neverPreselected;
}

/** The owner's stored decision on a system, as its choice (`include` or `exclude`), or undefined. */
export function storedDecision(project: WorkspaceProject, systemId: string): string | undefined {
  const field = project.field(project.projectId, scopeFieldKey(systemId));
  if (field === undefined || field.state.activeCandidateId === null) return undefined;
  const active = field.candidates.find((candidate) => candidate.id === field.state.activeCandidateId);
  return active?.source === 'user' && active.authorRole === 'owner' ? active.choice : undefined;
}

/** The visible suggestion on a system's decision, when the guard allows one now. */
function suggestionOf(project: WorkspaceProject, system: SystemOption): Suggestion | undefined {
  if (!suggestible(system)) return undefined;
  return project.suggestions.find((suggestion) => suggestion.fieldKey === scopeFieldKey(system.id) && suggestion.subjectId === project.projectId && suggestion.choice === 'include');
}

/** A system's equipment line (`project:<id>.register.<system>[.<level>]`), the same value id on System Scope and Topology (G2-7). */
export function systemEquipmentPath(systemId: string, level: string | undefined): string {
  return level === undefined ? systemId : `${systemId}.${level}`;
}

function row(project: WorkspaceProject, displays: DisplaySet, system: SystemOption, level: string | undefined): SystemScopeRow {
  const fieldKey = scopeFieldKey(system.id);
  const resolved = project.resolve(project.projectId, fieldKey);
  if (resolved !== undefined) displays.addAll(resolved);
  const decision = displays.add(ownDisplay(resolved, valueIdOf('project', project.projectId, fieldKey)));
  const suggestion = suggestionOf(project, system);
  return {
    systemId: system.id,
    lifeSafety: system.lifeSafety,
    neverPreselected: system.neverPreselected,
    decision,
    included: storedDecision(project, system.id) === 'include' || (storedDecision(project, system.id) === undefined && suggestion !== undefined),
    suggestion: suggestion === undefined || storedDecision(project, system.id) !== undefined ? null : { reason: lineOf(suggestion.reasonLineId, suggestion.reasonSlots) },
    equipment: displays.add(equipmentCountDisplay(project, systemEquipmentPath(system.id, level))),
    points: displays.add(pointsDisplay(project, projectPath(project, `points.${system.id}`))),
    levels: displays.add(systemLevelsDisplay(project, system.id)),
    zones: displays.add(systemZonesDisplay(project, system.id)),
  };
}

export function systemScopeView(project: WorkspaceProject, selection: { readonly level?: string } = {}): Built<SystemScopeResponse['view']> {
  const displays = new DisplaySet();
  const systems = SYSTEMS.map((system) => row(project, displays, system, selection.level));
  return { view: { questionId: SCOPE_QUESTION_ID, systems }, displayObjects: displays.list() };
}

/**
 * What a System Scope request writes, as the intake's Continue writes (answers and accepted suggestions; never a
 * skip), for `continueRecords` to turn into candidates and events. `fields` are the scope decision fields of the
 * project; `suggestions` those that stand now. Refuses with the intake's codes: `answer_invalid` for a field that is
 * not a system's scope decision on the project, `shown_value_changed` for a decision taken on a value the field no
 * longer shows (rule 4; G4-36).
 */
export function planScopeDecisions(input: {
  readonly projectId: string;
  readonly fields: readonly IntakeField[];
  readonly suggestions: readonly Suggestion[];
  readonly request: ScopeDecisionsRequest;
}): ContinueWrites {
  const parsed = ScopeDecisionsRequestSchema.safeParse(input.request);
  if (!parsed.success) throw new IntakeRefusal('answer_invalid', 'the System Scope request does not match the contract');
  const scopeKeys = new Map(SYSTEMS.map((system) => [scopeFieldKey(system.id), system]));
  const byRef = new Map(input.fields.map((field) => [fieldRefKey(field.subjectId, field.field.key), field]));
  const answers: ContinueWrites['answers'][number][] = [];
  const accepted: Suggestion[] = [];
  const decided = new Set<string>();
  const ignored = new Set<string>();

  for (const decision of parsed.data.decisions) {
    const key = fieldRefKey(decision.field.subjectId, decision.field.fieldKey);
    const field = byRef.get(key);
    if (field === undefined || decision.field.subjectId !== input.projectId || !scopeKeys.has(field.field.key)) {
      throw new IntakeRefusal('answer_invalid', `${decision.field.fieldKey} is not a system's scope decision on this project`);
    }
    if (decided.has(key)) throw new IntakeRefusal('answer_invalid', `${field.field.key} is decided twice in one request`);
    decided.add(key);
    if (ownerAnswerOf(field)?.choice === decision.choice) continue;
    // Rule 4, "A correction is a resolution": the owner decides on what they saw, both ways (G4-36, G4-38).
    const shown = shownCandidateIdsOf(field.state);
    const named = new Set(decision.corrects);
    if (shown.some((id) => !named.has(id)) || decision.corrects.some((id) => !shown.includes(id))) {
      throw new IntakeRefusal('shown_value_changed', `${field.field.key} shows another value than the decision names (rule 4)`);
    }
    // The earlier decision is kept as it was: the newer owner answer is the field's value (2.4: newest), as on step 4.
    answers.push({ fieldKey: field.field.key, subjectId: field.subjectId, choice: decision.choice, rejects: [] });
  }

  for (const visible of parsed.data.visibleSuggestions) {
    const key = fieldRefKey(visible.field.subjectId, visible.field.fieldKey);
    const field = byRef.get(key);
    const system = field === undefined ? undefined : scopeKeys.get(field.field.key);
    const match = input.suggestions.find((suggestion) => suggestion.subjectId === visible.field.subjectId && suggestion.fieldKey === visible.field.fieldKey && suggestion.choice === visible.choice);
    if (field === undefined || system === undefined || match === undefined || !suggestible(system) || hasEligible(field) || decided.has(key)) {
      ignored.add(`${key}\u0000${visible.choice}`);
      continue;
    }
    decided.add(key);
    accepted.push(match);
  }

  return { answers, acceptedSuggestions: accepted, skips: [], ignoredSuggestions: ignored.size };
}

