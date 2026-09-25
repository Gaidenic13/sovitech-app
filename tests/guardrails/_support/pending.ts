/**
 * The pending wrapper for guardrail cases whose code under test is not built yet
 * (prompt 3 section 10, phase 0, last bullet; docs/adr/0003-index-check-convention.md).
 *
 * A pending case file in tests/guardrails/ starts with the marker line
 *   // @pending-until: phase <n> <feature>[, <feature>...]
 * (grammar: PENDING_MARKER_PATTERN in @sovitech/domain), and registers its test with
 *   const pending = pendingCase(import.meta.url);
 *   pending('<ids>: <title>', () => { ...real assertions... });
 *
 * Each run ends in one of three ways:
 * - the body throws the domain's NotImplementedError for a feature the marker names
 *   (directly or as a cause, as fast-check reports it): the test is skipped, with the
 *   note "pending: no automated check yet", and the wrapper's record in the test's
 *   meta (pending-note.ts). It never counts as passing. Only an error a domain stub
 *   threw counts: a case file cannot create one (`new NotImplementedError(...)`
 *   throws a TypeError), and a look-alike class is an ordinary error.
 * - the body throws anything else (a failed assertion, a TypeError, an import error,
 *   a NotImplementedError for a feature the marker does not name): the test fails
 *   with that error.
 * - the body passes: the test fails, asking for the wrapper and the marker to be removed.
 * A case file that cannot be loaded (an import error, a missing or malformed marker,
 * a marker naming a feature no domain stub declares) fails as a whole. Bare
 * `test.fails` is never used: it passes on an import error too.
 *
 * The run guard (tools/vitest/guardrail-run-guard.ts) fails the Vitest run when a
 * guardrail test is skipped any other way. Its contract tests are in
 * tools/checks/index/pending-wrapper.test.ts.
 */
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, type TestContext } from 'vitest';
import {
  declaredStubFeatures,
  notImplementedFeature,
  parsePendingMarker,
  type DomainFeature,
  type PendingMarker,
} from '@sovitech/domain';
import { PENDING_META_KEY, pendingNote, type PendingRecord } from './pending-note';

export { PENDING_META_KEY, PENDING_NOTE_PREFIX, pendingNote, type PendingRecord } from './pending-note';

/** A pending test body. It receives Vitest's context; it must not call `context.skip` itself. */
export type PendingBody = (context: TestContext) => unknown;

/** How one run of a pending body ended. */
export type PendingOutcome =
  | { readonly kind: 'not_implemented'; readonly feature: DomainFeature }
  | { readonly kind: 'error'; readonly error: unknown }
  | { readonly kind: 'passed' };

/** Runs a body and classifies how it ended against the marker's features. */
export async function runPendingBody(
  marker: PendingMarker,
  body: PendingBody,
  context: TestContext,
): Promise<PendingOutcome> {
  try {
    await body(context);
  } catch (error) {
    const feature = notImplementedFeature(error);
    return feature !== undefined && marker.features.includes(feature)
      ? { kind: 'not_implemented', feature }
      : { kind: 'error', error };
  }
  return { kind: 'passed' };
}

/**
 * Turns an outcome into the test's result: skip (with the note and the record the
 * run guard reads), rethrow, or fail because it passes now.
 */
export function settlePending(
  caseId: string,
  marker: PendingMarker,
  outcome: PendingOutcome,
  skip: (note: string, record: PendingRecord) => never,
): void {
  switch (outcome.kind) {
    case 'not_implemented': {
      const record: PendingRecord = { caseId, feature: outcome.feature, phase: marker.phase };
      return skip(pendingNote(record), record);
    }
    case 'error':
      throw outcome.error;
    case 'passed':
      throw new Error(
        `${caseId} passes now. Remove the pending wrapper and the @pending-until line ` +
          `(phase ${marker.phase}) so the case runs as a working check.`,
      );
  }
}

/** The case id a case file is named after: tests/guardrails/<ID>.test.ts. */
export function caseIdOf(path: string): string {
  const id = /^(G[0-9S]+(?:-[0-9]+[a-z]?)?)\.test\.tsx?$/.exec(basename(path))?.[1];
  if (id === undefined) throw new Error(`${path}: a pending case file is named <case id>.test.ts`);
  return id;
}

/** Whether the ids before the title's first ':' include the case id as a whole token. */
export function titleNamesCase(title: string, caseId: string): boolean {
  const ids = title.split(':', 1)[0] ?? '';
  return ids.split(/[\s·,]+/).includes(caseId);
}

/**
 * Reads and checks the marker of a pending case file's source: well formed, and
 * naming only features whose domain stub is declared. A feature with no declared
 * stub is built (or renamed), so the case must come out of the wrapper.
 */
export function readPendingMarker(caseId: string, source: string): PendingMarker {
  const parsed = parsePendingMarker(source);
  if (parsed.kind === 'none') {
    throw new Error(`${caseId}: a pending case file starts with "// @pending-until: phase <n> <feature>[, <feature>]"`);
  }
  if (parsed.kind === 'malformed') throw new Error(`${caseId}: ${parsed.problem}`);
  const declared = declaredStubFeatures();
  const built = parsed.marker.features.filter((feature) => !declared.includes(feature));
  if (built.length > 0) {
    throw new Error(
      `${caseId}: the marker names ${built.join(', ')}, but no domain stub declares it any more. ` +
        'Remove the pending wrapper and the @pending-until line so the case runs as a working check.',
    );
  }
  return parsed.marker;
}

/**
 * Reads the marker from the calling case file and returns the function that
 * registers its pending tests. Call it once per case file with `import.meta.url`.
 * A missing or malformed marker, or one naming a feature no stub declares, throws
 * here, so the file fails to load.
 */
export function pendingCase(caseFileUrl: string): (title: string, body: PendingBody, timeout?: number) => void {
  const path = fileURLToPath(caseFileUrl);
  const caseId = caseIdOf(path);
  const marker = readPendingMarker(caseId, readFileSync(path, 'utf8'));

  return (title, body, timeout) => {
    if (!titleNamesCase(title, caseId)) {
      throw new Error(`${caseId}: the test title "${title}" must name ${caseId} among the ids before its ':'`);
    }
    test(
      title,
      async (context) => {
        const outcome = await runPendingBody(marker, body, context);
        settlePending(caseId, marker, outcome, (note, record) => {
          context.task.meta[PENDING_META_KEY] = record;
          return context.skip(note);
        });
      },
      timeout,
    );
  };
}
