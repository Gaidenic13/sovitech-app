/**
 * G2-9 (docs/guardrails.md section 7; 2.1, "Who can create it": `user`, "The owner's or engineer's own
 * action"; `document` and `ai_inference`, "Extraction"; `calculated` and `estimated`, "The calculation
 * engine only"; `reference`, "Code, from the named dataset and version"; 2.4, `createdBy`; rule 2,
 * "Every value has a source"). Phase 1 review, round 3, adversarial finding on candidate authors
 * (probe R1 to R1h).
 * Situation: a candidate is written in another account's name, or a `document`, `ai_inference`,
 * `calculated`, `estimated` or `reference` candidate is written from the request of a person: an
 * owner, an engineer or a commercial reviewer.
 * Expected: refused; nothing is stored.
 *
 * On a TEST database, each write goes through the data-access layer in its author's own request.
 * The store's candidate guard (`SVX11`, `candidate_not_from_the_requesting_user`) refuses: a commercial
 * reviewer, an engineer and a co-owner writing a `user` answer on the Fire Safety decision in the
 * owner's name; the extraction job's service account writing a value in the owner's name; and each of
 * the five code sources from each of the three people, in their own names. The administrator, who reads
 * every row, finds no candidate added. The controls: the owner answers in their own name, an engineer
 * enters a site value in theirs (2.1, "an engineer's site survey entry"), and the extraction job's
 * service account, a member of the project, writes each of the five code sources in its own name.
 */
import { afterAll, beforeAll, expect, test } from 'vitest';
import type { Source } from '@sovitech/domain';
import { addProjectMember, insertCandidate, newId, withRequest, type NewCandidate } from '@sovitech/db';
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

const NOT_THE_AUTHOR = { refusal: 'candidate_not_from_the_requesting_user', sqlState: 'SVX11' };
const FIRE_SAFETY = { key: 'project.scope.fire_safety', kind: 'decision' as const };
const CODE_SOURCES = ['document', 'ai_inference', 'calculated', 'estimated', 'reference'] as const satisfies readonly Source[];

let database: TestDatabase;
let ownerId: string;
let coOwnerId: string;
let engineerId: string;
let reviewerId: string;
let projectId: string;
let value: TestDocumentValue;

beforeAll(async () => {
  database = await startTestDatabase();
  ownerId = await createTestAccount(database, { label: 'G2-9 owner', kind: 'person', roles: ['owner'] });
  coOwnerId = await createTestAccount(database, { label: 'G2-9 co-owner', kind: 'person', roles: ['owner'] });
  engineerId = await createTestAccount(database, { label: 'G2-9 engineer', kind: 'person', roles: ['sovitech_engineer'] });
  reviewerId = await createTestAccount(database, { label: 'G2-9 commercial reviewer', kind: 'person', roles: ['sovitech_commercial_reviewer'] });
  projectId = await createTestProject(database, { ownerId, isDemo: false });
  await withRequest(database.app, { userId: ownerId, projectId }, (request) => addProjectMember(request, { projectId, userId: coOwnerId }));
  // One TEST document value, written by the extraction job's TEST service account, a member of the project.
  value = await createTestDocumentValue(database, { projectId, label: 'G2-9 schedule' });
}, 240_000);

afterAll(async () => {
  await database.stop();
});

async function candidateRows(): Promise<number> {
  const [row] = await database.asAdministrator<{ count: number }>('SELECT count(*)::int AS count FROM sovitech.candidates WHERE project_id = $1', [projectId]);
  return row?.count ?? -1;
}

/** The owner's choice on the Fire Safety decision, written in `createdBy`'s name. */
function fireSafetyAnswer(createdBy: string): NewCandidate {
  return { id: newId(), subjectId: projectId, fieldKey: FIRE_SAFETY.key, choice: 'include', source: 'user', evidence: [], createdBy };
}

/** A well-formed TEST candidate of a code source on the TEST area field, written in `createdBy`'s name. */
function fromCode(source: (typeof CODE_SOURCES)[number], createdBy: string): NewCandidate {
  const base = { id: newId(), subjectId: value.subjectId, fieldKey: TEST_AREA_FIELD, quantity: { value: 9091, unit: 'm2', qualifier: 'gross_total' }, createdBy };
  const evidence = [{ documentId: value.documentId, contentHash: value.contentHash, locator: { page: 1 }, excerpt: 'TEST 9091 m2', check: 'text_match' as const }];
  const method = { formulaId: 'TEST-sum', formulaVersion: '1.0.0', inputCandidateIds: [value.candidateId], unknownPolicy: 'refuse' as const, assumptions: [] };
  switch (source) {
    case 'document':
      return { ...base, source, evidence };
    case 'ai_inference':
      return { ...base, source, evidence, confidence: 'low' };
    case 'calculated':
      return { ...base, source, evidence: [], method };
    case 'estimated':
      return { ...base, source, evidence: [], method, range: { low: 9001, high: 9099 } };
    case 'reference':
      return { ...base, source, evidence: [], reference: { dataset: 'TEST-dataset', version: 'TEST-1', key: 'TEST-key' } };
  }
}

function write(userId: string, candidate: NewCandidate, field = candidate.fieldKey === FIRE_SAFETY.key ? FIRE_SAFETY : TEST_AREA_DEFINITION) {
  return withRequest(database.app, { userId, projectId }, (request) => insertCandidate(request, candidate, field));
}

test("G2-9 · a user answer written in the owner's name by a commercial reviewer, an engineer, a co-owner or the extraction job: refused, nothing stored", async () => {
  const before = await candidateRows();
  for (const author of [reviewerId, engineerId, coOwnerId, value.serviceId]) {
    await expect(write(author, fireSafetyAnswer(ownerId)), author).rejects.toMatchObject(NOT_THE_AUTHOR);
  }
  // A code source in someone else's name, from the extraction job itself.
  await expect(write(value.serviceId, fromCode('reference', ownerId))).rejects.toMatchObject(NOT_THE_AUTHOR);
  expect(await candidateRows()).toBe(before);
});

test('G2-9 · a document, AI, calculated, estimated or reference value from an owner, an engineer or a commercial reviewer, in their own name: refused, nothing stored', async () => {
  const before = await candidateRows();
  for (const person of [ownerId, engineerId, reviewerId]) {
    for (const source of CODE_SOURCES) {
      await expect(write(person, fromCode(source, person)), `${source} from ${person}`).rejects.toMatchObject(NOT_THE_AUTHOR);
    }
  }
  expect(await candidateRows()).toBe(before);
});

test('G2-9 · controls: the owner answers, and an engineer enters a site value, in their own names; the extraction job writes each code source in its own name', async () => {
  const before = await candidateRows();
  await expect(write(ownerId, fireSafetyAnswer(ownerId))).resolves.toMatchObject({ outcome: 'stored' });
  const siteEntry: NewCandidate = {
    id: newId(),
    subjectId: value.subjectId,
    fieldKey: TEST_AREA_FIELD,
    quantity: { value: 9092, unit: 'm2', qualifier: 'gross_total' },
    source: 'user',
    evidence: [],
    createdBy: engineerId,
  };
  await expect(write(engineerId, siteEntry)).resolves.toMatchObject({ outcome: 'stored' });
  for (const source of CODE_SOURCES) {
    await expect(write(value.serviceId, fromCode(source, value.serviceId)), source).resolves.toMatchObject({ outcome: 'stored' });
  }
  expect(await candidateRows()).toBe(before + 2 + CODE_SOURCES.length);
});
