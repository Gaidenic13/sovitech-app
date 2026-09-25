/**
 * Config-exclusion check (build-readiness decision 12; prompt 3 section 6,
 * "company/ stays out of the build"). Fails when a workspace, TypeScript,
 * ESLint, Vitest, Playwright, Prettier, dependency-cruiser, ruff, pytest,
 * Tailwind, Vite or CI config, a package script, or the checks' shared scan
 * roots reach into company/, or glob broadly without excluding it.
 *
 * Each inspector reads its tool's own semantics as closely as it can without
 * running the tool: ESLint is asked through its API; Vitest, Playwright and
 * Vite configs are imported and read; the rest are parsed. Probe paths under
 * company/ (paths.ts) stand for its content: the check never reads company/.
 */
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, posix } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { parse as parseYaml } from 'yaml';
import { fail, pass } from '../lib';
import type { CheckResult } from '../types';
import { listOf, parseIni, parseTomlSubset, type Tables } from './ini';
import {
  COMPANY_DIR_PROBES,
  COMPANY_FILE_PROBES,
  cleanPattern,
  folderOf,
  hasGlob,
  holdsCompany,
  isInCompany,
  matches,
  record,
  resolveFrom,
  strings,
} from './paths';

export const NAME = 'config-exclusion';

export type PythonConfigKind = 'pyproject' | 'ruff' | 'pytest-ini' | 'tox' | 'setup-cfg';

/** The configs to inspect, as paths relative to `root`. Absent groups are not inspected. */
export interface Targets {
  readonly root: string;
  readonly workspaceFiles?: readonly string[];
  readonly packageJsons?: readonly string[];
  readonly tsconfigs?: readonly string[];
  readonly eslintConfigs?: readonly string[];
  readonly vitestConfigs?: readonly string[];
  readonly playwrightConfigs?: readonly string[];
  readonly prettier?: { readonly configs: readonly string[]; readonly ignoreFile: string; readonly dependency: boolean };
  readonly depcruise?: { readonly config: string; readonly scripts: Readonly<Record<string, string>> };
  readonly pythonConfigs?: ReadonlyArray<{ readonly path: string; readonly kind: PythonConfigKind }>;
  /** Package scripts, read for commands that name company/ or run ruff and pytest over it. */
  readonly scripts?: Readonly<Record<string, string>>;
  readonly cssFiles?: readonly string[];
  readonly viteConfigs?: readonly string[];
  readonly ciFiles?: readonly string[];
  readonly checkScanRoots?: { readonly lib: string; readonly sources: readonly string[] };
}

export interface Report {
  readonly problems: string[];
  readonly notes: string[];
  readonly inspected: string[];
}

const TS_PROBES = COMPANY_FILE_PROBES.filter((probe) => /\.(tsx?|jsx?)$/.test(probe));
const TEST_PROBES = COMPANY_FILE_PROBES.filter((probe) => /\.(test|spec)\.[jt]sx?$/.test(probe));
const CHECK_PROBE = 'company/website/src/index.ts';

function readText(root: string, path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

async function importDefault(root: string, path: string): Promise<unknown> {
  const module = (await import(pathToFileURL(join(root, path)).href)) as { default?: unknown };
  const value = module.default;
  return typeof value === 'function' ? await (value as (env: Record<string, unknown>) => unknown)({ command: 'serve', mode: 'test', isSsrBuild: false, isPreview: false }) : value;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message.split('\n')[0] ?? error.message : String(error);
}

// ---------------------------------------------------------------------------
// Workspaces.

function inspectWorkspacePatterns(label: string, patterns: readonly string[], report: Report): void {
  const negative = patterns.filter((pattern) => pattern.startsWith('!')).map((pattern) => pattern.slice(1));
  for (const pattern of patterns) {
    if (pattern.startsWith('!') || cleanPattern(pattern) === '') continue;
    const reached = COMPANY_DIR_PROBES.find((dir) => matches(dir, pattern) && !negative.some((not) => matches(dir, not)));
    if (reached !== undefined) report.problems.push(`${label}: workspace pattern "${pattern}" reaches ${reached}/; list apps/* and packages/* explicitly`);
  }
}

function inspectWorkspaceFile(root: string, path: string, report: Report): void {
  const data = record(parseYaml(readText(root, path)));
  inspectWorkspacePatterns(path, strings(data?.['packages']) ?? [], report);
  report.inspected.push(`pnpm workspace (${path})`);
}

function inspectPackageJson(root: string, path: string, report: Report): void {
  const data = record(JSON.parse(readText(root, path))) ?? {};
  const workspaces = data['workspaces'];
  const patterns = strings(workspaces) ?? strings(record(workspaces)?.['packages']);
  if (patterns !== undefined) {
    inspectWorkspacePatterns(`${path} "workspaces"`, patterns, report);
    report.inspected.push(`package workspaces (${path})`);
  }
}

// ---------------------------------------------------------------------------
// TypeScript.

/** tsconfig include and exclude semantics: a pattern with no wildcard and no extension names a folder. */
function tsMatches(path: string, pattern: string): boolean {
  const clean = cleanPattern(pattern);
  if (!hasGlob(clean) && !/\.[a-z]+$/i.test(clean.split('/').pop() ?? '')) return matches(path, clean);
  if (clean.endsWith('/**')) return matches(path, `${clean}/*`) || matches(path, clean);
  return matches(path, clean);
}

interface TsconfigFile {
  readonly config: Record<string, unknown>;
  readonly base: string;
}

function readTsconfig(root: string, path: string): TsconfigFile {
  const parsed = ts.parseConfigFileTextToJson(path, readText(root, path));
  if (parsed.error !== undefined) throw new Error(`cannot be parsed: ${ts.flattenDiagnosticMessageText(parsed.error.messageText, ' ')}`);
  return { config: record(parsed.config) ?? {}, base: folderOf(path) };
}

/** The repository path of a relative `extends` target, or undefined for a package or a missing file. */
function extendsTarget(root: string, from: string, value: string): string | undefined {
  if (!value.startsWith('.') && !value.startsWith('/')) return undefined;
  const resolved = resolveFrom(from, value, root);
  if (resolved === undefined) return undefined;
  const candidate = existsSync(join(root, resolved)) ? resolved : `${resolved}.json`;
  return existsSync(join(root, candidate)) ? candidate : undefined;
}

/**
 * One tsconfig setting as TypeScript applies it: the file's own value, else
 * the value inherited through `extends`, with patterns resolved from the
 * folder of the file that states them.
 */
function inherited(root: string, path: string, key: 'include' | 'exclude' | 'files', seen: ReadonlySet<string> = new Set()): { patterns: string[]; base: string } | undefined {
  const file = readTsconfig(root, path);
  const own = strings(file.config[key]);
  if (own !== undefined) return { patterns: own, base: file.base };
  if (seen.has(path)) return undefined;
  for (const parent of strings(file.config['extends']) ?? []) {
    const target = extendsTarget(root, file.base, parent);
    const found = target === undefined ? undefined : inherited(root, target, key, new Set([...seen, path]));
    if (found !== undefined) return found;
  }
  return undefined;
}

function inspectTsconfig(root: string, path: string, allPaths: readonly string[], report: Report): void {
  const { config, base } = readTsconfig(root, path);
  const resolve = (pattern: string): string | undefined => resolveFrom(base, pattern, root);
  const extendedByOthers = allPaths.some(
    (other) => other !== path && (strings(readTsconfig(root, other).config['extends']) ?? []).some((value) => extendsTarget(root, folderOf(other), value) === path),
  );
  if (extendedByOthers && posix.basename(path) !== 'tsconfig.json') {
    report.notes.push(`note: ${path} is a base config; its include and exclude are read through the configs that extend it`);
  } else {
    const files = inherited(root, path, 'files');
    const include = inherited(root, path, 'include') ?? { patterns: files === undefined ? ['**/*'] : [], base };
    const exclude = inherited(root, path, 'exclude') ?? { patterns: [], base };
    const resolveAll = (set: { patterns: string[]; base: string }): string[] =>
      set.patterns.map((pattern) => resolveFrom(set.base, pattern, root)).filter((pattern): pattern is string => pattern !== undefined);
    const included = resolveAll(include);
    const excluded = resolveAll(exclude);
    const reached = TS_PROBES.find((probe) => included.some((pattern) => tsMatches(probe, pattern)) && !excluded.some((pattern) => tsMatches(probe, pattern)));
    if (reached !== undefined) {
      report.problems.push(`${path}: includes ${reached} (include ${JSON.stringify(include.patterns)}, exclude ${JSON.stringify(exclude.patterns)}); exclude company/**`);
    }
  }
  const intoCompany = (label: string, values: readonly string[]): void => {
    for (const value of values) {
      const resolved = resolve(value);
      if (resolved !== undefined && isInCompany(resolved)) report.problems.push(`${path}: ${label} "${value}" points into company/`);
    }
  };
  intoCompany('files entry', strings(config['files']) ?? []);
  intoCompany('extends', (strings(config['extends']) ?? []).filter((value) => value.startsWith('.') || value.startsWith('/')));
  const references = Array.isArray(config['references']) ? config['references'] : [];
  intoCompany('reference', references.map((reference) => String(record(reference)?.['path'] ?? '')));
  const options = record(config['compilerOptions']) ?? {};
  const baseUrl = typeof options['baseUrl'] === 'string' ? (resolve(options['baseUrl']) ?? base) : base;
  const mapped = Object.values(record(options['paths']) ?? {}).flatMap((targets) => strings(targets) ?? []);
  for (const target of mapped) {
    const resolved = resolveFrom(baseUrl, target, root);
    if (resolved !== undefined && isInCompany(resolved)) report.problems.push(`${path}: compilerOptions.paths maps an import to "${target}", inside company/`);
  }
  intoCompany('typeRoots entry', strings(options['typeRoots']) ?? []);
  intoCompany('rootDirs entry', strings(options['rootDirs']) ?? []);
  report.inspected.push(`tsconfig (${path})`);
}

// ---------------------------------------------------------------------------
// ESLint, asked through its own API.

async function inspectEslint(root: string, path: string, report: Report): Promise<void> {
  const { ESLint } = await import('eslint');
  const eslint = new ESLint({ cwd: root, overrideConfigFile: join(root, path) });
  for (const probe of TS_PROBES) {
    const file = join(root, probe);
    if (await eslint.isPathIgnored(file)) continue;
    if ((await eslint.calculateConfigForFile(file)) !== undefined) {
      report.problems.push(`${path}: ESLint would lint ${probe}; add company/** to globalIgnores`);
      return;
    }
  }
  report.inspected.push(`ESLint (${path})`);
}

// ---------------------------------------------------------------------------
// Vitest.

const VITEST_INCLUDE = ['**/*.{test,spec}.?(c|m)[jt]s?(x)'];
const VITEST_EXCLUDE = ['**/node_modules/**', '**/.git/**'];

function vitestReach(label: string, base: string, directory: unknown, include: readonly string[], exclude: readonly string[], report: Report): void {
  const scanRoot = resolveFrom(base, typeof directory === 'string' ? directory : '.');
  if (scanRoot === undefined) return;
  if (isInCompany(scanRoot)) {
    report.problems.push(`${label}: collects tests from ${scanRoot}, inside company/`);
    return;
  }
  for (const probe of TEST_PROBES) {
    if (scanRoot !== '' && !probe.startsWith(`${scanRoot}/`)) continue;
    const relative = scanRoot === '' ? probe : probe.slice(scanRoot.length + 1);
    if (include.some((pattern) => matches(relative, pattern)) && !exclude.some((pattern) => matches(relative, pattern))) {
      report.problems.push(`${label}: would collect ${probe} (include ${JSON.stringify(include)}); exclude company/**`);
      return;
    }
  }
}

async function inspectVitest(root: string, path: string, report: Report): Promise<void> {
  const config = record(await importDefault(root, path)) ?? {};
  const base = folderOf(path);
  const test = record(config['test']) ?? {};
  const rootInclude = strings(test['include']);
  const rootExclude = strings(test['exclude']);
  const rootDirectory = test['dir'] ?? test['root'];
  const projects = Array.isArray(test['projects']) ? test['projects'] : Array.isArray(test['workspace']) ? test['workspace'] : [];
  if (projects.length === 0) {
    vitestReach(path, base, rootDirectory, rootInclude ?? VITEST_INCLUDE, rootExclude ?? VITEST_EXCLUDE, report);
  }
  projects.forEach((project, position) => {
    if (typeof project === 'string') {
      const resolved = resolveFrom(base, project);
      if (resolved !== undefined && COMPANY_FILE_PROBES.some((probe) => matches(probe, resolved))) {
        report.problems.push(`${path}: project entry "${project}" reaches company/`);
      } else report.notes.push(`note: ${path}: project entry "${project}" is a path, not inspected here`);
      return;
    }
    const entry = record(project) ?? {};
    const projectTest = record(entry['test']) ?? {};
    const inherits = entry['extends'] === true;
    const name = typeof projectTest['name'] === 'string' ? projectTest['name'] : `#${position + 1}`;
    const include = strings(projectTest['include']) ?? (inherits ? rootInclude : undefined) ?? VITEST_INCLUDE;
    const exclude = [...(inherits ? (rootExclude ?? []) : []), ...(strings(projectTest['exclude']) ?? [])];
    const directory = projectTest['dir'] ?? projectTest['root'] ?? (inherits ? rootDirectory : undefined);
    vitestReach(`${path} project ${name}`, base, directory, include, exclude.length > 0 ? exclude : VITEST_EXCLUDE, report);
  });
  report.inspected.push(`Vitest (${path})`);
}

// ---------------------------------------------------------------------------
// Playwright.

const PLAYWRIGHT_MATCH = '**/*.@(spec|test).?(c|m)[jt]s?(x)';

function playwrightMatches(absolute: string, patterns: unknown): boolean {
  const list = Array.isArray(patterns) ? patterns : patterns === undefined ? [] : [patterns];
  return list.some((pattern) => {
    if (pattern instanceof RegExp) {
      pattern.lastIndex = 0;
      return pattern.test(absolute);
    }
    if (typeof pattern !== 'string') return false;
    return posix.matchesGlob(absolute, pattern.startsWith('**/') ? pattern : `**/${pattern}`);
  });
}

async function inspectPlaywright(root: string, path: string, report: Report): Promise<void> {
  const config = record(await importDefault(root, path)) ?? {};
  const base = folderOf(path);
  const projects = Array.isArray(config['projects']) && config['projects'].length > 0 ? config['projects'].map((project) => record(project) ?? {}) : [{}];
  const rootPosix = root.split('\\').join('/');
  projects.forEach((project, position) => {
    const label = typeof project['name'] === 'string' ? `${path} project ${project['name']}` : projects.length > 1 ? `${path} project #${position + 1}` : path;
    const testDir = resolveFrom(base, String(project['testDir'] ?? config['testDir'] ?? '.'), root);
    if (testDir === undefined) return;
    if (isInCompany(testDir)) {
      report.problems.push(`${label}: testDir ${testDir} is inside company/`);
      return;
    }
    if (!holdsCompany(testDir)) return;
    const testMatch = project['testMatch'] ?? config['testMatch'] ?? PLAYWRIGHT_MATCH;
    const testIgnore = project['testIgnore'] ?? config['testIgnore'];
    const reached = TEST_PROBES.find((probe) => {
      const absolute = posix.join(rootPosix, probe);
      return playwrightMatches(absolute, testMatch) && !playwrightMatches(absolute, testIgnore);
    });
    if (reached !== undefined) report.problems.push(`${label}: testDir holds company/ and would run ${reached}; add "**/company/**" to testIgnore`);
  });
  report.inspected.push(`Playwright (${path})`);
}

// ---------------------------------------------------------------------------
// Prettier.

function ignoreLineCovers(line: string, probe: string): boolean {
  const clean = cleanPattern(line.replace(/^\//, ''));
  if (clean === '') return false;
  if (!hasGlob(clean)) return probe === clean || probe.startsWith(`${clean}/`) || (!clean.includes('/') && probe.split('/').includes(clean));
  return posix.matchesGlob(probe, clean) || posix.matchesGlob(probe, `**/${clean}`);
}

function inspectPrettier(root: string, prettier: NonNullable<Targets['prettier']>, report: Report): void {
  if (prettier.configs.length === 0 && !prettier.dependency) {
    report.notes.push('note: Prettier is not used (no config file and no dependency)');
    return;
  }
  const ignorePath = join(root, prettier.ignoreFile);
  const lines = existsSync(ignorePath)
    ? readFileSync(ignorePath, 'utf8')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line !== '' && !line.startsWith('#') && !line.startsWith('!'))
    : [];
  const uncovered = COMPANY_FILE_PROBES.find((probe) => !lines.some((line) => ignoreLineCovers(line, probe)));
  if (uncovered !== undefined) {
    const used = prettier.configs.length > 0 ? prettier.configs.join(', ') : 'a prettier dependency';
    report.problems.push(`${prettier.ignoreFile}: Prettier is used (${used}) but does not ignore ${uncovered}; add company/`);
  }
  report.inspected.push('Prettier');
}

// ---------------------------------------------------------------------------
// dependency-cruiser.

const DEPCRUISE_BINARIES = /(^|\/)(depcruise|dependency-cruiser|dependency-cruise)$/;
const DEPCRUISE_VALUE_FLAGS = new Set([
  '--config', '-c', '--output-type', '-T', '--output-to', '-f', '--include-only', '-I', '--exclude', '-x', '--focus',
  '--focus-depth', '--reaches', '--highlight', '--collapse', '-S', '--do-not-follow', '-X', '--ts-config',
  '--webpack-config', '--babel-config', '--prefix', '-p', '--cache-strategy', '--max-depth', '-d', '--module-systems', '-M',
]);

function regexList(value: unknown): RegExp[] {
  const direct = strings(value);
  const nested = direct ?? strings(record(value)?.['path']);
  return (nested ?? []).map((source) => new RegExp(source));
}

function inspectDepcruise(root: string, depcruise: NonNullable<Targets['depcruise']>, report: Report): void {
  const require = createRequire(join(root, depcruise.config));
  const config = record(require(join(root, depcruise.config))) ?? {};
  const forbidden = Array.isArray(config['forbidden']) ? config['forbidden'].map((rule) => record(rule) ?? {}) : [];
  const guards = forbidden.some((rule) => {
    const from = record(rule['from']) ?? {};
    const everything = from['path'] === undefined && from['pathNot'] === undefined;
    return (rule['severity'] ?? 'warn') === 'error' && everything && regexList(record(rule['to'])?.['path']).some((pattern) => pattern.test(CHECK_PROBE));
  });
  if (!guards) report.problems.push(`${depcruise.config}: no rule of severity error forbids every file from importing company/ (to.path "^company/")`);

  const options = record(config['options']) ?? {};
  const exclude = regexList(options['exclude']);
  const includeOnly = regexList(options['includeOnly']);
  const shutOut = exclude.some((pattern) => pattern.test(CHECK_PROBE)) || (includeOnly.length > 0 && !includeOnly.some((pattern) => pattern.test(CHECK_PROBE)));
  for (const [name, script] of Object.entries(depcruise.scripts)) {
    for (const segment of commandSegments(script)) {
      const at = segment.tokens.findIndex((token) => DEPCRUISE_BINARIES.test(token));
      if (at < 0) continue;
      const roots: string[] = [];
      for (let position = at + 1; position < segment.tokens.length; position += 1) {
        const token = segment.tokens[position] ?? '';
        if (token.startsWith('-')) {
          if (DEPCRUISE_VALUE_FLAGS.has(token)) position += 1;
          continue;
        }
        roots.push(token);
      }
      for (const scanRoot of roots) {
        const resolved = resolveFrom(segment.cwd, scanRoot, root);
        if (resolved === undefined) continue;
        if (isInCompany(resolved)) report.problems.push(`package.json script "${name}": dependency-cruiser scans ${scanRoot}, inside company/`);
        else if (holdsCompany(resolved) && !shutOut) {
          report.problems.push(`package.json script "${name}": dependency-cruiser scans ${scanRoot}, which holds company/, and ${depcruise.config} does not exclude it`);
        }
      }
    }
  }
  report.inspected.push(`dependency-cruiser (${depcruise.config})`);
}

// ---------------------------------------------------------------------------
// Commands in package scripts and CI jobs.

interface Segment {
  readonly cwd: string;
  readonly tokens: readonly string[];
}

/** Splits a shell line into commands, following `cd` so later paths resolve from the right folder. */
export function commandSegments(script: string, startCwd = ''): Segment[] {
  let cwd = startCwd;
  const segments: Segment[] = [];
  for (const part of script.split(/&&|\|\||;|\n/)) {
    const tokens = part
      .trim()
      .split(/\s+/)
      .filter((token) => token !== '')
      .map((token) => token.replace(/^['"]|['"]$/g, ''));
    if (tokens.length === 0) continue;
    if (tokens[0] === 'cd' && tokens[1] !== undefined) {
      cwd = resolveFrom(cwd, tokens[1]) ?? cwd;
      continue;
    }
    segments.push({ cwd, tokens });
  }
  return segments;
}

const EXCLUDING_FLAG = /exclude|ignore|deny|not/i;
const PYTHON_TOOLS = new Set(['ruff', 'pytest', 'py.test']);

interface PythonGuards {
  ruff: boolean;
  pytest: boolean;
}

function inspectCommands(label: string, script: string, guards: PythonGuards, report: Report): void {
  for (const segment of commandSegments(script)) {
    segment.tokens.forEach((token, position) => {
      if (position === 0 || token.startsWith('-') || token.startsWith('$') || /^https?:/.test(token)) return;
      const previous = segment.tokens[position - 1] ?? '';
      if (previous.startsWith('-') && EXCLUDING_FLAG.test(previous)) return;
      const resolved = resolveFrom(segment.cwd, token);
      if (resolved !== undefined && isInCompany(resolved)) {
        report.problems.push(`${label}: "${segment.tokens.join(' ')}" names ${token}, inside company/`);
      }
    });
    const tool = segment.tokens.findIndex((token) => PYTHON_TOOLS.has(posix.basename(token)));
    if (tool < 0) continue;
    const name = posix.basename(segment.tokens[tool] ?? '') === 'ruff' ? 'ruff' : 'pytest';
    const rest = segment.tokens.slice(tool + 1).filter((token) => !token.startsWith('-'));
    const paths = (name === 'ruff' ? rest.slice(1) : rest).filter((token) => !/[=:]/.test(token));
    for (const path of paths.length > 0 ? paths : ['.']) {
      const resolved = resolveFrom(segment.cwd, path);
      if (resolved !== undefined && holdsCompany(resolved) && !guards[name]) {
        report.problems.push(`${label}: "${segment.tokens.join(' ')}" runs ${name} over the repository root, and no root ${name} config excludes company/`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// ruff and pytest configs.

function excludesCompany(patterns: readonly string[]): boolean {
  return patterns.some((pattern) => ignoreLineCovers(pattern, 'company/tools/script.py'));
}

function inspectPython(root: string, configs: NonNullable<Targets['pythonConfigs']>, report: Report): PythonGuards {
  const guards: PythonGuards = { ruff: false, pytest: false };
  for (const { path, kind } of configs) {
    const text = readText(root, path);
    const tables: Tables = kind === 'pyproject' || kind === 'ruff' ? parseTomlSubset(text) : parseIni(text);
    const base = folderOf(path);
    const atRoot = holdsCompany(base);
    const ruff = kind === 'pyproject' ? tables['tool.ruff'] : kind === 'ruff' ? tables[''] : undefined;
    if (ruff !== undefined && (kind === 'ruff' || Object.keys(ruff).length > 0)) {
      const excluded = [...listOf(ruff['exclude']), ...listOf(ruff['extend-exclude'])];
      for (const key of ['include', 'extend-include', 'src']) {
        for (const entry of listOf(ruff[key])) {
          const resolved = resolveFrom(base, entry);
          if (resolved !== undefined && isInCompany(resolved)) report.problems.push(`${path}: ruff ${key} "${entry}" points into company/`);
        }
      }
      if (atRoot && !excludesCompany(excluded)) report.problems.push(`${path}: a ruff config at the repository root that does not exclude company (add it to extend-exclude)`);
      if (atRoot && excludesCompany(excluded)) guards.ruff = true;
      report.inspected.push(`ruff (${path})`);
    }
    const pytest =
      kind === 'pyproject' ? tables['tool.pytest.ini_options'] : kind === 'setup-cfg' ? tables['tool:pytest'] : kind === 'ruff' ? undefined : tables['pytest'];
    if (pytest !== undefined) {
      const testpaths = listOf(pytest['testpaths']);
      const norecurse = listOf(pytest['norecursedirs']);
      for (const entry of listOf(pytest['pythonpath'])) {
        const resolved = resolveFrom(base, entry);
        if (resolved !== undefined && isInCompany(resolved)) report.problems.push(`${path}: pytest pythonpath "${entry}" points into company/`);
      }
      const starts = testpaths.length > 0 ? testpaths : ['.'];
      const covered = norecurse.some((pattern) => ignoreLineCovers(pattern, 'company/tools/tests/test_script.py'));
      for (const entry of starts) {
        const resolved = resolveFrom(base, entry);
        if (resolved === undefined) continue;
        if (isInCompany(resolved)) report.problems.push(`${path}: pytest testpaths "${entry}" points into company/`);
        else if (holdsCompany(resolved) && !covered) {
          report.problems.push(`${path}: pytest collects from ${entry === '.' && testpaths.length === 0 ? 'the repository root (no testpaths)' : `"${entry}"`}, which holds company/, and norecursedirs does not name it`);
        }
      }
      // A command that names the root overrides testpaths, so only norecursedirs guards it.
      if (atRoot && covered) guards.pytest = true;
      report.inspected.push(`pytest (${path})`);
    }
  }
  return guards;
}

// ---------------------------------------------------------------------------
// Tailwind.

function inspectCss(root: string, path: string, report: Report): void {
  const text = readText(root, path);
  const imports = [...text.matchAll(/@import\s+['"]tailwindcss['"]([^;]*);/g)];
  const legacy = /@tailwind\s+(base|components|utilities)/.test(text);
  if (imports.length === 0 && !legacy) return;
  const base = folderOf(path);
  if (legacy) report.problems.push(`${path}: Tailwind v3 directives take their sources from a JavaScript config this check does not read; use @import "tailwindcss" source(none) and @source lines`);
  const sources: string[] = [];
  const excluded: string[] = [];
  for (const match of imports) {
    const source = /source\(\s*(?:(none)|['"]([^'"]+)['"])\s*\)/.exec(match[1] ?? '');
    if (source === null) report.problems.push(`${path}: @import "tailwindcss" detects sources automatically; add source(none) and list @source paths`);
    else if (source[2] !== undefined) sources.push(source[2]);
  }
  for (const match of text.matchAll(/@source\s+(not\s+)?(inline\()?\s*['"]([^'"]+)['"]/g)) {
    if (match[2] !== undefined) continue;
    (match[1] === undefined ? sources : excluded).push(match[3] ?? '');
  }
  const not = excluded.map((entry) => resolveFrom(base, entry, root)).filter((entry): entry is string => entry !== undefined);
  for (const entry of sources) {
    const resolved = resolveFrom(base, entry, root);
    if (resolved === undefined) continue;
    const reached = COMPANY_FILE_PROBES.find((probe) => matches(probe, resolved) && !not.some((pattern) => matches(probe, pattern)));
    if (reached !== undefined) report.problems.push(`${path}: Tailwind source "${entry}" reaches ${reached}; narrow it or add @source not for company/`);
  }
  report.inspected.push(`Tailwind (${path})`);
}

// ---------------------------------------------------------------------------
// Vite dev server.

async function inspectVite(root: string, path: string, report: Report): Promise<void> {
  const config = record(await importDefault(root, path)) ?? {};
  const base = folderOf(path);
  const viteRoot = resolveFrom(base, typeof config['root'] === 'string' ? config['root'] : '.', root) ?? base;
  if (isInCompany(viteRoot)) report.problems.push(`${path}: root is inside company/`);
  for (const key of ['publicDir', 'cacheDir', 'envDir']) {
    const value = config[key];
    const resolved = typeof value === 'string' ? resolveFrom(viteRoot, value, root) : undefined;
    if (resolved !== undefined && isInCompany(resolved)) report.problems.push(`${path}: ${key} points into company/`);
  }
  const fs = record(record(config['server'])?.['fs']) ?? {};
  const allow = strings(fs['allow']);
  const deny = strings(fs['deny']) ?? [];
  const rootPosix = root.split('\\').join('/');
  const denied = COMPANY_FILE_PROBES.every((probe) => {
    const absolute = posix.join(rootPosix, probe);
    return deny.some((pattern) => (pattern.includes('/') ? posix.matchesGlob(absolute, pattern) : posix.matchesGlob(posix.basename(absolute), pattern)));
  });
  const allowed = (allow ?? []).map((entry) => resolveFrom(viteRoot, entry, root)).filter((entry): entry is string => entry !== undefined);
  if (allowed.some(isInCompany)) report.problems.push(`${path}: server.fs.allow lists a folder inside company/`);
  // With no allow list, Vite serves the whole workspace root, which holds company/.
  const reachable = fs['strict'] === false || allow === undefined || allowed.some(holdsCompany);
  if (reachable && !denied) report.problems.push(`${path}: the dev server can serve files under company/; add "**/company/**" to server.fs.deny`);
  report.inspected.push(`Vite (${path})`);
}

// ---------------------------------------------------------------------------
// GitLab CI.

function inspectCi(root: string, path: string, guards: PythonGuards, report: Report, seen: Set<string>): void {
  if (seen.has(path)) return;
  seen.add(path);
  const document: unknown = parseYaml(readText(root, path), { merge: true });
  const walk = (value: unknown, trail: readonly string[]): void => {
    if (Array.isArray(value)) {
      value.forEach((item, position) => walk(item, [...trail, String(position)]));
      return;
    }
    const object = record(value);
    if (object === undefined) return;
    for (const [key, child] of Object.entries(object)) {
      const here = [...trail, key];
      if (key === 'changes' && !trail.includes('except') && object['when'] !== 'never') {
        const patterns = strings(child) ?? strings(record(child)?.['paths']) ?? [];
        for (const pattern of patterns) {
          const reached = COMPANY_FILE_PROBES.find((probe) => matches(probe, pattern));
          if (reached !== undefined) report.problems.push(`${path}: ${here.join('.')} pattern "${pattern}" matches ${reached}, so a change to company/ starts a pipeline`);
        }
      } else if (key === 'script' || key === 'before_script' || key === 'after_script') {
        const lines = strings(child);
        if (lines !== undefined) inspectCommands(`${path} ${here.join('.')}`, lines.join(' && '), guards, report);
      } else if (key === 'include') {
        const includes = Array.isArray(child) ? child : [child];
        for (const include of includes) {
          const local = typeof include === 'string' ? include : record(include)?.['local'];
          if (typeof local === 'string' && !/^https?:/.test(local)) {
            const resolved = resolveFrom('', local.replace(/^\//, ''));
            if (resolved !== undefined && existsSync(join(root, resolved))) inspectCi(root, resolved, guards, report, seen);
          }
        }
      }
      walk(child, here);
    }
  };
  walk(document, []);
  report.inspected.push(`CI (${path})`);
}

// ---------------------------------------------------------------------------
// The checks' shared scan roots.

function stringArrayOf(root: string, path: string, name: string): string[] | undefined {
  const file = ts.createSourceFile(path, readText(root, path), ts.ScriptTarget.Latest, true);
  let found: string[] | undefined;
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name && node.initializer !== undefined) {
      let initializer: ts.Expression = node.initializer;
      while (ts.isAsExpression(initializer) || ts.isSatisfiesExpression(initializer) || ts.isParenthesizedExpression(initializer)) initializer = initializer.expression;
      if (ts.isArrayLiteralExpression(initializer)) {
        found = initializer.elements.filter((element): element is ts.StringLiteral => ts.isStringLiteral(element)).map((element) => element.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

const SCANS_TREE = [
  /from\s+['"](?:tinyglobby|fast-glob|globby|glob|fdir)['"]/,
  /\b(?:fs\.)?glob(?:Sync)?\s*\(/,
  /readdir(?:Sync)?\([^)]*recursive\s*:\s*true/,
];

function inspectCheckScanRoots(root: string, scan: NonNullable<Targets['checkScanRoots']>, report: Report): void {
  const ignores = stringArrayOf(root, scan.lib, 'DEFAULT_IGNORES');
  if (ignores === undefined) report.problems.push(`${scan.lib}: no DEFAULT_IGNORES list of string patterns`);
  else {
    const open = COMPANY_FILE_PROBES.find((probe) => !ignores.some((pattern) => matches(probe, pattern)));
    if (open !== undefined) report.problems.push(`${scan.lib}: DEFAULT_IGNORES does not ignore ${open}, so check scan roots reach company/`);
  }
  for (const source of scan.sources) {
    const text = readText(root, source);
    if (SCANS_TREE.some((pattern) => pattern.test(text)) && !/DEFAULT_IGNORES|company/.test(text)) {
      report.problems.push(`${source}: scans files without the shared DEFAULT_IGNORES or an explicit company/ ignore (use listFiles from lib.ts)`);
    }
  }
  report.inspected.push(`check scan roots (${scan.lib} and ${scan.sources.length} check sources)`);
}

// ---------------------------------------------------------------------------

/** Runs every inspector on the targets. An inspector that cannot read its config reports that as a problem. */
export async function inspectAll(targets: Targets): Promise<Report> {
  const report: Report = { problems: [], notes: [], inspected: [] };
  const root = targets.root;
  const guarded = async (label: string, run: () => void | Promise<void>): Promise<void> => {
    try {
      await run();
    } catch (error) {
      report.problems.push(`${label}: could not be inspected: ${describeError(error)}`);
    }
  };
  for (const path of targets.workspaceFiles ?? []) await guarded(path, () => inspectWorkspaceFile(root, path, report));
  for (const path of targets.packageJsons ?? []) await guarded(path, () => inspectPackageJson(root, path, report));
  for (const path of targets.tsconfigs ?? []) await guarded(path, () => inspectTsconfig(root, path, targets.tsconfigs ?? [], report));
  for (const path of targets.eslintConfigs ?? []) await guarded(path, () => inspectEslint(root, path, report));
  for (const path of targets.vitestConfigs ?? []) await guarded(path, () => inspectVitest(root, path, report));
  for (const path of targets.playwrightConfigs ?? []) await guarded(path, () => inspectPlaywright(root, path, report));
  if (targets.prettier !== undefined) {
    const prettier = targets.prettier;
    await guarded('Prettier', () => inspectPrettier(root, prettier, report));
  }
  if (targets.depcruise !== undefined) {
    const depcruise = targets.depcruise;
    await guarded(depcruise.config, () => inspectDepcruise(root, depcruise, report));
  }
  let guards: PythonGuards = { ruff: false, pytest: false };
  if (targets.pythonConfigs !== undefined) {
    const configs = targets.pythonConfigs;
    await guarded('Python configs', () => {
      guards = inspectPython(root, configs, report);
    });
  }
  for (const [name, script] of Object.entries(targets.scripts ?? {})) {
    await guarded(`package.json script "${name}"`, () => inspectCommands(`package.json script "${name}"`, script, guards, report));
  }
  for (const path of targets.cssFiles ?? []) await guarded(path, () => inspectCss(root, path, report));
  for (const path of targets.viteConfigs ?? []) await guarded(path, () => inspectVite(root, path, report));
  const seen = new Set<string>();
  for (const path of targets.ciFiles ?? []) await guarded(path, () => inspectCi(root, path, guards, report, seen));
  if (targets.checkScanRoots !== undefined) {
    const scan = targets.checkScanRoots;
    await guarded(scan.lib, () => inspectCheckScanRoots(root, scan, report));
  }
  return report;
}

/** The report as a check result. */
export function toCheckResult(report: Report, label?: string): CheckResult {
  const prefix = label === undefined ? '' : `[${label}] `;
  const scope = `${report.inspected.length} configs inspected`;
  if (report.problems.length === 0) {
    return pass(NAME, `${prefix}no config reaches company/ (${scope})`, [...report.inspected.map((item) => `inspected: ${item}`), ...report.notes]);
  }
  return fail(NAME, `${prefix}${report.problems.length} findings of a config, script or scan root that reaches company/ (${scope})`, [
    ...report.problems,
    ...report.notes,
  ]);
}
