/**
 * The proposal snapshot and the inputs hash (guardrails 2.4 "Recalculation": "A generated proposal keeps a snapshot of
 * the candidate ids and formula versions it used"; PRD R-110; US-PROPOSAL-03 AC1; docs/adr/0048).
 *
 * `snapshotRecordOf` turns an engine run (and the documents still being read) into what the store keeps for one
 * generation (packages/db `recordProposalSnapshot`, extended by migration 0015): the candidate ids (every input the run
 * read and every candidate it produced), the formula versions whose body ran, one row per output (its formula and
 * version; the produced candidate's id, or the missing items as codes: `dataset:<id>`, `method:<formula id>`,
 * `unit:<gate>`, `input:<subject id>:<field key>:<reason>`; never text from a document, rule 13), the documents still
 * being read (rule 7: "Your estimate will update when they finish"), and the inputs hash.
 *
 * `inputsHashOf`: `sha256:<hex>` of the canonical JSON (keys sorted, arrays sorted) of: each field handed to the run
 * (its key, subject, derived state name and the ids of the candidates that decide it: the active one, or every one
 * still compared in a conflict, or the one candidate of an ambiguous reading), the formula refs, and the dataset
 * versions read. Two runs over the same state give the same hash; any change of an input's active candidate, state or
 * compared set gives another (US-PROPOSAL-10 AC1). `runEngine` hashes with every formula ref of its catalogue, so a
 * caller recomputing it passes the catalogue's refs and the run's datasets.
 *
 * `candidateHashOf`: `sha256:<hex>` of a candidate's own content (rule 10: a quotation record holds "a hash of every
 * input candidate"), the same for the same candidate wherever it is read.
 */
import { createHash } from 'node:crypto';
import type { Candidate } from '@sovitech/domain';
import type { EngineInput } from './inputs';
import { decidingCandidateIds } from './reading';
import type { EngineRun, FormulaRef, Missing } from './results';

/** One output's row of a snapshot. */
export interface SnapshotOutputRow {
  readonly output: string;
  readonly formula: FormulaRef;
  /** The produced candidate (a figure or an incomplete total), or null when the output was not available. */
  readonly candidateId: string | null;
  /** Missing items as codes (above); empty when a candidate was produced. */
  readonly missing: readonly string[];
  /** Whether the produced total was incomplete (rule 1, "Material exclusions"). */
  readonly incomplete: boolean;
  /**
   * Set by the reader, never stored: an input this output reads changed after generation ("Out of date,
   * recalculating"; staleness.ts `SnapshotChanges.outOfDateOn`), with the first dated change, or null when none is
   * dated. Absent or null: as generated. stage.ts never gives such a row "Formal quotation" (rule 10; phase 5 part B,
   * A-4).
   */
  readonly outOfDate?: { readonly changedOn: string | null } | null;
}

/** What the store keeps for one generation. */
export interface SnapshotRecord {
  readonly inputsHash: string;
  readonly candidateIds: readonly string[];
  readonly formulas: readonly { readonly formulaId: string; readonly formulaVersion: string }[];
  readonly outputs: readonly SnapshotOutputRow[];
  readonly pendingDocumentIds: readonly string[];
}

/** JSON with every object's keys in order, so equal content gives equal text. */
function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
}

const sha256 = (text: string): string => `sha256:${createHash('sha256').update(text, 'utf8').digest('hex')}`;

const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** The code a missing item is stored as (never text from a document; rule 13). */
export function missingCode(item: Missing): string {
  switch (item.kind) {
    case 'dataset':
      return `dataset:${item.datasetId}`;
    case 'method':
      return `method:${item.name}`;
    case 'unit':
      return `unit:${item.gate}`;
    case 'input':
      return `input:${item.subjectId}:${item.fieldKey}:${item.reason}`;
  }
}

/** `<id>@<version>` read back into its parts (the version is what follows the last `@`). */
function refParts(ref: FormulaRef): { readonly formulaId: string; readonly formulaVersion: string } {
  const at = ref.lastIndexOf('@');
  return { formulaId: ref.slice(0, at), formulaVersion: ref.slice(at + 1) };
}

/** The snapshot of a run. */
export function snapshotRecordOf(run: EngineRun, pendingDocumentIds: readonly string[]): SnapshotRecord {
  const produced = run.outputs.flatMap((output) => (output.kind === 'not_available' ? [] : [output.candidate.id]));
  const outputs: SnapshotOutputRow[] = run.outputs.map((output) =>
    output.kind === 'not_available'
      ? { output: output.output, formula: output.formula, candidateId: null, missing: output.missing.map(missingCode), incomplete: false }
      : { output: output.output, formula: output.formula, candidateId: output.candidate.id, missing: [], incomplete: output.kind === 'incomplete' },
  );
  return {
    inputsHash: run.inputsHash,
    candidateIds: [...new Set([...run.inputCandidateIds, ...produced])].sort(byText),
    formulas: [...new Set(run.formulasRun)].map(refParts),
    outputs,
    pendingDocumentIds: [...new Set(pendingDocumentIds)].sort(byText),
  };
}

/** The inputs hash of a state, as a run computes it (for a run, and for the staleness check of a stored snapshot). */
export function inputsHashOf(input: EngineInput, formulas: readonly FormulaRef[], datasets: readonly { readonly id: string; readonly version: string }[]): string {
  const fields = [...input.fields.values()]
    .map((field) => ({ key: field.definition.key, subject: field.subjectId, state: field.state.state, ids: decidingCandidateIds(field.state) }))
    .sort((a, b) => byText(`${a.subject}:${a.key}`, `${b.subject}:${b.key}`));
  return sha256(
    canonical({
      fields,
      formulas: [...new Set(formulas)].sort(byText),
      datasets: [...datasets].map((dataset) => `${dataset.id}@${dataset.version}`).sort(byText),
    }),
  );
}

/** The hash of a candidate's content (rule 10: a quotation record holds "a hash of every input candidate"). */
export function candidateHashOf(candidate: Candidate): string {
  return sha256(canonical(candidate));
}
