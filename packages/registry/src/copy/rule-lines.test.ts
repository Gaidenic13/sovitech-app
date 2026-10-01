/**
 * The rule lines against docs/guardrails.md, read at test time (./rule-lines.ts: "the words outside
 * the slots must occur there"), as copy.test.ts reads 2.8 for the badges and status lines. A
 * singular variant (`<id>_one`) has the same words as its plural, in the singular. None holds a
 * reserved term (2.8), so none needs an allowance.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { findReservedTerms } from '../reserved-terms';
import { RULE_LINES, ruleLineById } from './rule-lines';

const guardrails = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../../../docs/guardrails.md'), 'utf8').replace(/\s+/gu, ' ');

/** The words of a template around its slots. */
const fragments = (template: string): string[] => template.split(/\{[^{}]+\}/u).filter((fragment) => fragment.trim() !== '');
const slots = (template: string): string[] => [...template.matchAll(/\{([^{}]+)\}/gu)].map((match) => match[1] ?? '');

/** The singular words a `_one` variant may use in place of its plural's. */
const SINGULAR: readonly (readonly [string, string])[] = [
  ['thing ', 'things '],
  ['classification', 'classifications'],
  [' file.', ' files.'],
  [' value', ' values'],
  ['when it finishes', 'when they finish'],
  ["see it on", 'see them on'],
];

describe('the rule lines (docs/guardrails.md rules 4, 5, 7 and 12, 2.3, 2.8, section 4)', () => {
  it('2.8 · rules 4, 5, 7 and 12: each line\'s words outside its slots occur in docs/guardrails.md', () => {
    for (const line of RULE_LINES) {
      if (line.id.endsWith('_one') || line.id.endsWith('_vowel')) continue;
      for (const fragment of fragments(line.template)) {
        expect(guardrails.includes(fragment), `${line.id}: "${fragment}"`).toBe(true);
      }
    }
  });

  it('2.8 · rule 7: a singular variant has its plural\'s words and slots, in the singular', () => {
    const singulars = RULE_LINES.filter((line) => line.id.endsWith('_one'));
    expect(singulars.length).toBeGreaterThan(0);
    for (const line of singulars) {
      const plural = ruleLineById(line.id.slice(0, -'_one'.length));
      let words = line.template;
      for (const [one, many] of SINGULAR) words = words.replace(one, many);
      expect(words, line.id).toBe(plural.template);
      expect(slots(line.template)).toEqual(slots(plural.template));
    }
  });

  it('2.8 · section 4: a vowel variant has its base line\'s words, with "an" for "a" before its slot', () => {
    const variants = RULE_LINES.filter((line) => line.id.endsWith('_vowel'));
    expect(variants.length).toBeGreaterThan(0);
    for (const line of variants) {
      const base = ruleLineById(line.id.slice(0, -'_vowel'.length));
      expect(line.template.replace(/\ban \{/u, 'a {'), line.id).toBe(base.template);
    }
  });

  it('2.8 · rule 2: ids are unique, every line names its source, and none holds a reserved term (2.8) or a digit of its own', () => {
    expect(new Set(RULE_LINES.map((line) => line.id)).size).toBe(RULE_LINES.length);
    for (const line of RULE_LINES) {
      expect(line.source.trim(), line.id).not.toBe('');
      expect(findReservedTerms(line.template), line.id).toEqual([]);
      expect(line.template.replace(/\{[^{}]+\}/gu, ''), line.id).not.toMatch(/\d/u);
    }
  });
});
