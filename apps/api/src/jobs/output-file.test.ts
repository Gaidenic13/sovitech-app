/**
 * The worker's reading of a job's output file (./read-output.ts, ./output-file.ts; ADR 0034),
 * with the gates as they are: every gate closed. The output is read within its bound, the lines
 * after it only when they are iterated, each within its own bound, and, through the worker's
 * reading, not at all while `ifc-values` is closed or while the job asked for no IFC values.
 * Reading the per-line IFC section with the gate open, and the contract's refusal of a line, are
 * proven in tests/proposed/ifc-input-5.4-stream.test.ts. Every value is TEST data.
 *
 * Ids: F-INGEST-04 (the worker reads the output), R-027 (the IFC section sealed while
 * ifc-values is closed), rule 13 (codes, never values).
 */
import { mkdtempSync } from 'node:fs';
import { rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { productionGateSource } from '@sovitech/registry/gates';
import { parseExtractionOutput, type ExtractionRequest } from '@sovitech/extraction-contract';
import { afterAll, describe, expect, it } from 'vitest';
import { readJobOutput } from './output-file';
import { OUTPUT_LIMITS, openExtractorOutput, type OutputLimits } from './read-output';

const root = mkdtempSync(join(tmpdir(), 'sovitech-test-output-file-'));
afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

const JOB = { projectId: '0192f0a0-0000-7000-8000-00000000f101', documentId: '0192f0a0-0000-7000-8000-00000000f102', contentHash: `sha256:${'d'.repeat(64)}` };

/** A TEST output of an IFC model, stored "Not analysed" with its engineer's record (no value). */
const OUTPUT = {
  contractVersion: '1.0.0',
  producer: { name: 'sovitech-extractor', version: '0.0.0-test', libraries: [] },
  job: JOB,
  format: 'ifc',
  analysis: { status: 'stored_only', formatWord: 'IFC model' },
  coverage: {},
  ifcModel: {
    header: { schema: 'IFC4' },
    classesPresent: [],
    processing: 'complete',
    schemaCheck: { tool: { name: 'sovitech-step-exchange-check', version: '0.0.0-test' }, outcome: 'no_problems' },
  },
  findings: [],
  derivatives: [],
} as const;
const OUTPUT_LINE = JSON.stringify(OUTPUT);

function request(ifcValues: boolean): ExtractionRequest {
  return { contractVersion: '1.0.0', job: JOB, declaredFormat: 'ifc', ifcValues, datasets: [], derivatives: [], limits: { maxPages: 10, maxCellsPerSheet: 10, wallClockSeconds: 60 } };
}

let written = 0;
async function file(text: string | Buffer): Promise<string> {
  written += 1;
  const path = join(root, `output-${String(written)}.json`);
  await writeFile(path, text);
  return path;
}

/** The lines after the first, collected, or the code they end with. */
async function laterLines(path: string, limits: OutputLimits = OUTPUT_LIMITS): Promise<{ readonly values: unknown[]; readonly code?: string }> {
  const values: unknown[] = [];
  const read = await openExtractorOutput(
    path,
    async (opened) => {
      for await (const value of opened.lines()) values.push(value);
    },
    limits,
  );
  return read.ok ? { values } : { values, code: read.code };
}

/** A TEST section of many lines that are not the contract's (and not all JSON): whoever reads them is refused. */
function garbageSection(lines: number): string {
  return Array.from({ length: lines }, (_, index) => (index % 7 === 3 ? '{"not json' : JSON.stringify({ TEST: 'a line of a section that must not be read', index }))).join('\n') + '\n';
}

describe('F-INGEST-04 · ADR 0034: the output of a job that asked for no IFC values', () => {
  it('F-INGEST-04: is one value, with or without a line end, read and checked by the contract', async () => {
    expect(parseExtractionOutput(OUTPUT).ok).toBe(true);
    for (const text of [OUTPUT_LINE, `${OUTPUT_LINE}\n`]) {
      const read = await readJobOutput(await file(text), request(false), productionGateSource());
      expect(read.ok && read.output.analysis).toEqual({ status: 'stored_only', formatWord: 'IFC model' });
      expect(read.ok && read.lines).toBe(1);
    }
  });

  it('F-INGEST-04 · ADR 0034: is bounded at 4 MiB (the largest fixture\'s output is 1,173,042 bytes): a larger one is refused, and not parsed', async () => {
    expect(OUTPUT_LIMITS.outputBytes).toBe(4 * 1024 * 1024);
    const path = await file(`{"TEST":"${'x'.repeat(OUTPUT_LIMITS.outputBytes)}"}`);
    const read = await readJobOutput(path, request(false), productionGateSource());
    expect(read).toMatchObject({ ok: false, code: 'output_too_large', problems: [] });
    expect(read.bytesRead).toBeLessThanOrEqual(OUTPUT_LIMITS.outputBytes + 1);
    // One byte within the bound is read and parsed (and refused by the contract, as TEST text).
    const within = await readJobOutput(await file(`{"TEST":"${'x'.repeat(OUTPUT_LIMITS.outputBytes - 12)}"}`), request(false), productionGateSource());
    expect(within).toMatchObject({ ok: false, code: 'output_invalid' });
  });
});

describe('R-027 · F-INGEST-04 · ADR 0034: while ifc-values is closed, nothing reads the gated section', () => {
  const firstLineBytes = Buffer.byteLength(OUTPUT_LINE) + 1;
  const section = garbageSection(200_000);

  it('R-027: lines after the output of a job that asked for no IFC values refuse it, and not one of them is read', async () => {
    const path = await file(`${OUTPUT_LINE}\n${section}`);
    const read = await readJobOutput(path, request(false), productionGateSource());
    expect(read).toEqual({ ok: false, code: 'ifc_values_not_asked', problems: [], bytesRead: read.bytesRead });
    // Only the first line's read reached past its line end: at most one read of 64 KiB, of a section of megabytes.
    expect(Buffer.byteLength(section)).toBeGreaterThan(10 * 1024 * 1024);
    expect(read.bytesRead).toBeLessThan(firstLineBytes + 64 * 1024);
  });

  it('R-027: a job that asked for IFC values while the gate read open is refused once it reads closed, and not one line is read', async () => {
    const path = await file(`${OUTPUT_LINE}\n${section}`);
    const read = await readJobOutput(path, request(true), productionGateSource());
    expect(read).toEqual({ ok: false, code: 'ifc_values_gate_closed', problems: [], bytesRead: read.bytesRead });
    expect(read.bytesRead).toBeLessThan(firstLineBytes + 64 * 1024);
    // The same lines, read: their first malformed line refuses them (the reader's own code).
    expect((await laterLines(path)).code).toBe('output_line_malformed');
  });
});

describe('F-INGEST-04 · ADR 0034: the later lines, read one at a time within their bounds', () => {
  it('F-INGEST-04: are parsed in order, each on its own, only while they are iterated', async () => {
    const path = await file(`${OUTPUT_LINE}\n{"a":1}\n{"b":[2]}\n{"c":"d"}\n`);
    expect(await laterLines(path)).toEqual({ values: [{ a: 1 }, { b: [2] }, { c: 'd' }] });
    const untouched = await openExtractorOutput(path, (opened) => Promise.resolve({ followed: opened.followed, read: opened.bytesRead() }));
    expect(untouched).toMatchObject({ ok: true, value: { followed: true } });
  });

  it('F-INGEST-04: a line longer than its bound is refused (output_line_too_long), before it is parsed', async () => {
    const limits = { ...OUTPUT_LIMITS, lineBytes: 64 };
    const path = await file(`${OUTPUT_LINE}\n{"a":1}\n{"TEST":"${'y'.repeat(80)}"}\n{"c":2}\n`);
    expect(await laterLines(path, limits)).toEqual({ values: [{ a: 1 }], code: 'output_line_too_long' });
    // A line of exactly the bound is read.
    const atBound = `{"TEST":"${'z'.repeat(64 - 11)}"}`;
    expect(Buffer.byteLength(atBound)).toBe(64);
    expect(await laterLines(await file(`${OUTPUT_LINE}\n${atBound}\n`), limits)).toEqual({ values: [{ TEST: 'z'.repeat(53) }] });
  });

  it('F-INGEST-04: a last line with no line end is cut short (output_truncated), whatever it holds', async () => {
    expect(await laterLines(await file(`${OUTPUT_LINE}\n{"a":1}\n{"b":2}`))).toEqual({ values: [{ a: 1 }], code: 'output_truncated' });
    expect(await laterLines(await file(`${OUTPUT_LINE}\n{"a":1}\n{"b":`))).toEqual({ values: [{ a: 1 }], code: 'output_truncated' });
  });

  it('F-INGEST-04: a line that is not one JSON value, not UTF-8, or empty is malformed (output_line_malformed)', async () => {
    expect(await laterLines(await file(`${OUTPUT_LINE}\n{"a":1}\n{"b": \n{"c":3}\n`))).toEqual({ values: [{ a: 1 }], code: 'output_line_malformed' });
    expect(await laterLines(await file(Buffer.concat([Buffer.from(`${OUTPUT_LINE}\n{"a":"`), Buffer.from([0xff, 0xfe]), Buffer.from('"}\n')])))).toEqual({ values: [], code: 'output_line_malformed' });
    expect(await laterLines(await file(`${OUTPUT_LINE}\n{"a":1}\n\n{"c":3}\n`))).toEqual({ values: [{ a: 1 }], code: 'output_line_malformed' });
    expect(await laterLines(await file(`${OUTPUT_LINE}\na: &x [1]\n`))).toEqual({ values: [], code: 'output_line_malformed' });
  });

  it('F-INGEST-04: lines past the section\'s bound are refused (output_gated_too_large) before one is read', async () => {
    const path = await file(`${OUTPUT_LINE}\n${'{"a":1}\n'.repeat(40)}`);
    expect(await laterLines(path, { ...OUTPUT_LIMITS, gatedBytes: 100 })).toEqual({ values: [], code: 'output_gated_too_large' });
    expect(OUTPUT_LIMITS.gatedBytes).toBe(512 * 1024 * 1024);
    expect(OUTPUT_LIMITS.lineBytes).toBe(1024 * 1024);
  });
});
