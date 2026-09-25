/**
 * Self-test: the seeded good configs must pass (otherwise this throws), and
 * each seeded bad config must fail for the reason it was seeded for.
 */
import type { CheckResult, SelfTest } from '../types';
import { BAD_CASES, GOOD_CASE, asSeededResult, runCase } from './cases';

const selfTest: SelfTest = async () => {
  const good = await runCase(GOOD_CASE);
  if (!good.ok) {
    throw new Error(`The seeded good input must pass, but it failed: ${good.summary}\n${good.details.join('\n')}`);
  }
  const results: CheckResult[] = [];
  for (const badCase of BAD_CASES) results.push(asSeededResult(badCase, await runCase(badCase)));
  return results;
};

export default selfTest;
