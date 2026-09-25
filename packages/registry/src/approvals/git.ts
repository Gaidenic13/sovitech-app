/**
 * Where approvals are read from (phase 0 review, round 2): not the working
 * tree, but git. A change-log row, an approver-table row or a recorded owner
 * decision counts only when it exists at the merge base of `main` and HEAD
 * (`git merge-base refs/heads/main HEAD`): a commit reachable from main that
 * is not part of the build branch's own history. Rows added on the build
 * branch, or left in the working tree, never count (docs/guardrails.md
 * section 10, "What counts as approval"; prompt 3 section 5.4, "You never
 * write ... a change-log row that names an approver").
 *
 * Git runs with every GIT_* variable removed from its environment and with
 * replace objects switched off, so no environment variable or replace ref can
 * point it at other documents. Paths and the branch name are fixed.
 */
import { execFileSync } from 'node:child_process';

/** The documents approvals are read from, relative to the repository root. */
export const APPROVAL_DOCUMENT_PATHS = {
  guardrails: 'docs/guardrails.md',
  prd: 'docs/product/prd.md',
  buildReadiness: 'docs/build-readiness.md',
} as const;

/** The branch the approver's records live on. Fixed: no option or variable changes it. */
export const APPROVAL_BRANCH = 'refs/heads/main';

function gitEnvironment(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [name, value] of Object.entries(process.env)) {
    if (!name.startsWith('GIT_')) env[name] = value;
  }
  return env;
}

function git(root: string, args: readonly string[]): string {
  return execFileSync('git', ['--no-replace-objects', '-C', root, ...args], {
    encoding: 'utf8',
    env: gitEnvironment(),
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  });
}

function messageOf(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'stderr' in error) {
    const stderr = String((error as { stderr: unknown }).stderr ?? '').trim();
    if (stderr !== '') return stderr.split('\n')[0] ?? stderr;
  }
  return error instanceof Error ? error.message.split('\n')[0] ?? error.message : String(error);
}

export type ApprovalBase = { ok: true; commit: string } | { ok: false; reason: string };

/** The merge base of main and HEAD in `root`, or why there is none. */
export function approvalBaseCommit(root: string): ApprovalBase {
  try {
    const commit = git(root, ['merge-base', APPROVAL_BRANCH, 'HEAD']).trim();
    if (!/^[0-9a-f]{40,64}$/.test(commit)) return { ok: false, reason: `git merge-base returned "${commit}"` };
    return { ok: true, commit };
  } catch (error) {
    return {
      ok: false,
      reason:
        `approvals are read from git (the merge base of main and HEAD), and none was found in ${root}: ${messageOf(error)}. ` +
        'Nothing resolves until the repository has a main branch that shares history with HEAD (in CI, fetch main as a local branch with enough depth)',
    };
  }
}

/** A file's text at `commit`, or undefined when the file does not exist there. Throws when git fails otherwise. */
export function readAtCommit(root: string, commit: string, path: string): string | undefined {
  try {
    git(root, ['cat-file', '-e', `${commit}:${path}`]);
  } catch {
    return undefined;
  }
  return git(root, ['show', `${commit}:${path}`]);
}

/** Whether `path` exists in the tree of `ref` (for example HEAD). Undefined when git cannot tell. */
export function existsAtRef(root: string, ref: string, path: string): boolean | undefined {
  try {
    git(root, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]);
  } catch {
    return undefined;
  }
  try {
    git(root, ['cat-file', '-e', `${ref}:${path}`]);
    return true;
  } catch {
    return false;
  }
}
