/**
 * The registry check's inputs and report: registry validation of the
 * production registry, the gate files' shape and set, and the sensitivity
 * test on every question (docs/guardrails.md 2.6 and rule 6; prompt 3 5.2
 * and 5.4). The logic lives in @sovitech/registry.
 *
 * The check never passes on an empty scope (phase 0 review): it fails when
 * packages/registry/gates/ is missing or holds fewer gate files than the 18 of
 * prompt 3 section 5.4's starting set, counted from the files and not from
 * GATE_IDS, so a shorter list in code cannot shrink what is checked.
 * Since phase 1 the registry has its own floor: in the production scope the
 * four required fields of rule 7 (project name, project type, city, country)
 * must each exist (`required-field-missing`), so an empty or partial field
 * list fails too.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  PRODUCTION_GATES_DIR,
  gateSetProblems,
  loadGateDefinitions,
  parseGateFile,
  type GateDefinition,
} from '@sovitech/registry/gates';
import {
  loadProductionRegistry,
  runSensitivityTest,
  validateRegistry,
  type SensitivitySuite,
} from '@sovitech/registry/validation';
import type { CheckResult } from '../types';
import { loadSensitivitySuite } from './sensitivity-suite';

export const NAME = 'registry';

/**
 * The number of gates in prompt 3 section 5.4's starting set. The check reads
 * at least this many gate files; check.test.ts ties the number to the
 * prompt's table and to GATE_IDS.
 */
export const STARTING_SET_SIZE = 18;

export interface RegistryCheckInputs {
  /** The registry as data, before validation. */
  registry: unknown;
  /** Whether packages/registry/gates/ exists. */
  gatesFolderPresent: boolean;
  gates: GateDefinition[];
  /** Problems met while reading the gate files. */
  gateProblems: string[];
  suite: SensitivitySuite | undefined;
}

function productionGates(): { gatesFolderPresent: boolean; gates: GateDefinition[]; gateProblems: string[] } {
  if (!existsSync(PRODUCTION_GATES_DIR)) return { gatesFolderPresent: false, gates: [], gateProblems: [] };
  try {
    return { gatesFolderPresent: true, gates: loadGateDefinitions(PRODUCTION_GATES_DIR), gateProblems: [] };
  } catch (error) {
    return { gatesFolderPresent: true, gates: [], gateProblems: [error instanceof Error ? error.message : String(error)] };
  }
}

/** How a seed treats the repository's gate folder: laid over it (default), in place of it, or as if it were missing. */
type GatesFolderMode = 'overlay' | 'replace' | 'missing';

function gatesFolderMode(dir: string): GatesFolderMode {
  const path = join(dir, 'gates-folder.txt');
  if (!existsSync(path)) return 'overlay';
  const mode = readFileSync(path, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line !== '' && !line.startsWith('#'));
  if (mode === 'replace' || mode === 'missing') return mode;
  throw new Error(`${path}: expected "replace" or "missing", got ${JSON.stringify(mode)}`);
}

export async function repoInputs(): Promise<RegistryCheckInputs> {
  return { registry: loadProductionRegistry(), ...productionGates(), suite: await loadSensitivitySuite() };
}

/**
 * A seeded input: the repository inputs with the seed's files laid over them.
 * - registry.json replaces top-level keys of the production registry;
 * - gates/<id>.yaml replaces or adds that gate;
 * - gates-folder.txt, when present, says `replace` (the seed's gates/ is the
 *   whole gate folder) or `missing` (there is no gate folder at all);
 * - suite.ts, when present, is the sensitivity suite (its default export).
 */
export async function seededInputs(dir: string): Promise<RegistryCheckInputs> {
  const repo = await repoInputs();
  const registryPath = join(dir, 'registry.json');
  const registry = existsSync(registryPath)
    ? { ...(repo.registry as Record<string, unknown>), ...(JSON.parse(readFileSync(registryPath, 'utf8')) as Record<string, unknown>) }
    : repo.registry;

  const mode = gatesFolderMode(dir);
  const gates = new Map(mode === 'overlay' ? repo.gates.map((gate) => [gate.id, gate]) : []);
  const gateProblems = mode === 'overlay' ? [...repo.gateProblems] : [];
  const gatesDir = join(dir, 'gates');
  if (mode !== 'missing' && existsSync(gatesDir)) {
    for (const name of readdirSync(gatesDir).filter((entry) => entry.endsWith('.yaml'))) {
      const path = join(gatesDir, name);
      try {
        const gate = parseGateFile(path, readFileSync(path, 'utf8'));
        gates.set(gate.id, gate);
      } catch (error) {
        gateProblems.push(error instanceof Error ? error.message : String(error));
      }
    }
  }

  const suitePath = join(dir, 'suite.ts');
  const suite = existsSync(suitePath)
    ? ((await import(pathToFileURL(suitePath).href)) as { default: SensitivitySuite }).default
    : undefined;

  return { registry, gatesFolderPresent: mode === 'missing' ? false : repo.gatesFolderPresent, gates: [...gates.values()], gateProblems, suite };
}

/** An empty or partial scope fails: the check never passes over fewer gates than the starting set. */
function scopeProblems(inputs: RegistryCheckInputs): string[] {
  if (!inputs.gatesFolderPresent) {
    return [
      `packages/registry/gates/ is missing, so there is no gate to check; prompt 3 section 5.4 keeps its ${STARTING_SET_SIZE} gates there`,
    ];
  }
  if (inputs.gates.length < STARTING_SET_SIZE) {
    return [
      `${inputs.gates.length} gate files read, fewer than the ${STARTING_SET_SIZE} of prompt 3 section 5.4's starting set: the check does not pass on a smaller scope`,
    ];
  }
  return [];
}

/** Runs the check on these inputs. */
export function runRegistry(inputs: RegistryCheckInputs): CheckResult {
  const problems: string[] = [];
  const validation = validateRegistry(inputs.registry, { scope: 'production' });
  problems.push(...validation.problems.map((problem) => `registry: ${problem.at}: [${problem.code}] ${problem.message}`));

  problems.push(...scopeProblems(inputs).map((line) => `scope: ${line}`));
  problems.push(...inputs.gateProblems.map((line) => `gates: ${line}`));
  problems.push(...gateSetProblems(inputs.gates).map((line) => `gates: ${line}`));

  const registry = validation.registry;
  let sensitivity = 'not run (the registry is malformed)';
  if (registry !== undefined) {
    const questions = registry.questions.length;
    if (questions === 0) {
      sensitivity = 'no question registered yet';
    } else if (inputs.suite === undefined) {
      sensitivity = `${questions} questions, not run`;
      problems.push(
        `sensitivity: the registry holds ${questions} questions but no sensitivity suite exists ` +
          '(tools/checks/registry/sensitivity-suite.ts returns none): no question may stand without the test (rule 6)',
      );
    } else {
      const report = runSensitivityTest(registry, inputs.suite);
      problems.push(...report.suiteProblems.map((line) => `sensitivity: ${line}`));
      for (const outcome of report.outcomes.filter((item) => !item.ok)) {
        problems.push(`sensitivity: ${outcome.questionId} / ${outcome.fieldKey}: ${outcome.problem ?? 'failed'}`);
      }
      const passed = report.outcomes.filter((item) => item.ok).length;
      sensitivity = `${passed} of ${report.outcomes.length} question fields change a declared output`;
    }
  }

  const counts =
    registry === undefined
      ? 'registry malformed'
      : `${registry.fields.length} fields, ${registry.questions.length} questions, ${registry.formulas.length} formula signatures, ${registry.datasets.length} datasets`;
  const summary =
    problems.length === 0
      ? `${counts}; ${inputs.gates.length} gates; validation passed; sensitivity test: ${sensitivity}`
      : `${problems.length} problems (${counts}; sensitivity test: ${sensitivity})`;
  return { name: NAME, ok: problems.length === 0, summary, details: problems.map((line) => `problem: ${line}`) };
}
