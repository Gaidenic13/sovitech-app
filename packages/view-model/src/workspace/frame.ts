/**
 * The workspace frame (`workspace.frame`; docs/adr/0043, 0044): the built pages in the sidebar's order (PRD R-146
 * "Until decided": only built pages), the project card (R-049), the 48px footer's "Still reading" line (R-139; rule
 * 7) and the level register (R-076, R-077).
 *
 * The card's values are the same value ids, resolved the same way, as step 3 and step 8 show them (G2-7): the project
 * type (the step 1 answer), the building type, the gross floor area with its basis, the rooms with what they count
 * (all spaces never read as guest rooms: G9-6) and the floors by level type. No photo, Status or BMS Platform
 * (R-049). The demo line is the envelope's (the project flag), never the frame's.
 */
import { FIELD } from '@sovitech/registry';
import { WORKSPACE_PAGES, type ProjectCard, type ValueId } from '../browser/contract';
import { resolveLine, valueIdOf } from '../resolver';
import type { Built, WorkspaceProject } from './inputs';
import { levelRegister } from './levels';
import { DisplaySet, FORMAT, ownDisplay, projectPath } from './shared';
import type { WorkspaceFrameResponse } from '../browser/contract';

/** A field's own display, added; its value id (an unregistered field reads Unknown). */
export function fieldOwnId(project: WorkspaceProject, displays: DisplaySet, subjectKind: 'project' | 'building', fieldKey: string): ValueId {
  const subjectId = subjectKind === 'project' ? project.projectId : project.buildingId;
  const resolved = project.resolve(subjectId, fieldKey);
  // A multi-fact field's facts come with it (step 3 shows them too); the card names the field's own display.
  if (resolved !== undefined) displays.addAll(resolved);
  return displays.add(ownDisplay(resolved, valueIdOf(subjectKind, subjectId, fieldKey)));
}

/** The project card (R-049; US-REVIEW-14). */
export function projectCard(project: WorkspaceProject, displays: DisplaySet): ProjectCard {
  return {
    projectType: fieldOwnId(project, displays, 'project', FIELD.projectType),
    buildingType: fieldOwnId(project, displays, 'building', FIELD.buildingType),
    grossFloorArea: fieldOwnId(project, displays, 'building', FIELD.grossFloorArea),
    rooms: [fieldOwnId(project, displays, 'building', FIELD.rooms)],
    floors: [fieldOwnId(project, displays, 'building', FIELD.floors)],
  };
}

/** "Still reading <n> files. Your estimate will update when they finish." while any document is read (rule 7), else null: the same value id as step 2 and step 8. */
export function stillReading(project: WorkspaceProject, displays: DisplaySet): ValueId | null {
  if (project.readingCount === 0) return null;
  return displays.add(resolveLine(projectPath(project, 'documents.stillReading'), 'still_reading', { count: project.readingCount }, FORMAT));
}

export function frameView(project: WorkspaceProject): Built<WorkspaceFrameResponse['view']> {
  const displays = new DisplaySet();
  const view = {
    pages: [...WORKSPACE_PAGES],
    projectCard: projectCard(project, displays),
    footer: { stillReading: stillReading(project, displays) },
    levels: levelRegister(project, displays),
  };
  return { view, displayObjects: displays.list() };
}
