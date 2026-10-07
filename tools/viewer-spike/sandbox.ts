/**
 * Runs one conversion of the viewer spike in the conversion sandbox image (services/model-converter/Dockerfile, until the viewer step services/viewer-spike/;
 * docs/adr/0046-viewer-spike.md decision 2), with the IFC reader's confinement
 * (apps/api/src/jobs/sandbox.ts): --network none, --read-only, --cap-drop ALL,
 * --security-opt no-new-privileges, the image's own account, --pids-limit, --memory equal to
 * --memory-swap, --cpus, a small noexec /tmp, the model mounted read-only, and one writable place,
 * /output: a tmpfs volume of the job's own that no host folder backs, kept mounted by a holder so
 * the files outlive the job. The two files are copied out through the Docker daemon and checked to
 * be regular files. The containers and the volume are removed whatever happened, and the job is
 * killed at its wall clock.
 *
 * Nothing the container prints is kept: the converter prints codes only, and its summary holds
 * sizes, times and memory (rule 13).
 */
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/** The conversion sandbox image (services/model-converter/build.sh), the live conversion job's too since the viewer step. */
export const SPIKE_IMAGE = 'sovitech-model-converter:dev';
const SANDBOX_USER = '10001:10001';

export interface SandboxLimits {
  readonly memory: string;
  readonly cpus: string;
  readonly pids: number;
  readonly tmpfsSize: string;
  /** Prompt 3 section 11: the viewer conversion of the `perf` model within 15 minutes. */
  readonly wallClockSeconds: number;
  /** The output volume's size in bytes (a tmpfs: the memory it holds counts against the job's). */
  readonly outputBytes: number;
}

export const SPIKE_LIMITS: SandboxLimits = {
  memory: '4g',
  cpus: '2',
  pids: 256,
  tmpfsSize: '64m',
  wallClockSeconds: 15 * 60,
  outputBytes: 512 * 1024 * 1024,
};

export interface SandboxRun {
  readonly exitCode: number | 'killed_at_wall_clock' | 'docker_unavailable';
  /** Wall time of the job's container, seen from the host (start to exit). */
  readonly wallMs: number;
  /** The converter's summary (sizes, times, memory) as it wrote it, when it finished. */
  readonly summaryText?: string;
  /** Where the Fragments file was copied, when it finished. */
  readonly fragmentsPath?: string;
}

function docker(args: readonly string[], timeoutMs = 120_000): Promise<number | undefined> {
  return new Promise((resolve) => {
    const child = spawn('docker', args, { stdio: 'ignore' });
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

function confinement(limits: Pick<SandboxLimits, 'pids' | 'memory' | 'cpus'>): string[] {
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

/** Copies one file out of the holder through the daemon, into a new host file; refuses anything but a regular file. */
async function copyOut(holder: string, name: string, destination: string): Promise<boolean> {
  await mkdir(dirname(destination), { recursive: true });
  await rm(destination, { force: true });
  if ((await docker(['cp', `${holder}:/output/${name}`, destination])) !== 0) return false;
  const info = await lstat(destination);
  if (!info.isFile()) {
    await rm(destination, { recursive: true, force: true });
    return false;
  }
  return true;
}

export interface ConvertRequest {
  /** The model on the host (under the home folder, which the Docker VM shares), mounted read-only. */
  readonly modelPath: string;
  /** Where the Fragments file goes on the host: the store's derived path for the model. */
  readonly fragmentsPath: string;
  /** Where the summary goes on the host (a scratch folder, never the store). */
  readonly summaryPath: string;
  readonly profile?: 'view' | 'library-defaults';
  readonly plans?: boolean;
  readonly image?: string;
  readonly limits?: SandboxLimits;
}

export async function convertInSandbox(request: ConvertRequest): Promise<SandboxRun> {
  const limits = request.limits ?? SPIKE_LIMITS;
  const image = request.image ?? SPIKE_IMAGE;
  const id = randomUUID();
  const names = { job: `sovitech-viewer-spike-${id}`, holder: `sovitech-viewer-spike-hold-${id}`, volume: `sovitech-viewer-spike-output-${id}` };
  const [uid, gid] = SANDBOX_USER.split(':');
  const removeAll = async (): Promise<void> => {
    await docker(['rm', '--force', names.job, names.holder]);
    await docker(['volume', 'rm', '--force', names.volume]);
  };
  if (request.modelPath.includes(',')) throw new Error('a mounted path may not hold a comma');
  try {
    const created = await docker([
      'volume',
      'create',
      '--driver',
      'local',
      '--opt',
      'type=tmpfs',
      '--opt',
      'device=tmpfs',
      '--opt',
      `o=size=${limits.outputBytes},noexec,nosuid,nodev,uid=${uid ?? ''},gid=${gid ?? ''},mode=0700`,
      '--label',
      'sovitech.viewer-spike=1',
      names.volume,
    ]);
    if (created !== 0) return { exitCode: 'docker_unavailable', wallMs: Number.NaN };
    const output = `type=volume,source=${names.volume},target=/output,volume-nocopy`;
    const held = await docker([
      'run',
      '--detach',
      '--rm',
      '--name',
      names.holder,
      ...confinement({ pids: 8, memory: '64m', cpus: '0.1' }),
      '--mount',
      output,
      '--entrypoint',
      'sleep',
      image,
      `${limits.wallClockSeconds + 300}`,
    ]);
    if (held !== 0) return { exitCode: 'docker_unavailable', wallMs: Number.NaN };
    const args = [
      'run',
      '--rm',
      '--name',
      names.job,
      ...confinement(limits),
      '--tmpfs',
      `/tmp:rw,noexec,nosuid,size=${limits.tmpfsSize}`,
      '--mount',
      `type=bind,source=${request.modelPath},target=/input/model.ifc,readonly`,
      '--mount',
      output,
      image,
      '--input',
      '/input/model.ifc',
      '--out',
      '/output',
      '--profile',
      request.profile ?? 'view',
      '--plans',
      request.plans === true ? 'yes' : 'no',
    ];
    const started = performance.now();
    const exitCode = await new Promise<SandboxRun['exitCode']>((resolve) => {
      let killed = false;
      const child = spawn('docker', args, { stdio: 'ignore' });
      const timer = setTimeout(() => {
        killed = true;
        spawn('docker', ['kill', names.job], { stdio: 'ignore' }).on('error', () => undefined);
        child.kill('SIGKILL');
      }, limits.wallClockSeconds * 1000);
      child.on('error', () => {
        clearTimeout(timer);
        resolve('docker_unavailable');
      });
      child.on('exit', (code) => {
        clearTimeout(timer);
        resolve(killed ? 'killed_at_wall_clock' : (code ?? 'docker_unavailable'));
      });
    });
    const wallMs = performance.now() - started;
    if (exitCode !== 0) return { exitCode, wallMs };
    const summaryCopied = await copyOut(names.holder, 'summary.json', request.summaryPath);
    const fragmentsCopied = await copyOut(names.holder, 'viewer.frag', request.fragmentsPath);
    return {
      exitCode,
      wallMs,
      ...(summaryCopied ? { summaryText: await readFile(request.summaryPath, 'utf8') } : {}),
      ...(fragmentsCopied ? { fragmentsPath: request.fragmentsPath } : {}),
    };
  } finally {
    await removeAll();
  }
}

/** The output folder the summary of a model goes to. */
export function summaryPathFor(resultsDirectory: string, model: string): string {
  return join(resultsDirectory, `${model}.summary.json`);
}
