/**
 * The storey index of a converted model, written at conversion so no page ever computes it (docs/adr/0046-viewer-spike.md
 * Finding 7: building it in the page took four minutes in software rendering on the `perf` model; the viewer step,
 * docs/build-log.md "The viewer step" item 3).
 *
 * It holds the storeys in order from the lowest to the highest, ordered by the height of their shapes (the lowest point
 * of the box around each storey's shapes), never by a storey's name or elevation attribute, which the view profile
 * does not keep; and, for each, its GlobalId and the GlobalIds of the elements with a shape it contains. Nothing else:
 * no name, elevation, height, count or other text or figure from the model (PRD R-079: storey membership is "read by
 * the converter for display only and is not stored as a value"). A storey with no shape is left out: it has nothing to
 * show. No page reads the index while PRD R-080 shows the whole model only; it is kept so that a later step needs no
 * reconversion of every stored model.
 */
import { SingleThreadedFragmentsModel } from '@thatopen/fragments';
import { Box3 } from 'three';

/** A GlobalId: 22 characters of IFC's base 64 alphabet. */
const GLOBAL_ID = /^[0-9A-Za-z_$]{22}$/;

export interface StoreyEntry {
  /** The storey's GlobalId. */
  readonly storey: string;
  /** The GlobalIds of the elements with a shape the storey contains, in the file's order. */
  readonly elements: readonly string[];
}

export interface StoreyIndex {
  /** From the lowest storey to the highest, by the height of their shapes. */
  readonly storeys: readonly StoreyEntry[];
}

interface TreeNode {
  readonly localId?: number | null;
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

/** The lowest height (y, the Fragments file's up axis) of the box around the shapes of `localIds`. */
function lowestPoint(model: SingleThreadedFragmentsModel, localIds: readonly number[]): number {
  const bounds = new Box3();
  for (const meshes of model.getItemsGeometry([...localIds])) {
    for (const mesh of meshes) {
      if (mesh.positions !== undefined) bounds.union(new Box3().setFromArray(mesh.positions).applyMatrix4(mesh.transform));
    }
  }
  return bounds.min.y;
}

/** The GlobalIds of `localIds`, in their order, leaving out any item without one. */
function globalIdsOf(model: SingleThreadedFragmentsModel, localIds: readonly number[]): string[] {
  return model.getGuidsByLocalIds([...localIds]).filter((guid): guid is string => typeof guid === 'string' && GLOBAL_ID.test(guid));
}

/** Whether a converted file holds any item with a shape (a model with none cannot be shown: `no_geometry`). */
export function hasGeometry(fragments: Uint8Array): boolean {
  const model = new SingleThreadedFragmentsModel('model-converter-shapes', fragments);
  try {
    return model.getItemsIdsWithGeometry().length > 0;
  } finally {
    model.dispose();
  }
}

/** The storey index of a converted file (see the module comment). */
export function storeyIndex(fragments: Uint8Array): StoreyIndex {
  const model = new SingleThreadedFragmentsModel('model-converter-storeys', fragments);
  try {
    const tree: unknown = model.getSpatialStructure();
    if (!isTreeNode(tree)) return { storeys: [] };
    const storeys = model.getItemsOfCategories([/^IFCBUILDINGSTOREY$/]).IFCBUILDINGSTOREY ?? [];
    const withShapes = new Set(model.getItemsIdsWithGeometry());
    const placed: Array<StoreyEntry & { readonly base: number }> = [];
    for (const storeyLocalId of storeys) {
      const items = descendantsOf(tree, storeyLocalId).filter((id) => withShapes.has(id));
      const [storey] = globalIdsOf(model, [storeyLocalId]);
      if (items.length === 0 || storey === undefined) continue;
      placed.push({ storey, elements: globalIdsOf(model, items), base: lowestPoint(model, items) });
    }
    // A stable sort: storeys at the same height keep the file's order.
    return { storeys: placed.sort((a, b) => a.base - b.base).map(({ storey, elements }) => ({ storey, elements })) };
  } finally {
    model.dispose();
  }
}
