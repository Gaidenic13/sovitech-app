/**
 * G7-10 (new in phase 3 part B, for the integrator to index; rule 7, `first_estimate`: "At step 8 the review asks
 * for it once, inline", "Skip means skip. A skipped question or declined confirmation is not prompted again
 * during intake"; section 8, "The app logs every enforcement as an event", each once; rule 5, "A confirmation is a
 * question too", shown only where its test passes).
 * Situation: the gross floor area's skip is sent early (from step 3, before the review asks for it) and again;
 * the step 8 skip is sent twice; and a Continue reports as shown, and left, a confirmation the server never
 * showed.
 * Expected: the early skip is refused and stores nothing, so step 8 still asks for the area; of the two step 8
 * skips, the second writes nothing, so there is one `skipped` field event and one `skipped` guardrail event; the
 * forged shown confirmation writes nothing.
 *
 * Over a TEST database, through the API (the contract's fields.skip with the page's step, and steps.continue).
 * Every page names its step on a skip, and the contract requires it (ADR 0036 decision 11): a skip that names no
 * step is refused `request_invalid` and stores nothing, so no skip from no page can drop step 8's ask. Every value
 * is TEST data.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fileNamePart, insertCandidate, newId, registerDocument, storeDocumentTexts, withRequest } from '@sovitech/db';
import { createTestService, testContentHash } from '@sovitech/db/testing';
import { productionRegistry } from '@sovitech/registry';
import { StepResponseSchema } from '@sovitech/view-model/browser';
import { signIn, startTestApi, type Auth, type TestApi } from './_support/api';

let api: TestApi;
let owner: Auth;

beforeAll(async () => {
  api = await startTestApi({ devLogin: true });
  const [ownerId] = api.devAccountIds;
  if (ownerId === undefined) throw new Error('no TEST development owner');
  owner = await signIn(api, ownerId);
}, 180_000);

afterAll(async () => {
  await api.stop();
});

async function newProject(label: string): Promise<{ readonly projectId: string; readonly buildingId: string }> {
  const created = await api.app.inject({
    method: 'POST',
    url: '/api/projects',
    headers: { ...owner },
    payload: { name: `TEST G7-10 ${label}`, projectType: 'new_construction', countryCode: 'RO', city: 'TEST city G7-10' },
  });
  const { projectId } = created.json() as { projectId: string };
  const [building] = await api.database.asAdministrator<{ id: string }>(`SELECT id FROM sovitech.subjects WHERE project_id = $1 AND kind = 'building'`, [projectId]);
  if (building === undefined) throw new Error('no building subject');
  return { projectId, buildingId: building.id };
}

function skip(projectId: string, body: Record<string, unknown>) {
  return api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/fields/skip`, headers: { ...owner }, payload: body });
}

async function skippedEvents(projectId: string, fieldKey: string): Promise<{ readonly field: number | undefined; readonly guardrail: number | undefined }> {
  const [field] = await api.database.asAdministrator<{ count: number }>(`SELECT count(*)::integer AS count FROM sovitech.field_events WHERE project_id = $1 AND field_key = $2 AND type = 'skipped'`, [projectId, fieldKey]);
  const [guardrail] = await api.database.asAdministrator<{ count: number }>(`SELECT count(*)::integer AS count FROM sovitech.guardrail_events WHERE project_id = $1 AND field_key = $2 AND type = 'skipped'`, [projectId, fieldKey]);
  return { field: field?.count, guardrail: guardrail?.count };
}

async function inlineAsks(projectId: string): Promise<readonly string[]> {
  const view = StepResponseSchema.parse((await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/steps/8`, headers: { ...owner } })).json()).view;
  if (view.step !== 8) throw new Error('not step 8');
  return view.proposal.inlineAsks.map((ask) => ask.questionId);
}

describe('G7-10 · rule 7: a skip counts once, and only where it is asked', { timeout: 60_000 }, () => {
  it('G7-10 · US-INTAKE-17: an early skip of the area is refused and keeps the step 8 ask; a repeated step 8 skip writes nothing', async () => {
    const { projectId } = await newProject('area');
    const early = await skip(projectId, { questionId: 'q.building.grossFloorArea', step: 3 });
    expect(early.statusCode).toBe(422);
    expect(early.json()).toEqual({ code: 'answer_invalid' });
    expect(await skippedEvents(projectId, 'building.grossFloorArea')).toEqual({ field: 0, guardrail: 0 });
    expect(await inlineAsks(projectId)).toContain('q.building.grossFloorArea');

    for (const attempt of [1, 2]) {
      const atStep8 = await skip(projectId, { questionId: 'q.building.grossFloorArea', step: 8 });
      expect(atStep8.statusCode, `attempt ${String(attempt)}: ${atStep8.body}`).toBe(200);
    }
    expect(await skippedEvents(projectId, 'building.grossFloorArea')).toEqual({ field: 1, guardrail: 1 });
    expect(await inlineAsks(projectId)).not.toContain('q.building.grossFloorArea');
  });

  it('G7-10 · rule 7: a question asked on step 5 skipped twice there counts once, and its step 8 skip still counts', async () => {
    const { projectId } = await newProject('type');
    for (const attempt of [1, 2]) {
      const onStep5 = await skip(projectId, { questionId: 'q.building.type', step: 5 });
      expect(onStep5.statusCode, `attempt ${String(attempt)}: ${onStep5.body}`).toBe(200);
    }
    expect(await skippedEvents(projectId, 'building.type')).toEqual({ field: 1, guardrail: 1 });
    expect(await inlineAsks(projectId)).toContain('q.building.type');
    const atStep8 = await skip(projectId, { questionId: 'q.building.type', step: 8 });
    expect(atStep8.statusCode, atStep8.body).toBe(200);
    expect(await skippedEvents(projectId, 'building.type')).toEqual({ field: 2, guardrail: 2 });
    expect(await inlineAsks(projectId)).not.toContain('q.building.type');
    const again = await skip(projectId, { questionId: 'q.building.type', step: 8 });
    expect(again.statusCode, again.body).toBe(200);
    expect(await skippedEvents(projectId, 'building.type')).toEqual({ field: 2, guardrail: 2 });
  });

  it('G7-10 · section 8: a skip that names no step is refused and writes nothing; repeated from its step, it writes one event', async () => {
    const { projectId } = await newProject('no step');
    // The page names its step on every skip (ADR 0036 decision 11): a skip from no page could otherwise drop step 8's ask.
    const unnamed = await skip(projectId, { questionId: 'q.building.grossFloorArea' });
    expect(unnamed.statusCode).toBe(400);
    expect(unnamed.json()).toEqual({ code: 'request_invalid' });
    expect(await skippedEvents(projectId, 'building.grossFloorArea')).toEqual({ field: 0, guardrail: 0 });
    expect(await inlineAsks(projectId)).toContain('q.building.grossFloorArea');
    for (const attempt of [1, 2]) {
      const response = await skip(projectId, { questionId: 'q.project.occupancy', step: 5 });
      expect(response.statusCode, `attempt ${String(attempt)}: ${response.body}`).toBe(200);
    }
    expect(await skippedEvents(projectId, 'project.occupancy')).toEqual({ field: 1, guardrail: 1 });
  });

  it('G7-10 · rule 5: a confirmation the server never showed, reported as shown and left on Continue, writes nothing', async () => {
    const { projectId, buildingId } = await newProject('forged');
    const typeField = productionRegistry.fields.find((field) => field.key === 'building.type');
    if (typeField === undefined) throw new Error('no building type field');
    const serviceId = await createTestService(api.database, { projectId, label: 'G7-10 type' });
    const contentHash = testContentHash(`${projectId} G7-10 type`);
    const candidateId = newId();
    await withRequest(api.database.app, { userId: serviceId, projectId }, async (request) => {
      const document = await registerDocument(request, { contentHash, kind: 'architectural', stage: 'technical_design', analysis: { status: 'analysed', coverage: 'pages 1-1 of 1' }, createdBy: serviceId });
      await storeDocumentTexts(request, {
        contentHash,
        parts: [
          { part: 'page:1', text: 'TEST Destinatia cladirii: birouri' },
          { part: fileNamePart(document.id), text: 'TEST G7-10 type.pdf' },
        ],
        createdBy: serviceId,
      });
      // A document value: rule 5's third test (uncertain) fails, so no confirmation of it is ever shown.
      const written = await insertCandidate(
        request,
        {
          id: candidateId,
          subjectId: buildingId,
          fieldKey: typeField.key,
          choice: 'office',
          source: 'document',
          evidence: [{ documentId: document.id, contentHash, locator: { page: 1 }, excerpt: 'TEST Destinatia cladirii: birouri', check: 'text_match' }],
          createdBy: serviceId,
        },
        typeField,
      );
      expect(written.outcome).toBe('stored');
    });
    const forged = await api.app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/steps/5/continue`,
      headers: { ...owner },
      payload: { answers: [], multi: [], visibleSuggestions: [], shown: { questions: [], confirmations: [candidateId] } },
    });
    expect(forged.statusCode, forged.body).toBe(200);
    expect(await skippedEvents(projectId, 'building.type')).toEqual({ field: 0, guardrail: 0 });
  });
});
