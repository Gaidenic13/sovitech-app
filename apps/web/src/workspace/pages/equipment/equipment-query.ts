/**
 * Equipment's view state and selection (DB-17; PRD R-065, R-066; US-ASSETS-04, US-ASSETS-05, US-ASSETS-11; UD-26;
 * docs/adr/0044 decision 7): pure helpers, tested apart from the page (./equipment-query.test.ts).
 *
 * - **The query lives in the address** (`system`, `level`, `zone`, `badge`, `search`, `page`), so a link opens the
 *   register filtered (Zones' "View Equipment in Zone →", System Scope's "View the equipment") and the shared floor
 *   selection is the frame's `level` parameter (ADR 0043 decision 6). Each value is read with the contract's own
 *   schema; one that does not parse is ignored, never sent. A filter changes the view only: nothing is written
 *   (R-066; US-ASSETS-11 AC4). A new filter or search goes back to the first page.
 * - **The selection's answers** (R-065: "alone or for a selection"; rule 3; G3-3): the "Looks right" and "Something's
 *   wrong" the API served on the selected rows' values, gathered as they are: `owner_acknowledged` only, and notes to
 *   the engineer queue. Nothing here verifies, confirms or chooses a value, and a row that offers neither adds
 *   nothing (every asset is treated as possibly life-safety: only view, log and documents, prompt 3 5.2).
 */
import { EquipmentQuerySchema, type Badge, type DisplayObject, type EquipmentQuery, type EquipmentRow } from '@sovitech/view-model/browser';
import type { Displays } from '../../../wizard/use-step-view';

/** The register's filters, in the menu's order. */
export const FILTER_KEYS = ['system', 'level', 'zone', 'badge'] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

/** Every key of the query the address may hold. */
export const QUERY_KEYS = [...FILTER_KEYS, 'search', 'page'] as const;
export type QueryKey = (typeof QUERY_KEYS)[number];

/** The query an address holds: each value read with the contract's schema, a malformed one left out. */
export function queryOfSearch(search: URLSearchParams): EquipmentQuery {
  const query: Record<string, unknown> = {};
  for (const key of QUERY_KEYS) {
    const raw = search.get(key);
    if (raw === null) continue;
    const parsed = EquipmentQuerySchema.safeParse({ [key]: raw });
    if (parsed.success && parsed.data[key] !== undefined) query[key] = parsed.data[key];
  }
  const parsed = EquipmentQuerySchema.safeParse(query);
  return parsed.success ? parsed.data : {};
}

/** The query as the client sends it (strings; an absent key not sent). */
export function requestQuery(query: EquipmentQuery): Record<string, string | undefined> {
  return {
    system: query.system,
    level: query.level,
    zone: query.zone,
    badge: query.badge,
    search: query.search,
    page: query.page === undefined || query.page === 1 ? undefined : String(query.page),
  };
}

/**
 * The address after a change: the given keys set (undefined removes one); any change but the page's own goes back to
 * the first page. Every other parameter is kept.
 */
export function searchWith(search: URLSearchParams, changes: Partial<Record<QueryKey, string | undefined>>): URLSearchParams {
  const next = new URLSearchParams(search);
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined || value === '') next.delete(key);
    else next.set(key, value);
  }
  if (!('page' in changes)) next.delete('page');
  return next;
}

/** The value displays of a row (its cells), as served; a value id the response does not carry is left out. */
export function rowDisplays(row: EquipmentRow, displays: Displays): DisplayObject[] {
  return [row.tag, row.type, row.system, row.location, row.level, row.zone].flatMap((valueId) => displays.get(valueId) ?? []);
}

/** What a set of rows lets the owner answer: the candidates of their served "Looks right" and "Something's wrong". */
export interface SelectionAnswers {
  readonly acknowledge: readonly string[];
  readonly concern: readonly string[];
}

export function answersOf(rows: readonly EquipmentRow[], displays: Displays): SelectionAnswers {
  const acknowledge = new Set<string>();
  const concern = new Set<string>();
  for (const row of rows) {
    for (const display of rowDisplays(row, displays)) {
      for (const action of display.actions ?? []) {
        if (action.kind === 'acknowledge') for (const id of action.candidateIds) acknowledge.add(id);
        if (action.kind === 'concern') concern.add(action.candidateId);
      }
    }
  }
  return { acknowledge: [...acknowledge], concern: [...concern] };
}

/** Whether any of the rows offers an answer (else the register draws no selection: a checkbox with nothing to do). */
export function offersAnswers(rows: readonly EquipmentRow[], displays: Displays): boolean {
  const answers = answersOf(rows, displays);
  return answers.acknowledge.length > 0 || answers.concern.length > 0;
}

/** A badge's served label, read from any display on the page that carries it (2.8's labels are the API's, never the catalogue's). */
export function badgeLabelOf(id: string, displays: Displays): Badge | undefined {
  for (const display of displays.values()) if (display.badge?.id === id) return display.badge;
  return undefined;
}
