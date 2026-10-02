/**
 * The catalogue systems as the workspace pages name them (the eight of step 4: PRD R-055 "Until decided"; prompt 3
 * 5.2 "Systems catalogue"), shared by System Scope, Topology, Zones and Equipment: their names and descriptions from
 * the UI catalogue (`systems.*`, the copy step 4 shows; Fire Safety's description is the monitoring-only text of
 * section 5 step 4, word for word: rule 11, G11-11), in the catalogue's order, with step 4's icons (onboarding-spec
 * 2.5, redrawn from Lucide, decorative), and a helper for links that carry a filter. Systems are told apart by name and
 * icon, never by a colour (no system palette while D-19 is open). Nothing here is a value: values come in display
 * objects, and whether a system is life-safety comes from the view the API served (its `lifeSafety` or
 * `monitoringOnly` flag), never from a list kept here (V-6).
 */
import { ArrowUpDown, Cctv, DoorClosedLocked, Droplet, Fan, Flame, Lightbulb, Zap, type LucideIcon } from 'lucide-react';
import { copy } from '../../../copy';

const SYSTEM_COPY: Readonly<Record<string, { readonly title: string; readonly description: string } | undefined>> = copy.systems;

/** The catalogue's systems in its order. */
export const CATALOGUE_SYSTEMS: readonly string[] = Object.keys(copy.systems);

/** The approved icons of the systems (the same as step 4's cards; onboarding-spec 2.5), decorative. */
export const SYSTEM_ICONS: Readonly<Record<string, LucideIcon | undefined>> = {
  hvac: Fan,
  lighting: Lightbulb,
  energy: Zap,
  access_control: DoorClosedLocked,
  fire_safety: Flame,
  water: Droplet,
  elevators: ArrowUpDown,
  cctv: Cctv,
};

/** A system's catalogue name and description (copy.systems), its id when the catalogue has none. */
export function systemWords(systemId: string): { readonly title: string; readonly description: string | undefined } {
  const words = SYSTEM_COPY[systemId];
  return { title: words?.title ?? systemId, description: words?.description };
}

/** A catalogue system's title, or its id when the catalogue does not name it. */
export function systemTitle(systemId: string): string {
  return systemWords(systemId).title;
}

/** A catalogue system's description (Fire Safety's: the monitoring-only text), or undefined. */
export function systemDescription(systemId: string): string | undefined {
  return systemWords(systemId).description;
}

/** A path with search parameters added (undefined ones left out). */
export function withSearch(path: string, params: Readonly<Record<string, string | undefined>>): string {
  const [base, existing] = path.split('?');
  const search = new URLSearchParams(existing ?? '');
  for (const [key, value] of Object.entries(params)) if (value !== undefined) search.set(key, value);
  const query = search.toString();
  return query === '' ? (base ?? path) : `${base ?? path}?${query}`;
}
