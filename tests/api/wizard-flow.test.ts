/**
 * The wizard API end to end over a TEST database (phase 3; the contract's routes, docs/adr/0036,
 * 0038, 0039): the development login, project creation and the list, the eight step views, Continue on
 * a new project with no documents that skips everything and reaches step 8 (prompt 3 phase 3 exit (c)),
 * the step 8 inline ask, the proposal page, and the refusals every route shares. Every response is
 * checked against the contract's schema, and every value a view names is among its display objects.
 *
 * TEST accounts and projects only; no document is uploaded here (the upload routes are phase 2's).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  ContinueResponseSchema,
  DevAccountsResponseSchema,
  FieldWriteResponseSchema,
  LateFindingsResponseSchema,
  ProjectListResponseSchema,
  ProposalPreviewResponseSchema,
  SessionResponseSchema,
  StepResponseSchema,
  type StepResponse,
} from '@sovitech/view-model/browser';
import { signIn, startTestApi, type Auth, type TestApi } from '../guardrails/_support/api';

/** Each test reads and writes a TEST database; under a loaded full run a read can take seconds. */
const LONG = { timeout: 60_000 };

let api: TestApi;
let owner: Auth;
let projectId: string;

/** Every value id a view names (any string that matches a display object's id) is among the response's display objects. */
function assertBound(response: StepResponse): void {
  const ids = new Set(response.displayObjects.map((display) => display.valueId));
  const named = JSON.stringify(response.view).match(/"(?:[a-z_]+:[0-9a-f-]{36}(?:\.[A-Za-z][A-Za-z0-9_]*)+)"/gu) ?? [];
  for (const quoted of named) expect(ids.has(quoted.slice(1, -1)), quoted).toBe(true);
  expect(ids.has(response.project.name)).toBe(true);
}

async function step(n: number): Promise<StepResponse> {
  const response = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/steps/${String(n)}`, headers: { ...owner } });
  expect(response.statusCode, response.body).toBe(200);
  const parsed = StepResponseSchema.parse(response.json());
  assertBound(parsed);
  return parsed;
}

async function post(url: string, payload: unknown, auth: Auth = owner) {
  return api.app.inject({ method: 'POST', url, headers: { ...auth }, payload: payload as Record<string, unknown> });
}

beforeAll(async () => {
  api = await startTestApi({ devLogin: true });
}, 180_000);

afterAll(async () => {
  await api.stop();
});

describe('UD-36 · R-133 · ADR 0038: the development login', LONG, () => {
  it('US-ADMIN-01 · R-133: lists the development account with its name and roles, signs in, answers the session, signs out', async () => {
    const accounts = DevAccountsResponseSchema.parse((await api.app.inject({ method: 'GET', url: '/api/auth/dev-accounts' })).json());
    expect(accounts.accounts.map((account) => account.userId)).toEqual(api.devAccountIds);
    expect(accounts.accounts[0]?.roles).toEqual(['owner']);

    const csrf = await api.app.inject({ method: 'GET', url: '/api/csrf' });
    const token = (csrf.json() as { token: string }).token;
    const csrfCookie = csrf.cookies.find((cookie) => cookie.name === '_csrf');
    const signedIn = await api.app.inject({
      method: 'POST',
      url: '/api/auth/dev-sign-in',
      headers: { 'csrf-token': token, cookie: `_csrf=${encodeURIComponent(csrfCookie?.value ?? '')}` },
      payload: { accountId: api.devAccountIds[0] },
    });
    expect(signedIn.statusCode, signedIn.body).toBe(200);
    const session = signedIn.cookies.find((cookie) => cookie.name === 'sovitech_session');
    expect(session?.httpOnly).toBe(true);
    expect(session?.sameSite).toBe('Strict');
    const cookie = `sovitech_session=${encodeURIComponent(session?.value ?? '')}; _csrf=${encodeURIComponent(csrfCookie?.value ?? '')}`;
    const who = SessionResponseSchema.parse((await api.app.inject({ method: 'GET', url: '/api/auth/session', headers: { cookie } })).json());
    expect(who.user?.userId).toBe(api.devAccountIds[0]);

    // A-11 (ADR 0038 decision 9): the token of before sign-in is bound to no session, so it no longer passes; the
    // client fetches a token for the session (apps/web/src/api/client.ts does so after a 403 `csrf_invalid`).
    const stale = await api.app.inject({ method: 'POST', url: '/api/auth/sign-out', headers: { cookie, 'csrf-token': token } });
    expect(stale.statusCode).toBe(403);
    expect(stale.json()).toEqual({ code: 'csrf_invalid' });
    const sessionCookie = `sovitech_session=${encodeURIComponent(session?.value ?? '')}`;
    const fresh = await api.app.inject({ method: 'GET', url: '/api/csrf', headers: { cookie: sessionCookie } });
    const freshCsrf = fresh.cookies.find((entry) => entry.name === '_csrf');
    const signedInCookie = `${sessionCookie}; _csrf=${encodeURIComponent(freshCsrf?.value ?? '')}`;
    const out = await api.app.inject({ method: 'POST', url: '/api/auth/sign-out', headers: { cookie: signedInCookie, 'csrf-token': (fresh.json() as { token: string }).token } });
    expect(out.statusCode).toBe(204);
    const after = SessionResponseSchema.parse((await api.app.inject({ method: 'GET', url: '/api/auth/session', headers: { cookie } })).json());
    expect(after.user).toBeNull();
    // Nothing of any project without a session (rule 13; R-133).
    expect((await api.app.inject({ method: 'GET', url: '/api/projects', headers: { cookie } })).statusCode).toBe(401);
  });

  it('ADR 0038 · prompt 3 section 11: signing in needs the CSRF token and a listed account', async () => {
    const noToken = await api.app.inject({ method: 'POST', url: '/api/auth/dev-sign-in', payload: { accountId: api.devAccountIds[0] } });
    expect(noToken.statusCode).toBe(403);
    expect(noToken.json()).toEqual({ code: 'csrf_invalid' });
    const csrf = await api.app.inject({ method: 'GET', url: '/api/csrf' });
    const token = (csrf.json() as { token: string }).token;
    const csrfCookie = csrf.cookies.find((cookie) => cookie.name === '_csrf');
    const stranger = await api.app.inject({
      method: 'POST',
      url: '/api/auth/dev-sign-in',
      headers: { 'csrf-token': token, cookie: `_csrf=${encodeURIComponent(csrfCookie?.value ?? '')}` },
      payload: { accountId: '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e9f' },
    });
    expect(stranger.statusCode).toBe(403);
    expect(stranger.json()).toEqual({ code: 'not_a_dev_account' });
  });
});

describe('prompt 3 phase 3 exit (c) · R-001 to R-004: a new project with no documents skips everything and reaches step 8', LONG, () => {
  beforeAll(async () => {
    const [accountId] = api.devAccountIds;
    if (accountId === undefined) throw new Error('no development account');
    owner = await signIn(api, accountId);
    const created = await post('/api/projects', { name: 'TEST Wizard Project 7', projectType: 'new_construction', countryCode: 'ro', city: 'TEST City' });
    expect(created.statusCode, created.body).toBe(201);
    projectId = (created.json() as { projectId: string }).projectId;
  });

  it('US-ADMIN-05 · R-136: the list shows the new project under its name, bound, with no demo line', async () => {
    const list = ProjectListResponseSchema.parse((await api.app.inject({ method: 'GET', url: '/api/projects', headers: { ...owner } })).json());
    const row = list.projects.find((entry) => entry.projectId === projectId);
    expect(row?.isDemo).toBe(false);
    expect(row?.demoLine).toBeNull();
    const name = list.displayObjects.find((display) => display.valueId === row?.name);
    expect(name?.text).toBe('TEST Wizard Project 7');
    expect(name?.badge?.id).toBe('provided_by_you');
  });

  it('US-INTAKE-02 · US-INTAKE-03 · R-001: step 1 shows the four answers, the country as its ISO code, each with Edit', async () => {
    const view = await step(1);
    if (view.view.step !== 1) throw new Error('step 1');
    const byId = new Map(view.displayObjects.map((display) => [display.valueId, display]));
    expect(byId.get(view.view.name)?.text).toBe('TEST Wizard Project 7');
    for (const id of [view.view.name, view.view.projectType, view.view.country, view.view.city]) {
      expect(byId.get(id)?.actions?.some((action) => action.kind === 'edit')).toBe(true);
    }
    expect(view.project.demoLine).toBeNull();
  });

  it('G7-6 · US-INTAKE-21 AC2 · rule 7: Next on step 1 of an existing project writes a changed answer, refuses a blank one by name, and a code no country has', async () => {
    const view = await step(1);
    if (view.view.step !== 1) throw new Error('step 1');
    const cityId = view.view.city;
    const city = view.displayObjects.find((display) => display.valueId === cityId);
    const edit = city?.actions?.find((action) => action.kind === 'edit');
    if (edit?.kind !== 'edit') throw new Error('no Edit on the city');
    const blank = await post(`/api/projects/${projectId}/steps/1/continue`, {
      answers: [{ field: edit.field, value: { kind: 'text', text: '  ' }, corrects: [] }],
      multi: [],
      visibleSuggestions: [],
      shown: { questions: [], confirmations: [] },
    });
    expect(blank.statusCode).toBe(422);
    expect(blank.json()).toEqual({ code: 'required_fields_missing', fields: ['city'] });
    const countryId = view.view.country;
    const country = view.displayObjects.find((display) => display.valueId === countryId);
    const countryEdit = country?.actions?.find((action) => action.kind === 'edit');
    if (countryEdit?.kind !== 'edit') throw new Error('no Edit on the country');
    const noCountry = await post(`/api/projects/${projectId}/steps/1/continue`, {
      answers: [{ field: countryEdit.field, value: { kind: 'text', text: 'XX' }, corrects: [] }],
      multi: [],
      visibleSuggestions: [],
      shown: { questions: [], confirmations: [] },
    });
    expect(noCountry.statusCode).toBe(422);
    expect(noCountry.json()).toEqual({ code: 'country_invalid' });
    const changed = await post(`/api/projects/${projectId}/steps/1/continue`, {
      answers: [{ field: edit.field, value: { kind: 'text', text: 'TEST Other City' }, corrects: edit.shownCandidateIds }],
      multi: [],
      visibleSuggestions: [],
      shown: { questions: [], confirmations: [] },
    });
    expect(changed.statusCode, changed.body).toBe(200);
    const next = ContinueResponseSchema.parse(changed.json());
    expect(next.nextStep).toBe(2);
    expect(next.displayObjects.find((display) => display.valueId === cityId)?.text).toBe('TEST Other City');
    // The same answer again writes nothing new (US-SCOPE-02 AC9's reading for every answer).
    const cities = async () => api.database.asAdministrator(`SELECT id FROM sovitech.candidates WHERE project_id = $1 AND field_key = 'project.city'`, [projectId]);
    const before = await cities();
    await post(`/api/projects/${projectId}/steps/1/continue`, {
      answers: [{ field: edit.field, value: { kind: 'text', text: 'TEST Other City' }, corrects: [] }],
      multi: [],
      visibleSuggestions: [],
      shown: { questions: [], confirmations: [] },
    });
    expect(await cities()).toEqual(before);
  });

  it('R-013 · UD-33: step 2 lists no file, and the file count is bound', async () => {
    const view = await step(2);
    if (view.view.step !== 2) throw new Error('step 2');
    expect(view.view.files).toEqual([]);
    expect(view.view.stillReading).toBeNull();
    expect(view.displayObjects.find((display) => display.valueId === (view.view.step === 2 ? view.view.documentCount : ''))?.text).toBe('0');
  });

  it('R-047 · 5.2 "No documents" · "No IFC uploaded": step 3 reads Not provided yet with Edit, and the view area names the missing model', async () => {
    const view = await step(3);
    if (view.view.step !== 3) throw new Error('step 3');
    expect(view.view.intro).toBe('no_documents');
    expect(view.view.viewer.state).toBe('no_model');
    expect(view.view.viewer.addModelOnStep).toBe(2);
    const facts = view.view.summary.slice(0, 4).map((id) => view.displayObjects.find((display) => display.valueId === id));
    for (const fact of facts) {
      expect(fact?.shape).toBe('missing');
      expect(fact?.badge?.id).toBe('not_provided_yet');
      expect(fact?.actions?.some((action) => action.kind === 'edit')).toBe(true);
    }
    expect(view.view.confirmationCount).toBeNull();
  });

  it('R-051 · rule 11: step 4 preselects nothing, every detection reads Unknown, Fire Safety is never preselected, and Skip for now shows', async () => {
    const view = await step(4);
    if (view.view.step !== 4) throw new Error('step 4');
    expect(view.view.systems.every((system) => !system.selected && system.suggestion === null)).toBe(true);
    expect(view.view.systems.find((system) => system.systemId === 'fire_safety')?.lifeSafety).toBe(true);
    for (const system of view.view.systems) expect(view.displayObjects.find((display) => display.valueId === system.detection)?.badge?.id).toBe('unknown');
    expect(view.view.question.skip).toEqual({ kind: 'skip', questionId: 'q.project.systemsInScope' });
  });

  it('DR-25 · US-SCOPE-01 AC10 · rule 12: with no document uploaded, step 4 serves the no-documents subtitle, never what documents say', async () => {
    const view = await step(4);
    if (view.view.step !== 4) throw new Error('step 4');
    expect(view.view.subtitle).toBe('no_documents');
  });

  it('R-002 · G7-3: Continue on steps 4 to 7 with nothing chosen skips each question; nothing is decided against every option', async () => {
    for (const n of [4, 5, 6, 7]) {
      const shown = n === 5 ? ['q.building.type', 'q.project.operatingSchedule', 'q.project.occupancy'] : n === 4 ? ['q.project.systemsInScope'] : n === 6 ? ['q.project.goals'] : ['q.project.automationAreas'];
      const response = await post(`/api/projects/${projectId}/steps/${String(n)}/continue`, { answers: [], multi: [], visibleSuggestions: [], shown: { questions: shown, confirmations: [] } });
      expect(response.statusCode, response.body).toBe(200);
      expect(ContinueResponseSchema.parse(response.json()).nextStep).toBe(n + 1);
    }
    const four = await step(4);
    if (four.view.step !== 4) throw new Error('step 4');
    expect(four.view.question.state).toBe('skipped');
    expect(four.view.question.skip).toBeNull();
    expect(four.view.question.afterSkip?.text).toBe('You can provide this later.');
    const events = await api.database.asAdministrator<{ type: string; count: string }>(
      `SELECT type, count(*)::text AS count FROM sovitech.field_events WHERE project_id = $1 GROUP BY type`,
      [projectId],
    );
    expect(events).toEqual([{ type: 'skipped', count: String(8 + 3 + 7 + 6) }]);
    // No decision was written for any option (US-INTAKE-09 AC3, US-SCOPE-02 AC4).
    const decisions = await api.database.asAdministrator(`SELECT id FROM sovitech.candidates WHERE project_id = $1 AND field_key LIKE 'project.scope.%'`, [projectId]);
    expect(decisions).toEqual([]);
  });

  it('R-003 · US-INTAKE-17 · rule 7: step 8 shows the cards, asks once inline for each missing first-estimate field, and every output reads Not available yet', async () => {
    const view = await step(8);
    if (view.view.step !== 8) throw new Error('step 8');
    expect(view.view.cards.map((card) => card.cardId)).toEqual(['project', 'documents', 'building', 'systems', 'operations', 'goals', 'automation']);
    expect(view.view.proposal.stage).toBeNull();
    expect(view.view.proposal.inlineAsks.map((ask) => ask.questionId)).toEqual(['q.building.grossFloorArea', 'q.building.type', 'q.project.systemsInScope']);
    for (const output of view.view.proposal.outputs) {
      expect(output.availability).toBe('not_available_yet');
      const line = view.displayObjects.find((display) => display.valueId === output.line);
      expect(line?.text.startsWith('Not available yet: ')).toBe(true);
    }
    expect(view.view.forYou.count).not.toBeNull();
    expect(view.view.sovitechWillCheck).toEqual([]);
  });

  it('G8-21 · rule 8 · US-INTAKE-17 AC7: the inline ask refuses a number that reads two ways, and stores a whole one', async () => {
    const view = await step(8);
    if (view.view.step !== 8) throw new Error('step 8');
    const area = view.view.proposal.inlineAsks.find((ask) => ask.questionId === 'q.building.grossFloorArea');
    const field = area?.fields[0];
    if (field === undefined) throw new Error('no inline ask for the area');
    const ambiguous = await post(`/api/projects/${projectId}/fields/edit`, { field, value: { kind: 'quantity', raw: '1.500', qualifier: 'gross_total' }, corrects: [] });
    expect(ambiguous.statusCode).toBe(422);
    expect(ambiguous.json()).toEqual({ code: 'number_ambiguous' });
    const unqualified = await post(`/api/projects/${projectId}/fields/edit`, { field, value: { kind: 'quantity', raw: '1500' }, corrects: [] });
    expect(unqualified.json()).toEqual({ code: 'qualifier_required' });
    const stored = await post(`/api/projects/${projectId}/fields/edit`, { field, value: { kind: 'quantity', raw: '1500', qualifier: 'gross_total' }, corrects: [] });
    expect(stored.statusCode, stored.body).toBe(200);
    const displays = FieldWriteResponseSchema.parse(stored.json()).displayObjects;
    // 2.8: "Owner entered or accepted" reads Provided by you; on an engineer field it stays unverified (2.1), no user_confirmed.
    expect(displays[0]?.badge?.id).toBe('provided_by_you');
    const confirmed = await api.database.asAdministrator(
      `SELECT event.id FROM sovitech.candidate_events AS event JOIN sovitech.candidates AS candidate ON candidate.id = event.candidate_id
       WHERE candidate.project_id = $1 AND candidate.field_key = 'building.grossFloorArea'`,
      [projectId],
    );
    expect(confirmed).toEqual([]);
    const after = await step(8);
    if (after.view.step !== 8) throw new Error('step 8');
    expect(after.view.proposal.inlineAsks.map((ask) => ask.questionId)).toEqual(['q.building.type', 'q.project.systemsInScope']);
  });

  it('rule 7 · US-INTAKE-17: "Generate without it" skips the ask once more; then it is gone', async () => {
    const skipped = await post(`/api/projects/${projectId}/fields/skip`, { questionId: 'q.building.type', step: 8 });
    expect(skipped.statusCode, skipped.body).toBe(200);
    const after = await step(8);
    if (after.view.step !== 8) throw new Error('step 8');
    expect(after.view.proposal.inlineAsks.map((ask) => ask.questionId)).toEqual(['q.project.systemsInScope']);
  });

  it('5.2 "Generate before phase 5" · UD-07: Generate answers the proposal page, where every output reads Not available yet, and stores nothing', async () => {
    const before = await api.database.asAdministrator(`SELECT id FROM sovitech.proposal_snapshots WHERE project_id = $1`, [projectId]);
    const generate = await post(`/api/projects/${projectId}/steps/8/continue`, { answers: [], multi: [], visibleSuggestions: [], shown: { questions: [], confirmations: [] } });
    expect(generate.statusCode, generate.body).toBe(200);
    expect(ContinueResponseSchema.parse(generate.json()).nextStep).toBe('proposal');
    const page = ProposalPreviewResponseSchema.parse((await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/proposal`, headers: { ...owner } })).json());
    expect(page.view.outputs.length).toBeGreaterThan(0);
    expect(page.view.outputs.every((output) => output.availability === 'not_available_yet')).toBe(true);
    expect(await api.database.asAdministrator(`SELECT id FROM sovitech.proposal_snapshots WHERE project_id = $1`, [projectId])).toEqual(before);
  });

  it('GS-1 · section 4: the flow logged no question for a known field', async () => {
    const events = await api.database.asAdministrator(`SELECT id FROM sovitech.guardrail_events WHERE project_id = $1 AND type = 'question_for_known_field'`, [projectId]);
    expect(events).toEqual([]);
  });

  it('G7-4 · R-004: late findings answer no dot and no notice while nothing arrived', async () => {
    const response = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/late-findings?current=8&left=3@2026-09-30T00:00:00Z`, headers: { ...owner } });
    expect(response.statusCode, response.body).toBe(200);
    const parsed = LateFindingsResponseSchema.parse(response.json());
    expect(parsed.dots).toEqual([]);
    expect(parsed.notice).toBeNull();
  });
});

describe('the refusals every project route shares (contract routes.ts)', LONG, () => {
  it('rule 13: another user\'s project reads as not found, and a write without the token is refused', async () => {
    const [accountId] = api.devAccountIds;
    if (accountId === undefined) throw new Error('no development account');
    const other = await signIn(api, api.extractionAccountId);
    expect((await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/steps/1`, headers: { ...other } })).statusCode).toBe(404);
    const noToken = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/fields/skip`, headers: { cookie: owner.cookie }, payload: { questionId: 'q.project.goals', step: 6 } });
    expect(noToken.statusCode).toBe(403);
    expect(noToken.json()).toEqual({ code: 'csrf_invalid' });
    const badBody = await post(`/api/projects/${projectId}/fields/skip`, { questionId: 3 });
    expect(badBody.statusCode).toBe(400);
    expect(badBody.json()).toEqual({ code: 'request_invalid' });
    const unsigned = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/steps/1` });
    expect(unsigned.statusCode).toBe(401);
  });
});
