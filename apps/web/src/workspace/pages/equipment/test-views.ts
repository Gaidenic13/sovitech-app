/**
 * TEST responses of `workspace.equipment` and `workspace.asset` for the Equipment and asset record component tests
 * (happy-dom), in the contract's shapes (packages/view-model/src/browser/contract/workspace.ts): the client parses
 * every fake answer with the route's schema, as it parses the API's. Not a test itself, and never imported by the app.
 * Every tag and value is TEST data; none is a figure of the mockups or of a real building.
 */
import type { Action, AssetResponse, DisplayObject, LevelRegister } from '@sovitech/view-model/browser';
import { levelsOf } from '../topology/test-topology';
import { envelopeOf as envelope } from './test-envelope';

/** A TEST asset id with a two-digit suffix (`asset(1)` … `asset(99)`). */
export function asset(n: number): string {
  return `0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8b${String(n).padStart(2, '0')}`;
}

/** The candidate a TEST asset's system value holds (for "Looks right" and "Something's wrong"). */
export function systemCandidate(n: number): string {
  return `0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8c${String(n).padStart(2, '0')}`;
}

export const DOCUMENT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8f01';
export const ZONE = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8d01';
export const HASH = 'a'.repeat(64);

export interface TestAsset {
  readonly n: number;
  readonly tag: string;
  /** The system value is read from a TEST document and offers the owner's answers (a TEST registry's asset field). */
  readonly answerable?: boolean;
}

const unknown = (valueId: string): DisplayObject => ({ valueId, kind: 'field', text: 'TEST unknown', shape: 'missing', missing: 'unknown', badge: { id: 'unknown', label: 'TEST unknown' } });

/**
 * A tag as written, as the resolver serves written text: a text holding a digit carries itself as its one part
 * (`resolveWrittenText`), so a tag written only in digits ("101", "1.2") is served as a number-only record (A-1).
 */
function tagDisplay(id: string, tag: string): DisplayObject {
  return {
    valueId: `asset:${id}.tag`,
    kind: 'record',
    text: tag,
    ...(/\d/u.test(tag) ? { parts: [tag] } : {}),
    shape: 'value',
    badge: { id: 'from_document', label: 'TEST document badge' },
    sourceLine: { id: 'document', kind: 'source_line', text: 'TEST found in TEST schedule.xlsx' },
    evidence: [{ documentId: DOCUMENT, contentHash: HASH, excerpt: `TEST ${tag} as written` }],
  };
}

function systemDisplay(test: TestAsset): DisplayObject {
  const id = asset(test.n);
  if (test.answerable !== true) return unknown(`asset:${id}.system`);
  const actions: Action[] = [
    { kind: 'acknowledge', candidateIds: [systemCandidate(test.n)] },
    { kind: 'concern', candidateId: systemCandidate(test.n) },
  ];
  return {
    valueId: `asset:${id}.system`,
    kind: 'field',
    text: 'TEST hvac system',
    shape: 'value',
    badge: { id: 'sovitech_will_check', label: 'TEST will check badge' },
    sourceLine: { id: 'document', kind: 'source_line', text: 'TEST found in TEST schedule.xlsx' },
    field: { subjectId: id, fieldKey: 'asset.system' },
    actions,
  };
}

function cellsOf(test: TestAsset): DisplayObject[] {
  const id = asset(test.n);
  return [tagDisplay(id, test.tag), unknown(`asset:${id}.type`), systemDisplay(test), unknown(`asset:${id}.location`), unknown(`asset:${id}.level`), unknown(`asset:${id}.zone`)];
}

const notAvailable = (valueId: string, missing: string): DisplayObject => ({ valueId, kind: 'line', text: `TEST not available: ${missing}`, shape: 'missing', missing: 'not_available_yet' });

export interface EquipmentOptions {
  readonly state?: 'no_documents' | 'reading' | 'none_read' | 'listed';
  readonly hasPrevious?: boolean;
  readonly hasNext?: boolean;
  readonly demo?: boolean;
  /** The level register: no floor structure (default), two TEST levels, or the floors field in conflict (G7-16). */
  readonly levels?: 'unknown' | 'known' | 'conflict';
  readonly zones?: boolean;
}

/** `GET /api/projects/:projectId/workspace/equipment` with the given TEST assets on the page. */
export function equipmentResponse(projectId: string, assets: readonly TestAsset[], options: EquipmentOptions = {}, active: Record<string, unknown> = {}) {
  const displays: DisplayObject[] = assets.flatMap(cellsOf);
  const total = notAvailable(`project:${projectId}.register.total`, 'TEST asset taxonomy');
  displays.push(total);
  let levels: LevelRegister;
  if (options.levels === 'known') {
    const building = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e70';
    displays.push({ valueId: `building:${building}.levels.ground_1`, kind: 'record', text: 'TEST ground', shape: 'value' });
    displays.push({ valueId: `building:${building}.levels.upper_1`, kind: 'record', text: 'TEST upper one', shape: 'value' });
    levels = { state: 'known', levels: [{ key: 'ground_1', label: `building:${building}.levels.ground_1` }, { key: 'upper_1', label: `building:${building}.levels.upper_1` }], unstated: null };
  } else if (options.levels === 'conflict') {
    const register = levelsOf(projectId, 'conflict');
    displays.push(...register.displays);
    levels = register.levels;
  } else {
    const line = notAvailable(`project:${projectId}.floors.missing`, 'the floor structure');
    displays.push(line);
    levels = { state: 'unknown', line: line.valueId, actions: ['upload_document', 'enter_floors'] };
  }
  const zones = options.zones === true ? [{ zoneId: ZONE, name: `zone:${ZONE}.name` }] : [];
  if (options.zones === true) displays.push({ valueId: `zone:${ZONE}.name`, kind: 'field', text: 'TEST lobby zone', shape: 'value', badge: { id: 'from_document', label: 'TEST document badge' } });
  return {
    ...envelope(projectId, displays, { demo: options.demo === true }),
    view: {
      state: options.state ?? (assets.length === 0 ? 'no_documents' : 'listed'),
      rows: assets.map((test) => {
        const id = asset(test.n);
        return { assetId: id, tag: `asset:${id}.tag`, type: `asset:${id}.type`, system: `asset:${id}.system`, location: `asset:${id}.location`, level: `asset:${id}.level`, zone: `asset:${id}.zone` };
      }),
      total: total.valueId,
      filters: {
        systems: ['hvac', 'lighting', 'energy', 'access_control', 'fire_safety', 'water', 'elevators', 'cctv'],
        levels,
        zones,
        badges: assets.length === 0 ? [] : ['unknown'],
        active,
      },
      page: { hasPrevious: options.hasPrevious === true, hasNext: options.hasNext === true },
    },
  };
}

export interface AssetOptions {
  /** The document holding the evidence was erased: its excerpt reads "[erased]". */
  readonly erased?: boolean;
  /**
   * Serves the asset's history as the view-model resolves each entry (V-3, A-8): every entry with its own badge and
   * source line, a withdrawn one with 2.8's "Source document removed", the level by the level register's label and the
   * zone by its name as written (never the stored key or the zone's id).
   */
  readonly history?: boolean;
}

const SOURCE_DOCUMENT_REMOVED = { id: 'source_document_removed', kind: 'status_line', text: 'Source document removed' } as const;

/** The history entries of a TEST asset (`asset:<id>.<field>.history<n>`) and the fields they belong to. */
function historyOf(id: string): { readonly displays: DisplayObject[]; readonly history: AssetHistory } {
  const source = (text: string) => ({ id: 'document', kind: 'source_line', text }) as const;
  const inferred: DisplayObject = {
    valueId: `asset:${id}.system.history1`,
    kind: 'field',
    text: 'TEST hvac system',
    shape: 'value',
    badge: { id: 'possible', label: 'Possible' },
    sourceLine: { id: 'ai_inference', kind: 'source_line', text: 'TEST inferred from TEST schedule.xlsx' },
  };
  const withdrawn: DisplayObject = {
    valueId: `asset:${id}.system.history2`,
    kind: 'field',
    text: 'TEST lighting system',
    shape: 'value',
    badge: { id: 'from_document', label: 'From document' },
    sourceLine: source('TEST found in TEST removed.pdf'),
    lines: [SOURCE_DOCUMENT_REMOVED],
  };
  const level: DisplayObject = {
    valueId: `asset:${id}.level.history1`,
    kind: 'field',
    text: 'TEST E1',
    parts: ['TEST E1'],
    shape: 'value',
    badge: { id: 'from_document', label: 'From document' },
    sourceLine: source('TEST found in TEST schedule.xlsx'),
  };
  const zone: DisplayObject = {
    valueId: `asset:${id}.zone.history1`,
    kind: 'field',
    text: 'TEST lobby zone',
    shape: 'value',
    badge: { id: 'from_document', label: 'From document' },
    sourceLine: source('TEST found in TEST schedule.xlsx'),
  };
  const entry = (display: DisplayObject, day: string) => ({ display: display.valueId, role: 'system' as const, at: `2026-09-${day}T12:00:00.000Z`, reason: null });
  return {
    displays: [inferred, withdrawn, level, zone],
    history: [
      { field: `asset:${id}.system`, entries: [entry(inferred, '20'), entry(withdrawn, '21')] },
      { field: `asset:${id}.level`, entries: [entry(level, '20')] },
      { field: `asset:${id}.zone`, entries: [entry(zone, '20')] },
    ],
  };
}

type AssetHistory = AssetResponse['view']['history'];

/** `GET /api/projects/:projectId/workspace/equipment/:assetId` for a TEST asset. */
export function assetResponse(projectId: string, test: TestAsset, options: AssetOptions = {}) {
  const id = asset(test.n);
  const cells = cellsOf(test);
  const evidenceDisplay: DisplayObject = {
    valueId: `asset:${id}.evidence1`,
    kind: 'record',
    text: test.tag,
    shape: 'value',
    badge: { id: 'from_document', label: 'TEST document badge' },
    sourceLine: { id: 'document', kind: 'source_line', text: 'TEST found in TEST schedule.xlsx, sheet TEST' },
    evidence: [{ documentId: DOCUMENT, contentHash: HASH, excerpt: options.erased === true ? '[erased]' : `TEST ${test.tag} as written` }],
  };
  const fileName: DisplayObject = { valueId: `document:${DOCUMENT}.fileName`, kind: 'record', text: 'TEST schedule.xlsx', shape: 'value' };
  const stage = unknown(`document:${DOCUMENT}.stage`);
  const revision = unknown(`document:${DOCUMENT}.revision`);
  const status: DisplayObject = { valueId: `document:${DOCUMENT}.coverage`, kind: 'line', text: 'TEST read, sheets one to two', shape: 'value' };
  const points = notAvailable(`asset:${id}.points`, 'TEST point templates');
  const history = options.history === true ? historyOf(id) : { displays: [], history: [] };
  const displays = [...cells, evidenceDisplay, fileName, stage, revision, status, points, ...history.displays];
  return {
    ...envelope(projectId, displays),
    view: {
      assetId: id,
      tag: `asset:${id}.tag`,
      fields: [`asset:${id}.type`, `asset:${id}.system`, `asset:${id}.location`, `asset:${id}.level`, `asset:${id}.zone`],
      evidence: [{ documentId: DOCUMENT, fileName: fileName.valueId, stage: stage.valueId, revision: revision.valueId, display: evidenceDisplay.valueId }],
      history: history.history,
      points: points.valueId,
      documents: options.erased === true ? [] : [{ documentId: DOCUMENT, fileName: fileName.valueId, status: status.valueId, stage: stage.valueId, revision: revision.valueId }],
    },
  };
}
