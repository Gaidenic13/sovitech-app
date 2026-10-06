/**
 * The hash manifest of formula bodies (prompt 3 section 6: "a hash manifest"; guardrails 2.4 "Formula versions are
 * immutable"; G9-11; docs/adr/0047). Reached through `@sovitech/engine/manifest` only (the engine's entry for its
 * manifest check, read by tests): it parses source with the TypeScript compiler, which the engine's run never loads.
 *
 * Every production body lives in its own file, `src/bodies/<id>@<version>.ts`, and `manifest.json` holds, for each
 * `<id>@<version>`, the SHA-256 of that body together with everything it loads for its values, transitively
 * (`bodyHashInputOf`). The closure fails closed (phase 5 part B, V-7; closed for good after the final verification):
 * - every import and export-from is found by the TypeScript parser (`valueImportsOf`), however the statements are laid
 *   out: two on one line, one split over lines, after a comment;
 * - an `import()` or a `require()` whose specifier is not a plain string literal (a template literal, a variable, a
 *   computed name), `require` used in any other way, or a source that does not parse fails the check;
 * - a relative import is resolved to its file and hashed with it (its path, its length and its bytes); an import that
 *   names no file fails the check;
 * - an import by name (a package) passes only when the import policy names it: production allows `decimal.js` alone
 *   (`PRODUCTION_IMPORT_POLICY`; a body's exact arithmetic through `../interval`), pinned by its exact version in
 *   `pnpm-lock.yaml` for the package that imports it, and that version is part of the hash input; a package with no
 *   exact locked version (a workspace `link:`, a range, no entry) fails the check, and so does every other name;
 * - `import type` and `export type` load nothing at run time and are left out (an `import { type X }` still loads its
 *   module and is kept).
 * So a helper, or the locked version of the one allowed package, cannot change under the same formula version, and an
 * import the hash cannot cover fails the check, never passes it. TEST bodies use their own policy
 * (`packages/engine/test-formulas/engine.ts` `TEST_IMPORT_POLICY`), which also names imports no locked version pins and
 * records them in the hash input by name only (`unhashed`): TEST only, each with its reason.
 *
 * `checkManifest` (run by the engine's unit test, src/manifest.test.ts, over the production files, and by case G9-11
 * over the TEST files) fails when:
 * - a body file has no manifest entry, or an entry has no file;
 * - a file's hash differs from its entry (a body changed without a new version);
 * - an entry names a formula the registry does not declare, or (in the production manifest) a TEST id, or (in the TEST
 *   manifest) an id without "TEST";
 * - a catalogue formula carries a body whose file is not in the bodies folder (`bodiesInCatalogue` names the refs of the
 *   catalogue's formulas that carry a body).
 * The production manifest is empty in phase 5: no production body exists (catalogue.ts). TEST bodies have their own
 * manifest, `packages/engine/test-formulas/test-manifest.json`, over `packages/engine/test-formulas/bodies/`, and are
 * checked the same way inside the test runner.
 */
import { createHash } from 'node:crypto';
import { posix } from 'node:path';
import ts from 'typescript';

/** `<id>@<version>` to `sha256:<hex>` of the body's hash input (`bodyHashInputOf`). */
export type FormulaManifest = Readonly<Record<string, string>>;

/** Reads a source file by its path from the repository root (POSIX separators), or answers undefined when there is none. */
export type SourceReader = (path: string) => Uint8Array | undefined;

/**
 * Which imports by name a body's closure may hold. Any other one fails the check.
 * - `locked`: packages pinned by their exact version in `pnpm-lock.yaml` (the version locked for the package whose
 *   file imports them); each version is part of the hash input, as `package:<name>@<version>`.
 * - `unhashed` (TEST only): import specifiers no locked version pins, each with the reason it may stand; recorded in
 *   the hash input by name only, as `unhashed:<specifier>`, so adding or removing one moves the hash while what is
 *   inside it is not covered.
 */
export interface ImportPolicy {
  readonly locked: readonly string[];
  readonly unhashed?: Readonly<Record<string, string>>;
}

/** Production bodies: `decimal.js` alone, by its locked version (the engine's exact intervals, ADR 0047 decision 4). */
export const PRODUCTION_IMPORT_POLICY: ImportPolicy = Object.freeze({ locked: Object.freeze(['decimal.js']) });

/** The lockfile the locked versions are read from, by its path from the repository root. */
export const LOCKFILE_PATH = 'pnpm-lock.yaml';

/** A closure that cannot be covered: the check fails. */
function uncovered(message: string): RangeError {
  return new RangeError(`@sovitech/engine: ${message}; the hash cannot cover it, so the manifest check fails`);
}

/** Whether a module specifier is relative (`./x`, `../y`). */
function isRelative(specifier: string): boolean {
  return specifier === '.' || specifier === '..' || specifier.startsWith('./') || specifier.startsWith('../');
}

/**
 * The modules a source loads for their values, as written (`./x`, `../y`, `decimal.js`), in order of first appearance,
 * found by the TypeScript parser: every `import … from`, `import '…'`, `export … from`, `import x = require('…')`,
 * `import('…')` and `require('…')`. `import type`, `export type` and type positions (`import('./x').T`) load nothing at
 * run time and are left out; an `import { type X }` still loads its module and is kept. Throws (the check fails) when
 * the source does not parse, when an `import()` or a `require()` names its module by anything but a plain string
 * literal, or when `require` appears other than as such a call (an alias, `module.require`, `require.resolve`).
 */
export function valueImportsOf(path: string, source: string): readonly string[] {
  const kind = path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, false, kind);
  const found: string[] = [];
  const literalOf = (node: ts.Node | undefined, what: string): string => {
    if (node === undefined || !ts.isStringLiteral(node)) throw uncovered(`${path} names the module of ${what} by something other than a plain string literal`);
    return node.text;
  };
  const visit = (node: ts.Node): void => {
    if ((node.flags & ts.NodeFlags.ThisNodeHasError) !== 0) throw uncovered(`${path} does not parse`);
    if (ts.isImportDeclaration(node)) {
      const specifier = literalOf(node.moduleSpecifier, 'an import');
      if (node.importClause?.isTypeOnly !== true) found.push(specifier);
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined) {
      const specifier = literalOf(node.moduleSpecifier, 'an export');
      if (!node.isTypeOnly) found.push(specifier);
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      const specifier = literalOf(node.moduleReference.expression, 'an import = require()');
      if (!node.isTypeOnly) found.push(specifier);
      return;
    } else if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const isImport = callee.kind === ts.SyntaxKind.ImportKeyword;
      if (isImport || (ts.isIdentifier(callee) && callee.text === 'require')) {
        found.push(literalOf(node.arguments[0], isImport ? 'an import()' : 'a require()'));
        // The callee is the loader itself, not a use of `require` to refuse; the other arguments are read as code.
        for (const argument of node.arguments.slice(1)) visit(argument);
        return;
      }
    } else if (ts.isIdentifier(node) && node.text === 'require') {
      throw uncovered(`${path} uses require other than as a call with a plain string literal`);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return [...new Set(found)];
}

/** The file a relative specifier names from `from`, as the TypeScript resolver finds it: the path itself, `.ts`, `.tsx` or `/index.ts`. */
function resolveImport(from: string, specifier: string, read: SourceReader): string {
  const base = posix.normalize(posix.join(posix.dirname(from), specifier));
  if (base.startsWith('../') || base === '..' || posix.isAbsolute(base)) throw uncovered(`${from} imports ${specifier}, outside the repository`);
  const tries = /\.(?:ts|tsx|json)$/u.test(base) ? [base] : /\.js$/u.test(base) ? [base.replace(/\.js$/u, '.ts'), base] : [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`];
  const found = tries.find((path) => read(path) !== undefined);
  if (found === undefined) throw uncovered(`${from} imports ${specifier}, which names no file`);
  return found;
}

/** The package an import by name loads: `@scope/name` of `@scope/name/sub`, `name` of `name/sub`, `node:fs` of itself. */
export function packageNameOf(specifier: string): string {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : (parts[0] ?? specifier);
}

/** The workspace package a file belongs to, as `pnpm-lock.yaml`'s importers name it: the folder of its nearest package.json (`.` for the root). */
function importerOf(path: string, read: SourceReader): string {
  for (let folder = posix.dirname(path); ; folder = posix.dirname(folder)) {
    if (read(folder === '.' ? 'package.json' : `${folder}/package.json`) !== undefined) return folder;
    if (folder === '.' || folder === '/' || folder === '') throw uncovered(`${path} belongs to no package.json`);
  }
}

/** An exact version as pnpm locks it: `10.6.0`, a pre-release, and a peer suffix such as `(supports-color@7.2.0)`; never a range or a `link:`. */
const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?(?:\([^()\s]+\))*$/u;

/** A YAML key as pnpm writes it: bare, or in single or double quotes. */
function unquoted(key: string): string {
  const trimmed = key.trim();
  return /^(['"]).*\1$/u.test(trimmed) ? trimmed.slice(1, -1) : trimmed;
}

/**
 * The version `pnpm-lock.yaml` locks for `name` in the importer `importer` (its `dependencies`, `devDependencies` or
 * `optionalDependencies`), or undefined when it locks none, or more than one. Read line by line from pnpm's layout (every
 * `importers:` section of every document of the file), so nothing beyond the lockfile's own text is trusted.
 */
export function lockedVersionOf(lockfile: string, importer: string, name: string): string | undefined {
  const versions = new Set<string>();
  let inImporters = false;
  let current: { importer?: string; kind?: string; dependency?: string } = {};
  for (const line of lockfile.split(/\r?\n/u)) {
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
    const indent = line.length - line.trimStart().length;
    if (indent === 0) {
      inImporters = line === 'importers:';
      current = {};
      continue;
    }
    if (!inImporters) continue;
    const entry = /^\s*([^:]+|'[^']*'|"[^"]*"):(?:\s+(.*))?$/u.exec(line);
    if (entry === null) continue;
    const key = unquoted(entry[1] ?? '');
    if (indent === 2) current = { importer: key };
    else if (indent === 4) current = { ...(current.importer === undefined ? {} : { importer: current.importer }), kind: key };
    else if (indent === 6) current = { ...current, dependency: key };
    else if (indent === 8 && key === 'version' && current.importer === importer && current.dependency === name && ['dependencies', 'devDependencies', 'optionalDependencies'].includes(current.kind ?? '')) {
      versions.add(unquoted(entry[2] ?? ''));
    }
  }
  return versions.size === 1 ? [...versions][0] : undefined;
}

/** What a body's hash covers: the files it loads (sorted paths), the packages pinned by their locked versions, and the TEST policy's unhashed names. */
export interface BodyClosure {
  readonly files: readonly string[];
  /** `<name>@<version>` of each allowed package the closure imports, as `pnpm-lock.yaml` locks it, sorted. */
  readonly packages: readonly string[];
  /** The specifiers the policy lets stand unhashed (TEST only), sorted. */
  readonly unhashed: readonly string[];
}

/**
 * A body file and everything it loads for its values, transitively (`valueImportsOf`): its files by path from the
 * repository root, the allowed packages by their locked versions, and the policy's unhashed names. Throws when the
 * closure holds anything the hash cannot cover (an import naming no file, a package the policy does not name or no exact
 * locked version pins, a computed import or require, a source that does not parse): the check fails, never passes.
 */
export function bodyClosureDetailsOf(bodyPath: string, read: SourceReader, policy: ImportPolicy = PRODUCTION_IMPORT_POLICY): BodyClosure {
  const seen = new Set<string>();
  const packages = new Set<string>();
  const unhashed = new Set<string>();
  const queue = [posix.normalize(bodyPath)];
  let lockfile: string | undefined;
  for (let path = queue.shift(); path !== undefined; path = queue.shift()) {
    if (seen.has(path)) continue;
    const bytes = read(path);
    if (bytes === undefined) throw uncovered(`no file ${path}`);
    seen.add(path);
    if (!/\.(?:ts|tsx)$/u.test(path)) continue;
    for (const specifier of valueImportsOf(path, new TextDecoder().decode(bytes))) {
      if (isRelative(specifier)) {
        queue.push(resolveImport(path, specifier, read));
        continue;
      }
      const name = packageNameOf(specifier);
      if (policy.locked.includes(name)) {
        if (lockfile === undefined) {
          const lock = read(LOCKFILE_PATH);
          if (lock === undefined) throw uncovered(`${path} imports ${specifier}, and there is no ${LOCKFILE_PATH} to read its version from`);
          lockfile = new TextDecoder().decode(lock);
        }
        const importer = importerOf(path, read);
        const version = lockedVersionOf(lockfile, importer, name);
        if (version === undefined || !EXACT_VERSION.test(version)) {
          throw uncovered(`${path} imports ${specifier}, which ${LOCKFILE_PATH} does not lock at a single release version for ${importer} (${version ?? 'no entry'})`);
        }
        packages.add(`${name}@${version}`);
      } else if (policy.unhashed !== undefined && Object.hasOwn(policy.unhashed, specifier)) {
        unhashed.add(specifier);
      } else {
        throw uncovered(`${path} imports ${specifier} by name, which the import policy does not allow`);
      }
    }
  }
  return { files: [...seen].sort(), packages: [...packages].sort(), unhashed: [...unhashed].sort() };
}

/** The files of a body's closure (`bodyClosureDetailsOf`), by path from the repository root, sorted. Throws as it does. */
export function bodyClosureOf(bodyPath: string, read: SourceReader, policy: ImportPolicy = PRODUCTION_IMPORT_POLICY): readonly string[] {
  return bodyClosureDetailsOf(bodyPath, read, policy).files;
}

/**
 * What the manifest hashes for a body (`bodyClosureDetailsOf`): each file of its closure, sorted by path, as
 * `<path>\n<length>\n<bytes>\n`; then each allowed package as `package:<name>@<version>\n`; then each unhashed name
 * (TEST only) as `unhashed:<specifier>\n`.
 */
export function bodyHashInputOf(bodyPath: string, read: SourceReader, policy: ImportPolicy = PRODUCTION_IMPORT_POLICY): Uint8Array {
  const encoder = new TextEncoder();
  const closure = bodyClosureDetailsOf(bodyPath, read, policy);
  const chunks: Uint8Array[] = [];
  for (const path of closure.files) {
    const bytes = read(path) ?? new Uint8Array();
    chunks.push(encoder.encode(`${path}\n${String(bytes.length)}\n`), bytes, encoder.encode('\n'));
  }
  for (const pinned of closure.packages) chunks.push(encoder.encode(`package:${pinned}\n`));
  for (const name of closure.unhashed) chunks.push(encoder.encode(`unhashed:${name}\n`));
  const total = chunks.reduce((length, chunk) => length + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/**
 * The hash input of every body file in a folder (`<folder>/<id>@<version>.ts`, by path from the repository root), by
 * `<id>@<version>`: what `checkManifest` reads as `bodyFiles`.
 */
export function bodyFilesOf(folder: string, fileNames: readonly string[], read: SourceReader, policy: ImportPolicy = PRODUCTION_IMPORT_POLICY): ReadonlyMap<string, Uint8Array> {
  return new Map(
    fileNames
      .filter((name) => name.endsWith('.ts'))
      .map((name) => [name.slice(0, -'.ts'.length), bodyHashInputOf(posix.join(folder, name), read, policy)] as const),
  );
}

export interface ManifestProblem {
  readonly formula: string;
  readonly problem: 'no_entry' | 'no_file' | 'hash_differs' | 'undeclared' | 'test_id' | 'body_outside_bodies';
}

/** `sha256:<hex>` of a body's hash input (`bodyHashInputOf`), as the manifest records it. */
export function bodyHashOf(bytes: Uint8Array): string {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

/** The body file name of a formula ref (`<id>@<version>.ts`). */
export function bodyFileOf(ref: string): string {
  return `${ref}.ts`;
}

/** The problems of a manifest against the bodies' hash inputs (`bodyFilesOf`, by `<id>@<version>`) and the declared formula refs. */
export function checkManifest(input: {
  readonly manifest: FormulaManifest;
  readonly bodyFiles: ReadonlyMap<string, Uint8Array>;
  readonly declared: ReadonlySet<string>;
  /** `production` (the default) refuses a TEST id; `test` refuses an id without "TEST". */
  readonly kind?: 'production' | 'test';
  /** The refs of the catalogue's formulas that carry a body. */
  readonly bodiesInCatalogue?: ReadonlySet<string>;
}): readonly ManifestProblem[] {
  const kind = input.kind ?? 'production';
  const problems: ManifestProblem[] = [];
  const refs = [...new Set([...Object.keys(input.manifest), ...input.bodyFiles.keys(), ...(input.bodiesInCatalogue ?? [])])].sort();
  for (const ref of refs) {
    const entry = Object.hasOwn(input.manifest, ref) ? input.manifest[ref] : undefined;
    const bytes = input.bodyFiles.get(ref);
    const isTest = ref.includes('TEST');
    if (kind === 'production' && isTest) problems.push({ formula: ref, problem: 'test_id' });
    if (kind === 'test' && !isTest) problems.push({ formula: ref, problem: 'test_id' });
    if (!input.declared.has(ref)) problems.push({ formula: ref, problem: 'undeclared' });
    if (input.bodiesInCatalogue?.has(ref) === true && bytes === undefined) problems.push({ formula: ref, problem: 'body_outside_bodies' });
    if (bytes !== undefined && entry === undefined) problems.push({ formula: ref, problem: 'no_entry' });
    if (entry !== undefined && bytes === undefined) problems.push({ formula: ref, problem: 'no_file' });
    if (entry !== undefined && bytes !== undefined && bodyHashOf(bytes) !== entry) problems.push({ formula: ref, problem: 'hash_differs' });
  }
  return problems;
}
