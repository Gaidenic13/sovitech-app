/**
 * The IFC reader's command line, the sandbox image's entry point (./bin.ts; Dockerfile):
 *
 *     --request <file>    the ExtractionRequest (JSON), read strictly (the contract's parser)
 *     --document <file>   the stored model, mounted read-only
 *     --out <folder>      where output.json is written (the job's only writable mount)
 *     --datasets <folder> the mapping datasets the request names (only with ifcValues)
 *     --ids <file>        the IDS file the request names (its hash is checked; it is not run)
 *
 * The same arguments, mounts and exit statuses as the Python extractor's
 * (services/extractor/src/sovitech_extractor/cli.py), so the API's worker runs either the same
 * way: 0 output written; 2 request refused; 3 job refused (for example a content hash that does
 * not match); 4 internal error. output.json is written only after the contract's strict parser
 * accepts it and it answers the request, and it is written atomically. Standard error carries
 * JSON log lines with codes only (rule 13).
 *
 * When the request asks for IFC values of a model, output.json is written in the contract's
 * per-line form (packages/extraction-contract/src/ifc-values-stream.ts; ADR 0034): the output
 * without its IFC section on the first line, then the stream header and the section one
 * statement, fact or proposal per line, written through a stream so no text of the whole
 * section is built (a large model's section passed V8's longest string: `output.too_large`).
 * Every other output is one JSON text, as before.
 */
import { createWriteStream, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync, type WriteStream } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { parse } from 'yaml';
import { IfcValuesStreamError, ifcValuesStreamExpected, ifcValuesStreamLines } from '@sovitech/extraction-contract';
import { JobError, OutputError, RequestError, checkOutput, checkedRequest, runIfcJob, type Mounts } from './job';
import { CodeLog, silenced, type LogWriter } from './logs';

export const EXIT_OK = 0;
export const EXIT_REQUEST = 2;
export const EXIT_JOB = 3;
export const EXIT_INTERNAL = 4;

interface Arguments {
  readonly request: string;
  readonly document: string;
  readonly out: string;
  readonly mounts: Mounts;
}

function argumentsOf(argv: readonly string[]): Arguments | undefined {
  try {
    const { values } = parseArgs({
      args: [...argv],
      options: {
        request: { type: 'string' },
        document: { type: 'string' },
        out: { type: 'string' },
        datasets: { type: 'string' },
        ids: { type: 'string' },
      },
      strict: true,
      allowPositionals: false,
    });
    if (values.request === undefined || values.document === undefined || values.out === undefined) return undefined;
    return {
      request: values.request,
      document: values.document,
      out: values.out,
      mounts: { ...(values.datasets === undefined ? {} : { datasets: values.datasets }), ...(values.ids === undefined ? {} : { ids: values.ids }) },
    };
  } catch {
    return undefined;
  }
}

/** Writes output.json into the folder through a temporary file and a rename. */
function writeAtomically(folder: string, text: string): void {
  const temporary = mkdtempSync(join(folder, '.output-'));
  try {
    writeFileSync(join(temporary, 'output.json'), text, 'utf8');
    renameSync(join(temporary, 'output.json'), join(folder, 'output.json'));
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

/** How much text the line writer gathers before it hands it to the file (bytes, about). */
const WRITE_CHUNK = 1024 * 1024;

/** Writes text to a stream and waits while the stream holds more than it wants; rejects on the stream's error. */
function written(stream: WriteStream, text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ready = stream.write(text, 'utf8', (error) => {
      if (error) reject(error);
    });
    if (ready) resolve();
    else {
      const onDrain = (): void => {
        stream.off('error', onError);
        resolve();
      };
      const onError = (error: Error): void => {
        stream.off('drain', onDrain);
        reject(error);
      };
      stream.once('drain', onDrain);
      stream.once('error', onError);
    }
  });
}

/**
 * Writes output.json into the folder as lines, each followed by a line end, through a temporary
 * file and a rename; the lines are taken one at a time, so the whole text is never built. Throws
 * what the lines throw (IfcValuesStreamError) and what the file throws (a full output volume);
 * then nothing is renamed into place.
 */
async function writeLinesAtomically(folder: string, lines: Iterable<string>): Promise<void> {
  const temporary = mkdtempSync(join(folder, '.output-'));
  const stream = createWriteStream(join(temporary, 'output.json'), { flags: 'wx', encoding: 'utf8' });
  try {
    let pending: string[] = [];
    let size = 0;
    for (const line of lines) {
      pending.push(line, '\n');
      size += line.length;
      if (size >= WRITE_CHUNK) {
        await written(stream, pending.join(''));
        pending = [];
        size = 0;
      }
    }
    if (pending.length > 0) await written(stream, pending.join(''));
    await new Promise<void>((resolve, reject) => {
      stream.once('error', reject);
      stream.end(() => {
        stream.off('error', reject);
        resolve();
      });
    });
    renameSync(join(temporary, 'output.json'), join(folder, 'output.json'));
  } finally {
    stream.destroy();
    rmSync(temporary, { recursive: true, force: true });
  }
}

async function run(argv: readonly string[], log: CodeLog): Promise<number> {
  const args = argumentsOf(argv);
  if (args === undefined) {
    log.emit('request.arguments', { level: 'error' });
    return EXIT_REQUEST;
  }
  let raw: unknown;
  try {
    raw = parse(readFileSync(args.request, 'utf8'), { schema: 'json', maxAliasCount: 0, uniqueKeys: true });
  } catch {
    log.emit('request.unreadable', { level: 'error' });
    return EXIT_REQUEST;
  }
  let request;
  try {
    request = checkedRequest(raw);
  } catch (error) {
    if (!(error instanceof RequestError)) throw error;
    log.emit('request.refused', { level: 'error', count: error.problems.length });
    return EXIT_REQUEST;
  }
  log.emit('job.started');
  let bytes: Uint8Array;
  try {
    bytes = readFileSync(args.document);
  } catch {
    log.emit('job.document_unreadable', { level: 'error' });
    return EXIT_JOB;
  }
  let output;
  try {
    output = await runIfcJob(request, bytes, args.mounts);
  } catch (error) {
    if (!(error instanceof JobError)) throw error;
    log.emit(error.code, { level: 'error' });
    return EXIT_JOB;
  }
  try {
    checkOutput(request, output);
  } catch (error) {
    if (!(error instanceof OutputError)) throw error;
    log.emit(error.code, { level: 'error', count: error.problems.length });
    return EXIT_INTERNAL;
  }
  if (ifcValuesStreamExpected(request, output)) {
    // IFC values of a model: the per-line form, however large the section (ADR 0034).
    try {
      await writeLinesAtomically(args.out, ifcValuesStreamLines(output));
    } catch (error) {
      if (!(error instanceof IfcValuesStreamError)) throw error;
      log.emit(error.code, { level: 'error' });
      return EXIT_INTERNAL;
    }
  } else {
    let text: string;
    try {
      text = JSON.stringify(output);
    } catch (error) {
      // An output too large for one string: every IFC section goes the per-line way above, so nothing should come here.
      if (!(error instanceof RangeError)) throw error;
      log.emit('output.too_large', { level: 'error' });
      return EXIT_INTERNAL;
    }
    writeAtomically(args.out, text);
  }
  log.emit('job.finished', { count: output.findings.length });
  return EXIT_OK;
}

/** Runs one job; returns the exit status. Nothing but code lines reaches the log writer. */
export function main(argv: readonly string[], write?: LogWriter): Promise<number> {
  return silenced(async (log) => {
    try {
      return await run(argv, log);
    } catch (error) {
      // Only the class name leaves the process.
      log.emit('job.internal_error', { level: 'error', name: error instanceof Error ? error.name : 'unknown' });
      return EXIT_INTERNAL;
    }
  }, write);
}
