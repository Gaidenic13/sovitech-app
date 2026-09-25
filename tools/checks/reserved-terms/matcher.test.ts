/**
 * The matcher's hyphen rule, tested from the check's side: a multi-word term
 * written with a hyphen or dash between its words is the same term (phase 0
 * review finding: "firm-price" was not matched). The list and matcher live in
 * packages/registry/src/reserved-terms.ts.
 */
import { describe, expect, it } from 'vitest';
import { findReservedTerms } from '@sovitech/registry/reserved-terms';

const terms = (text: string): string[] => findReservedTerms(text).map((match) => match.term);

describe('multi-word terms joined by a hyphen or dash', () => {
  it('matches a hyphen, a non-breaking hyphen or a dash with no space around it', () => {
    expect(terms('firm-price')).toEqual(['firm price']);
    expect(terms('FIRM‑PRICE')).toEqual(['firm price']);
    expect(terms('in-line-with')).toEqual(['in line with']);
    expect(terms('in line-with')).toEqual(['in line with']);
    expect(terms('will–save')).toEqual(['will save']);
    expect(terms('oferta-ferma')).toEqual(['ofertă fermă']);
  });

  it('reports the hyphenated text as written, with its position', () => {
    const [match] = findReservedTerms('A firm-price estimate');
    expect(match?.text).toBe('firm-price');
    expect(match?.index).toBe(2);
  });

  it('does not join words across a spaced dash, two hyphens or other punctuation', () => {
    expect(terms('firm - price')).toEqual([]);
    expect(terms('firm--price')).toEqual([]);
    expect(terms('firm, price')).toEqual([]);
    expect(terms('firm_price')).toEqual([]);
  });

  it('keeps single-word matching unchanged next to a hyphen', () => {
    expect(terms('non-binding')).toEqual(['binding']);
    expect(terms('user_confirmed')).toEqual([]);
  });
});
