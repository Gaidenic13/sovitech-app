/**
 * What every workspace view builder shares: one display per value id in a response (G2-7), the value ids the
 * workspace forms (docs/adr/0044-workspace-api-contract.md decision 3), the missing displays (rule 1: never a zero,
 * a blank or a dash; rule 7: "Not available yet" names what is missing), and the register state (rule 12).
 */
import type { DocumentRecord } from '@sovitech/domain';
import { VALUE_ID_PATTERN, type DisplayObject, type RegisterState, type ValueId } from '../browser/contract';
import { DEFAULT_FORMAT_OPTIONS } from '../formatting';
import { badgeOf, projectValueId, resolveLine } from '../resolver';
import type { WorkspaceProject } from './inputs';

export const FORMAT = DEFAULT_FORMAT_OPTIONS;

/** One response's display objects, one per value id: a second, different display for one value id is a defect (G2-7). */
export class DisplaySet {
  private readonly byId = new Map<ValueId, DisplayObject>();

  add(display: DisplayObject): ValueId {
    const existing = this.byId.get(display.valueId);
    if (existing !== undefined && JSON.stringify(existing) !== JSON.stringify(display)) {
      throw new Error(`view-model: two displays for one value id in one response: ${display.valueId}`);
    }
    this.byId.set(display.valueId, display);
    return display.valueId;
  }

  addAll(displays: readonly DisplayObject[]): ValueId[] {
    return displays.map((display) => this.add(display));
  }

  list(): DisplayObject[] {
    return [...this.byId.values()];
  }
}

/** A value id `<kind>:<id>.<path>`, checked against the render contract's pattern (never silently changed). */
export function valueIdFor(kind: string, id: string, path: string): ValueId {
  const valueId = `${kind}:${id}.${path}`;
  if (!VALUE_ID_PATTERN.test(valueId)) throw new Error(`view-model: "${valueId}" cannot be a value id (display.ts VALUE_ID_PATTERN)`);
  return valueId;
}

/** A project's derived line or count (`project:<id>.<path>`). */
export function projectPath(project: Pick<WorkspaceProject, 'projectId'>, path: string): ValueId {
  return projectValueId(project.projectId, path);
}

/** A value no source holds and no field registers: Unknown, its one badge, never blank or zero (rule 1; 2.4 `unknown`). */
export function unknownDisplay(valueId: ValueId, kind: DisplayObject['kind'] = 'field'): DisplayObject {
  const badge = badgeOf('unknown');
  return { valueId, kind, text: badge.label, shape: 'missing', missing: 'unknown', badge };
}

/** Rule 7's "Not available yet: <what is missing>" as its own line (the registry's rule line), with no owner action of its own. */
export function notAvailable(valueId: ValueId, missing: string): DisplayObject {
  return resolveLine(valueId, 'not_available_yet_named', { missing }, FORMAT, { missing: 'not_available_yet' });
}

/** Whether a document is being read now (2.3 `analysis.status`). */
export function isReading(document: DocumentRecord): boolean {
  return document.analysis.status === 'queued' || document.analysis.status === 'analysing';
}

/**
 * What a register page says about itself, from stored state only (the contract's RegisterState; rule 12, G12-8,
 * G12-10: never "not found" while no completed AI run searched anything): rows exist; or the project never had a
 * document (removed ones count: an owner who uploaded and then deleted every document did upload, rules 1 and 12;
 * G12-11); or a document is still being read; or nothing of this register came from the documents.
 */
export function registerState(project: Pick<WorkspaceProject, 'activeDocuments' | 'documents'>, rows: number): RegisterState {
  if (rows > 0) return 'listed';
  if (project.documents.length === 0) return 'no_documents';
  if (project.activeDocuments.some(isReading)) return 'reading';
  return 'none_read';
}

/** The first display object of a resolved field (the field's own), or a missing display for an unregistered one. */
export function ownDisplay(displays: readonly DisplayObject[] | undefined, fallback: ValueId): DisplayObject {
  return displays?.[0] ?? unknownDisplay(fallback);
}
