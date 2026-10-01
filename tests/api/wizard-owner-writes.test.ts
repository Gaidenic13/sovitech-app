/**
 * The owner's writes on values the documents gave, through the wizard API over a TEST database (phase
 * 3; the contract's fields.* and steps.continue routes; guardrails rules 3, 4, 5 and 7; docs/adr/0036).
 * No AI runs in this build, so the values a document or an inference would give are written here as a
 * TEST extraction service account writes them on the ingestion path: TEST documents with their text,
 * and `document` and `ai_inference` candidates with verified evidence. Every value is TEST data.
 *
 * - G3-3 (route half): "Looks right" on an inferred value of an engineer field appends
 *   `owner_acknowledged` only; the badge and Provisional are unchanged. Refused on an owner field.
 * - G3-10 (route): "Something's wrong" leaves the value and lists it for SOVITECH.
 * - G3-3 and G3-10, sent twice (phase 3, closing; ADR 0036 decision 13): a repeated "Looks right" on a value the
 *   owner already acknowledged, or "Something's wrong" on one they already rejected, answers 200 and appends nothing,
 *   one after the other and at once (the project's write lock); the other action is still recorded.
 * - Rule 5 and section 5, step 5: an inferred building type is shown found with "Yes, it's a hotel";
 *   "Yes" records `user_confirmed` (Confirmed by you, the origin kept); a second "Yes" is refused.
 * - Rule 4, "A correction is a resolution" (G4-5 through the API): tapping another type rejects the
 *   inferred one in the owner's name, with no conflict and no second question, and logs
 *   `owner_corrected_inference`.
 * - Rule 4, routing: a conflict on an owner field is the owner's to resolve; one on an engineer field is
 *   refused `routed_to_engineer`.
 * - G7-4 (API half): a floors conflict that arrives while the owner is on step 6, having left step 3,
 *   dots step 3, gives one bound notice, and joins step 8's lists; the late-findings route never moves
 *   the owner or changes an answer (it only reads).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { derive } from '@sovitech/domain';
import { fileNamePart, insertCandidate, newId, readFieldInputs, registerDocument, storeDocumentTexts, withRequest } from '@sovitech/db';
import { createTestService, testContentHash } from '@sovitech/db/testing';
import { productionRegistry, registryLookups } from '@sovitech/registry';
import type { RegistryFieldDefinition } from '@sovitech/registry/validation';
import { ExtractedResponseSchema, FieldWriteResponseSchema, LateFindingsResponseSchema, StepResponseSchema, type DisplayObject, type StepResponse } from '@sovitech/view-model/browser';
import { signIn, startTestApi, type Auth, type TestApi } from '../guardrails/_support/api';

/** Each test reads and writes a TEST database; under a loaded full run a read can take seconds. */
const LONG = { timeout: 60_000 };

let api: TestApi;
let ownerId: string;
let owner: Auth;

const lookups = registryLookups(productionRegistry);
const field = (key: string): RegistryFieldDefinition => {
  const found = productionRegistry.fields.find((entry) => entry.key === key);
  if (found === undefined) throw new Error(`no field ${key}`);
  return found;
};

interface TestProject {
  readonly projectId: string;
  readonly buildingId: string;
  readonly serviceId: string;
}

beforeAll(async () => {
  api = await startTestApi({ devLogin: true });
  const [id] = api.devAccountIds;
  if (id === undefined) throw new Error('no TEST development owner');
  ownerId = id;
  owner = await signIn(api, ownerId);
}, 180_000);

afterAll(async () => {
  await api.stop();
});

async function newProject(label: string): Promise<TestProject> {
  const created = await api.app.inject({
    method: 'POST',
    url: '/api/projects',
    headers: { ...owner },
    payload: { name: `TEST ${label}`, projectType: 'new_construction', countryCode: 'RO', city: 'TEST city' },
  });
  const { projectId } = created.json() as { projectId: string };
  const [building] = await api.database.asAdministrator<{ id: string }>(`SELECT id FROM sovitech.subjects WHERE project_id = $1 AND kind = 'building'`, [projectId]);
  if (building === undefined) throw new Error('the project has no building subject');
  const serviceId = await createTestService(api.database, { projectId, label });
  return { projectId, buildingId: building.id, serviceId };
}

/** One TEST document with one page of TEST text, and a TEST value read or inferred from it, written by the TEST service. */
async function testValue(
  project: TestProject,
  input: {
    readonly label: string;
    readonly fieldKey: string;
    readonly subjectId: string;
    readonly source: 'document' | 'ai_inference';
    readonly excerpt: string;
    readonly choice?: string;
    readonly quantity?: { readonly value: number; readonly unit: string; readonly qualifier: string };
    readonly confidence?: 'high' | 'medium' | 'low';
  },
): Promise<string> {
  const contentHash = testContentHash(`${project.projectId} ${input.label}`);
  return withRequest(api.database.app, { userId: project.serviceId, projectId: project.projectId }, async (request) => {
    const document = await registerDocument(request, {
      contentHash,
      kind: 'architectural',
      stage: 'technical_design',
      analysis: { status: 'analysed', coverage: 'pages 1-1 of 1' },
      createdBy: project.serviceId,
    });
    await storeDocumentTexts(request, {
      contentHash,
      parts: [
        { part: 'page:1', text: input.excerpt },
        { part: fileNamePart(document.id), text: `TEST ${input.label}.pdf` },
      ],
      createdBy: project.serviceId,
    });
    const candidateId = newId();
    const written = await insertCandidate(
      request,
      {
        id: candidateId,
        subjectId: input.subjectId,
        fieldKey: input.fieldKey,
        ...(input.choice === undefined ? {} : { choice: input.choice }),
        ...(input.quantity === undefined ? {} : { quantity: input.quantity }),
        source: input.source,
        evidence: [{ documentId: document.id, contentHash, locator: { page: 1 }, excerpt: input.excerpt, check: 'text_match' }],
        ...(input.confidence === undefined ? {} : { confidence: input.confidence }),
        createdBy: project.serviceId,
      },
      field(input.fieldKey),
    );
    if (written.outcome !== 'stored') throw new Error(`the TEST value was refused: ${written.outcome}`);
    return candidateId;
  });
}

async function view(projectId: string, step: number): Promise<StepResponse> {
  const response = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/steps/${String(step)}`, headers: { ...owner } });
  expect(response.statusCode, response.body).toBe(200);
  return StepResponseSchema.parse(response.json());
}

function displayOf(response: { readonly displayObjects: readonly DisplayObject[] }, valueId: string | null | undefined): DisplayObject | undefined {
  return response.displayObjects.find((display) => display.valueId === valueId);
}

function post(projectId: string, path: string, payload: unknown) {
  return api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/${path}`, headers: { ...owner }, payload: payload as Record<string, unknown> });
}

async function provisional(projectId: string, subjectId: string, fieldKey: string): Promise<boolean> {
  return withRequest(api.database.app, { userId: ownerId, projectId }, async (request) => {
    const inputs = await readFieldInputs(request, { subjectId, fieldKey });
    const byId = new Map(inputs.documents.map((document) => [document.id, document]));
    return derive(field(fieldKey), inputs.candidates, inputs.events, {
      subjectId,
      document: (id) => byId.get(id),
      unit: lookups.unit,
      inputState: () => undefined,
      datasetApproved: () => false,
    }).provisional;
  });
}

describe('rule 3: an owner\'s click on a technical item is only an acknowledgement', LONG, () => {
  let project: TestProject;
  let rooms: string;

  beforeAll(async () => {
    project = await newProject('rooms inferred');
    rooms = await testValue(project, {
      label: 'room schedule',
      fieldKey: 'building.rooms',
      subjectId: project.buildingId,
      source: 'ai_inference',
      excerpt: 'TEST camera 1, camera 2, camera 3',
      quantity: { value: 3, unit: 'count', qualifier: 'guest_rooms' },
      confidence: 'medium',
    });
  });

  it('G3-3 · F-REVIEW-03 · US-ASSETS-04: "Looks right" appends owner_acknowledged only; the badge and Provisional are unchanged', async () => {
    const before = await view(project.projectId, 3);
    const roomsId = `building:${project.buildingId}.rooms`;
    const shown = displayOf(before, roomsId) ?? before.displayObjects.find((display) => display.field?.fieldKey === 'building.rooms');
    expect(shown?.actions?.some((action) => action.kind === 'acknowledge')).toBe(true);
    expect(shown?.actions?.some((action) => action.kind === 'confirm')).toBe(false);
    const badgeBefore = shown?.badge?.id;
    expect(await provisional(project.projectId, project.buildingId, 'building.rooms')).toBe(true);

    const acknowledged = await post(project.projectId, 'fields/acknowledge', { candidateIds: [rooms] });
    expect(acknowledged.statusCode, acknowledged.body).toBe(200);
    FieldWriteResponseSchema.parse(acknowledged.json());
    const events = await api.database.asAdministrator<{ type: string; role: string }>(
      'SELECT type, role FROM sovitech.candidate_events WHERE project_id = $1 AND candidate_id = $2',
      [project.projectId, rooms],
    );
    expect(events).toEqual([{ type: 'owner_acknowledged', role: 'owner' }]);
    const after = await view(project.projectId, 3);
    const shownAfter = displayOf(after, shown?.valueId);
    expect(shownAfter?.badge?.id).toBe(badgeBefore);
    expect(shownAfter?.actions?.some((action) => action.kind === 'acknowledge')).toBe(false);
    expect(await provisional(project.projectId, project.buildingId, 'building.rooms')).toBe(true);
  });

  it('G3-3 · rule 3: "Looks right" on an owner field is refused, and nothing is stored', async () => {
    const [name] = await api.database.asAdministrator<{ id: string }>(`SELECT id FROM sovitech.candidates WHERE project_id = $1 AND field_key = 'project.name'`, [project.projectId]);
    const refused = await post(project.projectId, 'fields/acknowledge', { candidateIds: [name?.id] });
    expect(refused.statusCode).toBe(403);
    expect(refused.json()).toEqual({ code: 'not_an_engineer_field' });
    const events = await api.database.asAdministrator(`SELECT id FROM sovitech.candidate_events WHERE candidate_id = $1 AND type = 'owner_acknowledged'`, [name?.id]);
    expect(events).toEqual([]);
  });

  it('G3-10 · rule 3: "Something\'s wrong" leaves the value and lists it under SOVITECH will check on step 8', async () => {
    const other = await newProject('rooms concern');
    const candidateId = await testValue(other, {
      label: 'room schedule',
      fieldKey: 'building.rooms',
      subjectId: other.buildingId,
      source: 'document',
      excerpt: 'TEST 4 camere',
      quantity: { value: 4, unit: 'count', qualifier: 'guest_rooms' },
    });
    const concern = await post(other.projectId, 'fields/concern', { candidateId });
    expect(concern.statusCode, concern.body).toBe(200);
    const step8 = await view(other.projectId, 8);
    if (step8.view.step !== 8) throw new Error('step 8');
    const lines = step8.view.sovitechWillCheck.map((id) => displayOf(step8, id)?.text);
    expect(lines).toEqual(['SOVITECH will check: Rooms']);
    const events = await api.database.asAdministrator<{ type: string; reason: string }>('SELECT type, reason FROM sovitech.candidate_events WHERE candidate_id = $1', [candidateId]);
    expect(events).toEqual([{ type: 'rejected', reason: 'owner_concern' }]);
  });
});

describe('rule 3 · ADR 0036 decision 13: "Looks right" and "Something\'s wrong" sent twice record once', { timeout: 180_000 }, () => {
  /** Concurrent rounds: one round may happen to run one request at a time. */
  const ROUNDS = 4;

  async function roomsValue(label: string): Promise<{ readonly project: TestProject; readonly candidateId: string }> {
    const project = await newProject(label);
    const candidateId = await testValue(project, {
      label: 'room schedule',
      fieldKey: 'building.rooms',
      subjectId: project.buildingId,
      source: 'document',
      excerpt: 'TEST 4 camere',
      quantity: { value: 4, unit: 'count', qualifier: 'guest_rooms' },
    });
    return { project, candidateId };
  }

  async function eventsOf(candidateId: string): Promise<{ type: string; reason: string | null }[]> {
    return api.database.asAdministrator<{ type: string; reason: string | null }>('SELECT type, reason FROM sovitech.candidate_events WHERE candidate_id = $1 ORDER BY type', [candidateId]);
  }

  const acknowledge = (projectId: string, candidateId: string) => post(projectId, 'fields/acknowledge', { candidateIds: [candidateId] });
  const concern = (projectId: string, candidateId: string) => post(projectId, 'fields/concern', { candidateId });

  it('G3-3 · G3-10 · rule 3 · ADR 0036 decision 13: sent one after the other (a stale second tab), a repeated "Looks right" and a repeated "Something\'s wrong" each answer 200 and append nothing; the other action is still recorded', async () => {
    const { project, candidateId } = await roomsValue('repeat one after the other');
    const firstAcknowledge = await acknowledge(project.projectId, candidateId);
    const againAcknowledge = await acknowledge(project.projectId, candidateId);
    expect([firstAcknowledge.statusCode, againAcknowledge.statusCode]).toEqual([200, 200]);
    // The repeat answers the value as it reads now, like the first.
    expect(FieldWriteResponseSchema.parse(againAcknowledge.json()).displayObjects).toEqual(FieldWriteResponseSchema.parse(firstAcknowledge.json()).displayObjects);
    expect(await eventsOf(candidateId)).toEqual([{ type: 'owner_acknowledged', reason: 'looks_right' }]);
    // "Something's wrong" after "Looks right" is not a repeat: it is recorded, once.
    const firstConcern = await concern(project.projectId, candidateId);
    const againConcern = await concern(project.projectId, candidateId);
    expect([firstConcern.statusCode, againConcern.statusCode]).toEqual([200, 200]);
    expect(await eventsOf(candidateId)).toEqual([
      { type: 'owner_acknowledged', reason: 'looks_right' },
      { type: 'rejected', reason: 'owner_concern' },
    ]);
    // The value is still listed once for SOVITECH (rule 3: the owner's note), as after one concern.
    const step8 = await view(project.projectId, 8);
    if (step8.view.step !== 8) throw new Error('step 8');
    expect(step8.view.sovitechWillCheck.map((id) => displayOf(step8, id)?.text)).toEqual(['SOVITECH will check: Rooms']);
  });

  it('G3-3 · G3-10 · rule 3 · ADR 0036 decision 13: sent at once (Promise.all, a double click, two tabs), "Looks right" twice and "Something\'s wrong" twice each answer 200 and record one event, every round', async () => {
    for (let round = 1; round <= ROUNDS; round += 1) {
      const { project, candidateId } = await roomsValue(`repeat at once ${String(round)}`);
      const acknowledged = await Promise.all([acknowledge(project.projectId, candidateId), acknowledge(project.projectId, candidateId), acknowledge(project.projectId, candidateId)]);
      expect(acknowledged.map((response) => response.statusCode), `round ${String(round)}`).toEqual([200, 200, 200]);
      expect(await eventsOf(candidateId), `round ${String(round)}`).toEqual([{ type: 'owner_acknowledged', reason: 'looks_right' }]);
      const concerned = await Promise.all([concern(project.projectId, candidateId), concern(project.projectId, candidateId), concern(project.projectId, candidateId)]);
      expect(concerned.map((response) => response.statusCode), `round ${String(round)}`).toEqual([200, 200, 200]);
      expect(await eventsOf(candidateId), `round ${String(round)}`).toEqual([
        { type: 'owner_acknowledged', reason: 'looks_right' },
        { type: 'rejected', reason: 'owner_concern' },
      ]);
    }
  });
});

describe('rule 5: a value found in a document is shown, never asked (the API half of G5-1 and G5-2)', LONG, () => {
  it('G5-1 · G5-2 · G2-7 · rule 5 · R-045: the area with its basis and the guest rooms read from documents: shown with a badge and Edit, no confirmation, no inline ask, not an open item', async () => {
    const project = await newProject('found values');
    await testValue(project, {
      label: 'tabel suprafete',
      fieldKey: 'building.grossFloorArea',
      subjectId: project.buildingId,
      source: 'document',
      excerpt: 'TEST Suprafata construita desfasurata: 1234 mp',
      quantity: { value: 1234, unit: 'm2', qualifier: 'gross_total' },
    });
    await testValue(project, {
      label: 'tabel camere',
      fieldKey: 'building.rooms',
      subjectId: project.buildingId,
      source: 'document',
      excerpt: 'TEST camere de oaspeti: 21',
      quantity: { value: 21, unit: 'count', qualifier: 'guest_rooms' },
    });
    const step3 = await view(project.projectId, 3);
    if (step3.view.step !== 3) throw new Error('step 3');
    expect(step3.view.intro).toBe('values_found');
    expect(step3.view.confirmationCount).toBeNull();
    for (const key of ['building.grossFloorArea', 'building.rooms']) {
      const shown = step3.displayObjects.find((display) => display.field?.fieldKey === key && display.shape !== 'missing');
      // 2.8's first match: both are engineer fields not yet verified, so SOVITECH will check, with the document as the source line.
      expect(shown?.badge?.id, key).toBe('sovitech_will_check');
      expect(shown?.sourceLine?.text, key).toMatch(/TEST tabel/u);
      expect(shown?.actions?.some((action) => action.kind === 'edit'), key).toBe(true);
      expect(shown?.actions?.some((action) => action.kind === 'confirm'), key).toBe(false);
    }
    const step8 = await view(project.projectId, 8);
    if (step8.view.step !== 8) throw new Error('step 8');
    expect(step8.view.proposal.inlineAsks.map((ask) => ask.questionId)).not.toContain('q.building.grossFloorArea');
    const forYou = step8.view.forYou.items.map((item) => step8.displayObjects.find((display) => display.valueId === item.concerns)?.field?.fieldKey);
    expect(forYou).not.toContain('building.grossFloorArea');
    expect(forYou).not.toContain('building.rooms');
    const known = await api.database.asAdministrator(`SELECT id FROM sovitech.guardrail_events WHERE project_id = $1 AND type = 'question_for_known_field'`, [project.projectId]);
    expect(known).toEqual([]);

    // G2-7 (API half): one value id, one display, on every screen that shows it (step 3, step 8's card, UD-45).
    const areaId = step3.displayObjects.find((display) => display.field?.fieldKey === 'building.grossFloorArea')?.valueId;
    const extracted = ExtractedResponseSchema.parse((await api.app.inject({ method: 'GET', url: `/api/projects/${project.projectId}/extracted`, headers: { ...owner } })).json());
    expect(displayOf(step8, areaId)).toEqual(displayOf(step3, areaId));
    expect(displayOf(extracted, areaId)).toEqual(displayOf(step3, areaId));
  });
});

describe('rule 5 and section 5, step 5: the building type found, confirmed or corrected', LONG, () => {
  it('rule 5 · US-INTAKE-07 AC5: an inferred type shows "Yes, it\'s a hotel"; Yes records user_confirmed, and a second Yes is refused', async () => {
    const project = await newProject('type confirmed');
    const inferred = await testValue(project, {
      label: 'type schedule',
      fieldKey: 'building.type',
      subjectId: project.buildingId,
      source: 'ai_inference',
      excerpt: 'TEST 40 camere de oaspeti',
      choice: 'hotel',
      confidence: 'medium',
    });
    const step5 = await view(project.projectId, 5);
    if (step5.view.step !== 5) throw new Error('step 5');
    const type = step5.view.questions.find((question) => question.questionId === 'q.building.type');
    expect(type?.state).toBe('found');
    expect(type?.skip).toBeNull();
    const found = displayOf(step5, type?.found);
    expect(found?.badge?.id).toBe('possible');
    const confirm = found?.actions?.find((action) => action.kind === 'confirm');
    expect(confirm?.kind === 'confirm' ? confirm.wording.text : undefined).toBe("Yes, it's a hotel");

    const yes = await post(project.projectId, 'fields/confirm', { candidateId: inferred });
    expect(yes.statusCode, yes.body).toBe(200);
    const confirmed = FieldWriteResponseSchema.parse(yes.json()).displayObjects[0];
    expect(confirmed?.badge?.id).toBe('confirmed_by_you');
    expect(confirmed?.sourceLine?.text).toBe('AI inference, confirmed by you');
    const again = await post(project.projectId, 'fields/confirm', { candidateId: inferred });
    expect(again.statusCode).toBe(409);
    expect(again.json()).toEqual({ code: 'confirmation_not_shown' });
  });

  it('G4-5 · rule 4 · section 8: tapping another type rejects the inferred one in the owner\'s name, with no conflict and no second question', async () => {
    const project = await newProject('type corrected');
    const inferred = await testValue(project, {
      label: 'type schedule',
      fieldKey: 'building.type',
      subjectId: project.buildingId,
      source: 'ai_inference',
      excerpt: 'TEST 30 camere',
      choice: 'hotel',
      confidence: 'medium',
    });
    const corrected = await post(project.projectId, 'steps/5/continue', {
      answers: [{ field: { subjectId: project.buildingId, fieldKey: 'building.type' }, value: { kind: 'choice', choice: 'office' }, corrects: [inferred] }],
      multi: [],
      visibleSuggestions: [],
      shown: { questions: ['q.building.type'], confirmations: [] },
    });
    expect(corrected.statusCode, corrected.body).toBe(200);
    const events = await api.database.asAdministrator<{ type: string; role: string }>('SELECT type, role FROM sovitech.candidate_events WHERE candidate_id = $1', [inferred]);
    expect(events).toEqual([{ type: 'rejected', role: 'owner' }]);
    const logged = await api.database.asAdministrator<{ reason: string }>(
      `SELECT reason FROM sovitech.guardrail_events WHERE project_id = $1 AND type = 'owner_corrected_inference'`,
      [project.projectId],
    );
    expect(logged).toEqual([{ reason: 'confidence:medium' }]);
    const step5 = await view(project.projectId, 5);
    if (step5.view.step !== 5) throw new Error('step 5');
    const type = step5.view.questions.find((question) => question.questionId === 'q.building.type');
    expect(type?.state).toBe('answered');
    const shown = displayOf(step5, type?.found);
    expect(shown?.badge?.id).toBe('provided_by_you');
    expect(shown?.actions?.some((action) => action.kind === 'confirm' || action.kind === 'resolve_conflict')).toBe(false);
  });
});

describe('rule 4, routing: only the right person resolves a conflict', LONG, () => {
  it('US-REVIEW-11 · rule 4: two documents disagree on the building type: the owner resolves it, recording who, why and what was covered', async () => {
    const project = await newProject('type conflict');
    const hotel = await testValue(project, { label: 'memoriu', fieldKey: 'building.type', subjectId: project.buildingId, source: 'document', excerpt: 'TEST destinatia: hotel', choice: 'hotel' });
    const office = await testValue(project, { label: 'caiet', fieldKey: 'building.type', subjectId: project.buildingId, source: 'document', excerpt: 'TEST destinatia: office', choice: 'office' });
    const step8 = await view(project.projectId, 8);
    if (step8.view.step !== 8) throw new Error('step 8');
    expect(step8.view.forYou.items.some((item) => item.reason === 'conflict')).toBe(true);
    const resolved = await post(project.projectId, 'fields/resolve-conflict', { field: { subjectId: project.buildingId, fieldKey: 'building.type' }, chosenCandidateId: hotel });
    expect(resolved.statusCode, resolved.body).toBe(200);
    const events = await api.database.asAdministrator<{ type: string; role: string; chosen_candidate_id: string; covered_candidate_ids: string[] }>(
      `SELECT type, role, chosen_candidate_id, covered_candidate_ids FROM sovitech.field_events WHERE project_id = $1 AND field_key = 'building.type'`,
      [project.projectId],
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'conflict_resolved', role: 'owner', chosen_candidate_id: hotel });
    expect(new Set(events[0]?.covered_candidate_ids)).toEqual(new Set([hotel, office]));
    const again = await post(project.projectId, 'fields/resolve-conflict', { field: { subjectId: project.buildingId, fieldKey: 'building.type' }, chosenCandidateId: office });
    expect(again.statusCode).toBe(409);
    expect(again.json()).toEqual({ code: 'conflict_not_open' });
  });

  it('G4-8 · rule 4: a conflict on an engineer field is refused to the owner, routed to the engineer', async () => {
    const project = await newProject('floors conflict routed');
    const ten = await testValue(project, { label: 'plan a', fieldKey: 'building.floors', subjectId: project.buildingId, source: 'document', excerpt: 'TEST 10 etaje', quantity: { value: 10, unit: 'count', qualifier: 'upper' } });
    await testValue(project, { label: 'plan b', fieldKey: 'building.floors', subjectId: project.buildingId, source: 'document', excerpt: 'TEST 12 etaje', quantity: { value: 12, unit: 'count', qualifier: 'upper' } });
    const refused = await post(project.projectId, 'fields/resolve-conflict', { field: { subjectId: project.buildingId, fieldKey: 'building.floors' }, chosenCandidateId: ten });
    expect(refused.statusCode).toBe(403);
    expect(refused.json()).toEqual({ code: 'routed_to_engineer' });
    expect(await api.database.asAdministrator(`SELECT id FROM sovitech.field_events WHERE project_id = $1`, [project.projectId])).toEqual([]);
  });
});

describe('rule 7, "Late findings never interrupt"', LONG, () => {
  it('G7-4 (API half) · R-004 · US-INTAKE-19: a floors conflict that arrives while the owner is on step 6 dots step 3, gives one bound notice, and joins step 8', async () => {
    const project = await newProject('late floors');
    const step3 = await view(project.projectId, 3);
    const leftStep3At = step3.asOf;
    const first = LateFindingsResponseSchema.parse(
      (await api.app.inject({ method: 'GET', url: `/api/projects/${project.projectId}/late-findings?current=6&left=3@${leftStep3At}`, headers: { ...owner } })).json(),
    );
    expect(first.dots).toEqual([]);
    expect(first.notice).toBeNull();

    await testValue(project, { label: 'plan a', fieldKey: 'building.floors', subjectId: project.buildingId, source: 'document', excerpt: 'TEST 7 etaje', quantity: { value: 7, unit: 'count', qualifier: 'upper' } });
    await testValue(project, { label: 'plan b', fieldKey: 'building.floors', subjectId: project.buildingId, source: 'document', excerpt: 'TEST 9 etaje', quantity: { value: 9, unit: 'count', qualifier: 'upper' } });

    const answersBefore = await api.database.asAdministrator(`SELECT id FROM sovitech.candidates WHERE project_id = $1 AND source = 'user' ORDER BY id`, [project.projectId]);
    const late = LateFindingsResponseSchema.parse(
      (
        await api.app.inject({
          method: 'GET',
          url: `/api/projects/${project.projectId}/late-findings?current=6&since=${first.asOf}&left=3@${leftStep3At}&left=4@${leftStep3At}&left=5@${leftStep3At}`,
          headers: { ...owner },
        })
      ).json(),
    );
    expect(late.dots).toEqual([3]);
    const notice = displayOf(late, late.notice);
    expect(notice?.kind).toBe('line');
    expect(notice?.text).toMatch(/^We found \d+ more things? in your documents\. You'll see (?:them|it) on the review step\.$/u);
    expect(notice?.parts?.length).toBe(1);
    // Nothing moved and no answer changed: the route only reads.
    expect(await api.database.asAdministrator(`SELECT id FROM sovitech.candidates WHERE project_id = $1 AND source = 'user' ORDER BY id`, [project.projectId])).toEqual(answersBefore);

    // The next poll with nothing new: the dot stays, and no second notice.
    const quiet = LateFindingsResponseSchema.parse(
      (await api.app.inject({ method: 'GET', url: `/api/projects/${project.projectId}/late-findings?current=6&since=${late.asOf}&left=3@${leftStep3At}`, headers: { ...owner } })).json(),
    );
    expect(quiet.dots).toEqual([3]);
    expect(quiet.notice).toBeNull();

    // The conflict joins step 8: floors is an engineer field, so it is SOVITECH's to check (rule 4, routing).
    const step8 = await view(project.projectId, 8);
    if (step8.view.step !== 8) throw new Error('step 8');
    expect(step8.view.sovitechWillCheck.map((id) => displayOf(step8, id)?.text)).toEqual(['SOVITECH will check: Floors']);
    const floors = displayOf(step8, `building:${project.buildingId}.floors`);
    expect(floors?.badge?.id).toBe('two_values');
  });
});
