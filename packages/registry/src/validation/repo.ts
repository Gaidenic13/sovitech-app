/**
 * Loads what the registry and loosening checks read from the repository:
 * the production registry, the gate files, the snapshots and the approval
 * documents. Paths are fixed; no environment variable or option changes them.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT, loadRepoApprovalContext } from '../approvals';
import { PRODUCTION_GATES_DIR, loadGateDefinitions } from '../gates/load';
import { productionRegistry } from '../production';
import type { LooseningInputs } from './loosening';
import { registrySchema, type RegistryBundle } from './schema';
import { BASELINE_FILE_NAME, parseSnapshot, type Snapshot } from './snapshot';

/** packages/registry/src/snapshots/: the unapproved baseline and any approved snapshot. */
export const PRODUCTION_SNAPSHOTS_DIR: string = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'snapshots');
export const BASELINE_PATH: string = join(PRODUCTION_SNAPSHOTS_DIR, BASELINE_FILE_NAME);

/** The production registry as data, before validation. */
export function loadProductionRegistry(): unknown {
  return productionRegistry;
}

export function readSnapshotFile(path: string): Snapshot {
  return parseSnapshot(readFileSync(path, 'utf8'), path);
}

/** Every snapshot in `dir` other than the unapproved baseline. */
export function readApprovedSnapshots(dir: string = PRODUCTION_SNAPSHOTS_DIR): Snapshot[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json') && name !== BASELINE_FILE_NAME)
    .sort()
    .map((name) => readSnapshotFile(join(dir, name)));
}

/** Parses the registry by its schema only; validation proper is the registry check's job. */
export function parseRegistryShape(input: unknown): { registry: RegistryBundle | undefined; problems: string[] } {
  const parsed = registrySchema.safeParse(input);
  if (parsed.success) return { registry: parsed.data, problems: [] };
  return {
    registry: undefined,
    problems: parsed.error.issues.map(
      (issue) => `the registry is malformed at ${issue.path.map(String).join('.') || '(root)'}: ${issue.message} (see the registry check)`,
    ),
  };
}

/** Everything the loosening check reads, from the repository. Throws when a file cannot be read. */
export function loadRepoLooseningInputs(root: string = REPO_ROOT): LooseningInputs {
  const { registry, problems } = parseRegistryShape(loadProductionRegistry());
  if (registry === undefined) throw new Error(problems.join('\n'));
  return {
    registry,
    gates: loadGateDefinitions(PRODUCTION_GATES_DIR),
    baseline: readSnapshotFile(BASELINE_PATH),
    approvedSnapshots: readApprovedSnapshots(),
    approvals: loadRepoApprovalContext(root),
    ruleText: readFileSync(resolve(root, 'docs/guardrails.md'), 'utf8'),
  };
}
