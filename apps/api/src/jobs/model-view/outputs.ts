/**
 * The converter's files, checked before anything is kept (the viewer step, part 1; docs/build-log.md, "The viewer
 * step", item 3: "Its output: a code only on stdout, and `summary.json` with sizes, times and memory only (rule 13)").
 *
 * - `summary.json` is read through the API's reviewed reader of one JSON value (../read-output.ts,
 *   `readExtractorOutput`, which the lint ban's `json-parse-reviewed` list already covers: no new `JSON.parse`), and
 *   checked to be the converter's one shape: the code `written`, and whole bytes, milliseconds and memory. Nothing else
 *   is taken from it; the profile, the Node version and the cgroup's text are not read.
 * - `storeys.json`, the storey index, is never parsed (no page reads it in this step: PRD R-080). It is checked, byte by
 *   byte, to hold nothing but its three keys, GlobalIds (22 characters of IFC's base 64 alphabet) and JSON's
 *   punctuation: no name, elevation or other attribute of the model is kept in it (ifc-input 6.2.15, the stricter
 *   choice). A GlobalId is kept as its author wrote it, so it can carry text in that alphabet (`Hotel_Name_Floor1...`):
 *   the check cannot tell, and so no GlobalId is shown or logged while `ifc-values` is closed (the review of part 1,
 *   A-9).
 * - Each file's size must be the size the summary states.
 * Any failure refuses the whole output (`output_refused`), and nothing of it is stored.
 */
import { open } from 'node:fs/promises';
import { readExtractorOutput } from '../read-output';
import { CONVERSION_FILES } from './sandbox';

/** What the job keeps of a summary: sizes, times and memory, never a value. */
export interface ConversionSummary {
  readonly inputBytes: number;
  readonly fragmentsBytes: number;
  readonly indexBytes: number;
  readonly importMs: number;
  readonly metadataMs: number;
  readonly indexMs: number;
  readonly maxRssKiB: number;
}

/** The summary's whole numbers (bytes, KiB) and its times (milliseconds). */
type WholeField = 'inputBytes' | 'fragmentsBytes' | 'indexBytes' | 'maxRssKiB';
type TimeField = 'importMs' | 'metadataMs' | 'indexMs';

/** The bounds of a summary's one line (64 KiB: the converter writes a few hundred bytes). */
const SUMMARY_LIMITS = { outputBytes: CONVERSION_FILES.summary.maxBytes, lineBytes: 1, gatedBytes: 1 } as const;

/** Reads and checks a converter's summary; undefined when it is not one. */
export async function readConversionSummary(path: string): Promise<ConversionSummary | undefined> {
  const read = await readExtractorOutput(path, SUMMARY_LIMITS);
  if (!read.ok) return undefined;
  const value = read.value;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const fields = value as Readonly<Record<string, unknown>>;
  if (fields['code'] !== 'written') return undefined;
  const whole = (key: WholeField): number | undefined => {
    const field = fields[key];
    return typeof field === 'number' && Number.isSafeInteger(field) && field >= 0 && field <= 2147483647 ? field : undefined;
  };
  const time = (key: TimeField): number | undefined => {
    const field = fields[key];
    return typeof field === 'number' && Number.isFinite(field) && field >= 0 ? field : undefined;
  };
  const inputBytes = whole('inputBytes');
  const fragmentsBytes = whole('fragmentsBytes');
  const indexBytes = whole('indexBytes');
  const maxRssKiB = whole('maxRssKiB');
  const importMs = time('importMs');
  const metadataMs = time('metadataMs');
  const indexMs = time('indexMs');
  if (
    inputBytes === undefined ||
    fragmentsBytes === undefined ||
    indexBytes === undefined ||
    maxRssKiB === undefined ||
    importMs === undefined ||
    metadataMs === undefined ||
    indexMs === undefined
  ) {
    return undefined;
  }
  return { inputBytes, fragmentsBytes, indexBytes, importMs, metadataMs, indexMs, maxRssKiB };
}

/** A storey index's keys, written as JSON strings. */
const INDEX_KEYS = /"(?:storeys|storey|elements)"/g;
/** A GlobalId written as a JSON string. */
const GLOBAL_ID_TOKEN = /"[0-9A-Za-z_$]{22}"/g;
/** What may be left once the keys and the GlobalIds are taken out: JSON's punctuation and the line end. */
const PUNCTUATION_ONLY = /^[[\]{},:\n]*$/;

/**
 * Whether a storey index file holds nothing but its keys, GlobalIds and punctuation, starting as the converter writes
 * it. Read as Latin-1, so any byte outside ASCII stays a character the check refuses.
 */
export async function storeyIndexHoldsIdsOnly(path: string): Promise<boolean> {
  const handle = await open(path, 'r');
  try {
    const text = await handle.readFile({ encoding: 'latin1' });
    if (!text.startsWith('{"storeys":[')) return false;
    return PUNCTUATION_ONLY.test(text.replace(GLOBAL_ID_TOKEN, '').replace(INDEX_KEYS, ''));
  } finally {
    await handle.close();
  }
}

/** A file's size in bytes, read from the open descriptor, or undefined when it is not a regular file. */
export async function regularFileBytes(path: string): Promise<number | undefined> {
  const handle = await open(path, 'r').catch(() => undefined);
  if (handle === undefined) return undefined;
  try {
    const status = await handle.stat();
    return status.isFile() ? status.size : undefined;
  } finally {
    await handle.close();
  }
}
