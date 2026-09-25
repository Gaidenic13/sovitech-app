/**
 * The loosening check's inputs and report (docs/guardrails.md section 10,
 * "Versioning"; prompt 3 sections 5.2 and 5.4). Three parts:
 * - the registry and the gates against the last approved snapshot or
 *   "unapproved baseline v0" (evaluateLoosening in @sovitech/registry/validation);
 * - the approval tripwire: the build branch and the working tree may not add or
 *   edit an approver-table row, an "Approved by" cell that names someone, or an
 *   owner decision (approvalDocumentEdits in @sovitech/registry/gates; approvals
 *   themselves are read from git, at the merge base of main and HEAD);
 * - the exception lists against their part of the snapshot (./exception-lists.ts).
 * This file loads the repository or a seeded input and turns the reports into
 * one CheckResult.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  REPO_ROOT,
  loadRepoApprovalContext,
  parseApprovalContext,
  parseGateFile,
  repoApprovalDocumentEdits,
  type ApprovalContext,
  type GateDefinition,
} from '@sovitech/registry/gates';
import {
  evaluateLoosening,
  loadProductionRegistry,
  loadRepoLooseningInputs,
  parseRegistryShape,
  snapshotSchema,
  type LooseningInputs,
  type Snapshot,
} from '@sovitech/registry/validation';
import type { CheckResult } from '../types';
import {
  evaluateExceptionLists,
  repoExceptionListInputs,
  sha256,
  type CurrentList,
  type ExceptionListInputs,
  type ExceptionListSnapshot,
} from './exception-lists';

export const NAME = 'loosening';

/** Everything the check reads. */
export interface CheckInputs {
  loosening: LooseningInputs;
  /** Tripwire problems: approval records the build branch or the working tree added or edited. */
  approvalEdits: string[];
  exceptionLists: ExceptionListInputs;
}

/** The repository's inputs. */
export async function repoCheckInputs(): Promise<CheckInputs> {
  const loosening = loadRepoLooseningInputs();
  return {
    loosening,
    approvalEdits: repoApprovalDocumentEdits(REPO_ROOT),
    exceptionLists: await repoExceptionListInputs(loosening.approvals),
  };
}

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
}

function mergeByKey(base: unknown, overlay: unknown): Record<string, unknown> {
  return { ...(base as Record<string, unknown>), ...(overlay as Record<string, unknown>) };
}

// ---------------------------------------------------------------------------
// Git seeds: a temporary repository with main, a build branch and a working tree.

const SEED_COMMITTER = ['-c', 'user.name=Seed (synthetic)', '-c', 'user.email=seed@example.invalid', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null'];

function seedGit(root: string, args: readonly string[]): void {
  const env: NodeJS.ProcessEnv = {};
  for (const [name, value] of Object.entries(process.env)) if (!name.startsWith('GIT_')) env[name] = value;
  const result = spawnSync('git', [...SEED_COMMITTER, '-C', root, ...args], { encoding: 'utf8', env });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed in a seeded repository: ${result.stderr}`);
}

/** Minimal documents every seeded repository starts from; a seed's layers replace them. */
const SEED_DOCUMENTS: Record<string, string> = {
  'docs/guardrails.md': [
    '# Guardrails (seeded, synthetic)',
    '',
    '## 10. Keeping the guardrails improving',
    '',
    '| Approver | Role | Since |',
    '|----------|------|-------|',
    '| *(to be named by the product owner)* | Product owner | |',
    '',
    '### Change log',
    '',
    '| Version | Date | Change | Approved by |',
    '|---------|------|--------|-------------|',
    "| 1.0 | 2026-01-01 | First version. | Pending the product owner's review |",
    '',
  ].join('\n'),
  'docs/product/prd.md': '# PRD (seeded, synthetic)\n\n## 15. Open decisions\n\n## 16. Glossary\n',
  'docs/build-readiness.md': '# Build readiness (seeded, synthetic)\n\n## 5. Decisions for the product owner\n\n## 6. Facts\n',
};

function layer(from: string, to: string): void {
  if (existsSync(from)) cpSync(from, to, { recursive: true, force: true });
}

/**
 * Builds a temporary repository from a seed's `git/` folder and returns the
 * approval context and tripwire problems read from it, as the repository's are:
 * - `git/main/` is committed on main (over SEED_DOCUMENTS);
 * - `git/branch/` is committed on the build branch, cut from main;
 * - `git/main-after/` is committed on main after the branch point (not merged);
 * - `git/worktree/` is written on the build branch and not committed.
 * The repository is removed afterwards; nothing is written to this repository.
 */
export function gitSeedApprovals(gitDir: string): { approvals: ApprovalContext; approvalEdits: string[] } {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'sovitech-approval-seed-')));
  try {
    seedGit(root, ['init', '-q', '-b', 'main']);
    for (const [path, text] of Object.entries(SEED_DOCUMENTS)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), text);
    }
    layer(join(gitDir, 'main'), root);
    seedGit(root, ['add', '-A']);
    seedGit(root, ['commit', '-q', '-m', 'Seeded main (synthetic)']);
    seedGit(root, ['checkout', '-q', '-b', 'build/seed']);
    if (existsSync(join(gitDir, 'branch'))) {
      layer(join(gitDir, 'branch'), root);
      seedGit(root, ['add', '-A']);
      seedGit(root, ['commit', '-q', '-m', 'Seeded build-branch commit (synthetic)']);
    }
    if (existsSync(join(gitDir, 'main-after'))) {
      seedGit(root, ['checkout', '-q', 'main']);
      layer(join(gitDir, 'main-after'), root);
      seedGit(root, ['add', '-A']);
      seedGit(root, ['commit', '-q', '-m', 'Seeded main after the branch point (synthetic)']);
      seedGit(root, ['checkout', '-q', 'build/seed']);
    }
    layer(join(gitDir, 'worktree'), root);
    return { approvals: loadRepoApprovalContext(root), approvalEdits: repoApprovalDocumentEdits(root) };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Exception-list overlays.

/** seeded/<name>/exception-lists.json: changes laid over the lists as read today. */
interface ListOverlay {
  lists?: Record<string, { add?: Array<{ key: string; content: unknown; label?: string }>; remove?: string[]; removeFirst?: number; change?: Record<string, unknown> }>;
  /** Lists no longer read, as if their spec were removed. */
  dropFromCurrent?: string[];
  /** Replace the baseline's `lists` for these ids (to simulate a baseline recorded differently). */
  baselineLists?: Record<string, ExceptionListSnapshot['lists'][string] | null>;
  /** The baseline file is missing. */
  baselineMissing?: boolean;
  /** Approved exception-list snapshots: the baseline with these entries added, at this version and reference. */
  approved?: Array<{ version: number; approvalRef: string; add: Record<string, Array<{ key: string; content: unknown }>> }>;
}

function overlayLists(inputs: ExceptionListInputs, overlay: ListOverlay): ExceptionListInputs {
  const lists = new Map<string, CurrentList>([...inputs.current.lists].map(([id, list]) => [id, { ...list, entries: new Map(list.entries) }]));
  for (const [id, change] of Object.entries(overlay.lists ?? {})) {
    const list = lists.get(id);
    if (list === undefined) throw new Error(`exception-lists.json names ${id}, which is not a list`);
    const first = change.removeFirst === undefined ? [] : [...list.entries.keys()].slice(0, change.removeFirst);
    for (const key of first) list.entries.delete(key);
    for (const key of change.remove ?? []) {
      if (!list.entries.delete(key)) throw new Error(`exception-lists.json removes ${key} from ${id}, which holds no such entry`);
    }
    for (const [key, content] of Object.entries(change.change ?? {})) {
      const entry = list.entries.get(key);
      if (entry === undefined) throw new Error(`exception-lists.json changes ${key} in ${id}, which holds no such entry`);
      list.entries.set(key, { ...entry, sha256: sha256(content) });
    }
    for (const entry of change.add ?? []) list.entries.set(entry.key, { sha256: sha256(entry.content), label: entry.label ?? entry.key });
  }
  for (const id of overlay.dropFromCurrent ?? []) lists.delete(id);
  let baseline = inputs.baseline;
  if (overlay.baselineMissing === true) baseline = undefined;
  if (baseline !== undefined && overlay.baselineLists !== undefined) {
    const next = { ...baseline.lists };
    for (const [id, value] of Object.entries(overlay.baselineLists)) {
      if (value === null) delete next[id];
      else next[id] = value;
    }
    baseline = { ...baseline, lists: next };
  }
  const approvedSnapshots: ExceptionListSnapshot[] = [...inputs.approvedSnapshots];
  for (const approved of overlay.approved ?? []) {
    if (baseline === undefined) throw new Error('exception-lists.json: an approved snapshot needs the baseline');
    const next: ExceptionListSnapshot['lists'] = JSON.parse(JSON.stringify(baseline.lists)) as ExceptionListSnapshot['lists'];
    for (const [id, entries] of Object.entries(approved.add)) {
      const list = next[id];
      if (list === undefined) throw new Error(`exception-lists.json: the approved snapshot adds to ${id}, which the baseline does not hold`);
      for (const entry of entries) list.entries[entry.key] = { sha256: sha256(entry.content), recordedOn: baseline.recordedOn };
    }
    approvedSnapshots.push({
      ...baseline,
      name: `approved exception lists v${approved.version} (seeded)`,
      status: 'approved',
      version: approved.version,
      approvalRef: approved.approvalRef,
      lists: next,
    });
  }
  return { ...inputs, current: { ...inputs.current, lists }, baseline, approvedSnapshots };
}

/**
 * A seeded input: the repository inputs with the seed's files laid over them.
 * - registry.json replaces top-level keys of the production registry;
 * - gates/<id>.yaml replaces or adds that gate;
 * - snapshot.json replaces top-level keys of the baseline, and merges `fields` and `gates` by key;
 * - approved/*.json are approved snapshots;
 * - guardrails.md, prd.md, build-readiness.md replace those documents for the approval references,
 *   read as if they were main's (the policy anchors always read the repository's docs/guardrails.md);
 * - git/ builds a temporary repository (main, a build branch, a working tree) and reads the
 *   approvals and the tripwire from it, as the check reads the repository's (gitSeedApprovals);
 * - exception-lists.json changes the exception lists as read today (overlayLists).
 */
export async function seededInputs(dir: string): Promise<CheckInputs> {
  const repo = loadRepoLooseningInputs();
  const file = (name: string): string => join(dir, name);

  let registry = repo.registry;
  if (existsSync(file('registry.json'))) {
    const shaped = parseRegistryShape({ ...(loadProductionRegistry() as Record<string, unknown>), ...readJson(file('registry.json')) });
    if (shaped.registry === undefined) throw new Error(`${file('registry.json')}: ${shaped.problems.join('; ')}`);
    registry = shaped.registry;
  }

  const gates = new Map<string, GateDefinition>(repo.gates.map((gate) => [gate.id, gate]));
  if (existsSync(file('gates'))) {
    for (const name of readdirSync(file('gates')).filter((entry) => entry.endsWith('.yaml'))) {
      const path = join(file('gates'), name);
      const gate = parseGateFile(path, readFileSync(path, 'utf8'));
      gates.set(gate.id, gate);
    }
  }

  let baseline: Snapshot = repo.baseline;
  if (existsSync(file('snapshot.json'))) {
    const overlay = readJson(file('snapshot.json'));
    baseline = snapshotSchema.parse({
      ...repo.baseline,
      ...overlay,
      fields: mergeByKey(repo.baseline.fields, overlay['fields']),
      gates: mergeByKey(repo.baseline.gates, overlay['gates']),
    });
  }

  const approvedSnapshots = existsSync(file('approved'))
    ? readdirSync(file('approved'))
        .filter((name) => name.endsWith('.json'))
        .sort()
        .map((name) => snapshotSchema.parse(readJson(join(file('approved'), name))))
    : repo.approvedSnapshots;

  let approvals = repo.approvals;
  let approvalEdits = repoApprovalDocumentEdits(REPO_ROOT);
  const documents = ['guardrails.md', 'prd.md', 'build-readiness.md'];
  if (documents.some((name) => existsSync(file(name)))) {
    approvals = parseApprovalContext({
      guardrails: readFileSync(existsSync(file('guardrails.md')) ? file('guardrails.md') : join(REPO_ROOT, 'docs/guardrails.md'), 'utf8'),
      prd: readFileSync(existsSync(file('prd.md')) ? file('prd.md') : join(REPO_ROOT, 'docs/product/prd.md'), 'utf8'),
      buildReadiness: readFileSync(existsSync(file('build-readiness.md')) ? file('build-readiness.md') : join(REPO_ROOT, 'docs/build-readiness.md'), 'utf8'),
      datasetApprovals: [],
      readFrom: `seeded documents in ${dir}`,
    });
  }
  if (existsSync(file('git'))) ({ approvals, approvalEdits } = gitSeedApprovals(file('git')));

  let exceptionLists = await repoExceptionListInputs(approvals);
  if (existsSync(file('exception-lists.json'))) exceptionLists = overlayLists(exceptionLists, readJson(file('exception-lists.json')) as ListOverlay);

  return {
    loosening: { ...repo, registry, gates: [...gates.values()], baseline, approvedSnapshots, approvals },
    approvalEdits,
    exceptionLists,
  };
}

/** Runs the check on these inputs. */
export function runLoosening(inputs: CheckInputs): CheckResult {
  const report = evaluateLoosening(inputs.loosening);
  const lists = evaluateExceptionLists(inputs.exceptionLists);
  const problems = [...new Set([...report.problems, ...inputs.approvalEdits, ...lists.problems])];
  const ok = problems.length === 0;
  const noApprover = inputs.loosening.approvals.approvers.length === 0;
  const waiting = [...report.waiting, ...lists.waiting];
  const waitingNote = `${waiting.length} values wait for approval${noApprover ? ' (no approver is named in docs/guardrails.md section 10; D-05)' : ''}`;
  const listCount = inputs.exceptionLists.current.lists.size;
  const summary = ok
    ? `compared with ${report.base} and ${lists.base}: no loosening and no unrecorded value; ${inputs.loosening.gates.length} gates, all closed or approved; ${listCount} exception lists as recorded; ${waitingNote}`
    : `compared with ${report.base} and ${lists.base}: ${problems.length} problems; ${waitingNote}`;
  const details = [
    ...problems.map((line) => `problem: ${line}`),
    ...[...report.approvedLoosenings, ...lists.approvedLoosenings].map((line) => `approved loosening: ${line}`),
    ...[...report.tightenings, ...lists.tightenings].map((line) => `tightening (reported, not failed): ${line}`),
    ...waiting.map((line) => `waiting for approval: ${line}`),
  ];
  return { name: NAME, ok, summary, details };
}
