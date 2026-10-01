/**
 * Test support for step 3 and UD-45's component tests (not a test itself, never imported by the app).
 * The display objects are TEST values in the contract's shapes: words, never a figure of the mockups
 * or of a real building. The client parses every response with the contract's schemas, so a shape
 * that drifts from the contract fails the tests that use it.
 */
import type { Action, DisplayObject, Line } from '@sovitech/view-model/browser';
import { PROJECT } from '../../test/harness';

export const BUILDING = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e80';
export const DOCUMENT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e81';
export const AREA_CANDIDATE = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e82';
export const ROOMS_CANDIDATE = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e83';
export const FLOORS_A = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e84';
export const FLOORS_B = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e85';
export const ZONES_A = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e86';
export const ZONES_B = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e87';
export const HASH = 'a'.repeat(64);

export const AREA = `building:${BUILDING}.grossFloorArea`;
export const FLOORS = `building:${BUILDING}.floors`;
export const ROOMS = `building:${BUILDING}.rooms`;
export const ZONES = `building:${BUILDING}.zones`;
export const EQUIPMENT = `project:${PROJECT}.outputs.equipmentCount`;
export const PILL = `project:${PROJECT}.confirmations.count`;
export const COVERAGE = `document:${DOCUMENT}.coverage`;
export const FILE_NAME = `document:${DOCUMENT}.fileName`;

type EditAction = Extract<Action, { kind: 'edit' }>;

const edit = (fieldKey: string, shown: readonly string[]): EditAction => ({
  kind: 'edit',
  field: { subjectId: BUILDING, fieldKey },
  input: { kind: 'quantity', unit: { code: 'm2', symbol: 'm²' }, qualifiers: ['gross_total', 'usable'], qualifierRequired: true },
  shownCandidateIds: [...shown],
});

const countEdit = (fieldKey: string, shown: readonly string[]): EditAction => ({
  kind: 'edit',
  field: { subjectId: BUILDING, fieldKey },
  input: { kind: 'quantity', unit: { code: 'count', symbol: 'count' }, qualifiers: [], qualifierRequired: false },
  shownCandidateIds: [...shown],
});

const source = (text: string): Line => ({ id: 'document', kind: 'source_line', text });

/** The area, found in a document, with a confirmation the budget shows (a TEST owner confirmation). */
export function areaDisplay(options: { readonly confirm?: boolean } = {}): DisplayObject {
  return {
    valueId: AREA,
    kind: 'field',
    text: 'TEST area as written',
    shape: 'value',
    badge: { id: 'from_document', label: 'TEST From document' },
    measure: { label: 'TEST gross floor area', unit: { code: 'm2', symbol: 'm²' }, qualifierLabel: 'TEST basis' },
    sourceLine: source('TEST area source line'),
    evidence: [{ documentId: DOCUMENT, contentHash: HASH, excerpt: 'TEST area excerpt' }],
    field: { subjectId: BUILDING, fieldKey: 'building.grossFloorArea' },
    actions: [
      edit('building.grossFloorArea', [AREA_CANDIDATE]),
      ...(options.confirm === true ? [{ kind: 'confirm' as const, candidateId: AREA_CANDIDATE, wording: { id: 'confirm_area', kind: 'rule_line' as const, text: 'TEST is this the gross area?' } }] : []),
    ],
  };
}

/** Rooms on an engineer field, read from a document: "Looks right" and "Something's wrong", never a confirmation (rule 3). */
export function roomsDisplay(): DisplayObject {
  return {
    valueId: ROOMS,
    kind: 'field',
    text: 'TEST rooms as written',
    shape: 'value',
    badge: { id: 'sovitech_will_check', label: 'TEST SOVITECH will check' },
    measure: { label: 'TEST rooms', unit: { code: 'count', symbol: 'count' }, qualifierLabel: 'TEST guest rooms' },
    sourceLine: source('TEST rooms source line'),
    field: { subjectId: BUILDING, fieldKey: 'building.rooms' },
    actions: [countEdit('building.rooms', [ROOMS_CANDIDATE]), { kind: 'acknowledge', candidateIds: [ROOMS_CANDIDATE] }, { kind: 'concern', candidateId: ROOMS_CANDIDATE }],
  };
}

/** Floors by level type: the field and one fact per level type (the resolver's multi-fact displays). */
export function floorsDisplays(): DisplayObject[] {
  return [
    {
      valueId: FLOORS,
      kind: 'field',
      text: 'TEST upper floors; TEST unknown: TEST below ground',
      shape: 'value',
      badge: { id: 'from_document', label: 'TEST From document' },
      measure: { label: 'TEST floors' },
      sourceLine: source('TEST floors source line'),
      field: { subjectId: BUILDING, fieldKey: 'building.floors' },
      actions: [countEdit('building.floors', [FLOORS_A])],
    },
    {
      valueId: `${FLOORS}.upper`,
      kind: 'field',
      text: 'TEST upper floors as written',
      shape: 'value',
      badge: { id: 'from_document', label: 'TEST From document' },
      measure: { label: 'TEST floors', qualifierLabel: 'TEST upper floors' },
      sourceLine: source('TEST upper floors source line'),
      field: { subjectId: BUILDING, fieldKey: 'building.floors' },
    },
    {
      valueId: `${FLOORS}.below_ground`,
      kind: 'field',
      text: 'TEST Unknown',
      shape: 'missing',
      missing: 'unknown',
      badge: { id: 'unknown', label: 'TEST Unknown' },
      measure: { label: 'TEST floors', qualifierLabel: 'TEST below ground' },
      field: { subjectId: BUILDING, fieldKey: 'building.floors' },
    },
  ];
}

/** Zones in conflict: the field (Two values, the rule 4 line) and its two values; put to the owner or routed to the engineer. */
export function zonesConflictDisplays(routedTo: 'owner' | 'engineer'): DisplayObject[] {
  const choices = [
    { candidateId: ZONES_A, valueId: `${ZONES}.value1` },
    { candidateId: ZONES_B, valueId: `${ZONES}.value2` },
  ];
  return [
    {
      valueId: ZONES,
      kind: 'field',
      text: 'TEST zones one or TEST zones two',
      shape: 'range',
      badge: { id: 'two_values', label: 'TEST Two values' },
      measure: { label: 'TEST zones' },
      lines: [{ id: routedTo === 'owner' ? 'conflict_for_owner' : 'conflict_for_engineer', kind: 'rule_line', text: routedTo === 'owner' ? 'TEST which is right?' : 'TEST an engineer will check it.' }],
      field: { subjectId: BUILDING, fieldKey: 'building.zones' },
      actions: [
        ...(routedTo === 'owner' ? [{ kind: 'resolve_conflict' as const, field: { subjectId: BUILDING, fieldKey: 'building.zones' }, choices }] : []),
        countEdit('building.zones', [ZONES_A, ZONES_B]),
      ],
    },
    {
      valueId: `${ZONES}.value1`,
      kind: 'field',
      text: 'TEST zones one',
      shape: 'value',
      badge: { id: 'from_document', label: 'TEST From document' },
      measure: { label: 'TEST zones' },
      sourceLine: source('TEST zones one source line'),
      field: { subjectId: BUILDING, fieldKey: 'building.zones' },
    },
    {
      valueId: `${ZONES}.value2`,
      kind: 'field',
      text: 'TEST zones two',
      shape: 'value',
      badge: { id: 'provided_by_you', label: 'TEST Provided by you' },
      measure: { label: 'TEST zones' },
      field: { subjectId: BUILDING, fieldKey: 'building.zones' },
    },
  ];
}

/** A fact asked for and not answered: its missing wording with Edit (R-047 "Until decided"). */
export function missingDisplay(valueId: string, fieldKey: string, badge: 'not_provided_yet' | 'reading_documents' = 'not_provided_yet'): DisplayObject {
  return {
    valueId,
    kind: 'field',
    text: `TEST ${badge}`,
    shape: 'missing',
    missing: badge,
    badge: { id: badge, label: `TEST ${badge}` },
    measure: { label: `TEST ${fieldKey}` },
    field: { subjectId: BUILDING, fieldKey },
    actions: [countEdit(fieldKey, [])],
  };
}

export function equipmentDisplay(): DisplayObject {
  return { valueId: EQUIPMENT, kind: 'line', text: 'TEST not available yet: taxonomy', shape: 'missing', missing: 'not_available_yet' };
}

export function pillDisplay(): DisplayObject {
  return { valueId: PILL, kind: 'line', text: 'TEST things for you line', shape: 'value' };
}

export function fileDisplays(): DisplayObject[] {
  return [
    { valueId: FILE_NAME, kind: 'record', text: 'TEST-plans.pdf', shape: 'value' },
    { valueId: COVERAGE, kind: 'line', text: 'TEST partly analysed line', shape: 'value' },
  ];
}

export const NO_MODEL = { state: 'no_model', line: { id: 'not_available_yet_named', kind: 'rule_line', text: 'TEST model missing line' }, addModelOnStep: 2 } as const;
export const MODEL_STORED = { state: 'model_stored', line: { id: 'not_analysed', kind: 'status_line', text: 'TEST model stored line' }, addModelOnStep: null } as const;
