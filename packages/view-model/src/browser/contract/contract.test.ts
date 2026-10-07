import { describe, expect, it } from 'vitest';
import {
  ADMIN_PAGES,
  AccountsViewSchema,
  AdminAccountsResponseSchema,
  DisplayObjectSchema,
  FinancialOverviewViewSchema,
  LevelRegisterSchema,
  METRICS_PAGES,
  OpexResponseSchema,
  OpexViewSchema,
  PriceSchema,
  ProposalOutputSchema,
  ROUTES,
  SERIES_KEY_PATTERN,
  SPEED_TRUTH_PAIRS,
  SeriesPointSchema,
  SeriesSchema,
  VALUE_ID_PATTERN,
  WORKSPACE_PAGES,
  ZoneDetailSchema,
  isDisplayObjectRequest,
  pathOf,
  routeById,
  servedDisplayOf,
  type DisplayObject,
} from './index';

const PROJECT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e9f';

describe('ADR 0036 · F-RENDER-06: the wizard contract', () => {
  it('ADR 0036: every route id and every method-and-path pair is listed once', () => {
    const ids = ROUTES.map((route) => route.id);
    expect(new Set(ids).size).toBe(ids.length);
    const pairs = ROUTES.map((route) => `${route.method} ${route.path}`);
    expect(new Set(pairs).size).toBe(pairs.length);
  });

  it('ADR 0036: every state-changing route needs the CSRF token (prompt 3 section 11)', () => {
    for (const route of ROUTES) {
      if (route.method !== 'GET') expect(route.csrf, route.id).toBe(true);
    }
  });

  it('ADR 0036 · F-RENDER-06: the render test reads display objects from exactly the routes that serve them', () => {
    expect(isDisplayObjectRequest('GET', `/api/projects/${PROJECT}/steps/3`)).toBe(true);
    expect(isDisplayObjectRequest('GET', `/api/projects/${PROJECT}/late-findings`)).toBe(true);
    expect(isDisplayObjectRequest('POST', `/api/projects/${PROJECT}/fields/edit`)).toBe(true);
    expect(isDisplayObjectRequest('GET', '/api/projects')).toBe(true);
    expect(isDisplayObjectRequest('POST', '/api/projects')).toBe(false);
    expect(isDisplayObjectRequest('GET', `/api/projects/${PROJECT}/documents`)).toBe(false);
    expect(isDisplayObjectRequest('PUT', `/api/projects/${PROJECT}/uploads/${PROJECT}`)).toBe(false);
    expect(isDisplayObjectRequest('GET', '/api/auth/session')).toBe(false);
  });

  it('ADR 0036: paths are filled from their parameters and refused without one', () => {
    expect(pathOf('steps.view', { projectId: PROJECT, step: 3 })).toBe(`/api/projects/${PROJECT}/steps/3`);
    expect(() => pathOf('steps.view', { projectId: PROJECT })).toThrow(/step/u);
  });

  it('ADR 0036 · G2-1: value ids follow the render contract and never put an id after a dot', () => {
    expect(VALUE_ID_PATTERN.test(`project:${PROJECT}.openItems.owner`)).toBe(true);
    expect(VALUE_ID_PATTERN.test(`document:${PROJECT}.revisionNotice`)).toBe(true);
    expect(VALUE_ID_PATTERN.test(`project:x.revisions.${PROJECT}`)).toBe(false);
  });

  it('ADR 0036 · F-RENDER-06: the render projection carries the badge, source, lines, confirmation wording and parts a value element shows', () => {
    const display: DisplayObject = DisplayObjectSchema.parse({
      valueId: `building:${PROJECT}.type`,
      kind: 'field',
      text: 'Hotel',
      shape: 'value',
      badge: { id: 'possible', label: 'Possible' },
      sourceLine: { id: 'document_page', kind: 'source_line', text: 'Found in TEST schedule, page 2' },
      lines: [{ id: 'provide_later', kind: 'rule_line', text: 'You can provide this later.' }],
      actions: [{ kind: 'confirm', candidateId: PROJECT, wording: { id: 'yes_building_type', kind: 'rule_line', text: "Yes, it's a hotel" } }],
    });
    expect(servedDisplayOf(display)).toEqual({
      text: 'Hotel',
      lines: ['Possible', 'Found in TEST schedule, page 2', 'You can provide this later.', "Yes, it's a hotel"],
    });
  });

  it('ADR 0036 · rule 7: a missing value shows its wording once, never a zero or a blank', () => {
    const missing = DisplayObjectSchema.parse({
      valueId: `building:${PROJECT}.grossFloorArea`,
      kind: 'field',
      text: 'Not provided yet',
      shape: 'missing',
      missing: 'not_provided_yet',
      badge: { id: 'not_provided_yet', label: 'Not provided yet' },
    });
    expect(servedDisplayOf(missing)).toEqual({ text: 'Not provided yet' });
    expect(DisplayObjectSchema.safeParse({ ...missing, text: '' }).success).toBe(false);
  });

  it('ADR 0044 · F-RENDER-06: every workspace read serves display objects, and the raw phase 2 document routes do not', () => {
    for (const route of ROUTES.filter((candidate) => candidate.phase === 4)) {
      expect(route.servesDisplayObjects, route.id).toBe(true);
      expect(route.session, route.id).toBe(true);
    }
    expect(isDisplayObjectRequest('GET', `/api/projects/${PROJECT}/workspace`)).toBe(true);
    expect(isDisplayObjectRequest('GET', `/api/projects/${PROJECT}/workspace/documents`)).toBe(true);
    expect(isDisplayObjectRequest('GET', `/api/projects/${PROJECT}/workspace/documents/${PROJECT}/delete-effect`)).toBe(true);
    expect(isDisplayObjectRequest('POST', `/api/projects/${PROJECT}/workspace/system-scope/decisions`)).toBe(true);
    expect(isDisplayObjectRequest('GET', `/api/projects/${PROJECT}/workspace/equipment/${PROJECT}`)).toBe(true);
    expect(isDisplayObjectRequest('DELETE', `/api/projects/${PROJECT}/documents/${PROJECT}`)).toBe(false);
    expect(pathOf('workspace.asset', { projectId: PROJECT, assetId: PROJECT })).toBe(`/api/projects/${PROJECT}/workspace/equipment/${PROJECT}`);
  });

  it('V-4 · G7-16 · rule 4 · rule 7: the level register\'s conflict branch carries the floors field\'s own display and the action to resolve it, never the line alone', () => {
    const line = `project:${PROJECT}.floors.conflict`;
    const field = `building:${PROJECT}.floors`;
    expect(LevelRegisterSchema.safeParse({ state: 'conflict', line }).success).toBe(false);
    expect(LevelRegisterSchema.safeParse({ state: 'conflict', line, field, actions: ['enter_floors'] }).success).toBe(true);
    expect(LevelRegisterSchema.safeParse({ state: 'conflict', line, field, actions: [] }).success).toBe(true);
    expect(LevelRegisterSchema.safeParse({ state: 'conflict', line, field, actions: ['enter_floors'], levels: [] }).success).toBe(false);
  });

  it('V-6 · rule 11 · 7.1.1-L1: a zone\'s system chips carry the decision, the catalogue system and its life-safety flag', () => {
    const detail = {
      zoneId: PROJECT,
      fields: [`zone:${PROJECT}.code`],
      systemDecisions: [{ decision: `project:${PROJECT}.scope.fire_safety`, systemId: 'fire_safety', lifeSafety: true }],
      equipment: `project:${PROJECT}.register.total`,
      points: `zone:${PROJECT}.points`,
      documents: [],
    };
    expect(ZoneDetailSchema.safeParse(detail).success).toBe(true);
    expect(ZoneDetailSchema.safeParse({ ...detail, systemDecisions: [`project:${PROJECT}.scope.fire_safety`] }).success).toBe(false);
    expect(ZoneDetailSchema.safeParse({ ...detail, systemDecisions: [{ decision: `project:${PROJECT}.scope.fire_safety`, systemId: 'fire_safety' }] }).success).toBe(false);
  });
});

describe('ADR 0049 · F-RENDER-06 · F-PRICE-01: the phase 5 contract (the proposal, Reports and exports)', () => {
  const SNAPSHOT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e90';

  it('ADR 0049: the stored proposal\'s views serve display objects; Generate, the export record and the two file routes do not; every write checks the CSRF token', () => {
    expect(isDisplayObjectRequest('GET', `/api/projects/${PROJECT}/proposals`)).toBe(true);
    expect(isDisplayObjectRequest('GET', `/api/projects/${PROJECT}/proposals/${SNAPSHOT}`)).toBe(true);
    expect(isDisplayObjectRequest('GET', `/api/projects/${PROJECT}/proposals/${SNAPSHOT}/print`)).toBe(true);
    expect(isDisplayObjectRequest('GET', `/api/projects/${PROJECT}/reports`)).toBe(true);
    expect(isDisplayObjectRequest('POST', `/api/projects/${PROJECT}/proposals`)).toBe(false);
    expect(isDisplayObjectRequest('POST', `/api/projects/${PROJECT}/proposals/${SNAPSHOT}/exports`)).toBe(false);
    expect(isDisplayObjectRequest('GET', `/api/projects/${PROJECT}/exports/${SNAPSHOT}/file`)).toBe(false);
    expect(isDisplayObjectRequest('GET', `/api/projects/${PROJECT}/exports/equipment`)).toBe(false);
    for (const id of ['proposals.generate', 'proposals.export'] as const) expect(routeById(id).csrf, id).toBe(true);
    expect(pathOf('proposals.print', { projectId: PROJECT, snapshotId: SNAPSHOT })).toBe(`/api/projects/${PROJECT}/proposals/${SNAPSHOT}/print`);
  });

  it('ADR 0049 · G2-7 · G9-8: the snapshot\'s value ids are its own, with the output keys as written', () => {
    expect(VALUE_ID_PATTERN.test(`proposal:${SNAPSHOT}.outputs.capex.preliminaryEstimate`)).toBe(true);
    expect(VALUE_ID_PATTERN.test(`proposal:${SNAPSHOT}.outputs.capex.preliminaryEstimate.stage`)).toBe(true);
    expect(VALUE_ID_PATTERN.test(`proposal:${SNAPSHOT}.inputs.building.grossFloorArea`)).toBe(true);
    expect(VALUE_ID_PATTERN.test(`output:${SNAPSHOT}.generatedAt`)).toBe(true);
  });

  it('ADR 0049 · rule 10 · G10-9 · G10-11: a price names a quotation record only beside a stage, and an output with no figure carries no stage of its own', () => {
    const figure = `proposal:${SNAPSHOT}.outputs.capex.preliminaryEstimate`;
    expect(PriceSchema.safeParse({ figure, stageId: null, quotationRecordId: null }).success).toBe(true);
    expect(PriceSchema.safeParse({ figure, stageId: 'formal_quotation', quotationRecordId: SNAPSHOT }).success).toBe(true);
    expect(PriceSchema.safeParse({ figure, stageId: 'final_price', quotationRecordId: null }).success).toBe(false);
    const output = { output: 'capex.preliminaryEstimate', formula: { id: 'capexPreliminaryEstimate', version: '1' }, display: figure, availability: 'not_available_yet', incomplete: false, outOfDate: false, price: null };
    expect(ProposalOutputSchema.safeParse(output).success).toBe(true);
    expect(ProposalOutputSchema.safeParse({ ...output, availability: 'zero' }).success).toBe(false);
  });

  it('V-11 (phase 5 part B, fixed in phase 6) · rule 10 · G10-2: a price serves its stage label and its Superseded line once, inside its figure\'s display: the contract has no field for a second copy', () => {
    const figure = `proposal:${SNAPSHOT}.outputs.capex.preliminaryEstimate`;
    expect(PriceSchema.safeParse({ figure, stage: `${figure}.stage`, stageId: 'preliminary_investment_estimate', quotationRecordId: null }).success).toBe(false);
    expect(PriceSchema.safeParse({ figure, stageId: 'preliminary_investment_estimate', quotationRecordId: null, superseded: `${figure}.superseded` }).success).toBe(false);
  });
});

describe('ADR 0052 · F-RENDER-06 · F-RENDER-07: the phase 6 contract (the Metrics pages and their chart series)', () => {
  const SNAPSHOT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e90';
  const series = (extra: Record<string, unknown>) => ({
    series: 'capex.bySystem',
    kind: 'breakdown',
    state: 'not_available_yet',
    source: null,
    notAvailable: `proposal:${SNAPSHOT}.series.capex.bySystem.notAvailable`,
    total: null,
    points: [],
    zero: null,
    ...extra,
  });
  const point = (key: string, plot: unknown, price: unknown = null) => ({
    key,
    name: `proposal:${SNAPSHOT}.series.capex.bySystem.points.${key}.name`,
    value: `proposal:${SNAPSHOT}.outputs.capex.bySystem.${key}`,
    price,
    plot,
  });

  it('ADR 0052 · R-093 · R-121: every Metrics read and print view serves display objects, the export answers a file, every route is a session GET', () => {
    for (const route of ROUTES.filter((candidate) => candidate.phase === 6)) {
      expect(route.method, route.id).toBe('GET');
      expect(route.session, route.id).toBe(true);
      expect(route.servesDisplayObjects, route.id).toBe(route.id !== 'exports.metrics');
    }
    for (const page of ['financial-overview', 'capex', 'opex', 'payback', 'lifecycle', 'payback/print', 'lifecycle/print']) {
      expect(isDisplayObjectRequest('GET', `/api/projects/${PROJECT}/metrics/${page}`), page).toBe(true);
    }
    expect(isDisplayObjectRequest('GET', `/api/projects/${PROJECT}/exports/metrics/payback`)).toBe(false);
    expect(pathOf('exports.metrics', { projectId: PROJECT, page: 'lifecycle' })).toBe(`/api/projects/${PROJECT}/exports/metrics/lifecycle`);
    expect(WORKSPACE_PAGES.slice(-METRICS_PAGES.length)).toEqual([...METRICS_PAGES]);
  });

  it('ADR 0052 · rule 1 · rule 7 · G1-31: a series that is not available names what is missing and draws no point, total or zero; one with figures names its snapshot and formula version and has a point', () => {
    expect(SeriesSchema.safeParse(series({})).success).toBe(true);
    expect(SeriesSchema.safeParse(series({ notAvailable: null })).success).toBe(false);
    expect(SeriesSchema.safeParse(series({ points: [point('hvac', null)] })).success).toBe(false);
    expect(SeriesSchema.safeParse(series({ zero: 0 })).success).toBe(false);
    const source = { snapshotId: SNAPSHOT, formula: { id: 'TEST-capexBySystem', version: '1.0.0' } };
    const figures = { state: 'figures', notAvailable: null, source, points: [point('hvac', { low: 100, high: 400, mark: 250 })] };
    expect(SeriesSchema.safeParse(series(figures)).success).toBe(true);
    expect(SeriesSchema.safeParse(series({ ...figures, source: null })).success).toBe(false);
    expect(SeriesSchema.safeParse(series({ ...figures, points: [] })).success).toBe(false);
    expect(SeriesSchema.safeParse(series({ ...figures, kind: 'sequence', total: { kind: 'value', output: 'TEST', display: `proposal:${SNAPSHOT}.outputs.TEST_total` } })).success).toBe(false);
  });

  it('ADR 0052 · rule 1 "A chart shows an unknown as a labelled gap" · G1-5 · G9-9: a gap has no plot; a plotted range runs low to high with its mark inside; positions are thousandths of the plot', () => {
    expect(SeriesPointSchema.safeParse(point('fire_safety', null)).success).toBe(true);
    expect(SeriesPointSchema.safeParse(point('hvac', { low: 400, high: 100, mark: null })).success).toBe(false);
    expect(SeriesPointSchema.safeParse(point('hvac', { low: 100, high: 400, mark: 500 })).success).toBe(false);
    expect(SeriesPointSchema.safeParse(point('hvac', { low: 0, high: 1001, mark: null })).success).toBe(false);
    expect(SeriesPointSchema.safeParse(point('hvac', { low: 0.5, high: 10, mark: null })).success).toBe(false);
    expect(SERIES_KEY_PATTERN.test('capex.TEST_bySystem')).toBe(true);
    expect(SERIES_KEY_PATTERN.test('TEST-capexBySystem')).toBe(false);
    expect(VALUE_ID_PATTERN.test(`proposal:${SNAPSHOT}.series.capex.TEST_bySystem.points.hvac.name`)).toBe(true);
  });

  it('A-3 (phase 6 part B) · rule 10: a part of a priced breakdown is served as a price whose figure is its value; a breakdown whose total is a price has no part without one', () => {
    const source = { snapshotId: SNAPSHOT, formula: { id: 'TEST-capexBySystem', version: '1.0.0' } };
    const stage = (key: string) => ({ figure: `proposal:${SNAPSHOT}.outputs.capex.bySystem.${key}`, stageId: 'preliminary_investment_estimate', quotationRecordId: null });
    expect(SeriesPointSchema.safeParse(point('hvac', { low: 100, high: 400, mark: 250 }, stage('hvac'))).success).toBe(true);
    expect(SeriesPointSchema.safeParse(point('hvac', { low: 100, high: 400, mark: 250 }, stage('cctv'))).success).toBe(false);
    const total = { kind: 'price', output: 'capex.preliminaryEstimate', price: { figure: `proposal:${SNAPSHOT}.outputs.capex.preliminaryEstimate`, stageId: 'preliminary_investment_estimate', quotationRecordId: null } };
    const priced = { state: 'figures', notAvailable: null, source, total };
    expect(SeriesSchema.safeParse(series({ ...priced, points: [point('hvac', { low: 100, high: 400, mark: 250 }, stage('hvac')), point('cctv', null, stage('cctv'))] })).success).toBe(true);
    expect(SeriesSchema.safeParse(series({ ...priced, points: [point('hvac', { low: 100, high: 400, mark: 250 })] })).success).toBe(false);
  });

  it('A-8 (phase 6 part B) · rule 7 · rule 12: a Metrics response that names a value id it does not serve is refused (the API answers 500, the page reads that it could not be loaded), never an empty tile or a missing printed row', () => {
    const BUILDING = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e70';
    const b = (path: string) => `building:${BUILDING}.operatingCost.${path}`;
    const line = (valueId: string): DisplayObject => ({ valueId, kind: 'line', text: 'Not available yet: TEST item', shape: 'missing', missing: 'not_available_yet' });
    const view = {
      total: b('total'),
      energy: { display: b('energy'), actions: [] },
      maintenance: b('maintenance'),
      staff: b('staff'),
      other: b('other'),
      intensity: b('intensity'),
      breakdown: b('breakdown'),
      systems: [],
      noSystems: { line: b('systems'), actions: ['choose_systems'] },
    };
    const name: DisplayObject = { valueId: `project:${PROJECT}.name`, kind: 'field', text: 'TEST project', shape: 'value' };
    const header = { projectId: PROJECT, name: name.valueId, isDemo: false, demoLine: null };
    const all = [name, ...['total', 'energy', 'maintenance', 'staff', 'other', 'intensity', 'breakdown', 'systems'].map((path) => line(b(path)))];
    const response = (displayObjects: readonly DisplayObject[]) => ({ asOf: '2026-10-07T09:00:00.000Z', project: header, displayObjects, view });
    expect(OpexResponseSchema.safeParse(response(all)).success).toBe(true);
    expect(OpexResponseSchema.safeParse(response(all.filter((display) => display.valueId !== b('staff')))).success).toBe(false);
    expect(OpexResponseSchema.safeParse(response(all.filter((display) => display.valueId !== name.valueId))).success).toBe(false);
  });

  it('G7-24 (contract) · V-1 (phase 6 part B) · rule 7: OPEX & Savings serves its "by system" line exactly when it serves no row, never an empty table', () => {
    const b = (path: string) => `building:0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e70.operatingCost.${path}`;
    const base = { total: b('total'), energy: { display: b('energy'), actions: [] }, maintenance: b('maintenance'), staff: b('staff'), other: b('other'), intensity: b('intensity'), breakdown: b('breakdown') };
    const row = { systemId: 'hvac', decision: `project:${PROJECT}.scope.hvac`, current: b('systems.hvac') };
    const line = { line: b('systems'), actions: ['choose_systems'] };
    expect(OpexViewSchema.safeParse({ ...base, systems: [], noSystems: line }).success).toBe(true);
    expect(OpexViewSchema.safeParse({ ...base, systems: [row], noSystems: null }).success).toBe(true);
    expect(OpexViewSchema.safeParse({ ...base, systems: [], noSystems: null }).success).toBe(false);
    expect(OpexViewSchema.safeParse({ ...base, systems: [row], noSystems: line }).success).toBe(false);
  });

  it('ADR 0052 · rule 7 · R-093 AC4: a page with no stored proposal names what is missing with the one action that opens the Proposal page', () => {
    const line = `project:${PROJECT}.metrics.source`;
    expect(FinancialOverviewViewSchema.safeParse({ state: 'none_generated', line, actions: ['open_proposal'] }).success).toBe(true);
    expect(FinancialOverviewViewSchema.safeParse({ state: 'none_generated', line, actions: [] }).success).toBe(false);
  });
});

describe('V-11 (phase 5 part B, fixed in phase 6): the price contract after the fix', () => {
  it('V-11 · rule 10: the price has three fields: its figure, its stage id and its quotation record (the lines live in the figure\'s display)', () => {
    expect(Object.keys(PriceSchema.shape).sort()).toEqual(['figure', 'quotationRecordId', 'stageId']);
  });
});

describe('ADR 0053 (phase 7 planner): the development-only admin contract', () => {
  const ADMIN_ROUTES = ['admin.accounts', 'admin.datasets', 'admin.guardrailEvents'] as const;
  const USER = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e71';
  const EVENT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e72';
  const record = (valueId: string, text: string): DisplayObject => ({ valueId, kind: 'record', text, shape: 'value' });

  it('ADR 0053 · R-154 "Until decided" · prompt 3 5.4: the admin routes are session reads of phase 7, none of them writes, and each serves display objects', () => {
    for (const id of ADMIN_ROUTES) {
      const route = routeById(id);
      expect(route.method, id).toBe('GET');
      expect(route.csrf, id).toBe(false);
      expect(route.session, id).toBe(true);
      expect(route.servesDisplayObjects, id).toBe(true);
      expect(route.phase, id).toBe(7);
      expect(route.refusals, id).toEqual(['404 admin_off', '403 admin_only']);
      expect(isDisplayObjectRequest('GET', route.path), id).toBe(true);
    }
    expect(ROUTES.filter((route) => route.path.startsWith('/api/admin')).map((route) => route.id).sort()).toEqual([...ADMIN_ROUTES].sort());
  });

  it('ADR 0053 · G2-1: the admin value ids follow the render contract', () => {
    for (const valueId of [
      `account:${USER}.displayName`,
      `account:${USER}.roles.sovitech_admin.since`,
      `role_event:${EVENT}.reason`,
      `admin_project:${PROJECT}.id`,
      'dataset:sovitech-cost-ranges.approval',
      `guardrail_count:${PROJECT}.question_for_known_field`,
      'guardrail_count:all.byRelease',
      `metric:${PROJECT}.questions_per_project.target`,
      'calibration:all.threshold',
      'calibration:high.items.building.type.corrections',
      `erasure:${EVENT}.removed`,
    ]) {
      expect(VALUE_ID_PATTERN.test(valueId), valueId).toBe(true);
    }
  });

  it('ADR 0053 · rule 7: an admin response serves every value id its view names', () => {
    const name = `account:${USER}.displayName`;
    const since = `account:${USER}.roles.sovitech_admin.since`;
    const view = {
      accounts: [{ userId: USER, name, kind: 'person', roles: [{ role: 'sovitech_admin', since }], development: true }],
      roleEvents: [],
      projects: [],
      processors: { state: 'none_chosen' },
    };
    const response = (displayObjects: readonly DisplayObject[]) => ({ asOf: '2026-10-07T09:00:00.000Z', displayObjects, view });
    const all = [record(name, 'Development admin'), { valueId: since, kind: 'line' as const, text: '7 Oct 2026', shape: 'value' as const }];
    expect(AdminAccountsResponseSchema.safeParse(response(all)).success).toBe(true);
    expect(AdminAccountsResponseSchema.safeParse(response(all.filter((display) => display.valueId !== since))).success).toBe(false);
  });

  it('ADR 0053 · R-143 "Until decided": the processors read none chosen, and nothing else', () => {
    expect(AccountsViewSchema.shape.processors.safeParse({ state: 'none_chosen' }).success).toBe(true);
    expect(AccountsViewSchema.shape.processors.safeParse({ state: 'chosen', names: ['any'] }).success).toBe(false);
  });

  it('ADR 0053 · guardrails section 4 "Measure it": each speed metric sits next to its truth metric, three pairs in the table\'s order', () => {
    expect(SPEED_TRUTH_PAIRS.map((pair) => [pair.speed, pair.truth])).toEqual([
      ['questions_per_project', 'owner_correction_rate'],
      ['confirmations_per_project', 'engineer_corrections_of_accepted_items'],
      ['time_to_first_estimate', 'estimated_share_of_first_estimate'],
    ]);
    expect(ADMIN_PAGES).toEqual(['accounts', 'datasets', 'guardrail_events']);
  });
});
