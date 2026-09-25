/** Types for css.js, for the TypeScript code of the lint-bans check. */

export declare function stripCommentsAndStrings(text: string): string;
export declare function rawDeclarations(text: string): Array<{ property: string; value: string }>;
export declare function declarationVisitors(
  sourceCode: unknown,
  check: (node: unknown, property: string, value: string) => void,
  apply: (node: unknown, classes: string[]) => void,
): Record<string, (node: unknown) => void>;
