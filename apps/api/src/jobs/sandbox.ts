/**
 * The extraction sandbox runner (prompt 3 section 8: "Every job that opens an owner model or
 * document runs in a container with no network, a read-only input mount, and memory and time
 * limits"; docs/adr/0018 decision 3, the flags the runner applies;
 * docs/adr/0026-analysis-queue-and-upload-sessions.md).
 *
 * One container per job, started with the docker CLI through node:child_process (no Docker
 * client library). The job's reader picks the image: an IFC model goes to the IFC reader
 * (services/ifc-reader/Dockerfile: web-ifc, owner decision 2026-09-26; docs/adr/0031), every
 * other file to the extractor image's `extractor` target (Python: PDF and XLSX read, the rest
 * stored). Both run with the same flags:
 *   --network none --read-only --cap-drop ALL --security-opt no-new-privileges
 *   --user 10001:10001 (the images' own account, named so an image override cannot run as root),
 *   --pids-limit, --memory equal to --memory-swap, --cpus, a small noexec tmpfs at /tmp,
 *   the stored file read-only at /input/document, the request read-only at
 *   /job/request.json, the draft IDS read-only at /ids/requirements.ids for a model, and,
 *   as the one writable place, /output: a volume of the job's own, a tmpfs limited in size,
 *   noexec, nosuid and nodev, that no host folder backs;
 * and killed at the wall-clock limit. Its command line is the extractor's CLI, which the IFC
 * reader's takes over unchanged (services/extractor/src/sovitech_extractor/cli.py;
 * packages/ifc-reader/src/cli.ts):
 *   --request /job/request.json --document /input/document --out /output [--ids /ids/requirements.ids]
 * and it writes /output/output.json through the contract's dump_output (ADR 0022). Its exit
 * status says how it ended: 0 written, 2 request refused, 3 job refused, 4 internal error.
 *
 * The output volume lives only while a holder container (the same image, running `sleep`, with
 * the same flags) keeps it mounted. After the job, the runner copies /output/output.json out
 * through the Docker daemon as a tar entry (./copy-out.ts): only one regular file within the
 * output limit is taken, into a host file the runner creates; a link, a FIFO, a device or a
 * folder there is refused (`sandbox_output_refused`) and nothing is written on the host. The
 * holder, the job's container and the volume are removed whatever happened. (The phase 2
 * review: the host no longer opens anything a container made.)
 *
 * The volume and the copy are sized by what the job asked for (ADR 0034): a job that asked for
 * no IFC values may write one output of at most OUTPUT_LIMITS.outputBytes (4 MiB) and its line
 * end; only a job that asked for IFC values of a model (never while `ifc-values` is closed) gets
 * room for the per-line IFC section after it (OUTPUT_LIMITS.gatedBytes, 512 MiB).
 *
 * Nothing the container prints is read or logged: its output could carry document text
 * (rule 13). Only its exit tells the worker what happened, as a code, and the output file is
 * read only through the contract's strict parser.
 */
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { copyOutputEntry } from './copy-out';
import { outputFileBytes } from './read-output';

export interface SandboxLimits {
  /** Memory, and the same for memory and swap (docker's --memory, --memory-swap). */
  readonly memory: string;
  readonly cpus: string;
  readonly pids: number;
  readonly tmpfsSize: string;
  readonly wallClockSeconds: number;
  /** The output volume's size in bytes for a job that asked for no IFC values: the most the container can write. */
  readonly outputBytes: number;
  /** The output volume's size in bytes for a job that asked for IFC values of a model (the per-line section: ADR 0034). */
  readonly gatedOutputBytes: number;
}

/** Room on the output volume beyond the largest output file the API reads (the file system's own blocks). */
const VOLUME_MARGIN_BYTES = 1024 * 1024;

/**
 * Prompt 3 section 11: the data pass within 5 minutes and 4 GB (the extractor's EXTRACTOR spec).
 * The output volume holds the largest output file the API reads for the job (./read-output.ts,
 * OUTPUT_LIMITS) and a margin; the writers write a temporary file and rename it, so no second
 * copy needs room.
 */
export const DEFAULT_SANDBOX_LIMITS: SandboxLimits = {
  memory: '4g',
  cpus: '2',
  pids: 256,
  tmpfsSize: '64m',
  wallClockSeconds: 300,
  outputBytes: outputFileBytes(false) + VOLUME_MARGIN_BYTES,
  gatedOutputBytes: outputFileBytes(true) + VOLUME_MARGIN_BYTES,
};

/** The account both images run as (ADR 0018; ADR 0031), named on every container. */
export const SANDBOX_USER = '10001:10001';

/**
 * Which sandbox reads a job's file: the IFC reader for an IFC model, the Python extractor for
 * everything else (PDF and XLSX read; the other formats stored with their G12-1 line).
 */
export type SandboxReader = 'extractor' | 'ifc-reader';

/** The reader of a stored format. */
export function readerFor(format: string): SandboxReader {
  return format === 'ifc' ? 'ifc-reader' : 'extractor';
}

/** The image of each reader, built locally (ADR 0018; ADR 0031). */
export interface SandboxImages {
  readonly extractor: string;
  readonly ifcReader: string;
}

export interface SandboxJob {
  /** A name for the container: the job id. */
  readonly jobId: string;
  /** Which sandbox reads the file (the extractor when absent). */
  readonly reader?: SandboxReader;
  /** The stored original, on the host. */
  readonly inputPath: string;
  /** The request file (request.json) on the host, mounted read-only. */
  readonly requestPath: string;
  /**
   * The job's output folder on the host, made by the worker: where the runner puts the
   * output file it copied out of the container's own output volume. The container never
   * mounts it.
   */
  readonly outputDirectory: string;
  /** The draft IDS file, for a model whose request names it; mounted read-only. */
  readonly idsPath?: string;
  /** Whether the job's request asked for IFC values (never while `ifc-values` is closed): the room its output gets. */
  readonly ifcValues?: boolean;
}

export type SandboxOutcome =
  | { readonly outcome: 'finished' }
  | {
      readonly outcome: 'failed';
      readonly code:
        | 'sandbox_time_limit'
        | 'sandbox_memory_limit'
        | 'extractor_refused_request'
        | 'extractor_refused_job'
        | 'extractor_failed'
        | 'sandbox_unavailable'
        /** The container left something other than one regular output file within the limit. */
        | 'sandbox_output_refused';
    };

export interface ExtractorRunner {
  run(job: SandboxJob): Promise<SandboxOutcome>;
}

const CONTAINER_NAME = /^[0-9a-f-]{36}$/;

/** The places inside the container (the extractor's sandbox.py). */
export const SANDBOX_INPUT = '/input/document';
export const SANDBOX_REQUEST = '/job/request.json';
export const SANDBOX_OUTPUT = '/output';
export const SANDBOX_IDS = '/ids/requirements.ids';

function mount(source: string, target: string): string {
  if (source.includes(',')) throw new Error('a mounted path may not hold a comma');
  return `type=bind,source=${source},target=${target},readonly`;
}

function checkedJobId(jobId: string): string {
  if (!CONTAINER_NAME.test(jobId)) throw new Error('a job id names the container');
  return jobId;
}

/** The names of one job's container, its output volume and the holder that keeps the volume mounted. */
export function sandboxNames(jobId: string): { readonly container: string; readonly volume: string; readonly holder: string } {
  const id = checkedJobId(jobId);
  return { container: `sovitech-job-${id}`, volume: `sovitech-job-output-${id}`, holder: `sovitech-job-hold-${id}` };
}

/** The output volume, mounted at /output: the one writable place of both containers. */
function outputMount(jobId: string): string {
  return `type=volume,source=${sandboxNames(jobId).volume},target=${SANDBOX_OUTPUT},volume-nocopy`;
}

/**
 * The flags every container of a job runs with (ADR 0018), before its image. The viewer step's conversion job
 * (./model-view/sandbox.ts) runs with these same flags.
 */
export function confinement(limits: Pick<SandboxLimits, 'pids' | 'memory' | 'cpus'>): string[] {
  return [
    '--network',
    'none',
    '--read-only',
    '--cap-drop',
    'ALL',
    '--security-opt',
    'no-new-privileges',
    '--user',
    SANDBOX_USER,
    '--pids-limit',
    `${limits.pids}`,
    '--memory',
    limits.memory,
    '--memory-swap',
    limits.memory,
    '--cpus',
    limits.cpus,
  ];
}

/**
 * The docker command that creates a job's output volume: a tmpfs of `outputBytes` (of
 * `gatedOutputBytes` for a job that asked for IFC values), noexec, nosuid and nodev, owned by the
 * sandbox's account and closed to everyone else.
 */
export function outputVolumeArguments(jobId: string, limits: SandboxLimits = DEFAULT_SANDBOX_LIMITS, ifcValues = false): string[] {
  const size = ifcValues ? limits.gatedOutputBytes : limits.outputBytes;
  if (!Number.isSafeInteger(size) || size < 1) throw new Error('the output volume has a size in bytes');
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
    `o=size=${size},noexec,nosuid,nodev,uid=${uid ?? ''},gid=${gid ?? ''},mode=0700`,
    '--label',
    'sovitech.job-output=1',
    sandboxNames(jobId).volume,
  ];
}

/** The docker command of the holder: it keeps the output volume mounted, so the output outlives the job's container. */
export function holderArguments(image: string, jobId: string, limits: SandboxLimits = DEFAULT_SANDBOX_LIMITS): string[] {
  return [
    'run',
    '--detach',
    '--rm',
    '--name',
    sandboxNames(jobId).holder,
    ...confinement({ pids: 8, memory: '64m', cpus: '0.1' }),
    '--mount',
    outputMount(jobId),
    '--entrypoint',
    'sleep',
    image,
    `${limits.wallClockSeconds + 300}`,
  ];
}

/** Test entry: an entrypoint and arguments put before the reader's own (as the extractor's SandboxSpec.entry_arguments). */
export interface SandboxEntry {
  readonly entrypoint: string;
  readonly entryArguments: readonly string[];
}

/** The docker command line of one job: the sandbox flags of ADR 0018, then the extractor's arguments. */
export function sandboxArguments(image: string, job: SandboxJob, limits: SandboxLimits = DEFAULT_SANDBOX_LIMITS, entry?: SandboxEntry): string[] {
  const names = sandboxNames(job.jobId);
  const ids = job.idsPath === undefined ? [] : ['--mount', mount(job.idsPath, SANDBOX_IDS)];
  return [
    'run',
    '--rm',
    '--name',
    names.container,
    ...confinement(limits),
    '--tmpfs',
    `/tmp:rw,noexec,nosuid,size=${limits.tmpfsSize}`,
    '--mount',
    mount(job.inputPath, SANDBOX_INPUT),
    '--mount',
    mount(job.requestPath, SANDBOX_REQUEST),
    '--mount',
    outputMount(job.jobId),
    ...ids,
    ...(entry === undefined ? [] : ['--entrypoint', entry.entrypoint]),
    image,
    ...(entry === undefined ? [] : entry.entryArguments),
    '--request',
    SANDBOX_REQUEST,
    '--document',
    SANDBOX_INPUT,
    '--out',
    SANDBOX_OUTPUT,
    ...(job.idsPath === undefined ? [] : ['--ids', SANDBOX_IDS]),
  ];
}

/** The IFC reader's image when a runner is given the extractor's image alone (config.ts's default). */
export const DEFAULT_IFC_READER_IMAGE = 'sovitech-ifc-reader:dev';

/**
 * The image that reads a job: the IFC reader's for an IFC job, the extractor's otherwise. Given
 * one image, it is the extractor's, and an IFC job still goes to the IFC reader's default image:
 * a model never reaches the Python extractor, which refuses it (ADR 0031).
 */
export function imageFor(images: string | SandboxImages, job: SandboxJob): string {
  const set = typeof images === 'string' ? { extractor: images, ifcReader: DEFAULT_IFC_READER_IMAGE } : images;
  return job.reader === 'ifc-reader' ? set.ifcReader : set.extractor;
}

/** How long each docker command around a job may take (create, holder, copy, removal). */
const DOCKER_STEP_MS = 120 * 1000;

/** Runs the sandbox with the docker CLI. */
export class DockerExtractorRunner implements ExtractorRunner {
  constructor(
    private readonly images: string | SandboxImages,
    private readonly limits: SandboxLimits = DEFAULT_SANDBOX_LIMITS,
    private readonly docker = 'docker',
    /** Tests only: an entrypoint before the reader's arguments (a probe of the sandbox itself). */
    private readonly entry?: SandboxEntry,
  ) {}

  /** Runs one docker command with its output ignored; its exit status, or undefined when it could not run or ran too long. */
  private step(args: readonly string[], timeoutMs = DOCKER_STEP_MS): Promise<number | undefined> {
    return new Promise((resolve) => {
      const child = spawn(this.docker, args, { stdio: 'ignore' });
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        resolve(undefined);
      }, timeoutMs);
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

  /** Removes a job's containers and its output volume; what is not there is fine. */
  private async removeAll(jobId: string): Promise<void> {
    const names = sandboxNames(jobId);
    await this.step(['rm', '--force', names.container, names.holder]);
    await this.step(['volume', 'rm', '--force', names.volume]);
  }

  /** Runs the job's container to its end or its wall clock. */
  private runJob(image: string, job: SandboxJob): Promise<SandboxOutcome> {
    const args = sandboxArguments(image, job, this.limits, this.entry);
    const name = sandboxNames(job.jobId).container;
    return new Promise((resolve) => {
      let timedOut = false;
      const child = spawn(this.docker, args, { stdio: 'ignore' });
      const timer = setTimeout(() => {
        timedOut = true;
        spawn(this.docker, ['kill', name], { stdio: 'ignore' }).on('error', () => undefined);
        child.kill('SIGKILL');
      }, this.limits.wallClockSeconds * 1000);
      child.on('error', () => {
        clearTimeout(timer);
        resolve({ outcome: 'failed', code: 'sandbox_unavailable' });
      });
      child.on('exit', (code) => {
        clearTimeout(timer);
        if (timedOut) resolve({ outcome: 'failed', code: 'sandbox_time_limit' });
        else if (code === 0) resolve({ outcome: 'finished' });
        else if (code === 2) resolve({ outcome: 'failed', code: 'extractor_refused_request' });
        else if (code === 3) resolve({ outcome: 'failed', code: 'extractor_refused_job' });
        else if (code === 137) resolve({ outcome: 'failed', code: 'sandbox_memory_limit' });
        else if (code === 125) resolve({ outcome: 'failed', code: 'sandbox_unavailable' });
        else resolve({ outcome: 'failed', code: 'extractor_failed' });
      });
    });
  }

  /** Copies /output/output.json out through the daemon, into the job's host output folder (./copy-out.ts). */
  private copyOut(job: SandboxJob): Promise<'copied' | 'missing' | 'refused'> {
    const source = `${sandboxNames(job.jobId).holder}:${SANDBOX_OUTPUT}/output.json`;
    return new Promise((resolve) => {
      const child = spawn(this.docker, ['cp', source, '-'], { stdio: ['ignore', 'pipe', 'ignore'] });
      let settled = false;
      const settle = (outcome: 'copied' | 'missing' | 'refused'): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        child.kill('SIGKILL');
        resolve(outcome);
      };
      const timer = setTimeout(() => settle('refused'), DOCKER_STEP_MS);
      child.on('error', () => settle('missing'));
      copyOutputEntry(child.stdout, join(job.outputDirectory, 'output.json'), outputFileBytes(job.ifcValues === true)).then(settle, () => settle('refused'));
    });
  }

  async run(job: SandboxJob): Promise<SandboxOutcome> {
    const image = imageFor(this.images, job);
    await this.removeAll(job.jobId);
    try {
      if ((await this.step(outputVolumeArguments(job.jobId, this.limits, job.ifcValues === true))) !== 0) return { outcome: 'failed', code: 'sandbox_unavailable' };
      if ((await this.step(holderArguments(image, job.jobId, this.limits))) !== 0) return { outcome: 'failed', code: 'sandbox_unavailable' };
      const ended = await this.runJob(image, job);
      if (ended.outcome === 'failed') return ended;
      // No output file there reads as none: the worker's own reader names it `output_missing`.
      return (await this.copyOut(job)) === 'refused' ? { outcome: 'failed', code: 'sandbox_output_refused' } : { outcome: 'finished' };
    } finally {
      await this.removeAll(job.jobId);
    }
  }
}
