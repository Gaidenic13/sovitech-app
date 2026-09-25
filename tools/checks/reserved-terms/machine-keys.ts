/**
 * Registered machine-key lists for the reserved-term check.
 *
 * A lower-case, single-token string such as 'final', 'verified' or 'firm-price'
 * is copy wherever it could be rendered: a label map, a ternary, a variable, a
 * function argument (CSS text-transform turns 'final' into "FINAL"). It is not
 * copy only in a type, as the key of an object whose keys are never handed out
 * (extract.ts: an object passed to Object.keys and the like, or walked by
 * for-in, shows its keys), on one side of an ===/!== comparison, as a switch
 * case, or as a direct element of a list registered here: a `const` holding an
 * array literal, or an enum, whose strings are identifiers such as enum keys or
 * event types (extract.ts, `isCopy`). Object keys cannot be registered here.
 *
 * Each entry names the file (relative to the repository root, inside the scan
 * scope), the constant, and why its strings are never shown. The check fails
 * when an entry points to no such file or constant, so no entry outlives its
 * list. Registering a list lets its strings through the check: it is a
 * reserved-term exception in the sense of prompt 3 section 13, so each new
 * entry is listed in the build log for the approver before it is relied on.
 * Phase 0 registers none.
 */
export interface MachineKeyList {
  /** File that declares the list, relative to the scan root. */
  readonly path: string;
  /** Name of the `const` (array literal) or enum. */
  readonly constant: string;
  /** Why its strings are identifiers that no screen, export or AI text shows. */
  readonly reason: string;
}

export const MACHINE_KEY_LISTS: readonly MachineKeyList[] = [];
