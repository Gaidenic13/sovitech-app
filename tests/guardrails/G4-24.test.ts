/**
 * G4-24 (docs/guardrails.md section 7; rule 4, "Each resolution records who, when and why" and
 * "A conflict is put to someone only when values arrive without that person having seen
 * both"). Phase 1 review, adversarial finding 5 (the store's side).
 * Situation: a conflict resolution is written without its reason, without naming the candidates
 * it covered, or naming a candidate of another field.
 * Expected: refused; nothing is stored.
 *
 * A TEST database holds two values of one field and one value of the same key on another
 * subject. The engineer, the right person for this TEST field, writes each malformed
 * resolution through the data-access layer; the store's named checks refuse each one
 * (field_events_resolution_reason, field_events_resolution_covers, field_events_chosen_covered
 * and SVX10), and the administrator finds no resolution written. The control: a complete
 * resolution is stored and reads back with the ids it covered, and only those.
 */
import { afterAll, beforeAll, expect, test } from 'vitest';
import {
  appendFieldEvent,
  createSubject,
  insertCandidate,
  newId,
  readFieldInputs,
  withRequest,
  type NewFieldEvent,
  type RequestScope,
} from '@sovitech/db';
import {
  createTestAccount,
  createTestDocumentValue,
  createTestProject,
  startTestDatabase,
  TEST_AREA_DEFINITION,
  TEST_AREA_FIELD,
  type TestDatabase,
  type TestDocumentValue,
} from '@sovitech/db/testing';

let database: TestDatabase;
let engineerId: string;
let projectId: string;
let value: TestDocumentValue;
let second: string;
let elsewhere: string;
let engineerScope: RequestScope;

beforeAll(async () => {
  database = await startTestDatabase();
  const ownerId = await createTestAccount(database, { label: 'G4-24 owner', kind: 'person', roles: ['owner'] });
  engineerId = await createTestAccount(database, { label: 'G4-24 engineer', kind: 'person', roles: ['sovitech_engineer'] });
  projectId = await createTestProject(database, { ownerId, isDemo: false });
  engineerScope = { userId: engineerId, projectId };
  value = await createTestDocumentValue(database, { projectId, label: 'G4-24 schedule' });
  second = newId();
  elsewhere = newId();
  await withRequest(database.app, { userId: ownerId, projectId }, async (request) => {
    const stored = await insertCandidate(
      request,
      {
        id: second,
        subjectId: value.subjectId,
        fieldKey: TEST_AREA_FIELD,
        quantity: { value: 1111.5, unit: 'm2', qualifier: 'gross_total' },
        source: 'user',
        evidence: [],
        createdBy: ownerId,
      },
      TEST_AREA_DEFINITION,
    );
    const other = await createSubject(request, { kind: 'building', createdBy: 'test' });
    const storedElsewhere = await insertCandidate(
      request,
      {
        id: elsewhere,
        subjectId: other.id,
        fieldKey: TEST_AREA_FIELD,
        quantity: { value: 2222.5, unit: 'm2', qualifier: 'gross_total' },
        source: 'user',
        evidence: [],
        createdBy: ownerId,
      },
      TEST_AREA_DEFINITION,
    );
    if (stored.outcome !== 'stored' || storedElsewhere.outcome !== 'stored') throw new Error('a TEST value was refused');
  });
}, 240_000);

afterAll(async () => {
  await database.stop();
});

function resolution(parts: { readonly reason?: string; readonly covered?: readonly string[]; readonly chosen?: string }): NewFieldEvent {
  return {
    subjectId: value.subjectId,
    fieldKey: TEST_AREA_FIELD,
    type: 'conflict_resolved',
    by: engineerId,
    role: 'sovitech_engineer',
    ...(parts.reason === undefined ? {} : { reason: parts.reason }),
    chosenCandidateId: parts.chosen ?? value.candidateId,
    ...(parts.covered === undefined ? {} : { coveredCandidateIds: parts.covered }),
  };
}

async function resolutions(): Promise<number> {
  const [row] = await database.asAdministrator<{ count: number }>(
    `SELECT count(*)::int AS count FROM sovitech.field_events WHERE project_id = $1 AND type = 'conflict_resolved'`,
    [projectId],
  );
  return row?.count ?? -1;
}

const write = (event: NewFieldEvent): Promise<unknown> => withRequest(database.app, engineerScope, (request) => appendFieldEvent(request, event));

test('F-VALUE-04 · G4-24: a resolution without its reason, or without the candidates it covered, is refused; nothing is stored', async () => {
  for (const reason of [undefined, '', ' ']) {
    await expect(write(resolution({ ...(reason === undefined ? {} : { reason }), covered: [value.candidateId, second] })), String(reason)).rejects.toMatchObject({
      code: '23514',
      constraint: 'field_events_resolution_reason',
    });
  }
  await expect(write(resolution({ reason: 'TEST both compared' }))).rejects.toMatchObject({ code: '23514', constraint: 'field_events_resolution_covers' });
  await expect(write(resolution({ reason: 'TEST both compared', covered: [second] }))).rejects.toMatchObject({
    code: '23514',
    constraint: 'field_events_chosen_covered',
  });
  expect(await resolutions()).toBe(0);
});

test('F-VALUE-04 · G4-24: a resolution naming a candidate of another field or subject, or one candidate twice, is refused; nothing is stored', async () => {
  await expect(write(resolution({ reason: 'TEST both compared', covered: [value.candidateId, elsewhere] }))).rejects.toMatchObject({
    refusal: 'covered_candidate_not_on_field',
  });
  await expect(write(resolution({ reason: 'TEST both compared', covered: [value.candidateId, value.candidateId] }))).rejects.toMatchObject({
    refusal: 'covered_candidate_not_on_field',
  });
  expect(await resolutions()).toBe(0);
});

test('F-VALUE-04 · G4-24 control: a complete resolution is stored and reads back with the ids it covered, and only those', async () => {
  await write(resolution({ reason: 'TEST both readings compared', covered: [value.candidateId, second] }));
  expect(await resolutions()).toBe(1);
  const inputs = await withRequest(database.app, engineerScope, (request) => readFieldInputs(request, { subjectId: value.subjectId, fieldKey: TEST_AREA_FIELD }));
  expect(inputs.events.field.filter((event) => event.type === 'conflict_resolved')).toEqual([
    expect.objectContaining({ by: engineerId, chosenCandidateId: value.candidateId, coveredCandidateIds: [value.candidateId, second] }),
  ]);
});
