/** Types for patterns.js, for the TypeScript code of the lint-bans check. */

export declare const NAMED_COLOURS: ReadonlySet<string>;
export declare const TAILWIND_PALETTE: readonly string[];
export declare const SHADOW_FREE_VALUES: ReadonlySet<string>;

export declare function findColourLiterals(text: string): Array<{ literal: string; index: number }>;
export declare function findNamedColours(value: string): string[];
export declare function isColourProperty(name: string): boolean;
export declare function isShadowProperty(name: string): boolean;
export declare function stripVariants(token: string): string;
export declare function colourClassProblem(token: string, themeColours: ReadonlySet<string>): string | undefined;
export declare function shadowClassProblem(
  token: string,
  inClassList: boolean,
  themeColours: ReadonlySet<string>,
): string | undefined;
export declare function findShadowCss(text: string): string[];
