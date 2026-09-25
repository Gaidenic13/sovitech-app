/**
 * The reviewed list of support modules that may catch the stub's error
 * (tools/checks/index/stub-aware-support.json): the pending wrapper, and the
 * property helper that keeps a failing assertion from hiding behind a stub
 * (phase 0 review, round 1, finding 16).
 *
 * The index check's `[support]` rule refuses any module under
 * tests/guardrails/_support/ that catches an error, holds a test out or swallows
 * a failure, because a helper that catches a case body's failure lets the case
 * pass, or read as pending, whatever the code under test does. Two modules must
 * catch the stub's error to tell it apart from every other error. They pass the
 * rule only through this list: each entry names the module's path, its role and
 * the SHA-256 of its reviewed content. A module whose content no longer has
 * that hash is held to the full rule again, with a problem, until the change is
 * reviewed and the new hash recorded here. The list is an allow list in the
 * loosening check's exception-list snapshot (tools/checks/loosening/exception-lists.ts),
 * so an added entry or a changed hash also waits for the approver.
 *
 * Every other support module (case builders, shared fixtures) is read by the
 * `[support]` rule on every run and needs no entry.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Where the list lives, relative to the root. */
export const SUPPORT_PIN_FILE = 'tools/checks/index/stub-aware-support.json';

/**
 * What a listed module may do:
 * - `pending-wrapper`: catch the body's error to tell the stub's from any other, and skip the
 *   test with its record and note (tests/guardrails/_support/pending.ts);
 * - `stub-aware`: catch an error only to tell the stub's from any other, rethrowing every
 *   other error at once and the stub's when its run ends (tests/guardrails/_support/property.ts).
 */
export const SUPPORT_ROLES = ['pending-wrapper', 'stub-aware'] as const;
export type SupportRole = (typeof SUPPORT_ROLES)[number];

export interface PinnedSupportModule {
  /** Root-relative path under tests/guardrails/_support/. */
  path: string;
  role: SupportRole;
  /** SHA-256 (hex) of the reviewed content, as UTF-8 bytes. */
  sha256: string;
  reason: string;
}

/** The SHA-256 of a module's text, as the list records it. */
export function contentHash(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Reads the list under `root`. A missing file is an empty list: no module may
 * catch (the strictest reading). A malformed list is a problem, and its entries
 * count for nothing.
 */
export function loadSupportPin(root: string): { entries: PinnedSupportModule[]; problems: string[] } {
  const absolute = join(root, SUPPORT_PIN_FILE);
  if (!existsSync(absolute)) return { entries: [], problems: [] };
  const invalid = (what: string) => ({ entries: [], problems: [`${SUPPORT_PIN_FILE}:1: [support] the reviewed list ${what}`] });
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(absolute, 'utf8'));
  } catch {
    return invalid('is not JSON');
  }
  const modules = typeof value === 'object' && value !== null ? (value as Record<string, unknown>)['modules'] : undefined;
  if (!Array.isArray(modules)) return invalid('is a JSON object with a "modules" list');
  const entries: PinnedSupportModule[] = [];
  const seen = new Set<string>();
  for (const [index, item] of modules.entries()) {
    const record = typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : {};
    const text = (key: string): string | undefined => {
      const field = record[key];
      return typeof field === 'string' && field.trim() !== '' ? field : undefined;
    };
    const path = text('path');
    const role = text('role');
    const sha256 = text('sha256');
    const reason = text('reason');
    if (path === undefined || role === undefined || sha256 === undefined || reason === undefined) {
      return invalid(`entry ${index + 1} needs a non-empty "path", "role", "sha256" and "reason"`);
    }
    if (!(SUPPORT_ROLES as readonly string[]).includes(role)) return invalid(`entry ${index + 1} has the role "${role}"; the roles are ${SUPPORT_ROLES.join(', ')}`);
    if (!/^[0-9a-f]{64}$/.test(sha256)) return invalid(`entry ${index + 1} has a sha256 that is not 64 hex characters`);
    if (!path.startsWith('tests/guardrails/_support/')) return invalid(`entry ${index + 1} names ${path}, which is not a support module`);
    if (seen.has(path)) return invalid(`entry ${index + 1} names ${path} a second time`);
    seen.add(path);
    entries.push({ path, role: role as SupportRole, sha256, reason });
  }
  return { entries, problems: [] };
}

/**
 * The role a module may use: its entry's role when its content has the recorded
 * hash; otherwise none, with the problem that says why.
 */
export function pinnedRole(
  path: string,
  text: string,
  pin: readonly PinnedSupportModule[],
): { role?: SupportRole; problem?: string } {
  const entry = pin.find((candidate) => candidate.path === path);
  if (entry === undefined) return {};
  const actual = contentHash(text);
  if (actual !== entry.sha256) {
    return {
      problem:
        `${path}:1: [support] is on the reviewed list of modules that may catch the stub's error (${SUPPORT_PIN_FILE}, role ` +
        `${entry.role}), but its content changed since it was reviewed (sha256 ${actual.slice(0, 12)}..., recorded ` +
        `${entry.sha256.slice(0, 12)}...); it is held to the full [support] rule until the change is reviewed and its new hash recorded`,
    };
  }
  return { role: entry.role };
}
