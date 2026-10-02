/**
 * Storey plans from the converted geometry: a horizontal section of each storey's shapes, drawn
 * as inline SVG with no text (prompt 3 section 8, "Plans"; docs/adr/0046-viewer-spike.md; the plan
 * input of ifc-input 5.4's IFC-12, which waits in tests/proposed/ for D-03, D-04 and D-01).
 *
 * IfcConvert is not available (owner decision 2026-09-26, "web-ifc instead"), so a plan is cut from
 * the same Fragments file the viewer opens, with That Open's own section helper
 * (`getSection`). The plan carries lines only: no `<text>`, no `<title>` or `<desc>`, no image, no
 * name, number or label from the model. Labels, where a later phase draws any, are page elements
 * bound to value ids (rule 2; G2-1), and while `ifc-values` and `view-provenance` are closed a plan
 * carries none: no scale bar, no north arrow, no orientation word (5.4). Its colour is the page's
 * (`currentColor`), so no colour literal enters the plan.
 *
 * Where a storey has no shape to cut, there is no plan, and the page that would show it reads
 * "Not available yet" with its reason (rule 7; ifc-input 6.3.2).
 */
import { SingleThreadedFragmentsModel } from '@thatopen/fragments';
import { Box3, Plane, Vector3 } from 'three';

/**
 * How far above the lowest point of a storey's shapes the plan is cut, in metres (the Fragments
 * file's unit). A drawing convention of the spike, shown nowhere and read from nothing.
 */
export const CUT_ABOVE_STOREY_BASE_M = 1.2;

export interface StoreyPlan {
  /** The storey's local id in the Fragments file (its STEP id): an identifier, never shown. */
  readonly storeyLocalId: number;
  /** The plan as one inline SVG element, or undefined when the storey has no shape to cut. */
  readonly svg: string | undefined;
  /** How many line segments the section holds (the spike's measurement; never shown). */
  readonly segments: number;
}

interface TreeNode {
  readonly localId?: number | null;
  readonly category?: string | null;
  readonly children?: readonly TreeNode[] | null;
}

function isTreeNode(value: unknown): value is TreeNode {
  return typeof value === 'object' && value !== null;
}

/** Every local id in the subtree under the item `rootId` (the item itself excluded). */
function descendantsOf(tree: TreeNode, rootId: number): number[] {
  const found: number[] = [];
  const collect = (node: TreeNode): void => {
    for (const child of node.children ?? []) {
      if (typeof child.localId === 'number') found.push(child.localId);
      collect(child);
    }
  };
  const visit = (node: TreeNode): boolean => {
    if (node.localId === rootId) {
      collect(node);
      return true;
    }
    return (node.children ?? []).some(visit);
  };
  visit(tree);
  return found;
}

/**
 * The lowest height (y, the Fragments file's up axis) of the shapes of `localIds`: the bottom of
 * the box around their transformed bounds (at or below the lowest point of a rotated shape).
 */
function lowestPoint(model: SingleThreadedFragmentsModel, localIds: number[]): number {
  const bounds = new Box3();
  for (const meshes of model.getItemsGeometry(localIds)) {
    for (const mesh of meshes) {
      if (mesh.positions !== undefined) bounds.union(new Box3().setFromArray(mesh.positions).applyMatrix4(mesh.transform));
    }
  }
  return bounds.min.y;
}

/** The section's segments as one SVG path, in plan coordinates (x across, z down the page). */
function planSvg(buffer: Float32Array, vertices: number): string | undefined {
  if (vertices < 2) return undefined;
  const used = buffer.subarray(0, vertices * 3);
  const bounds = new Box3().setFromArray(used);
  const from = new Vector3();
  const to = new Vector3();
  const steps: string[] = [];
  for (let vertex = 0; vertex + 1 < vertices; vertex += 2) {
    from.fromArray(used, vertex * 3);
    to.fromArray(used, (vertex + 1) * 3);
    steps.push(`M${from.x} ${from.z}L${to.x} ${to.z}`);
  }
  const margin = 1;
  const width = bounds.max.x - bounds.min.x + 2 * margin;
  const height = bounds.max.z - bounds.min.z + 2 * margin;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bounds.min.x - margin} ${bounds.min.z - margin} ${width} ${height}" fill="none" stroke="currentColor" aria-hidden="true">`,
    `<path vector-effect="non-scaling-stroke" d="${steps.join('')}"/>`,
    '</svg>',
  ].join('');
}

/**
 * One plan per storey of the Fragments file, from the lowest storey to the highest (ordered by
 * the shapes' heights, never by a storey's name or elevation attribute, which the view profile
 * does not keep).
 */
export function storeyPlans(fragments: Uint8Array): StoreyPlan[] {
  const model = new SingleThreadedFragmentsModel('viewer-spike-plan', fragments);
  try {
    const tree: unknown = model.getSpatialStructure();
    if (!isTreeNode(tree)) return [];
    const storeys = model.getItemsOfCategories([/^IFCBUILDINGSTOREY$/]).IFCBUILDINGSTOREY ?? [];
    const withShapes = new Set(model.getItemsIdsWithGeometry());
    const plans: Array<StoreyPlan & { readonly base: number }> = [];
    for (const storeyLocalId of storeys) {
      const items = descendantsOf(tree, storeyLocalId).filter((id) => withShapes.has(id));
      if (items.length === 0) {
        plans.push({ storeyLocalId, svg: undefined, segments: 0, base: Number.POSITIVE_INFINITY });
        continue;
      }
      const base = lowestPoint(model, items);
      const plane = new Plane().setFromNormalAndCoplanarPoint(new Vector3(0, 1, 0), new Vector3(0, base + CUT_ABOVE_STOREY_BASE_M, 0));
      const section = model.getSection(plane, items);
      plans.push({ storeyLocalId, svg: planSvg(section.buffer, section.index), segments: section.index / 2, base });
    }
    return plans.sort((a, b) => a.base - b.base).map(({ storeyLocalId, svg, segments }) => ({ storeyLocalId, svg, segments }));
  } finally {
    model.dispose();
  }
}
