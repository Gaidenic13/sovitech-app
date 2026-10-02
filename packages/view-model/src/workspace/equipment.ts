/**
 * Equipment (DB-17; PRD R-065 to R-068; US-ASSETS-01 to US-ASSETS-11; UD-08, UD-26; docs/adr/0044 decision 7, 0045).
 *
 * - The rows are the asset register's countable assets (2.5), each cell a display object with its one badge: the tag
 *   as written (From document), the type (Unknown while `dataset-asset-taxonomy` is closed: R-067), the system,
 *   location, level and zone (the registered asset fields' displays, or Unknown). No Status, Last Update, Alarms,
 *   commissioning date or product photo (D14; R-066).
 * - Filters write nothing (R-066). An asset matches a filter only where its own stored value says so: an asset whose
 *   system, level or zone is unknown matches no such filter (rule 1: never a guess). The badge filter reads the type's
 *   badge (the list's badge column). Search reads the tag as written.
 * - 50 rows a page, previous and next only, no page numbers or "Showing <a>-<b> of <n>" (R-017's reading for
 *   registers; ADR 0044 decision 7). The total is a count by type: "Not available yet: SOVITECH asset taxonomy".
 * - The asset detail (UD-08; R-068): every cell, the evidence entries (each place the asset is written, with its
 *   excerpt verbatim, "[erased]" after erasure: rule 13), each registered field's history of candidates by role and
 *   date (never a person's name: proposals 7.2.6 and 7.2.26), its points ("Not available yet: SOVITECH point
 *   templates"), and the documents holding its evidence. Every asset is treated as possibly life-safety (prompt 3
 *   5.2): the owner's only responses are "Looks right" and "Something's wrong" on a value read from a document.
 */
import type { Candidate } from '@sovitech/domain';
import { SYSTEMS } from '@sovitech/registry';
import type { AssetResponse, EquipmentQuery, EquipmentResponse, EquipmentRow, ValueId } from '../browser/contract';
import { resolveCandidateEntry, resolveDocument, resolveWrittenText, valueIdOf, type HistoryStatusLineId } from '../resolver';
import { ASSET_FIELDS, ZONE_FIELDS, type Built, type WorkspaceField, type WorkspaceProject } from './inputs';
import { levelRegister } from './levels';
import {
  activeValue,
  assetCellDisplays,
  assetTagDisplay,
  assetValue,
  equipmentCountDisplay,
  historyEntryDisplay,
  listedAssets,
  listedZones,
  pointsDisplay,
  servedTag,
  tagMatches,
  zoneName,
  type AssetCell,
} from './registers';
import { DisplaySet, FORMAT, registerState, valueIdFor } from './shared';

/** Rows on one page of the register (ADR 0044 decision 7). */
export const EQUIPMENT_PAGE_SIZE = 50;

const CELLS: readonly AssetCell[] = ['type', 'system', 'location', 'level', 'zone'];

/** An asset's cell, its displays added; its own value id. */
function cell(project: WorkspaceProject, displays: DisplaySet, assetId: string, which: AssetCell): ValueId {
  const [own, ...rest] = assetCellDisplays(project, assetId, which);
  if (own === undefined) throw new Error('view-model: an asset cell has a display');
  displays.addAll(rest);
  return displays.add(own);
}

/**
 * The text a search reads: the tag as written and served, normalised as 2.5 normalises tags, so "cta-01" finds
 * "CTA-01"; the search is read the same way, without bidirectional and format controls (G2-15), so a search of such
 * controls alone names nothing and finds nothing.
 */
function matchesSearch(project: WorkspaceProject, assetId: string, search: string | undefined): boolean {
  if (search === undefined) return true;
  return tagMatches(project, assetId, search);
}

/** The type cell's badge id (the list's badge column). */
function typeBadge(project: WorkspaceProject, assetId: string): string | undefined {
  return assetCellDisplays(project, assetId, 'type')[0]?.badge?.id;
}

/** Whether an asset matches every active filter (filters write nothing: R-066). */
function matches(project: WorkspaceProject, assetId: string, query: EquipmentQuery): boolean {
  if (query.system !== undefined && assetValue(project, assetId, 'system') !== query.system) return false;
  if (query.level !== undefined && assetValue(project, assetId, 'level') !== query.level) return false;
  if (query.zone !== undefined && assetValue(project, assetId, 'zone') !== query.zone) return false;
  if (query.badge !== undefined && typeBadge(project, assetId) !== query.badge) return false;
  return matchesSearch(project, assetId, query.search);
}

/** The total's path: the active filters it counts under (`register.total[.system_<s>][.level_<k>]…`). */
function totalPath(query: EquipmentQuery): string {
  const parts = ['total'];
  if (query.system !== undefined) parts.push(`system_${query.system}`);
  if (query.level !== undefined) parts.push(`level_${query.level}`);
  if (query.zone !== undefined) parts.push(`zone_${query.zone.replace(/-/gu, '')}`);
  if (query.badge !== undefined) parts.push(`badge_${query.badge}`);
  if (query.search !== undefined) parts.push('searched');
  return parts.join('.');
}

export function equipmentView(project: WorkspaceProject, query: EquipmentQuery): Built<EquipmentResponse['view']> {
  const displays = new DisplaySet();
  const listed = listedAssets(project);
  const matching = listed.filter((assetId) => matches(project, assetId, query));
  const page = query.page ?? 1;
  const start = (page - 1) * EQUIPMENT_PAGE_SIZE;
  const onPage = matching.slice(start, start + EQUIPMENT_PAGE_SIZE);
  const rows: EquipmentRow[] = onPage.map((assetId) => ({
    assetId,
    tag: displays.add(assetTagDisplay(project, assetId)),
    type: cell(project, displays, assetId, 'type'),
    system: cell(project, displays, assetId, 'system'),
    location: cell(project, displays, assetId, 'location'),
    level: cell(project, displays, assetId, 'level'),
    zone: cell(project, displays, assetId, 'zone'),
  }));
  // The zone filter's options: each listed zone (G4-43) by its name as written, else its code (a zone with neither is not offered).
  const zones = listedZones(project).flatMap((zoneId) => {
    if (zoneName(project, zoneId) === undefined) return [];
    const key = activeValue(project, zoneId, ZONE_FIELDS.name) === undefined ? ZONE_FIELDS.code : ZONE_FIELDS.name;
    const resolved = project.resolve(zoneId, key);
    const own = resolved?.[0];
    if (own === undefined) return [];
    displays.addAll(resolved ?? []);
    return [{ zoneId, name: displays.add(own) }];
  });
  const badges = [...new Set(listed.flatMap((assetId) => typeBadge(project, assetId) ?? []))];
  const view: EquipmentResponse['view'] = {
    state: registerState(project, listed.length),
    rows,
    total: displays.add(equipmentCountDisplay(project, totalPath(query))),
    filters: {
      systems: SYSTEMS.map((system) => system.id),
      levels: levelRegister(project, displays),
      zones,
      badges,
      active: query,
    },
    page: { hasPrevious: page > 1, hasNext: start + EQUIPMENT_PAGE_SIZE < matching.length },
  };
  return { view, displayObjects: displays.list() };
}

/** The roles a history entry may name (never a person: proposals 7.2.6, 7.2.26). */
function roleOf(authorRole: string | undefined): 'owner' | 'sovitech_engineer' | 'system' {
  if (authorRole === 'owner' || authorRole === 'sovitech_engineer') return authorRole;
  return 'system';
}

/** What the resolver reads to show one of a field's candidates as a history entry (the field's own state and sources). */
function entryInput(project: WorkspaceProject, field: WorkspaceField): Parameters<typeof resolveCandidateEntry>[0] {
  return {
    field: field.field,
    subject: { id: field.subjectId, kind: field.subjectKind },
    state: field.state,
    candidates: field.candidates,
    candidateEvents: field.candidateEvents,
    document: (documentId) => project.documents.find((document) => document.id === documentId),
    fileName: project.fileName,
    projectType: project.projectType,
    asked: false,
    searchedCoverage: undefined,
    actions: [],
    format: FORMAT,
  };
}

/**
 * The 2.8 status line a history entry carries (2.3; G3-21): none for a value that is eligible now; "Source document
 * removed" for one withdrawn because every document it cites is removed; "From a superseded revision" for one a declared
 * revision superseded (it cites documents, every one superseded or removed). `null` leaves the entry out: a rejected
 * value, a refused one, a person's withdrawal of their own entry, or an engine's recalculation, for which 2.8 has no
 * wording (proposal P-4B-HISTORY-ENTRY-WORDING), so none reads as current.
 */
function historyStatusLine(project: WorkspaceProject, field: WorkspaceField, candidate: Candidate): HistoryStatusLineId | undefined | null {
  const status = field.state.candidates.find((derived) => derived.candidateId === candidate.id)?.status;
  if (status === 'eligible') return undefined;
  const active = new Set(project.activeDocuments.map((document) => document.id));
  const cites = candidate.evidence.length > 0;
  if (status === 'withdrawn' && cites && candidate.evidence.every((entry) => !active.has(entry.documentId))) return 'source_document_removed';
  if (status === 'superseded' && cites) return 'from_superseded_revision';
  return null;
}

/** `workspace.asset` (UD-08). Undefined for an asset the register does not list (another project's reads as none: rule 13). */
export function assetView(project: WorkspaceProject, assetId: string): Built<AssetResponse['view']> | undefined {
  const asset = project.register.assets.find((entry) => entry.assetId === assetId);
  if (asset === undefined || !project.register.countable.includes(assetId)) return undefined;
  const displays = new DisplaySet();
  const tag = displays.add(assetTagDisplay(project, assetId));
  const fields = CELLS.map((which) => cell(project, displays, assetId, which));

  // Every place the asset was written, live or not: an erased document's excerpt reads "[erased]" (rule 13; G13-3).
  const documentOf = (documentId: string) => project.documents.find((document) => document.id === documentId);
  const evidence: AssetResponse['view']['evidence'] = [];
  let n = 0;
  for (const appearance of project.appearances.filter((entry) => asset.appearanceIds.includes(entry.id))) {
    for (const entry of appearance.evidence) {
      const document = documentOf(entry.documentId);
      if (document === undefined) continue;
      n += 1;
      const resolved = resolveDocument({ document, fileName: project.fileName(document.id) ?? null, format: FORMAT });
      evidence.push({
        documentId: document.id,
        fileName: displays.add(resolved.fileName),
        stage: displays.add(resolved.stage),
        revision: displays.add(resolved.revision),
        display: displays.add(
          resolveWrittenText({
            valueId: valueIdFor('asset', assetId, `evidence${String(n)}`),
            text: servedTag(appearance.tagAsWritten) ?? '',
            evidence: [entry],
            document: documentOf,
            fileName: project.fileName,
            projectType: project.projectType,
          }),
        ),
      });
    }
  }

  // Each registered field's history: the values written, by role and date (R-068), oldest first; each through the
  // resolver with its own badge and source line, a value no longer current with its 2.8 status line (G3-21).
  const history: AssetResponse['view']['history'] = [];
  for (const which of CELLS) {
    if (which === 'type' && project.closedGates.has('dataset-asset-taxonomy')) continue;
    const field = project.field(assetId, ASSET_FIELDS[which]);
    if (field === undefined || field.candidates.length === 0) continue;
    const own = valueIdOf('asset', assetId, ASSET_FIELDS[which]);
    const entries = [...field.candidates]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
      .flatMap((candidate, index) => {
        const statusLine = historyStatusLine(project, field, candidate);
        if (statusLine === null) return [];
        const valueId = valueIdFor('asset', assetId, `${own.slice(own.indexOf('.') + 1)}.history${String(index + 1)}`);
        const entry = resolveCandidateEntry(entryInput(project, field), candidate.id, valueId, statusLine);
        const display = displays.add(historyEntryDisplay(project, assetId, ASSET_FIELDS[which], candidate, entry, statusLine !== undefined));
        return [{ display, role: roleOf(candidate.authorRole), at: candidate.createdAt, reason: null }];
      });
    history.push({ field: own, entries });
  }

  const documents = [...new Set(project.appearances.filter((entry) => asset.liveAppearanceIds.includes(entry.id)).flatMap((entry) => entry.evidence.map((item) => item.documentId)))].flatMap((documentId) => {
    const document = project.activeDocuments.find((entry) => entry.id === documentId);
    if (document === undefined) return [];
    const resolved = resolveDocument({ document, fileName: project.fileName(document.id) ?? null, format: FORMAT });
    const status = resolved.status ?? resolved.reading;
    if (status === undefined) return [];
    return [{ documentId, fileName: displays.add(resolved.fileName), status: displays.add(status), stage: displays.add(resolved.stage), revision: displays.add(resolved.revision) }];
  });

  const view: AssetResponse['view'] = {
    assetId,
    tag,
    fields,
    evidence,
    history,
    points: displays.add(pointsDisplay(project, valueIdFor('asset', assetId, 'points'))),
    documents,
  };
  return { view, displayObjects: displays.list() };
}
