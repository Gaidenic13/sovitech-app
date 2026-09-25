/**
 * The stub guard's record and verdict, shared by its setup file
 * (guardrail-stub-guard.ts, in the test workers) and the run guard
 * (guardrail-run-guard.ts, in Vitest's main process). No runtime import of
 * vitest, so the run guard can load it outside a test.
 *
 * Why it exists (phase 0 review, round 2): a guardrail case written without the
 * pending wrapper passed against the unbuilt domain stubs when it only asserted
 * that the call throws, `expect(() => derive(...)).toThrow()` or
 * `await expect(...verifyProposal(...)).rejects.toThrow()`, and counted as a real
 * case. Every case whose Expected cell is "Rejected" is naturally written that
 * way. The domain counts every NotImplementedError its stubs throw
 * (`stubErrorCounts` in @sovitech/domain, a module-private record next to the
 * branded-error WeakMap). The setup file reads the count around each test and
 * fails any test that reached a stub, unless the pending wrapper held it out.
 */
import { DOMAIN_FEATURES, type DomainFeature, type StubErrorCounts } from '@sovitech/domain';

/** The key of the stub guard's record in Vitest's task meta. */
export const STUB_GUARD_META_KEY = 'sovitechStubGuard';

/** The setup file, relative to the repository root, as the guardrails project lists it. */
export const STUB_GUARD_SETUP_FILE = './tools/vitest/guardrail-stub-guard.ts';

/** Stub errors by feature; a feature with none is left out. */
export type StubErrorTally = Readonly<Partial<Record<DomainFeature, number>>>;

/** What the stub guard records on each test it saw finish. */
export interface StubGuardRecord {
  /** Stub errors thrown while the test ran: from its first beforeEach hook to its last afterEach hook. */
  readonly inTest: StubErrorTally;
  /**
   * Stub errors thrown in the same case file outside any test, before this test
   * ended: while the file loaded, in a describe body, or in a beforeAll hook.
   * They count against every later test of the file, since any of them may read
   * what the stub's caller made of the error.
   */
  readonly outsideTests: StubErrorTally;
}

/** The stub errors thrown between two readings of `stubErrorCounts`. */
export function countsSince(before: StubErrorCounts, after: StubErrorCounts): StubErrorTally {
  const tally: Partial<Record<DomainFeature, number>> = {};
  for (const feature of DOMAIN_FEATURES) {
    // A feature with no count yet has thrown nothing: the domain may keep its counts sparse
    // (a tally started at zero for every feature is what sovitech/no-zero-tally bans in packages/).
    const now: number | undefined = after[feature];
    if (now === undefined) continue;
    const was: number | undefined = before[feature];
    const thrown = was === undefined ? now : now - was;
    if (thrown > 0) tally[feature] = thrown;
  }
  return tally;
}

/** Two tallies added up. */
export function addTallies(left: StubErrorTally, right: StubErrorTally): StubErrorTally {
  const tally: Partial<Record<DomainFeature, number>> = { ...left };
  for (const feature of DOMAIN_FEATURES) {
    const more = right[feature];
    if (more === undefined) continue;
    const already = tally[feature];
    tally[feature] = already === undefined ? more : already + more;
  }
  return tally;
}

/** The features a tally names, in DOMAIN_FEATURES order, with their counts. */
function entriesOf(tally: StubErrorTally): Array<[DomainFeature, number]> {
  const entries: Array<[DomainFeature, number]> = [];
  for (const feature of DOMAIN_FEATURES) {
    const count = tally[feature];
    if (count !== undefined && count > 0) entries.push([feature, count]);
  }
  return entries;
}

/** How many stub errors a tally holds. */
export function tallyTotal(tally: StubErrorTally): number {
  return entriesOf(tally).reduce((total, [, count]) => total + count, 0);
}

function describeTally(tally: StubErrorTally): string {
  return entriesOf(tally)
    .map(([feature, count]) => `${feature} (${String(count)}×)`)
    .join(', ');
}

/** Whether a value read from a test's meta is a stub guard record. */
export function isStubGuardRecord(value: unknown): value is StubGuardRecord {
  if (typeof value !== 'object' || value === null) return false;
  const { inTest, outsideTests } = value as Record<string, unknown>;
  const isTally = (tally: unknown): boolean =>
    typeof tally === 'object' &&
    tally !== null &&
    Object.entries(tally).every(
      ([key, count]) => (DOMAIN_FEATURES as readonly string[]).includes(key) && typeof count === 'number' && count > 0,
    );
  return isTally(inTest) && isTally(outsideTests);
}

/**
 * Why a test fails for reaching an unbuilt stub, or undefined when it did not
 * reach one, or when the pending wrapper held it out (the run guard checks that
 * skip on its own).
 */
export function stubGuardProblem(record: StubGuardRecord, heldOutByPendingWrapper: boolean): string | undefined {
  if (heldOutByPendingWrapper) return undefined;
  const during = tallyTotal(record.inTest);
  const outside = tallyTotal(record.outsideTests);
  if (during === 0 && outside === 0) return undefined;
  const where = [
    during > 0 ? `during the test: ${describeTally(record.inTest)}` : '',
    outside > 0 ? `outside any test of this file (at load, in a describe body or a beforeAll hook): ${describeTally(record.outsideTests)}` : '',
  ]
    .filter((part) => part !== '')
    .join('; ');
  return (
    `[stub] case exercises an unbuilt stub: the domain's NotImplementedError was thrown ${where}, ` +
    'and the test was not held out by the pending wrapper. A case that passes because an unbuilt stub throws, ' +
    'or that catches its error, proves nothing about the code under test. Run it through the pending wrapper ' +
    '(tests/guardrails/_support/pending.ts) with its @pending-until marker until the stub is built.'
  );
}

declare module 'vitest' {
  interface TaskMeta {
    /** Written only by the stub guard (tools/vitest/guardrail-stub-guard.ts). */
    sovitechStubGuard?: StubGuardRecord;
  }
}
