/**
 * Late findings (F-QUESTION-09; guardrails rule 7, "Late findings never interrupt"; G7-4; PRD
 * R-004; docs/adr/0039-wizard-navigation-saving-and-late-findings.md): results that arrive after
 * the owner left a step add a dot to that step and one quiet notice, never a dialog, a move or a
 * changed answer.
 */
import { compareTimes } from '@sovitech/domain';
import type { QuestionDefinition } from '@sovitech/registry/validation';
import type { StepNumber } from '../browser/contract';
import { eligibleCandidates, PRODUCTION_QUESTIONS, type IntakeField } from './model';

/** A finding: a new eligible candidate that is not the owner's own, or a conflict, on a field of a step. */
export interface Finding {
  readonly id: string;
  readonly step: StepNumber;
  readonly arrivedAt: string;
}

/** The sources a finding comes from: never the owner's own answer (late-findings.ts). */
const FOUND_SOURCES: ReadonlySet<string> = new Set(['document', 'ai_inference', 'calculated', 'estimated', 'reference']);

/**
 * The step a field's finding is dotted on (ADR 0039 decision 3): the building's facts (its
 * quantities and counts) on step 3, where they are shown; any other field on the step of the
 * registry question that asks it (the scope on step 4, building type, occupancy and schedule on
 * step 5, goals on 6, automation areas on 7). Step 2 gets no dot (its list updates when visited),
 * and a field no step shows none.
 */
export function findingStepOf(field: IntakeField, questions: readonly QuestionDefinition[] = PRODUCTION_QUESTIONS): StepNumber | null {
  const definition = field.field;
  if (definition.subject === 'building' && (definition.kind === 'quantity' || definition.kind === 'count')) return 3;
  const question = questions.find((entry) => entry.kind === 'question' && entry.fieldKeys.includes(definition.key));
  const step = question?.step;
  if (step === undefined || step < 1 || step > 8 || step === 2) return null;
  return step as StepNumber;
}

/**
 * The findings of the project's fields, from stored state: each eligible candidate that is not the
 * owner's own (its arrival its `createdAt`), and each open conflict (its arrival the newest of its
 * candidates that is not the owner's own, rule 4: a conflict is put to someone when values arrive).
 */
export function findingsOf(fields: readonly IntakeField[], questions: readonly QuestionDefinition[] = PRODUCTION_QUESTIONS): Finding[] {
  const findings: Finding[] = [];
  for (const field of fields) {
    const step = findingStepOf(field, questions);
    if (step === null) continue;
    for (const candidate of eligibleCandidates(field)) {
      if (FOUND_SOURCES.has(candidate.source)) findings.push({ id: `candidate:${candidate.id}`, step, arrivedAt: candidate.createdAt });
    }
    for (const conflict of field.state.conflicts) {
      const arrivals = conflict.candidateIds
        .map((id) => field.candidates.find((candidate) => candidate.id === id))
        .flatMap((candidate) => (candidate !== undefined && FOUND_SOURCES.has(candidate.source) ? [candidate.createdAt] : []))
        .sort((a, b) => compareTimes(a, b) ?? a.localeCompare(b));
      const newest = arrivals.at(-1);
      if (newest !== undefined) findings.push({ id: `conflict:${field.subjectId}:${field.field.key}:${conflict.candidateIds.join(',')}`, step, arrivedAt: newest });
    }
  }
  return findings;
}

/** Whether `later` is strictly after `earlier`; a time that does not parse is never after anything. */
function after(later: string, earlier: string): boolean {
  const order = compareTimes(later, earlier);
  return order !== null && order > 0;
}

/**
 * The late-findings answer (late-findings.ts): the left steps with a finding after the owner left
 * them (dots), and how many arrived since the previous poll on left steps (the one quiet notice's
 * count; 0 means no notice). Never a dialog, never a move, never a changed answer (G7-4). The step
 * on screen and step 2 never get a dot; on the first poll (`since` undefined) there is no notice.
 */
export function lateFindings(input: {
  readonly left: ReadonlyMap<StepNumber, string>;
  readonly current: StepNumber;
  readonly since: string | undefined;
  readonly findings: readonly Finding[];
}): { readonly dots: readonly StepNumber[]; readonly noticeCount: number } {
  const late = input.findings.filter((finding) => {
    if (finding.step === input.current || finding.step === 2) return false;
    const leftAt = input.left.get(finding.step);
    return leftAt !== undefined && after(finding.arrivedAt, leftAt);
  });
  const dots = [...new Set(late.map((finding) => finding.step))].sort((a, b) => a - b);
  const since = input.since;
  const noticeCount = since === undefined ? 0 : new Set(late.filter((finding) => after(finding.arrivedAt, since)).map((finding) => finding.id)).size;
  return { dots, noticeCount };
}
