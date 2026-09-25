/**
 * The scan-roots check (phase 0 review round 2, adversarial finding 13). It fails when:
 * - a folder at the top of the tree, under packages/<pkg>/ or under
 *   services/<service>/ is neither scanned nor excluded in roots.json
 *   (`scan-roots/unlisted`): a new scripts/, seeds/ or db/ folder, or a new
 *   packages/<pkg>/migrations/, would otherwise escape every scan;
 * - the list itself is malformed (`scan-roots/list`): an unknown scan, an exclusion
 *   with no reason, company/ scanned (build-readiness decision 12);
 * - `pnpm lint:deps` does not run through lint-deps.ts, the script that reads the
 *   list (`scan-roots/lint-deps`);
 * - the CI path filter of .gitlab-ci.yml and the list's "ci" marks disagree
 *   (`scan-roots/ci-paths`);
 * - nothing was read: no folder at all, or none of the lint:deps roots exists
 *   (`scan-roots/scope`; phase 0 review, finding 17).
 * Symbolic links count as folders and are classified by name, never followed.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { isExcluded, listProblems, SUBFOLDER_GROUPS, topLevelRoots, type Entry, type ScanRootsList } from './roots';

export const NAME = 'scan-roots';

/** The one `lint:deps` script: the wrapper that reads the list. */
export const LINT_DEPS_SCRIPT = 'tsx tools/checks/scan-roots/lint-deps.ts';

export interface ScanRootsOutcome {
  /** Folders classified: top level, and under each package and service. */
  folders: number;
  problems: string[];
}

/** The list's entry for a folder name, read as an own property only (a folder may be called `constructor`). */
function entryOf(entries: Record<string, Entry> | undefined, folder: string): Entry | undefined {
  return entries !== undefined && Object.hasOwn(entries, folder) ? entries[folder] : undefined;
}

/** Folder names (and symbolic links, unfollowed) directly under `dir`, sorted. */
function folderNames(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
    .map((entry) => entry.name)
    .sort();
}

/** The folders a `changes` list of the CI workflow names, and the entries it holds. */
function ciPaths(root: string): { paths: string[] } | { problem: string } {
  const path = join(root, '.gitlab-ci.yml');
  if (!existsSync(path)) return { problem: '.gitlab-ci.yml: scan-roots/ci-paths: the CI configuration is missing, so no path filter can be compared with the list.' };
  const config = parse(readFileSync(path, 'utf8')) as { workflow?: { rules?: Array<{ changes?: unknown }> } } | null;
  const paths = new Set<string>();
  for (const rule of config?.workflow?.rules ?? []) {
    const changes = rule.changes;
    const list = Array.isArray(changes) ? changes : (changes as { paths?: unknown } | undefined)?.paths;
    if (Array.isArray(list)) for (const item of list) if (typeof item === 'string') paths.add(item);
  }
  if (paths.size === 0) return { problem: '.gitlab-ci.yml: scan-roots/ci-paths: the workflow rules name no changes paths.' };
  return { paths: [...paths].sort() };
}

/** Classifies every folder of `root` against the list, and checks lint:deps and the CI path filter. */
export function scanRootProblems(root: string, list: ScanRootsList): ScanRootsOutcome {
  const problems = listProblems(list).map((problem) => problem.replace(/^([^:]+): /, '$1: scan-roots/list: '));
  let folders = 0;

  const topLevel = folderNames(root);
  folders += topLevel.length;
  if (topLevel.length === 0) problems.push('.: scan-roots/scope: no folder was read at the top of the tree; the check never passes on nothing.');
  for (const folder of topLevel) {
    if (entryOf(list.topLevel, folder) === undefined) {
      problems.push(
        `${folder}/: scan-roots/unlisted: this top-level folder is neither scanned nor excluded in tools/checks/scan-roots/roots.json. List the scans that must read it, or exclude it with the reason.`,
      );
    }
  }

  for (const [parent, group] of Object.entries(SUBFOLDER_GROUPS)) {
    if (group === 'topLevel' || !topLevel.includes(parent)) continue;
    for (const owner of folderNames(join(root, parent))) {
      for (const folder of folderNames(join(root, parent, owner))) {
        folders += 1;
        if (entryOf(list[group], folder) === undefined) {
          problems.push(
            `${parent}/${owner}/${folder}/: scan-roots/unlisted: this folder is neither scanned nor excluded under ${group} in tools/checks/scan-roots/roots.json. List the scans that must read it, or exclude it with the reason.`,
          );
        }
      }
    }
  }

  const depRoots = topLevelRoots('lint:deps', list).filter((folder) => existsSync(join(root, folder)));
  if (depRoots.length === 0) problems.push('.: scan-roots/scope: none of the lint:deps roots exists; dependency-cruiser would read nothing.');

  const manifestPath = join(root, 'package.json');
  const script = existsSync(manifestPath)
    ? (JSON.parse(readFileSync(manifestPath, 'utf8')) as { scripts?: Record<string, string> }).scripts?.['lint:deps']
    : undefined;
  if (script?.trim() !== LINT_DEPS_SCRIPT) {
    problems.push(
      `package.json: scan-roots/lint-deps: the "lint:deps" script is ${script === undefined ? 'missing' : `"${script}"`}; it must be "${LINT_DEPS_SCRIPT}", which cruises the lint:deps roots of the list.`,
    );
  }

  const ci = ciPaths(root);
  if ('problem' in ci) problems.push(ci.problem);
  else {
    const named = new Set<string>();
    if (!ci.paths.includes('*')) problems.push('.gitlab-ci.yml: scan-roots/ci-paths: the path filter has no "*" entry for the files at the top of the repository.');
    for (const path of ci.paths) {
      if (path === '*') continue;
      const folder = /^([^/*]+)\/\*\*\/\*$/.exec(path)?.[1];
      if (folder === undefined) {
        problems.push(`.gitlab-ci.yml: scan-roots/ci-paths: "${path}" is not a whole top-level folder ("<folder>/**/*"); the list classifies whole folders.`);
        continue;
      }
      named.add(folder);
      const entry = entryOf(list.topLevel, folder);
      if (entry === undefined || entry.ci !== true) {
        problems.push(`.gitlab-ci.yml: scan-roots/ci-paths: "${path}" names ${folder}/, which the list does not mark "ci": true.`);
      }
    }
    for (const folder of topLevel) {
      const entry = entryOf(list.topLevel, folder);
      if (entry?.ci === true && !named.has(folder)) {
        problems.push(
          `.gitlab-ci.yml: scan-roots/ci-paths: ${folder}/ is marked "ci": true in the list${isExcluded(entry) ? '' : ' and is scanned'}, but the path filter does not name "${folder}/**/*", so a change there starts no pipeline.`,
        );
      }
    }
  }

  return { folders, problems };
}
