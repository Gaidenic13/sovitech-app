/**
 * The inputs of the sensitivity test for the production registry (docs/guardrails.md
 * rule 6; prompt 3 section 10, "Phase 1": "Run the sensitivity test on the
 * synthetic fixture project with the TEST datasets and TEST formulas loaded").
 *
 * Phase 0 has no production question, no synthetic fixture project, no TEST
 * formula and no TEST dataset, so this returns undefined. The registry check
 * fails as soon as the production registry holds a question while this still
 * returns undefined. Phase 1 returns the suite here: the fixture project's
 * answers and probes, the TEST implementations keyed `formula:<id>@<version>`
 * (packages/engine/test-formulas/ from phase 5), and the TEST datasets from
 * fixtures/datasets/, whose ids carry "TEST".
 */
import type { SensitivitySuite } from '@sovitech/registry/validation';

export async function loadSensitivitySuite(): Promise<SensitivitySuite | undefined> {
  return undefined;
}
