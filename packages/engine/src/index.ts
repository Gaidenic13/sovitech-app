/**
 * @sovitech/engine: versioned formulas with a declared unknownPolicy, the hash manifest and decimal.js intervals
 * (prompt 3 section 6); the only producer of `calculated` and `estimated` candidates (guardrails 2.1); the pricing
 * stages read from stored records (rule 10); the proposal snapshot and its staleness (2.4). Decisions:
 * docs/adr/0047-calculation-engine.md and docs/adr/0048-stored-proposal-and-price-stage.md.
 *
 * Modules:
 * - interval.ts: exact intervals and estimates (rule 9);
 * - catalogue.ts: the production catalogue (the registry's six signatures, what each waits for, no body) and the shape
 *   of a TEST catalogue;
 * - inputs.ts, reading.ts, results.ts: what a run reads (derived state, loaded datasets, closed gates), how it reads one
 *   input, and what it answers (a figure as a candidate, an incomplete total, or what was missing);
 * - notes.ts: the coded notes a candidate's `method.assumptions` carry (datasets, ranges, exclusions);
 * - run.ts: `runEngine`;
 * - snapshot.ts: the snapshot record, the inputs hash and the candidate hash;
 * - staleness.ts: what changed since a snapshot or a quotation record;
 * - stage.ts: the stage of an investment figure from stored records;
 * - manifest.ts, manifest.json, bodies/: the hash manifest of production bodies, each hashed with everything it loads
 *   (empty: no body in phase 5). Not exported here: its check parses source with the TypeScript compiler, so it has its
 *   own entry, `@sovitech/engine/manifest`, read by tests, and the engine's run never loads the compiler.
 * TEST bodies and TEST datasets: packages/engine/test-formulas/, inside the test runner only.
 */
export { EngineInputError, EngineNotBuilt } from './errors';
export {
  estimate,
  exact,
  hull,
  interval,
  isPoint,
  midpoint,
  multiply,
  percentOf,
  point,
  strictlyInside,
  sum,
  toCandidateNumber,
  type Estimate,
  type Interval,
} from './interval';
export {
  OUTPUT_STAGES,
  PRODUCTION_CATALOGUE,
  formulaRefOf,
  inputsOfOutput,
  requirementsOf,
  type BodyInputs,
  type BodyOutput,
  type EngineFormula,
  type FormulaBody,
  type FormulaCatalogue,
  type Requirement,
} from './catalogue';
export { fieldKeyOf, type DatasetAccess, type EngineField, type EngineInput, type InputReading, type InputValue } from './inputs';
export { decidingCandidateIds } from './reading';
export { decodeNote, encodeNote, isIncompleteTotal, methodNotesOf, type MethodNote } from './notes';
export type {
  EngineCandidate,
  EngineRefusal,
  EngineRefusalReason,
  EngineRun,
  FormulaRef,
  Missing,
  MissingInputReason,
  OutputResult,
} from './results';
export { runEngine, type RunOptions } from './run';
export { candidateHashOf, inputsHashOf, missingCode, snapshotRecordOf, type SnapshotOutputRow, type SnapshotRecord } from './snapshot';
export {
  quotationStanding,
  snapshotChanges,
  storedSnapshotOf,
  type CurrentInputs,
  type QuotationStanding,
  type SnapshotChanges,
  type StoredQuotationRecord,
  type StoredSnapshot,
} from './staleness';
export { headlineOutputOf, priceStageOf, type PriceStageId, type PriceStageReading } from './stage';
