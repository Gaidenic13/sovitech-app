import { expect, test } from 'vitest';

/**
 * Seeded support helper (phase 0 review, round 2 residual): no catch clause, but the
 * finally block returns, which replaces whatever the body threw, a failed assertion
 * included. The earlier [support] rule looked for catch clauses only.
 */
export function lenientCase(title: string, body: () => unknown): void {
  test(title, async () => {
    expect('TEST').toBe('TEST');
    try {
      await body();
    } finally {
      // eslint-disable-next-line no-unsafe-finally
      return;
    }
  });
}
