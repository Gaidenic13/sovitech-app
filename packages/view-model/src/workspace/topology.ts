/**
 * Topology's Logical view (DB-08; PRD R-071 to R-073; US-TOPO-01 to US-TOPO-08; docs/adr/0044): a view of the
 * registers, never of SOVITECH's design.
 *
 * - `design`: "Not available yet: SOVITECH's design of the controllers, networks and integrations" (proposal 7.2.10,
 *   dashboards 8.8): no management or automation level, controller, bus, protocol, network, integration or data flow
 *   is drawn, since no record supports one (rule 1, "Interfaces": "A protocol is a `document` value only when a
 *   document names it"; "Model knowledge is not a source"; 7.1-r12, r13; G1-27). The view is never labelled
 *   "proposed design".
 * - `groups`: one per system whose recorded decision is include (a Suggested preselection not yet accepted adds none),
 *   in the catalogue's order, with the same decision display as System Scope and step 4 (G2-7) and the same equipment
 *   line as System Scope's row (`project:<id>.register.<system>[.<level>]`, G2-7).
 * - Fire Safety is its own group, monitoring only (rule 11: "Read-only by default", "Fire mode is hardwired and wins";
 *   7.1-r18; 7.1.1-L4; R-072; G11-11): `monitoringOnly` says so, its text is the catalogue's monitoring-only line, and
 *   its link runs in the monitoring direction only; it is never joined to another system's group.
 * - `noDecision`: with no include decision recorded, "Not available yet: the systems in scope", with the action to
 *   choose them, and no group (rule 7; R-071; G7-15).
 * No statistics, live bar, transport controls, "BMS LIVE", key metrics or integration status (R-071; 7.1-r27).
 */
import { SYSTEMS, scopeFieldKey } from '@sovitech/registry';
import type { TopologyResponse } from '../browser/contract';
import { valueIdOf } from '../resolver';
import { MISSING } from './copy';
import type { Built, WorkspaceProject } from './inputs';
import { levelRegister } from './levels';
import { equipmentCountDisplay } from './registers';
import { storedDecision, systemEquipmentPath } from './scope';
import { DisplaySet, notAvailable, ownDisplay, projectPath } from './shared';

export function topologyView(project: WorkspaceProject, selection: { readonly level?: string } = {}): Built<TopologyResponse['view']> {
  const displays = new DisplaySet();
  const design = displays.add(notAvailable(projectPath(project, 'topology.design'), MISSING.sovitechDesign));
  const groups = SYSTEMS.filter((system) => storedDecision(project, system.id) === 'include').map((system) => {
    const fieldKey = scopeFieldKey(system.id);
    const resolved = project.resolve(project.projectId, fieldKey);
    if (resolved !== undefined) displays.addAll(resolved);
    return {
      systemId: system.id,
      decision: displays.add(ownDisplay(resolved, valueIdOf('project', project.projectId, fieldKey))),
      equipment: displays.add(equipmentCountDisplay(project, systemEquipmentPath(system.id, selection.level))),
      monitoringOnly: system.lifeSafety,
    };
  });
  const noDecision =
    groups.length > 0 ? null : { line: displays.add(notAvailable(projectPath(project, 'topology.noDecision'), MISSING.systemsInScope)), actions: ['choose_systems' as const] };
  return { view: { design, groups, noDecision, levels: levelRegister(project, displays) }, displayObjects: displays.list() };
}
