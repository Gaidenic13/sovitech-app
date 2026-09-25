/**
 * Gate sources and the one function that reads a gate (prompt 3 section 5.4).
 *
 * A source is issued only inside this module, and nothing that issues one is
 * exported with a kind or a gate list chosen by the caller:
 * - productionGateSource() builds the production source only from the gate
 *   files in packages/registry/gates/ (a fixed path), and fails closed: when a
 *   gate file says open, no source is built unless that gate passes the
 *   approval check against the repository documents;
 * - assertGatesStartupSafe() reads those files again, runs the gate part of
 *   the loosening check and, only when it passes, issues a production source
 *   marked as start-up checked (the one kind of source the API accepts);
 * - issueTestOverrideSource() is the one internal path the test-utils entry
 *   uses. It can only issue kind 'test-override', over a copy of a source this
 *   module issued, with one gate of the starting set open. The gates entry does
 *   not re-export it, dependency-cruiser keeps every file outside the registry
 *   package from importing this module by path, and a unit test keeps every
 *   registry file except the gates entry and test-utils from importing it.
 *
 * readGate() refuses any object this module did not issue.
 *
 * A test-override source exists only inside the runner of tests/proposed/
 * (phase 0 review, round 2: a computed dynamic import reached
 * issueTestOverrideSource outside Vitest, and readGate read the gate open).
 * Issuing one, and reading one, is refused unless this module was armed for
 * the test file that runs now. Only the proposed runner's setup file,
 * packages/registry/src/test-utils/proposed-runner-setup.ts, arms it, and
 * arming checks the runner itself: a Vitest worker whose current file is under
 * tests/proposed/ of its root and whose setup files include that file. No
 * environment variable or config value arms it.
 */
import { realpathSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRepoApprovalContext, type ApprovalContext } from '../approvals';
import { PRODUCTION_GATES_DIR, gateSetProblems, loadGateDefinitions } from './load';
import { isGateId, type GateDefinition, type GateId, type WaitsForItem } from './schema';
import { verifyGates } from './verify';

export type GateSourceKind = 'production' | 'test-override';

/** An opaque set of gates. Only this module creates one. */
export interface GateSource {
  readonly kind: GateSourceKind;
}

/** What code learns from a gate: whether it is open, and what it waits for while closed. */
export interface GateReading {
  readonly id: GateId;
  readonly open: boolean;
  readonly closedBehaviour: string;
  readonly waitsFor: readonly Readonly<Pick<WaitsForItem, 'item' | 'kind' | 'dId'>>[];
}

export class GateApprovalError extends Error {
  override name = 'GateApprovalError';
}

/** Every source this module issued, with its readings. Module-private. */
const issued = new WeakMap<GateSource, ReadonlyMap<GateId, GateReading>>();

/** Production sources issued by assertGatesStartupSafe() after the check passed. Module-private. */
const startupChecked = new WeakSet<GateSource>();

function toReading(gate: GateDefinition): GateReading {
  return Object.freeze({
    id: gate.id,
    open: gate.open,
    closedBehaviour: gate.closedBehaviour,
    waitsFor: Object.freeze(gate.waitsFor.map((item) => Object.freeze({ item: item.item, kind: item.kind, dId: item.dId }))),
  });
}

/** Module-private: the only place a source object is created. */
function issue(kind: GateSourceKind, readings: Iterable<GateReading>): GateSource {
  const source: GateSource = Object.freeze({ kind });
  issued.set(source, new Map([...readings].map((reading) => [reading.id, reading])));
  return source;
}

function readingsOf(source: GateSource): ReadonlyMap<GateId, GateReading> {
  const readings = issued.get(source);
  if (readings === undefined) throw new TypeError('not a gate source issued by @sovitech/registry');
  return readings;
}

/**
 * The fail-closed test behind the production source, on definitions and an
 * approval context. It issues nothing: it returns the definitions unchanged
 * when every gate of the starting set is present and no gate is open without
 * approval, and throws otherwise. The approval documents are read only when a
 * gate is open.
 */
export function checkProductionDefinitions(
  definitions: readonly GateDefinition[],
  loadContext: () => ApprovalContext,
): readonly GateDefinition[] {
  const missing = gateSetProblems(definitions);
  if (missing.length > 0) throw new GateApprovalError(missing.join('\n'));
  if (definitions.some((gate) => gate.open)) {
    const problems = verifyGates(definitions, loadContext());
    if (problems.length > 0) {
      throw new GateApprovalError(`A gate is open without approval, so no gate source is built:\n${problems.join('\n')}`);
    }
  }
  return definitions;
}

let production: GateSource | undefined;

/** The production gate source: built once, only from packages/registry/gates/. */
export function productionGateSource(): GateSource {
  production ??= issue(
    'production',
    checkProductionDefinitions(loadGateDefinitions(PRODUCTION_GATES_DIR), () => loadRepoApprovalContext()).map(toReading),
  );
  return production;
}

/**
 * For the API server and the demo seed at start-up (prompt 3 section 5.4:
 * they "refuse to start while any gate fails this check"). Reads the gate
 * files, and throws when a gate of the starting set is missing, when any gate
 * is open without approval, or when any approval reference does not resolve.
 * Otherwise it returns a new production source over exactly the definitions it
 * checked, marked as start-up checked (see isStartupCheckedSource).
 */
export function assertGatesStartupSafe(): GateSource {
  const definitions = loadGateDefinitions(PRODUCTION_GATES_DIR);
  const problems = [...gateSetProblems(definitions), ...verifyGates(definitions, loadRepoApprovalContext())];
  if (problems.length > 0) {
    throw new GateApprovalError(`Refusing to start: a gate fails the loosening check.\n${problems.join('\n')}`);
  }
  const source = issue('production', definitions.map(toReading));
  startupChecked.add(source);
  return source;
}

export function isProductionSource(source: GateSource): boolean {
  return issued.has(source) && source.kind === 'production';
}

/** True only for a source that assertGatesStartupSafe() returned. */
export function isStartupCheckedSource(source: GateSource): boolean {
  return startupChecked.has(source) && isProductionSource(source);
}

// ---------------------------------------------------------------------------
// The proposed runner: where a test-override source may exist.

/** The setup file of the tests/proposed/ runner (vitest.proposed.config.ts `setupFiles`), the one caller of the arming function. */
export const PROPOSED_RUNNER_SETUP_FILE: string = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'test-utils', 'proposed-runner-setup.ts');

/** The test file this module is armed for, while the proposed runner runs it. Module-private. */
let armedFor: string | undefined;

function realPath(path: string): string | undefined {
  try {
    return realpathSync(path);
  } catch {
    return undefined;
  }
}

/**
 * The tests/proposed/ file the current Vitest worker runs, when the worker is
 * the proposed runner: its current file lies under tests/proposed/ of the
 * worker's root, and its setup files include PROPOSED_RUNNER_SETUP_FILE.
 * Undefined anywhere else, a plain Node process included. It reads Vitest's
 * worker state; no environment variable is read.
 */
function proposedRunnerTestFile(): { file?: string; refusal?: string } {
  const worker: unknown = Reflect.get(globalThis, '__vitest_worker__');
  if (typeof worker !== 'object' || worker === null) return { refusal: 'this process is not a Vitest worker' };
  const file: unknown = Reflect.get(worker, 'filepath');
  const config: unknown = Reflect.get(worker, 'config');
  const root: unknown = typeof config === 'object' && config !== null ? Reflect.get(config, 'root') : undefined;
  const setupFiles: unknown = typeof config === 'object' && config !== null ? Reflect.get(config, 'setupFiles') : undefined;
  if (typeof file !== 'string' || !isAbsolute(file) || typeof root !== 'string') return { refusal: 'the Vitest worker names no test file or root' };
  const inside = relative(root, file);
  if (!inside.startsWith(`tests${sep}proposed${sep}`) || inside.split(sep).includes('..')) {
    return { refusal: `the test file ${inside} is not under tests/proposed/` };
  }
  const setup = realPath(PROPOSED_RUNNER_SETUP_FILE);
  const registered = Array.isArray(setupFiles) && setupFiles.some((entry) => typeof entry === 'string' && setup !== undefined && realPath(entry) === setup);
  if (!registered) return { refusal: 'the runner does not register packages/registry/src/test-utils/proposed-runner-setup.ts in its setupFiles' };
  return { file };
}

/**
 * Internal, for packages/registry/src/test-utils/proposed-runner-setup.ts
 * only: arms this module for the tests/proposed/ file the Vitest worker runs
 * now. Throws anywhere else, and changes nothing then.
 */
export function armTestOverridesForProposedRunner(): void {
  const runner = proposedRunnerTestFile();
  if (runner.file === undefined) {
    throw new GateApprovalError(`A gate override is armed only by the tests/proposed/ runner: ${runner.refusal ?? 'unknown runner'}.`);
  }
  armedFor = runner.file;
}

/** Internal, for the same setup file: disarms this module after the test file ran. */
export function disarmTestOverrides(): void {
  armedFor = undefined;
}

/** Throws unless this module is armed for the tests/proposed/ file the proposed runner runs now. */
function assertInsideProposedRunner(action: string): void {
  const runner = proposedRunnerTestFile();
  if (armedFor === undefined || runner.file !== armedFor) {
    throw new GateApprovalError(
      `${action}: a test-override gate source exists only inside the tests/proposed/ runner ` +
        `(vitest.proposed.config.ts with packages/registry/src/test-utils/proposed-runner-setup.ts in setupFiles); ` +
        `${armedFor === undefined ? 'this module is not armed' : 'the armed test file is not the one running'}` +
        `${runner.refusal === undefined ? '' : `, and ${runner.refusal}`}. No environment variable opens a gate (prompt 3 section 5.4).`,
    );
  }
}

/**
 * Internal, for the test-utils entry only: a new source of kind
 * 'test-override', equal to `base` (a source this module issued) with the gate
 * `id` open. It never issues a production source, never reads a file, and
 * leaves `base` as it is. Refused outside the tests/proposed/ runner.
 */
export function issueTestOverrideSource(base: GateSource, id: GateId): GateSource {
  assertInsideProposedRunner('issueTestOverrideSource');
  const readings = readingsOf(base);
  if (!isGateId(id) || !readings.has(id)) throw new RangeError(`unknown gate "${String(id)}"`);
  return issue(
    'test-override',
    [...readings.values()].map((reading) => (reading.id === id ? Object.freeze({ ...reading, open: true }) : reading)),
  );
}

/**
 * The one way code reads a gate. A test-override source is read only inside
 * the tests/proposed/ runner that issued it; anywhere else the read throws.
 */
export function readGate(source: GateSource, id: GateId): GateReading {
  const readings = readingsOf(source);
  if (source.kind !== 'production') assertInsideProposedRunner('readGate');
  if (!isGateId(id)) throw new RangeError(`unknown gate "${String(id)}"`);
  const reading = readings.get(id);
  if (reading === undefined) throw new RangeError(`unknown gate "${id}" in this source`);
  return reading;
}
