/**
 * The reader's command line, as the sandbox image runs it: the Python extractor's arguments,
 * mounts and exit statuses (services/extractor/src/sovitech_extractor/cli.py), so the API's
 * worker runs either the same way (apps/api/src/jobs/sandbox.ts). output.json is written only
 * when the contract accepts it; log lines carry codes only, never the model's text (rule 13).
 * Every value is TEST data.
 *
 * Ids: F-INGEST-04, F-IFC-01, R-023; rule 13 (logs never contain document text).
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { IFC_VALUES_LINE_MAX_BYTES, parseExtractionOutput, utf8Length } from '@sovitech/extraction-contract';
import { EXIT_JOB, EXIT_OK, EXIT_REQUEST, main } from './cli';
import { contentHashOf, runIfcJob } from './job';
import { stepValue } from './values';

const ROOT = new URL('../../../', import.meta.url);
const WORK = mkdtempSync(join(tmpdir(), 'sovitech-test-ifc-cli-'));
const MODEL = new URL('fixtures/ifc/demo-hotel-mep-rev-a.ifc', ROOT);

afterAll(() => {
  rmSync(WORK, { recursive: true, force: true });
});

function job(label: string, request: unknown): { readonly args: string[]; readonly out: string } {
  const folder = join(WORK, label);
  const out = join(folder, 'out');
  mkdirSync(out, { recursive: true });
  writeFileSync(join(folder, 'request.json'), typeof request === 'string' ? request : JSON.stringify(request));
  return { args: ['--request', join(folder, 'request.json'), '--document', fileURLToPath(MODEL), '--out', out], out };
}

function request(contentHash: string): Record<string, unknown> {
  return {
    contractVersion: '1.0.0',
    job: { projectId: '0192f0a0-0000-7000-8000-00000000e101', documentId: '0192f0a0-0000-7000-8000-00000000e102', contentHash },
    declaredFormat: 'ifc',
    ifcValues: false,
    datasets: [],
    derivatives: [],
    limits: { maxPages: 10, maxCellsPerSheet: 10, wallClockSeconds: 300 },
  };
}

async function run(args: readonly string[]): Promise<{ readonly status: number; readonly lines: Record<string, unknown>[] }> {
  const lines: string[] = [];
  const status = await main(args, (line) => lines.push(line));
  return { status, lines: lines.map((line) => parse(line, { schema: 'json' }) as Record<string, unknown>) };
}

describe('F-INGEST-04 · F-IFC-01: the command line the sandbox runs', () => {
  it('F-IFC-01: writes output.json atomically, as the contract parses it, and exits 0', async () => {
    const { args, out } = job('ok', request(contentHashOf(readFileSync(MODEL))));
    const { status, lines } = await run(args);
    expect(status).toBe(EXIT_OK);
    expect(readdirSync(out)).toEqual(['output.json']);
    const parsed = parseExtractionOutput(parse(readFileSync(join(out, 'output.json'), 'utf8'), { schema: 'json' }));
    expect(parsed.ok).toBe(true);
    expect(lines.map((line) => line['code'])).toEqual(['job.started', 'job.finished']);
  });

  it('F-INGEST-04: a request the contract refuses exits 2 and writes nothing', async () => {
    const { args, out } = job('bad-request', { ...request(contentHashOf(readFileSync(MODEL))), extra: 'TEST' });
    const { status, lines } = await run(args);
    expect(status).toBe(EXIT_REQUEST);
    expect(existsSync(join(out, 'output.json'))).toBe(false);
    expect(lines).toEqual([{ level: 'error', code: 'request.refused', count: 1 }]);
    expect((await run(job('not-json', '{"contract').args)).status).toBe(EXIT_REQUEST);
    expect((await run(['--request'])).status).toBe(EXIT_REQUEST);
  });

  it('US-IFC-03 · F-IFC-01 · rule 1: bytes that are not the request\'s exit 3 with the code, and write nothing', async () => {
    const { args, out } = job('hash', request(`sha256:${'0'.repeat(64)}`));
    const { status, lines } = await run(args);
    expect(status).toBe(EXIT_JOB);
    expect(existsSync(join(out, 'output.json'))).toBe(false);
    expect(lines.at(-1)).toEqual({ level: 'error', code: 'job.content_hash_mismatch' });
  });

  it('US-IFC-04 · F-IFC-02 · rule 13: nothing the model says, and nothing printed while it is read, reaches the log', async () => {
    const { args } = job('quiet', request(contentHashOf(readFileSync(MODEL))));
    const printed: string[] = [];
    const original = process.stderr.write.bind(process.stderr);
    process.stderr.write = ((chunk: string | Uint8Array) => {
      printed.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;
    let lines: Record<string, unknown>[];
    try {
      ({ lines } = await run(args));
    } finally {
      process.stderr.write = original;
    }
    const text = JSON.stringify(lines) + printed.join('');
    expect(text).not.toMatch(/Ignore previous|Generic Model|Demo Hotel|Chiller|Pomp/iu);
    for (const line of lines) expect(Object.keys(line).every((key) => ['level', 'code', 'name', 'count', 'stepIds', 'globalIds'].includes(key))).toBe(true);
  });
});

describe('F-INGEST-04 · F-IFC-04 · ADR 0034: IFC values asked for, the per-line form (gated: ifc-values)', () => {
  it('F-IFC-04: output.json is the output without its section, then the stream header, each statement once, the facts and the proposals, each on its own line with its line end', async () => {
    const bytes = readFileSync(MODEL);
    const asked = { ...request(contentHashOf(bytes)), ifcValues: true };
    const { args, out } = job('lines', asked);
    const { status, lines } = await run(args);
    expect(status).toBe(EXIT_OK);
    expect(lines.map((line) => line['code'])).toEqual(['job.started', 'job.finished']);
    const text = readFileSync(join(out, 'output.json'), 'utf8');
    expect(text.endsWith('\n')).toBe(true);
    const fileLines = text.slice(0, -1).split('\n');
    const [first, second, ...rest] = fileLines.map((line) => parse(line, { schema: 'json' }) as Record<string, unknown>);
    const parsed = parseExtractionOutput(first);
    expect(parsed.ok).toBe(true);
    expect(first).not.toHaveProperty('ifcValues');
    // The same job in process: the section the lines carry.
    const whole = await runIfcJob(asked as Parameters<typeof runIfcJob>[0], bytes);
    const facts = whole.ifcValues?.facts ?? [];
    const statements = new Set(facts.flatMap((fact) => fact.locator.stepIds));
    expect(second).toEqual({ ifcValuesStream: { contractVersion: '1.0.0', section: 'present', statements: statements.size, facts: facts.length, candidateProposals: 0 } });
    expect(facts.length).toBeGreaterThan(statements.size);
    expect(rest.map((line) => Object.keys(line)[0])).toEqual([...[...statements].map(() => 'statement'), ...facts.map(() => 'fact')]);
    expect(new Set(rest.flatMap((line) => (line['statement'] === undefined ? [] : [(line['statement'] as { stepId: number }).stepId])))).toEqual(statements);
    for (const line of fileLines) expect(utf8Length(line)).toBeLessThanOrEqual(IFC_VALUES_LINE_MAX_BYTES);
  });

  it('F-IFC-04: IFC values not asked for, output.json stays one JSON text with no line end', async () => {
    const { args, out } = job('one-text', request(contentHashOf(readFileSync(MODEL))));
    expect((await run(args)).status).toBe(EXIT_OK);
    expect(readFileSync(join(out, 'output.json'), 'utf8')).not.toContain('\n');
  });

  it('F-IFC-04 · rule 12: a list value too long for a line of the form is not representable (the reader records it in coverage), a shorter one is kept', () => {
    const text = (index: number): string => `${'L'.repeat(90)}${String(index).padStart(6, '0')}`;
    const tokens = (count: number) => Array.from({ length: count }, (_, index) => ({ kind: 'string' as const, token: `'${text(index)}'`, text: text(index) }));
    const long = stepValue({ kind: 'list', items: tokens(5000) }, Array.from({ length: 5000 }, () => ({})));
    expect(long).toBeUndefined();
    const short = stepValue({ kind: 'list', items: tokens(100) }, Array.from({ length: 100 }, () => ({})));
    expect(short).toMatchObject({ kind: 'list' });
  });
});
