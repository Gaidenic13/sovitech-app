/**
 * The seeded inputs of the licence check, shared by selftest.ts and the unit
 * tests. Package reports and site-packages folders sit under seeded/<id>/.
 * An installed npm tree is built in a temporary folder at run time, because a
 * folder named node_modules is never committed; so is a site-packages folder
 * that holds an archive, so that no binary file is committed. The npm native
 * binaries and WebAssembly modules of the seeded trees are text stand-ins that
 * carry the markers (phase 2 review, adversarial finding 16), and the notices
 * list of those cases is a TEST list with TEST component names.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from '../lib';
import type { CheckResult } from '../types';
import {
  NO_NOTICES,
  evaluateLicences,
  findPython,
  loadNpmFromTree,
  loadPython,
  parsePnpmLicences,
  scanNpmBinaries,
  type BundledNotices,
  type NpmBinarySource,
  type NpmSource,
  type PythonSource,
} from './licences';

const SEEDED = join(dirname(fileURLToPath(import.meta.url)), 'seeded');

type NpmInput = { readonly report: string } | { readonly tree: Readonly<Record<string, string>> } | { readonly noTree: true };
/**
 * A seeded site-packages folder, none, or one built at run time: `tree` holds
 * text files, and `archives` holds zip archives (built with Python's zipfile, so
 * no binary is committed), each a map of member names to text.
 */
type PythonInput =
  | { readonly sitePackages: string }
  | { readonly noEnvironment: true }
  | { readonly tree: Readonly<Record<string, string>>; readonly archives: Readonly<Record<string, Readonly<Record<string, string>>>> };

export interface SeededCase {
  readonly id: string;
  /** Text the findings (bad cases) or the summary and details (good cases) must contain. */
  readonly expect: readonly string[];
  readonly npm?: NpmInput;
  readonly python?: PythonInput;
  /** The components listed for the notices page; none when left out. */
  readonly notices?: BundledNotices;
}

const GOOD_NPM: NpmInput = { report: 'good' };
const GOOD_PYTHON: PythonInput = { sitePackages: 'good' };

const manifest = (fields: Record<string, unknown>): string => `${JSON.stringify(fields, null, 2)}\n`;

/** A TEST notices list: TEST components with TEST markers, as mangled C++ names show a namespace. */
const TEST_NOTICES: BundledNotices = {
  components: {
    TESTmesh: { licence: 'MPL-2.0', markers: ['8TESTmesh'], source: 'TEST' },
    TESTmath: { licence: 'MIT', markers: ['8TESTmath'], source: 'TEST' },
    TESTnurbs: { licence: 'BSD-3-Clause', markers: ['9TESTnurbs'], source: 'TEST' },
  },
  packages: [{ package: 'seeded-geom', version: '1.0.0', licence: 'MPL-2.0', components: ['TESTmesh', 'TESTmath'] }],
};

/** An installed npm package whose WebAssembly module bundles the TEST mesh and math components, and whose Node addon names only CGAL's LGPL kernel. */
const GEOM_TREE: Readonly<Record<string, string>> = {
  'node_modules/.pnpm/seeded-geom@1.0.0/node_modules/seeded-geom/package.json': manifest({ name: 'seeded-geom', version: '1.0.0', license: 'MPL-2.0' }),
  'node_modules/.pnpm/seeded-geom@1.0.0/node_modules/seeded-geom/dist/seeded-geom.wasm': 'Seeded stand-in (text): _ZN8TESTmesh13TriangulationE _ZN8TESTmath3vecILi3EdE\n',
  'node_modules/.pnpm/seeded-geom@1.0.0/node_modules/seeded-geom/build/Release/kernel.node': 'Seeded stand-in (text): _ZN4CGAL5EpeckE (the LGPL kernel only)\n',
};

export const GOOD_CASES: readonly SeededCase[] = [
  {
    id: 'good',
    expect: ['no AGPL or GPL dependency', 'LGPL 2', 'MPL 1', 'other copyleft 1', 'offers a choice that includes a GPL licence', 'GPL text beside LGPL text'],
  },
  {
    id: 'good-installed-tree',
    expect: ['no AGPL or GPL dependency', '2 npm packages from package.json files'],
    npm: {
      tree: {
        'node_modules/.pnpm/seeded-a@1.0.0/node_modules/seeded-a/package.json': manifest({ name: 'seeded-a', version: '1.0.0', license: 'MIT' }),
        'node_modules/.pnpm/@seeded+b@2.0.0/node_modules/@seeded/b/package.json': manifest({
          name: '@seeded/b',
          version: '2.0.0',
          licenses: [{ type: 'MIT' }, { type: 'Apache-2.0' }],
        }),
      },
    },
  },
  // Phase 2 review, adversarial finding 16: npm native binaries and WebAssembly are searched, and their
  // bundled components are reported for the notices page (D-94).
  {
    id: 'good-npm-binaries',
    expect: [
      'no AGPL or GPL dependency',
      '2 npm native binaries and WebAssembly modules searched',
      'bundled (for the notices page, D-94): npm seeded-geom 1.0.0 (MPL-2.0): TESTmesh (MPL-2.0), TESTmath (MIT)',
    ],
    npm: { tree: GEOM_TREE },
    notices: TEST_NOTICES,
  },
];

export const BAD_CASES: readonly SeededCase[] = [
  { id: 'npm-gpl', expect: ['npm seeded-copyleft 1.0.0: GPL'], npm: { report: 'npm-gpl' } },
  { id: 'npm-agpl', expect: ['npm seeded-network-copyleft 1.0.0: AGPL'], npm: { report: 'npm-agpl' } },
  { id: 'npm-gpl-in-and', expect: ['npm seeded-combined 1.0.0: GPL'], npm: { report: 'npm-gpl-in-and' } },
  { id: 'npm-unknown', expect: ['npm seeded-unstated 0.1.0: licence not stated'], npm: { report: 'npm-unknown' } },
  {
    id: 'npm-installed-tree-gpl',
    expect: ['npm seeded-tree-copyleft 1.0.0: GPL'],
    npm: {
      tree: {
        'node_modules/.pnpm/seeded-tree-copyleft@1.0.0/node_modules/seeded-tree-copyleft/package.json': manifest({
          name: 'seeded-tree-copyleft',
          version: '1.0.0',
          license: 'GPL-2.0-or-later',
        }),
      },
    },
  },
  { id: 'npm-not-installed', expect: ['npm: licences could not be read'], npm: { noTree: true } },
  { id: 'python-gpl-expression', expect: ['python copyleftlib 2.0: GPL'], python: { sitePackages: 'python-gpl-expression' } },
  { id: 'python-gpl-classifier', expect: ['python classifiedlib 1.1: GPL'], python: { sitePackages: 'python-gpl-classifier' } },
  { id: 'python-agpl-free-text', expect: ['python networklib 0.9: AGPL'], python: { sitePackages: 'python-agpl-free-text' } },
  {
    id: 'python-gpl-inside-lgpl',
    expect: ['GPL licence text inside an LGPL wheel', 'geomkit/bundled/kernel/LICENSE'],
    python: { sitePackages: 'python-gpl-inside-lgpl' },
  },
  { id: 'python-no-environment', expect: ['python: licences could not be read: no Python environment'], python: { noEnvironment: true } },
  // Phase 2 (2026-09-25): the IfcOpenShell 0.8.5 wheel declares LGPL, ships no
  // licence file, and its compiled library bundles CGAL packages CGAL publishes
  // under the GPL. The check read licence files only and passed it.
  {
    id: 'python-gpl-bundled-in-binary',
    expect: ['geomwrap 0.8: a native binary bundles GPL components', '3D Boolean Operations on Nef Polyhedra', 'geomwrap/_wrapper.so'],
    python: { sitePackages: 'python-gpl-bundled-in-binary' },
  },
  {
    id: 'python-lgpl-binary-no-licence-file',
    expect: ['nolicgeom 2.0: an LGPL wheel that installs native binaries', 'ships no licence file'],
    python: { sitePackages: 'python-lgpl-binary-no-licence-file' },
  },
  // The IfcTester 0.8.5 wheel ships a WebAssembly build of IfcOpenShell inside
  // a wheel inside its own wheel.
  {
    id: 'python-gpl-bundled-in-nested-archive',
    expect: ['idscheck 0.8: a native binary bundles GPL components', 'Polygon Mesh Processing', 'idscheck/www/bin/geomwrap-0.8-wasm32.whl!geomwrap/_wrapper.wasm'],
    python: {
      tree: {
        'idscheck-0.8.dist-info/METADATA':
          'Metadata-Version: 2.4\nName: idscheck\nVersion: 0.8\nSummary: Seeded distribution for the licence self-test.\nLicense-Expression: BSD-3-Clause\n',
        'idscheck-0.8.dist-info/RECORD': 'idscheck-0.8.dist-info/METADATA,,\nidscheck-0.8.dist-info/RECORD,,\nidscheck/www/bin/geomwrap-0.8-wasm32.whl,,\n',
      },
      archives: {
        'idscheck/www/bin/geomwrap-0.8-wasm32.whl': {
          'geomwrap/_wrapper.wasm': 'Seeded stand-in (text): _ZN4CGAL23Polygon_mesh_processing8internalE\n',
          'geomwrap/__init__.py': '',
        },
      },
    },
  },
  // Phase 2 review, adversarial finding 16: npm WebAssembly and native addons were read from package metadata only.
  {
    id: 'npm-gpl-bundled-in-wasm',
    expect: ['npm seeded-kernel 2.0.0: a native binary or WebAssembly module bundles GPL components', '3D Boolean Operations on Nef Polyhedra', 'seeded-kernel/lib/kernel.wasm'],
    npm: {
      tree: {
        'node_modules/.pnpm/seeded-kernel@2.0.0/node_modules/seeded-kernel/package.json': manifest({ name: 'seeded-kernel', version: '2.0.0', license: 'MIT' }),
        'node_modules/.pnpm/seeded-kernel@2.0.0/node_modules/seeded-kernel/lib/kernel.wasm': 'Seeded stand-in (text): _ZN4CGAL15Nef_polyhedron_3INS_5EpeckEE\n',
      },
    },
  },
  {
    id: 'npm-gpl-bundled-in-native-addon',
    expect: ['npm seeded-mesh 1.2.0: a native binary or WebAssembly module bundles GPL components', 'Polygon Mesh Processing', 'seeded-mesh/build/Release/mesh.node'],
    npm: {
      tree: {
        'node_modules/.pnpm/seeded-mesh@1.2.0/node_modules/seeded-mesh/package.json': manifest({ name: 'seeded-mesh', version: '1.2.0', license: 'Apache-2.0' }),
        'node_modules/.pnpm/seeded-mesh@1.2.0/node_modules/seeded-mesh/build/Release/mesh.node': 'Seeded stand-in (text): _ZN4CGAL23Polygon_mesh_processing8internalE\n',
      },
    },
  },
  {
    id: 'npm-bundled-component-unlisted',
    expect: ['npm seeded-geom 1.0.0:', 'seeded-geom.wasm bundles TESTmath (MIT), which bundled-notices.json does not list for this package'],
    npm: { tree: GEOM_TREE },
    notices: { ...TEST_NOTICES, packages: [{ package: 'seeded-geom', version: '1.0.0', components: ['TESTmesh'] }] },
  },
  {
    id: 'npm-bundled-notices-stale-version',
    expect: ['bundled-notices.json lists seeded-geom 0.9.0, but seeded-geom 1.0.0 is installed'],
    npm: { tree: GEOM_TREE },
    notices: { ...TEST_NOTICES, packages: [{ package: 'seeded-geom', version: '0.9.0', components: ['TESTmesh', 'TESTmath'] }] },
  },
  {
    id: 'npm-bundled-notices-listed-not-found',
    expect: ['bundled-notices.json lists TESTnurbs for seeded-geom 1.0.0, but none of its binaries holds its markers'],
    npm: { tree: GEOM_TREE },
    notices: { ...TEST_NOTICES, packages: [{ package: 'seeded-geom', version: '1.0.0', components: ['TESTmesh', 'TESTmath', 'TESTnurbs'] }] },
  },
];

function buildTree(files: Readonly<Record<string, string>>): string {
  const root = mkdtempSync(join(tmpdir(), 'sovitech-licences-'));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

/** The npm packages of a case, and its native binaries searched (none for a seeded report, which holds no tree). */
function npmSource(input: NpmInput, notices: BundledNotices, temporary: string[]): { readonly npm: NpmSource; readonly binaries: NpmBinarySource; readonly root?: string } {
  if ('report' in input) {
    const json: unknown = JSON.parse(readFileSync(join(SEEDED, input.report, 'pnpm-licenses.json'), 'utf8'));
    return {
      npm: { kind: 'packages', packages: parsePnpmLicences(json), from: `seeded/${input.report}/pnpm-licenses.json` },
      binaries: { kind: 'binaries', binaries: [], from: 'a seeded report (no installed tree)' },
    };
  }
  if ('tree' in input) {
    const root = buildTree(input.tree);
    temporary.push(root);
    return { npm: loadNpmFromTree(join(root, 'node_modules')), binaries: scanNpmBinaries(join(root, 'node_modules'), notices), root };
  }
  const absent = join(tmpdir(), 'sovitech-licences-absent', 'node_modules');
  return { npm: loadNpmFromTree(absent), binaries: scanNpmBinaries(absent, notices) };
}

const ZIP_WRITER = 'import json, sys, zipfile\nwith zipfile.ZipFile(sys.argv[1], "w") as z:\n    for name, text in json.loads(sys.argv[2]).items():\n        z.writestr(name, text)\n';

/** The Python source of a case, and the folder its findings' paths are shown relative to. */
function pythonSource(input: PythonInput, temporary: string[]): { readonly source: PythonSource; readonly root: string } {
  if ('noEnvironment' in input) return { source: loadPython(repoRoot, [], 'seeded (no environment)'), root: SEEDED };
  if ('sitePackages' in input) {
    return {
      source: loadPython(repoRoot, [join(SEEDED, input.sitePackages, 'site-packages')], `seeded/${input.sitePackages}/site-packages`),
      root: SEEDED,
    };
  }
  const root = buildTree(input.tree);
  temporary.push(root);
  const python = findPython(repoRoot);
  if (python === undefined) {
    return { source: { kind: 'unavailable', reason: 'no Python 3.10 or later runs here, so the seeded archive cannot be built' }, root };
  }
  for (const [path, members] of Object.entries(input.archives)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    const made = spawnSync(python, ['-I', '-B', '-c', ZIP_WRITER, join(root, path), JSON.stringify(members)], { encoding: 'utf8', timeout: 60_000 });
    if (made.status !== 0) throw new Error(`the seeded archive ${path} could not be built: ${made.stderr}`);
  }
  return { source: loadPython(repoRoot, [root], 'seeded (built at run time)'), root };
}

export function runCase(seededCase: SeededCase): Promise<CheckResult> {
  const temporary: string[] = [];
  try {
    const notices = seededCase.notices ?? NO_NOTICES;
    const npm = npmSource(seededCase.npm ?? GOOD_NPM, notices, temporary);
    const python = pythonSource(seededCase.python ?? GOOD_PYTHON, temporary);
    return Promise.resolve(
      evaluateLicences({ npm: npm.npm, npmBinaries: npm.binaries, notices, python: python.source, root: npm.root ?? python.root, label: seededCase.id }),
    );
  } finally {
    for (const path of temporary) rmSync(path, { recursive: true, force: true });
  }
}

/**
 * A bad case that fails without its expected finding failed for another
 * reason; it is returned as passing so the self-test run flags it.
 */
export function asSeededResult(seededCase: SeededCase, result: CheckResult): CheckResult {
  const details = result.details.join('\n');
  const missing = seededCase.expect.filter((text) => !details.includes(text));
  if (result.ok || missing.length === 0) return result;
  return { ...result, ok: true, summary: `${result.summary}; but not for the seeded reason (no finding with ${missing.join(', ')})` };
}
