/**
 * The model view in Chromium, for the proposed suite (docs/build-log.md, the viewer step, items 3, 4 and 7: the
 * viewer is "built and proven in unit and component tests and in tests/proposed/, but mounted on no live page").
 *
 * - `buildHarness()` builds ./harness/ with Vite from the real packages (`@sovitech/viewer`, `@sovitech/ui`), as
 *   the app will bundle them in part 2: the probe in the entry chunk, the view in its own lazily loaded chunk, the
 *   Fragments worker emitted beside it. The build's manifest names each file.
 * - `serveHarness()` serves the build and one converted model on 127.0.0.1 from a fixed path table, records every
 *   request it is asked for, and refuses anything else. The model is the synthetic ARH fixture converted in this
 *   process in the view profile (the spike's converter, as tests/proposed/IFC-12.test.ts uses it): no owner model.
 *   The view file is served as `documents.modelView` serves it: `application/octet-stream`, `Cache-Control:
 *   no-store`, `X-Content-Type-Options: nosniff`.
 * - `GRAPHICS_INIT_SCRIPT` lets the small fixture draw in Playwright's headless shell, which renders with
 *   SwiftShader and so answers the probe "none" (the viewer step, item 4, "Testing"): it drops
 *   `failIfMajorPerformanceCaveat` and hides the renderer's unmasked name. Test-only: the app has no override.
 */
import { createReadStream, existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { build } from 'vite';
import { convertModel } from '../../../packages/viewer-spike/src/index';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const harnessRoot = fileURLToPath(new URL('./harness/', import.meta.url));

export interface HarnessBuild {
  readonly folder: string;
  /** The page's entry script and the files it loads at once (the main bundle). */
  readonly entryFiles: readonly string[];
  /** The view's lazily loaded chunk(s): three.js, Fragments, camera-controls and the view. */
  readonly lazyFiles: readonly string[];
  /** The Fragments worker the viewer names (`worker.min.mjs`, packages/viewer/src/model-view/fragments-worker.ts). */
  readonly workerFile: string;
  /**
   * Other copies of the worker the build emitted: Fragments names its own unminified worker as a fallback
   * (`new URL("./Worker/worker.mjs", import.meta.url)`, used only when no URL is given), and the bundler emits it
   * although the viewer always gives one. Never fetched (the tests check it).
   */
  readonly otherWorkerFiles: readonly string[];
  remove(): void;
}

interface ManifestChunk {
  readonly file: string;
  readonly isEntry?: boolean;
  readonly isDynamicEntry?: boolean;
  readonly imports?: readonly string[];
  readonly dynamicImports?: readonly string[];
  readonly css?: readonly string[];
  readonly assets?: readonly string[];
}

/**
 * Builds the harness page into a fresh folder outside the repository: `production` as the app ships (the default),
 * or `development`, where React runs every effect twice under StrictMode (an engine started, disposed and started
 * again on the same page).
 */
export async function buildHarness(mode: 'production' | 'development' = 'production'): Promise<HarnessBuild> {
  const folder = mkdtempSync(join(tmpdir(), 'sovitech-model-view-'));
  // The test runner sets NODE_ENV=test, and Vite and the React plugin read it to choose between the development and the
  // production builds (JSX runtime included); the bundle follows the mode asked for, so NODE_ENV is set for the build
  // and put back after it.
  const runnerEnvironment = process.env['NODE_ENV'];
  process.env['NODE_ENV'] = mode;
  try {
    await build({
      root: harnessRoot,
      configFile: false,
      logLevel: 'warn',
      mode,
      plugins: [react()],
      base: '/',
      build: { outDir: folder, emptyOutDir: true, manifest: true, sourcemap: false, minify: mode === 'production', chunkSizeWarningLimit: 8192 },
    });
  } finally {
    if (runnerEnvironment === undefined) delete process.env['NODE_ENV'];
    else process.env['NODE_ENV'] = runnerEnvironment;
  }
  const manifest = JSON.parse(readFileSync(join(folder, '.vite', 'manifest.json'), 'utf8')) as Record<string, ManifestChunk>;
  const chunks = Object.entries(manifest);
  const entry = chunks.find(([, chunk]) => chunk.isEntry === true)?.[1];
  if (entry === undefined) throw new Error('harness: the build has no entry');
  const staticallyLoaded = new Set<string>();
  const visit = (key: string): void => {
    const chunk = manifest[key];
    if (chunk === undefined || staticallyLoaded.has(chunk.file)) return;
    staticallyLoaded.add(chunk.file);
    for (const css of chunk.css ?? []) staticallyLoaded.add(css);
    for (const imported of chunk.imports ?? []) visit(imported);
  };
  const entryKey = chunks.find(([, chunk]) => chunk === entry)?.[0] ?? '';
  visit(entryKey);
  const lazy = new Set<string>();
  const visitLazy = (key: string): void => {
    const chunk = manifest[key];
    if (chunk === undefined || staticallyLoaded.has(chunk.file) || lazy.has(chunk.file)) return;
    lazy.add(chunk.file);
    for (const imported of chunk.imports ?? []) visitLazy(imported);
  };
  for (const dynamic of entry.dynamicImports ?? []) visitLazy(dynamic);
  const workerFiles = [...new Set(chunks.flatMap(([key, chunk]) => (/worker(?:\.min)?\.mjs/u.test(key) ? [chunk.file] : [])))];
  const workerFile = workerFiles.find((file) => /worker\.min-[^/]*\.mjs$/u.test(file));
  if (workerFile === undefined) throw new Error(`harness: the build emitted no minified Fragments worker (${workerFiles.join(', ')})`);
  return {
    folder,
    entryFiles: [...staticallyLoaded],
    lazyFiles: [...lazy],
    workerFile,
    otherWorkerFiles: workerFiles.filter((file) => file !== workerFile),
    remove: () => rmSync(folder, { recursive: true, force: true }),
  };
}

/** The synthetic ARH fixture, converted in the view profile in this process. */
export async function convertedArh(): Promise<Uint8Array> {
  const wasm = `${realpathSync(join(repoRoot, 'packages/viewer-spike/node_modules/web-ifc'))}/`;
  const conversion = await convertModel(join(repoRoot, 'fixtures/ifc/demo-hotel-arh.ifc'), wasm);
  return conversion.fragments;
}

export interface ServedRequest {
  readonly path: string;
  readonly status: number;
  /** The response's headers as served. */
  readonly headers: Readonly<Record<string, string>>;
  /** The request's cache headers as the browser sent them. */
  readonly cache: string;
}

export interface HarnessServer {
  readonly origin: string;
  /** Every request the server was asked for, in order. */
  readonly requests: ServedRequest[];
  close(): Promise<void>;
}

const TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

/** Serves the build (`/`, `/index.html`, `/assets/...`) and the view file (`/model-view/arh`) on 127.0.0.1; anything else is 404. */
export async function serveHarness(harness: HarnessBuild, viewFile: Uint8Array): Promise<HarnessServer> {
  const requests: ServedRequest[] = [];
  const server: Server = createServer((request, response) => {
    const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    const cache = [request.headers['cache-control'], request.headers['pragma']].filter((value) => typeof value === 'string').join(' ');
    const send = (status: number, headers: Record<string, string>, body?: Uint8Array | string): void => {
      requests.push({ path, status, headers, cache });
      response.writeHead(status, headers);
      response.end(body);
    };
    if (path === '/model-view/arh') {
      send(200, { 'content-type': 'application/octet-stream', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }, viewFile);
      return;
    }
    const file = path === '/' ? 'index.html' : normalize(path.slice(1));
    const allowed = file === 'index.html' || (file.startsWith('assets/') && !file.includes('..'));
    const full = join(harness.folder, file);
    if (!allowed || !existsSync(full) || !statSync(full).isFile()) {
      send(404, { 'content-type': 'text/plain' }, 'not found');
      return;
    }
    const headers = { 'content-type': TYPES[extname(full)] ?? 'application/octet-stream', 'cache-control': 'no-store' };
    requests.push({ path, status: 200, headers, cache });
    response.writeHead(200, headers);
    createReadStream(full).pipe(response);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('harness: no port');
  return {
    origin: `http://127.0.0.1:${String(address.port)}`,
    requests,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

/** Test-only: lets SwiftShader answer the probe "hardware" and draw the small fixture (never in the app). */
export const GRAPHICS_INIT_SCRIPT = `(() => {
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function getContext(kind, attributes) {
    if (kind !== 'webgl2' && kind !== 'webgl') return original.call(this, kind, attributes);
    const given = attributes === undefined || attributes === null ? attributes : Object.assign({}, attributes, { failIfMajorPerformanceCaveat: false });
    const gl = original.call(this, kind, given);
    if (gl !== null && !gl.__sovitechPatched) {
      const getExtension = gl.getExtension.bind(gl);
      gl.getExtension = (name) => (name === 'WEBGL_debug_renderer_info' ? null : getExtension(name));
      gl.__sovitechPatched = true;
    }
    return gl;
  };
})();`;

/** Whether a served path is one of the build's files of a kind. */
export function servedAny(requests: readonly ServedRequest[], files: readonly string[]): boolean {
  return requests.some((request) => files.some((file) => request.path === `/${file}`));
}
