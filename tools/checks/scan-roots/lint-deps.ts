/**
 * `pnpm lint:deps`: dependency-cruiser with .dependency-cruiser.cjs on the
 * "lint:deps" roots of the shared list (roots.json in this folder), so the script,
 * the lint-bans check's boundary run and the scan-roots check read one list
 * (phase 0 review round 2, adversarial finding 13). Arguments after the script
 * name are passed to dependency-cruiser before the roots:
 *   pnpm lint:deps -- --output-type err-long
 * Exits with dependency-cruiser's status; fails, without running it, when the list
 * is malformed or none of its lint:deps roots exists.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../lib';
import { listProblems, loadScanRoots, topLevelRoots } from './roots';

const list = loadScanRoots();
const problems = listProblems(list);
const roots = topLevelRoots('lint:deps', list).filter((folder) => existsSync(join(repoRoot, folder)));
if (roots.length === 0) problems.push('none of the lint:deps roots in tools/checks/scan-roots/roots.json exists; dependency-cruiser would read nothing.');

if (problems.length > 0) {
  process.stderr.write(`lint:deps did not run:\n${problems.map((problem) => `  ${problem}`).join('\n')}\n`);
  process.exitCode = 1;
} else {
  const extra = process.argv.slice(2).filter((argument) => argument !== '--');
  const bin = join(repoRoot, 'node_modules', 'dependency-cruiser', 'bin', 'dependency-cruiser.mjs');
  process.stdout.write(`lint:deps roots (tools/checks/scan-roots/roots.json): ${roots.join(' ')}\n`);
  const result = spawnSync(process.execPath, [bin, '--config', '.dependency-cruiser.cjs', ...extra, ...roots], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  if (result.error !== undefined) process.stderr.write(`${result.error.message}\n`);
  process.exitCode = result.status ?? 1;
}
