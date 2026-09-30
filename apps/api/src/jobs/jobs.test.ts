/**
 * The sandbox runner's command line (prompt 3 section 8; docs/adr/0018 decision 3) and the
 * reader of the extractor's output file (docs/adr/0026). With Docker and the extractor
 * image present, one real run shows the container starting with those flags and mounts, and
 * its outcome read as a code. Every value is TEST data.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { lstat, mkdir, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { afterAll, describe, expect, it } from 'vitest';
import { copyOutputEntry, regularOutputSize } from './copy-out';
import { OUTPUT_LIMITS, outputFileBytes, readExtractorOutput } from './read-output';
import {
  DEFAULT_SANDBOX_LIMITS,
  DockerExtractorRunner,
  holderArguments,
  imageFor,
  outputVolumeArguments,
  readerFor,
  sandboxArguments,
  sandboxNames,
} from './sandbox';

const JOB = {
  jobId: '0192f0a0-0000-7000-8000-0000000000aa',
  inputPath: '/TEST/data/0192f0a0-0000-7000-8000-00000000c0a1/sha256:aaaa/original',
  requestPath: '/TEST/data/work/request.json',
  outputDirectory: '/TEST/data/work/output',
};

describe('the sandbox command line (ADR 0018)', () => {
  it('F-INGEST-04 · prompt 3 section 8: runs with no network, a read-only root, no capabilities, memory equal to swap, a noexec tmpfs, the input and the request read-only and one writable output', () => {
    const args = sandboxArguments('sovitech-extractor:TEST', JOB);
    const joined = args.join(' ');
    for (const flag of ['--network none', '--read-only', '--cap-drop ALL', '--security-opt no-new-privileges', `--pids-limit ${DEFAULT_SANDBOX_LIMITS.pids}`]) {
      expect(joined).toContain(flag);
    }
    expect(args[args.indexOf('--memory') + 1]).toBe(DEFAULT_SANDBOX_LIMITS.memory);
    expect(args[args.indexOf('--memory-swap') + 1]).toBe(DEFAULT_SANDBOX_LIMITS.memory);
    expect(args[args.indexOf('--tmpfs') + 1]).toMatch(/^\/tmp:rw,noexec,nosuid,size=/u);
    const mounts = args.flatMap((arg, index) => (args[index - 1] === '--mount' ? [arg] : []));
    expect(mounts).toEqual([
      `type=bind,source=${JOB.inputPath},target=/input/document,readonly`,
      `type=bind,source=${JOB.requestPath},target=/job/request.json,readonly`,
      `type=volume,source=sovitech-job-output-${JOB.jobId},target=/output,volume-nocopy`,
    ]);
    // The host output folder is never mounted: the container writes only into its own volume.
    expect(joined).not.toContain(JOB.outputDirectory);
    expect(args[args.indexOf('--user') + 1]).toBe('10001:10001');
    // The extractor's own command line (services/extractor/src/sovitech_extractor/cli.py).
    expect(args.slice(args.indexOf('sovitech-extractor:TEST'))).toEqual(['sovitech-extractor:TEST', '--request', '/job/request.json', '--document', '/input/document', '--out', '/output']);
  });

  it('US-IFC-05 · F-IFC-09 · F-INGEST-04: mounts the draft IDS read-only and names it to the extractor only for a job that carries it', () => {
    const args = sandboxArguments('sovitech-extractor:TEST', { ...JOB, idsPath: '/TEST/repo/fixtures/ids/requirements.ids' });
    expect(args).toContain('type=bind,source=/TEST/repo/fixtures/ids/requirements.ids,target=/ids/requirements.ids,readonly');
    expect(args.slice(-2)).toEqual(['--ids', '/ids/requirements.ids']);
    expect(sandboxArguments('sovitech-extractor:TEST', JOB)).not.toContain('--ids');
  });

  it('F-INGEST-04 · ADR 0031: an IFC model goes to the IFC reader\'s image, every other file to the extractor\'s, with the same flags', () => {
    const images = { extractor: 'sovitech-extractor:TEST', ifcReader: 'sovitech-ifc-reader:TEST' };
    expect(readerFor('ifc')).toBe('ifc-reader');
    for (const format of ['pdf', 'xlsx', 'rvt', 'dwg', 'docx', 'jpg', 'png', 'zip']) expect(readerFor(format)).toBe('extractor');
    expect(imageFor(images, { ...JOB, reader: 'ifc-reader' })).toBe('sovitech-ifc-reader:TEST');
    expect(imageFor(images, { ...JOB, reader: 'extractor' })).toBe('sovitech-extractor:TEST');
    expect(imageFor(images, JOB)).toBe('sovitech-extractor:TEST');
    // Given the extractor's image alone, a model still goes to the IFC reader's (default) image.
    expect(imageFor('sovitech-extractor:TEST', { ...JOB, reader: 'ifc-reader' })).toBe('sovitech-ifc-reader:dev');
    expect(imageFor('sovitech-extractor:TEST', JOB)).toBe('sovitech-extractor:TEST');
    const ifc = sandboxArguments(imageFor(images, { ...JOB, reader: 'ifc-reader' }), JOB);
    const pdf = sandboxArguments(imageFor(images, JOB), JOB);
    expect(ifc.map((arg) => (arg === images.ifcReader ? '<image>' : arg))).toEqual(pdf.map((arg) => (arg === images.extractor ? '<image>' : arg)));
  });

  it('F-INGEST-04 · prompt 3 section 8: refuses a name that could break the command line', () => {
    expect(() => sandboxArguments('image', { ...JOB, jobId: 'x; rm -rf /' })).toThrow(/job id/u);
    expect(() => sandboxArguments('image', { ...JOB, inputPath: '/TEST/a,readonly=false' })).toThrow(/comma/u);
  });

  it('F-INGEST-04 · rule 13 · ADR 0026 · ADR 0034: the output volume is a tmpfs of the output limit, noexec, nosuid and nodev, owned by the sandbox account; its holder runs with the same confinement', () => {
    const volume = outputVolumeArguments(JOB.jobId);
    expect(volume.slice(0, 2)).toEqual(['volume', 'create']);
    expect(volume).toContain('type=tmpfs');
    expect(volume).toContain(`o=size=${DEFAULT_SANDBOX_LIMITS.outputBytes},noexec,nosuid,nodev,uid=10001,gid=10001,mode=0700`);
    expect(volume.at(-1)).toBe(sandboxNames(JOB.jobId).volume);
    // Room for the largest output file the API reads for the job, and no more than a small margin beyond it.
    expect(DEFAULT_SANDBOX_LIMITS.outputBytes).toBeGreaterThan(outputFileBytes(false));
    expect(DEFAULT_SANDBOX_LIMITS.outputBytes).toBeLessThanOrEqual(outputFileBytes(false) + 1024 * 1024);
    // Only a job that asked for IFC values (never while ifc-values is closed) gets room for the per-line section.
    expect(outputVolumeArguments(JOB.jobId, DEFAULT_SANDBOX_LIMITS, true)).toContain(`o=size=${DEFAULT_SANDBOX_LIMITS.gatedOutputBytes},noexec,nosuid,nodev,uid=10001,gid=10001,mode=0700`);
    expect(DEFAULT_SANDBOX_LIMITS.gatedOutputBytes).toBeGreaterThan(outputFileBytes(true));
    expect(DEFAULT_SANDBOX_LIMITS.gatedOutputBytes).toBeLessThanOrEqual(outputFileBytes(true) + 1024 * 1024);
    expect(outputFileBytes(false)).toBe(OUTPUT_LIMITS.outputBytes + 1);
    const holder = holderArguments('sovitech-extractor:TEST', JOB.jobId).join(' ');
    for (const flag of ['--network none', '--read-only', '--cap-drop ALL', '--security-opt no-new-privileges', '--user 10001:10001', '--entrypoint sleep']) {
      expect(holder).toContain(flag);
    }
    expect(holder).toContain(`type=volume,source=${sandboxNames(JOB.jobId).volume},target=/output,volume-nocopy`);
  });
});

/** A USTAR header for one entry, as the Docker daemon writes it for `docker cp ... -`. */
function tarHeader(name: string, type: string, size: number): Buffer {
  const header = Buffer.alloc(512);
  header.write(name, 0, 'latin1');
  header.write('0000644\0', 100, 'latin1');
  header.write('0023421\0', 108, 'latin1');
  header.write('0023421\0', 116, 'latin1');
  header.write(`${size.toString(8).padStart(11, '0')}\0`, 124, 'latin1');
  header.write('15257206564\0', 136, 'latin1');
  header.write(type, 156, 'latin1');
  header.write('ustar\0', 257, 'latin1');
  header.write('00', 263, 'latin1');
  header.write('        ', 148, 'latin1');
  return header;
}

function tarOf(name: string, type: string, body: Buffer, sizeField = body.length): Readable {
  return Readable.from([tarHeader(name, type, sizeField), body, Buffer.alloc(1024)]);
}

describe('copying the output out of the sandbox (ADR 0026, amended in the phase 2 review)', () => {
  const root = mkdtempSync(join(tmpdir(), 'sovitech-test-copy-out-'));
  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('F-INGEST-04 · rule 13: takes one regular output.json within the limit, and refuses a link, a FIFO, a device, a folder, another name or a larger file, writing nothing', async () => {
    const body = Buffer.from('{"TEST":"output"}');
    const target = (name: string): string => join(root, `${name}.json`);
    expect(await copyOutputEntry(tarOf('output.json', '0', body), target('regular'), 64)).toBe('copied');
    expect(await readFile(target('regular'), 'utf8')).toBe('{"TEST":"output"}');
    for (const [name, type] of [
      ['symlink', '2'],
      ['hardlink', '1'],
      ['fifo', '6'],
      ['chardevice', '3'],
      ['blockdevice', '4'],
      ['folder', '5'],
      ['pax', 'x'],
    ] as const) {
      expect({ name, outcome: await copyOutputEntry(tarOf('output.json', type, Buffer.alloc(0)), target(name), 64) }).toEqual({ name, outcome: 'refused' });
      await expect(stat(target(name))).rejects.toMatchObject({ code: 'ENOENT' });
    }
    expect(await copyOutputEntry(tarOf('other.json', '0', body), target('other'), 64)).toBe('refused');
    expect(await copyOutputEntry(tarOf('output.json', '0', body), target('large'), 8)).toBe('refused');
    await expect(stat(target('large'))).rejects.toMatchObject({ code: 'ENOENT' });
    // A header whose size says more than the stream holds: refused, and the part written is removed.
    expect(await copyOutputEntry(Readable.from([tarHeader('output.json', '0', 40), body]), target('short'), 64)).toBe('refused');
    await expect(stat(target('short'))).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await copyOutputEntry(Readable.from([]), target('none'), 64)).toBe('missing');
    // An existing file or link at the target is never written through.
    await symlink('/dev/null', target('planted'));
    expect(await copyOutputEntry(tarOf('output.json', '0', body), target('planted'), 64)).toBe('refused');
    expect((await lstat(target('planted'))).isSymbolicLink()).toBe(true);
    expect(regularOutputSize(Buffer.from(tarHeader('output.json', '0', 5)).fill(0x41, 0, 1), 64)).toBeUndefined();
  });
});

/** Whether the docker CLI answers and holds an image. */
function imagePresent(image: string): boolean {
  try {
    execFileSync('docker', ['image', 'inspect', image], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
const extractorImagePresent = (): boolean => imagePresent('sovitech-extractor:dev');

describe('a real sandbox run', () => {
  // Under the home folder: Colima shares it with its virtual machine; the temp folder it does not.
  const root = mkdtempSync(join(process.platform === 'darwin' ? join(homedir(), 'Library', 'Caches') : tmpdir(), 'sovitech-test-sandbox-'));
  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it.runIf(extractorImagePresent())('F-INGEST-04 · prompt 3 section 8: starts the container with the flags and mounts, and reads its end as a code', { timeout: 120_000 }, async () => {
    const input = join(root, 'original');
    const request = join(root, 'request.json');
    const output = join(root, 'output');
    await writeFile(input, 'TEST bytes');
    await mkdir(output, { recursive: true });
    await writeFile(request, '{}');
    const outcome = await new DockerExtractorRunner('sovitech-extractor:dev', { ...DEFAULT_SANDBOX_LIMITS, wallClockSeconds: 60 }).run({ ...JOB, inputPath: input, requestPath: request, outputDirectory: output });
    // An empty request is not a valid extraction request: the extractor refuses it (exit 2), and the
    // runner reads that end as a code. An image built before the extractor's CLI existed fails otherwise.
    expect(['extractor_refused_request', 'extractor_failed']).toContain(outcome.outcome === 'finished' ? 'finished' : outcome.code);
  });

  it.runIf(imagePresent('sovitech-ifc-reader:dev'))('US-IFC-01 · F-INGEST-04 · ADR 0031: the IFC reader\'s container reads a model in the sandbox and writes the output', { timeout: 120_000 }, async () => {
    const input = join(root, 'model.ifc');
    const request = join(root, 'ifc-request.json');
    const output = join(root, 'ifc-output');
    const bytes = readFileSync(new URL('../../../../fixtures/ifc/demo-hotel-arh.ifc', import.meta.url));
    await writeFile(input, bytes);
    await mkdir(output, { recursive: true });
    await writeFile(
      request,
      JSON.stringify({
        contractVersion: '1.0.0',
        job: { projectId: '0192f0a0-0000-7000-8000-00000000c0a1', documentId: '0192f0a0-0000-7000-8000-00000000c0a2', contentHash: `sha256:${createHash('sha256').update(bytes).digest('hex')}` },
        declaredFormat: 'ifc',
        ifcValues: false,
        datasets: [],
        derivatives: [],
        limits: { maxPages: 10, maxCellsPerSheet: 10, wallClockSeconds: 60 },
      }),
    );
    const runner = new DockerExtractorRunner({ extractor: 'sovitech-extractor:dev', ifcReader: 'sovitech-ifc-reader:dev' }, { ...DEFAULT_SANDBOX_LIMITS, wallClockSeconds: 60 });
    const outcome = await runner.run({ ...JOB, jobId: '0192f0a0-0000-7000-8000-0000000000ab', reader: 'ifc-reader', inputPath: input, requestPath: request, outputDirectory: output });
    expect(outcome).toEqual({ outcome: 'finished' });
    const read = await readExtractorOutput(join(output, 'output.json'));
    expect(read.ok && (read.value as { analysis: unknown }).analysis).toEqual({ status: 'stored_only', formatWord: 'IFC model' });
  });
});

describe("the extractor's output file", () => {
  const root = mkdtempSync(join(tmpdir(), 'sovitech-test-output-'));
  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('F-INGEST-04 · rule 13: reads JSON text, and names a missing or unreadable file by a code', async () => {
    await writeFile(join(root, 'ok.json'), '{"format":"pdf","pages":[1,2]}');
    expect(await readExtractorOutput(join(root, 'ok.json'))).toMatchObject({ ok: true, value: { format: 'pdf', pages: [1, 2] } });
    expect(await readExtractorOutput(join(root, 'missing.json'))).toMatchObject({ ok: false, code: 'output_missing' });
    await writeFile(join(root, 'bad.json'), '{"format": ');
    expect(await readExtractorOutput(join(root, 'bad.json'))).toMatchObject({ ok: false, code: 'output_unreadable' });
    await writeFile(join(root, 'alias.json'), 'a: &x [1]\nb: *x\n');
    expect(await readExtractorOutput(join(root, 'alias.json'))).toMatchObject({ ok: false, code: 'output_unreadable' });
  });
});

describe("the worker's reading of an output file it did not make (phase 2 review)", () => {
  const root = mkdtempSync(join(tmpdir(), 'sovitech-test-output-kinds-'));
  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('F-INGEST-04 · rule 13: refuses a symbolic link (to a device), a FIFO and a folder at once, and a file past the limit, without reading them', async () => {
    await symlink('/dev/zero', join(root, 'link.json'));
    expect(await readExtractorOutput(join(root, 'link.json'))).toEqual({ ok: false, code: 'output_not_a_file', bytesRead: 0 });
    execFileSync('mkfifo', [join(root, 'fifo.json')]);
    const started = Date.now();
    expect(await readExtractorOutput(join(root, 'fifo.json'))).toEqual({ ok: false, code: 'output_not_a_file', bytesRead: 0 });
    expect(Date.now() - started).toBeLessThan(5_000);
    await mkdir(join(root, 'folder.json'));
    expect(await readExtractorOutput(join(root, 'folder.json'))).toEqual({ ok: false, code: 'output_not_a_file', bytesRead: 0 });
    await writeFile(join(root, 'large.json'), '{"TEST":"a longer output than its limit"}');
    expect(await readExtractorOutput(join(root, 'large.json'), { ...OUTPUT_LIMITS, outputBytes: 16 })).toMatchObject({ ok: false, code: 'output_too_large' });
    expect(await readExtractorOutput(join(root, 'large.json'))).toMatchObject({ ok: true, value: { TEST: 'a longer output than its limit' } });
  });
});

describe('a container that attacks its output place (phase 2 review; needs Docker and the extractor image)', () => {
  const root = mkdtempSync(join(process.platform === 'darwin' ? join(homedir(), 'Library', 'Caches') : tmpdir(), 'sovitech-test-sandbox-attack-'));
  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  /** Runs TEST Python in the extractor's image, in the job's sandbox, as the reader would run. */
  async function probe(jobId: string, code: string, limits = { ...DEFAULT_SANDBOX_LIMITS, wallClockSeconds: 60 }): Promise<{ outcome: unknown; files: string[] }> {
    const folder = join(root, jobId);
    await mkdir(join(folder, 'output'), { recursive: true });
    await writeFile(join(folder, 'original'), 'TEST bytes');
    await writeFile(join(folder, 'request.json'), '{}');
    const runner = new DockerExtractorRunner('sovitech-extractor:dev', limits, 'docker', { entrypoint: 'python', entryArguments: ['-c', code] });
    const outcome = await runner.run({ ...JOB, jobId, inputPath: join(folder, 'original'), requestPath: join(folder, 'request.json'), outputDirectory: join(folder, 'output') });
    const { readdir } = await import('node:fs/promises');
    return { outcome, files: await readdir(join(folder, 'output')) };
  }

  it.runIf(extractorImagePresent())('F-INGEST-04 · rule 13: a container-made symbolic link to /dev/zero at output.json is refused, and nothing lands on the host', { timeout: 120_000 }, async () => {
    const result = await probe('0192f0a0-0000-7000-8000-0000000000b1', "import os; os.symlink('/dev/zero', '/output/output.json')");
    expect(result).toEqual({ outcome: { outcome: 'failed', code: 'sandbox_output_refused' }, files: [] });
  });

  it.runIf(extractorImagePresent())('F-INGEST-04 · rule 13: a container-made FIFO at output.json is refused at once, and nothing lands on the host', { timeout: 120_000 }, async () => {
    const started = Date.now();
    const result = await probe('0192f0a0-0000-7000-8000-0000000000b2', "import os; os.mkfifo('/output/output.json')");
    expect(result).toEqual({ outcome: { outcome: 'failed', code: 'sandbox_output_refused' }, files: [] });
    // Well before the probe's wall clock: the FIFO is never read.
    expect(Date.now() - started).toBeLessThan(DEFAULT_SANDBOX_LIMITS.wallClockSeconds * 1000);
  });

  it.runIf(extractorImagePresent())('F-INGEST-04 · ADR 0018: /output is size-limited and noexec, and the one regular output file is copied out', { timeout: 120_000 }, async () => {
    // Exits 0 only when writing past the volume's size and running a file from /output are both refused.
    const code = [
      'import errno, os, subprocess, sys',
      'try:',
      "    open('/output/big', 'wb').write(b'x' * (2 * 1024 * 1024))",
      '    sys.exit(7)',
      'except OSError as error:',
      '    if error.errno != errno.ENOSPC: sys.exit(8)',
      "os.remove('/output/big')",
      "open('/output/run.sh', 'w').write('#!/bin/sh\\nexit 0\\n')",
      "os.chmod('/output/run.sh', 0o755)",
      'try:',
      "    subprocess.run(['/output/run.sh'], check=False)",
      '    sys.exit(9)',
      'except PermissionError:',
      '    pass',
      "open('/output/output.json', 'w').write('{\"TEST\": \"probe\"}')",
    ].join('\n');
    const result = await probe('0192f0a0-0000-7000-8000-0000000000b3', code, { ...DEFAULT_SANDBOX_LIMITS, wallClockSeconds: 60, outputBytes: 1024 * 1024 });
    expect(result).toEqual({ outcome: { outcome: 'finished' }, files: ['output.json'] });
    expect(await readExtractorOutput(join(root, '0192f0a0-0000-7000-8000-0000000000b3', 'output', 'output.json'))).toMatchObject({ ok: true, value: { TEST: 'probe' } });
    // The job's containers and its volume are gone.
    const names = sandboxNames('0192f0a0-0000-7000-8000-0000000000b3');
    expect(() => execFileSync('docker', ['volume', 'inspect', names.volume], { stdio: 'ignore' })).toThrow();
    expect(() => execFileSync('docker', ['container', 'inspect', names.holder], { stdio: 'ignore' })).toThrow();
  });
});
