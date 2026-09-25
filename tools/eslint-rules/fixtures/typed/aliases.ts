/**
 * Typed fixture for tools/eslint-rules/no-number-coercion.test.ts and
 * no-decimal-from-text.test.ts: an alias of the Number constructor and a text
 * value exported from another module, which only a lint run with type
 * information can see through. Not app code.
 */
export const toNumber = Number;
export const cellText: string = 'TEST 12,345';
export const cellValue: number = 12345;
export const either: string | number = cellValue;
