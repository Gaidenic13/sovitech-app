/**
 * The gate override for the proposed-behaviour suite (prompt 3 section 5.4).
 * It opens a gate in memory for one test source only, writes no file, leaves
 * the production source closed, and exists only inside the tests/proposed/
 * runner: the runner's setup file (./proposed-runner-setup.ts) arms the gate
 * source module for the test file it runs, and nothing else does (phase 0
 * review, round 2: the VITEST variable was the only barrier).
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

/** A test file for the child run: it records what happened in results/<name>.json. */
function probeFile(name: string): string {
  return [
    "import { writeFileSync } from 'node:fs';",
    "import { join } from 'node:path';",
    "import { it } from 'vitest';",
    `import { openGateForTest } from ${JSON.stringify(TEST_UTILS)};`,
    `import { isProductionSource, productionGateSource, readGate } from ${JSON.stringify(GATES)};`,
    `import { disarmTestOverrides } from ${JSON.stringify(join(REPO_ROOT, 'packages', 'registry', 'src', 'gates', 'source.ts'))};`,
    'function outcome(run) { try { return `ok: ${String(run())}`; } catch (error) { return `refused: ${error.message}`; } }',
    `it('TEST probe ${name}', () => {`,
    '  const result = {};',
    "  let source;",
    "  result.open = outcome(() => { source = openGateForTest('ifc-values'); return readGate(source, 'ifc-values').open; });",
    "  result.other = outcome(() => readGate(source, 'ifc-geometry').open);",
    "  result.chained = outcome(() => readGate(openGateForTest('ifc-areas', source), 'ifc-areas').open);",
    "  result.production = outcome(() => isProductionSource(source));",
    "  result.productionStaysClosed = outcome(() => readGate(productionGateSource(), 'ifc-values').open);",
    '  disarmTestOverrides();',
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
    `export default { test: { environment: 'node', include: ['tests/**/*.test.ts'], setupFiles: ${JSON.stringify(registerSetup ? [PROPOSED_RUNNER_SETUP_FILE] : [])}, testTimeout: 60000 } };\n`,
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
      productionStaysClosed: 'ok: false',
      afterRunner: expect.stringMatching(/^refused: readGate: a test-override gate source exists only inside the tests\/proposed\/ runner/),
    });
    expect(gateFiles()).toBe(before);
  });

  it('refuses to arm, so the file fails, when the runner runs a file outside tests/proposed/', { timeout: 120_000 }, () => {
    const run = childRun({ 'tests/guardrails/borrows.test.ts': probeFile('borrows') }, true);
    expect(run.status).not.toBe(0);
    expect(run.output).toMatch(/A gate override is armed only by the tests\/proposed\/ runner: the test file tests\/guardrails\/borrows\.test\.ts is not under tests\/proposed\//);
    expect(run.results['borrows']).toBeUndefined();
  });

  it('refuses the override when the runner does not register the setup file', { timeout: 120_000 }, () => {
    const run = childRun({ 'tests/proposed/unarmed.test.ts': probeFile('unarmed') }, false);
    expect(run.status, run.output).toBe(0);
    expect(run.results['unarmed']?.['open']).toMatch(/^refused: issueTestOverrideSource: .*this module is not armed, and the runner does not register/);
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
