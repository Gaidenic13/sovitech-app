/**
 * Whether the app reads an uploaded IFC model at all, until the owner decides the parsing
 * scope (PRD D-01; build-readiness decision 4).
 *
 * PRD R-023 and R-024 read, "Until decided": "Not built: no model is read". Prompt 3 5.2's
 * parsing-scope default reads IFC with its values behind `ifc-values`, and prompt 3 section 4
 * says to follow the stricter of the two and log it. So, in the live app, an uploaded model is
 * registered stored-only, with the G12-1 line "Not analysed: IFC model stored, not analysed",
 * and no reader job is queued: no model is read, not even for the engineer's record or its
 * rule 14 findings (the orchestrator's ruling of the phase 2 review; the build log's question
 * for the owner on D-01). The worker refuses a model's job that reaches it anyway, by code.
 *
 * The IFC reader (packages/ifc-reader, its sandbox image) and the worker's dispatch to it stay
 * built, and are proven in tests (the reader's own tests, tests/api in process, the gate-closed
 * cases and tests/proposed) through a switch only a test can make: `readModelsForTests()`. No
 * environment variable, setting, file or production entry point makes it: the switch is an
 * object this module issues, recognised by identity, and it is issued only inside the Vitest
 * runner (./model-reading.test.ts also checks that no source under apps/ calls it).
 */

/** The switch that lets the app read models. Only `readModelsForTests()` makes one. */
export interface ModelReadingSwitch {
  readonly readsModels: true;
}

/** Services, or worker options, that may carry the switch. */
export interface ModelReadingServices {
  readonly modelReading?: ModelReadingSwitch;
}

const ISSUED = new WeakSet<object>();

/** Whether these services read uploaded models: only with a switch this module issued. */
export function readsModels(services: ModelReadingServices | undefined): boolean {
  const candidate: unknown = services?.modelReading;
  return typeof candidate === 'object' && candidate !== null && ISSUED.has(candidate);
}

/**
 * Tests only: a switch that lets the upload queue a model's reader job and the worker run it,
 * as the app would once the owner decides D-01 that models are read. Refused outside the Vitest
 * runner.
 */
export function readModelsForTests(): ModelReadingSwitch {
  if (process.env['VITEST'] !== 'true') {
    throw new Error('readModelsForTests() is for tests only: until the owner decides D-01, the app reads no model (PRD R-023, R-024).');
  }
  const issued: ModelReadingSwitch = Object.freeze({ readsModels: true as const });
  ISSUED.add(issued);
  return issued;
}
