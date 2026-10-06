/**
 * The workspace's view builders (phase 4; docs/adr/0044, 0045), on TEST projects in memory: the level labels, the delete
 * effect's count and words, Documents' order and declared revisions, the plan of System Scope's decisions, Equipment's
 * paging and filters, the asset detail's evidence and history, and Zones' filters. The guardrail cases (tests/guardrails:
 * G1-26, G1-27, G2-7, G7-14, G7-15, G11-10, G11-11, G12-10) prove the rules; these prove the mechanics around them.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { deriveAssetRegister, documentStatuses, type AssetAppearance, type AssetIdentity, type Candidate, type DocumentEvent, type DocumentRecord } from '@sovitech/domain';
import { GATE_IDS } from '@sovitech/registry/gates';
import { SYSTEMS, productionRegistry, scopeFieldKey } from '@sovitech/registry';
import type { RegistryFieldDefinition } from '@sovitech/registry/validation';
import type { DisplayObject } from '../browser/contract';
import { DEFAULT_FORMAT_OPTIONS } from '../formatting';
import { IntakeRefusal, type IntakeField } from '../intake';
import { resolveField } from '../resolver';
import { answered, events, found, intakeField, productionField, stateOf, testDocument, testField, testId } from '../test-builders';
import {
  DELETE_EFFECT,
  assetView,
  deleteEffectCount,
  deleteEffectDisplay,
  documentsView,
  equipmentView,
  levelKeyLabel,
  levelLabel,
  levelsOf,
  listedZones,
  planScopeDecisions,
  registerState,
  servedTag,
  zonesView,
  type WithoutDocument,
  type WorkspaceField,
  type WorkspaceProject,
} from '.';

const PROJECT = testId(1);
const BUILDING = testId(2);

interface TestFieldEntry {
  readonly field: RegistryFieldDefinition;
  readonly subjectId: string;
  readonly subjectKind: WorkspaceField['subjectKind'];
  readonly candidates?: readonly Candidate[];
}

interface TestProjectInput {
  readonly fields?: readonly TestFieldEntry[];
  readonly documents?: readonly DocumentRecord[];
  readonly documentEvents?: readonly DocumentEvent[];
  readonly fileNames?: Readonly<Record<string, string>>;
  readonly identities?: readonly AssetIdentity[];
  readonly appearances?: readonly AssetAppearance[];
  readonly zoneIds?: readonly string[];
}

/** The owner's deletion of a document, as `documents.delete` appends it. */
const deletion = (documentId: string): DocumentEvent => ({ documentId, type: 'withdrawn', by: 'test-owner', role: 'owner', at: '2026-10-02T11:00:00.000Z', reason: 'owner_deleted_document' });

/** The project as Delete would leave it, derived as the API derives it (the one derive, the register's derive), nothing stored. */
function without(input: TestProjectInput, documentId: string): WithoutDocument {
  const after = project({ ...input, documentEvents: [...(input.documentEvents ?? []), deletion(documentId)] });
  return { state: (subjectId, fieldKey) => after.field(subjectId, fieldKey)?.state, countable: after.register.countable };
}

/** A TEST project as the workspace reads it (the domain's derive and the one resolver, nothing stored). */
function project(input: TestProjectInput): WorkspaceProject {
  const documents = input.documents ?? [];
  const statuses = documentStatuses(input.documentEvents ?? [], (id) => documents.find((document) => document.id === id));
  const fields: WorkspaceField[] = (input.fields ?? []).map((entry) => ({
    field: entry.field,
    subjectId: entry.subjectId,
    subjectKind: entry.subjectKind,
    state: stateOf(entry.field, entry.subjectId, entry.candidates ?? [], events({ document: input.documentEvents ?? [] }), documents),
    candidates: entry.candidates ?? [],
    candidateEvents: [],
  }));
  const fieldOf = (subjectId: string, key: string): WorkspaceField | undefined => fields.find((entry) => entry.subjectId === subjectId && entry.field.key === key);
  return {
    projectId: PROJECT,
    buildingId: BUILDING,
    projectType: 'new_construction',
    documents,
    activeDocuments: documents.filter((document) => !statuses.removed(document.id)),
    fileName: (id) => input.fileNames?.[id],
    searched: false,
    closedGates: new Set(GATE_IDS),
    field: fieldOf,
    fields,
    resolve: (subjectId, key) => {
      const entry = fieldOf(subjectId, key);
      if (entry === undefined) return undefined;
      return resolveField({
        field: entry.field,
        subject: { id: subjectId, kind: entry.subjectKind },
        state: entry.state,
        candidates: entry.candidates,
        document: (id) => documents.find((document) => document.id === id),
        fileName: (id) => input.fileNames?.[id],
        projectType: 'new_construction',
        asked: false,
        searchedCoverage: undefined,
        actions: [],
        format: DEFAULT_FORMAT_OPTIONS,
      });
    },
    register: deriveAssetRegister({ projectId: PROJECT, identities: input.identities ?? [], appearances: input.appearances ?? [], events: [], documents: statuses }),
    appearances: input.appearances ?? [],
    zoneIds: input.zoneIds ?? [],
    suggestions: [],
    readingCount: 0,
  };
}

const byId = (displays: readonly DisplayObject[], id: string): DisplayObject | undefined => displays.find((display) => display.valueId === id);

describe('levels (R-076; ADR 0045 decision 3; D-18, English, owner decision 2026-10-05)', () => {
  it('R-076 · D-18: English labels, B1 the nearest the ground, GF, Level 1 the first floor above the ground; level types with no short label by their registered label, numbered only when counted more than once', () => {
    expect([levelLabel('below_ground', 1, 1), levelLabel('below_ground', 2, 3), levelLabel('ground', 1, 1), levelLabel('mezzanine', 1, 1), levelLabel('upper', 1, 1), levelLabel('upper', 12, 12), levelLabel('setback_or_technical', 2, 2)]).toEqual([
      'B1',
      'B2',
      'GF',
      'Mezzanine',
      'Level 1',
      'Level 12',
      'Setback or technical floor 2',
    ]);
    expect([levelLabel('semi_basement', 1, 1), levelLabel('attic', 2, 2), levelLabel('roof_plant', 1, 1)]).toEqual(['Semi-basement', 'Attic 2', 'Roof plant']);
    expect(levelsOf(new Map([['upper', 2], ['below_ground', 2], ['ground', 1], ['attic', 0]])).map((level) => level.label)).toEqual(['B2', 'B1', 'GF', 'Level 1', 'Level 2']);
  });

  it('D-18 · rule 8 "Floors": no label is a regim letter; the notation stays the floors field\'s original text', () => {
    const labels = levelsOf(new Map([['below_ground', 3], ['ground', 1], ['mezzanine', 1], ['upper', 12], ['setback_or_technical', 1]])).map((level) => level.label);
    for (const label of labels) expect(label).not.toMatch(/^(?:S\d*|P|Mz|E\d+|Er\d*)$/u);
  });
});

describe('the delete effect (UD-42; 2.3; ADR 0045 decision 7)', () => {
  it('7.1.1-D4 · US-DOCS-21 AC1: its words are the spec\'s, and a count of one takes the singular', () => {
    const spec = readFileSync(new URL('../../../../design/dashboards-spec.md', import.meta.url), 'utf8');
    expect(spec).toContain(DELETE_EFFECT.many.replace('{count} ', ''));
    expect(deleteEffectDisplay(`document:${testId(9)}.deleteEffect`, 1, DEFAULT_FORMAT_OPTIONS).text).toBe('1 value will return to Unknown');
    expect(deleteEffectDisplay(`document:${testId(9)}.deleteEffect`, 12, DEFAULT_FORMAT_OPTIONS)).toMatchObject({ text: '12 values will return to Unknown', parts: ['12'], kind: 'line' });
  });

  it('2.3 "Deleting a document": counts the fields the derive leaves Unknown with the document removed; not one kept by another active document or the owner', () => {
    const a = testDocument(10);
    const b = testDocument(11);
    const area = testField('building.testArea', { kind: 'quantity', subject: 'building', unit: 'm2' });
    const name = testField('building.testName', { kind: 'text', subject: 'building' });
    const onlyA = found({ id: 20, subjectId: BUILDING, field: area, document: a, value: { quantity: { value: 1, unit: 'm2' } }, minute: 1 });
    const fromB = found({ id: 21, subjectId: BUILDING, field: name, document: b, value: { text: 'TEST' }, minute: 1 });
    const fromA = found({ id: 22, subjectId: BUILDING, field: name, document: a, value: { text: 'TEST' }, minute: 2 });
    const own = answered({ id: 23, subjectId: BUILDING, field: area, value: { quantity: { value: 2, unit: 'm2' } }, minute: 3 });
    const both: TestProjectInput = {
      documents: [a, b],
      fields: [
        { field: area, subjectId: BUILDING, subjectKind: 'building', candidates: [onlyA] },
        { field: name, subjectId: BUILDING, subjectKind: 'building', candidates: [fromB, fromA] },
      ],
    };
    expect(deleteEffectCount(project(both), without(both, a.id))).toBe(1);
    // B already removed: the name now hangs on A alone.
    const bGone: TestProjectInput = { ...both, documentEvents: [deletion(b.id)] };
    expect(deleteEffectCount(project(bGone), without(bGone, a.id))).toBe(2);
    // The owner's own answer beside A's value keeps the field.
    const owned: TestProjectInput = { documents: [a], fields: [{ field: area, subjectId: BUILDING, subjectKind: 'building', candidates: [onlyA, own] }] };
    expect(deleteEffectCount(project(owned), without(owned, a.id))).toBe(0);
  });

  it('A-2 · 2.5: an asset the document alone shows leaves the count with it, and its tag counts as a value returning to Unknown; a tag another document writes stays', () => {
    const list = testDocument(10);
    const other = testDocument(11);
    const at = (document: DocumentRecord) => ({ documentId: document.id, contentHash: document.contentHash, locator: { page: 1 }, excerpt: 'TEST tags', check: 'text_match' as const });
    const tags = ['TEST-CTA-01', 'TEST-CTA-02', 'TEST-CTA-03'];
    const input: TestProjectInput = {
      documents: [list, other],
      identities: tags.map((tag, index) => ({ assetId: testId(600 + index), projectId: PROJECT, normalisedTag: tag })),
      appearances: [
        ...tags.map((tag, index) => ({ id: testId(700 + index), projectId: PROJECT, tagAsWritten: tag, evidence: [at(list)] })),
        { id: testId(710), projectId: PROJECT, tagAsWritten: 'TEST-CTA-03', evidence: [at(other)] },
      ],
    };
    expect(deleteEffectCount(project(input), without(input, list.id))).toBe(2);
    expect(deleteEffectCount(project(input), without(input, other.id))).toBe(0);
  });

  it('A-3 · 2.3 "Revisions are declared, never guessed": deleting a declared newer revision brings the older value back, so nothing returns to Unknown', () => {
    const older = testDocument(10);
    const newer = testDocument(11, 'unknown', { supersedes: older.id });
    const area = testField('building.testArea', { kind: 'quantity', subject: 'building', unit: 'm2' });
    const input: TestProjectInput = {
      documents: [older, newer],
      documentEvents: [{ documentId: newer.id, type: 'declared_revision_of', by: 'test-owner', role: 'owner', at: '2026-10-02T09:00:00.000Z', revisionOf: older.id }],
      fields: [
        {
          field: area,
          subjectId: BUILDING,
          subjectKind: 'building',
          candidates: [
            found({ id: 20, subjectId: BUILDING, field: area, document: older, value: { quantity: { value: 1000, unit: 'm2' } }, minute: 1 }),
            found({ id: 21, subjectId: BUILDING, field: area, document: newer, value: { quantity: { value: 1100, unit: 'm2' } }, minute: 2 }),
          ],
        },
      ],
    };
    expect(project(input).field(BUILDING, area.key)?.state.activeCandidateId).toBe(testId(21));
    expect(deleteEffectCount(project(input), without(input, newer.id))).toBe(0);
    expect(without(input, newer.id).state(BUILDING, area.key)).toMatchObject({ state: 'known', activeCandidateId: testId(20) });
    // Deleting the older one: the newer value stays (it never depended on the older document).
    expect(deleteEffectCount(project(input), without(input, older.id))).toBe(0);
  });
});

describe('Documents (DB-15)', () => {
  it('R-016 · R-028: newest first; "Revision of" only from a person\'s declaration of an active document; no row for a withdrawn document', () => {
    const older = testDocument(10);
    const newer = testDocument(11);
    const gone = testDocument(12);
    const view = documentsView(project({ documents: [older, newer, gone], documentEvents: [{ documentId: gone.id, type: 'withdrawn', by: 'test-owner', role: 'owner', at: '2026-10-02T09:00:00.000Z' }], fileNames: { [older.id]: 'A.pdf', [newer.id]: 'B.pdf' } }), [
      { documentId: older.id, format: 'pdf', addedAt: '2026-10-01T09:00:00.000Z', downloadable: true, declaredRevisionOf: null, kindSource: 'stored_default' },
      { documentId: newer.id, format: 'xlsx', addedAt: '2026-10-02T09:00:00.000Z', downloadable: false, declaredRevisionOf: older.id, kindSource: 'stored_default' },
      { documentId: gone.id, format: 'pdf', addedAt: '2026-10-02T10:00:00.000Z', downloadable: true, declaredRevisionOf: null, kindSource: 'stored_default' },
    ]);
    expect(view.view.rows.map((row) => row.documentId)).toEqual([newer.id, older.id]);
    expect(view.view.rows[0]?.revisionOf).toBe(`document:${older.id}.fileName`);
    expect(byId(view.displayObjects, `document:${older.id}.fileName`)?.text).toBe('A.pdf');
    expect(view.view.rows[1]?.revisionOf).toBeNull();
  });
});

describe('System Scope\'s decisions (R-052; planScopeDecisions)', () => {
  const scopeFields = productionRegistry.fields.filter((field) => field.key.startsWith('project.scope.'));
  const fields = (hvac: readonly Candidate[] = []): IntakeField[] => scopeFields.map((field) => intakeField(field, PROJECT, field.key === scopeFieldKey('hvac') ? hvac : []));
  const decision = (choice: 'include' | 'exclude', corrects: readonly string[] = [], fieldKey = scopeFieldKey('hvac'), subjectId = PROJECT) => ({ field: { subjectId, fieldKey }, choice, corrects: [...corrects] });

  it('7.1.1-C8 · G4-36: an equal decision writes nothing; a changed one names the shown value; a stale or foreign one is refused', () => {
    const include = answered({ id: 30, subjectId: PROJECT, field: productionField(scopeFieldKey('hvac')), value: { choice: 'include' }, minute: 1 });
    expect(planScopeDecisions({ projectId: PROJECT, fields: fields([include]), suggestions: [], request: { decisions: [decision('include', [include.id])], visibleSuggestions: [] } }).answers).toEqual([]);
    expect(planScopeDecisions({ projectId: PROJECT, fields: fields([include]), suggestions: [], request: { decisions: [decision('exclude', [include.id])], visibleSuggestions: [] } }).answers).toEqual([
      { fieldKey: scopeFieldKey('hvac'), subjectId: PROJECT, choice: 'exclude', rejects: [] },
    ]);
    const refused = (request: Parameters<typeof planScopeDecisions>[0]['request']): string => {
      try {
        planScopeDecisions({ projectId: PROJECT, fields: fields([include]), suggestions: [], request });
      } catch (error) {
        return error instanceof IntakeRefusal ? error.code : 'other';
      }
      return 'none';
    };
    expect(refused({ decisions: [decision('exclude')], visibleSuggestions: [] })).toBe('shown_value_changed');
    expect(refused({ decisions: [decision('exclude', [testId(99)])], visibleSuggestions: [] })).toBe('shown_value_changed');
    expect(refused({ decisions: [decision('include', [], 'project.goal.reduce_energy')], visibleSuggestions: [] })).toBe('answer_invalid');
    expect(refused({ decisions: [decision('include', [], scopeFieldKey('hvac'), testId(77))], visibleSuggestions: [] })).toBe('answer_invalid');
    expect(refused({ decisions: [decision('exclude', [include.id]), decision('exclude', [include.id])], visibleSuggestions: [] })).toBe('answer_invalid');
    expect(SYSTEMS).toHaveLength(8);
  });
});

describe('Equipment (DB-17) and the asset detail (UD-08)', () => {
  const list = testDocument(10);
  const evidence = { documentId: list.id, contentHash: list.contentHash, locator: { page: 3 }, excerpt: 'TEST CTA', check: 'text_match' as const };
  const identities: AssetIdentity[] = [];
  const appearances: AssetAppearance[] = [];
  for (let index = 1; index <= 120; index += 1) {
    const tag = `TEST-CTA-${String(index).padStart(3, '0')}`;
    identities.push({ assetId: testId(1000 + index), projectId: PROJECT, normalisedTag: tag });
    appearances.push({ id: testId(2000 + index), projectId: PROJECT, tagAsWritten: tag, evidence: [evidence] });
  }
  appearances.push({ id: testId(3000), projectId: PROJECT, evidence: [evidence] });

  it('R-066 · R-017 · G4-17: one row per tag, never the untagged appearance; previous and next only; a page beyond the end has no rows and a previous page', () => {
    const workspace = project({ documents: [list], fileNames: { [list.id]: 'TEST lista.pdf' }, identities, appearances });
    const pages = [1, 2, 3, 4].map((page) => equipmentView(workspace, { page }).view);
    expect(pages.map((page) => page.rows.length)).toEqual([50, 50, 20, 0]);
    expect(pages.map((page) => page.page)).toEqual([
      { hasPrevious: false, hasNext: true },
      { hasPrevious: true, hasNext: true },
      { hasPrevious: true, hasNext: false },
      { hasPrevious: true, hasNext: false },
    ]);
    expect(pages.flatMap((page) => page.rows.map((row) => row.assetId))).toHaveLength(120);
  });

  it('R-068 · G13-3: the asset detail lists each place the asset is written, the documents holding them, and points "Not available yet"; an unlisted asset is undefined', () => {
    const workspace = project({ documents: [list], fileNames: { [list.id]: 'TEST lista.pdf' }, identities, appearances });
    const detail = assetView(workspace, testId(1001));
    expect(detail?.view.evidence).toHaveLength(1);
    expect(byId(detail?.displayObjects ?? [], detail?.view.evidence[0]?.display ?? '')?.sourceLine?.text).toBe('Found in TEST lista.pdf, page 3');
    expect(detail?.view.documents.map((document) => document.documentId)).toEqual([list.id]);
    expect(byId(detail?.displayObjects ?? [], detail?.view.points ?? '')?.text).toBe('Not available yet: SOVITECH point templates');
    expect(assetView(workspace, testId(4444))).toBeUndefined();
  });

  it('R-068: each registered asset field\'s history lists its values by role and date, never a person', () => {
    const system = testField('asset.system', { kind: 'enum', subject: 'asset', options: ['hvac', 'lighting'], confirmBy: 'engineer' });
    const read = found({ id: 40, subjectId: testId(1001), field: system, document: list, value: { choice: 'hvac' }, minute: 1 });
    const own = answered({ id: 41, subjectId: testId(1001), field: system, value: { choice: 'lighting' }, minute: 2 });
    const workspace = project({ documents: [list], identities, appearances, fields: [{ field: system, subjectId: testId(1001), subjectKind: 'asset', candidates: [own, read] }] });
    const detail = assetView(workspace, testId(1001));
    expect(detail?.view.history).toEqual([
      {
        field: `asset:${testId(1001)}.system`,
        entries: [
          { display: `asset:${testId(1001)}.system.history1`, role: 'system', at: read.createdAt, reason: null },
          { display: `asset:${testId(1001)}.system.history2`, role: 'owner', at: own.createdAt, reason: null },
        ],
      },
    ]);
    expect(byId(detail?.displayObjects ?? [], `asset:${testId(1001)}.system.history1`)?.text).toBe('hvac');
  });
});

describe('Zones (DB-20)', () => {
  it('R-061: a zone matches a search on its name as written, and the level filter on its own stored level', () => {
    const name = testField('zone.name', { kind: 'text', subject: 'zone', confirmBy: 'engineer' });
    const level = testField('zone.level', { kind: 'text', subject: 'zone', confirmBy: 'engineer' });
    const plan = testDocument(10);
    const zoneA = testId(500);
    const zoneB = testId(501);
    const workspace = project({
      documents: [plan],
      zoneIds: [zoneA, zoneB],
      fields: [
        { field: name, subjectId: zoneA, subjectKind: 'zone', candidates: [found({ id: 50, subjectId: zoneA, field: name, document: plan, value: { text: 'TEST Lobby' }, minute: 1 })] },
        { field: level, subjectId: zoneA, subjectKind: 'zone', candidates: [found({ id: 51, subjectId: zoneA, field: level, document: plan, value: { text: 'ground_1' }, minute: 1 })] },
        { field: name, subjectId: zoneB, subjectKind: 'zone', candidates: [found({ id: 52, subjectId: zoneB, field: name, document: plan, value: { text: 'TEST Bar' }, minute: 1 })] },
      ],
    });
    expect(zonesView(workspace, {}).view.rows.map((row) => row.zoneId)).toEqual([zoneA, zoneB]);
    expect(zonesView(workspace, { search: 'lob' }).view.rows.map((row) => row.zoneId)).toEqual([zoneA]);
    expect(zonesView(workspace, { level: 'ground_1' }).view.rows.map((row) => row.zoneId)).toEqual([zoneA]);
    // A-9 · G4-43: a zone subject holding no value (no registered field, nothing stored) is not listed as an all-Unknown row.
    const unregistered = zonesView(project({ zoneIds: [zoneA] }), {});
    expect(unregistered.view.rows).toEqual([]);
    expect(unregistered.view.state).toBe('no_documents');
  });

  it('A-9 · G4-43: a zone read only from a deleted document is not listed, nor offered by Equipment\'s zone filter; one also holding the owner\'s value stays', () => {
    const name = testField('zone.name', { kind: 'text', subject: 'zone', confirmBy: 'engineer' });
    const plan = testDocument(10);
    const zoneA = testId(500);
    const zoneB = testId(501);
    const input: TestProjectInput = {
      documents: [plan],
      documentEvents: [deletion(plan.id)],
      zoneIds: [zoneA, zoneB],
      fields: [
        { field: name, subjectId: zoneA, subjectKind: 'zone', candidates: [found({ id: 50, subjectId: zoneA, field: name, document: plan, value: { text: 'TEST Lobby' }, minute: 1 })] },
        { field: name, subjectId: zoneB, subjectKind: 'zone', candidates: [answered({ id: 52, subjectId: zoneB, field: name, value: { text: 'TEST Bar' }, minute: 1 })] },
      ],
    };
    const workspace = project(input);
    expect(listedZones(workspace)).toEqual([zoneB]);
    expect(zonesView(workspace, {}).view.rows.map((row) => row.zoneId)).toEqual([zoneB]);
    expect(equipmentView(workspace, {}).view.filters.zones.map((zone) => zone.zoneId)).toEqual([zoneB]);
  });

  it('V-6 · V-9: a zone\'s details hold six fields, the description last, and each system chip carries the catalogue\'s life-safety flag', () => {
    const name = testField('zone.name', { kind: 'text', subject: 'zone', confirmBy: 'engineer' });
    const assetSystem = testField('asset.system', { kind: 'enum', subject: 'asset', options: SYSTEMS.map((system) => system.id), confirmBy: 'engineer' });
    const assetZone = testField('asset.zone', { kind: 'text', subject: 'asset', confirmBy: 'engineer' });
    const plan = testDocument(10);
    const zone = testId(500);
    const at = { documentId: plan.id, contentHash: plan.contentHash, locator: { page: 1 }, excerpt: 'TEST', check: 'text_match' as const };
    const assets = [testId(600), testId(601)];
    const workspace = project({
      documents: [plan],
      zoneIds: [zone],
      identities: assets.map((assetId, index) => ({ assetId, projectId: PROJECT, normalisedTag: `TEST-${String(index)}` })),
      appearances: assets.map((_assetId, index) => ({ id: testId(700 + index), projectId: PROJECT, tagAsWritten: `TEST-${String(index)}`, evidence: [at] })),
      fields: [
        { field: name, subjectId: zone, subjectKind: 'zone', candidates: [found({ id: 50, subjectId: zone, field: name, document: plan, value: { text: 'TEST Zona 1' }, minute: 1 })] },
        ...assets.flatMap((assetId, index) => [
          { field: assetSystem, subjectId: assetId, subjectKind: 'asset' as const, candidates: [found({ id: 60 + index, subjectId: assetId, field: assetSystem, document: plan, value: { choice: index === 0 ? 'hvac' : 'fire_safety' }, minute: 1 })] },
          { field: assetZone, subjectId: assetId, subjectKind: 'asset' as const, candidates: [found({ id: 70 + index, subjectId: assetId, field: assetZone, document: plan, value: { text: zone }, minute: 1 })] },
        ]),
      ],
    });
    const zones = zonesView(workspace, {});
    const [detail] = zones.view.details;
    expect(detail?.fields).toEqual(['code', 'name', 'level', 'kind', 'area', 'description'].map((path) => `zone:${zone}.${path}`));
    expect(byId(zones.displayObjects, `zone:${zone}.description`)?.text).toBe('Unknown');
    expect(zones.view.rows[0]).not.toHaveProperty('description');
    expect(detail?.systemDecisions).toEqual([
      { decision: `project:${PROJECT}.scope.hvac`, systemId: 'hvac', lifeSafety: false },
      { decision: `project:${PROJECT}.scope.fire_safety`, systemId: 'fire_safety', lifeSafety: true },
    ]);
  });
});

describe('levels and zones named, never by key or id (V-1; rule 8 "Floors"; G8-24)', () => {
  const floors = productionField('building.floors');
  const assetLevel = testField('asset.level', { kind: 'text', subject: 'asset', confirmBy: 'engineer' });
  const assetZone = testField('asset.zone', { kind: 'text', subject: 'asset', confirmBy: 'engineer' });
  const zoneName = testField('zone.name', { kind: 'text', subject: 'zone', confirmBy: 'engineer' });
  const zoneLevel = testField('zone.level', { kind: 'text', subject: 'zone', confirmBy: 'engineer' });
  const plan = testDocument(10);
  const zone = testId(500);
  const asset = testId(600);
  const at = { documentId: plan.id, contentHash: plan.contentHash, locator: { page: 1 }, excerpt: 'TEST CTA-01', check: 'text_match' as const };
  const base = (withFloors: boolean): TestProjectInput => ({
    documents: [plan],
    fileNames: { [plan.id]: 'TEST plan.pdf' },
    zoneIds: [zone],
    identities: [{ assetId: asset, projectId: PROJECT, normalisedTag: 'TEST-CTA-01' }],
    appearances: [{ id: testId(700), projectId: PROJECT, tagAsWritten: 'TEST-CTA-01', evidence: [at] }],
    fields: [
      ...(withFloors ? [{ field: floors, subjectId: BUILDING, subjectKind: 'building' as const, candidates: [answered({ id: 40, subjectId: BUILDING, field: floors, value: { quantity: { value: 2, unit: 'count', qualifier: 'upper' } }, minute: 1 })] }] : []),
      { field: assetLevel, subjectId: asset, subjectKind: 'asset', candidates: [found({ id: 41, subjectId: asset, field: assetLevel, document: plan, value: { text: 'upper_1' }, minute: 1 })] },
      { field: assetZone, subjectId: asset, subjectKind: 'asset', candidates: [found({ id: 42, subjectId: asset, field: assetZone, document: plan, value: { text: zone }, minute: 1 })] },
      { field: zoneName, subjectId: zone, subjectKind: 'zone', candidates: [found({ id: 43, subjectId: zone, field: zoneName, document: plan, value: { text: 'TEST Zona 1' }, minute: 1 })] },
      { field: zoneLevel, subjectId: zone, subjectKind: 'zone', candidates: [found({ id: 44, subjectId: zone, field: zoneLevel, document: plan, value: { text: 'upper_2' }, minute: 1 })] },
    ],
  });

  it('V-1 · A-12: Equipment\'s Floor and Zone cells, the asset record and Zones\' Floor cell name the level by the register\'s label and the zone by its name; badge and source line kept', () => {
    const workspace = project(base(true));
    const equipment = equipmentView(workspace, {});
    const [row] = equipment.view.rows;
    expect(byId(equipment.displayObjects, row?.level ?? '')).toMatchObject({ text: 'Level 1', parts: ['Level 1'], badge: { id: 'sovitech_will_check' }, sourceLine: { text: 'Found in TEST plan.pdf, page 1' } });
    expect(byId(equipment.displayObjects, row?.zone ?? '')).toMatchObject({ text: 'TEST Zona 1', parts: ['TEST Zona 1'], badge: { id: 'sovitech_will_check' } });
    const record = assetView(workspace, asset);
    const shown = (record?.view.fields ?? []).map((id) => byId(record?.displayObjects ?? [], id)?.text);
    expect(shown).toContain('Level 1');
    expect(shown).toContain('TEST Zona 1');
    const zones = zonesView(workspace, {});
    expect(byId(zones.displayObjects, zones.view.rows[0]?.level ?? '')?.text).toBe('Level 2');
    for (const display of [...equipment.displayObjects, ...(record?.displayObjects ?? []), ...zones.displayObjects]) {
      expect(display.text, display.valueId).not.toMatch(/upper_\d|[0-9a-f]{8}-[0-9a-f]{4}-/u);
    }
  });

  it('V-1: with no floor structure known, a stored key is named by the one label function from its own type and number; a text that is no key shows as written', () => {
    const workspace = project(base(false));
    expect(levelKeyLabel(workspace, 'upper_1')).toBe('Level 1');
    expect(levelKeyLabel(workspace, 'below_ground_1')).toBe('B1');
    expect(levelKeyLabel(workspace, 'below_ground_2')).toBe('B2');
    expect(levelKeyLabel(workspace, 'ground_1')).toBe('GF');
    expect(levelKeyLabel(workspace, 'roof_plant_1')).toBe('Roof plant');
    expect(levelKeyLabel(workspace, 'Etaj 1')).toBeUndefined();
    expect(levelKeyLabel(workspace, 'nonsense_3')).toBeUndefined();
    const equipment = equipmentView(workspace, {});
    expect(byId(equipment.displayObjects, equipment.view.rows[0]?.level ?? '')?.text).toBe('Level 1');
  });

  // The asset is also written in a second TEST document, so it stays listed once the plan is deleted.
  const other = testDocument(11);
  const atOther = { documentId: other.id, contentHash: other.contentHash, locator: { page: 1 }, excerpt: 'TEST CTA-01', check: 'text_match' as const };
  const planDeleted = (zoneNamedIn: DocumentRecord): TestProjectInput => {
    const input = base(true);
    return {
      ...input,
      documents: [plan, other],
      fileNames: { [plan.id]: 'TEST plan.pdf', [other.id]: 'TEST other.pdf' },
      appearances: [...(input.appearances ?? []), { id: testId(701), projectId: PROJECT, tagAsWritten: 'TEST-CTA-01', evidence: [atOther] }],
      fields: (input.fields ?? []).map((entry) =>
        entry.field === zoneName ? { ...entry, candidates: [found({ id: 43, subjectId: zone, field: zoneName, document: zoneNamedIn, value: { text: 'TEST Zona 1' }, minute: 1 })] } : entry,
      ),
      documentEvents: [deletion(plan.id)],
    };
  };
  const zoneEntry = (workspace: WorkspaceProject): DisplayObject | undefined => {
    const record = assetView(workspace, asset);
    const entries = record?.view.history.find((field) => field.field === `asset:${asset}.zone`)?.entries ?? [];
    expect(entries).toHaveLength(1);
    return byId(record?.displayObjects ?? [], entries[0]?.display ?? '');
  };

  it('NP-4 · V-3 · 2.3 "Deleting a document" · 2.8: an asset history entry for a zone no longer named (its only document deleted) is the missing display with its status line, never the missing wording served as a value its document said', () => {
    const entry = zoneEntry(project(planDeleted(plan)));
    expect(entry).toMatchObject({ text: 'Unknown', shape: 'missing', missing: 'unknown', badge: { id: 'unknown', label: 'Unknown' }, lines: [{ text: 'Source document removed' }] });
    expect(entry?.sourceLine).toBeUndefined();
    expect(entry?.evidence).toBeUndefined();
    expect(entry?.parts).toBeUndefined();
  });

  it('NP-4 · V-3 · G8-24: a removed entry whose zone another document still names shows that name, its badge, its source line and "Source document removed"', () => {
    const entry = zoneEntry(project(planDeleted(other)));
    expect(entry).toMatchObject({ text: 'TEST Zona 1', shape: 'value', badge: { id: 'sovitech_will_check' }, sourceLine: { text: 'Found in TEST plan.pdf, page 1' }, lines: [{ text: 'Source document removed' }] });
  });
});

describe('tags served without bidirectional and format controls (A-7; G2-15)', () => {
  it('A-7: the tag shows without U+202E, and a search of controls alone finds nothing', () => {
    const list = testDocument(10);
    const at = { documentId: list.id, contentHash: list.contentHash, locator: { page: 1 }, excerpt: 'TEST tags', check: 'text_match' as const };
    const workspace = project({
      documents: [list],
      identities: [{ assetId: testId(600), projectId: PROJECT, normalisedTag: 'TEST\u202EVCV-02' }],
      appearances: [{ id: testId(700), projectId: PROJECT, tagAsWritten: 'TEST\u202EVCV-02', evidence: [at] }],
    });
    expect(servedTag('TEST\u202EVCV-02')).toBe('TESTVCV-02');
    expect(servedTag('\u202E\u2066')).toBeUndefined();
    const listed = equipmentView(workspace, {});
    expect(byId(listed.displayObjects, listed.view.rows[0]?.tag ?? '')?.text).toBe('TESTVCV-02');
    expect(equipmentView(workspace, { search: '\u202E' }).view.rows).toEqual([]);
    expect(equipmentView(workspace, { search: 'vcv-02' }).view.rows).toHaveLength(1);
  });
});

describe('the register state (A-10; G12-11)', () => {
  it('A-10: no_documents only when the project never had a document; after every document is deleted, none_read', () => {
    const plan = testDocument(10);
    expect(registerState(project({}), 0)).toBe('no_documents');
    expect(registerState(project({ documents: [plan], documentEvents: [deletion(plan.id)] }), 0)).toBe('none_read');
    expect(registerState(project({ documents: [plan] }), 0)).toBe('none_read');
  });
});
