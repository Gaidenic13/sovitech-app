/**
 * The asset and zone registers as the workspace pages read them (2.2, 2.5; PRD R-060, R-065 to R-068; docs/adr/0045).
 *
 * - The asset register's rows are its countable assets (2.5: one tag, one asset; neither removed nor merged; with
 *   evidence from a document that is not removed, 2.3). Untagged appearances are never listed or counted (G4-17).
 * - An asset's tag is the tag as written in its documents (From document, with every place it is written); its other
 *   cells are the registered asset fields' displays, or Unknown while a field is not registered (ADR 0045 decision 1).
 *   Its type reads Unknown while `dataset-asset-taxonomy` is closed (prompt 3 5.4; PRD R-067 "Until decided": no type
 *   candidate while no approved taxonomy exists), whatever is stored.
 * - Counts are the engine's (ADR 0045 decision 2): an equipment count is a count by asset type (2.5, "Counts are
 *   shown broken down by asset type"), so it reads "Not available yet: SOVITECH asset taxonomy" while the gate is
 *   closed; points read "Not available yet: SOVITECH point templates" while `dataset-point-templates` is closed.
 * - A register query that lists levels or zones lists only what an asset's own stored value says; with none, Unknown
 *   (never a guess from a name, a model or the building type: rule 1).
 * - A level is shown by the level register's label, never by its stored key (rule 8, "Floors"; 2.2: a level is a
 *   subject; PRD R-077; US-ASSETS-05 AC2; US-ZONES-02 AC2; 7.1.1-E4): an asset's or a zone's level field keeps its own
 *   display (value id, badge, source line, actions) with its text set to the label (`levelFieldDisplays`); an asset's
 *   zone shows the zone's name as written, else its code, else the missing wording, never the zone's id
 *   (`zoneFieldDisplaysOfAsset`). G8-24.
 * - The zone register lists a zone that holds an eligible value or evidence from a document that is not removed (2.3
 *   "Deleting a document"; rule 12), as the asset register counts an asset with live evidence (G4-43).
 * - A tag is shown without bidirectional and format controls, as file names are (G2-14's reading; rules 2 and 14):
 *   stored as written, identity unchanged (`normaliseTag`), served without them (G2-15).
 */
import { normaliseTag, type Candidate } from '@sovitech/domain';
import { LEVEL_TYPES, SYSTEMS, parseNumber, type LevelType } from '@sovitech/registry';
import type { DisplayObject, Line, ValueId } from '../browser/contract';
import { badgeOf, candidateReading, resolveWrittenText, valueIdOf } from '../resolver';
import { MISSING } from './copy';
import { ASSET_FIELDS, ZONE_FIELDS, type WorkspaceField, type WorkspaceProject } from './inputs';
import { knownLevels, levelLabel } from './levels';
import { FORMAT, notAvailable, projectPath, unknownDisplay, valueIdFor } from './shared';

export type AssetCell = keyof typeof ASSET_FIELDS;

const TAXONOMY_GATE = 'dataset-asset-taxonomy';
const TEMPLATES_GATE = 'dataset-point-templates';

/** The assets the register lists, in the register's order (by asset id). */
export function listedAssets(project: WorkspaceProject): readonly string[] {
  return project.register.countable;
}

/** The live appearances of an asset that carry its tag, in appearance order. */
function liveAppearances(project: WorkspaceProject, assetId: string) {
  const asset = project.register.assets.find((entry) => entry.assetId === assetId);
  const live = new Set(asset?.liveAppearanceIds ?? []);
  return project.appearances.filter((appearance) => live.has(appearance.id));
}

/**
 * The characters a served tag never shows (G2-15): every format character (`\p{Cf}`: the bidirectional embedding,
 * override and isolate controls, the direction marks, the zero-width characters, the soft hyphen) and every other
 * bidirectional control, as the API's `servedFileName` drops them from file names (G2-14). "TEST" U+202E "VCV-02"
 * showed as "TEST20-VCV".
 */
const NOT_SERVED_IN_TAGS = /[\p{Bidi_Control}\p{Cf}]/gu;

/** A tag or a search text as served: without bidirectional and format controls; undefined when nothing is left to show. */
export function servedTag(text: string | undefined): string | undefined {
  if (text === undefined) return undefined;
  const served = text.replace(NOT_SERVED_IN_TAGS, '');
  return served.trim() === '' ? undefined : served;
}

/** The tag as written (the first live appearance's), or undefined. Stored as written; shown through `servedTag`. */
export function tagAsWritten(project: WorkspaceProject, assetId: string): string | undefined {
  return liveAppearances(project, assetId).find((appearance) => appearance.tagAsWritten !== undefined)?.tagAsWritten;
}

/** Whether an asset's tag as served holds the search as served, both normalised as 2.5 normalises tags ("cta-01" finds "CTA-01"). */
export function tagMatches(project: WorkspaceProject, assetId: string, search: string): boolean {
  const tag = normaliseTag(servedTag(tagAsWritten(project, assetId)));
  const wanted = normaliseTag(servedTag(search));
  return tag !== null && wanted !== null && tag.includes(wanted);
}

/** An asset's tag display (`asset:<id>.tag`): the tag as written and served (G2-15), From document, every place it is written. */
export function assetTagDisplay(project: WorkspaceProject, assetId: string): DisplayObject {
  const appearances = liveAppearances(project, assetId);
  return resolveWrittenText({
    valueId: valueIdFor('asset', assetId, 'tag'),
    text: servedTag(tagAsWritten(project, assetId)) ?? '',
    evidence: appearances.flatMap((appearance) => appearance.evidence),
    document: (documentId) => project.documents.find((document) => document.id === documentId),
    fileName: project.fileName,
    projectType: project.projectType,
  });
}

/** The value id of an asset's cell (`asset:<id>.type|system|location|level|zone`). */
export function assetCellId(assetId: string, cell: AssetCell): ValueId {
  return valueIdOf('asset', assetId, ASSET_FIELDS[cell]);
}

/**
 * An asset's cell, with the field's own display and its facts (the type reads Unknown while the taxonomy gate is
 * closed); its level by the level register's label and its zone by the zone's name (G8-24).
 */
export function assetCellDisplays(project: WorkspaceProject, assetId: string, cell: AssetCell): readonly DisplayObject[] {
  const fallback = assetCellId(assetId, cell);
  if (cell === 'type' && project.closedGates.has(TAXONOMY_GATE)) return [unknownDisplay(fallback)];
  const resolved = project.resolve(assetId, ASSET_FIELDS[cell]);
  if (resolved === undefined || resolved.length === 0) return [unknownDisplay(fallback)];
  return referenceDisplays(project, assetId, ASSET_FIELDS[cell], resolved);
}

// ---------------------------------------------------------------------------------------------
// Levels and zones named, never their keys or ids (rule 8 "Floors"; 2.2; G8-24)
// ---------------------------------------------------------------------------------------------

/**
 * What naming a level or a zone reads (the floor structure and the zones' names): any caller that serves a level, zone
 * or asset field outside the workspace's views (a write's answer) names it the same way with the same project state.
 */
export type NamingProject = Pick<WorkspaceProject, 'field' | 'buildingId'>;

const LEVEL_KEY = /^([a-z][a-z_]*)_([1-9][0-9]{0,2})$/u;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

/** The level register's labels by key, read once per project (the register is derived on read: levels.ts). */
const registerLabels = new WeakMap<NamingProject, ReadonlyMap<string, string>>();

function labelsOf(project: NamingProject): ReadonlyMap<string, string> {
  let labels = registerLabels.get(project);
  if (labels === undefined) {
    labels = new Map(knownLevels(project).map((level) => [level.key, level.label]));
    registerLabels.set(project, labels);
  }
  return labels;
}

/**
 * The label of a stored level key (`upper_1`): the level register's label where it lists the key (E1); for a key it
 * does not list (no floor structure known, the floors in conflict, or a level the structure does not count), the one
 * label function from the key's own type and number, the key's number standing as the count of its type (so S, P, Mz,
 * Er for the first of a type, E1 for the first upper floor; levels.ts). Undefined for a text that is no level key,
 * which shows as written.
 */
export function levelKeyLabel(project: NamingProject, key: string): string | undefined {
  const listed = labelsOf(project).get(key);
  if (listed !== undefined) return listed;
  const match = LEVEL_KEY.exec(key);
  const [, type, digits] = match ?? [];
  const levelTypes: readonly string[] = LEVEL_TYPES;
  if (type === undefined || digits === undefined || !levelTypes.includes(type)) return undefined;
  const parsed = parseNumber(digits);
  const number = parsed.ok && parsed.readings.length === 1 ? parsed.readings[0]?.value : undefined;
  if (number === undefined || !Number.isInteger(number) || number < 1) return undefined;
  return levelLabel(type as LevelType, number, number);
}

/** A stored zone reference's text: the zone's name as written, else its code, else the missing wording; never its id. */
function zoneReferenceText(project: NamingProject, zoneId: string): string {
  return zoneName(project, zoneId) ?? badgeOf('unknown').label;
}

/** The stored key or id a candidate holds (its choice, or its text as written, spaces folded). */
function storedReference(candidate: Candidate): string | undefined {
  const raw = candidate.choice ?? candidate.text;
  if (raw === undefined) return undefined;
  const folded = raw.replace(/\s+/gu, ' ').trim();
  return folded === '' ? undefined : folded;
}

/** For each candidate of a level or zone field, the text the resolver shows for it and the text shown in its place. */
function referenceTexts(project: NamingProject, field: WorkspaceField, kind: 'level' | 'zone'): ReadonlyMap<string, string> {
  const texts = new Map<string, string>();
  for (const candidate of field.candidates) {
    const stored = storedReference(candidate);
    if (stored === undefined) continue;
    let shown: string;
    try {
      shown = candidateReading(field.field, candidate, FORMAT).text;
    } catch {
      continue;
    }
    if (kind === 'level') {
      const label = levelKeyLabel(project, stored);
      if (label !== undefined) texts.set(shown, label);
    } else if (UUID.test(stored)) {
      texts.set(shown, zoneReferenceText(project, stored));
    }
  }
  return texts;
}

/** Whether a field holds a level (`asset.level`, `zone.level`) or an asset's zone (`asset.zone`): shown named (G8-24). */
function referenceKind(fieldKey: string): 'level' | 'zone' | undefined {
  if (fieldKey === ASSET_FIELDS.level || fieldKey === ZONE_FIELDS.level) return 'level';
  if (fieldKey === ASSET_FIELDS.zone) return 'zone';
  return undefined;
}

/** `text` with each shown text replaced where it stands as a whole word (never inside a file name or a longer token). */
function replaceWhole(text: string, texts: ReadonlyMap<string, string>): string {
  let out = text;
  for (const [shown, name] of texts) {
    const escaped = shown.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    out = out.replace(new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, 'gu'), () => name);
  }
  return out;
}

/** One display of a level or zone field with each stored key or id it shows replaced by its name; badge, source line, evidence and actions kept. */
function named(display: DisplayObject, texts: ReadonlyMap<string, string>): DisplayObject {
  const pieces = display.text.split(' or ');
  const whole = texts.get(display.text);
  let text = display.text;
  if (whole !== undefined) text = whole;
  else if (pieces.length > 1 && pieces.every((piece) => texts.has(piece))) text = [...new Set(pieces.map((piece) => texts.get(piece) ?? piece))].join(' or ');
  if (text === display.text && whole === undefined) {
    const linesChanged = (display.lines ?? []).some((line) => line.kind === 'rule_line' && replaceWhole(line.text, texts) !== line.text);
    if (!linesChanged) return display;
  }
  const lines: Line[] | undefined = display.lines?.map((line) => (line.kind === 'rule_line' ? { ...line, text: replaceWhole(line.text, texts) } : line));
  const parts = [...new Set([...(display.parts ?? []).map((part) => texts.get(part) ?? part), ...(text === display.text ? [] : text.split(' or '))])].filter((part) => /\d/u.test(part) && (text.includes(part) || (lines ?? []).some((line) => line.text.includes(part))));
  const next: DisplayObject = { ...display, text };
  if (parts.length === 0) delete next.parts;
  else next.parts = parts;
  if (lines !== undefined && lines.length > 0) next.lines = lines;
  return next;
}

/**
 * A level or zone field's displays (as resolved) with its stored level keys shown by the level register's labels and
 * its zone ids by the zones' names (G8-24); any other field's displays unchanged. One function for every page that
 * serves these fields (Equipment, the asset record and its history, Zones' rows and details), so a value id has one
 * display (G2-7).
 */
export function referenceDisplays(project: NamingProject, subjectId: string, fieldKey: string, resolved: readonly DisplayObject[]): readonly DisplayObject[] {
  const kind = referenceKind(fieldKey);
  if (kind === undefined) return resolved;
  const field = project.field(subjectId, fieldKey);
  if (field === undefined) return resolved;
  const texts = referenceTexts(project, field, kind);
  return texts.size === 0 ? resolved : resolved.map((display) => named(display, texts));
}

/**
 * One entry of a field's history (`entry`, resolved from `candidate`), named as the field's displays are (G8-24). An
 * asset's zone entry that is no longer current (`noLongerCurrent`: it carries a 2.8 status line, "Source document
 * removed" or "From a superseded revision") and whose zone no longer has a name or a code (both read only from removed
 * documents, for example) is the missing display, Unknown as its badge, keeping its status line: the missing wording as
 * the entry's text, beside its badge and source line, read as if its document had said "Unknown" (NP-4; 2.3 "A field
 * left with no eligible candidate returns to unknown, and appears ... as 'Source document removed'"; 2.8). A current
 * entry keeps the zone cell's own display (ADR 0045, "Levels and zones named").
 */
export function historyEntryDisplay(project: NamingProject, subjectId: string, fieldKey: string, candidate: Candidate, entry: DisplayObject, noLongerCurrent: boolean): DisplayObject {
  if (noLongerCurrent && referenceKind(fieldKey) === 'zone') {
    const stored = storedReference(candidate);
    if (stored !== undefined && UUID.test(stored) && zoneName(project, stored) === undefined) {
      const badge = badgeOf('unknown');
      const missing: DisplayObject = { valueId: entry.valueId, kind: entry.kind, text: badge.label, shape: 'missing', missing: 'unknown', badge };
      if (entry.measure !== undefined) missing.measure = entry.measure;
      if (entry.lines !== undefined && entry.lines.length > 0) missing.lines = entry.lines;
      return missing;
    }
  }
  return referenceDisplays(project, subjectId, fieldKey, [entry])[0] ?? entry;
}

/** What an asset's registered field says, as a filter reads it: the active candidate's choice or text, or undefined. */
export function assetValue(project: WorkspaceProject, assetId: string, cell: AssetCell): string | undefined {
  if (cell === 'type' && project.closedGates.has(TAXONOMY_GATE)) return undefined;
  return activeValue(project, assetId, ASSET_FIELDS[cell]);
}

/** A field's active candidate's choice or text, or undefined (no value, a conflict, or no such field). */
export function activeValue(project: Pick<WorkspaceProject, 'field'>, subjectId: string, fieldKey: string): string | undefined {
  const field = project.field(subjectId, fieldKey);
  if (field === undefined || field.state.activeCandidateId === null) return undefined;
  const candidate = field.candidates.find((entry) => entry.id === field.state.activeCandidateId);
  return candidate?.choice ?? candidate?.text;
}

/** Whether a gate is open (only through the closed set the API read from the gate source). */
function gateClosed(project: WorkspaceProject, gate: string): boolean {
  return project.closedGates.has(gate);
}

/**
 * A count of equipment by type over the register (`project:<id>.register.<path>`): "Not available yet: SOVITECH asset
 * taxonomy" while the taxonomy gate is closed. Counts by type are the phase 5 engine's (2.1 `calculated`: the engine
 * only), so with the gate open this refuses rather than count here.
 */
export function equipmentCountDisplay(project: WorkspaceProject, path: string): DisplayObject {
  if (!gateClosed(project, TAXONOMY_GATE)) throw new Error("view-model: the asset taxonomy gate is open: equipment counts by type are the engine's (phase 5), not built");
  return notAvailable(projectPath(project, `register.${path}`), MISSING.assetTaxonomy);
}

/** Points (`<value id>`): "Not available yet: SOVITECH point templates" while the gate is closed (PRD R-053, R-067); the engine's otherwise. */
export function pointsDisplay(project: WorkspaceProject, valueId: ValueId): DisplayObject {
  if (!gateClosed(project, TEMPLATES_GATE)) throw new Error("view-model: the point templates gate is open: points are the engine's (phase 5), not built");
  return notAvailable(valueId, MISSING.pointTemplates);
}

/** A list of names as one register query's line: Unknown when it lists nothing (never "none": rule 1, "Zero is a value"). */
function namesDisplay(valueId: ValueId, names: readonly string[]): DisplayObject {
  if (names.length === 0) return unknownDisplay(valueId, 'line');
  const text = names.join(', ');
  return { valueId, kind: 'line', text, shape: 'value', ...(/\d/u.test(text) ? { parts: names.filter((name) => /\d/u.test(name)) } : {}) };
}

/** The assets whose stored system is the given catalogue system. */
export function assetsOfSystem(project: WorkspaceProject, systemId: string): readonly string[] {
  return listedAssets(project).filter((assetId) => assetValue(project, assetId, 'system') === systemId);
}

/** The levels holding a system's equipment, by the assets' own level values (`project:<id>.levels.<system>`). */
export function systemLevelsDisplay(project: WorkspaceProject, systemId: string): DisplayObject {
  const held = new Set(assetsOfSystem(project, systemId).flatMap((assetId) => assetValue(project, assetId, 'level') ?? []));
  const names = knownLevels(project).filter((level) => held.has(level.key)).map((level) => level.label);
  return namesDisplay(projectPath(project, `levels.${systemId}`), names);
}

/** A zone's name as written (its registered name, else its code), or undefined. */
export function zoneName(project: Pick<WorkspaceProject, 'field'>, zoneId: string): string | undefined {
  return activeValue(project, zoneId, ZONE_FIELDS.name) ?? activeValue(project, zoneId, ZONE_FIELDS.code);
}

/** The zones holding a system's equipment, by the assets' own zone values (`project:<id>.zones.<system>`). */
export function systemZonesDisplay(project: WorkspaceProject, systemId: string): DisplayObject {
  const held = new Set(assetsOfSystem(project, systemId).flatMap((assetId) => assetValue(project, assetId, 'zone') ?? []));
  const names = listedZones(project).filter((zoneId) => held.has(zoneId)).flatMap((zoneId) => zoneName(project, zoneId) ?? []);
  return namesDisplay(projectPath(project, `zones.${systemId}`), names);
}

/** The listed zones, read once per project. */
const zoneLists = new WeakMap<WorkspaceProject, readonly string[]>();

/**
 * The zones the register lists, oldest first (2.2; G4-43): a zone subject with an eligible value on one of its fields,
 * or a value with evidence from a document that is not removed, as the asset register counts an asset with live
 * evidence (2.5). A zone read only from a deleted document is not listed (2.3 "Deleting a document"; rule 12: never an
 * all-Unknown row standing for a zone no source holds).
 */
export function listedZones(project: WorkspaceProject): readonly string[] {
  const cached = zoneLists.get(project);
  if (cached !== undefined) return cached;
  const zones = new Set(project.zoneIds);
  const active = new Set(project.activeDocuments.map((document) => document.id));
  const held = new Set<string>();
  for (const entry of project.fields) {
    if (!zones.has(entry.subjectId) || held.has(entry.subjectId)) continue;
    const eligible = entry.state.candidates.some((derived) => derived.status === 'eligible');
    const evidenced = entry.candidates.some((candidate) => candidate.evidence.some((item) => active.has(item.documentId)));
    if (eligible || evidenced) held.add(entry.subjectId);
  }
  const listed = project.zoneIds.filter((zoneId) => held.has(zoneId));
  zoneLists.set(project, listed);
  return listed;
}

/** The catalogue systems serving a zone, by the stored systems of the assets in it (in catalogue order). */
export function systemsOfZone(project: WorkspaceProject, zoneId: string): readonly string[] {
  const inZone = listedAssets(project).filter((assetId) => assetValue(project, assetId, 'zone') === zoneId);
  const systems = new Set(inZone.flatMap((assetId) => assetValue(project, assetId, 'system') ?? []));
  return SYSTEMS.filter((system) => systems.has(system.id)).map((system) => system.id);
}

/** A zone's systems line (`zone:<id>.systems`): the catalogue names of the systems serving it, or Unknown. */
export function zoneSystemsDisplay(project: WorkspaceProject, zoneId: string): DisplayObject {
  const names = systemsOfZone(project, zoneId).flatMap((systemId) => SYSTEMS.find((system) => system.id === systemId)?.name ?? []);
  return namesDisplay(valueIdFor('zone', zoneId, 'systems'), names);
}

/** A zone's registered field, its own display (the zone's Edit is on it: UD-09), or Unknown; its level by the register's label (G8-24). */
export function zoneFieldDisplays(project: WorkspaceProject, zoneId: string, cell: keyof typeof ZONE_FIELDS): readonly DisplayObject[] {
  const resolved = project.resolve(zoneId, ZONE_FIELDS[cell]);
  if (resolved === undefined || resolved.length === 0) return [unknownDisplay(valueIdOf('zone', zoneId, ZONE_FIELDS[cell]))];
  return referenceDisplays(project, zoneId, ZONE_FIELDS[cell], resolved);
}

