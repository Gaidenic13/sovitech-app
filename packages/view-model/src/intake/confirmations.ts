/**
 * Rule 5's confirmation test and budget (F-QUESTION-02; PRD R-002, R-045; US-REVIEW-05): "A
 * confirmation is a question too. It is shown only when all three of these hold", and "Steps 3 to 7
 * together show at most N owner confirmations ... ordered by impactRank. Anything beyond the budget
 * stays labelled and goes to the engineer queue. Going over the budget is logged as a defect."
 */
import type { Candidate } from '@sovitech/domain';
import type { StepNumber } from '../browser/contract';
import { derivedOf, eligibleCandidates, type IntakeField } from './model';

/** Outputs that rule 5 names ("its `affects` includes system scope or CAPEX"): the registry's CAPEX outputs and any scope output. */
function reachesScopeOrCapex(output: string): boolean {
  return output.startsWith('capex.') || output.startsWith('scope.');
}

/** Whether a candidate is already checked by the right person: a confirmation of it asks nothing new. */
function checked(field: IntakeField, candidate: Candidate): boolean {
  const verification = derivedOf(field, candidate.id)?.verification;
  return verification === 'engineer_verified' || (verification === 'user_confirmed' && candidate.source !== 'user');
}

/**
 * The value a confirmation would name, if one is uncertain (rule 5, test 3): an AI inference not yet
 * confirmed or verified; an ambiguous reading (rule 8); a value whose area basis or count qualifier
 * is unknown, including the owner's own unqualified value that matches exactly one reading (rule 4,
 * G4-11). A fact in conflict is put to its person by rule 4's routing, never through a
 * confirmation. Undefined when nothing is uncertain.
 */
export function confirmationCandidateOf(field: IntakeField): Candidate | undefined {
  const { state } = field;
  const byId = new Map(eligibleCandidates(field).map((candidate) => [candidate.id, candidate]));
  for (const reading of state.readingsToConfirm) {
    const candidate = byId.get(reading.candidateId);
    if (candidate !== undefined && derivedOf(field, candidate.id)?.verification !== 'engineer_verified') return candidate;
  }
  for (const fact of state.facts) {
    if (fact.state !== 'known') continue;
    const shownId = fact.activeCandidateId ?? (fact.ambiguous ? fact.candidateIds[0] : undefined);
    const candidate = shownId === undefined ? undefined : byId.get(shownId);
    if (candidate === undefined || checked(field, candidate)) continue;
    if (candidate.source === 'ai_inference') return candidate;
    if (fact.ambiguous) return candidate;
    const unknownQualifier = fact.qualifier === null && field.field.qualifierRequired === true && candidate.quantity !== undefined;
    if (unknownQualifier && !(candidate.source === 'user' && candidate.authorRole === 'owner')) return candidate;
  }
  return undefined;
}

/**
 * Rule 5's confirmation test (F-QUESTION-02): all three of (1) the owner is the right person
 * (`confirmBy` owner or either), (2) the value matters now (first-estimate, in conflict, or its
 * `affects` reach system scope or CAPEX), (3) it is uncertain (an AI inference, an ambiguous
 * reading, or an unknown area basis or count qualifier). Proves G5-2 (a document value with its
 * qualifier stated: false).
 */
export function passesConfirmationTest(field: IntakeField): boolean {
  const definition = field.field;
  if (definition.confirmBy !== 'owner' && definition.confirmBy !== 'either') return false;
  const { state } = field.state;
  if (state !== 'known' && state !== 'conflict') return false;
  const mattersNow = definition.criticality === 'first_estimate' || state === 'conflict' || definition.affects.some((entry) => reachesScopeOrCapex(entry.output));
  if (!mattersNow) return false;
  return confirmationCandidateOf(field) !== undefined;
}

/** A confirmation that passes the test, with the impactRank that orders it. */
export interface ConfirmationCandidate {
  readonly fieldKey: string;
  readonly candidateId: string;
  readonly impactRank: number;
  readonly step: StepNumber;
}

/** Steps 3 to 7: the steps whose confirmations share rule 5's budget. */
export const BUDGET_STEPS: readonly StepNumber[] = [3, 4, 5, 6, 7];

/**
 * The confirmations that pass the test on steps 3 to 7, each with its step (`stepOf`: the step the
 * field is shown on, null for a field shown on no step of the budget). Unordered: selectConfirmations
 * orders them.
 */
export function confirmationCandidates(fields: readonly IntakeField[], stepOf: (field: IntakeField) => StepNumber | null): ConfirmationCandidate[] {
  const found: ConfirmationCandidate[] = [];
  for (const field of fields) {
    const step = stepOf(field);
    if (step === null || !BUDGET_STEPS.includes(step) || !passesConfirmationTest(field)) continue;
    const candidate = confirmationCandidateOf(field);
    if (candidate === undefined) continue;
    found.push({ fieldKey: field.field.key, candidateId: candidate.id, impactRank: field.field.impactRank, step });
  }
  return found;
}

/**
 * The budget of steps 3 to 7 together (rule 5; the registry's `settings.confirmationBudget`,
 * proposed 7, D-53): the first `budget` by impactRank are shown; the rest stay labelled and go to
 * the engineer queue, and going over is a defect the API logs as `confirmation_budget_exceeded`
 * (section 8). Ties keep a fixed order (field key, then candidate id), so a screen shows the same
 * confirmations on every read. Proves G5-3.
 */
export function selectConfirmations(
  candidates: readonly ConfirmationCandidate[],
  budget: number,
): { readonly shown: readonly ConfirmationCandidate[]; readonly overflow: readonly ConfirmationCandidate[]; readonly defect: boolean } {
  if (!Number.isInteger(budget) || budget < 0) throw new RangeError('intake: the confirmation budget is a whole number of zero or more');
  const ordered = [...candidates].sort(
    (a, b) => a.impactRank - b.impactRank || a.fieldKey.localeCompare(b.fieldKey) || a.candidateId.localeCompare(b.candidateId),
  );
  const shown = ordered.slice(0, budget);
  const overflow = ordered.slice(budget);
  return { shown, overflow, defect: overflow.length > 0 };
}
