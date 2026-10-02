/**
 * The owner's answers and the other owner writes, appended through the one store path (guardrails 2.1,
 * 2.4, rules 3, 4, 5, 7 and 8; F-VALUE-05, F-VALUE-06; docs/adr/0036 decision 8): every answer is a new
 * `user` candidate in the owner's own request, never a change to one (the store has no update path); the
 * owner's own entry on a field whose `confirmBy` is owner or either gets `user_confirmed` when it is
 * created, and stays unverified on an engineer field (2.1). A correction of a value the screen showed
 * rejects the shown candidate in the owner's name (rule 4, "A correction is a resolution"; G4-5), never
 * one an engineer verified (G4-19), through the domain's planOwnerCorrection; a corrected inference logs
 * `owner_corrected_inference` (section 8). A skip is the owner's `skipped` field event and section 8's
 * `skipped` event.
 *
 * What an owner's value may be is the question engine's (`parseOwnerAnswer`: the registry's options,
 * the one rule 8 parser with the dimension check, `number_ambiguous` for an entry that reads two ways,
 * `qualifier_required`); the API adds step 1's own checks (the project types, ISO 3166-1 country codes,
 * the name and city lengths of the contract).
 */
import {
  appendCandidateEvent,
  appendFieldEvent,
  appendGuardrailEvent,
  insertCandidate,
  newId,
  type NewCandidate,
  type Request,
} from '@sovitech/db';
import { planOwnerCorrection, type Candidate, type CandidateEvent, type FieldEvent, type GuardrailEvent, type OwnerValue } from '@sovitech/domain';
import { FIELD } from '@sovitech/registry';
import type { RegistryFieldDefinition } from '@sovitech/registry/validation';
import { CITY_MAX, COUNTRY_CODES, PROJECT_NAME_MAX, PROJECT_TYPES, type AnswerValue } from '@sovitech/view-model/browser';
import { parseOwnerAnswer } from '@sovitech/view-model/server';
import { ApiRefusal } from '../errors';
import { shownCandidateIds } from './displays';
import type { WizardField } from './project-state';
import { fieldOf, type ApiRegistry } from './registry';

const COUNTRIES: ReadonlySet<string> = new Set(COUNTRY_CODES);
const TYPES: ReadonlySet<string> = new Set(PROJECT_TYPES);

/**
 * The owner's value for a field, as the question engine reads it (an IntakeRefusal, answered with its
 * code, otherwise), with step 1's checks: a project type among the four (`project_type_invalid`), an
 * ISO 3166-1 alpha-2 country code (`country_invalid`), and the contract's name and city lengths.
 */
export function ownerValueOf(field: RegistryFieldDefinition, value: AnswerValue): OwnerValue {
  if (field.key === FIELD.projectType && value.kind === 'choice' && !TYPES.has(value.choice)) throw new ApiRefusal(422, 'project_type_invalid');
  if (field.key === FIELD.country && value.kind === 'text') {
    const code = value.text.trim().toUpperCase();
    if (!COUNTRIES.has(code)) throw new ApiRefusal(422, 'country_invalid');
    return parseOwnerAnswer(field, { kind: 'text', text: code });
  }
  const parsed = parseOwnerAnswer(field, value);
  const limit = field.key === FIELD.projectName ? PROJECT_NAME_MAX : field.key === FIELD.city ? CITY_MAX : undefined;
  if (limit !== undefined && parsed.text !== undefined && parsed.text.length > limit) throw new ApiRefusal(422, 'answer_invalid');
  return parsed;
}

/** A candidate as the store takes it: the store sets its time and its author's role (2.4; ADR 0013). */
function toNew(candidate: Candidate): NewCandidate {
  const { createdAt: _createdAt, authorRole: _authorRole, ...rest } = candidate;
  void _createdAt;
  void _authorRole;
  return rest;
}

/** Appends a candidate the owner's request made; a refusal of the unit check is the owner's `unit_mismatch` (2.7). */
async function store(request: Request, registry: ApiRegistry, candidate: Candidate): Promise<void> {
  const field = fieldOf(registry, candidate.fieldKey);
  if (field === undefined) throw new Error(`no registry field ${candidate.fieldKey}`);
  const written = await insertCandidate(request, toNew(candidate), field);
  if (written.outcome === 'refused') throw new ApiRefusal(422, 'unit_mismatch');
  if (written.outcome === 'rejected') throw new ApiRefusal(422, 'answer_invalid');
}

/** A guardrail event's reason as the store takes it: a code (rule 13). */
function reasonCode(reason: string | undefined, fallback: string): string {
  return reason !== undefined && /^[a-z0-9][a-z0-9_.:-]{0,127}$/u.test(reason) ? reason : fallback;
}

/**
 * Appends what the engine planned, in the owner's own request: candidates first, then their events, the
 * field events and the section 8 events. The times the plan carries are the store's to set.
 */
export async function appendRecords(
  request: Request,
  registry: ApiRegistry,
  records: {
    readonly candidates?: readonly Candidate[];
    readonly candidateEvents?: readonly CandidateEvent[];
    readonly fieldEvents?: readonly FieldEvent[];
    readonly guardrailEvents?: readonly GuardrailEvent[];
  },
  userId: string,
  skipReason: string,
): Promise<void> {
  for (const candidate of records.candidates ?? []) await store(request, registry, candidate);
  for (const event of records.candidateEvents ?? []) {
    if (event.type === 'engineer_verified') throw new Error('an owner request never writes engineer_verified (rule 10)');
    await appendCandidateEvent(request, {
      candidateId: event.candidateId,
      type: event.type,
      by: userId,
      role: 'owner',
      ...(event.reason === undefined ? {} : { reason: event.reason }),
      ...(event.bulkId === undefined ? {} : { bulkId: event.bulkId }),
    });
  }
  for (const event of records.fieldEvents ?? []) {
    await appendFieldEvent(request, {
      subjectId: event.subjectId,
      fieldKey: event.fieldKey,
      type: event.type,
      by: userId,
      role: 'owner',
      ...(event.type === 'skipped' ? { reason: event.reason ?? skipReason } : event.reason === undefined ? {} : { reason: event.reason }),
      ...(event.chosenCandidateId === undefined ? {} : { chosenCandidateId: event.chosenCandidateId }),
      ...(event.coveredCandidateIds === undefined ? {} : { coveredCandidateIds: event.coveredCandidateIds }),
    });
  }
  for (const event of records.guardrailEvents ?? []) {
    await appendGuardrailEvent(request, {
      type: event.type,
      ...(event.subjectId === undefined ? {} : { subjectId: event.subjectId }),
      ...(event.fieldKey === undefined ? {} : { fieldKey: event.fieldKey }),
      reason: reasonCode(event.reason, event.type === 'skipped' ? skipReason : event.type),
      actor: userId,
    });
  }
}

/** Whether a candidate holds the same value as the owner's (a quantity: its value, unit, qualifier and approximate mark). */
function sameValue(candidate: Candidate, value: OwnerValue): boolean {
  if (value.quantity !== undefined) {
    return (
      candidate.quantity?.value === value.quantity.value &&
      candidate.quantity.unit === value.quantity.unit &&
      candidate.quantity.qualifier === value.quantity.qualifier &&
      (candidate.quantity.approximate === true) === (value.quantity.approximate === true)
    );
  }
  return candidate.choice === value.choice && candidate.text === value.text;
}

/**
 * Writes the owner's answer on one field (an inline Edit, a step 8 inline ask). `corrects`: the candidates
 * the screen showed as the field's value that the answer replaces. An answer equal to the owner's own
 * active value writes nothing (US-SCOPE-02 AC9: nothing new when unchanged). Otherwise the owner decides on
 * what they saw (rule 4, "A correction is a resolution"; G4-36), both ways, else 409 `shown_value_changed`
 * and nothing is stored: each candidate named must still be shown now, and each candidate shown now must be
 * named (an answer from a screen that showed no value, or another one, would otherwise add a second value
 * beside one the owner never saw, and put the owner in conflict with themself). Returns whether it wrote.
 */
export async function writeOwnerAnswer(
  request: Request,
  registry: ApiRegistry,
  input: { readonly projectId: string; readonly userId: string; readonly wizardField: WizardField; readonly value: OwnerValue; readonly corrects: readonly string[] },
): Promise<boolean> {
  const { wizardField, value, userId } = input;
  const field = wizardField.field;
  const active = wizardField.candidates.find((candidate) => candidate.id === wizardField.state.activeCandidateId);
  if (active !== undefined && active.source === 'user' && active.authorRole === 'owner' && sameValue(active, value)) return false;
  const shownNow = shownCandidateIds(wizardField);
  const shown = new Set(shownNow);
  const named = new Set(input.corrects);
  for (const id of named) if (!shown.has(id)) throw new ApiRefusal(409, 'shown_value_changed');
  for (const id of shownNow) if (!named.has(id)) throw new ApiRefusal(409, 'shown_value_changed');

  const candidateId = newId();
  const at = active?.createdAt ?? '1970-01-01T00:00:00.000000Z';
  const [first, ...others] = input.corrects.flatMap((id) => {
    const candidate = wizardField.candidates.find((entry) => entry.id === id);
    return candidate === undefined ? [] : [candidate];
  });
  if (first === undefined) {
    const candidate: Candidate = {
      id: candidateId,
      subjectId: wizardField.subjectId,
      fieldKey: field.key,
      ...(value.quantity === undefined ? {} : { quantity: value.quantity }),
      ...(value.choice === undefined ? {} : { choice: value.choice }),
      ...(value.text === undefined ? {} : { text: value.text }),
      // Rule 8: a typed quantity is stored with "the original text exactly as written" (G8-23).
      ...(value.original === undefined ? {} : { original: value.original }),
      source: 'user',
      evidence: [],
      createdBy: userId,
      authorRole: 'owner',
      createdAt: at,
    };
    // 2.1: the owner's own entry on an owner or either field is user_confirmed when it is created.
    const events: CandidateEvent[] = field.confirmBy === 'engineer' ? [] : [{ candidateId, type: 'user_confirmed', by: userId, role: 'owner', at }];
    await appendRecords(request, registry, { candidates: [candidate], candidateEvents: events }, userId, 'edit');
    return true;
  }
  // Rule 4, "A correction is a resolution": the domain plans the owner's candidate and the rejection (none of an engineer_verified value, G4-19).
  const plan = planOwnerCorrection({ projectId: input.projectId, field, state: wizardField.state, shown: first, value, candidateId, by: userId, at });
  const events = [...plan.candidateEvents];
  const guardrail = [...plan.guardrailEvents];
  for (const other of others) {
    const derived = wizardField.state.candidates.find((entry) => entry.candidateId === other.id);
    if (derived === undefined || derived.verification === 'engineer_verified') continue;
    events.push({ candidateId: other.id, type: 'rejected', by: userId, role: 'owner', at, reason: 'owner_correction' });
    if (other.source === 'ai_inference') {
      guardrail.push({ type: 'owner_corrected_inference', projectId: input.projectId, subjectId: other.subjectId, fieldKey: field.key, reason: `confidence:${derived.confidence ?? 'unstated'}` });
    }
  }
  // The owner's candidate carries a typed quantity's entry as written (rule 8; G8-23): planOwnerCorrection copies `value.original`.
  await appendRecords(request, registry, { candidates: [plan.candidate], candidateEvents: events, guardrailEvents: guardrail }, userId, 'edit');
  return true;
}

/**
 * A first answer on a field with no value yet (step 1's four answers on project creation): the owner's
 * `user` candidate and, on an owner or either field, its `user_confirmed` event (2.1).
 */
export async function writeFirstAnswer(
  request: Request,
  registry: ApiRegistry,
  input: { readonly userId: string; readonly subjectId: string; readonly field: RegistryFieldDefinition; readonly value: OwnerValue },
): Promise<string> {
  const candidateId = newId();
  const at = '1970-01-01T00:00:00.000000Z';
  const { value } = input;
  const candidate: Candidate = {
    id: candidateId,
    subjectId: input.subjectId,
    fieldKey: input.field.key,
    ...(value.quantity === undefined ? {} : { quantity: value.quantity }),
    ...(value.choice === undefined ? {} : { choice: value.choice }),
    ...(value.text === undefined ? {} : { text: value.text }),
    ...(value.original === undefined ? {} : { original: value.original }),
    source: 'user',
    evidence: [],
    createdBy: input.userId,
    authorRole: 'owner',
    createdAt: at,
  };
  const events: CandidateEvent[] = input.field.confirmBy === 'engineer' ? [] : [{ candidateId, type: 'user_confirmed', by: input.userId, role: 'owner', at }];
  await appendRecords(request, registry, { candidates: [candidate], candidateEvents: events }, input.userId, 'create');
  return candidateId;
}
