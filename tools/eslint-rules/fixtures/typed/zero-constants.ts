/**
 * Typed fixture for tools/eslint-rules/no-zero-fallback.test.ts: zero constants
 * exported from another module, which only a lint run with type information can
 * see through (the untyped run cannot follow an import). Not app code.
 */
export const NONE = 0;
export const NO_AREA = 0 as const;
export const LIMITS = { floor: 0 } as const;
export const ONE = 1;
export let counter = 0;
export function bump(): void {
  counter += 1;
}
