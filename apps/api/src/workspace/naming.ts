/**
 * Levels and zones named, never by their stored key or id (phase 4 part B; rule 8 "Floors"; 2.2; PRD R-077;
 * US-ASSETS-05 AC2; US-ZONES-02 AC2; 7.1.1-E4; G8-24): a level, zone or asset field's displays, resolved by the one
 * resolver, with a stored level key shown by the level register's label and a stored zone id by the zone's name
 * (`referenceDisplays`, packages/view-model/src/workspace/registers.ts). The workspace's views name them through the
 * project they build; a write's answer that serves such a field (`fields.concernMany` here; `fields.acknowledge`,
 * `fields.concern` and `fields.edit` in apps/api/src/wizard) names it through this, from the same project state, so a
 * value id keeps one display on every page and in every answer (G2-7). It reads only the state's fields.
 */
import type { DisplayObject } from '@sovitech/view-model/browser';
import { referenceDisplays, type NamingProject } from '@sovitech/view-model/server';
import { fieldOnSubject, type ProjectState } from '../wizard/project-state';

/** What naming reads of the project state: its building and its fields on any subject. */
export function namingProjectOf(state: ProjectState): NamingProject {
  return {
    buildingId: state.buildingId,
    field: (subjectId, fieldKey) => {
      const found = fieldOnSubject(state, subjectId, fieldKey);
      if (found === undefined) return undefined;
      return { field: found.field, subjectId: found.subjectId, subjectKind: found.subjectKind, state: found.state, candidates: found.candidates, candidateEvents: found.candidateEvents };
    },
  };
}

/** A field's displays as resolved, a level named by the register's label and a zone by its name (any other field's unchanged). */
export function namedSubjectDisplays(state: ProjectState, subjectId: string, fieldKey: string, resolved: readonly DisplayObject[]): readonly DisplayObject[] {
  return referenceDisplays(namingProjectOf(state), subjectId, fieldKey, resolved);
}
