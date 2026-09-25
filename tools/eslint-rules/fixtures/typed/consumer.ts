/**
 * Typed fixture for tools/eslint-rules/no-zero-fallback.test.ts. The tests lint
 * their own code under this file name, so that imports resolve next to it.
 */
import { NONE } from './zero-constants';

export const placeholder = (x: number | undefined): number | undefined => (x === undefined ? undefined : x + NONE);
