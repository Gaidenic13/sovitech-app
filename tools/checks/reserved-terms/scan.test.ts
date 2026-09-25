import { describe, expect, it } from 'vitest';
import { BAD_CASES, GOOD_CASE, runCase } from './cases';

describe('reserved-terms check on seeded inputs', () => {
  it('passes the seeded good input (allowed places, key positions, registered lists, the list module)', async () => {
    const result = await runCase(GOOD_CASE);
    expect(result.details).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it.each(BAD_CASES.map((badCase) => [badCase.id, badCase] as const))('fails %s', async (_id, badCase) => {
    const result = await runCase(badCase);
    expect(result.ok).toBe(false);
    for (const expected of badCase.expect) {
      expect(result.details.join('\n')).toContain(expected);
    }
    for (const unexpected of badCase.notExpect ?? []) {
      expect(result.details.join('\n')).not.toContain(unexpected);
    }
  });
});
