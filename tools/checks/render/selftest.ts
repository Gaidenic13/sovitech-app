/**
 * Self-test of the render check (`pnpm check:selftest`).
 *
 * 1. The control input, the real allowlist, screen list and harness pages, must pass. If it
 *    does not, the self-test throws.
 * 2. Every seed file under seeded/ (JSON, TypeScript or HTML) must be a listed bad case, and
 *    every listed case must have its file; otherwise the self-test throws, so no seed runs
 *    without a stated reason.
 * 3. Each seeded bad input must fail, and for its own seeded reason (cases.ts). A seed that
 *    fails for another reason is returned as passing, and the run flags it.
 *
 * The render test's own seeded bad pages are tests/e2e/pages/g2-1/, g2-8/ and reserved-terms/,
 * run in Chromium by the case files G2-1 and G2-8, tools/checks/render/rendered-copy.test.ts and
 * the render spec's canaries. This self-test checks, without a browser, that every one of them
 * is listed with its expected result and declares valid display objects (the control).
 */
import type { CheckResult, SelfTest } from '../types';
import { BAD_CASES, asSeededResult, runCase, runGood, seededFiles } from './cases';

const selfTest: SelfTest = async () => {
  const good = runGood();
  if (!good.ok) {
    throw new Error(`The render check did not pass its control input (the real allowlist, screen list and harness pages):\n${good.details.join('\n')}`);
  }
  const listed = BAD_CASES.map((seededCase) => seededCase.file).sort();
  const onDisk = seededFiles();
  const unlisted = onDisk.filter((file) => !listed.includes(file));
  const missing = listed.filter((file) => !onDisk.includes(file));
  if (unlisted.length > 0 || missing.length > 0) {
    throw new Error(
      `The render check's seeds and cases.ts disagree. Seeds with no expected reason: ${unlisted.join(', ') || 'none'}. Cases with no seed: ${missing.join(', ') || 'none'}.`,
    );
  }
  const results: CheckResult[] = [];
  for (const seededCase of BAD_CASES) results.push(asSeededResult(seededCase, await runCase(seededCase)));
  return results;
};

export default selfTest;
