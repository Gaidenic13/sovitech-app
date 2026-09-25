/**
 * Fixture-manifest check (guardrails rule 13 "The repo"; prompt 3 sections 8,
 * 10 and 14 item 7; build-readiness 2 "synthetic-fixtures" and 4).
 *
 * 1. Every file under fixtures/ is listed in fixtures/manifest.json: a
 *    generated file with its generator and SHA-256, which must match; or a
 *    source (a generator, a generator input, or documentation). The perf
 *    output under fixtures/ifc/perf/ is git-ignored and never listed.
 * 2. Every listed file is reproduced by its generator (phase 0 round 2 review:
 *    only the recorded hash was compared, so any file, an owner document
 *    included, passed with a generator that does not make it). Until the
 *    phase 2 regeneration job exists, the check runs each generator into a
 *    temporary folder and compares the bytes (GENERATOR_RUNNERS; see
 *    regenerate()); a generator it cannot run fails the check.
 * 3. No document-type file exists outside fixtures/, except in the two other
 *    homes, each for its own types only (DOCUMENT_HOME_TYPES): the approved
 *    screenshots in design/reference/ (png, jpg, webp) and the brand assets in
 *    packages/ui/src/brand/ (svg, woff2, woff). company/ is never read, on
 *    disk or in git. A file is a document type by its extension
 *    (DOCUMENT_TYPE_FAMILIES: every format an owner could hand over, from phone
 *    photos, scans and site videos to office files, BIM and CAD models and
 *    their SVG exports, archives and mail) or, whatever its name, by the
 *    signature at the start of its content (CONTENT_SIGNATURES), so the check
 *    fails closed on a renamed file. Files tracked by git and files on disk are
 *    both read, ignored or not; installed and generated folders on disk are
 *    skipped.
 * 4. No text file carries a document inside it: a base64 data: URI or a run of
 *    base64 text whose decoded start shows a document signature (phase 0
 *    round 2 review: a base64 PDF in a test helper and a data: URI photo in an
 *    HTML page passed).
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, existsSync, mkdtempSync, openSync, readdirSync, readFileSync, readSync, rmSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { fail, pass, repoRoot } from '../lib';
import type { CheckResult } from '../types';

export const NAME = 'fixture-manifest';
export const MANIFEST = 'fixtures/manifest.json';
export const PERF_OUTPUT = 'fixtures/ifc/perf/';

/**
 * File extensions that mark an owner-document format, by family. Step 2 accepts
 * PDF, DWG, IFC, RVT, XLSX, DOCX, JPG, PNG and ZIP (onboarding-spec step 2);
 * owners also hand over phone photos (HEIC), scans (TIFF), BMS and meter
 * exports (CSV), other office and diagram files, federated and CAD models,
 * other archives and e-mails. The check fails closed: any of these outside a
 * document home fails, in any letter case (phase 0 review finding: the first
 * list knew 13 extensions only).
 */
export const DOCUMENT_TYPE_FAMILIES = {
  pdf: ['pdf'],
  images: ['jpg', 'jpeg', 'png', 'heic', 'heif', 'tif', 'tiff', 'webp', 'gif', 'bmp', 'avif'],
  // Site and plant-room videos (phase 0 round 2 review: .mp4 and .mov passed).
  video: ['mp4', 'mov', 'm4v', 'avi', 'webm', 'mkv', '3gp'],
  // Drawings exported from CAD or BIM (IfcConvert, a PDF converter): an owner document too.
  vector: ['svg'],
  office: ['doc', 'docx', 'xls', 'xlsx', 'xlsm', 'xlsb', 'csv', 'odt', 'ods', 'odp', 'odg', 'rtf', 'ppt', 'pptx', 'vsd', 'vsdx'],
  models: ['ifc', 'ifczip', 'ifcxml', 'rvt', 'rfa', 'dwg', 'dxf', 'dwf', 'dwfx', 'dgn', 'nwd', 'nwc', 'pln', 'skp'],
  archives: ['zip', '7z', 'rar', 'tar', 'gz', 'tgz', 'bz2', 'xz'],
  mail: ['msg', 'eml'],
} as const satisfies Readonly<Record<string, readonly string[]>>;

export type DocumentTypeFamily = keyof typeof DOCUMENT_TYPE_FAMILIES;

/** Every document-type extension, lower case. */
export const DOCUMENT_EXTENSIONS: readonly string[] = Object.values(DOCUMENT_TYPE_FAMILIES).flat();

/**
 * Where document-type files may live: the synthetic fixtures, the brand assets
 * and the approved screenshots. company/ is not a home but is never read at
 * all (build-readiness decision 12), so its files are neither listed nor flagged.
 */
export const DOCUMENT_HOMES: readonly string[] = ['fixtures/', 'packages/ui/src/brand/', 'design/reference/'];

/**
 * The types each home keeps, by extension (phase 0 round 2 review: both homes
 * accepted every document type, a PDF included). fixtures/ keeps any type,
 * because every file there is listed in the manifest with the generator that
 * reproduces it. A file of another document type in a home, by its extension
 * or by its content, fails. Adding a type to a home lets more through: it is a
 * loosening, listed for review first.
 */
export const DOCUMENT_HOME_TYPES: Readonly<Record<string, readonly string[] | 'any'>> = {
  'fixtures/': 'any',
  'design/reference/': ['png', 'jpg', 'webp'],
  'packages/ui/src/brand/': ['svg', 'woff2', 'woff'],
};

/** Extensions that are not owner documents but belong only in a home (the brand's self-hosted fonts). */
const HOME_ONLY_EXTENSIONS: readonly string[] = ['woff', 'woff2'];

/** Never read, on disk or in git. */
export const NEVER_READ: readonly string[] = ['company/'];

/** Bytes read from the start of each file for the content signatures (a tar header ends at 262). */
const HEAD_BYTES = 512;

const ascii = (head: Uint8Array, start: number, end: number): string => String.fromCharCode(...head.subarray(start, end));
const bytesAt = (head: Uint8Array, start: number, bytes: readonly number[]): boolean => bytes.every((byte, index) => head[start + index] === byte);

/**
 * Signatures of document formats at the start of a file's content, so a
 * renamed owner document (a PDF saved as .txt, a DWG with no extension) is
 * caught. Each is specific enough that no text file matches it.
 */
export interface ContentSignature {
  readonly type: string;
  readonly test: (head: Uint8Array) => boolean;
  /** The extensions a file with this content may carry, for the homes' types. */
  readonly extensions: readonly string[];
}

/** An ISO base-media box (MP4, MOV, AVIF, HEIC) at the start: its type at bytes 4-8, its brand at 8-12. */
const isoBox = (head: Uint8Array): string | undefined => (head.length >= 12 ? ascii(head, 4, 8) : undefined);
const isoBrand = (head: Uint8Array): string => ascii(head, 8, 12);
const HEIF_BRANDS = ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'];
const AVIF_BRANDS = ['avif', 'avis'];
const QUICKTIME_BRANDS = ['qt  '];
/** QuickTime files that start with a movie atom instead of ftyp; the size's first byte is 0 for any file under 16 MB atoms, which no text file starts with. */
const QUICKTIME_ATOMS = ['moov', 'mdat', 'wide', 'free', 'skip', 'pnot'];

export const CONTENT_SIGNATURES: readonly ContentSignature[] = [
  { type: 'PDF', test: (head) => ascii(head, 0, 5) === '%PDF-', extensions: ['pdf'] },
  {
    type: 'ZIP container (ZIP, DOCX, XLSX, PPTX, ODF, IFCZIP)',
    test: (head) => bytesAt(head, 0, [0x50, 0x4b]) && [[3, 4], [5, 6], [7, 8]].some((pair) => bytesAt(head, 2, pair)),
    extensions: ['zip', 'docx', 'xlsx', 'xlsm', 'pptx', 'odt', 'ods', 'odp', 'odg', 'ifczip', 'vsdx', 'dwfx'],
  },
  {
    type: 'OLE compound file (DOC, XLS, PPT, MSG, RVT)',
    test: (head) => bytesAt(head, 0, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
    extensions: ['doc', 'xls', 'xlsb', 'ppt', 'msg', 'rvt', 'rfa', 'vsd'],
  },
  { type: 'IFC (STEP physical file)', test: (head) => ascii(head, 0, 80).replace(/^(?:\u00EF\u00BB\u00BF)?\s*/u, '').startsWith('ISO-10303-21;'), extensions: ['ifc'] },
  { type: 'DWG', test: (head) => /^AC10\d\d/.test(ascii(head, 0, 6)), extensions: ['dwg'] },
  {
    type: 'DXF',
    test: (head) => ascii(head, 0, 18) === 'AutoCAD Binary DXF' || /^\s*0\r?\n\s*SECTION\r?\n\s*2\r?\n\s*HEADER\b/.test(ascii(head, 0, 64)),
    extensions: ['dxf'],
  },
  { type: 'PNG', test: (head) => bytesAt(head, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), extensions: ['png'] },
  { type: 'JPEG', test: (head) => bytesAt(head, 0, [0xff, 0xd8, 0xff]), extensions: ['jpg', 'jpeg'] },
  { type: 'GIF', test: (head) => ['GIF87a', 'GIF89a'].includes(ascii(head, 0, 6)), extensions: ['gif'] },
  { type: 'TIFF', test: (head) => bytesAt(head, 0, [0x49, 0x49, 0x2a, 0x00]) || bytesAt(head, 0, [0x4d, 0x4d, 0x00, 0x2a]), extensions: ['tif', 'tiff'] },
  { type: 'WebP', test: (head) => ascii(head, 0, 4) === 'RIFF' && ascii(head, 8, 12) === 'WEBP', extensions: ['webp'] },
  { type: 'HEIC/HEIF', test: (head) => isoBox(head) === 'ftyp' && HEIF_BRANDS.includes(isoBrand(head)), extensions: ['heic', 'heif'] },
  // Added after the phase 0 round 2 review (.avif, .mp4 and .mov passed by content as by name).
  { type: 'AVIF', test: (head) => isoBox(head) === 'ftyp' && AVIF_BRANDS.includes(isoBrand(head)), extensions: ['avif'] },
  {
    type: 'QuickTime movie (MOV)',
    test: (head) => (isoBox(head) === 'ftyp' && QUICKTIME_BRANDS.includes(isoBrand(head))) || (head[0] === 0 && QUICKTIME_ATOMS.includes(isoBox(head) ?? '')),
    extensions: ['mov'],
  },
  {
    type: 'ISO media (MP4, M4V, 3GP)',
    test: (head) => isoBox(head) === 'ftyp' && ![...HEIF_BRANDS, ...AVIF_BRANDS, ...QUICKTIME_BRANDS].includes(isoBrand(head)),
    extensions: ['mp4', 'm4v', '3gp'],
  },
  { type: 'Matroska or WebM video', test: (head) => bytesAt(head, 0, [0x1a, 0x45, 0xdf, 0xa3]), extensions: ['mkv', 'webm'] },
  { type: 'AVI video', test: (head) => ascii(head, 0, 4) === 'RIFF' && ascii(head, 8, 12) === 'AVI ', extensions: ['avi'] },
  {
    type: 'SVG image',
    test: (head) => /^(?:\u00EF\u00BB\u00BF)?\s*(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*(?:<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/iu.test(ascii(head, 0, head.length)),
    extensions: ['svg'],
  },
  { type: 'BMP', test: (head) => ascii(head, 0, 2) === 'BM' && head.length >= 14 && bytesAt(head, 6, [0, 0, 0, 0]), extensions: ['bmp'] },
  { type: '7z', test: (head) => bytesAt(head, 0, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]), extensions: ['7z'] },
  { type: 'RAR', test: (head) => bytesAt(head, 0, [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07]), extensions: ['rar'] },
  { type: 'gzip', test: (head) => bytesAt(head, 0, [0x1f, 0x8b, 0x08]), extensions: ['gz', 'tgz'] },
  { type: 'tar', test: (head) => ascii(head, 257, 262) === 'ustar', extensions: ['tar'] },
  { type: 'RTF', test: (head) => ascii(head, 0, 5) === '{\\rtf', extensions: ['rtf'] },
];

/** Content that is not an owner document but may live only in a home: the brand's fonts. */
const HOME_ONLY_SIGNATURES: readonly ContentSignature[] = [
  { type: 'WOFF font', test: (head) => ascii(head, 0, 4) === 'wOFF', extensions: ['woff'] },
  { type: 'WOFF2 font', test: (head) => ascii(head, 0, 4) === 'wOF2', extensions: ['woff2'] },
];

/** The document signature a file's first bytes show, if any. */
export function signatureOfContent(head: Uint8Array): ContentSignature | undefined {
  return CONTENT_SIGNATURES.find((signature) => signature.test(head));
}

/** The document type a file's first bytes show, if any. */
export function documentTypeOfContent(head: Uint8Array): string | undefined {
  return signatureOfContent(head)?.type;
}

function readHead(path: string): Uint8Array | undefined {
  let descriptor: number | undefined;
  try {
    descriptor = openSync(path, 'r');
    const buffer = Buffer.alloc(HEAD_BYTES);
    const read = readSync(descriptor, buffer, 0, HEAD_BYTES, 0);
    return buffer.subarray(0, read);
  } catch {
    return undefined;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

/** Folder names, at any depth, whose files on disk are installed or generated, never the repository's own content. */
export const NOT_CONTENT: ReadonlySet<string> = new Set([
  '.git',
  'node_modules',
  '.venv',
  '__pycache__',
  '.pnpm-store',
  '.cache',
  'test-results',
  'playwright-report',
  'coverage',
  'dist',
]);

/** Files that are never fixtures: placeholders and operating-system litter. */
const NOT_FIXTURES = new Set(['.gitkeep', '.DS_Store']);

const RepoPath = z
  .string()
  .min(1)
  .refine((path) => !path.startsWith('/') && !path.split('/').includes('..') && !path.includes('\\'), {
    message: 'must be a relative path with forward slashes and no ".."',
  });

const FileEntry = z.object({
  path: RepoPath,
  sha256: z.string().regex(/^[0-9a-f]{64}$/, 'must be 64 lower-case hex characters'),
  generator: RepoPath,
  generatorVersion: z.string().min(1).optional(),
  cases: z.array(z.string().min(1)).optional(),
  groundTruth: RepoPath.optional(),
  profile: z.string().min(1).optional(),
  schema: z.string().min(1).optional(),
  toolVersions: z.record(z.string(), z.string()).optional(),
});

const SourceEntry = z.object({
  path: RepoPath,
  role: z.enum(['generator', 'generator-input', 'documentation']),
  usedBy: z.array(RepoPath).optional(),
});

export const ManifestSchema = z.object({
  version: z.literal(1),
  sources: z.array(SourceEntry),
  files: z.array(FileEntry),
});

export type Manifest = z.infer<typeof ManifestSchema>;

export interface FixtureCheckInputs {
  /** Absolute repository root (or seeded tree). */
  readonly root: string;
  /** Paths tracked by git. Omitted: read with `git ls-files`. */
  readonly tracked?: readonly string[];
  readonly label?: string;
}

export function sha256OfFile(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

export function isDocumentPath(path: string): boolean {
  const name = path.split('/').pop() ?? '';
  const dot = name.lastIndexOf('.');
  if (dot <= 0 && !name.startsWith('.')) return false;
  return DOCUMENT_EXTENSIONS.includes(name.slice(dot + 1).toLowerCase());
}

function extensionOf(path: string): string {
  const name = path.split('/').pop() ?? '';
  const dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase();
}

/** The home a path sits in, with the types it keeps. */
function homeOf(path: string): { folder: string; types: readonly string[] | 'any' } | undefined {
  const folder = DOCUMENT_HOMES.find((home) => path.startsWith(home));
  if (folder === undefined) return undefined;
  return { folder, types: DOCUMENT_HOME_TYPES[folder] ?? [] };
}

function neverRead(path: string): boolean {
  return NEVER_READ.some((folder) => path.startsWith(folder));
}

/** Files on disk under `start` (relative to `root`), skipping symbolic links and the folders `skip` rejects. */
function walk(root: string, start: string, skip: (relative: string, name: string) => boolean): string[] {
  const found: string[] = [];
  const pending = [start];
  while (pending.length > 0) {
    const directory = pending.pop() ?? '';
    const absolute = directory === '' ? root : join(root, directory);
    if (!existsSync(absolute)) continue;
    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      const relative = directory === '' ? entry.name : `${directory}/${entry.name}`;
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (!skip(`${relative}/`, entry.name)) pending.push(relative);
      } else if (entry.isFile()) {
        found.push(relative);
      }
    }
  }
  return found.sort();
}

/** Paths git tracks under `root`; undefined when `root` is not a git work tree. */
export function gitTrackedFiles(root: string): string[] | undefined {
  const exclusions = NEVER_READ.map((folder) => `:(exclude)${folder.replace(/\/$/, '')}`);
  const result = spawnSync('git', ['-C', root, 'ls-files', '-z', '--cached', '--', '.', ...exclusions], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0 || typeof result.stdout !== 'string') return undefined;
  return result.stdout.split('\0').filter((path) => path !== '' && !neverRead(path));
}

function checkManifest(root: string, problems: string[]): { listed: number; sources: number; manifest?: Manifest } {
  const manifestPath = join(root, MANIFEST);
  const fixtureFiles = walk(root, 'fixtures', (relative, name) => relative === PERF_OUTPUT || name === '__pycache__').filter((path) => {
    const name = path.split('/').pop() ?? '';
    return path !== MANIFEST && !NOT_FIXTURES.has(name) && !name.endsWith('.pyc');
  });

  if (!existsSync(manifestPath)) {
    problems.push(`${MANIFEST} is missing`);
    for (const path of fixtureFiles) problems.push(`${path}: not in ${MANIFEST} (no generator and no hash)`);
    return { listed: 0, sources: 0 };
  }
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    problems.push(`${MANIFEST}: cannot be parsed as JSON: ${error instanceof Error ? error.message : String(error)}`);
    return { listed: 0, sources: 0 };
  }
  const parsed = ManifestSchema.safeParse(data);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) problems.push(`${MANIFEST}: ${issue.path.join('.') || '(top level)'}: ${issue.message}`);
    return { listed: 0, sources: 0 };
  }
  const manifest = parsed.data;

  const seen = new Map<string, string>();
  const note = (path: string, where: string): void => {
    const before = seen.get(path);
    if (before !== undefined) problems.push(`${MANIFEST}: ${path} is listed twice (${before} and ${where})`);
    seen.set(path, where);
  };
  const generators = new Set(manifest.sources.filter((source) => source.role === 'generator').map((source) => source.path));
  const generatedPaths = new Set(manifest.files.map((file) => file.path));

  manifest.files.forEach((file, position) => {
    const where = `files[${position}]`;
    note(file.path, where);
    if (!file.path.startsWith('fixtures/')) problems.push(`${MANIFEST}: ${where} ${file.path} is not under fixtures/`);
    if (file.path.startsWith(PERF_OUTPUT)) {
      problems.push(`${MANIFEST}: ${where} ${file.path} is perf output, which is git-ignored and never listed`);
      return;
    }
    const absolute = join(root, file.path);
    if (!existsSync(absolute)) problems.push(`${MANIFEST}: ${where} ${file.path} does not exist`);
    else if (sha256OfFile(absolute) !== file.sha256) {
      problems.push(`${file.path}: SHA-256 differs from ${MANIFEST} (${where}): regenerate it with ${file.generator}, or record the new hash`);
    }
    if (file.generator.startsWith('company/')) problems.push(`${MANIFEST}: ${where} generator ${file.generator} is under company/, which is never an input`);
    else if (!existsSync(join(root, file.generator))) problems.push(`${MANIFEST}: ${where} generator ${file.generator} does not exist`);
    else if (file.generator.startsWith('fixtures/') && !generators.has(file.generator)) {
      problems.push(`${MANIFEST}: ${where} generator ${file.generator} is under fixtures/ but not listed in sources as a generator`);
    }
    if (generatedPaths.has(file.generator)) problems.push(`${MANIFEST}: ${where} generator ${file.generator} is itself a generated file`);
    if (file.groundTruth !== undefined && !existsSync(join(root, file.groundTruth))) {
      problems.push(`${MANIFEST}: ${where} ground truth ${file.groundTruth} does not exist`);
    }
  });

  manifest.sources.forEach((source, position) => {
    const where = `sources[${position}]`;
    note(source.path, where);
    if (!source.path.startsWith('fixtures/')) problems.push(`${MANIFEST}: ${where} ${source.path} is not under fixtures/`);
    if (source.path.startsWith(PERF_OUTPUT)) problems.push(`${MANIFEST}: ${where} ${source.path} is perf output, which is never listed`);
    if (!existsSync(join(root, source.path))) problems.push(`${MANIFEST}: ${where} ${source.path} does not exist`);
    if (source.role === 'generator-input') {
      const usedBy = source.usedBy ?? [];
      if (usedBy.length === 0) problems.push(`${MANIFEST}: ${where} generator input ${source.path} names no generator in "usedBy"`);
      for (const generator of usedBy) {
        if (!generators.has(generator) && !manifest.files.some((file) => file.generator === generator)) {
          problems.push(`${MANIFEST}: ${where} ${source.path} is used by ${generator}, which is not a listed generator`);
        }
      }
    } else if (source.usedBy !== undefined) {
      problems.push(`${MANIFEST}: ${where} "usedBy" belongs only to a generator input`);
    }
  });

  for (const path of fixtureFiles) {
    if (!seen.has(path)) problems.push(`${path}: not in ${MANIFEST} (no generator and no hash)`);
  }
  return { listed: manifest.files.length, sources: manifest.sources.length, manifest };
}

// ---------------------------------------------------------------------------
// Regeneration: every listed file is reproduced by its generator.

/** How the check runs a generator, by its extension, until the phase 2 regeneration job exists. */
export const GENERATOR_RUNNERS: ReadonlyArray<{ readonly extensions: readonly string[]; readonly runner: string }> = [
  { extensions: ['ts', 'mts', 'cts', 'js', 'mjs', 'cjs'], runner: 'node with tsx (the repository devDependency)' },
  { extensions: ['py'], runner: 'the extractor venv python (services/extractor/.venv), else python3' },
];

/** The command that runs `generator` so that it writes into `out`, or undefined when no runner knows its type. */
function generatorCommand(generator: string, out: string): { file: string; args: string[] } | undefined {
  const extension = extensionOf(generator);
  if (['ts', 'mts', 'cts', 'js', 'mjs', 'cjs'].includes(extension)) {
    const tsx = createRequire(import.meta.url).resolve('tsx/cli');
    return { file: process.execPath, args: [tsx, generator, '--out', out] };
  }
  if (extension === 'py') {
    const venv = join(repoRoot, 'services', 'extractor', '.venv', 'bin', 'python');
    return { file: existsSync(venv) ? venv : 'python3', args: ['-I', '-B', generator, '--out', out] };
  }
  return undefined;
}

/** Every file under fixtures/ (perf output and caches left out) with its SHA-256, to see whether a generator wrote into the repository. */
function fixturesSnapshot(root: string): Map<string, string> {
  const files = walk(root, 'fixtures', (relative, name) => relative === PERF_OUTPUT || name === '__pycache__');
  return new Map(files.map((path) => [path, sha256OfFile(join(root, path))]));
}

/** The last line of a process's error output, cut short: enough to say why, never a document's text. */
function lastLine(text: string | null | undefined): string {
  const line = (text ?? '').trim().split('\n').pop() ?? '';
  return line.length > 160 ? `${line.slice(0, 160)}…` : line;
}

/**
 * Runs each generator of the listed files from the root as
 * `<runner> <generator> --out <temporary folder>` and compares every file it
 * lists with the bytes the generator writes at `<folder>/<manifest path>`. A
 * generator must write only into that folder: fixtures/ is compared before and
 * after. The temporary folder is removed.
 */
function regenerate(root: string, manifest: Manifest, problems: string[]): { regenerated: number; generators: number } {
  const byGenerator = new Map<string, Manifest['files']>();
  for (const file of manifest.files) {
    if (file.path.startsWith(PERF_OUTPUT)) continue;
    byGenerator.set(file.generator, [...(byGenerator.get(file.generator) ?? []), file]);
  }
  if (byGenerator.size === 0) return { regenerated: 0, generators: 0 };
  const before = fixturesSnapshot(root);
  let regenerated = 0;
  for (const [generator, files] of byGenerator) {
    if (generator.startsWith('company/') || !existsSync(join(root, generator))) continue; // reported by checkManifest
    const out = mkdtempSync(join(tmpdir(), 'sovitech-fixture-regenerate-'));
    try {
      const command = generatorCommand(generator, out);
      if (command === undefined) {
        problems.push(
          `${generator}: no runner for a .${extensionOf(generator)} generator, so its ${files.length} listed files cannot be reproduced; until the phase 2 regeneration job exists, a generator is a TypeScript, JavaScript or Python script (GENERATOR_RUNNERS)`,
        );
        continue;
      }
      const run = spawnSync(command.file, command.args, {
        cwd: root,
        encoding: 'utf8',
        timeout: 300_000,
        maxBuffer: 16 * 1024 * 1024,
        env: { PATH: process.env['PATH'] ?? '', HOME: process.env['HOME'] ?? '', TMPDIR: out, LANG: 'C.UTF-8', TZ: 'UTC', SOURCE_DATE_EPOCH: '0', PYTHONHASHSEED: '0' },
      });
      if (run.error !== undefined || run.status !== 0) {
        const why = run.error?.message ?? `exit ${String(run.status)}${run.signal === null ? '' : `, ${run.signal}`}`;
        problems.push(`${generator}: the generator failed when run into a temporary folder (${why}): ${lastLine(run.stderr)}`);
        continue;
      }
      for (const file of files) {
        const produced = join(out, file.path);
        if (!existsSync(produced) || !statSync(produced).isFile()) {
          problems.push(`${file.path}: its generator ${generator} did not produce it when run into a temporary folder, so the file is not a generated fixture`);
        } else if (sha256OfFile(produced) !== file.sha256) {
          problems.push(`${file.path}: the bytes its generator ${generator} produces differ from the SHA-256 in ${MANIFEST}, so the fixture is not reproducible`);
        } else {
          regenerated += 1;
        }
      }
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  }
  const after = fixturesSnapshot(root);
  const changed = [...new Set([...before.keys(), ...after.keys()])].filter((path) => before.get(path) !== after.get(path)).sort();
  if (changed.length > 0) problems.push(`fixtures/: a generator changed the repository while it ran (${changed.join(', ')}); a generator writes only into its --out folder`);
  return { regenerated, generators: byGenerator.size };
}

// ---------------------------------------------------------------------------
// Documents outside their homes, and documents inside text.

/** The largest text file read whole for embedded documents. */
const EMBED_SCAN_LIMIT = 20 * 1024 * 1024;

/** A base64 data: URI, and a run of base64 text long enough to hold a document signature. */
const DATA_URI = /data:([a-z]+\/[a-z0-9.+-]+)((?:;[a-z0-9=.+-]+)*);base64,([A-Za-z0-9+/]{4,}={0,2})/gi;
const BASE64_RUN = /(?<![A-Za-z0-9+/])[A-Za-z0-9+/]{16,}={0,2}/g;

/** Document types a bare base64 run is flagged for: the short signatures (gzip, BMP, a 3-byte JPEG) are left to data: URIs, where the MIME type says what the bytes are. */
function strongSignature(bytes: Uint8Array): string | undefined {
  const signature = signatureOfContent(bytes);
  if (signature === undefined || signature.type === 'gzip' || signature.type === 'BMP') return undefined;
  if (signature.type === 'JPEG' && ![0xe0, 0xe1, 0xe2, 0xdb, 0xee].includes(bytes[3] ?? -1)) return undefined;
  return signature.type;
}

function decodeHead(base64: string): Uint8Array {
  const usable = base64.slice(0, 64 - (Math.min(base64.length, 64) % 4)).replace(/=+$/, '');
  return new Uint8Array(Buffer.from(usable, 'base64'));
}

/** Documents carried inside a text file: base64 data: URIs of a document or media type, and base64 runs that decode to a document signature. */
export function embeddedDocuments(text: string): Array<{ line: number; type: string; form: string }> {
  const found: Array<{ line: number; type: string; form: string }> = [];
  const lineOf = (index: number): number => text.slice(0, index).split('\n').length;
  const inUri = new Set<number>();
  for (const match of text.matchAll(DATA_URI)) {
    const payload = match[3] ?? '';
    inUri.add(match.index + match[0].length - payload.length);
    const type = signatureOfContent(decodeHead(payload))?.type;
    if (type !== undefined) found.push({ line: lineOf(match.index), type, form: `a base64 data: URI (${(match[1] ?? '').toLowerCase()})` });
  }
  for (const match of text.matchAll(BASE64_RUN)) {
    if (inUri.has(match.index)) continue;
    const type = strongSignature(decodeHead(match[0]));
    if (type !== undefined) found.push({ line: lineOf(match.index), type, form: 'base64 text' });
  }
  return found.sort((left, right) => left.line - right.line);
}

function checkDocuments(root: string, tracked: readonly string[], problems: string[]): { flagged: number; sniffed: number; embedded: number } {
  // fixtures/ is the manifest's (checkManifest and regenerate); every other home is read for its types.
  const onDisk = walk(root, '', (relative, name) => NOT_CONTENT.has(name) || relative === 'fixtures/' || neverRead(relative));
  const trackedPaths = tracked.filter((path) => !neverRead(path) && !path.startsWith('fixtures/'));
  const flagged = new Map<string, string>();
  const flagByName = (path: string): void => {
    const extension = extensionOf(path);
    const home = homeOf(path);
    if (home === undefined) {
      if (isDocumentPath(path)) flagged.set(path, 'outside');
      return;
    }
    if (home.types === 'any') return;
    if ((isDocumentPath(path) || HOME_ONLY_EXTENSIONS.includes(extension)) && !home.types.includes(extension)) flagged.set(path, `a .${extension} file`);
  };
  for (const path of [...onDisk, ...trackedPaths]) flagByName(path);

  const byContent = new Map<string, string>();
  let sniffed = 0;
  let embedded = 0;
  for (const path of onDisk) {
    if (flagged.has(path)) continue;
    const head = readHead(join(root, path));
    if (head === undefined) continue;
    sniffed += 1;
    const home = homeOf(path);
    if (home === undefined) {
      const type = documentTypeOfContent(head);
      if (type !== undefined) {
        byContent.set(path, type);
        continue;
      }
    } else if (home.types !== 'any') {
      const signature = signatureOfContent(head) ?? HOME_ONLY_SIGNATURES.find((candidate) => candidate.test(head));
      const types = home.types;
      if (signature !== undefined && !signature.extensions.some((extension) => types.includes(extension))) {
        flagged.set(path, `${signature.type} content`);
        continue;
      }
    }
    if (head.includes(0)) continue;
    let text: string;
    try {
      if (statSync(join(root, path)).size > EMBED_SCAN_LIMIT) continue;
      text = readFileSync(join(root, path), 'utf8');
    } catch {
      continue;
    }
    for (const hit of embeddedDocuments(text)) {
      embedded += 1;
      problems.push(`${path}:${hit.line}: a document (${hit.type}) embedded as ${hit.form}; owner documents never enter the repository, in any encoding (rule 13)`);
    }
  }
  const how = (path: string): string => (trackedPaths.includes(path) ? 'tracked by git' : 'on disk, not tracked');
  for (const [path, type] of [...byContent].sort(([left], [right]) => left.localeCompare(right))) {
    problems.push(`${path}: a document-type file outside fixtures/, by its content signature (${type}) (${how(path)}); owner documents never enter the repository (rule 13)`);
  }
  for (const [path, reason] of [...flagged].sort(([left], [right]) => left.localeCompare(right))) {
    const home = homeOf(path);
    if (home === undefined) {
      problems.push(`${path}: a document-type file outside fixtures/, by its extension (${how(path)}); owner documents never enter the repository (rule 13)`);
    } else {
      const types = home.types === 'any' ? 'any type' : home.types.join(', ');
      problems.push(`${path}: ${reason} in ${home.folder}, which keeps only ${types} (${how(path)}); owner documents never enter the repository (rule 13)`);
    }
  }
  return { flagged: flagged.size + byContent.size, sniffed, embedded };
}

export async function checkFixtures(inputs: FixtureCheckInputs): Promise<CheckResult> {
  const prefix = inputs.label === undefined ? '' : `[${inputs.label}] `;
  const problems: string[] = [];
  const notes: string[] = [];
  const counts = checkManifest(inputs.root, problems);
  const regeneration = counts.manifest === undefined ? { regenerated: 0, generators: 0 } : regenerate(inputs.root, counts.manifest, problems);
  const manifestProblems = problems.length;

  let tracked = inputs.tracked;
  if (tracked === undefined) {
    tracked = gitTrackedFiles(inputs.root);
    if (tracked === undefined) {
      notes.push('note: not a git work tree, so only files on disk were read for document types');
      tracked = [];
    }
  }
  const documents = checkDocuments(inputs.root, tracked, problems);

  const scope = `${counts.listed} generated files and ${counts.sources} sources in ${MANIFEST}, ${regeneration.regenerated} reproduced by running ${regeneration.generators} generators; ${tracked.length} tracked paths and the files on disk read for document types by ${DOCUMENT_EXTENSIONS.length} extensions, and ${documents.sniffed} files by content`;
  if (problems.length === 0) {
    return pass(NAME, `${prefix}every fixture is listed with a matching hash and reproduced by its generator, and no document-type file is outside its home (${scope})`, notes);
  }
  return fail(
    NAME,
    `${prefix}${manifestProblems} manifest problems, ${documents.flagged} document-type files outside their homes, ${documents.embedded} embedded documents (${scope})`,
    [...problems, ...notes],
  );
}
