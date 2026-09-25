/** Types for allowlist.js (the documented allowlist of the SOVITECH lint bans). */

export interface AllowlistEntry {
  /** The rule name without the `sovitech/` prefix. */
  rule: string;
  /** Glob patterns relative to the repository root. */
  files: string[];
  /** Why these files carry no value the ban protects, or are the one place the banned thing belongs. */
  reason: string;
}

export declare const allowlist: AllowlistEntry[];

export declare function allowlistedFiles(rule: string): string[];
