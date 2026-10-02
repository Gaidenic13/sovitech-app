/**
 * The level register (PRD R-076, R-077; US-MODEL-01 to US-MODEL-03; docs/adr/0045 decision 3): derived on read, by
 * one function, from the floor structure's facts (`building.floors`, counts by level type: rule 8 "Floors"), never
 * from a sheet count, a model's storeys, the building type or a mockup.
 *
 * - One level per counted level, in building order (rule 8's level types, bottom up: below ground from the deepest,
 *   semi-basement, ground, mezzanine, upper floors, setback or technical, attic, roof plant). A level type stated as 0
 *   has no level; a level type no source states is named once as Unknown (rule 8: "Parts with no source are Unknown").
 * - Labels: one function (D-18 open; PRD R-076 interim: "level labels use the document's own names and numbering"):
 *   the regim de înălțime's letter where the floor notation reads one (S, P, Mz, E, Er; the parser's letters, the
 *   only ones rule 8's example shows), numbered as rule 8 numbers floors ("Etaj 1 is the first floor above parter";
 *   below ground, S1 is the nearest the ground); the level type's registered label otherwise. A level type counted
 *   once keeps its letter alone (S, Mz, Er), except the upper floors, which are always numbered (E1).
 * - The floor field in conflict, or a level type read two ways (an ambiguous reading): no list is built from either
 *   value (rule 4: "never runs on one of the values"): "Not available yet: two values for floors", never alone (rule 7):
 *   beside it the floors field's own display as step 3 resolves it (both readings with their sources, and rule 4's
 *   routing line where the conflict is routed to SOVITECH), and the action to resolve it (`enter_floors`, step 3's
 *   floors row) unless that display carries the routing line (rule 4, "Routing": the owner does not arbitrate an
 *   engineer's conflict). G7-16.
 * - Nothing known: "Not available yet: floor structure", with the actions to upload a document and to enter the
 *   floors (rule 7; R-077; G7-14).
 */
import { FIELD, FLOOR_NOTATION_LEVEL_TYPES, LEVEL_TYPES, type LevelType } from '@sovitech/registry';
import type { DisplayObject, LevelOption, LevelRegister, ValueId } from '../browser/contract';
import { qualifierLabel, resolveLine } from '../resolver';
import { MISSING } from './copy';
import type { WorkspaceProject } from './inputs';
import { DisplaySet, FORMAT, notAvailable, projectPath, valueIdFor } from './shared';

/** The letter the floor notation writes for a level type, where the parser reads one (rule 8's example). */
const LETTER_OF: ReadonlyMap<string, string> = new Map(Object.entries(FLOOR_NOTATION_LEVEL_TYPES).map(([letter, type]) => [type, letter]));

/** Rule 4's routing line ("Documents disagree on this. A SOVITECH engineer will check it."): the registry's rule line id. */
const ROUTING_LINE = 'conflict_for_engineer';

/** The largest count one level type may list (the level key's pattern carries up to three digits). */
const MOST_LEVELS = 999;

/** One level of the register: its key (`upper_3`), its label and its level type. */
export interface Level {
  readonly key: string;
  readonly label: string;
  readonly levelType: LevelType;
  /** Its position from the bottom: 1 is the n-th of its type counted from the ground (S1, E1). */
  readonly number: number;
}

/** The label of the n-th level of a type, out of `count` (the one label function: D-18 interim). */
export function levelLabel(levelType: LevelType, number: number, count: number): string {
  const letter = LETTER_OF.get(levelType);
  if (letter !== undefined) {
    if (levelType === 'upper') return `${letter}${String(number)}`;
    return count === 1 ? letter : `${letter}${String(number)}`;
  }
  const word = qualifierLabel(levelType);
  const name = `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
  return count === 1 ? name : `${name} ${String(number)}`;
}

/** The levels of the floor structure's counts, bottom up. */
export function levelsOf(counts: ReadonlyMap<LevelType, number>): Level[] {
  const levels: Level[] = [];
  for (const levelType of LEVEL_TYPES) {
    // A level type no source states lists no level (and is named Unknown beside the list), never read as zero.
    const count = counts.get(levelType);
    if (count === undefined) continue;
    const numbers = Array.from({ length: count }, (_unused, index) => index + 1);
    // Below ground is listed from the deepest up: S3, S2, S1 (S1 is the nearest the ground).
    if (levelType === 'below_ground') numbers.reverse();
    for (const number of numbers) levels.push({ key: `${levelType}_${String(number)}`, label: levelLabel(levelType, number, count), levelType, number });
  }
  return levels;
}

/** What the floor field says, read for the register: counts by level type, the types no source states, or why no list is built. */
type FloorReading =
  | { readonly kind: 'counts'; readonly counts: ReadonlyMap<LevelType, number>; readonly unstated: readonly LevelType[] }
  | { readonly kind: 'unknown' }
  | { readonly kind: 'conflict' };

function readFloors(project: Pick<WorkspaceProject, 'field' | 'buildingId'>): FloorReading {
  const floors = project.field(project.buildingId, FIELD.floors);
  if (floors === undefined) return { kind: 'unknown' };
  const { state, candidates } = floors;
  if (state.state === 'conflict') return { kind: 'conflict' };
  if (state.state !== 'known') return { kind: 'unknown' };
  const levelTypes: readonly string[] = LEVEL_TYPES;
  const counts = new Map<LevelType, number>();
  for (const fact of state.facts) {
    if (fact.qualifier === null || !levelTypes.includes(fact.qualifier)) continue;
    if (fact.state === 'conflict' || fact.ambiguous) return { kind: 'conflict' };
    const value = candidates.find((candidate) => candidate.id === fact.activeCandidateId)?.quantity?.value;
    if (value === undefined || !Number.isInteger(value) || value < 0 || value > MOST_LEVELS) return { kind: 'unknown' };
    counts.set(fact.qualifier as LevelType, value);
  }
  if (counts.size === 0) return { kind: 'unknown' };
  return { kind: 'counts', counts, unstated: LEVEL_TYPES.filter((levelType) => !counts.has(levelType)) };
}

/** The value id of a level's label (`building:<id>.levels.<key>`), the same on every page (G2-7). */
export function levelValueId(buildingId: string, key: string): ValueId {
  return valueIdFor('building', buildingId, `levels.${key}`);
}

/** The levels the register lists now, for the filters and the per-system queries (none unless known). */
export function knownLevels(project: Pick<WorkspaceProject, 'field' | 'buildingId'>): Level[] {
  const reading = readFloors(project);
  return reading.kind === 'counts' ? levelsOf(reading.counts) : [];
}

/** The level register as the contract serves it (LevelRegister), with its display objects added to `displays`. */
export function levelRegister(project: WorkspaceProject, displays: DisplaySet): LevelRegister {
  const reading = readFloors(project);
  if (reading.kind === 'conflict') {
    const line = displays.add(resolveLine(projectPath(project, 'floors.conflict'), 'not_available_yet_two_values', { field: 'floors' }, FORMAT, { missing: 'not_available_yet' }));
    // Rule 7: never alone. The floors field as step 3 shows it (G2-7), and the action to resolve it unless the
    // conflict is SOVITECH's (rule 4, "Routing": its display then carries the routing line, and the owner has no action).
    const resolved = project.resolve(project.buildingId, FIELD.floors) ?? [];
    const own = resolved[0];
    if (own === undefined) throw new Error('view-model: the floors field in conflict has a display');
    displays.addAll(resolved);
    const routed = (own.lines ?? []).some((entry) => entry.id === ROUTING_LINE);
    return { state: 'conflict', line, field: own.valueId, actions: routed ? [] : ['enter_floors'] };
  }
  const levels = reading.kind === 'counts' ? levelsOf(reading.counts) : [];
  if (reading.kind === 'unknown' || levels.length === 0) {
    const line = displays.add(notAvailable(projectPath(project, 'floors.missing'), MISSING.floorStructure));
    return { state: 'unknown', line, actions: ['upload_document', 'enter_floors'] };
  }
  const options: LevelOption[] = levels.map((level) => {
    const valueId = levelValueId(project.buildingId, level.key);
    const display: DisplayObject = { valueId, kind: 'record', text: level.label, shape: 'value', ...(/\d/u.test(level.label) ? { parts: [level.label] } : {}) };
    displays.add(display);
    return { key: level.key, label: valueId };
  });
  let unstated: ValueId | null = null;
  if (reading.unstated.length > 0) {
    // The words the resolver's floor summary uses for the same facts (rule 8: "Parts with no source are Unknown").
    unstated = displays.add({
      valueId: valueIdFor('building', project.buildingId, 'levels.unstated'),
      kind: 'line',
      text: `${qualifierLabel(null)}: ${reading.unstated.map((levelType) => qualifierLabel(levelType)).join(', ')}`,
      shape: 'missing',
      missing: 'unknown',
    });
  }
  return { state: 'known', levels: options, unstated };
}
