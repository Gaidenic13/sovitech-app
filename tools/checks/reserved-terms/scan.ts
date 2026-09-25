/**
 * The reserved-term check: every copy unit in the scanned files is matched
 * against the one list of docs/guardrails.md 2.8, and the list itself is
 * compared with 2.8 so it cannot drift. A scan with nothing to read fails: each
 * required include root and each registered catalogue must match a file, and
 * at least one copy unit must be read. A file in scope that the check cannot
 * read fails too, unless a reviewed non-copy entry (non-copy.ts) names it.
 *
 * Allowances hold only where their registries define their text (phase 1 review,
 * adversarial finding 12): a copy unit in a file under `allowanceScope` (the copy
 * registries, COPY_REGISTRIES) is matched with the registered allowances as their
 * definition; every other copy unit is matched with none, so "Verified by SOVITECH",
 * "Confirmed by you" or "Formal quotation" written anywhere else in source (a screen,
 * an export template, a seed, a migration, a data file) is flagged. The app shows
 * those texts by taking them from the registries, never by writing them again.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  NO_ALLOWANCES,
  RESERVED_TERMS_EN,
  RESERVED_TERMS_RO,
  parseGuardrailsReservedTerms,
  scanCopy,
  type AllowanceSet,
} from '@sovitech/registry/reserved-terms';
import { fail, listFiles, pass } from '../lib';
import type { CheckResult } from '../types';
import type { StringCatalogue } from './catalogues';
import {
  ELEMENT_BREAK,
  closeKeyExposure,
  extractFromCatalogue,
  extractFromCss,
  extractFromData,
  extractFromHtml,
  extractFromScript,
  extractFromSql,
  extractFromText,
  extractFromTextTemplate,
  keyExposure,
  listDeclarations,
  type CopyUnit,
  type KeyExposure,
} from './extract';
import type { MachineKeyList } from './machine-keys';
import type { NonCopyEntry } from './non-copy';
import { scanGlobs } from '../scan-roots/roots';

export const NAME = 'reserved-terms';

/** The roots that must each match a file. */
const REQUIRED_ROOTS: readonly string[] = ['apps/**', 'packages/**'];

/**
 * What the check scans (prompt 3 sections 7 and 10: UI strings, templates and
 * seeds; build-readiness decision 12). `include` roots must each match a file;
 * `optional` roots (top-level seeds, migrations and templates) may not exist
 * yet. Since the phase 0 round 2 review the scope is all of apps/ and
 * packages/, not only their src folders, so templates, migrations and seeds
 * inside a package are read. The optional roots also hold every glob the
 * shared scan-roots list names for this check (tools/checks/scan-roots/roots.json,
 * scanGlobs('reserved-terms')), so a folder the list adds for it is read
 * without a change here; tools/checks/scan-roots/wiring.test.ts pins that.
 */
export const PHASE_0_SCOPE = {
  include: REQUIRED_ROOTS,
  optional: [
    ...new Set([
      'seed/**',
      'seeds/**',
      'migrations/**',
      'templates/**',
      ...scanGlobs('reserved-terms').filter((glob) => !REQUIRED_ROOTS.includes(glob)),
    ]),
  ],
  ignore: ['docs/**', '**/*.test.*', '**/*.spec.*', '**/__snapshots__/**'],
} as const;

/**
 * The copy registries: the one place in source where an allowance's text is written
 * (packages/registry/src/copy/: badges, status lines, generated sentences and the
 * allowances they need). Allowances apply to copy units there and nowhere else.
 */
export const COPY_REGISTRIES: readonly string[] = ['packages/registry/src/copy/**'];

/** The list's own definition: only these constants' initialisers are skipped, nothing else in the file. */
export const LIST_MODULE = {
  path: 'packages/registry/src/reserved-terms.ts',
  constants: ['RESERVED_TERMS_EN', 'RESERVED_TERMS_RO'],
} as const;

export interface ReservedTermScan {
  /** Absolute directory the globs are relative to. */
  readonly root: string;
  readonly include: readonly string[];
  /** Roots that may match no file yet. Omitted: none. */
  readonly optional?: readonly string[];
  readonly ignore: readonly string[];
  readonly catalogues: readonly StringCatalogue[];
  /** Builds the allowance set; may throw when an entry is invalid. */
  readonly allowances: () => AllowanceSet;
  /**
   * Globs (relative to `root`) of the copy registries, the only files whose copy units the
   * allowances apply to; every other unit is matched with none. Omitted or empty: the
   * allowances apply nowhere. Each glob must match a scanned file.
   */
  readonly allowanceScope?: readonly string[];
  readonly listModule: { readonly path: string; readonly constants: readonly string[] };
  /** Registered machine-key lists (machine-keys.ts). Omitted: none. */
  readonly machineKeyLists?: readonly MachineKeyList[];
  /** Reviewed files that hold no copy (non-copy.ts). Omitted: none. */
  readonly nonCopy?: readonly NonCopyEntry[];
  /** Path of docs/guardrails.md relative to `root`, for the drift check. Omitted: no drift check. */
  readonly guardrails?: string;
  /** Prefix for the summary, for example a seeded case id. */
  readonly label?: string;
}

/** The file types the check reads, by extension. Anything else in scope needs a non-copy entry or a catalogue. */
export const FILE_TYPES = {
  script: /\.(?:[cm]?[jt]sx?)$/i,
  markup: /\.(?:html?|svg|xhtml)$/i,
  css: /\.css$/i,
  json: /\.(?:json|jsonc|json5)$/i,
  yaml: /\.ya?ml$/i,
  sql: /\.(?:sql|psql|pgsql)$/i,
  template: /\.(?:hbs|handlebars|mustache|ejs|njk|nunjucks|liquid|jinja2?|j2|tmpl|tpl)$/i,
  text: /\.(?:md|markdown|txt)$/i,
} as const;

const SCRIPT = FILE_TYPES.script;

/** The copy unit around one match, with the match marked, on one line. */
function snippet(text: string, index: number, length: number): string {
  const clean = (part: string): string => part.split(ELEMENT_BREAK).join('<…>').replace(/\s+/g, ' ');
  const before = clean(text.slice(Math.max(0, index - 40), index));
  const after = clean(text.slice(index + length, index + length + 40));
  const head = index > 40 ? `...${before}` : before;
  const tail = index + length + 40 < text.length ? `${after}...` : after;
  return `${head}[[${clean(text.slice(index, index + length))}]]${tail}`.trim();
}

/** The copy units of one file, or undefined when the check cannot read its type. */
function unitsOf(
  path: string,
  source: string,
  listModule: ReservedTermScan['listModule'],
  machineKeyLists: ReadonlyMap<string, ReadonlySet<string>>,
  exposedNames: ReadonlySet<string>,
): CopyUnit[] | undefined {
  if (FILE_TYPES.script.test(path)) {
    const skip = new Set(path === listModule.path ? listModule.constants : []);
    return extractFromScript(path, source, skip, machineKeyLists.get(path) ?? new Set(), exposedNames);
  }
  if (FILE_TYPES.markup.test(path)) return extractFromHtml(source);
  if (FILE_TYPES.css.test(path)) return extractFromCss(source);
  if (FILE_TYPES.json.test(path)) return extractFromData(source, 'json');
  if (FILE_TYPES.yaml.test(path)) return extractFromData(source, 'yaml');
  if (FILE_TYPES.sql.test(path)) return extractFromSql(source);
  if (FILE_TYPES.template.test(path)) return extractFromTextTemplate(source);
  if (FILE_TYPES.text.test(path)) return extractFromText(source);
  return undefined;
}

function listDrift(root: string, guardrails: string): string[] {
  let parsed: { en: string[]; ro: string[] };
  try {
    parsed = parseGuardrailsReservedTerms(readFileSync(join(root, guardrails), 'utf8'));
  } catch (error) {
    return [`${guardrails}: ${error instanceof Error ? error.message : String(error)}`];
  }
  const problems: string[] = [];
  const compare = (language: string, fromGuardrails: readonly string[], inCode: readonly string[]): void => {
    const missing = fromGuardrails.filter((term) => !inCode.includes(term));
    const extra = inCode.filter((term) => !fromGuardrails.includes(term));
    for (const term of missing) {
      problems.push(`${LIST_MODULE.path}: the ${language} list lacks "${term}", which ${guardrails} 2.8 holds (removing a term is a loosening)`);
    }
    for (const term of extra) {
      problems.push(`${LIST_MODULE.path}: the ${language} list holds "${term}", which ${guardrails} 2.8 does not`);
    }
    if (missing.length === 0 && extra.length === 0 && fromGuardrails.join('|') !== inCode.join('|')) {
      problems.push(`${LIST_MODULE.path}: the ${language} list is in a different order from ${guardrails} 2.8`);
    }
  };
  compare('English', parsed.en, RESERVED_TERMS_EN);
  compare('Romanian', parsed.ro, RESERVED_TERMS_RO);
  return problems;
}

/**
 * Checks the registered machine-key lists against the scanned files: each entry
 * needs a reason, a file in the scan scope, and a `const` array literal or an
 * enum of its name there. Returns the problems and the lists by file.
 */
function machineKeyListsOf(
  root: string,
  lists: readonly MachineKeyList[],
  scanned: ReadonlySet<string>,
): { problems: string[]; byFile: Map<string, Set<string>> } {
  const problems: string[] = [];
  const byFile = new Map<string, Set<string>>();
  const seen = new Set<string>();
  for (const list of lists) {
    const where = `registered machine-key list ${list.path} ${list.constant}`;
    const key = `${list.path}#${list.constant}`;
    if (seen.has(key)) problems.push(`${where}: registered twice`);
    seen.add(key);
    if (list.reason.trim() === '') problems.push(`${where}: gives no reason why its strings are never shown`);
    if (!scanned.has(list.path) || !SCRIPT.test(list.path)) {
      problems.push(`${where}: the file is not a scanned script, so the entry allows nothing: remove it`);
      continue;
    }
    let declared: Set<string>;
    try {
      declared = listDeclarations(list.path, readFileSync(join(root, list.path), 'utf8'));
    } catch (error) {
      problems.push(`${where}: could not be read: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    if (!declared.has(list.constant)) {
      problems.push(`${where}: no const array literal or enum of that name in the file, so the entry allows nothing: remove it`);
      continue;
    }
    const names = byFile.get(list.path) ?? new Set<string>();
    names.add(list.constant);
    byFile.set(list.path, names);
  }
  return { problems, byFile };
}

/** The files each non-copy entry covers among `files`; problems for an entry with no reason or no file. */
async function nonCopyFilesOf(
  root: string,
  entries: readonly NonCopyEntry[],
  files: ReadonlySet<string>,
  ignore: readonly string[],
): Promise<{ problems: string[]; covered: Set<string> }> {
  const problems: string[] = [];
  const covered = new Set<string>();
  const seen = new Set<string>();
  for (const entry of entries) {
    const where = `non-copy entry "${entry.files}"`;
    if (seen.has(entry.files)) problems.push(`${where}: listed twice`);
    seen.add(entry.files);
    if (entry.reason.trim() === '') problems.push(`${where}: gives no reason why its files are never shown`);
    const matched = (await listFiles(entry.files, { cwd: root, ignore })).filter((path) => files.has(path));
    if (matched.length === 0) problems.push(`${where}: matches no file in scope, so it allows nothing: remove it`);
    for (const path of matched) covered.add(path);
  }
  return { problems, covered };
}

/** Runs the check on one tree. Never throws: a failure to read is a finding. */
export async function scanReservedTerms(options: ReservedTermScan): Promise<CheckResult> {
  const prefix = options.label === undefined ? '' : `[${options.label}] `;
  const problems: string[] = [];

  let allowances: AllowanceSet | undefined;
  try {
    allowances = options.allowances();
  } catch (error) {
    problems.push(`allowances: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (options.guardrails !== undefined) problems.push(...listDrift(options.root, options.guardrails));

  const roots = [...options.include, ...(options.optional ?? [])];
  const files = await listFiles(roots, { cwd: options.root, ignore: options.ignore });
  for (const pattern of options.include) {
    const matched = await listFiles(pattern, { cwd: options.root, ignore: options.ignore });
    if (matched.length === 0) problems.push(`scan root "${pattern}" matches no file: a scope with nothing to scan never passes`);
  }
  const catalogueFiles = new Map<string, StringCatalogue>();
  for (const catalogue of options.catalogues) {
    const matched = await listFiles(catalogue.files, { cwd: options.root });
    if (matched.length === 0) problems.push(`string catalogue "${catalogue.id}" (${catalogue.files}) matches no file: a registered catalogue must be read`);
    for (const file of matched) catalogueFiles.set(file, catalogue);
  }
  const registered = machineKeyListsOf(options.root, options.machineKeyLists ?? [], new Set(files));
  problems.push(...registered.problems);
  const nonCopy = await nonCopyFilesOf(options.root, options.nonCopy ?? [], new Set(files), options.ignore);
  problems.push(...nonCopy.problems);
  const registryFiles = new Set<string>();
  for (const pattern of options.allowanceScope ?? []) {
    const matched = (await listFiles(pattern, { cwd: options.root, ignore: options.ignore })).filter((path) => files.includes(path));
    if (matched.length === 0 && allowances !== undefined && allowances.entries.length > 0) {
      problems.push(`copy registry "${pattern}" matches no scanned file: the allowances would apply nowhere, so the scope is wrong`);
    }
    for (const path of matched) registryFiles.add(path);
  }

  // Objects whose keys are handed out, found by name across every scanned script.
  const exposures: KeyExposure[] = [];
  for (const path of files) {
    if (!SCRIPT.test(path)) continue;
    try {
      exposures.push(keyExposure(path, readFileSync(join(options.root, path), 'utf8')));
    } catch {
      // A file that cannot be read is reported below, when its copy is read.
    }
  }
  const exposedNames = closeKeyExposure(exposures);

  let scannedFiles = 0;
  let scannedUnits = 0;
  let found = 0;
  let skipped = 0;
  const allFiles = [...new Set([...files, ...catalogueFiles.keys()])].sort();
  for (const path of allFiles) {
    const catalogue = catalogueFiles.get(path);
    if (catalogue === undefined && nonCopy.covered.has(path)) {
      skipped += 1;
      continue;
    }
    let units: CopyUnit[] | undefined;
    try {
      const source = readFileSync(join(options.root, path), 'utf8');
      units =
        catalogue === undefined
          ? unitsOf(path, source, options.listModule, registered.byFile, exposedNames)
          : extractFromCatalogue(source, catalogue.format);
    } catch (error) {
      problems.push(`${path}: could not be read as copy: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    if (units === undefined) {
      problems.push(
        `${path}: a file in scope that the check cannot read as copy; register it as a string catalogue (catalogues.ts) or, if it holds no copy, add a reviewed non-copy entry (non-copy.ts)`,
      );
      continue;
    }
    scannedFiles += 1;
    scannedUnits += units.length;
    if (allowances === undefined) continue;
    const inRegistry = registryFiles.has(path);
    for (const unit of units) {
      const matches = inRegistry ? scanCopy(unit.text, { allowances, context: { kind: 'copy_registry' } }) : scanCopy(unit.text, { allowances: NO_ALLOWANCES });
      for (const match of matches) {
        found += 1;
        const outside = !inRegistry && allowances.match(unit.text, { copyRegistry: true }) !== undefined;
        problems.push(
          `${path}:${unit.line}:${unit.column} reserved term "${match.term}" (${match.languages.join(', ')}) as "${match.text}" in ${unit.kind}: "${snippet(unit.text, match.index, match.length)}"` +
            (outside ? ' (a registered allowance\'s text outside the copy registries: take it from the registry, never write it again)' : ''),
        );
      }
    }
  }

  if (scannedUnits === 0) problems.push(`0 copy units were scanned (${scannedFiles} files): a scan that reads no copy never passes`);

  const counts =
    `${scannedFiles} files, ${scannedUnits} copy units${skipped > 0 ? `, ${skipped} files on the non-copy list not read` : ''}` +
    `; allowances applied only in ${registryFiles.size} copy-registry files`;
  const list = `list of ${RESERVED_TERMS_EN.length} English and ${RESERVED_TERMS_RO.length} Romanian terms`;
  if (problems.length === 0) {
    const drift = options.guardrails === undefined ? '' : `; ${list} matches ${options.guardrails} 2.8`;
    return pass(NAME, `${prefix}no reserved term outside the places 2.8 allows (${counts}${drift})`);
  }
  const other = problems.length - found;
  return fail(
    NAME,
    `${prefix}${found} reserved terms outside the places 2.8 allows${other > 0 ? `, ${other} other problems` : ''} (${counts})`,
    problems,
  );
}
