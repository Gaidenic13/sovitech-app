/**
 * The demo's owner answers (./owner-answers.ts): the committed file passes the checks, and
 * each kind of answer the demo must never carry is refused before anything is written. No
 * database: the store's half is tests/api/demo-seed.test.ts.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { REPOSITORY_ROOT } from '../config';
import { DEMO_WORKING_NAME, DemoAnswersError, OWNER_ANSWERS_PATH, ownerStepOf, planOwnerAnswers, readOwnerAnswers } from './owner-answers';

/** The committed file as data, to change one thing at a time. */
function committed(): { format: string; about: string; answers: { step: number; fieldKey: string; choice?: string; text?: string }[] } {
  return parse(readFileSync(join(REPOSITORY_ROOT, OWNER_ANSWERS_PATH), 'utf8'), { schema: 'json' }) as never;
}

function problemsOf(content: unknown): readonly string[] {
  try {
    planOwnerAnswers(content);
    return [];
  } catch (error) {
    if (error instanceof DemoAnswersError) return error.problems;
    throw error;
  }
}

describe('the demo owner answers (prompt 3 section 7)', () => {
  it('US-ADMIN-15 AC1 · rule 7: the committed file answers the four step 1 fields, with the working name, and every option of steps 4, 6 and 7', () => {
    const answers = readOwnerAnswers(REPOSITORY_ROOT);
    const byKey = new Map(answers.map((answer) => [answer.fieldKey, answer]));
    expect(byKey.get('project.name')?.value).toEqual({ text: DEMO_WORKING_NAME });
    for (const key of ['project.type', 'project.country', 'project.city']) expect(byKey.get(key)?.step).toBe(1);
    expect(answers.filter((answer) => answer.step === 4)).toHaveLength(8);
    expect(answers.filter((answer) => answer.step === 6)).toHaveLength(7);
    expect(answers.filter((answer) => answer.step === 7)).toHaveLength(6);
    expect(answers.filter((answer) => answer.step === 5).map((answer) => answer.fieldKey).sort()).toEqual(['building.type', 'project.occupancy', 'project.operatingSchedule']);
  });

  it('US-ADMIN-15 · F-INGEST-09 · rule 1 · rule 3: every answer is on a field the owner confirms, so none is an engineering value', () => {
    for (const answer of readOwnerAnswers(REPOSITORY_ROOT)) expect(ownerStepOf(answer.fieldKey)).toBe(answer.step);
    const file = committed();
    file.answers.push({ step: 5, fieldKey: 'building.grossFloorArea', text: 'TEST' });
    file.answers.push({ step: 5, fieldKey: 'building.rooms', choice: 'TEST' });
    const problems = problemsOf(file);
    expect(problems).toContainEqual(expect.stringContaining('building.grossFloorArea'));
    expect(problems.filter((problem) => problem.includes('confirmBy is engineer'))).toHaveLength(2);
    expect(problems.filter((problem) => problem.includes('engineering value'))).toHaveLength(2);
  });

  it('US-ADMIN-15 · F-INGEST-09 · rule 10 · OD-5: the project is named with the demo working name, never another', () => {
    const file = committed();
    const name = file.answers.find((answer) => answer.fieldKey === 'project.name');
    if (name === undefined) throw new Error('no project name in the committed file');
    name.text = 'TEST another hotel';
    expect(problemsOf(file)).toEqual([expect.stringContaining(`"${DEMO_WORKING_NAME}"`)]);
  });

  it('US-ADMIN-15 · F-INGEST-09 · rule 3 · rule 11: a choice outside the options, a field answered twice, an unknown field and a wrong step are refused', () => {
    const file = committed();
    const fireSafety = file.answers.find((answer) => answer.fieldKey === 'project.scope.fire_safety');
    if (fireSafety === undefined) throw new Error('no Fire Safety answer in the committed file');
    fireSafety.choice = 'maybe';
    file.answers.push({ step: 4, fieldKey: 'project.scope.hvac', choice: 'include' });
    file.answers.push({ step: 5, fieldKey: 'TEST.field', choice: 'TEST' });
    file.answers.push({ step: 6, fieldKey: 'project.occupancy', choice: 'low' });
    const problems = problemsOf(file);
    expect(problems).toContainEqual(expect.stringContaining('"maybe" is not among'));
    expect(problems).toContainEqual(expect.stringContaining('answered twice'));
    expect(problems).toContainEqual(expect.stringContaining('not a field of the production registry'));
    expect(problems).toContainEqual(expect.stringContaining('asked on step 5, not step 6'));
  });

  it('US-ADMIN-15 · F-QUESTION-05 · rule 7: a missing step 1 field, or a multi-select answered in part, is refused', () => {
    const file = committed();
    file.answers = file.answers.filter((answer) => answer.fieldKey !== 'project.city' && answer.fieldKey !== 'project.goal.compliance');
    const problems = problemsOf(file);
    expect(problems).toContainEqual(expect.stringContaining('project.city: a step 1 field is not answered'));
    expect(problems).toContainEqual(expect.stringContaining('step 6: every option of the multi-select is answered; missing project.goal.compliance'));
  });

  it('US-ADMIN-15 · F-INGEST-09: the file is data with a closed shape: an unknown key or another format is refused', () => {
    expect(problemsOf({ ...committed(), note: 'TEST' })).not.toEqual([]);
    expect(problemsOf({ ...committed(), format: 'TEST' })).not.toEqual([]);
    const file = committed();
    file.answers.push({ step: 1, fieldKey: 'project.city', choice: 'TEST', text: 'TEST' });
    expect(problemsOf(file)).toContainEqual(expect.stringContaining('a text field takes one trimmed text'));
  });
});
