/**
 * The production registry of phase 1 against the rules its values come from
 * (docs/guardrails.md 2.6, rules 3, 4, 6, 7 and 8; prompt 3 5.2 "Registry
 * values": the strictest value, never an invented one). The sensitivity test on
 * the synthetic fixture project is G6-1's (tests/guardrails/G6-1.test.ts) and
 * the registry check's (tools/checks/registry).
 */
import { derive, NO_EVENTS, type Candidate, type FieldDefinition } from '@sovitech/domain';
import { describe, expect, it } from 'vitest';
import { registryLookups } from '../lookups';
import { unitByCode } from '../units/units';
import { PROPOSED_SETTINGS } from '../validation/policy';
import { validateRegistry } from '../validation/validate';
import { AUTOMATION_AREAS, GOALS, SYSTEMS } from './catalogue';
import { FIELD } from './formulas';
import { productionRegistry } from './index';

const byKey = new Map(productionRegistry.fields.map((field) => [field.key, field]));

describe('the production registry, phase 1', () => {
  it('passes registry validation in the production scope', () => {
    const validation = validateRegistry(productionRegistry, { scope: 'production' });
    expect(validation.problems).toEqual([]);
  });

  it('holds rule 7\'s four required fields, and nothing else is required', () => {
    const required = productionRegistry.fields.filter((field) => field.criticality === 'required');
    expect(required.map((field) => field.requiredSlot).sort()).toEqual(['city', 'country', 'project_name', 'project_type']);
  });

  it('holds the proposed first-estimate set: building type, gross floor area, one decision per system in scope', () => {
    const firstEstimate = productionRegistry.fields.filter((field) => field.criticality === 'first_estimate');
    expect(firstEstimate.filter((field) => field.firstEstimateSlot === 'systems_in_scope')).toHaveLength(SYSTEMS.length);
    expect(firstEstimate.map((field) => field.firstEstimateSlot).filter((slot) => slot !== 'systems_in_scope').sort()).toEqual(['building_type', 'gross_floor_area']);
  });

  it('holds one decision field per goal and per automation area on the project (2.6), and no "Other" goal', () => {
    for (const goal of GOALS) expect(byKey.get(`project.goal.${goal.id}`)?.kind).toBe('decision');
    for (const area of AUTOMATION_AREAS) expect(byKey.get(`project.automation.${area.id}`)?.kind).toBe('decision');
    expect(byKey.has('project.goal.other')).toBe(false);
  });

  it('keeps every strict value: no tolerance, no plausible range, estimation forbidden, no reference dataset, no minor item', () => {
    for (const field of productionRegistry.fields) {
      expect(field.tolerance, field.key).toBeUndefined();
      expect(field.plausible, field.key).toBeUndefined();
      expect(field.estimation, field.key).toBe('forbidden');
      expect(field.referenceDatasets ?? [], field.key).toEqual([]);
      expect(field.minorForTotals, field.key).toBeUndefined();
      expect(field.approvals, field.key).toBeUndefined();
    }
    expect(productionRegistry.datasets).toEqual([]);
    expect(productionRegistry.settings).toEqual(PROPOSED_SETTINGS);
  });

  it('asks an engineer to confirm every fact rule 3 does not give the owner', () => {
    const owner = productionRegistry.fields.filter((field) => field.confirmBy !== 'engineer');
    for (const field of owner) expect(field.confirmByBasis, field.key).toBeDefined();
    for (const key of [FIELD.grossFloorArea, FIELD.floors, FIELD.rooms, FIELD.zones]) expect(byKey.get(key)?.confirmBy).toBe('engineer');
    expect(productionRegistry.fields.filter((field) => field.confirmBy === 'either')).toEqual([]);
  });

  it('holds identity on the project name only (rule 6)', () => {
    expect(productionRegistry.fields.filter((field) => field.identity === true).map((field) => field.key)).toEqual([FIELD.projectName]);
  });

  it('orders questions by a unique impactRank', () => {
    const ranks = productionRegistry.fields.map((field) => field.impactRank);
    expect(new Set(ranks).size).toBe(ranks.length);
  });

  it('offers "Seasonal" on the schedule question only (guardrails section 5, step 5)', () => {
    expect(byKey.get(FIELD.operatingSchedule)?.options).toContain('seasonal');
    expect(byKey.get(FIELD.occupancy)?.options).not.toContain('seasonal');
  });

  it('never preselects Fire Safety, and holds it as a life-safety system (rule 11)', () => {
    const fire = SYSTEMS.find((system) => system.id === 'fire_safety');
    expect(fire).toMatchObject({ lifeSafety: true, neverPreselected: true });
    expect(SYSTEMS.filter((system) => system.lifeSafety).map((system) => system.id)).toEqual(['fire_safety']);
  });

  it('declares an unknownPolicy on every formula signature, and names every consumer an affects entry uses', () => {
    for (const formula of productionRegistry.formulas) expect(formula.unknownPolicy, formula.id).toBeDefined();
    const consumers = new Set([
      ...productionRegistry.formulas.map((formula) => `formula:${formula.id}@${formula.version}`),
      ...productionRegistry.templateSlots.map((slot) => `template:${slot.id}`),
    ]);
    for (const field of productionRegistry.fields) for (const entry of field.affects) expect(consumers.has(entry.via), `${field.key}: ${entry.via}`).toBe(true);
  });
});

describe('the registry as the domain takes it', () => {
  const lookups = registryLookups(productionRegistry);

  it('hands derive a 2.6 FieldDefinition and the proposed stage order', () => {
    const field: FieldDefinition | undefined = lookups.field(FIELD.projectName);
    expect(field?.key).toBe(FIELD.projectName);
    expect(lookups.unit('m2')).toEqual({ code: 'm2', symbol: 'm²', dimension: 'area' });
    expect(lookups.unit('furlong')).toBeUndefined();
    expect(lookups.stageOrder).toEqual(PROPOSED_SETTINGS.documentStageOrder.tiers);
  });

  it('lets derive read a production field: the owner\'s own answer is known', () => {
    const field = lookups.field(FIELD.projectType);
    expect(field).toBeDefined();
    if (field === undefined) return;
    const answer: Candidate = {
      id: 'test-cand-registry-type',
      subjectId: 'test-project-registry',
      fieldKey: field.key,
      choice: 'renovation',
      source: 'user',
      evidence: [],
      createdBy: 'test-owner',
      createdAt: '2026-09-25T09:00:00.000Z',
    };
    const state = derive(field, [answer], NO_EVENTS, {
      subjectId: 'test-project-registry',
      document: () => undefined,
      unit: unitByCode,
      inputState: () => undefined,
      datasetApproved: () => false,
      stageOrder: lookups.stageOrder,
    });
    expect(state.state).toBe('known');
    expect(state.activeCandidateId).toBe(answer.id);
  });
});
