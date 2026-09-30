/**
 * The building blocks the generated zod schemas use (src/generated/zod.ts), with
 * the same meaning as the Python validator
 * (services/extractor/src/sovitech_extractor/contract/_validate.py):
 *
 * - string lengths count code points, as JSON Schema and Python do (zod's own
 *   `.min()` and `.max()` count UTF-16 units);
 * - patterns run in Unicode mode, anchored by the schema (the loader refuses an
 *   unanchored pattern and `\d`-style classes, which the engines read apart);
 * - `uniqueItems` compares strings and integers by value;
 * - a def's `x-invariants` run as refinements on the parsed value, and report
 *   an issue whose message is `invariant:<id>`.
 *
 * Every issue these helpers add carries a code and a path, never the value
 * itself: a value may be document text (rule 13: logs and error reports never
 * contain it).
 */
import { z } from 'zod';
import { INVARIANTS, type InvariantId } from './invariants';

/** The message prefix of an invariant issue. */
export const INVARIANT_MESSAGE_PREFIX = 'invariant:';

/** The message of a pattern, length or uniqueness issue these helpers add. */
export const CONTRACT_MESSAGES = {
  pattern: 'contract:pattern',
  length: 'contract:length',
  unique: 'contract:unique',
} as const;

interface TextOptions {
  readonly pattern?: string;
  readonly minLength?: number;
  readonly maxLength?: number;
}

/** A string with an optional anchored pattern and code-point lengths. */
export function text(options: TextOptions): z.ZodString {
  const pattern = options.pattern === undefined ? undefined : new RegExp(options.pattern, 'u');
  const { minLength, maxLength } = options;
  return z.string().superRefine((value, ctx) => {
    if (pattern !== undefined && !pattern.test(value)) {
      ctx.addIssue({ code: 'custom', message: CONTRACT_MESSAGES.pattern });
    }
    if (minLength !== undefined || maxLength !== undefined) {
      const length = [...value].length;
      if ((minLength !== undefined && length < minLength) || (maxLength !== undefined && length > maxLength)) {
        ctx.addIssue({ code: 'custom', message: CONTRACT_MESSAGES.length });
      }
    }
  });
}

/** An array whose items (strings or integers) are all different. */
export function unique<T extends z.ZodArray<z.ZodType<string | number>>>(schema: T): T {
  return schema.superRefine((value, ctx) => {
    if (new Set(value).size !== value.length) ctx.addIssue({ code: 'custom', message: CONTRACT_MESSAGES.unique });
  });
}

/** Runs a def's invariants on its parsed value, one issue per problem, at the problem's path. */
export function withInvariants<T extends z.ZodType>(schema: T, ids: readonly InvariantId[]): T {
  return schema.superRefine((value, ctx) => {
    for (const id of ids) {
      for (const problem of INVARIANTS[id](value)) {
        ctx.addIssue({ code: 'custom', message: `${INVARIANT_MESSAGE_PREFIX}${id}`, path: [...problem.path] });
      }
    }
  });
}
