/**
 * Records the current registry and gates as "unapproved baseline v0"
 * (prompt 3 section 5.2, "Registry values"; the values are docs/adr/0010-registry-values-unapproved-baseline.md,
 * the mechanism docs/adr/0005-gates-mechanism.md), and every exception list
 * as its exception-list part (./exception-lists.ts; phase 0 review, round 2).
 *
 *   tsx tools/checks/loosening/write-baseline.ts           write the files that change
 *   tsx tools/checks/loosening/write-baseline.ts --check   only say whether they would change
 *
 * It refuses, and writes nothing, when:
 * - the production registry fails registry validation;
 * - any gate is open, or any approval reference is filled in anywhere
 *   (approvals belong in an approved snapshot, never in the unapproved baseline);
 * - any value is looser than the baseline already on disk;
 * - the result would hold a value the strict policy does not allow;
 * - an exception list cannot be read, or holds an entry added to an allow
 *   list, changed in one, or removed from a deny list against the exception-list
 *   baseline on disk, or a list the baseline records is no longer read;
 * - the exception-list baseline is missing but committed in HEAD (restore it
 *   from git instead), or git cannot tell.
 * So both parts can only gain strict values; a looser one needs the approver
 * (docs/guardrails.md section 10). Each exception-list entry recorded for the
 * first time is printed, for the build log's list of entries for the owner.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PRODUCTION_GATES_DIR, REPO_ROOT, existsAtRef, localDate, loadGateDefinitions, type GateDefinition } from '@sovitech/registry/gates';
import {
  BASELINE_NAME,
  BASELINE_PATH,
  SETTING_NAMES,
  baselinePolicyProblems,
  compareSnapshots,
  loadProductionRegistry,
  projectSnapshot,
  readSnapshotFile,
  renderSnapshot,
  validateRegistry,
  type Snapshot,
} from '@sovitech/registry/validation';
import {
  EXCEPTION_LISTS_BASELINE_NAME,
  EXCEPTION_LISTS_BASELINE_PATH,
  parseExceptionListSnapshot,
  planExceptionListBaseline,
  readCurrentLists,
  type ExceptionListPlan,
  type ExceptionListPlanInputs,
} from './exception-lists';

export const BASELINE_NOTE =
  'Not approved: no approver is named in docs/guardrails.md section 10 (D-05), so no value here is approved. ' +
  'It holds only the strictest values prompt 3 section 5.2 allows ("Registry values") and every gate closed. ' +
  'Written by tools/checks/loosening/write-baseline.ts, which refuses any loosening.';

export interface BaselinePlan {
  ok: boolean;
  problems: string[];
  /** The file content the writer would write. */
  text: string;
  /** Whether it differs from the file on disk. */
  changed: boolean;
}

function guardrailsVersion(): string {
  const text = readFileSync(resolve(REPO_ROOT, 'docs/guardrails.md'), 'utf8');
  const version = /^\*\*Version:\*\*\s*([0-9]+\.[0-9]+)/m.exec(text)?.[1];
  if (version === undefined) throw new Error('docs/guardrails.md: no "**Version:**" line');
  return version;
}

function valuesOnly(snapshot: Snapshot): string {
  const { settings, fields, impactRankOrder, gates } = snapshot;
  return JSON.stringify({ settings, fields, impactRankOrder, gates });
}

/** Everything the writer reads. */
export interface PlanInputs {
  /** The registry as data, before validation. */
  registry: unknown;
  gates: GateDefinition[];
  /** The baseline on disk, if any. */
  existing: Snapshot | undefined;
  /** The file content on disk, or '' when there is none. */
  onDisk: string;
  guardrailsVersion: string;
  /** The date recorded when values change. */
  today: string;
}

export function repoPlanInputs(today: string = localDate()): PlanInputs {
  const present = existsSync(BASELINE_PATH);
  return {
    registry: loadProductionRegistry(),
    gates: loadGateDefinitions(PRODUCTION_GATES_DIR),
    existing: present ? readSnapshotFile(BASELINE_PATH) : undefined,
    onDisk: present ? readFileSync(BASELINE_PATH, 'utf8') : '',
    guardrailsVersion: guardrailsVersion(),
    today,
  };
}

/** What the writer would do, without writing. */
export function planBaseline(inputs: PlanInputs = repoPlanInputs()): BaselinePlan {
  const problems: string[] = [];
  const validation = validateRegistry(inputs.registry, { scope: 'production' });
  problems.push(...validation.problems.map((problem) => `registry validation: ${problem.at}: ${problem.message}`));
  const { gates, existing } = inputs;
  for (const gate of gates) {
    if (gate.open) problems.push(`packages/registry/gates/${gate.id}.yaml: the gate is open; the unapproved baseline holds closed gates only`);
    for (const item of gate.waitsFor) {
      if (item.approvalRef !== '') {
        problems.push(`packages/registry/gates/${gate.id}.yaml: ${item.item} carries an approval reference; approvals belong in an approved snapshot`);
      }
    }
  }
  const registry = validation.registry;
  if (registry === undefined) return { ok: false, problems, text: '', changed: false };
  for (const field of registry.fields) {
    if (field.approvals !== undefined && Object.keys(field.approvals).length > 0) {
      problems.push(`${field.key}: carries approval references; approvals belong in an approved snapshot`);
    }
  }
  for (const name of SETTING_NAMES) {
    if (registry.settings[name].approvalRef !== undefined) {
      problems.push(`settings.${name}: carries an approval reference; approvals belong in an approved snapshot`);
    }
  }
  for (const dataset of registry.datasets) {
    if (dataset.approvalRef !== undefined) problems.push(`dataset ${dataset.id}: carries an approval reference`);
  }

  const draft = projectSnapshot(registry, gates, {
    name: BASELINE_NAME,
    status: 'unapproved',
    version: 0,
    guardrailsVersion: inputs.guardrailsVersion,
    recordedOn: inputs.today,
    approvalRef: '',
    note: BASELINE_NOTE,
  });
  const next: Snapshot =
    existing !== undefined && valuesOnly(existing) === valuesOnly(draft)
      ? { ...draft, recordedOn: existing.recordedOn, guardrailsVersion: existing.guardrailsVersion }
      : draft;
  if (existing !== undefined) {
    for (const difference of compareSnapshots(existing, next)) {
      if (difference.kind === 'loosening') {
        problems.push(`${difference.path}: ${difference.message}: a loosening; only the approver can allow it (docs/guardrails.md section 10)`);
      }
    }
  }
  problems.push(...baselinePolicyProblems(next));
  const text = renderSnapshot(next);
  return { ok: problems.length === 0, problems, text, changed: text !== inputs.onDisk };
}

/** What the exception-list part of the writer reads, from the repository. */
export async function repoExceptionListPlanInputs(today: string = localDate()): Promise<ExceptionListPlanInputs> {
  const present = existsSync(EXCEPTION_LISTS_BASELINE_PATH);
  const onDisk = present ? readFileSync(EXCEPTION_LISTS_BASELINE_PATH, 'utf8') : '';
  return {
    current: await readCurrentLists(),
    existing: present ? parseExceptionListSnapshot(onDisk, EXCEPTION_LISTS_BASELINE_PATH) : undefined,
    onDisk,
    today,
    inHead: present ? true : existsAtRef(REPO_ROOT, 'HEAD', relative(REPO_ROOT, EXCEPTION_LISTS_BASELINE_PATH)),
  };
}

/** What the writer would do with the exception lists, without writing. */
export async function planExceptionLists(inputs?: ExceptionListPlanInputs): Promise<ExceptionListPlan> {
  return planExceptionListBaseline(inputs ?? (await repoExceptionListPlanInputs()));
}

async function main(argv: readonly string[]): Promise<number> {
  const checkOnly = argv.includes('--check');
  const plan = planBaseline();
  const lists = await planExceptionLists();
  const refusals = [
    ...plan.problems.map((line) => `${BASELINE_PATH}: ${line}`),
    ...lists.problems.map((line) => `${EXCEPTION_LISTS_BASELINE_PATH}: ${line}`),
  ];
  if (refusals.length > 0) {
    process.stderr.write(`Refusing to write the unapproved baseline:\n${refusals.map((line) => `  ${line}`).join('\n')}\n`);
    return 1;
  }
  const parts = [
    { name: BASELINE_NAME, path: BASELINE_PATH, plan },
    { name: EXCEPTION_LISTS_BASELINE_NAME, path: EXCEPTION_LISTS_BASELINE_PATH, plan: lists },
  ];
  if (parts.every((part) => !part.plan.changed)) {
    for (const part of parts) process.stdout.write(`${part.name} is up to date.\n`);
    return 0;
  }
  if (checkOnly) {
    for (const part of parts) process.stdout.write(`${part.name} ${part.plan.changed ? 'would change; run without --check to record it' : 'is up to date'}.\n`);
    if (lists.newEntries.length > 0) {
      process.stdout.write(`Exception-list entries it would record for the first time (waiting for approval):\n${lists.newEntries.map((line) => `  ${line}`).join('\n')}\n`);
    }
    return 1;
  }
  for (const part of parts) {
    if (!part.plan.changed) continue;
    mkdirSync(dirname(part.path), { recursive: true });
    writeFileSync(part.path, part.plan.text);
    process.stdout.write(`Recorded ${part.name} in ${part.path}.\n`);
  }
  if (lists.newEntries.length > 0) {
    process.stdout.write(
      `Exception-list entries recorded for the first time, waiting for approval (list them in docs/build-log.md for the owner):\n${lists.newEntries.map((line) => `  ${line}`).join('\n')}\n`,
    );
  }
  return 0;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
