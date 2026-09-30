/**
 * @sovitech/ai: the Anthropic boundary (prompt 3 section 6; guardrails section 6, "AI
 * boundary"; docs/adr/0021 and 0023). It loads prompts/sovitech-ai-system.md at run time,
 * builds each request from one project in delimited data blocks, guards the
 * `ai-processor-route` gate before any call, sends structured-output requests to the one
 * pinned model, and validates every output before anything is stored. The eval runner
 * (src/evals/runner.ts, `pnpm evals`) uses the same path and the same validator.
 *
 * The claude-api skill was loaded before this code was written (CLAUDE.md, "The in-app AI").
 */
export { API_BASE_URL, EFFORT, MAX_TOKENS, MODEL_ID } from './model';
export { API_KEY_VARIABLE, ApiKey, KEY_NOT_SET, readApiKey, type ApiKeyReading, type ReadApiKeyOptions } from './key';
export { SYSTEM_PROMPT_FILE, SystemPromptError, loadSystemPrompt, promptBody, type SystemPrompt } from './prompt';
export { CONTENT_HASH, DataBlockError, locatorKey, type BlockLocator, type DocumentForAi, type TextBlockForAi } from './blocks';
export {
  ContextInputError,
  CrossProjectContextError,
  DRAFTING_INSTRUCTION,
  EXTRACTION_INSTRUCTION,
  NO_STATE,
  PRICING_STAGES,
  buildDraftingContext,
  buildExtractionContext,
  type CodeState,
  type DraftSlot,
  type DraftingContext,
  type DraftingInput,
  type DraftingProvenance,
  type ExtractionContext,
  type ExtractionInput,
  type FactForAi,
  type FieldForAi,
  type GlossaryForAi,
  type OwnerTextForAi,
  type PricingStage,
  type ProjectScope,
  type SentCoverage,
  type SentDocument,
  type TokenForAi,
  type VerificationForAi,
} from './context';
export {
  FIXTURE_MANIFEST_FILE,
  FixtureManifestError,
  checkProcessorRoute,
  codeSetNames,
  contentHashOf,
  loadFixtureManifest,
  nameForModel,
  sha256Hex,
  type FixtureManifest,
  type RouteContext,
  type RouteDecision,
  type RouteItem,
  type RouteRefusal,
  type RouteRefusalCode,
} from './guard';
export * from './schema';
export * from './validator';
export {
  AI_CALL_ERROR_CODES,
  AiCallError,
  callError,
  createAnthropicTransport,
  messageParams,
  outputFormat,
  type AiCallErrorCode,
  type ModelRequest,
  type ModelResponse,
  type ModelTransport,
  type OutputKind,
  type OutputProblem,
} from './transport';
export {
  GateClosedError,
  readDraftingResponse,
  readExtractionResponse,
  runDrafting,
  runExtraction,
  stderrLog,
  toCandidateProposal,
  type AiProposal,
  type AttemptRecord,
  type BoundaryDeps,
  type BoundaryLog,
  type BoundaryLogRecord,
  type DraftingRun,
  type ExtractionRun,
  type ResponseReading,
} from './boundary';
