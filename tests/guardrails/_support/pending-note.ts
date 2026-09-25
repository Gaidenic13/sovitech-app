/**
 * The pending wrapper's record of a held-out case, shared by the wrapper
 * (pending.ts, in the test workers) and the run guard
 * (tools/vitest/guardrail-run-guard.ts, in Vitest's main process). It has no
 * runtime import of vitest, so the run guard can load it outside a test.
 *
 * When the wrapper skips a test, it writes this record into the test's meta
 * under PENDING_META_KEY and skips with the note `pendingNote(record)`. The run
 * guard accepts a skipped guardrail test only with both, from a case file that
 * starts with the marker and imports the wrapper (docs/adr/0004).
 */
import type { DomainFeature } from '@sovitech/domain';

/** Every pending skip note starts with this; `run-all` and the reports use the same words. */
export const PENDING_NOTE_PREFIX = 'pending: no automated check yet';

/** The key of the wrapper's record in Vitest's task meta. */
export const PENDING_META_KEY = 'sovitechPending';

/** What the wrapper records when it holds a test out. */
export interface PendingRecord {
  /** The case id the file is named after. */
  readonly caseId: string;
  /** The feature whose NotImplementedError the body threw; the marker names it. */
  readonly feature: DomainFeature;
  /** The phase the marker names. */
  readonly phase: number;
}

/** The note a pending skip carries. */
export function pendingNote(record: Pick<PendingRecord, 'feature' | 'phase'>): string {
  return `${PENDING_NOTE_PREFIX} (${record.feature} is not implemented; phase ${record.phase})`;
}

declare module 'vitest' {
  interface TaskMeta {
    /** Written only by the pending wrapper (tests/guardrails/_support/pending.ts). */
    sovitechPending?: PendingRecord;
  }
}
