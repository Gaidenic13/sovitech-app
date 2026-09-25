/**
 * Licence check (prompt 3 section 8 "Licences"; ifc-input 2.3). Fails on any
 * AGPL or GPL dependency, npm or Python, and on a dependency whose licence is
 * not stated. Reports LGPL and MPL ones (and other copyleft licences) in the
 * summary and details. LGPL is not GPL.
 *
 * - npm: `pnpm licenses ls --json`; when pnpm cannot run, each installed
 *   package's package.json under node_modules.
 * - Python: the extractor's virtual environment, read through
 *   importlib.metadata by python_dists.py. For a distribution whose metadata
 *   says LGPL, the licence files inside the installed wheel are read too: GPL
 *   text in a folder with no LGPL text beside it fails, because a bundled
 *   component may be GPL although the package metadata says LGPL.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fail, pass } from '../lib';
import type { CheckResult } from '../types';

export const NAME = 'licences';

export type LicenceClass = 'other' | 'mpl' | 'lgpl' | 'unknown' | 'gpl' | 'agpl';

/** Order from most to least permissive: OR takes the lowest, AND the highest. */
const RANK: Readonly<Record<LicenceClass, number>> = { other: 0, mpl: 1, lgpl: 2, unknown: 3, gpl: 4, agpl: 5 };

const lowest = (classes: readonly LicenceClass[]): LicenceClass =>
  classes.reduce((best, next) => (RANK[next] < RANK[best] ? next : best));
const highest = (classes: readonly LicenceClass[]): LicenceClass =>
  classes.reduce((worst, next) => (RANK[next] > RANK[worst] ? next : worst));

/** Copyleft licences that are neither GPL nor LGPL nor MPL: reported, not failed. */
const OTHER_COPYLEFT = /^(EPL|EUPL|CDDL|OSL|SSPL|CPAL|RPL|CC-BY-SA|CECILL|MS-RL)/i;

function classifyId(id: string): LicenceClass {
  const clean = id.toUpperCase();
  if (clean.startsWith('AGPL')) return 'agpl';
  if (clean.startsWith('LGPL')) return 'lgpl';
  if (clean.startsWith('GPL')) return 'gpl';
  if (clean.startsWith('MPL')) return 'mpl';
  if (['UNKNOWN', 'UNLICENSED', 'NOASSERTION', 'NONE'].includes(clean) || clean.startsWith('LICENSEREF-')) return 'unknown';
  return 'other';
}

type Token = { kind: 'id'; value: string } | { kind: 'and' | 'or' | 'with' | 'open' | 'close' };

function tokenize(expression: string): Token[] | undefined {
  const tokens: Token[] = [];
  for (const raw of expression.replace(/([()])/g, ' $1 ').trim().split(/\s+/)) {
    if (raw === '(') tokens.push({ kind: 'open' });
    else if (raw === ')') tokens.push({ kind: 'close' });
    else if (/^and$/i.test(raw)) tokens.push({ kind: 'and' });
    else if (/^or$/i.test(raw)) tokens.push({ kind: 'or' });
    else if (/^with$/i.test(raw)) tokens.push({ kind: 'with' });
    else if (/^[A-Za-z0-9][A-Za-z0-9.+:-]*$/.test(raw)) tokens.push({ kind: 'id', value: raw });
    else return undefined;
  }
  return tokens;
}

/** Evaluates an SPDX expression; undefined when it is not one. */
function classifySpdx(expression: string): LicenceClass | undefined {
  const tokens = tokenize(expression);
  if (tokens === undefined || tokens.length === 0) return undefined;
  let position = 0;
  const peek = (): Token | undefined => tokens[position];
  const orExpression = (): LicenceClass | undefined => {
    const parts: LicenceClass[] = [];
    for (;;) {
      const part = andExpression();
      if (part === undefined) return undefined;
      parts.push(part);
      if (peek()?.kind !== 'or') return lowest(parts);
      position += 1;
    }
  };
  const andExpression = (): LicenceClass | undefined => {
    const parts: LicenceClass[] = [];
    for (;;) {
      const part = factor();
      if (part === undefined) return undefined;
      parts.push(part);
      if (peek()?.kind !== 'and') return highest(parts);
      position += 1;
    }
  };
  const factor = (): LicenceClass | undefined => {
    const token = peek();
    if (token?.kind === 'open') {
      position += 1;
      const inner = orExpression();
      if (peek()?.kind !== 'close') return undefined;
      position += 1;
      return inner;
    }
    if (token?.kind !== 'id') return undefined;
    position += 1;
    if (peek()?.kind === 'with') {
      position += 1;
      if (peek()?.kind !== 'id') return undefined;
      position += 1;
    }
    return classifyId(token.value);
  };
  const result = orExpression();
  return position === tokens.length ? result : undefined;
}

function classifyFreeText(text: string): LicenceClass {
  const trimmed = text.trim();
  if (trimmed === '' || /^see licen[cs]e in\b/i.test(trimmed) || /^(unknown|none|unlicensed)$/i.test(trimmed)) return 'unknown';
  if (/affero|\bAGPL/i.test(trimmed)) return 'agpl';
  if (/lesser general public|library general public|\bLGPL/i.test(trimmed)) return 'lgpl';
  if (/general public licen[cs]e|\bGPL/i.test(trimmed)) return 'gpl';
  if (/mozilla public|\bMPL\b/i.test(trimmed)) return 'mpl';
  return 'other';
}

/** The class of a licence string: an SPDX expression, or free text. */
export function classifyLicence(text: string): LicenceClass {
  return classifySpdx(text) ?? classifyFreeText(text);
}

/** The class of a set of trove classifiers; undefined when none names a licence. */
export function classifyClassifiers(classifiers: readonly string[]): LicenceClass | undefined {
  const named = classifiers.map((classifier) => classifier.replace(/^License ::\s*/, '').trim()).filter((name) => name !== 'OSI Approved');
  if (named.length === 0) return undefined;
  const classes = named.map((name): LicenceClass => {
    if (/affero/i.test(name)) return 'agpl';
    if (/lesser|library/i.test(name) && /GNU|GPL/i.test(name)) return 'lgpl';
    if (/GNU General Public License|\(GPL/i.test(name)) return 'gpl';
    if (/Mozilla Public/i.test(name)) return 'mpl';
    return 'other';
  });
  // Several licence classifiers usually mean a choice of licences.
  return lowest(classes);
}

/** The licence a licence file carries, read from its title line. */
export function classifyLicenceFileText(text: string): 'agpl' | 'lgpl' | 'gpl' | 'other' {
  if (/GNU AFFERO GENERAL PUBLIC LICENSE/.test(text)) return 'agpl';
  if (/GNU (?:LESSER|LIBRARY) GENERAL PUBLIC LICENSE/.test(text)) return 'lgpl';
  if (/GNU GENERAL PUBLIC LICENSE/.test(text)) return 'gpl';
  return 'other';
}

// ---------------------------------------------------------------------------
// npm packages.

export interface NpmPackage {
  readonly name: string;
  readonly version: string;
  readonly licence: string;
}

export type NpmSource =
  | { readonly kind: 'packages'; readonly packages: readonly NpmPackage[]; readonly from: string }
  | { readonly kind: 'unavailable'; readonly reason: string };

/** Reads the JSON of `pnpm licenses ls --json`: licence name to package entries. */
export function parsePnpmLicences(json: unknown): NpmPackage[] {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) throw new Error('not an object of licence groups');
  const packages: NpmPackage[] = [];
  for (const [group, entries] of Object.entries(json as Record<string, unknown>)) {
    if (!Array.isArray(entries)) throw new Error(`group ${group} is not a list`);
    for (const entry of entries as Array<Record<string, unknown>>) {
      const name = typeof entry['name'] === 'string' ? entry['name'] : '(unnamed)';
      const versions = Array.isArray(entry['versions']) ? (entry['versions'] as unknown[]).map(String) : [];
      const licence = typeof entry['license'] === 'string' ? entry['license'] : group;
      packages.push({ name, version: versions.join(', '), licence });
    }
  }
  return packages.sort((left, right) => left.name.localeCompare(right.name));
}

export function loadNpmFromPnpm(root: string): NpmSource {
  const result = spawnSync('pnpm', ['licenses', 'ls', '--json'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 120_000 });
  if (result.status !== 0 || typeof result.stdout !== 'string') {
    return { kind: 'unavailable', reason: `pnpm licenses ls failed: ${(result.stderr ?? '').toString().trim() || (result.error?.message ?? 'no output')}` };
  }
  try {
    return { kind: 'packages', packages: parsePnpmLicences(JSON.parse(result.stdout)), from: 'pnpm licenses ls' };
  } catch (error) {
    return { kind: 'unavailable', reason: `pnpm licenses ls output could not be read: ${error instanceof Error ? error.message : String(error)}` };
  }
}

function licenceOfManifest(manifest: Record<string, unknown>): string {
  const field = manifest['license'];
  if (typeof field === 'string') return field;
  if (typeof field === 'object' && field !== null && typeof (field as Record<string, unknown>)['type'] === 'string') {
    return (field as Record<string, string>)['type'] ?? '';
  }
  const list = manifest['licenses'];
  if (Array.isArray(list)) {
    const types = list.map((item) => (typeof item === 'object' && item !== null ? String((item as Record<string, unknown>)['type'] ?? '') : String(item)));
    return types.length > 1 ? `(${types.join(' OR ')})` : (types[0] ?? '');
  }
  return '';
}

function packageDirectories(modules: string): string[] {
  if (!existsSync(modules)) return [];
  const found: string[] = [];
  for (const name of readdirSync(modules)) {
    if (name.startsWith('.')) continue;
    const path = join(modules, name);
    if (lstatSync(path).isSymbolicLink() || !lstatSync(path).isDirectory()) continue;
    if (name.startsWith('@')) {
      for (const scoped of readdirSync(path)) {
        const scopedPath = join(path, scoped);
        if (!lstatSync(scopedPath).isSymbolicLink() && lstatSync(scopedPath).isDirectory()) found.push(scopedPath);
      }
    } else {
      found.push(path);
    }
  }
  return found;
}

/** Reads each installed package's package.json: pnpm's virtual store when present, else a flat node_modules. */
export function loadNpmFromTree(nodeModules: string): NpmSource {
  if (!existsSync(nodeModules)) return { kind: 'unavailable', reason: `${nodeModules} does not exist` };
  const store = join(nodeModules, '.pnpm');
  const directories = existsSync(store)
    ? readdirSync(store)
        .filter((entry) => entry !== 'node_modules' && lstatSync(join(store, entry)).isDirectory())
        .flatMap((entry) => packageDirectories(join(store, entry, 'node_modules')))
    : packageDirectories(nodeModules);
  const packages: NpmPackage[] = [];
  for (const directory of directories) {
    const manifestPath = join(directory, 'package.json');
    if (!existsSync(manifestPath)) continue;
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
    packages.push({
      name: typeof manifest['name'] === 'string' ? manifest['name'] : directory,
      version: typeof manifest['version'] === 'string' ? manifest['version'] : '',
      licence: licenceOfManifest(manifest),
    });
  }
  return { kind: 'packages', packages: packages.sort((left, right) => left.name.localeCompare(right.name)), from: 'package.json files' };
}

/** pnpm's report, or the package.json files when pnpm cannot run. */
export function loadNpm(root: string): NpmSource {
  const fromPnpm = loadNpmFromPnpm(root);
  if (fromPnpm.kind === 'packages') return fromPnpm;
  const fromTree = loadNpmFromTree(join(root, 'node_modules'));
  return fromTree.kind === 'packages' ? { ...fromTree, from: `package.json files (${fromPnpm.reason})` } : fromTree;
}

// ---------------------------------------------------------------------------
// Python distributions.

export interface PythonDist {
  readonly name: string | null;
  readonly version: string | null;
  readonly licenseExpression: string | null;
  readonly license: string | null;
  readonly classifiers: readonly string[];
  readonly licenseFiles: readonly string[];
}

export type PythonSource =
  | { readonly kind: 'dists'; readonly dists: readonly PythonDist[]; readonly from: string }
  | { readonly kind: 'unavailable'; readonly reason: string };

const LISTER = join(dirname(fileURLToPath(import.meta.url)), 'python_dists.py');

/** The extractor's site-packages folders. */
export function extractorSitePackages(root: string): string[] {
  const lib = join(root, 'services', 'extractor', '.venv', 'lib');
  if (!existsSync(lib)) return [];
  return readdirSync(lib)
    .filter((name) => name.startsWith('python'))
    .map((name) => join(lib, name, 'site-packages'))
    .filter((path) => existsSync(path));
}

/** A Python 3.10 or later that runs here: the extractor's own first. */
export function findPython(root: string): string | undefined {
  const candidates = [join(root, 'services', 'extractor', '.venv', 'bin', 'python'), 'python3.12', 'python3', 'python'];
  return candidates.find((candidate) => {
    const probe = spawnSync(candidate, ['-c', 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)'], { timeout: 30_000 });
    return probe.status === 0;
  });
}

/** Lists the distributions installed in `sitePackages` through importlib.metadata. */
export function loadPython(root: string, sitePackages: readonly string[], label: string): PythonSource {
  if (sitePackages.length === 0) {
    return { kind: 'unavailable', reason: `no Python environment at ${label}: create it with \`pnpm setup:py\`` };
  }
  const python = findPython(root);
  if (python === undefined) return { kind: 'unavailable', reason: 'no Python 3.10 or later runs here, so Python licences cannot be read' };
  // -I: ignore the environment and the user site; -B: write no bytecode.
  const result = spawnSync(python, ['-I', '-B', LISTER, ...sitePackages], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 120_000 });
  if (result.status !== 0) return { kind: 'unavailable', reason: `python_dists.py failed: ${(result.stderr ?? '').trim()}` };
  try {
    return { kind: 'dists', dists: JSON.parse(result.stdout) as PythonDist[], from: label };
  } catch (error) {
    return { kind: 'unavailable', reason: `python_dists.py output could not be read: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// ---------------------------------------------------------------------------
// The verdict.

export interface LicenceInputs {
  readonly npm: NpmSource;
  readonly python: PythonSource;
  /** Paths in findings are shown relative to this folder. */
  readonly root: string;
  readonly label?: string;
}

function pythonClass(dist: PythonDist): { licence: string; kind: LicenceClass } {
  if (dist.licenseExpression !== null && dist.licenseExpression.trim() !== '') {
    return { licence: dist.licenseExpression, kind: classifyLicence(dist.licenseExpression) };
  }
  const fromClassifiers = classifyClassifiers(dist.classifiers);
  if (fromClassifiers !== undefined) return { licence: dist.classifiers.join('; '), kind: fromClassifiers };
  const text = dist.license ?? '';
  return { licence: text.split('\n')[0]?.slice(0, 80) ?? '', kind: classifyFreeText(text) };
}

/** Licence files inside an LGPL wheel: GPL text with no LGPL text in the same folder fails. */
function wheelFindings(dist: PythonDist, root: string): { failures: string[]; reports: string[] } {
  const byFolder = new Map<string, Array<{ path: string; kind: ReturnType<typeof classifyLicenceFileText> }>>();
  for (const path of dist.licenseFiles) {
    if (!existsSync(path)) continue;
    const kind = classifyLicenceFileText(readFileSync(path, 'utf8').slice(0, 1_000_000));
    const folder = dirname(path);
    byFolder.set(folder, [...(byFolder.get(folder) ?? []), { path, kind }]);
  }
  const failures: string[] = [];
  const reports: string[] = [];
  const shown = (path: string): string => relative(root, path);
  for (const files of byFolder.values()) {
    const lesser = files.some((file) => file.kind === 'lgpl');
    for (const file of files) {
      if (file.kind === 'agpl') failures.push(`${dist.name ?? '?'} ${dist.version ?? ''}: AGPL licence text inside the wheel at ${shown(file.path)}`);
      else if (file.kind === 'gpl' && !lesser) {
        failures.push(`${dist.name ?? '?'} ${dist.version ?? ''}: GPL licence text inside an LGPL wheel, with no LGPL text beside it, at ${shown(file.path)}; a bundled component may be GPL (prompt 3 section 13 item 7)`);
      } else if (file.kind === 'gpl') {
        reports.push(`${dist.name ?? '?'} ${dist.version ?? ''}: GPL text beside LGPL text at ${shown(file.path)} (the usual LGPLv3 packaging; review before release)`);
      }
    }
  }
  return { failures, reports };
}

export function evaluateLicences(inputs: LicenceInputs): CheckResult {
  const prefix = inputs.label === undefined ? '' : `[${inputs.label}] `;
  const failures: string[] = [];
  const reported: Record<'lgpl' | 'mpl' | 'copyleft', string[]> = { lgpl: [], mpl: [], copyleft: [] };
  const notes: string[] = [];

  const judge = (ecosystem: string, name: string, version: string, licence: string, kind: LicenceClass): void => {
    const who = `${ecosystem} ${name} ${version}`.trim();
    if (kind === 'agpl' || kind === 'gpl') failures.push(`${who}: ${kind.toUpperCase()} ("${licence}")`);
    else if (kind === 'unknown') failures.push(`${who}: licence not stated ("${licence}"), so GPL cannot be ruled out; read its licence file and settle it by hand`);
    else if (kind === 'lgpl') reported.lgpl.push(`${who} (${licence})`);
    else if (kind === 'mpl') reported.mpl.push(`${who} (${licence})`);
    else if (OTHER_COPYLEFT.test(licence)) reported.copyleft.push(`${who} (${licence})`);
    if ((kind === 'other' || kind === 'mpl' || kind === 'lgpl') && /\bA?GPL/i.test(licence.replace(/\bLGPL/gi, ''))) {
      notes.push(`note: ${who} offers a choice that includes a GPL licence ("${licence}"); the other licence applies`);
    }
  };

  let npmCount = 0;
  let npmFrom = '';
  if (inputs.npm.kind === 'unavailable') failures.push(`npm: licences could not be read: ${inputs.npm.reason}`);
  else {
    npmCount = inputs.npm.packages.length;
    npmFrom = inputs.npm.from;
    for (const item of inputs.npm.packages) judge('npm', item.name, item.version, item.licence, classifyLicence(item.licence));
  }

  let pythonCount = 0;
  let pythonFrom = '';
  if (inputs.python.kind === 'unavailable') failures.push(`python: licences could not be read: ${inputs.python.reason}`);
  else {
    pythonCount = inputs.python.dists.length;
    pythonFrom = inputs.python.from;
    for (const dist of inputs.python.dists) {
      const { licence, kind } = pythonClass(dist);
      judge('python', dist.name ?? '(unnamed)', dist.version ?? '', licence, kind);
      if (kind === 'lgpl') {
        const wheel = wheelFindings(dist, inputs.root);
        failures.push(...wheel.failures);
        notes.push(...wheel.reports.map((report) => `note: ${report}`));
      }
    }
  }

  const listed = (label: string, items: readonly string[]): string => `${label} ${items.length}${items.length > 0 ? ` (${items.map((item) => item.replace(/ \(.*\)$/, '')).join(', ')})` : ''}`;
  const scope = `${npmCount} npm packages${npmFrom === '' ? '' : ` from ${npmFrom}`}, ${pythonCount} Python distributions${pythonFrom === '' ? '' : ` in ${pythonFrom}`}`;
  const report = [listed('LGPL', reported.lgpl), listed('MPL', reported.mpl), ...(reported.copyleft.length > 0 ? [listed('other copyleft', reported.copyleft)] : [])].join('; ');
  const details = [
    ...reported.lgpl.map((item) => `LGPL: ${item}`),
    ...reported.mpl.map((item) => `MPL: ${item}`),
    ...reported.copyleft.map((item) => `other copyleft: ${item}`),
    ...notes,
  ];
  if (failures.length === 0) return pass(NAME, `${prefix}no AGPL or GPL dependency (${scope}); ${report}`, details);
  return fail(NAME, `${prefix}${failures.length} licence problems (${scope}); ${report}`, [...failures, ...details]);
}
