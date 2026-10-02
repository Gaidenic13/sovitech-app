/**
 * TEST responses of `workspace.systemScope` for System Scope's component tests (happy-dom), in the contract's shapes
 * (packages/view-model/src/browser/contract/workspace.ts): the client parses every fake answer with the route's
 * schema, as it parses the API's. Not a test itself, and never imported by the app. Every value is TEST data; none is
 * a figure of the mockups or of a real building.
 */
import type { DisplayObject, SystemScopeRow } from '@sovitech/view-model/browser';
import { frameResponse } from '../../test-views';
import { envelopeOf as envelope } from '../equipment/test-envelope';
import { levelsOf, type TestLevels } from '../topology/test-topology';

export const SYSTEM_IDS = ['hvac', 'lighting', 'energy', 'access_control', 'fire_safety', 'water', 'elevators', 'cctv'] as const;
export type TestSystem = (typeof SYSTEM_IDS)[number];

/** The candidate a recorded TEST decision shows (one per system, a two-digit suffix). */
export function decisionCandidate(index: number): string {
  return `0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8a${String(index + 10).padStart(2, '0')}`;
}

/** How a TEST system's decision reads. */
export type TestDecision = 'include' | 'exclude' | 'suggested' | 'none' | 'skipped';

export interface ScopeOptions {
  readonly decisions?: Partial<Record<TestSystem, TestDecision>>;
  readonly demo?: boolean;
  /** Serves Fire Safety with a suggestion and `included` (a server that broke the guard), to prove the page holds it back. */
  readonly brokenFireSuggestion?: boolean;
}

const LIFE_SAFETY: ReadonlySet<string> = new Set(['fire_safety']);
const NEVER_PRESELECTED: ReadonlySet<string> = new Set(['access_control', 'fire_safety', 'elevators']);

function decisionDisplay(projectId: string, systemId: string, index: number, decision: TestDecision): DisplayObject {
  const valueId = `project:${projectId}.scope.${systemId}`;
  const field = { subjectId: projectId, fieldKey: `project.scope.${systemId}` };
  const recorded = decision === 'include' || decision === 'exclude';
  const edit = { kind: 'edit' as const, field, input: { kind: 'choice' as const, options: ['include', 'exclude'] }, shownCandidateIds: recorded ? [decisionCandidate(index)] : [] };
  const measure = { label: `TEST ${systemId} in scope` };
  if (recorded) {
    return {
      valueId,
      kind: 'field',
      text: decision === 'include' ? 'TEST included' : 'TEST not included',
      shape: 'value',
      badge: { id: 'provided_by_you', label: 'TEST provided badge' },
      sourceLine: { id: 'source_step_4', kind: 'source_line', text: 'TEST entered on step four' },
      measure,
      field,
      actions: [edit],
    };
  }
  if (decision === 'suggested') {
    return {
      valueId,
      kind: 'field',
      text: 'TEST included',
      shape: 'value',
      badge: { id: 'suggested', label: 'TEST suggested badge' },
      lines: [{ id: 'suggested_because_document', kind: 'rule_line', text: `TEST suggested because a TEST document names ${systemId}` }],
      measure,
      field,
      actions: [edit],
    };
  }
  return {
    valueId,
    kind: 'field',
    text: 'TEST not provided',
    shape: 'missing',
    missing: 'not_provided_yet',
    badge: { id: 'not_provided_yet', label: 'TEST not provided' },
    measure,
    field,
    actions: [edit],
  };
}

const notAvailable = (valueId: string, missing: string): DisplayObject => ({ valueId, kind: 'line', text: `TEST not available: ${missing}`, shape: 'missing', missing: 'not_available_yet' });
const unknownLine = (valueId: string): DisplayObject => ({ valueId, kind: 'line', text: 'TEST unknown', shape: 'missing', missing: 'unknown', badge: { id: 'unknown', label: 'TEST unknown' } });

/** `GET /api/projects/:projectId/workspace/system-scope` with the given TEST decisions (undecided by default). */
export function systemScopeResponse(projectId: string, options: ScopeOptions = {}) {
  const displays: DisplayObject[] = [];
  const systems: SystemScopeRow[] = SYSTEM_IDS.map((systemId, index) => {
    const asked = options.decisions?.[systemId] ?? 'none';
    const brokenFire = options.brokenFireSuggestion === true && systemId === 'fire_safety';
    const decision = brokenFire ? 'suggested' : asked;
    displays.push(decisionDisplay(projectId, systemId, index, decision));
    displays.push(notAvailable(`project:${projectId}.register.${systemId}`, 'TEST asset taxonomy'));
    displays.push(notAvailable(`project:${projectId}.points.${systemId}`, 'TEST point templates'));
    displays.push(unknownLine(`project:${projectId}.levels.${systemId}`));
    displays.push(unknownLine(`project:${projectId}.zones.${systemId}`));
    const suggested = decision === 'suggested';
    return {
      systemId,
      lifeSafety: LIFE_SAFETY.has(systemId),
      neverPreselected: NEVER_PRESELECTED.has(systemId),
      decision: `project:${projectId}.scope.${systemId}`,
      included: decision === 'include' || suggested,
      suggestion: suggested ? { reason: { id: 'suggested_because_document', kind: 'rule_line', text: `TEST suggested because a TEST document names ${systemId}` } } : null,
      equipment: `project:${projectId}.register.${systemId}`,
      points: `project:${projectId}.points.${systemId}`,
      levels: `project:${projectId}.levels.${systemId}`,
      zones: `project:${projectId}.zones.${systemId}`,
    };
  });
  return { ...envelope(projectId, displays, { demo: options.demo === true }), view: { questionId: 'q.project.systemsInScope', systems } };
}

/** `GET …/workspace/equipment` with no asset: the register's state and its count line. */
export function emptyEquipmentResponse(projectId: string, state: 'no_documents' | 'none_read' = 'no_documents') {
  const total = notAvailable(`project:${projectId}.register.total`, 'TEST asset taxonomy');
  return {
    ...envelope(projectId, [total]),
    view: {
      state,
      rows: [],
      total: total.valueId,
      filters: { systems: [...SYSTEM_IDS], levels: { state: 'unknown', line: total.valueId, actions: [] }, zones: [], badges: [], active: {} },
      page: { hasPrevious: false, hasNext: false },
    },
  };
}

/**
 * `GET /api/projects/:projectId/workspace` (the frame, whose level register System Scope's floor filter reads) with the
 * level register in the given TEST state, its displays in place of the frame's own floor line.
 */
export function frameWithLevels(projectId: string, state: TestLevels) {
  const frame = frameResponse(projectId);
  const register = levelsOf(projectId, state);
  const replaced = new Set(register.displays.map((display) => display.valueId));
  return {
    ...frame,
    displayObjects: [...frame.displayObjects.filter((display) => !replaced.has(display.valueId)), ...register.displays],
    view: { ...frame.view, levels: register.levels },
  };
}
