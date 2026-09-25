/**
 * scan-roots: every folder at the top of the repository, under packages/<pkg>/ and
 * under services/<service>/ is scanned or excluded in roots.json; pnpm lint:deps
 * reads the list; the CI path filter agrees with it. See scan-roots.ts and README.md.
 */
import { fail, pass, repoRoot } from '../lib';
import type { Check } from '../types';
import { loadScanRoots } from './roots';
import { NAME, scanRootProblems } from './scan-roots';

const check: Check = async () => {
  const outcome = scanRootProblems(repoRoot, loadScanRoots());
  const summary = `${outcome.folders} folders classified against tools/checks/scan-roots/roots.json: ${outcome.problems.length} problems`;
  return outcome.problems.length === 0 ? pass(NAME, summary) : fail(NAME, summary, outcome.problems);
};

export default check;
