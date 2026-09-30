/**
 * Contract problems: what a refused value gets back. A problem is a JSON
 * Pointer and a code, never the value or a key the input chose (rule 13: logs
 * and error reports never contain document text, and an unknown key can carry
 * any text). The Python validator returns the same codes.
 */
import type { z } from 'zod';
import { INVARIANT_IDS } from './generated/annotations';
import { CONTRACT_MESSAGES, INVARIANT_MESSAGE_PREFIX } from './runtime';
import type { StreamCheckId } from './ifc-values-stream';
import type { InvariantId } from './invariants';

export type StructuralCode =
  | 'unknown_key'
  | 'ifc_field'
  | 'type'
  | 'value'
  | 'pattern'
  | 'length'
  | 'range'
  | 'items'
  | 'unique'
  | 'union';

/**
 * `stream:<id>`: a check of the per-line form of the IFC section (./ifc-values-stream.ts;
 * TypeScript only, like the form itself).
 */
export type ProblemCode = StructuralCode | `invariant:${InvariantId}` | `stream:${StreamCheckId}`;

export interface ContractProblem {
  /** A JSON Pointer into the value ('' is the value itself). */
  readonly path: string;
  readonly code: ProblemCode;
}

export type ParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly problems: readonly ContractProblem[] };

/** A JSON Pointer from a path. */
export function pointer(path: readonly PropertyKey[]): string {
  return path.map((part) => `/${String(part).replace(/~/g, '~0').replace(/\//g, '~1')}`).join('');
}

function invariantCode(message: string): ProblemCode | undefined {
  if (!message.startsWith(INVARIANT_MESSAGE_PREFIX)) return undefined;
  const id = message.slice(INVARIANT_MESSAGE_PREFIX.length);
  return (INVARIANT_IDS as readonly string[]).includes(id) ? `invariant:${id as InvariantId}` : undefined;
}

function customCode(message: string): ProblemCode {
  switch (message) {
    case CONTRACT_MESSAGES.pattern:
      return 'pattern';
    case CONTRACT_MESSAGES.length:
      return 'length';
    case CONTRACT_MESSAGES.unique:
      return 'unique';
    default:
      return invariantCode(message) ?? 'value';
  }
}

/** The contract problems of a zod error. */
export function problemsOf(error: z.ZodError): readonly ContractProblem[] {
  return error.issues.flatMap((issue): ContractProblem[] => {
    const path = pointer(issue.path);
    switch (issue.code) {
      case 'unrecognized_keys':
        return issue.keys.map(() => ({ path, code: 'unknown_key' }));
      case 'invalid_type':
        return [{ path, code: 'type' }];
      case 'too_small':
      case 'too_big':
        return [{ path, code: issue.origin === 'array' || issue.origin === 'set' ? 'items' : issue.origin === 'string' ? 'length' : 'range' }];
      case 'invalid_union':
        return [{ path, code: 'union' }];
      case 'custom':
        return [{ path, code: customCode(issue.message) }];
      default:
        return [{ path, code: 'value' }];
    }
  });
}

/** Whether every problem is an invariant problem: the value has the right shape and breaks a rule between its parts. */
export function onlyInvariantProblems(problems: readonly ContractProblem[]): boolean {
  return problems.every((problem) => problem.code.startsWith('invariant:'));
}
