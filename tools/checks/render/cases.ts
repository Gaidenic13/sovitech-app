/**
 * The seeded inputs of the render check, shared by selftest.ts and the unit tests.
 *
 * - The good control is the real input: tests/e2e/render/allowlist.ts, tests/e2e/render/screens.ts
 *   and the harness pages under tests/e2e/pages/. It must pass.
 * - Each bad case is one file under seeded/, with the text its findings must contain, so it
 *   fails for the reason it was seeded for and not for another one:
 *   - allowlist/<name>.json: an allowlist;
 *   - screens/<name>.json or .ts: a screen list (a .ts seed default-exports it, for entries
 *     JSON cannot hold, such as a function);
 *   - display-objects/<name>.json: display objects, as a harness page declares them or the API
 *     serves them;
 *   - harness-pages/<name>.html: a harness page's HTML, whose display-object declaration is read;
 *   - markers/<name>/allowlist.json: a reviewed unreadable list, with a tree of apps/ and packages/
 *     files beside it that set the markers (.tsx only, so no other seed file is read
 *     as a seed), checked by the source scan of unreadable-markers.ts;
 *   - run-guard/<name>.spec.ts: a Playwright spec, run in a render project under the
 *     repository's own playwright.config.ts settings (its reporters, the run guard included,
 *     and forbidOnly), with no web server and no browser; the run must fail.
 *
 * The render test's own seeded bad pages are the harness pages under tests/e2e/pages/ (G2-1,
 * G2-8 and 2.8), run in Chromium by tests/guardrails/G2-1.test.ts, G2-8.test.ts,
 * tools/checks/render/rendered-copy.test.ts and the canaries in render.spec.ts.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { fail, pass, readText, repoRoot } from '../lib';
import type { CheckResult } from '../types';
import type { UnreadableEntry } from '../../../tests/e2e/render/contract';
import { NAME, checkAllowlist, checkDisplayObjects, checkHarnessPageHtml, checkRepository, checkScreens, checkUnreadableMarkers } from './check';

export const SEEDED_DIRECTORY = fileURLToPath(new URL('./seeded/', import.meta.url));

export interface SeededCase {
  /** Path under seeded/. */
  readonly file: string;
  /** Text the findings must contain. */
  readonly expect: readonly string[];
}

export const BAD_CASES: readonly SeededCase[] = [
  { file: 'allowlist/counter-format-without-placeholders.json', expect: ['must contain {count} and {max}'] },
  { file: 'allowlist/date-format-without-token.json', expect: ['uses no date or time token'] },
  { file: 'allowlist/duplicate-id.json', expect: ['entry id "max-file-size" is listed twice'] },
  { file: 'allowlist/extra-field.json', expect: ['has fields no allowlist entry has (scope)'] },
  { file: 'allowlist/fixed-copy-bare-number.json', expect: ['is a bare number'] },
  { file: 'allowlist/fixed-copy-no-number.json', expect: ['has no number character'] },
  { file: 'allowlist/missing-reason.json', expect: ['entries.0.reason: is missing'] },
  { file: 'allowlist/step-entry-without-stepper.json', expect: ['entries.0.steps: is missing'] },
  { file: 'allowlist/step-pattern-accepts-quantities.json', expect: ['accepts quantities'] },
  { file: 'allowlist/step-pattern-past-steps.json', expect: ['past the last position of its 6-item stepper'] },
  { file: 'allowlist/step-pattern-unanchored.json', expect: ['must be anchored'] },
  { file: 'allowlist/step-title-with-number-word.json', expect: ['title 8 "Two air handling units" has a number'] },
  { file: 'allowlist/step-title-with-number.json', expect: ['title 8 "Proposal and TEST 12 AHUs" has a number'] },
  { file: 'allowlist/step-titles-count.json', expect: ['titles must name each of its 8 steps once, in order; it names 6'] },
  { file: 'allowlist/step-titles-missing.json', expect: ['entries.0.titles: is missing'] },
  { file: 'allowlist/unknown-category.json', expect: ["not one of rule 2's categories"] },
  { file: 'allowlist/unreadable-img-without-src.json', expect: ['src is missing'] },
  { file: 'allowlist/unreadable-list-missing.json', expect: ['unreadable: is missing'] },
  { file: 'allowlist/unreadable-svg-graphic-with-src.json', expect: ['src is only for elements that load a file'] },
  { file: 'allowlist/unreadable-unknown-element.json', expect: ['unreadable.0.element:'] },
  { file: 'display-objects/empty-text.json', expect: ['building:b-test.guestRooms.text: must not be empty'] },
  { file: 'display-objects/evidence-without-hash.json', expect: ['building:b-test.guestRooms.evidence.0.contentHash:'] },
  { file: 'display-objects/extra-field.json', expect: ['has fields no display object has (badge)'] },
  { file: 'display-objects/malformed-value-id.json', expect: ['"guestRooms" is not a value id'] },
  { file: 'display-objects/not-a-map.json', expect: ['display objects must be an object from value ids to what each shows, not a list'] },
  { file: 'display-objects/part-not-in-text.json', expect: ['part "TEST 12,345" occurs neither in its text'] },
  { file: 'harness-pages/declaration-not-json.html', expect: ['its display-object declaration is not JSON'] },
  { file: 'harness-pages/declared-twice.html', expect: ['it has 2'] },
  { file: 'harness-pages/no-declaration.html', expect: ['it has 0'] },
  { file: 'run-guard/fail-marked.spec.ts', expect: ['marked to fail (test.fail)'] },
  { file: 'run-guard/focused.spec.ts', expect: ['forbidOnly'] },
  {
    file: 'run-guard/held-out.spec.ts',
    expect: ['Playwright run guard FAILED the run', 'skipped (test.skip, test.fixme', 'each screen is checked once'],
  },
  // Phase 1 (phase 0 review round 2, adversarial finding 10, remainder).
  { file: 'allowlist/fixed-copy-reads-as-quantity.json', expect: ['text "TEST rooms 212" reads as a quantity', 'which names what a count counts'] },
  { file: 'allowlist/fixed-copy-unit-quantity.json', expect: ['text "Limit TEST 12 kW" reads as a quantity', 'is a number with a unit of guardrails rule 8'] },
  { file: 'allowlist/fixed-copy-romanian-quantity.json', expect: ['text "TEST 12 camere" reads as a quantity'] },
  { file: 'allowlist/fixed-copy-attached-unit.json', expect: ['text "TEST 34.500mp" reads as a quantity'] },
  { file: 'allowlist/unreadable-canvas-without-component.json', expect: ['component is missing; an element that loads no file (canvas)'] },
  { file: 'allowlist/unreadable-css-image-without-component.json', expect: ['component is missing; an element that loads no file (css-image)'] },
  { file: 'allowlist/unreadable-component-outside-app-code.json', expect: ['component "tests/e2e/pages/canvas.html" is not a file path under apps/ or packages/'] },
  { file: 'markers/canvas-marker-outside-its-component/allowlist.json', expect: ['data-render-unreadable="test-viewer-canvas" is set outside packages/viewer/src/ModelCanvas.tsx'] },
  { file: 'markers/computed-marker-value/allowlist.json', expect: ['is set or named here without a literal entry id'] },
  { file: 'markers/dataset-marker/allowlist.json', expect: ['renderUnreadable is set or named here without a literal entry id'] },
  { file: 'markers/component-without-marker/allowlist.json', expect: ['names packages/viewer/src/ModelCanvas.tsx, which does not set data-render-unreadable="test-viewer-canvas"'] },
  { file: 'markers/unknown-marker-id/allowlist.json', expect: ['data-render-unreadable="test-borrowed" names no entry of the reviewed unreadable list'] },
  { file: 'screens/function-display-objects.ts', expect: ['displayObjects is a function'] },
  { file: 'screens/function-known-value-ids.ts', expect: ['knownValueIds is not accepted', 'has no displayObjects'] },
  { file: 'screens/hand-typed-ids.json', expect: ['displayObjects is a hand-typed map'] },
  { file: 'screens/known-value-ids-field.json', expect: ['knownValueIds is not accepted'] },
  { file: 'screens/look-alike-api-source.json', expect: ['looks like the API source but was not made by displayObjectsFromApi()'] },
  { file: 'screens/no-screen.json', expect: ['names no screen'] },
  { file: 'screens/without-known-ids.json', expect: ['has no displayObjects'] },
];

const SEED_EXTENSIONS = /\.(?:json|ts|html)$/u;

/** Every seed file under seeded/, as a path relative to it, sorted. */
export function seededFiles(): string[] {
  const found: string[] = [];
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (SEED_EXTENSIONS.test(entry.name)) found.push(relative(SEEDED_DIRECTORY, path).split('\\').join('/'));
    }
  };
  walk(SEEDED_DIRECTORY);
  return found.sort();
}

/** The real allowlist, screen list, harness pages and markers: the control input, which must pass. */
export async function runGood(): Promise<CheckResult> {
  return checkRepository();
}

const PLAYWRIGHT_CLI = join(repoRoot, 'node_modules', '@playwright', 'test', 'cli.js');

/**
 * Runs one seeded Playwright spec as a render project, under the repository's
 * playwright.config.ts (its reporters, the run guard included, and forbidOnly), with no web
 * server and no global setup (the e2e stack, phase 3). The config lives in a temporary
 * directory, never in the repository.
 */
function runPlaywrightSeed(file: string, label: string): CheckResult {
  const directory = mkdtempSync(join(tmpdir(), 'sovitech-render-guard-'));
  try {
    const config = join(directory, 'seed.config.ts');
    writeFileSync(
      config,
      [
        `import { resolve } from 'node:path';`,
        `import base from ${JSON.stringify(join(repoRoot, 'playwright.config.ts'))};`,
        `const root = ${JSON.stringify(repoRoot)};`,
        `const reporter = (Array.isArray(base.reporter) ? base.reporter : []).map((entry) =>`,
        `  Array.isArray(entry) && typeof entry[0] === 'string' && entry[0].startsWith('.') ? [resolve(root, entry[0]), ...entry.slice(1)] : entry);`,
        // No web server and no global setup: the seeds prove the run guard, and need neither the app nor the e2e stack (ADR 0037).
        `export default { ...base, webServer: undefined, globalSetup: undefined, reporter, testDir: ${JSON.stringify(join(SEEDED_DIRECTORY, 'run-guard'))},`,
        `  outputDir: ${JSON.stringify(join(directory, 'out'))}, projects: [{ name: 'render', testMatch: ${JSON.stringify(`**/${basename(file)}`)} }] };`,
        '',
      ].join('\n'),
    );
    const run = spawnSync(process.execPath, [PLAYWRIGHT_CLI, 'test', '--config', config], { cwd: repoRoot, encoding: 'utf8', timeout: 120_000 });
    const output = `${run.stdout}\n${run.stderr}`.split('\n').filter((line) => line.trim() !== '');
    return run.status === 0
      ? pass(NAME, `${label}: the Playwright run passed (exit 0)`, output)
      : fail(NAME, `${label}: the Playwright run failed (exit ${String(run.status)})`, output);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

async function loadSeed(file: string): Promise<unknown> {
  const path = join(SEEDED_DIRECTORY, file);
  if (file.endsWith('.ts')) {
    const module = (await import(pathToFileURL(path).href)) as { default?: unknown };
    return module.default;
  }
  const text = readText(path);
  return file.endsWith('.json') ? (JSON.parse(text) as unknown) : text;
}

export async function runCase(seededCase: SeededCase): Promise<CheckResult> {
  const label = `seeded/${seededCase.file}`;
  if (seededCase.file.startsWith('run-guard/')) return runPlaywrightSeed(seededCase.file, label);
  const input = await loadSeed(seededCase.file);
  if (seededCase.file.startsWith('allowlist/')) return checkAllowlist(input, label);
  if (seededCase.file.startsWith('screens/')) return checkScreens(input, label);
  if (seededCase.file.startsWith('display-objects/')) return checkDisplayObjects(input, label);
  if (seededCase.file.startsWith('harness-pages/')) return checkHarnessPageHtml(String(input), label);
  if (seededCase.file.startsWith('markers/')) {
    // A tree: allowlist.json holds the reviewed unreadable list, and apps/ and packages/ the code that sets markers.
    const unreadable = (input as { unreadable?: UnreadableEntry[] }).unreadable ?? [];
    const allowlist = checkAllowlist({ entries: [], unreadable }, label);
    if (!allowlist.ok) return allowlist;
    return checkUnreadableMarkers(join(SEEDED_DIRECTORY, dirname(seededCase.file)), unreadable, label);
  }
  throw new Error(`${label}: a seed lives under seeded/allowlist/, seeded/screens/, seeded/display-objects/, seeded/harness-pages/, seeded/markers/ or seeded/run-guard/`);
}

/**
 * A bad case that fails without its expected finding failed for another reason; it is
 * returned as passing, so the self-test run flags it.
 */
export function asSeededResult(seededCase: SeededCase, result: CheckResult): CheckResult {
  const details = [result.summary, ...result.details].join('\n');
  const missing = seededCase.expect.filter((text) => !details.includes(text));
  if (result.ok || missing.length === 0) return result;
  return { ...result, ok: true, summary: `${result.summary}; but not for the seeded reason (no finding with ${missing.join(', ')})` };
}
