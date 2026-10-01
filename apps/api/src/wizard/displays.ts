/**
 * Display objects for the wizard's responses: every value, count and line a view names is resolved by
 * the one resolver of `@sovitech/view-model/server` (guardrails rule 2: "UI code receives only resolved
 * field objects, which carry the badge and the source line"; F-VALUE-10; docs/adr/0036) and collected
 * once per response, so one value id carries one display wherever a view names it (G2-7). The API only
 * reads the stored state the resolver needs and says which actions the owner has.
 */
import type { Action, DisplayObject, ValueId } from '@sovitech/view-model/browser';
import {
  DEFAULT_FORMAT_OPTIONS,
  confirmActionOf,
  editActionOf,
  lineOf,
  resolveDocument,
  resolveField,
  shownCandidateIdsOf,
  valueIdOf,
  type ResolvedDocument,
} from '@sovitech/view-model/server';
import type { Suggestion } from '@sovitech/view-model/server';
import { fieldIn, type ProjectState, type WizardField } from './project-state';
import { STEP_3_FACTS, questionOfField } from './registry';

export const FORMAT = DEFAULT_FORMAT_OPTIONS;

/** One response's display objects, one per value id. A second, different display for a value id is a defect (G2-7). */
export class Displays {
  private readonly byId = new Map<ValueId, DisplayObject>();

  add(display: DisplayObject): ValueId {
    const existing = this.byId.get(display.valueId);
    if (existing !== undefined && JSON.stringify(existing) !== JSON.stringify(display)) {
      throw new Error(`two displays for one value id in one response: ${display.valueId}`);
    }
    this.byId.set(display.valueId, display);
    return display.valueId;
  }

  addAll(displays: readonly DisplayObject[]): ValueId[] {
    return displays.map((display) => this.add(display));
  }

  has(valueId: ValueId): boolean {
    return this.byId.has(valueId);
  }

  list(): DisplayObject[] {
    return [...this.byId.values()];
  }
}

/**
 * Whether the owner was asked for a field (Not provided yet rather than Unknown; 2.8, "No value, never
 * asked or skipped"), from stored state only so the display is the same on every screen (G2-7): a
 * registered question asks for it, or the owner skipped it, or it is a step 3 fact of a project with no
 * document (PRD R-047 "Until decided": with no document uploaded, each fact reads "Not provided yet").
 */
export function askedOf(state: ProjectState, wizardField: WizardField): boolean {
  if (questionOfField(wizardField.field.key) !== undefined) return true;
  if (wizardField.intake.skippedAt.length > 0) return true;
  return STEP_3_FACTS.includes(wizardField.field.key) && state.activeDocuments.length === 0;
}

/** The eligible candidates a field's display shows as its value: the active one, each fact's, or those in conflict (the question engine's reading, G4-36). */
export function shownCandidateIds(wizardField: WizardField): string[] {
  return shownCandidateIdsOf(wizardField.state);
}

/**
 * The actions an owner has on a field's value, the same on every screen (G2-7): Edit always (rule 5,
 * "Every other value is shown with its badge, its source line and an Edit action"; section 5 step 3);
 * the confirmation while rule 5's test and budget show it; on an engineer field with a value read from
 * a document or inferred, "Looks right" and "Something's wrong" (rule 3) until the owner has answered.
 * Never an owner confirmation on an engineer field (rule 3), and never "Confirm all" (§5-3b).
 */
export function actionsFor(wizardField: WizardField, confirmation: string | undefined): Action[] {
  const shown = shownCandidateIds(wizardField);
  const actions: Action[] = [editActionOf(wizardField.field, wizardField.subjectId, shown)];
  const confirmed = confirmation === undefined ? undefined : wizardField.candidates.find((candidate) => candidate.id === confirmation);
  if (confirmed !== undefined) actions.push(confirmActionOf(wizardField.field, confirmed));
  if (wizardField.field.confirmBy === 'engineer') {
    const found = shown.filter((id) => {
      const candidate = wizardField.candidates.find((entry) => entry.id === id);
      return candidate !== undefined && (candidate.source === 'document' || candidate.source === 'ai_inference');
    });
    // Answered: acknowledged or checked, or the owner's "Something's wrong" (a rejection with no value of their own, which
    // derive keeps out of the state and lists for the engineer: G3-10).
    const answered = new Set([
      ...wizardField.state.candidates.filter((derived) => derived.verification !== 'unverified').map((derived) => derived.candidateId),
      ...wizardField.state.refusedEvents.flatMap((entry) =>
        entry.kind === 'candidate' && entry.event.type === 'rejected' && entry.event.role === 'owner' ? [entry.event.candidateId] : [],
      ),
    ]);
    const open = found.filter((id) => !answered.has(id));
    if (open.length > 0) {
      actions.push({ kind: 'acknowledge', candidateIds: open });
      for (const id of open) actions.push({ kind: 'concern', candidateId: id });
    }
  }
  return actions;
}

/** A field's display objects (the field's own first, then one per fact or value in conflict), resolved with its actions. */
export function resolveWizardField(
  state: ProjectState,
  fieldKey: string,
  confirmation: string | undefined,
  suggestions: readonly Suggestion[] = [],
): readonly DisplayObject[] {
  const wizardField = fieldIn(state, fieldKey);
  const suggestion = suggestions.find((entry) => entry.fieldKey === fieldKey && entry.subjectId === wizardField.subjectId);
  return resolveField({
    field: wizardField.field,
    subject: { id: wizardField.subjectId, kind: wizardField.subjectKind },
    state: wizardField.state,
    candidates: wizardField.candidates,
    candidateEvents: wizardField.candidateEvents,
    document: (documentId) => state.documents.find((document) => document.id === documentId),
    fileName: (documentId) => state.fileName(documentId),
    projectType: state.projectType,
    asked: askedOf(state, wizardField),
    searchedCoverage: state.searchedCoverage(fieldKey),
    actions: actionsFor(wizardField, confirmation),
    format: FORMAT,
    ...(suggestion === undefined ? {} : { suggestion: { choice: suggestion.choice, reason: lineOf(suggestion.reasonLineId, suggestion.reasonSlots) } }),
  });
}

/** The value id of a field's own display (the first of resolveWizardField's). */
export function fieldValueId(state: ProjectState, fieldKey: string): ValueId {
  const wizardField = fieldIn(state, fieldKey);
  return valueIdOf(wizardField.subjectKind, wizardField.subjectId, fieldKey);
}

/** A document's row displays (step 2), resolved. */
export function documentDisplays(state: ProjectState, documentId: string): ResolvedDocument {
  const document = state.documents.find((entry) => entry.id === documentId);
  if (document === undefined) throw new Error(`no document ${documentId}`);
  return resolveDocument({ document, fileName: state.fileName(documentId) ?? null, format: FORMAT });
}
