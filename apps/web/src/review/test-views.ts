/**
 * Test support for the step 5 to 8 component tests: step views and display objects in the contract's
 * shapes, holding TEST values only (no figure of the mockups, of the company or of a real building).
 * The fake API answers them through the real client, which parses each with the route's response
 * schema, so a builder that drifts from the contract fails the test that uses it. Never imported by
 * the app.
 */
import type { Action, DisplayObject, FieldRef, Line, Question } from '@sovitech/view-model/browser';
import { PROJECT } from '../test/harness';

export const BUILDING = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e80';
export const CANDIDATE_A = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e81';
export const CANDIDATE_B = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e82';
export const DOCUMENT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e83';
export const HASH = 'a'.repeat(64);

export const PROVIDE_LATER: Line = { id: 'provide_later', kind: 'rule_line', text: 'TEST provide later line' };

/** A field's value id as the view-model forms it: `<subject kind>:<subject id>.<key without its subject prefix>`. */
export function fieldValueId(fieldKey: string): string {
  const [subject, ...rest] = fieldKey.split('.');
  const id = subject === 'building' ? BUILDING : PROJECT;
  return `${subject ?? 'project'}:${id}.${rest.join('.')}`;
}

export function refOf(fieldKey: string): FieldRef {
  return { subjectId: fieldKey.startsWith('building.') ? BUILDING : PROJECT, fieldKey };
}

export function editOf(fieldKey: string, options: readonly string[], shown: readonly string[] = []): Action {
  return { kind: 'edit', field: refOf(fieldKey), input: { kind: 'choice', options: [...options] }, shownCandidateIds: [...shown] };
}

/** A field with no value: "Not provided yet" (TEST wording), with its Edit. */
export function notProvided(fieldKey: string, label: string, options: readonly string[], extra: Partial<DisplayObject> = {}): DisplayObject {
  return {
    valueId: fieldValueId(fieldKey),
    kind: 'field',
    text: 'TEST not provided',
    shape: 'missing',
    missing: 'not_provided_yet',
    badge: { id: 'not_provided_yet', label: 'TEST not provided' },
    measure: { label },
    actions: [editOf(fieldKey, options)],
    field: refOf(fieldKey),
    ...extra,
  };
}

/** A field with the owner's own answer: its TEST text and the Provided by you badge. */
export function provided(fieldKey: string, label: string, text: string, options: readonly string[]): DisplayObject {
  return {
    valueId: fieldValueId(fieldKey),
    kind: 'field',
    text,
    shape: 'value',
    badge: { id: 'provided_by_you', label: 'TEST provided badge' },
    measure: { label },
    actions: [editOf(fieldKey, options, [CANDIDATE_B])],
    field: refOf(fieldKey),
  };
}

/** A line display object with its bound count (kind `line`). */
export function lineDisplay(path: string, text: string, extra: Partial<DisplayObject> = {}): DisplayObject {
  return { valueId: `project:${PROJECT}.${path}`, kind: 'line', text, shape: 'value', ...extra };
}

export const BUILDING_TYPE_OPTIONS = ['hotel', 'office', 'retail', 'hospital', 'residential', 'other'] as const;
export const SCHEDULE_OPTIONS = ['24_7', 'business_hours', 'extended_hours', 'seasonal'] as const;
export const OCCUPANCY_OPTIONS = ['mostly_occupied', 'mixed', 'low'] as const;
export const GOALS = ['reduce_energy', 'lower_carbon', 'occupant_comfort', 'operational_efficiency', 'compliance', 'asset_lifespan', 'reduce_operating_costs'] as const;
export const AREAS = ['hvac', 'lighting', 'energy_management', 'water_management', 'security_access', 'predictive_maintenance'] as const;
export const SYSTEMS = ['hvac', 'lighting', 'energy', 'access_control', 'fire_safety', 'water', 'elevators', 'cctv'] as const;

/** An unanswered single-choice question with "Skip for now". */
export function singleQuestion(questionId: string, fieldKey: string, options: readonly string[], overrides: Partial<Question> = {}): Question {
  return {
    questionId,
    selection: 'single',
    fields: [refOf(fieldKey)],
    state: 'unanswered',
    options: options.map((key) => ({ key, selected: false, suggestion: null })),
    found: null,
    skip: { kind: 'skip', questionId },
    afterSkip: null,
    ...overrides,
  };
}

/** An unanswered multi-select, one decision field per option, with "Skip for now". */
export function multiQuestion(questionId: string, prefix: string, ids: readonly string[], overrides: Partial<Question> = {}): Question {
  const keys = ids.map((id) => `${prefix}.${id}`);
  return {
    questionId,
    selection: 'multi',
    fields: keys.map((key) => refOf(key)),
    state: 'unanswered',
    options: keys.map((key) => ({ key, selected: false, valueId: fieldValueId(key), suggestion: null })),
    found: null,
    skip: { kind: 'skip', questionId },
    afterSkip: null,
    ...overrides,
  };
}
