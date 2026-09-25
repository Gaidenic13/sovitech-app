/**
 * The lint-bans check: the good seeded input passes, every seeded bad input
 * fails, and an inline eslint-disable comment does not hide a ban.
 */
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { depcruiseTargets } from '../../eslint-rules/depcruise-harness';
import { topLevelRoots } from '../scan-roots/roots';
import { BAN_ROOTS, lintBans, scopeProblems, UNREAD_ID } from './lint-bans';
import selfTest, { badCases, lintSeeded, SEEDED, seededRule } from './selftest';

describe('lint-bans check', () => {
  it('passes the good seeded input, allowlisted files included', { timeout: 120_000 }, async () => {
    const outcome = await lintBans(join(SEEDED, 'good'));
    expect(outcome.files).toBeGreaterThan(0);
    expect(outcome.problems).toEqual([]);
  });

  it.each(badCases())('fails the seeded input %s with the rule its name gives', { timeout: 120_000 }, async (name) => {
    const rule = seededRule(name);
    const outcome = await lintSeeded(name);
    expect(outcome.problems.some((problem) => problem.includes(` ${rule}: `)), outcome.problems.join('\n')).toBe(true);
  });

  // Phase 0 review, finding 17: a tree without apps/ and packages/ passed with 0 files.
  it('never passes on an empty scope: each ban root must hold a file, and the boundary run a module', { timeout: 120_000 }, async () => {
    const nothing = await lintBans(join(SEEDED, 'bad', 'scope--nothing-to-lint'));
    expect(nothing.files).toBe(0);
    expect(nothing.problems).toEqual([]);
    expect(scopeProblems(nothing)).toHaveLength(2);
    const noPackages = await lintBans(join(SEEDED, 'bad', 'scope--no-packages-folder'));
    expect(noPackages.problems).toEqual([]);
    expect(scopeProblems(noPackages)).toEqual([expect.stringContaining('packages/: lint-bans/scope: ')]);
    expect(scopeProblems(await lintBans(join(SEEDED, 'good')), 1)).toEqual([]);
    expect(scopeProblems(await lintBans(join(SEEDED, 'good')), 0)).toEqual([expect.stringContaining('dependency-cruiser: lint-bans/scope: ')]);
  });

  it('scans HTML pages, which ESLint does not read', { timeout: 120_000 }, async () => {
    const colour = await lintBans(join(SEEDED, 'bad', 'html-colour-literals--theme-color-meta'));
    expect(colour.problems).toEqual([expect.stringContaining('apps/web/index.html:7:')]);
    expect(colour.problems[0]).toContain('lint-bans/html-colour-literals');
    const shadow = await lintBans(join(SEEDED, 'bad', 'html-shadows--inline-style'));
    expect(shadow.problems.every((problem) => problem.includes('lint-bans/html-shadows'))).toBe(true);
    expect(shadow.problems).toHaveLength(2);
  });

  // Phase 0 review round 2, adversarial finding 12: .mts and .cts modules were read by no ban.
  it('reads .mts and .cts modules', { timeout: 120_000 }, async () => {
    const mts = await lintBans(join(SEEDED, 'bad', 'no-zero-fallback--nullish-in-an-mts-module'));
    expect(mts.paths).toContain('packages/engine/src/total.mts');
    expect(mts.problems).toEqual([expect.stringContaining('packages/engine/src/total.mts:4:')]);
    const cts = await lintBans(join(SEEDED, 'bad', 'no-zero-fallback--nullish-in-a-cts-module'));
    expect(cts.paths).toContain('apps/api/src/area.cts');
    expect(cts.problems.every((problem) => problem.includes('sovitech/no-zero-fallback'))).toBe(true);
  });

  it('fails a script or style file no ban reads', { timeout: 120_000 }, async () => {
    const vue = await lintBans(join(SEEDED, 'bad', 'unread-extension--vue-component'));
    expect(vue.problems).toEqual([expect.stringContaining(`apps/web/src/AreaTile.vue:1:1 ${UNREAD_ID}: `)]);
    const scss = await lintBans(join(SEEDED, 'bad', 'unread-extension--scss-stylesheet'));
    expect(scss.problems).toEqual([expect.stringContaining(`packages/ui/src/panel.scss:1:1 ${UNREAD_ID}: `)]);
    // Files the bans read, and data files, are not reported.
    const good = await lintBans(join(SEEDED, 'good'));
    expect(good.problems.filter((problem) => problem.includes(UNREAD_ID))).toEqual([]);
  });

  // Phase 0 review round 2, adversarial finding 13: one list of scan roots.
  it('reads its ban roots and its boundary roots from the shared scan-roots list', () => {
    expect(BAN_ROOTS).toEqual(topLevelRoots('lint-bans'));
    expect(BAN_ROOTS).toEqual(['apps', 'packages']);
    expect(depcruiseTargets()).toEqual(topLevelRoots('lint:deps'));
  });

  it('ignores inline eslint-disable comments', { timeout: 120_000 }, async () => {
    const outcome = await lintBans(join(SEEDED, 'bad', 'no-zero-fallback--hidden-by-an-inline-disable'));
    expect(outcome.problems).toHaveLength(1);
    expect(outcome.problems[0]).toContain('sovitech/no-zero-fallback');
  });

  it('self-test: every seeded bad input fails, as run-all requires', { timeout: 180_000 }, async () => {
    const results = await selfTest();
    const list = Array.isArray(results) ? results : [results];
    expect(list.length).toBeGreaterThanOrEqual(badCases().length);
    expect(list.filter((result) => result.ok).map((result) => result.summary)).toEqual([]);
  });
});
