/**
 * The stub guard: a setup file of the guardrails Vitest project (vitest.config.ts,
 * `setupFiles`). Vitest runs it in each guardrail case file's worker before the
 * case file loads, so its hooks wrap every test of the file.
 *
 * Around each test it reads how many NotImplementedErrors the domain's stubs
 * have thrown (`stubErrorCounts` in @sovitech/domain, a module-private count
 * next to the branded-error WeakMap). A test that reached an unbuilt stub fails
 * with "case exercises an unbuilt stub", whether it let the error through or
 * caught it (`expect(() => derive(...)).toThrow()`, `.rejects.toThrow()`, a
 * try/catch in a helper), unless the pending wrapper held it out: the wrapper's
 * skip, with its record and note (tests/guardrails/_support/pending.ts). Stub
 * errors thrown in the file outside any test (at load, in a describe body, in a
 * beforeAll hook) count against every later test of the file.
 *
 * It also writes its record into each test's meta (STUB_GUARD_META_KEY), so the
 * run guard can tell that it ran: a passing guardrail test without the record
 * fails the run ([unguarded]).
 *
 * Limits: tests that run concurrently share one count, so a stub error in one
 * counts against every test whose run overlaps it (the guard fails closed). A
 * case file that loads a second copy of the domain (vi.resetModules, a query
 * string on the import) would count in that copy; the index check flags
 * vi.resetModules, vi.importActual and vi.importMock in case files.
 */
import { afterEach, beforeEach } from 'vitest';
import { stubErrorCounts, type StubErrorCounts } from '@sovitech/domain';
import { PENDING_META_KEY, pendingNote } from '../../tests/guardrails/_support/pending-note';
import { STUB_GUARD_META_KEY, addTallies, countsSince, stubGuardProblem, type StubErrorTally } from './stub-guard';

/** The count when no test was running last: before the case file loaded, then after each test. */
let lastIdle: StubErrorCounts = stubErrorCounts();
/** Stub errors thrown in this file outside any test so far. */
let outsideTests: StubErrorTally = {};
/** Tests between their beforeEach and afterEach hooks (more than one when they run concurrently). */
let running = 0;
/** The count when each running test started, by task id. */
const startOf = new Map<string, StubErrorCounts>();

beforeEach((context) => {
  const now = stubErrorCounts();
  if (running === 0) outsideTests = addTallies(outsideTests, countsSince(lastIdle, now));
  running += 1;
  startOf.set(context.task.id, now);
});

afterEach((context) => {
  const now = stubErrorCounts();
  const start = startOf.get(context.task.id) ?? lastIdle;
  startOf.delete(context.task.id);
  running = Math.max(0, running - 1);
  if (running === 0) lastIdle = now;

  const record = { inTest: countsSince(start, now), outsideTests };
  context.task.meta[STUB_GUARD_META_KEY] = record;

  // The pending wrapper's skip: its record in the meta and its note word for word.
  // The run guard checks the rest (the marker, the import, the feature and phase).
  // Vitest sets the skip note on the result at run time; its public type does not declare it.
  const result = context.task.result as { state?: string; note?: unknown } | undefined;
  const pending = context.task.meta[PENDING_META_KEY];
  const heldOut = result?.state === 'skip' && pending !== undefined && result.note === pendingNote(pending);
  const problem = stubGuardProblem(record, heldOut);
  if (problem !== undefined) throw new Error(problem);
});
