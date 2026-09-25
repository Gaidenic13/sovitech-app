/**
 * The render check: the real allowlist, screen list and harness pages pass, each seeded bad
 * input fails for its own reason, and the self-test flags a seed that fails for another
 * reason (docs/adr/0006-render-test.md).
 */
import { describe, expect, test } from 'vitest';
import { displayObjectsFromApi } from '../../../tests/e2e/render/api-display-objects';
import { validateDisplayObjects } from '../../../tests/e2e/render/display-objects';
import type { CheckResult } from '../types';
import check, { checkAllowlist, checkHarnessPages, checkScreens } from './check';
import { BAD_CASES, asSeededResult, runCase, runGood, seededFiles } from './cases';
import selfTest from './selftest';

const REASON = 'A seeded entry with a reason long enough to pass the length rule of the schema.';
const TITLES = ['Project', 'Documents', 'Building', 'Systems', 'Operations', 'Goals', 'Automation', 'Proposal'];

describe('F-RENDER-06 · G2-1: the render check', () => {
  test('G2-1: the real allowlist, screen list and harness pages pass, and list every entry and screen', async () => {
    const result = await check();
    expect(result.ok, result.details.join('\n')).toBe(true);
    expect(result.name).toBe('render');
    expect(result.details.some((line) => line.startsWith('wizard-step-number'))).toBe(true);
    expect(result.details.some((line) => line.startsWith('screen "'))).toBe(true);
    expect(runGood().ok).toBe(true);
    expect(checkHarnessPages().ok).toBe(true);
  });

  test('G2-1: every seeded file has an expected reason, and every expected reason a file', () => {
    expect(seededFiles()).toEqual(BAD_CASES.map((seededCase) => seededCase.file).sort());
  });

  // The run-guard seeds start a Playwright run each, so these get a longer timeout.
  test.for(BAD_CASES.map((seededCase) => [seededCase.file, seededCase] as const))('G2-1: seeded %s fails for its own reason', { timeout: 120_000 }, async ([, seededCase]) => {
    const result = await runCase(seededCase);
    expect(result.ok).toBe(false);
    for (const text of seededCase.expect) expect([result.summary, ...result.details].join('\n')).toContain(text);
  });

  test('G2-1: the self-test returns one failing result per seed', { timeout: 180_000 }, async () => {
    const results = await selfTest();
    const list = Array.isArray(results) ? results : [results];
    expect(list).toHaveLength(BAD_CASES.length);
    expect(list.every((result) => !result.ok), list.filter((result) => result.ok).map((result) => result.summary).join('\n')).toBe(
      true,
    );
  });

  test('G2-1: a seed that fails for another reason than its own is flagged by the self-test', async () => {
    // The missing-reason seed fails, but not for "must be anchored"; the old self-test counted any failure.
    const wrongReason = asSeededResult(
      { file: 'allowlist/missing-reason.json', expect: ['must be anchored'] },
      await runCase({ file: 'allowlist/missing-reason.json', expect: [] }),
    );
    expect(wrongReason.ok).toBe(true);
    expect(wrongReason.summary).toContain('not for the seeded reason');
  });

  test('G2-1: an allowlist with no entries and no reviewed unreadable elements passes (nothing is allowed)', () => {
    expect(checkAllowlist({ entries: [], unreadable: [] }, 'empty').ok).toBe(true);
  });

  test('G2-1: the step-number entry must register its stepper size and titles, and the pattern must cover exactly its positions', () => {
    const entry = { id: 'wizard-step-number', category: 'step_number', reason: REASON, source: 'TEST seeded source' };
    const withSteps = (pattern: string, steps: number, titles: readonly string[] = TITLES.slice(0, steps)): CheckResult =>
      checkAllowlist({ entries: [{ ...entry, pattern, steps, titles }], unreadable: [] }, 'TEST');
    expect(withSteps('^[1-8]$', 8).ok).toBe(true);
    expect(withSteps('^[1-7]$', 8).details.join('\n')).toContain('refuses positions 8');
    expect(withSteps('^[1-9]$', 8).details.join('\n')).toContain('past the last position');
    expect(withSteps('^[1-8]$', 8, [...TITLES.slice(0, 7), 'Goals']).details.join('\n')).toContain('is listed twice');
    expect(withSteps('^[1-8]$', 8, [...TITLES.slice(0, 7), 'Eight AHUs']).details.join('\n')).toContain('has a number');
    expect(checkAllowlist({ entries: [{ ...entry, pattern: '^[1-8]$', titles: TITLES }], unreadable: [] }, 'TEST').ok).toBe(false);
  });

  test('G2-1: a reviewed unreadable entry needs a known element kind, a reason and a source', () => {
    const good = { id: 'model-viewer', element: 'canvas', reason: REASON, source: 'TEST seeded source' };
    expect(checkAllowlist({ entries: [], unreadable: [good] }, 'TEST').ok).toBe(true);
    expect(checkAllowlist({ entries: [], unreadable: [{ ...good, element: 'svg-graphic' }] }, 'TEST').ok).toBe(true);
    expect(checkAllowlist({ entries: [], unreadable: [{ ...good, element: 'iframe' }] }, 'TEST').ok).toBe(false);
    expect(checkAllowlist({ entries: [], unreadable: [{ ...good, reason: 'short' }] }, 'TEST').ok).toBe(false);
    // An image entry names its file, anchored; a canvas entry names none.
    const image = { ...good, id: 'test-image', element: 'img' };
    expect(checkAllowlist({ entries: [], unreadable: [image] }, 'TEST').details.join('\n')).toContain('src is missing');
    expect(checkAllowlist({ entries: [], unreadable: [{ ...image, src: 'test-image\\.svg' }] }, 'TEST').details.join('\n')).toContain(
      'must be anchored',
    );
    expect(checkAllowlist({ entries: [], unreadable: [{ ...image, src: '(?:^|/)test-image\\.svg$' }] }, 'TEST').ok).toBe(true);
    expect(checkAllowlist({ entries: [], unreadable: [{ ...good, src: 'x$' }] }, 'TEST').details.join('\n')).toContain(
      'only for elements that load a file',
    );
  });

  test('G2-1: a screen list whose screens take their display objects from the registered API adapter, or show no value, passes', () => {
    expect(checkScreens([{ name: 'TEST screen', path: '/', displayObjects: displayObjectsFromApi() }], 'TEST').ok).toBe(true);
    expect(checkScreens([{ name: 'TEST screen', path: '/', displayObjects: {} }], 'TEST').ok).toBe(true);
    // A function is refused, whatever it returns.
    const fromFunction = (): Promise<Record<string, { text: string }>> => Promise.resolve({});
    expect(checkScreens([{ name: 'TEST screen', path: '/', displayObjects: fromFunction }], 'TEST').details.join('\n')).toContain(
      'displayObjects is a function',
    );
    expect(checkScreens([{ name: 'TEST screen', path: '/', displayObjects: {}, knownValueId: [] }], 'TEST').ok).toBe(false);
    expect(
      checkScreens(
        [
          { name: 'TEST screen', path: '/', displayObjects: {} },
          { name: 'TEST screen', path: '/b', displayObjects: {} },
        ],
        'TEST',
      ).details.join('\n'),
    ).toContain('listed twice');
  });

  test('G2-1: display objects need value ids, a text, and parts found in the text or a line', () => {
    expect(validateDisplayObjects({ 'building:b-test.guestRooms': { text: 'TEST 123', parts: ['123'] } }).ok).toBe(true);
    expect(
      validateDisplayObjects({ 'building:b-test.area': { text: 'TEST 12,345 m²', lines: ['Found on page 1'], parts: ['page 1'] } }).ok,
    ).toBe(true);
    expect(validateDisplayObjects({ 'building:b-test.guestRooms': { text: 'TEST 123', parts: ['TEST 1234'] } }).ok).toBe(false);
    expect(validateDisplayObjects(() => ({})).problems.join('\n')).toContain('not a function');
    expect(validateDisplayObjects({ 'building:b-test.guestRooms': { text: '  TEST   123 ' } }).displayObjects).toEqual({
      'building:b-test.guestRooms': { text: 'TEST 123' },
    });
  });
});
