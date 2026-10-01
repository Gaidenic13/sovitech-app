/**
 * The spec side of the e2e stack's TEST-only control route (tests/e2e/setup/stack.ts;
 * docs/adr/0037-e2e-setup.md, decision 11): asks the stack to write one TEST state into a TEST project
 * the spec created. No store, no display object: a fetch to the loopback address the stack's state
 * file names, so the render test's screen list may import it.
 */
import { readStackState } from '../setup/paths';

/** The TEST states the stack writes (tests/e2e/setup/control.ts `TEST_STATES`). */
export type TestState = 'document-being-read' | 'owner-conflicts' | 'building-type-inference' | 'floors-conflict';

/** Writes a TEST state into a TEST project (never the demo: the stack refuses it); throws when refused. */
export async function writeTestState(state: TestState, projectId: string): Promise<void> {
  const { controlOrigin } = readStackState();
  const response = await fetch(`${controlOrigin}/test-states/${state}?projectId=${projectId}`, { method: 'POST' });
  if (response.status !== 204) throw new Error(`the e2e stack did not write the TEST state ${state}: HTTP ${String(response.status)} ${await response.text()}`);
}
