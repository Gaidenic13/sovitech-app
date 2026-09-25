/**
 * Self-test: the seeded good inputs must pass (otherwise this throws), and
 * each seeded bad input must fail for the reason it was seeded for.
 */
import type { CheckResult, SelfTest } from '../types';
import { BAD_CASES, GOOD_CASES, asSeededResult, runCase } from './cases';

const selfTest: SelfTest = async () => {
  for (const goodCase of GOOD_CASES) {
    const good = await runCase(goodCase);
    if (!good.ok) {
      throw new Error(`The seeded good input ${goodCase.id} must pass, but it failed: ${good.summary}\n${good.details.join('\n')}`);
    }
  }
  const results: CheckResult[] = [];
  for (const badCase of BAD_CASES) results.push(asSeededResult(badCase, await runCase(badCase)));
  return results;
};

export default selfTest;
