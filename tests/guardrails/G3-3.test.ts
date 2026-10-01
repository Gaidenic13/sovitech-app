/**
 * G3-3 (docs/guardrails.md section 7; rule 3, "Who confirms": "On an engineer field, the owner is not
 * asked to confirm. They may see 'Looks right' and 'Something's wrong'. 'Looks right' records
 * `owner_acknowledged`, which never clears Provisional and never raises the badge").
 * Situation: the owner presses "Looks right" on 126 inferred assets.
 * Expected: `owner_acknowledged`. Badges unchanged, and the estimate stays provisional.
 *
 * The view-model's half: the planner of "Looks right" (planAcknowledge) writes one
 * `owner_acknowledged` event per item and nothing else; the one derive function and the one resolver
 * read the result. 126 TEST assets each hold an inferred type on a TEST engineer field; a TEST
 * calculated estimate reads the 126 types as its inputs (a TEST formula of the test runner). The
 * route half (`POST .../fields/acknowledge`) is the API's.
 */
import { expect, test } from 'vitest';
import type { Candidate, FieldState } from '@sovitech/domain';
import { planAcknowledge, resolveField } from '@sovitech/view-model/server';
import { documentReading, testDocument, testEvents } from './_support/builders';
import { derived, registryField, resolveInputOf, uuid } from './_support/view-model';

const PROJECT = uuid(1);
const ASSETS = 126;
const schedule = { ...testDocument(uuid(10), PROJECT, 'unknown'), contentHash: `sha256:${'e'.repeat(64)}` };
const assetType = registryField('asset.testType', { kind: 'enum', subject: 'asset', options: ['ahu', 'fcu', 'pump'], confirmBy: 'engineer', criticality: 'for_quotation' });
const estimate = registryField('project.testPointsEstimate', { kind: 'count', subject: 'project', unit: 'count', confirmBy: 'engineer', valueShape: 'non_negative_integer' });

test('US-ASSETS-04 · F-REVIEW-03 · G3-3: "Looks right" on 126 inferred assets is owner_acknowledged only: badges unchanged, the estimate still provisional', () => {
  const inferred: Candidate[] = Array.from({ length: ASSETS }, (_, index) =>
    documentReading({ id: uuid(1000 + index), subjectId: uuid(2000 + index), field: assetType, document: schedule, value: { choice: 'ahu' }, minute: 1, source: 'ai_inference', confidence: 'medium' }),
  );
  const fieldsBefore = inferred.map((candidate) => ({
    field: assetType,
    subjectId: candidate.subjectId,
    state: derived(assetType, candidate.subjectId, [candidate], undefined, [schedule]),
    candidates: [candidate],
    skippedAt: [],
  }));

  const events = planAcknowledge({ fields: fieldsBefore, candidateIds: inferred.map((candidate) => candidate.id), by: 'test-owner', at: '2026-09-30T10:00:00.000Z' });
  // owner_acknowledged, by the owner, once per item, and nothing else.
  expect(events).toHaveLength(ASSETS);
  for (const event of events) expect(event).toMatchObject({ type: 'owner_acknowledged', role: 'owner', by: 'test-owner' });

  const statesAfter = new Map<string, FieldState>();
  const statesBefore = new Map<string, FieldState>();
  for (const [index, candidate] of inferred.entries()) {
    const before = fieldsBefore[index];
    if (before === undefined) throw new Error('one field per asset');
    const after = derived(assetType, candidate.subjectId, [candidate], testEvents({ candidate: events.filter((event) => event.candidateId === candidate.id) }), [schedule]);
    statesBefore.set(candidate.id, before.state);
    statesAfter.set(candidate.id, after);
    expect(after.candidates[0]?.verification).toBe('owner_acknowledged');

    // Badges unchanged: the same display, badge and all.
    const [shownBefore] = resolveField(resolveInputOf(before, 'asset', { documents: [schedule] }));
    const [shownAfter] = resolveField(resolveInputOf({ ...before, state: after }, 'asset', { documents: [schedule] }));
    expect(shownAfter?.badge).toEqual(shownBefore?.badge);
    expect(shownAfter?.badge?.id).toBe('possible');
    expect(shownAfter).toEqual(shownBefore);
    // Provisional still.
    expect(after.provisional).toBe(true);
  }

  // The estimate that reads the 126 types stays provisional (2.4 "Provisional": owner_acknowledged only).
  const estimated: Candidate = {
    id: uuid(3000),
    subjectId: PROJECT,
    fieldKey: estimate.key,
    quantity: { value: ASSETS, unit: 'count' },
    source: 'calculated',
    evidence: [],
    method: { formulaId: 'TEST-points', formulaVersion: '1.0.0', inputCandidateIds: inferred.map((candidate) => candidate.id), unknownPolicy: 'refuse', assumptions: [] },
    createdBy: 'test-engine',
    authorRole: 'system',
    createdAt: '2026-09-30T09:30:00.000Z',
  };
  expect(derived(estimate, PROJECT, [estimated], undefined, [], statesBefore).provisional).toBe(true);
  expect(derived(estimate, PROJECT, [estimated], undefined, [], statesAfter).provisional).toBe(true);
});
