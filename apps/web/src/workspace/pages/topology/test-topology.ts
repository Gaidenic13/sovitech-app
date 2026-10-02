/**
 * TEST responses of `GET /api/projects/:projectId/workspace/topology` (and the level register both Topology and
 * Zones serve) for the web's component tests, in the contract's shapes (packages/view-model/src/browser/contract/
 * workspace.ts): the client parses every fake answer with the route's schema. Not a test itself, and never imported by
 * the app. Every value is TEST data; none is a figure of the mockups or of a real building. The "Not available yet"
 * lines carry the words the view-model serves (packages/view-model/src/workspace/copy.ts `MISSING`).
 */
import type { DisplayObject, LevelRegister } from '@sovitech/view-model/browser';
import { BUILDING } from '../../test-views';
import { envelopeOf } from '../equipment/test-envelope';

/** A screen envelope for the project (common.ts `screenEnvelope`), as the harness builds it: the one TEST envelope. */
export const envelope = envelopeOf;

/**
 * The level register's states: `conflict` is a floors conflict routed to the owner (the action to resolve it on step
 * 3); `conflict_for_engineer` one routed to SOVITECH (rule 4's routing line on the field, no owner action).
 */
export type TestLevels = 'unknown' | 'known' | 'conflict' | 'conflict_for_engineer' | 'known_with_unstated';

/** Rule 4's routing line, as the resolver serves it on a field whose conflict goes to the engineer queue. */
export const ROUTED_TO_SOVITECH = 'Documents disagree on this. A SOVITECH engineer will check it.';

/** The floors field in conflict, as step 3 resolves it (`building:<id>.floors`): Two values, both readings with their sources. */
export function floorsConflictDisplay(routedToSovitech: boolean): DisplayObject {
  return {
    valueId: `building:${BUILDING}.floors`,
    kind: 'field',
    text: 'TEST 12 or 14 upper floors',
    parts: ['12', '14'],
    shape: 'range',
    badge: { id: 'two_values', label: 'Two values' },
    measure: { label: 'TEST floors' },
    sourceLine: { id: 'conflict_sources', kind: 'source_line', text: 'TEST found in TEST memoriu.pdf; TEST found in TEST plan.pdf' },
    ...(routedToSovitech ? { lines: [{ id: 'conflict_for_engineer', kind: 'rule_line' as const, text: ROUTED_TO_SOVITECH }] } : {}),
  };
}

/** A "Not available yet: <missing>" line as the view-model serves it (no badge: the line names what is missing). */
export function notAvailableLine(valueId: string, missing: string): DisplayObject {
  return {
    valueId,
    kind: 'line',
    text: `Not available yet: ${missing}`,
    shape: 'missing',
    missing: 'not_available_yet',
  };
}

/** The level register in one of its states, with its display objects. */
export function levelsOf(projectId: string, state: TestLevels): { readonly levels: LevelRegister; readonly displays: DisplayObject[] } {
  if (state === 'unknown') {
    const line = notAvailableLine(`project:${projectId}.floors.missing`, 'floor structure');
    return {
      levels: {
        state: 'unknown',
        line: line.valueId,
        actions: ['upload_document', 'enter_floors'],
      },
      displays: [line],
    };
  }
  if (state === 'conflict' || state === 'conflict_for_engineer') {
    const line = notAvailableLine(`project:${projectId}.floors.conflict`, 'two values for floors');
    const field = floorsConflictDisplay(state === 'conflict_for_engineer');
    return {
      levels: { state: 'conflict', line: line.valueId, field: field.valueId, actions: state === 'conflict' ? ['enter_floors'] : [] },
      displays: [line, field],
    };
  }
  const ground: DisplayObject = {
    valueId: `building:${BUILDING}.levels.ground_1`,
    kind: 'record',
    text: 'P',
    shape: 'value',
  };
  const upper: DisplayObject = {
    valueId: `building:${BUILDING}.levels.upper_1`,
    kind: 'record',
    text: 'E1',
    shape: 'value',
    parts: ['E1'],
  };
  const displays = [ground, upper];
  let unstated: string | null = null;
  if (state === 'known_with_unstated') {
    const line: DisplayObject = {
      valueId: `building:${BUILDING}.levels.unstated`,
      kind: 'line',
      text: 'Unknown: TEST attic',
      shape: 'missing',
      missing: 'unknown',
    };
    displays.push(line);
    unstated = line.valueId;
  }
  return {
    levels: {
      state: 'known',
      levels: [
        { key: 'ground_1', label: ground.valueId },
        { key: 'upper_1', label: upper.valueId },
      ],
      unstated,
    },
    displays,
  };
}

/** A system's scope decision as System Scope serves it (`project:<id>.scope.<system>`): Provided by you, with the wizard's Edit action. */
export function decisionDisplay(projectId: string, systemId: string): DisplayObject {
  return {
    valueId: `project:${projectId}.scope.${systemId}`,
    kind: 'field',
    field: { subjectId: projectId, fieldKey: `project.scope.${systemId}` },
    text: 'TEST included',
    shape: 'value',
    badge: { id: 'provided_by_you', label: 'Provided by you' },
    measure: { label: `TEST system in scope: ${systemId}` },
    sourceLine: {
      id: 'source_owner',
      kind: 'source_line',
      text: 'TEST chosen on System Scope',
    },
    actions: [
      {
        kind: 'edit',
        field: { subjectId: projectId, fieldKey: `project.scope.${systemId}` },
        input: { kind: 'choice', options: ['include', 'exclude'] },
        shownCandidateIds: ['0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8a01'],
      },
    ],
  };
}

export interface TopologyOptions {
  /** The included systems' groups, in the catalogue's order; none gives the no-decision line (G7-15). */
  readonly groups?: ReadonlyArray<{
    readonly systemId: string;
    readonly monitoringOnly?: boolean;
  }>;
  readonly levels?: TestLevels;
  /** The floor selection the view was asked for (its equipment lines' value ids name it). */
  readonly level?: string;
  readonly demo?: boolean;
  readonly name?: string;
}

/** `GET /api/projects/:projectId/workspace/topology` for a TEST project. */
export function topologyResponse(projectId: string, options: TopologyOptions = {}) {
  const design = notAvailableLine(`project:${projectId}.topology.design`, "SOVITECH's design of the controllers, networks and integrations");
  const register = levelsOf(projectId, options.levels ?? 'unknown');
  const displays: DisplayObject[] = [design, ...register.displays];
  const groups = (options.groups ?? []).map((group) => {
    const decision = decisionDisplay(projectId, group.systemId);
    const path = options.level === undefined ? group.systemId : `${group.systemId}.${options.level}`;
    const equipment = notAvailableLine(`project:${projectId}.register.${path}`, 'SOVITECH asset taxonomy');
    displays.push(decision, equipment);
    return {
      systemId: group.systemId,
      decision: decision.valueId,
      equipment: equipment.valueId,
      monitoringOnly: group.monitoringOnly === true,
    };
  });
  let noDecision = null;
  if (groups.length === 0) {
    const line = notAvailableLine(`project:${projectId}.topology.noDecision`, 'the systems in scope');
    displays.push(line);
    noDecision = { line: line.valueId, actions: ['choose_systems' as const] };
  }
  return {
    ...envelope(projectId, displays, {
      demo: options.demo === true,
      ...(options.name === undefined ? {} : { name: options.name }),
    }),
    view: {
      design: design.valueId,
      groups,
      noDecision,
      levels: register.levels,
    },
  };
}
