/**
 * G1-17 (docs/guardrails.md section 7; 2.1, `reference`: "Code, from the named dataset and version";
 * section 10: "adding ... a reference dataset" is a loosening, and "reference datasets per field" are
 * loosening-sensitive). Phase 1 review, round 3, adversarial finding on dataset lookups.
 * Situation: a `reference` candidate from a dataset with an approval record that the field's registry
 * entry does not list among its reference datasets.
 * Expected: refused; the field stays unknown.
 *
 * No dataset has an approval record today (G1-12), so the case hands derive a TEST lookup that
 * approves every dataset: the refusal comes from the field's list alone. The control: a dataset the
 * field lists stands under the same lookup.
 */
import { expect, test } from 'vitest';
import { derive, type Candidate } from '@sovitech/domain';
import { testContext, testEvents, testField, testTime } from './_support/builders';

const PROJECT = 'test-project-g1-17';
const climate = testField('test.project.heating_degree_days', { kind: 'text', subject: 'project', referenceDatasets: ['TEST-climate-dataset'] });
const approvesEverything = { ...testContext({ subjectId: PROJECT }), datasetApproved: () => true };

function fromDataset(dataset: string): Candidate {
  return {
    id: `test-cand-g1-17-${dataset}`,
    subjectId: PROJECT,
    fieldKey: climate.key,
    text: 'TEST value',
    source: 'reference',
    evidence: [],
    reference: { dataset, version: 'TEST-1', key: 'TEST-key' },
    createdBy: 'test-code',
    createdAt: testTime(0),
  };
}

test('F-VALUE-02 · G1-17: a reference candidate from an approved dataset the field does not list is refused', () => {
  for (const dataset of ['TEST-other-dataset', 'TEST-benchmark-dataset']) {
    const candidate = fromDataset(dataset);
    const state = derive(climate, [candidate], testEvents({}), approvesEverything);
    expect(state.state, dataset).toBe('unknown');
    expect(state.candidates, dataset).toEqual([{ candidateId: candidate.id, verification: 'unverified', status: 'refused', refusal: 'dataset_not_for_field' }]);
  }
  const unlisted = testField('test.project.unlisted', { kind: 'text', subject: 'project' });
  const other = { ...fromDataset('TEST-climate-dataset'), fieldKey: unlisted.key };
  expect(derive(unlisted, [other], testEvents({}), approvesEverything).state).toBe('unknown');
});

test('F-VALUE-02 · G1-17 control: the dataset the field lists stands under the same lookup', () => {
  const candidate = fromDataset('TEST-climate-dataset');
  expect(derive(climate, [candidate], testEvents({}), approvesEverything).activeCandidateId).toBe(candidate.id);
});
