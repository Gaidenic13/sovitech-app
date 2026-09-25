/**
 * The exception lists in the loosening snapshot (phase 0 review, round 2:
 * "every exception list is a code constant pnpm check accepts at any size").
 *
 * Every list that lets something past a check (an allow list) or names what a
 * check must catch (a deny list) is recorded in the exception-list part of
 * "unapproved baseline v0" (packages/registry/src/snapshots/exception-lists/).
 * Against that snapshot the loosening check fails on:
 * - an entry added to an allow list, or an allow-list entry whose content changed;
 * - an entry removed from a deny list (a removed mockup figure lets it back in);
 * - a list the snapshot holds that is no longer read, or whose direction changed;
 * each a loosening (docs/guardrails.md section 10; prompt 3 section 13: widening
 * the render allowlist and adding a reserved-term exception are loosenings)
 * that passes only through an approved exception-list snapshot whose approval
 * reference resolves. Against the unapproved baseline, a tightening (an entry
 * removed from an allow list, added to a deny list, a new list) fails too,
 * until `tsx tools/checks/loosening/write-baseline.ts` records it; the writer
 * refuses every loosening.
 *
 * The snapshot stores, per entry, a key and a SHA-256 of its content, never
 * the content: figure lists are stored by hash, so no mockup figure or hotel
 * name enters packages/ (prompt 3 section 14, item 3).
 *
 * Each list is read from the module that uses it; a list that cannot be read
 * fails the check (a renamed export is a problem, never an empty list).
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createRequire } from 'node:module';
import { resolveApprovalRef, type ApprovalContext } from '@sovitech/registry/gates';
import { z } from 'zod';
import { repoRoot } from '../lib';

export type ListDirection = 'allow' | 'deny';

/** One entry as read from its list: a stable key, its content (hashed), and a label for reports. */
export interface ListEntry {
  key: string;
  content: unknown;
  /** How reports name the entry; figure lists never print the figure. */
  label: string;
}

export interface ExceptionListSpec {
  id: string;
  direction: ListDirection;
  /** Where the list lives, as a person reads it. */
  source: string;
  /** A list that may be absent (company-figures.txt, created by another change): absent reads as empty. */
  optional?: boolean;
  /** The entries, or undefined when an optional list is absent. Throws when the list cannot be read. */
  read: (root: string) => Promise<ListEntry[] | undefined>;
}

export interface CurrentList {
  direction: ListDirection;
  source: string;
  entries: Map<string, { sha256: string; label: string }>;
}

export interface CurrentLists {
  lists: Map<string, CurrentList>;
  /** Lists that could not be read: each fails the check and the writer. */
  problems: string[];
}

// ---------------------------------------------------------------------------
// Hashing.

/** A JSON-ready form with sorted keys: sets sorted, regular expressions as source and flags, functions left out. */
export function canonical(value: unknown): unknown {
  if (value instanceof RegExp) return { regexp: value.source, flags: value.flags };
  if (value instanceof Set) return [...value].map(canonical).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  if (value instanceof Map) return canonical(Object.fromEntries(value));
  if (Array.isArray(value)) return value.map(canonical);
  if (typeof value === 'function' || typeof value === 'symbol' || value === undefined) return null;
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .filter((key) => typeof (value as Record<string, unknown>)[key] !== 'function')
        .map((key) => [key, canonical((value as Record<string, unknown>)[key])]),
    );
  }
  return value;
}

export function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

// ---------------------------------------------------------------------------
// Readers.

function exported(module: Record<string, unknown>, name: string, from: string): unknown {
  if (!(name in module)) throw new Error(`${from} no longer exports ${name}; update tools/checks/loosening/exception-lists.ts`);
  return module[name];
}

function arrayOf(value: unknown, what: string): unknown[] {
  if (value instanceof Set) return [...value];
  if (!Array.isArray(value)) throw new Error(`${what} is not a list`);
  return value;
}

function recordOf(value: unknown, what: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${what} is not an object`);
  return value as Record<string, unknown>;
}

function stringsOf(value: unknown, what: string): ListEntry[] {
  return arrayOf(value, what).map((item) => {
    if (typeof item !== 'string') throw new Error(`${what} holds a non-string entry`);
    return { key: item, content: item, label: item };
  });
}

function byId(value: unknown, what: string, idOf: (item: Record<string, unknown>) => string): ListEntry[] {
  return arrayOf(value, what).map((item, index) => {
    const record = recordOf(item, `${what}[${index}]`);
    const key = idOf(record);
    if (key === '') throw new Error(`${what}[${index}] has no id`);
    return { key, content: record, label: key };
  });
}

/** Keys unique within a list: a repeated key gets "#2", "#3", so removing one copy is seen. */
function numbered(entries: ListEntry[]): ListEntry[] {
  const seen = new Map<string, number>();
  return entries.map((entry) => {
    const previous = seen.get(entry.key);
    const count = previous === undefined ? 1 : previous + 1;
    seen.set(entry.key, count);
    return count === 1 ? entry : { ...entry, key: `${entry.key}#${count}`, label: `${entry.label} (copy ${count})` };
  });
}

/**
 * A figure check list (tools/checks/mockup-figures.txt, company-figures.txt):
 * one entry per line "kind | figure | source  # note". The key is a hash of
 * the kind and the figure, so the snapshot never holds a figure; the label
 * names the kind and the source line only.
 */
export function figureEntries(text: string, listName: string): ListEntry[] {
  const entries: ListEntry[] = [];
  text.split('\n').forEach((raw, index) => {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) return;
    const fields = line.split('|').map((field) => field.trim());
    const kind = fields.length >= 2 ? (fields[0] ?? '') : 'line';
    const figure = (fields.length >= 2 ? (fields[1] ?? '') : line).replace(/\s+/g, ' ');
    const source = fields.length >= 3 ? (fields[2] ?? '').replace(/\s+#.*$/, '').trim() : '';
    const digest = createHash('sha256').update(`${kind}|${figure}`).digest('hex').slice(0, 16);
    entries.push({ key: `${kind}:sha256:${digest}`, content: `${kind}|${figure}`, label: `${kind} entry, ${listName} line ${index + 1}${source === '' ? '' : ` (${source})`}` });
  });
  return numbered(entries);
}

const requireFromHere = createRequire(import.meta.url);

/** Every exception list the snapshot records. Adding a list: one entry here, then run the writer. */
export const EXCEPTION_LISTS: readonly ExceptionListSpec[] = [
  {
    id: 'render.entries',
    direction: 'allow',
    source: 'tests/e2e/render/allowlist.ts: RENDER_ALLOWLIST.entries (digits allowed outside a value element; rule 2)',
    read: async () => {
      const module = (await import('../../../tests/e2e/render/allowlist')) as Record<string, unknown>;
      const allowlist = recordOf(exported(module, 'RENDER_ALLOWLIST', 'tests/e2e/render/allowlist.ts'), 'RENDER_ALLOWLIST');
      return byId(allowlist['entries'], 'RENDER_ALLOWLIST.entries', (item) => String(item['id'] ?? ''));
    },
  },
  {
    id: 'render.unreadable',
    direction: 'allow',
    source: 'tests/e2e/render/allowlist.ts: RENDER_ALLOWLIST.unreadable (elements whose pixels the render test cannot read)',
    read: async () => {
      const module = (await import('../../../tests/e2e/render/allowlist')) as Record<string, unknown>;
      const allowlist = recordOf(exported(module, 'RENDER_ALLOWLIST', 'tests/e2e/render/allowlist.ts'), 'RENDER_ALLOWLIST');
      return byId(allowlist['unreadable'], 'RENDER_ALLOWLIST.unreadable', (item) => String(item['id'] ?? ''));
    },
  },
  {
    id: 'eslint.allowlist',
    direction: 'allow',
    source: 'tools/eslint-rules/allowlist.js: allowlist (files a lint ban does not apply to), one entry per rule and file pattern',
    read: async () => {
      const module = (await import('../../eslint-rules/allowlist.js')) as Record<string, unknown>;
      const entries: ListEntry[] = [];
      arrayOf(exported(module, 'allowlist', 'tools/eslint-rules/allowlist.js'), 'allowlist').forEach((item, index) => {
        const record = recordOf(item, `allowlist[${index}]`);
        const rule = String(record['rule'] ?? '');
        for (const file of arrayOf(record['files'], `allowlist[${index}].files`)) {
          const key = `${rule} ${String(file)}`;
          entries.push({ key, content: { rule, file, reason: record['reason'] }, label: key });
        }
      });
      return numbered(entries);
    },
  },
  {
    id: 'lint-bans.shadow-free-values',
    direction: 'allow',
    source: 'tools/eslint-rules/lib/patterns.js: SHADOW_FREE_VALUES (shadow values the shadow bans accept)',
    read: async () => stringsOf(exported((await import('../../eslint-rules/lib/patterns.js')) as Record<string, unknown>, 'SHADOW_FREE_VALUES', 'tools/eslint-rules/lib/patterns.js'), 'SHADOW_FREE_VALUES'),
  },
  {
    id: 'lint-bans.theme-files',
    direction: 'allow',
    source: 'tools/eslint-rules/lib/theme.js: THEME_FILES (files whose colour names count as tokens)',
    read: async () => stringsOf(exported((await import('../../eslint-rules/lib/theme.js')) as Record<string, unknown>, 'THEME_FILES', 'tools/eslint-rules/lib/theme.js'), 'THEME_FILES'),
  },
  {
    id: 'reserved-terms.allowances',
    direction: 'allow',
    source: 'packages/registry/src/reserved-terms.ts: REGISTERED_ALLOWANCE_ENTRIES (places 2.8 allows a reserved term)',
    read: async () => {
      const module = (await import('@sovitech/registry/reserved-terms')) as Record<string, unknown>;
      return numbered(
        byId(exported(module, 'REGISTERED_ALLOWANCE_ENTRIES', '@sovitech/registry/reserved-terms'), 'REGISTERED_ALLOWANCE_ENTRIES', (item) => {
          const id = [item['actionId'], item['badgeId'], item['statusLineId'], item['templateId'], item['fieldKey'], item['qualifier']]
            .filter((part) => typeof part === 'string' && part !== '')
            .join('/');
          return `${String(item['kind'] ?? 'allowance')}:${id === '' ? sha256(item).slice(0, 16) : id}`;
        }),
      );
    },
  },
  {
    id: 'reserved-terms.machine-keys',
    direction: 'allow',
    source: 'tools/checks/reserved-terms/machine-keys.ts: MACHINE_KEY_LISTS (lists whose strings the reserved-term check skips)',
    read: async () => {
      const module = (await import('../reserved-terms/machine-keys')) as Record<string, unknown>;
      return numbered(
        byId(exported(module, 'MACHINE_KEY_LISTS', 'tools/checks/reserved-terms/machine-keys.ts'), 'MACHINE_KEY_LISTS', (item) => `${String(item['path'] ?? '')}#${String(item['constant'] ?? '')}`),
      );
    },
  },
  {
    id: 'fixture-manifest.document-homes',
    direction: 'allow',
    source: 'tools/checks/fixture-manifest/manifest.ts: DOCUMENT_HOMES (where document-type files may live)',
    read: async () => stringsOf(exported((await import('../fixture-manifest/manifest')) as Record<string, unknown>, 'DOCUMENT_HOMES', 'tools/checks/fixture-manifest/manifest.ts'), 'DOCUMENT_HOMES'),
  },
  {
    id: 'fixture-manifest.never-read',
    direction: 'allow',
    source: 'tools/checks/fixture-manifest/manifest.ts: NEVER_READ (paths the document scan never reads)',
    read: async () => stringsOf(exported((await import('../fixture-manifest/manifest')) as Record<string, unknown>, 'NEVER_READ', 'tools/checks/fixture-manifest/manifest.ts'), 'NEVER_READ'),
  },
  {
    id: 'fixture-manifest.document-extensions',
    direction: 'deny',
    source: 'tools/checks/fixture-manifest/manifest.ts: DOCUMENT_EXTENSIONS (document types found by extension)',
    read: async () => stringsOf(exported((await import('../fixture-manifest/manifest')) as Record<string, unknown>, 'DOCUMENT_EXTENSIONS', 'tools/checks/fixture-manifest/manifest.ts'), 'DOCUMENT_EXTENSIONS'),
  },
  {
    id: 'fixture-manifest.content-signatures',
    direction: 'deny',
    source: 'tools/checks/fixture-manifest/manifest.ts: CONTENT_SIGNATURES (document types found by content)',
    read: async () => {
      const module = (await import('../fixture-manifest/manifest')) as Record<string, unknown>;
      return numbered(
        byId(exported(module, 'CONTENT_SIGNATURES', 'tools/checks/fixture-manifest/manifest.ts'), 'CONTENT_SIGNATURES', (item) => String(item['type'] ?? '')).map(
          (entry) => ({ ...entry, content: entry.key }),
        ),
      );
    },
  },
  {
    id: 'checks.default-ignores',
    direction: 'allow',
    source: 'tools/checks/lib.ts: DEFAULT_IGNORES (paths every scanning check skips)',
    read: async () => stringsOf(exported((await import('../lib')) as Record<string, unknown>, 'DEFAULT_IGNORES', 'tools/checks/lib.ts'), 'DEFAULT_IGNORES'),
  },
  {
    id: 'depcruise.exclude',
    direction: 'allow',
    source: '.dependency-cruiser.cjs: options.exclude.path (modules the boundaries never see)',
    read: async (root) => {
      const config = recordOf(requireFromHere(join(root, '.dependency-cruiser.cjs')), '.dependency-cruiser.cjs');
      const options = recordOf(config['options'], 'options');
      const exclude = recordOf(options['exclude'], 'options.exclude');
      return stringsOf(exclude['path'], 'options.exclude.path');
    },
  },
  {
    id: 'version-sync.third-party-skills',
    direction: 'allow',
    source: 'skills-lock.json: skills (third-party skills the version-sync check exempts from the "Checked against" line)',
    read: async (root) => {
      const lock = recordOf(JSON.parse(readFileSync(join(root, 'skills-lock.json'), 'utf8')), 'skills-lock.json');
      const skills = recordOf(lock['skills'], 'skills-lock.json skills');
      return Object.entries(skills).map(([name, entry]) => ({ key: name, content: entry, label: name }));
    },
  },
  {
    id: 'mockup-figures',
    direction: 'deny',
    source: 'tools/checks/mockup-figures.txt (mockup figures and the mockups\' hotel name; stored by hash)',
    read: async (root) => figureEntries(readFileSync(join(root, 'tools/checks/mockup-figures.txt'), 'utf8'), 'mockup-figures.txt'),
  },
  {
    // Required since the company-figure check landed (phase 0 round 2): a missing file is a list that cannot be read.
    id: 'company-figures',
    direction: 'deny',
    source: 'tools/checks/company-figures.txt (company figures and SAUTER names; stored by hash)',
    read: async (root) => figureEntries(readFileSync(join(root, 'tools/checks/company-figures.txt'), 'utf8'), 'company-figures.txt'),
  },
  // Lists added at integration of the phase 0 round 2 review: each lets something
  // past a check (allow) or names what a check must read (deny).
  {
    id: 'index.reviewed-test-doubles',
    direction: 'allow',
    source: 'tools/checks/index/reviewed-test-doubles.json: entries (test doubles a guardrail case file or support module may use)',
    read: async (root) => {
      const list = recordOf(JSON.parse(readFileSync(join(root, 'tools/checks/index/reviewed-test-doubles.json'), 'utf8')), 'reviewed-test-doubles.json');
      return numbered(
        arrayOf(list['entries'], 'reviewed-test-doubles.json entries').map((item, index) => {
          const record = recordOf(item, `reviewed-test-doubles.json entries[${index}]`);
          const key = [record['path'], record['call'], record['target']].map((part) => String(part ?? '')).join(' ');
          return { key, content: record, label: key };
        }),
      );
    },
  },
  {
    id: 'vitest.allowed-test-script-flags',
    direction: 'allow',
    source: 'tools/vitest/config-integrity.ts: ALLOWED_TEST_SCRIPT_FLAGS (flags the test script may add after "vitest run")',
    read: async () =>
      stringsOf(
        exported((await import('../../vitest/config-integrity')) as Record<string, unknown>, 'ALLOWED_TEST_SCRIPT_FLAGS', 'tools/vitest/config-integrity.ts'),
        'ALLOWED_TEST_SCRIPT_FLAGS',
      ),
  },
  {
    id: 'reserved-terms.non-copy-files',
    direction: 'allow',
    source: 'tools/checks/reserved-terms/non-copy.ts: NON_COPY_FILES (files in scope the reserved-term check does not read)',
    read: async () => {
      const module = (await import('../reserved-terms/non-copy')) as Record<string, unknown>;
      return numbered(byId(exported(module, 'NON_COPY_FILES', 'tools/checks/reserved-terms/non-copy.ts'), 'NON_COPY_FILES', (item) => String(item['files'] ?? '')));
    },
  },
  {
    id: 'fixture-manifest.document-home-types',
    direction: 'allow',
    source: 'tools/checks/fixture-manifest/manifest.ts: DOCUMENT_HOME_TYPES (the document types each home may hold)',
    read: async () => {
      const module = (await import('../fixture-manifest/manifest')) as Record<string, unknown>;
      const homes = recordOf(exported(module, 'DOCUMENT_HOME_TYPES', 'tools/checks/fixture-manifest/manifest.ts'), 'DOCUMENT_HOME_TYPES');
      return Object.entries(homes).flatMap(([home, types]) =>
        types === 'any'
          ? [{ key: `${home} any`, content: `${home} any`, label: `${home} any` }]
          : stringsOf(types, `DOCUMENT_HOME_TYPES['${home}']`).map((entry) => ({ key: `${home} ${entry.key}`, content: `${home} ${entry.key}`, label: `${home} ${entry.key}` })),
      );
    },
  },
  {
    id: 'scan-roots.excluded',
    direction: 'allow',
    source: 'tools/checks/scan-roots/roots.json: folders no scan reads (topLevel, packageSubfolders, serviceSubfolders "excluded")',
    read: async (root) => scanRootEntries(root).excluded,
  },
  {
    id: 'scan-roots.scanned',
    direction: 'deny',
    source: 'tools/checks/scan-roots/roots.json: the scans each folder is read by, and the top-level folders the CI path filter names ("ci": true)',
    read: async (root) => scanRootEntries(root).scanned,
  },
  {
    id: 'lint-bans.total-outside-engine-exempt',
    direction: 'allow',
    source: 'tools/eslint-rules/index.js: ENGINE (the folder no-total-outside-engine does not apply to)',
    read: async () => stringsOf([exported((await import('../../eslint-rules/index.js')) as Record<string, unknown>, 'ENGINE', 'tools/eslint-rules/index.js')], 'ENGINE'),
  },
  {
    id: 'eslint.script-extensions',
    direction: 'deny',
    source: 'tools/eslint-rules/index.js: SCRIPT_EXTENSIONS (script extensions the ESLint bans read under apps/ and packages/)',
    read: async () =>
      stringsOf(exported((await import('../../eslint-rules/index.js')) as Record<string, unknown>, 'SCRIPT_EXTENSIONS', 'tools/eslint-rules/index.js'), 'SCRIPT_EXTENSIONS'),
  },
  {
    id: 'lint-bans.extensions-a-ban-must-read',
    direction: 'deny',
    source: 'tools/checks/lint-bans/lint-bans.ts: EXTENSIONS_A_BAN_MUST_READ (a file of these types under apps/ or packages/ that no ban reads fails)',
    read: async () =>
      stringsOf(
        exported((await import('../lint-bans/lint-bans')) as Record<string, unknown>, 'EXTENSIONS_A_BAN_MUST_READ', 'tools/checks/lint-bans/lint-bans.ts'),
        'EXTENSIONS_A_BAN_MUST_READ',
      ),
  },
];

/**
 * The entries of the shared scan-roots list (tools/checks/scan-roots/roots.json):
 * every excluded folder with its reason (an allow list: an added exclusion lets a
 * folder go unread), and every folder-and-scan pair and CI mark (a deny list: a
 * removed scan or CI mark stops a folder being read or triggering the pipeline).
 */
function scanRootEntries(root: string): { excluded: ListEntry[]; scanned: ListEntry[] } {
  const list = recordOf(JSON.parse(readFileSync(join(root, 'tools/checks/scan-roots/roots.json'), 'utf8')), 'roots.json');
  const excluded: ListEntry[] = [];
  const scanned: ListEntry[] = [];
  for (const group of ['topLevel', 'packageSubfolders', 'serviceSubfolders']) {
    for (const [folder, value] of Object.entries(recordOf(list[group], `roots.json ${group}`))) {
      const entry = recordOf(value, `roots.json ${group}.${folder}`);
      const at = `${group}.${folder}`;
      if (typeof entry['excluded'] === 'string') excluded.push({ key: at, content: entry['excluded'], label: at });
      if (entry['scans'] !== undefined) {
        for (const scan of stringsOf(entry['scans'], `roots.json ${at}.scans`)) scanned.push({ key: `${at} ${scan.key}`, content: `${at} ${scan.key}`, label: `${at} ${scan.key}` });
      }
      if (entry['ci'] === true) scanned.push({ key: `${at} ci`, content: `${at} ci`, label: `${at} ci` });
    }
  }
  return { excluded, scanned };
}

/** Reads every list. A list that cannot be read is a problem; an absent optional list reads as empty. */
export async function readCurrentLists(root: string = repoRoot, specs: readonly ExceptionListSpec[] = EXCEPTION_LISTS): Promise<CurrentLists> {
  const lists = new Map<string, CurrentList>();
  const problems: string[] = [];
  for (const spec of specs) {
    try {
      const entries = (await spec.read(root)) ?? [];
      const map = new Map<string, { sha256: string; label: string }>();
      for (const entry of entries) {
        if (map.has(entry.key)) throw new Error(`the key "${entry.key}" appears twice`);
        map.set(entry.key, { sha256: sha256(entry.content), label: entry.label });
      }
      lists.set(spec.id, { direction: spec.direction, source: spec.source, entries: map });
    } catch (error) {
      problems.push(`exception list ${spec.id}: cannot be read from ${spec.source}: ${error instanceof Error ? error.message : String(error)}; a list that cannot be read fails the check`);
    }
  }
  return { lists, problems };
}

// ---------------------------------------------------------------------------
// The snapshot file.

export const EXCEPTION_LISTS_BASELINE_NAME = 'unapproved baseline v0 (exception lists)';

/** packages/registry/src/snapshots/exception-lists/: the unapproved baseline and any approved exception-list snapshot. */
export const EXCEPTION_LISTS_DIR: string = join(repoRoot, 'packages', 'registry', 'src', 'snapshots', 'exception-lists');
export const EXCEPTION_LISTS_BASELINE_FILE = 'unapproved-baseline-v0.json';
export const EXCEPTION_LISTS_BASELINE_PATH: string = join(EXCEPTION_LISTS_DIR, EXCEPTION_LISTS_BASELINE_FILE);

const entrySchema = z.strictObject({ sha256: z.string().regex(/^[0-9a-f]{64}$/).optional(), recordedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });
const listSchema = z.strictObject({ direction: z.enum(['allow', 'deny']), source: z.string().min(1), entries: z.record(z.string(), entrySchema) });
export const exceptionListSnapshotSchema = z.strictObject({
  name: z.string().min(1),
  status: z.enum(['unapproved', 'approved']),
  version: z.number().int().nonnegative(),
  recordedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Empty for the unapproved baseline; for an approved snapshot, a guardrails-changelog reference. */
  approvalRef: z.string(),
  note: z.string().optional(),
  lists: z.record(z.string(), listSchema),
});
export type ExceptionListSnapshot = z.infer<typeof exceptionListSnapshotSchema>;

export function parseExceptionListSnapshot(text: string, path: string): ExceptionListSnapshot {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new Error(`${path}: not valid JSON: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
  const parsed = exceptionListSnapshotSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(`${path}: not a valid exception-list snapshot: ${parsed.error.issues.map((issue) => `${issue.path.map(String).join('.') || '(root)'}: ${issue.message}`).join('; ')}`);
  }
  return parsed.data;
}

export function renderExceptionListSnapshot(snapshot: ExceptionListSnapshot): string {
  return `${JSON.stringify(snapshot, null, 2)}\n`;
}

export interface ExceptionListInputs {
  current: CurrentLists;
  /** The unapproved baseline, or undefined when the file is missing. */
  baseline: ExceptionListSnapshot | undefined;
  /** Why the baseline could not be read, if it could not. */
  baselineProblem?: string;
  approvedSnapshots: readonly ExceptionListSnapshot[];
  approvals: ApprovalContext;
}

/** The repository's exception-list inputs; the approval context is the loosening check's own. */
export async function repoExceptionListInputs(approvals: ApprovalContext, root: string = repoRoot): Promise<ExceptionListInputs> {
  const dir = join(root, relative(repoRoot, EXCEPTION_LISTS_DIR));
  const baselinePath = join(dir, EXCEPTION_LISTS_BASELINE_FILE);
  let baseline: ExceptionListSnapshot | undefined;
  let baselineProblem: string | undefined;
  if (existsSync(baselinePath)) {
    try {
      baseline = parseExceptionListSnapshot(readFileSync(baselinePath, 'utf8'), relative(root, baselinePath));
    } catch (error) {
      baselineProblem = error instanceof Error ? error.message : String(error);
    }
  }
  const approvedSnapshots: ExceptionListSnapshot[] = [];
  const problems: string[] = [];
  if (existsSync(dir)) {
    for (const name of readdirSync(dir).filter((item) => item.endsWith('.json') && item !== EXCEPTION_LISTS_BASELINE_FILE).sort()) {
      try {
        approvedSnapshots.push(parseExceptionListSnapshot(readFileSync(join(dir, name), 'utf8'), relative(root, join(dir, name))));
      } catch (error) {
        problems.push(error instanceof Error ? error.message : String(error));
      }
    }
  }
  const current = await readCurrentLists(root);
  return {
    current: { lists: current.lists, problems: [...current.problems, ...problems] },
    baseline,
    ...(baselineProblem === undefined ? {} : { baselineProblem }),
    approvedSnapshots,
    approvals,
  };
}

// ---------------------------------------------------------------------------
// Comparison.

export interface ListDifference {
  list: string;
  kind: 'loosening' | 'tightening';
  message: string;
}

/** What changed from `base` to `current`, list by list. */
export function compareExceptionLists(base: ExceptionListSnapshot, current: ReadonlyMap<string, CurrentList>): ListDifference[] {
  const differences: ListDifference[] = [];
  for (const [id, recorded] of Object.entries(base.lists)) {
    const now = current.get(id);
    if (now === undefined) {
      differences.push({ list: id, kind: 'loosening', message: `exception list ${id}: ${base.name} records it, and it is no longer read (${recorded.source})` });
      continue;
    }
    if (now.direction !== recorded.direction) {
      differences.push({ list: id, kind: 'loosening', message: `exception list ${id}: its direction changed from ${recorded.direction} to ${now.direction}` });
      continue;
    }
    for (const [key, entry] of now.entries) {
      const earlier = recorded.entries[key];
      if (earlier === undefined) {
        differences.push(
          now.direction === 'allow'
            ? { list: id, kind: 'loosening', message: `exception list ${id}: entry added: ${entry.label}` }
            : { list: id, kind: 'tightening', message: `exception list ${id}: entry added to a deny list: ${entry.label}` },
        );
      } else if (now.direction === 'allow' && earlier.sha256 !== entry.sha256) {
        differences.push({ list: id, kind: 'loosening', message: `exception list ${id}: entry changed: ${entry.label} (a changed allow entry counts as a loosening)` });
      }
    }
    for (const key of Object.keys(recorded.entries)) {
      if (now.entries.has(key)) continue;
      differences.push(
        now.direction === 'deny'
          ? { list: id, kind: 'loosening', message: `exception list ${id}: entry removed from a deny list: ${key}` }
          : { list: id, kind: 'tightening', message: `exception list ${id}: entry removed from an allow list: ${key}` },
      );
    }
  }
  for (const [id, now] of current) {
    if (id in base.lists) continue;
    differences.push({ list: id, kind: 'tightening', message: `exception list ${id}: not in ${base.name} (${now.entries.size} entries; ${now.source})` });
  }
  return differences;
}

export interface ExceptionListReport {
  base: string;
  problems: string[];
  approvedLoosenings: string[];
  tightenings: string[];
  /** Allow-list entries waiting for approval, and a line per deny list. */
  waiting: string[];
}

const WRITER = 'tsx tools/checks/loosening/write-baseline.ts';

/** The exception-list part of the loosening check. */
export function evaluateExceptionLists(inputs: ExceptionListInputs): ExceptionListReport {
  const problems: string[] = [...inputs.current.problems];
  const approvedLoosenings: string[] = [];
  const tightenings: string[] = [];
  const { baseline } = inputs;
  if (baseline === undefined) {
    problems.push(
      inputs.baselineProblem ??
        `packages/registry/src/snapshots/exception-lists/${EXCEPTION_LISTS_BASELINE_FILE} is missing: every exception list is recorded in ${EXCEPTION_LISTS_BASELINE_NAME} (restore it from git, or record it once with \`${WRITER}\`)`,
    );
    return { base: EXCEPTION_LISTS_BASELINE_NAME, problems, approvedLoosenings, tightenings, waiting: [] };
  }
  if (baseline.status !== 'unapproved' || baseline.approvalRef !== '' || baseline.version !== 0) {
    problems.push(`${EXCEPTION_LISTS_BASELINE_FILE}: the unapproved baseline must have status unapproved, version 0 and no approval reference`);
  }

  let base = baseline;
  for (const snapshot of inputs.approvedSnapshots) {
    if (snapshot.status !== 'approved') {
      problems.push(`${snapshot.name}: listed as an approved exception-list snapshot, but its status is ${snapshot.status}`);
      continue;
    }
    const resolution = resolveApprovalRef(
      snapshot.approvalRef,
      { kind: 'registry-value', mentions: [`exception lists v${snapshot.version}`, snapshot.name] },
      inputs.approvals,
    );
    if (!resolution.ok) {
      problems.push(`${snapshot.name}: its approval reference "${snapshot.approvalRef}" does not resolve: ${resolution.reason}`);
      continue;
    }
    if (base === baseline || snapshot.version > base.version) base = snapshot;
  }
  const againstBaseline = base === baseline;

  for (const difference of compareExceptionLists(base, inputs.current.lists)) {
    if (difference.kind === 'loosening') {
      problems.push(`${difference.message}: a loosening against ${base.name} with no approval reference (docs/guardrails.md section 10); the writer refuses it`);
    } else if (againstBaseline) {
      problems.push(`${difference.message}: ${base.name} does not hold this, and nothing approves it; record it with \`${WRITER}\` (the writer refuses any loosening)`);
    } else {
      tightenings.push(difference.message);
    }
  }

  const waiting: string[] = [];
  for (const [id, list] of inputs.current.lists) {
    if (list.direction === 'deny') {
      waiting.push(`exception list ${id} (deny list): ${list.entries.size} entries; removing one is a loosening`);
      continue;
    }
    for (const [key, entry] of list.entries) {
      const recordedOn = base.lists[id]?.entries[key]?.recordedOn;
      waiting.push(`exception list ${id}: ${entry.label}${recordedOn === undefined ? '' : ` (recorded ${recordedOn})`}`);
    }
  }
  return { base: base.name, problems: [...new Set(problems)], approvedLoosenings, tightenings, waiting };
}

// ---------------------------------------------------------------------------
// The writer's part.

export const EXCEPTION_LISTS_NOTE =
  'Not approved: no approver is named in docs/guardrails.md section 10 (D-05). Every exception list the checks use, recorded by key and SHA-256 ' +
  '(figure lists by hash only). Against it, an entry added to an allow list, changed in one, or removed from a deny list is a loosening that fails ' +
  'the loosening check. Written by tools/checks/loosening/write-baseline.ts, which refuses any loosening.';

export interface ExceptionListPlanInputs {
  current: CurrentLists;
  existing: ExceptionListSnapshot | undefined;
  /** The file content on disk, or '' when there is none. */
  onDisk: string;
  today: string;
  /** Whether the baseline file is in HEAD's tree: true, false, or undefined when git cannot tell. */
  inHead: boolean | undefined;
}

export interface ExceptionListPlan {
  ok: boolean;
  problems: string[];
  text: string;
  changed: boolean;
  /** Entries this write records for the first time, per list, for the build log. */
  newEntries: string[];
}

export function planExceptionListBaseline(inputs: ExceptionListPlanInputs): ExceptionListPlan {
  const problems = [...inputs.current.problems];
  const { existing } = inputs;
  if (existing === undefined && inputs.inHead !== false) {
    problems.push(
      inputs.inHead === true
        ? `${EXCEPTION_LISTS_BASELINE_FILE} is committed in HEAD and missing from the working tree: restore it from git; recording the lists again would take every entry added since as approved`
        : `git cannot tell whether ${EXCEPTION_LISTS_BASELINE_FILE} was ever committed, so the first recording is refused`,
    );
  }
  if (existing !== undefined) {
    for (const difference of compareExceptionLists(existing, inputs.current.lists)) {
      if (difference.kind === 'loosening') problems.push(`${difference.message}: a loosening; only the approver can allow it (docs/guardrails.md section 10)`);
    }
  }
  const lists: ExceptionListSnapshot['lists'] = {};
  const newEntries: string[] = [];
  for (const [id, list] of [...inputs.current.lists].sort(([left], [right]) => left.localeCompare(right))) {
    const earlier = existing?.lists[id];
    const entries: ExceptionListSnapshot['lists'][string]['entries'] = {};
    let newDenyEntries = 0;
    for (const [key, entry] of [...list.entries].sort(([left], [right]) => left.localeCompare(right))) {
      const recorded = earlier?.entries[key];
      const same = recorded !== undefined && (list.direction === 'deny' || recorded.sha256 === entry.sha256);
      const recordedOn = same ? recorded.recordedOn : inputs.today;
      entries[key] = list.direction === 'allow' ? { sha256: entry.sha256, recordedOn } : { recordedOn };
      if (same) continue;
      if (list.direction === 'allow') newEntries.push(`${id} (allow list): ${entry.label}`);
      else newDenyEntries += 1;
    }
    if (newDenyEntries > 0) newEntries.push(`${id} (deny list; removing an entry is a loosening): ${newDenyEntries} entries of ${list.entries.size}`);
    if (earlier === undefined && list.entries.size === 0) newEntries.push(`${id} (${list.direction} list): recorded empty`);
    lists[id] = { direction: list.direction, source: list.source, entries };
  }
  const draft: ExceptionListSnapshot = {
    name: EXCEPTION_LISTS_BASELINE_NAME,
    status: 'unapproved',
    version: 0,
    recordedOn: inputs.today,
    approvalRef: '',
    note: EXCEPTION_LISTS_NOTE,
    lists,
  };
  const next = existing !== undefined && JSON.stringify(existing.lists) === JSON.stringify(lists) ? { ...draft, recordedOn: existing.recordedOn } : draft;
  const text = renderExceptionListSnapshot(next);
  return { ok: problems.length === 0, problems, text, changed: text !== inputs.onDisk, newEntries };
}
