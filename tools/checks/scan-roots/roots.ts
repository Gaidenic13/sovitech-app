/**
 * The shared list of scan roots (roots.json in this folder): which folders each
 * scan reads, and which folders no scan reads, with the reason. Phase 0 review
 * round 2, adversarial finding 13: every scan named its own fixed roots, so a new
 * top-level folder (scripts/, seeds/, db/) or a new packages/<pkg>/ subfolder
 * (seeds/, migrations/, templates/) escaped them all.
 *
 * Readers: `pnpm lint:deps` (lint-deps.ts), the lint-bans check (its ban roots and
 * its boundary run, through tools/eslint-rules/depcruise-harness.ts), the extractor's
 * Python bans (services/extractor/tests/test_bans.py), and the scan-roots check,
 * which fails on a folder the list does not classify. See README.md.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../lib';

/** The list's path, relative to the repository root. */
export const LIST_PATH = 'tools/checks/scan-roots/roots.json';

/** The scans the list names. A scan id outside this set fails the list. */
export const SCAN_IDS = ['lint:deps', 'lint-bans', 'reserved-terms', 'mockup-figures', 'python-bans', 'ruff-pytest'] as const;
export type ScanId = (typeof SCAN_IDS)[number];

/** The groups of folders the list classifies. */
export type Group = 'topLevel' | 'packageSubfolders' | 'serviceSubfolders';

/** Top-level folders whose own subfolders are classified one by one, and the group that does it. */
export const SUBFOLDER_GROUPS: Readonly<Record<string, Group>> = {
  packages: 'packageSubfolders',
  services: 'serviceSubfolders',
};

export interface ScannedEntry {
  scans: ScanId[];
  /** Top level only: whether the CI path filter names the folder. */
  ci?: boolean;
  note?: string;
}

export interface ExcludedEntry {
  /** Why no scan reads the folder. */
  excluded: string;
  /** Top level only: whether the CI path filter names the folder. */
  ci?: boolean;
}

export type Entry = ScannedEntry | ExcludedEntry;

export interface ScanRootsList {
  about: string;
  scans: Record<string, string>;
  topLevel: Record<string, Entry>;
  packageSubfolders: Record<string, Entry>;
  serviceSubfolders: Record<string, Entry>;
}

export function isExcluded(entry: Entry): entry is ExcludedEntry {
  return 'excluded' in entry;
}

/** Reads the list. `path` defaults to the repository's roots.json. */
export function loadScanRoots(path: string = join(repoRoot, LIST_PATH)): ScanRootsList {
  return JSON.parse(readFileSync(path, 'utf8')) as ScanRootsList;
}

/** The shortest reason an exclusion may give: a reason has to say something. */
const MIN_REASON = 12;

/** Problems with the list itself: its shape, its scan ids, its reasons, and company/. */
export function listProblems(list: ScanRootsList): string[] {
  const problems: string[] = [];
  const known = new Set<string>(SCAN_IDS);
  for (const id of Object.keys(list.scans ?? {})) {
    if (!known.has(id)) problems.push(`${LIST_PATH}: scans: "${id}" is not a scan this list knows (${SCAN_IDS.join(', ')}).`);
  }
  for (const id of SCAN_IDS) {
    if (typeof list.scans?.[id] !== 'string') problems.push(`${LIST_PATH}: scans: "${id}" has no description.`);
  }
  for (const group of ['topLevel', 'packageSubfolders', 'serviceSubfolders'] as const) {
    const entries = list[group];
    if (typeof entries !== 'object' || entries === null) {
      problems.push(`${LIST_PATH}: ${group} is missing.`);
      continue;
    }
    for (const [folder, entry] of Object.entries(entries)) {
      const at = `${LIST_PATH}: ${group}.${folder}`;
      if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
        problems.push(`${at}: an entry is an object with "scans" or "excluded".`);
        continue;
      }
      const scanned = 'scans' in entry;
      const excluded = 'excluded' in entry;
      if (scanned === excluded) {
        problems.push(`${at}: give either "scans" or "excluded", not ${scanned ? 'both' : 'neither'}.`);
        continue;
      }
      if (excluded && (typeof entry.excluded !== 'string' || entry.excluded.trim().length < MIN_REASON)) {
        problems.push(`${at}: an excluded folder needs its reason.`);
      }
      if (scanned) {
        const scans = (entry as ScannedEntry).scans;
        if (!Array.isArray(scans) || scans.length === 0) problems.push(`${at}: "scans" must name at least one scan.`);
        else for (const id of scans) if (!known.has(id)) problems.push(`${at}: unknown scan "${String(id)}".`);
      }
      if (group === 'topLevel' && typeof entry.ci !== 'boolean') problems.push(`${at}: "ci" must be true or false.`);
      if (group !== 'topLevel' && entry.ci !== undefined) problems.push(`${at}: "ci" belongs to top-level folders only.`);
    }
  }
  // company/ is never an input (build-readiness decision 12; prompt 3 section 6).
  const company = list.topLevel?.['company'];
  if (company === undefined || !isExcluded(company) || company.ci !== false) {
    problems.push(`${LIST_PATH}: topLevel.company must be excluded, with "ci": false (build-readiness decision 12).`);
  }
  // A scan of a subfolder must also be a scan of its top-level folder, so readers of either agree.
  for (const [top, group] of Object.entries(SUBFOLDER_GROUPS)) {
    const parent = list.topLevel?.[top];
    const parentScans = new Set(parent !== undefined && !isExcluded(parent) ? parent.scans : []);
    for (const [folder, entry] of Object.entries(list[group] ?? {})) {
      if (typeof entry !== 'object' || entry === null || isExcluded(entry) || !Array.isArray(entry.scans)) continue;
      for (const id of entry.scans) {
        if (!parentScans.has(id)) problems.push(`${LIST_PATH}: ${group}.${folder} names "${id}", which topLevel.${top} does not.`);
      }
    }
  }
  return problems;
}

/** The top-level folders a scan reads, in list order. */
export function topLevelRoots(scan: ScanId, list: ScanRootsList = loadScanRoots()): string[] {
  return Object.entries(list.topLevel)
    .filter(([, entry]) => !isExcluded(entry) && entry.scans.includes(scan))
    .map(([folder]) => folder);
}

/** The subfolders of a group a scan reads: for 'packageSubfolders', src, seeds and the like. */
export function subfolderRoots(group: Exclude<Group, 'topLevel'>, scan: ScanId, list: ScanRootsList = loadScanRoots()): string[] {
  return Object.entries(list[group])
    .filter(([, entry]) => !isExcluded(entry) && entry.scans.includes(scan))
    .map(([folder]) => folder);
}

/**
 * The globs a scan reads, relative to the repository root: `apps/**` for a top-level
 * folder, and `packages/*\/src/**`, `packages/*\/seeds/**`, ... for a folder whose
 * subfolders are classified. For the checks that take globs (reserved terms, mockup
 * figures) to read, so that they cover what the list says they cover.
 */
export function scanGlobs(scan: ScanId, list: ScanRootsList = loadScanRoots()): string[] {
  return topLevelRoots(scan, list).flatMap((folder) => {
    const group = SUBFOLDER_GROUPS[folder];
    if (group === undefined || group === 'topLevel') return [`${folder}/**`];
    return subfolderRoots(group, scan, list).map((sub) => `${folder}/*/${sub}/**`);
  });
}
