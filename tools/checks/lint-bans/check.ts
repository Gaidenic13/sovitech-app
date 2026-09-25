/**
 * lint-bans: the SOVITECH lint bans (inline disables ignored) and the package
 * boundaries, on the repository. See lint-bans.ts and tools/eslint-rules/README.md.
 */
import { fail, pass, repoRoot } from '../lib';
import type { Check } from '../types';
import { checkBoundaries, lintBans, NAME, scopeProblems } from './lint-bans';

const check: Check = async () => {
  const [bans, boundaries] = await Promise.all([lintBans(repoRoot), checkBoundaries()]);
  const scope = scopeProblems(bans, boundaries.modules);
  const summary =
    `${bans.files} files: ${bans.problems.length} lint-ban problems (inline disables ignored); ` +
    `${boundaries.modules} modules: ${boundaries.problems.length} boundary violations` +
    (scope.length > 0 ? `; ${scope.length} empty-scope problems` : '');
  const problems = [...scope, ...bans.problems, ...boundaries.problems];
  return problems.length === 0 ? pass(NAME, summary) : fail(NAME, summary, problems);
};

export default check;
