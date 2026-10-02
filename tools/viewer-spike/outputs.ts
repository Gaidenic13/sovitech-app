/**
 * Where the viewer spike's runner writes what it takes from a model, and how it erases it (phase 4 part B, A-11;
 * rule 13 "Erasure": every file derived from a document goes with it; ifc-input 6.2.16's stricter choice;
 * docs/adr/0046-viewer-spike.md decision 7).
 *
 * The bench's screenshots show the rendered model, so they are files derived from it: they are written where the store
 * keeps the model's derived files (`<root>/<projectId>/<contentHash>/derived/`), next to `viewer.frag`, and the store's
 * own `removeHash` erases them with it. The results folder holds sizes, times, memory, counts and codes only; the
 * erasure step also reads it and records any image left there, so a screenshot written beside the results (as the
 * first runs did) shows up as a failed erasure instead of passing unseen.
 */
import { readdir } from 'node:fs/promises';
import type { FileStore } from '../../apps/api/src/storage/file-store';

/** The bench's three screenshots of a model: after its first frame, after the orbit, after the storey steps. */
export const SHOT_NAMES = ['first-view', 'after-orbit', 'view'] as const;
export type ShotName = (typeof SHOT_NAMES)[number];

/** Each screenshot's path: a derived file of the model in the store, never a file of the results folder. */
export function shotPaths(store: FileStore, projectId: string, contentHash: string): Record<ShotName, string> {
  return {
    'first-view': store.derivedPath(projectId, contentHash, 'bench-first-view.png'),
    'after-orbit': store.derivedPath(projectId, contentHash, 'bench-after-orbit.png'),
    view: store.derivedPath(projectId, contentHash, 'bench-view.png'),
  };
}

/** A file name that holds an image (what a screenshot or a plan picture would be saved as). */
const IMAGE = /\.(?:png|jpe?g|webp|gif|bmp|avif|svg)$/iu;

/** The image files directly in a folder, by name (none when the folder does not exist). */
export async function imagesIn(directory: string): Promise<string[]> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile() && IMAGE.test(entry.name)).map((entry) => entry.name).sort();
  } catch {
    return [];
  }
}

/** What the erasure of one model found: the files keyed to its hash before and after, and any image in the results folder after. */
export interface Erasure {
  readonly filesBefore: number;
  readonly filesAfter: number;
  readonly imagesInResults: readonly string[];
}

/** Erases a model's files with the store's own erasure, then checks the store and the results folder. */
export async function eraseModel(store: FileStore, projectId: string, contentHash: string, resultsDirectory: string): Promise<Erasure> {
  const filesBefore = (await store.filesKeyedTo(projectId, contentHash)).length;
  await store.removeHash(projectId, contentHash);
  const filesAfter = (await store.filesKeyedTo(projectId, contentHash)).length;
  return { filesBefore, filesAfter, imagesInResults: await imagesIn(resultsDirectory) };
}
