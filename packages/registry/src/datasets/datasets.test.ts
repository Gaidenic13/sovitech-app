/**
 * The dataset loader and the approval lookup (docs/guardrails.md 2.1, rule 1,
 * section 10; G1-12; F-REGISTRY-06). No approval record exists (D-47) and no
 * approver is named (D-05), so every dataset is refused; each refusal is
 * checked for its own reason. The datasets here are TEST data made up in the
 * test, and the approval context is the empty one of a repository with no
 * approver, built in memory. Nothing here writes an approval record.
 */
import { describe, expect, it } from 'vitest';
import { parseApprovalContext } from '../approvals';
import { datasetApprovalLookup, isLoadedDataset, loadDataset } from './datasets';

const noApprover = parseApprovalContext({ guardrails: '', prd: '', buildReadiness: '' });

const file = (id: string, version = 'TEST-1') => ({ id, version, description: 'TEST dataset', entries: { 'TEST-key': { value: 'TEST' } } });

describe('loadDataset', () => {
  it('refuses a malformed file', () => {
    expect(loadDataset({ id: 'x' }, { registry: { datasets: [] }, approvals: noApprover })).toMatchObject({ ok: false, refusals: [{ code: 'malformed' }] });
  });

  it('refuses a TEST dataset outside the test runner, even when declared', () => {
    const load = loadDataset(file('TEST-cost-ranges'), { registry: { datasets: [{ id: 'TEST-cost-ranges', version: 'TEST-1' }] }, approvals: noApprover });
    expect(load.ok).toBe(false);
    expect(!load.ok && load.refusals.map((refusal) => refusal.code)).toEqual(['test_dataset', 'no_approval_record']);
  });

  it('refuses a dataset the registry does not declare', () => {
    expect(loadDataset(file('climate'), { registry: { datasets: [] }, approvals: noApprover })).toMatchObject({ ok: false, refusals: [{ code: 'undeclared' }] });
  });

  it('refuses a declared dataset with no approval record (G1-12)', () => {
    const load = loadDataset(file('climate'), { registry: { datasets: [{ id: 'climate', version: 'TEST-1' }] }, approvals: noApprover });
    expect(load).toMatchObject({ ok: false, refusals: [{ code: 'no_approval_record' }] });
  });

  it('refuses an approval reference that does not resolve, or names another dataset or version', () => {
    for (const approvalRef of ['dataset-approval:climate@TEST-1', 'dataset-approval:climate@TEST-2', 'guardrails-changelog:1.5']) {
      const load = loadDataset(file('climate'), { registry: { datasets: [{ id: 'climate', version: 'TEST-1', approvalRef }] }, approvals: noApprover });
      expect(load, approvalRef).toMatchObject({ ok: false, refusals: [{ code: 'approval_does_not_resolve' }] });
    }
  });

  it('never takes a look-alike object for a loaded dataset', () => {
    expect(isLoadedDataset({ id: 'climate', version: 'TEST-1', entries: {}, approvalRef: 'dataset-approval:climate@TEST-1' })).toBe(false);
  });
});

describe('datasetApprovalLookup (DeriveContext.datasetApproved)', () => {
  it('approves no dataset while no approval record resolves', () => {
    const approved = datasetApprovalLookup(
      { datasets: [{ id: 'climate', version: 'TEST-1', approvalRef: 'dataset-approval:climate@TEST-1' }, { id: 'glossary', version: 'TEST-1' }] },
      noApprover,
    );
    expect(approved({ dataset: 'climate', version: 'TEST-1', key: 'TEST-key' })).toBe(false);
    expect(approved({ dataset: 'glossary', version: 'TEST-1', key: 'TEST-key' })).toBe(false);
    expect(approved({ dataset: 'TEST-anything', version: 'TEST-1', key: 'TEST-key' })).toBe(false);
  });
});
