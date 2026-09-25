/**
 * Self-test: the seeded good tree must pass (otherwise this throws), each
 * seeded bad tree must fail for the reason it was seeded for, and every entry
 * of the real list, planted in a temporary tree, must be found.
 */
import type { CheckResult, SelfTest } from '../types';
import { BAD_CASES, GOOD_CASE, asSeededResult, runCase, runRealListCase } from './cases';

const selfTest: SelfTest = async () => {
  const good = await runCase(GOOD_CASE);
  if (!good.ok) {
    throw new Error(`The seeded good input must pass, but it failed: ${good.summary}\n${good.details.join('\n')}`);
  }
  const results: CheckResult[] = [];
  for (const badCase of BAD_CASES) results.push(asSeededResult(badCase, await runCase(badCase)));
  results.push(await runRealListCase());
  return results;
};

export default selfTest;
