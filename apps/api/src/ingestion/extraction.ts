/**
 * The extraction request the API sends to the extractor, and what the API stores from
 * the extractor's output (prompt 3 sections 8 and 10; F-INGEST-04, F-INGEST-05,
 * F-EXTRACT-01, F-EXTRACT-10, F-IFC-01, F-IFC-02; the extraction contract, ADR 0022;
 * docs/adr/0025-document-storage-and-ingestion.md).
 *
 * The API writes nothing the extractor did not produce: the extracted text (visible text
 * only: hidden text is a finding and gives no values, rule 14), the analysis status and
 * coverage the extractor recorded (rule 12), the rule 14 findings, and the engineer-only
 * record of a model. The extractor writes no candidate: document and inference values
 * come only through the one ingestion path, after the verifier (./proposals.ts).
 *
 * While `ifc-values` is closed (prompt 3 5.4), the request asks for no IFC values and
 * mounts no dataset, an IFC model's status line stays "Not analysed: IFC model stored,
 * not analysed" (G12-5), its schema check and IDS results are engineer items only
 * (G12-6), and an instruction in a model's text is one `embedded_instruction` finding
 * and changes no state (G14-3).
 */
import {
  AUTHORING_TOOL_PART,
  appendGuardrailEvent,
  readDocumentTexts,
  recordDocumentAnalysis,
  recordDocumentFinding,
  recordModelRecord,
  storeDocumentTexts,
  type Request,
  type TextPart,
} from '@sovitech/db';
import type { DocumentRecord, FieldDefinition } from '@sovitech/domain';
import {
  CONTRACT_VERSION,
  evidenceTexts,
  openIfcValues,
  outputAnswersRequest,
  parseExtractionOutput,
  parseExtractionRequest,
  type ContractProblem,
  type ExtractionOutputView,
  type ExtractionRequest,
  type Format,
} from '@sovitech/extraction-contract';
import { productionRegistry, registryLookups, type UnitCheckedField } from '@sovitech/registry';
import { readGate, type GateSource } from '@sovitech/registry/gates';
import { formatCoverage, parseCoverage, type Coverage } from '../documents/coverage';
import type { StoredOnlyWord } from '../documents/formats';
import { storeIfcValues, type IfcValuesReport } from './ifc-values';

/** The production registry's fields, the gated IFC value path's default. */
const productionFields = registryLookups(productionRegistry).field;

/** The IDS a model is checked against: the draft IDS v0.1 (prompt 3 5.2; fixtures/ids/), with its SHA-256. */
export interface IdsReference {
  readonly id: string;
  readonly version: string;
  readonly draft: boolean;
  readonly sha256: string;
}

/** The limits of one extraction (prompt 3 section 11, "Extraction": within 5 minutes on the development machine). */
export const EXTRACTION_LIMITS = { maxPages: 5000, maxCellsPerSheet: 2_000_000, wallClockSeconds: 300 } as const;

/**
 * The extraction request of a document: ids only, the declared format, and the IFC
 * section asked for only while `ifc-values` reads open, with no dataset mounted while it
 * is closed (R-027, "Until decided": no mapping table is consulted). No derivatives are
 * asked for in phase 2 (the viewer's conversion is phase 4).
 */
export function extractionRequestFor(
  job: { readonly projectId: string; readonly documentId: string; readonly contentHash: string },
  format: Format,
  gates: GateSource,
  ids: IdsReference | undefined,
): ExtractionRequest {
  const request = {
    contractVersion: CONTRACT_VERSION,
    job: { projectId: job.projectId, documentId: job.documentId, contentHash: job.contentHash },
    declaredFormat: format,
    ifcValues: readGate(gates, 'ifc-values').open,
    datasets: [],
    ...(format === 'ifc' && ids !== undefined ? { ids: { id: ids.id, version: ids.version, draft: ids.draft, sha256: ids.sha256 } } : {}),
    derivatives: [],
    limits: EXTRACTION_LIMITS,
  };
  const parsed = parseExtractionRequest(request);
  if (!parsed.ok) throw new Error(`the extraction request breaks the contract: ${parsed.problems.map((problem) => `${problem.path} ${problem.code}`).join(', ')}`);
  return parsed.value;
}

/** Why an extractor's output is not stored: it breaks the contract, or it does not answer the request sent. */
export type OutputRefusal = { readonly code: 'output_invalid' | 'output_not_answering_request'; readonly problems: readonly ContractProblem[] };

/** Parses an output and checks it answers the request. Problems carry paths and codes only (rule 13). */
export function checkedOutput(request: ExtractionRequest, raw: unknown): { readonly ok: true; readonly output: ExtractionOutputView } | ({ readonly ok: false } & OutputRefusal) {
  const parsed = parseExtractionOutput(raw);
  if (!parsed.ok) return { ok: false, code: 'output_invalid', problems: parsed.problems };
  const problems = outputAnswersRequest(request, parsed.value);
  if (problems.length > 0) return { ok: false, code: 'output_not_answering_request', problems };
  return { ok: true, output: parsed.value };
}

/** The stored text parts of an output: each page, each cell, and each sheet as a whole (visible text only). */
export function textPartsOf(output: ExtractionOutputView): TextPart[] {
  const parts: TextPart[] = [];
  const sheets = new Map<string, string[]>();
  for (const entry of evidenceTexts(output)) {
    const locator = entry.locator;
    if ('page' in locator) {
      parts.push({ part: `page:${locator.page}`, text: entry.text });
    } else {
      if (locator.cell !== undefined) parts.push({ part: `cell:${locator.sheet}!${locator.cell}`, text: entry.text });
      const texts = sheets.get(locator.sheet) ?? [];
      texts.push(entry.text);
      sheets.set(locator.sheet, texts);
    }
  }
  for (const [sheet, texts] of sheets) parts.push({ part: `sheet:${sheet}`, text: texts.join('\n') });
  return parts;
}

/** The coverage the extractor recorded, in the stored form (rule 12: "Code records coverage"). */
export function coverageOf(output: ExtractionOutputView): { readonly status: DocumentRecord['analysis']['status']; readonly coverage: Coverage } {
  const analysis = output.analysis;
  switch (analysis.status) {
    case 'stored_only':
      return { status: 'stored_only', coverage: { kind: 'stored', word: analysis.formatWord as StoredOnlyWord } };
    case 'failed':
      return { status: 'failed', coverage: { kind: 'none' } };
    case 'analysed':
    case 'partly_analysed': {
      const pages = output.coverage.pages;
      if (pages !== undefined) {
        return { status: analysis.status, coverage: { kind: 'read', unit: 'pages', ranges: pages.read.map((range) => ({ first: range.first, last: range.last })), total: pages.total } };
      }
      const sheets = output.coverage.sheets ?? [];
      const read = sheets.flatMap((sheet, index) => (sheet.status === 'read' ? [{ first: index + 1, last: index + 1 }] : []));
      return { status: analysis.status, coverage: { kind: 'read', unit: 'sheets', ranges: read, total: sheets.length } };
    }
  }
}

export interface OutputStored {
  readonly textParts: number;
  readonly findings: number;
  readonly embeddedInstructions: number;
  readonly modelRecord: boolean;
  readonly statusRecorded: boolean;
  /** Whether `ifc-values` read open for this output (only in tests/proposed/). */
  readonly ifcValuesOpen: boolean;
  /** What the gated IFC value path stored, when `ifc-values` read open (./ifc-values.ts). */
  readonly ifcValues?: IfcValuesReport;
}

/**
 * Stores what an extractor output holds for its document, in the extraction service
 * account's request (the system: 2.1, rule 12), in one transaction.
 */
export async function storeExtractionOutput(
  request: Request,
  input: {
    readonly document: DocumentRecord;
    readonly output: ExtractionOutputView;
    readonly serviceId: string;
    readonly gates: GateSource;
    /**
     * The fields the gated IFC value path may write, while `ifc-values` reads open: the production
     * registry's by default; tests/proposed/ hands in TEST fields for its TEST mapping table.
     */
    readonly ifcFields?: (key: string) => (FieldDefinition & UnitCheckedField) | undefined;
  },
): Promise<OutputStored> {
  const { document, output, serviceId } = input;

  // Extracted text: what is not stored yet for these bytes in this project.
  const existing = new Set((await readDocumentTexts(request, document.contentHash, '')).map((part) => part.part));
  const parts = textPartsOf(output).filter((part) => !existing.has(part.part));
  if (output.ifcModel?.header.authoringTool !== undefined && !existing.has(AUTHORING_TOOL_PART)) {
    parts.push({ part: AUTHORING_TOOL_PART, text: output.ifcModel.header.authoringTool });
  }
  await storeDocumentTexts(request, { contentHash: document.contentHash, parts, createdBy: serviceId });

  // Status and coverage, as the extractor recorded them; an unchanged line is not written twice.
  const recorded = coverageOf(output);
  const coverage = formatCoverage(recorded.coverage);
  const current = parseCoverage(document.analysis.coverage);
  const unchanged = document.analysis.status === recorded.status && current !== undefined && formatCoverage(current) === coverage;
  if (!unchanged) await recordDocumentAnalysis(request, { documentId: document.id, status: recorded.status, coverage, actor: serviceId });

  // Rule 14 findings: engineer items with a code and a locator, and one guardrail event per embedded instruction.
  for (const finding of output.findings) {
    await recordDocumentFinding(request, {
      documentId: document.id,
      contentHash: document.contentHash,
      kind: finding.kind,
      code: finding.code,
      locator: { ...finding.locator },
      createdBy: serviceId,
    });
    if (finding.kind === 'embedded_instruction') {
      await appendGuardrailEvent(request, { type: 'embedded_instruction', subjectId: document.id, reason: finding.code, actor: serviceId });
    }
  }

  // The engineer-only record of a model (R-023): codes, ids, counts; the IDS results as stored, never report text.
  const model = output.ifcModel;
  if (model !== undefined) {
    await recordModelRecord(request, {
      documentId: document.id,
      contentHash: document.contentHash,
      ifcSchema: model.header.schema,
      ...(model.header.ifcProjectGlobalId === undefined ? {} : { ifcProjectGlobalId: model.header.ifcProjectGlobalId }),
      classesPresent: model.classesPresent,
      processing: model.processing,
      schemaCheck: { tool: model.schemaCheck.tool.name, version: model.schemaCheck.tool.version, outcome: model.schemaCheck.outcome },
      ...(model.ids === undefined ? {} : { idsResults: { ids: { ...model.ids.ids }, tool: { ...model.ids.tool }, specifications: model.ids.specifications.map((spec) => ({ ...spec })) } }),
      createdBy: serviceId,
    });
  }

  // The IFC values stay sealed: the request asks for them only while `ifc-values` reads open,
  // which it never does outside tests/proposed/. Only with the gate open does the gated value
  // path run (./ifc-values.ts, docs/adr/0033-ifc-value-path-api-half.md); while it is closed,
  // storeIfcValues returns before it touches the store, and nothing is stored from them.
  const ifcValuesOpen = openIfcValues(output.ifcValues, input.gates).open;
  const ifcValues = ifcValuesOpen
    ? await storeIfcValues(request, { document, output, serviceId, gates: input.gates, field: input.ifcFields ?? productionFields })
    : undefined;

  return {
    textParts: parts.length,
    findings: output.findings.length,
    embeddedInstructions: output.findings.filter((finding) => finding.kind === 'embedded_instruction').length,
    modelRecord: model !== undefined,
    statusRecorded: !unchanged,
    ifcValuesOpen,
    ...(ifcValues === undefined ? {} : { ifcValues }),
  };
}
