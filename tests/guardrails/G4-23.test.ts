/**
 * G4-23 (docs/guardrails.md section 7; rule 4, "Only the right person's resolution closes a
 * conflict. Each resolution records who, when and why"; rule 3, "Who confirms"; 2.4, each event
 * carries who wrote it and in which role). Phase 1 review, verifier finding 2 and adversarial
 * finding 3.
 * Situation: an owner's request stores a conflict resolution, a rejection or a not-applicable
 * mark in the sovitech_engineer role, a system event, or an event naming another person as its
 * author.
 * Expected: refused; no event is stored.
 *
 * A TEST database holds two values of one field in one project. Every attempt is made through
 * the data-access layer inside the owner's request (the API names the owner as the user); the
 * store's event guard (SVX09, ADR 0014) refuses each one, and the administrator, who sees every
 * row, finds none written. The controls: the owner, the engineer and a service account member
 * of the project each write their own events.
 */
import { afterAll, beforeAll, expect, test } from 'vitest';
import {
  StoreRefusal,
  addProjectMember,
  appendCandidateEvent,
  appendDocumentEvent,
  appendFieldEvent,
  insertCandidate,
  newId,
  registerDocument,
  withRequest,
  type NewCandidateEvent,
  type NewDocumentEvent,
  type NewFieldEvent,
  type RequestScope,
} from '@sovitech/db';
import {
  createTestAccount,
  createTestDocumentValue,
  createTestProject,
  startTestDatabase,
  testContentHash,
  TEST_AREA_DEFINITION,
  TEST_AREA_FIELD,
  type TestDatabase,
  type TestDocumentValue,
} from '@sovitech/db/testing';

const NOT_THE_REQUEST = { refusal: 'event_not_from_the_requesting_user', sqlState: 'SVX09' };

let database: TestDatabase;
let ownerId: string;
let otherOwnerId: string;
let engineerId: string;
let serviceId: string;
let projectId: string;
let value: TestDocumentValue;
let second: string;
let draftId: string;
let ownerScope: RequestScope;

beforeAll(async () => {
  database = await startTestDatabase();
  ownerId = await createTestAccount(database, { label: 'G4-23 owner', kind: 'person', roles: ['owner'] });
  otherOwnerId = await createTestAccount(database, { label: 'G4-23 co-owner', kind: 'person', roles: ['owner'] });
  engineerId = await createTestAccount(database, { label: 'G4-23 engineer', kind: 'person', roles: ['sovitech_engineer'] });
  serviceId = await createTestAccount(database, { label: 'G4-23 extraction service', kind: 'service', roles: [] });
  projectId = await createTestProject(database, { ownerId, isDemo: false });
  ownerScope = { userId: ownerId, projectId };
  await withRequest(database.app, ownerScope, async (request) => {
    await addProjectMember(request, { projectId, userId: serviceId });
    await addProjectMember(request, { projectId, userId: otherOwnerId });
  });
  value = await createTestDocumentValue(database, { projectId, label: 'G4-23 schedule' });
  second = newId();
  draftId = await withRequest(database.app, ownerScope, async (request) => {
    const written = await insertCandidate(
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
    if (written.outcome !== 'stored') throw new Error('the second TEST value was refused');
    const draft = await registerDocument(request, {
      contentHash: testContentHash('G4-23 draft'),
      kind: 'other',
      stage: 'unknown',
      analysis: { status: 'stored_only', coverage: 'TEST not analysed' },
      createdBy: ownerId,
    });
    return draft.id;
  });
}, 240_000);

afterAll(async () => {
  await database.stop();
});

async function eventRows(): Promise<number> {
  const [row] = await database.asAdministrator<{ count: number }>(
    `SELECT (SELECT count(*) FROM sovitech.candidate_events WHERE project_id = $1)
          + (SELECT count(*) FROM sovitech.field_events WHERE project_id = $1)
          + (SELECT count(*) FROM sovitech.document_events WHERE project_id = $1) AS count`,
    [projectId],
  );
  return Number(row?.count ?? -1);
}

const resolution = (by: string): NewFieldEvent => ({
  subjectId: value.subjectId,
  fieldKey: TEST_AREA_FIELD,
  type: 'conflict_resolved',
  by,
  role: 'sovitech_engineer',
  reason: 'TEST both readings compared',
  chosenCandidateId: value.candidateId,
  coveredCandidateIds: [value.candidateId, second],
});

test('F-AUDIT-01 · G4-23: an owner request storing an engineer resolution, rejection or not-applicable mark is refused; nothing is stored', async () => {
  const before = await eventRows();
  const attempts: readonly (() => Promise<unknown>)[] = [
    () => withRequest(database.app, ownerScope, (request) => appendFieldEvent(request, resolution(engineerId))),
    () => withRequest(database.app, ownerScope, (request) => appendFieldEvent(request, resolution(ownerId))),
    () =>
      withRequest(database.app, ownerScope, (request) =>
        appendCandidateEvent(request, { candidateId: value.candidateId, type: 'rejected', by: ownerId, role: 'sovitech_engineer', reason: 'TEST' }),
      ),
    () =>
      withRequest(database.app, ownerScope, (request) =>
        appendFieldEvent(request, {
          subjectId: value.subjectId,
          fieldKey: TEST_AREA_FIELD,
          type: 'marked_not_applicable',
          by: engineerId,
          role: 'sovitech_engineer',
          reason: 'TEST not applicable',
        }),
      ),
  ];
  for (const attempt of attempts) {
    const outcome = attempt();
    await expect(outcome).rejects.toBeInstanceOf(StoreRefusal);
    await expect(outcome).rejects.toMatchObject(NOT_THE_REQUEST);
  }
  expect(await eventRows()).toBe(before);
});

test('F-AUDIT-01 · G4-23: an owner request storing a system event, or an event naming another person, is refused; nothing is stored', async () => {
  const before = await eventRows();
  const candidateAttempts: readonly NewCandidateEvent[] = [
    { candidateId: value.candidateId, type: 'superseded', by: 'test-system', role: 'system' },
    { candidateId: value.candidateId, type: 'withdrawn', by: 'test-system', role: 'system' },
    { candidateId: value.candidateId, type: 'user_confirmed', by: otherOwnerId, role: 'owner' },
    { candidateId: second, type: 'rejected', by: otherOwnerId, role: 'owner' },
  ];
  for (const event of candidateAttempts) {
    await expect(withRequest(database.app, ownerScope, (request) => appendCandidateEvent(request, event)), event.type).rejects.toMatchObject(NOT_THE_REQUEST);
  }
  const documentAttempts: readonly NewDocumentEvent[] = [
    { documentId: draftId, type: 'declared_revision_of', revisionOf: value.documentId, by: engineerId, role: 'sovitech_engineer' },
    { documentId: draftId, type: 'withdrawn', by: 'test-system', role: 'system' },
    { documentId: draftId, type: 'withdrawn', by: otherOwnerId, role: 'owner' },
  ];
  for (const event of documentAttempts) {
    await expect(withRequest(database.app, ownerScope, (request) => appendDocumentEvent(request, event)), event.type).rejects.toMatchObject(NOT_THE_REQUEST);
  }
  expect(await eventRows()).toBe(before);
});

test('F-AUDIT-01 · G4-23 controls: the owner, the engineer and a service account member each write their own events', async () => {
  const before = await eventRows();
  await withRequest(database.app, ownerScope, (request) =>
    appendCandidateEvent(request, { candidateId: value.candidateId, type: 'user_confirmed', by: ownerId, role: 'owner' }),
  );
  await withRequest(database.app, { userId: engineerId, projectId }, (request) => appendFieldEvent(request, resolution(engineerId)));
  await withRequest(database.app, { userId: serviceId, projectId }, (request) =>
    appendFieldEvent(request, { subjectId: value.subjectId, fieldKey: TEST_AREA_FIELD, type: 'analysis_started', by: serviceId, role: 'system' }),
  );
  expect(await eventRows()).toBe(before + 3);
});
