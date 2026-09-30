/**
 * G9-5 (docs/guardrails.md section 7; rule 9, "Arithmetic lives in code ... It never writes
 * a number it was not given, and that includes range bounds and percentages"; rule 2,
 * "Numbers in prose are references, not text"; F-PROPOSAL-04).
 * Situation: AI prose contains a range the engine did not return.
 * Expected: rejected.
 *
 * The engine returns a range inside one calculation token, rendered by code with its badge
 * and rounding. A range the AI writes itself, in digits, in words or out of two tokens, is
 * a range the engine did not return. The figures are TEST figures.
 */
import { validateDraftingOutput, type DraftingValidationContext } from '@sovitech/ai';
import { describe, expect, test } from 'vitest';

const PROJECT = 'test-project-g9-5';
const context: DraftingValidationContext = {
  projectId: PROJECT,
  slots: new Set(['points']),
  tokens: new Set(['{{calc:bmsPoints}}', '{{value:TEST.points.low}}', '{{value:TEST.points.high}}']),
  names: [],
};

const draft = (text: string) => validateDraftingOutput({ paragraphs: [{ slot: 'points', text }], notes: [] }, context);
const rules = (text: string) => draft(text).rejections.map((rejection) => rejection.rules);

describe('G9-5: a range the engine did not return', () => {
  test('F-PROPOSAL-04 · G9-5: a range typed in digits is rejected', () => {
    const result = draft('The points estimate lies between 9,101 and 9,202 points.');
    expect(result.accepted.paragraphs).toEqual([]);
    expect(result.rejections.map((rejection) => rejection.rules)).toEqual([['digit_outside_token']]);
    expect(rules('Savings could be 9-12% of the baseline.')).toEqual([['digit_outside_token', 'number_word']]);
  });

  test('F-PROPOSAL-04 · G9-5: a range written in words is rejected', () => {
    expect(rules('The points estimate lies between nine and ten thousand points.')).toEqual([['number_word']]);
    expect(rules('Estimarea este între nouăzeci și o sută de puncte.')).toEqual([['number_word']]);
  });

  test('F-PROPOSAL-04 · G9-5: a range built from two tokens is rejected', () => {
    expect(rules('The points estimate runs from {{value:TEST.points.low}} to {{value:TEST.points.high}}.')).toEqual([['composed_range']]);
    expect(rules('The estimate is {{value:TEST.points.low}}–{{value:TEST.points.high}} points.')).toEqual([['composed_range']]);
  });

  test('F-PROPOSAL-04 · G9-5 (control): the engine range, as its one calculation token, passes', () => {
    const result = draft('The points estimate is {{calc:bmsPoints}}, and it rests on equipment not yet checked.');
    expect(result.rejections).toEqual([]);
    expect(result.accepted.paragraphs).toHaveLength(1);
  });
});
