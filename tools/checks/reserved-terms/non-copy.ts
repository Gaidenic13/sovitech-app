/**
 * Files in the reserved-term scope that the check does not read, because they
 * hold no copy.
 *
 * The check reads scripts, HTML and SVG, CSS, JSON and YAML data, SQL, text
 * templates, Markdown and plain text (scan.ts, FILE_TYPES). Any other file in
 * its scope fails the check (phase 0 round 2 review: a JSON copy file, a
 * template or a migration outside a src folder passed unread), unless it is a
 * registered string catalogue (catalogues.ts) or matches an entry here.
 *
 * Each entry is a glob relative to the repository root, with the reason its
 * files are never shown in the app, an export or AI text. The check fails an
 * entry with no reason, and an entry that matches no file in scope, so no entry
 * outlives what it was written for. An entry lets its files through unread: it
 * is a reserved-term exception in the sense of prompt 3 section 13, so each new
 * entry is listed in the build log for the approver before it is relied on.
 */
export interface NonCopyEntry {
  /** Glob of the files, relative to the scan root. */
  readonly files: string;
  /** Why these files are never shown in the app, an export or AI text. */
  readonly reason: string;
}

export const NON_COPY_FILES: readonly NonCopyEntry[] = [
  {
    files: '**/README.md',
    reason: 'Developer documentation kept beside the code, like docs/**: read by developers, never shown in the app, an export or AI text.',
  },
];
