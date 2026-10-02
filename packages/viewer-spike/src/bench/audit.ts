/**
 * What the bench checks about itself (prompt 3 section 8, "The viewer is a view of a document";
 * ifc-input 6.2.15, the gap it names: text drawn in a WebGL scene, a texture or a plan image is
 * invisible to a render test that reads page elements).
 *
 * The scene audit walks everything three.js would draw and counts whatever could carry text: a
 * sprite, a material with a texture, text geometry, CSS2D or CSS3D objects (page elements placed
 * by the scene), points (drawn with a texture as labels by some libraries). The page audit counts
 * the elements in the view other than its canvas, and reads the page's visible text.
 */
import type { Material, Object3D } from 'three';

export interface SceneAudit {
  readonly objects: number;
  readonly meshes: number;
  readonly sprites: number;
  readonly points: number;
  readonly texturedMaterials: number;
  readonly textGeometries: number;
  readonly pageElementsInScene: number;
}

export interface PageAudit {
  /** Canvases in the view (one: the renderer's). */
  readonly canvases: number;
  /** Other elements in the view that take up space on the page (none: no label, no logo, no overlay). */
  readonly otherVisibleElements: number;
  /** The page's text outside the key help (which is for assistive technology only): none. */
  readonly textOutsideHelp: string;
  /** The key help: fixed copy, with no digit and nothing from the model. */
  readonly helpText: string;
}

const TEXTURE_SLOTS = ['map', 'alphaMap', 'emissiveMap', 'lightMap', 'aoMap', 'bumpMap', 'normalMap', 'specularMap', 'envMap', 'matcap'] as const;

function hasTexture(material: Material): boolean {
  const slots = material as unknown as Record<string, unknown>;
  return TEXTURE_SLOTS.some((slot) => slots[slot] !== null && slots[slot] !== undefined);
}

function materialsOf(object: Object3D): Material[] {
  const material = (object as unknown as { material?: Material | Material[] }).material;
  if (material === undefined) return [];
  return Array.isArray(material) ? material : [material];
}

export function auditScene(root: Object3D): SceneAudit {
  let objects = 0;
  let meshes = 0;
  let sprites = 0;
  let points = 0;
  let texturedMaterials = 0;
  let textGeometries = 0;
  let pageElementsInScene = 0;
  root.traverse((object) => {
    objects += 1;
    const flags = object as unknown as Record<string, unknown>;
    if (flags.isMesh === true) meshes += 1;
    if (flags.isSprite === true) sprites += 1;
    if (flags.isPoints === true) points += 1;
    if (flags.isCSS2DObject === true || flags.isCSS3DObject === true) pageElementsInScene += 1;
    const geometry = (object as unknown as { geometry?: { type?: unknown } }).geometry;
    if (geometry !== undefined && typeof geometry.type === 'string' && /Text/i.test(geometry.type)) textGeometries += 1;
    for (const material of materialsOf(object)) if (hasTexture(material)) texturedMaterials += 1;
  });
  return { objects, meshes, sprites, points, texturedMaterials, textGeometries, pageElementsInScene };
}

/** The text of every text node under `root`, outside `skip`, scripts and styles. */
function textOf(root: Node, skip: Element | null): string {
  const parts: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (parent === null || parent.closest('script, style') !== null) continue;
    if (skip !== null && skip.contains(node)) continue;
    parts.push(node.textContent ?? '');
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export function auditPage(view: HTMLElement, help: HTMLElement | null): PageAudit {
  let canvases = 0;
  let otherVisibleElements = 0;
  for (const element of view.querySelectorAll('*')) {
    if (element instanceof HTMLCanvasElement) {
      canvases += 1;
      continue;
    }
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    if (style.display !== 'none' && style.visibility !== 'hidden' && box.width > 1 && box.height > 1) otherVisibleElements += 1;
  }
  return { canvases, otherVisibleElements, textOutsideHelp: textOf(document.body, help), helpText: help === null ? '' : textOf(help, null) };
}
