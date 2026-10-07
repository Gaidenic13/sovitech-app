/**
 * The phase 6 routes over a TEST database, through the API (docs/adr/0052; the contract:
 * packages/view-model/src/browser/contract/metrics.ts and routes.ts), with the production registry and the production
 * catalogue as the app reads them (no SOVITECH dataset is approved, no formula body exists, no series is declared, no
 * key is set):
 * - every Metrics read and print route needs a session (401), reads another project as not found (404; rule 13),
 *   refuses a query the contract refuses (400), and reads an unknown `?snapshot=` as not found (404);
 * - a project with no stored proposal: each snapshot-reading page reads "Not available yet: a generated preliminary
 *   proposal" with the action that opens the Proposal page (rule 7), and nothing else;
 * - after Generate: each page reads the latest version, or the one `?snapshot=` names; its investment is the stored
 *   proposal's headline price under its own value id, with the identical display (G2-7's API half), no stage named and
 *   no reserved term anywhere (G10-15's API half); every chart reads one "Not available yet" line and draws nothing
 *   (G1-31's API half); the print views carry no action on any display (ADR 0050 decision 1);
 * - OPEX & Savings reads the project now: Unknown for the costs no document states, "Not available yet" naming what is
 *   missing, the upload beside the energy cost of an existing building and none for new construction (US-FIN-13 AC8,
 *   AC9), and a row per system whose recorded decision is include (G10-7).
 * Then, with the engine's TEST catalogue and TEST datasets through the API's engine seam (test runner only), a TEST
 * stage 1 figure: the Metrics pages show it through the stored proposal's own price, with the stage label read from
 * stored records, and the TEST series never draws under a production series' key.
 * One TEST database at a time. Every account and value is TEST data. Export Report (`exports.metrics`, R-121): its
 * boundary here (401, 404 for another project, an unknown version or a page with no Export Report, 400 with no version
 * named) and its 503 `export_unavailable` while no printer is configured (the test API has none); the printed PDF is
 * proven by the printer's tests (apps/api/src/proposal/export.test.ts), G10-16 and G1-32 (tests/guardrails/), and flow
 * (j) on the e2e stack.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { appendCandidateEvent, insertCandidate, withRequest } from '@sovitech/db';
import { createTestAccount } from '@sovitech/db/testing';
import { SYSTEMS, scopeFieldKey } from '@sovitech/registry';
import { findReservedTerms } from '@sovitech/registry/reserved-terms';
import type { RegistryFieldDefinition } from '@sovitech/registry/validation';
import {
  CapexResponseSchema,
  FinancialOverviewResponseSchema,
  GenerateResponseSchema,
  LifecycleResponseSchema,
  OpexResponseSchema,
  PaybackResponseSchema,
  ProposalResponseSchema,
  StepResponseSchema,
  servedDisplayOf,
  type DisplayObject,
  type Series,
} from '@sovitech/view-model/browser';
import { testDatasetAccess } from '../../packages/engine/test-formulas/datasets';
import { testCatalogue } from '../../packages/engine/test-formulas/engine';
import { MIRRORED_OUTPUT_FIELDS } from '../../packages/engine/test-formulas/fields';
import { SERIES_OUTPUT_FIELDS } from '../../packages/engine/test-formulas/series';
import { signIn, startTestApi, type Auth, type TestApi } from '../guardrails/_support/api';
import { newOwnerProject, testRegistry } from '../guardrails/_support/workspace-store';

const LONG = { timeout: 120_000 };
const UNKNOWN_ID = '0192f0e4-7e57-7000-8000-000000000001';
const PAGES = ['financial-overview', 'capex', 'payback', 'lifecycle'] as const;
const SCHEMAS = { 'financial-overview': FinancialOverviewResponseSchema, capex: CapexResponseSchema, payback: PaybackResponseSchema, lifecycle: LifecycleResponseSchema } as const;

let api: TestApi;
let owner: Auth;
let ownerId: string;

async function startGroup(options: Parameters<typeof startTestApi>[0] = {}): Promise<void> {
  api = await startTestApi({ devLogin: true, ...options });
  const [id] = api.devAccountIds;
  if (id === undefined) throw new Error('no TEST development owner');
  ownerId = id;
  owner = await signIn(api, id);
}

function get(projectId: string, path: string, headers: Record<string, string> = { ...owner }) {
  return api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/${path}`, headers });
}

async function generate(projectId: string): Promise<string> {
  const response = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/proposals`, headers: { ...owner }, payload: {} });
  expect(response.statusCode, response.body).toBe(201);
  return GenerateResponseSchema.parse(response.json()).snapshotId;
}

async function edit(projectId: string, subjectId: string, fieldKey: string, choice: string, corrects: readonly string[] = []): Promise<void> {
  const response = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/fields/edit`, headers: { ...owner }, payload: { field: { subjectId, fieldKey }, value: { kind: 'choice', choice }, corrects: [...corrects] } });
  expect(response.statusCode, `${fieldKey}: ${response.body}`).toBe(200);
}

/** A page read and parsed with its contract schema. */
async function page(projectId: string, name: (typeof PAGES)[number], query = '') {
  const response = await get(projectId, `metrics/${name}${query}`);
  expect(response.statusCode, `${name}: ${response.body}`).toBe(200);
  return SCHEMAS[name].parse(response.json());
}

function displayIn(displays: readonly DisplayObject[], valueId: string): DisplayObject {
  const found = displays.find((display) => display.valueId === valueId);
  if (found === undefined) throw new Error(`no display ${valueId}`);
  return found;
}

/** Every text a display's element may show (the render contract's projection), for the reserved-term scan. */
function textsOf(display: DisplayObject): string[] {
  const served = servedDisplayOf(display);
  return [served.text, ...(served.lines ?? []), ...(served.parts ?? [])];
}

/** The series a page view serves. */
function seriesOf(view: Record<string, unknown>): Series[] {
  const found: Series[] = [];
  const visit = (value: unknown): void => {
    if (typeof value !== 'object' || value === null) return;
    if ('series' in value && 'state' in value && 'points' in value) {
      found.push(value as Series);
      return;
    }
    for (const entry of Object.values(value)) visit(entry);
  };
  visit(view);
  return found;
}

describe('ADR 0052: the Metrics routes with the production registry and catalogue', () => {
  beforeAll(async () => {
    await startGroup();
  }, 180_000);

  afterAll(async () => {
    await api?.stop();
  });

  it('ADR 0052 · rule 13 · G13-5: no session is 401; another project is 404; a bad query is 400; an unknown snapshot is 404', LONG, async () => {
    const { projectId } = await newOwnerProject(api, owner, 'metrics boundary');
    const snapshotId = await generate(projectId);
    const stranger = await signIn(api, await createTestAccount(api.database, { label: 'metrics stranger', kind: 'person', roles: ['owner'] }));
    const reads = [...PAGES.map((name) => `metrics/${name}`), 'metrics/opex', `metrics/payback/print?snapshot=${snapshotId}`, `metrics/lifecycle/print?snapshot=${snapshotId}`];
    for (const path of reads) {
      expect((await get(projectId, path, {})).statusCode, path).toBe(401);
      expect((await get(projectId, path, { ...stranger })).statusCode, path).toBe(404);
      const own = await get(projectId, path);
      expect(own.statusCode, `${path}: ${own.body}`).toBe(200);
    }
    for (const bad of ['metrics/capex?snapshot=not-an-id', 'metrics/payback?other=1', 'metrics/financial-overview?snapshot=', 'metrics/payback/print', 'metrics/lifecycle/print?snapshot=x']) {
      expect((await get(projectId, bad)).statusCode, bad).toBe(400);
    }
    for (const missing of [...PAGES.map((name) => `metrics/${name}?snapshot=${UNKNOWN_ID}`), `metrics/payback/print?snapshot=${UNKNOWN_ID}`, `metrics/lifecycle/print?snapshot=${UNKNOWN_ID}`, `exports/metrics/opex?snapshot=${snapshotId}`]) {
      expect((await get(projectId, missing)).statusCode, missing).toBe(404);
    }
    expect((await get('not-a-project', 'metrics/opex')).statusCode).toBe(404);
  });

  it('ADR 0052 decision 7 · R-121 · rule 13 · rule 7: Export Report needs a session, reads another project or an unknown version as not found, needs the version named, and answers 503 export_unavailable while no printer is configured', LONG, async () => {
    const { projectId } = await newOwnerProject(api, owner, 'metrics export');
    const snapshotId = await generate(projectId);
    const stranger = await signIn(api, await createTestAccount(api.database, { label: 'metrics export stranger', kind: 'person', roles: ['owner'] }));
    for (const name of ['payback', 'lifecycle'] as const) {
      const path = `exports/metrics/${name}?snapshot=${snapshotId}`;
      expect((await get(projectId, path, {})).statusCode, path).toBe(401);
      expect((await get(projectId, path, { ...stranger })).statusCode, path).toBe(404);
      expect((await get(projectId, `exports/metrics/${name}?snapshot=${UNKNOWN_ID}`)).statusCode, name).toBe(404);
      expect((await get(projectId, `exports/metrics/${name}`)).statusCode, name).toBe(400);
      const file = await get(projectId, path);
      expect(file.statusCode, file.body).toBe(503);
      expect(file.json()).toMatchObject({ code: 'export_unavailable', message: 'The PDF could not be prepared. Nothing was lost; you can try again.' });
    }
    for (const other of ['financial-overview', 'capex', 'opex', 'proposal']) expect((await get(projectId, `exports/metrics/${other}?snapshot=${snapshotId}`)).statusCode, other).toBe(404);
  });

  it('ADR 0052 decision 3 · rule 7: with no stored proposal, each snapshot page names what is missing and opens the Proposal page, and shows nothing else', LONG, async () => {
    const { projectId } = await newOwnerProject(api, owner, 'metrics none');
    for (const name of PAGES) {
      const response = await page(projectId, name);
      expect(response.view.state, name).toBe('none_generated');
      if (response.view.state !== 'none_generated') continue;
      expect(response.view.actions).toEqual(['open_proposal']);
      const line = displayIn(response.displayObjects, response.view.line);
      expect(line.valueId).toBe(`project:${projectId}.metrics.source`);
      expect(line.text).toBe('Not available yet: a generated preliminary proposal');
      expect(response.project.demoLine).toBeNull();
    }
  });

  it('ADR 0052 · G2-7 · G10-15 · G1-31 (API halves): each page reads one stored version; its investment is the proposal\'s own price with no stage; every chart is one "Not available yet" line; no reserved term', LONG, async () => {
    const { projectId } = await newOwnerProject(api, owner, 'metrics generated');
    const first = await generate(projectId);
    const second = await generate(projectId);
    const proposal = ProposalResponseSchema.parse((await get(projectId, `proposals/${second}`)).json());
    for (const name of PAGES) {
      const latest = await page(projectId, name);
      if (latest.view.state !== 'generated') throw new Error(`${name} reads no version`);
      expect(latest.view.snapshotId, name).toBe(second);
      expect(latest.view.latest, name).toBe(true);
      // An earlier version, named: its own snapshot, not the latest.
      const earlier = await page(projectId, name, `?snapshot=${first}`);
      if (earlier.view.state !== 'generated') throw new Error(`${name} reads no named version`);
      expect(earlier.view.snapshotId).toBe(first);
      expect(earlier.view.latest).toBe(false);
      expect(earlier.displayObjects.some((display) => display.valueId.startsWith(`proposal:${second}.`))).toBe(false);
      // G2-7 · G10-15: the investment is the stored proposal's headline price, the identical display, no stage named.
      if ('investment' in latest.view) {
        expect(latest.view.investment, name).toEqual(proposal.view.headline.investment);
        expect(latest.view.investment.price.stageId).toBeNull();
        expect(displayIn(latest.displayObjects, latest.view.investment.price.figure)).toEqual(displayIn(proposal.displayObjects, proposal.view.headline.investment.price.figure));
      }
      // G1-31: no production formula declares a series: each chart is its one line, nothing drawn.
      const series = seriesOf(latest.view as unknown as Record<string, unknown>);
      expect(series.length, name).toBeGreaterThan(0);
      for (const entry of series) {
        expect(entry.state, `${name} ${entry.series}`).toBe('not_available_yet');
        expect(entry.points).toEqual([]);
        expect(displayIn(latest.displayObjects, entry.notAvailable ?? '').text).toMatch(/^Not available yet: .+; SOVITECH's method for /u);
      }
      // G10-15: no stage label, and no reserved term where 2.8 does not allow one.
      for (const display of latest.displayObjects) {
        expect(display.lines?.some((line) => line.kind === 'stage_label') ?? false, display.valueId).toBe(false);
        for (const text of textsOf(display)) expect(findReservedTerms(text).map((match) => match.term), `${name}: ${text}`).toEqual([]);
      }
    }
    // The print views: the page's view of the named version with no action on any display (ADR 0050 decision 1).
    for (const name of ['payback', 'lifecycle'] as const) {
      const response = await get(projectId, `metrics/${name}/print?snapshot=${first}`);
      expect(response.statusCode, response.body).toBe(200);
      const printed = SCHEMAS[name].parse(response.json());
      const shown = await page(projectId, name, `?snapshot=${first}`);
      expect(printed.view).toEqual(shown.view);
      for (const display of printed.displayObjects) expect(display.actions, display.valueId).toBeUndefined();
    }
  });

  it('ADR 0052 · R-095 · US-FIN-13 AC8 AC9 · US-FIN-14 AC1 · G10-7 · G7-24 · V-4 (phase 6 part B): OPEX & Savings reads the project now: Unknown costs, what is missing named (a new building\'s estimate as step 8 names it, with its Adds, then the energy-price unit and the open question on annual amounts), the upload only for an existing building, a row per included system, or the panel\'s line while none is', LONG, async () => {
    const { projectId } = await newOwnerProject(api, owner, 'metrics opex');
    const read = async () => {
      const response = await get(projectId, 'metrics/opex');
      expect(response.statusCode, response.body).toBe(200);
      return OpexResponseSchema.parse(response.json());
    };
    // G7-24: no include decision recorded: the panel's line, with the way to choose the systems, and no row.
    const undecided = await read();
    expect(undecided.view.systems).toEqual([]);
    expect(undecided.view.noSystems?.actions).toEqual(['choose_systems']);
    expect(displayIn(undecided.displayObjects, undecided.view.noSystems?.line ?? '').text).toBe('Not available yet: the systems in scope');
    await edit(projectId, projectId, scopeFieldKey('hvac'), 'include');
    await edit(projectId, projectId, scopeFieldKey('cctv'), 'exclude');
    const newBuild = await read();
    expect(newBuild.view.noSystems).toBeNull();
    expect(displayIn(newBuild.displayObjects, newBuild.view.total).text).toBe('Not available yet: the open question on annual amounts');
    // V-4: the estimate's items as step 8's own line names them for the annual energy consumption, the same Adds in the
    // same order (US-FIN-13 AC9), then the energy-price unit and the open question on annual amounts (R-095).
    const step8 = StepResponseSchema.parse((await get(projectId, 'steps/8')).json()).displayObjects;
    const planned = displayIn(step8, `project:${projectId}.outputs.energy.annualConsumption`);
    expect(planned.text.startsWith('Not available yet: ')).toBe(true);
    const energy = displayIn(newBuild.displayObjects, newBuild.view.energy.display);
    expect(energy.text).toBe(`${planned.text}; the energy-price unit; the open question on annual amounts`);
    expect(energy.actions ?? []).toEqual(planned.actions ?? []);
    expect(newBuild.view.energy.actions).toEqual([]);
    for (const id of [newBuild.view.maintenance, newBuild.view.staff, newBuild.view.other]) expect(displayIn(newBuild.displayObjects, id)).toMatchObject({ text: 'Unknown', shape: 'missing', missing: 'unknown' });
    expect(displayIn(newBuild.displayObjects, newBuild.view.intensity).text).toBe('Not available yet: the unit for cost per area per year; the open question on annual amounts');
    expect(newBuild.view.systems.map((row) => row.systemId)).toEqual(['hvac']);
    expect(newBuild.view.systems[0]?.decision).toBe(`project:${projectId}.scope.hvac`);
    expect(displayIn(newBuild.displayObjects, newBuild.view.systems[0]?.current ?? '').text).toBe('Not available yet: per-system metering');

    // An existing building: the energy cost waits for the bills' data, with the upload (US-FIN-13 AC8).
    // The owner corrects the step 1 answer they see (rule 4: a correction names the value shown).
    const shown = await api.database.asAdministrator<{ id: string }>(`SELECT id FROM sovitech.candidates WHERE project_id = $1 AND field_key = 'project.type'`, [projectId]);
    await edit(projectId, projectId, 'project.type', 'existing_building', shown.map((row) => row.id));
    const existing = await read();
    expect(displayIn(existing.displayObjects, existing.view.energy.display).text).toBe('Not available yet: energy data read from bills');
    expect(existing.view.energy.actions).toEqual(['upload_document']);
    for (const display of existing.displayObjects) for (const text of textsOf(display)) expect(findReservedTerms(text).map((match) => match.term), text).toEqual([]);
  });
});

describe('ADR 0052 · rule 10 · G2-7: a TEST figure on the Metrics pages, through the engine seam (test runner only)', () => {
  const OUTPUT_FIELDS = [...Object.values(MIRRORED_OUTPUT_FIELDS), ...Object.values(SERIES_OUTPUT_FIELDS)] as unknown as RegistryFieldDefinition[];

  beforeAll(async () => {
    await startGroup({
      registry: testRegistry({ fields: OUTPUT_FIELDS }),
      engine: { catalogue: testCatalogue({ mirrored: true, extra: ['TEST-capexBySystem', 'TEST-cashFlow'] }), datasets: testDatasetAccess() },
    });
  }, 180_000);

  afterAll(async () => {
    await api?.stop();
  });

  it('ADR 0052 decision 3 · rule 10 · G2-7: the investment shows the stored proposal\'s TEST figure with its stage label from stored records; a TEST series never draws under a production key', LONG, async () => {
    const { projectId, buildingId } = await newOwnerProject(api, owner, 'metrics test catalogue');
    await edit(projectId, buildingId, 'building.type', 'hotel');
    for (const system of SYSTEMS) await edit(projectId, projectId, scopeFieldKey(system.id), system.id === 'hvac' || system.id === 'lighting' ? 'include' : 'exclude');
    // The TEST cost ranges name TEST countries only: the owner's own country answer, a TEST value.
    await withRequest(api.database.app, { userId: ownerId, projectId }, async (request) => {
      const written = await insertCandidate(
        request,
        { id: '0192f0e4-7e57-7000-8000-0000000000d1', subjectId: projectId, fieldKey: 'project.country', text: 'TEST-XA', source: 'user', evidence: [], createdBy: ownerId },
        { key: 'project.country', kind: 'text' },
      );
      expect(written.outcome).toBe('stored');
      await appendCandidateEvent(request, { candidateId: '0192f0e4-7e57-7000-8000-0000000000d1', type: 'user_confirmed', by: ownerId, role: 'owner' });
    });
    const snapshotId = await generate(projectId);
    const proposal = ProposalResponseSchema.parse((await get(projectId, `proposals/${snapshotId}`)).json());
    const stage1 = proposal.view.investment.outputs.find((output) => output.output === 'capex.indicativeRange');
    expect(stage1?.price?.stageId).toBe('indicative_range');
    for (const name of ['financial-overview', 'capex', 'payback'] as const) {
      const response = await page(projectId, name);
      if (response.view.state !== 'generated' || !('investment' in response.view)) throw new Error(`${name} reads no version`);
      expect(response.view.investment).toEqual(proposal.view.headline.investment);
      const figure = displayIn(response.displayObjects, response.view.investment.price.figure);
      expect(figure).toEqual(displayIn(proposal.displayObjects, proposal.view.headline.investment.price.figure));
      if (response.view.investment.output === 'capex.indicativeRange') {
        expect(figure.lines?.find((line) => line.kind === 'stage_label')?.text).toBe('Indicative range');
        expect(figure.badge?.id).toBe('estimated');
      }
      for (const entry of seriesOf(response.view as unknown as Record<string, unknown>)) expect(entry.state, `${name} ${entry.series}`).toBe('not_available_yet');
    }
  });
});
