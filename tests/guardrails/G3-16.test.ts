/**
 * G3-16 (docs/guardrails.md section 7; rule 3, "Choices belong to the owner. These are the systems to
 * include, goals, automation areas ..." and "Who confirms": the owner confirms "their own choices"; 2.1,
 * `user`: "Entered or chosen by the owner ... or an engineer's site survey entry"; 2.6, `decision`: "an
 * owner choice"; rule 11 and section 5, step 4: Fire Safety stays opt-in). Phase 1 review, round 4: the
 * gap found at integration of round 3 (an engineer's own entry read as the owner's choice; probe
 * INTEG_engineer_own_user_entry_on_decision).
 * Situation: an engineer's own `user` entry "include" on the owner's decision field for Fire Safety in
 * scope, with no owner answer.
 * Expected: refused; the field stays unknown.
 *
 * Two layers. In the domain, a `user` candidate on a decision field counts only when its author acted as
 * the owner (`Candidate.authorRole`); an engineer's own entry is refused (`choice_author_not_owner`),
 * whatever its choice and whenever it arrives. At the store (a TEST database), the engineer's entry is
 * stored with the role the store read from the request, `sovitech_engineer`, even when the statement
 * names the owner, and the field read back derives as unknown. The controls: the owner's own "include"
 * sets the decision; an engineer's site entry on an engineer field stays a value (2.1).
 */
import fc from 'fast-check';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { derive } from '@sovitech/domain';
import { unitByCode } from '@sovitech/registry';
import { deriveContextFor, insertCandidate, newId, readFieldInputs, withRequest, type NewCandidate } from '@sovitech/db';
import { createTestAccount, createTestProject, startTestDatabase, type TestDatabase } from '@sovitech/db/testing';
import { engineerEntry, ownerAnswer, testContext, testEvents, testField } from './_support/builders';

const FIRE_SAFETY_KEY = 'project.scope.fire_safety';

// ---------------------------------------------------------------------------
// In the domain
// ---------------------------------------------------------------------------

const PROJECT = 'test-project-g3-16';
const fireSafetyInScope = testField(FIRE_SAFETY_KEY, { kind: 'decision', subject: 'project', options: ['include', 'exclude'], confirmBy: 'owner' });
const context = testContext({ subjectId: PROJECT });

test('F-VALUE-02 · G3-16: an engineer\'s own "include" on the Fire Safety decision is refused, and the field stays unknown', () => {
  const entry = engineerEntry({ id: 'test-cand-g3-16-engineer', subjectId: PROJECT, field: fireSafetyInScope, value: { choice: 'include' }, minute: 1 });
  const state = derive(fireSafetyInScope, [entry], testEvents({}), context);
  expect(state.state).toBe('unknown');
  expect(state.activeCandidateId).toBeNull();
  expect(state.candidates).toEqual([{ candidateId: entry.id, verification: 'unverified', status: 'refused', refusal: 'choice_author_not_owner' }]);

  // Property: whichever choice, and however many entries, whenever they arrive.
  fc.assert(
    fc.property(fc.array(fc.tuple(fc.constantFrom('include', 'exclude'), fc.integer({ min: 0, max: 59 })), { minLength: 1, maxLength: 4 }), (drawn) => {
      const entries = drawn.map(([choice, minute], index) =>
        engineerEntry({ id: `test-cand-g3-16-${String(index)}`, subjectId: PROJECT, field: fireSafetyInScope, value: { choice }, minute }),
      );
      const after = derive(fireSafetyInScope, entries, testEvents({}), context);
      expect(after.state).toBe('unknown');
      expect(after.candidates.every((candidate) => candidate.refusal === 'choice_author_not_owner')).toBe(true);
    }),
  );
});

test('F-VALUE-02 · G3-16 controls: the owner\'s own "include" sets the decision; an engineer\'s site entry on an engineer field stays a value', () => {
  const owners = ownerAnswer({ id: 'test-cand-g3-16-owner', subjectId: PROJECT, field: fireSafetyInScope, value: { choice: 'include' }, minute: 1 });
  expect(derive(fireSafetyInScope, [owners], testEvents({}), context)).toMatchObject({ state: 'known', activeCandidateId: owners.id });

  const floors = testField('test.building.floors', { kind: 'count', subject: 'building', unit: 'count', qualifiers: ['upper'], confirmBy: 'engineer' });
  const site = engineerEntry({
    id: 'test-cand-g3-16-site',
    subjectId: 'test-building-g3-16',
    field: floors,
    value: { quantity: { value: 12, unit: 'count', qualifier: 'upper' } },
    minute: 1,
  });
  expect(derive(floors, [site], testEvents({}), testContext({ subjectId: 'test-building-g3-16' }))).toMatchObject({ state: 'known', activeCandidateId: site.id });
});

// ---------------------------------------------------------------------------
// At the store
// ---------------------------------------------------------------------------

let database: TestDatabase;
let ownerId: string;
let engineerId: string;
let projectId: string;

beforeAll(async () => {
  database = await startTestDatabase();
  ownerId = await createTestAccount(database, { label: 'G3-16 owner', kind: 'person', roles: ['owner'] });
  engineerId = await createTestAccount(database, { label: 'G3-16 engineer', kind: 'person', roles: ['sovitech_engineer'] });
  projectId = await createTestProject(database, { ownerId, isDemo: false });
}, 240_000);

afterAll(async () => {
  await database.stop();
});

function answer(createdBy: string, choice: string): NewCandidate {
  return { id: newId(), subjectId: projectId, fieldKey: FIRE_SAFETY_KEY, choice, source: 'user', evidence: [], createdBy };
}

async function derivedFromTheStore() {
  const field = testField(FIRE_SAFETY_KEY, { kind: 'decision', subject: 'project', options: ['include', 'exclude'], confirmBy: 'owner' });
  const inputs = await withRequest(database.app, { userId: ownerId, projectId }, (request) => readFieldInputs(request, { subjectId: projectId, fieldKey: FIRE_SAFETY_KEY }));
  return derive(field, inputs.candidates, inputs.events, deriveContextFor(inputs, { unit: unitByCode, inputState: () => undefined, datasetApproved: () => false }));
}

test('F-VALUE-02 · G3-16: at the store, the engineer\'s entry is stored as the engineer\'s, even when named the owner\'s, and the field stays unknown', async () => {
  const entry = answer(engineerId, 'include');
  const written = await withRequest(database.app, { userId: engineerId, projectId }, (request) =>
    insertCandidate(request, entry, { key: FIRE_SAFETY_KEY, kind: 'decision' }),
  );
  expect(written).toMatchObject({ outcome: 'stored', candidate: { authorRole: 'sovitech_engineer' } });

  // A statement that names the owner as the author role, as the table owner in the engineer's request: the store's guard
  // sets the role from the request (the app role cannot name the column at all).
  const forged = newId();
  await database.as(
    'owner',
    `INSERT INTO sovitech.candidates (id, project_id, subject_id, field_key, choice, source, created_by, author_role)
     VALUES ($1, $2, $2, $3, 'include', 'user', $4, 'owner')`,
    [forged, projectId, FIRE_SAFETY_KEY, engineerId],
    { userId: engineerId, projectId },
  );
  const rows = await database.asAdministrator<{ id: string; author_role: string }>(
    'SELECT id, author_role FROM sovitech.candidates WHERE project_id = $1 AND field_key = $2 ORDER BY id',
    [projectId, FIRE_SAFETY_KEY],
  );
  expect(rows).toEqual([entry.id, forged].sort().map((id) => ({ id, author_role: 'sovitech_engineer' })));

  const state = await derivedFromTheStore();
  expect(state.state).toBe('unknown');
  expect(state.activeCandidateId).toBeNull();
  expect(state.candidates.map((candidate) => candidate.refusal)).toEqual(['choice_author_not_owner', 'choice_author_not_owner']);
});

test('F-VALUE-02 · G3-16 control: at the store, the owner\'s own answer is stored as the owner\'s and sets the decision', async () => {
  const owners = answer(ownerId, 'exclude');
  const written = await withRequest(database.app, { userId: ownerId, projectId }, (request) => insertCandidate(request, owners, { key: FIRE_SAFETY_KEY, kind: 'decision' }));
  expect(written).toMatchObject({ outcome: 'stored', candidate: { authorRole: 'owner' } });
  const state = await derivedFromTheStore();
  expect(state).toMatchObject({ state: 'known', activeCandidateId: owners.id });
});
