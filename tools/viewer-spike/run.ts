/**
 * The viewer spike's runner (phase 4; the owner's answer of 2026-10-02, "Trial now, decide later";
 * docs/adr/0046-viewer-spike.md). For each model it:
 *
 * 1. converts the model in the sandbox image (./sandbox.ts), writing the Fragments file where the
 *    live store keeps a document's derived files: `<root>/<projectId>/<contentHash>/derived/viewer.frag`
 *    (apps/api/src/storage/file-store.ts; rule 13 and ifc-input 6.2.16's stricter choice, built in
 *    phase 2), and records the converter's time and memory;
 * 2. opens it on the bench page (packages/viewer-spike/src/bench/) in Playwright's Chromium, served
 *    from 127.0.0.1 only, with every request to another host refused and recorded and every host
 *    name but 127.0.0.1 unresolvable; it measures the first view, a 10-second orbit held from the
 *    keyboard, the page's and the processes' memory, and the storeys stepped one by one with Page Up;
 *    and it checks that nothing was drawn as text and nothing from the model was shown;
 * 3. erases each model's files with the store's own erasure (`removeHash`), whether or not its measuring
 *    finished, and checks that no file keyed to the model's hash remains and that the results folder
 *    holds no image (./outputs.ts).
 *
 * Heavy: run it only under the e2e lock (build log, phase 4, "Resources"), one model at a time.
 *
 *   pnpm tsx tools/viewer-spike/run.ts --work <scratch folder> [--models arh,mep-rev-a,mep-rev-b,mep-ifc2x3,perf]
 *     [--gl default|gpu] [--orbit-seconds 10] [--storey-steps 8] [--profile view|library-defaults] [--view no] [--plans no]
 *
 * It writes `<work>/results/results.json` (every raw measurement), `<work>/results/results.md` and
 * each model's converter summary: sizes, times, memory, counts and codes only, never model text or an
 * image of a model. The bench's screenshots show the rendered model, so they are derived files of it:
 * they are written under the model's hash folder in the store (`derived/bench-*.png`, next to
 * `viewer.frag`) and erased with it (rule 13, "Erasure"; phase 4 part B, A-11: the first runs wrote
 * them into the results folder, where the erasure check did not look).
 */
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { cpus, totalmem, release } from 'node:os';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium, type Page } from '@playwright/test';
import { FileStore } from '../../apps/api/src/storage/file-store';
import { eraseModel, shotPaths, type Erasure, type ShotName } from './outputs';
import { sampleMemory, type MemoryPeaks } from './processes';
import { convertInSandbox, summaryPathFor, type SandboxRun } from './sandbox';
import { startBenchServer, type BenchServer } from './server';
import { frameStats, type FrameStats } from './stats';

const repoRoot = resolve(import.meta.dirname, '..', '..');
const spikeRoot = join(repoRoot, 'packages', 'viewer-spike');

const MODELS: Record<string, string> = {
  arh: 'fixtures/ifc/demo-hotel-arh.ifc',
  'mep-rev-a': 'fixtures/ifc/demo-hotel-mep-rev-a.ifc',
  'mep-rev-b': 'fixtures/ifc/demo-hotel-mep-rev-b.ifc',
  'mep-ifc2x3': 'fixtures/ifc/demo-hotel-mep-ifc2x3.ifc',
  perf: 'fixtures/ifc/perf/demo-hotel-perf.ifc',
};

interface Options {
  work: string;
  models: string[];
  gl: 'default' | 'gpu';
  orbitSeconds: number;
  storeySteps: number;
  profile: 'view' | 'library-defaults';
  view: boolean;
  plans: boolean;
}

function options(argv: readonly string[]): Options {
  const value = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    return index < 0 ? undefined : argv[index + 1];
  };
  const work = value('--work');
  if (work === undefined) throw new Error('--work <scratch folder> is required');
  const models = (value('--models') ?? Object.keys(MODELS).join(',')).split(',');
  for (const model of models) if (!(model in MODELS)) throw new Error(`unknown model ${model}`);
  const gl = value('--gl') ?? 'default';
  if (gl !== 'default' && gl !== 'gpu') throw new Error('--gl is default or gpu');
  const profile = value('--profile') ?? 'view';
  if (profile !== 'view' && profile !== 'library-defaults') throw new Error('--profile is view or library-defaults');
  return {
    work: resolve(work),
    models,
    gl,
    orbitSeconds: Number(value('--orbit-seconds') ?? '10'),
    storeySteps: Number(value('--storey-steps') ?? '8'),
    profile,
    view: value('--view') !== 'no',
    plans: value('--plans') !== 'no',
  };
}

function run(command: string, args: readonly string[]): Promise<number> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => resolvePromise(code ?? -1));
  });
}

async function contentHash(path: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
  return `sha256:${hash.digest('hex')}`;
}

/** Bundles the bench page's script with esbuild, as a viewer chunk would be bundled. */
async function buildBench(webDirectory: string): Promise<{ benchBytes: number; benchGzipBytes: number; workerBytes: number; workerGzipBytes: number; worker: string }> {
  await mkdir(webDirectory, { recursive: true });
  const outfile = join(webDirectory, 'bench.js');
  const status = await run(join(spikeRoot, 'node_modules', '.bin', 'esbuild'), [
    join(spikeRoot, 'src', 'bench', 'main.ts'),
    '--bundle',
    '--format=esm',
    '--platform=browser',
    '--target=es2022',
    '--minify',
    `--outfile=${outfile}`,
    '--log-level=warning',
  ]);
  if (status !== 0) throw new Error('the bench did not build');
  const worker = join(spikeRoot, 'node_modules', '@thatopen', 'fragments', 'dist', 'Worker', 'worker.min.mjs');
  const bench = await readFile(outfile);
  const workerBytes = await readFile(worker);
  return { benchBytes: bench.byteLength, benchGzipBytes: gzipSync(bench).byteLength, workerBytes: workerBytes.byteLength, workerGzipBytes: gzipSync(workerBytes).byteLength, worker };
}

interface BenchState {
  phase: 'loading' | 'ready' | 'failed';
  failure?: string;
  marks: Record<string, number>;
  modelBytes?: number;
  trianglesAtFirstFrame?: number;
  storeys?: number;
  storeySteps: Array<{ direction: number | 'all'; pressed: number; drawn: number; visibleItems: number }>;
  frames: number[];
  recording: boolean;
  renderer?: string;
  audit(): unknown;
}

type SpikeWindow = Window & { __viewerSpike: BenchState };

async function pageMemory(page: Page): Promise<{ jsHeapUsed?: number; jsHeapTotal?: number; userAgentBytes?: number | null; crossOriginIsolated: boolean }> {
  return page.evaluate(async () => {
    const memory = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
    const measure = (performance as unknown as { measureUserAgentSpecificMemory?: () => Promise<{ bytes: number }> }).measureUserAgentSpecificMemory;
    let userAgentBytes: number | null = null;
    if (crossOriginIsolated && measure !== undefined) {
      try {
        const result = await Promise.race([measure.call(performance), new Promise<null>((done) => setTimeout(() => done(null), 30_000))]);
        userAgentBytes = result === null ? null : result.bytes;
      } catch {
        // Not offered by this build of Chromium (headless): the heap and the processes' memory still are.
        userAgentBytes = null;
      }
    }
    return { jsHeapUsed: memory?.usedJSHeapSize, jsHeapTotal: memory?.totalJSHeapSize, userAgentBytes, crossOriginIsolated };
  });
}

interface ViewResult {
  readonly chromium: string;
  readonly renderer?: string;
  readonly phase: string;
  readonly failure?: string;
  readonly marks: Record<string, number>;
  readonly navigationToReadyMs: number;
  readonly trianglesAtFirstFrame?: number;
  readonly storeys?: number;
  readonly keyboardFocusOnView: boolean;
  readonly orbit?: FrameStats;
  readonly storeySteps: Array<{ direction: number | 'all'; ms: number; visibleItems: number }>;
  readonly memoryAfterLoad?: Awaited<ReturnType<typeof pageMemory>>;
  readonly memoryAfterOrbit?: Awaited<ReturnType<typeof pageMemory>>;
  readonly cdpAfterOrbit?: Record<string, number>;
  readonly processes: MemoryPeaks;
  readonly audit?: unknown;
  readonly requestsOutside: string[];
  /** The screenshots taken, by name; each was written under the model's hash folder and erased with it. */
  readonly screenshots: ShotName[];
}

async function measureView(server: BenchServer, model: string, options: Options, shots: Readonly<Record<ShotName, string>>): Promise<ViewResult> {
  const gpu = options.gl === 'gpu';
  const browserServer = await chromium.launchServer({
    headless: true,
    ...(gpu ? { channel: 'chromium' } : {}),
    args: [
      '--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1',
      ...(gpu ? ['--enable-gpu', '--use-angle=metal', '--ignore-gpu-blocklist'] : []),
    ],
  });
  const pid = browserServer.process().pid;
  const sampler = sampleMemory(pid ?? -1);
  const browser = await chromium.connect(browserServer.wsEndpoint());
  const requestsOutside: string[] = [];
  const screenshots: ShotName[] = [];
  const shoot = async (page: Page, name: ShotName): Promise<void> => {
    await page.screenshot({ path: shots[name] });
    screenshots.push(name);
  };
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.origin === server.origin) return route.continue();
      requestsOutside.push(`${url.protocol}//${url.host}`);
      return route.abort('blockedbyclient');
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Performance.enable');
    const started = performance.now();
    await page.goto(`${server.origin}/?model=/models/${model}.frag`);
    await page.waitForFunction(() => (window as unknown as SpikeWindow).__viewerSpike?.phase !== 'loading', null, { timeout: 300_000, polling: 100 });
    const navigationToReadyMs = performance.now() - started;
    const loaded = await page.evaluate(() => {
      const state = (window as unknown as SpikeWindow).__viewerSpike;
      return { phase: state.phase, failure: state.failure, marks: state.marks, triangles: state.trianglesAtFirstFrame, storeys: state.storeys, renderer: state.renderer };
    });
    const base = { chromium: browser.version(), renderer: loaded.renderer, phase: loaded.phase, failure: loaded.failure, marks: loaded.marks, navigationToReadyMs, requestsOutside, screenshots };
    if (loaded.phase !== 'ready') return { ...base, keyboardFocusOnView: false, storeySteps: [], processes: await sampler.stop() };
    const memoryAfterLoad = await pageMemory(page);
    await shoot(page, 'first-view');

    // Keyboard only: Tab reaches the view, and every move below is a key.
    await page.keyboard.press('Tab');
    const keyboardFocusOnView = await page.evaluate(() => document.activeElement?.id === 'view');

    await page.evaluate(() => {
      const state = (window as unknown as SpikeWindow).__viewerSpike;
      state.frames.length = 0;
      state.recording = true;
    });
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(options.orbitSeconds * 1000);
    await page.keyboard.up('ArrowLeft');
    const frames = await page.evaluate(() => {
      const state = (window as unknown as SpikeWindow).__viewerSpike;
      state.recording = false;
      return [...state.frames];
    });
    const memoryAfterOrbit = await pageMemory(page);
    await shoot(page, 'after-orbit');
    const metrics = (await cdp.send('Performance.getMetrics')) as { metrics: Array<{ name: string; value: number }> };
    const cdpAfterOrbit = Object.fromEntries(metrics.metrics.filter((metric) => /JSHeap|Nodes|Documents|Frames|LayoutCount/.test(metric.name)).map((metric) => [metric.name, metric.value]));

    const steps = Math.min(options.storeySteps, loaded.storeys ?? 0);
    for (let index = 0; index < steps + 1; index += 1) {
      const before = await page.evaluate(() => (window as unknown as SpikeWindow).__viewerSpike.storeySteps.length);
      await page.keyboard.press(index < steps ? 'PageUp' : 'Home');
      await page.waitForFunction((count) => (window as unknown as SpikeWindow).__viewerSpike.storeySteps.length > count, before, { timeout: 120_000, polling: 50 });
    }
    const storeySteps = (await page.evaluate(() => (window as unknown as SpikeWindow).__viewerSpike.storeySteps)).map((step) => ({
      direction: step.direction,
      ms: step.drawn - step.pressed,
      visibleItems: step.visibleItems,
    }));
    const audit = await page.evaluate(() => (window as unknown as SpikeWindow).__viewerSpike.audit());
    await shoot(page, 'view');
    await context.close();
    return {
      ...base,
      trianglesAtFirstFrame: loaded.triangles,
      storeys: loaded.storeys,
      keyboardFocusOnView,
      orbit: frameStats(frames),
      storeySteps,
      memoryAfterLoad,
      memoryAfterOrbit,
      cdpAfterOrbit,
      processes: await sampler.stop(),
      audit,
    };
  } finally {
    await browser.close().catch(() => undefined);
    await browserServer.close();
    await sampler.stop().catch(() => undefined);
  }
}

interface ModelResult {
  readonly model: string;
  readonly file: string;
  readonly inputBytes: number;
  readonly sandbox?: { readonly exitCode: SandboxRun['exitCode']; readonly wallMs: number; readonly summary?: unknown };
  readonly derivedPath?: string;
  readonly view?: ViewResult;
  readonly erasure?: Erasure;
}

const mib = (bytes: number | undefined): string => (bytes === undefined ? 'n/a' : `${(bytes / 1024 / 1024).toFixed(1)} MiB`);
const secs = (ms: number | undefined): string => (ms === undefined ? 'n/a' : `${(ms / 1000).toFixed(2)} s`);

function markdown(results: { machine: unknown; bench: unknown; models: ModelResult[] }): string {
  const lines = ['| Model | IFC | Sandbox wall | Converter peak RSS | cgroup peak | Fragments | First frame | Orbit fps (median, p95 ms) | JS heap | Renderer RSS | GPU RSS | Storey step |', '|---|---|---|---|---|---|---|---|---|---|---|---|'];
  for (const result of results.models) {
    const summary = (result.sandbox?.summary ?? {}) as { fragmentsBytes?: number; maxRssKiB?: number; cgroupMemoryPeak?: string | null };
    const view = result.view;
    const orbit = view?.orbit;
    const steps = (view?.storeySteps ?? []).filter((step) => step.direction !== 'all').map((step) => step.ms);
    lines.push(
      `| ${result.model} | ${mib(result.inputBytes)} | ${secs(result.sandbox?.wallMs)} | ${mib(summary.maxRssKiB === undefined ? undefined : summary.maxRssKiB * 1024)} | ${mib(summary.cgroupMemoryPeak ? Number(summary.cgroupMemoryPeak) : undefined)} | ${mib(summary.fragmentsBytes)} | ${secs(view?.marks.firstFrame)} | ${orbit ? `${orbit.fps.toFixed(1)} (${orbit.medianFrameMs.toFixed(1)}, ${orbit.p95FrameMs.toFixed(1)})` : 'n/a'} | ${mib(view?.memoryAfterOrbit?.jsHeapUsed)} | ${mib(view?.processes.peakBytes.renderer)} | ${mib(view?.processes.peakBytes.gpu)} | ${steps.length === 0 ? 'n/a' : `${Math.min(...steps).toFixed(0)}–${Math.max(...steps).toFixed(0)} ms`} |`,
    );
  }
  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  const opts = options(process.argv.slice(2));
  const resultsDirectory = join(opts.work, 'results');
  await mkdir(resultsDirectory, { recursive: true });
  const store = new FileStore(join(opts.work, 'store'));
  const projectId = randomUUID();
  const bench = await buildBench(join(opts.work, 'web'));
  const server = await startBenchServer({
    '/': join(spikeRoot, 'src', 'bench', 'index.html'),
    '/index.html': join(spikeRoot, 'src', 'bench', 'index.html'),
    '/bench.js': join(opts.work, 'web', 'bench.js'),
    '/fragments-worker.mjs': bench.worker,
    '/tokens.css': join(repoRoot, 'packages', 'ui', 'src', 'tokens.css'),
  });
  const machine = { os: `${process.platform} ${release()}`, cpu: cpus()[0]?.model, cpus: cpus().length, memoryBytes: totalmem(), node: process.version, gl: opts.gl, profile: opts.profile };
  const results: { machine: typeof machine; bench: Omit<typeof bench, 'worker'>; projectId: string; models: ModelResult[]; serverRefused: string[] } = {
    machine,
    bench: { benchBytes: bench.benchBytes, benchGzipBytes: bench.benchGzipBytes, workerBytes: bench.workerBytes, workerGzipBytes: bench.workerGzipBytes },
    projectId,
    models: [],
    serverRefused: server.refused,
  };
  try {
    for (const model of opts.models) {
      const file = join(repoRoot, MODELS[model] ?? '');
      const inputBytes = (await stat(file)).size;
      const hash = await contentHash(file);
      const derivedPath = store.derivedPath(projectId, hash, 'viewer.frag');
      let sandbox: SandboxRun;
      let view: ViewResult | undefined;
      let erasure: Erasure;
      try {
        process.stdout.write(`viewer-spike: ${model}: converting in the sandbox\n`);
        sandbox = await convertInSandbox({ modelPath: file, fragmentsPath: derivedPath, summaryPath: summaryPathFor(resultsDirectory, model), profile: opts.profile, plans: opts.plans });
        if (sandbox.fragmentsPath !== undefined && opts.view) {
          process.stdout.write(`viewer-spike: ${model}: measuring the bench\n`);
          server.route(`/models/${model}.frag`, sandbox.fragmentsPath);
          view = await measureView(server, model, opts, shotPaths(store, projectId, hash));
        }
      } finally {
        // Every file derived from the model, its screenshots included, goes with it, whether or not the measuring finished.
        erasure = await eraseModel(store, projectId, hash, resultsDirectory);
      }
      if (erasure.filesAfter > 0 || erasure.imagesInResults.length > 0) throw new Error(`viewer-spike: ${model}: files of the model remain after its erasure`);
      const summary: unknown = sandbox.summaryText === undefined ? undefined : JSON.parse(sandbox.summaryText);
      results.models.push({ model, file: MODELS[model] ?? '', inputBytes, sandbox: { exitCode: sandbox.exitCode, wallMs: sandbox.wallMs, summary }, derivedPath, ...(view ? { view } : {}), erasure });
      await writeFile(join(resultsDirectory, 'results.json'), `${JSON.stringify(results, null, 2)}\n`);
    }
  } finally {
    await server.close();
  }
  await writeFile(join(resultsDirectory, 'results.json'), `${JSON.stringify(results, null, 2)}\n`);
  await writeFile(join(resultsDirectory, 'results.md'), markdown(results));
  process.stdout.write(markdown(results));
}

await main();
