/**
 * The engine's errors.
 *
 * - `EngineNotBuilt`: thrown by a skeleton function the phase 5 planner declared and the engine builder has not yet
 *   written (build log, phase 5 plan, "The skeleton"). It is not the domain's NotImplementedError: no guardrail case
 *   is held out by it (the pending wrapper accepts only the domain's stubs), so a case that reaches it fails, as it
 *   should until the code exists.
 * - `EngineInputError`: an input the engine cannot read as declared (a field outside the formula's signature, a
 *   dataset that is not a loaded dataset, a TEST formula in a production registry). Never a value: the engine refuses
 *   rather than guess (guardrails rule 1).
 */
export class EngineNotBuilt extends Error {
  constructor(what: string) {
    super(`@sovitech/engine: ${what} is not built yet (phase 5 part A builder)`);
    this.name = 'EngineNotBuilt';
  }
}

export class EngineInputError extends Error {
  constructor(message: string) {
    super(`@sovitech/engine: ${message}`);
    this.name = 'EngineInputError';
  }
}
