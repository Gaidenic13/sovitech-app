/**
 * `pnpm fixtures:regenerate [--sandbox]`: runs the Python fixture generators twice and checks
 * that both runs write the same bytes, and that every file is the one fixtures/manifest.json
 * lists (prompt 3 section 8, "Fixtures": the fixtures regenerate byte-identical; phase 0,
 * "Next": a double run for determinism, and the regeneration in the no-network container).
 *
 * - Without `--sandbox`: the extractor venv's Python (services/extractor/.venv), as the
 *   fixture-manifest check runs it, with the same restricted environment.
 * - With `--sandbox`: the fixtures image (services/extractor/Dockerfile, target `fixtures`,
 *   built locally as sovitech-fixtures:dev; ADR 0018) with no network, a read-only root, every
 *   capability dropped, the fixtures folder mounted read-only and one writable output folder.
 *   Under Colima the output folder sits under the home folder, which the Docker VM shares.
 *
 * The TypeScript generators (fixtures/datasets, fixtures/demo, fixtures/evals) are reproduced
 * by the fixture-manifest check in `pnpm check`. Nothing is written to the repository; the
 * output folders are removed. It prints paths and hashes only, never a fixture's text.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DRIVER = 'fixtures/generators/build_all.py';
const IMAGE = 'sovitech-fixtures:dev';
const sandbox = process.argv.slice(2).includes('--sandbox');

interface ManifestFile {
  readonly path: string;
  readonly sha256: string;
  readonly generator: string;
}

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function filesUnder(folder: string): string[] {
  if (!existsSync(folder)) return [];
  return readdirSync(folder, { recursive: true, encoding: 'utf8' })
    .filter((entry) => statSync(join(folder, entry)).isFile())
    .map((entry) => entry.split('\\').join('/'))
    .sort();
}

/** The Python generators' listed files (the perf profile is git-ignored and never listed). */
const listed = (JSON.parse(readFileSync(join(ROOT, 'fixtures/manifest.json'), 'utf8')) as { files: ManifestFile[] }).files.filter((file) =>
  file.generator.endsWith('.py'),
);

/** Where the runs write: under the home folder for the sandbox (Colima shares only that), else the system's temp folder. */
const base = sandbox ? join(process.platform === 'darwin' ? join(homedir(), 'Library', 'Caches') : tmpdir()) : tmpdir();
mkdirSync(base, { recursive: true });
const work = mkdtempSync(join(base, 'sovitech-fixtures-regenerate-'));

function run(out: string): void {
  mkdirSync(out, { recursive: true });
  const command = sandbox
    ? {
        file: 'docker',
        args: [
          'run',
          '--rm',
          '--network',
          'none',
          '--read-only',
          '--cap-drop',
          'ALL',
          '--security-opt',
          'no-new-privileges',
          '--tmpfs',
          '/tmp:rw,noexec,nosuid,size=64m',
          '-e',
          'SOURCE_DATE_EPOCH=0',
          '-e',
          'TZ=UTC',
          '-v',
          `${join(ROOT, 'fixtures')}:/repo/fixtures:ro`,
          '-v',
          `${out}:/out`,
          '--entrypoint',
          'python',
          IMAGE,
          '-I',
          '-B',
          `/repo/${DRIVER}`,
          '--out',
          '/out',
        ],
      }
    : { file: join(ROOT, 'services/extractor/.venv/bin/python'), args: ['-I', '-B', DRIVER, '--out', out] };
  // The image runs as its own unprivileged account (uid 10001): the output folder is the one place it writes.
  if (sandbox) chmodSync(out, 0o777);
  const result = spawnSync(command.file, command.args, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 600_000,
    env: { PATH: process.env['PATH'] ?? '', HOME: process.env['HOME'] ?? '', TMPDIR: out, LANG: 'C.UTF-8', TZ: 'UTC', SOURCE_DATE_EPOCH: '0', PYTHONHASHSEED: '0' },
  });
  if (result.error !== undefined || result.status !== 0) {
    throw new Error(`${sandbox ? `the ${IMAGE} sandbox` : 'the venv Python'} failed to run ${DRIVER} (${result.error?.message ?? `exit ${String(result.status)}`})`);
  }
}

const problems: string[] = [];
try {
  const first = join(work, 'run-1');
  const second = join(work, 'run-2');
  run(first);
  run(second);
  const produced = filesUnder(first);
  const again = filesUnder(second);
  if (produced.join('\n') !== again.join('\n')) problems.push('the two runs wrote different sets of files');
  for (const path of produced) {
    if (existsSync(join(second, path)) && sha256(join(first, path)) !== sha256(join(second, path))) problems.push(`${path}: the two runs wrote different bytes`);
  }
  for (const file of listed) {
    const path = join(first, file.path);
    if (!existsSync(path)) problems.push(`${file.path}: not produced`);
    else if (sha256(path) !== file.sha256) problems.push(`${file.path}: differs from the SHA-256 in fixtures/manifest.json`);
    else if (sha256(path) !== sha256(join(ROOT, file.path))) problems.push(`${file.path}: differs from the committed file`);
  }
  const unlisted = produced.filter((path) => !listed.some((file) => file.path === path));
  for (const path of unlisted) problems.push(`${path}: produced but not listed in fixtures/manifest.json`);
  process.stdout.write(
    `${sandbox ? `Sandbox (${IMAGE}, no network)` : 'Local venv'}: ${String(produced.length)} files written twice by ${DRIVER}; ${String(listed.length)} listed in fixtures/manifest.json.\n`,
  );
} finally {
  rmSync(work, { recursive: true, force: true });
}
if (problems.length > 0) {
  process.stdout.write(`${problems.map((problem) => `  problem: ${problem}`).join('\n')}\n${String(problems.length)} problems.\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Byte-identical: both runs, the manifest and the committed files agree (${relative(ROOT, join(ROOT, 'fixtures'))}/).\n`);
}
