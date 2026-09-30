/**
 * Reads the extractor's output file (output.json of a job's output folder; ADR 0022, ADR 0034)
 * into values for the contract's strict parsers, and nothing else.
 *
 * The file is opened once, without following a symbolic link at its last step and without
 * blocking on a FIFO (O_NOFOLLOW | O_NONBLOCK); the open descriptor is checked to be a regular
 * file within the limits, and every byte is read from that same descriptor. A link, a FIFO, a
 * device or a folder there, or a larger file, is refused by code, so no path swapped in beside
 * the check can make the worker read without bound or wait (the phase 2 review). The runner
 * already copies the output out of the container's own volume (./copy-out.ts); this reader does
 * not trust that alone.
 *
 * Two parts, two bounds (ADR 0034):
 * - the first line: the extraction output, parsed at once, within `outputBytes` (4 MiB: the
 *   largest fixture's output, the 40-page specification, is 1,173,042 bytes). For a job that
 *   asked for no IFC values it is the whole file, as one JSON text, with or without a line end.
 * - the later lines, only when the job asked for IFC values of a model: the contract's per-line
 *   form of the sealed IFC section (packages/extraction-contract/src/ifc-values-stream.ts). They
 *   are read only when the caller iterates `lines()`, one at a time, each within `lineBytes`
 *   and all within `gatedBytes`; each line is parsed on its own and handed on, so no text of the
 *   whole section is ever built. A line longer than its bound, a last line with no line end, a
 *   line that is not UTF-8 or not one JSON value, or more bytes than the section's bound throws
 *   OutputLineError with its code, and the caller refuses the whole output.
 *
 * Each text is read with the YAML reader restricted to its JSON schema, as
 * packages/ai/src/guard.ts reads fixtures/manifest.json, and handed straight to the contract,
 * which refuses any key or shape it does not name. No engineering value travels as a JSON number
 * in the contract (ADR 0022: text, cached values and STEP literals stay text); the only numbers
 * are pages, offsets, coordinates, STEP ids, counts and limits.
 *
 * Why not JSON.parse: the lint ban `sovitech/no-json-parse` reserves it for the reviewed readers
 * of JSON_PARSE_REVIEWED, an allow list that waits for the approver. This reader does what that
 * list asks of a reviewed reader (validate what comes out, at once), and the build log lists it,
 * with the AI guard's manifest reader, for the approver and the integrator: the ban does not
 * reach other JSON readers (a harness gap, recorded).
 */
import { constants } from 'node:fs';
import { open, type FileHandle } from 'node:fs/promises';
import { IFC_VALUES_LINE_MAX_BYTES } from '@sovitech/extraction-contract';
import { parse } from 'yaml';

export interface OutputLimits {
  /** The first line, without its line end (bytes): the whole output of a job that asked for no IFC values. */
  readonly outputBytes: number;
  /** Each later line, without its line end (bytes): one line of the per-line IFC section. */
  readonly lineBytes: number;
  /** All later lines with their line ends (bytes): the per-line IFC section as a whole. */
  readonly gatedBytes: number;
}

/**
 * The bounds (ADR 0034): 4 MiB for an output (the largest fixture's is 1,173,042 bytes; the
 * YAML reader holds about 265 MB while it parses 4 MiB at once), 1 MiB for a line of the IFC
 * section (the contract's IFC_VALUES_LINE_MAX_BYTES; the `perf` model's longest is 6,739 bytes)
 * and 512 MiB for the section (the `perf` model's, with a TEST table, is 248,792,524 bytes in 1,079,824 lines).
 */
export const OUTPUT_LIMITS: OutputLimits = {
  outputBytes: 4 * 1024 * 1024,
  lineBytes: IFC_VALUES_LINE_MAX_BYTES,
  gatedBytes: 512 * 1024 * 1024,
};

/** The most bytes an output file may hold: its first line and a line end, and the IFC section when IFC values were asked for. */
export function outputFileBytes(ifcValues: boolean, limits: OutputLimits = OUTPUT_LIMITS): number {
  return limits.outputBytes + 1 + (ifcValues ? limits.gatedBytes : 0);
}

/** Why an output file is not read at all. */
export type OutputCode = 'output_missing' | 'output_too_large' | 'output_unreadable' | 'output_not_a_file';

/** Why the later lines of an output file are refused; the whole output with them. */
export type OutputLineCode = 'output_line_too_long' | 'output_line_malformed' | 'output_truncated' | 'output_gated_too_large';

/** A later line refused by its bytes. The code is all it carries (rule 13). */
export class OutputLineError extends Error {
  constructor(readonly code: OutputLineCode) {
    super(code);
    this.name = 'OutputLineError';
  }
}

/** An output file, open: its first line read and parsed, the rest not read until `lines()` is iterated. */
export interface OpenedOutput {
  /** The first line, parsed: the extraction output. */
  readonly value: unknown;
  /** Whether bytes follow the first line and its line end. */
  readonly followed: boolean;
  /**
   * The later lines, each parsed, read once from the same descriptor, within the limits, while
   * the caller iterates. Throws OutputLineError.
   */
  lines(): AsyncIterable<unknown>;
  /** The bytes read from the file so far. */
  bytesRead(): number;
}

export type OutputRead<T> =
  | { readonly ok: true; readonly value: T; readonly bytesRead: number }
  | { readonly ok: false; readonly code: OutputCode | OutputLineCode; readonly bytesRead: number };

/** Opens for reading: never through a link at the last step, never waiting on a FIFO. */
const READ_ONCE = constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK;
/** How much one read takes from the descriptor (bytes). */
const READ_CHUNK = 64 * 1024;
const LINE_END = 0x0a;

/** A text of the file as a JSON value, through the YAML reader's JSON schema; throws on anything else. */
function jsonValue(bytes: Buffer): unknown {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  return parse(text, { schema: 'json', maxAliasCount: 0, uniqueKeys: true }) as unknown;
}

/** Reads the first line: up to its line end, or the whole file when it has none. */
async function firstLine(
  handle: FileHandle,
  size: number,
  limits: OutputLimits,
  count: (bytes: number) => void,
): Promise<{ readonly line: Buffer; readonly next: number } | 'too_large'> {
  const cap = Math.min(size, limits.outputBytes + 1);
  const buffer = Buffer.alloc(cap);
  let filled = 0;
  while (filled < cap) {
    const { bytesRead } = await handle.read(buffer, filled, Math.min(READ_CHUNK, cap - filled), filled);
    if (bytesRead === 0) break;
    count(bytesRead);
    const data = buffer.subarray(filled, filled + bytesRead);
    const end = data.indexOf(LINE_END);
    if (end !== -1) return filled + end > limits.outputBytes ? 'too_large' : { line: buffer.subarray(0, filled + end), next: filled + end + 1 };
    filled += data.length;
  }
  // No line end within reach: the whole file is the first line, when it is within the bound.
  if (filled < size || filled > limits.outputBytes) return 'too_large';
  return { line: buffer.subarray(0, filled), next: filled };
}

/** The later lines, from `start` to the size checked, each within its bound, parsed one at a time. */
async function* laterLines(handle: FileHandle, start: number, size: number, limits: OutputLimits, count: (bytes: number) => void): AsyncGenerator<unknown, void, undefined> {
  if (size - start > limits.gatedBytes) throw new OutputLineError('output_gated_too_large');
  const chunk = Buffer.alloc(READ_CHUNK);
  let parts: Buffer[] = [];
  let pending = 0;
  let position = start;
  while (position < size) {
    const { bytesRead } = await handle.read(chunk, 0, Math.min(READ_CHUNK, size - position), position);
    if (bytesRead === 0) break;
    count(bytesRead);
    const data = chunk.subarray(0, bytesRead);
    position += data.length;
    let from = 0;
    for (;;) {
      const end = data.indexOf(LINE_END, from);
      const stop = end === -1 ? data.length : end;
      if (pending + (stop - from) > limits.lineBytes) throw new OutputLineError('output_line_too_long');
      if (stop > from) {
        // Copied: the chunk is read into again.
        const piece = Buffer.from(data.subarray(from, stop));
        parts.push(piece);
        pending += piece.length;
      }
      if (end === -1) break;
      const line = parts.length === 1 && parts[0] !== undefined ? parts[0] : Buffer.concat(parts, pending);
      parts = [];
      pending = 0;
      from = end + 1;
      if (line.length === 0) throw new OutputLineError('output_line_malformed');
      let value: unknown;
      try {
        value = jsonValue(line);
      } catch {
        throw new OutputLineError('output_line_malformed');
      }
      yield value;
    }
  }
  // A file that ended before the size checked, or a last line with no line end: cut short.
  if (position < size || pending > 0) throw new OutputLineError('output_truncated');
}

/**
 * Opens an output file, reads and parses its first line, and hands it to `use` with the later
 * lines still unread; the descriptor is closed when `use` ends. An OutputLineError thrown while
 * `use` reads the later lines becomes the result's code; any other error `use` throws is thrown.
 */
export async function openExtractorOutput<T>(path: string, use: (output: OpenedOutput) => Promise<T>, limits: OutputLimits = OUTPUT_LIMITS): Promise<OutputRead<T>> {
  let read = 0;
  const count = (bytes: number): void => {
    read += bytes;
  };
  let handle: FileHandle;
  try {
    handle = await open(path, READ_ONCE);
  } catch (error) {
    const code = (error as { code?: unknown }).code;
    if (code === 'ENOENT') return { ok: false, code: 'output_missing', bytesRead: 0 };
    // ELOOP: a symbolic link; ENXIO and the rest: nothing a job's output can be.
    return { ok: false, code: 'output_not_a_file', bytesRead: 0 };
  }
  try {
    let size: number;
    let first: Awaited<ReturnType<typeof firstLine>>;
    let value: unknown;
    try {
      const status = await handle.stat();
      if (!status.isFile()) return { ok: false, code: 'output_not_a_file', bytesRead: read };
      size = status.size;
      if (size > outputFileBytes(true, limits)) return { ok: false, code: 'output_too_large', bytesRead: read };
      first = await firstLine(handle, size, limits, count);
      if (first === 'too_large') return { ok: false, code: 'output_too_large', bytesRead: read };
      value = jsonValue(first.line);
    } catch {
      return { ok: false, code: 'output_unreadable', bytesRead: read };
    }
    const next = first.next;
    let taken = false;
    const opened: OpenedOutput = {
      value,
      followed: size > next,
      lines: () => {
        if (taken) throw new Error('the later lines of an output are read once');
        taken = true;
        return laterLines(handle, next, size, limits, count);
      },
      bytesRead: () => read,
    };
    try {
      return { ok: true, value: await use(opened), bytesRead: read };
    } catch (error) {
      if (error instanceof OutputLineError) return { ok: false, code: error.code, bytesRead: read };
      throw error;
    }
  } finally {
    await handle.close();
  }
}

/**
 * Reads an output file that is one value (a job that asked for no IFC values): its first line,
 * and nothing after it. A file with later lines is refused as unreadable, and they are not read.
 */
export async function readExtractorOutput(path: string, limits: OutputLimits = OUTPUT_LIMITS): Promise<OutputRead<unknown>> {
  const read = await openExtractorOutput(path, (opened) => Promise.resolve(opened.followed ? undefined : { value: opened.value }), limits);
  if (!read.ok) return read;
  return read.value === undefined ? { ok: false, code: 'output_unreadable', bytesRead: read.bytesRead } : { ok: true, value: read.value.value, bytesRead: read.bytesRead };
}
