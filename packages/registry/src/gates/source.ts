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
 * Issuing one, and reading one, is refused unless this module is armed, and a
 * source is read only in the arming that issued it. Arming takes this module's
 * private token, which it hands out once per module instance, and only the
 * proposed runner's setup file, packages/registry/src/test-utils/proposed-runner-setup.ts,
 * takes it: it runs before the test file it serves, so in that runner it always
 * takes the token first. (Phase 1 replaced the check of Vitest's worker global,
 * which code in the same process could forge, with this token; the round 2
 * residual.) No environment variable or config value arms it.
 */
import { dirname, resolve } from 'node:path';
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

/** The setup file of the tests/proposed/ runner (vitest.proposed.config.ts `setupFiles`), the one module that takes the arming token. */
export const PROPOSED_RUNNER_SETUP_FILE: string = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'test-utils', 'proposed-runner-setup.ts');

/** The arming token's type. Only this module creates the one value of it. */
export interface ProposedRunnerToken {
  readonly __proposedRunnerToken: never;
}

/** The arming token: module-private, handed out once per module instance (takeProposedRunnerToken). */
const RUNNER_TOKEN: ProposedRunnerToken = Object.freeze(Object.create(null) as ProposedRunnerToken);

/** Whether the token was handed out in this module instance. Module-private. */
let tokenTaken = false;

/** The arming now in force: a fresh object each time the module is armed, undefined while it is not. Module-private. */
let session: object | undefined;

/** The arming that issued each test-override source. Module-private. */
const issuedIn = new WeakMap<GateSource, object>();

/**
 * Internal, for packages/registry/src/test-utils/proposed-runner-setup.ts only:
 * this module's arming token. It is handed out once per module instance, and a
 * second call throws. The proposed runner loads its setup file before the test
 * file it serves (and, with Vitest's default isolation, gives each test file a
 * fresh module instance), so there the setup file always takes the token first
 * and no test file or helper can take it after. A registry unit test keeps every
 * other file of the package from naming this function, and dependency-cruiser
 * keeps every file outside the package from importing this module.
 */
export function takeProposedRunnerToken(): ProposedRunnerToken {
  if (tokenTaken) {
    throw new GateApprovalError(
      "The arming token of the tests/proposed/ runner was already taken in this module instance: only the runner's setup file " +
        '(packages/registry/src/test-utils/proposed-runner-setup.ts) takes it, before any test file loads.',
    );
  }
  tokenTaken = true;
  return RUNNER_TOKEN;
}

function assertToken(token: unknown, action: string): void {
  if (token !== RUNNER_TOKEN) {
    throw new GateApprovalError(
      `${action}: a gate override is armed only with the arming token of the tests/proposed/ runner, which its setup file ` +
        '(packages/registry/src/test-utils/proposed-runner-setup.ts) alone takes. No environment variable opens a gate (prompt 3 section 5.4).',
    );
  }
}

/**
 * Internal, for the same setup file: arms this module for the test file the
 * runner runs now, with the token. Each arming is a new session; sources issued
 * in an earlier one are no longer read.
 */
export function armTestOverrides(token: ProposedRunnerToken): void {
  assertToken(token, 'armTestOverrides');
  session = Object.freeze({});
}

/** Internal, for the same setup file: disarms this module after the test file ran. */
export function disarmTestOverrides(token: ProposedRunnerToken): void {
  assertToken(token, 'disarmTestOverrides');
  session = undefined;
}

/** Throws unless this module is armed, and, for a source, unless the arming in force issued it. */
function assertInsideProposedRunner(action: string, source?: GateSource): void {
  const refusal =
    session === undefined
      ? 'this module is not armed'
      : source !== undefined && issuedIn.get(source) !== session
        ? 'the source was issued in an arming that has ended'
        : undefined;
  if (refusal !== undefined) {
    throw new GateApprovalError(
      `${action}: a test-override gate source exists only inside the tests/proposed/ runner ` +
        `(vitest.proposed.config.ts with packages/registry/src/test-utils/proposed-runner-setup.ts in setupFiles), while its setup file ` +
        `has armed this module for the test file that runs; ${refusal}. No environment variable opens a gate (prompt 3 section 5.4).`,
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
  const source = issue(
    'test-override',
    [...readings.values()].map((reading) => (reading.id === id ? Object.freeze({ ...reading, open: true }) : reading)),
  );
  if (session !== undefined) issuedIn.set(source, session);
  return source;
}

/**
 * The one way code reads a gate. A test-override source is read only inside
 * the tests/proposed/ runner, in the arming that issued it; anywhere else the read throws.
 */
export function readGate(source: GateSource, id: GateId): GateReading {
  const readings = readingsOf(source);
  if (source.kind !== 'production') assertInsideProposedRunner('readGate', source);
  if (!isGateId(id)) throw new RangeError(`unknown gate "${String(id)}"`);
  const reading = readings.get(id);
  if (reading === undefined) throw new RangeError(`unknown gate "${id}" in this source`);
  return reading;
}
