/**
 * Strict parsing of the contract's three entry points. Strict is the only mode:
 * a key the schema does not name is refused at every level (`z.strictObject`),
 * so an extractor that writes an IFC locator where it does not belong, or an AI
 * output that adds one to Evidence.locator, is refused rather than stripped.
 * Every parse returns problems with paths and codes, never values (rule 13).
 */
import { IFC_LOCATOR_KEYS } from './generated/annotations';
import {
  EvidenceLocatorSchema,
  ExtractionOutputSchema,
  ExtractionRequestSchema,
  type EvidenceLocator,
  type ExtractionOutput,
  type ExtractionRequest,
} from './generated/zod';
import { proposalsOutsideDatasets, sealIfcValues, type SealedIfcValues } from './ifc-values';
import { problemsOf, type ContractProblem, type ParseResult } from './problems';

/**
 * A parsed extraction output as the API receives it: everything readable
 * except the IFC section, which is sealed (ifc-values.ts). Deeply frozen.
 */
export type ExtractionOutputView = Readonly<Omit<ExtractionOutput, 'ifcValues'>> & {
  readonly ifcValues?: SealedIfcValues;
};

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) deepFreeze(item);
  }
  return value;
}

/** Parses an extraction output strictly, runs its invariants and seals its IFC section. */
export function parseExtractionOutput(input: unknown): ParseResult<ExtractionOutputView> {
  const result = ExtractionOutputSchema.safeParse(input);
  if (!result.success) return { ok: false, problems: problemsOf(result.error) };
  const { ifcValues, ...readable } = result.data;
  const view: ExtractionOutputView = ifcValues === undefined ? readable : { ...readable, ifcValues: sealIfcValues(deepFreeze(ifcValues)) };
  return { ok: true, value: deepFreeze(view) };
}

/** Parses an extraction request strictly and runs its invariants. */
export function parseExtractionRequest(input: unknown): ParseResult<ExtractionRequest> {
  const result = ExtractionRequestSchema.safeParse(input);
  return result.success ? { ok: true, value: deepFreeze(result.data) } : { ok: false, problems: problemsOf(result.error) };
}

/**
 * Keys that would carry an IFC locator (ifc-input 6.2.1) or its parts, from the
 * schema's x-ifc-locator-keys. Evidence.locator has none under guardrails v1.6,
 * so any of them is refused with its own code, which the verifier logs with
 * `evidence_not_found` (G1-13).
 */
const IFC_KEYS: readonly string[] = IFC_LOCATOR_KEYS;

/**
 * The strict runtime check of guardrails 2.4 Evidence.locator for the evidence
 * verifier (rule 1, "The locator exists"): a PDF locator { page, bbox? } or an
 * XLSX locator { sheet, cell? }, and nothing else. An IFC key is refused with
 * `ifc_field` (G1-13); any other unknown key with `unknown_key`. Whether the
 * locator exists in the stored document, and whether the excerpt is there, is
 * the verifier's next check: a sheet or page that encodes a GlobalId or a
 * property path names nothing the extracted text holds.
 */
export function parseEvidenceLocator(input: unknown): ParseResult<EvidenceLocator> {
  const ifcKeys =
    typeof input === 'object' && input !== null && !Array.isArray(input)
      ? Object.keys(input).filter((key) => IFC_KEYS.includes(key))
      : [];
  const result = EvidenceLocatorSchema.safeParse(input);
  if (ifcKeys.length === 0 && result.success) return { ok: true, value: deepFreeze(result.data) };
  const problems: ContractProblem[] = ifcKeys.map((key) => ({ path: `/${key}`, code: 'ifc_field' }));
  if (!result.success) problems.push(...problemsOf(result.error));
  return { ok: false, problems };
}

/**
 * Checks that an output answers its request: the same job, the format the
 * request declared (or `other`, failed: the file is not what was declared, or
 * could not be placed), no IFC section unless asked for (the request's
 * ifcValues follows the gate), IDS results only for the IDS file sent,
 * derivatives only of the kinds asked for, and proposals shaped only by the
 * datasets mounted.
 */
export function outputAnswersRequest(request: ExtractionRequest, output: ExtractionOutputView): readonly ContractProblem[] {
  const problems: ContractProblem[] = [];
  const job = request.job;
  if (output.job.projectId !== job.projectId || output.job.documentId !== job.documentId || output.job.contentHash !== job.contentHash) {
    problems.push({ path: '/job', code: 'value' });
  }
  // A workbook uploaded as a PDF must not be stored as a workbook under a PDF record, with its
  // sheets' coverage and status (rule 12; 2.3): the extractor says `format_mismatch` instead.
  const notPlaced = output.format === 'other' && output.analysis.status === 'failed';
  if (output.format !== request.declaredFormat && !notPlaced) problems.push({ path: '/format', code: 'value' });
  if (output.ifcValues !== undefined && !request.ifcValues) problems.push({ path: '/ifcValues', code: 'value' });
  const ids = output.ifcModel?.ids?.ids;
  if (ids !== undefined) {
    const asked = request.ids;
    const same = asked !== undefined && asked.id === ids.id && asked.version === ids.version && asked.sha256 === ids.sha256 && asked.draft === ids.draft;
    if (!same) problems.push({ path: '/ifcModel/ids/ids', code: 'value' });
  }
  output.derivatives.forEach((derivative, index) => {
    if (!request.derivatives.includes(derivative.kind)) problems.push({ path: `/derivatives/${String(index)}/kind`, code: 'value' });
  });
  if (output.ifcValues !== undefined) {
    const mounted = new Set(request.datasets.map((dataset) => `${dataset.id}@${dataset.version}`));
    for (const index of proposalsOutsideDatasets(output.ifcValues, mounted)) {
      problems.push({ path: `/ifcValues/candidateProposals/${String(index)}/datasets`, code: 'value' });
    }
  }
  return problems;
}
