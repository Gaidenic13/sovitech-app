/**
 * Writes one pending stub per docs/guardrails.md section 7 id that has no case
 * file: tests/guardrails/<ID>.test.ts for T cases, evals/guardrails/<ID>.yaml
 * for E cases. Each stub reports "no automated check yet".
 *
 * NOT RUN while D-33 is open. The PRD's interim for D-33 creates no pending
 * stub, and whether a stub counts as a case file under section 7 is for the
 * approver (docs/adr/0003-index-check-convention.md, "How to reverse"). Even if
 * it were run, the index check would still list every stub's id as "no
 * automated check yet" and fail: a stub never counts as a case.
 *
 *   tsx tools/checks/index/generate-stubs.ts           dry run: lists what it would write
 *   tsx tools/checks/index/generate-stubs.ts --write   writes the stubs (only after the ruling above)
 *
 * It never overwrites a file, and it refuses to plan while the section 7 table
 * has problems.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { repoRoot } from '../lib';
import { STUB_MARKER } from './case-files';
import { caseFilePath, type CaseType } from './guardrail-index';
import { buildIndexReport } from './index-check';

export interface PlannedStub {
  id: string;
  type: CaseType;
  /** Root-relative path of the stub. */
  path: string;
  content: string;
}

export interface StubPlan {
  stubs: PlannedStub[];
  /** Why nothing was planned, when the table could not be read. */
  problems: string[];
}

/** File operations on absolute paths; tests pass a fake. */
export interface StubWriter {
  exists(path: string): boolean;
  ensureDir(path: string): void;
  write(path: string, content: string): void;
}

const ADR = 'docs/adr/0003-index-check-convention.md';

/** The text of one stub. The index check classifies it as a stub, never as a case. */
export function renderStub(entry: { id: string; type: CaseType }): string {
  const about = [
    `docs/guardrails.md section 7, case ${entry.id} (${entry.type}): pending stub, no automated check yet.`,
    'Written by tools/checks/index/generate-stubs.ts. The index check lists this id as',
    `"no automated check yet" until a real case replaces this whole file, marker included (${ADR}).`,
  ];
  if (entry.type === 'T') {
    return [
      '/**',
      ` * ${STUB_MARKER}`,
      ...about.map((line) => ` * ${line}`),
      ' */',
      "import { test } from 'vitest';",
      '',
      `test.todo('${entry.id} · pending stub: no automated check yet');`,
      '',
    ].join('\n');
  }
  return [`# ${STUB_MARKER}`, ...about.map((line) => `# ${line}`), `id: ${entry.id}`, 'status: stub', ''].join('\n');
}

/** Plans a stub for each section 7 id with no case file in the folder of its type. */
export async function planStubs(root: string = repoRoot): Promise<StubPlan> {
  const report = await buildIndexReport(root);
  if (report.index.problems.length > 0) return { stubs: [], problems: report.index.problems };
  const missing = new Set(report.missing);
  const stubs = report.index.cases
    .filter((entry) => missing.has(entry.id))
    .map((entry) => ({ id: entry.id, type: entry.type, path: caseFilePath(entry), content: renderStub(entry) }));
  return { stubs, problems: [] };
}

const diskWriter: StubWriter = {
  exists: (path) => existsSync(path),
  ensureDir: (path) => {
    mkdirSync(path, { recursive: true });
  },
  write: (path, content) => {
    writeFileSync(path, content, { encoding: 'utf8', flag: 'wx' });
  },
};

/** Writes the planned stubs under `root`, skipping any path that already exists. */
export function writeStubs(
  root: string,
  stubs: readonly PlannedStub[],
  writer: StubWriter = diskWriter,
): { written: string[]; skipped: string[] } {
  const written: string[] = [];
  const skipped: string[] = [];
  for (const stub of stubs) {
    const absolute = join(root, stub.path);
    if (writer.exists(absolute)) {
      skipped.push(stub.path);
      continue;
    }
    writer.ensureDir(dirname(absolute));
    writer.write(absolute, stub.content);
    written.push(stub.path);
  }
  return { written, skipped };
}

async function main(argv: readonly string[]): Promise<number> {
  const unknown = argv.filter((arg) => arg !== '--write' && arg !== '--');
  if (unknown.length > 0) {
    process.stderr.write(`Unknown argument: ${unknown.join(' ')}\nUsage: tsx tools/checks/index/generate-stubs.ts [--write]\n`);
    return 2;
  }
  const plan = await planStubs(repoRoot);
  if (plan.problems.length > 0) {
    process.stderr.write(`The section 7 table has problems, so no stub is planned:\n${plan.problems.join('\n')}\n`);
    return 1;
  }
  if (!argv.includes('--write')) {
    process.stdout.write(
      `Dry run: ${plan.stubs.length} stubs would be written:\n${plan.stubs.map((stub) => `  ${stub.path}`).join('\n')}\n` +
        `Nothing written. Pass --write only once the owner has decided D-33 and the approver has ruled that a ` +
        `stub counts as a case file (${ADR}).\n`,
    );
    return 0;
  }
  const outcome = writeStubs(repoRoot, plan.stubs);
  process.stdout.write(
    `Wrote ${outcome.written.length} stubs; skipped ${outcome.skipped.length} existing files.\n` +
      `The index check still lists each stub's id as "no automated check yet" until ${ADR} is changed as it describes.\n`,
  );
  return 0;
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && import.meta.url === pathToFileURL(resolve(invokedPath)).href) {
  main(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (error: unknown) => {
      process.stderr.write(`${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);
      process.exitCode = 2;
    },
  );
}
