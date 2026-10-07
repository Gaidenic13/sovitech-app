/**
 * The conversion sandbox of a stored IFC model shown as a document (the viewer step, part 1; prompt 3 section 8: "Every
 * job that opens an owner model or document runs in a container with no network, a read-only input mount, and memory
 * and time limits. That includes the Node conversion with That Open's IfcImporter (web-ifc)"; docs/adr/0046-viewer-spike.md
 * decision 2; docs/build-log.md, "The viewer step", item 3).
 *
 * One container per conversion, started with the docker CLI, with the flags of the extraction sandbox (../sandbox.ts,
 * `confinement`, as the spike's runner applied them): --network none, --read-only, --cap-drop ALL, --security-opt
 * no-new-privileges, --user 10001:10001, --pids-limit 256, --memory equal to --memory-swap at 4g, --cpus 2, a 64 MB
 * noexec /tmp; the stored original mounted read-only at /input/model.ifc; and, as the one writable place, /output: a
 * volume of the job's own, a tmpfs limited in size, noexec, nosuid and nodev, that no host folder backs, kept mounted by
 * a holder container so the files outlive the job. The wall clock is 15 minutes (ADR 0041 item 2). Afterwards the runner
 * copies the converter's three files out through the Docker daemon (../copy-out.ts), each a regular file of its own
 * name within its bound (`viewer.frag`, `storeys.json`, `summary.json`), into the job's folder on the host, which the
 * container never mounts. The holder, the job's container and the volume are removed whatever happened.
 *
 * Nothing the container prints is read or logged: its exit status says how it ended, as a code (rule 13; G13-13), and
 * the summary is read afterwards by the worker through the reviewed reader (../read-output.ts).
 *
 * The review of part 1 (A-4, A-7): every container runs the image the worker inspected, by its digest, with
 * `--pull never`, so a retag between the check and the run, or a missing tag, never runs another converter; and a
 * copy-out that fails on the host's or the daemon's side (the job's folder gone, a file already there, a write error,
 * no answer from the daemon) is `output_unavailable`, which is retried, never the model's own `output_refused`, which
 * stays for what the container wrote: an entry that is not a regular file of its name within its bound.
 */
import { spawn } from 'node:child_process';
import { lstat } from 'node:fs/promises';
import { join } from 'node:path';
import type { ModelViewFailure } from '@sovitech/db';
import { copyOutputEntry } from '../copy-out';
import { confinement, DEFAULT_SANDBOX_LIMITS, SANDBOX_USER, type SandboxLimits } from '../sandbox';

/** The converter's files, by name (packages/viewer-spike/src/convert/cli.ts, OUTPUT_FILES), and the most each may hold. */
export const CONVERSION_FILES = {
  fragments: { name: 'viewer.frag', maxBytes: 256 * 1024 * 1024 },
  storeys: { name: 'storeys.json', maxBytes: 64 * 1024 * 1024 },
  summary: { name: 'summary.json', maxBytes: 64 * 1024 },
} as const;

export type ConversionFile = keyof typeof CONVERSION_FILES;

/**
 * The conversion's limits: the extraction sandbox's memory, CPUs, processes and /tmp; a wall clock of 15 minutes (the
 * budget, ADR 0041 item 2); an output volume holding the three files at their bounds and a margin.
 */
export const CONVERSION_LIMITS: Pick<SandboxLimits, 'memory' | 'cpus' | 'pids' | 'tmpfsSize' | 'wallClockSeconds'> & { readonly outputBytes: number } = {
  memory: DEFAULT_SANDBOX_LIMITS.memory,
  cpus: DEFAULT_SANDBOX_LIMITS.cpus,
  pids: DEFAULT_SANDBOX_LIMITS.pids,
  tmpfsSize: DEFAULT_SANDBOX_LIMITS.tmpfsSize,
  wallClockSeconds: 15 * 60,
  outputBytes: 512 * 1024 * 1024,
};

/** The places inside the container. */
export const CONVERSION_INPUT = '/input/model.ifc';
export const CONVERSION_OUTPUT = '/output';

export interface ConversionJob {
  /** The conversion job's id: it names the containers and the volume. */
  readonly jobId: string;
  /** The stored original, on the host, mounted read-only. */
  readonly inputPath: string;
  /** The job's folder on the host (owner-only), where the files copied out go. The container never mounts it. */
  readonly outputDirectory: string;
}

export type ConversionOutcome =
  | { readonly outcome: 'finished'; readonly wallMs: number }
  | { readonly outcome: 'failed'; readonly code: ModelViewFailure; readonly wallMs: number };

/**
 * Runs one conversion in its sandbox: the worker's seam (tests hand in a scripted one; ../../../tests/). `image` is the
 * image the worker inspected, named by its digest (`sha256:<hex>`).
 */
export interface ModelConverterRunner {
  run(job: ConversionJob, image: string): Promise<ConversionOutcome>;
}

const CONTAINER_NAME = /^[0-9a-f-]{36}$/;

/** The names of one conversion's container, its output volume and the holder that keeps the volume mounted. */
export function conversionNames(jobId: string): { readonly container: string; readonly volume: string; readonly holder: string } {
  if (!CONTAINER_NAME.test(jobId)) throw new Error('a job id names the container');
  return { container: `sovitech-convert-${jobId}`, volume: `sovitech-convert-output-${jobId}`, holder: `sovitech-convert-hold-${jobId}` };
}

function outputMount(jobId: string): string {
  return `type=volume,source=${conversionNames(jobId).volume},target=${CONVERSION_OUTPUT},volume-nocopy`;
}

/** The docker command that creates a conversion's output volume: a tmpfs, noexec, nosuid and nodev, owned by the sandbox's account. */
export function conversionVolumeArguments(jobId: string): string[] {
  const [uid, gid] = SANDBOX_USER.split(':');
  return [
    'volume',
    'create',
    '--driver',
    'local',
    '--opt',
    'type=tmpfs',
    '--opt',
    'device=tmpfs',
    '--opt',
    `o=size=${CONVERSION_LIMITS.outputBytes},noexec,nosuid,nodev,uid=${uid ?? ''},gid=${gid ?? ''},mode=0700`,
    '--label',
    'sovitech.conversion-output=1',
    conversionNames(jobId).volume,
  ];
}

/** The docker command of the holder: it keeps the output volume mounted, so the files outlive the conversion's container. */
export function conversionHolderArguments(image: string, jobId: string): string[] {
  return [
    'run',
    '--detach',
    '--rm',
    '--name',
    conversionNames(jobId).holder,
    ...confinement({ pids: 8, memory: '64m', cpus: '0.1' }),
    '--mount',
    outputMount(jobId),
    '--entrypoint',
    'sleep',
    '--pull',
    'never',
    image,
    `${CONVERSION_LIMITS.wallClockSeconds + 300}`,
  ];
}

/**
 * The docker command line of one conversion: the extraction sandbox's flags, then the image, whose entrypoint names the
 * converter and its local web-ifc folder, then the converter's arguments.
 */
export function conversionArguments(image: string, job: ConversionJob): string[] {
  if (job.inputPath.includes(',')) throw new Error('a mounted path may not hold a comma');
  return [
    'run',
    '--rm',
    '--name',
    conversionNames(job.jobId).container,
    ...confinement(CONVERSION_LIMITS),
    '--tmpfs',
    `/tmp:rw,noexec,nosuid,size=${CONVERSION_LIMITS.tmpfsSize}`,
    '--mount',
    `type=bind,source=${job.inputPath},target=${CONVERSION_INPUT},readonly`,
    '--mount',
    outputMount(job.jobId),
    '--pull',
    'never',
    image,
    '--input',
    CONVERSION_INPUT,
    '--out',
    CONVERSION_OUTPUT,
  ];
}

/**
 * The code of a converter's exit status (packages/viewer-spike/src/convert/cli.ts, EXIT_STATUS): 5 no shape; 2 arguments
 * the converter does not take (an image built for another app: `stale_image`); 3 and 4 the model could not be read or
 * converted; 137 and 134 killed for memory (the cgroup's limit, or V8's heap); 125 the daemon could not start it.
 */
export function conversionCode(status: number | null): ModelViewFailure | undefined {
  switch (status) {
    case 0:
      return undefined;
    case 5:
      return 'no_geometry';
    case 2:
      return 'stale_image';
    case 137:
    case 134:
      return 'out_of_memory';
    case 125:
      return 'sandbox_unavailable';
    default:
      return 'parse_failed';
  }
}

/** Whether the job's folder is a folder on the host and holds no file of the copy's name (never written over). */
async function hostTargetFree(folder: string, target: string): Promise<boolean> {
  const status = await lstat(folder).catch(() => undefined);
  if (status === undefined || !status.isDirectory()) return false;
  return (await lstat(target).catch(() => undefined)) === undefined;
}

/** How long each docker command around a conversion may take (create, holder, copy, removal). */
const DOCKER_STEP_MS = 120 * 1000;

/** Runs conversions with the docker CLI. */
export class DockerModelConverter implements ModelConverterRunner {
  constructor(
    private readonly docker = 'docker',
    private readonly wallClockSeconds: number = CONVERSION_LIMITS.wallClockSeconds,
  ) {}

  /** Runs one docker command with its output ignored; its exit status, or undefined when it could not run or ran too long. */
  private step(args: readonly string[]): Promise<number | undefined> {
    return new Promise((resolve) => {
      const child = spawn(this.docker, args, { stdio: 'ignore' });
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        resolve(undefined);
      }, DOCKER_STEP_MS);
      child.on('error', () => {
        clearTimeout(timer);
        resolve(undefined);
      });
      child.on('exit', (code) => {
        clearTimeout(timer);
        resolve(code ?? undefined);
      });
    });
  }

  private async removeAll(jobId: string): Promise<void> {
    const names = conversionNames(jobId);
    await this.step(['rm', '--force', names.container, names.holder]);
    await this.step(['volume', 'rm', '--force', names.volume]);
  }

  /** Runs the conversion's container to its end or its wall clock. */
  private runConversion(image: string, job: ConversionJob): Promise<{ readonly code: ModelViewFailure | undefined }> {
    const name = conversionNames(job.jobId).container;
    return new Promise((resolve) => {
      let timedOut = false;
      const child = spawn(this.docker, conversionArguments(image, job), { stdio: 'ignore' });
      const timer = setTimeout(() => {
        timedOut = true;
        spawn(this.docker, ['kill', name], { stdio: 'ignore' }).on('error', () => undefined);
        child.kill('SIGKILL');
      }, this.wallClockSeconds * 1000);
      child.on('error', () => {
        clearTimeout(timer);
        resolve({ code: 'sandbox_unavailable' });
      });
      child.on('exit', (status) => {
        clearTimeout(timer);
        resolve({ code: timedOut ? 'timed_out' : conversionCode(status) });
      });
    });
  }

  /**
   * Copies one of the converter's files out through the daemon into the job's folder (../copy-out.ts): `copied`;
   * `refused` when the entry is not a regular file of its name within its bound (what the container wrote); or
   * `unavailable` when the host's or the daemon's side failed: the job's folder is not there, a file of that name
   * already is, the host copy could not be written, the daemon answered nothing or not in time.
   */
  private async copyOut(job: ConversionJob, file: ConversionFile): Promise<'copied' | 'refused' | 'unavailable'> {
    const { name, maxBytes } = CONVERSION_FILES[file];
    const target = join(job.outputDirectory, name);
    if (!(await hostTargetFree(job.outputDirectory, target))) return 'unavailable';
    const source = `${conversionNames(job.jobId).holder}:${CONVERSION_OUTPUT}/${name}`;
    return new Promise((resolve) => {
      const child = spawn(this.docker, ['cp', source, '-'], { stdio: ['ignore', 'pipe', 'ignore'] });
      let settled = false;
      const settle = (outcome: 'copied' | 'refused' | 'unavailable'): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        child.kill('SIGKILL');
        resolve(outcome);
      };
      const timer = setTimeout(() => settle('unavailable'), DOCKER_STEP_MS);
      child.on('error', () => settle('unavailable'));
      // An empty stream (`missing`): the daemon gave no entry (its holder lost, or no such file), not a refusal of content.
      copyOutputEntry(child.stdout, target, maxBytes, name).then(
        (outcome) => settle(outcome === 'missing' ? 'unavailable' : outcome),
        () => settle('unavailable'),
      );
    });
  }

  async run(job: ConversionJob, image: string): Promise<ConversionOutcome> {
    const started = Date.now();
    const ended = (code?: ModelViewFailure): ConversionOutcome =>
      code === undefined ? { outcome: 'finished', wallMs: Date.now() - started } : { outcome: 'failed', code, wallMs: Date.now() - started };
    await this.removeAll(job.jobId);
    try {
      if ((await this.step(conversionVolumeArguments(job.jobId))) !== 0) return ended('sandbox_unavailable');
      if ((await this.step(conversionHolderArguments(image, job.jobId))) !== 0) return ended('sandbox_unavailable');
      const converted = await this.runConversion(image, job);
      if (converted.code !== undefined) return ended(converted.code);
      // All three, each a regular file of its own name within its bound; anything else refuses the whole output, and a
      // copy the host or the daemon could not make is the environment's.
      for (const file of ['fragments', 'storeys', 'summary'] as const) {
        const copied = await this.copyOut(job, file);
        if (copied === 'unavailable') return ended('output_unavailable');
        if (copied !== 'copied') return ended('output_refused');
      }
      return ended();
    } finally {
      await this.removeAll(job.jobId);
    }
  }
}
