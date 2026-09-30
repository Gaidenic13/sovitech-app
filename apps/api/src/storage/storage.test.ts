/**
 * The storage root and the file store (prompt 3 section 10, phase 2; section 7, "Documents
 * stay with their project"; rule 13; docs/adr/0025). Every file is TEST bytes in a
 * temporary folder.
 */
import { createHash } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough, Readable } from 'node:stream';
import { afterAll, describe, expect, it } from 'vitest';
import { DataDirectoryError, defaultDataDirectory, isInside, resolveDataDirectory } from './data-dir';
import { FileStore, FileStoreError } from './file-store';

const REPO = '/TEST/repo';

describe('the storage root (SOVITECH_DATA_DIR)', () => {
  it('F-INGEST-02 · prompt 3 phase 2: defaults to the application-support folder of each platform', () => {
    expect(defaultDataDirectory({ platform: 'darwin', home: '/Users/test' })).toBe('/Users/test/Library/Application Support/SOVITECH App/data');
    expect(defaultDataDirectory({ platform: 'linux', home: '/home/test' })).toBe('/home/test/.local/share/sovitech-app/data');
    expect(defaultDataDirectory({ platform: 'linux', home: '/home/test', xdgDataHome: '/data/xdg' })).toBe('/data/xdg/sovitech-app/data');
  });

  it('F-INGEST-02 · rule 13: takes an absolute folder outside the repository, and refuses a relative one or one inside the repository', () => {
    expect(resolveDataDirectory({ configured: '/srv/sovitech', platform: 'linux', home: '/home/test', repositoryRoot: REPO })).toBe('/srv/sovitech');
    expect(() => resolveDataDirectory({ configured: 'data', platform: 'linux', home: '/home/test', repositoryRoot: REPO })).toThrow(DataDirectoryError);
    expect(() => resolveDataDirectory({ configured: `${REPO}/fixtures/uploads`, platform: 'linux', home: '/home/test', repositoryRoot: REPO })).toThrow(/outside the repository/);
    expect(() => resolveDataDirectory({ configured: REPO, platform: 'linux', home: '/home/test', repositoryRoot: REPO })).toThrow(/outside the repository/);
    expect(isInside(REPO, `${REPO}-sibling`)).toBe(false);
  });
});

describe('the file store', () => {
  const root = mkdtempSync(join(tmpdir(), 'sovitech-test-store-'));
  const store = new FileStore(root);
  const project = '0192f0a0-0000-7000-8000-00000000c0a1';
  const other = '0192f0a0-0000-7000-8000-00000000c0a2';
  const upload = '0192f0a0-0000-7000-8000-00000000f001';

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('US-DOCS-11 · F-INGEST-02 · rule 13: keys every place by project id and content hash, and refuses any other name', () => {
    const hash = `sha256:${'a'.repeat(64)}`;
    expect(store.originalPath(project, hash)).toBe(join(root, project, hash, 'original'));
    expect(store.derivedPath(project, hash, 'model.glb')).toBe(join(root, project, hash, 'derived', 'model.glb'));
    expect(store.originalPath(project, hash)).not.toBe(store.originalPath(other, hash));
    for (const bad of [() => store.originalPath('../etc', hash), () => store.originalPath(project, '../../x'), () => store.derivedPath(project, hash, '../original'), () => store.stagingPath(project, 'x/y')]) {
      expect(bad).toThrow(FileStoreError);
    }
  });

  it('US-DOCS-01 · F-INGEST-01 · F-INGEST-02: stages chunks, hashes the whole, and moves it under its content hash; a chunk past its room leaves nothing of it', async () => {
    await store.startStaging(project, upload);
    expect(await store.appendChunk(project, upload, Readable.from([Buffer.from('TEST first ')]), 64)).toBe(11);
    await expect(store.appendChunk(project, upload, Readable.from([Buffer.from('TEST too long for its room')]), 4)).rejects.toMatchObject({ code: 'chunk_too_large' });
    expect(await store.stagedSize(project, upload)).toBe(11);
    expect(await store.appendChunk(project, upload, Readable.from([Buffer.from('second')]), 64)).toBe(17);
    const hash = await store.sealStaged(project, upload, 17);
    expect(hash).toMatch(/^sha256:[0-9a-f]{64}$/u);
    await store.promoteSealed(project, upload, hash);
    await store.removeStaged(project, upload);
    expect(await readFile(store.originalPath(project, hash), 'utf8')).toBe('TEST first second');
    expect(await store.stagedSize(project, upload)).toBeUndefined();
    expect(await store.hashesOf(project)).toEqual([hash]);
    expect(await store.filesKeyedTo(project, hash)).toEqual([store.originalPath(project, hash)]);
    await store.removeHash(project, hash);
    expect(await store.filesKeyedTo(project, hash)).toEqual([]);
  });

  it('F-INGEST-01 · F-INGEST-02 · ADR 0028: two appends racing at one offset never put unhashed bytes under the fixture\'s hash: the stored original is exactly the sealed, hashed bytes', async () => {
    // The upload hash race of the phase 2 review, at the file store: two appends that both passed the
    // offset check (the upload's lease now refuses the second; this proves the store holds even so).
    const racing = '0192f0a0-0000-7000-8000-00000000f002';
    const fixture = Buffer.from('%PDF-1.4 TEST synthetic bytes standing in for a fixture\n%%EOF\n');
    await store.startStaging(project, racing);
    const first = new PassThrough();
    const second = new PassThrough();
    const firstDone = store.appendChunk(project, racing, first, fixture.length);
    const secondDone = store.appendChunk(project, racing, second, fixture.length);
    await new Promise((resolve) => setTimeout(resolve, 50));
    first.end(fixture);
    expect(await firstDone).toBe(fixture.length);

    // The completion seals exactly the declared bytes while hashing them, and stores that copy.
    const hash = await store.sealStaged(project, racing, fixture.length);
    expect(hash).toBe(`sha256:${createHash('sha256').update(fixture).digest('hex')}`);
    await store.promoteSealed(project, racing, hash);

    // The second descriptor now writes TEST bytes that were never hashed: they reach the staged file only.
    second.end(Buffer.from('\nTEST bytes that no guard ever saw\n'));
    await secondDone;
    const original = await readFile(store.originalPath(project, hash));
    expect(original.equals(fixture)).toBe(true);
    expect(`sha256:${createHash('sha256').update(original).digest('hex')}`).toBe(hash);
    await store.removeStaged(project, racing);
    expect(await store.stagedSize(project, racing)).toBeUndefined();
    await store.removeHash(project, hash);
  });

  it('F-INGEST-02 · ADR 0019: a staged file shorter than the declared size is never sealed, and an append slower than its deadline leaves nothing of itself', async () => {
    const short = '0192f0a0-0000-7000-8000-00000000f003';
    await store.startStaging(project, short);
    expect(await store.appendChunk(project, short, Readable.from([Buffer.from('TEST ten b')]), 64)).toBe(10);
    await expect(store.sealStaged(project, short, 11)).rejects.toMatchObject({ code: 'staged_changed' });
    await expect(stat(store.sealedPath(project, short))).rejects.toMatchObject({ code: 'ENOENT' });
    const slow = new PassThrough();
    const slowDone = store.appendChunk(project, short, slow, 64, 50);
    slow.write(Buffer.from('TEST partial'));
    await expect(slowDone).rejects.toMatchObject({ code: 'chunk_timeout' });
    expect(await store.stagedSize(project, short)).toBe(10);
    await store.removeStaged(project, short);
  });
});
