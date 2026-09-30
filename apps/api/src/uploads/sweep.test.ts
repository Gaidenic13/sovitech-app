/**
 * The staging sweep of abandoned uploads (docs/adr/0019-resumable-uploads-chunk-protocol.md;
 * docs/adr/0028-upload-guard-fixtures-only.md; guardrails rule 13: an owner's bytes and file name are not kept beyond
 * what the app needs). The fix round 3 finding (the phase 2 verifier's closing check, from code reading): the sweep
 * deleted the session before it removed the staged bytes, so when the removal threw, the bytes (possibly not a
 * fixture's) stayed under `<projectId>/staging` with no session, and no later sweep found them. Now the sweep takes
 * the session, removes the bytes first, and deletes the session only after; a removal that fails gives the session
 * back, still abandoned, and the next sweep removes the bytes.
 *
 * The file store is the real one, on TEST bytes in a temporary folder. The session store is an in-memory stand-in that
 * keeps the store's rules for abandoned sessions and leases (packages/db/src/work.ts; the store's own functions are
 * proven on a TEST database in packages/db/src/upload-sweep.test.ts).
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { rm } from 'node:fs/promises';
import { FileStore } from '../storage/file-store';
import type { ApiServices } from '../services';
import { ABANDONED_UPLOAD_SECONDS, UploadSweepIncomplete, sweepAbandonedUploads, type AbandonedUploadStore } from './service';

const root = mkdtempSync(join(tmpdir(), 'sovitech-test-sweep-'));
afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

const PROJECT = '0192f0a0-0000-7000-8000-00000000c5a1';

interface TestSession {
  readonly projectId: string;
  lastActivity: number;
  state: 'open' | 'appending' | 'completing';
  leaseId?: string;
  leaseUntil?: number;
}

/** The store's rules for abandoned sessions (work.ts), in memory, on a clock the test moves. */
class TestSessions implements AbandonedUploadStore {
  readonly rows = new Map<string, TestSession>();
  now = 10_000_000;
  private leases = 0;

  private abandoned(row: TestSession, olderThanSeconds: number): boolean {
    return row.lastActivity < this.now - olderThanSeconds * 1000 && (row.state === 'open' || (row.leaseUntil !== undefined && row.leaseUntil < this.now));
  }

  readonly stale = (olderThanSeconds: number): Promise<{ id: string; projectId: string }[]> =>
    Promise.resolve([...this.rows.entries()].filter(([, row]) => this.abandoned(row, olderThanSeconds)).map(([id, row]) => ({ id, projectId: row.projectId })));

  readonly claim = (id: string, olderThanSeconds: number, leaseSeconds: number): Promise<string | undefined> => {
    const row = this.rows.get(id);
    if (row === undefined || !this.abandoned(row, olderThanSeconds)) return Promise.resolve(undefined);
    this.leases += 1;
    const leaseId = `test-lease-${String(this.leases)}`;
    Object.assign(row, { state: 'completing', leaseId, leaseUntil: this.now + leaseSeconds * 1000 });
    return Promise.resolve(leaseId);
  };

  readonly release = (id: string, leaseId: string): Promise<boolean> => {
    const row = this.rows.get(id);
    if (row?.leaseId !== leaseId) return Promise.resolve(false);
    row.state = 'open';
    delete row.leaseId;
    delete row.leaseUntil;
    return Promise.resolve(true);
  };

  readonly remove = (id: string, leaseId: string): Promise<boolean> => Promise.resolve(this.rows.get(id)?.leaseId === leaseId && this.rows.delete(id));

  /** An upload opened `ageSeconds` ago with no append since. */
  open(id: string, ageSeconds: number): void {
    this.rows.set(id, { projectId: PROJECT, lastActivity: this.now - ageSeconds * 1000, state: 'open' });
  }
}

/** The real file store, whose removal of staged bytes fails for the ids given, once each. */
class FailingFiles extends FileStore {
  readonly failOnce = new Set<string>();
  /** Whether the session was still stored each time a removal was attempted. */
  readonly sessionHeld: boolean[] = [];
  constructor(
    directory: string,
    private readonly sessions: TestSessions,
  ) {
    super(directory);
  }

  override async removeStaged(projectId: string, uploadId: string): Promise<void> {
    this.sessionHeld.push(this.sessions.rows.has(uploadId));
    if (this.failOnce.delete(uploadId)) throw new Error('TEST removal failure');
    await super.removeStaged(projectId, uploadId);
  }
}

function setUp(): { sessions: TestSessions; files: FailingFiles; services: Pick<ApiServices, 'store' | 'files'> } {
  const sessions = new TestSessions();
  const files = new FailingFiles(root, sessions);
  // The sweep reaches the store only through `sessions` here.
  const services = { store: undefined as unknown as ApiServices['store'], files };
  return { sessions, files, services };
}

describe('the staging sweep (ADR 0019, ADR 0028)', () => {
  it('F-INGEST-01 · rule 13 · ADR 0028: when removing an abandoned upload\'s bytes fails, its session stays, and the next sweep finds and removes the bytes', async () => {
    const { sessions, files, services } = setUp();
    const id = '0192f0a0-0000-7000-8000-00000000f5a1';
    sessions.open(id, ABANDONED_UPLOAD_SECONDS + 60);
    await files.startStaging(PROJECT, id);
    const lastActivity = sessions.rows.get(id)?.lastActivity;
    files.failOnce.add(id);

    await expect(sweepAbandonedUploads(services, ABANDONED_UPLOAD_SECONDS, sessions)).rejects.toBeInstanceOf(UploadSweepIncomplete);
    // The bytes were removed before the session, which was still there: the removal failed, and both stay.
    expect(files.sessionHeld).toEqual([true]);
    expect(await files.stagedSize(PROJECT, id)).toBe(0);
    expect(sessions.rows.get(id)).toMatchObject({ state: 'open', lastActivity });
    expect(await sessions.stale(ABANDONED_UPLOAD_SECONDS)).toEqual([{ id, projectId: PROJECT }]);

    // The next sweep finds the session and removes the bytes, then the session.
    expect(await sweepAbandonedUploads(services, ABANDONED_UPLOAD_SECONDS, sessions)).toEqual([id]);
    expect(await files.stagedSize(PROJECT, id)).toBeUndefined();
    expect(sessions.rows.has(id)).toBe(false);
    expect(files.sessionHeld).toEqual([true, true]);
  });

  it('F-INGEST-01 · ADR 0028: one failed removal does not stop the others; a fresh upload and one an append holds stay', async () => {
    const { sessions, files, services } = setUp();
    const failing = '0192f0a0-0000-7000-8000-00000000f5b1';
    const swept = '0192f0a0-0000-7000-8000-00000000f5b2';
    const fresh = '0192f0a0-0000-7000-8000-00000000f5b3';
    const held = '0192f0a0-0000-7000-8000-00000000f5b4';
    for (const id of [failing, swept, fresh, held]) await files.startStaging(PROJECT, id);
    sessions.open(failing, ABANDONED_UPLOAD_SECONDS + 60);
    sessions.open(swept, ABANDONED_UPLOAD_SECONDS + 60);
    sessions.open(fresh, 60);
    sessions.open(held, ABANDONED_UPLOAD_SECONDS + 60);
    Object.assign(sessions.rows.get(held) ?? {}, { state: 'appending', leaseId: 'test-append', leaseUntil: sessions.now + 60_000 });
    files.failOnce.add(failing);

    await expect(sweepAbandonedUploads(services, ABANDONED_UPLOAD_SECONDS, sessions)).rejects.toMatchObject({ code: 'upload_sweep_incomplete', sessionsLeft: 1 });
    expect(await files.stagedSize(PROJECT, swept)).toBeUndefined();
    expect(sessions.rows.has(swept)).toBe(false);
    for (const id of [failing, fresh, held]) expect(await files.stagedSize(PROJECT, id), id).toBe(0);
    expect([...sessions.rows.keys()].sort()).toEqual([failing, fresh, held].sort());

    expect(await sweepAbandonedUploads(services, ABANDONED_UPLOAD_SECONDS, sessions)).toEqual([failing]);
    expect(await files.stagedSize(PROJECT, failing)).toBeUndefined();
    expect([...sessions.rows.keys()].sort()).toEqual([fresh, held].sort());
  });
});
