/**
 * The model conversion sandbox image and its source check (the viewer step, part 1; docs/build-log.md, "The viewer
 * step", item 3: "A check compares the image's recorded source hash with the converter's sources, so a stale image fails
 * the job with a code, never a silent old converter").
 *
 * The converter's version is the SHA-256 of its sources and of what builds its image: the converter's and the plan
 * cutter's TypeScript files of packages/viewer-spike (tests aside), the package's manifest, the image's Dockerfile (its
 * base image, its bundler's flags, its entrypoint's flags), and the lockfile and workspace file its dependencies are
 * installed from (so a dependency bundled into the converter that changes changes the hash; any change to the lockfile
 * does, and the image is then rebuilt), listed as `sha256sum` lists them (`<hex>  <path>`, one line each, the paths
 * from the repository root in byte order), hashed again (the review of part 1, V-7 and A-8). services/model-converter/build.sh
 * computes it the same way and passes it to the build, the Dockerfile computes it again from what it bundles and
 * refuses to build when the two differ, and the image carries it as its label. Before each conversion the job reads the
 * label and the image's digest from the Docker daemon (`docker image inspect`) and compares the label with this hash of
 * the repository's sources. The sources are read by path, never imported: the app does not import the spike
 * (`viewer-spike-imported-by-nothing`).
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** The converter's name, as the image's label and every conversion record name it. */
export const CONVERTER_NAME = 'sovitech-model-converter';

/** The image the worker runs when no setting names another (services/model-converter/build.sh's default tag). */
export const DEFAULT_MODEL_CONVERTER_IMAGE = 'sovitech-model-converter:dev';

/** The image's labels (services/model-converter/Dockerfile). */
export const CONVERTER_LABELS = { name: 'org.sovitech.converter.name', sourceHash: 'org.sovitech.converter.source-hash' } as const;

/**
 * The converter's sources, from the repository root: these files (the package's manifest, the lockfile and workspace
 * file the image installs from, and the image's Dockerfile) and these folders' TypeScript files, tests aside. build.sh
 * and the Dockerfile list the same, in the same words (./model-view.test.ts).
 */
export const CONVERTER_SOURCES = {
  files: ['packages/viewer-spike/package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'services/model-converter/Dockerfile'],
  folders: ['packages/viewer-spike/src/convert', 'packages/viewer-spike/src/plan'],
} as const;

const SHA256 = /^sha256:[0-9a-f]{64}$/;

/** Every file under `folder` (relative to `root`), recursively, as relative paths. */
async function filesUnder(root: string, folder: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(join(root, folder), { withFileTypes: true })) {
    const path = `${folder}/${entry.name}`;
    if (entry.isDirectory()) found.push(...(await filesUnder(root, path)));
    else if (entry.isFile()) found.push(path);
  }
  return found;
}

/** Byte order, as `LC_ALL=C sort` sorts the paths (ASCII paths: code-unit order is byte order). */
function byteOrder(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/** The SHA-256 of the converter's sources in the repository at `root`, as `sha256:<hex>` (see the module comment). */
export async function converterSourceHash(root: string): Promise<string> {
  const listed: string[] = [...CONVERTER_SOURCES.files];
  for (const folder of CONVERTER_SOURCES.folders) {
    listed.push(...(await filesUnder(root, folder)).filter((path) => path.endsWith('.ts') && !path.endsWith('.test.ts')));
  }
  const lines: string[] = [];
  for (const path of listed.sort(byteOrder)) {
    lines.push(`${createHash('sha256').update(await readFile(join(root, path))).digest('hex')}  ${path}\n`);
  }
  return `sha256:${createHash('sha256').update(lines.join(''), 'utf8').digest('hex')}`;
}

/** What the Docker daemon says of the image: its digest and the source hash its label records (absent: no label). */
export interface ConverterImage {
  readonly digest: string;
  readonly sourceHash?: string;
}

/** How long `docker image inspect` may take. */
const INSPECT_MS = 60 * 1000;

/**
 * The image's digest and source label, or undefined when the daemon does not answer or holds no such image. Only the
 * daemon's own fields are read (two hashes); nothing the converter wrote.
 */
export function inspectConverterImage(image: string, docker = 'docker'): Promise<ConverterImage | undefined> {
  return new Promise((resolve) => {
    // `index` and `with`: an image with no labels at all (the spike's of 2026-10-02) answers its digest and no label, not an error.
    const format = `{{.Id}} {{with index .Config "Labels"}}{{index . "${CONVERTER_LABELS.sourceHash}"}}{{end}}`;
    const child = spawn(docker, ['image', 'inspect', '--format', format, image], {
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    let text = '';
    let settled = false;
    const settle = (value: ConverterImage | undefined): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      settle(undefined);
    }, INSPECT_MS);
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      // The two hashes and a space: anything longer is not the daemon's answer to this format.
      if (text.length < 1024) text += chunk;
    });
    child.on('error', () => settle(undefined));
    child.on('close', (code) => {
      if (code !== 0) return settle(undefined);
      settle(parsedInspection(text));
    });
  });
}

/** The inspection's answer read: `<digest> <label>`, the label `<no value>` or empty when the image has none. */
export function parsedInspection(text: string): ConverterImage | undefined {
  const [digest, label] = text.trim().split(' ');
  if (digest === undefined || !SHA256.test(digest)) return undefined;
  return { digest, ...(label !== undefined && SHA256.test(label) ? { sourceHash: label } : {}) };
}
