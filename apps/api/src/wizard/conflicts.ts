/**
 * Section 8's `conflict_raised` (guardrails section 8: "The app logs every enforcement as an event: ... `conflict_raised`";
 * rule 4, "Documents that disagree" and "Routing"; section 4's item 6, "Disagreement becomes a conflict (rule 4)"; PRD
 * R-142, US-ADMIN-20 AC1; G4-48; phase 7 part B, the adversarial review's finding A-1).
 *
 * A conflict is derived, never stored (2.4: the field state `conflict` comes from the one derive function), so the event
 * is logged where the app derives one:
 * - on the one ingestion path, right after it stores a document's values: the fields it touched are derived again in the
 *   same request (`logConflictsOfTouchedFields`), so a conflict two documents open is logged when it is stored;
 * - on every read of the project's state by the wizard and the workspace (`logRaisedConflicts` over the state), for a
 *   conflict that reached the store another way (an owner's entry, a document event, a value written outside the
 *   ingestion path).
 * Once per conflict: a field already logged is not logged again until a person resolves its conflict (a
 * `conflict_resolved` field event after the field's last `conflict_raised`); a conflict that opens again after that is a
 * new one and is logged again. Under the project's write lock, before the logged events are read, so two requests that
 * derive the same conflict log it once. The reason names whose queue the conflict is in (`routed_to_owner`,
 * `routed_to_engineer`; rule 4 "Routing"): a code, never a value or a text (rule 13). Logging never changes what is
 * served and never blocks anyone (rule 7).
 *
 * Read as logged (the build log, phase 7 part B): a conflict that ends with no resolution (its document deleted or
 * declared superseded, a value withdrawn) and opens again on the same field later is counted once.
 */
import { appendGuardrailEvent, lockProjectWrites, readGuardrailEvents, readProjectFieldInputs, type Request } from '@sovitech/db';
import type { FieldDefinition, FieldEvent, FieldState } from '@sovitech/domain';
import type { ProjectState } from './project-state';
import { PRODUCTION_API_REGISTRY, deriveField, type ApiRegistry } from './registry';

/** A field as derived: its subject, its key, its derived state and its own field events (the resolutions' times). */
export interface DerivedFieldForConflicts {
  readonly subjectId: string;
  readonly fieldKey: string;
  readonly state: FieldState;
  readonly fieldEvents: readonly FieldEvent[];
}

/** A conflict to log: the field and whose queue it is in. */
export interface RaisedConflict {
  readonly subjectId: string;
  readonly fieldKey: string;
  readonly routedTo: 'owner' | 'engineer';
}

/** A `conflict_raised` event as stored. */
export interface LoggedConflict {
  readonly subjectId: string | null;
  readonly fieldKey: string | null;
  readonly at: string;
}

const keyOf = (subjectId: string | null, fieldKey: string | null): string => `${subjectId ?? ''}\u0000${fieldKey ?? ''}`;

/**
 * The open conflicts among these derived fields that are not logged yet: a field in conflict with no `conflict_raised`
 * of its own, or whose last one is older than the field's last `conflict_resolved` event (a new conflict). Each field
 * once. Pure: the times are the store's ISO 8601 text in UTC with microseconds, so they compare as text.
 */
export function conflictsToLog(fields: Iterable<DerivedFieldForConflicts>, logged: readonly LoggedConflict[]): RaisedConflict[] {
  const lastLogged = new Map<string, string>();
  for (const event of logged) {
    const key = keyOf(event.subjectId, event.fieldKey);
    const before = lastLogged.get(key);
    if (before === undefined || event.at > before) lastLogged.set(key, event.at);
  }
  const found = new Map<string, RaisedConflict>();
  for (const field of fields) {
    const conflict = field.state.conflict;
    if (conflict === null) continue;
    const key = keyOf(field.subjectId, field.fieldKey);
    if (found.has(key)) continue;
    const last = lastLogged.get(key);
    const resolvedAt = field.fieldEvents.filter((event) => event.type === 'conflict_resolved').reduce<string | undefined>((latest, event) => (latest === undefined || event.at > latest ? event.at : latest), undefined);
    if (last !== undefined && (resolvedAt === undefined || last > resolvedAt)) continue;
    found.set(key, { subjectId: field.subjectId, fieldKey: field.fieldKey, routedTo: conflict.routedTo });
  }
  return [...found.values()];
}

/**
 * Logs `conflict_raised` for each open conflict among these derived fields that is not logged yet (see
 * `conflictsToLog`), in the request, under the project's write lock taken before the logged events are read. Returns
 * what it logged.
 */
export async function logRaisedConflicts(request: Request, fields: readonly DerivedFieldForConflicts[], actor: string): Promise<RaisedConflict[]> {
  if (!fields.some((field) => field.state.conflict !== null)) return [];
  // Once per conflict however many requests derive it together: the project's write lock before the events are read.
  await lockProjectWrites(request);
  const logged = (await readGuardrailEvents(request, 'conflict_raised')).map((event) => ({ subjectId: event.subjectId, fieldKey: event.fieldKey, at: event.at }));
  const toLog = conflictsToLog(fields, logged);
  for (const conflict of toLog) {
    await appendGuardrailEvent(request, { type: 'conflict_raised', subjectId: conflict.subjectId, fieldKey: conflict.fieldKey, reason: `routed_to_${conflict.routedTo}`, actor });
  }
  return toLog;
}

/** Every derived field of a project state: the project's and the building's, and the registered fields of its other subjects. */
export function stateFieldsForConflicts(state: Pick<ProjectState, 'fields' | 'subjectFields'>): DerivedFieldForConflicts[] {
  return [...state.fields.values(), ...state.subjectFields.values()].map((field) => ({ subjectId: field.subjectId, fieldKey: field.field.key, state: field.state, fieldEvents: field.fieldEvents }));
}

/** Logs the open conflicts of a project state read in the request (the wizard's and the workspace's reads). */
export function logStateConflicts(request: Request, state: Pick<ProjectState, 'fields' | 'subjectFields' | 'userId'>): Promise<RaisedConflict[]> {
  return logRaisedConflicts(request, stateFieldsForConflicts(state), state.userId);
}

/**
 * After the ingestion path stored values: the fields it touched, derived again in the same request from what the store
 * now holds (the one derive function, with the API registry's lookups), and their open conflicts logged.
 */
export async function logConflictsOfTouchedFields(
  request: Request,
  touched: readonly { readonly subjectId: string; readonly field: FieldDefinition }[],
  actor: string,
  registry: ApiRegistry = PRODUCTION_API_REGISTRY,
): Promise<RaisedConflict[]> {
  if (touched.length === 0) return [];
  const inputs = await readProjectFieldInputs(request, touched.map((entry) => entry.subjectId));
  const seen = new Set<string>();
  const fields: DerivedFieldForConflicts[] = [];
  for (const entry of touched) {
    const key = keyOf(entry.subjectId, entry.field.key);
    if (seen.has(key)) continue;
    seen.add(key);
    const fieldInputs = inputs.fieldInputs(entry.subjectId, entry.field.key);
    const state = deriveField(registry, entry.field, entry.subjectId, fieldInputs.candidates, fieldInputs.events, fieldInputs.documents);
    fields.push({ subjectId: entry.subjectId, fieldKey: entry.field.key, state, fieldEvents: fieldInputs.events.field });
  }
  return logRaisedConflicts(request, fields, actor);
}
