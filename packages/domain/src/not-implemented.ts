/**
 * The domain's NotImplementedError, and the marker a pending guardrail case
 * carries (prompt 3 section 10, phase 0, last bullet).
 *
 * A function declared in phase 0 throws NotImplementedError naming its feature.
 * A case file in tests/guardrails/ whose code under test is not built yet starts
 * with a marker line naming the phase that removes it and the features it waits
 * for, and runs its test through the pending wrapper (`pendingCase`, in the tests'
 * support code).
 * The wrapper holds the case out of the green run only while one of those
 * features throws NotImplementedError. The index check reads the same marker to
 * report the case as "pending: no automated check yet".
 *
 * **The brand.** Only a domain stub can throw an error the wrapper accepts:
 * - each stub declares its feature once, when this package loads
 *   (`declareNotImplemented`), and gets back the one function that throws for it;
 *   a second declaration of the same feature throws, so code outside the domain
 *   cannot obtain a thrower once the package has loaded;
 * - the constructor refuses every caller but that thrower, so `new
 *   NotImplementedError('derive')` in a case file throws a TypeError instead;
 * - `notImplementedFeature` accepts only the instances that thrower issued (a
 *   module-private WeakMap), so a look-alike class, an object built from the
 *   prototype, or a copied `feature` property is never read as pending.
 * A case file that throws the error itself therefore fails, and keeps failing,
 * instead of being skipped as pending forever.
 *
 * **The count.** Each thrower also counts the errors it issues, per feature, in a
 * module-private record (`stubErrorCounts` reads a copy; nothing outside this
 * module can reset or lower it). The guardrails Vitest project's stub guard
 * (tools/vitest/guardrail-stub-guard.ts) reads it before and after each test: a
 * test that reached an unbuilt stub, and was not held out by the pending wrapper,
 * fails, even when it caught the error (`expect(() => derive(...)).toThrow()`).
 * Such a case proves nothing about the code under test (phase 0 review, round 2).
 */

/** The phase 0 functions that throw NotImplementedError, by feature name. */
export const DOMAIN_FEATURES = ['derive', 'verify-proposal'] as const;
export type DomainFeature = (typeof DOMAIN_FEATURES)[number];

/** Handed only to the constructor by the thrower below; never exported. */
const ISSUE_KEY: unique symbol = Symbol('NotImplementedError issue key');

/** Every error a declared stub threw, with the feature it was issued for. Module-private. */
const issued = new WeakMap<object, DomainFeature>();

/** The features whose stub has been declared. Each is declared once. */
const declared = new Set<DomainFeature>();

/** How many errors each declared stub has thrown since this module loaded, from none. Module-private; only the throwers raise it. */
const thrownCounts = Object.fromEntries(DOMAIN_FEATURES.map((feature) => [feature, 0])) as Record<DomainFeature, number>;

/** Thrown by a declared domain function whose body is not built yet. Created only by its stub. */
export class NotImplementedError extends Error {
  override readonly name = 'NotImplementedError';
  readonly feature: DomainFeature;

  /** Called only by the function `declareNotImplemented` returns; any other caller gets a TypeError. */
  constructor(feature: DomainFeature, key?: symbol) {
    if (key !== ISSUE_KEY) {
      throw new TypeError(
        'NotImplementedError is thrown only by a domain stub; a case file cannot create one. ' +
          'Call the domain function under test instead.',
      );
    }
    super(`${feature} is not implemented yet (see the @pending-until line of the cases that wait for it)`);
    this.feature = feature;
  }
}

const isDomainFeature = (name: string): name is DomainFeature => (DOMAIN_FEATURES as readonly string[]).includes(name);

/**
 * Declares the stub of one feature and returns the function that throws its
 * NotImplementedError. Each domain stub calls it once, at module load
 * (field-state.ts for `derive`, evidence.ts for `verify-proposal`). A second
 * call for the same feature throws, so nothing loaded after the domain, a case
 * file included, can obtain a thrower.
 */
export function declareNotImplemented(feature: DomainFeature): () => never {
  if (!isDomainFeature(feature)) {
    throw new TypeError(`unknown feature ${String(feature)}; the features are ${DOMAIN_FEATURES.join(', ')}`);
  }
  if (declared.has(feature)) {
    throw new Error(`the stub of ${feature} is already declared; only that domain stub throws its NotImplementedError`);
  }
  declared.add(feature);
  return () => {
    const error = new NotImplementedError(feature, ISSUE_KEY);
    issued.set(error, feature);
    thrownCounts[feature] += 1;
    throw error;
  };
}

/** How many NotImplementedErrors each feature's stub has thrown, by feature. */
export type StubErrorCounts = Readonly<Record<DomainFeature, number>>;

/**
 * A copy of how many NotImplementedErrors each declared stub has thrown since
 * this module loaded, caught or not. Read-only: the record is module-private and
 * only a stub's thrower raises it, so no caller can reset or lower it. The
 * guardrails project's stub guard compares two readings around each test.
 */
export function stubErrorCounts(): StubErrorCounts {
  return Object.freeze({ ...thrownCounts });
}

/**
 * The features whose stub is declared, in DOMAIN_FEATURES order. Once the
 * package has loaded, this equals DOMAIN_FEATURES: a feature listed there with
 * no stub could be declared by other code (a unit test pins it).
 */
export function declaredStubFeatures(): readonly DomainFeature[] {
  return DOMAIN_FEATURES.filter((feature) => declared.has(feature));
}

/** How deep a cause chain is followed; fast-check wraps the thrown error one level down. */
const MAX_CAUSE_DEPTH = 8;

/**
 * The feature of the NotImplementedError that `error` is, or that its cause chain
 * holds; undefined for any other error. Only an instance a declared stub threw
 * counts: a look-alike class, an object built from the prototype, or an error
 * that merely carries the name or a `feature` property does not.
 */
export function notImplementedFeature(error: unknown): DomainFeature | undefined {
  let current: unknown = error;
  for (let depth = 0; depth <= MAX_CAUSE_DEPTH; depth += 1) {
    if (typeof current === 'object' && current !== null) {
      const feature = issued.get(current);
      if (feature !== undefined) return feature;
    }
    if (!(current instanceof Error)) return undefined;
    current = current.cause;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// The pending marker
// ---------------------------------------------------------------------------

/** The marker line starts with this, on the first line of a pending case file. */
export const PENDING_MARKER_PREFIX = '// @pending-until:';

/**
 * The whole first line: `// @pending-until: phase <1-7> <feature>[, <feature>...]`,
 * for example `// @pending-until: phase 1 derive`.
 */
export const PENDING_MARKER_PATTERN = /^\/\/ @pending-until: phase ([1-7]) ([a-z]+(?:-[a-z]+)*(?:, [a-z]+(?:-[a-z]+)*)*)$/;

export interface PendingMarker {
  /** The prompt 3 phase whose code is expected to make the case pass and remove the wrapper. */
  readonly phase: number;
  /** The features whose NotImplementedError keeps the case pending. */
  readonly features: readonly DomainFeature[];
}

export type PendingMarkerParse =
  | { readonly kind: 'none' }
  | { readonly kind: 'marker'; readonly marker: PendingMarker }
  | { readonly kind: 'malformed'; readonly problem: string };

/** The phase digits the marker allows, in order: phase n is at index n - 1. */
const MARKER_PHASES: readonly string[] = ['1', '2', '3', '4', '5', '6', '7'];

/**
 * Reads the marker from the first line of a case file's source. `none` when the
 * first line does not start with {@link PENDING_MARKER_PREFIX}; `malformed` when it
 * does but breaks the grammar, names an unknown feature or repeats one.
 */
export function parsePendingMarker(source: string): PendingMarkerParse {
  const firstLine = source.split(/\r?\n/, 1)[0] ?? '';
  if (!firstLine.startsWith(PENDING_MARKER_PREFIX)) return { kind: 'none' };

  const match = PENDING_MARKER_PATTERN.exec(firstLine);
  const phase = match?.[1];
  const list = match?.[2];
  if (phase === undefined || list === undefined) {
    return {
      kind: 'malformed',
      problem: `the first line must read "${PENDING_MARKER_PREFIX} phase <1-7> <feature>[, <feature>]"; it reads "${firstLine}"`,
    };
  }

  const names = list.split(', ');
  const unknown = names.filter((name) => !isDomainFeature(name));
  if (unknown.length > 0) {
    return {
      kind: 'malformed',
      problem: `unknown feature ${unknown.join(', ')}; the features are ${DOMAIN_FEATURES.join(', ')}`,
    };
  }
  if (new Set(names).size !== names.length) {
    return { kind: 'malformed', problem: `a feature is named twice: ${list}` };
  }

  return { kind: 'marker', marker: { phase: MARKER_PHASES.indexOf(phase) + 1, features: names.filter(isDomainFeature) } };
}
