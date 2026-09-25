/**
 * Runs every check in tools/checks/<name>/check.ts and prints one table.
 *
 *   tsx tools/checks/run-all.ts                 run every check (`pnpm checks`)
 *   tsx tools/checks/run-all.ts --self-test     run every selftest.ts; each seeded
 *                                               bad input must fail (`pnpm check:selftest`)
 *   options: --only <name>[,<name>...]  --verbose  --json
 *
 * Exits non-zero when any check fails, when an expected check is missing, or,
 * in self-test mode, when a check has no self-test or a seeded input passes.
 */
import { join } from 'node:path';
import { repoRoot } from './lib';
import {
  EXPECTED_CHECKS,
  discoverChecks,
  formatReport,
  missingRows,
  runChecks,
  runSelfTests,
  type Row,
} from './runner';

interface Options {
  selfTest: boolean;
  verbose: boolean;
  json: boolean;
  only: string[] | undefined;
}

function parseArgs(argv: readonly string[]): Options {
  const options: Options = { selfTest: false, verbose: false, json: false, only: undefined };
  for (let position = 0; position < argv.length; position += 1) {
    const arg = argv[position];
    if (arg === '--self-test') options.selfTest = true;
    else if (arg === '--verbose') options.verbose = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--only') {
      const value = argv[position + 1];
      if (value === undefined) throw new Error('--only needs a comma-separated list of check names.');
      options.only = value.split(',').map((name) => name.trim()).filter((name) => name !== '');
      position += 1;
    } else if (arg === '--') continue;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

async function main(): Promise<number> {
  const options = parseArgs(process.argv.slice(2));
  const checksDir = join(repoRoot, 'tools', 'checks');
  const only = options.only;
  const discovered = discoverChecks(checksDir).filter((entry) => only === undefined || only.includes(entry.name));
  const expected = only === undefined ? EXPECTED_CHECKS : EXPECTED_CHECKS.filter((name) => only.includes(name));
  const unknown = only === undefined ? [] : only.filter((name) => !discovered.some((entry) => entry.name === name) && !expected.includes(name));

  const rows: Row[] = options.selfTest ? await runSelfTests(discovered) : await runChecks(discovered);
  rows.push(...missingRows(discovered.map((entry) => entry.name), expected));
  for (const name of unknown) {
    rows.push({ name, ok: false, summary: `no such check: tools/checks/${name}/check.ts`, details: [], noAutomatedCheckYet: [], pending: [] });
  }
  if (rows.length === 0) {
    rows.push({ name: '(none)', ok: false, summary: 'no checks found under tools/checks/*/check.ts', details: [], noAutomatedCheckYet: [], pending: [] });
  }

  if (options.json) {
    process.stdout.write(`${JSON.stringify({ mode: options.selfTest ? 'self-test' : 'check', rows }, null, 2)}\n`);
  } else {
    const title = options.selfTest
      ? 'Self-test: each check against its seeded bad inputs (every input must fail)'
      : 'Checks (tools/checks)';
    process.stdout.write(`${formatReport(rows, { verbose: options.verbose, title })}\n`);
  }
  return rows.every((row) => row.ok) ? 0 : 1;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    process.stderr.write(`${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);
    process.exitCode = 2;
  },
);
