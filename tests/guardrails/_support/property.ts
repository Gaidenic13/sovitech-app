/**
 * Property tests for guardrail cases that keep a failing assertion from hiding
 * behind an unbuilt domain stub (phase 0 review, round 1, finding 16;
 * docs/adr/0003-index-check-convention.md, "Not yet covered: a fast-check edge").
 *
 * The edge: fast-check keeps one error per run. When a property throws the
 * stub's NotImplementedError for one input and fails an assertion for another,
 * the error it reports may be the stub's, and the pending wrapper
 * (./pending.ts) would then skip the case as pending while an assertion failed.
 *
 * `assertProperty` and `assertAsyncProperty` run the predicate through
 * fast-check with one change: an input whose run ends in the stub's error (as
 * the domain's `notImplementedFeature` reads it, the way the pending wrapper
 * tells it apart) is held back, not reported, so fast-check keeps looking for,
 * and shrinks, a real counterexample. Every other error is rethrown at once,
 * `fc.pre`'s included. When the run ends:
 * - a counterexample from any other error or a false result fails the case,
 *   whatever the stub did for other inputs;
 * - otherwise, if any input reached the stub, the first stub error is rethrown,
 *   so the pending wrapper holds the case out (and, without the wrapper, the
 *   case fails and the stub guard names it);
 * - otherwise the property holds.
 * No error is dropped: each stub error it holds back ends in a throw.
 *
 * This module catches, so the index check's `[support]` rule would refuse it.
 * It passes that rule only by the reviewed route: its path and SHA-256 are
 * listed in tools/checks/index/stub-aware-support.json (role `stub-aware`), and
 * any change to it fails the check until the new content is reviewed and
 * recorded there (tools/checks/index/README.md, "Modules that may catch the
 * stub's error").
 */
import fc from 'fast-check';
import { notImplementedFeature } from '@sovitech/domain';

/** The arbitraries of a property, one per argument of its predicate. */
export type Arbitraries<Ts extends [unknown, ...unknown[]]> = { [K in keyof Ts]: fc.Arbitrary<Ts[K]> };

/** Runs `predicate` over `arbitraries` with fast-check; see the module comment for how the stub's error is handled. */
export function assertProperty<Ts extends [unknown, ...unknown[]]>(
  arbitraries: Arbitraries<Ts>,
  predicate: (...values: Ts) => boolean | void,
  parameters?: fc.Parameters<Ts>,
): void {
  const held: { first?: unknown } = {};
  const checked = (...values: Ts): boolean | void => {
    try {
      return predicate(...values);
    } catch (error) {
      if (notImplementedFeature(error) === undefined) throw error;
      held.first ??= error;
      return true;
    }
  };
  fc.assert(fc.property(...arbitraries, checked), parameters);
  if ('first' in held) throw held.first;
}

/** The asynchronous form of `assertProperty`. */
export async function assertAsyncProperty<Ts extends [unknown, ...unknown[]]>(
  arbitraries: Arbitraries<Ts>,
  predicate: (...values: Ts) => Promise<boolean | void>,
  parameters?: fc.Parameters<Ts>,
): Promise<void> {
  const held: { first?: unknown } = {};
  const checked = async (...values: Ts): Promise<boolean | void> => {
    try {
      return await predicate(...values);
    } catch (error) {
      if (notImplementedFeature(error) === undefined) throw error;
      held.first ??= error;
      return true;
    }
  };
  await fc.assert(fc.asyncProperty(...arbitraries, checked), parameters);
  if ('first' in held) throw held.first;
}
