import { describe, expect, it } from 'vitest';
import { DisplayObjectSchema, LevelRegisterSchema, ROUTES, VALUE_ID_PATTERN, ZoneDetailSchema, isDisplayObjectRequest, pathOf, servedDisplayOf, type DisplayObject } from './index';

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
