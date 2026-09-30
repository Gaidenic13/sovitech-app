/**
 * The file store (prompt 3 section 10, phase 2; section 7, "Documents stay with
 * their project"; rule 13, "Isolation"; docs/adr/0025-document-storage-and-ingestion.md).
 *
 * Every stored file and every file derived from it lives under
 * `<root>/<projectId>/<contentHash>/`:
 *   original             the bytes as uploaded
 *   derived/<name>        converted models, plan images, thumbnails, page images
 *   work/<jobId>/         an analysis job's output folder, removed once ingested
 * and bytes still in flight under `<root>/<projectId>/staging/<uploadId>`, so a
 * project's erasure reaches them too. Two projects that upload byte-identical
 * files hold two copies, keyed apart, and nothing is shared (G13-4).
 *
 * A completed upload is never the staged file itself: its declared bytes are copied
 * into `staging/<uploadId>.sealed` while they are hashed, and that sealed copy is what
 * moves under the content hash, so the stored original holds exactly the bytes whose
 * hash the owner's fixtures-only guard checked (ADR 0019; ADR 0028).
 *
 * Every name that becomes a path is checked against its pattern first (a UUID, a
 * content hash, a derived file's name), so no input can climb out of its folder.
 */
import { createHash } from 'node:crypto';
import { constants, createReadStream, type ReadStream } from 'node:fs';
import { mkdir, open, readdir, rename, rm, stat, truncate, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';

/** Opens a file for reading without following a symbolic link at its last step. */
const READ_NO_FOLLOW = constants.O_RDONLY | constants.O_NOFOLLOW;
/** Creates a new file for writing; refuses one that exists, a link included (O_EXCL). */
const CREATE_NEW = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW;
/** Appends to an existing file, never through a symbolic link. */
const APPEND_NO_FOLLOW = constants.O_WRONLY | constants.O_APPEND | constants.O_NOFOLLOW;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CONTENT_HASH = /^sha256:[0-9a-f]{64}$/;
/** A derived file's name (the extraction contract's Derivative.relativePath, last segment). */
const DERIVED_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export class FileStoreError extends Error {
  override name = 'FileStoreError';

  constructor(readonly code: 'bad_key' | 'chunk_too_large' | 'chunk_timeout' | 'missing' | 'staged_changed') {
    super(code);
  }
}

function checkedProject(projectId: string): string {
  if (!UUID.test(projectId)) throw new FileStoreError('bad_key');
  return projectId;
}

function checkedHash(contentHash: string): string {
  if (!CONTENT_HASH.test(contentHash)) throw new FileStoreError('bad_key');
  return contentHash;
}

function checkedId(id: string): string {
  if (!UUID.test(id)) throw new FileStoreError('bad_key');
  return id;
}

/**
 * Counts bytes through a stream. Past the limit it writes nothing more and reads the rest
 * of the chunk to its end (so the request finishes and gets its refusal), and past a hard
 * ceiling it stops the stream.
 */
class ByteLimit extends Transform {
  bytes = 0;
  exceeded = false;

  constructor(private readonly limit: number) {
    super();
  }

  override _transform(chunk: Buffer, _encoding: BufferEncoding, done: (error?: Error | null, data?: Buffer) => void): void {
    this.bytes += chunk.length;
    if (this.bytes > this.limit + CEILING_BYTES) done(new FileStoreError('chunk_too_large'));
    else if (this.bytes > this.limit) {
      this.exceeded = true;
      done();
    } else done(null, chunk);
  }
}

/** How far past its limit a chunk is read to its end before the stream is stopped. */
const CEILING_BYTES = 16 * 1024 * 1024;

export class FileStore {
  constructor(readonly root: string) {}

  projectDirectory(projectId: string): string {
    return join(this.root, checkedProject(projectId));
  }

  hashDirectory(projectId: string, contentHash: string): string {
    return join(this.projectDirectory(projectId), checkedHash(contentHash));
  }

  originalPath(projectId: string, contentHash: string): string {
    return join(this.hashDirectory(projectId, contentHash), 'original');
  }

  derivedDirectory(projectId: string, contentHash: string): string {
    return join(this.hashDirectory(projectId, contentHash), 'derived');
  }

  derivedPath(projectId: string, contentHash: string, name: string): string {
    if (!DERIVED_NAME.test(name)) throw new FileStoreError('bad_key');
    return join(this.derivedDirectory(projectId, contentHash), name);
  }

  workDirectory(projectId: string, contentHash: string, jobId: string): string {
    return join(this.hashDirectory(projectId, contentHash), 'work', checkedId(jobId));
  }

  stagingPath(projectId: string, uploadId: string): string {
    return join(this.projectDirectory(projectId), 'staging', checkedId(uploadId));
  }

  /**
   * The sealed copy of a completed upload: the declared bytes, copied out of the staged file
   * while they are hashed, written only by the completion, and moved under the content hash.
   */
  sealedPath(projectId: string, uploadId: string): string {
    return `${this.stagingPath(projectId, uploadId)}.sealed`;
  }

  /** Bytes staged for an upload so far, or undefined when nothing is staged. */
  async stagedSize(projectId: string, uploadId: string): Promise<number | undefined> {
    try {
      return (await stat(this.stagingPath(projectId, uploadId))).size;
    } catch {
      return undefined;
    }
  }

  /** Creates the empty staging file of a new upload. */
  async startStaging(projectId: string, uploadId: string): Promise<void> {
    const path = this.stagingPath(projectId, uploadId);
    await mkdir(join(this.projectDirectory(projectId), 'staging'), { recursive: true, mode: 0o700 });
    await writeFile(path, new Uint8Array(), { flag: 'wx', mode: 0o600 });
  }

  /**
   * Appends one chunk to a staged upload, streaming it straight to the file, and stops
   * past `maxBytes` (the staged file is then cut back to where it was) or past the
   * deadline (the same). Returns the bytes staged after it. The caller holds the upload's
   * lease (migration 0011), so no other request writes the file meanwhile; the deadline
   * ends the write before that lease can end.
   */
  async appendChunk(projectId: string, uploadId: string, chunk: Readable, maxBytes: number, deadlineMs?: number): Promise<number> {
    const path = this.stagingPath(projectId, uploadId);
    const before = await this.stagedSize(projectId, uploadId);
    if (before === undefined) throw new FileStoreError('missing');
    const limit = new ByteLimit(maxBytes);
    const signal = deadlineMs === undefined ? undefined : AbortSignal.timeout(deadlineMs);
    try {
      const target = (await open(path, APPEND_NO_FOLLOW)).createWriteStream();
      if (signal === undefined) await pipeline(chunk, limit, target);
      else await pipeline(chunk, limit, target, { signal });
    } catch (error) {
      await truncate(path, before);
      if (signal?.aborted === true) throw new FileStoreError('chunk_timeout');
      throw error;
    }
    if (limit.exceeded) {
      await truncate(path, before);
      throw new FileStoreError('chunk_too_large');
    }
    return before + limit.bytes;
  }

  /**
   * Seals a staged upload for its completion: copies exactly its first `size` bytes into a
   * new file (created here, O_EXCL, that no other descriptor holds) while hashing them, and
   * returns their SHA-256 as `sha256:<hex>`. What is hashed is what is kept: bytes another
   * descriptor appends to the staged file later never reach the sealed copy, and a staged
   * file shorter than `size` is refused (`staged_changed`). The staged file is left as it is,
   * so a completion that fails can be tried again.
   */
  async sealStaged(projectId: string, uploadId: string, size: number): Promise<string> {
    if (!Number.isSafeInteger(size) || size < 1) throw new FileStoreError('staged_changed');
    const sealed = this.sealedPath(projectId, uploadId);
    await rm(sealed, { force: true });
    const hash = createHash('sha256');
    let copied = 0;
    const hashing = new Transform({
      transform(chunk: Buffer, _encoding, done) {
        copied += chunk.length;
        hash.update(chunk);
        done(null, chunk);
      },
    });
    try {
      const source = await open(this.stagingPath(projectId, uploadId), READ_NO_FOLLOW);
      const target = await open(sealed, CREATE_NEW, 0o600).catch(async (error: unknown) => {
        await source.close();
        throw error;
      });
      await pipeline(source.createReadStream({ start: 0, end: size - 1 }), hashing, target.createWriteStream());
    } catch (error) {
      await rm(sealed, { force: true });
      throw error;
    }
    if (copied !== size) {
      await rm(sealed, { force: true });
      throw new FileStoreError('staged_changed');
    }
    return `sha256:${hash.digest('hex')}`;
  }

  /**
   * Moves a sealed upload to its place under its project and content hash. When the project
   * already holds these bytes, the sealed copy is dropped (one copy per project). The staged
   * file is not touched: `removeStaged` removes it once the document is registered.
   */
  async promoteSealed(projectId: string, uploadId: string, contentHash: string): Promise<void> {
    const target = this.originalPath(projectId, contentHash);
    const sealed = this.sealedPath(projectId, uploadId);
    await mkdir(this.hashDirectory(projectId, contentHash), { recursive: true, mode: 0o700 });
    if (await this.exists(target)) {
      await rm(sealed, { force: true });
      return;
    }
    await rename(sealed, target);
  }

  /** Removes an upload's staged bytes and its sealed copy, if any. */
  async removeStaged(projectId: string, uploadId: string): Promise<void> {
    await rm(this.stagingPath(projectId, uploadId), { force: true });
    await rm(this.sealedPath(projectId, uploadId), { force: true });
  }

  /** Every file keyed to a content hash in a project: the original, derived files and job folders. */
  async removeHash(projectId: string, contentHash: string): Promise<void> {
    await rm(this.hashDirectory(projectId, contentHash), { recursive: true, force: true });
  }

  /** The content hashes a project holds files for. */
  async hashesOf(projectId: string): Promise<string[]> {
    try {
      const entries = await readdir(this.projectDirectory(projectId), { withFileTypes: true });
      return entries.filter((entry) => entry.isDirectory() && CONTENT_HASH.test(entry.name)).map((entry) => entry.name).sort();
    } catch {
      return [];
    }
  }

  /** Every file path under a content hash of a project (for tests and the erasure's own check). */
  async filesKeyedTo(projectId: string, contentHash: string): Promise<string[]> {
    const found: string[] = [];
    const walk = async (directory: string): Promise<void> => {
      let entries;
      try {
        entries = await readdir(directory, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) await walk(path);
        else found.push(path);
      }
    };
    await walk(this.hashDirectory(projectId, contentHash));
    return found.sort();
  }

  async exists(path: string): Promise<boolean> {
    try {
      await stat(path);
      return true;
    } catch {
      return false;
    }
  }

  /** The stored original of a document, for Download and the extractor's read-only mount. */
  openOriginal(projectId: string, contentHash: string): ReadStream {
    return createReadStream(this.originalPath(projectId, contentHash));
  }
}
