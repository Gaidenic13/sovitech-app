import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { FileStore } from '../../apps/api/src/storage/file-store';
import { SHOT_NAMES, eraseModel, imagesIn, shotPaths } from './outputs';

const PROJECT = '0192f0e4-7e57-7000-8000-00000000a011';
const HASH = `sha256:${'a11'.padStart(64, '0')}`;
/** Bytes that stand in for a PNG of the rendered TEST model (the signature only). */
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const folders: string[] = [];

async function work(): Promise<{ store: FileStore; storeRoot: string; results: string }> {
  const root = await mkdtemp(join(tmpdir(), 'viewer-spike-outputs-'));
  folders.push(root);
  const results = join(root, 'results');
  await mkdir(results, { recursive: true });
  return { store: new FileStore(join(root, 'store')), storeRoot: join(root, 'store'), results };
}

/** What the runner writes for one model: the converted file and the bench's three screenshots (at the paths it uses), and the results. */
async function writeModelRun(store: FileStore, results: string): Promise<void> {
  const fragments = store.derivedPath(PROJECT, HASH, 'viewer.frag');
  await mkdir(dirname(fragments), { recursive: true });
  await writeFile(fragments, 'TEST fragments');
  for (const path of Object.values(shotPaths(store, PROJECT, HASH))) await writeFile(path, PNG);
  await writeFile(join(results, 'results.json'), '{"models":[]}\n');
  await writeFile(join(results, 'arh.summary.json'), '{"fragmentsBytes":14}\n');
}

afterEach(async () => {
  for (const folder of folders.splice(0)) await rm(folder, { recursive: true, force: true });
});

describe('the viewer spike runner: what it writes of a model goes with the model (A-11)', () => {
  it("A-11 · rule 13 'Erasure' · ADR 0046 decision 7: the bench's screenshots of a model are derived files under the model's own hash folder, never in the results folder", async () => {
    const { store, storeRoot, results } = await work();
    const hashFolder = join(storeRoot, PROJECT, HASH);
    const paths = shotPaths(store, PROJECT, HASH);
    expect(Object.keys(paths)).toEqual([...SHOT_NAMES]);
    for (const path of Object.values(paths)) {
      expect(relative(hashFolder, path).split(sep)).toEqual(['derived', expect.stringMatching(/^bench-[a-z-]+\.png$/u)]);
      expect(relative(results, path).startsWith('..')).toBe(true);
    }
  });

  it("A-11 · rule 13 'Erasure' · ADR 0046 decision 7: after a model's erasure no file keyed to its hash remains and the results folder holds no image of the model", async () => {
    const { store, results } = await work();
    await writeModelRun(store, results);
    expect(await store.filesKeyedTo(PROJECT, HASH)).toHaveLength(4);
    const erasure = await eraseModel(store, PROJECT, HASH, results);
    expect(erasure).toEqual({ filesBefore: 4, filesAfter: 0, imagesInResults: [] });
    // The results keep sizes, times, memory, counts and codes only.
    expect((await readdir(results)).sort()).toEqual(['arh.summary.json', 'results.json']);
  });

  it('A-11: a screenshot left in the results folder, as the first runs wrote them, is reported by the erasure step, never passed over', async () => {
    const { store, results } = await work();
    await writeModelRun(store, results);
    await writeFile(join(results, 'arh-first-view.png'), PNG);
    await writeFile(join(results, 'arh.png'), PNG);
    const erasure = await eraseModel(store, PROJECT, HASH, results);
    expect(erasure.filesAfter).toBe(0);
    expect(erasure.imagesInResults).toEqual(['arh-first-view.png', 'arh.png']);
    expect(await imagesIn(join(results, 'missing'))).toEqual([]);
  });
});
