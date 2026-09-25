/**
 * The registry check on the repository, its control input and its seeded bad
 * inputs (docs/guardrails.md 2.6 and rule 6; G6-1 and G6-2 shapes).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GATE_IDS } from '@sovitech/registry/gates';
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../lib';
import check from './check';
import { STARTING_SET_SIZE } from './core';
import { badSeeds, expectedReasons, runSeed } from './selftest';
import selfTest from './selftest';

describe('the registry check', () => {
  it('passes on the repository: the phase 1 production registry, the proposed settings and 18 gates', async () => {
    const result = await check();
    expect(result.details).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.summary).toContain('18 gates');
    expect(result.summary).toContain('30 of 30 question fields change a declared output');
  });

  it('passes its control input: a question whose answer reaches a declared output', async () => {
    const result = await runSeed('good');
    expect(result.details).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.summary).toContain('1 of 1 question fields change a declared output');
  });

  it('holds the seeded inputs the builder task names', () => {
    expect(badSeeds()).toEqual(
      expect.arrayContaining(['affects-only-proposal', 'question-no-effect', 'invented-tolerance', 'estimation-without-method', 'gate-malformed']),
    );
  });

  it.each(badSeeds())('fails seeded/%s for its own reason', { timeout: 60_000 }, async (name) => {
    const result = await runSeed(name);
    expect(result.ok).toBe(false);
    for (const reason of expectedReasons(name)) expect(result.details.join('\n')).toContain(reason);
  });

  it('holds the phase 1 review, round 3 seeds: owner choices, count shapes and the closed unit registry', () => {
    expect(badSeeds()).toEqual(expect.arrayContaining(['decision-not-owner', 'owner-choice-not-owner', 'count-without-integer-shape', 'unit-not-in-closed-registry']));
  });

  it('holds the empty-scope seeds of the phase 0 review', () => {
    expect(badSeeds()).toEqual(expect.arrayContaining(['gates-folder-missing', 'gates-fewer-than-starting-set']));
  });

  it("counts the starting set from prompt 3 section 5.4's table, not from GATE_IDS alone", () => {
    const prompt = readFileSync(join(repoRoot, 'docs/dev-prompts/03-build-interactive-app.md'), 'utf8').split('\n');
    const start = prompt.findIndex((line) => line.startsWith('### 5.4 Gates'));
    const end = prompt.findIndex((line, index) => index > start && (line.startsWith('## ') || line.startsWith('### ')));
    const ids = prompt
      .slice(start, end)
      .map((line) => /^\|\s*`([^`]+)`\s*\|/.exec(line)?.[1])
      .filter((id): id is string => id !== undefined);
    expect(start).toBeGreaterThan(-1);
    expect(ids).toHaveLength(STARTING_SET_SIZE);
    expect([...ids].sort()).toEqual([...GATE_IDS].sort());
  });

  it('self-test returns one failing result per bad seed', { timeout: 60_000 }, async () => {
    const results = await selfTest();
    const list = Array.isArray(results) ? results : [results];
    expect(list).toHaveLength(badSeeds().length);
    expect(list.every((result) => !result.ok)).toBe(true);
  });
});
