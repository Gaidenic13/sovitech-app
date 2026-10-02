/**
 * Zones (DB-20; PRD R-060 to R-063; US-ZONES-01 to US-ZONES-04; UD-09, UD-27; docs/adr/0045 decision 1).
 *
 * The zone register: one row per listed zone subject (2.2; a zone with an eligible value or evidence from a document
 * that is not removed: G4-43), each cell a registered zone field's display (its id and name as written, its level by
 * the level register's label, G8-24, what it is, its area with its basis), or Unknown while the field is not
 * registered; the systems serving it by its equipment's own stored systems (Unknown otherwise). Its details (R-061's
 * ZONE DETAILS): every field with its Edit (UD-09: `fields.edit` on the zone's field; nothing required), the
 * description among them (US-ZONES-03 AC1), the system decisions' displays (the same as System Scope's, G2-7) with the
 * catalogue's life-safety flag, its equipment by type and its points as "Not available yet", and the documents
 * holding its evidence. List only (R-063); no "+ Add Zone" (R-062), no plan (R-064, R-084), no count (ADR 0045
 * decision 2). With no zone field in the production registry, no zone exists in this build; TEST registries prove it.
 */
import { SYSTEMS, scopeFieldKey } from '@sovitech/registry';
import type { ZoneRow, ZoneSystemDecision, ZonesQuery, ZonesResponse } from '../browser/contract';
import { resolveDocument, valueIdOf } from '../resolver';
import { ZONE_FIELDS, type Built, type WorkspaceProject } from './inputs';
import { levelRegister } from './levels';
import { activeValue, equipmentCountDisplay, listedZones, pointsDisplay, systemsOfZone, zoneFieldDisplays, zoneSystemsDisplay } from './registers';
import { DisplaySet, FORMAT, ownDisplay, registerState, valueIdFor } from './shared';

type ZoneCell = keyof typeof ZONE_FIELDS;
/** The row's cells (R-060). */
const CELLS: readonly ZoneCell[] = ['code', 'name', 'level', 'kind', 'area'];
/** The details' fields (R-061; US-ZONES-03 AC1): the row's, then the description, a text value with its source. */
const DETAIL_CELLS: readonly ZoneCell[] = [...CELLS, 'description'];

function cell(project: WorkspaceProject, displays: DisplaySet, zoneId: string, which: ZoneCell): string {
  const [own, ...rest] = zoneFieldDisplays(project, zoneId, which);
  if (own === undefined) throw new Error('view-model: a zone cell has a display');
  displays.addAll(rest);
  return displays.add(own);
}

/** Whether a zone matches the active filters: its own stored level and systems, its id or name as written (filters write nothing). */
function matches(project: WorkspaceProject, zoneId: string, query: ZonesQuery): boolean {
  if (query.level !== undefined && activeValue(project, zoneId, ZONE_FIELDS.level) !== query.level) return false;
  if (query.system !== undefined && !systemsOfZone(project, zoneId).includes(query.system)) return false;
  if (query.search !== undefined) {
    const wanted = query.search.toLocaleLowerCase('en');
    const texts = [activeValue(project, zoneId, ZONE_FIELDS.code), activeValue(project, zoneId, ZONE_FIELDS.name)].flatMap((text) => text ?? []);
    if (!texts.some((text) => text.toLocaleLowerCase('en').includes(wanted))) return false;
  }
  return true;
}

/** The documents a zone's values cite, active ones only, in order. */
function zoneDocuments(project: WorkspaceProject, zoneId: string): string[] {
  const ids = new Set<string>();
  for (const key of Object.values(ZONE_FIELDS)) {
    for (const candidate of project.field(zoneId, key)?.candidates ?? []) for (const entry of candidate.evidence) ids.add(entry.documentId);
  }
  return project.activeDocuments.filter((document) => ids.has(document.id)).map((document) => document.id);
}

export function zonesView(project: WorkspaceProject, query: ZonesQuery): Built<ZonesResponse['view']> {
  const displays = new DisplaySet();
  // The zones the register lists (G4-43: never one read only from a deleted document), then those the filters match.
  const zones = listedZones(project);
  const listed = zones.filter((zoneId) => matches(project, zoneId, query));
  const rows: ZoneRow[] = listed.map((zoneId) => {
    const [code, name, level, kind, area] = CELLS.map((which) => cell(project, displays, zoneId, which));
    if (code === undefined || name === undefined || level === undefined || kind === undefined || area === undefined) throw new Error('view-model: a zone row has five cells');
    return { zoneId, code, name, level, kind, area, systems: displays.add(zoneSystemsDisplay(project, zoneId)) };
  });
  const details = listed.map((zoneId) => ({
    zoneId,
    fields: DETAIL_CELLS.map((which) => cell(project, displays, zoneId, which)),
    // Each chip: the scope decision's display (the same id as System Scope's row, G2-7), with the catalogue's life-safety
    // flag (rule 11; 7.1.1-L1; R-051), as System Scope's rows and Topology's groups carry it.
    systemDecisions: systemsOfZone(project, zoneId).map((systemId): ZoneSystemDecision => {
      const resolved = project.resolve(project.projectId, scopeFieldKey(systemId));
      if (resolved !== undefined) displays.addAll(resolved);
      const system = SYSTEMS.find((entry) => entry.id === systemId);
      if (system === undefined) throw new Error(`view-model: ${systemId} is not a catalogue system`);
      return { decision: displays.add(ownDisplay(resolved, valueIdOf('project', project.projectId, scopeFieldKey(systemId)))), systemId, lifeSafety: system.lifeSafety };
    }),
    equipment: displays.add(equipmentCountDisplay(project, `total.zone_${zoneId.replace(/-/gu, '')}`)),
    points: displays.add(pointsDisplay(project, valueIdFor('zone', zoneId, 'points'))),
    documents: zoneDocuments(project, zoneId).flatMap((documentId) => {
      const document = project.activeDocuments.find((entry) => entry.id === documentId);
      if (document === undefined) return [];
      const resolved = resolveDocument({ document, fileName: project.fileName(document.id) ?? null, format: FORMAT });
      const status = resolved.status ?? resolved.reading;
      return status === undefined ? [] : [{ documentId, fileName: displays.add(resolved.fileName), status: displays.add(status) }];
    }),
  }));
  const view: ZonesResponse['view'] = { state: registerState(project, zones.length), rows, details, levels: levelRegister(project, displays), active: query };
  return { view, displayObjects: displays.list() };
}
