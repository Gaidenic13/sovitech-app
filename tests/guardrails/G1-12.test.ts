/**
 * G1-12 (docs/guardrails.md section 7; rule 1 "Identifiers and prices", 2.1
 * `reference`, section 10 "adding ... a reference dataset" is a loosening).
 * Situation: a dataset with no approval record, for example the SAUTER product
 * list imported from the company website into `company/products/`, is attached
 * to a field as reference data.
 * Expected: the loosening check fails, and no `reference` candidate is created from it.
 *
 * The dataset is a synthetic stand-in shaped like a website product list
 * (fixtures/datasets/TEST-website-product-list-standin.json, from its
 * generator), never the file under company/ (prompt 3 section 10, phase 1).
 * It is declared in the registry with no approval record and attached to a
 * TEST field. Three places refuse it:
 * - the loosening check, run on the repository's own inputs (baseline, gates,
 *   approvals read from git), with only the registry swapped;
 * - the dataset loader, the one way a dataset's content becomes readable to
 *   the app: no approval record, no load (and a TEST dataset never loads
 *   outside the test runner);
 * - derive, handed the registry's approval lookup: a `reference` candidate
 *   citing the dataset is refused, and the field stays unknown.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { derive, type Candidate } from '@sovitech/domain';
import { datasetApprovalLookup, loadDataset, productionRegistry } from '@sovitech/registry';
import { evaluateLoosening, loadRepoLooseningInputs, type RegistryBundle, type RegistryFieldDefinition } from '@sovitech/registry/validation';
import { testContext, testEvents, testTime } from './_support/builders';

const STANDIN_PATH = join(import.meta.dirname, '..', '..', 'fixtures', 'datasets', 'TEST-website-product-list-standin.json');
const standIn = JSON.parse(readFileSync(STANDIN_PATH, 'utf8')) as { id: string; version: string; entries: Record<string, unknown> };

/** A TEST field that would take a product's model name from the stand-in as reference data. */
const productModel: RegistryFieldDefinition = {
  key: 'asset.TEST_productModel',
  label: 'TEST product model',
  subject: 'asset',
  kind: 'text',
  estimation: 'forbidden',
  criticality: 'optional',
  affects: [{ output: 'proposal.title', via: 'template:proposal.title' }],
  impactRank: 9_999,
  confirmBy: 'engineer',
  referenceDatasets: [standIn.id],
};

/** The production registry with the stand-in declared (no approval record) and attached to the TEST field. */
const attached: RegistryBundle = {
  ...productionRegistry,
  fields: [...productionRegistry.fields, productModel],
  templateSlots: productionRegistry.templateSlots.map((slot) =>
    slot.id === 'proposal.title' ? { ...slot, reads: [...slot.reads, productModel.key] } : slot,
  ),
  datasets: [...productionRegistry.datasets, { id: standIn.id, version: standIn.version, description: 'TEST stand-in shaped like a website product list' }],
};

test('G1-12 · the stand-in is synthetic and shaped like a website product list', () => {
  expect(standIn.id).toContain('TEST');
  const [first] = Object.values(standIn.entries);
  expect(first).toMatchObject({ productLine: expect.stringContaining('TEST'), model: expect.stringContaining('TEST') });
});

test('G1-12 · attached to a field as reference data, a dataset with no approval record fails the loosening check', () => {
  const inputs = loadRepoLooseningInputs();
  const control = evaluateLoosening(inputs);
  expect(control.problems.filter((problem) => problem.includes('G1-12'))).toEqual([]);

  const report = evaluateLoosening({ ...inputs, registry: attached });
  expect(report.ok).toBe(false);
  expect(report.problems).toContain(
    `fields.${productModel.key}.referenceDatasets: the dataset ${standIn.id} has no approval record (it carries no approval reference), so no reference candidate may come from it (G1-12; D-47)`,
  );
});

test('G1-12 · the dataset loader refuses it: no approval record, and a TEST dataset never loads outside the test runner', () => {
  const inputs = loadRepoLooseningInputs();
  const load = loadDataset(standIn, { registry: attached, approvals: inputs.approvals });
  expect(load.ok).toBe(false);
  if (load.ok) return;
  expect(load.refusals.map((refusal) => refusal.code)).toEqual(expect.arrayContaining(['no_approval_record', 'test_dataset']));
});

test('G1-12 · no reference candidate from it survives: derive refuses one, and the field stays unknown', () => {
  const inputs = loadRepoLooseningInputs();
  const approved = datasetApprovalLookup(attached, inputs.approvals);
  const [key] = Object.keys(standIn.entries);
  expect(key).toBeDefined();
  const reference = { dataset: standIn.id, version: standIn.version, key: key ?? '' };
  expect(approved(reference)).toBe(false);

  const candidate: Candidate = {
    id: 'test-cand-g1-12-reference',
    subjectId: 'test-asset-g1-12',
    fieldKey: productModel.key,
    text: 'TEST model',
    source: 'reference',
    evidence: [],
    reference,
    createdBy: 'test-system',
    createdAt: testTime(0),
  };
  const state = derive(productModel, [candidate], testEvents({}), { ...testContext({ subjectId: 'test-asset-g1-12' }), datasetApproved: approved });
  expect(state.state).toBe('unknown');
  expect(state.activeCandidateId).toBeNull();
  expect(state.candidates).toEqual([expect.objectContaining({ candidateId: candidate.id, status: 'refused', refusal: 'unapproved_dataset' })]);
});
