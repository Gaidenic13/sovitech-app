/**
 * The gate override for the proposed-behaviour suite (prompt 3 section 5.4).
 * It opens a gate in memory for one test source only, writes no file, leaves
 * the production source closed, and exists only inside the tests/proposed/
 * runner: the runner's setup file (./proposed-runner-setup.ts) takes the gate
 * source module's arming token before the test file loads and arms the module
 * for that file, and nothing else can (phase 0 review, round 2: the VITEST
 * variable was the only barrier; phase 1: the token replaced the check of
 * Vitest's worker global).
 *
 * The positive path runs in a child Vitest process shaped like
 * vitest.proposed.config.ts, in a temporary root; nothing is written to the
 * repository.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../approvals';
import { PRODUCTION_GATES_DIR, productionGateSource, readGate } from '../gates';
import { PROPOSED_RUNNER_SETUP_FILE } from '../gates/source';
import { openGateForTest } from './index';

const TEST_UTILS = join(REPO_ROOT, 'packages', 'registry', 'src', 'test-utils', 'index.ts');
const GATES = join(REPO_ROOT, 'packages', 'registry', 'src', 'gates', 'index.ts');

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function gateFiles(): string {
  return readdirSync(PRODUCTION_GATES_DIR)
    .filter((name) => name.endsWith('.yaml'))
    .sort()
    .map((name) => readFileSync(join(PRODUCTION_GATES_DIR, name), 'utf8'))
    .join('\n');
}

/**
 * A test file for the child run: it records what happened in results/<name>.json. Its
 * afterAll runs after the setup file's (the child config sets `sequence.hooks: 'list'`), so
 * it reads the source once the arming that issued it has ended.
 */
function probeFile(name: string): string {
  const source = join(REPO_ROOT, 'packages', 'registry', 'src', 'gates', 'source.ts');
  return [
    "import { writeFileSync } from 'node:fs';",
    "import { join } from 'node:path';",
    "import { afterAll, it } from 'vitest';",
    `import { openGateForTest } from ${JSON.stringify(TEST_UTILS)};`,
    `import { isProductionSource, isStartupCheckedSource, productionGateSource, readGate } from ${JSON.stringify(GATES)};`,
    `import * as gateSource from ${JSON.stringify(source)};`,
    'function outcome(run) { try { return `ok: ${String(run())}`; } catch (error) { return `refused: ${error.message}`; } }',
    'const result = {};',
    'let source;',
    `it('TEST probe ${name}', () => {`,
    "  result.open = outcome(() => { source = openGateForTest('ifc-values'); return readGate(source, 'ifc-values').open; });",
    "  result.other = outcome(() => readGate(source, 'ifc-geometry').open);",
    "  result.chained = outcome(() => readGate(openGateForTest('ifc-areas', source), 'ifc-areas').open);",
    "  result.production = outcome(() => isProductionSource(source));",
    "  result.startupChecked = outcome(() => isStartupCheckedSource(source));",
    "  result.productionStaysClosed = outcome(() => readGate(productionGateSource(), 'ifc-values').open);",
    "  result.forgedBase = outcome(() => openGateForTest('ifc-values', Object.freeze({ kind: 'production' })));",
    "  result.unknownGate = outcome(() => openGateForTest('no-such-gate'));",
    '  // The token is handed out once, and the setup file took it before this file loaded.',
    "  result.takeAgain = outcome(() => gateSource['takeProposedRunnerToken']());",
    "  result.forgedArm = outcome(() => gateSource.armTestOverrides(Object.freeze(Object.create(null))));",
    "  result.forgedDisarm = outcome(() => gateSource.disarmTestOverrides(Object.freeze(Object.create(null))));",
    "  result.stillArmed = outcome(() => readGate(source, 'ifc-values').open);",
    '});',
    'afterAll(() => {',
    "  result.afterRunner = outcome(() => readGate(source, 'ifc-values').open);",
    `  writeFileSync(join(process.cwd(), 'results', ${JSON.stringify(`${name}.json`)}), JSON.stringify(result));`,
    '});',
    '',
  ].join('\n');
}

/** Runs Vitest in a temporary root holding `files`, with or without the proposed-runner setup file. */
function childRun(files: Record<string, string>, registerSetup: boolean): { status: number | null; output: string; results: Record<string, Record<string, string>> } {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'sovitech-proposed-runner-')));
  roots.push(root);
  mkdirSync(join(root, 'results'));
  writeFileSync(join(root, 'package.json'), '{"type":"module"}\n');
  writeFileSync(
    join(root, 'vitest.config.mjs'),
    `export default { test: { environment: 'node', include: ['tests/**/*.test.ts'], setupFiles: ${JSON.stringify(registerSetup ? [PROPOSED_RUNNER_SETUP_FILE] : [])}, sequence: { hooks: 'list' }, testTimeout: 60000 } };\n`,
  );
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  const child = spawnSync(process.execPath, [join(REPO_ROOT, 'node_modules', 'vitest', 'vitest.mjs'), 'run', '--root', root, '--no-color'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 120_000,
  });
  const results: Record<string, Record<string, string>> = {};
  for (const name of existsSync(join(root, 'results')) ? readdirSync(join(root, 'results')) : []) {
    results[name.replace(/\.json$/, '')] = JSON.parse(readFileSync(join(root, 'results', name), 'utf8')) as Record<string, string>;
  }
  return { status: child.status, output: `${child.stdout}\n${child.stderr}`, results };
}

describe('openGateForTest in the tests/proposed/ runner', () => {
  it('opens one gate on a new test source and nowhere else, and the source is refused once the runner ends', { timeout: 120_000 }, () => {
    const before = gateFiles();
    const run = childRun({ 'tests/proposed/opens.test.ts': probeFile('opens') }, true);
    expect(run.status, run.output).toBe(0);
    expect(run.results['opens']).toEqual({
      open: 'ok: true',
      other: 'ok: false',
      chained: 'ok: true',
      production: 'ok: false',
      startupChecked: 'ok: false',
      productionStaysClosed: 'ok: false',
      forgedBase: expect.stringMatching(/^refused: not a gate source issued by @sovitech\/registry/),
      unknownGate: expect.stringMatching(/^refused: unknown gate "no-such-gate"/),
      takeAgain: expect.stringMatching(/^refused: The arming token of the tests\/proposed\/ runner was already taken/),
      forgedArm: expect.stringMatching(/^refused: armTestOverrides: a gate override is armed only with the arming token/),
      forgedDisarm: expect.stringMatching(/^refused: disarmTestOverrides: a gate override is armed only with the arming token/),
      stillArmed: 'ok: true',
      afterRunner: expect.stringMatching(/^refused: readGate: a test-override gate source exists only inside the tests\/proposed\/ runner.*this module is not armed/),
    });
    expect(gateFiles()).toBe(before);
  });

  it('refuses to arm, so the file fails, when the runner runs a file outside tests/proposed/', { timeout: 120_000 }, () => {
    const run = childRun({ 'tests/guardrails/borrows.test.ts': probeFile('borrows') }, true);
    expect(run.status).not.toBe(0);
    expect(run.output).toMatch(/A gate override is armed only by the tests\/proposed\/ runner: the test file tests\/guardrails\/borrows\.test\.ts is not under tests\/proposed\//);
    // The file's tests never ran, so no override was issued; its afterAll found no source to read.
    expect(run.results['borrows']?.['open']).toBeUndefined();
    expect(run.results['borrows']?.['afterRunner']).toMatch(/^refused: not a gate source issued by @sovitech\/registry/);
  });

  it('refuses the override when the runner does not register the setup file', { timeout: 120_000 }, () => {
    const run = childRun({ 'tests/proposed/unarmed.test.ts': probeFile('unarmed') }, false);
    expect(run.status, run.output).toBe(0);
    expect(run.results['unarmed']?.['open']).toMatch(/^refused: issueTestOverrideSource: .*this module is not armed/);
    // Without the setup file nothing takes the token first; a file that named the hand-out could
    // take it, which the naming pin in ../gates/gates.test.ts and dependency-cruiser refuse statically.
    expect(run.results['unarmed']?.['forgedArm']).toMatch(/^refused: armTestOverrides/);
  });
});

describe('openGateForTest anywhere else', () => {
  it('refuses in this unit runner, whatever VITEST says', () => {
    expect(process.env['VITEST']).toBeDefined();
    expect(() => openGateForTest('ifc-values')).toThrow(/exists only inside the tests\/proposed\/ runner/);
    expect(readGate(productionGateSource(), 'ifc-values').open).toBe(false);
  });

  it('refuses before it reads the base: a forged base is refused too', () => {
    expect(() => openGateForTest('ifc-values', Object.freeze({ kind: 'production' }) as never)).toThrow(/exists only inside the tests\/proposed\/ runner/);
  });
});
