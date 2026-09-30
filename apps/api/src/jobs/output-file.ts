/**
 * A job's output file, read and checked whole before anything of it is stored (ADR 0022,
 * ADR 0034; ../ingestion/extraction.ts stores what this returns).
 *
 * The first line is the extraction output: parsed within its bound (./read-output.ts), then by
 * the contract's strict parser, and checked to answer the request (`checkedOutput`). When the
 * request asked for IFC values of a model, the lines after it are the contract's per-line form
 * of the sealed IFC section: they are handed one at a time, as the file is read, to the
 * contract's `readIfcValuesStream`, which takes none of them while `ifc-values` reads closed or
 * while the request asked for no IFC values, checks each as it comes, and returns the output with
 * the section sealed. No text of the whole section is built, and the section is opened only by
 * the gated value path, through its gate (../ingestion/ifc-values.ts).
 *
 * Any failure refuses the whole output with a code: a line too long, cut short or not JSON
 * (the reader's codes), a line the contract refuses, fewer or more lines than announced, or a
 * section where none was asked for. Nothing from a refused output is stored. Codes and contract
 * problems (paths and codes) only: never a value (rule 13).
 */
import {
  ifcValuesStreamExpected,
  readIfcValuesStream,
  type ContractProblem,
  type ExtractionOutputView,
  type ExtractionRequest,
  type IfcValuesStreamResult,
} from '@sovitech/extraction-contract';
import type { GateSource } from '@sovitech/registry/gates';
import { checkedOutput } from '../ingestion/extraction';
import { OUTPUT_LIMITS, openExtractorOutput, type OutputLimits } from './read-output';

/** The code the worker records for each refusal of the per-line IFC section. */
export const IFC_VALUES_STREAM_CODES: Readonly<Record<Exclude<IfcValuesStreamResult, { ok: true }>['reason'], string>> = {
  gate_closed: 'ifc_values_gate_closed',
  not_asked: 'ifc_values_not_asked',
  unexpected: 'ifc_values_unexpected',
  truncated: 'ifc_values_truncated',
  excess: 'ifc_values_excess',
  invalid: 'ifc_values_invalid',
};

export type JobOutput =
  | { readonly ok: true; readonly output: ExtractionOutputView; readonly lines: number; readonly bytesRead: number }
  | { readonly ok: false; readonly code: string; readonly problems: readonly ContractProblem[]; readonly bytesRead: number };

/** Reads, checks and returns a job's output, or the code of why it is refused whole. */
export async function readJobOutput(path: string, request: ExtractionRequest, gates: GateSource, limits: OutputLimits = OUTPUT_LIMITS): Promise<JobOutput> {
  type Checked = { readonly ok: true; readonly output: ExtractionOutputView; readonly lines: number } | { readonly ok: false; readonly code: string; readonly problems: readonly ContractProblem[] };
  const read = await openExtractorOutput(
    path,
    async (opened): Promise<Checked> => {
      const checked = checkedOutput(request, opened.value);
      if (!checked.ok) return { ok: false, code: checked.code, problems: checked.problems };
      if (!opened.followed && !ifcValuesStreamExpected(request, checked.output)) return { ok: true, output: checked.output, lines: 1 };
      // The later lines go to the contract as the file is read; it takes none while the gate is closed or none were asked for.
      const streamed = await readIfcValuesStream(request, checked.output, opened.lines(), gates);
      if (!streamed.ok) return { ok: false, code: IFC_VALUES_STREAM_CODES[streamed.reason], problems: streamed.problems };
      return { ok: true, output: streamed.output, lines: streamed.lines + 1 };
    },
    limits,
  );
  if (!read.ok) return { ok: false, code: read.code, problems: [], bytesRead: read.bytesRead };
  return { ...read.value, bytesRead: read.bytesRead };
}
