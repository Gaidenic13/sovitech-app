/**
 * `pnpm test:render`: the Playwright render project (tests/e2e/render/).
 *
 * While tests/e2e/render/ holds no spec, this wrapper fails at once with a
 * plain message, without building and serving the web app: a missing render
 * test is reported as missing, never as passing.
 */
import { spawnSync } from 'node:child_process';
import { glob } from 'tinyglobby';
import { repoRoot } from './checks/lib';

const specs = await glob(['tests/e2e/render/**/*.spec.ts'], { cwd: repoRoot, ignore: ['**/node_modules/**'] });
if (specs.length === 0) {
  process.stderr.write('No render specs under tests/e2e/render/: the render test does not exist yet.\n');
  process.exitCode = 1;
} else {
  const result = spawnSync('pnpm', ['exec', 'playwright', 'test', '--project=render', ...process.argv.slice(2)], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  process.exitCode = result.status ?? 1;
}
