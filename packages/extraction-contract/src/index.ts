/**
 * @sovitech/extraction-contract: the JSON contract between the Python extractor
 * (services/extractor) and the API (apps/api), and the strict runtime shape of
 * Evidence.locator that the evidence verifier reads (G1-13).
 *
 * One source: src/extraction-contract.schema.json. The zod schemas here and the
 * Python dataclasses in services/extractor/src/sovitech_extractor/contract/ are
 * generated from it (src/generator/), and a drift test keeps them equal.
 *
 * What this entry hands out:
 * - parseExtractionRequest, parseExtractionOutput: strict parsing (an unknown
 *   key is refused at every level), with the contract's invariants. The IFC
 *   section of an output comes back sealed;
 * - openIfcValues: the one way to read the IFC facts and candidate proposals,
 *   through a gate source, only while `ifc-values` reads open, proposal by
 *   proposal for the gates of each mechanism;
 * - ifcValuesStreamLines, readIfcValuesStream: the per-line form of the IFC
 *   section a large model needs (TypeScript only; ADR 0034), written by the IFC
 *   reader and read line by line by the API, sealed as above, and read only
 *   while `ifc-values` reads open;
 * - parseEvidenceLocator and evidenceLocatorSchema: the strict Evidence.locator
 *   check (no IFC field);
 * - outputAnswersRequest, evidenceTexts: the checks and text the API's
 *   ingestion needs around them;
 * - the generated types and the rule tables.
 *
 * The other zod schemas are not exported: reading an output around the seal
 * would take a deep import, which dependency-cruiser refuses
 * (package-internals-only-through-exports).
 */
export { CONTRACT_VERSION, ENTRY_POINTS, FORMAT_RULES, IFC_LOCATOR_KEYS, INVARIANT_IDS, MECHANISM_RULES } from './generated/annotations';
export type {
  AnalysisStatus,
  Box,
  CellRef,
  ContentHash,
  Coverage,
  DatasetRef,
  DeclaredUnit,
  Derivative,
  DerivativeKind,
  EvidenceLocator,
  ExtractionOutput,
  ExtractionRequest,
  Finding,
  FindingLocator,
  Format,
  GlobalId,
  IdsResults,
  IdsSpecResult,
  IfcCandidateProposal,
  IfcFact,
  IfcGateId,
  IfcLocator,
  IfcModelRecord,
  IfcPath,
  IfcProposalMechanism,
  IfcSchemaId,
  Job,
  PageCoverage,
  PdfContent,
  PdfEvidenceLocator,
  PdfPage,
  ProposalValue,
  SheetCoverage,
  StepValue,
  StoredOnlyStatus,
  TextBlock,
  XlsxCell,
  XlsxContent,
  XlsxEvidenceLocator,
  XlsxSheet,
} from './generated/zod';
/**
 * The strict Evidence.locator schema, for embedding in the AI's structured-output
 * schema (packages/ai). The verifier still re-checks every locator with
 * parseEvidenceLocator (G1-13).
 */
export { EvidenceLocatorSchema as evidenceLocatorSchema } from './generated/zod';
export { evidenceTexts, type EvidenceText } from './evidence-text';
export { gatesOf, openIfcValues, type IfcValuesReading, type SealedIfcValues, type WithheldProposal } from './ifc-values';
export {
  IFC_FACT_EXCERPT_MAX,
  IFC_VALUES_LINE_MAX_BYTES,
  IfcValuesStreamError,
  ifcValuesStreamExpected,
  ifcValuesStreamLines,
  readIfcValuesStream,
  utf8Length,
  type IfcValuesStreamResult,
  type StreamCheckId,
} from './ifc-values-stream';
export { codePointLength, formatRule, mechanismRule, type FormatRule, type InvariantId, type MechanismRule } from './invariants';
export {
  outputAnswersRequest,
  parseEvidenceLocator,
  parseExtractionOutput,
  parseExtractionRequest,
  type ExtractionOutputView,
} from './parse';
export { onlyInvariantProblems, type ContractProblem, type ParseResult, type ProblemCode } from './problems';
