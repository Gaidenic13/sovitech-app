/**
 * Evaluates an eval case's assertions on one sample's validated output (guardrails
 * section 7: "assertions on the structured output"). Pure: the same function reads a
 * live sample in the runner and a hand-built output in a unit test (which carries no
 * model id and never becomes a record).
 *
 * Assertions read what the production validator accepted, except `noCandidate`, which
 * reads everything the model produced ("No candidate is produced"), refused or not.
 */
import type { AiCandidate, AiNote, DraftingOutput, ExtractionOutput } from '../schema';
import type { DraftingValidation, ExtractionValidation } from '../validator';
import { foldKeepingIndices } from '../validator/text';
import type { Assertion } from './case';

/** What one sample produced, after the validator. */
export type SampleOutput =
  | { readonly task: 'extract'; readonly validation: ExtractionValidation }
  | { readonly task: 'draft'; readonly validation: DraftingValidation };

const CONFIDENCE_RANK = { low: 1, medium: 2, high: 3 } as const;

function comparable(text: string): string {
  return foldKeepingIndices(text).replace(/\s+/g, ' ').trim();
}

function subjectMatches(expected: { kind: string; ref?: string | null | undefined } | undefined, actual: AiCandidate['subject'] | null): boolean {
  if (expected === undefined) return true;
  if (actual === null || actual.kind !== expected.kind) return false;
  return expected.ref === undefined || (expected.ref ?? '').trim() === (actual.ref ?? '').trim();
}

type CandidateMatch = Extract<Assertion, { candidate: unknown }>['candidate'];

function candidateMatches(match: CandidateMatch, candidate: AiCandidate): boolean {
  if (candidate.fieldKey !== match.fieldKey || !subjectMatches(match.subject, candidate.subject)) return false;
  if (match.source !== undefined && candidate.source !== match.source) return false;
  if (match.inference !== undefined && candidate.inference !== match.inference) return false;
  if (match.confidence !== undefined && candidate.confidence !== match.confidence) return false;
  if (match.confidenceAtMost !== undefined && (candidate.confidence === null || CONFIDENCE_RANK[candidate.confidence] > CONFIDENCE_RANK[match.confidenceAtMost])) return false;
  const value = candidate.value;
  if (match.choice !== undefined && (value.kind !== 'choice' || value.choice !== match.choice)) return false;
  if (match.text !== undefined && (value.kind !== 'text' || value.text.trim() !== match.text.trim())) return false;
  if (match.textIncludes !== undefined && (value.kind !== 'text' || !comparable(value.text).includes(comparable(match.textIncludes)))) return false;
  if (match.quantity !== undefined || match.alternatives !== undefined || match.readings !== undefined) {
    if (value.kind !== 'quantity') return false;
    const expected = match.quantity;
    if (expected?.value !== undefined && value.quantity.value !== expected.value) return false;
    if (expected?.unit !== undefined && value.quantity.unit !== expected.unit) return false;
    if (expected?.qualifier !== undefined && value.quantity.qualifier !== expected.qualifier) return false;
    if (expected?.approximate !== undefined && value.quantity.approximate !== expected.approximate) return false;
    if (match.alternatives !== undefined && value.alternatives.length !== match.alternatives) return false;
    if (match.readings !== undefined) {
      const actual = [value.quantity.value, ...value.alternatives.map((alternative) => alternative.value)].sort((left, right) => left - right);
      const wanted = [...match.readings].sort((left, right) => left - right);
      if (actual.length !== wanted.length || actual.some((reading, index) => reading !== wanted[index])) return false;
    }
  }
  if (match.evidenceIncludes !== undefined) {
    const needle = comparable(match.evidenceIncludes);
    if (!candidate.evidence.some((entry) => comparable(entry.excerpt).includes(needle))) return false;
  }
  return true;
}

function notesOf(output: SampleOutput): readonly AiNote[] {
  return output.validation.accepted.notes;
}

/** Every text the AI wrote, as accepted: paragraphs (or one slot's), notes and suggestions. */
function writtenTexts(output: SampleOutput, slot: string | undefined): string[] {
  const paragraphs: readonly DraftingOutput['paragraphs'][number][] = output.task === 'draft' ? output.validation.accepted.paragraphs : [];
  if (slot !== undefined) return paragraphs.filter((paragraph) => paragraph.slot === slot).map((paragraph) => paragraph.text);
  return [
    ...paragraphs.map((paragraph) => paragraph.text),
    ...notesOf(output).flatMap((note) => (note.wouldChange === null ? [note.text] : [note.text, note.wouldChange])),
  ];
}

/** Every text in the raw output, refused or not, for the question check. */
function allRawTexts(output: SampleOutput): string[] {
  const raw = output.validation.output;
  if (raw === undefined) return [];
  const notes = raw.notes.flatMap((note) => (note.wouldChange === null ? [note.text] : [note.text, note.wouldChange]));
  if (output.task === 'draft') return [...(raw as DraftingOutput).paragraphs.map((paragraph) => paragraph.text), ...notes];
  const candidateTexts = (raw as ExtractionOutput).candidates.flatMap((candidate) => (candidate.value.kind === 'text' && candidate.source === 'ai_inference' ? [candidate.value.text] : []));
  return [...notes, ...candidateTexts];
}

/** Why one assertion fails on a sample; undefined when it holds. A code and ids only. */
export function assertionFailure(assertion: Assertion, output: SampleOutput): string | undefined {
  if ('candidate' in assertion) {
    if (output.task !== 'extract') return 'candidate: not an extraction';
    const matching = output.validation.accepted.candidates.filter((candidate) => candidateMatches(assertion.candidate, candidate)).length;
    if (assertion.candidate.count === undefined ? matching === 0 : matching !== assertion.candidate.count) {
      return `candidate ${assertion.candidate.fieldKey}: ${matching} matching`;
    }
    return undefined;
  }
  if ('noCandidate' in assertion) {
    if (output.task !== 'extract') return 'noCandidate: not an extraction';
    const produced = (output.validation.output?.candidates ?? []).some(
      (candidate) => candidate.fieldKey === assertion.noCandidate.fieldKey && subjectMatches(assertion.noCandidate.subject, candidate.subject),
    );
    return produced ? `noCandidate ${assertion.noCandidate.fieldKey}: produced` : undefined;
  }
  if ('candidateCount' in assertion) {
    if (output.task !== 'extract') return 'candidateCount: not an extraction';
    const count = output.validation.accepted.candidates.filter((candidate) => candidate.fieldKey === assertion.candidateCount.fieldKey).length;
    return count === assertion.candidateCount.equals ? undefined : `candidateCount ${assertion.candidateCount.fieldKey}: ${count}`;
  }
  if ('notFound' in assertion) {
    if (output.task !== 'extract') return 'notFound: not an extraction';
    const { fieldKey, subject } = assertion.notFound;
    const answered = output.validation.accepted.notFound.some(
      (answer) => answer.fieldKey === fieldKey && answer.searched.length > 0 && (subject === undefined || subjectMatches(subject, answer.subject)),
    );
    const valued = output.validation.accepted.candidates.some((candidate) => candidate.fieldKey === fieldKey && subjectMatches(subject, candidate.subject));
    if (!answered) return `notFound ${fieldKey}: no not-found answer with what was searched`;
    return valued ? `notFound ${fieldKey}: a candidate was also produced` : undefined;
  }
  if ('missingFieldKey' in assertion) {
    if (output.task !== 'extract') return 'missingFieldKey: not an extraction';
    return output.validation.accepted.missingFieldKeys.includes(assertion.missingFieldKey) ? undefined : `missingFieldKey ${assertion.missingFieldKey}: absent`;
  }
  if ('finding' in assertion) {
    if (output.task !== 'extract') return 'finding: not an extraction';
    const count = output.validation.accepted.findings.filter((finding) => finding.kind === assertion.finding.kind).length;
    if (assertion.finding.count === undefined ? count === 0 : count !== assertion.finding.count) return `finding ${assertion.finding.kind}: ${count}`;
    return undefined;
  }
  if ('noFinding' in assertion) {
    if (output.task !== 'extract') return 'noFinding: not an extraction';
    const count = output.validation.accepted.findings.filter((finding) => finding.kind === assertion.noFinding.kind).length;
    return count === 0 ? undefined : `noFinding ${assertion.noFinding.kind}: ${count}`;
  }
  if ('noQuestionText' in assertion) {
    return allRawTexts(output).some((text) => /[?¿;？]/u.test(text)) ? 'noQuestionText: a question was written' : undefined;
  }
  if ('paragraph' in assertion) {
    if (output.task !== 'draft') return 'paragraph: not a drafting output';
    return output.validation.accepted.paragraphs.some((paragraph) => paragraph.slot === assertion.paragraph.slot) ? undefined : `paragraph ${assertion.paragraph.slot}: absent`;
  }
  const texts = writtenTexts(output, assertion.text.slot);
  const joined = texts.join('\n');
  for (const pattern of assertion.text.includesAll ?? []) {
    if (!new RegExp(pattern, 'iu').test(joined)) return `text: does not match /${pattern}/`;
  }
  for (const pattern of assertion.text.excludesAll ?? []) {
    if (new RegExp(pattern, 'iu').test(joined)) return `text: matches /${pattern}/`;
  }
  return undefined;
}

/** Every failure of a sample: refusals by the validator (unless the case allows them), then each assertion that fails. */
export function sampleFailures(assertions: readonly Assertion[], output: SampleOutput, allowRejections: boolean): string[] {
  const failures: string[] = [];
  if (output.validation.output === undefined) failures.push('output: failed the schema');
  if (!allowRejections) {
    for (const rejection of output.validation.rejections) failures.push(`refused ${rejection.item.kind}: ${rejection.rules.join('+')}`);
  }
  for (const assertion of assertions) {
    const failure = assertionFailure(assertion, output);
    if (failure !== undefined) failures.push(failure);
  }
  return failures;
}
