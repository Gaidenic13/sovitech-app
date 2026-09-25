/**
 * Self-test: the seeded good inputs must pass with their LGPL and MPL reports
 * (otherwise this throws), and each seeded bad input must fail for the reason
 * it was seeded for.
 */
import type { CheckResult, SelfTest } from '../types';
import { BAD_CASES, GOOD_CASES, asSeededResult, runCase } from './cases';

const selfTest: SelfTest = async () => {
  for (const goodCase of GOOD_CASES) {
    const good = await runCase(goodCase);
    const text = `${good.summary}\n${good.details.join('\n')}`;
    const missing = goodCase.expect.filter((expected) => !text.includes(expected));
    if (!good.ok || missing.length > 0) {
      throw new Error(`The seeded good input ${goodCase.id} must pass with its report (missing: ${missing.join(', ') || 'none'}): ${good.summary}\n${good.details.join('\n')}`);
    }
  }
  const results: CheckResult[] = [];
  for (const badCase of BAD_CASES) results.push(asSeededResult(badCase, await runCase(badCase)));
  return results;
};

export default selfTest;
