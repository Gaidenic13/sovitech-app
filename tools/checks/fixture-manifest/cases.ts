/**
 * The seeded inputs of the fixture-manifest check, shared by selftest.ts and
 * the unit tests. Manifest cases are small trees under seeded/<id>/. Cases
 * about document-type files are built in a temporary folder outside the
 * repository at run time, because a seeded PDF or PNG inside the repository
 * would itself be a document-type file outside fixtures/. Every seeded file
 * is a synthetic TEST stand-in: a name, or a few signature bytes, never a
 * real document.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CheckResult } from '../types';
import { checkFixtures } from './manifest';

const SEEDED = join(dirname(fileURLToPath(import.meta.url)), 'seeded');

export interface SeededCase {
  readonly id: string;
  /** Text the findings of a bad case must contain, so it fails for the reason it was seeded for. */
  readonly expect: readonly string[];
  /** Text the findings must not contain. */
  readonly notExpect?: readonly string[];
  /** Paths tracked by git in this case. */
  readonly tracked?: readonly string[];
  /** Files written to a temporary tree instead of reading seeded/<id>/. */
  readonly tree?: Readonly<Record<string, string | Uint8Array>>;
}

const EMPTY_MANIFEST = `${JSON.stringify({ version: 1, sources: [], files: [] }, null, 2)}\n`;
const STAND_IN = 'TEST stand-in, not a document\n';

/** A synthetic file that starts with `signature` and carries only TEST filler after it. */
function withSignature(signature: readonly number[] | string, length = 300): Uint8Array {
  const head = typeof signature === 'string' ? Buffer.from(signature, 'latin1') : Buffer.from(signature);
  const filler = Buffer.alloc(Math.max(0, length - head.length), 0x20);
  return new Uint8Array(Buffer.concat([head, filler]));
}

/** A tar-shaped stand-in: 'ustar' at byte 257, as a tar header has it. */
function tarStandIn(): Uint8Array {
  const bytes = Buffer.alloc(600, 0x20);
  bytes.write('TEST', 0, 'latin1');
  bytes.write('ustar', 257, 'latin1');
  return new Uint8Array(bytes);
}

/** Document-type fixtures in their home, listed in a manifest with their hashes, so the good tree passes. */
const HOME_FIXTURES: Readonly<Record<string, string>> = {
  'fixtures/datasets/TEST-meters.csv': 'id,reading\nTEST,1\n',
  'fixtures/ifc/TEST-model.ifc': 'ISO-10303-21;\nHEADER;\nENDSEC;\n',
};
const HOME_GENERATOR = 'fixtures/generators/make-test.ts';

/** A manifest listing `files` (path to content) as made by `generator`. */
function manifestOf(generator: string, files: Readonly<Record<string, string | Uint8Array>>): string {
  return `${JSON.stringify(
    {
      version: 1,
      sources: generator.startsWith('fixtures/') ? [{ path: generator, role: 'generator' }] : [],
      files: Object.entries(files).map(([path, content]) => ({ path, sha256: createHash('sha256').update(content).digest('hex'), generator })),
    },
    null,
    2,
  )}\n`;
}
const HOME_MANIFEST = manifestOf(HOME_GENERATOR, HOME_FIXTURES);

/**
 * A TEST generator, as the check runs it (`tsx <generator> --out <folder>`):
 * it writes each of `files` under the folder. `repository` files are written
 * into the working directory instead (a generator that writes into the
 * repository), and `exitCode` ends it early.
 */
function generatorSource(files: Readonly<Record<string, string>>, options: { repository?: Readonly<Record<string, string>>; exitCode?: number } = {}): string {
  return [
    '// TEST generator for the fixture-manifest self-test.',
    "import { mkdirSync, writeFileSync } from 'node:fs';",
    "import { dirname, join } from 'node:path';",
    ...(options.exitCode === undefined ? [] : [`process.exit(${options.exitCode});`]),
    "const out = process.argv[process.argv.indexOf('--out') + 1] ?? '';",
    `const files: Record<string, string> = ${JSON.stringify(files)};`,
    `const repository: Record<string, string> = ${JSON.stringify(options.repository ?? {})};`,
    'for (const [path, content] of Object.entries(files)) { mkdirSync(dirname(join(out, path)), { recursive: true }); writeFileSync(join(out, path), content); }',
    'for (const [path, content] of Object.entries(repository)) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, content); }',
    '',
  ].join('\n');
}

/** A PDF-shaped TEST stand-in: the signature and a TEST line, never a real document. */
const PDF_STAND_IN = '%PDF-1.7\n% TEST stand-in for an owner document\n';
const base64 = (content: string | Uint8Array): string => Buffer.from(content).toString('base64');

/** One temporary tree per family: every file name below must be flagged. */
function familyCase(id: string, paths: readonly string[]): SeededCase {
  return {
    id,
    expect: paths.map((path) => `${path}: a document-type file outside fixtures/, by its extension (on disk, not tracked)`),
    tracked: [],
    tree: Object.fromEntries([['fixtures/manifest.json', EMPTY_MANIFEST], ...paths.map((path) => [path, STAND_IN] as const)]),
  };
}

export const GOOD_CASES: readonly SeededCase[] = [
  { id: 'good', expect: [], tracked: [] },
  {
    id: 'good-document-homes',
    expect: [],
    tracked: ['company/brand/logo.png', 'design/reference/step-1.png', 'packages/ui/src/brand/logo.svg', 'fixtures/manifest.json'],
    tree: {
      'fixtures/manifest.json': HOME_MANIFEST,
      [HOME_GENERATOR]: generatorSource(HOME_FIXTURES),
      ...HOME_FIXTURES,
      'fixtures/.gitkeep': '',
      'fixtures/ifc/perf/scaled-model.ifc': 'perf output, git-ignored\n',
      'company/brand/logo.png': 'stand-in\n',
      'company/business/references.pdf': withSignature('%PDF-1.7 TEST'),
      // Each home keeps its own types, by name and by content.
      'design/reference/step-1.png': withSignature([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      'design/reference/step-2.webp': withSignature('RIFF\u0000\u0000\u0000\u0000WEBPVP8 '),
      'design/reference/step-3.jpg': withSignature([0xff, 0xd8, 0xff, 0xe0]),
      'design/reference/README.md': 'TEST: notes beside the screenshots.\n',
      'packages/ui/src/brand/logo.svg': '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1"/></svg>\n',
      'packages/ui/src/brand/inter-TEST.woff2': withSignature('wOF2'),
      'packages/ui/src/brand/inter-TEST.woff': withSignature('wOFF'),
      'packages/ui/src/brand/README.md': 'TEST: the brand assets.\n',
      'docs/bms-notes.md': 'BMS notes for the TEST building: plain text that starts with the letters BM.\n',
      'docs/pk.md': 'PK: the primary key of the TEST table.\n',
      // Text that looks like base64 but carries no document: identifiers, a lock-file hash, a URL-encoded SVG, a base64 font.
      'apps/web/src/identifiers.ts': 'export const extractFromTextTemplate = "resolveDisplayObjectsForScreen";\n',
      'pnpm-lock.yaml': 'resolution: {integrity: sha512-TESTaGFzaCBvZiBhIFRFU1QgcGFja2FnZSwgbm90IGEgZG9jdW1lbnQ=}\n',
      'apps/web/src/icon.css': ".i { background: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E\"); }\n" +
        `@font-face { src: url(data:font/woff2;base64,${base64(withSignature('wOF2', 24))}); }\n`,
      'node_modules/some-package/manual.pdf': 'installed, not repository content\n',
      'apps/web/dist/proposal.pdf': 'build output\n',
      'test-results/render/failure.png': 'test output\n',
    },
  },
];

export const BAD_CASES: readonly SeededCase[] = [
  { id: 'bad-manifest-missing', expect: ['fixtures/manifest.json is missing', 'fixtures/sample.txt: not in fixtures/manifest.json'], tracked: [] },
  { id: 'bad-malformed-manifest', expect: ['cannot be parsed as JSON'], tracked: [] },
  { id: 'bad-unlisted-file', expect: ['fixtures/extra.txt: not in fixtures/manifest.json'], tracked: [] },
  { id: 'bad-hash-mismatch', expect: ['fixtures/data.txt: SHA-256 differs'], tracked: [] },
  { id: 'bad-entry-without-generator', expect: ['files.0.generator'], tracked: [] },
  { id: 'bad-generator-missing', expect: ['generator fixtures/generators/absent.ts does not exist'], tracked: [] },
  { id: 'bad-generator-not-a-source', expect: ['not listed in sources as a generator'], tracked: [] },
  { id: 'bad-stale-entry', expect: ['fixtures/gone.txt does not exist'], tracked: [] },
  { id: 'bad-perf-listed', expect: ['is perf output, which is git-ignored and never listed'], tracked: [] },
  { id: 'bad-orphan-generator-input', expect: ['names no generator in "usedBy"'], tracked: [] },
  {
    id: 'bad-document-tracked',
    expect: ['docs/owner-plan.pdf: a document-type file outside fixtures/, by its extension (tracked by git)'],
    notExpect: ['company/brand/logo.png'],
    tracked: ['docs/owner-plan.pdf', 'company/brand/logo.png'],
    tree: { 'fixtures/manifest.json': EMPTY_MANIFEST },
  },
  {
    id: 'bad-document-on-disk',
    expect: ['apps/web/public/site-photo.JPG: a document-type file outside fixtures/, by its extension (on disk, not tracked)', 'docs/Area Schedule.xlsx'],
    notExpect: ['design/reference/step-1.png', 'node_modules'],
    tracked: [],
    tree: {
      'fixtures/manifest.json': EMPTY_MANIFEST,
      'apps/web/public/site-photo.JPG': 'stand-in\n',
      'docs/Area Schedule.xlsx': 'stand-in\n',
      'design/reference/step-1.png': 'stand-in\n',
      'node_modules/pkg/readme.pdf': 'stand-in\n',
    },
  },
  // One case per family the first list missed (phase 0 review finding: they passed the check).
  familyCase('bad-document-images', [
    'apps/web/public/nameplate.HEIC',
    'apps/web/public/nameplate.heif',
    'docs/scan.tif',
    'docs/scan-2.TIFF',
    'apps/web/src/photo.webp',
    'docs/sketch.gif',
    'docs/plan.bmp',
  ]),
  familyCase('bad-document-office', [
    'docs/meter-export.csv',
    'docs/budget.xlsm',
    'docs/budget.xlsb',
    'docs/notes.odt',
    'docs/sheet.ods',
    'docs/spec.rtf',
    'docs/deck.ppt',
    'docs/deck.pptx',
    'docs/schematic.vsdx',
  ]),
  familyCase('bad-document-models', [
    'models/tower.ifczip',
    'models/tower.ifcxml',
    'models/site.dgn',
    'models/coordination.nwd',
    'models/coordination.nwc',
    'models/tower.rfa',
    'models/tower.pln',
  ]),
  familyCase('bad-document-archives', ['uploads/handover.7z', 'uploads/handover.rar', 'uploads/handover.tar', 'uploads/handover.tar.gz', 'uploads/handover.tgz']),
  familyCase('bad-document-mail', ['mail/owner-message.msg', 'mail/owner-message.eml']),
  // Round 2 review (probe adv0b/fm): a listed fixture whose generator does not make it passed on its hash alone.
  {
    id: 'bad-fixture-without-real-generator',
    expect: ['fixtures/owner-drawing.pdf: its generator fixtures/generators/make.ts did not produce it when run into a temporary folder'],
    tracked: [],
    tree: {
      'fixtures/manifest.json': manifestOf('fixtures/generators/make.ts', { 'fixtures/owner-drawing.pdf': PDF_STAND_IN }),
      'fixtures/generators/make.ts': "// TEST generator that does not produce the PDF.\nconsole.log('TEST');\n",
      'fixtures/owner-drawing.pdf': PDF_STAND_IN,
    },
  },
  {
    id: 'bad-generator-output-differs',
    expect: ['fixtures/data/meters.csv: the bytes its generator fixtures/generators/make.ts produces differ from the SHA-256'],
    tracked: [],
    tree: {
      'fixtures/manifest.json': manifestOf('fixtures/generators/make.ts', { 'fixtures/data/meters.csv': 'id,reading\nTEST,1\n' }),
      'fixtures/generators/make.ts': generatorSource({ 'fixtures/data/meters.csv': 'id,reading\nTEST,2\n' }),
      'fixtures/data/meters.csv': 'id,reading\nTEST,1\n',
    },
  },
  {
    id: 'bad-generator-fails',
    expect: ['fixtures/generators/make.ts: the generator failed when run into a temporary folder (exit 3)'],
    tracked: [],
    tree: {
      'fixtures/manifest.json': manifestOf('fixtures/generators/make.ts', { 'fixtures/data/meters.csv': 'id,reading\nTEST,1\n' }),
      'fixtures/generators/make.ts': generatorSource({ 'fixtures/data/meters.csv': 'id,reading\nTEST,1\n' }, { exitCode: 3 }),
      'fixtures/data/meters.csv': 'id,reading\nTEST,1\n',
    },
  },
  {
    id: 'bad-generator-no-runner',
    expect: ['fixtures/generators/make.sh: no runner for a .sh generator'],
    tracked: [],
    tree: {
      'fixtures/manifest.json': manifestOf('fixtures/generators/make.sh', { 'fixtures/data/meters.csv': 'id,reading\nTEST,1\n' }),
      'fixtures/generators/make.sh': '#!/bin/sh\n# TEST generator in a language the check cannot run.\n',
      'fixtures/data/meters.csv': 'id,reading\nTEST,1\n',
    },
  },
  {
    id: 'bad-generator-writes-repository',
    expect: ['fixtures/: a generator changed the repository while it ran (fixtures/data/extra-TEST.txt)'],
    tracked: [],
    tree: {
      'fixtures/manifest.json': manifestOf('fixtures/generators/make.ts', { 'fixtures/data/meters.csv': 'id,reading\nTEST,1\n' }),
      'fixtures/generators/make.ts': generatorSource({ 'fixtures/data/meters.csv': 'id,reading\nTEST,1\n' }, { repository: { 'fixtures/data/extra-TEST.txt': 'TEST\n' } }),
      'fixtures/data/meters.csv': 'id,reading\nTEST,1\n',
    },
  },
  // Each home keeps its own types only (the review found a PDF accepted in both).
  {
    id: 'bad-document-in-design-reference',
    expect: [
      'design/reference/part3/site-survey.pdf: a .pdf file in design/reference/, which keeps only png, jpg, webp',
      'design/reference/step-9.png: PDF content in design/reference/',
      'design/reference/step-10.heic: a .heic file in design/reference/',
    ],
    notExpect: ['design/reference/step-1.png', 'design/reference/README.md'],
    tracked: ['design/reference/step-10.heic'],
    tree: {
      'fixtures/manifest.json': EMPTY_MANIFEST,
      'design/reference/part3/site-survey.pdf': PDF_STAND_IN,
      'design/reference/step-9.png': PDF_STAND_IN,
      'design/reference/step-1.png': withSignature([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      'design/reference/README.md': 'TEST notes.\n',
    },
  },
  {
    id: 'bad-document-in-brand',
    expect: [
      'packages/ui/src/brand/nameplate.pdf: a .pdf file in packages/ui/src/brand/, which keeps only svg, woff2, woff',
      'packages/ui/src/brand/logo.png: a .png file in packages/ui/src/brand/',
      'packages/ui/src/brand/logo-2.svg: PDF content in packages/ui/src/brand/',
      'packages/ui/src/brand/inter.woff2: JPEG content in packages/ui/src/brand/',
    ],
    notExpect: ['packages/ui/src/brand/logo.svg'],
    tracked: [],
    tree: {
      'fixtures/manifest.json': EMPTY_MANIFEST,
      'packages/ui/src/brand/nameplate.pdf': PDF_STAND_IN,
      'packages/ui/src/brand/logo.png': withSignature([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      'packages/ui/src/brand/logo-2.svg': PDF_STAND_IN,
      'packages/ui/src/brand/inter.woff2': withSignature([0xff, 0xd8, 0xff, 0xe0]),
      'packages/ui/src/brand/logo.svg': '<svg xmlns="http://www.w3.org/2000/svg"/>\n',
    },
  },
  // Videos, AVIF photos and SVG exports (verify0b/fixtures: none was flagged, by name or by content).
  familyCase('bad-document-media', [
    'apps/web/public/site-walk.mp4',
    'docs/plant-room.MOV',
    'apps/web/src/photo.avif',
    'docs/plan-export.svg',
    'uploads/clip.m4v',
    'uploads/clip.webm',
    'uploads/clip.avi',
    'uploads/clip.mkv',
    'uploads/clip.3gp',
  ]),
  {
    id: 'bad-document-media-content',
    expect: [
      'data/photo.bin: a document-type file outside fixtures/, by its content signature (AVIF)',
      'data/video.bin: a document-type file outside fixtures/, by its content signature (ISO media (MP4, M4V, 3GP))',
      'data/clip.dat: a document-type file outside fixtures/, by its content signature (QuickTime movie (MOV))',
      'data/old-clip.dat: a document-type file outside fixtures/, by its content signature (QuickTime movie (MOV))',
      'data/web.dat: a document-type file outside fixtures/, by its content signature (Matroska or WebM video)',
      'data/avi.dat: a document-type file outside fixtures/, by its content signature (AVI video)',
      'docs/plan.txt: a document-type file outside fixtures/, by its content signature (SVG image)',
    ],
    notExpect: ['docs/free-notes.txt', 'docs/page.html'],
    tracked: [],
    tree: {
      'fixtures/manifest.json': EMPTY_MANIFEST,
      'data/photo.bin': withSignature([0x00, 0x00, 0x00, 0x1c, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66]),
      'data/video.bin': withSignature([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]),
      'data/clip.dat': withSignature([0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20]),
      'data/old-clip.dat': withSignature([0x00, 0x00, 0x00, 0x08, 0x77, 0x69, 0x64, 0x65, 0x00, 0x00, 0x00, 0x00]),
      'data/web.dat': withSignature([0x1a, 0x45, 0xdf, 0xa3]),
      'data/avi.dat': withSignature('RIFF\u0000\u0000\u0000\u0000AVI LIST'),
      'docs/plan.txt': '<?xml version="1.0"?>\n<!-- TEST export -->\n<svg xmlns="http://www.w3.org/2000/svg"><text>TEST</text></svg>\n',
      'docs/free-notes.txt': 'TEST free text: wide and free are ordinary words.\n',
      'docs/page.html': '<!doctype html>\n<body><svg xmlns="http://www.w3.org/2000/svg"></svg></body>\n',
    },
  },
  // Documents inside text (probe adv0b/fm: a base64 PDF in a test helper and a data: URI photo passed).
  {
    id: 'bad-embedded-documents',
    expect: [
      'tests/guardrails/_support/sample.ts:2: a document (PDF) embedded as base64 text',
      'apps/web/public/photo.html:1: a document (JPEG) embedded as a base64 data: URI (image/jpeg)',
      'packages/core/src/model.ts:1: a document (IFC (STEP physical file)) embedded as base64 text',
      'docs/notes.md:3: a document (PDF) embedded as a base64 data: URI (application/pdf)',
    ],
    tracked: [],
    tree: {
      'fixtures/manifest.json': EMPTY_MANIFEST,
      'tests/guardrails/_support/sample.ts': `// TEST: an owner document pasted as base64.\nexport const OWNER_PDF = '${base64(PDF_STAND_IN)}';\n`,
      'apps/web/public/photo.html': `<img src="data:image/jpeg;base64,${base64(withSignature([0xff, 0xd8, 0xff, 0xe0], 24))}">\n`,
      'packages/core/src/model.ts': `export const MODEL = "${base64('ISO-10303-21;\nHEADER; /* TEST */\n')}";\n`,
      'docs/notes.md': `TEST notes\n\n[plan](data:application/pdf;base64,${base64(PDF_STAND_IN)})\n`,
    },
  },
  {
    id: 'bad-document-content',
    expect: [
      'docs/readme.txt: a document-type file outside fixtures/, by its content signature (PDF)',
      'data/export.bin: a document-type file outside fixtures/, by its content signature (ZIP container',
      'data/legacy.dat: a document-type file outside fixtures/, by its content signature (OLE compound file',
      'notes/model-step.txt: a document-type file outside fixtures/, by its content signature (IFC (STEP physical file))',
      'plans/ground-floor: a document-type file outside fixtures/, by its content signature (DWG)',
      'plans/ground-floor.txt: a document-type file outside fixtures/, by its content signature (DXF)',
      'photos/nameplate.dat: a document-type file outside fixtures/, by its content signature (JPEG)',
      'photos/nameplate-2.dat: a document-type file outside fixtures/, by its content signature (PNG)',
      'photos/iphone.dat: a document-type file outside fixtures/, by its content signature (HEIC/HEIF)',
      'photos/scan.dat: a document-type file outside fixtures/, by its content signature (TIFF)',
      'photos/web.dat: a document-type file outside fixtures/, by its content signature (WebP)',
      'photos/anim.dat: a document-type file outside fixtures/, by its content signature (GIF)',
      'photos/bitmap.dat: a document-type file outside fixtures/, by its content signature (BMP)',
      'uploads/a.dat: a document-type file outside fixtures/, by its content signature (7z)',
      'uploads/b.dat: a document-type file outside fixtures/, by its content signature (RAR)',
      'uploads/c.dat: a document-type file outside fixtures/, by its content signature (gzip)',
      'uploads/d.dat: a document-type file outside fixtures/, by its content signature (tar)',
      'docs/letter.txt: a document-type file outside fixtures/, by its content signature (RTF)',
    ],
    notExpect: ['docs/bms-notes.md', 'docs/pk.md'],
    tracked: [],
    tree: {
      'fixtures/manifest.json': EMPTY_MANIFEST,
      'docs/readme.txt': withSignature('%PDF-1.7 TEST'),
      'data/export.bin': withSignature([0x50, 0x4b, 0x03, 0x04]),
      'data/legacy.dat': withSignature([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
      'notes/model-step.txt': withSignature('\u00EF\u00BB\u00BFISO-10303-21;\nHEADER; /* TEST */'),
      'plans/ground-floor': withSignature('AC1032 TEST'),
      'plans/ground-floor.txt': withSignature('  0\nSECTION\n  2\nHEADER\n TEST'),
      'photos/nameplate.dat': withSignature([0xff, 0xd8, 0xff, 0xe0]),
      'photos/nameplate-2.dat': withSignature([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      'photos/iphone.dat': withSignature([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63]),
      'photos/scan.dat': withSignature([0x49, 0x49, 0x2a, 0x00]),
      'photos/web.dat': withSignature('RIFF\u0000\u0000\u0000\u0000WEBPVP8 '),
      'photos/anim.dat': withSignature('GIF89a'),
      'photos/bitmap.dat': withSignature([0x42, 0x4d, 0x36, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x36, 0x00, 0x00, 0x00]),
      'uploads/a.dat': withSignature([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]),
      'uploads/b.dat': withSignature('Rar!\u001a\u0007\u0000'),
      'uploads/c.dat': withSignature([0x1f, 0x8b, 0x08, 0x00]),
      'uploads/d.dat': tarStandIn(),
      'docs/letter.txt': withSignature('{\\rtf1\\ansi TEST}'),
      'docs/bms-notes.md': 'BMS notes for the TEST building: plain text that starts with the letters BM.\n',
      'docs/pk.md': 'PK: the primary key of the TEST table.\n',
    },
  },
];

function buildTree(files: Readonly<Record<string, string | Uint8Array>>): string {
  const root = mkdtempSync(join(tmpdir(), 'sovitech-fixture-manifest-'));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

export async function runCase(seededCase: SeededCase): Promise<CheckResult> {
  const temporary = seededCase.tree === undefined ? undefined : buildTree(seededCase.tree);
  try {
    return await checkFixtures({
      root: temporary ?? join(SEEDED, seededCase.id),
      label: seededCase.id,
      ...(seededCase.tracked === undefined ? {} : { tracked: seededCase.tracked }),
    });
  } finally {
    if (temporary !== undefined) rmSync(temporary, { recursive: true, force: true });
  }
}

/**
 * A bad case that fails without its expected finding, or with a finding it
 * must not have, failed for another reason; it is returned as passing so the
 * self-test run flags it.
 */
export function asSeededResult(seededCase: SeededCase, result: CheckResult): CheckResult {
  const details = result.details.join('\n');
  const missing = seededCase.expect.filter((text) => !details.includes(text));
  const unwanted = (seededCase.notExpect ?? []).filter((text) => details.includes(text));
  if (result.ok || (missing.length === 0 && unwanted.length === 0)) return result;
  return {
    ...result,
    ok: true,
    summary: `${result.summary}; but not for the seeded reason (missing: ${missing.join(', ') || 'none'}; unwanted: ${unwanted.join(', ') || 'none'})`,
  };
}
