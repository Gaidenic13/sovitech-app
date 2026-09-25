/**
 * Reference datasets and their approval records (docs/guardrails.md 2.1
 * `reference`: "Code, from the named dataset and version"; rule 1 "Identifiers
 * and prices"; section 10: "adding ... a reference dataset" is a loosening;
 * G1-12; F-REGISTRY-06).
 *
 * The loader is the one way a dataset's content becomes readable to the app. It
 * loads a dataset only when all of these hold:
 * - the file is well formed;
 * - its id carries no "TEST": TEST datasets live in fixtures/datasets/, feed
 *   TEST formulas inside the test runner only (the sensitivity suite and the
 *   case files read them there), and never feed the app or the demo (prompt 3
 *   5.4);
 * - the registry declares that id and version;
 * - the declaration carries an approval reference, and it resolves through a
 *   dataset approval record that cites a change-log row naming the approver
 *   (ADR 0005, decision 3).
 * No approver is named (D-05) and how approval records reach the app is open
 * (D-47), so no reference resolves and nothing loads today. Every refusal is
 * returned with its reason; a refused dataset gives no `reference` candidate.
 *
 * `datasetApprovalLookup` is the same test for the domain's derive function
 * (`DeriveContext.datasetApproved`): a `reference` candidate citing a dataset
 * version with no resolving approval record is refused (`unapproved_dataset`).
 */
import type { CandidateReference } from '@sovitech/domain';
import { z } from 'zod';
import { resolveApprovalRef, type ApprovalContext } from '../approvals';
import type { RegistryBundle } from '../validation/schema';
import { isTestId } from '../validation/validate';

/** A dataset file as SOVITECH (or, for TEST datasets, a fixture generator) supplies it. */
export const datasetFileSchema = z.strictObject({
  id: z.string().regex(/^[A-Za-z][A-Za-z0-9_.-]*$/),
  version: z.string().min(1),
  description: z.string().min(1),
  /** Entries by key, as `CandidateReference.key` names them. */
  entries: z.record(z.string().min(1), z.unknown()),
});
export type DatasetFile = z.infer<typeof datasetFileSchema>;

export type DatasetRefusalCode = 'malformed' | 'test_dataset' | 'undeclared' | 'no_approval_record' | 'approval_does_not_resolve';

export interface DatasetRefusal {
  readonly code: DatasetRefusalCode;
  readonly message: string;
}

/** A dataset the loader accepted. Only `loadDataset` makes one. */
export interface LoadedDataset {
  readonly id: string;
  readonly version: string;
  readonly entries: Readonly<Record<string, unknown>>;
  readonly approvalRef: string;
}

const loaded = new WeakSet<LoadedDataset>();

/** Whether `value` is a dataset the loader accepted (not a look-alike object). */
export function isLoadedDataset(value: unknown): value is LoadedDataset {
  return typeof value === 'object' && value !== null && loaded.has(value as LoadedDataset);
}

export interface DatasetContext {
  readonly registry: Pick<RegistryBundle, 'datasets'>;
  readonly approvals: ApprovalContext;
}

export type DatasetLoad = { readonly ok: true; readonly dataset: LoadedDataset } | { readonly ok: false; readonly refusals: readonly DatasetRefusal[] };

export function loadDataset(file: unknown, context: DatasetContext): DatasetLoad {
  const parsed = datasetFileSchema.safeParse(file);
  if (!parsed.success) {
    return {
      ok: false,
      refusals: [{ code: 'malformed', message: `not a dataset file: ${parsed.error.issues.map((issue) => `${issue.path.map(String).join('.') || '(root)'}: ${issue.message}`).join('; ')}` }],
    };
  }
  const { id, version, entries } = parsed.data;
  const refusals: DatasetRefusal[] = [];
  if (isTestId(id)) {
    refusals.push({
      code: 'test_dataset',
      message: `${id} is a TEST dataset: TEST datasets load only inside the test runner, never in the app or the demo (prompt 3 5.4)`,
    });
  }
  const declaration = context.registry.datasets.find((dataset) => dataset.id === id && dataset.version === version);
  if (declaration === undefined) {
    refusals.push({ code: 'undeclared', message: `${id}@${version} is not declared in the registry` });
  }
  const ref = declaration?.approvalRef;
  if (declaration !== undefined && ref === undefined) {
    refusals.push({
      code: 'no_approval_record',
      message: `${id}@${version} has no approval record, so no reference candidate may come from it (G1-12; D-47)`,
    });
  }
  if (ref !== undefined) {
    const expected = `dataset-approval:${id}@${version}`;
    const resolution = ref === expected ? resolveApprovalRef(ref, { kind: 'dataset', dataset: id }, context.approvals) : undefined;
    if (resolution === undefined || !resolution.ok) {
      refusals.push({
        code: 'approval_does_not_resolve',
        message: `${id}@${version}: its approval reference "${ref}" does not resolve${resolution === undefined ? ` (it must be ${expected})` : `: ${resolution.reason}`}`,
      });
    }
  }
  if (refusals.length > 0 || ref === undefined) return { ok: false, refusals };
  const dataset: LoadedDataset = Object.freeze({ id, version, entries: Object.freeze({ ...entries }), approvalRef: ref });
  loaded.add(dataset);
  return { ok: true, dataset };
}

/**
 * `DeriveContext.datasetApproved` from the registry and the approval records:
 * true only for a dataset version the loader would load.
 */
export function datasetApprovalLookup(registry: Pick<RegistryBundle, 'datasets'>, approvals: ApprovalContext): (reference: CandidateReference) => boolean {
  return (reference) => {
    if (isTestId(reference.dataset)) return false;
    const declaration = registry.datasets.find((dataset) => dataset.id === reference.dataset && dataset.version === reference.version);
    const ref = declaration?.approvalRef;
    if (ref === undefined || ref !== `dataset-approval:${reference.dataset}@${reference.version}`) return false;
    return resolveApprovalRef(ref, { kind: 'dataset', dataset: reference.dataset }, approvals).ok;
  };
}
