/**
 * The pending wrapper's contract (tests/guardrails/_support/pending.ts; prompt 3
 * section 10, phase 0, last bullet; docs/adr/0004): it holds a case out only while
 * a domain stub throws NotImplementedError for a feature the marker names, and
 * fails on anything else, including a body that passes. Each outcome of
 * runPendingBody and settlePending is proven here, in the unit project, so an
 * edit that swallows errors cannot keep the pending cases skipped unnoticed.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import fc from 'fast-check';
import type { TestContext } from 'vitest';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { NotImplementedError, verifyProposal, type PendingMarker } from '@sovitech/domain';
import {
  PENDING_NOTE_PREFIX,
  caseIdOf,
  pendingCase,
  readPendingMarker,
  runPendingBody,
  settlePending,
  titleNamesCase,
  type PendingOutcome,
  type PendingRecord,
} from '../../../tests/guardrails/_support/pending';

const context = {} as TestContext;
/**
 * The stub these tests reach is verify-proposal, the one domain stub still unbuilt after
 * phase 1 built derive (ADR 0004: its declareNotImplemented call and its place in
 * DOMAIN_FEATURES went together). verifyProposal with no proposal reaches its stub.
 */
const stubMarker: PendingMarker = { phase: 2, features: ['verify-proposal'] };
/** A marker naming a feature that is not the one the body's stub throws for (derive, built in phase 1). */
const otherMarker = { phase: 1, features: ['derive'] } as unknown as PendingMarker;

/** Calls a stub; the stubs ignore their arguments. */
const callStub = (stub: unknown): never => (stub as () => never)();

/** What settlePending did with an outcome. */
function settle(outcome: PendingOutcome, marker: PendingMarker = stubMarker):
  | { kind: 'skipped'; note: string; record: PendingRecord }
  | { kind: 'failed'; error: unknown } {
  const skipped: { note: string; record: PendingRecord }[] = [];
  const skip = (note: string, record: PendingRecord): never => {
    skipped.push({ note, record });
    throw new Error('skip');
  };
  try {
    settlePending('G4-2', marker, outcome, skip);
  } catch (error) {
    const first = skipped[0];
    if (first !== undefined) return { kind: 'skipped', ...first };
    return { kind: 'failed', error };
  }
  throw new Error('settlePending returned without skipping or failing');
}

describe('pending wrapper: a stub that is not built yet holds the case out', () => {
  it('a NotImplementedError from the verify-proposal stub, named by the marker: skipped, with the note and the record', async () => {
    const outcome = await runPendingBody(stubMarker, () => callStub(verifyProposal), context);
    expect(outcome).toEqual({ kind: 'not_implemented', feature: 'verify-proposal' });
    const settled = settle(outcome, stubMarker);
    expect(settled.kind).toBe('skipped');
    if (settled.kind !== 'skipped') return;
    expect(settled.note.startsWith(PENDING_NOTE_PREFIX)).toBe(true);
    expect(settled.note).toBe('pending: no automated check yet (verify-proposal is not implemented; phase 2)');
    expect(settled.record).toEqual({ caseId: 'G4-2', feature: 'verify-proposal', phase: 2 });
  });

  it('the same from an async body, and through fast-check, which reports the error as a cause', async () => {
    const asyncOutcome = await runPendingBody(stubMarker, async () => callStub(verifyProposal), context);
    expect(asyncOutcome).toEqual({ kind: 'not_implemented', feature: 'verify-proposal' });
    const propertyOutcome = await runPendingBody(
      stubMarker,
      () => fc.assert(fc.property(fc.integer(), () => callStub(verifyProposal))),
      context,
    );
    expect(propertyOutcome).toEqual({ kind: 'not_implemented', feature: 'verify-proposal' });
    expect(settle(propertyOutcome, stubMarker).kind).toBe('skipped');
  });
});

describe('pending wrapper: every other ending fails the case', () => {
  it('a NotImplementedError for a feature the marker does not name fails, with that error', async () => {
    const outcome = await runPendingBody(otherMarker, () => callStub(verifyProposal), context);
    expect(outcome.kind).toBe('error');
    const settled = settle(outcome, otherMarker);
    expect(settled.kind).toBe('failed');
    if (settled.kind === 'failed' && outcome.kind === 'error') expect(settled.error).toBe(outcome.error);
  });

  it('a look-alike error class fails', async () => {
    class LookalikeNotImplementedError extends Error {
      override readonly name = 'NotImplementedError';
      readonly feature = 'verify-proposal';
    }
    const lookalike = new LookalikeNotImplementedError('verify-proposal is not implemented yet');
    const outcome = await runPendingBody(
      stubMarker,
      () => {
        throw lookalike;
      },
      context,
    );
    expect(outcome).toEqual({ kind: 'error', error: lookalike });
    expect(settle(outcome)).toEqual({ kind: 'failed', error: lookalike });
  });

  it('a case body that throws the domain class itself fails: the constructor refuses it', async () => {
    const outcome = await runPendingBody(
      stubMarker,
      () => {
        throw new NotImplementedError('verify-proposal' as never);
      },
      context,
    );
    expect(outcome.kind).toBe('error');
    if (outcome.kind === 'error') expect(outcome.error).toBeInstanceOf(TypeError);
    expect(settle(outcome).kind).toBe('failed');
  });

  it('an object built from the class prototype fails', async () => {
    const forged: unknown = Object.assign(Object.create(NotImplementedError.prototype) as object, { feature: 'verify-proposal' });
    const outcome = await runPendingBody(
      stubMarker,
      () => {
        throw forged;
      },
      context,
    );
    expect(outcome).toEqual({ kind: 'error', error: forged });
    expect(settle(outcome).kind).toBe('failed');
  });

  it('any other error fails with that error: a failed assertion, a TypeError', async () => {
    for (const body of [
      () => expect(1).toBe(2),
      () => {
        throw new TypeError('x is not a function');
      },
    ]) {
      const outcome = await runPendingBody(stubMarker, body, context);
      expect(outcome.kind).toBe('error');
      const settled = settle(outcome);
      expect(settled.kind).toBe('failed');
      if (settled.kind === 'failed' && outcome.kind === 'error') expect(settled.error).toBe(outcome.error);
    }
  });

  it('an import error fails', async () => {
    const missing = './does-not-exist-pending-wrapper-probe.js';
    const outcome = await runPendingBody(stubMarker, async () => import(/* @vite-ignore */ missing), context);
    expect(outcome.kind).toBe('error');
    expect(settle(outcome).kind).toBe('failed');
  });

  it('a body that passes fails, asking for the wrapper to come off', async () => {
    const outcome = await runPendingBody(stubMarker, () => undefined, context);
    expect(outcome).toEqual({ kind: 'passed' });
    const settled = settle(outcome);
    expect(settled.kind).toBe('failed');
    if (settled.kind === 'failed') expect(String(settled.error)).toMatch(/G4-2 passes now\. Remove the pending wrapper/);
  });

  it('a property that throws a plain error on every input fails', async () => {
    const outcome = await runPendingBody(
      stubMarker,
      () =>
        fc.assert(
          fc.property(fc.integer(), () => {
            throw new Error('assertion');
          }),
        ),
      context,
    );
    expect(outcome.kind).toBe('error');
  });
});

describe('pending wrapper: loading a case file', () => {
  const scratch = mkdtempSync(join(tmpdir(), 'sovitech-pending-'));
  afterAll(() => rmSync(scratch, { recursive: true, force: true }));
  const caseFile = (name: string, text: string): string => {
    const path = join(scratch, name);
    writeFileSync(path, text);
    return pathToFileURL(path).href;
  };

  it('a missing or malformed marker fails the file at load', () => {
    expect(() => pendingCase(caseFile('G4-2.test.ts', "import x from 'y';\n"))).toThrow(/starts with "\/\/ @pending-until/);
    expect(() => pendingCase(caseFile('G4-9.test.ts', '// @pending-until: phase 9 verify-proposal\n'))).toThrow(/G4-9: /);
    expect(() => pendingCase(caseFile('G4-10.test.ts', '// @pending-until: phase 1 render\n'))).toThrow(/unknown feature/);
  });

  it('a file not named after a case id fails at load', () => {
    expect(() => pendingCase(caseFile('helper.test.ts', '// @pending-until: phase 2 verify-proposal\n'))).toThrow(/<case id>/);
  });

  it('a title that does not name the case id fails before any test is registered', () => {
    const register = pendingCase(caseFile('G1-8.test.ts', '// @pending-until: phase 2 verify-proposal\n'));
    expect(() => register('G1-80 · another case', () => undefined)).toThrow(/must name G1-8/);
    expect(() => register('a title with no id', () => undefined)).toThrow(/must name G1-8/);
  });

  it('reads the case id and the ids of a title as whole tokens', () => {
    expect(caseIdOf('/x/tests/guardrails/G7-2a.test.ts')).toBe('G7-2a');
    expect(titleNamesCase('US-INTAKE-03 · F-QUESTION-02 · G7-6: blocks', 'G7-6')).toBe(true);
    expect(titleNamesCase('G7-60 · other', 'G7-6')).toBe(false);
  });

  it('a marker naming a feature whose stub is no longer declared fails at load', async () => {
    // A built feature leaves DOMAIN_FEATURES, so the grammar refuses it (derive, built in phase 1).
    expect(() => readPendingMarker('G4-2', '// @pending-until: phase 1 derive\n')).toThrow(/unknown feature derive/);
    // A feature still in the grammar but whose stub is no longer declared fails too.
    vi.resetModules();
    vi.doMock('@sovitech/domain', async (importOriginal) => ({
      ...(await importOriginal<typeof import('@sovitech/domain')>()),
      declaredStubFeatures: () => [],
    }));
    try {
      const wrapper = await import('../../../tests/guardrails/_support/pending');
      expect(() => wrapper.readPendingMarker('G1-4', '// @pending-until: phase 2 verify-proposal\n')).toThrow(
        /names verify-proposal, but no domain stub declares it/,
      );
    } finally {
      vi.doUnmock('@sovitech/domain');
      vi.resetModules();
    }
  });

  it('reads a well-formed marker whose features are all declared', () => {
    expect(readPendingMarker('G1-4', '// @pending-until: phase 2 verify-proposal\n')).toEqual(stubMarker);
  });
});
