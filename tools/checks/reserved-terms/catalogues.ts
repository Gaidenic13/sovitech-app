/**
 * String catalogues the reserved-term check reads in full: every string value
 * in each matching file is copy. Phase 3 registers the app's one UI string
 * catalogue here (prompt 3 section 5.2, "UI language").
 */
export interface StringCatalogue {
  /** A short name for the catalogue, shown in findings. */
  readonly id: string;
  /** Glob of its files, relative to the repository root. company/** is never read. */
  readonly files: string;
  readonly format: 'json' | 'yaml';
}

export const STRING_CATALOGUES: readonly StringCatalogue[] = [];
