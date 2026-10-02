/**
 * One conversion: an IFC model to a Fragments file for viewing, with That Open's IfcImporter on
 * web-ifc (prompt 3 section 8, "Conversion"; docs/adr/0046-viewer-spike.md decisions 1 and 2).
 *
 * The model is read through the importer's read callback, a chunk at a time, so no copy of the
 * whole file is held in JavaScript next to web-ifc's own. The result is deflated Fragments with the
 * header metadata emptied (the view profile, ./importer.ts). Nothing here logs or returns model
 * text: the outcome carries sizes and times only (rule 13).
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
  /** Emptying the header metadata: the Fragments file opened in one thread, edited and saved. */
  readonly metadataMs: number;
}

export interface Conversion {
  /** The deflated Fragments file. */
  readonly fragments: Uint8Array;
  readonly inputBytes: number;
  readonly times: ConversionTimes;
}

/** A read callback over an open file: the bytes at `offset`, at most `size` of them. */
function fileReader(descriptor: number): (offset: number, size: number) => Uint8Array {
  const buffer = Buffer.alloc(CHUNK_BYTES);
  return (offset, size) => {
    const wanted = Math.min(size, CHUNK_BYTES);
    const read = readSync(descriptor, buffer, { offset: 0, length: wanted, position: offset });
    return buffer.subarray(0, read);
  };
}

/**
 * Removes what the importer copies from the STEP header (FILE_NAME and FILE_DESCRIPTION: file
 * name, authors, organisations, tools) by writing empty metadata, and saves the file deflated.
 */
export function withoutHeaderMetadata(fragments: Uint8Array): Uint8Array {
  const model = new SingleThreadedFragmentsModel('viewer-spike-metadata', fragments);
  try {
    // A metadata request names no item; the editor reads no local id from it.
    model.edit([{ type: EditRequestType.UPDATE_METADATA, localId: 0, data: {} }]);
    const saved = model.save(false);
    return saved instanceof Uint8Array ? saved : new Uint8Array(saved);
  } finally {
    model.dispose();
  }
}

/** Converts the model at `inputPath`. `wasmDirectory`: see viewerImporter. */
export async function convertModel(inputPath: string, wasmDirectory: string, profile: ConversionProfile = 'view'): Promise<Conversion> {
  const descriptor = openSync(inputPath, 'r');
  try {
    const inputBytes = fstatSync(descriptor).size;
    const importer = viewerImporter(wasmDirectory, profile);
    const started = performance.now();
    const imported = await importer.process({ id: CONVERTED_MODEL_ID, readFromCallback: true, readCallback: fileReader(descriptor), raw: false });
    const importedAt = performance.now();
    const fragments = profile === 'view' ? withoutHeaderMetadata(imported) : imported;
    const finished = performance.now();
    return {
      fragments,
      inputBytes,
      times: { importMs: importedAt - started, metadataMs: finished - importedAt },
    };
  } finally {
    closeSync(descriptor);
  }
}
