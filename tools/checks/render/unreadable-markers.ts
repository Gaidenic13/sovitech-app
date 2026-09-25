/**
 * Where the render test's unreadable markers may be set (phase 1; phase 0 review round 2,
 * adversarial finding 10, remainder): an entry of the reviewed `unreadable` list for an
 * element that loads no file (a canvas, a CSS image, an inline SVG drawing) names the one
 * component file that draws it (tests/e2e/render/allowlist-schema.ts), and its marker
 * `data-render-unreadable="<id>"` is accepted only there. The in-page harness cannot tell
 * which source file drew an element, so this source scan is where the entry is confined:
 * without it, any component could mark its own canvas with the viewer's entry, and the
 * numbers it draws would pass the render test unread.
 *
 * Over every script, markup and style file under apps/ and packages/:
 * - the marker is set only with a literal value: the attribute in JSX or HTML
 *   (`data-render-unreadable="id"`, `={'id'}`), `setAttribute('data-render-unreadable', 'id')`,
 *   or a props key `'data-render-unreadable': 'id'`. A value computed from code, the DOM
 *   dataset form (`dataset.renderUnreadable`) and any other mention are refused, because
 *   they could carry any entry's id anywhere;
 * - each literal names an entry of the unreadable list;
 * - an entry that names a component is set in that file only, and that file sets it (an
 *   entry whose component no longer draws the element is stale);
 * - an entry for a file-loading element names no component and is confined by its `src`
 *   pattern instead, so its marker may stand in any file.
 * CSS attribute selectors (`[data-render-unreadable]`) read the marker and set nothing; they pass.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { UnreadableEntry } from '../../../tests/e2e/render/contract';
import { listFiles, readText } from '../lib';

/** Files that can set a marker, under the roots the render test's screens come from. */
const SCANNED = ['apps/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,html,htm,css,mdx,vue,svelte}', 'packages/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,html,htm,css,mdx,vue,svelte}'];

const ATTRIBUTE = 'data-render-unreadable';

/** The literal forms, each capturing the id. */
const LITERAL_FORMS: readonly RegExp[] = [
  // JSX or HTML attribute: ="id", ='id', ={'id'}, ={"id"}, ={`id`}
  /data-render-unreadable\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*(?:"([^"]*)"|'([^']*)'|`([^`$]*)`)\s*\})/gu,
  // setAttribute('data-render-unreadable', 'id')
  /setAttribute\(\s*(['"`])data-render-unreadable\1\s*,\s*(?:"([^"]*)"|'([^']*)'|`([^`$]*)`)\s*\)/gu,
  // a props key: 'data-render-unreadable': 'id'
  /(['"`])data-render-unreadable\1\s*:\s*(?:"([^"]*)"|'([^']*)'|`([^`$]*)`)/gu,
];

/** A CSS attribute selector reads the marker; it sets nothing. */
const SELECTOR = /\[\s*data-render-unreadable\s*(?:[~|^$*]?=\s*(?:"[^"]*"|'[^']*'|[^\]\s]+)\s*)?\]/gu;

function lineOf(text: string, index: number): number {
  return text.slice(0, index).split('\n').length;
}

/** Every problem with the unreadable markers under `root`, against the reviewed list. */
export async function unreadableMarkerProblems(root: string, unreadable: readonly UnreadableEntry[]): Promise<string[]> {
  const problems: string[] = [];
  const byId = new Map(unreadable.map((entry) => [entry.id, entry]));
  const setIn = new Map<string, Set<string>>();
  const files = await listFiles(SCANNED, { cwd: root });
  for (const file of files) {
    const text = readText(join(root, file));
    if (!text.includes(ATTRIBUTE) && !text.includes('renderUnreadable')) continue;
    const covered = new Set<number>();
    const cover = (start: number, length: number): void => {
      for (let index = start; index < start + length; index += 1) covered.add(index);
    };
    for (const match of text.matchAll(SELECTOR)) cover(match.index, match[0].length);
    for (const form of LITERAL_FORMS) {
      for (const match of text.matchAll(form)) {
        if (covered.has(match.index)) continue;
        cover(match.index, match[0].length);
        const id = match.slice(1).find((group, position) => group !== undefined && !(position === 0 && /^['"`]$/u.test(group))) ?? '';
        const at = `${file}:${lineOf(text, match.index)}`;
        const entry = byId.get(id);
        if (entry === undefined) {
          problems.push(`${at}: ${ATTRIBUTE}="${id}" names no entry of the reviewed unreadable list (tests/e2e/render/allowlist.ts)`);
          continue;
        }
        setIn.set(id, (setIn.get(id) ?? new Set()).add(file));
        if (entry.component !== undefined && entry.component !== file) {
          problems.push(
            `${at}: ${ATTRIBUTE}="${id}" is set outside ${entry.component}, the one component the entry names; ` +
              'its pixels are reviewed for that component only, so another element cannot borrow the entry',
          );
        }
      }
    }
    // Any other mention: a value computed from code, the dataset form, a split name.
    for (const found of text.matchAll(/data-render-unreadable|renderUnreadable/gu)) {
      if (covered.has(found.index)) continue;
      problems.push(
        `${file}:${lineOf(text, found.index)}: ${found[0]} is set or named here without a literal entry id; ` +
          `set the marker only as ${ATTRIBUTE}="<entry id>" (or setAttribute with two literals), so the render check can confine each entry to its component`,
      );
    }
  }
  for (const entry of unreadable) {
    if (entry.component === undefined) continue;
    if (!existsSync(join(root, entry.component))) {
      problems.push(`tests/e2e/render/allowlist.ts: unreadable entry "${entry.id}" names ${entry.component}, which does not exist`);
    } else if (!(setIn.get(entry.id)?.has(entry.component) ?? false)) {
      problems.push(`tests/e2e/render/allowlist.ts: unreadable entry "${entry.id}" names ${entry.component}, which does not set ${ATTRIBUTE}="${entry.id}"; remove the stale entry`);
    }
  }
  return problems;
}
