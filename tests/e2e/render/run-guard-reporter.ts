/**
 * The Playwright run guard (docs/adr/0006-render-test.md, decision 7). A Playwright reporter,
 * registered in playwright.config.ts beside the list reporter. It fails the run when:
 * - a test was skipped (test.skip, test.fixme, or a skip while running): every render and e2e
 *   test runs, so a held-out screen never reads as a pass;
 * - a test is marked to fail (test.fail): a render finding is never the expected outcome;
 * - the render project ran, but not one passing test per screen of screens.ts (a screen left
 *   out, filtered out, or renamed away from its entry).
 * `.only` is refused by `forbidOnly: true` in the config. The guard prints each problem, and
 * the run's status becomes failed, so `pnpm test:render` exits non-zero.
 */
import type { FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import { RENDER_SCREENS } from './screens';

/** The title the render spec gives each screen's test. */
export function screenTestTitle(name: string): string {
  return `G2-1 · G2-8: ${name}`;
}

export default class RenderRunGuard implements Reporter {
  private root: Suite | undefined;
  private readonly problems: string[] = [];

  onBegin(_config: unknown, suite: Suite): void {
    this.root = suite;
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const title = test.titlePath().filter((part) => part !== '').join(' › ');
    if (test.expectedStatus === 'skipped' || result.status === 'skipped') {
      this.problems.push(`${title}: skipped (test.skip, test.fixme or a skip while running); every render and e2e test runs`);
    } else if (test.expectedStatus === 'failed') {
      this.problems.push(`${title}: marked to fail (test.fail); a failing render check is never the expected outcome`);
    }
  }

  onEnd(result: FullResult): Promise<{ status: FullResult['status'] } | undefined> {
    const tests = this.root?.allTests() ?? [];
    const renderTests = tests.filter((test) => test.parent.project()?.name === 'render');
    if (renderTests.length > 0) {
      for (const screen of RENDER_SCREENS) {
        const matching = renderTests.filter((test) => test.title === screenTestTitle(screen.name));
        if (matching.length !== 1) {
          this.problems.push(`render project: ${matching.length} test(s) for the screen "${screen.name}" of screens.ts; each screen is checked once`);
        } else if (matching[0]?.outcome() !== 'expected') {
          this.problems.push(`render project: the screen "${screen.name}" did not pass (${matching[0]?.outcome() ?? 'not run'})`);
        }
      }
    }
    if (this.problems.length === 0) return Promise.resolve(undefined);
    process.stderr.write(`\nPlaywright run guard FAILED the run: ${this.problems.length} problem(s):\n  ${this.problems.join('\n  ')}\n`);
    return Promise.resolve({ status: result.status === 'interrupted' ? 'interrupted' : 'failed' });
  }

  printsToStdio(): boolean {
    return false;
  }
}
