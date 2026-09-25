/**
 * The rules for the render test's screen list (screens.ts; docs/adr/0006-render-test.md,
 * decision 1). tools/checks/render applies them in `pnpm checks`, with seeded bad lists in
 * its self-test, and the render spec applies them before it visits any screen.
 *
 * - The list names at least one screen, and each name once.
 * - Every entry has a name, a path under the base URL and `displayObjects`, and no other
 *   field than `arrange`.
 * - `displayObjects` is the registered API source (`displayObjectsFromApi()`), or `{}` for a
 *   screen that shows no value. A function (whatever it returns), a hand-typed map, an object
 *   that only looks like the API source, and the earlier `knownValueIds` field are refused.
 */
import { isRegisteredApiSource, type ApiDisplayObjectSource } from './api-display-objects';
import type { RenderScreen } from './screens';

const FIELDS = new Set(['name', 'path', 'displayObjects', 'arrange']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function displayObjectsProblem(label: string, source: unknown): string | null {
  if (isRegisteredApiSource(source)) return null;
  if (typeof source === 'function') {
    return `${label}: displayObjects is a function; a screen takes its display objects only from the registered API adapter (displayObjectsFromApi() in tests/e2e/render/api-display-objects.ts), never from a function a screen entry supplies`;
  }
  if (!isRecord(source)) {
    return `${label}: displayObjects must be displayObjectsFromApi() or {} (a screen with no value), not ${Array.isArray(source) ? 'a list' : String(source)}`;
  }
  if ('kind' in source) {
    return `${label}: displayObjects looks like the API source but was not made by displayObjectsFromApi(), so it is not registered`;
  }
  const ids = Object.keys(source);
  if (ids.length > 0) {
    return `${label}: displayObjects is a hand-typed map (${ids.map((id) => JSON.stringify(id)).join(', ')}); take them from the API with displayObjectsFromApi()`;
  }
  return null;
}

/** Problems with a screen list; empty when every entry follows the rules. */
export function screenProblems(input: unknown): string[] {
  if (!Array.isArray(input)) return ['the screen list is not a list'];
  if (input.length === 0) return ['the screen list names no screen, so the render test would visit nothing'];
  const problems: string[] = [];
  const names = new Set<string>();
  input.forEach((entry: unknown, index) => {
    const at = `screens.${String(index)}`;
    if (!isRecord(entry)) {
      problems.push(`${at}: is not a screen entry`);
      return;
    }
    const name = entry['name'];
    const label = typeof name === 'string' && name.trim() !== '' ? `${at} ("${name}")` : at;
    if (typeof name !== 'string' || name.trim() === '') problems.push(`${at}: has no name`);
    else if (names.has(name)) problems.push(`${label}: the name is listed twice`);
    else names.add(name);
    const path = entry['path'];
    if (typeof path !== 'string' || !path.startsWith('/')) problems.push(`${label}: path must start with /`);
    if ('knownValueIds' in entry) {
      problems.push(
        `${label}: knownValueIds is not accepted; a screen names displayObjects, taken from the API with displayObjectsFromApi(), or {} when it shows no value`,
      );
    }
    const extra = Object.keys(entry).filter((key) => !FIELDS.has(key) && key !== 'knownValueIds');
    if (extra.length > 0) problems.push(`${label}: has fields no screen entry has (${extra.join(', ')})`);
    if ('arrange' in entry && typeof entry['arrange'] !== 'function') problems.push(`${label}: arrange must be a function`);
    if (!('displayObjects' in entry) || entry['displayObjects'] === undefined) {
      problems.push(
        `${label}: has no displayObjects; every screen takes its display objects from the API with displayObjectsFromApi(), or names {} when it shows no value`,
      );
      return;
    }
    const problem = displayObjectsProblem(label, entry['displayObjects']);
    if (problem !== null) problems.push(problem);
  });
  return problems;
}

/** Where a screen's display objects come from, checked; throws when the entry breaks the rules. */
export function screenDisplayObjects(screen: RenderScreen): ApiDisplayObjectSource | Record<string, never> {
  const problems = screenProblems([screen]);
  if (problems.length > 0) throw new Error(`The render test cannot check this screen:\n  ${problems.join('\n  ')}`);
  return isRegisteredApiSource(screen.displayObjects) ? screen.displayObjects : {};
}
