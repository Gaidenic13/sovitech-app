/**
 * One conversion: an IFC model to a Fragments file for viewing, with That Open's IfcImporter on
 * web-ifc (prompt 3 section 8, "Conversion"; docs/adr/0046-viewer-spike.md decisions 1 and 2).
 *
 * The model is read through the importer's read callback, a chunk at a time, so no copy of the
 * whole file is held in JavaScript next to web-ifc's own. The result is deflated Fragments with the
 * header metadata emptied and the library's own items removed (the view profile, ./importer.ts;
 * viewDerivative below). Nothing here logs or returns model text: the outcome carries sizes and
 * times only (rule 13).
 */
import { closeSync, fstatSync, openSync, readSync } from 'node:fs';
import { EditRequestType, SingleThreadedFragmentsModel } from '@thatopen/fragments';
import { type ConversionProfile, viewerImporter } from './importer';

/** The size of one read of the model file. */
const CHUNK_BYTES = 1024 * 1024;

/**
 * The model id written into every converted file. The importer writes a random one when none is
 * given, so two conversions of one model would differ; with a fixed id the same model and settings
 * give the same bytes, and a converted file can be checked against its source again.
 */
export const CONVERTED_MODEL_ID = 'sovitech-view';

export interface ConversionTimes {
  /** The importer's run: both of web-ifc's passes (geometry, then properties) and the Fragments writer. */
  readonly importMs: number;
  /**
   * The pass after the import (viewDerivative): the header metadata emptied and the library's own
   * items removed, the Fragments file opened in one thread, edited and saved.
   */
  readonly metadataMs: number;
}

export interface Conversion {
  /** The deflated Fragments file. */
  readonly fragments: Uint8Array;
  readonly inputBytes: number;
  readonly times: ConversionTimes;
}

/** The importer's read callback: the model's bytes at `offset`, at most `size` of them. */
export type ModelReader = (offset: number, size: number) => Uint8Array;

/** A read callback over an open file. */
function fileReader(descriptor: number): ModelReader {
  const buffer = Buffer.alloc(CHUNK_BYTES);
  return (offset, size) => {
    const wanted = Math.min(size, CHUNK_BYTES);
    const read = readSync(descriptor, buffer, { offset: 0, length: wanted, position: offset });
    return buffer.subarray(0, read);
  };
}

/**
 * The library's own categories: every category that is not an IFC class's name (`IFCWALL`, the
 * category the importer gives an item it reads from IFC). In @thatopen/fragments 3.4.7 these are
 * `ThatOpenGrid` (one item per IfcGrid) and `ThatOpenAlignment` (one per IFC4x3 alignment), written
 * outside the view profile's attribute exclusion: each holds one attribute, `data`, with JSON read
 * from the model, the grid's axis tags included (ADR 0046 Finding 12). Matched by what they are
 * not, so a category a later version adds is removed too.
 */
const LIBRARY_OWN_CATEGORY = /^(?!IFC[A-Z0-9]+$)/;

/**
 * Makes the imported file a view derivative (rule 2; ifc-input 6.2.15; prompt 3 section 8): it
 * removes what the importer writes outside the view profile's attribute exclusion, and saves the
 * file deflated.
 * - The STEP header (FILE_NAME and FILE_DESCRIPTION: file name, authors, organisations, tools),
 *   which the importer copies into the metadata: the metadata is written empty.
 * - Every item of the library's own categories (LIBRARY_OWN_CATEGORY), with its `data`: the grid's
 *   placement, its axis curves and every axis tag, and an alignment's curves. The IfcGrid itself
 *   stays an IFC item with its GlobalId and nothing else, like every other item of the profile.
 */
export function viewDerivative(fragments: Uint8Array): Uint8Array {
  const model = new SingleThreadedFragmentsModel('viewer-spike-view', fragments);
  try {
    const libraryItems = Object.values(model.getItemsOfCategories([LIBRARY_OWN_CATEGORY])).flat();
    model.edit([
      // A metadata request names no item; the editor reads no local id from it.
      { type: EditRequestType.UPDATE_METADATA, localId: 0, data: {} },
      ...libraryItems.map((localId) => ({ type: EditRequestType.DELETE_ITEM, localId }) as const),
    ]);
    const saved = model.save(false);
    return saved instanceof Uint8Array ? saved : new Uint8Array(saved);
  } finally {
    model.dispose();
  }
}

/**
 * Converts a model of `inputBytes` bytes read through `read`. `wasmDirectory`: see viewerImporter.
 * The command line converts a file (convertModel, below); the tests also convert synthetic models
 * held in memory, so no model file is written for them (./convert.test.ts).
 */
export async function convertFromReader(
  read: ModelReader,
  inputBytes: number,
  wasmDirectory: string,
  profile: ConversionProfile = 'view',
): Promise<Conversion> {
  const importer = viewerImporter(wasmDirectory, profile);
  const started = performance.now();
  const imported = await importer.process({ id: CONVERTED_MODEL_ID, readFromCallback: true, readCallback: read, raw: false });
  const importedAt = performance.now();
  const fragments = profile === 'view' ? viewDerivative(imported) : imported;
  const finished = performance.now();
  return {
    fragments,
    inputBytes,
    times: { importMs: importedAt - started, metadataMs: finished - importedAt },
  };
}

/** Converts the model at `inputPath`. `wasmDirectory`: see viewerImporter. */
export async function convertModel(inputPath: string, wasmDirectory: string, profile: ConversionProfile = 'view'): Promise<Conversion> {
  const descriptor = openSync(inputPath, 'r');
  try {
    return await convertFromReader(fileReader(descriptor), fstatSync(descriptor).size, wasmDirectory, profile);
  } finally {
    closeSync(descriptor);
  }
}
