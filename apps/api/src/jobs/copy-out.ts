/**
 * Copies a job's output file out of its sandbox (docs/adr/0026 decision 3, as amended in the
 * phase 2 review; prompt 3 section 8: one writable place per job, with limits).
 *
 * The container writes only into its own output volume: a size-limited, noexec tmpfs that no
 * host folder backs, so nothing the container makes (a symbolic link to a device, a FIFO, a
 * folder the host cannot remove) ever lands on the host. After the job, the runner asks the
 * Docker daemon for `/output/output.json` as a tar stream (`docker cp <holder>:... -`). The
 * daemon writes the entry's name, type and size from what it finds, without following a link,
 * so this module can refuse anything but one regular file named `output.json` of at most
 * `maxBytes`, and copy exactly that many bytes into a new host file it creates itself
 * (O_EXCL, never through a link). Only the file's bytes are the container's; they are read by
 * the contract's strict parser afterwards, like any output.
 */
import { constants, type WriteStream } from 'node:fs';
import { open, rm } from 'node:fs/promises';
import type { Readable } from 'node:stream';

/** What came out: the file copied, no output file there, or an entry refused (not one regular file within the limit). */
export type CopyOutcome = 'copied' | 'missing' | 'refused';

const BLOCK = 512;
const OUTPUT_NAME = 'output.json';
/** Creates the host copy: a new file, never an existing one or a link. */
const CREATE_NEW = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW;

/** A tar header field as text, up to its first NUL. */
function field(header: Buffer, start: number, length: number): string {
  const bytes = header.subarray(start, start + length);
  const end = bytes.indexOf(0);
  return bytes.subarray(0, end === -1 ? bytes.length : end).toString('latin1');
}

/** An octal tar number field, digit by digit (an entry's size in bytes; never a value from a document). */
function octal(header: Buffer, start: number, length: number): number | undefined {
  const text = field(header, start, length).trim();
  if (!/^[0-7]{1,12}$/u.test(text)) return undefined;
  let value = 0;
  for (const digit of text) value = value * 8 + (digit.charCodeAt(0) - 48);
  return value;
}

/**
 * The size of the tar stream's one entry when it is a regular file named `output.json` in a
 * USTAR header, within `maxBytes`; undefined for anything else: a link, a FIFO, a device, a
 * folder, an extended (pax) header, another name, or a size past the limit.
 */
export function regularOutputSize(header: Buffer, maxBytes: number): number | undefined {
  if (header.length < BLOCK) return undefined;
  if (field(header, 257, 6) !== 'ustar' && field(header, 257, 6) !== 'ustar ') return undefined;
  if (field(header, 0, 100) !== OUTPUT_NAME || field(header, 345, 155) !== '') return undefined;
  const type = header[156];
  if (type !== 0x30 && type !== 0x00) return undefined;
  const size = octal(header, 124, 12);
  return size !== undefined && size <= maxBytes ? size : undefined;
}

/** Waits until a write stream takes more. */
function drained(stream: WriteStream): Promise<void> {
  return new Promise((resolve) => {
    stream.once('drain', () => {
      resolve();
    });
  });
}

/**
 * Reads a tar stream of one entry and copies its bytes to `target` when the entry is one
 * regular `output.json` of at most `maxBytes`. An empty stream is `missing`. The stream is
 * read no further than the header and the entry's bytes; the caller ends its source after.
 */
export async function copyOutputEntry(stream: Readable, target: string, maxBytes: number): Promise<CopyOutcome> {
  let pending = Buffer.alloc(0);
  let size: number | undefined;
  let written = 0;
  let out: WriteStream | undefined;
  const finish = async (outcome: CopyOutcome): Promise<CopyOutcome> => {
    if (out !== undefined) {
      const closing = out;
      await new Promise<void>((resolve, reject) => {
        closing.end((error?: Error | null) => (error ? reject(error) : resolve()));
      });
    }
    // Only a file this copy created is removed: anything already at the target is not ours.
    if (outcome !== 'copied' && out !== undefined) await rm(target, { force: true });
    return outcome;
  };
  for await (const chunk of stream) {
    const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    if (size === undefined) {
      pending = Buffer.concat([pending, data]);
      if (pending.length < BLOCK) continue;
      size = regularOutputSize(pending.subarray(0, BLOCK), maxBytes);
      if (size === undefined) return finish('refused');
      const created = await open(target, CREATE_NEW, 0o600).catch(() => undefined);
      if (created === undefined) return finish('refused');
      out = created.createWriteStream();
      const body = pending.subarray(BLOCK, BLOCK + size);
      if (body.length > 0 && !out.write(body)) await drained(out);
      written = body.length;
      pending = Buffer.alloc(0);
    } else {
      const body = data.subarray(0, size - written);
      if (body.length > 0 && out !== undefined && !out.write(body)) await drained(out);
      written += body.length;
    }
    if (written === size) return finish('copied');
  }
  if (size === undefined) return finish(pending.length === 0 ? 'missing' : 'refused');
  if (size === 0 && out !== undefined) return finish('copied');
  return finish('refused');
}
