/**
 * Who may act, at the store, against a throwaway TEST database (phase 1 review
 * findings, each attack first reproduced on the store before this file):
 *
 * - an event's actor and role are the request's own (2.4; rule 4 routing, "Only
 *   the right person's resolution closes a conflict. Each resolution records
 *   who"; rule 3; rule 10): an owner's request cannot store an engineer's
 *   resolution, rejection or not-applicable mark, a system event, or an event
 *   naming someone else;
 * - a candidate names the user making the request as its author, from a source
 *   that user may create (2.1, "Who can create it"); the system writes only the
 *   candidate events the engine and the ingestion paths need, and a person
 *   withdraws only their own answer (phase 1 round 3);
 * - a candidate records the role its author acted in, set from the request
 *   (phase 1 round 4); a document is withdrawn by the owner or an engineer, and
 *   by the system only as the job carrying out such a person's withdrawal, which
 *   it names, and erased only by the erasure function (phase 1 rounds 4 and 5);
 * - a resolution names the candidates it covered, all of its field (rule 4), and
 *   comes from a person;
 * - nobody grants, revokes or adds themself; the two SOVITECH review roles are
 *   granted on the operator's login only (rule 10; prompt 3 section 10, "Holding
 *   it never permits verification"; PRD D-13 open); only a person holding owner
 *   who is a member, or the operator's login, adds a member;
 * - the demo flag follows the creator's account (rule 10, "Demo data");
 * - the app reads accounts and roles only for itself and the project in scope
 *   (rule 13, project boundary);
 * - no error the layer throws, and no line the server logs, carries stored text
 *   (rule 13, "Logs and error reports never contain document text").
 *
 * The indexed cases G10-3, G10-8 and G13-5 carry the routes that bear on their
 * own situations; this file carries the rest, including the store's stricter
 * readings SVR03, SVR04 and SVR05, moved here from the G10-3 and G10-8 case
 * files in phase 1 round 3 so that each case file keeps to its row.
 */
import { inspect } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { derive, type DocumentEvent, type FieldDefinition, type FieldState } from '@sovitech/domain';
import { unitByCode, type UnitCheckedField } from '@sovitech/registry';
import { StoreError, StoreRefusal } from './errors';
import { addProjectMember, createAppUser, createProject, eraseDocument, grantAppRole, openReviewItem, revokeAppRole, verifyCandidate } from './guarded';
import { newId } from './ids';
import { deriveContextFor, readFieldInputs, readUserRoles, readVisibleAccounts } from './reads';
import { withRequest, type RequestScope } from './request';
import type { AccountKind } from './schema';
import {
  appendCandidateEvent,
  appendDocumentEvent,
  appendFieldEvent,
  createSubject,
  insertCandidate,
  registerDocument,
  storeDocumentText,
  type NewCandidate,
  type NewCandidateEvent,
  type NewFieldEvent,
} from './writes';
import {
  createTestAccount,
  createTestDocumentValue,
  createTestProject,
  createTestService,
  startTestDatabase,
  testContentHash,
  TEST_AREA_DEFINITION,
  TEST_AREA_FIELD,
  type TestDatabase,
  type TestDocumentValue,
} from './testing';

const LONG = { timeout: 120_000 };

let database: TestDatabase;
let ownerId: string;
let engineerId: string;
let serviceId: string;
let outsiderId: string;
let projectId: string;
let value: TestDocumentValue;
let second: string;
let ownerScope: RequestScope;

beforeAll(async () => {
  database = await startTestDatabase();
  ownerId = await createTestAccount(database, { label: 'access owner', kind: 'person', roles: ['owner'] });
  engineerId = await createTestAccount(database, { label: 'access engineer', kind: 'person', roles: ['sovitech_engineer'] });
  serviceId = await createTestAccount(database, { label: 'access extraction service', kind: 'service', roles: [] });
  outsiderId = await createTestAccount(database, { label: 'access other client', kind: 'person', roles: ['owner'] });
  projectId = await createTestProject(database, { ownerId, isDemo: false });
  ownerScope = { userId: ownerId, projectId };
  await withRequest(database.app, ownerScope, (request) => addProjectMember(request, { projectId, userId: serviceId }));
  value = await createTestDocumentValue(database, { projectId, label: 'access schedule' });
  // A second TEST value of the same field, so there is something to resolve.
  second = newId();
  await withRequest(database.app, ownerScope, async (request) => {
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
  });
}, 240_000);

afterAll(async () => {
  await database.stop();
});

/** A TEST calculated value over the TEST document value, as the engine would write it (2.1: "The calculation engine only"). */
function calculatedValue(id: string, createdBy: string): NewCandidate {
  return {
    id,
    subjectId: value.subjectId,
    fieldKey: TEST_AREA_FIELD,
    quantity: { value: 9071, unit: 'm2', qualifier: 'gross_total' },
    source: 'calculated',
    evidence: [],
    method: { formulaId: 'test.formula.sum', formulaVersion: '1.0.0', inputCandidateIds: [value.candidateId], unknownPolicy: 'refuse', assumptions: [] },
    createdBy,
  };
}

async function eventRows(table: 'candidate_events' | 'field_events' | 'document_events', actor: string): Promise<number> {
  const [row] = await database.asAdministrator<{ count: number }>(
    `SELECT count(*)::int AS count FROM sovitech.${table} WHERE project_id = $1 AND actor = $2`,
    [projectId, actor],
  );
  return row?.count ?? -1;
}

function candidateEventAs(scope: RequestScope, event: NewCandidateEvent): Promise<unknown> {
  return withRequest(database.app, scope, (request) => appendCandidateEvent(request, event));
}

function fieldEventAs(scope: RequestScope, event: NewFieldEvent): Promise<unknown> {
  return withRequest(database.app, scope, (request) => appendFieldEvent(request, event));
}

describe('an event names the user making the request, in a role that user holds', LONG, () => {
  const NOT_THE_REQUEST = { refusal: 'event_not_from_the_requesting_user', sqlState: 'SVX09' };

  it('C1: an owner request stores a resolution claiming the engineer role and another actor: refused, nothing written', async () => {
    const attempt = fieldEventAs(ownerScope, {
      subjectId: value.subjectId,
      fieldKey: TEST_AREA_FIELD,
      type: 'conflict_resolved',
      by: 'someone-else',
      role: 'sovitech_engineer',
      chosenCandidateId: value.candidateId,
      coveredCandidateIds: [value.candidateId, second],
    });
    await expect(attempt).rejects.toBeInstanceOf(StoreRefusal);
    await expect(attempt).rejects.toMatchObject(NOT_THE_REQUEST);
    expect(await eventRows('field_events', 'someone-else')).toBe(0);
  });

  it('C1: the same, naming the owner themself in the engineer role: refused (the owner does not hold it)', async () => {
    await expect(
      fieldEventAs(ownerScope, {
        subjectId: value.subjectId,
        fieldKey: TEST_AREA_FIELD,
        type: 'conflict_resolved',
        by: ownerId,
        role: 'sovitech_engineer',
        chosenCandidateId: value.candidateId,
        coveredCandidateIds: [value.candidateId, second],
      }),
    ).rejects.toMatchObject(NOT_THE_REQUEST);
  });

  it('C2: an owner request stores a rejection claiming the engineer role: refused', async () => {
    await expect(
      candidateEventAs(ownerScope, { candidateId: value.candidateId, type: 'rejected', by: ownerId, role: 'sovitech_engineer' }),
    ).rejects.toMatchObject(NOT_THE_REQUEST);
  });

  it('C3: an owner request stores a system supersession or withdrawal: refused; only a service account writes system events', async () => {
    await expect(
      candidateEventAs(ownerScope, { candidateId: value.candidateId, type: 'superseded', by: 'test-system', role: 'system' }),
    ).rejects.toMatchObject(NOT_THE_REQUEST);
    await expect(
      candidateEventAs({ userId: engineerId, projectId }, { candidateId: value.candidateId, type: 'withdrawn', by: 'test-system', role: 'system' }),
    ).rejects.toMatchObject(NOT_THE_REQUEST);
    expect(await eventRows('candidate_events', 'test-system')).toBe(0);
  });

  it('C4: an owner request marks the field not applicable claiming the engineer role: refused', async () => {
    await expect(
      fieldEventAs(ownerScope, {
        subjectId: value.subjectId,
        fieldKey: TEST_AREA_FIELD,
        type: 'marked_not_applicable',
        by: 'someone-else',
        role: 'sovitech_engineer',
        reason: 'TEST not applicable',
      }),
    ).rejects.toMatchObject(NOT_THE_REQUEST);
  });

  it('C5: an owner request confirms a value naming another owner: refused; a non-member holding owner cannot act in the project', async () => {
    await expect(
      candidateEventAs(ownerScope, { candidateId: value.candidateId, type: 'user_confirmed', by: outsiderId, role: 'owner' }),
    ).rejects.toMatchObject(NOT_THE_REQUEST);
    // The outsider sees no row of the project (rule 13), so row-level security refuses before the guard.
    await expect(
      candidateEventAs({ userId: outsiderId, projectId }, { candidateId: value.candidateId, type: 'user_confirmed', by: outsiderId, role: 'owner' }),
    ).rejects.toBeInstanceOf(Error);
    expect(await eventRows('candidate_events', outsiderId)).toBe(0);
  });

  it('a document event: a revision declared, or a document withdrawn, in another person\'s name or as the system from an owner request: refused', async () => {
    const draft = await withRequest(database.app, ownerScope, (request) =>
      registerDocument(request, {
        contentHash: testContentHash('access draft'),
        kind: 'other',
        stage: 'unknown',
        analysis: { status: 'stored_only', coverage: 'TEST not analysed' },
        createdBy: 'test-extractor',
      }),
    );
    const declared = withRequest(database.app, ownerScope, (request) =>
      appendDocumentEvent(request, { documentId: draft.id, type: 'declared_revision_of', revisionOf: value.documentId, by: engineerId, role: 'sovitech_engineer' }),
    );
    await expect(declared).rejects.toMatchObject(NOT_THE_REQUEST);
    const withdrawn = withRequest(database.app, ownerScope, (request) =>
      appendDocumentEvent(request, { documentId: draft.id, type: 'withdrawn', by: 'test-system', role: 'system' }),
    );
    await expect(withdrawn).rejects.toMatchObject(NOT_THE_REQUEST);
    expect(await eventRows('document_events', engineerId)).toBe(0);
  });

  it('controls: each writes its own events: the owner as owner, the engineer as engineer, a service account as the system', async () => {
    await candidateEventAs(ownerScope, { candidateId: value.candidateId, type: 'user_confirmed', by: ownerId, role: 'owner' });
    await fieldEventAs(
      { userId: engineerId, projectId },
      {
        subjectId: value.subjectId,
        fieldKey: TEST_AREA_FIELD,
        type: 'conflict_resolved',
        by: engineerId,
        role: 'sovitech_engineer',
        reason: 'TEST checked both readings',
        chosenCandidateId: value.candidateId,
        coveredCandidateIds: [value.candidateId, second],
      },
    );
    // The engine's recalculation: a service account member supersedes a calculated value it wrote.
    const calculated = newId();
    await withRequest(database.app, { userId: serviceId, projectId }, (request) =>
      insertCandidate(request, calculatedValue(calculated, serviceId), TEST_AREA_DEFINITION),
    );
    await candidateEventAs({ userId: serviceId, projectId }, { candidateId: calculated, type: 'superseded', by: 'test-extraction-job', role: 'system' });
    expect(await eventRows('candidate_events', ownerId)).toBe(1);
    expect(await eventRows('field_events', engineerId)).toBe(1);
    expect(await eventRows('candidate_events', 'test-extraction-job')).toBe(1);
  });

  it('the demo seed acts as the owner on a demo project only (prompt 3 section 7: the demo\'s owner answers)', async () => {
    const seedId = await createTestAccount(database, { label: 'access demo seed', kind: 'seed', roles: ['owner'] });
    const demoId = await createTestProject(database, { ownerId: seedId, isDemo: true });
    const demoValue = await createTestDocumentValue(database, { projectId: demoId, label: 'access demo schedule' });
    await candidateEventAs({ userId: seedId, projectId: demoId }, { candidateId: demoValue.candidateId, type: 'user_confirmed', by: seedId, role: 'owner' });
    // The same seed made a member of a project that is not a demo: refused there.
    await withRequest(database.app, ownerScope, (request) => addProjectMember(request, { projectId, userId: seedId }));
    await expect(
      candidateEventAs({ userId: seedId, projectId }, { candidateId: value.candidateId, type: 'user_confirmed', by: seedId, role: 'owner' }),
    ).rejects.toMatchObject(NOT_THE_REQUEST);
  });
});

/**
 * Proposed case (for the integrator): a candidate written in another person's
 * name, or a document, AI, calculated, estimated or reference value written by
 * a request that is not a service account member of the project: refused,
 * nothing stored (2.1, "Who can create it"). Phase 1 round 3, adversarial
 * finding "candidate author and source" (probe R1 to R1f).
 */
describe('a candidate names the user making the request, from a source that user may create (2.1)', LONG, () => {
  const NOT_THE_AUTHOR = { refusal: 'candidate_not_from_the_requesting_user', sqlState: 'SVX11' };
  const FIRE = { key: 'project.scope.fire_safety', kind: 'decision' as const };
  let reviewerId: string;
  let coOwnerId: string;
  let roleHoldingServiceId: string;

  beforeAll(async () => {
    reviewerId = await createTestAccount(database, { label: 'access commercial reviewer', kind: 'person', roles: ['sovitech_commercial_reviewer'] });
    coOwnerId = await createTestAccount(database, { label: 'access co-owner', kind: 'person', roles: ['owner'] });
    // A job account that holds a review role, so row-level security shows it every project, but is no member of this one.
    roleHoldingServiceId = await createTestAccount(database, { label: 'access review-role service', kind: 'service', roles: ['sovitech_engineer'] });
    await withRequest(database.app, ownerScope, (request) => addProjectMember(request, { projectId, userId: coOwnerId }));
  });

  const choice = (createdBy: string, id = newId()): NewCandidate => ({
    id,
    subjectId: projectId,
    fieldKey: FIRE.key,
    choice: 'include',
    source: 'user',
    evidence: [],
    createdBy,
  });
  const write = (userId: string, candidate: NewCandidate, field: UnitCheckedField = FIRE) =>
    withRequest(database.app, { userId, projectId }, (request) => insertCandidate(request, candidate, field));
  const candidateRows = async (): Promise<number> => {
    const [row] = await database.asAdministrator<{ count: number }>('SELECT count(*)::int AS count FROM sovitech.candidates WHERE project_id = $1', [projectId]);
    return row?.count ?? -1;
  };

  it('R1, R1b, R1c: a commercial reviewer, an engineer or a co-owner writes a user answer in the owner\'s name: refused, nothing stored', async () => {
    const before = await candidateRows();
    for (const author of [reviewerId, engineerId, coOwnerId]) {
      await expect(write(author, choice(ownerId)), author).rejects.toMatchObject(NOT_THE_AUTHOR);
    }
    // In their own name, the commercial reviewer is neither an owner member nor an engineer.
    await expect(write(reviewerId, choice(reviewerId))).rejects.toMatchObject(NOT_THE_AUTHOR);
    expect(await candidateRows()).toBe(before);
  });

  it('R1d, R1g: the owner writes a calculated value, or a document value on verified evidence: refused, those come from code', async () => {
    const before = await candidateRows();
    await expect(write(ownerId, calculatedValue(newId(), ownerId), TEST_AREA_DEFINITION)).rejects.toMatchObject(NOT_THE_AUTHOR);
    const documentValue: NewCandidate = {
      id: newId(),
      subjectId: value.subjectId,
      fieldKey: TEST_AREA_FIELD,
      quantity: { value: 9072, unit: 'm2', qualifier: 'gross_total' },
      source: 'document',
      evidence: [{ documentId: value.documentId, contentHash: value.contentHash, locator: { page: 1 }, excerpt: 'TEST 9072', check: 'text_match' }],
      createdBy: ownerId,
    };
    await expect(write(ownerId, documentValue, TEST_AREA_DEFINITION)).rejects.toMatchObject(NOT_THE_AUTHOR);
    // An engineer writes only their own user entries (a site survey), never an engine or extraction source.
    await expect(write(engineerId, { ...documentValue, id: newId(), createdBy: engineerId }, TEST_AREA_DEFINITION)).rejects.toMatchObject(NOT_THE_AUTHOR);
    expect(await candidateRows()).toBe(before);
  });

  it('R1h: a service account writes a reference value in someone else\'s name, or writes as a job of a project it is not a member of: refused', async () => {
    const before = await candidateRows();
    const reference: NewCandidate = {
      id: newId(),
      subjectId: value.subjectId,
      fieldKey: TEST_AREA_FIELD,
      quantity: { value: 9073, unit: 'm2', qualifier: 'gross_total' },
      source: 'reference',
      evidence: [],
      reference: { dataset: 'TEST-dataset', version: 'TEST-1', key: 'TEST-key' },
      createdBy: ownerId,
    };
    await expect(write(serviceId, reference, TEST_AREA_DEFINITION)).rejects.toMatchObject(NOT_THE_AUTHOR);
    await expect(write(roleHoldingServiceId, { ...calculatedValue(newId(), roleHoldingServiceId) }, TEST_AREA_DEFINITION)).rejects.toMatchObject(NOT_THE_AUTHOR);
    // A user answer is never a job's.
    await expect(write(serviceId, choice(serviceId))).rejects.toMatchObject(NOT_THE_AUTHOR);
    expect(await candidateRows()).toBe(before);
  });

  it('controls: the owner and a co-owner answer in their own names, an engineer enters a site value, and a service account member writes engine and reference values', async () => {
    await expect(write(ownerId, choice(ownerId))).resolves.toMatchObject({ outcome: 'stored' });
    await expect(write(coOwnerId, choice(coOwnerId))).resolves.toMatchObject({ outcome: 'stored' });
    const siteEntry: NewCandidate = {
      id: newId(),
      subjectId: value.subjectId,
      fieldKey: TEST_AREA_FIELD,
      quantity: { value: 9074, unit: 'm2', qualifier: 'gross_total' },
      source: 'user',
      evidence: [],
      createdBy: engineerId,
    };
    await expect(write(engineerId, siteEntry, TEST_AREA_DEFINITION)).resolves.toMatchObject({ outcome: 'stored' });
    await expect(write(serviceId, calculatedValue(newId(), serviceId), TEST_AREA_DEFINITION)).resolves.toMatchObject({ outcome: 'stored' });
    const reference: NewCandidate = {
      id: newId(),
      subjectId: value.subjectId,
      fieldKey: TEST_AREA_FIELD,
      quantity: { value: 9075, unit: 'm2', qualifier: 'gross_total' },
      source: 'reference',
      evidence: [],
      reference: { dataset: 'TEST-dataset', version: 'TEST-1', key: 'TEST-key' },
      createdBy: serviceId,
    };
    await expect(write(serviceId, reference, TEST_AREA_DEFINITION)).resolves.toMatchObject({ outcome: 'stored' });
  });

  /**
   * Phase 1 round 4 (found at integration of round 3): an engineer's own `user` entry on the owner's decision was
   * stored with nothing to tell it from the owner's answer, and derive read it as the owner's choice. The store now
   * records the role the author acted in (`author_role`), from the request, and derive refuses a `user` value on a
   * decision whose author did not act as the owner (G3-16).
   */
  it('the store records the role the author acted in, from the request and never from the caller (2.1; rule 3)', async () => {
    const authorRoleOf = async (id: string): Promise<string | undefined> => {
      const [row] = await database.asAdministrator<{ author_role: string }>('SELECT author_role FROM sovitech.candidates WHERE id = $1', [id]);
      return row?.author_role;
    };
    const owners = choice(ownerId);
    const engineers = choice(engineerId);
    const engine = calculatedValue(newId(), serviceId);
    await expect(write(ownerId, owners)).resolves.toMatchObject({ outcome: 'stored', candidate: { authorRole: 'owner' } });
    await expect(write(engineerId, engineers)).resolves.toMatchObject({ outcome: 'stored', candidate: { authorRole: 'sovitech_engineer' } });
    await expect(write(serviceId, engine, TEST_AREA_DEFINITION)).resolves.toMatchObject({ outcome: 'stored', candidate: { authorRole: 'system' } });
    expect([await authorRoleOf(owners.id), await authorRoleOf(engineers.id), await authorRoleOf(engine.id)]).toEqual(['owner', 'sovitech_engineer', 'system']);

    const namingTheOwner = `INSERT INTO sovitech.candidates (id, project_id, subject_id, field_key, choice, source, created_by, author_role)
                            VALUES ($1, $2, $2, $3, 'include', 'user', $4, 'owner')`;
    // The app holds no INSERT on the column: it cannot even name it.
    await expect(database.as('app', namingTheOwner, [newId(), projectId, FIRE.key, engineerId], { userId: engineerId, projectId })).rejects.toMatchObject({
      code: '42501',
    });
    // The table owner may name it; the guard overwrites it from the request, whose user is an engineer.
    const forged = newId();
    await database.as('owner', namingTheOwner, [forged, projectId, FIRE.key, engineerId], { userId: engineerId, projectId });
    expect(await authorRoleOf(forged)).toBe('sovitech_engineer');
  });
});

/**
 * Who removes a document at the store (2.3, "Deleting a document"; rule 13, "Erasure"; rule 4).
 *
 * Round 4 (NEW-A from round 3's closing verification) found a job's service account storing a document
 * `withdrawn` event on its own, after which the system withdrew the document's value, so one side of an
 * engineer-routed conflict left with nobody deciding. Round 4 then held every withdrawal to the owner, which
 * refused engineers, whom 2.3's `DocumentEvent` names for `withdrawn`: a tightening beyond the rules as
 * written, corrected in round 5. The store now takes a withdrawal from the owner (a member holding owner) and
 * from a person holding sovitech_engineer, member or not (engineers read every project by role, ADR 0013), and
 * from the system only as the job carrying out such a person's own withdrawal of that document, which it names
 * (`request_event_id`; CHECK `document_events_withdrawn_by_person_or_request`, SVX15). An erased event stays the
 * erasure function's. The situation round 4 indexed as G4-32 (tender 6 against as-built 5) is proven here and
 * in packages/domain/src/field-state.test.ts; round 5 took its section 7 row back because its expected result
 * rests on a reading (ADR 0016 decision 21; build log, phase 1, round 5).
 */
describe('a document is withdrawn by the owner or an engineer, by the system only for a person\'s withdrawal it names, and erased only by the erasure function (2.3; rule 13; rule 4)', LONG, () => {
  const WITHOUT_REQUEST = { code: '23514', constraint: 'document_events_withdrawn_by_person_or_request' };
  const REQUEST_NOT_A_PERSONS_WITHDRAWAL = { refusal: 'system_withdrawal_without_request', sqlState: 'SVX15' };
  const SYSTEM_EVENT = { refusal: 'system_event_not_allowed', sqlState: 'SVX13' };
  const areaField: FieldDefinition = {
    key: TEST_AREA_FIELD,
    label: 'TEST gross floor area',
    subject: 'building',
    kind: 'quantity',
    unit: 'm2',
    qualifiers: ['gross_total'],
    estimation: 'forbidden',
    criticality: 'first_estimate',
    affects: [],
    impactRank: 1,
    confirmBy: 'engineer',
  };
  const documentEventRows = async (documentId: string): Promise<number> => {
    const [row] = await database.asAdministrator<{ count: number }>('SELECT count(*)::int AS count FROM sovitech.document_events WHERE document_id = $1', [
      documentId,
    ]);
    return row?.count ?? -1;
  };
  type Withdrawal = {
    readonly id?: string;
    readonly documentId: string;
    readonly by: string;
    readonly role: DocumentEvent['role'];
    readonly reason?: string;
    readonly requestEventId?: string;
  };
  const withdrawal = (scope: RequestScope, event: Withdrawal): Promise<DocumentEvent> =>
    withRequest(database.app, scope, (request) => appendDocumentEvent(request, { ...event, type: 'withdrawn' }));
  const valueWithdrawn = (shown: TestDocumentValue): Promise<unknown> =>
    candidateEventAs(
      { userId: shown.serviceId, projectId },
      { candidateId: shown.candidateId, type: 'withdrawn', by: shown.serviceId, role: 'system', reason: 'document_deleted' },
    );
  const statusOf = async (shown: TestDocumentValue): Promise<string | undefined> => {
    const inputs = await withRequest(database.app, ownerScope, (request) => readFieldInputs(request, { subjectId: shown.subjectId, fieldKey: TEST_AREA_FIELD }));
    const state = derive(areaField, inputs.candidates, inputs.events, deriveContextFor(inputs, { unit: unitByCode, inputState: () => undefined, datasetApproved: () => false }));
    expect(state.refusedEvents).toEqual([]);
    return state.candidates.find((candidate) => candidate.candidateId === shown.candidateId)?.status;
  };
  let memberEngineerId: string;

  beforeAll(async () => {
    memberEngineerId = await createTestAccount(database, { label: 'access engineer member', kind: 'person', roles: ['sovitech_engineer'] });
    await withRequest(database.app, ownerScope, (request) => addProjectMember(request, { projectId, userId: memberEngineerId }));
  });

  it('the owner, an engineer who is a member and an engineer who is not each withdraw a document, and the system then withdraws the value it alone supported', async () => {
    for (const [label, userId, role] of [
      ['owner', () => ownerId, 'owner'],
      ['engineer member', () => memberEngineerId, 'sovitech_engineer'],
      ['engineer not a member', () => engineerId, 'sovitech_engineer'],
    ] as const) {
      const shown = await createTestDocumentValue(database, { projectId, label: `access removal ${label}` });
      await expect(withdrawal({ userId: userId(), projectId }, { documentId: shown.documentId, by: userId(), role, reason: `TEST ${label} deletes` }), label).resolves.toMatchObject({
        type: 'withdrawn',
        role,
      });
      await expect(valueWithdrawn(shown), label).resolves.toMatchObject({ type: 'withdrawn', role: 'system' });
      expect(await statusOf(shown), label).toBe('withdrawn');
    }
  });

  it('the system withdraws a document with no person\'s withdrawal behind it: refused, whatever its reason; the value then stays', async () => {
    const shown = await createTestDocumentValue(database, { projectId, label: 'access removal job alone' });
    for (const reason of ['TEST', 'document_deleted', 'document_erased']) {
      await expect(withdrawal({ userId: shown.serviceId, projectId }, { documentId: shown.documentId, by: shown.serviceId, role: 'system', reason }), reason).rejects.toMatchObject(WITHOUT_REQUEST);
    }
    expect(await documentEventRows(shown.documentId)).toBe(0);
    // With no document removed, the system's withdrawal of the value is refused too (SVX13).
    await expect(valueWithdrawn(shown)).rejects.toMatchObject(SYSTEM_EVENT);
    expect(await statusOf(shown)).toBe('eligible');
  });

  it('the system carries out the owner\'s or an engineer\'s withdrawal, naming it: stored', async () => {
    for (const [label, userId, role] of [
      ['owner', () => ownerId, 'owner'],
      ['engineer member', () => memberEngineerId, 'sovitech_engineer'],
      ['engineer not a member', () => engineerId, 'sovitech_engineer'],
    ] as const) {
      const shown = await createTestDocumentValue(database, { projectId, label: `access removal job for ${label}` });
      const request = newId();
      await withdrawal({ userId: userId(), projectId }, { id: request, documentId: shown.documentId, by: userId(), role, reason: `TEST ${label} deletes` });
      await expect(
        withdrawal({ userId: shown.serviceId, projectId }, { documentId: shown.documentId, by: shown.serviceId, role: 'system', reason: 'document_deleted', requestEventId: request }),
        label,
      ).resolves.toMatchObject({ type: 'withdrawn', role: 'system', requestEventId: request });
      expect(await statusOf(shown), label).toBe('withdrawn');
    }
  });

  it('a system withdrawal that names anything but a person\'s withdrawal of the same document is refused; only a system withdrawal names one', async () => {
    const first = await createTestDocumentValue(database, { projectId, label: 'access removal request elsewhere' });
    const other = await createTestDocumentValue(database, { projectId, label: 'access removal request target' });
    const onOther = newId();
    await withdrawal(ownerScope, { id: onOther, documentId: other.documentId, by: ownerId, role: 'owner', reason: 'TEST owner deletes' });
    const declared = newId();
    await withRequest(database.app, ownerScope, (request) =>
      appendDocumentEvent(request, { id: declared, documentId: first.documentId, type: 'declared_revision_of', revisionOf: other.documentId, by: ownerId, role: 'owner' }),
    );
    const job = { userId: first.serviceId, projectId };
    // Another document's withdrawal, a declaration on this one, and an id that names no event.
    for (const [label, requestEventId] of [
      ['another document', onOther],
      ['a declaration', declared],
      ['nothing', newId()],
    ] as const) {
      await expect(
        withdrawal(job, { documentId: first.documentId, by: first.serviceId, role: 'system', reason: 'document_deleted', requestEventId }),
        label,
      ).rejects.toMatchObject(REQUEST_NOT_A_PERSONS_WITHDRAWAL);
    }
    // A person's own withdrawal never carries a request.
    await expect(
      withdrawal(ownerScope, { documentId: first.documentId, by: ownerId, role: 'owner', reason: 'TEST', requestEventId: onOther }),
    ).rejects.toMatchObject({ code: '23514', constraint: 'document_events_request_only_on_system_withdrawal' });
    expect(await documentEventRows(first.documentId)).toBe(1);
    expect(await statusOf(first)).toBe('eligible');
  });

  it('nobody withdraws a document in a role they do not hold: a commercial reviewer as engineer or owner, an engineer as owner or as the system', async () => {
    const shown = await createTestDocumentValue(database, { projectId, label: 'access removal wrong role' });
    const reviewerId = await createTestAccount(database, { label: 'access removal reviewer', kind: 'person', roles: ['sovitech_commercial_reviewer'] });
    const EVENT_ACTOR = { refusal: 'event_not_from_the_requesting_user', sqlState: 'SVX09' };
    for (const [label, userId, role] of [
      ['reviewer as engineer', reviewerId, 'sovitech_engineer'],
      ['reviewer as owner', reviewerId, 'owner'],
      ['engineer member as owner', memberEngineerId, 'owner'],
      ['engineer not a member as owner', engineerId, 'owner'],
    ] as const) {
      await expect(withdrawal({ userId, projectId }, { documentId: shown.documentId, by: userId, role, reason: 'TEST' }), label).rejects.toMatchObject(EVENT_ACTOR);
    }
    const request = newId();
    await withdrawal({ userId: memberEngineerId, projectId }, { id: request, documentId: shown.documentId, by: memberEngineerId, role: 'sovitech_engineer', reason: 'TEST' });
    await expect(
      withdrawal({ userId: memberEngineerId, projectId }, { documentId: shown.documentId, by: memberEngineerId, role: 'system', reason: 'document_deleted', requestEventId: request }),
    ).rejects.toMatchObject(EVENT_ACTOR);
    expect(await documentEventRows(shown.documentId)).toBe(1);
  });

  it('tender 6 against as-built 5: the job alone cannot withdraw the as-built document or its value, and the field read back stays in conflict for the engineer', async () => {
    const AHU = 'test.building.ahu_count';
    const ahuDefinition: FieldDefinition = {
      key: AHU,
      label: 'TEST AHU count',
      subject: 'building',
      kind: 'count',
      unit: 'count',
      qualifiers: ['ahu'],
      estimation: 'forbidden',
      criticality: 'for_quotation',
      affects: [],
      impactRank: 1,
      confirmBy: 'engineer',
    };
    const jobId = await createTestService(database, { projectId, label: 'access tender and as-built' });
    const job = { userId: jobId, projectId };
    const stored = await withRequest(database.app, job, async (request) => {
      const subject = await createSubject(request, { kind: 'building', createdBy: jobId });
      const read = async (label: string, stage: 'tender' | 'as_built', count: number) => {
        const contentHash = testContentHash(`${projectId} access ${label}`);
        const excerpt = `TEST ${label} CTA ${String(count)}`;
        const document = await registerDocument(request, { contentHash, kind: 'mep', stage, analysis: { status: 'analysed', coverage: 'TEST page 1 of 1' }, createdBy: jobId });
        await storeDocumentText(request, { contentHash, part: 'page:1', text: excerpt, createdBy: jobId });
        const candidateId = newId();
        const written = await insertCandidate(
          request,
          {
            id: candidateId,
            subjectId: subject.id,
            fieldKey: AHU,
            quantity: { value: count, unit: 'count', qualifier: 'ahu' },
            source: 'document',
            evidence: [{ documentId: document.id, contentHash, locator: { page: 1 }, excerpt, check: 'text_match' }],
            createdBy: jobId,
          },
          { key: AHU, kind: 'count', unit: 'count' },
        );
        if (written.outcome !== 'stored') throw new Error('the TEST value was refused');
        return { documentId: document.id, candidateId };
      };
      return { subjectId: subject.id, tender: await read('tender', 'tender', 6), asBuilt: await read('as-built', 'as_built', 5) };
    });
    const readBack = async (): Promise<FieldState> => {
      const inputs = await withRequest(database.app, { userId: engineerId, projectId }, (request) => readFieldInputs(request, { subjectId: stored.subjectId, fieldKey: AHU }));
      return derive(ahuDefinition, inputs.candidates, inputs.events, deriveContextFor(inputs, { unit: unitByCode, inputState: () => undefined, datasetApproved: () => false }));
    };
    const expectConflictForTheEngineer = (state: FieldState, label: string): void => {
      expect(state.state, label).toBe('conflict');
      expect(state.activeCandidateId, label).toBeNull();
      expect(state.conflict?.routedTo, label).toBe('engineer');
      expect(state.conflict?.candidateIds, label).toEqual([stored.asBuilt.candidateId, stored.tender.candidateId].sort());
      expect(state.review, label).toEqual({ list: 'sovitech_will_check', reason: 'conflict' });
    };
    expectConflictForTheEngineer(await readBack(), 'before');
    await expect(withdrawal(job, { documentId: stored.asBuilt.documentId, by: jobId, role: 'system', reason: 'document_deleted' })).rejects.toMatchObject(WITHOUT_REQUEST);
    await expect(
      candidateEventAs(job, { candidateId: stored.asBuilt.candidateId, type: 'withdrawn', by: jobId, role: 'system', reason: 'document_deleted' }),
    ).rejects.toMatchObject(SYSTEM_EVENT);
    expect(await documentEventRows(stored.asBuilt.documentId)).toBe(0);
    expectConflictForTheEngineer(await readBack(), 'after the job alone');

    // An engineer, the person the conflict is routed to, deletes the as-built document; the job then withdraws its value.
    const request = newId();
    await withdrawal({ userId: engineerId, projectId }, { id: request, documentId: stored.asBuilt.documentId, by: engineerId, role: 'sovitech_engineer', reason: 'TEST engineer deletes' });
    await withdrawal(job, { documentId: stored.asBuilt.documentId, by: jobId, role: 'system', reason: 'document_deleted', requestEventId: request });
    await candidateEventAs(job, { candidateId: stored.asBuilt.candidateId, type: 'withdrawn', by: jobId, role: 'system', reason: 'document_deleted' });
    const after = await readBack();
    expect(after.candidates.find((candidate) => candidate.candidateId === stored.asBuilt.candidateId)?.status).toBe('withdrawn');
    expect(after).toMatchObject({ state: 'known', activeCandidateId: stored.tender.candidateId, refusedEvents: [] });
  });

  it('the erased event is the erasure function\'s, with its own reason whatever the caller gave; the caller\'s reason stays in the audit event', async () => {
    for (const role of ['owner', 'system'] as const) {
      const erased = await createTestDocumentValue(database, { projectId, label: `access erasure reason ${role}` });
      const userId = role === 'owner' ? ownerId : erased.serviceId;
      const report = await withRequest(database.app, { userId, projectId }, (request) =>
        eraseDocument(request, { documentId: erased.documentId, role, reason: `TEST ${role} reason` }),
      );
      const [event] = await database.asAdministrator<{ role: string; reason: string }>(
        `SELECT role, reason FROM sovitech.document_events WHERE document_id = $1 AND type = 'erased'`,
        [erased.documentId],
      );
      expect(event, role).toEqual({ role, reason: 'document_erased' });
      const [audit] = await database.asAdministrator<{ reason: string }>('SELECT reason FROM sovitech.audit_events WHERE id = $1', [report.auditEventId]);
      expect(audit?.reason, role).toBe(`TEST ${role} reason`);
    }
  });
});

/**
 * The store's half of G4-25 (derive holds a system supersession only on a
 * calculated or estimated value, and a system withdrawal only when every
 * document of the value is removed) and of rule 4's "Only the right person's
 * resolution closes a conflict": the store now refuses what derive would
 * ignore. These are the store's stricter choices, not an indexed case. Phase 1
 * round 3, probes S4 to S6.
 */
describe('the system writes only what the engine and the ingestion paths need; a person withdraws only their own value', LONG, () => {
  const SYSTEM_EVENT = { refusal: 'system_event_not_allowed', sqlState: 'SVX13' };
  const serviceScope = (): RequestScope => ({ userId: serviceId, projectId });

  it('S4, S5 and more: a service account supersedes a document value, withdraws one whose document is live, rejects or confirms one: refused', async () => {
    for (const event of [
      { candidateId: value.candidateId, type: 'superseded', by: serviceId, role: 'system' },
      { candidateId: value.candidateId, type: 'withdrawn', by: serviceId, role: 'system', reason: 'document_erased' },
      { candidateId: value.candidateId, type: 'withdrawn', by: serviceId, role: 'system', reason: 'document_deleted' },
      { candidateId: value.candidateId, type: 'rejected', by: serviceId, role: 'system', reason: 'TEST' },
      { candidateId: value.candidateId, type: 'user_confirmed', by: serviceId, role: 'system' },
      { candidateId: second, type: 'superseded', by: serviceId, role: 'system' },
    ] as const satisfies readonly NewCandidateEvent[]) {
      await expect(candidateEventAs(serviceScope(), event), `${event.type} ${event.candidateId}`).rejects.toMatchObject(SYSTEM_EVENT);
    }
    expect(await eventRows('candidate_events', serviceId)).toBe(0);
  });

  it('S6: a conflict resolution, or a skip, as the system; analysis recorded by a person: refused by the store', async () => {
    await expect(
      fieldEventAs(serviceScope(), {
        subjectId: value.subjectId,
        fieldKey: TEST_AREA_FIELD,
        type: 'conflict_resolved',
        by: serviceId,
        role: 'system',
        reason: 'TEST',
        chosenCandidateId: value.candidateId,
        coveredCandidateIds: [value.candidateId, second],
      }),
    ).rejects.toMatchObject({ code: '23514', constraint: 'field_events_resolution_by_person' });
    await expect(
      fieldEventAs(serviceScope(), { subjectId: value.subjectId, fieldKey: TEST_AREA_FIELD, type: 'skipped', by: serviceId, role: 'system' }),
    ).rejects.toMatchObject({ code: '23514', constraint: 'field_events_skipped_by_owner' });
    await expect(
      fieldEventAs(ownerScope, { subjectId: value.subjectId, fieldKey: TEST_AREA_FIELD, type: 'analysis_started', by: ownerId, role: 'owner' }),
    ).rejects.toMatchObject({ code: '23514', constraint: 'field_events_analysis_by_system' });
    expect(await eventRows('field_events', serviceId)).toBe(0);
  });

  it('a person withdraws a document value, or another person\'s answer: refused (a correction is a rejection, rule 4)', async () => {
    const WITHDRAWAL = { refusal: 'withdrawal_not_own_value', sqlState: 'SVX14' };
    await expect(candidateEventAs(ownerScope, { candidateId: value.candidateId, type: 'withdrawn', by: ownerId, role: 'owner' })).rejects.toMatchObject(WITHDRAWAL);
    await expect(
      candidateEventAs({ userId: engineerId, projectId }, { candidateId: value.candidateId, type: 'withdrawn', by: engineerId, role: 'sovitech_engineer' }),
    ).rejects.toMatchObject(WITHDRAWAL);
    await expect(
      candidateEventAs({ userId: engineerId, projectId }, { candidateId: second, type: 'withdrawn', by: engineerId, role: 'sovitech_engineer' }),
    ).rejects.toMatchObject(WITHDRAWAL);
  });

  it('controls: the owner withdraws their own answer; the system records analysis, and withdraws a value once the owner deleted its only document', async () => {
    const own = newId();
    await withRequest(database.app, ownerScope, (request) =>
      insertCandidate(
        request,
        { id: own, subjectId: value.subjectId, fieldKey: TEST_AREA_FIELD, quantity: { value: 9076, unit: 'm2', qualifier: 'gross_total' }, source: 'user', evidence: [], createdBy: ownerId },
        TEST_AREA_DEFINITION,
      ),
    );
    await expect(candidateEventAs(ownerScope, { candidateId: own, type: 'withdrawn', by: ownerId, role: 'owner' })).resolves.toMatchObject({ type: 'withdrawn' });
    await expect(
      fieldEventAs(serviceScope(), { subjectId: value.subjectId, fieldKey: TEST_AREA_FIELD, type: 'analysis_finished', by: serviceId, role: 'system' }),
    ).resolves.toMatchObject({ type: 'analysis_finished' });
    const deleted = await createTestDocumentValue(database, { projectId, label: 'access deleted schedule' });
    await withRequest(database.app, ownerScope, (request) =>
      appendDocumentEvent(request, { documentId: deleted.documentId, type: 'withdrawn', by: ownerId, role: 'owner' }),
    );
    await expect(
      candidateEventAs(
        { userId: deleted.serviceId, projectId },
        { candidateId: deleted.candidateId, type: 'withdrawn', by: deleted.serviceId, role: 'system', reason: 'document_deleted' },
      ),
    ).resolves.toMatchObject({ type: 'withdrawn', role: 'system' });
  });
});

describe('a resolution names the exact candidates it covered (rule 4)', LONG, () => {
  const resolution = (covered: readonly string[] | undefined, chosen?: string, reason = 'TEST both readings compared'): NewFieldEvent => ({
    subjectId: value.subjectId,
    fieldKey: TEST_AREA_FIELD,
    type: 'conflict_resolved',
    by: engineerId,
    role: 'sovitech_engineer',
    reason,
    ...(chosen === undefined ? {} : { chosenCandidateId: chosen }),
    ...(covered === undefined ? {} : { coveredCandidateIds: covered }),
  });
  const engineerScope = (): RequestScope => ({ userId: engineerId, projectId });

  it('without its covered set: refused', async () => {
    await expect(fieldEventAs(engineerScope(), resolution(undefined, value.candidateId))).rejects.toMatchObject({
      code: '23514',
      constraint: 'field_events_resolution_covers',
    });
  });

  it('without a reason: refused ("Each resolution records who, when and why")', async () => {
    await expect(fieldEventAs(engineerScope(), resolution([value.candidateId, second], value.candidateId, ' '))).rejects.toMatchObject({
      code: '23514',
      constraint: 'field_events_resolution_reason',
    });
  });

  it('naming a candidate of another field, or one candidate twice: refused', async () => {
    const other = await withRequest(database.app, { userId: engineerId, projectId }, async (request) => {
      const subject = await createSubject(request, { kind: 'building', createdBy: 'test' });
      const id = newId();
      await insertCandidate(
        request,
        {
          id,
          subjectId: subject.id,
          fieldKey: TEST_AREA_FIELD,
          quantity: { value: 2222.5, unit: 'm2', qualifier: 'gross_total' },
          source: 'user',
          evidence: [],
          createdBy: engineerId,
        },
        TEST_AREA_DEFINITION,
      );
      return id;
    });
    await expect(fieldEventAs(engineerScope(), resolution([value.candidateId, other], value.candidateId))).rejects.toMatchObject({
      refusal: 'covered_candidate_not_on_field',
    });
    await expect(fieldEventAs(engineerScope(), resolution([value.candidateId, value.candidateId], value.candidateId))).rejects.toMatchObject({
      refusal: 'covered_candidate_not_on_field',
    });
  });

  it('choosing a candidate it did not cover, or a covered set on another event type: refused', async () => {
    await expect(fieldEventAs(engineerScope(), resolution([second], value.candidateId))).rejects.toMatchObject({
      code: '23514',
      constraint: 'field_events_chosen_covered',
    });
    await expect(
      fieldEventAs(engineerScope(), {
        subjectId: value.subjectId,
        fieldKey: TEST_AREA_FIELD,
        type: 'conflict_raised',
        by: engineerId,
        role: 'sovitech_engineer',
        coveredCandidateIds: [second],
      }),
    ).rejects.toMatchObject({ code: '23514', constraint: 'field_events_resolution_covers' });
  });

  it('a stored resolution reads back with the ids it covered, and only those', async () => {
    const inputs = await withRequest(database.app, { userId: engineerId, projectId }, (request) =>
      readFieldInputs(request, { subjectId: value.subjectId, fieldKey: TEST_AREA_FIELD }),
    );
    const resolutions = inputs.events.field.filter((event) => event.type === 'conflict_resolved');
    expect(resolutions).toEqual([
      expect.objectContaining({ by: engineerId, chosenCandidateId: value.candidateId, coveredCandidateIds: [value.candidateId, second] }),
    ]);
  });
});

describe('nobody administers themself; the review roles come from the operator login (rule 10; D-13)', LONG, () => {
  let adminId: string;
  beforeAll(async () => {
    adminId = await createTestAccount(database, { label: 'access admin', kind: 'person', roles: ['sovitech_admin'] });
  });

  it('an admin grants themself sovitech_engineer, or any role, through the app: refused', async () => {
    for (const role of ['sovitech_engineer', 'owner', 'sovitech_commercial_reviewer'] as const) {
      const attempt = withRequest(database.app, { userId: adminId }, (request) =>
        grantAppRole(request.trx, { userId: adminId, role, reason: 'TEST self grant' }),
      );
      await expect(attempt, role).rejects.toMatchObject({ refusal: 'self_administration', sqlState: 'SVR03' });
    }
    expect(await withRequest(database.app, { userId: adminId }, (request) => readUserRoles(request, adminId))).toEqual(['sovitech_admin']);
  });

  it('an admin revokes their own role: refused', async () => {
    await expect(
      withRequest(database.app, { userId: adminId }, (request) =>
        revokeAppRole(request.trx, { userId: adminId, role: 'sovitech_admin', reason: 'TEST self revoke' }),
      ),
    ).rejects.toMatchObject({ refusal: 'self_administration' });
  });

  it('an admin grants sovitech_engineer or sovitech_commercial_reviewer to another account through the app: refused until D-13', async () => {
    const colleague = await createTestAccount(database, { label: 'access colleague', kind: 'person', roles: [] });
    for (const role of ['sovitech_engineer', 'sovitech_commercial_reviewer'] as const) {
      await expect(
        withRequest(database.app, { userId: adminId }, (request) => grantAppRole(request.trx, { userId: colleague, role, reason: 'TEST grant' })),
        role,
      ).rejects.toMatchObject({ refusal: 'role_granted_on_the_operator_login_only', sqlState: 'SVR04' });
    }
    const [row] = await database.asAdministrator<{ count: number }>(
      `SELECT count(*)::int AS count FROM sovitech.app_role_events WHERE user_id = $1`,
      [colleague],
    );
    expect(row?.count).toBe(0);
  });

  // Moved from the G10-3 case file (phase 1 round 3): the stricter readings SVR03 and SVR04 are this file's, not the case's.
  it('an admin grants themself sovitech_engineer through the app, then calls the verify function: both refused, nothing written', async () => {
    const selfGranting = await createTestAccount(database, { label: 'access self-granting admin', kind: 'person', roles: ['sovitech_admin'] });
    await expect(
      withRequest(database.app, { userId: selfGranting }, (request) =>
        grantAppRole(request.trx, { userId: selfGranting, role: 'sovitech_engineer', reason: 'TEST self grant' }),
      ),
    ).rejects.toMatchObject({ refusal: 'self_administration' });
    const verify = withRequest(database.app, { userId: selfGranting, projectId }, async (request) => {
      await openReviewItem(request, { candidateId: value.candidateId });
      return verifyCandidate(request, { candidateId: value.candidateId });
    });
    await expect(verify).rejects.toMatchObject({ refusal: 'verification_needs_the_engineer_role' });
    const [row] = await database.asAdministrator<{ grants: number; verified: number }>(
      `SELECT (SELECT count(*)::int FROM sovitech.app_role_events WHERE user_id = $1 AND role = 'sovitech_engineer') AS grants,
              (SELECT count(*)::int FROM sovitech.candidate_events WHERE actor = $1::text AND type = 'engineer_verified') AS verified`,
      [selfGranting],
    );
    expect(row).toEqual({ grants: 0, verified: 0 });
  });

  it('an admin creates an account and grants it sovitech_engineer through the app: refused, and the account verifies nothing', async () => {
    const granting = await createTestAccount(database, { label: 'access granting admin', kind: 'person', roles: ['sovitech_admin'] });
    const created = await withRequest(database.app, { userId: granting }, (request) =>
      createAppUser(request.trx, { displayName: 'TEST account made by an admin', kind: 'person', reason: 'TEST admin setup' }),
    );
    await expect(
      withRequest(database.app, { userId: granting }, (request) =>
        grantAppRole(request.trx, { userId: created, role: 'sovitech_engineer', reason: 'TEST admin grant' }),
      ),
    ).rejects.toMatchObject({ refusal: 'role_granted_on_the_operator_login_only' });
    await expect(
      withRequest(database.app, { userId: created, projectId }, (request) => verifyCandidate(request, { candidateId: value.candidateId })),
    ).rejects.toMatchObject({ refusal: 'verification_needs_the_engineer_role' });
  });

  it('controls: the operator login grants the engineer role; an admin grants the owner role to another account', async () => {
    const colleague = await createTestAccount(database, { label: 'access new engineer', kind: 'person', roles: [] });
    await grantAppRole(database.operator.db, { userId: colleague, role: 'sovitech_engineer', reason: 'TEST operator grant' });
    await withRequest(database.app, { userId: adminId }, (request) =>
      grantAppRole(request.trx, { userId: colleague, role: 'owner', reason: 'TEST admin grant' }),
    );
    expect(await withRequest(database.app, { userId: colleague }, (request) => readUserRoles(request, colleague))).toEqual([
      'owner',
      'sovitech_engineer',
    ]);
  });
});

describe('only a person holding owner who is a member, or the operator login, adds a member; nobody adds themself (ADR 0013)', LONG, () => {
  // Phase 1 round 3, probe R5: a job's account once added an outsider, who then read the project as a member.
  it('R5: a service account member, the demo seed, or a member who does not hold owner adds another account: refused, and it reads nothing', async () => {
    const outsiderScope: RequestScope = { userId: outsiderId, projectId };
    await expect(
      withRequest(database.app, { userId: serviceId, projectId }, (request) => addProjectMember(request, { projectId, userId: outsiderId })),
    ).rejects.toMatchObject({ refusal: 'not_authorised', sqlState: 'SVR01' });
    const adminMember = await createTestAccount(database, { label: 'access admin member', kind: 'person', roles: ['sovitech_admin'] });
    await withRequest(database.app, ownerScope, (request) => addProjectMember(request, { projectId, userId: adminMember }));
    await expect(
      withRequest(database.app, { userId: adminMember, projectId }, (request) => addProjectMember(request, { projectId, userId: outsiderId })),
    ).rejects.toMatchObject({ refusal: 'not_authorised' });
    const seedId = await createTestAccount(database, { label: 'access member-adding seed', kind: 'seed', roles: ['owner'] });
    const demoId = await createTestProject(database, { ownerId: seedId, isDemo: true });
    await expect(
      withRequest(database.app, { userId: seedId, projectId: demoId }, (request) => addProjectMember(request, { projectId: demoId, userId: outsiderId })),
    ).rejects.toMatchObject({ refusal: 'not_authorised' });
    expect(await database.as('app', 'SELECT id FROM sovitech.candidates', [], outsiderScope)).toEqual([]);
    const members = await database.asAdministrator('SELECT 1 FROM sovitech.project_members WHERE user_id = $1', [outsiderId]);
    expect(members).toEqual([]);
  });

  it('an admin who is not a member adds themself, or another account: refused, and reads nothing', async () => {
    const adminId = await createTestAccount(database, { label: 'access member admin', kind: 'person', roles: ['sovitech_admin'] });
    await expect(
      withRequest(database.app, { userId: adminId }, (request) => addProjectMember(request, { projectId, userId: adminId })),
    ).rejects.toMatchObject({ refusal: 'self_administration' });
    await expect(
      withRequest(database.app, { userId: adminId }, (request) => addProjectMember(request, { projectId, userId: outsiderId })),
    ).rejects.toMatchObject({ refusal: 'not_authorised' });
    expect(await database.as('app', 'SELECT id FROM sovitech.candidates', [], { userId: adminId, projectId })).toEqual([]);
  });

  it('controls: a member adds another account; the operator login adds one', async () => {
    const colleague = await createTestAccount(database, { label: 'access colleague owner', kind: 'person', roles: ['owner'] });
    await withRequest(database.app, ownerScope, (request) => addProjectMember(request, { projectId, userId: colleague }));
    const helper = await createTestAccount(database, { label: 'access operator added', kind: 'person', roles: ['owner'] });
    await addProjectMember(database.operator.db, { projectId, userId: helper });
    const rows = await database.asAdministrator<{ user_id: string }>(
      'SELECT user_id FROM sovitech.project_members WHERE project_id = $1 AND user_id = ANY ($2::uuid[]) ORDER BY user_id',
      [projectId, [colleague, helper]],
    );
    expect(rows.map((row) => row.user_id)).toEqual([colleague, helper].sort());
  });
});

describe('the demo flag follows the creator\'s account (rule 10, "Demo data")', LONG, () => {
  async function create(kind: AccountKind, isDemo: boolean): Promise<unknown> {
    const creator = await createTestAccount(database, { label: `access ${kind} creator`, kind, roles: ['owner'] });
    return withRequest(database.app, { userId: creator }, (request) => createProject(request, { isDemo }));
  }

  // Moved from the G10-8 case file (phase 1 round 3): the stricter reading SVR05 is this file's, not the case's.
  it('a seed account creates a project without the flag: refused, so no demo project exists unflagged', async () => {
    const seedId = await createTestAccount(database, { label: 'access unflagged seed', kind: 'seed', roles: ['owner'] });
    await expect(withRequest(database.app, { userId: seedId }, (request) => createProject(request, { isDemo: false }))).rejects.toMatchObject({
      refusal: 'demo_flag_follows_the_account',
      sqlState: 'SVR05',
    });
    const [row] = await database.asAdministrator<{ count: number }>('SELECT count(*)::int AS count FROM sovitech.projects WHERE created_by = $1', [seedId]);
    expect(row?.count).toBe(0);
  });

  it('a person or a service account creates a demo project: refused', async () => {
    await expect(create('person', true)).rejects.toMatchObject({ refusal: 'demo_flag_follows_the_account' });
    await expect(create('service', true)).rejects.toMatchObject({ refusal: 'demo_flag_follows_the_account' });
  });

  it('controls: the seed creates a demo project; a person creates one that is not', async () => {
    await expect(create('seed', true)).resolves.toEqual(expect.any(String));
    await expect(create('person', false)).resolves.toEqual(expect.any(String));
  });
});

describe('the app reads accounts and roles only for itself and the project in scope (rule 13)', LONG, () => {
  it('the tables and the role lookup are closed to the app', async () => {
    await expect(database.as('app', 'SELECT id FROM sovitech.app_users', [], ownerScope)).rejects.toMatchObject({ code: '42501' });
    await expect(database.as('app', 'SELECT user_id FROM sovitech.app_user_roles', [], ownerScope)).rejects.toMatchObject({ code: '42501' });
    await expect(
      database.as('app', `SELECT sovitech.user_holds_role('${outsiderId}', 'owner')`, [], ownerScope),
    ).rejects.toMatchObject({ code: '42501' });
  });

  it('a request scoped to the project sees its own account and the members, never another client', async () => {
    const accounts = await withRequest(database.app, ownerScope, readVisibleAccounts);
    const ids = accounts.map((account) => account.id);
    expect(ids).toContain(ownerId);
    expect(ids).toContain(serviceId);
    expect(ids).not.toContain(outsiderId);
    expect(ids).not.toContain(engineerId);
    expect(await withRequest(database.app, ownerScope, (request) => readUserRoles(request, outsiderId))).toEqual([]);
    const outsider = await withRequest(database.app, { userId: outsiderId }, readVisibleAccounts);
    expect(outsider.map((account) => account.id)).toEqual([outsiderId]);
  });

  it('control: the operator login reads every account', async () => {
    const all = await database.as<{ id: string }>('operator', 'SELECT id FROM sovitech.app_users');
    expect(all.map((row) => row.id)).toEqual(expect.arrayContaining([ownerId, engineerId, serviceId, outsiderId]));
  });
});

describe('no error the layer throws, and no line the server logs, carries stored text (rule 13)', LONG, () => {
  const SECRET = 'TEST secret Suprafata construita 9.876,5 mp';
  const MARK = '9.876,5';

  it('the database of the store logs tersely and never logs a failing statement', async () => {
    const settings = await database.as<{ verbosity: string; statement: string }>(
      'app',
      `SELECT current_setting('log_error_verbosity') AS verbosity, current_setting('log_min_error_statement') AS statement`,
    );
    expect(settings).toEqual([{ verbosity: 'terse', statement: 'panic' }]);
  });

  it('a CHECK violation whose failing row holds TEST text: the thrown error and the server log leave the text out', async () => {
    let caught: unknown;
    try {
      await createAppUser(database.operator.db, { displayName: SECRET, kind: 'robot' as AccountKind, reason: 'TEST probe' });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(StoreError);
    expect(caught).toMatchObject({ code: '23514', constraint: 'app_users_kind_check' });
    expect(inspect(caught, { depth: 10, showHidden: true })).not.toContain(MARK);
    expect(JSON.stringify(caught)).not.toContain(MARK);
    expect(caught).not.toHaveProperty('detail');
    expect(caught).not.toHaveProperty('cause');

    // A marker the server must log after the failure, so the log below is read past it.
    const marker = `TEST log marker ${newId()}`;
    await database.asAdministrator(`DO $body$ BEGIN RAISE WARNING '${marker}'; END $body$`);
    let log = '';
    for (let attempt = 0; attempt < 50 && !log.includes(marker); attempt += 1) {
      log = database.serverLog();
      if (!log.includes(marker)) await new Promise((resolve) => setTimeout(resolve, 100));
    }
    expect(log).toContain(marker);
    expect(log).toContain('app_users_kind_check');
    expect(log).not.toContain(MARK);
  });

  it('an input error that would echo TEST text, raised inside a request: the thrown error leaves it out', async () => {
    const attempt = withRequest(database.app, ownerScope, (request) => createSubject(request, { id: SECRET, kind: 'building', createdBy: 'test' }));
    await expect(attempt).rejects.toBeInstanceOf(StoreError);
    const caught = await attempt.catch((error: unknown) => error);
    expect(caught).toMatchObject({ code: '22P02' });
    expect(inspect(caught, { depth: 10, showHidden: true })).not.toContain(MARK);
  });

  it('a refusal keeps the store\'s own message and code, and not the database error', async () => {
    const attempt = candidateEventAs(ownerScope, { candidateId: value.candidateId, type: 'rejected', by: SECRET, role: 'sovitech_engineer' });
    const caught = await attempt.catch((error: unknown) => error);
    expect(caught).toBeInstanceOf(StoreRefusal);
    expect(inspect(caught, { depth: 10, showHidden: true })).not.toContain(MARK);
  });
});
