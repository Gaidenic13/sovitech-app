/**
 * The phase 5 routes over a TEST database, through the API (docs/adr/0048 to 0050; the contract:
 * packages/view-model/src/browser/contract/proposal.ts), with the production registry and the production catalogue as
 * the app reads them (no SOVITECH dataset is approved, no formula body exists, no key is set):
 * - every route needs a session (401), reads another project as not found (404; rule 13), refuses a query or body the
 *   contract refuses (400), checks the CSRF token on its writes (403 `csrf_invalid`), and takes Generate and an export
 *   only from the owner (403 `owner_only`);
 * - Generate on a new project with no documents stores a version at once (rule 7: never blocked), whose every output
 *   reads "Not available yet", naming what is missing, with no figure, zero or stage (rule 1; G10-11); the indicators
 *   name what they wait for; rule 11's interface points are named; the basis shows the inputs as used; the open items
 *   are step 8's (G2-7);
 * - the versions list, newest first; the print view with no action on any display, its cover and appendix (G10-5's
 *   view half);
 * - an export is recorded by the owner and listed on Reports with its name, date and time and who started it; search,
 *   category, sort and pages; its PDF answers 503 `export_unavailable` while no printer is configured (the owner is told
 *   it could not be prepared; ADR 0050 decision 2);
 * - G10-2's API half: a TEST quotation record that names a snapshot with no figure gives no stage: never "Formal
 *   quotation" without a figure to name, and nothing reads "Superseded";
 * - the Equipment CSV with its header, each cell's text, badge and source, Unknown never 0 or blank, and the
 *   CSV-injection guard;
 * - a downloaded PDF named by its proposal's generation time (DR-5), and its print stopped when the requester goes away
 *   (A-7; the printer is a stand-in here: the real one is apps/api/src/proposal/export.test.ts's).
 * Then, with the engine's TEST catalogue and TEST datasets through the API's engine seam (as
 * tests/api/proposal-test-catalogue.test.ts does; the test runner only), G10-2's API half over a TEST figure (phase 5
 * part B; R-119; rule 10, "Stage 3 is derived, not passed"; "A quotation goes stale when its inputs change"):
 * - a complete stage 2 TEST figure with a current TEST record reads "Formal quotation" with the record's id (G10-9);
 * - once an input changes after issue (one the record lists, or one Unknown at issue that it could not list: A-4), the
 *   proposal and its exported Reports row both read "Superseded: inputs changed on <date>", the figure back at stage 2;
 * - a record with no inputs and a date-only issue day reads, never answers 500 (V-2);
 * - a snapshot with no figure shows no "Superseded" on its Reports row (V-4).
 * One TEST database at a time: each group starts its own API and stops it. Every account, document and value is TEST
 * data; every quotation record names TEST accounts only.
 */
import { get as httpGet } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addProjectMember, appendCandidateEvent, insertCandidate, newId, readCandidates, recordAssetAppearance, withRequest } from '@sovitech/db';
import { createTestAccount, insertTestQuotationRecord } from '@sovitech/db/testing';
import { candidateHashOf } from '@sovitech/engine';
import { AUTOMATION_AREAS, FIELD, SYSTEMS, automationFieldKey, scopeFieldKey } from '@sovitech/registry';
import type { RegistryFieldDefinition } from '@sovitech/registry/validation';
import {
  ExportResponseSchema,
  GenerateResponseSchema,
  ProposalPrintResponseSchema,
  ProposalResponseSchema,
  ProposalVersionsResponseSchema,
  ReportsResponseSchema,
  StepResponseSchema,
  type DisplayObject,
} from '@sovitech/view-model/browser';
import { INTERFACE_POINTS } from '@sovitech/view-model/server';
import { ExportUnavailable, type PdfPrinter, type PrintRequest } from '../../apps/api/src/proposal/export';
import { testDatasetAccess } from '../../packages/engine/test-formulas/datasets';
import { testCatalogue } from '../../packages/engine/test-formulas/engine';
import { MIRRORED_OUTPUT_FIELDS } from '../../packages/engine/test-formulas/fields';
import { signIn, startTestApi, type Auth, type TestApi } from '../guardrails/_support/api';
import { documentValue, newOwnerProject, productionFieldOf, serviceOf, testDocumentIn, testRegistry } from '../guardrails/_support/workspace-store';

const LONG = { timeout: 120_000 };
const UNKNOWN_ID = '0192f0e4-7e57-7000-8000-000000000001';

let api: TestApi;
let owner: Auth;

/** Starts a TEST API (one TEST database) for a group, signed in as its TEST development owner. */
async function startGroup(options: Parameters<typeof startTestApi>[0] = {}): Promise<void> {
  api = await startTestApi({ devLogin: true, ...options });
  const [ownerId] = api.devAccountIds;
  if (ownerId === undefined) throw new Error('no TEST development owner');
  owner = await signIn(api, ownerId);
}

function get(projectId: string, path: string, headers: Record<string, string> = { ...owner }) {
  return api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/${path}`, headers });
}

function post(projectId: string, path: string, headers: Record<string, string> = { ...owner }, payload: unknown = {}) {
  return api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/${path}`, headers, payload: payload as Record<string, unknown> });
}

async function generate(projectId: string): Promise<string> {
  const response = await post(projectId, 'proposals');
  expect(response.statusCode, response.body).toBe(201);
  return GenerateResponseSchema.parse(response.json()).snapshotId;
}

function byId(displays: readonly DisplayObject[]): Map<string, DisplayObject> {
  return new Map(displays.map((display) => [display.valueId, display]));
}

describe('ADR 0049 · ADR 0050: the phase 5 routes with the production registry and catalogue', () => {
  beforeAll(async () => {
    await startGroup();
  }, 180_000);

  afterAll(async () => {
    await api?.stop();
  });

  describe('ADR 0049 · F-RENDER-06: the proposal routes\' sessions, project boundary, refusals and CSRF', LONG, () => {
    it('ADR 0049 · rule 13 · G13-5: no session is 401; another project is 404; a bad query or id is 400 or 404; a write without the CSRF token is 403; a member who is no owner may not generate or export', async () => {
      const { projectId } = await newOwnerProject(api, owner, 'proposal boundary');
      const snapshotId = await generate(projectId);
      const stranger = await signIn(api, await createTestAccount(api.database, { label: 'proposal stranger', kind: 'person', roles: ['owner'] }));
      const reads = ['proposals', `proposals/${snapshotId}`, `proposals/${snapshotId}/print`, 'reports', 'exports/equipment'];
      for (const path of reads) {
        expect((await get(projectId, path, {})).statusCode, path).toBe(401);
        expect((await get(projectId, path, { ...stranger })).statusCode, path).toBe(404);
        const own = await get(projectId, path);
        expect(own.statusCode, `${path}: ${own.body}`).toBe(200);
      }
      for (const bad of ['reports?page=0', 'reports?sort=sideways', 'reports?category=bill', 'reports?unknown=1', 'exports/equipment?page=2', 'exports/equipment?level=E1']) {
        expect((await get(projectId, bad)).statusCode, bad).toBe(400);
      }
      for (const missing of [`proposals/${UNKNOWN_ID}`, `proposals/${UNKNOWN_ID}/print`, 'proposals/not-an-id', `exports/${UNKNOWN_ID}/file`]) {
        expect((await get(projectId, missing)).statusCode, missing).toBe(404);
      }
      const noToken = await post(projectId, 'proposals', { cookie: owner.cookie });
      expect(noToken.statusCode).toBe(403);
      expect((noToken.json() as { code: string }).code).toBe('csrf_invalid');
      expect((await post(projectId, `proposals/${snapshotId}/exports`, { cookie: owner.cookie })).statusCode).toBe(403);
      expect((await post(projectId, 'proposals', { ...owner }, { force: true })).statusCode).toBe(400);
      expect((await post(projectId, `proposals/${UNKNOWN_ID}/exports`)).statusCode).toBe(404);
      expect((await post(projectId, 'proposals', { ...stranger })).statusCode).toBe(404);

      const engineerId = await createTestAccount(api.database, { label: 'proposal engineer', kind: 'person', roles: ['sovitech_engineer'] });
      await addProjectMember(api.database.operator.db, { projectId, userId: engineerId });
      const engineer = await signIn(api, engineerId);
      expect((await get(projectId, `proposals/${snapshotId}`, { ...engineer })).statusCode).toBe(200);
      for (const path of ['proposals', `proposals/${snapshotId}/exports`]) {
        const refused = await post(projectId, path, { ...engineer });
        expect(refused.statusCode, path).toBe(403);
        expect((refused.json() as { code: string }).code).toBe('owner_only');
      }
    });
  });

  describe('R-109 · R-111 · UD-06: Generate on a new project with no documents', LONG, () => {
    it('US-PROPOSAL-01 · US-PROPOSAL-04 · rule 1 · rule 7 · G10-11 · G11-12: a version is stored at once; every output reads "Not available yet", naming what is missing; no figure, no zero, no stage', async () => {
      const { projectId, buildingId } = await newOwnerProject(api, owner, 'proposal new');
      const before = ProposalVersionsResponseSchema.parse((await get(projectId, 'proposals')).json());
      expect(before.view.versions).toEqual([]);
      const snapshotId = await generate(projectId);
      const response = await get(projectId, `proposals/${snapshotId}`);
      expect(response.statusCode, response.body).toBe(200);
      const proposal = ProposalResponseSchema.parse(response.json());
      const displays = byId(proposal.displayObjects);
      const { view } = proposal;
      expect(view.snapshotId).toBe(snapshotId);
      expect(view.latest).toBe(true);
      expect(proposal.project.demoLine).toBeNull();
      // The generation's date and time (UTC until the owner's time-zone question is answered), as the versions name it.
      expect(displays.get(view.generatedOn)?.text).toMatch(/^\d{1,2} [A-Z][a-z]{2} \d{4}, \d{2}:\d{2}$/u);
      const outputs = [...view.investment.outputs, ...view.points.outputs, ...view.energy.outputs, ...view.measures.outputs];
      expect(outputs.map((output) => output.output)).toEqual([
        'capex.indicativeRange',
        'capex.preliminaryEstimate',
        'points.hardwareIo',
        'points.integration',
        'points.virtual',
        'energy.annualConsumption',
        'savings.annualEnergy',
        'measures.priorityOrder',
      ]);
      for (const output of outputs) {
        const display = displays.get(output.display);
        expect(output.availability, output.output).toBe('not_available_yet');
        expect(display?.missing, output.output).toBe('not_available_yet');
        expect(display?.text.startsWith('Not available yet: SOVITECH '), `${output.output}: ${display?.text ?? ''}`).toBe(true);
        expect(display?.text, output.output).not.toMatch(/\b0\b/u);
      }
      expect(displays.get(`proposal:${snapshotId}.outputs.savings.annualEnergy`)?.text).toContain('SOVITECH savings factors');
      expect(displays.get(`proposal:${snapshotId}.outputs.measures.priorityOrder`)?.text).toContain('SOVITECH function set');
      expect(view.headline.investment.output).toBe('capex.preliminaryEstimate');
      expect(view.headline.investment.price).toEqual({ figure: view.headline.investment.price.figure, stageId: null, quotationRecordId: null });
      // No stage is stated for a figure that does not exist; the only stage labels name the investment outputs (G10-11).
      const labelIds = new Set(view.investment.outputs.flatMap((output) => (output.label === undefined ? [] : [output.label])));
      expect([...labelIds].map((id) => proposal.displayObjects.find((display) => display.valueId === id)?.text)).toEqual(['Indicative range', 'Preliminary investment estimate']);
      expect(proposal.displayObjects.filter((display) => display.lines?.some((line) => line.kind === 'stage_label')).every((display) => labelIds.has(display.valueId))).toBe(true);
      expect(view.indicators.map((indicator) => [indicator.indicator, displays.get(indicator.display)?.text])).toEqual([
        ['operating_cost', 'Not available yet: the open question on annual amounts'],
        ['payback', 'Not available yet: the duration unit; the financial method'],
        ['npv', 'Not available yet: the duration unit; the financial method'],
        ['irr', 'Not available yet: the duration unit; the financial method'],
      ]);
      expect(displays.get(view.points.interfacePoints)?.text).toBe(INTERFACE_POINTS);
      // The basis: the inputs as used, under the snapshot's own value ids; the area was never given.
      expect(view.basis).toContain(`proposal:${snapshotId}.inputs.building.grossFloorArea`);
      expect(displays.get(`proposal:${snapshotId}.inputs.building.grossFloorArea`)?.badge?.id).toBe('not_provided_yet');
      expect(displays.get(`proposal:${snapshotId}.inputs.project.type`)?.badge?.id).toBe('provided_by_you');
      // The open items are step 8's, the same value ids and displays (G2-7).
      const step8 = StepResponseSchema.parse((await get(projectId, 'steps/8')).json());
      if (step8.view.step !== 8) throw new Error('not step 8');
      expect(view.whatWeStillNeed).toEqual({ count: step8.view.forYou.count, items: step8.view.forYou.items, more: step8.view.forYou.more, sovitechWillCheck: step8.view.sovitechWillCheck });
      const stepDisplays = byId(step8.displayObjects);
      for (const item of view.whatWeStillNeed.items) expect(displays.get(item.concerns)).toEqual(stepDisplays.get(item.concerns));
      // The headline's Add actions open step 8's inline ask (R-012).
      const headline = displays.get(view.headline.investment.price.figure);
      expect(headline?.actions?.filter((action) => action.kind === 'add').map((action) => (action.kind === 'add' ? action.field : null))).toEqual(
        expect.arrayContaining([{ subjectId: buildingId, fieldKey: 'building.grossFloorArea' }]),
      );
      expect(view.drafted).toEqual([]);
      expect(view.versions.map((version) => version.snapshotId)).toEqual([snapshotId]);
    });

    it('US-PROPOSAL-11 · R-110: two presses store two versions, newest first; each reads as its own', async () => {
      const { projectId } = await newOwnerProject(api, owner, 'proposal versions');
      const first = await generate(projectId);
      const second = await generate(projectId);
      expect(first).not.toBe(second);
      const versions = ProposalVersionsResponseSchema.parse((await get(projectId, 'proposals')).json());
      expect(versions.view.versions.map((version) => version.snapshotId)).toEqual([second, first]);
      const older = ProposalResponseSchema.parse((await get(projectId, `proposals/${first}`)).json());
      expect(older.view.latest).toBe(false);
      expect(older.view.versions.map((version) => version.snapshotId)).toEqual([second, first]);
      expect(older.displayObjects.some((display) => display.valueId.startsWith(`proposal:${second}.outputs.`))).toBe(false);
    });
  });

  describe('R-118 · R-119 · DB-18: the print view, an export and Reports', LONG, () => {
    it('G10-5 (the view half) · US-REPORTS-01 · US-REPORTS-03 · ADR 0050: the print view has no action on any display, a cover naming the project and an appendix of every value and the open items', async () => {
      const { projectId } = await newOwnerProject(api, owner, 'proposal print');
      const snapshotId = await generate(projectId);
      const response = await get(projectId, `proposals/${snapshotId}/print`);
      expect(response.statusCode, response.body).toBe(200);
      const print = ProposalPrintResponseSchema.parse(response.json());
      expect(print.displayObjects.every((display) => display.actions === undefined)).toBe(true);
      expect(print.view.cover.projectName).toBe(print.project.name);
      expect(byId(print.displayObjects).get(print.view.cover.projectName)?.text).toBe('TEST proposal print');
      const values = new Set(print.view.appendix.values);
      for (const valueId of [...print.view.proposal.basis, ...print.view.proposal.investment.outputs.map((output) => output.display), ...print.view.proposal.indicators.map((indicator) => indicator.display)]) {
        expect(values.has(valueId), valueId).toBe(true);
      }
      expect(print.view.appendix.openItems).toEqual(print.view.proposal.whatWeStillNeed);
      for (const valueId of values) expect(print.displayObjects.some((display) => display.valueId === valueId), valueId).toBe(true);
    });

    it('US-REPORTS-05 · R-119 · 7.1.1-D8: an export is recorded by the owner and listed with its name, date and time and who started it; search, category, sort and pages; its PDF is 503 while no printer is configured', async () => {
      const { projectId } = await newOwnerProject(api, owner, 'proposal reports');
      const empty = ReportsResponseSchema.parse((await get(projectId, 'reports')).json());
      expect(empty.view).toEqual({ state: 'none_generated', rows: [], page: { hasPrevious: false, hasNext: false } });
      const snapshotId = await generate(projectId);
      const outputs: string[] = [];
      for (let index = 0; index < 11; index += 1) {
        const recorded = await post(projectId, `proposals/${snapshotId}/exports`);
        expect(recorded.statusCode, recorded.body).toBe(201);
        outputs.push(ExportResponseSchema.parse(recorded.json()).outputId);
      }
      const first = ReportsResponseSchema.parse((await get(projectId, 'reports')).json());
      expect(first.view.state).toBe('listed');
      expect(first.view.rows).toHaveLength(10);
      expect(first.view.page).toEqual({ hasPrevious: false, hasNext: true });
      expect(first.view.rows[0]?.outputId).toBe(outputs.at(-1));
      const displays = byId(first.displayObjects);
      const [row] = first.view.rows;
      expect(row).toMatchObject({ kind: 'proposal_pdf', snapshotId, superseded: null });
      expect(displays.get(row?.name ?? '')?.text).toMatch(/^Preliminary proposal generated \d{1,2} [A-Z][a-z]{2} \d{4}, \d{2}:\d{2}$/u);
      expect(displays.get(row?.generatedAt ?? '')?.text).toMatch(/^\d{1,2} [A-Z][a-z]{2} \d{4}, \d{2}:\d{2}$/u);
      expect(displays.get(row?.generatedBy ?? '')?.text).toBe('TEST development owner');
      const second = ReportsResponseSchema.parse((await get(projectId, 'reports?page=2')).json());
      expect(second.view.rows.map((entry) => entry.outputId)).toEqual([outputs[0]]);
      expect(second.view.page).toEqual({ hasPrevious: true, hasNext: false });
      const oldest = ReportsResponseSchema.parse((await get(projectId, 'reports?sort=oldest')).json());
      expect(oldest.view.rows[0]?.outputId).toBe(outputs[0]);
      expect(ReportsResponseSchema.parse((await get(projectId, 'reports?search=preliminary&category=proposal_pdf')).json()).view.rows).toHaveLength(10);
      const none = ReportsResponseSchema.parse((await get(projectId, 'reports?search=nothing%20like%20it')).json());
      expect(none.view).toEqual({ state: 'listed', rows: [], page: { hasPrevious: false, hasNext: false } });

      const file = await get(projectId, `exports/${outputs[0] ?? ''}/file`);
      expect(file.statusCode).toBe(503);
      expect(file.json()).toMatchObject({ code: 'export_unavailable', message: 'The PDF could not be prepared. Nothing was lost; you can try again.' });
    });

    it('DR-5 · R-118 · ADR 0050 decision 2 · A-7: a downloaded PDF is named by its proposal\'s generation time; its print is handed a signal that aborts when the requester goes away', async () => {
      const { projectId } = await newOwnerProject(api, owner, 'proposal file name');
      const snapshotId = await generate(projectId);
      const [stored] = await api.database.asAdministrator<{ minute: string }>(
        "SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD-HH24MI') AS minute FROM sovitech.proposal_snapshots WHERE id = $1",
        [snapshotId],
      );
      const recorded = await post(projectId, `proposals/${snapshotId}/exports`);
      expect(recorded.statusCode, recorded.body).toBe(201);
      const { outputId } = ExportResponseSchema.parse(recorded.json());
      // A stand-in for the printer (a dependency the services hand in; the real one is export.test.ts's), which
      // answers TEST bytes, or waits for its requester to go away.
      const asked: PrintRequest[] = [];
      let hold = false;
      let printing: () => void = () => undefined;
      const started = new Promise<void>((resolve) => {
        printing = resolve;
      });
      const printer: PdfPrinter = {
        print: (request) => {
          asked.push(request);
          if (!hold) return Promise.resolve(new TextEncoder().encode('%PDF-TEST'));
          printing();
          return new Promise((_resolve, reject) => {
            request.signal?.addEventListener('abort', () => {
              reject(new ExportUnavailable('request_closed'));
            });
          });
        },
        close: () => Promise.resolve(),
      };
      Object.assign(api.services, { printer, webOrigin: 'http://127.0.0.1:4173' });
      try {
        const file = await get(projectId, `exports/${outputId}/file`);
        expect(file.statusCode, file.body).toBe(200);
        expect(file.headers['content-type']).toBe('application/pdf');
        expect(file.headers['content-disposition']).toBe(`attachment; filename="preliminary-proposal-${stored?.minute ?? ''}.pdf"`);
        expect(asked[0]?.snapshotId).toBe(snapshotId);
        expect(asked[0]?.signal?.aborted).toBe(false);

        // Over a real connection: the requester goes away while its PDF is printed, and the print's signal aborts.
        hold = true;
        const address = await api.app.listen({ port: 0, host: '127.0.0.1' });
        const client = httpGet(`${address}/api/projects/${projectId}/exports/${outputId}/file`, { headers: { cookie: owner.cookie } });
        client.on('error', () => undefined);
        await started;
        client.destroy();
        const signal = asked[1]?.signal;
        for (let tries = 0; tries < 40 && signal?.aborted !== true; tries += 1) await new Promise((resolve) => setTimeout(resolve, 50));
        expect(signal?.aborted).toBe(true);
      } finally {
        Object.assign(api.services, { printer: undefined, webOrigin: undefined });
      }
    });

    it('G10-2 (the API half) · R-129 · rule 10: a TEST quotation record naming a snapshot with no figure gives no stage: no "Formal quotation", no "Superseded"', async () => {
      const { projectId } = await newOwnerProject(api, owner, 'proposal record');
      const snapshotId = await generate(projectId);
      const [ownerId] = api.devAccountIds;
      const engineerId = await createTestAccount(api.database, { label: 'record engineer', kind: 'person', roles: ['sovitech_engineer'] });
      const reviewerId = await createTestAccount(api.database, { label: 'record commercial reviewer', kind: 'person', roles: [] });
      await insertTestQuotationRecord(api.database, { projectId, scopeUserId: ownerId ?? '', snapshotId, reviewingEngineerId: engineerId, commercialReviewerId: reviewerId, issuedOn: '2026-10-01', validUntil: '2026-12-31', inputs: [] });
      const proposal = ProposalResponseSchema.parse((await get(projectId, `proposals/${snapshotId}`)).json());
      expect(proposal.view.headline.investment.price).toEqual({ figure: proposal.view.headline.investment.price.figure, stageId: null, quotationRecordId: null });
      // Phase 6, V-11: no stage label and no Superseded line, in the figure's own lines (their one place) or anywhere.
      for (const output of proposal.view.investment.outputs) {
        expect(output.price).toMatchObject({ stageId: null, quotationRecordId: null });
        const figure = proposal.displayObjects.find((display) => display.valueId === output.price?.figure);
        expect(figure?.lines?.some((line) => line.kind === 'stage_label' || line.id === 'superseded_inputs_changed') ?? false).toBe(false);
      }
      expect(proposal.displayObjects.some((display) => display.quotationRecordId !== undefined || display.text.includes('Formal quotation') || display.text.startsWith('Superseded'))).toBe(false);
    });
  });

  describe('R-066 · US-ASSETS-11 AC6: the Equipment register as CSV', LONG, () => {
    it('US-ASSETS-11 · 7.1-r25 · rule 1 · ADR 0050 decision 4: a header, each cell\'s text, badge and source, Unknown never 0 or blank, a formula-like tag written with an apostrophe', async () => {
      const { projectId } = await newOwnerProject(api, owner, 'equipment csv');
      const serviceId = await serviceOf(api, projectId, 'equipment csv');
      const list = await testDocumentIn(api, { projectId, serviceId, label: 'equipment csv list', fileName: 'TEST lista.pdf', pages: ['TEST lista'] });
      await withRequest(api.database.app, { userId: serviceId, projectId }, async (request) => {
        for (const tag of ['TEST-AHU-01', '=TEST-CMD']) {
          await recordAssetAppearance(request, { tagAsWritten: tag, evidence: [{ documentId: list.id, contentHash: list.contentHash, locator: { page: 1 }, excerpt: 'TEST lista', check: 'text_match' }], createdBy: serviceId });
        }
      });
      const response = await get(projectId, 'exports/equipment');
      expect(response.statusCode, response.body).toBe(200);
      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.headers['content-disposition']).toBe('attachment; filename="equipment-register.csv"');
      expect(response.headers['cache-control']).toBe('private, no-store');
      // The file may start with a byte order mark (U+FEFF), which a spreadsheet reads as UTF-8; it is no cell.
      const lines = response.body.replace(/^\uFEFF/u, '').split('\r\n').filter((line) => line !== '');
      expect(lines[0]).toBe('Tag,Tag badge,Tag source,Type,Type badge,Type source,System,System badge,System source,Location,Location badge,Location source,Level,Level badge,Level source,Zone,Zone badge,Zone source');
      const ahu = lines.find((line) => line.startsWith('TEST-AHU-01,'));
      expect(ahu).toBe('TEST-AHU-01,From document,"Found in TEST lista.pdf, page 1",Unknown,Unknown,,Unknown,Unknown,,Unknown,Unknown,,Unknown,Unknown,,Unknown,Unknown,');
      expect(lines.some((line) => line.startsWith("'=TEST-CMD,"))).toBe(true);
      expect(lines.at(-1)).toBe('Equipment count,Not available yet: SOVITECH asset taxonomy');
      for (const line of lines) expect(line.split(',').includes('0'), line).toBe(false);
      // Filters narrow it as the page's do (a filter on a value no asset states matches nothing: never a guess).
      const filtered = await get(projectId, 'exports/equipment?system=hvac');
      expect(filtered.body.split('\r\n').filter((line) => line !== '')).toHaveLength(2);
    });
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// G10-2's API half over a TEST figure (the TEST catalogue through the engine seam; the test runner only)
// ---------------------------------------------------------------------------------------------------------------------

/** The TEST output fields of the mirrored formulas: the figures a TEST run writes land on them. */
const TEST_OUTPUT_FIELDS = Object.values(MIRRORED_OUTPUT_FIELDS) as unknown as readonly RegistryFieldDefinition[];

/** The TEST development owner's id. */
const ownerIdOf = (): string => api.devAccountIds[0] ?? '';

async function edit(projectId: string, subjectId: string, fieldKey: string, choice: string, corrects: readonly string[] = []): Promise<void> {
  const response = await post(projectId, 'fields/edit', { ...owner }, { field: { subjectId, fieldKey }, value: { kind: 'choice', choice }, corrects });
  expect(response.statusCode, `${fieldKey}: ${response.body}`).toBe(200);
}

/**
 * A project the TEST catalogue gives a complete stage 2 figure: a hotel with HVAC and Lighting in scope, a TEST country
 * the TEST cost ranges name (the owner's own answer), and its upper floors, guest rooms and HVAC control zones read from
 * a TEST document. The automation areas stay Unknown (the TEST points range over them).
 */
async function figureProject(label: string): Promise<{ readonly projectId: string; readonly buildingId: string }> {
  const made = await newOwnerProject(api, owner, label);
  const ownerId = ownerIdOf();
  await edit(made.projectId, made.buildingId, FIELD.buildingType, 'hotel');
  for (const system of SYSTEMS) await edit(made.projectId, made.projectId, scopeFieldKey(system.id), system.id === 'hvac' || system.id === 'lighting' ? 'include' : 'exclude');
  const country = newId();
  await withRequest(api.database.app, { userId: ownerId, projectId: made.projectId }, async (request) => {
    const written = await insertCandidate(request, { id: country, subjectId: made.projectId, fieldKey: FIELD.country, text: 'TEST-XA', source: 'user', evidence: [], createdBy: ownerId }, { key: FIELD.country, kind: 'text' });
    expect(written.outcome).toBe('stored');
    await appendCandidateEvent(request, { candidateId: country, type: 'user_confirmed', by: ownerId, role: 'owner' });
  });
  const serviceId = await serviceOf(api, made.projectId, label);
  const pages = ['TEST etaje superioare: 3', 'TEST camere: 20', 'TEST zone HVAC: 6'];
  const memoriu = await testDocumentIn(api, { projectId: made.projectId, serviceId, label: `${label} memoriu`, fileName: 'TEST memoriu.pdf', pages });
  for (const [key, value, qualifier, page] of [
    [FIELD.floors, 3, 'upper', 1],
    [FIELD.rooms, 20, 'guest_rooms', 2],
    [FIELD.zones, 6, 'hvac_control', 3],
  ] as const) {
    await documentValue(api, { projectId: made.projectId, serviceId, subjectId: made.buildingId, field: productionFieldOf(key), value: { quantity: { value, unit: 'count', qualifier } }, from: [{ document: memoriu, page, excerpt: pages[page - 1] ?? '' }] });
  }
  return made;
}

/** The input candidates a snapshot read (the engine's own values left out), each with its hash: what a record rests on. */
async function inputsOf(projectId: string, snapshotId: string): Promise<{ readonly candidateId: string; readonly candidateHash: string }[]> {
  const named = await api.database.asAdministrator<{ candidate_id: string }>('SELECT candidate_id FROM sovitech.proposal_snapshot_candidates WHERE snapshot_id = $1', [snapshotId]);
  const candidates = await withRequest(api.database.app, { userId: ownerIdOf(), projectId }, (request) => readCandidates(request, named.map((row) => row.candidate_id)));
  return candidates.filter((candidate) => candidate.source !== 'calculated' && candidate.source !== 'estimated').map((candidate) => ({ candidateId: candidate.id, candidateHash: candidateHashOf(candidate) }));
}

/** A TEST quotation record naming the snapshot, issued today (the store's date), naming TEST accounts only. */
async function testRecord(projectId: string, snapshotId: string, inputs: readonly { readonly candidateId: string; readonly candidateHash: string }[], issuedOn?: string): Promise<string> {
  const [today] = await api.database.asAdministrator<{ day: string; until: string }>("SELECT (now() AT TIME ZONE 'UTC')::date::text AS day, ((now() AT TIME ZONE 'UTC')::date + 30)::text AS until");
  const engineerId = await createTestAccount(api.database, { label: 'G10-2 record engineer', kind: 'person', roles: ['sovitech_engineer'] });
  const reviewerId = await createTestAccount(api.database, { label: 'G10-2 record commercial reviewer', kind: 'person', roles: [] });
  return insertTestQuotationRecord(api.database, {
    projectId,
    scopeUserId: ownerIdOf(),
    snapshotId,
    reviewingEngineerId: engineerId,
    commercialReviewerId: reviewerId,
    issuedOn: issuedOn ?? today?.day ?? '',
    validUntil: today?.until ?? '',
    inputs,
  });
}

/** The stored proposal's stage 2 price, with its stage label's and Superseded line's texts. */
async function stage2Of(projectId: string, snapshotId: string): Promise<{ readonly stageId: string | null; readonly stage: string | undefined; readonly quotationRecordId: string | null; readonly superseded: string | undefined }> {
  const response = await get(projectId, `proposals/${snapshotId}`);
  expect(response.statusCode, response.body).toBe(200);
  const proposal = ProposalResponseSchema.parse(response.json());
  const displays = byId(proposal.displayObjects);
  const output = proposal.view.investment.outputs.find((entry) => entry.output === 'capex.preliminaryEstimate');
  expect(output?.availability).toBe('figure');
  expect(proposal.view.headline.investment.price).toEqual(output?.price);
  const price = output?.price;
  return {
    stageId: price?.stageId ?? null,
    // Phase 6, V-11: the stage label and the Superseded line are served once, among the figure's own lines.
    stage: price === undefined || price === null ? undefined : displays.get(price.figure)?.lines?.find((line) => line.kind === 'stage_label')?.text,
    quotationRecordId: price?.quotationRecordId ?? null,
    superseded: price === undefined || price === null ? undefined : displays.get(price.figure)?.lines?.find((line) => line.id === 'superseded_inputs_changed')?.text,
  };
}

/** The Superseded line of an exported proposal's Reports row, or undefined. */
async function reportsLineOf(projectId: string, outputId: string): Promise<string | undefined> {
  const response = await get(projectId, 'reports');
  expect(response.statusCode, response.body).toBe(200);
  const reports = ReportsResponseSchema.parse(response.json());
  const row = reports.view.rows.find((entry) => entry.outputId === outputId);
  expect(row).toBeDefined();
  return row?.superseded === null || row?.superseded === undefined ? undefined : byId(reports.displayObjects).get(row.superseded)?.text;
}

async function exportOf(projectId: string, snapshotId: string): Promise<string> {
  const recorded = await post(projectId, `proposals/${snapshotId}/exports`);
  expect(recorded.statusCode, recorded.body).toBe(201);
  return ExportResponseSchema.parse(recorded.json()).outputId;
}

const SUPERSEDED = /^Superseded: inputs changed on \d{1,2} [A-Z][a-z]{2} \d{4}$/u;

describe('G10-2 (the API half) · R-119 · rule 10: TEST quotation records over a TEST figure (the TEST catalogue)', () => {
  beforeAll(async () => {
    await startGroup({ registry: testRegistry({ fields: TEST_OUTPUT_FIELDS }), engine: { catalogue: testCatalogue({ mirrored: true }), datasets: testDatasetAccess() } });
  }, 180_000);

  afterAll(async () => {
    await api?.stop();
  });

  it('G10-2 · G10-9 · A-4 · R-119: a current TEST record reads "Formal quotation" with its id; an input Unknown at issue answered after it puts "Superseded: inputs changed on <date>" on the proposal and its Reports row', LONG, async () => {
    const { projectId } = await figureProject('G10-2 current');
    const snapshotId = await generate(projectId);
    const recordId = await testRecord(projectId, snapshotId, await inputsOf(projectId, snapshotId));
    const outputId = await exportOf(projectId, snapshotId);
    expect(await stage2Of(projectId, snapshotId)).toEqual({ stageId: 'formal_quotation', stage: 'Formal quotation', quotationRecordId: recordId, superseded: undefined });
    expect(await reportsLineOf(projectId, outputId)).toBeUndefined();

    // An automation area, Unknown when the record was issued (it could not list it), is answered: the figure is out of
    // date, and the record no longer covers it (rule 10: the figures return to stage 2 labels).
    const [area] = AUTOMATION_AREAS;
    await edit(projectId, projectId, automationFieldKey(area?.id ?? ''), 'selected');
    const after = await stage2Of(projectId, snapshotId);
    expect(after).toMatchObject({ stageId: 'preliminary_investment_estimate', stage: 'Preliminary investment estimate', quotationRecordId: null });
    expect(after.superseded).toMatch(SUPERSEDED);
    expect(await reportsLineOf(projectId, outputId)).toBe(after.superseded);
  });

  it('G10-2 · R-119 · rule 10: an input the record lists changes after issue: the proposal and its exported Reports row read "Superseded: inputs changed on <date>", the figure back at stage 2', LONG, async () => {
    const { projectId, buildingId } = await figureProject('G10-2 listed');
    const snapshotId = await generate(projectId);
    await testRecord(projectId, snapshotId, await inputsOf(projectId, snapshotId));
    const outputId = await exportOf(projectId, snapshotId);
    expect((await stage2Of(projectId, snapshotId)).stageId).toBe('formal_quotation');
    const [hotel] = await api.database.asAdministrator<{ id: string }>("SELECT id FROM sovitech.candidates WHERE project_id = $1 AND field_key = 'building.type'", [projectId]);
    await edit(projectId, buildingId, FIELD.buildingType, 'office', [hotel?.id ?? '']);
    const after = await stage2Of(projectId, snapshotId);
    expect(after).toMatchObject({ stageId: 'preliminary_investment_estimate', stage: 'Preliminary investment estimate', quotationRecordId: null });
    expect(after.superseded).toMatch(SUPERSEDED);
    expect(await reportsLineOf(projectId, outputId)).toBe(after.superseded);
  });

  it('G10-2 · V-2 · rule 7: a record with no inputs and a date-only issue day is read (200, never 500): the figure reads "Superseded" on its issue day, on the proposal, its print view and its Reports row', LONG, async () => {
    const { projectId } = await figureProject('G10-2 no inputs');
    const snapshotId = await generate(projectId);
    await testRecord(projectId, snapshotId, [], '2026-10-01');
    const outputId = await exportOf(projectId, snapshotId);
    const read = await stage2Of(projectId, snapshotId);
    expect(read).toMatchObject({ stageId: 'preliminary_investment_estimate', quotationRecordId: null, superseded: 'Superseded: inputs changed on 1 Oct 2026' });
    const print = await get(projectId, `proposals/${snapshotId}/print`);
    expect(print.statusCode, print.body).toBe(200);
    expect(await reportsLineOf(projectId, outputId)).toBe(read.superseded);
  });

  it('G10-2 · V-4 · R-119: a snapshot with no figure carries no "Superseded" on its Reports row, whatever record names it', LONG, async () => {
    const { projectId } = await newOwnerProject(api, owner, 'G10-2 no figure');
    const snapshotId = await generate(projectId);
    const [row] = await api.database.asAdministrator<{ candidate_id: string | null }>("SELECT candidate_id FROM sovitech.proposal_snapshot_outputs WHERE snapshot_id = $1 AND output_key = 'capex.preliminaryEstimate'", [snapshotId]);
    expect(row?.candidate_id).toBeNull();
    await testRecord(projectId, snapshotId, [], '2026-10-01');
    const outputId = await exportOf(projectId, snapshotId);
    expect(await reportsLineOf(projectId, outputId)).toBeUndefined();
    const proposal = await get(projectId, `proposals/${snapshotId}`);
    expect(proposal.statusCode, proposal.body).toBe(200);
    expect(ProposalResponseSchema.parse(proposal.json()).displayObjects.some((display) => display.text.startsWith('Superseded'))).toBe(false);
  });
});
