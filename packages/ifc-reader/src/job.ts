/**
 * One IFC job: check the file is the one the request names, read it with web-ifc, build the
 * output, and check it against the extraction contract before anyone sees it.
 *
 * The request comes from the API (the contract's ExtractionRequest; ADR 0020: job payloads
 * carry ids only, and the worker mounts the file read-only). The API sends this reader IFC
 * jobs only; PDF and XLSX go to the Python extractor (apps/api/src/jobs/sandbox.ts). The reader
 * refuses a file whose SHA-256 is not the request's content hash: it never writes an output
 * about bytes it did not read (rule 1, "The content hash matches"; rule 13).
 *
 * IFC values (facts and proposals) are built only when the request asks for them, which the
 * API does only while the `ifc-values` gate reads open; with no mounted dataset there is no
 * proposal. An IDS the request names is checked for its hash and not run: the IDS model check
 * waits (owner decision 2026-09-26; D-36), so no IDS result arises.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  outputAnswersRequest,
  parseExtractionOutput,
  parseExtractionRequest,
  type ContractProblem,
  type ExtractionOutput,
  type ExtractionRequest,
} from '@sovitech/extraction-contract';
import { DatasetError, loadDataset, type Dataset } from './datasets';
import { IfcModel, isMemoryError, webIfcVersion } from './model';
import { ifcOutput, notStepOutput, unopenedOutput } from './output';
import { buildProposals } from './proposals';
import { readModel } from './reading';
import { NotStepError, readStepText, textOfBytes } from './step-text';
import { buildFacts } from './values';

/** A job the reader refuses. The message is a code, never document text. */
export class JobError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'JobError';
  }
}

/** A request the reader refuses: the problems are JSON pointers and codes only. */
export class RequestError extends Error {
  constructor(readonly problems: readonly ContractProblem[]) {
    super('request.refused');
    this.name = 'RequestError';
  }
}

/** An output the contract refuses, or that does not answer its request: a bug, never written. */
export class OutputError extends Error {
  constructor(
    readonly code: 'output.refused_by_contract' | 'output.does_not_answer_request',
    readonly problems: readonly ContractProblem[],
  ) {
    super(code);
    this.name = 'OutputError';
  }
}

/** What the sandbox mounts beside the file: the datasets folder and the IDS file, if any. */
export interface Mounts {
  readonly datasets?: string;
  readonly ids?: string;
}

/** The file's SHA-256 in the store's form, `sha256:<64 hex>`. */
export function contentHashOf(bytes: Uint8Array): string {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

/** Reads a request strictly (the contract's parseExtractionRequest); throws RequestError. */
export function checkedRequest(raw: unknown): ExtractionRequest {
  const parsed = parseExtractionRequest(raw);
  if (!parsed.ok) throw new RequestError(parsed.problems);
  return parsed.value;
}

function datasets(request: ExtractionRequest, mounts: Mounts): Dataset[] {
  if (request.datasets.length === 0) return [];
  const folder = mounts.datasets;
  if (folder === undefined) throw new JobError('job.datasets_not_mounted');
  try {
    return request.datasets.map((reference) => loadDataset(folder, reference.id, reference.version));
  } catch (error) {
    if (error instanceof DatasetError) throw new JobError(`job.${error.code}`);
    throw error;
  }
}

function checkIds(request: ExtractionRequest, mounts: Mounts): void {
  if (request.ids === undefined) return;
  if (mounts.ids === undefined) throw new JobError('job.ids_not_mounted');
  let bytes: Uint8Array;
  try {
    bytes = readFileSync(mounts.ids);
  } catch {
    throw new JobError('job.ids_not_mounted');
  }
  if (contentHashOf(bytes) !== request.ids.sha256) throw new JobError('job.ids_hash_mismatch');
}

/** Reads the model the request names and returns its extraction output; throws JobError. */
export async function runIfcJob(request: ExtractionRequest, bytes: Uint8Array, mounts: Mounts = {}): Promise<ExtractionOutput> {
  if (contentHashOf(bytes) !== request.job.contentHash) throw new JobError('job.content_hash_mismatch');
  if (request.declaredFormat !== 'ifc') throw new JobError('job.format_not_read_here');
  checkIds(request, mounts);
  const tables = request.ifcValues ? datasets(request, mounts) : [];
  const version = await webIfcVersion();
  let text;
  try {
    text = readStepText(textOfBytes(bytes));
  } catch (error) {
    if (error instanceof NotStepError) return notStepOutput(request.job, version, 'format_mismatch');
    throw error;
  }
  let model: IfcModel | undefined;
  try {
    const opened = await IfcModel.open(bytes, text);
    if (!(opened instanceof IfcModel)) return unopenedOutput(request.job, version, opened.unopened, opened.schemaName);
    model = opened;
    const reading = readModel(model);
    let values;
    if (request.ifcValues) {
      const facts = buildFacts(reading, request.job.contentHash);
      values = { facts: facts.facts, candidateProposals: buildProposals(reading, facts, tables) };
    }
    return ifcOutput(request.job, version, reading, values);
  } catch (error) {
    if (isMemoryError(error)) return unopenedOutput(request.job, version, 'job.memory_limit', undefined);
    throw error;
  } finally {
    model?.close();
  }
}

/** Checks an output as the API will (the contract's strict parser, and that it answers its request). */
export function checkOutput(request: ExtractionRequest, output: ExtractionOutput): void {
  const parsed = parseExtractionOutput(output);
  if (!parsed.ok) throw new OutputError('output.refused_by_contract', parsed.problems);
  const problems = outputAnswersRequest(request, parsed.value);
  if (problems.length > 0) throw new OutputError('output.does_not_answer_request', problems);
}
