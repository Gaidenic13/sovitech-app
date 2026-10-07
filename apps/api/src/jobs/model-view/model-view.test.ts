/**
 * The conversion job's parts that need no database (the viewer step, part 1; prompt 3 section 8; docs/adr/0046-viewer-spike.md
 * decision 2; docs/build-log.md, "The viewer step", item 3): the sandbox's command line, the converter's exit codes, the
 * image's source check, the converter's files as the job checks them, and the copy of a named file out of the sandbox.
 * Every value is TEST data. The real sandbox runs in tests/api/model-view-sandbox.test.ts.
 */
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { copyOutputEntry, regularOutputSize } from '../copy-out';
import { DEFAULT_SANDBOX_LIMITS, SANDBOX_USER } from '../sandbox';
import { CONVERTER_SOURCES, converterSourceHash, parsedInspection } from './image';
import { readConversionSummary, storeyIndexHoldsIdsOnly } from './outputs';
import {
  CONVERSION_FILES,
  CONVERSION_LIMITS,
  conversionArguments,
  conversionCode,
  conversionHolderArguments,
  conversionNames,
  conversionVolumeArguments,
  DockerModelConverter,
} from './sandbox';

const REPOSITORY_ROOT = fileURLToPath(new URL('../../../../../', import.meta.url));
const JOB = {
  jobId: '0192f0a0-0000-7000-8000-0000000000cc',
  inputPath: '/TEST/data/0192f0a0-0000-7000-8000-00000000c0a1/sha256:aaaa/original',
  outputDirectory: '/TEST/data/0192f0a0-0000-7000-8000-00000000c0a1/sha256:aaaa/work/0192f0a0-0000-7000-8000-0000000000cc/output',
};

describe('the conversion sandbox\'s command line (the extraction sandbox\'s flags; ADR 0046 decision 2)', () => {
  it('R-025 · prompt 3 section 8: runs with no network, a read-only root, no capabilities, the sandbox\'s account, memory equal to swap at 4g, two CPUs, a noexec tmpfs, the model read-only and one writable output volume', () => {
    const args = conversionArguments('sovitech-model-converter:TEST', JOB);
    const joined = args.join(' ');
    for (const flag of ['--network none', '--read-only', '--cap-drop ALL', '--security-opt no-new-privileges', '--pids-limit 256', '--cpus 2']) expect(joined).toContain(flag);
    expect(args[args.indexOf('--user') + 1]).toBe(SANDBOX_USER);
    expect(args[args.indexOf('--memory') + 1]).toBe('4g');
    expect(args[args.indexOf('--memory-swap') + 1]).toBe('4g');
    expect(args[args.indexOf('--tmpfs') + 1]).toBe('/tmp:rw,noexec,nosuid,size=64m');
    const mounts = args.flatMap((arg, index) => (args[index - 1] === '--mount' ? [arg] : []));
    expect(mounts).toEqual([`type=bind,source=${JOB.inputPath},target=/input/model.ifc,readonly`, `type=volume,source=sovitech-convert-output-${JOB.jobId},target=/output,volume-nocopy`]);
    // The host folder is never mounted: the container writes only into its own volume.
    expect(joined).not.toContain(JOB.outputDirectory);
    // The image's entrypoint names the converter and its local web-ifc folder; the job adds its input and output only.
    expect(args.slice(args.indexOf('sovitech-model-converter:TEST'))).toEqual(['sovitech-model-converter:TEST', '--input', '/input/model.ifc', '--out', '/output']);
    // Never a pull: the image is the one on this machine, or the step fails.
    expect(args[args.indexOf('--pull') + 1]).toBe('never');
    expect(args.indexOf('--pull')).toBeLessThan(args.indexOf('sovitech-model-converter:TEST'));
    expect(() => conversionArguments('sovitech-model-converter:TEST', { ...JOB, inputPath: '/TEST/a,b' })).toThrow('a mounted path may not hold a comma');
  });

  it('R-025 · ADR 0041 item 2: the wall clock is 15 minutes, and the limits are the extraction sandbox\'s', () => {
    expect(CONVERSION_LIMITS.wallClockSeconds).toBe(900);
    expect(CONVERSION_LIMITS).toMatchObject({ memory: DEFAULT_SANDBOX_LIMITS.memory, cpus: DEFAULT_SANDBOX_LIMITS.cpus, pids: DEFAULT_SANDBOX_LIMITS.pids, tmpfsSize: DEFAULT_SANDBOX_LIMITS.tmpfsSize });
  });

  it('R-025 · ADR 0018: the output volume is a size-limited noexec tmpfs owned by the sandbox\'s account, and the holder runs confined', () => {
    const volume = conversionVolumeArguments(JOB.jobId);
    expect(volume).toContain(`o=size=${CONVERSION_LIMITS.outputBytes},noexec,nosuid,nodev,uid=10001,gid=10001,mode=0700`);
    expect(volume.at(-1)).toBe(conversionNames(JOB.jobId).volume);
    const holder = conversionHolderArguments('sovitech-model-converter:TEST', JOB.jobId).join(' ');
    for (const flag of ['--network none', '--read-only', '--cap-drop ALL', '--security-opt no-new-privileges', '--user 10001:10001', '--entrypoint sleep', '--pull never']) expect(holder).toContain(flag);
    expect(() => conversionNames('TEST; rm -rf /')).toThrow();
  });

  it('R-025 · US-MODEL-05 AC4 · rule 13: the converter\'s exit status is read as a code, and nothing it printed is', () => {
    expect([0, 2, 3, 4, 5, 125, 134, 137, 1, null].map((status) => conversionCode(status))).toEqual([
      undefined,
      'stale_image',
      'parse_failed',
      'parse_failed',
      'no_geometry',
      'sandbox_unavailable',
      'out_of_memory',
      'out_of_memory',
      'parse_failed',
      'parse_failed',
    ]);
  });
});

describe('the converter image\'s source check (stale_image)', () => {
  it('R-025: the source hash is the one services/model-converter/build.sh and the Dockerfile compute with sha256sum', async () => {
    const sum = "if command -v sha256sum >/dev/null 2>&1; then SUM='sha256sum'; else SUM='shasum -a 256'; fi";
    const listing = `(printf '%s\\n' ${CONVERTER_SOURCES.files.join(' ')}; find ${CONVERTER_SOURCES.folders.join(' ')} -type f -name '*.ts' ! -name '*.test.ts')`;
    const shell = execFileSync('sh', ['-c', `${sum}; ${listing} | LC_ALL=C sort | xargs $SUM | $SUM | cut -d' ' -f1`], { cwd: REPOSITORY_ROOT, encoding: 'utf8' }).trim();
    expect(await converterSourceHash(REPOSITORY_ROOT)).toBe(`sha256:${shell}`);
  });

  it('R-025 · ADR 0051: the hash covers what builds the image beside the converter\'s sources (its Dockerfile, the lockfile it installs from, the workspace file), and build.sh and the Dockerfile list the same files', () => {
    // Found by the review of part 1 (V-7, A-8): a change to the Dockerfile's flags or to a bundled dependency built a
    // different converter under the same label.
    expect(CONVERTER_SOURCES.files).toEqual(['packages/viewer-spike/package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'services/model-converter/Dockerfile']);
    const build = readFileSync(join(REPOSITORY_ROOT, 'services/model-converter/build.sh'), 'utf8');
    const dockerfile = readFileSync(join(REPOSITORY_ROOT, 'services/model-converter/Dockerfile'), 'utf8');
    const listed = `printf '%s\\n' ${CONVERTER_SOURCES.files.join(' ')}; find ${CONVERTER_SOURCES.folders.join(' ')} -type f -name '*.ts' ! -name '*.test.ts'`;
    expect(build).toContain(listed);
    expect(dockerfile).toContain(listed);
    // Each hashed file reaches the build's context.
    const ignore = readFileSync(join(REPOSITORY_ROOT, '.dockerignore'), 'utf8').split('\n');
    for (const file of CONVERTER_SOURCES.files) expect(ignore, file).toContain(`!${file}`);
  });

  it('R-025: reads the daemon\'s answer as a digest and a source label, and an image with no label as one with none', () => {
    const digest = `sha256:${'a'.repeat(64)}`;
    const label = `sha256:${'b'.repeat(64)}`;
    expect(parsedInspection(`${digest} ${label}\n`)).toEqual({ digest, sourceHash: label });
    expect(parsedInspection(`${digest} <no value>\n`)).toEqual({ digest });
    expect(parsedInspection(`${digest} \n`)).toEqual({ digest });
    expect(parsedInspection('Error: No such image\n')).toBeUndefined();
  });
});

describe('the converter\'s files as the job checks them (rule 13; ifc-input 6.2.15)', () => {
  const root = mkdtempSync(join(tmpdir(), 'sovitech-test-conversion-outputs-'));
  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  const summary = {
    about: 'model conversion: a code, sizes, times and memory only',
    code: 'written',
    profile: 'view',
    inputBytes: 37894,
    fragmentsBytes: 4416,
    indexBytes: 300,
    importMs: 310.25,
    metadataMs: 22.5,
    indexMs: 3.125,
    planMs: null,
    planSegments: [],
    planBytes: [],
    totalMs: 400.5,
    maxRssKiB: 231424,
    cgroupMemoryPeak: '186000000',
    node: 'v22.17.1',
  };

  async function summaryOf(text: string): Promise<unknown> {
    const path = join(root, `summary-${String(text.length)}.json`);
    await writeFile(path, text);
    return readConversionSummary(path);
  }

  it('R-025 · rule 13: takes the code, sizes, times and memory of the converter\'s one-line summary, and nothing else', async () => {
    expect(await summaryOf(`${JSON.stringify(summary)}\n`)).toEqual({ inputBytes: 37894, fragmentsBytes: 4416, indexBytes: 300, importMs: 310.25, metadataMs: 22.5, indexMs: 3.125, maxRssKiB: 231424 });
  });

  it('R-025 · rule 13: refuses a summary of any other shape: not one line, another code, a size that is not a whole number, a time below zero', async () => {
    expect(await summaryOf(`${JSON.stringify(summary, null, 2)}\n`)).toBeUndefined();
    expect(await summaryOf(`${JSON.stringify({ ...summary, code: 'TEST model text' })}\n`)).toBeUndefined();
    expect(await summaryOf(`${JSON.stringify({ ...summary, fragmentsBytes: 44.5 })}\n`)).toBeUndefined();
    expect(await summaryOf(`${JSON.stringify({ ...summary, importMs: -1 })}\n`)).toBeUndefined();
    expect(await summaryOf(`${JSON.stringify({ ...summary, indexBytes: '300' })}\n`)).toBeUndefined();
    expect(await summaryOf('[1,2,3]\n')).toBeUndefined();
    expect(await summaryOf('TEST not json\n')).toBeUndefined();
  });

  async function indexHolds(text: string): Promise<boolean> {
    const path = join(root, `storeys-${String(text.length)}-${String(text.charCodeAt(text.length - 2))}.json`);
    await writeFile(path, text, 'latin1');
    return storeyIndexHoldsIdsOnly(path);
  }

  it('ifc-input 6.2.15 · no text in a view file or scene: a storey index passes only with its keys, GlobalIds and punctuation, and a GlobalId is kept as its author wrote it', async () => {
    // The limit (the review of part 1, A-9): a GlobalId its author wrote as words passes, since it is a GlobalId; so no
    // GlobalId is shown or logged while ifc-values is closed.
    expect(await indexHolds(`${JSON.stringify({ storeys: [{ storey: 'TEST_HOTEL_NAME_FLOOR1', elements: ['TEST_ROOM_NAME_SUITE_A'] }] })}\n`)).toBe(true);
    const good = `${JSON.stringify({ storeys: [{ storey: '0TESTstoreyGlobalId001', elements: ['0TESTelementGlobalId01', '0TEST$element_Global02'] }, { storey: '0TESTstoreyGlobalId002', elements: [] }] })}\n`;
    expect(await indexHolds(good)).toBe(true);
    expect(await indexHolds(`${JSON.stringify({ storeys: [] })}\n`)).toBe(true);
    for (const bad of [
      { storeys: [{ storey: '0TESTstoreyGlobalId001', elements: ['Etaj 1'] }] },
      { storeys: [{ storey: '0TESTstoreyGlobalId001', name: 'Parter', elements: [] }] },
      { storeys: [{ storey: '0TESTstoreyGlobalId001', elements: [], elevation: 3150 }] },
      { storeys: [{ storey: 'L1', elements: [] }] },
      { names: [] },
    ]) {
      expect(await indexHolds(`${JSON.stringify(bad)}\n`), JSON.stringify(bad)).toBe(false);
    }
    expect(await indexHolds('{"storeys":[{"storey":"0TESTstoreyGlobalId001","elements":["0TESTelementGlobalIdé1"]}]}\n')).toBe(false);
  });
});

/** A USTAR header for one entry, as the Docker daemon writes it for `docker cp ... -`. */
function tarHeader(name: string, size: number): Buffer {
  const header = Buffer.alloc(512);
  header.write(name, 0, 'latin1');
  header.write('0000644\0', 100, 'latin1');
  header.write(`${size.toString(8).padStart(11, '0')}\0`, 124, 'latin1');
  header.write('0', 156, 'latin1');
  header.write('ustar\0', 257, 'latin1');
  return header;
}

describe('copying the converter\'s files out of the sandbox, each by its own name', () => {
  const root = mkdtempSync(join(tmpdir(), 'sovitech-test-conversion-copy-'));
  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('R-025 · rule 13: takes a regular file of the name asked for within its bound, and refuses another name, a larger file or a name that is a path', async () => {
    const body = Buffer.from('TEST view bytes');
    const tar = (name: string): Readable => Readable.from([tarHeader(name, body.length), body, Buffer.alloc(1024)]);
    expect(await copyOutputEntry(tar('viewer.frag'), join(root, 'viewer.frag'), CONVERSION_FILES.fragments.maxBytes, 'viewer.frag')).toBe('copied');
    expect(await copyOutputEntry(tar('storeys.json'), join(root, 'other.frag'), CONVERSION_FILES.fragments.maxBytes, 'viewer.frag')).toBe('refused');
    expect(await copyOutputEntry(tar('summary.json'), join(root, 'summary.json'), 4, 'summary.json')).toBe('refused');
    expect(regularOutputSize(tarHeader('output.json', 5), 64)).toBe(5);
    expect(() => regularOutputSize(tarHeader('a', 1), 64, '../viewer.frag')).toThrow();
  });
});

/** A USTAR stream of one entry, as `docker cp <holder>:/output/<name> -` writes it. */
function tarOf(name: string, body: Buffer): Buffer {
  // The entry's bytes, padded with zeros to the tar block (512 bytes).
  const padded = Buffer.alloc(body.length + ((512 - (body.length % 512)) % 512));
  body.copy(padded);
  return Buffer.concat([tarHeader(name, body.length), padded, Buffer.alloc(1024)]);
}

describe('the conversion sandbox\'s runner over a TEST docker command (each step answers as scripted)', () => {
  const root = mkdtempSync(join(tmpdir(), 'sovitech-test-conversion-runner-'));
  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  const DIGEST = `sha256:${'c'.repeat(64)}`;
  const VIEW = Buffer.from('TEST view bytes');
  const INDEX = Buffer.from(`${JSON.stringify({ storeys: [] })}\n`);
  const SUMMARY = Buffer.from('TEST summary\n');

  /**
   * A TEST stand-in for the docker CLI, written as a shell script beside its tar streams: every step exits 0 and logs
   * its arguments; `cp <holder>:/output/<name> -` prints `<name>.tar` when there is one, and nothing otherwise.
   */
  function testDocker(label: string, entries: Readonly<Record<string, Buffer>>): { readonly docker: string; readonly calls: () => string[] } {
    const folder = join(root, label);
    mkdirSync(folder, { recursive: true });
    for (const [name, tar] of Object.entries(entries)) writeFileSync(join(folder, `${name}.tar`), tar);
    const docker = join(folder, 'docker');
    writeFileSync(
      docker,
      [
        '#!/bin/sh',
        'dir=$(dirname "$0")',
        'echo "$*" >> "$dir/calls.log"',
        'if [ "$1" = cp ]; then name=${2##*/}; [ -f "$dir/$name.tar" ] && cat "$dir/$name.tar"; fi',
        'exit 0',
        '',
      ].join('\n'),
    );
    chmodSync(docker, 0o755);
    return { docker, calls: () => readFileSync(join(folder, 'calls.log'), 'utf8').trim().split('\n') };
  }

  async function jobIn(label: string): Promise<{ readonly jobId: string; readonly inputPath: string; readonly outputDirectory: string }> {
    const outputDirectory = join(root, label, 'output');
    await mkdir(outputDirectory, { recursive: true });
    return { ...JOB, outputDirectory };
  }

  it('R-025 · ADR 0051: a conversion whose three files copy out finishes, and every container runs the inspected image by its digest, never pulled', async () => {
    const { docker, calls } = testDocker('finished', { 'viewer.frag': tarOf('viewer.frag', VIEW), 'storeys.json': tarOf('storeys.json', INDEX), 'summary.json': tarOf('summary.json', SUMMARY) });
    const job = await jobIn('finished');
    expect((await new DockerModelConverter(docker).run(job, DIGEST)).outcome).toBe('finished');
    expect(readFileSync(join(job.outputDirectory, 'viewer.frag')).equals(VIEW)).toBe(true);
    const runs = calls().filter((call) => call.startsWith('run '));
    expect(runs).toHaveLength(2);
    for (const call of runs) expect(call).toMatch(new RegExp(`--pull never .*${DIGEST}`, 'u'));
  });

  it('R-025 · US-MODEL-05 AC4: the host\'s or the daemon\'s side of the copy-out failing is `output_unavailable` (retried), never the model\'s `output_refused`', async () => {
    // Found by the review of part 1 (A-4): these read as the model's own failure, recorded for good.
    const files = { 'viewer.frag': tarOf('viewer.frag', VIEW), 'storeys.json': tarOf('storeys.json', INDEX), 'summary.json': tarOf('summary.json', SUMMARY) };
    // The job's folder is gone (an erasure removed it while the converter ran).
    const gone = testDocker('folder gone', files);
    expect(await new DockerModelConverter(gone.docker).run({ ...JOB, outputDirectory: join(root, 'folder gone', 'no such folder') }, DIGEST)).toMatchObject({ outcome: 'failed', code: 'output_unavailable' });
    // A file of that name is already there (a run stopped part-way): the copy never writes over it.
    const leftover = testDocker('leftover', files);
    const leftoverJob = await jobIn('leftover');
    await writeFile(join(leftoverJob.outputDirectory, 'viewer.frag'), 'TEST earlier bytes');
    expect(await new DockerModelConverter(leftover.docker).run(leftoverJob, DIGEST)).toMatchObject({ outcome: 'failed', code: 'output_unavailable' });
    expect(readFileSync(join(leftoverJob.outputDirectory, 'viewer.frag'), 'utf8')).toBe('TEST earlier bytes');
    // The daemon answers nothing (its holder lost).
    const silent = testDocker('silent', {});
    expect(await new DockerModelConverter(silent.docker).run(await jobIn('silent'), DIGEST)).toMatchObject({ outcome: 'failed', code: 'output_unavailable' });
    // The docker command cannot be run at all.
    expect(await new DockerModelConverter(join(root, 'no such docker')).run(await jobIn('no docker'), DIGEST)).toMatchObject({ outcome: 'failed', code: 'sandbox_unavailable' });
  });

  it('R-025 · rule 13: what the container wrote that is not its file (another name, a size past its bound) is still refused whole as `output_refused`', async () => {
    const renamed = testDocker('renamed', { 'viewer.frag': tarOf('storeys.json', VIEW), 'storeys.json': tarOf('storeys.json', INDEX), 'summary.json': tarOf('summary.json', SUMMARY) });
    expect(await new DockerModelConverter(renamed.docker).run(await jobIn('renamed'), DIGEST)).toMatchObject({ outcome: 'failed', code: 'output_refused' });
    const large = testDocker('large', { 'viewer.frag': tarOf('viewer.frag', VIEW), 'storeys.json': tarOf('storeys.json', INDEX), 'summary.json': tarOf('summary.json', Buffer.alloc(CONVERSION_FILES.summary.maxBytes + 1)) });
    expect(await new DockerModelConverter(large.docker).run(await jobIn('large'), DIGEST)).toMatchObject({ outcome: 'failed', code: 'output_refused' });
  });
});
