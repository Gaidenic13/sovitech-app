/**
 * The render check (guardrails rule 2, "Render test"; 2.8 "Reserved terms"; prompt 3
 * section 7; docs/adr/0006-render-test.md).
 *
 * The render test itself runs in the browser: `pnpm test:render` on the app screens, the case
 * files tests/guardrails/G2-1.test.ts and G2-8.test.ts and tools/checks/render/rendered-copy.test.ts
 * on its harness pages. This check guards the files those runs read:
 * - tests/e2e/render/allowlist.ts: only rule 2's four categories, each entry with its
 *   category, reason and source, no entry that would let a quantity through, each step-number
 *   entry registering a stepper of a stated size and the title of each step, and a reviewed
 *   `unreadable` list (see allowlist-schema.ts);
 * - tests/e2e/render/screens.ts: every screen takes its display objects from the API through
 *   the registered adapter, or shows no value (see screens-schema.ts);
 * - tests/e2e/pages/: every harness page is listed in harness-pages.ts, and declares valid
 *   display objects in one JSON tag (see display-objects.ts).
 * It lists every allowlist entry and every screen in its details, for the owner's review in
 * docs/build-log.md.
 */
import { RENDER_ALLOWLIST } from '../../../tests/e2e/render/allowlist';
import { describeEntries, describeUnreadable, validateAllowlist } from '../../../tests/e2e/render/allowlist-schema';
import { isRegisteredApiSource } from '../../../tests/e2e/render/api-display-objects';
import { readDeclaredDisplayObjects, validateDisplayObjects } from '../../../tests/e2e/render/display-objects';
import { ALL_HARNESS_PAGES, harnessPageDisplayObjects, harnessPageFiles } from '../../../tests/e2e/render/harness-pages';
import { RENDER_SCREENS } from '../../../tests/e2e/render/screens';
import { screenProblems } from '../../../tests/e2e/render/screens-schema';
import { fail, pass } from '../lib';
import type { Check, CheckResult } from '../types';

export const NAME = 'render';
export const ALLOWLIST_FILE = 'tests/e2e/render/allowlist.ts';
export const SCREENS_FILE = 'tests/e2e/render/screens.ts';
export const PAGES_DIRECTORY = 'tests/e2e/pages';

/** Checks an allowlist value; `label` names where it came from. */
export function checkAllowlist(input: unknown, label: string = ALLOWLIST_FILE): CheckResult {
  const validation = validateAllowlist(input);
  if (!validation.ok) {
    return fail(
      NAME,
      `${label}: ${validation.problems.length} problem(s) in the render allowlist`,
      validation.problems.map((problem) => `${label}: ${problem}`),
    );
  }
  const byCategory = new Map<string, number>();
  for (const entry of validation.entries) {
    // A tally of entries per category, not an engineering value.
    const previous = byCategory.get(entry.category);
    byCategory.set(entry.category, previous === undefined ? 1 : previous + 1);
  }
  const counts = [...byCategory].map(([category, count]) => `${category} ${count}`).join(', ');
  return pass(
    NAME,
    `${label}: ${validation.entries.length} allowlist entries, rule 2 categories only${counts === '' ? '' : ` (${counts})`}; ${validation.unreadable.length} reviewed unreadable elements`,
    [...describeEntries(validation.entries), ...describeUnreadable(validation.unreadable)],
  );
}

/** Checks a screen list; `label` names where it came from. */
export function checkScreens(input: unknown, label: string = SCREENS_FILE): CheckResult {
  const problems = screenProblems(input);
  if (problems.length > 0) {
    return fail(
      NAME,
      `${label}: ${problems.length} problem(s) in the render test's screen list`,
      problems.map((problem) => `${label}: ${problem}`),
    );
  }
  const screens = input as ReadonlyArray<{ name: string; path: string; displayObjects: unknown }>;
  return pass(
    NAME,
    `${label}: ${screens.length} screen(s), each taking its display objects from the API or showing no value`,
    screens.map(
      (screen) =>
        `screen "${screen.name}" · ${screen.path} · display objects: ${isRegisteredApiSource(screen.displayObjects) ? 'what the page receives from the API (registered adapter)' : 'none (the screen shows no value)'}`,
    ),
  );
}

/** Checks display objects (as a harness page declares them, or as the API serves them); `label` names where they came from. */
export function checkDisplayObjects(input: unknown, label: string): CheckResult {
  const validation = validateDisplayObjects(input);
  if (!validation.ok) {
    return fail(NAME, `${label}: ${validation.problems.length} problem(s) in the display objects`, validation.problems.map((problem) => `${label}: ${problem}`));
  }
  return pass(NAME, `${label}: ${Object.keys(validation.displayObjects).length} display object(s)`, []);
}

/** Checks one harness page's HTML: its one display-object declaration, valid. */
export function checkHarnessPageHtml(html: string, label: string): CheckResult {
  try {
    const declared = readDeclaredDisplayObjects(html, label);
    return pass(NAME, `${label}: declares ${Object.keys(declared).length} display object(s)`, []);
  } catch (error) {
    return fail(NAME, `${label}: its display-object declaration is not valid`, [error instanceof Error ? error.message : String(error)]);
  }
}

/** Every page under tests/e2e/pages/ is listed once in harness-pages.ts, and declares valid display objects. */
export function checkHarnessPages(): CheckResult {
  const problems: string[] = [];
  const onDisk = harnessPageFiles();
  const listed = ALL_HARNESS_PAGES.map((page) => page.file);
  const seen = new Set<string>();
  for (const file of listed) {
    if (seen.has(file)) problems.push(`${PAGES_DIRECTORY}/${file}: listed twice in tests/e2e/render/harness-pages.ts`);
    seen.add(file);
    if (!onDisk.includes(file)) problems.push(`${PAGES_DIRECTORY}/${file}: listed in tests/e2e/render/harness-pages.ts, but no such page`);
  }
  for (const file of onDisk) {
    if (!seen.has(file)) {
      problems.push(`${PAGES_DIRECTORY}/${file}: not listed in tests/e2e/render/harness-pages.ts, so no test runs it and no expected result is stated`);
      continue;
    }
    try {
      harnessPageDisplayObjects(file);
    } catch (error) {
      problems.push(error instanceof Error ? error.message : String(error));
    }
  }
  if (onDisk.length === 0) problems.push(`${PAGES_DIRECTORY}: no harness page, so the render test proves nothing`);
  return problems.length > 0
    ? fail(NAME, `${PAGES_DIRECTORY}: ${problems.length} problem(s) with the harness pages`, problems)
    : pass(NAME, `${PAGES_DIRECTORY}: ${onDisk.length} harness pages, each listed with its expected result and declaring its display objects`, []);
}

/** The allowlist, the screen list and the harness pages together: one result, failing when any fails. */
export function checkRender(allowlist: unknown, screens: unknown): CheckResult {
  const results = [checkAllowlist(allowlist), checkScreens(screens), checkHarnessPages()];
  const failed = results.filter((result) => !result.ok);
  if (failed.length > 0) {
    return fail(
      NAME,
      failed.map((result) => result.summary).join('; '),
      failed.flatMap((result) => result.details),
    );
  }
  return pass(
    NAME,
    results.map((result) => result.summary).join('; '),
    results.flatMap((result) => result.details),
  );
}

const check: Check = async () => checkRender(RENDER_ALLOWLIST, RENDER_SCREENS);

export default check;
