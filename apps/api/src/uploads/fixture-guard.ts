/**
 * The owner's upload guard (owner decision, 2026-09-25: "Yes, fixtures only
 * (Recommended)"; prompt 3 section 13 item 2; docs/adr/0028-upload-guard-fixtures-only.md).
 *
 * While no malware scanning exists, the local development app accepts only uploads
 * whose content hash is in `fixtures/manifest.json`: the generated synthetic
 * fixtures. Any other file is refused with a clear message before anything is stored
 * or registered, and the refusal is logged by code and id only (rule 13: never the
 * file name or any content). This is a blocked state the owner chose; it is built as
 * that decision, not as a guardrail.
 */
import { loadFixtureManifest, sha256Hex } from '@sovitech/ai';

/** The owner-facing message of the refusal (a clear reason, no figure). */
export const NOT_A_FIXTURE_MESSAGE =
  'This development build stores only the synthetic test files listed in fixtures/manifest.json. This file was not stored.';

export interface UploadGuard {
  /** Whether a complete upload with this content hash may be stored. */
  readonly accepts: (contentHash: string) => boolean;
  /**
   * Set only by the owner's fixtures-only guard below: this API stores nothing but the synthetic
   * fixtures. The development login is on only where it is set (docs/adr/0038; PRD R-133, "The
   * development login is never enabled where real owner documents are stored"; traceability
   * 10.3 near miss 43): any other guard may let a real owner document in, and turns it off.
   */
  readonly fixturesOnly?: true;
}

/** The guard over the manifest under the repository root, read once. A missing manifest accepts nothing (fails closed). */
export function fixtureUploadGuard(repositoryRoot: string): UploadGuard {
  const manifest = loadFixtureManifest(repositoryRoot);
  return {
    fixturesOnly: true,
    accepts: (contentHash) => {
      const hex = sha256Hex(contentHash);
      return hex !== undefined && manifest.hashes.has(hex);
    },
  };
}
