/**
 * Every allow-list entry of the exception lists is listed for the owner in
 * docs/build-log.md, under the heading "## For the owner's review" (prompt 3 section 7:
 * each render allowlist entry is listed so the owner can review it; phase 0 review round 2,
 * adversarial finding 10, remainder). The integrator maintains that list; this part of the
 * loosening check reads it.
 *
 * The list's form: one bullet per allow list, starting with the list's id in backticks, an
 * optional note in parentheses, a colon, then each entry key in backticks (or "none"):
 *
 *   - `render.entries` (tests/e2e/render/allowlist.ts): `date-day-month-year`, `max-file-size`
 *
 * A bullet may run on to indented lines. The check fails when:
 * - the heading is missing, or the section holds no bullet;
 * - an entry of an allow list, as read today or as the snapshot records it, is not listed in
 *   its list's bullet;
 * - a bullet names a key its list does not hold (a stale line misleads the owner), or names
 *   no list, a deny list, or a list twice.
 * Deny lists are not listed entry by entry: they are recorded whole (ADR 0010).
 */
import type { CurrentList, ExceptionListSnapshot } from './exception-lists';

export const OWNER_REVIEW_HEADING = "## For the owner's review";

interface ListedBullet {
  list: string;
  keys: string[];
  line: number;
}

/** The bullets of the "For the owner's review" section, or undefined when the heading is missing. */
export function parseOwnerReview(buildLog: string): ListedBullet[] | undefined {
  const lines = buildLog.split('\n');
  const start = lines.findIndex((line) => line.trim() === OWNER_REVIEW_HEADING || line.trim() === OWNER_REVIEW_HEADING.replace("'", '’'));
  if (start < 0) return undefined;
  const bullets: ListedBullet[] = [];
  let current: { text: string; line: number } | undefined;
  const flush = (): void => {
    if (current === undefined) return;
    const match = /^`([^`]+)`(?:\s*\([^)]*\))?\s*:(.*)$/s.exec(current.text);
    if (match !== null) {
      const keys = [...(match[2] ?? '').matchAll(/`([^`]+)`/g)].map((found) => found[1] ?? '');
      bullets.push({ list: match[1] ?? '', keys, line: current.line });
    }
    current = undefined;
  };
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    if (/^#{1,2} /.test(line)) break;
    const bullet = /^- (.*)$/.exec(line);
    if (bullet !== null) {
      flush();
      current = { text: bullet[1] ?? '', line: index + 1 };
    } else if (current !== undefined && /^\s+\S/.test(line)) {
      current.text += ` ${line.trim()}`;
    } else {
      flush();
    }
  }
  flush();
  return bullets;
}

/**
 * Problems with the owner's list against the allow lists as read today (`current`) and as
 * the snapshot records them (`recorded`).
 */
export function ownerReviewProblems(
  buildLog: string | undefined,
  current: ReadonlyMap<string, CurrentList>,
  recorded: ExceptionListSnapshot | undefined,
  label = 'docs/build-log.md',
): string[] {
  const where = `${label} "${OWNER_REVIEW_HEADING.replace(/^## /, '')}"`;
  if (buildLog === undefined) return [`${label} is missing, so the allow-list entries are not listed for the owner (prompt 3 section 7)`];
  const bullets = parseOwnerReview(buildLog);
  if (bullets === undefined) {
    return [`${label} has no heading "${OWNER_REVIEW_HEADING}": every allow-list entry of the exception lists is listed there for the owner (prompt 3 section 7; tools/checks/loosening/owner-review.ts)`];
  }
  if (bullets.length === 0) return [`${where} holds no list bullet`];

  const problems: string[] = [];
  const allowLists = new Map<string, Set<string>>();
  for (const [id, list] of current) {
    if (list.direction === 'allow') allowLists.set(id, new Set(list.entries.keys()));
  }
  for (const [id, list] of Object.entries(recorded?.lists ?? {})) {
    if (list.direction !== 'allow') continue;
    const keys = allowLists.get(id) ?? new Set<string>();
    for (const key of Object.keys(list.entries)) keys.add(key);
    allowLists.set(id, keys);
  }

  const byList = new Map<string, ListedBullet>();
  for (const bullet of bullets) {
    if (byList.has(bullet.list)) {
      problems.push(`${where}, line ${bullet.line}: lists \`${bullet.list}\` a second time; keep one bullet per list`);
      continue;
    }
    byList.set(bullet.list, bullet);
    const keys = allowLists.get(bullet.list);
    if (keys === undefined) {
      const direction = current.get(bullet.list)?.direction;
      problems.push(
        direction === 'deny'
          ? `${where}, line ${bullet.line}: \`${bullet.list}\` is a deny list, recorded whole; only allow lists are listed entry by entry`
          : `${where}, line ${bullet.line}: \`${bullet.list}\` names no exception list`,
      );
      continue;
    }
    for (const key of bullet.keys) {
      if (!keys.has(key)) problems.push(`${where}, line ${bullet.line}: \`${bullet.list}\` lists \`${key}\`, which the list does not hold; remove it, so the owner reads what is there`);
    }
  }
  for (const [id, keys] of allowLists) {
    if (keys.size === 0) continue;
    const bullet = byList.get(id);
    const listed = new Set(bullet?.keys ?? []);
    for (const key of [...keys].sort()) {
      if (!listed.has(key)) {
        problems.push(
          `${where}: the allow-list entry \`${key}\` of \`${id}\` is not listed for the owner` +
            (bullet === undefined ? ` (no bullet names \`${id}\`)` : ` (line ${bullet.line})`) +
            '; the integrator lists every allow entry there (prompt 3 section 7)',
        );
      }
    }
  }
  return problems;
}

/**
 * For seeded inputs: the build log with `key` listed in the bullet of `list` of the
 * "For the owner's review" section ("none" replaced). Throws when there is no such bullet.
 */
export function addToOwnerReview(buildLog: string, list: string, key: string): string {
  const lines = buildLog.split('\n');
  const start = lines.findIndex((line) => line.trim() === OWNER_REVIEW_HEADING);
  const at = lines.findIndex((line, index) => index > start && line.startsWith(`- \`${list}\``));
  if (start < 0 || at < 0) throw new Error(`the build log has no "For the owner's review" bullet for ${list}`);
  const line = lines[at] ?? '';
  lines[at] = /:\s*none\s*$/.test(line) ? line.replace(/:\s*none\s*$/, `: \`${key}\``) : `${line}, \`${key}\``;
  return lines.join('\n');
}
